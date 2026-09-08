package ch.studyswiss.service

import ch.studyswiss.Konfig
import ch.studyswiss.daten.Abos
import ch.studyswiss.daten.Familiencodes
import ch.studyswiss.model.AboStatus
import ch.studyswiss.model.Nutzer
import ch.studyswiss.model.Produkt
import ch.studyswiss.repo.NutzerRepo
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.security.SecureRandom
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.Base64

/**
 * StudySwiss Plus.
 *
 * ## Wie der Preis zustande kommt
 *
 * Der Markt für die Gymivorbereitung im Kanton Zürich (Stand August 2026):
 *
 * | Angebot | Preis |
 * |---|---|
 * | Präsenzkurs über eine Saison (Lern-Forum, Logos) | CHF 1'980 – 3'370 |
 * | Einzelnachhilfe | CHF 27 – 49 pro Lektion |
 * | GoGymi, Online-Plattform | CHF 49 im Monat, CHF 390 im Jahr |
 * | Edufox, Selbstlernmaterial | gratis |
 *
 * Daraus folgen drei Entscheide:
 *
 * 1. **Der Prüfungs-Pass ist das Hauptprodukt, nicht das Monatsabo.** Die App
 *    sagt von Anfang an: «Dein Termin gibt das Tempo vor.» Ein Produkt, das
 *    genau bis zu diesem Termin gilt, passt dazu — und Eltern müssen nichts
 *    kündigen und nichts im Kalender notieren.
 * 2. **CHF 129 für den Pass.** Das sind rund fünf Prozent eines Präsenzkurses
 *    und ein Drittel des Jahresabos beim direkten Mitbewerber. Wer schon einen
 *    Kurs bezahlt, gibt das für eine Ergänzung aus, ohne lange zu rechnen.
 * 3. **Ein Fach bleibt gratis, vollständig.** Nicht drei Aufgaben zur Probe,
 *    sondern Mathematik von A bis Z. Wer nichts zahlen kann, soll trotzdem
 *    üben können — und wer bezahlt, weiss vorher genau, was er bekommt.
 *
 * Das Monatsabo bleibt für die, die erst zwei Monate vor der Prüfung merken,
 * dass es eng wird. Es kostet CHF 19 und ist damit deutlich unter den CHF 49
 * des Mitbewerbers.
 *
 * Der Familien-Pass deckt Geschwister ab: Ein Kauf, drei Plätze — der eigene
 * und zwei Codes zum Weitergeben. Die zweite und dritte Anmeldung sind der
 * günstigste Weg, weitere Nutzer zu gewinnen: Die Eltern sind schon überzeugt.
 *
 * ## Wie geprüft wird
 *
 * Gekauft wird ausschliesslich über StoreKit 2 und Google Play Billing. Der
 * Server prüft jede Quittung **serverseitig** gegen die App Store Server API
 * bzw. die Google Play Developer API und führt den Status selbst.
 * **Dem Client wird nie geglaubt**, auch nicht, wenn er «gekauft» meldet.
 */
class AboService(private val nutzer: NutzerRepo, private val konfig: Konfig) {

    class Abgelehnt(text: String) : RuntimeException(text)

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }
    private val http = HttpClient { install(ContentNegotiation) { json(json) } }

    companion object {
        const val ID_MONAT = "ch.studyswiss.plus.monat"
        const val ID_PASS = "ch.studyswiss.plus.pass"
        const val ID_FAMILIE = "ch.studyswiss.plus.familie"

        /** Der Pass gilt bis 30 Tage nach der Prüfung — für die Nachbesprechung
         *  und für den Fall, dass der Termin verschoben wird. */
        const val PASS_PUFFER_TAGE = 30L
        /** Ohne gesetzten Termin gilt der Pass ein Jahr. */
        const val PASS_OHNE_TERMIN_TAGE = 365L
        const val FAMILIE_PLAETZE = 3

        /** `paymentState` bei Play: 1 = bezahlt, 2 = Testphase,
         *  3 = aufgeschobene Verlaengerung. 0 heisst «Zahlung ausstehend». */
        val ZAHLT = setOf(1, 2, 3)

        /** Was der Kauf-Screen anzeigt. Die Preise stehen auch in App Store
         *  Connect und in der Play Console — hier stehen sie nur zum Anzeigen. */
        val PRODUKTE = listOf(
            Produkt(
                id = ID_PASS,
                name = "Prüfungs-Pass",
                preis = "Fr. 129.–",
                untertitel = "Einmal zahlen, gilt bis zu deiner Prüfung",
                art = "pass",
                empfohlen = true,
                hinweis = "Kein Abo. Nichts zu kündigen.",
            ),
            Produkt(
                id = ID_FAMILIE,
                name = "Familien-Pass",
                preis = "Fr. 189.–",
                untertitel = "Für bis zu drei Kinder, je bis zur eigenen Prüfung",
                art = "familie",
                // ZWEI zum Weitergeben, nicht drei: `FAMILIE_PLAETZE` ist die Zahl
                // der Plaetze, und einer davon ist der eigene. Hier stand lange
                // «drei Codes» — eine falsche Zusage am Punkt der Kaufentscheidung.
                hinweis = "Du bekommst zwei Codes zum Weitergeben — für dich und zwei weitere.",
            ),
            Produkt(
                id = ID_MONAT,
                name = "Monatlich",
                preis = "Fr. 19.–",
                untertitel = "Monatlich kündbar",
                art = "monatlich",
                hinweis = "Lohnt sich bis etwa sechs Monate vor der Prüfung.",
            ),
        )
    }

    fun produkte(n: Nutzer): List<Produkt> {
        val tage = n.pruefungsdatum
            ?.let { ChronoUnit.DAYS.between(LocalDate.now(ZoneId.of("Europe/Zurich")), it) }
            ?: return PRODUKTE
        // Ehrlich rechnen: Wer nur noch kurz hat, fährt monatlich günstiger.
        // Das gehört in den Screen, nicht ins Kleingedruckte.
        val monate = Math.ceil(tage / 30.0).toInt().coerceAtLeast(1)
        val monatlichTotal = monate * 19
        return PRODUKTE.map { p ->
            when (p.art) {
                "monatlich" -> p.copy(
                    hinweis = "Bis zu deiner Prüfung sind das noch $monate Monate, " +
                        "zusammen Fr. $monatlichTotal.–.",
                    empfohlen = monatlichTotal < 129,
                )
                "pass" -> p.copy(
                    empfohlen = monatlichTotal >= 129,
                    hinweis = if (monatlichTotal >= 129)
                        "Günstiger als monatlich, und du musst nichts kündigen."
                    else
                        "Bei deinem Termin fährst du monatlich günstiger.",
                )
                else -> p
            }
        }
    }

    /* ============================== Status ============================== */

    fun status(n: Nutzer): AboStatus = transaction {
        val r = Abos.selectAll().where { Abos.nutzerId eq n.id }
            .orderBy(Abos.laeuftAb to SortOrder.DESC).firstOrNull()
        val ueberFamilie = Familiencodes.selectAll()
            .where { Familiencodes.eingeloestVon eq n.id }.count() > 0
        val frei = Familiencodes.selectAll()
            .where { (Familiencodes.besitzerId eq n.id) and (Familiencodes.eingeloestVon.isNull()) }
            .map { it[Familiencodes.code] }

        AboStatus(
            aktiv = n.hatPlus,
            bis = r?.get(Abos.laeuftAb)?.toString(),
            produkt = r?.get(Abos.produktId),
            art = when (r?.get(Abos.produktId)) {
                ID_MONAT -> "monatlich"
                ID_PASS -> "pass"
                ID_FAMILIE -> "familie"
                else -> if (ueberFamilie) "familie" else "keiner"
            },
            freieCodes = frei,
            ueberFamilie = ueberFamilie,
        )
    }

    /** Was ohne Plus geht. Gratis bleibt genug, dass die App ohne Kauf nützt. */
    fun darf(n: Nutzer, was: String): Boolean = when (was) {
        "standortbestimmung", "fortschritt", "fehlerarchiv", "lernpfad", "uebung_erstes_fach" -> true
        "alle_faecher", "selbsttest_pruefung", "aufsatzkorrektur", "eltern_report" -> n.hatPlus
        else -> n.hatPlus
    }

    /** Das erste Fach ist gratis — vollständig, nicht als Kostprobe. */
    fun gratisFach(faecher: List<String>): String = faecher.firstOrNull() ?: "mathematik"

    /* ================================ Apple ============================= */

    @Serializable private data class AppleAntwort(val signedTransactionInfo: String? = null)

    /**
     * Prüft die signierte Transaktion gegen die App Store Server API.
     *
     * StoreKit 2 liefert ein JWS. Wir lesen die Transaktions-ID heraus und
     * fragen Apple, ob es sie gibt — dem Client wird nichts geglaubt. Die
     * Antwort ist wieder ein JWS; für die Produktion muss zusätzlich die
     * Signaturkette gegen Apples Wurzelzertifikat geprüft werden.
     */
    suspend fun mitApple(n: Nutzer, signedTransaction: String): AboStatus {
        val nutzlast = jwsNutzlast(signedTransaction)
            ?: throw Abgelehnt("Die Quittung ist unlesbar.")
        val transaktionsId = feld(nutzlast, "transactionId")
            ?: throw Abgelehnt("Der Quittung fehlt die Transaktionsnummer.")
        val produktId = feld(nutzlast, "productId")
            ?: throw Abgelehnt("Der Quittung fehlt die Produktnummer.")

        if (konfig.entwicklung && konfig.appleServerToken == null) {
            // Ohne Schluessel aus App Store Connect laesst sich nicht pruefen.
            // Im Entwicklungsmodus geht es trotzdem weiter, damit man den
            // Ablauf testen kann — in Produktion wird abgelehnt.
            return schreibe(n, "apple", produktId, transaktionsId)
        }
        val token = konfig.appleServerToken
            ?: throw Abgelehnt("Die Kaufprüfung ist noch nicht eingerichtet.")

        val basis = if (konfig.entwicklung)
            "https://api.storekit-sandbox.itunes.apple.com" else "https://api.storekit.itunes.apple.com"
        val antwort: AppleAntwort = try {
            http.get("$basis/inApps/v1/transactions/$transaktionsId") {
                header(HttpHeaders.Authorization, "Bearer $token")
            }.body()
        } catch (e: Exception) {
            throw Abgelehnt("Der App Store hat den Kauf nicht bestätigt. Versuch es gleich nochmals.")
        }
        val geprueft = antwort.signedTransactionInfo?.let(::jwsNutzlast)
            ?: throw Abgelehnt("Der App Store hat den Kauf nicht bestätigt.")
        if (feld(geprueft, "productId") != produktId) {
            throw Abgelehnt("Die Quittung passt nicht zum gekauften Produkt.")
        }
        return schreibe(n, "apple", produktId, transaktionsId)
    }

    /* ================================ Google ============================ */

    /**
     * Die Felder beider Play-Ressourcen in einem Typ.
     *
     * `purchases.products.get` liefert `purchaseState`,
     * `purchases.subscriptions.get` stattdessen `paymentState` und
     * `expiryTimeMillis`. Welche Felder aktuell gelten, gehoert vor dem
     * ersten echten Kauf gegen die Play-Developer-API gegengelesen.
     */
    @Serializable private data class GoogleKauf(
        val purchaseState: Int? = null,
        val paymentState: Int? = null,
        val acknowledgementState: Int? = null,
        val expiryTimeMillis: String? = null,
    )

    suspend fun mitGoogle(n: Nutzer, purchaseToken: String, produktId: String): AboStatus {
        if (konfig.entwicklung && konfig.googleServerToken == null) {
            return schreibe(n, "google", produktId, purchaseToken.take(120))
        }
        val token = konfig.googleServerToken
            ?: throw Abgelehnt("Die Kaufprüfung ist noch nicht eingerichtet.")
        val paket = konfig.androidPaket

        val pfad = if (produktId == ID_MONAT)
            "subscriptions/$produktId/tokens/$purchaseToken" else "products/$produktId/tokens/$purchaseToken"
        val kauf: GoogleKauf = try {
            http.get("https://androidpublisher.googleapis.com/androidpublisher/v3/applications/$paket/purchases/$pfad") {
                header(HttpHeaders.Authorization, "Bearer $token")
            }.body()
        } catch (e: Exception) {
            throw Abgelehnt("Google Play hat den Kauf nicht bestätigt. Versuch es gleich nochmals.")
        }
        // purchaseState 0 heisst «bezahlt». Alles andere wird abgelehnt.
        //
        // Achtung: Das Feld liefert nur die PRODUKT-Ressource. Die
        // ABONNEMENT-Ressource, die fuer `ID_MONAT` abgefragt wird, kennt
        // `purchaseState` nicht — sie liefert `paymentState` und
        // `expiryTimeMillis`. Die Bedingung lief dort also immer ins Leere,
        // und jeder Token, fuer den Google ueberhaupt antwortete, wurde
        // angenommen. Deshalb wird beides geprueft.
        if (kauf.purchaseState != null && kauf.purchaseState != 0) {
            throw Abgelehnt("Der Kauf ist nicht abgeschlossen.")
        }
        if (produktId == ID_MONAT && kauf.paymentState != null && kauf.paymentState !in ZAHLT) {
            throw Abgelehnt("Für dieses Abo liegt keine Zahlung vor.")
        }

        // Wann das Abo endet, sagt der Laden — nicht wir. Vorher stand hier
        // pauschal «heute plus 31 Tage», und `expiryTimeMillis` wurde zwar
        // gelesen, aber nie benutzt: Ein gekuendigtes Abo verlaengerte Plus
        // bei jedem Aufruf um einen weiteren Monat.
        val bis = kauf.expiryTimeMillis?.toLongOrNull()?.let(Instant::ofEpochMilli)
        if (bis != null && bis.isBefore(Instant.now())) {
            throw Abgelehnt("Dieses Abo ist abgelaufen. Erneuere es im Play Store.")
        }
        return schreibe(n, "google", produktId, purchaseToken.take(120), bis)
    }

    /* ============================= Schreiben ============================ */

    /**
     * Plus aus einer Schullizenz freischalten.
     *
     * Kein Kauf im Laden, keine Quittung — die Schule hat bezahlt, und
     * das Kind loest nur einen Code ein. Die Laufzeit kommt von der
     * Lizenz und nicht vom eigenen Pruefungstermin: Die Schule hat fuer
     * ein Schuljahr bezahlt, und laenger gilt es nicht.
     */
    fun schaltePlusFrei(
        n: Nutzer,
        plattform: String,
        code: String,
        bis: java.time.LocalDate,
    ): AboStatus = schreibe(
        n, plattform, "ch.studyswiss.plus.schule", code,
        bis.plusDays(1).atStartOfDay(java.time.ZoneId.of("Europe/Zurich")).toInstant(),
    )

    private fun schreibe(
        n: Nutzer,
        plattform: String,
        produktId: String,
        original: String,
        laeuftAbLaden: Instant? = null,
    ): AboStatus {
        // Der Store bestaetigt nur, DASS es den Kauf gibt — nicht, WEM er
        // gehoert. Ohne diese Pruefung liess sich dieselbe Quittung von
        // beliebig vielen Konten einloesen: Einer kauft den Pass, gibt den
        // JWS weiter, und die ganze Klasse hat Plus.
        //
        // Sauber waere zusaetzlich `appAccountToken` (StoreKit 2) bzw.
        // `obfuscatedAccountId` (Play Billing), beim Kauf vom Client gesetzt
        // und hier gegen das eigene Konto geprueft. Bis dahin gilt: eine
        // Quittung, ein Konto.
        transaction {
            val fremd = Abos.selectAll()
                .where { (Abos.plattform eq plattform) and (Abos.originalId eq original) }
                .firstOrNull()
            if (fremd != null && fremd[Abos.nutzerId] != n.id) {
                throw Abgelehnt(
                    "Dieser Kauf gehört bereits zu einem anderen Konto. " +
                        "Melde dich mit diesem Konto an oder nutze «Kauf wiederherstellen».",
                )
            }
        }

        val bis = laeuftAbLaden ?: laeuftAb(n, produktId)
        transaction {
            Abos.deleteWhere { (Abos.nutzerId eq n.id) and (Abos.plattform eq plattform) }
            Abos.insert {
                it[nutzerId] = n.id
                it[Abos.plattform] = plattform
                it[Abos.produktId] = produktId
                it[originalId] = original
                it[laeuftAb] = bis
                it[geprueftAm] = Instant.now()
            }
            // Beim Familien-Pass entstehen drei Codes: einer für das eigene
            // Konto, zwei zum Weitergeben.
            if (produktId == ID_FAMILIE) {
                val da = Familiencodes.selectAll()
                    .where { Familiencodes.besitzerId eq n.id }.count()
                if (da == 0L) {
                    repeat(FAMILIE_PLAETZE - 1) {
                        Familiencodes.insert { r ->
                            r[code] = neuerCode()
                            r[besitzerId] = n.id
                            r[erstelltAm] = Instant.now()
                            r[laeuftAb] = bis
                        }
                    }
                }
            }
        }
        nutzer.setzePlus(n.id, bis)
        return status(nutzer.finde(n.id)!!)
    }

    /**
     * Der Pass gilt bis 30 Tage nach der Prüfung. Wer keinen Termin gesetzt
     * hat, bekommt ein Jahr — und wer den Termin später setzt, verlängert
     * damit nicht rückwirkend.
     */
    private fun laeuftAb(n: Nutzer, produktId: String): Instant = when (produktId) {
        ID_MONAT -> Instant.now().plus(31, ChronoUnit.DAYS)
        else -> n.pruefungsdatum
            ?.plusDays(PASS_PUFFER_TAGE)
            ?.atStartOfDay(ZoneId.of("Europe/Zurich"))?.toInstant()
            ?.takeIf { it.isAfter(Instant.now()) }
            ?: Instant.now().plus(PASS_OHNE_TERMIN_TAGE, ChronoUnit.DAYS)
    }

    /* =========================== Familiencodes ========================== */

    fun loeseCodeEin(n: Nutzer, roh: String): AboStatus {
        val code = roh.trim().uppercase().replace("-", "").replace(" ", "")
        val bis = transaction {
            val r = Familiencodes.selectAll().where { Familiencodes.code eq code }.singleOrNull()
                ?: throw Abgelehnt("Diesen Code gibt es nicht. Prüfe die Schreibweise.")
            if (r[Familiencodes.eingeloestVon] != null) {
                throw Abgelehnt("Dieser Code ist schon eingelöst.")
            }
            if (r[Familiencodes.besitzerId] == n.id) {
                throw Abgelehnt("Das ist dein eigener Code — du hast Plus bereits.")
            }
            if (r[Familiencodes.laeuftAb].isBefore(Instant.now())) {
                throw Abgelehnt("Dieser Code ist abgelaufen.")
            }
            Familiencodes.update({ Familiencodes.code eq code }) {
                it[eingeloestVon] = n.id
                it[eingeloestAm] = Instant.now()
            }
            r[Familiencodes.laeuftAb]
        }
        // Das eigene Prüfungsdatum zählt, nicht das des Geschwisters.
        //
        // Hier stand `listOfNotNull(bis, eigenes).max()` — also das SPAETERE der
        // beiden. Wer den Code einer aelteren Schwester mit spaeterem Termin
        // einloeste, bekam deren Laufzeit. §4.9 sagt das Gegenteil, und der
        // Kommentar darueber sagte es auch schon.
        //
        // Ohne eigenen Termin bleibt die Laufzeit des Codes der einzige
        // Anhaltspunkt — dann gilt sie.
        val eigenes = n.pruefungsdatum
            ?.plusDays(PASS_PUFFER_TAGE)
            ?.atStartOfDay(ZoneId.of("Europe/Zurich"))?.toInstant()
        nutzer.setzePlus(n.id, eigenes ?: bis)
        return status(nutzer.finde(n.id)!!)
    }

    /** Lesbar am Telefon: keine 0/O- und 1/I-Verwechslung. */
    private fun neuerCode(): String {
        val zeichen = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        val z = SecureRandom()
        return (1..8).map { zeichen[z.nextInt(zeichen.length)] }.joinToString("")
    }

    /* ============================== Werkzeug ============================ */

    /** Liest die Nutzlast eines JWS, ohne die Signatur zu prüfen. Die Prüfung
     *  macht der Aufruf gegen den Store — das hier ist nur zum Auslesen. */
    private fun jwsNutzlast(jws: String): String? {
        val teile = jws.split(".")
        if (teile.size != 3) return null
        return try {
            String(Base64.getUrlDecoder().decode(teile[1]))
        } catch (e: Exception) {
            null
        }
    }

    private fun feld(json: String, name: String): String? =
        Regex("\"$name\"\\s*:\\s*\"?([^\",}]+)\"?").find(json)?.groupValues?.get(1)?.trim()
}
