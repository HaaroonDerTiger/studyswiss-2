package ch.studyswiss.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Niveau steuert die Wertebereiche, nicht den Aufgabentyp. */
@Serializable
enum class Niveau {
    @SerialName("beginner") BEGINNER,
    @SerialName("fortgeschritten") FORTGESCHRITTEN,
    @SerialName("pruefungsniveau") PRUEFUNGSNIVEAU,
    @SerialName("experte") EXPERTE,
}

@Serializable
enum class Zahlformat(val stellen: Int = 0) {
    @SerialName("ganz") GANZ,
    @SerialName("dezimal1") DEZIMAL1(1),
    @SerialName("dezimal2") DEZIMAL2(2),
    @SerialName("dezimal3") DEZIMAL3(3),
    @SerialName("dezimal4") DEZIMAL4(4),
    @SerialName("franken") FRANKEN,
    @SerialName("bruch") BRUCH,

    /**
     * Hochgestellt: aus 5 wird ⁵.
     *
     * «2^5» ist eine Notloesung aus der Zeit der Schreibmaschine. Im
     * Aufgabentext, in der Antwort und in der Erklaerung steht die Hochzahl
     * hochgestellt — sonst liest ein Kind «zwei Dach fuenf».
     */
    @SerialName("hoch") HOCH,

    /**
     * Tiefgestellt: aus 12 wird ₁₂.
     *
     * Das Gegenstueck zu HOCH, und ohne es laesst sich ein Bruch mit
     * gezogenen Zahlen nicht setzen: {z:hoch}⁄{n:tief} ergibt ⁵⁄₁₂, waehrend
     * «{z}/{n}» dem Kind einen Schraegstrich zeigt.
     */
    @SerialName("tief") TIEF,
}

/**
 * Die Aufgabenarten der Zahlen-Templates.
 *
 * Sie sind nicht erfunden, sondern aus den Prüfungen abgelesen: In der ZAP
 * werden Punkte in ein Gitter gesetzt, Grössen der Reihe nach geordnet und
 * Wertetabellen ausgefüllt. Wer nur «Zahl eingeben» anbietet, übt einen Teil
 * der Prüfung nie.
 */
@Serializable
enum class Format {
    @SerialName("zahl_eingeben") ZAHL_EINGEBEN,
    @SerialName("bruch_eingeben") BRUCH_EINGEBEN,
    @SerialName("multiple_choice") MULTIPLE_CHOICE,
    @SerialName("lueckentext") LUECKENTEXT,
    @SerialName("loesungsmenge") LOESUNGSMENGE,

    /** Mehrere Antwortfelder in einer Aufgabe, jedes mit eigenen Fehlermustern. */
    @SerialName("mehrfeld") MEHRFELD,
    /** Punkte in ein Koordinatengitter setzen. */
    @SerialName("gitter") GITTER,
    /** Elemente ihren Zielen zuordnen. */
    @SerialName("zuordnen") ZUORDNEN,
    /** Elemente der Grösse nach ordnen. */
    @SerialName("sortieren") SORTIEREN,
    /** Eine Wertetabelle ausfüllen. */
    @SerialName("wertetabelle") WERTETABELLE,
    /** Felder eines Rasters einfärben — Ansichten eines Würfelkörpers. */
    @SerialName("faerben") FAERBEN,

    /* --- Deutsch: Aufgabenarten, die es in Mathematik nicht gibt --- */
    @SerialName("mehrfachauswahl") MEHRFACHAUSWAHL,
    @SerialName("markieren") MARKIEREN,
    @SerialName("kommas") KOMMAS,
}

@Serializable
data class Variable(
    val name: String,
    val typ: String,                       // auswahl | ganzzahl | formel | text
    val werte: List<Double>? = null,       // auswahl
    val von: Int? = null,                  // ganzzahl
    val bis: Int? = null,
    val schritt: Int? = null,
    val ausdruck: String? = null,          // formel
    val texte: List<List<String>>? = null, // text: [["ein Helm","der Helm","den Helm"], ...]

    /**
     * `tabellenzeile`: Eine ganze Zeile wird gezogen, und jede Spalte landet
     * als eigene Zahl im Scope.
     *
     * Nötig für Aufgaben, deren Werte nur zusammen Sinn ergeben — die vier
     * Kantenlängen eines Quaders mit ganzzahliger Raumdiagonale etwa lassen
     * sich nicht einzeln würfeln. Der Alternativweg wäre gewesen, Listen im
     * Ausdruck zuzulassen; das hätte den Auswerter aufgeweicht, der bewusst
     * nur Zahlen kennt.
     */
    val spalten: List<String>? = null,
    val zeilen: List<List<Double>>? = null,
)

@Serializable
data class Fehlermuster(
    val diagnoseId: String,
    val ausdruck: String? = null,
    val bedingung: String? = null,
    val feedback: String,
)

/**
 * Die Gegenprobe fuer das Format LOESUNGSMENGE.
 *
 * Sie traegt eine Bedingung, die jedes Element der Menge erfuellen muss —
 * auf einem anderen Weg gerechnet als die Ziehung selbst (§4.4, T5).
 * Der Typ war als `String?` deklariert, die Daten tragen aber ein Objekt;
 * dadurch liess sich die Vorlagendatei gar nicht erst lesen.
 */
@Serializable
data class GegenprobeMenge(
    val bedingung: String,
)

@Serializable
data class LoesungsmengeSpec(
    val kandidatenVariable: String,
    val von: String,
    val bis: String,
    val bedingung: String,
)

/** Ein Antwortfeld eines Mehrfeld-Templates. */
@Serializable
data class FeldSpec(
    val name: String,
    val label: String,
    val ausdruck: String,
    val einheit: String = "",
    /**
     * Ein Feld darf ein anderes Zahlformat haben als der Rest der Aufgabe.
     * Ohne das zeigte eine Aufgabe, die eine ganze Anzahl UND einen Anteil
     * verlangt, für den Anteil eine gerundete Zahl an und lehnte sie dann
     * als Antwort ab.
     */
    val zahlformat: Zahlformat? = null,
    val fehler: List<Fehlermuster> = emptyList(),
)

@Serializable data class PunktSpec(val name: String, val label: String)
@Serializable data class KoordinateSpec(val x: String, val y: String)
@Serializable data class StreckeSpec(
    val von: KoordinateSpec, val bis: KoordinateSpec,
    val text: String = "", val stil: String = "",
)
@Serializable data class VorgabeSpec(val text: String, val x: String, val y: String)

/**
 * Ein Koordinatengitter. `loesungen` ist eine Liste von Varianten, denn
 * manche Aufgaben haben mehrere richtige Lagen — ein Parallelogramm lässt
 * sich auf drei Arten ergänzen, und alle drei sind richtig.
 */
@Serializable
data class GitterSpec(
    val xvon: String, val xbis: String, val yvon: String, val ybis: String,
    val toleranz: String = "0",
    val punkte: List<PunktSpec> = emptyList(),
    val vorgabe: List<VorgabeSpec> = emptyList(),
    val strecken: List<StreckeSpec> = emptyList(),
    val loesungen: List<List<List<String>>>,
)

@Serializable data class PaarSpec(val element: String, val ziel: String)
@Serializable data class ZuordnenSpec(val paare: List<PaarSpec>)

@Serializable data class ElementSpec(val text: String)
/** `werte` gibt die Sollreihenfolge — sortiert wird nach dem Zahlenwert. */
@Serializable data class SortierenSpec(
    val elemente: List<ElementSpec>,
    val werte: List<String>,
)

@Serializable data class TabellenspalteSpec(
    val name: String, val kopf: String, val von: String, val bis: String,
)
/** Alle Zahlenpaare im Bereich, welche die Bedingung erfüllen. */
@Serializable data class WertetabelleSpec(
    val spalten: List<TabellenspalteSpec>,
    val bedingung: String,
)

@Serializable data class ZelleSpec(val index: String, val bedingung: String)
@Serializable data class RasterSpec(
    val spalten: String, val zeilen: String, val zellen: List<ZelleSpec>,
)

/** Eine Tabelle über der Aufgabe, etwa ein Bauplan. */
@Serializable data class DarstellungSpec(
    val typ: String,
    val kopf: List<String> = emptyList(),
    val zeilen: List<List<String>> = emptyList(),
)

/**
 * Die ausführliche Erklärung eingeführter Aufgaben. Sie tritt dort an die
 * Stelle der handgeschriebenen Fehlermuster: Wer eine Aufgabe aus einem
 * Trainer übernimmt, hat deren Denkfehler nicht einzeln benannt — dann muss
 * wenigstens der Weg dastehen.
 */
@Serializable data class ErklaerungSpec(
    val kern: String = "",
    val schritte: List<String> = emptyList(),
    val falle: String = "",
    val merksatz: String = "",
)

/**
 * Manche Templates können nicht beliebig viele verschiedene Aufgaben geben,
 * weil ihre Welt kleiner ist: Ein Spielwürfel hat genau 48 Lagen. Wer das
 * hier festhält, muss auch den Grund nennen — sonst wäre es eine bequeme
 * Ausnahme statt einer belegten.
 */
@Serializable data class VariantenGrenze(val anzahl: Int, val grund: String)

@Serializable
data class NiveauAbweichung(
    val variablen: List<Variable> = emptyList(),
    val bedingungen: List<String> = emptyList(),
    val stamm: String? = null,
)

@Serializable
data class Herkunft(
    val beziehung: String,                 // abgeleitet | eigenentwicklung
    val quelle: String? = null,
)

@Serializable
data class Schrauben(val schritte: Int, val richtung: String)

/**
 * Ein Template ist ein Bauplan mit Luecken. Der Seed entscheidet, welche Werte
 * hineinkommen. Template-ID + Seed ergibt immer exakt dieselbe Aufgabe.
 */
@Serializable
data class TemplateSpec(
    val templateId: String,
    val lernzielId: String,
    val fach: String,                      // mathematik | sprachbetrachtung
    val unterthemen: List<String>,
    val niveaus: List<Niveau> = listOf(Niveau.PRUEFUNGSNIVEAU),
    val format: Format,
    val zahlformat: Zahlformat = Zahlformat.GANZ,
    val einheit: String? = null,
    val einheitVerlangt: Boolean = false,
    val loesungswegVerlangt: Boolean = false,

    val variablen: List<Variable>,
    val bedingungen: List<String> = emptyList(),
    val proNiveau: Map<Niveau, NiveauAbweichung> = emptyMap(),

    val stamm: String,
    val loesung: String? = null,
    val gegenprobe: String? = null,
    val loesungsmenge: LoesungsmengeSpec? = null,
    val gegenprobeMenge: GegenprobeMenge? = null,

    /* --- je Format genau eines davon --- */
    val felder: List<FeldSpec> = emptyList(),
    val gitter: GitterSpec? = null,
    val zuordnen: ZuordnenSpec? = null,
    val sortieren: SortierenSpec? = null,
    val wertetabelle: WertetabelleSpec? = null,
    val raster: RasterSpec? = null,

    val darstellung: DarstellungSpec? = null,
    val erklaerung: ErklaerungSpec? = null,
    val variantenGrenze: VariantenGrenze? = null,

    val fehler: List<Fehlermuster> = emptyList(),
    val hinweise: List<String>,
    val loesungsweg: List<String>,
    val schrauben: Schrauben = Schrauben(2, "vorwaerts"),
    val herkunft: Herkunft,
    /**
     * entwurf | review | live | importiert.
     *
     * `importiert` steht für die Aufgaben aus den ZAP-Trainern. Sie tragen
     * andere Garantien als die handgeschriebenen — statt einer Gegenprobe
     * eine belegte Erklärung — und werden von den Toren entsprechend anders
     * geprüft. Nur `live` erreicht Nutzerinnen und Nutzer.
     */
    val status: String = "entwurf",
)

/** Eine gezogene Aufgabe. Existiert nur im Speicher; gespeichert wird `ref`. */
data class Aufgabe(
    val ref: String,                       // "zwei-toepfe:47"
    val templateId: String,
    val lernzielId: String,
    val fach: String,
    val unterthemen: List<String>,
    val niveau: Niveau,
    val format: Format,
    val stamm: String,
    val einheit: String?,
    val loesung: Double?,
    val loesungText: String?,
    val optionen: List<Option>,
    val fehler: List<GezogenerFehler>,
    val loesungsmenge: List<Int>?,
    val hinweise: List<String>,
    val loesungsweg: List<String>,
    val scope: Map<String, Double>,

    /** Das Zahlformat der Loesung. Es bestimmt die Toleranz beim Bewerten:
     *  ein Frankenbetrag darf um einen halben Rappen danebenliegen, eine
     *  ganze Zahl nicht. Ohne dieses Feld verglich der Auswerter jede
     *  Loesung auf 1e-6 genau — bei «Fr. 12.50» faellt das nie auf, bei
     *  einer auf zwei Stellen gerundeten Kegelmantelflaeche schon. */
    val zahlformat: Zahlformat = Zahlformat.GANZ,

    /* --- nur bei den Deutsch-Formaten belegt --- */
    /** Der Satz in Wörter zerlegt. MARKIEREN und KOMMAS arbeiten darauf. */
    val woerter: List<String> = emptyList(),
    /** Welche Wörter zu markieren sind bzw. nach welchem ein Komma steht. */
    val loesungIndizes: List<Int> = emptyList(),
    /** LUECKE: alle akzeptierten Schreibweisen · MEHRFACHAUSWAHL: alle
     *  richtigen Optionen · MARKIEREN: die Wörter im Wortlaut. */
    val loesungWorte: List<String> = emptyList(),
    /** Die Denkfehler dieser Aufgabe, im Wortlaut der falschen Antwort. */
    val textFehler: List<TextFehler> = emptyList(),

    /* --- die neuen Formate --- */
    /** MEHRFELD: je Feld eine eigene Lösung und eigene Fehlermuster. */
    val felder: List<GezogenesFeld> = emptyList(),
    /** GITTER: das Gitter mit allen richtigen Lagen. */
    val gitter: GezogenesGitter? = null,
    /** ZUORDNEN: die Paare in ihrer Sollzuordnung, plus die Mischung. */
    val paare: List<GezogenesPaar> = emptyList(),
    /** SORTIEREN: die Elemente, die Sollreihenfolge und die Startmischung. */
    val elemente: List<GezogenesElement> = emptyList(),
    val reihenfolge: List<Int> = emptyList(),
    val mischung: List<Int> = emptyList(),
    /** WERTETABELLE: die Spaltenköpfe und alle richtigen Paare. */
    val wertetabelle: GezogeneWertetabelle? = null,
    /** FAERBEN: das Raster und die einzufärbenden Felder. */
    val raster: GezogenesRaster? = null,
    /** TABELLE_AUSWAHL (Deutsch): je Zeile ein Satz und eine Lösung. */
    val zeilen: List<GezogeneZeile> = emptyList(),

    /** Eine Tabelle über der Aufgabe, etwa ein Bauplan. */
    val darstellung: DarstellungSpec? = null,
    /** Bei eingeführten Aufgaben trägt sie die Rückmeldung. */
    val erklaerung: ErklaerungSpec? = null,
    /**
     * Der Lesetext beim Textverständnis.
     *
     * Er gehört zum Block, nicht zur einzelnen Aufgabe: ein Text, mehrere
     * Fragen — wie in der Prüfung. Er steht über der Aufgabe und verrät
     * nichts, was nicht ohnehin gelesen werden soll.
     */
    val lesetext: String? = null,
)

data class GezogenesFeld(
    val name: String,
    val label: String,
    val einheit: String,
    val loesung: Double?,
    val loesungText: String,
    val zahlformat: Zahlformat,
    val fehler: List<GezogenerFehler> = emptyList(),
    /** Bei Deutsch-Mehrfeldern ist die Lösung ein Wort, keine Zahl. */
    val loesungWorte: List<String> = emptyList(),
)

data class Punkt(val x: Double, val y: Double)

data class GezogenesGitter(
    val xvon: Double, val xbis: Double, val yvon: Double, val ybis: Double,
    val toleranz: Double,
    val punkte: List<PunktSpec>,
    val vorgabe: List<GezogeneVorgabe>,
    val strecken: List<GezogeneStrecke>,
    /** Mehrere richtige Lagen: Ein Parallelogramm lässt sich auf drei Arten
     *  ergänzen, und alle drei sind richtig. */
    val loesungen: List<List<Punkt>>,
)

data class GezogeneVorgabe(val text: String, val x: Double, val y: Double)
data class GezogeneStrecke(
    val text: String, val stil: String, val von: Punkt, val bis: Punkt,
)

data class GezogenesPaar(val index: Int, val element: String, val ziel: String)
data class GezogenesElement(val index: Int, val text: String, val wert: Double)

data class GezogeneTabellenspalte(
    val name: String, val kopf: String, val von: Double, val bis: Double,
)
data class GezogeneWertetabelle(
    val spalten: List<GezogeneTabellenspalte>,
    val paare: List<Pair<Int, Int>>,
)

data class GezogenesRaster(val spalten: Int, val zeilen: Int, val felder: List<Int>)

data class GezogeneZeile(val index: Int, val text: String, val loesung: String)

/**
 * Was die Schuelerin von einer Aufgabe wirklich sieht — als ein Schluessel.
 *
 * Der `stamm` allein genuegt dafuer nicht. Beim Markieren und bei Kommas ist
 * er nur die Arbeitsanweisung («Markiere alle verbalen Teile.»); der Satz
 * steht in `woerter`. Bei einer Tabelle steht die Aufgabe in den Zeilen.
 *
 * Wo nur der Stamm verglichen wurde, sahen zwoelf verschiedene Aufgaben wie
 * eine einzige aus: `set()` verwarf elf davon, und das Unterthema blieb fuer
 * immer bei «2 von 20» stehen — eine stille Sackgasse (§8), die nach einem
 * funktionierenden Programm aussieht.
 */
val Aufgabe.sichtbarerSchluessel: String
    get() = buildString {
        append(stamm)
        woerter.forEach { append('\u0001').append(it) }
        zeilen.forEach { append('\u0002').append(it.text) }
        felder.forEach { append('\u0003').append(it.label).append('=').append(it.loesungText) }
        paare.forEach { append('\u0004').append(it.element).append("->").append(it.ziel) }
        elemente.forEach { append('\u0005').append(it.text) }
        gitter?.let { append('\u0006').append(it.loesungen) }
        wertetabelle?.let { append('\u0007').append(it.paare) }
        raster?.let { append('\u000B').append(it.felder) }
        loesungsmenge?.let { append('\u000E').append(it) }
        // Ein Bauplan ueber der Aufgabe gehoert dazu: zwei Ziehungen mit
        // gleicher Antwort, aber verschiedenem Plan sind verschiedene Aufgaben.
        darstellung?.let { append('\u000F').append(it.zeilen) }
    }

/**
 * Die Loesung einer Aufgabe, so genau, dass zwei verschiedene Loesungen auch
 * verschieden aussehen. Nur fuer die Tore, nie fuer die Anzeige.
 *
 * T11 zaehlte allein `loesung` — die gibt es nur bei `zahl_eingeben`. Bei
 * jedem anderen Format kam «0 verschiedene Loesungen» heraus, und das sah
 * nach einer kaputten Vorlage aus, wo bloss an der falschen Stelle gezaehlt
 * wurde.
 */
val Aufgabe.loesungsSchluessel: String
    get() = when {
        loesungsmenge != null -> "menge:$loesungsmenge"
        raster != null -> "raster:${raster.felder}"
        gitter != null -> "gitter:${gitter.loesungen}"
        wertetabelle != null -> "tabelle:${wertetabelle.paare}"
        reihenfolge.isNotEmpty() -> "reihenfolge:$reihenfolge"
        paare.isNotEmpty() -> "paare:" + paare.map { it.ziel to it.element }
        felder.isNotEmpty() -> "felder:" + felder.map { it.loesung }
        loesung != null -> "zahl:${(loesung * 1e6).toLong()}"
        else -> loesungText ?: ""
    }

data class Option(val id: String, val text: String, val diagnoseId: String?)

data class GezogenerFehler(val wert: Double, val diagnoseId: String, val feedback: String)

class ZiehungFehlgeschlagen(text: String) : RuntimeException(text)
