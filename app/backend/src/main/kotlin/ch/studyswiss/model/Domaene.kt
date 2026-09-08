package ch.studyswiss.model

import kotlinx.serialization.Serializable
import java.time.LocalDate

/* ============================ Katalog ================================== */

@Serializable
data class Kanton(val kuerzel: String, val name: String, val aktiv: Boolean)

@Serializable
data class Hilfsmittel(
    /** keiner | einfach | nicht_cas | beliebig */
    val taschenrechner: String = "keiner",
    val formelsammlung: Boolean = false,
    val geodreieck: Boolean = true,
    val zirkel: Boolean = true,
    val woerterbuch: Boolean = false,
) {
    /** Der Satz, der im Selbsttest ueber den Bedingungen steht. */
    val rechnerText: String
        get() = when (taschenrechner) {
            "keiner" -> "Kein Taschenrechner"
            "einfach" -> "Einfacher Taschenrechner, nicht programmierbar"
            "nicht_cas" -> "Taschenrechner ohne CAS"
            else -> "Taschenrechner erlaubt"
        }
}

/**
 * Ein Teil einer Pruefung — das, was an einem Termin in einem Zug
 * geschrieben wird.
 *
 * Das ist die Einheit, die vorher fehlte, und sie fehlte genau dort, wo die
 * Kantone auseinandergehen: Bern und St. Gallen schreiben Mathematik in ZWEI
 * Teilen, einen ohne und einen mit Taschenrechner. Solange Dauer und
 * Hilfsmittel am Schultyp hingen, musste die App sich fuer einen der beiden
 * entscheiden und log fuer den anderen.
 */
@Serializable
data class Pruefungsteil(
    val id: String,
    val name: String,
    val pruefungsfach: String,
    /** Die Bereiche, die dieser Teil abfragt. Leer heisst: noch kein Stoff. */
    val bereiche: List<String> = emptyList(),
    val dauerMinuten: Int = 90,
    /** Punkte in der echten Pruefung. 0 heisst: nicht bezifferbar. */
    val punkte: Int = 0,
    val anzahlAufgaben: Int = 20,
    val hilfsmittel: Hilfsmittel = Hilfsmittel(),
    val zurueckblaettern: Boolean = true,
    val uhrPausiert: Boolean = true,
    val hinweise: Boolean = false,
    /** Gehoert der Teil zu einer Wahl — Franzoesisch ODER Englisch? */
    val wahlgruppe: String? = null,
    /**
     * Ob die App fuer diesen Teil etwas anbietet.
     *
     * Bern prueft Englisch als Sonderpruefung anstelle von Franzoesisch. Die
     * Pruefung kennt den Teil, die App hat dafuer keinen Stoff. Das gehoert
     * in die Daten — sonst ist es eine stille Luecke, die niemand sieht.
     */
    val angeboten: Boolean = true,
    val bemerkung: String = "",
)

/**
 * Woran ein Aufsatz in DIESER Pruefung gemessen wird.
 *
 * Das stand vorher als fester Text im Korrektur-Prompt: «Deutschlehrperson im
 * Kanton Zuerich», «Pruefungsanforderungen ZAP2/ZAP3», «90 Minuten»,
 * «450-700 Woerter». Fuer einen Berner Aufsatz war jedes dieser vier Stuecke
 * falsch — und das Modell haette trotzdem geantwortet, nur eben nach dem
 * falschen Massstab. Ein Fehler, den niemand sieht, ist der schlimmste.
 *
 * Was hier NICHT steht, ist der Ton und die Regel «keine Note». Das ist
 * keine Kantonssache, sondern eine Entscheidung der App, und sie gilt
 * ueberall gleich.
 */
@Serializable
data class Aufsatzrahmen(
    /** «eine erfahrene Deutschlehrperson im Kanton Zuerich» */
    val rolle: String = "",
    /** Wie der Pruefungsteil im Kanton heisst. */
    val teilname: String = "",
    /** Die Quelle des Massstabs, im Wortlaut zitierbar. */
    val grundlage: String = "",
    /** Die Anforderungen, wie sie der Kanton veroeffentlicht. */
    val anforderungen: List<String> = emptyList(),
    /** «90 Minuten, handschriftlich, einziges Hilfsmittel ist ein Woerterbuch.» */
    val rahmen: String = "",
    val woerterVon: Int = 0,
    val woerterBis: Int = 0,
)

/** Eine Wahl innerhalb einer Pruefung: Franzoesisch ODER Englisch. */
@Serializable
data class Wahl(
    val id: String,
    val name: String,
    val frage: String,
    /** Die Kennungen der Pruefungsteile, zwischen denen gewaehlt wird. */
    val aus: List<String>,
    val standard: String? = null,
)

/**
 * Eine Aufnahmepruefung.
 *
 * Sie ist ein eigenes Ding und keine Eigenschaft des Schultyps, weil sich
 * mehrere Schultypen dieselbe Pruefung teilen: In Basel-Stadt schreiben
 * Gymnasium, FMS, WMS, IMS und BM 1 dieselbe Pruefung und unterscheiden sich
 * nur in der noetigen Punktzahl; in St. Gallen teilen sich FMS, WMS und IMS
 * eine. Wer das am Schultyp fuehrt, pflegt dieselben Angaben fuenfmal und
 * hat sie beim ersten Nachtrag viermal falsch.
 */
@Serializable
data class Pruefung(
    val id: String,
    val kanton: String,
    /** «ZAP 2» — nur, wo der Kanton wirklich ein Kuerzel fuehrt, sonst leer. */
    val kuerzel: String = "",
    val name: String,
    val teile: List<Pruefungsteil>,
    val wahl: List<Wahl> = emptyList(),
    val aufsatzarten: List<String> = emptyList(),
    /** Woran ein Aufsatz in dieser Pruefung gemessen wird. */
    val aufsatzrahmen: Aufsatzrahmen = Aufsatzrahmen(),
)

/** Ein Schultyp, wie er im Katalog steht: ein Name und ein Verweis. */
@Serializable
data class SchultypEintrag(
    val id: String,
    val name: String,
    /** Die Kennung der Pruefung, die zu diesem Schultyp fuehrt. */
    val pruefung: String,
)

/**
 * Eine Seite fuer einen Pruefungsteil, den man nicht antippen kann.
 *
 * Hoerverstehen und muendliche Pruefungen lassen sich in einer App nicht
 * nachstellen — es fehlt das Video und es fehlt das Gegenueber. Was sich sehr
 * wohl vermitteln laesst, ist das Verfahren: was in welcher Reihenfolge
 * geschieht, worauf es ankommt und welche Saetze man vorher koennen sollte.
 * Ein Bereich mit `art: "tipps"` zeigt auf genau eine solche Seite.
 */
@Serializable
data class TippsSeite(
    val bereich: String,
    val titel: String,
    val eyebrow: String = "",
    val einleitung: String = "",
    /** Woher die Angaben stammen — steht klein unter der Seite. */
    val grundlage: String = "",
    val ablauf: List<Ablaufschritt> = emptyList(),
    val abschnitte: List<Tippsabschnitt> = emptyList(),
    val redemittel: List<Redemittel> = emptyList(),
    /** Unterthemen, die genau diese Fertigkeit trainieren. */
    val uebungen: List<Uebungshinweis> = emptyList(),
)

@Serializable
data class Ablaufschritt(
    val nr: Int,
    val titel: String,
    /** «5 Minuten» oder leer, wenn der Schritt keine eigene Zeit hat. */
    val dauer: String = "",
    val text: String,
)

@Serializable
data class Tippsabschnitt(val titel: String, val tipps: List<Tipp> = emptyList())

/** Eine Regel und der Grund dafuer. Eine Regel ohne Grund merkt sich niemand;
 *  `kantone.py` besteht darauf, dass beides dasteht. */
@Serializable
data class Tipp(val regel: String, val warum: String)

@Serializable
data class Redemittel(val zweck: String, val saetze: List<String> = emptyList())

@Serializable
data class Uebungshinweis(
    val bereich: String,
    val unterthema: String,
    val name: String,
    val warum: String,
)

/**
 * Ein Schultyp, wie ihn die App bekommt — mit allem schon aufgeloest.
 *
 * Die Felder, die der Client liest, sind dieselben wie zuvor. Neu ist nur,
 * dass sie nicht mehr je Schultyp von Hand gepflegt werden, sondern aus der
 * Pruefung stammen. Katalog.kt setzt sie beim Laden zusammen.
 */
@Serializable
data class Schultyp(
    val id: String,
    val name: String,
    /** «ZAP 2» oder der volle Pruefungsname — was der Kanton wirklich fuehrt. */
    val pruefung: String,
    /** Das Kuerzel allein, leer wenn die Pruefung keines fuehrt. Bern fuehrt
     *  keines; dort steht dann nichts, nicht eine erfundene Abkuerzung. */
    val kuerzel: String = "",
    /** Mathematik, Deutsch, allenfalls Franzoesisch. Was hier fehlt, taucht
     *  in der App nirgends auf. */
    val pruefungsfaecher: List<String>,
    val bedingungen: Bedingungen = Bedingungen(),
    val aufsatzarten: List<String> = emptyList(),
    /** Alle Bereiche dieses Schultyps, in Pruefungsreihenfolge. */
    val bereiche: List<String> = emptyList(),
    /** Bedingungen, die nur fuer EIN Pruefungsfach gelten. */
    val bedingungenJeFach: Map<String, Bedingungen> = emptyMap(),
    /** Die Kennung der Pruefung — fuer alles, was tiefer nachschauen muss. */
    val pruefungId: String = "",
    /** «Mathematik · Deutsch · Franzoesisch» — die Zeile unter dem Namen in
     *  der Schulwahl. §6 verlangt dort Pruefungsname UND Faecher. */
    val faecherZeile: String = "",
    val teile: List<Pruefungsteil> = emptyList(),
    val wahl: List<Wahl> = emptyList(),
)

/**
 * Die Pruefungsbedingungen eines Schultyps.
 *
 * Sie stehen im Katalog und werden im Selbsttest angezeigt UND angewendet.
 * Frueher standen sie als vier feste Zeilen im Screen; damit log die App,
 * sobald eine Pruefung andere Regeln hat.
 */
@Serializable
data class Bedingungen(
    val taschenrechner: Boolean = false,
    /** Darf man zu einer schon bearbeiteten Aufgabe zurueck? In der echten
     *  Pruefung liegt das Blatt vor einem — also ja. */
    val zurueckblaettern: Boolean = true,
    /** Haelt die Uhr an, wenn die App in den Hintergrund geht? */
    val uhrPausiert: Boolean = true,
    val hinweise: Boolean = false,
    val dauerMinuten: Int = 90,
    val anzahlAufgaben: Int = 20,
    /**
     * Was genau erlaubt ist, im Klartext: «Kein Taschenrechner»,
     * «Taschenrechner ohne CAS». Das `taschenrechner`-Ja-Nein daneben bleibt,
     * weil die App danach schaltet — angezeigt wird aber dieser Satz. Sonst
     * stuende bei St. Gallen «Taschenrechner erlaubt», und das stimmt so
     * nicht: programmierbare und grafikfaehige sind dort verboten.
     */
    val hilfsmittelText: String = "Kein Taschenrechner",
    /**
     * Was diese Pruefung sonst noch vorschreibt, im Klartext: In Solothurn
     * wird eine Mathematikaufgabe nicht bewertet, wenn zwei Loesungswege
     * dastehen, und im Sprachbogen gibt eine falsche Antwort Abzug. Das
     * stand bisher nur in den Daten und kam nie bei jemandem an.
     */
    val bemerkungen: List<String> = emptyList(),
)

/**
 * Ein Fach, wie es die Pruefung kennt: Mathematik, Deutsch, Franzoesisch.
 *
 * Darunter liegen die BEREICHE — bei Deutsch Sprachbetrachtung,
 * Textverstaendnis und Aufsatz. Ein Bereich hat einen Themenbaum, ein Fach
 * nicht. Die Aufgaben tragen weiterhin den Bereich in ihrem Feld `fach`;
 * das ist der Vertrag zu Vorlagen, Vorschau und gespeichertem Fortschritt
 * und wird nicht umbenannt.
 */
@Serializable
data class Pruefungsfach(
    val id: String,
    val name: String,
    val untertitel: String,
    val icon: String,
    /**
     * Die Bereiche dieses Fachs. Steht NICHT in `katalog.json` — dort stuende
     * sie neben `Bereich.pruefungsfach` ein zweites Mal und liefe beim ersten
     * neuen Kanton auseinander. Katalog.kt rechnet sie aus.
     */
    val bereiche: List<String> = emptyList(),
)

@Serializable
data class Bereich(
    val id: String,
    val name: String,
    /** Wie der Bereich UNTER seinem Fach heisst: «Sprachbetrachtung», nicht
     *  «Deutsch Sprachbetrachtung». Auf der zweiten Ebene steht das Fach
     *  schon in der Titelleiste. */
    val kurzname: String,
    val untertitel: String,
    val pruefungsfach: String,
    /** themenbaum | aufsatz */
    val art: String,
)

/** Eine Aufsatzart mit dem, was beim Schreiben hilft. */
@Serializable
data class Aufsatzart(
    val id: String,
    val name: String,
    /** Wie die Textsorte in `aufsatz/themen.json` heisst. */
    val sorte: String,
    val untertitel: String,
    val beschreibung: String,
    /** Der typische Aufbau, als Checkliste zum Abhaken. */
    val aufbau: List<String>,
    /**
     * Satzanfaenge, nach Abschnitten geordnet.
     *
     * Vorher stand hier eine flache Liste. Wer nicht weiterweiss, steckt aber
     * an einer BESTIMMTEN Stelle fest, meist am Anfang eines Abschnitts.
     * Fuenf Anfaenge ohne Ordnung helfen dort weniger als drei, die zum
     * richtigen Teil gehoeren.
     */
    val satzstarter: List<Satzstartergruppe>,
)

/** Eine Gruppe von Satzanfaengen fuer einen Abschnitt des Aufsatzes. */
@Serializable
data class Satzstartergruppe(
    /** «Einleitung», «Hauptteil», «Appell» — je nach Aufsatzart. */
    val abschnitt: String,
    val saetze: List<String> = emptyList(),
)

/** Ein Termin, wie er im Katalog steht — an der Pruefung, nicht am Schultyp. */
@Serializable
data class TerminEintrag(
    val pruefung: String,
    /** fruehling | herbst — St. Gallen prueft zweimal im Jahr. */
    val session: String = "fruehling",
    /** Das genaue Datum, wenn es eines gibt. */
    val datum: String? = null,
    /** Sonst das Fenster: Basel-Stadt nennt nur «zwischen den Ferien». */
    val von: String? = null,
    val bis: String? = null,
    val bemerkung: String = "",
)

/** Ein Termin, wie ihn die App bekommt. */
@Serializable
data class Termin(
    val kanton: String,
    val schultyp: String,
    /**
     * Immer gesetzt. Steht nur ein Fenster fest, ist es dessen letzter Tag —
     * der Lernpfad braucht einen Tag, und der spaeteste ist der ehrliche:
     * Wer damit rechnet, kommt nie zu spaet.
     */
    val datum: String,
    val bemerkung: String,
    val session: String = "fruehling",
    /** Ob das Datum genau ist oder aus einem Fenster stammt. */
    val genau: Boolean = true,
)

@Serializable
data class Unterthema(
    val code: String,
    val name: String,
    val lernzielId: String,
    /**
     * Nur in DIESEN Pruefungen geprueft. Leer heisst: in allen, die diesen
     * Baum benutzen.
     *
     * Hier stand `zap3: Boolean` und `nur: "ZAP 3"` — Zuercher Vokabular in
     * einem Modell, das inzwischen mehrere Kantone traegt. Und gelesen hat
     * es niemand: Ein Kind, das die ZAP 1 schreibt, bekam Zinsrechnen und
     * Kreissektoren vorgeschlagen, obwohl seine Pruefung beides nicht stellt.
     */
    val nurGeprueftIn: List<String> = emptyList(),
    /** In diesen Pruefungen NICHT geprueft — die Umkehrung, wenn die
     *  Ausnahme kuerzer ist als die Aufzaehlung. */
    val nichtGeprueftIn: List<String> = emptyList(),
    val lp21: String? = null,
    /** Wer so viele Aufgaben geloest hat, hat das Thema abgeschlossen. */
    val pflichtset: Int = 20,
    val voraussetzungen: List<String> = emptyList(),
    val tiefe: String? = null,
    /**
     * Ob es zu diesem Unterthema schon Aufgaben gibt.
     *
     * Steht nicht in der Ressource — die Route setzt es beim Ausliefern aus
     * `Katalog.bespielt`. Ohne diese Auskunft zeigt die App alle Themen als
     * antippbar, und wer eines ohne Aufgaben erwischt, bekommt statt einer
     * Uebung eine Fehlermeldung. Die Vorschau wusste es immer; die App nicht.
     */
    val hatAufgaben: Boolean = true,
)

@Serializable
data class Oberthema(
    val nr: Int,
    val katalog: String,
    val name: String,
    /** Punkte in der echten Pruefung. 0 heisst: nicht eigenstaendig geprueft. */
    val punkte: Int,
    val anteil: Int,
    val beschreibung: String? = null,
    val unterthemen: List<Unterthema>,
)

@Serializable
data class Themenbaum(
    val fach: String,
    val name: String,
    val pruefung: String,
    val quelle: String? = null,
    val punkteTotal: Int? = null,
    val oberthemen: List<Oberthema>,
)

/* ============================ Nutzer =================================== */

enum class Anbieter { APPLE, GOOGLE, GAST }

data class Nutzer(
    val id: String,
    val anbieter: Anbieter,
    /** Die stabile Kennung beim Anbieter. Bei Apple `sub`, bei Gast die Geraete-ID. */
    val fremdId: String,
    /** Apple liefert die E-Mail nur beim allerersten Mal. Wer sie da nicht
     *  speichert, bekommt sie nie wieder. */
    val email: String?,
    val vorname: String?,
    val kanton: String?,
    val schultyp: String?,
    val pruefungsdatum: LocalDate?,
    val elternFreigabe: Boolean,
    val plusBis: java.time.Instant?,
    val erstelltAm: java.time.Instant,
) {
    val hatPlus: Boolean get() = plusBis?.isAfter(java.time.Instant.now()) == true
    val istGast: Boolean get() = anbieter == Anbieter.GAST
}

/* ============================ Lernen =================================== */

/** Ein Versuch an genau einer Aufgabe. `aufgabeRef` ist «templateId:seed». */
data class Versuch(
    val id: Long,
    val nutzerId: String,
    val aufgabeRef: String,
    val lernzielId: String,
    val unterthema: String,
    val fach: String,
    val richtig: Boolean,
    /** Der erkannte Denkfehler, falls die Antwort zu einem Fehlermuster passt. */
    val diagnoseId: String?,
    val hinweiseGenutzt: Int,
    val quelle: Quelle,
    val zeitpunkt: java.time.Instant,
)

enum class Quelle { UEBUNG, STANDORT, SELBSTTEST, FEHLERARCHIV }

/** Fortschritt in einem Unterthema. Zaehlgroessen, keine Prozentzahl. */
data class ThemenFortschritt(
    val unterthema: String,
    val name: String,
    val oberthema: String,
    val fach: String,
    val pflichtset: Int,
    val geloest: Int,
    val richtigeLetzte10: Int,
    val versucheLetzte10: Int,
    val zuletztGeuebt: java.time.Instant?,
) {
    val abgeschlossen: Boolean get() = geloest >= pflichtset
    val trefferquote: Double get() = if (versucheLetzte10 == 0) 0.0 else richtigeLetzte10.toDouble() / versucheLetzte10
}
