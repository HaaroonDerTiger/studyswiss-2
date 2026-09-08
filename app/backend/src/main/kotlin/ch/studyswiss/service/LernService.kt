package ch.studyswiss.service

import ch.studyswiss.daten.Katalog
import ch.studyswiss.engine.Aufgabe
import ch.studyswiss.model.*
import ch.studyswiss.repo.*
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * Uebung, Standortbestimmung, Selbsttest, Fortschritt, Fehlerarchiv.
 * Kennt kein Ktor.
 */
class LernService(
    private val nutzer: NutzerRepo,
    private val versuche: VersuchRepo,
    private val sets: SetRepo,
    private val aufgaben: AufgabenService,
    private val scheduler: Scheduler,
    private val lernpfad: Lernpfad,
) {

    /** Der Lernpfad wird bei jedem Aufruf neu gerechnet — es gibt keinen
     *  gespeicherten Plan, der veralten koennte. */
    fun lernpfad(n: Nutzer): LernpfadDto = lernpfad.pfad(n, bereicheVon(n))

    /* -------------------- Faecher, Bereiche, Bedingungen ---------------
       Zwei Ebenen (§3.2): Ein PRUEFUNGSFACH ist Mathematik oder Deutsch, ein
       BEREICH ist Sprachbetrachtung, Textverstaendnis oder Aufsatz. Geuebt
       wird im Bereich; gekauft, gemessen und geprueft wird im Fach. */

    /** Die Pruefungsfaecher dieses Schultyps — Mathematik, Deutsch, allenfalls
     *  Franzoesisch. Was hier fehlt, taucht in der App nirgends auf. */
    fun pruefungsfaecherVon(n: Nutzer): List<String> {
        val t = schultypVon(n)
        return (t?.pruefungsfaecher ?: listOf("mathematik"))
            .filter { Katalog.bereicheVon(t, it).isNotEmpty() }
    }

    private fun schultypVon(n: Nutzer): Schultyp? =
        Katalog.schultyp(n.kanton ?: Katalog.standardKanton, n.schultyp)

    /** Die Pruefung dieses Nutzers. Sie entscheidet, welche Unterthemen
     *  ueberhaupt vorkommen — nicht jedes Thema eines Baums wird in jeder
     *  Pruefung geprueft. */
    private fun pruefungVon(n: Nutzer): String? = schultypVon(n)?.pruefungId

    /** Die Bedingungen dieses Schultyps — Taschenrechner, Zurueckblaettern,
     *  Uhr. Sie stehen im Katalog, nicht im Screen. */
    fun bedingungenVon(n: Nutzer, fach: String? = null): Bedingungen {
        val t = schultypVon(n) ?: return Bedingungen()
        return t.bedingungenJeFach[fach] ?: t.bedingungen
    }

    /** Alle uebbaren Bereiche dieses Schultyps. Oeffentlich, weil die Route
     *  wissen muss, welches Fach das gratis Fach ist.
     *
     *  Der Aufsatz hat keinen Themenbaum mit Aufgaben — er laeuft ueber ein
     *  eigenes Modul und taucht in der Rangliste nicht auf. */
    fun bereicheVon(n: Nutzer): List<String> =
        pruefungsfaecherVon(n).flatMap { Katalog.bereicheVon(schultypVon(n), it) }
            .filter { it in Katalog.baeume }

    /**
     * ALLE Bereiche eines Fachs — den Aufsatz eingeschlossen.
     *
     * `bereicheVon` daneben laesst ihn weg, weil er keinen Themenbaum hat
     * und in keiner Zaehlung vorkommt. Fuer die Navigation braucht es ihn
     * trotzdem: An der FMS Bern ist er der einzige Deutsch-Bereich, und ohne
     * ihn verschwaende das Fach «Deutsch» aus der App — bei einer Pruefung,
     * die aus nichts anderem besteht.
     */
    fun alleBereicheVon(n: Nutzer, fachId: String): List<String> =
        if (fachId in pruefungsfaecherVon(n))
            Katalog.bereicheVon(schultypVon(n), fachId)
        else emptyList()

    /** Die Bereiche EINES Pruefungsfachs, sofern es zu diesem Schultyp gehoert. */
    fun bereicheVon(n: Nutzer, fachId: String): List<String> =
        if (fachId in pruefungsfaecherVon(n))
            Katalog.bereicheVon(schultypVon(n), fachId).filter { it in Katalog.baeume }
        else emptyList()

    /* ============================ Vorschlag ============================= */

    fun vorschlag(n: Nutzer): VorschlagsListe {
        val rang = scheduler.rangliste(n.id, bereicheVon(n), n.pruefungsdatum)
        return VorschlagsListe(
            zuerst = rang.getOrNull(0)?.let(scheduler::alsVorschlag),
            danach = rang.getOrNull(1)?.let(scheduler::alsVorschlag),
        )
    }

    /* ============================== Uebung ============================== */

    fun uebungStarten(n: Nutzer, bitte: UebungStart): UebungDto? {
        val fach = bitte.fach ?: bereicheVon(n).first()
        val unterthema = bitte.unterthema
            ?: scheduler.rangliste(n.id, bereicheVon(n), n.pruefungsdatum).firstOrNull()?.f?.unterthema
            ?: return null

        val schon = versuche.geloest(n.id, fach, unterthema)
        val gezogen = aufgaben.set(fach, unterthema, bitte.anzahl, schon)
        if (gezogen.isEmpty()) return null

        // Die Einfuehrung ist eine eigene, durchgerechnete Aufgabe desselben
        // Typs — nie eine aus dem Set, sonst kennt man die Loesung schon.
        val beispiel = aufgaben.set(fach, unterthema, 1, schon + gezogen.map { it.ref }).firstOrNull()
            ?: gezogen.first()

        val id = UUID.randomUUID().toString()
        sets.lege(id, n.id, "UEBUNG", fach, unterthema, null, gezogen.map { it.ref })

        return UebungDto(
            id = id,
            unterthema = unterthema,
            unterthemaName = Katalog.unterthema(fach, unterthema)?.name ?: unterthema,
            einfuehrung = Einfuehrung(
                stamm = beispiel.stamm,
                loesungsweg = beispiel.loesungsweg,
                tipp = beispiel.hinweise.firstOrNull() ?: "",
            ),
            aufgaben = gezogen.map(aufgaben::alsDto),
        )
    }

    /**
     * @param setId Das Set, aus dem die Aufgabe stammt. Es bestimmt, unter
     *   welchem Unterthema der Versuch verbucht wird — eine Aufgabe kann
     *   mehrere abdecken, und gezählt wird das, für das sie gezogen wurde.
     */
    fun antworten(
        n: Nutzer,
        antwort: Antwort,
        quelle: Quelle,
        hinweiseGenutzt: Int = 0,
        setId: String? = null,
    ): Rueckmeldung? {
        val a = aufgaben.herstellen(antwort.aufgabeRef) ?: return null
        val urteil = aufgaben.bewerte(a, antwort)
        val unterthema = setId?.let { sets.unterthema(it, n.id) }
            ?.takeIf { it in a.unterthemen }
            ?: a.unterthemen.first()

        versuche.merke(
            Versuch(
                id = 0, nutzerId = n.id, aufgabeRef = a.ref, lernzielId = a.lernzielId,
                unterthema = unterthema, fach = a.fach, richtig = urteil.richtig,
                diagnoseId = urteil.diagnoseId, hinweiseGenutzt = hinweiseGenutzt,
                quelle = quelle, zeitpunkt = Instant.now(),
            ),
        )

        val pflichtset = Katalog.unterthema(a.fach, unterthema)?.pflichtset ?: 20
        return Rueckmeldung(
            richtig = urteil.richtig,
            feedback = urteil.feedback,
            diagnoseId = urteil.diagnoseId,
            // Die Loesung geht erst jetzt nach draussen, nie mit der Aufgabe.
            loesung = a.loesungText ?: "",
            loesungsweg = a.loesungsweg,
            geloestImThema = versuche.geloest(n.id, a.fach, unterthema).size,
            pflichtset = pflichtset,
            feldFehler = urteil.feldFehler,
        )
    }

    fun hinweis(ref: String, stufe: Int): HinweisDto? {
        val a = aufgaben.herstellen(ref) ?: return null
        // Die Leerpruefung steht VOR dem `coerceIn`. Andersherum war es ein
        // Fehler, der nur mangels Inhalt schwieg: `coerceIn(1, 0)` wirft in
        // Kotlin `IllegalArgumentException`, statt sauber `null` zu liefern —
        // die erste Aufgabe ohne Hinweis haette einen 500er gegeben.
        if (a.hinweise.isEmpty()) return null
        val i = stufe.coerceIn(1, a.hinweise.size) - 1
        return HinweisDto(i + 1, a.hinweise[i], i + 1 < a.hinweise.size)
    }

    fun uebungAbschliessen(n: Nutzer, setId: String): UebungErgebnis? {
        val refs = sets.refs(setId, n.id) ?: return null
        val meine = versuche.alle(n.id).filter { it.aufgabeRef in refs }
        val richtig = meine.filter { it.richtig }.map { it.aufgabeRef }.toSet().size
        val verpasst = meine.filter { !it.richtig }
            .mapNotNull { Katalog.unterthema(it.fach, it.unterthema)?.name }.distinct()
        sets.beende(setId, richtig, refs.size)

        val ersteRef = refs.firstOrNull()
        val a = ersteRef?.let { aufgaben.herstellen(it) }
        val fach = a?.fach ?: "mathematik"
        val unterthema = a?.unterthemen?.first() ?: ""
        val pflichtset = Katalog.unterthema(fach, unterthema)?.pflichtset ?: 20
        val geloest = if (unterthema.isBlank()) 0 else versuche.geloest(n.id, fach, unterthema).size

        return UebungErgebnis(
            richtig = richtig,
            total = refs.size,
            verpasst = verpasst,
            neuGeloest = richtig,
            themaAbgeschlossen = geloest >= pflichtset,
        )
    }

    /* ======================= Standortbestimmung ========================= */

    /**
     * Die Standortbestimmung — je Pruefungsfach eine.
     *
     * Sie laeuft nicht mehr quer ueber alles: Mathematik und Deutsch werden
     * getrennt angeboten, weil sie getrennt geprueft werden und eine
     * gemeinsame Zahl niemandem sagt, wo er steht.
     *
     * Keine Note, keine Einstufung, und — solange der Lernpfad nicht steht —
     * auch keine verbindliche Reihenfolge. Was herauskommt, sind
     * Themenempfehlungen nach Fehlerquote.
     */
    fun standortStarten(n: Nutzer, fachId: String?): StandortDto? {
        val faecher = pruefungsfaecherVon(n)
        val fach = fachId?.takeIf { it in faecher } ?: faecher.firstOrNull() ?: return null
        val bereiche = bereicheVon(n, fach)
        if (bereiche.isEmpty()) return null

        val proBereich = (24 / bereiche.size).coerceAtLeast(6)
        val gezogen = bereiche.flatMap { b ->
            aufgaben.mischsatz(b, Katalog.bespielt(b, pruefungVon(n)).toList().sorted(), proBereich)
        }
        if (gezogen.isEmpty()) return null
        val id = UUID.randomUUID().toString()
        sets.lege(id, n.id, "STANDORT", fach, null, null, gezogen.map { it.ref })
        return StandortDto(
            id = id,
            fach = fach,
            fachName = Katalog.pruefungsfach(fach)?.name ?: fach,
            aufgaben = gezogen.map(aufgaben::alsDto),
        )
    }

    /**
     * Welche Faecher die Standortbestimmung anbietet — die der Pruefung,
     * sofern sie sich pruefen lassen.
     *
     * Deutsch heisst an der FMS Bern NUR Aufsatz: Die ganze Deutschpruefung
     * besteht dort aus einem einzigen Text. Ein Selbsttest ueber null Themen
     * ist keine Pruefung, sondern eine leere Karte — darum steht Deutsch dort
     * weder im Selbsttest noch in der Standortbestimmung. Unter «Lernen»
     * bleibt es sichtbar und fuehrt zum Aufsatz.
     */
    fun standortFaecher(n: Nutzer): List<FachWahl> = pruefungsfaecherVon(n)
        .filter { bereicheVon(n, it).isNotEmpty() }
        .map { id ->
            val bereiche = bereicheVon(n, id)
            FachWahl(
                fach = id,
                name = Katalog.pruefungsfach(id)?.name ?: id,
                untertitel = Katalog.pruefungsfach(id)?.untertitel ?: "",
                icon = Katalog.pruefungsfach(id)?.icon ?: "buch",
                themen = bereiche.sumOf { Katalog.bespielt(it, pruefungVon(n)).size },
                bereiche = bereiche.mapNotNull { Katalog.bereich(it)?.kurzname },
                bereichIds = alleBereicheVon(n, id),
            )
        }

    /**
     * Das Ergebnis der Standortbestimmung.
     *
     * Empfohlen werden die Themen mit der HOECHSTEN FEHLERQUOTE im Test —
     * nicht die Rangliste des Schedulers. Der Unterschied ist keine
     * Feinheit: Eine Rangliste behauptet eine verbindliche Reihenfolge, und
     * die soll erst der Lernpfad festlegen. Was die Standortbestimmung
     * belegen kann, ist genau eines — wo es im Test gehakt hat.
     */
    fun startpunkt(n: Nutzer, setId: String): Startpunkt {
        val refs = sets.refs(setId, n.id) ?: emptyList()
        val meine = versuche.alle(n.id).filter { it.aufgabeRef in refs }
        sets.beende(setId, meine.count { it.richtig }, refs.size)

        val fachId = sets.fach(setId, n.id)
        val bereiche = if (fachId != null) bereicheVon(n, fachId).ifEmpty { bereicheVon(n) }
                       else bereicheVon(n)
        val alle = scheduler.fortschritte(n.id, bereiche, pruefungVon(n))

        // «Sitzt» heisst: im Test getroffen. «Zuerst üben» heisst: daneben.
        // «Offen» heisst: im Test gar nicht vorgekommen.
        val beruehrt = meine.map { it.fach to it.unterthema }.toSet()
        val sitzen = alle.filter { (it.fach to it.unterthema) in beruehrt && it.trefferquote >= 0.6 }
        val ueben = alle.filter { (it.fach to it.unterthema) in beruehrt && it.trefferquote < 0.6 }
        val offen = alle.size - sitzen.size - ueben.size

        fun zeile(f: ThemenFortschritt, grund: String) = Vorschlag(
            unterthema = f.unterthema, name = f.name, oberthema = f.oberthema, fach = f.fach,
            begruendung = grund, geloest = f.geloest, pflichtset = f.pflichtset,
        )

        // Die Fehlerquote entscheidet, bei Gleichstand das Pruefungsgewicht.
        val empfehlungen = ueben
            .sortedWith(
                compareByDescending<ThemenFortschritt> { 1.0 - it.trefferquote }
                    .thenByDescending { Katalog.pruefungsgewicht(it.fach, it.unterthema) },
            )
            .take(3)
            .map { f ->
                zeile(
                    f,
                    "${Katalog.bereich(f.fach)?.kurzname ?: f.fach} · " +
                        "${f.richtigeLetzte10} von ${f.versucheLetzte10} getroffen",
                )
            }

        return Startpunkt(
            fach = fachId,
            fachName = fachId?.let { Katalog.pruefungsfach(it)?.name },
            sitzen = sitzen.size,
            zuerstUeben = ueben.size,
            offen = offen,
            empfehlungen = empfehlungen,
            sitzenListe = sitzen.take(3).map {
                zeile(it, "${Katalog.bereich(it.fach)?.kurzname ?: it.fach} · im Test getroffen")
            },
        )
    }

    /* ============================ Selbsttest ============================ */

    /**
     * Der Selbsttest laeuft ueber ein PRUEFUNGSFACH, nicht ueber einen Bereich.
     *
     * Vorher stand auf der ersten Ebene «Deutsch Sprachbetrachtung» — das ist
     * kein Fach, sondern ein Teil davon. Ein Deutsch-Selbsttest enthaelt
     * Sprachbetrachtung UND Textverstaendnis, so wie die Pruefung auch.
     * Die Anzahl Aufgaben verteilt sich auf die Bereiche nach ihrem
     * Punkteanteil an der Pruefung.
     *
     * Dauer, Anzahl und Bedingungen kommen aus dem Katalog des Schultyps.
     */
    fun selbsttestStarten(n: Nutzer, bitte: SelbsttestStart): SelbsttestDto? {
        val bereiche = bereicheVon(n, bitte.fach)
        if (bereiche.isEmpty()) return null
        val bed = bedingungenVon(n, bitte.fach)

        val anzahl = if (bitte.umfang == "pruefung") bed.anzahlAufgaben else 12
        val minuten = if (bitte.umfang == "pruefung") bed.dauerMinuten else 30

        // Die Bereiche teilen sich die Plaetze nach ihrem Punkteanteil.
        // Ein Bereich mit 52 Punkten und einer mit 30 sollen nicht gleich
        // viele Aufgaben stellen, nur weil es zwei sind.
        val punkte = bereiche.associateWith { b ->
            Katalog.baum(b).oberthemen.sumOf { it.punkte }.coerceAtLeast(1)
        }
        val total = punkte.values.sum()
        val gezogen = mutableListOf<Aufgabe>()
        bereiche.forEachIndexed { i, b ->
            val alle = Katalog.bespielt(b, pruefungVon(n)).toList().sorted()
            val themen = when (bitte.umfang) {
                "einzelne" -> bitte.themen.filter { it in alle }
                else -> alle
            }
            if (themen.isEmpty()) return@forEachIndexed
            // Der letzte Bereich bekommt den Rest — sonst fehlen durch das
            // Abrunden ein bis zwei Aufgaben.
            val platz = if (i == bereiche.lastIndex) anzahl - gezogen.size
                        else anzahl * punkte.getValue(b) / total
            if (platz > 0) gezogen += aufgaben.mischsatz(b, themen, platz)
        }
        if (gezogen.isEmpty()) return null

        val id = UUID.randomUUID().toString()
        sets.lege(id, n.id, "SELBSTTEST", bitte.fach, null, bitte.umfang, gezogen.map { it.ref })
        return SelbsttestDto(
            id = id,
            fach = bitte.fach,
            fachName = Katalog.pruefungsfach(bitte.fach)?.name ?: bitte.fach,
            umfang = bitte.umfang,
            minuten = minuten,
            bedingungen = bed,
            aufgaben = gezogen.map(aufgaben::alsDto),
        )
    }

    /** Die Faecher, die der Selbsttest anbietet — mit ihren Bereichen. */
    fun selbsttestFaecher(n: Nutzer): List<FachWahl> = standortFaecher(n)

    fun selbsttestAbgeben(n: Nutzer, setId: String): SelbsttestErgebnis? {
        val refs = sets.refs(setId, n.id) ?: return null
        val meine = versuche.alle(n.id).filter { it.aufgabeRef in refs }
        // OFFEN: gleichgewichtet je Aufgabe. Die echte ZAP gewichtet nach Aufgabe.
        val punkte = meine.count { it.richtig }
        sets.beende(setId, punkte, refs.size)

        val proOberthema = meine.groupBy { Katalog.oberthemaVon(it.fach, it.unterthema)?.name ?: "Übrige" }
            .map { (name, gruppe) -> OberthemaErgebnis(name, gruppe.count { it.richtig }, gruppe.size) }
            .sortedByDescending { it.moeglich }

        return SelbsttestErgebnis(
            id = setId,
            punkte = punkte,
            maximum = refs.size,
            proOberthema = proOberthema,
            fehlerRefs = meine.filter { !it.richtig }.map { it.aufgabeRef },
        )
    }

    fun selbsttestVersuche(n: Nutzer) = Versuchsliste(sets.versuche(n.id, "SELBSTTEST"))

    /* ============================ Fortschritt =========================== */

    fun fortschritt(n: Nutzer): FortschrittDto {
        val bereiche = bereicheVon(n)
        val alle = scheduler.fortschritte(n.id, bereiche, pruefungVon(n))

        // Gegliedert wird nach PRUEFUNGSFACH: «Deutsch», nicht «Deutsch
        // Sprachbetrachtung». Die Bereiche haengen darunter und lassen sich
        // im Screen aufklappen — dieselbe Ordnung wie unter «Lernen».
        fun zaehle(teil: List<ThemenFortschritt>) = listOf(
            teil.count { it.abgeschlossen }, teil.size,
            teil.sumOf { minOf(it.geloest, it.pflichtset) }, teil.sumOf { it.pflichtset },
        )
        val zeilen = pruefungsfaecherVon(n).mapNotNull { fachId ->
            val meine = bereicheVon(n, fachId)
            val alleMeine = alleBereicheVon(n, fachId)
            // Ein Fach, dessen einziger Bereich der Aufsatz ist, hat nichts
            // zu zaehlen — verschwinden darf es trotzdem nicht. An der FMS
            // Bern besteht die ganze Deutschpruefung aus einem Text.
            if (alleMeine.isEmpty()) return@mapNotNull null
            val fachThemen = alle.filter { it.fach in meine }
            val (ab, tot, pg, pt) = zaehle(fachThemen)
            FachZeile(
                fach = fachId,
                name = Katalog.pruefungsfach(fachId)?.name ?: fachId,
                abgeschlossen = ab, total = tot, pflichtGeloest = pg, pflichtTotal = pt,
                // ALLE Bereiche des Fachs, nicht nur die mit Themenbaum:
                // Der Aufsatz und die Tipps-Seiten sind Teil der Pruefung,
                // und ein Fach, das sie verschweigt, zeigt ein falsches
                // Bild davon. Sie zaehlen null Themen — das ist keine
                // Luecke, sondern ihre Art.
                bereiche = alleMeine.map { b ->
                    val teil = alle.filter { it.fach == b }
                    val (bab, btot, bpg, bpt) = zaehle(teil)
                    val art = Katalog.bereich(b)?.art ?: "themenbaum"
                    BereichZeile(
                        bereich = b,
                        name = Katalog.bereich(b)?.name ?: b,
                        kurzname = Katalog.bereich(b)?.kurzname
                            ?: Katalog.bereich(b)?.name ?: b,
                        abgeschlossen = bab, total = btot,
                        pflichtGeloest = bpg, pflichtTotal = bpt,
                        art = art,
                    )
                },
                bereichIds = alleMeine,
            )
        }

        val v = versuche.alle(n.id)
        val wochen = verlauf(v)
        val aussage = when {
            wochen.size < 2 -> "Noch zu wenig Übung für einen Vergleich. Ab der zweiten Woche steht hier deine Entwicklung."
            else -> {
                val a = wochen.first(); val b = wochen.last()
                val diff = b.quote - a.quote
                val richtung = if (diff >= 0) "+$diff" else "$diff"
                "$richtung Prozentpunkte, ${a.label}: ${a.quote} % → heute ${b.quote} %"
            }
        }

        // Staerkstes und schwaechstes Thema ueber ALLE Faecher, mit Fachangabe.
        val bewertbar = alle.filter { it.versucheLetzte10 >= 3 }
        fun zeile(f: ThemenFortschritt) = ThemenZeile(
            unterthema = f.unterthema, name = f.name, fach = f.fach,
            fachName = Katalog.bereich(f.fach)?.kurzname ?: Katalog.baum(f.fach).name,
            quote = Math.round(f.trefferquote * 100).toInt(),
            versuche = f.versucheLetzte10, zeitraum = "letzte ${f.versucheLetzte10} Aufgaben",
        )

        return FortschrittDto(
            themenAbgeschlossen = zeilen.sumOf { it.abgeschlossen },
            themenTotal = zeilen.sumOf { it.total },
            faecher = zeilen,
            verlauf = wochen,
            aussage = aussage,
            staerkstes = bewertbar.maxByOrNull { it.trefferquote }?.let(::zeile),
            schwaechstes = bewertbar.minByOrNull { it.trefferquote }?.let(::zeile),
        )
    }

    private fun verlauf(v: List<Versuch>): List<WocheDto> {
        if (v.isEmpty()) return emptyList()
        val jetzt = Instant.now()
        return (5 downTo 0).mapNotNull { zurueck ->
            val bis = jetzt.minus(zurueck * 7L, ChronoUnit.DAYS)
            val ab = bis.minus(7, ChronoUnit.DAYS)
            val woche = v.filter { it.zeitpunkt >= ab && it.zeitpunkt < bis }
            if (woche.isEmpty()) return@mapNotNull null
            val kw = ab.atZone(java.time.ZoneId.of("Europe/Zurich")).get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear())
            WocheDto(
                label = if (zurueck == 0) "diese Woche" else "KW $kw",
                quote = Math.round(woche.count { it.richtig } * 100.0 / woche.size).toInt(),
                versuche = woche.size,
            )
        }
    }

    /* =========================== Fehlerarchiv =========================== */

    fun fehlerarchiv(n: Nutzer): List<FehlerGruppe> {
        val fehler = versuche.letzteFehler(n.id)
        // Nur der letzte Stand zaehlt: Wer die Aufgabe später getroffen hat,
        // findet sie hier nicht mehr.
        val spaeterRichtig = versuche.alle(n.id).filter { it.richtig }.map { it.aufgabeRef }.toSet()
        return fehler.filter { it.aufgabeRef !in spaeterRichtig }
            .groupBy { it.fach to it.unterthema }
            .map { (schluessel, gruppe) ->
                val (fach, code) = schluessel
                FehlerGruppe(
                    unterthema = code,
                    name = Katalog.unterthema(fach, code)?.name ?: code,
                    fach = fach,
                    eintraege = gruppe.take(10).mapNotNull { v ->
                        val a = aufgaben.herstellen(v.aufgabeRef) ?: return@mapNotNull null
                        FehlerEintrag(
                            aufgabeRef = v.aufgabeRef,
                            stamm = a.stamm,
                            denkfehler = lesbar(v.diagnoseId),
                            feedback = rueckmeldung(a, v.diagnoseId),
                            datum = v.zeitpunkt.toString().take(10),
                        )
                    },
                )
            }.filter { it.eintraege.isNotEmpty() }
    }

    private fun lesbar(id: String?): String =
        id?.replace('_', ' ')?.replaceFirstChar { it.uppercase() } ?: "Ohne erkanntes Muster"

    /**
     * Der Satz, der im Fehlerarchiv unter der Aufgabe steht.
     *
     * Zwei Stellen, an denen er stehen kann. Vorher wurde nur `a.fehler`
     * durchsucht — das ist die Liste der ZAHLEN-Fehlermuster, und der
     * `TextGenerator` setzt sie fuer jede Deutsch-Aufgabe ausdruecklich auf
     * `emptyList()`; die Deutsch-Muster liegen in `a.textFehler`. Folge: Bei
     * Mathematik stand der Denkfehler ausformuliert da, bei Deutsch — also
     * ueber der Haelfte des Inhalts — blieb der Kasten leer, ohne dass etwas
     * kaputt aussah.
     *
     * Bleibt beides ohne Treffer, greift die Erklaerung der Aufgabe. Das ist
     * der Normalfall bei eingefuehrten Bloecken: Sie tragen laut §4.5.1 keine
     * Fehlermuster, sondern eine Erklaerung, die Tor T18 prueft. Ein leerer
     * Kasten waere dort die schlechteste aller Antworten.
     */
    private fun rueckmeldung(a: Aufgabe, diagnoseId: String?): String {
        if (diagnoseId != null) {
            a.fehler.firstOrNull { it.diagnoseId == diagnoseId }?.let { return it.feedback }
            a.textFehler.firstOrNull { it.diagnoseId == diagnoseId }?.let { return it.feedback }
        }
        return a.erklaerung?.kern ?: a.loesungsweg.lastOrNull() ?: ""
    }

    /* ============================ Eltern ================================ */

    fun elternReport(n: Nutzer): ElternReport? {
        if (!n.elternFreigabe) return null
        val ab = Instant.now().minus(7, ChronoUnit.DAYS)
        val woche = versuche.seit(n.id, ab)
        val zeitraum = "letzte 7 Tage"
        val faecher = bereicheVon(n)
        val alle = scheduler.fortschritte(n.id, faecher, pruefungVon(n))

        // Alle vier Zahlen beziehen sich auf DIESELBE Woche und tragen ihr Fach.
        val kennzahlen = buildList {
            add(Kennzahl("Gelöste Aufgaben", woche.count { it.richtig }.toString(), "alle Fächer", zeitraum))
            add(Kennzahl("Übungstage", woche.map { it.zeitpunkt.toString().take(10) }.distinct().size.toString() + " von 7", "alle Fächer", zeitraum))
            // Eine Trefferquote je PRUEFUNGSFACH, nicht je Bereich. Sonst
            // stuenden bei Deutsch zwei Zahlen nebeneinander, und aus vier
            // Kennzahlen wuerden sechs — der Report soll auf einen Blick
            // lesbar bleiben.
            pruefungsfaecherVon(n).forEach { fachId ->
                val bereiche = bereicheVon(n, fachId)
                val meine = woche.filter { it.fach in bereiche }
                val quote = if (meine.isEmpty()) "keine Übung" else "${Math.round(meine.count { it.richtig } * 100.0 / meine.size)} %"
                add(Kennzahl("Trefferquote", quote, Katalog.pruefungsfach(fachId)?.name ?: fachId, zeitraum))
            }
            add(
                Kennzahl(
                    "Abgeschlossene Themen",
                    "${alle.count { it.abgeschlossen }} von ${alle.size}",
                    "alle Fächer",
                    "seit Beginn",
                ),
            )
        }
        return ElternReport(n.vorname, zeitraum, kennzahlen)
    }

    /* ============================ Profil ================================ */

    fun profil(n: Nutzer): ProfilDto {
        val tage = n.pruefungsdatum?.let {
            Duration.between(Instant.now(), it.atStartOfDay(java.time.ZoneId.of("Europe/Zurich")).toInstant())
                .toDays().toInt().coerceAtLeast(0)
        }
        return ProfilDto(
            id = n.id,
            vorname = n.vorname,
            anbieter = n.anbieter.name.lowercase(),
            kanton = n.kanton,
            schultyp = n.schultyp,
            pruefungsdatum = n.pruefungsdatum?.toString(),
            tageBisPruefung = tage,
            elternFreigabe = n.elternFreigabe,
            plus = n.hatPlus,
            onboardingFertig = n.kanton != null && n.schultyp != null && n.pruefungsdatum != null,
        )
    }

    fun vorbelegterTermin(kanton: String, schultyp: String): LocalDate? =
        Katalog.termin(kanton, schultyp)?.datum?.let(LocalDate::parse)
}
