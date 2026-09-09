package ch.studyswiss

/**
 * Alles Umgebungsabhaengige an einer Stelle. Keine Geheimnisse im Code:
 * Was hier einen Vorgabewert hat, ist entweder harmlos oder nur im
 * Entwicklungsmodus brauchbar.
 */
data class Konfig(
    val port: Int = env("PORT")?.toIntOrNull() ?: 8080,
    val entwicklung: Boolean = env("STUDYSWISS_UMGEBUNG") != "produktion",
    val dbUrl: String = env("DB_URL") ?: "jdbc:h2:mem:studyswiss;DB_CLOSE_DELAY=-1",
    val dbBenutzer: String = env("DB_BENUTZER") ?: "sa",
    val dbPasswort: String = env("DB_PASSWORT") ?: "",

    val jwtIssuer: String = env("JWT_ISSUER") ?: "studyswiss",
    val jwtAudience: String = env("JWT_AUDIENCE") ?: "studyswiss-app",
    val jwtGeheimnis: String = env("JWT_GEHEIMNIS") ?: "nur-für-die-entwicklung-nicht-in-produktion",

    val appleBundleId: String = env("APPLE_BUNDLE_ID") ?: "ch.studyswiss.app",
    val androidPaket: String = env("ANDROID_PAKET") ?: "ch.studyswiss.app",
    val googleClientId: String = env("GOOGLE_CLIENT_ID") ?: "",

    /**
     * Die Website ist ein zweiter Client desselben Backends — und im Web
     * heissen die Publikumswerte anders als in der App.
     *
     * Bei Apple meldet man sich im Browser ueber eine **Service-ID** an,
     * nicht ueber die Bundle-ID; bei Google ueber eine eigene
     * Web-Client-ID. Solange hier nur ein Wert stand, wies der Server
     * jede Anmeldung aus dem Browser ab — mit «Der Nonce stimmt nicht»,
     * was in die Irre fuehrt, weil der Nonce gar nicht das Problem war.
     */
    val appleServiceId: String? = env("APPLE_SERVICE_ID"),
    val googleWebClientId: String? = env("GOOGLE_WEB_CLIENT_ID"),

    /**
     * Woher der Browser kommen darf. CORS liess frueher genau einen Host
     * zu; eine Website auf einer zweiten Adresse wurde stumm blockiert —
     * der Browser meldet das nicht an den Server, und im Protokoll steht
     * nichts. Mehrere Adressen, mit Komma getrennt.
     */
    val webHerkunft: List<String> = (env("WEB_HERKUNFT") ?: "studyswiss.ch,www.studyswiss.ch,app.studyswiss.ch")
        .split(",").map { it.trim() }.filter { it.isNotBlank() },
    /** Signierter JWT für die App Store Server API. Ohne ihn wird in
     *  Produktion jeder Kauf abgelehnt — lieber kein Plus als ein Plus,
     *  das sich jeder selbst ausstellt. */
    val appleServerToken: String? = env("APPLE_SERVER_TOKEN"),
    val googleServerToken: String? = env("GOOGLE_SERVER_TOKEN"),

    val modell: String = env("MODELL") ?: "claude-sonnet-5",
    val modellSchluessel: String? = env("ANTHROPIC_API_KEY"),

    /**
     * Absender und Bankverbindung fuer Offerten und Rechnungen.
     *
     * Sie stehen hier und nicht im Quelltext der Website, damit sie an
     * einer Stelle gepflegt sind. Ohne sie laesst sich keine gueltige
     * Rechnung erzeugen — darum lehnt der Server in Produktion die
     * Schul-Bestellung ab, statt ein Papier mit Platzhaltern zu
     * verschicken, das die Buchhaltung nicht buchen kann.
     */
    val rechnungAbsender: String = env("RECHNUNG_ABSENDER") ?: "StudySwiss",
    val rechnungZusatz: String = env("RECHNUNG_ZUSATZ") ?: "",
    val rechnungStrasse: String = env("RECHNUNG_STRASSE") ?: "",
    val rechnungPlz: String = env("RECHNUNG_PLZ") ?: "",
    val rechnungOrt: String = env("RECHNUNG_ORT") ?: "",
    val rechnungUid: String = env("RECHNUNG_UID") ?: "",
    val rechnungEmail: String = env("RECHNUNG_EMAIL") ?: "rechnungen@studyswiss.ch",
    /** QR-IBAN (Format CHxx 3xxxx ...) fuer Zahlungen mit QR-Referenz. */
    val rechnungIban: String = env("RECHNUNG_IBAN") ?: "",
    /**
     * Der Mehrwertsteuersatz in Prozent.
     *
     * Hier stand der Normalsatz 8.1 als Vorgabe, und §10 fuehrte als offenen
     * Punkt, ob digitale Lernmittel ueberhaupt steuerpflichtig sind. Der
     * Entscheid ist gefallen: **fuer StudySwiss ist er 0.** Die Vorgabe steht
     * darum auf 0 und nicht mehr auf 8.1 — wer `MWST_SATZ` zu setzen vergisst,
     * soll keine Steuer auf einer Rechnung ausweisen, die gar nicht geschuldet
     * ist. Der umgekehrte Fehler waere der teurere.
     *
     * Bei 0 wird auf Offerte, Bestellung und Rechnung **keine** MWST-Zeile
     * gezeigt (siehe `beleg.js`, `bestellen.js`, `rechner.js`).
     */
    val mwstSatz: Double = env("MWST_SATZ")?.toDoubleOrNull() ?: 0.0,
    val zahlungsfristTage: Int = env("ZAHLUNGSFRIST_TAGE")?.toIntOrNull() ?: 30,
) {
    init {
        if (!entwicklung) {
            require(jwtGeheimnis.length >= 32 && !jwtGeheimnis.startsWith("nur-für")) {
                "In Produktion muss JWT_GEHEIMNIS gesetzt sein."
            }
            require(googleClientId.isNotBlank()) { "In Produktion muss GOOGLE_CLIENT_ID gesetzt sein." }
            require(webHerkunft.isNotEmpty()) { "In Produktion muss WEB_HERKUNFT gesetzt sein." }
        }
    }

    companion object {
        private fun env(name: String): String? = System.getenv(name)?.takeIf { it.isNotBlank() }
    }
}
