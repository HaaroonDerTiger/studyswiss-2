package ch.studyswiss

import ch.studyswiss.daten.*
import ch.studyswiss.model.Problem
import ch.studyswiss.repo.*
import ch.studyswiss.route.Routen
import ch.studyswiss.service.*
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.calllogging.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.defaultheaders.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory

fun main() {
    val konfig = Konfig()
    embeddedServer(Netty, port = konfig.port, host = "0.0.0.0") { modul(konfig) }.start(wait = true)
}

fun Application.modul(konfig: Konfig) {
    val log = LoggerFactory.getLogger("studyswiss")

    /* ------------------------------ Datenbank ------------------------- */
    val quelle = HikariDataSource(
        HikariConfig().apply {
            jdbcUrl = konfig.dbUrl
            username = konfig.dbBenutzer
            password = konfig.dbPasswort
            maximumPoolSize = 10
        },
    )
    Database.connect(quelle)
    transaction { SchemaUtils.create(Nutzers, RefreshTokens, Versuche, Sets, Aufsaetze, Abos, Familiencodes,
        Schulen, Offerten, Bestellungen, Rechnungen, Lizenzcodes,
    ) }

    /* -------------------------- Inhalt einmal laden -------------------- */
    log.info(
        "Themenbäume: {} · Mathematik-Templates: {} · Deutsch-Blöcke: {} · Aufsatzthemen: {}",
        Katalog.baeume.keys, Katalog.nutzbar.size, Katalog.textNutzbar.size, Katalog.aufsatzThemen.size,
    )

    /* ------------------------------ Dienste ---------------------------- */
    val nutzerRepo = NutzerRepo()
    val versuchRepo = VersuchRepo()
    val setRepo = SetRepo()
    val tokenRepo = TokenRepo()
    val aufsatzRepo = AufsatzRepo()

    val aufgaben = AufgabenService()
    val scheduler = Scheduler(versuchRepo)
    val lernpfad = Lernpfad(versuchRepo, scheduler)
    val lern = LernService(nutzerRepo, versuchRepo, setRepo, aufgaben, scheduler, lernpfad)
    val auth = AuthService(nutzerRepo, tokenRepo, konfig, lern::profil)
    val abo = AboService(nutzerRepo, konfig)
    val aufsatz = AufsatzService(aufsatzRepo, konfig)
    val schule = SchulService(konfig)

    /* ------------------------------- Plugins --------------------------- */
    install(DefaultHeaders) {
        header("X-Content-Type-Options", "nosniff")
        header("Referrer-Policy", "no-referrer")
    }
    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; encodeDefaults = true; explicitNulls = false })
    }
    install(CORS) {
        allowMethod(HttpMethod.Patch)
        allowMethod(HttpMethod.Delete)
        allowHeader(HttpHeaders.Authorization)
        allowHeader(HttpHeaders.ContentType)
        // Der eigene Kopf ist zugleich der Schutz gegen fremde Anfragen:
        // Einen selbst gesetzten Kopf kann eine andere Seite nur mit einer
        // Vorabanfrage schicken, und die laesst dieses CORS nur fuer die
        // eigenen Adressen zu. Darum darf `/auth/refresh` das Cookie lesen,
        // ohne dass eine fremde Seite es missbrauchen kann.
        allowHeader("X-Client")
        // Ohne das reist das Cookie mit dem Refresh-Token nicht mit, und
        // niemand bleibt ueber einen Seitenwechsel hinweg angemeldet.
        allowCredentials = true
        if (konfig.entwicklung) {
            anyHost()
        } else {
            // Frueher stand hier genau ein Host. Eine Website auf einer
            // zweiten Adresse wurde damit stumm blockiert: Der Browser
            // meldet es dem Server nicht, im Protokoll steht nichts, und
            // auf dem Schirm bleibt eine leere Karte.
            konfig.webHerkunft.forEach { allowHost(it, schemes = listOf("https")) }
        }
    }

    // Fehler gehen nach RFC 9457 hinaus, mit deutschsprachigem `detail`.
    install(StatusPages) {
        // Ein fehlerhafter Anfragekoerper ist ein Fehler des Aufrufers, kein
        // Serverfehler. Ohne diesen Zweig fing der Throwable-Fall unten alles
        // ab: Eine Offerte mit einem fehlenden Feld bekam 500 und den Satz
        // «Dein Fortschritt ist gespeichert» — vor einer Schulsekretaerin,
        // die gar keinen Fortschritt hat, und ohne zu sagen, was fehlt.
        exception<BadRequestException> { call, e ->
            // §4.10 verlangt ein deutschsprachiges `detail`. Die Meldung des
            // Serialisierers ist englisch und technisch («Fields [...] are
            // required for type with serial name ...») — sie nennt aber die
            // fehlenden Felder, und die sind das einzig Nuetzliche daran.
            val roh = e.cause?.message ?: e.message ?: ""
            val fehlend = Regex("""Fields \[([^\]]+)] are required""")
                .find(roh)?.groupValues?.get(1)
            call.respond(
                HttpStatusCode.BadRequest,
                Problem(
                    "about:blank", "Die Anfrage ist unvollständig", 400,
                    if (fehlend != null) "Diese Angaben fehlen: $fehlend."
                    else "Bitte prüfe die Angaben.",
                ),
            )
        }
        exception<Throwable> { call, e ->
            log.error("Unerwarteter Fehler", e)
            call.respond(
                HttpStatusCode.InternalServerError,
                Problem("about:blank", "Da ist etwas schiefgelaufen", 500,
                    "Versuch es gleich nochmals. Dein Fortschritt ist gespeichert."),
            )
        }
        status(HttpStatusCode.Unauthorized) { call, _ ->
            call.respond(
                HttpStatusCode.Unauthorized,
                Problem("about:blank", "Nicht angemeldet", 401, "Bitte melde dich neu an."),
            )
        }
    }

    install(Authentication) {
        jwt("sitzung") {
            verifier(
                JWT.require(Algorithm.HMAC256(konfig.jwtGeheimnis))
                    .withIssuer(konfig.jwtIssuer)
                    .withAudience(konfig.jwtAudience)
                    .build(),
            )
            validate { if (it.payload.subject.isNullOrBlank()) null else JWTPrincipal(it.payload) }
        }
    }

    Routen(auth, nutzerRepo, lern, aufgaben, aufsatz, abo, schule).installiere(this)

    if (konfig.entwicklung) log.info("Entwicklungsmodus: H2 im Speicher, CORS offen, Kaufprüfung im Testmodus.")
}
