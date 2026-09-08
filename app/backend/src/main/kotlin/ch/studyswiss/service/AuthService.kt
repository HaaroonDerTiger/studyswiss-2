package ch.studyswiss.service

import ch.studyswiss.Konfig
import ch.studyswiss.model.*
import ch.studyswiss.repo.NutzerRepo
import ch.studyswiss.repo.TokenRepo
import com.auth0.jwk.JwkProviderBuilder
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.interfaces.DecodedJWT
import java.net.URI
import java.security.MessageDigest
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.Date
import java.util.concurrent.TimeUnit

/**
 * Drei gleichwertige Wege ins Konto: Apple, Google und «ohne Konto
 * weiterlernen». Eine E-Mail-Passwort-Anmeldung gibt es nicht — keine
 * vergessenen Passwoerter, keine Passwort-Datenbank.
 *
 * Der Client kennt nur die eigenen Tokens dieser App, nie das Apple- oder
 * Google-Token nach der Anmeldung.
 */
class AuthService(
    private val nutzer: NutzerRepo,
    private val tokens: TokenRepo,
    private val konfig: Konfig,
    /** Baut das Profil fuer die Antwort. Wird hereingereicht, damit der
     *  AuthService nichts ueber Fortschritt und Themenbaeume wissen muss. */
    private val profil: (Nutzer) -> ProfilDto,
) {

    class Abgelehnt(text: String) : RuntimeException(text)

    private val appleJwks = JwkProviderBuilder(URI("https://appleid.apple.com/auth/keys").toURL())
        .cached(10, 24, TimeUnit.HOURS).rateLimited(10, 1, TimeUnit.MINUTES).build()

    private val googleJwks = JwkProviderBuilder(URI("https://www.googleapis.com/oauth2/v3/certs").toURL())
        .cached(10, 24, TimeUnit.HOURS).rateLimited(10, 1, TimeUnit.MINUTES).build()

    /* ------------------------------ Apple ------------------------------ */

    /**
     * Prüft Signatur, `iss`, `aud`, `exp` und den Nonce.
     *
     * Der Nonce ist der Schutz gegen Wiedereinspielen: Der Client wuerfelt ihn,
     * schickt den SHA-256 davon an Apple und den Klartext an uns. Im Token
     * steht Apples Hash — beide muessen uebereinstimmen.
     */
    fun mitApple(bitte: AppleAnmeldung): Sitzung {
        val jwt = pruefeToken(
            token = bitte.identityToken,
            aussteller = "https://appleid.apple.com",
            publikum = listOfNotNull(konfig.appleBundleId, konfig.appleServiceId),
            jwks = { kid -> appleJwks.get(kid).publicKey as RSAPublicKey },
        )

        val erwartet = sha256(bitte.nonce)
        val imToken = jwt.getClaim("nonce").asString()
        if (imToken == null || imToken != erwartet) {
            throw Abgelehnt("Der Nonce stimmt nicht. Bitte die Anmeldung neu starten.")
        }

        val sub = jwt.subject ?: throw Abgelehnt("Apple hat keine Kennung geliefert.")
        // Apple liefert E-Mail und Namen NUR beim allerersten Mal.
        val email = jwt.getClaim("email").asString()
        val n = nutzer.findeOderLege(Anbieter.APPLE, sub, email, bitte.vorname)
        return sitzung(n)
    }

    /* ------------------------------ Google ----------------------------- */

    fun mitGoogle(bitte: GoogleAnmeldung): Sitzung {
        val jwt = pruefeToken(
            token = bitte.idToken,
            aussteller = "https://accounts.google.com",
            publikum = listOfNotNull(konfig.googleClientId, konfig.googleWebClientId),
            jwks = { kid -> googleJwks.get(kid).publicKey as RSAPublicKey },
        )
        val sub = jwt.subject ?: throw Abgelehnt("Google hat keine Kennung geliefert.")
        val n = nutzer.findeOderLege(
            Anbieter.GOOGLE, sub,
            jwt.getClaim("email").asString(),
            jwt.getClaim("given_name").asString(),
        )
        return sitzung(n)
    }

    /* ------------------------------- Gast ------------------------------ */

    /** Ein 14-Jaehriger soll nicht an einer Anmeldemaske scheitern. Das
     *  Gastkonto ist sofort nutzbar und laesst sich spaeter verknuepfen —
     *  der Fortschritt wandert mit, weil die Nutzer-ID dieselbe bleibt. */
    fun alsGast(bitte: GastAnmeldung): Sitzung {
        if (bitte.geraeteId.length < 8) throw Abgelehnt("Die Geräte-Kennung ist zu kurz.")
        return sitzung(nutzer.findeOderLege(Anbieter.GAST, bitte.geraeteId, null, null))
    }

    fun verknuepfeMitApple(nutzerId: String, bitte: AppleAnmeldung): Sitzung {
        val jwt = pruefeToken(bitte.identityToken, "https://appleid.apple.com", listOfNotNull(konfig.appleBundleId, konfig.appleServiceId)) {
            appleJwks.get(it).publicKey as RSAPublicKey
        }
        if (jwt.getClaim("nonce").asString() != sha256(bitte.nonce)) throw Abgelehnt("Der Nonce stimmt nicht.")
        val sub = jwt.subject ?: throw Abgelehnt("Apple hat keine Kennung geliefert.")
        return sitzung(nutzer.verknuepfe(nutzerId, Anbieter.APPLE, sub, jwt.getClaim("email").asString()))
    }

    /* ----------------------------- Sitzung ----------------------------- */

    fun erneuern(refreshToken: String): Sitzung {
        val id = tokens.loeseEin(refreshToken) ?: throw Abgelehnt("Die Sitzung ist abgelaufen. Bitte neu anmelden.")
        val n = nutzer.finde(id) ?: throw Abgelehnt("Das Konto gibt es nicht mehr.")
        return sitzung(n)
    }

    private fun sitzung(n: Nutzer): Sitzung {
        val jetzt = Instant.now()
        val access = JWT.create()
            .withIssuer(konfig.jwtIssuer)
            .withAudience(konfig.jwtAudience)
            .withSubject(n.id)
            .withIssuedAt(Date.from(jetzt))
            .withExpiresAt(Date.from(jetzt.plusSeconds(ACCESS_SEKUNDEN)))
            .sign(Algorithm.HMAC256(konfig.jwtGeheimnis))

        return Sitzung(access, tokens.lege(n.id, REFRESH_TAGE), ACCESS_SEKUNDEN, profil(n))
    }

    /** Abmelden. Der Client vergisst den Token ohnehin; hier wird er auch
     *  auf dem Server ungueltig. */
    fun ziehZurueck(refreshToken: String) = tokens.ziehZurueck(refreshToken)

    /* ----------------------------- Werkzeug ---------------------------- */

    /**
     * Prueft ein fremdes Token.
     *
     * `publikum` ist eine **Liste**, weil dieselbe Anmeldung aus zwei
     * Clients kommen kann und dabei verschiedene Publikumswerte traegt:
     * Die App meldet sich bei Apple mit der Bundle-ID an, der Browser
     * mit einer Service-ID; bei Google hat das Web eine eigene
     * Client-ID. Solange hier ein einzelner Wert stand, wies der Server
     * jede Anmeldung aus dem Browser ab.
     *
     * `withAnyOfAudience` verlangt, dass EINER der Werte passt — nicht
     * alle. Mit `withAudience` und mehreren Werten muessten sie alle im
     * Token stehen, und dann ginge gar nichts mehr.
     */
    private fun pruefeToken(
        token: String,
        aussteller: String,
        publikum: List<String>,
        jwks: (String) -> RSAPublicKey,
    ): DecodedJWT {
        val gueltig = publikum.filter { it.isNotBlank() }
        if (gueltig.isEmpty()) throw Abgelehnt("Für diesen Anbieter ist kein Publikum eingerichtet.")
        val roh = try { JWT.decode(token) } catch (e: Exception) { throw Abgelehnt("Das Token ist unlesbar.") }
        val kid = roh.keyId ?: throw Abgelehnt("Dem Token fehlt die Schlüsselkennung.")
        val key = try { jwks(kid) } catch (e: Exception) { throw Abgelehnt("Der Schlüssel ist unbekannt.") }
        return try {
            JWT.require(Algorithm.RSA256(key, null))
                .withIssuer(aussteller)
                .withAnyOfAudience(*gueltig.toTypedArray())
                .acceptLeeway(30)
                .build()
                .verify(token)
        } catch (e: Exception) {
            throw Abgelehnt("Die Anmeldung konnte nicht bestätigt werden.")
        }
    }

    private fun sha256(s: String): String =
        MessageDigest.getInstance("SHA-256").digest(s.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private companion object {
        const val ACCESS_SEKUNDEN = 15L * 60
        const val REFRESH_TAGE = 60L
    }
}
