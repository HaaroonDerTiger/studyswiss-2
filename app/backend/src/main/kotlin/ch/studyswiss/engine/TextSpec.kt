package ch.studyswiss.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Deutsch-Aufgaben.
 *
 * In Mathematik schreiben wir Templates und ziehen daraus hunderttausende
 * Aufgaben, weil sich Zahlen parametrisieren lassen. Deutsche Grammatik
 * lässt sich das nicht: «Bestimme die Wortart von *dennoch*» hat keine
 * Variablen, sondern einen Satz, der stimmen muss.
 *
 * Deshalb ist ein Deutsch-Template ein **Block gleichartiger Aufgaben** mit
 * gemeinsamem Rahmen — dieselbe Frageform, dieselben Hinweise, dieselbe
 * geschlossene Optionenmenge. Was bleibt, ist die harte Regel: Template-ID
 * plus Seed ergibt immer dieselbe Aufgabe, und jede Aufgabe benennt ihre
 * Denkfehler.
 */
@Serializable
enum class TextFormat {
    /** Eine aus einer geschlossenen Menge: Wortart, Kasus, Modus, Zeitform. */
    @SerialName("einfachauswahl") EINFACHAUSWAHL,
    /** Mehrere aus einer Liste, Anzahl offen. */
    @SerialName("mehrfachauswahl") MEHRFACHAUSWAHL,
    /** Lücke im Satz, Freitext. Mehrere Schreibweisen sind zulässig. */
    @SerialName("luecke") LUECKE,
    /** Wörter im Satz antippen: Objekte, Partikeln, verbale Teile. */
    @SerialName("markieren") MARKIEREN,
    /** Kommas setzen: antippen, wo eines hingehört. */
    @SerialName("kommas") KOMMAS,
    /** Mehrere Freitextfelder in einer Aufgabe — Stammformen, Wortfamilien. */
    @SerialName("mehrfeld") MEHRFELD,
    /** Eine Tabelle: je Zeile ein Satz, je Zeile eine Wahl aus derselben Menge. */
    @SerialName("tabelle_auswahl") TABELLE_AUSWAHL,
}

/** Ein Freitextfeld einer Deutsch-Mehrfeldaufgabe. */
@Serializable
data class TextFeld(
    val label: String,
    /** Alle Schreibweisen, die gelten. Die erste ist die Musterlösung. */
    val loesung: List<String>,
)

/** Eine Zeile einer Auswahltabelle. */
@Serializable
data class TextZeile(
    val text: String,
    /** Genau ein Eintrag — geprüft von Tor T13. */
    val loesung: List<String>,
)

@Serializable
data class TextFehler(
    /** Die falsche Antwort im Wortlaut, wie sie in `optionen` steht. */
    val antwort: String,
    val diagnoseId: String,
    val feedback: String,
)

@Serializable
data class TextAufgabe(
    val stamm: String,
    /** EINFACHAUSWAHL: eine Option · MEHRFACHAUSWAHL: mehrere ·
     *  LUECKE: die erste ist die Musterlösung, alle gelten als richtig ·
     *  MARKIEREN: die zu markierenden Wörter ·
     *  KOMMAS: der Satz **mit** Kommas — der Generator leitet die Stellen ab. */
    val loesung: List<String> = emptyList(),
    /** Nur wenn dieser Block keine globale Optionenmenge hat. */
    val optionen: List<String> = emptyList(),
    val erklaerung: String,
    val fehler: List<TextFehler> = emptyList(),
    /** Ein eigener Hinweis der Aufgabe schlägt den des Blocks. */
    val hinweise: List<String> = emptyList(),

    /* --- MEHRFELD und TABELLE_AUSWAHL --- */
    val felder: List<TextFeld> = emptyList(),
    val zeilen: List<TextZeile> = emptyList(),

    /**
     * MARKIEREN und KOMMAS: der Satz in Wörter zerlegt, und die Stellen.
     *
     * Eingeführte Aufgaben bringen beides mit; handgeschriebene leiten es
     * aus dem Lösungssatz ab. Liegt es bei, gilt es — dann kann nichts
     * auseinanderlaufen.
     */
    val woerter: List<String> = emptyList(),
    val stellen: List<Int> = emptyList(),

    /** Der Lesetext dieser Aufgabe. Fehlt er, gilt der des Blocks. */
    val text: String? = null,
)

@Serializable
data class TextTemplateSpec(
    val templateId: String,
    val lernzielId: String,
    val fach: String = "sprachbetrachtung",
    val unterthemen: List<String>,
    val format: TextFormat,
    /** Geschlossene Menge, die für alle Aufgaben des Blocks gilt —
     *  die sieben Wortarten, die vier Fälle, die fünf Zeitformen. */
    val optionen: List<String> = emptyList(),
    val hinweise: List<String>,
    /** Ein Lesetext, der für alle Aufgaben des Blocks gilt. Beim
     *  Textverständnis der Normalfall: ein Text, viele Fragen. */
    val text: String? = null,
    /** Der allgemeine Weg. Gilt für alle Aufgaben; das Besondere steht
     *  in `erklaerung` der einzelnen Aufgabe. */
    val loesungsweg: List<String>,
    val aufgaben: List<TextAufgabe>,
    val herkunft: Herkunft,
    val thema: String = "",
    /**
     * Umformungsaufgaben geben einen Satz vor und lassen ihn umbauen. Dass
     * die Antwort dieselben Wörter enthält, ist ihr Wesen — «schwarzen Meer»
     * wird zu «Schwarzen Meer». Tor T8 fragt dort nichts Sinnvolles und
     * bleibt deshalb aussen vor.
     */
    val umformung: Boolean = false,
    val status: String = "entwurf",
)

/**
 * Zieht aus einem Block und einem Seed genau eine Aufgabe.
 *
 * Der Seed bestimmt sowohl die Aufgabe als auch die Reihenfolge der Optionen.
 * Damit steht die richtige Antwort nicht immer an derselben Stelle, und die
 * Aufgabe bleibt trotzdem reproduzierbar.
 */
object TextGenerator {

    fun ziehe(spec: TextTemplateSpec, seed: Int): Aufgabe {
        val rng = Rng(seed)
        val i = rng.int(0, spec.aufgaben.size - 1)
        val a = spec.aufgaben[i]

        val menge = a.optionen.ifEmpty { spec.optionen }
        val format = when (spec.format) {
            TextFormat.EINFACHAUSWAHL -> Format.MULTIPLE_CHOICE
            TextFormat.MEHRFACHAUSWAHL -> Format.MEHRFACHAUSWAHL
            TextFormat.LUECKE -> Format.LUECKENTEXT
            TextFormat.MARKIEREN -> Format.MARKIEREN
            TextFormat.KOMMAS -> Format.KOMMAS
            TextFormat.MEHRFELD -> Format.MEHRFELD
            TextFormat.TABELLE_AUSWAHL -> Format.MULTIPLE_CHOICE
        }

        val optionen = when (spec.format) {
            TextFormat.EINFACHAUSWAHL, TextFormat.MEHRFACHAUSWAHL ->
                rng.shuffle(menge).map { text ->
                    Option(
                        id = "o" + menge.indexOf(text),
                        text = text,
                        diagnoseId = a.fehler.firstOrNull { it.antwort == text }?.diagnoseId,
                    )
                }
            // Bei einer Tabelle bleiben die Optionen in fester Reihenfolge:
            // Sie sind die Kopfzeile und müssen über alle Zeilen gleich
            // stehen. Eine Tabelle, deren Spalten springen, ist unlesbar.
            TextFormat.TABELLE_AUSWAHL ->
                menge.mapIndexed { k, text -> Option("o$k", text, null) }
            else -> emptyList()
        }

        // Bei KOMMAS steht der Satz mit Kommas in der Loesung. Der Generator
        // nimmt sie heraus und merkt sich, nach welchem Wort eines stand —
        // so kann im Template nichts auseinanderlaufen.
        // Bringt die Aufgabe Wörter und Stellen mit, gelten die. Sonst
        // werden sie aus dem Lösungssatz abgeleitet.
        val (woerter, indizes) = if (a.woerter.isNotEmpty()) {
            a.woerter to a.stellen.sorted()
        } else when (spec.format) {
            TextFormat.KOMMAS -> {
                val roh = a.loesung.first().trim().split(Regex("\\s+"))
                val toks = mutableListOf<String>()
                val stellen = mutableListOf<Int>()
                roh.forEach { w ->
                    val hat = w.endsWith(",")
                    toks += if (hat) w.dropLast(1) else w
                    if (hat) stellen += toks.size - 1
                }
                toks to stellen
            }
            TextFormat.MARKIEREN -> {
                val toks = a.stamm.substringAfter("\n\n", a.stamm).trim().split(Regex("\\s+"))
                val stellen = mutableListOf<Int>()
                val vergeben = mutableSetOf<Int>()
                a.loesung.forEach { wort ->
                    val k = toks.indices.firstOrNull { it !in vergeben && nackt(toks[it]) == nackt(wort) }
                    if (k != null) { vergeben += k; stellen += k }
                }
                toks to stellen.sorted()
            }
            else -> emptyList<String>() to emptyList()
        }

        return Aufgabe(
            ref = "${spec.templateId}:$seed",
            templateId = spec.templateId,
            lernzielId = spec.lernzielId,
            fach = spec.fach,
            unterthemen = spec.unterthemen,
            niveau = Niveau.PRUEFUNGSNIVEAU,
            format = format,
            stamm = a.stamm,
            einheit = null,
            loesung = null,
            loesungText = when (spec.format) {
                TextFormat.KOMMAS ->
                    // Der Lösungssatz wird IMMER aus Wörtern und Stellen
                    // gebaut, nie aus dem Text daneben — so können die
                    // beiden gar nicht auseinanderlaufen (Tor T16).
                    woerter.mapIndexed { k, w -> if (k in indizes) "$w," else w }
                        .joinToString(" ")
                TextFormat.MARKIEREN -> indizes.joinToString(", ") { woerter[it] }
                TextFormat.MEHRFELD ->
                    a.felder.joinToString(" · ") { "${it.label}: ${it.loesung.first()}" }
                TextFormat.TABELLE_AUSWAHL ->
                    a.zeilen.joinToString(" · ") { "${it.text} → ${it.loesung.first()}" }
                else -> a.loesung.joinToString(", ")
            },
            optionen = optionen,
            fehler = emptyList(),
            loesungsmenge = null,
            // Ein eigener Hinweis der Aufgabe schlägt den des Blocks.
            hinweise = a.hinweise.ifEmpty { spec.hinweise },
            loesungsweg = spec.loesungsweg + a.erklaerung,
            scope = emptyMap(),
            woerter = woerter,
            loesungIndizes = indizes,
            loesungWorte = when (spec.format) {
                TextFormat.MARKIEREN -> indizes.map { woerter[it] }
                else -> a.loesung
            },
            textFehler = a.fehler,
            felder = a.felder.mapIndexed { k, f ->
                GezogenesFeld(
                    name = "f$k", label = f.label, einheit = "",
                    loesung = null, loesungText = f.loesung.first(),
                    zahlformat = Zahlformat.GANZ, loesungWorte = f.loesung,
                )
            },
            zeilen = a.zeilen.mapIndexed { k, r -> GezogeneZeile(k, r.text, r.loesung.first()) },
            lesetext = a.text ?: spec.text,
        )
    }

    /** Satzzeichen und Anführungszeichen weg — «Wortes,» und «Wortes» sind dasselbe Wort. */
    fun nackt(w: String): String =
        w.trim().trim('«', '»', '(', ')', '"', '\'', '.', ',', ';', ':', '!', '?', '–', '—')
            .lowercase()
}
