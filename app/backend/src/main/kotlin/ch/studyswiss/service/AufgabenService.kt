package ch.studyswiss.service

import ch.studyswiss.daten.Katalog
import ch.studyswiss.engine.sichtbarerSchluessel
import ch.studyswiss.engine.*
import ch.studyswiss.model.Antwort
import ch.studyswiss.model.*
import kotlin.math.abs
import kotlin.random.Random

/**
 * Stellt Aufgaben her und bewertet Antworten.
 *
 * Zentral: die Aufgabe reist nie mit ihrer Loesung. Nach aussen geht nur
 * `ref` = «templateId:seed». Aus dieser Zeile ist die Aufgabe jederzeit
 * identisch wieder herstellbar — auf dem Server, im Fehlerarchiv, im
 * Gespraech mit den Eltern.
 */
class AufgabenService {

    /** Seeds werden gewuerfelt, nie durchgezaehlt — sonst bekaeme jede Person
     *  dieselbe Reihenfolge. Der gewuerfelte Wert wird in `ref` gemerkt. */
    private fun seed() = Random.nextInt(1, 2_000_000_000)

    fun herstellen(ref: String): Aufgabe? {
        val teile = ref.split(":")
        if (teile.size != 2) return null
        val seed = teile[1].toIntOrNull() ?: return null
        Katalog.template(teile[0])?.let { spec ->
            return try { Generator.ziehe(spec, seed) } catch (e: ZiehungFehlgeschlagen) { null }
        }
        Katalog.textTemplate(teile[0])?.let { return TextGenerator.ziehe(it, seed) }
        return null
    }

    fun alsDto(a: Aufgabe): AufgabeDto = AufgabeDto(
        ref = a.ref,
        fach = a.fach,
        unterthema = a.unterthemen.first(),
        unterthemaName = Katalog.unterthema(a.fach, a.unterthemen.first())?.name ?: "",
        // Der kleine, leise Titel ueber der Aufgabe. Er nennt das Oberthema,
        // nicht das Unterthema: «Bruchrechnen» statt «Brueche mit
        // ungleichem Nenner addieren» — kurz genug, dass die Aufgabe im
        // Blick bleibt.
        themaKurz = Katalog.oberthemaVon(a.fach, a.unterthemen.first())?.name ?: "",
        lesetext = a.lesetext,
        format = a.format.name.lowercase(),
        stamm = a.stamm,
        einheit = a.einheit,
        optionen = a.optionen.map { OptionDto(it.id, it.text) },
        hinweiseVerfuegbar = a.hinweise.size,
        woerter = a.woerter,
        // Wie viele Wörter gesucht sind, darf der Client wissen — sonst
        // wuesste niemand, wann er fertig ist. Welche es sind, nicht.
        anzahlGesucht = when (a.format) {
            Format.MARKIEREN -> a.loesungIndizes.size
            Format.KOMMAS -> a.loesungIndizes.size
            Format.MEHRFACHAUSWAHL -> a.loesungWorte.size
            else -> 0
        },

        // Ein Feld ohne Zahlenloesung erwartet ein Wort — so steht es in
        // der gezogenen Aufgabe, und nur sie weiss es sicher.
        felder = a.felder.map {
            FeldDto(it.name, it.label, it.einheit, text = it.loesung == null)
        },

        gitter = a.gitter?.let { g ->
            GitterDto(
                xvon = g.xvon, xbis = g.xbis, yvon = g.yvon, ybis = g.ybis,
                punkte = g.punkte.map { GitterPunktDto(it.name, it.label) },
                vorgabe = g.vorgabe.map { GitterMarkeDto(it.text, it.x, it.y) },
                strecken = g.strecken.map {
                    GitterStreckeDto(it.text, it.stil, it.von.x, it.von.y, it.bis.x, it.bis.y)
                },
            )
        },

        // Die Ziele stehen in ihrer festen Reihenfolge, die Elemente
        // gemischt. Der Client meldet Ziel-Nummer → ANZEIGEPOSITION des
        // Elements; erst der Server rechnet über die Mischung zurück. Sonst
        // wäre die richtige Antwort immer «Nummer i zu Nummer i», und man
        // koennte sie ohne Nachdenken tippen.
        ziele = a.paare.map { OptionDto("z${it.index}", it.ziel) },
        elemente = a.mischung.mapIndexed { pos, k -> OptionDto("e$pos", a.paare[k].element) },

        zuOrdnen = if (a.format == Format.SORTIEREN) {
            a.mischung.mapIndexed { pos, k -> OptionDto("s$pos", a.elemente[k].text) }
        } else {
            emptyList()
        },

        tabelle = a.wertetabelle?.let { w ->
            TabelleDto(
                spalten = w.spalten.map { TabellenspalteDto(it.name, it.kopf, it.von, it.bis) },
                zeilen = w.paare.size,
            )
        },

        // Wie viele Felder einzufärben sind, wäre bereits die halbe
        // Antwort — der Client bekommt nur die Rastergroesse.
        raster = a.raster?.let { RasterDto(it.spalten, it.zeilen) },

        zeilen = a.zeilen.map { OptionDto("r${it.index}", it.text) },

        darstellung = a.darstellung?.let { DarstellungDto(it.typ, it.kopf, it.zeilen) },
    )

    /**
     * Zieht `anzahl` verschiedene Aufgaben zu einem Unterthema.
     * `schon` sind Refs, die diese Person bereits richtig geloest hat — die
     * kommen nicht noch einmal, sonst fuellt sich das Pflichtset nicht.
     */
    fun set(fach: String, unterthema: String, anzahl: Int, schon: Set<String> = emptySet()): List<Aufgabe> {
        val mathe = Katalog.templatesFuer(fach, unterthema)
        val text = Katalog.textTemplatesFuer(fach, unterthema)
        if (mathe.isEmpty() && text.isEmpty()) return emptyList()

        val out = mutableListOf<Aufgabe>()
        val gesehen = mutableSetOf<String>()
        var versuche = 0
        // Jeder Topf zaehlt fuer sich. Vorher lief ein gemeinsamer Zaehler durch
        // beide Listen: Weil er im Mathe-Zweig immer ungerade und im Text-Zweig
        // immer gerade ist, waren bei gerader Listenlaenge nur die halben
        // Indizes erreichbar — drei fertige, tor-gepruefte Vorlagen hat so nie
        // jemand gezogen. Mit eigenen Zaehlern kommt jede Vorlage der Reihe nach.
        var iMathe = 0
        var iText = 0
        while (out.size < anzahl && versuche < anzahl * 40) {
            versuche++
            val a = if (mathe.isNotEmpty() && (text.isEmpty() || versuche % 2 == 1)) {
                val spec = mathe[iMathe++ % mathe.size]
                try { Generator.ziehe(spec, seed()) } catch (e: ZiehungFehlgeschlagen) { continue }
            } else {
                TextGenerator.ziehe(text[iText++ % text.size], seed())
            }
            if (a.ref in schon) continue
            // Zwei Aufgaben mit gleichem Wortlaut hintereinander wirken wie ein Fehler.
            // Verglichen wird alles Sichtbare, nicht nur der Stamm — sonst
            // faellt ein ganzer Markieren-Block auf zwei Aufgaben zusammen.
            if (!gesehen.add(a.sichtbarerSchluessel)) continue
            out += a
        }
        return out
    }

    /**
     * Mischt ueber mehrere Unterthemen, gewichtet nach Pruefungsanteil.
     *
     * Die Plaetze werden **vorher** verteilt, nicht nachtraeglich abgeschnitten.
     * Vorher bekam jedes Unterthema `coerceAtLeast(1)`, und bei 86 Unterthemen
     * auf 12 Aufgaben rundete fast jedes auf genau 1: Es entstanden 86 Aufgaben,
     * aus denen `shuffled().take(12)` gleichverteilt zog. Das Oberthema mit
     * 45 % der Pruefungspunkte bekam so 27 % des Tests, die beiden Oberthemen
     * mit null Punkten zusammen 17 %.
     *
     * Gewichtet wird das Oberthema; `GRUNDANTEIL` haelt jene mit null Punkten
     * im Spiel, weil sie Voraussetzung fuer die anderen sind.
     */
    fun mischsatz(fach: String, unterthemen: List<String>, anzahl: Int): List<Aufgabe> {
        if (unterthemen.isEmpty() || anzahl <= 0) return emptyList()

        // Gewichtet wird das OBERTHEMA, nicht das Unterthema. Sonst haengt der
        // Anteil eines Oberthemas daran, in wie viele Unterthemen es zerlegt
        // ist: Oberthema 2 traegt 45 % der Punkte UND stellt 17 der 86
        // Unterthemen — beides zugleich zu zaehlen hiesse, es doppelt zu
        // gewichten, und es bekaeme ueber die Haelfte des Tests.
        val gruppen = unterthemen.groupBy { Katalog.oberthemaVon(fach, it)?.nr ?: -1 }
        val nummern = gruppen.keys.toList()
        val gewicht = nummern.map {
            maxOf(Katalog.pruefungsgewicht(fach, gruppen.getValue(it).first()), GRUNDANTEIL)
        }
        val summe = gewicht.sum()
        val kumuliert = gewicht.runningFold(0.0) { a, g -> a + g }.drop(1)

        // Jeder Platz wird einzeln gewichtet gezogen. Der naheliegende Weg —
        // Anteile ausrechnen und die Reste verteilen — versagt hier: Auf zwoelf
        // Plaetze liegt jeder rohe Anteil unter 1, und «groesster Rest»
        // entartet zu «die schwersten zuerst».
        //
        // Das ist kein Verstoss gegen §2.4: Gewuerfelt wird, WAS gezogen wird —
        // dieselbe Art Entscheidung wie beim Seed. Die Aufgabe selbst entsteht
        // danach deterministisch aus `templateId:seed`.
        val out = mutableListOf<Aufgabe>()
        val schon = mutableSetOf<String>()
        var runde = 0
        while (out.size < anzahl && runde < 4) {
            runde++
            val plaetze = IntArray(nummern.size)
            repeat(anzahl - out.size) {
                val wurf = Random.nextDouble() * summe
                val i = kumuliert.indexOfFirst { k -> k >= wurf }
                plaetze[if (i < 0) nummern.lastIndex else i]++
            }
            // Innerhalb eines Oberthemas gleichmaessig auf seine Unterthemen.
            nummern.forEachIndexed { i, nr ->
                if (plaetze[i] == 0) return@forEachIndexed
                val themen = gruppen.getValue(nr).shuffled()
                repeat(plaetze[i]) { k ->
                    set(fach, themen[k % themen.size], 1, schon).forEach {
                        schon += it.ref
                        out += it
                    }
                }
            }
        }
        return out.shuffled().take(anzahl)
    }

    /* ------------------------------ Bewerten --------------------------- */

    data class Urteil(
        val richtig: Boolean,
        val diagnoseId: String?,
        val feedback: String,
        /** Welche Felder einer Mehrfeld-Aufgabe noch nicht stimmen. */
        val feldFehler: List<String> = emptyList(),
    )

    /**
     * Vergleicht die Eingabe mit der Loesung und, wenn sie nicht stimmt, mit
     * jedem Fehlermuster. Trifft eines, benennt die Rueckmeldung den
     * Denkfehler — «Das ist falsch» kommt in dieser App nirgends vor.
     */
    fun bewerte(a: Aufgabe, antwort: Antwort): Urteil = bewerte(a, antwort.eingabe, antwort.optionId, antwort)

    /**
     * Wie genau muss eine Zahl stimmen?
     *
     * So genau, wie die App sie anzeigt. Zeigt sie «0.88», weil das Feld auf
     * zwei Stellen gerundet ist, dann MUSS 0.88 richtig sein — sonst gilt als
     * falsch, wer genau das abschreibt, was dasteht. Der exakte Wert bleibt
     * daneben ebenfalls richtig.
     */
    fun genauigkeit(zf: Zahlformat): Double = when (zf) {
        Zahlformat.DEZIMAL1, Zahlformat.DEZIMAL2, Zahlformat.DEZIMAL3 ->
            0.5 * Math.pow(10.0, -zf.stellen.toDouble()) + 1e-9
        Zahlformat.FRANKEN -> 0.005 + 1e-9
        else -> 1e-6
    }

    fun bewerte(a: Aufgabe, eingabe: String, optionId: String?, voll: Antwort? = null): Urteil {

        /* --- Mehrere Antwortfelder ---------------------------------------- */
        if (a.format == Format.MEHRFELD) {
            val ein = voll?.felder ?: emptyMap()
            val daneben = a.felder.filter { f ->
                val roh = (ein[f.name] ?: "").trim()
                if (f.loesungWorte.isNotEmpty()) {
                    // Deutsch: die Loesung ist ein Wort, keine Zahl.
                    f.loesungWorte.none { normiereText(it) == normiereText(roh) }
                } else {
                    val z = alsZahl(roh)
                    z == null || abs(z - (f.loesung ?: return@filter true)) >= genauigkeit(f.zahlformat)
                }
            }
            if (daneben.isEmpty()) return Urteil(true, null, LOB.random())

            // Fuer jedes falsche Feld das passende Fehlermuster suchen. Nur
            // «falsch» zu sagen wäre hier besonders schlecht: Das Kind weiss
            // sonst nicht einmal, WELCHES Feld gemeint ist.
            val ids = mutableListOf<String>()
            val teile = daneben.map { f ->
                val z = alsZahl((ein[f.name] ?: "").trim())
                val t = f.fehler.firstOrNull { z != null && abs(it.wert - z) < genauigkeit(f.zahlformat) }
                if (t != null) { ids += t.diagnoseId; t.feedback }
                else "Bei «${f.label}» stimmt es noch nicht."
            }
            val rest = a.felder.size - daneben.size
            val vorspann = if (rest > 0) "$rest von ${a.felder.size} Feldern stimmen. " else ""
            return Urteil(
                false,
                ids.firstOrNull() ?: "mehrfeld_falsch",
                vorspann + teile.joinToString(" "),
                feldFehler = daneben.map { it.name },
            )
        }

        /* --- Tabelle mit einer Wahl je Zeile ------------------------------ */
        if (a.zeilen.isNotEmpty()) {
            val ein = voll?.zeilen ?: emptyMap()
            val falsch = a.zeilen.filter { ein[it.index] != it.loesung }
            if (falsch.isEmpty()) return Urteil(true, null, LOB.random())
            val z = falsch.first()
            val gewaehlt = ein[z.index]
            return Urteil(
                false, "tabelle_zeile_falsch",
                "${a.zeilen.size - falsch.size} von ${a.zeilen.size} Zeilen stimmen. " +
                    (if (gewaehlt != null) "Bei «${z.text}» hast du «$gewaehlt» gewählt. "
                     else "Bei «${z.text}» fehlt noch die Antwort. ") +
                    "Geh die Zeilen einzeln durch und mach bei jeder die Probe.",
            )
        }

        /* --- Punkte im Gitter --------------------------------------------- */
        if (a.format == Format.GITTER) {
            val g = a.gitter ?: return Urteil(false, null, ALLGEMEIN)
            val gesetzt = voll?.punkte ?: emptyMap()
            val tol = g.toleranz
            val passt = g.loesungen.any { variante ->
                g.punkte.indices.all { i ->
                    val p = gesetzt[g.punkte[i].name]
                    // Ohne die Endlichkeitsprüfung wäre ein unlesbarer Punkt
                    // richtig: |NaN − 5| ist NaN, und NaN > tol ergibt false.
                    p != null && p.size == 2 && p.all { it.isFinite() } &&
                        abs(p[0] - variante[i].x) <= tol && abs(p[1] - variante[i].y) <= tol
                }
            }
            if (passt) return Urteil(true, null, LOB.random())

            val fehlend = g.punkte.filter { gesetzt[it.name].let { q -> q == null || q.size != 2 } }
            if (fehlend.isNotEmpty()) {
                return Urteil(
                    false, "gitter_unvollstaendig",
                    "Es fehlt noch " +
                        (if (fehlend.size == 1) "ein Punkt" else "${fehlend.size} Punkte") + ": " +
                        fehlend.joinToString(", ") { it.label } + ". Setze alle Punkte, bevor du prüfst.",
                )
            }
            val soll = g.loesungen.first()
            val i = g.punkte.indices.first { k ->
                val q = gesetzt[g.punkte[k].name]!!
                abs(q[0] - soll[k].x) > tol || abs(q[1] - soll[k].y) > tol
            }
            val q = gesetzt[g.punkte[i].name]!!
            return Urteil(
                false, "gitter_punkt_falsch",
                "${g.punkte[i].label} liegt noch nicht richtig: Du hast " +
                    "(${Generator.schlicht(q[0])} | ${Generator.schlicht(q[1])}) gesetzt. " +
                    "Lies die Koordinaten immer in derselben Reihenfolge ab — zuerst nach rechts, dann nach oben.",
            )
        }

        /* --- Zuordnen ------------------------------------------------------ */
        if (a.format == Format.ZUORDNEN) {
            // Der Client meldet Ziel-Nummer → Anzeigeposition. Über die
            // Mischung wird auf die echte Elementnummer zurueckgerechnet.
            val ein = voll?.zuordnung ?: emptyMap()
            val falsch = a.paare.filter { p -> a.mischung.getOrNull(ein[p.index] ?: -1) != p.index }
            if (falsch.isEmpty()) return Urteil(true, null, LOB.random())
            val offen = a.paare.count { ein[it.index] == null }
            if (offen > 0) {
                return Urteil(
                    false, "zuordnung_unvollstaendig",
                    "$offen von ${a.paare.size} Zuordnungen fehlen noch. Ordne jedem Feld etwas zu, bevor du prüfst.",
                )
            }
            return Urteil(
                false, "zuordnung_falsch",
                "${a.paare.size - falsch.size} von ${a.paare.size} stimmen. Bei «${falsch.first().ziel}» " +
                    "passt es noch nicht — geh die Zuordnungen einzeln durch, statt sie der Reihe nach zu legen.",
            )
        }

        /* --- Sortieren ----------------------------------------------------- */
        if (a.format == Format.SORTIEREN) {
            val gelegt = (voll?.reihenfolge ?: emptyList()).mapNotNull { a.mischung.getOrNull(it) }
            if (gelegt.size < a.elemente.size) {
                return Urteil(
                    false, "sortierung_unvollstaendig",
                    "Es fehlen noch ${a.elemente.size - gelegt.size} von ${a.elemente.size}. " +
                        "Tippe alle der Reihe nach an, vom kleinsten zum grössten.",
                )
            }
            if (gelegt == a.reihenfolge) return Urteil(true, null, LOB.random())
            // Das erste Paar nennen, das in der falschen Ordnung steht — das
            // ist die Stelle, an der das Kind tatsaechlich danebengriff.
            val i = (0 until gelegt.size - 1).firstOrNull {
                a.elemente[gelegt[it]].wert > a.elemente[gelegt[it + 1]].wert
            }
            val hinweis = if (i != null) {
                "«${a.elemente[gelegt[i]].text}» steht noch vor «${a.elemente[gelegt[i + 1]].text}», " +
                    "gehört aber dahinter. "
            } else {
                ""
            }
            return Urteil(
                false, "sortierung_falsch",
                hinweis + "Rechne die Grössen zuerst alle in dieselbe Einheit um — dann lassen sie sich vergleichen.",
            )
        }

        /* --- Wertetabelle -------------------------------------------------- */
        if (a.format == Format.WERTETABELLE) {
            val w = a.wertetabelle ?: return Urteil(false, null, ALLGEMEIN)
            val ein = (voll?.paare ?: emptyList()).filter { it.size == 2 }.map { it[0] to it[1] }
            if (ein.size < w.paare.size) {
                return Urteil(
                    false, "tabelle_unvollstaendig",
                    "Es fehlen noch ${w.paare.size - ein.size} von ${w.paare.size} Zeilen. " +
                        "Trage in jede Zeile ein Zahlenpaar ein.",
                )
            }
            if (ein.toSet() == w.paare.toSet()) return Urteil(true, null, LOB.random())
            val daneben = ein.firstOrNull { it !in w.paare }
            return Urteil(
                false, "tabelle_paar_falsch",
                (if (daneben != null) "Das Paar (${daneben.first} | ${daneben.second}) stimmt nicht. " else "") +
                    "Setze jeden Wert in die Gleichung ein und rechne nach, ob beide Seiten gleich sind.",
            )
        }

        /* --- Felder faerben ------------------------------------------------ */
        if (a.format == Format.FAERBEN) {
            val r = a.raster ?: return Urteil(false, null, ALLGEMEIN)
            val ein = (voll?.gefaerbt ?: emptyList()).toSet()
            val soll = r.felder.toSet()
            if (ein == soll) return Urteil(true, null, LOB.random())
            val zuViel = (ein - soll).size
            val zuWenig = (soll - ein).size
            return Urteil(
                false, "ansicht_falsch",
                when {
                    zuWenig > 0 && zuViel == 0 ->
                        "Es fehlen noch $zuWenig Felder. Geh Spalte für Spalte durch: Wie hoch ist der " +
                            "höchste Stapel in dieser Spalte? So viele Felder werden von unten gefärbt."
                    zuViel > 0 && zuWenig == 0 ->
                        "$zuViel Felder sind zu viel gefärbt. Von vorne sieht man je Spalte nur den " +
                            "höchsten Stapel — nicht die Summe aller Würfel dahinter."
                    else ->
                        "Die Ansicht stimmt noch nicht: $zuWenig fehlen, $zuViel sind zu viel. " +
                            "Nimm je Spalte den höchsten Stapel."
                },
            )
        }

        /* --- Deutsch: Wörter antippen ------------------------------------ */
        if (a.format == Format.MARKIEREN || a.format == Format.KOMMAS) {
            val getippt = (voll?.stellen ?: emptyList()).toSortedSet()
            val richtig = a.loesungIndizes.toSortedSet()
            if (getippt == richtig) return Urteil(true, null, LOB.random())

            val zuViel = (getippt - richtig).map { a.woerter.getOrNull(it) }.filterNotNull()
            val zuWenig = (richtig - getippt).map { a.woerter.getOrNull(it) }.filterNotNull()
            val satz = when {
                a.format == Format.KOMMAS && zuViel.isNotEmpty() && zuWenig.isEmpty() ->
                    "Du hast ein Komma zu viel gesetzt — nach «${zuViel.first()}» gehört keines hin. " +
                        "Setze nur dort ein Komma, wo ein Teilsatz endet oder eine Aufzählung trennt."
                a.format == Format.KOMMAS && zuWenig.isNotEmpty() ->
                    "Nach «${zuWenig.first()}» fehlt ein Komma. Suche alle Personalformen im Satz — " +
                        "jede gehört zu einem eigenen Teilsatz, und zwischen zwei Teilsätzen steht ein Komma."
                zuWenig.isNotEmpty() && zuViel.isEmpty() ->
                    "«${zuWenig.first()}» gehört auch dazu. Markiere die Wortgruppe immer vollständig, " +
                        "also mit Artikel und Adjektiven."
                zuViel.isNotEmpty() && zuWenig.isEmpty() ->
                    "«${zuViel.first()}» gehört nicht dazu. Prüfe mit der Frageprobe, wo die Wortgruppe endet."
                else ->
                    "Die Markierung stimmt noch nicht ganz: ${zuWenig.size} fehlen, ${zuViel.size} sind zu viel."
            }
            return Urteil(false, "markierung_unvollstaendig", satz)
        }

        /* --- Deutsch: mehrere Optionen ------------------------------------ */
        if (a.format == Format.MEHRFACHAUSWAHL) {
            val gewaehlt = (voll?.optionIds ?: emptyList())
                .mapNotNull { id -> a.optionen.firstOrNull { it.id == id }?.text }.toSet()
            val richtig = a.loesungWorte.toSet()
            if (gewaehlt == richtig) return Urteil(true, null, LOB.random())
            val treffer = a.textFehler.firstOrNull { it.antwort in (gewaehlt - richtig) }
            return Urteil(false, treffer?.diagnoseId ?: "auswahl_unvollstaendig",
                treffer?.feedback
                    ?: "Es fehlt noch etwas oder es ist zu viel angekreuzt. Geh die Liste nochmals durch " +
                        "und prüfe jedes Wort einzeln.")
        }

        /* --- Deutsch: Lücke ---------------------------------------------- */
        if (a.format == Format.LUECKENTEXT && a.loesungWorte.isNotEmpty()) {
            val g = normiereText(eingabe)
            if (a.loesungWorte.any { normiereText(it) == g }) return Urteil(true, null, LOB.random())
            val treffer = a.textFehler.firstOrNull { normiereText(it.antwort) == g }
            return Urteil(false, treffer?.diagnoseId,
                treffer?.feedback
                    ?: "Das stimmt noch nicht. Achte auf die Endung und darauf, ob die Form zum Subjekt passt.")
        }

        /* --- Deutsch: Einfachauswahl ueber Text --------------------------- */
        if (a.format == Format.MULTIPLE_CHOICE && a.textFehler.isNotEmpty() && optionId != null) {
            val gewaehlt = a.optionen.firstOrNull { it.id == optionId }?.text
            if (gewaehlt != null && gewaehlt in a.loesungWorte) return Urteil(true, null, LOB.random())
            val treffer = a.textFehler.firstOrNull { it.antwort == gewaehlt }
            return Urteil(false, treffer?.diagnoseId,
                treffer?.feedback
                    ?: "Das stimmt noch nicht. Geh die Proben der Reihe nach durch — der Lösungsweg unten zeigt sie.")
        }

        if (a.format == Format.MULTIPLE_CHOICE && optionId != null) {
            val o = a.optionen.firstOrNull { it.id == optionId }
            // Eine unbekannte Kennung ergab hier `Urteil(false, …, LOB.random())` —
            // «richtig: nein» mit dem Text «Stimmt. Genau so geht es.» Die einzige
            // Stelle der App, an der Urteil und Rueckmeldung sich widersprachen.
            if (o == null) return Urteil(false, null, ALLGEMEIN)
            if (o.diagnoseId == null) {
                val richtig = o.id == "richtig"
                return Urteil(richtig, null, if (richtig) LOB.random() else ALLGEMEIN)
            }
            val fm = a.fehler.firstOrNull { it.diagnoseId == o.diagnoseId }
            return Urteil(false, o.diagnoseId, fm?.feedback ?: ALLGEMEIN)
        }

        val zahl = alsZahl(eingabe)
            ?: return Urteil(false, null, "Da fehlt noch eine Zahl. Schreibe dein Ergebnis als Zahl, zum Beispiel 42 oder 3.5.")

        val loesung = a.loesung ?: return Urteil(false, null, ALLGEMEIN)
        val tol = genauigkeit(a.zahlformat)
        if (abs(zahl - loesung) < tol) return Urteil(true, null, LOB.random())

        val treffer = a.fehler.firstOrNull { abs(it.wert - zahl) < tol }
        return Urteil(false, treffer?.diagnoseId, treffer?.feedback ?: ALLGEMEIN)
    }

    /** Tippfehlerfreundlich, aber nicht nachlässig: Gross- und Kleinschreibung
     *  und doppelte Leerzeichen werden verziehen, die Endungen nicht. */
    fun normiereText(s: String): String =
        s.trim().lowercase().replace(Regex("\\s+"), " ").trimEnd('.', '!', '?')

    /** Hochgestellte und tiefgestellte Ziffern zurueck in gewoehnliche.
     *  Angezeigt wird ⁵⁄₁₂, getippt wird 5/12 — beides muss dieselbe Zahl
     *  ergeben, sonst gilt als falsch, wer abschreibt, was dasteht. */
    private val AUSHOCH = mapOf(
        '⁰' to '0', '¹' to '1', '²' to '2', '³' to '3', '⁴' to '4', '⁵' to '5',
        '⁶' to '6', '⁷' to '7', '⁸' to '8', '⁹' to '9', '⁻' to '-',
        '₀' to '0', '₁' to '1', '₂' to '2', '₃' to '3', '₄' to '4', '₅' to '5',
        '₆' to '6', '₇' to '7', '₈' to '8', '₉' to '9', '₋' to '-', '⁄' to '/',
    )

    /** Nimmt «1'200.50», «1200,5», «Fr. 96.–», «96 cm» und «⁵⁄₁₂» entgegen. */
    fun alsZahl(eingabe: String): Double? {
        val roh = eingabe.trim().map { AUSHOCH[it] ?: it }.joinToString("")
            .replace("'", "").replace("’", "")
            .replace("Fr.", "").replace("CHF", "")
            .replace(",", ".")
            .replace(Regex("""[^0-9.\-/]"""), "")
        if (roh.isBlank()) return null
        if ("/" in roh) {
            val t = roh.split("/")
            val z = t.getOrNull(0)?.toDoubleOrNull() ?: return null
            val n = t.getOrNull(1)?.toDoubleOrNull() ?: return null
            return if (abs(n) < 1e-12) null else z / n
        }
        return roh.trimEnd('.').toDoubleOrNull()
    }

    private companion object {
        /**
         * Mindestgewicht eines Oberthemas im Mischsatz.
         *
         * Oberthema 1 und 6 tragen null Pruefungspunkte, weil sie nicht
         * eigenstaendig geprueft werden — sie sind Voraussetzung fuer die
         * anderen. Ohne Mindestgewicht kaemen sie in der Standortbestimmung
         * nie vor, und der Test saehe nicht, ob die Grundlagen sitzen.
         */
        const val GRUNDANTEIL = 0.04

        val LOB = listOf(
            "Stimmt. Genau so geht es.",
            "Richtig — und du hast den Grundwert sauber erkannt.",
            "Das passt. Weiter so.",
            "Richtig gerechnet.",
        )
        const val ALLGEMEIN =
            "Das stimmt noch nicht. Geh den Weg nochmals Schritt für Schritt durch und " +
                "schau, welche Zahl das Ganze ist und welche nur ein Teil davon."
    }
}
