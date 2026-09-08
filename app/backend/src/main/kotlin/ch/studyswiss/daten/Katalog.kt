package ch.studyswiss.daten

import ch.studyswiss.engine.TemplateSpec
import ch.studyswiss.engine.TextTemplateSpec
import ch.studyswiss.model.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable

/**
 * Alles Inhaltliche liegt in `resources/` und wird beim Start einmal gelesen.
 * Es gibt keinen Pfad, auf dem Themenbaum oder Templates zur Laufzeit von
 * aussen veraendert werden koennen — Inhalt ist Teil des Builds, nicht der
 * Datenbank.
 */
object Katalog {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }

    private fun lies(pfad: String): String =
        Katalog::class.java.getResourceAsStream(pfad)?.bufferedReader()?.readText()
            ?: error("Ressource $pfad fehlt")

    @Serializable
    private data class KatalogDatei(
        val kantone: List<Kanton>,
        val pruefungen: List<Pruefung>,
        val schultypen: Map<String, List<SchultypEintrag>>,
        val termine: List<TerminEintrag>,
        val pruefungsfaecher: List<Pruefungsfach>,
        val bereiche: List<Bereich>,
    )

    /** Ein Verzeichnis neben den Dateien sagt, welche es gibt. So braucht
     *  weder ein neuer Baum noch eine neue Vorlagendatei eine Kotlin-Aenderung
     *  — und was im Verzeichnis fehlt, faellt beim Pruefen auf, statt still
     *  zu verschwinden. */
    @Serializable private data class Verzeichnis(val dateien: List<String>)

    private val datei: KatalogDatei by lazy { json.decodeFromString(lies("/katalog.json")) }

    val kantone: List<Kanton> get() = datei.kantone

    /* -------------------- Fächer und Bereiche -------------------------
       Zwei Ebenen, und der Unterschied ist wichtig:

       · Ein PRUEFUNGSFACH ist, was auf dem Prüfungsblatt steht — Mathematik,
         Deutsch, allenfalls Französisch. Es hat keinen Themenbaum.
       · Ein BEREICH hat einen: Sprachbetrachtung, Textverständnis, Aufsatz.
         Bei Mathematik fallen beide zusammen.

       Die Aufgaben tragen den Bereich in ihrem Feld `fach`. Der Name bleibt,
       weil er in Vorlagen, Vorschau und gespeichertem Fortschritt steht;
       umzubenennen wäre eine Datenmigration ohne Gegenwert. */

    /**
     * Die Faecher — mit ihren Bereichen, ausgerechnet statt gepflegt.
     *
     * In `katalog.json` steht die Zugehoerigkeit nur EINMAL, naemlich am
     * Bereich. Frueher stand sie zusaetzlich am Fach; zwei Listen fuer
     * dieselbe Sache laufen frueher oder spaeter auseinander, und dann zeigt
     * die App ein Fach ohne Inhalt oder verschweigt einen Bereich.
     */
    val pruefungsfaecher: List<Pruefungsfach> by lazy {
        datei.pruefungsfaecher.map { f ->
            f.copy(bereiche = datei.bereiche.filter { it.pruefungsfach == f.id }.map { it.id })
        }
    }
    val bereiche: List<Bereich> get() = datei.bereiche

    /* ---------------------------- Pruefungen --------------------------- */

    val pruefungen: List<Pruefung> get() = datei.pruefungen

    fun pruefung(id: String?): Pruefung? = datei.pruefungen.firstOrNull { it.id == id }

    fun pruefungsfach(id: String): Pruefungsfach? = pruefungsfaecher.firstOrNull { it.id == id }
    fun bereich(id: String): Bereich? = datei.bereiche.firstOrNull { it.id == id }

    /** Zu welchem Prüfungsfach ein Bereich gehört. */
    fun fachVonBereich(bereich: String): String? = bereich(bereich)?.pruefungsfach

    /**
     * Die Bereiche eines Prüfungsfachs, die WIRKLICH etwas zu üben haben.
     *
     * Ein Bereich ohne Themenbaum — Französisch ist vorbereitet, aber leer —
     * erscheint nirgends. Sonst stünde in der App ein Fach, das beim
     * Antippen nichts zeigt.
     */
    fun bereicheVon(fachId: String): List<String> =
        pruefungsfach(fachId)?.bereiche.orEmpty().filter { b ->
            bereich(b)?.art == "aufsatz" || b in baeume
        }

    /**
     * Dieselbe Frage, aber fuer einen bestimmten Schultyp — und das ist die
     * Fassung, die im Betrieb gilt.
     *
     * Zuerich und Bern pruefen beide «Deutsch», meinen damit aber nicht
     * dasselbe: In Zuerich gehoeren Sprachbetrachtung, Textverstaendnis und
     * Aufsatz dazu, in Bern die Berner Fassungen davon — und an der FMS Bern
     * nur der Aufsatz, weil die Deutschpruefung dort aus nichts anderem
     * besteht.
     *
     * Es gibt hier bewusst KEINEN Rueckfall auf die Bereiche des Fachs. Ein
     * Rueckfall haette einem Berner Schueler stillschweigend Zuercher Stoff
     * gezeigt, sobald in seiner Pruefung ein Bereich fehlt — und niemand
     * haette es gemerkt. Fehlt etwas, ist die richtige Antwort «nichts», und
     * der Kantonspruefer schlaegt an. Die Liste des Fachs gilt nur, solange
     * ueberhaupt kein Schultyp gewaehlt ist.
     */
    fun bereicheVon(schultyp: Schultyp?, fachId: String): List<String> {
        val eigene = schultyp?.bereiche?.filter { fachVonBereich(it) == fachId }
            ?: bereicheVon(fachId)
        return eigene.filter { b -> bereich(b)?.art == "aufsatz" || b in baeume }
    }

    /* --------------------------- Schultypen ---------------------------
       Ein Schultyp im Katalog ist nur ein Name und ein Verweis auf seine
       Pruefung. Alles Weitere — Faecher, Bereiche, Dauer, Hilfsmittel,
       Aufsatzarten — steht an der Pruefung und wird hier EINMAL
       zusammengesetzt. So kann keine Stelle im Code eine andere Antwort
       geben als eine andere. */

    private val aufgeloest: Map<String, List<Schultyp>> by lazy {
        datei.schultypen.mapValues { (_, liste) -> liste.map(::loese) }
    }

    private fun loese(e: SchultypEintrag): Schultyp {
        val p = pruefung(e.pruefung)
            ?: error("Schultyp ${e.id} verweist auf die Pruefung ${e.pruefung}, die es nicht gibt")
        // Nur Teile, fuer die die App wirklich etwas hat. Ein Teil mit
        // `angeboten = false` — Berns englische Sonderpruefung — bleibt in
        // der Pruefung stehen, taucht in der App aber nirgends auf.
        val teile = p.teile.filter { it.angeboten }
        val faecher = teile.map { it.pruefungsfach }.distinct()
        return Schultyp(
            id = e.id,
            name = e.name,
            pruefung = p.kuerzel.ifBlank { p.name },
            kuerzel = p.kuerzel,
            pruefungsfaecher = faecher,
            bedingungen = teile.firstOrNull()
                ?.let { bedingungenAus(it, listOf(it.bemerkung)) } ?: Bedingungen(),
            aufsatzarten = p.aufsatzarten,
            bereiche = teile.flatMap { it.bereiche }.distinct(),
            // Hat ein Fach mehrere Teile — Mathematik I und II —, gilt der
            // strengere: der ohne Taschenrechner und mit der kuerzeren Zeit.
            // Wer danach uebt, ist auf beide vorbereitet; umgekehrt nicht.
            bedingungenJeFach = faecher.associateWith { fach ->
                val desFachs = teile.filter { it.pruefungsfach == fach }
                // Die Bemerkungen ALLER Teile des Fachs, nicht nur die des
                // strengsten: Deutsch besteht in Solothurn aus Aufsatz und
                // Sprachbogen, und beide sagen etwas Eigenes.
                bedingungenAus(desFachs.minByOrNull { rang(it) }!!,
                    desFachs.map { it.bemerkung })
            },
            pruefungId = p.id,
            faecherZeile = faecher.mapNotNull { pruefungsfach(it)?.name }.joinToString(" · "),
            teile = teile,
            wahl = p.wahl,
        )
    }

    /** Je kleiner, desto strenger. */
    private fun rang(t: Pruefungsteil): Int =
        (if (t.hilfsmittel.taschenrechner == "keiner") 0 else 1000) + t.dauerMinuten

    private fun bedingungenAus(t: Pruefungsteil, bemerkungen: List<String> = emptyList()) = Bedingungen(
        taschenrechner = t.hilfsmittel.taschenrechner != "keiner",
        zurueckblaettern = t.zurueckblaettern,
        uhrPausiert = t.uhrPausiert,
        hinweise = t.hinweise,
        dauerMinuten = t.dauerMinuten,
        anzahlAufgaben = t.anzahlAufgaben,
        hilfsmittelText = t.hilfsmittel.rechnerText,
        bemerkungen = bemerkungen.filter { it.isNotBlank() },
    )

    fun schultypen(kanton: String): List<Schultyp> = aufgeloest[kanton] ?: emptyList()

    fun schultyp(kanton: String, id: String?): Schultyp? {
        val liste = schultypen(kanton)
        return liste.firstOrNull { it.id == id } ?: liste.firstOrNull()
    }

    /** Der erste aktive Kanton — das, was gilt, solange niemand gewaehlt hat. */
    val standardKanton: String by lazy {
        kantone.firstOrNull { it.aktiv }?.kuerzel ?: kantone.first().kuerzel
    }

    /**
     * Der naechste Termin dieses Schultyps.
     *
     * St. Gallen prueft zweimal im Jahr; darum wird nicht der erste
     * genommen, sondern der naechste, der noch bevorsteht. Und Basel-Stadt
     * nennt statt eines Datums ein Fenster — dann gilt dessen letzter Tag,
     * denn wer damit rechnet, kommt nie zu spaet.
     */
    fun termin(kanton: String, schultyp: String): Termin? {
        val t = schultyp(kanton, schultyp) ?: return null
        val heute = java.time.LocalDate.now()
        val alle = datei.termine.filter { it.pruefung == t.pruefungId }
            .mapNotNull { e ->
                val tag = e.datum ?: e.bis ?: return@mapNotNull null
                Termin(
                    kanton = kanton, schultyp = t.id, datum = tag,
                    bemerkung = e.bemerkung, session = e.session,
                    genau = e.datum != null,
                )
            }
            .sortedBy { it.datum }
        return alle.firstOrNull { java.time.LocalDate.parse(it.datum) >= heute }
            ?: alle.lastOrNull()
    }

    /* ---------------------------- Themenbäume ------------------------- */

    /**
     * Welche Baeume es gibt, steht in `themen/index.json` — genau wie bei den
     * Vorlagen. Ein neuer Kanton bringt eigene Baeume mit; sie hier
     * aufzuzaehlen haette bedeutet, dass jeder Kanton eine Kotlin-Aenderung
     * kostet, obwohl er nur Inhalt ist.
     */
    val baeume: Map<String, Themenbaum> by lazy {
        json.decodeFromString<Verzeichnis>(lies("/themen/index.json"))
            .dateien
            .map { json.decodeFromString<Themenbaum>(lies("/themen/$it")) }
            .associateBy { it.fach }
    }

    fun baum(fach: String): Themenbaum = baeume[fach] ?: error("Kein Themenbaum für $fach")

    /** Alle Unterthemen aller Faecher, nach Code. Codes sind je Fach eindeutig. */
    val unterthemen: Map<Pair<String, String>, Unterthema> by lazy {
        buildMap {
            baeume.values.forEach { b ->
                b.oberthemen.forEach { o -> o.unterthemen.forEach { u -> put(b.fach to u.code, u) } }
            }
        }
    }

    fun unterthema(fach: String, code: String): Unterthema? =
        baeume[fach]?.oberthemen?.firstNotNullOfOrNull { o -> o.unterthemen.firstOrNull { it.code == code } }

    fun oberthemaVon(fach: String, code: String): Oberthema? =
        baeume[fach]?.oberthemen?.firstOrNull { o -> o.unterthemen.any { it.code == code } }

    /** Punkteanteil des Oberthemas, in dem das Unterthema steht. 0..1. */
    fun pruefungsgewicht(fach: String, code: String): Double {
        val o = oberthemaVon(fach, code) ?: return 0.0
        val total = baum(fach).oberthemen.sumOf { it.punkte }
        return if (total == 0) 0.0 else o.punkte.toDouble() / total
    }

    /* ---------------------------- Templates ---------------------------- */

    /**
     * Welche Dateien es gibt, steht jeweils in einem Verzeichnis neben ihnen.
     * So braucht eine neue Vorlagendatei keine Kotlin-Aenderung — und was
     * im Verzeichnis fehlt, faellt beim Pruefen auf, statt still zu
     * verschwinden.
     */
    private inline fun <reified T> ausVerzeichnis(name: String): List<T> =
        json.decodeFromString<Verzeichnis>(lies("/templates/$name"))
            .dateien
            .flatMap { json.decodeFromString<List<T>>(lies("/templates/$it")) }

    val templates: List<TemplateSpec> by lazy { ausVerzeichnis("vorlagen.index.json") }

    /**
     * Bloecke im Textformat. Das sind alle Deutsch-Aufgaben und jene
     * Algebra-Aufgaben, deren Loesung ein Term ist und keine Zahl —
     * «(x+3)(x-3)» laesst sich nicht mit dem Zahlengenerator pruefen.
     *
     * Welche Dateien es gibt, steht in einem Verzeichnis neben ihnen. So
     * braucht ein neuer Block keine Kotlin-Aenderung.
     */
    val textTemplates: List<TextTemplateSpec> by lazy { ausVerzeichnis("bloecke.index.json") }

    /**
     * Alles ausser `entwurf` erreicht Nutzerinnen und Nutzer — also `live`,
     * `review` UND `importiert`.
     *
     * Hier stand «Nur `live` und `review`». Das war falsch und irrefuehrend:
     * 66 der 90 Templates und 57 der 82 Bloecke stehen auf `importiert` und
     * werden sehr wohl ausgeliefert. Sie tragen nach §4.5.1 andere
     * Zusicherungen, aber keine geringere Sichtbarkeit.
     */
    val nutzbar: List<TemplateSpec> by lazy { templates.filter { it.status != "entwurf" } }
    val textNutzbar: List<TextTemplateSpec> by lazy { textTemplates.filter { it.status != "entwurf" } }

    fun templatesFuer(fach: String, unterthema: String): List<TemplateSpec> =
        nutzbar.filter { it.fach == fach && unterthema in it.unterthemen }

    fun textTemplatesFuer(fach: String, unterthema: String): List<TextTemplateSpec> =
        textNutzbar.filter { it.fach == fach && unterthema in it.unterthemen }

    fun template(id: String): TemplateSpec? = templates.firstOrNull { it.templateId == id }
    fun textTemplate(id: String): TextTemplateSpec? = textTemplates.firstOrNull { it.templateId == id }

    /** Unterthemen, fuer die es mindestens einen nutzbaren Block gibt —
     *  gleichgueltig, ob Mathematik-Template oder Deutsch-Block. */
    fun bespielt(fach: String): Set<String> =
        nutzbar.filter { it.fach == fach }.flatMap { it.unterthemen }.toSet() +
            textNutzbar.filter { it.fach == fach }.flatMap { it.unterthemen }.toSet()

    /**
     * Wird dieses Unterthema in dieser Pruefung ueberhaupt geprueft?
     *
     * Ein Themenbaum bedient mehrere Pruefungen — der Zuercher
     * Mathematikbaum die ZAP 1, 2 und 3. Vierzehn seiner Unterthemen kommen
     * nur in der ZAP 3 vor: Zinsrechnen, Kreissektor, Zylinder,
     * Geradengleichung. Wer die ZAP 1 schreibt, bekam sie trotzdem
     * vorgeschlagen — der Scheduler kannte den Unterschied nicht, obwohl er
     * seit jeher im Themenbaum steht.
     */
    fun giltIn(u: Unterthema, pruefung: String?): Boolean {
        if (pruefung == null) return true
        if (u.nurGeprueftIn.isNotEmpty() && pruefung !in u.nurGeprueftIn) return false
        return pruefung !in u.nichtGeprueftIn
    }

    /** Dasselbe wie `bespielt`, aber beschraenkt auf das, was diese Pruefung
     *  wirklich stellt. */
    fun bespielt(fach: String, pruefung: String?): Set<String> {
        val alle = bespielt(fach)
        if (pruefung == null) return alle
        val baum = baeume[fach] ?: return alle
        return baum.oberthemen.asSequence()
            .flatMap { it.unterthemen.asSequence() }
            .filter { it.code in alle && giltIn(it, pruefung) }
            .map { it.code }
            .toSet()
    }

    /* ---------------------------- Aufsatz ------------------------------ */

    val aufsatzThemen: List<AufsatzThema> by lazy {
        json.decodeFromString(lies("/aufsatz/themen.json"))
    }

    /**
     * Die Aufsatzarten mit Aufbau und Satzstartern.
     *
     * Sie tragen zweierlei: die Auswahl auf dem Themen-Screen — erst die Art,
     * dann das Thema — und die beiden Hilfen im Tipp-Knopf beim Schreiben.
     */
    val aufsatzarten: List<Aufsatzart> by lazy {
        json.decodeFromString(lies("/aufsatz/arten.json"))
    }

    fun aufsatzart(id: String): Aufsatzart? = aufsatzarten.firstOrNull { it.id == id }

    /**
     * Die Tipps-Seiten, je Bereich eine.
     *
     * Welche es gibt, sagt `tipps/index.json` — wie bei den Baeumen und den
     * Vorlagen. Eine neue Seite braucht dadurch keine Kotlin-Aenderung.
     */
    val tippsseiten: Map<String, TippsSeite> by lazy {
        val verz: Verzeichnis = json.decodeFromString(lies("/tipps/index.json"))
        verz.dateien.associate { name ->
            val t: TippsSeite = json.decodeFromString(lies("/tipps/$name"))
            t.bereich to t
        }
    }

    fun tipps(bereich: String): TippsSeite? = tippsseiten[bereich]
}
