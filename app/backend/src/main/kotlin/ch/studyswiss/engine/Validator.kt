package ch.studyswiss.engine

import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * Die zwoelf Qualitaetstore.
 *
 * NUR ERWEITERN, NIE LOCKERN. Ein Template, das ein Tor nicht besteht, ist
 * nicht fertig. Dann wird das Template repariert — nie das Tor.
 */
object Validator {

    /** So viele verschiedene Aufgaben muss ein Template hergeben.
     *  Dieselbe Zahl wie in `pruefung/tore.py`. */
    private const val MIN_VARIANTEN = 60
    private const val SEEDS = 200

    data class Befund(val tor: String, val schwere: Schwere, val text: String)
    enum class Schwere { FEHLER, WARNUNG }

    data class Bericht(val templateId: String, val befunde: List<Befund>) {
        val bestanden: Boolean get() = befunde.none { it.schwere == Schwere.FEHLER }
    }

    /**
     * Woerter, die im Schweizer Hochdeutsch anders heissen — als Muster,
     * nicht als Teilzeichenkette.
     *
     * «Euro» als Waehrung ist verboten, «Europa» und «europaeisch» sind es
     * nicht: Ein Tor, das einen Lesetext ueber Nachtzuege durch Europa
     * ablehnt, schlaegt falschen Alarm, und ein Pruefer mit falschem Alarm
     * ist schlimmer als keiner (§8). Fuer «Fahrrad» gilt das nicht —
     * «Fahrraeder» und «Fahrradweg» sind ebenso gemeint.
     *
     * Dieselbe Liste steht in `pruefung/tore.py`; die beiden muessen
     * gleichen Schritt halten.
     */
    private val VERBOTEN = listOf(
        Triple(Regex("ß"), "ß", "«ss» statt «ß»"),
        Triple(Regex("""\bEuros?\b"""), "Euro", "Franken statt Euro"),
        Triple(Regex("€"), "€", "Franken statt Euro"),
        Triple(Regex("Fahrr[aä]d"), "Fahrrad", "Velo statt Fahrrad"),
        Triple(Regex("""\bRoller\b"""), "Roller", "Trottinett statt Roller"),
        Triple(Regex("Maßeinheit"), "Maßeinheit", "Masseinheit"),
        Triple(Regex("Bahnsteig"), "Bahnsteig", "Perron statt Bahnsteig"),
    )

    /**
     * Darf «Euro» hier stehen?
     *
     * Nur in einer Umrechnungsaufgabe: Sie nennt einen Wechselkurs UND einen
     * Frankenbetrag. Eine Aufgabe, die bloss Preise in Euro auszeichnet, hat
     * beides nicht — und bleibt verboten. Gleiche Regel wie `tore.py`.
     */
    fun waehrungsaufgabe(text: String): Boolean =
        Regex("""\bKurs\b""").containsMatchIn(text) && "Fr." in text

    fun pruefe(spec: TemplateSpec, bekannteUnterthemen: Set<String>): Bericht {
        val b = mutableListOf<Befund>()
        fun fehler(tor: String, text: String) = b.add(Befund(tor, Schwere.FEHLER, text))
        fun warnung(tor: String, text: String) = b.add(Befund(tor, Schwere.WARNUNG, text))
        // §4.5.1: Eingefuehrte Vorlagen tragen keine Gegenprobe und zwei statt
        // drei Fehlermuster je Feld — dafuer eine Erklaerung, die T18 prueft.
        val importiert = spec.status == "importiert"

        /* --- Tor 1: Struktur --------------------------------------------- */
        if (spec.templateId.isBlank()) fehler("T1 Struktur", "templateId fehlt")
        if (spec.stamm.isBlank()) fehler("T1 Struktur", "stamm fehlt")
        if (spec.variablen.isEmpty()) fehler("T1 Struktur", "keine Variablen — dann ist es kein Template")
        if (spec.unterthemen.isEmpty()) fehler("T1 Struktur", "unterthemen fehlt")
        spec.unterthemen.filterNot { it in bekannteUnterthemen }.forEach {
            fehler("T1 Struktur", "Unterthema \"$it\" steht nicht im Themenbaum")
        }
        // Wo Loesung und Gegenprobe stehen, haengt vom Format ab. Ein
        // MEHRFELD traegt beides je Feld, ein GITTER gar keine einzelne Zahl.
        // Die Regel verlangte sie von allen und meldete darum bei jeder
        // Mehrfeld-Vorlage «loesung fehlt» — bei einer Vorlage, die vollstaendig
        // ist. Geprueft wird jetzt dort, wo die Loesung wirklich steht.
        when (spec.format) {
            Format.LOESUNGSMENGE -> {
                if (spec.loesungsmenge == null) fehler("T1 Struktur", "loesungsmenge fehlt")
                    // Die Gegenprobe der Loesungsmenge ist nicht Pflicht: Sie
                // wird nirgends ausgewertet, und `tore.py` verlangt sie
                // ebenso wenig. Ein Tor, das etwas fordert, das es nie
                // prueft, meldet nur Papierfehler.
                if (spec.gegenprobeMenge == null) warnung("T5 Gegenprobe", "gegenprobeMenge fehlt")
            }
            Format.MEHRFELD -> {
                if (spec.felder.isEmpty()) fehler("T1 Struktur", "mehrfeld ohne Felder")
                spec.felder.forEach { f ->
                    if (f.ausdruck.isBlank()) fehler("T1 Struktur", "Feld «${f.name}»: ausdruck fehlt")
                }
            }
            Format.ZAHL_EINGEBEN -> {
                if (spec.loesung == null) fehler("T1 Struktur", "loesung fehlt")
                // T5: die Gegenprobe ist nur bei von Hand geschriebenen Vorlagen
                // Pflicht — eingefuehrte tragen stattdessen die Erklaerung (§4.5.1).
                if (!importiert && spec.gegenprobe == null) fehler("T5 Gegenprobe", "gegenprobe fehlt")
                if (spec.loesung != null && spec.gegenprobe != null &&
                    normiert(spec.loesung) == normiert(spec.gegenprobe)
                ) {
                    fehler("T5 Gegenprobe", "gegenprobe ist dieselbe Formel — sie muss strukturell anders sein")
                }
            }
            else -> Unit
        }
        if (spec.loesungsweg.isEmpty()) fehler("T1 Struktur", "loesungsweg fehlt")

        // Namen einmal vorab pruefen: ein Tippfehler soll nicht erst bei Seed 137 auffliegen.
        // Eine `tabellenzeile` fuehrt ihre Spalten als eigene Namen ein — sie
        // landen beim Ziehen einzeln im Scope. Ohne sie meldete das Tor
        // «Unbekannter Name ka», obwohl `ka` sehr wohl deklariert ist.
        val namen = spec.variablen.flatMap { listOf(it.name) + (it.spalten ?: emptyList()) }.toSet() +
            (spec.wertetabelle?.spalten?.map { it.name } ?: emptyList())
        val alleAusdruecke = buildList {
            spec.variablen.mapNotNull { it.ausdruck }.forEach { add(it) }
            addAll(spec.bedingungen)
            spec.loesung?.let { add(it) }
            spec.gegenprobe?.let { add(it) }
            spec.fehler.mapNotNull { it.ausdruck }.forEach { add(it) }
        }
        alleAusdruecke.forEach {
            try { Ausdruck.pruefe(it, namen) } catch (e: Ausdruck.Ungueltig) {
                fehler("T1 Struktur", e.message ?: "ungültiger Ausdruck")
            }
        }

        /* --- Tor 2: Fehlermuster ----------------------------------------- */
        // Beim MEHRFELD stehen die Denkfehler je Feld, nicht am Template.
        // Die Regel zaehlte nur die des Templates und meldete darum bei jeder
        // Mehrfeld-Vorlage «nur 0 Fehlermuster», obwohl jedes Feld welche hat.
        val mindestFehler = if (importiert) 2 else 3
        if (spec.format == Format.MEHRFELD) {
            spec.felder.forEach { f ->
                if (f.fehler.size < mindestFehler) {
                    fehler(
                        "T2 Fehlermuster",
                        "Feld «${f.name}»: nur ${f.fehler.size} Fehlermuster, mindestens $mindestFehler",
                    )
                }
                f.fehler.forEach { x ->
                    if (x.feedback.length < 40) {
                        fehler("T2 Fehlermuster", "${f.name}/${x.diagnoseId}: Feedback zu knapp")
                    }
                }
            }
        } else if (spec.format in setOf(Format.ZAHL_EINGEBEN, Format.LOESUNGSMENGE) &&
            spec.fehler.size < mindestFehler
        ) {
            fehler(
                "T2 Fehlermuster",
                "nur ${spec.fehler.size} — mindestens $mindestFehler echte Denkfehler nötig",
            )
        }
        spec.fehler.forEach {
            if (it.feedback.length < 40) {
                fehler("T2 Fehlermuster", "${it.diagnoseId}: Feedback zu knapp — es muss den Denkfehler benennen")
            }
            if (it.feedback.trim().lowercase() in setOf("das ist falsch.", "falsch.")) {
                fehler("T2 Fehlermuster", "${it.diagnoseId}: «Das ist falsch» ist kein Feedback")
            }
        }
        if (spec.fehler.map { it.diagnoseId }.toSet().size != spec.fehler.size) {
            fehler("T2 Fehlermuster", "zwei Fehlermuster tragen dieselbe diagnoseId")
        }

        /* --- Tor 3: Schweizer Hochdeutsch -------------------------------- */
        val text = buildString {
            append(spec.stamm)
            spec.hinweise.forEach { append(' ').append(it) }
            spec.loesungsweg.forEach { append(' ').append(it) }
            spec.fehler.forEach { append(' ').append(it.feedback) }
        }
        val umrechnung = waehrungsaufgabe(text)
        VERBOTEN.forEach { (muster, wort, hinweis) ->
            if (umrechnung && (wort == "Euro" || wort == "€")) return@forEach
            if (muster.containsMatchIn(text)) fehler("T3 Sprache", "«$wort» gefunden — $hinweis")
        }

        /* --- Tor 4-9: ueber SEEDS Ziehungen ------------------------------ */
        var gelungen = 0
        val loesungen = mutableSetOf<String>()
        val staemme = mutableSetOf<String>()
        val distraktorTreffer = mutableMapOf<String, Int>()

        for (seed in 1..SEEDS) {
            val a = try {
                Generator.ziehe(spec, seed)
            } catch (e: ZiehungFehlgeschlagen) {
                continue
            } catch (e: Ausdruck.Ungueltig) {
                fehler("T4 Ziehung", "Seed $seed: ${e.message}")
                continue
            }
            gelungen++
            // Nicht nur der Stamm: bei Zuordnen, Sortieren, Gitter, Faerben
            // und Mehrfeld ist er eine feste Anweisung («Ordne zu»), und die
            // Aufgaben unterscheiden sich in den Elementen.
            staemme += a.sichtbarerSchluessel
            loesungen += a.loesungsSchluessel

            if (a.loesung != null) {
                // (der Schluessel wird unten fuer JEDE Ziehung gesetzt)

                /* Tor 5: Gegenprobe — nur bei von Hand geschriebenen Vorlagen.
                   Eingefuehrte tragen laut §4.5.1 keine; hier stand `!!`, und
                   damit meldete das Tor fuer jede eingefuehrte Vorlage 200-mal
                   «Gegenprobe null» — ein Befund ueber eine Zusicherung, die
                   dort gar nicht gilt. */
                if (!importiert && spec.gegenprobe != null) {
                    val gp = try { Ausdruck.werteAus(spec.gegenprobe, a.scope) } catch (e: Exception) { null }
                    if (gp == null || abs(gp - a.loesung) > 1e-6) {
                        fehler("T5 Gegenprobe", "Seed $seed: Lösung ${a.loesung} vs. Gegenprobe $gp")
                    }
                }

                /* Tor 6: ohne Taschenrechner lösbar */
                if (abs(a.loesung) > 100_000) {
                    warnung("T6 Zahlenqualität", "Seed $seed: Lösung ${a.loesung} ist zu gross für den Kopf")
                }
                if (spec.zahlformat == Zahlformat.GANZ && abs(a.loesung - Math.round(a.loesung)) > 1e-9) {
                    fehler("T6 Zahlenqualität", "Seed $seed: zahlformat «ganz», Lösung ist ${a.loesung}")
                }
                if (spec.zahlformat == Zahlformat.DEZIMAL2) {
                    val x = a.loesung * 100
                    if (abs(x - Math.round(x)) > 1e-7) {
                        fehler("T6 Zahlenqualität", "Seed $seed: mehr als zwei Nachkommastellen (${a.loesung})")
                    }
                }
                a.scope.values.forEach {
                    if (abs(it) > 1_000_000) {
                        warnung("T6 Zahlenqualität", "Seed $seed: Zwischenwert $it ist zu gross für den Kopf")
                    }
                }
            }

            /* Tor 7: Distraktoren */
            if (a.fehler.size < 3) {
                warnung("T7 Distraktoren", "Seed $seed: nach Filterung nur ${a.fehler.size} Distraktoren")
            }
            a.fehler.forEach {
                distraktorTreffer.merge(it.diagnoseId, 1, Int::plus)
                if (spec.zahlformat == Zahlformat.FRANKEN && it.wert < 0) {
                    warnung("T7 Distraktoren", "Seed $seed: negativer Preis als Distraktor (${it.diagnoseId})")
                }
            }

            /* Tor 8: die Loesung steht nicht als Zahl im Aufgabentext.
               Verglichen werden Zahlen, nicht Zeichenketten — sonst schlaegt
               das Tor bei «120 Minuten» und der Loesung 12 falsch an. */
            // Nur bei Sachaufgaben. Steht im Stamm eine Gleichung, dann ist
            // eine uebereinstimmende Zahl ein Koeffizient und kein Verrat:
            // «(x − 5)/2 = (x + 3)/4» darf die Loesung 5 haben.
            if (a.loesung != null && "=" !in a.stamm &&
                zahlenIn(a.stamm).any { abs(it - a.loesung) < 1e-9 }
            ) {
                fehler(
                    "T8 Verrat",
                    "Seed $seed: die Lösung ${Generator.schlicht(a.loesung)} steht im Aufgabentext. " +
                        "Schliesse das ueber eine Bedingung aus.",
                )
            }

            /* Tor 9: der erste Hinweis verrät die Loesung nicht */
            val ersterHinweis = a.hinweise.firstOrNull()
            if (ersterHinweis != null && a.loesung != null &&
                zahlenIn(ersterHinweis).any { abs(it - a.loesung) < 1e-9 }
            ) {
                fehler("T9 Hinweise", "Seed $seed: der erste Hinweis nennt die Lösung")
            }
            if (ersterHinweis != null && !ersterHinweis.contains('?')) {
                warnung("T9 Hinweise", "Der erste Hinweis sollte eine Rückfrage stellen")
            }
        }

        /* --- Tor 10: Ausbeute -------------------------------------------- */
        if (gelungen < SEEDS * 0.9) {
            fehler("T10 Ausbeute", "nur $gelungen von $SEEDS Ziehungen gelingen — die Bedingungen sind zu eng")
        }

        /* --- Tor 11: Vielfalt -------------------------------------------- */
        if (gelungen > 0) {
            // Eine feste Schwelle, keine anteilige: Verlangt wird, dass ein
            // Template ueberhaupt genug verschiedene Aufgaben hergibt, nicht
            // dass jede zweite Ziehung neu ist.
            //
            // `variantenGrenze` ist die nachlesbare Ausnahme (§4.5.1): Ein
            // Spielwuerfel hat genau 48 Lagen. Sie stand in den Daten und in
            // der Spec, wurde hier aber von niemandem gelesen — die Ausnahme
            // war damit wirkungslos.
            val grenze = spec.variantenGrenze
            if (grenze != null && grenze.grund.isBlank()) {
                fehler("T1 Struktur", "variantenGrenze ohne grund")
            }
            val soll = if (grenze != null) minOf(MIN_VARIANTEN, grenze.anzahl) else MIN_VARIANTEN
            if (staemme.size < soll) {
                fehler(
                    "T11 Vielfalt",
                    "nur ${staemme.size} verschiedene Aufgaben aus $gelungen Ziehungen, verlangt sind $soll",
                )
            }
            if (grenze != null && staemme.size > grenze.anzahl) {
                fehler(
                    "T11 Vielfalt",
                    "variantenGrenze sagt ${grenze.anzahl}, es sind aber ${staemme.size} — " +
                        "die Grenze stimmt nicht mehr",
                )
            }
            if (spec.format != Format.LOESUNGSMENGE && loesungen.size < 8) {
                fehler("T11 Vielfalt", "nur ${loesungen.size} verschiedene Lösungen — zu wenig Streuung")
            }
        }

        /* --- Tor 12: greift jedes Fehlermuster überhaupt? --------------- */
        // Nur dort, wo Distraktoren dem Schueler ueberhaupt gezeigt werden.
        // Bei einer Wertetabelle oder einem Gitter traegt das Fehlermuster
        // die Rueckmeldung, nicht eine Auswahlantwort — dort fragt das Tor
        // nichts Sinnvolles.
        if (spec.format in setOf(Format.ZAHL_EINGEBEN, Format.MEHRFELD)) spec.fehler.forEach {
            if (distraktorTreffer[it.diagnoseId] == null) {
                fehler(
                    "T12 Fehlermuster greifen",
                    "${it.diagnoseId} liefert in keiner Ziehung einen brauchbaren Distraktor",
                )
            }
        }

        /* --- Status ------------------------------------------------------- */
        if (spec.status !in setOf("entwurf", "review", "live", "importiert")) {
            fehler("T1 Struktur", "status «${spec.status}» ist unbekannt")
        }
        if (spec.herkunft.beziehung == "abgeleitet" && spec.herkunft.quelle.isNullOrBlank()) {
            fehler("T1 Struktur", "herkunft «abgeleitet» ohne quelle")
        }

        // Gleiche Befunde ueber verschiedene Seeds zu einer Zeile zusammenziehen.
        val gebuendelt = b
            .groupBy { it.tor + "|" + it.text.replace(Regex("Seed \\d+"), "Seed N") }
            .map { (_, gruppe) ->
                val erster = gruppe.first()
                if (gruppe.size == 1) erster
                else erster.copy(text = erster.text.replace(Regex("Seed \\d+"), "Seed N") + " (${gruppe.size}x)")
            }

        return Bericht(spec.templateId, gebuendelt)
    }

    private val ZAHL = Regex("""-?\d+(?:[.,]\d+)?""")

    /** Alle Zahlen eines Satzes. Fuer Tor 8 und Tor 9. */
    private fun zahlenIn(text: String): List<Double> =
        ZAHL.findAll(text).mapNotNull { it.value.replace(',', '.').toDoubleOrNull() }.toList()

    /** Für Tor 1: `a*b` und `b*a` gelten als dieselbe Formel. */
    private fun normiert(a: String): String =
        a.filterNot { it.isWhitespace() }.toCharArray().sorted().joinToString("")

    fun bericht(b: Bericht): String = buildString {
        append(if (b.bestanden) "OK      " else "FEHLER  ").append(b.templateId)
        b.befunde.forEach {
            append("\n  [").append(if (it.schwere == Schwere.FEHLER) "FEHLER" else "warnung").append("] ")
            append(it.tor).append(": ").append(it.text)
        }
    }
}
