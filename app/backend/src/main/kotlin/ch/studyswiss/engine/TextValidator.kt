package ch.studyswiss.engine

/**
 * Die Qualitätstore für Deutsch.
 *
 * Sie prüfen anderes als die Mathematik-Tore — es gibt keine Gegenprobe und
 * keine Zahlenqualität —, aber sie sind genauso verbindlich: **nur erweitern,
 * nie lockern.** Ein Block, der ein Tor nicht besteht, ist nicht fertig.
 */
object TextValidator {

    private const val MINDEST_AUFGABEN = 12

    fun pruefe(spec: TextTemplateSpec, bekannteUnterthemen: Set<String>): Validator.Bericht {
        val b = mutableListOf<Validator.Befund>()
        // §4.5.1: Eingefuehrte Bloecke tragen andere Zusicherungen als von
        // Hand geschriebene — nicht geringere, sondern andere.
        val importiert = spec.status == "importiert"
        fun fehler(tor: String, text: String) = b.add(Validator.Befund(tor, Validator.Schwere.FEHLER, text))
        fun warnung(tor: String, text: String) = b.add(Validator.Befund(tor, Validator.Schwere.WARNUNG, text))

        /* --- T1: Struktur ------------------------------------------------ */
        if (spec.aufgaben.isEmpty()) fehler("T1 Struktur", "keine Aufgaben")
        if (spec.hinweise.size < 2) fehler("T1 Struktur", "weniger als 2 Hinweise")
        if (spec.loesungsweg.isEmpty()) fehler("T1 Struktur", "loesungsweg fehlt")
        spec.unterthemen.filterNot { it in bekannteUnterthemen }.forEach {
            fehler("T1 Struktur", "Unterthema \"$it\" steht nicht im Themenbaum")
        }
        // «importiert» fehlte hier, obwohl §4.5.1 es als vollwertigen Status
        // fuehrt und der Bestand ueberwiegend darauf steht.
        if (spec.status !in setOf("entwurf", "review", "live", "importiert")) {
            fehler("T1 Struktur", "status «${spec.status}» ist unbekannt")
        }
        if (spec.herkunft.beziehung == "abgeleitet" && spec.herkunft.quelle.isNullOrBlank()) {
            fehler("T1 Struktur", "herkunft «abgeleitet» ohne quelle")
        }
        val braucht = spec.format in setOf(TextFormat.EINFACHAUSWAHL, TextFormat.MEHRFACHAUSWAHL)
        if (braucht && spec.optionen.isEmpty() && spec.aufgaben.any { it.optionen.isEmpty() }) {
            fehler("T1 Struktur", "Auswahlaufgabe ohne Optionen")
        }

        spec.aufgaben.forEachIndexed { i, a ->
            val wo = "Aufgabe ${i + 1}"
            if (a.stamm.isBlank()) fehler("T1 Struktur", "$wo: stamm fehlt")
            // Wo die Loesung steht, haengt vom Format ab. TABELLE_AUSWAHL
            // traegt sie je Zeile, MEHRFELD je Feld — bei beiden ist das
            // Feld `loesung` der Aufgabe zu Recht leer. Die Regel verlangte
            // sie trotzdem von allen und meldete darum bei jedem
            // Tabellenblock zwoelfmal «loesung fehlt»: ein Fehlalarm, der
            // die echten Befunde daneben zudeckte. Geprueft wird jetzt
            // dort, wo die Loesung wirklich steht.
            when (spec.format) {
                TextFormat.TABELLE_AUSWAHL -> {
                    if (a.zeilen.isEmpty()) fehler("T1 Struktur", "$wo: zeilen fehlen")
                    a.zeilen.forEachIndexed { z, zeile ->
                        if (zeile.loesung.isEmpty()) {
                            fehler("T1 Struktur", "$wo, Zeile ${z + 1}: loesung fehlt")
                        }
                    }
                }
                TextFormat.MEHRFELD -> {
                    if (a.felder.isEmpty()) fehler("T1 Struktur", "$wo: felder fehlen")
                    a.felder.forEachIndexed { k, feld ->
                        if (feld.loesung.isEmpty()) {
                            fehler("T1 Struktur", "$wo, Feld ${k + 1}: loesung fehlt")
                        }
                    }
                }
                else -> if (a.loesung.isEmpty()) fehler("T1 Struktur", "$wo: loesung fehlt")
            }
            if (a.erklaerung.length < 25) {
                fehler("T1 Struktur", "$wo: erklaerung zu knapp — sie muss sagen, warum es stimmt")
            }

            val menge = a.optionen.ifEmpty { spec.optionen }

            /* --- T13: Die Loesung steht in den Optionen -------------------- */
            if (spec.format == TextFormat.EINFACHAUSWAHL) {
                if (a.loesung.size != 1) fehler("T13 Auswahl", "$wo: Einfachauswahl braucht genau eine Lösung")
                a.loesung.filterNot { it in menge }.forEach {
                    fehler("T13 Auswahl", "$wo: die Lösung «$it» steht nicht in den Optionen")
                }
            }
            if (spec.format == TextFormat.MEHRFACHAUSWAHL) {
                a.loesung.filterNot { it in menge }.forEach {
                    fehler("T13 Auswahl", "$wo: die Lösung «$it» steht nicht in den Optionen")
                }
            }

            /* --- T14: Distraktoren brauchbar ------------------------------ */
            a.fehler.forEach { fm ->
                if (fm.antwort in a.loesung) {
                    fehler("T14 Distraktoren", "$wo: «${fm.antwort}» ist zugleich Lösung und Fehlermuster")
                }
                if (braucht && fm.antwort !in menge) {
                    fehler("T14 Distraktoren", "$wo: das Fehlermuster «${fm.antwort}» steht nicht in den Optionen")
                }
            }
            if (a.fehler.map { it.antwort }.toSet().size != a.fehler.size) {
                fehler("T14 Distraktoren", "$wo: zwei Fehlermuster nennen dieselbe Antwort")
            }

            /* --- T2: Feedback benennt den Denkfehler ---------------------- */
            // Nur von Hand geschriebene Bloecke brauchen zu jedem Distraktor
            // einen Satz. Eingefuehrte tragen laut §4.5.1 stattdessen die
            // Erklaerung der Quelle — dafuer steht T18. Ohne diese
            // Unterscheidung meldete das Tor bei jedem eingefuehrten Block
            // jede Aufgabe als fehlerhaft und war damit unbrauchbar.
            val brauchtFehler = !importiert && spec.format in
                setOf(TextFormat.EINFACHAUSWAHL, TextFormat.MEHRFACHAUSWAHL, TextFormat.LUECKE)
            if (brauchtFehler && a.fehler.isEmpty()) {
                fehler("T2 Fehlermuster", "$wo: kein Fehlermuster — welcher Denkfehler ist hier typisch?")
            }
            a.fehler.forEach {
                if (it.feedback.length < 40) {
                    fehler("T2 Fehlermuster", "$wo/${it.diagnoseId}: Feedback zu knapp")
                }
            }

            /* --- T8: Bei einer Lücke darf die Loesung nicht dastehen ----- */
            // Der erste Absatz ist die Arbeitsanweisung. Dass sie das
            // Ausgangswort nennt («Bilde vom Verb gehen …»), ist der Sinn der
            // Aufgabe und kein Verrat — geprueft wird nur, was danach steht.
            // Umformungsaufgaben bleiben ganz aussen vor (§ `umformung`).
            if (spec.format == TextFormat.LUECKE && !spec.umformung) {
                val rest = a.stamm.split("\n\n").drop(1).joinToString("\n\n")
                val ohneKlammer = rest.replace(Regex("""\([^)]*\)"""), "")
                a.loesung.firstOrNull()?.let { l ->
                    if (l.length >= 4 && ohneKlammer.contains(l, ignoreCase = true)) {
                        fehler("T8 Verrat", "$wo: die Lösung «$l» steht schon im Aufgabentext")
                    }
                }
            }

            /* --- T15: Markierte Wörter müssen im Satz vorkommen --------- */
            if (spec.format == TextFormat.MARKIEREN) {
                // Der Satz steht in `woerter` — genau darauf arbeiten
                // MARKIEREN und KOMMAS (§4.5). Das Tor las stattdessen den
                // Stamm und meldete darum bei jedem Block jedes Wort als
                // fehlend: 869 Fehlalarme, die die echten Befunde zudeckten.
                val satzWoerter = a.woerter.ifEmpty {
                    a.stamm.split("\n\n").last().trim().split(Regex("\\s+"))
                }
                val satz = satzWoerter.map(TextGenerator::nackt)
                val offen = satz.toMutableList()
                a.loesung.forEach { w ->
                    val k = offen.indexOf(TextGenerator.nackt(w))
                    if (k < 0) fehler("T15 Markieren", "$wo: «$w» kommt im Satz nicht (mehr) vor")
                    else offen[k] = " "
                }
            }

            /* --- T16: Bei Kommas muss der Satz ohne Kommas dem Stamm gleichen */
            if (spec.format == TextFormat.KOMMAS) {
                val mit = a.loesung.first()
                val ohne = mit.replace(",", "")
                val imStamm = if (a.woerter.isNotEmpty()) a.woerter.joinToString(" ")
                              else a.stamm.split("\n\n").last().trim()
                if (normiereLeerzeichen(ohne) != normiereLeerzeichen(imStamm)) {
                    fehler(
                        "T16 Kommas",
                        "$wo: Aufgabentext und Lösungssatz stimmen nicht überein. " +
                            "Stamm: «$imStamm» — Lösung ohne Kommas: «$ohne»",
                    )
                }
                if (!mit.contains(",")) {
                    warnung("T16 Kommas", "$wo: kein einziges Komma — als Falle in Ordnung, aber nur vereinzelt")
                }
            }
        }

        /* --- T3: Schweizer Hochdeutsch ------------------------------------ */
        val text = buildString {
            spec.hinweise.forEach { append(it).append(' ') }
            spec.loesungsweg.forEach { append(it).append(' ') }
            spec.aufgaben.forEach { a ->
                append(a.stamm).append(' ').append(a.erklaerung).append(' ')
                a.fehler.forEach { append(it.feedback).append(' ') }
            }
        }
        // Dieselben Muster wie in `Validator` — als Wortgrenzen, nicht als
        // Teilzeichenkette: Ein Lesetext ueber Nachtzuege durch «Europas»
        // Staedte ist kein Preis in Euro (§8, Fehlalarm).
        listOf(
            Triple(Regex("ß"), "ß", "«ss» statt «ß»"),
            Triple(Regex("""\bEuros?\b"""), "Euro", "Franken statt Euro"),
            Triple(Regex("€"), "€", "Franken statt Euro"),
            Triple(Regex("Fahrr[aä]d"), "Fahrrad", "Velo statt Fahrrad"),
            Triple(Regex("Bahnsteig"), "Bahnsteig", "Perron statt Bahnsteig"),
        ).forEach { (muster, wort, hinweis) ->
            if (Validator.waehrungsaufgabe(text) && (wort == "Euro" || wort == "€")) return@forEach
            if (muster.containsMatchIn(text)) fehler("T3 Sprache", "«$wort» gefunden — $hinweis")
        }

        /* --- T11: Vielfalt ------------------------------------------------ */
        if (spec.aufgaben.size < MINDEST_AUFGABEN) {
            fehler(
                "T11 Vielfalt",
                "nur ${spec.aufgaben.size} Aufgaben — ein Set von 10 würde sich wiederholen. " +
                    "Mindestens $MINDEST_AUFGABEN.",
            )
        }
        // Zwei Aufgaben sind gleich, wenn ALLES Sichtbare gleich ist. Beim
        // Markieren und bei Kommas steht der Satz nicht im Stamm, bei einer
        // Tabelle stehen die Saetze in den Zeilen.
        val staemme = spec.aufgaben.map { a ->
            listOf(
                a.stamm,
                a.woerter.joinToString("\u0001"),
                a.zeilen.joinToString("\u0002") { it.text },
                a.felder.joinToString("\u0003") { it.label },
                a.loesung.joinToString("\u0004"),
            ).joinToString("\u0000")
        }
        if (staemme.toSet().size != staemme.size) fehler("T11 Vielfalt", "zwei Aufgaben sind wortgleich")

        // Und bei den Formaten, deren Aufgabe IM Stamm steht, muss der Stamm
        // schon allein unterscheiden — sonst sind sie im Fehlerarchiv nicht
        // auseinanderzuhalten (§4.5).
        if (spec.format in setOf(
                TextFormat.EINFACHAUSWAHL, TextFormat.MEHRFACHAUSWAHL, TextFormat.TABELLE_AUSWAHL,
            )
        ) {
            val nurStamm = spec.aufgaben.map { it.stamm }
            val doppelt = nurStamm.filter { st -> nurStamm.count { it == st } > 1 }.toSet()
            if (doppelt.isNotEmpty()) {
                val bsp = doppelt.min().replace("\n", " ").take(60)
                fehler(
                    "T11 Vielfalt",
                    "${doppelt.size} Aufgabentexte kommen mehrfach vor, z.B. «$bsp…» — " +
                        "so sind die Aufgaben nicht auseinanderzuhalten",
                )
            }
        }

        // Bei geschlossenen Mengen soll nicht eine Antwort dauernd dieselbe sein —
        // sonst kaeme durch, wer immer dasselbe antippt.
        if (spec.format == TextFormat.EINFACHAUSWAHL && spec.optionen.size >= 3) {
            val haeufigste = spec.aufgaben.groupingBy { it.loesung.first() }.eachCount()
                .maxByOrNull { it.value }
            if (haeufigste != null && haeufigste.value > spec.aufgaben.size * 0.5) {
                fehler(
                    "T11 Vielfalt",
                    "«${haeufigste.key}» ist in ${haeufigste.value} von ${spec.aufgaben.size} Aufgaben die Lösung",
                )
            }
        }

        return Validator.Bericht(spec.templateId, b)
    }

    private fun normiereLeerzeichen(s: String) = s.trim().replace(Regex("\\s+"), " ")
}
