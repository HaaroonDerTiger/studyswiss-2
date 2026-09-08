package ch.studyswiss.engine

import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToLong

/**
 * Zieht aus einem Template und einem Seed genau eine Aufgabe.
 *
 * Rejection Sampling: Variablen wuerfeln, alle `bedingungen` pruefen, bei
 * Misserfolg neu wuerfeln. Nach VERSUCHE erfolglosen Anlaeufen wirft der
 * Generator — ein Template, dessen Bedingungen sich widersprechen, soll
 * auffallen und nicht still eine Endlosschleife drehen.
 */
object Generator {

    private const val VERSUCHE = 400

    private val HOCHZIFFERN = mapOf(
        '0' to '⁰', '1' to '¹', '2' to '²', '3' to '³', '4' to '⁴',
        '5' to '⁵', '6' to '⁶', '7' to '⁷', '8' to '⁸', '9' to '⁹', '-' to '⁻',
    )

    private val TIEFZIFFERN = mapOf(
        '0' to '₀', '1' to '₁', '2' to '₂', '3' to '₃', '4' to '₄',
        '5' to '₅', '6' to '₆', '7' to '₇', '8' to '₈', '9' to '₉', '-' to '₋',
    )

    private fun hochgestellt(w: Double): String =
        Math.round(w).toString().map { HOCHZIFFERN[it] ?: it }.joinToString("")

    /** Das Gegenstueck zu [hochgestellt] — ohne den Nenner laesst sich ein
     *  Bruch mit gezogenen Zahlen nicht setzen. */
    private fun tiefgestellt(w: Double): String =
        Math.round(w).toString().map { TIEFZIFFERN[it] ?: it }.joinToString("")

    /**
     * Ein Bruch wird als Bruch gesetzt: ⁵⁄₁₂, nicht 5/12.
     *
     * Getippt wird er weiterhin mit dem Schraegstrich — `alsZahl` nimmt beide
     * Schreibweisen entgegen. Nur die ANZEIGE ist gesetzt.
     */
    private fun gesetzt(z: Long, n: Long): String =
        z.toString().map { HOCHZIFFERN[it] ?: it }.joinToString("") + "⁄" +
            n.toString().map { TIEFZIFFERN[it] ?: it }.joinToString("")

    fun formatiere(w: Double, f: Zahlformat): String = when (f) {
        Zahlformat.HOCH -> hochgestellt(w)
        Zahlformat.TIEF -> tiefgestellt(w)
        Zahlformat.FRANKEN ->
            if (abs(w - Math.round(w)) < 1e-9) "Fr. ${gruppiert(Math.round(w))}.–"
            else "Fr. " + gruppiert(w.toLong()) + String.format("%.2f", abs(w) % 1).substring(1)
        Zahlformat.DEZIMAL1, Zahlformat.DEZIMAL2, Zahlformat.DEZIMAL3,
        Zahlformat.DEZIMAL4 -> {
            val p10 = Math.pow(10.0, f.stellen.toDouble())
            val g = (w * p10).roundToLong() / p10
            if (abs(g - Math.round(g)) < 1e-9) Math.round(g).toString() else g.toString()
        }
        Zahlformat.GANZ -> Math.round(w).toString()
        Zahlformat.BRUCH -> alsBruch(w)
    }

    /** Naeherung als gekuerzter Bruch. Fuer die Anzeige, nie fuer den Vergleich. */
    private fun alsBruch(w: Double): String {
        if (abs(w - Math.round(w)) < 1e-9) return Math.round(w).toString()
        // Die Toleranz waechst mit dem Nenner, und sie muss es: Jeder
        // Ausdruck wird auf sechs Stellen gerundet, ein Wert wie ⁷⁴⁄₆₃ kommt
        // also als 1.174603 an. Mal 63 fehlen dann 1.1e-5 — mit der festen
        // Schwelle 1e-7 fand die Schleife den Bruch nie und zeigte «1.1746».
        // Falsche Treffer sind ausgeschlossen: Beim falschen Nenner liegt
        // w*n mindestens 1/n von einer ganzen Zahl entfernt.
        for (nenner in 2..999) {
            val z = w * nenner
            if (abs(z - Math.round(z)) < 5e-7 * nenner) {
                val zz = Math.round(z)
                val t = ggt(abs(zz), nenner.toLong())
                return gesetzt(zz / t, nenner / t)
            }
        }
        return String.format("%.4f", w)
    }

    private tailrec fun ggt(a: Long, b: Long): Long = if (b == 0L) a else ggt(b, a % b)

    /** Schweizer Schreibweise: Fr. 24'000.–, nicht Fr. 24000.–. */
    private fun gruppiert(w: Long): String {
        val z = abs(w).toString().reversed().chunked(3).joinToString("'").reversed()
        return if (w < 0) "-$z" else z
    }

    /* --------------------------------------------------------------------- */

    fun ziehe(spec: TemplateSpec, seed: Int, niveau: Niveau = Niveau.PRUEFUNGSNIVEAU): Aufgabe {
        val abweichung = spec.proNiveau[niveau]

        // Variablen des Niveaus ersetzen gleichnamige der Grundfassung.
        val variablen = buildList {
            val ersetzt = abweichung?.variablen?.associateBy { it.name } ?: emptyMap()
            spec.variablen.forEach { add(ersetzt[it.name] ?: it) }
            abweichung?.variablen?.filter { v -> spec.variablen.none { it.name == v.name } }
                ?.forEach { add(it) }
        }
        val bedingungen = spec.bedingungen + (abweichung?.bedingungen ?: emptyList())
        val stammVorlage = abweichung?.stamm ?: spec.stamm

        var scope: Map<String, Double> = emptyMap()
        var texte: Map<String, List<String>> = emptyMap()
        var gelungen = false
        // Welcher Versuch gelungen ist, geht in den Misch-Rng ein. Genau so
        // macht es die Vorschau — sonst mischte dieselbe `templateId:seed`
        // dort anders als hier, und die Aufgabe waere nicht mehr dieselbe.
        var glueck = 0

        // Der Rng wird pro Versuch neu aufgesetzt, aber mit verändertem Seed:
        // sonst liefert Versuch 2 dieselbe Ziehung wie Versuch 1.
        for (versuch in 0 until VERSUCHE) {
            val rng = Rng(seed * 1_000_003 + versuch)
            val s = mutableMapOf<String, Double>()
            val t = mutableMapOf<String, List<String>>()
            var ok = true

            for (v in variablen) {
                when (v.typ) {
                    "auswahl" -> s[v.name] = rng.pick(v.werte ?: error("${v.name}: werte fehlt"))
                    "ganzzahl" -> {
                        val von = v.von ?: error("${v.name}: von fehlt")
                        val bis = v.bis ?: error("${v.name}: bis fehlt")
                        val schritt = v.schritt ?: 1
                        val stufen = (bis - von) / schritt
                        s[v.name] = (von + rng.int(0, stufen) * schritt).toDouble()
                    }
                    "formel" -> {
                        val a = v.ausdruck ?: error("${v.name}: ausdruck fehlt")
                        try {
                            s[v.name] = Ausdruck.werteAus(a, s)
                        } catch (e: Ausdruck.Ungueltig) {
                            ok = false     // z. B. Division durch null bei dieser Ziehung
                        }
                        if (!ok) break
                    }
                    "text" -> {
                        val reihen = v.texte ?: error("${v.name}: texte fehlt")
                        t[v.name] = rng.pick(reihen)
                    }
                    "tabellenzeile" -> {
                        // Eine ganze Zeile ziehen und jede Spalte als eigene
                        // Zahl ablegen — so bleibt der Auswerter frei von Listen.
                        val sp = v.spalten ?: error("${v.name}: spalten fehlt")
                        val zeile = rng.pick(v.zeilen ?: error("${v.name}: zeilen fehlt"))
                        sp.forEachIndexed { k, name -> s[name] = zeile[k] }
                    }
                    else -> error("Unbekannter Variablentyp \"${v.typ}\"")
                }
            }
            if (!ok) continue

            ok = bedingungen.all {
                try { Ausdruck.bedingungErfuellt(it, s) } catch (e: Ausdruck.Ungueltig) { false }
            }
            if (!ok) continue

            scope = s; texte = t; gelungen = true; glueck = versuch
            break
        }

        if (!gelungen) {
            throw ZiehungFehlgeschlagen(
                "${spec.templateId}: keine gültige Ziehung in $VERSUCHE Versuchen. " +
                    "Widersprechen sich die Bedingungen?",
            )
        }

        val einsetzen = { vorlage: String -> ersetze(vorlage, scope, texte, spec.zahlformat) }
        val stamm = einsetzen(stammVorlage)
        // Ein zweiter Rng nur fuers Mischen. Er darf nicht derselbe sein wie
        // der für die Variablen: Sonst hänge die Mischung davon ab, wie oft
        // die Ziehung vorher verworfen wurde.
        val mischRng = Rng(seed * 7919 + glueck)
        val z = { a: String -> Ausdruck.werteAus(a, scope) }

        val basis = Aufgabe(
            ref = "${spec.templateId}:$seed",
            templateId = spec.templateId,
            lernzielId = spec.lernzielId,
            fach = spec.fach,
            unterthemen = spec.unterthemen,
            niveau = niveau,
            format = spec.format,
            stamm = stamm,
            einheit = spec.einheit,
            loesung = null,
            loesungText = null,
            optionen = emptyList(),
            fehler = emptyList(),
            loesungsmenge = null,
            hinweise = spec.hinweise.map(einsetzen),
            loesungsweg = spec.loesungsweg.map(einsetzen),
            scope = scope,
            zahlformat = spec.zahlformat,
            darstellung = spec.darstellung?.let { d ->
                d.copy(kopf = d.kopf.map(einsetzen), zeilen = d.zeilen.map { it.map(einsetzen) })
            },
            erklaerung = spec.erklaerung?.let { e ->
                e.copy(
                    kern = einsetzen(e.kern),
                    schritte = e.schritte.map(einsetzen),
                    falle = einsetzen(e.falle),
                    merksatz = einsetzen(e.merksatz),
                )
            },
        )

        /* --- Die Formate, die keine einzelne Zahl als Loesung haben ------ */
        when (spec.format) {

            Format.MEHRFELD -> {
                val felder = spec.felder.map { f ->
                    val w = z(f.ausdruck)
                    val zf = f.zahlformat ?: spec.zahlformat
                    GezogenesFeld(
                        name = f.name,
                        label = einsetzen(f.label),
                        einheit = f.einheit,
                        loesung = w,
                        loesungText = formatiere(w, zf),
                        zahlformat = zf,
                        fehler = distraktoren(f.fehler, scope, w, einsetzen),
                    )
                }
                return basis.copy(
                    felder = felder,
                    loesungText = felder.joinToString(" · ") { "${it.label}: ${it.loesungText}" },
                )
            }

            Format.GITTER -> {
                val g = spec.gitter ?: error("${spec.templateId}: gitter fehlt")
                val loesungen = g.loesungen.map { variante ->
                    variante.map { Punkt(z(it[0]), z(it[1])) }
                }
                return basis.copy(
                    gitter = GezogenesGitter(
                        xvon = z(g.xvon), xbis = z(g.xbis), yvon = z(g.yvon), ybis = z(g.ybis),
                        toleranz = z(g.toleranz),
                        punkte = g.punkte.map { it.copy(label = einsetzen(it.label)) },
                        vorgabe = g.vorgabe.map { GezogeneVorgabe(einsetzen(it.text), z(it.x), z(it.y)) },
                        strecken = g.strecken.map {
                            GezogeneStrecke(
                                einsetzen(it.text), it.stil,
                                Punkt(z(it.von.x), z(it.von.y)), Punkt(z(it.bis.x), z(it.bis.y)),
                            )
                        },
                        loesungen = loesungen,
                    ),
                    loesungText = loesungen.first().joinToString(", ") {
                        "(${schlicht(it.x)} | ${schlicht(it.y)})"
                    },
                    fehler = distraktoren(spec.fehler, scope, null, einsetzen),
                )
            }

            Format.ZUORDNEN -> {
                val zu = spec.zuordnen ?: error("${spec.templateId}: zuordnen fehlt")
                val paare = zu.paare.mapIndexed { i, p ->
                    GezogenesPaar(i, einsetzen(p.element), einsetzen(p.ziel))
                }
                return basis.copy(
                    paare = paare,
                    mischung = mischRng.shuffle(paare.indices.toList()),
                    loesungText = paare.joinToString(" · ") { "${it.ziel} → ${it.element}" },
                    fehler = distraktoren(spec.fehler, scope, null, einsetzen),
                )
            }

            Format.SORTIEREN -> {
                val so = spec.sortieren ?: error("${spec.templateId}: sortieren fehlt")
                val werte = so.werte.map(z)
                val elemente = so.elemente.mapIndexed { i, e ->
                    GezogenesElement(i, einsetzen(e.text), werte[i])
                }
                val reihenfolge = elemente.indices.sortedBy { werte[it] }
                // Eine Startmischung, die schon richtig ist, wäre keine
                // Aufgabe. Bis zu zwanzig Versuche, dann geben wir uns zufrieden.
                var mischung = elemente.indices.toList()
                for (versuch in 0 until 20) {
                    mischung = mischRng.shuffle(elemente.indices.toList())
                    if (mischung != reihenfolge) break
                }
                return basis.copy(
                    elemente = elemente,
                    reihenfolge = reihenfolge,
                    mischung = mischung,
                    loesungText = reihenfolge.joinToString(" < ") { elemente[it].text },
                    fehler = distraktoren(spec.fehler, scope, null, einsetzen),
                )
            }

            Format.WERTETABELLE -> {
                val w = spec.wertetabelle ?: error("${spec.templateId}: wertetabelle fehlt")
                val sp = w.spalten.map {
                    GezogeneTabellenspalte(it.name, einsetzen(it.kopf), z(it.von), z(it.bis))
                }
                val paare = mutableListOf<Pair<Int, Int>>()
                for (a in ceil(sp[0].von).toInt()..floor(sp[0].bis).toInt()) {
                    for (b in ceil(sp[1].von).toInt()..floor(sp[1].bis).toInt()) {
                        val s2 = scope + mapOf(sp[0].name to a.toDouble(), sp[1].name to b.toDouble())
                        val treffer = try {
                            Ausdruck.bedingungErfuellt(w.bedingung, s2)
                        } catch (e: Ausdruck.Ungueltig) { false }
                        if (treffer) paare += a to b
                    }
                }
                return basis.copy(
                    wertetabelle = GezogeneWertetabelle(sp, paare),
                    loesungText = paare.joinToString(", ") { "(${it.first} | ${it.second})" },
                    fehler = distraktoren(spec.fehler, scope, null, einsetzen),
                )
            }

            Format.FAERBEN -> {
                val r = spec.raster ?: error("${spec.templateId}: raster fehlt")
                val felder = r.zellen.mapNotNull { zelle ->
                    val an = try {
                        Ausdruck.bedingungErfuellt(zelle.bedingung, scope)
                    } catch (e: Ausdruck.Ungueltig) { false }
                    if (an) Math.round(z(zelle.index)).toInt() else null
                }.sorted()
                return basis.copy(
                    raster = GezogenesRaster(
                        Math.round(z(r.spalten)).toInt(), Math.round(z(r.zeilen)).toInt(), felder,
                    ),
                    loesungText = felder.joinToString(", "),
                    fehler = distraktoren(spec.fehler, scope, null, einsetzen),
                )
            }

            else -> Unit
        }

        /* --- Loesungsmenge: die Loesung ist eine Regel, keine Formel ----- */
        if (spec.format == Format.LOESUNGSMENGE) {
            val lm = spec.loesungsmenge ?: error("${spec.templateId}: loesungsmenge fehlt")
            val menge = menge(lm, scope)
            return basis.copy(
                loesungText = menge.joinToString(", "),
                loesungsmenge = menge,
                // Hier ist ein Fehlermuster keine Zahl, sondern eine falsche
                // Regel: «alle Teiler» statt «alle gemeinsamen Teiler».
                fehler = spec.fehler.mapNotNull { fm ->
                    val b = fm.bedingung ?: return@mapNotNull null
                    val falsch = menge(lm.copy(bedingung = b), scope)
                    if (falsch == menge) null
                    else GezogenerFehler(Double.NaN, fm.diagnoseId, einsetzen(fm.feedback))
                },
            )
        }

        /* --- Zahleneingabe und Mehrfachauswahl --------------------------- */
        val loesung = Ausdruck.werteAus(
            spec.loesung ?: error("${spec.templateId}: loesung fehlt"),
            scope,
        )
        val fehler = distraktoren(spec.fehler, scope, loesung, einsetzen)

        val optionen = if (spec.format == Format.MULTIPLE_CHOICE) {
            val roh = buildList {
                add(Option("richtig", formatiere(loesung, spec.zahlformat), null))
                fehler.take(3).forEachIndexed { i, f ->
                    add(Option("f$i", formatiere(f.wert, spec.zahlformat), f.diagnoseId))
                }
            }
            mischRng.shuffle(roh)
        } else {
            emptyList()
        }

        return basis.copy(
            loesung = loesung,
            loesungText = formatiere(loesung, spec.zahlformat),
            optionen = optionen,
            fehler = fehler,
        )
    }

    /**
     * Wertet Fehlermuster aus.
     *
     * Ein Muster, das für diese Ziehung zufällig die richtige Lösung ergibt,
     * ist kein Distraktor — es fiele als zweite richtige Antwort auf. Ebenso
     * fallen Dubletten weg: Zwei Distraktoren mit demselben Wert wären für
     * das Kind ununterscheidbar.
     */
    private fun distraktoren(
        muster: List<Fehlermuster>,
        scope: Map<String, Double>,
        richtig: Double?,
        einsetzen: (String) -> String,
    ): List<GezogenerFehler> {
        val gesehen = mutableSetOf<Long>()
        return muster.mapNotNull { fm ->
            val a = fm.ausdruck ?: return@mapNotNull null
            val w = try { Ausdruck.werteAus(a, scope) } catch (e: Ausdruck.Ungueltig) { return@mapNotNull null }
            if (richtig != null && abs(w - richtig) < 1e-9) return@mapNotNull null
            if (!gesehen.add((w * 1e6).roundToLong())) return@mapNotNull null
            GezogenerFehler(w, fm.diagnoseId, einsetzen(fm.feedback))
        }
    }

    private fun menge(lm: LoesungsmengeSpec, scope: Map<String, Double>): List<Int> {
        val von = Ausdruck.werteAus(lm.von, scope).toInt()
        val bis = Ausdruck.werteAus(lm.bis, scope).toInt()
        val out = mutableListOf<Int>()
        for (k in von..bis) {
            val s = scope + (lm.kandidatenVariable to k.toDouble())
            val treffer = try { Ausdruck.bedingungErfuellt(lm.bedingung, s) } catch (e: Ausdruck.Ungueltig) { false }
            if (treffer) out += k
        }
        return out
    }

    /**
     * Ersetzt Platzhalter im Aufgabentext.
     *
     * - `{name}` — Zahl schlicht: ganzzahlig ohne Nachkommastellen, sonst mit.
     *   Das ist der Normalfall, denn im Aufgabentext stehen Zaehlgroessen.
     * - `{name:franken}` — mit dem angegebenen Format. Noetig, weil in einer
     *   Aufgabe «Fr. 80.–» und «20 %» nebeneinander stehen und ein einziges
     *   Format fuer den ganzen Stamm zu «Fr. 20.–» fuehren wuerde.
     * - `{name.1}` — bei Textvariablen die zweite Form der Reihe. So lassen
     *   sich Faelle abbilden, ohne im Template deutsche Grammatik nachzubauen.
     */
    private fun ersetze(
        vorlage: String,
        scope: Map<String, Double>,
        texte: Map<String, List<String>>,
        zf: Zahlformat,
    ): String = PLATZHALTER.replace(vorlage) { m ->
        val name = m.groupValues[1]
        val index = m.groupValues[2].toIntOrNull() ?: 0
        val format = m.groupValues[3]
        texte[name]?.let { return@replace it.getOrElse(index) { _ -> it.first() } }
        val w = scope[name] ?: return@replace m.value
        when (format) {
            "" -> schlicht(w)
            "vorlage" -> formatiere(w, zf)
            else -> formatiere(w, Zahlformat.valueOf(format.uppercase()))
        }
    }

    private val PLATZHALTER =
        Regex("""\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(\d+))?(?::(ganz|dezimal[1-4]|franken|bruch|hoch|tief|vorlage))?\}""")

    /** Zahl so, wie sie in einem deutschen Satz steht: 12, 2.5, -3. */
    fun schlicht(w: Double): String =
        if (abs(w - Math.round(w)) < 1e-9) Math.round(w).toString()
        else ((w * 1e4).roundToLong() / 1e4).toString()
}
