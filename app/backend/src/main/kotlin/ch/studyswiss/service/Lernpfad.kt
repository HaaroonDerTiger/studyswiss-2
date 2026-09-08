package ch.studyswiss.service

import ch.studyswiss.daten.Katalog
import ch.studyswiss.model.*
import ch.studyswiss.repo.VersuchRepo
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/**
 * Der Lernpfad.
 *
 * ## Die Idee
 *
 * Bisher sagte die App nur, was **jetzt gerade** dran ist. Was fehlte, war die
 * Antwort auf die Frage, die jedes Kind und jedes Elternteil zuerst stellt:
 * *Reicht die Zeit?*
 *
 * Der Lernpfad beantwortet sie. Er nimmt die zwei Zahlen, die feststehen —
 * **wie viele Wochen bis zur Prüfung** und **wie viele Pflichtaufgaben noch
 * offen sind** — und teilt die zweite durch die erste. Heraus kommt ein
 * Wochenpensum, und daraus ein Weg von heute bis zum Prüfungstag.
 *
 * ## Warum kein Kalender und keine Serie
 *
 * Ein fixer Wochenplan bricht beim ersten Skiwochenende zusammen, und dann
 * schaut ihn niemand mehr an. Deshalb ist dieser Pfad **selbstheilend**: Er
 * wird nach jeder Übung neu gerechnet. Wer eine Woche auslässt, findet keinen
 * roten Rückstand vor, sondern ein etwas grösseres Pensum in den übrigen
 * Wochen. Wer vorarbeitet, findet ein kleineres.
 *
 * Es gibt keine Serie, keine Punkte, keine Abzeichen. Der Pfad zeigt eine
 * abzählbare Grösse — «14 Pflichtaufgaben diese Woche» — und sonst nichts.
 *
 * ## Die vier Abschnitte
 *
 * Ein Weg braucht Etappen, sonst ist er nur eine lange Liste. Die vier
 * ergeben sich aus der Sache selbst, nicht aus einer Erzählung:
 *
 * 1. **Grundlagen** — die Themen, auf denen andere aufbauen (Oberthema 1
 *    in Mathematik, Wortschatz und Wortarten in Deutsch).
 * 2. **Die grossen Brocken** — die Oberthemen mit dem höchsten Punkteanteil.
 * 3. **Der Rest** — alles, was noch offen ist.
 * 4. **Prüfungsform** — die letzten vier Wochen: keine neuen Themen mehr,
 *    nur noch Selbsttests und das Fehlerarchiv.
 *
 * Die vierte Etappe ist die wichtigste und die, die Schülerinnen von selbst
 * nie machen: In den letzten Wochen bringt Wiederholen mehr als Neues.
 */
class Lernpfad(private val versuche: VersuchRepo, private val scheduler: Scheduler) {

    private companion object {
        val ZONE: ZoneId = ZoneId.of("Europe/Zurich")
        /** Die letzten vier Wochen gehören der Prüfungsform. */
        const val PRUEFUNGSFORM_WOCHEN = 4L
        /** Mehr als das schafft niemand neben der Schule — dann wird gekürzt. */
        const val PENSUM_OBERGRENZE = 40
        const val PENSUM_UNTERGRENZE = 6
    }

    /**
     * Rechnet den ganzen Pfad neu. Wird bei jedem Aufruf frisch gebildet —
     * es gibt keinen gespeicherten Plan, der veralten könnte.
     */
    fun pfad(n: Nutzer, faecher: List<String>, jetzt: Instant = Instant.now()): LernpfadDto {
        val heute = jetzt.atZone(ZONE).toLocalDate()
        val pruefung = n.pruefungsdatum

        if (pruefung == null || !pruefung.isAfter(heute)) {
            return LernpfadDto(
                aktiv = false,
                grund = if (pruefung == null)
                    "Sobald dein Prüfungstermin gesetzt ist, rechnet die App dir den Weg dorthin aus."
                else
                    "Dein Prüfungstermin liegt in der Vergangenheit. Setze in den Einstellungen einen neuen.",
                wochen = emptyList(),
                etappen = emptyList(),
                pensumDieseWoche = 0,
                offenTotal = 0,
                wochenBisPruefung = 0,
            )
        }

        val alle = scheduler.fortschritte(
            n.id, faecher,
            Katalog.schultyp(n.kanton ?: Katalog.standardKanton, n.schultyp)?.pruefungId)
        val offenTotal = alle.sumOf { max(0, it.pflichtset - it.geloest) }

        // Wochen werden ab Montag gezählt: Ein Pensum, das mitten in der Woche
        // beginnt, ist keines.
        val montag = heute.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val letzterMontag = pruefung.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val wochenTotal = max(1, ChronoUnit.WEEKS.between(montag, letzterMontag).toInt() + 1)
        val lernwochen = max(1, wochenTotal - PRUEFUNGSFORM_WOCHEN.toInt())

        // Das Pensum: offene Pflichtaufgaben geteilt durch die verbleibenden
        // Lernwochen. Nach jeder Übung sinkt der Zähler, also auch das Pensum.
        val rohesPensum = ceil(offenTotal.toDouble() / lernwochen).toInt()
        val pensum = rohesPensum.coerceIn(PENSUM_UNTERGRENZE, PENSUM_OBERGRENZE)
        val reichtNicht = rohesPensum > PENSUM_OBERGRENZE

        val rang = scheduler.rangliste(n.id, faecher, pruefung, jetzt)
        val geloestDieseWoche = geloestSeit(n.id, montag.atStartOfDay(ZONE).toInstant())

        val wochen = wochen(montag, wochenTotal, pensum, rang, alle, geloestDieseWoche, heute)

        return LernpfadDto(
            aktiv = true,
            grund = null,
            wochen = wochen,
            etappen = etappen(wochenTotal, alle, faecher),
            // Was oben steht, muss zur Liste darunter passen. Vorher stand hier
            // `pensum` — die auf die Untergrenze 6 angehobene Zahl —, waehrend
            // die Wochenkarte nur die wirklich offenen Aufgaben auflistete:
            // «0 von 6» im Kopf, drei Aufgaben in der Woche.
            pensumDieseWoche = wochen.firstOrNull()?.pensum ?: pensum,
            geloestDieseWoche = geloestDieseWoche,
            offenTotal = offenTotal,
            wochenBisPruefung = wochenTotal,
            hinweis = when {
                reichtNicht ->
                    "Bei diesem Termin bleiben pro Woche mehr als $PENSUM_OBERGRENZE Pflichtaufgaben. " +
                        "Das ist neben der Schule viel. Der Pfad zeigt dir zuerst die Themen mit dem " +
                        "grössten Punkteanteil — damit zählt jede Aufgabe, die du schaffst."
                offenTotal == 0 ->
                    "Alle Pflichtsets sind voll. Ab jetzt zählt Wiederholen: Selbsttests und dein Fehlerarchiv."
                else ->
                    "Der Pfad rechnet sich nach jeder Übung neu. Eine ausgelassene Woche verteilt sich " +
                        "auf die übrigen — es gibt keinen Rückstand, den du aufholen müsstest."
            },
        )
    }

    /* ------------------------------------------------------------------- */

    private fun geloestSeit(nutzerId: String, ab: Instant): Int =
        versuche.seit(nutzerId, ab).filter { it.richtig }.map { it.aufgabeRef }.toSet().size

    private fun wochen(
        montag: LocalDate,
        total: Int,
        pensum: Int,
        rang: List<Scheduler.Bewertet>,
        alle: List<ThemenFortschritt>,
        geloestDieseWoche: Int,
        heute: LocalDate,
    ): List<LernpfadWoche> {
        // Die Themen werden der Reihe nach auf die Wochen verteilt, so wie der
        // Scheduler sie ohnehin sortiert hat. Kein zweiter Algorithmus, der
        // dem ersten widersprechen könnte.
        val offen = rang.filter { !it.f.abgeschlossen }.toMutableList()
        val lernwochen = max(1, total - PRUEFUNGSFORM_WOCHEN.toInt())

        return (0 until total).map { i ->
            val start = montag.plusWeeks(i.toLong())
            val istPruefungsform = i >= lernwochen
            val nummer = i + 1

            val themen = if (istPruefungsform) emptyList() else buildList {
                var rest = pensum
                while (rest > 0 && offen.isNotEmpty()) {
                    val b = offen.first()
                    val fehlt = max(0, b.f.pflichtset - b.f.geloest)
                    val nimmt = min(rest, fehlt)
                    add(
                        LernpfadThema(
                            unterthema = b.f.unterthema,
                            name = b.f.name,
                            fach = b.f.fach,
                            fachName = Katalog.bereich(b.f.fach)?.kurzname ?: Katalog.baum(b.f.fach).name,
                            oberthema = b.f.oberthema,
                            aufgaben = nimmt,
                        ),
                    )
                    rest -= nimmt
                    // Innerhalb dieser Planung gilt das Thema als abgearbeitet;
                    // die echten Zahlen kommen beim nächsten Aufruf aus der DB.
                    offen.removeAt(0)
                }
            }

            LernpfadWoche(
                nummer = nummer,
                von = start.toString(),
                bis = start.plusDays(6).toString(),
                istDieseWoche = i == 0,
                istVergangen = start.plusDays(6).isBefore(heute),
                istPruefungsform = istPruefungsform,
                pensum = if (istPruefungsform) 0 else themen.sumOf { it.aufgaben },
                geloest = if (i == 0) geloestDieseWoche else 0,
                themen = themen,
                titel = when {
                    istPruefungsform && nummer == total -> "Prüfungswoche"
                    istPruefungsform -> "Prüfungsform"
                    i == 0 -> "Diese Woche"
                    else -> "Woche $nummer"
                },
                auftrag = when {
                    istPruefungsform && nummer == total ->
                        "Keine neuen Themen mehr. Geh dein Fehlerarchiv durch und schlaf genug."
                    istPruefungsform ->
                        "Ein Selbsttest über die ganze Prüfung, danach die Fehler daraus."
                    themen.isEmpty() ->
                        "Nichts mehr offen. Wiederhole, was am längsten zurückliegt."
                    else -> null
                },
            )
        }
    }

    /**
     * Die vier Abschnitte des Wegs. Sie fassen die Wochen zusammen, damit man
     * auf einen Blick sieht, wo man steht — ohne 26 Wochen zu scrollen.
     */
    private fun etappen(
        wochenTotal: Int,
        alle: List<ThemenFortschritt>,
        faecher: List<String>,
    ): List<LernpfadEtappe> {
        val lernwochen = max(1, wochenTotal - PRUEFUNGSFORM_WOCHEN.toInt())

        // Unterthemen-Codes sind nur JE FACH eindeutig: 47 der 57
        // Deutsch-Codes gibt es in Mathematik auch. Ein reines `Set<String>`
        // warf beide zusammen — ein Mathematik-Thema landete unter
        // «Grundlagen», weil ein gleichnamiges Deutsch-Thema irgendwo
        // Voraussetzung ist. 33 von 144 Unterthemen standen in der falschen
        // Etappe. Deshalb wird ueberall das Paar (fach, code) verglichen.
        val grundlagen: Set<Pair<String, String>> = faecher.flatMap { fach ->
            val baum = Katalog.baeume[fach] ?: return@flatMap emptyList()
            baum.oberthemen.flatMap { o -> o.unterthemen }
                .flatMap { it.voraussetzungen }.distinct()
                .map { fach to it }
        }.toSet()

        // Grosse Brocken: die Oberthemen, die zusammen die Hälfte der Punkte tragen.
        val schwer: Set<Pair<String, String>> = faecher.flatMap { fach ->
            val baum = Katalog.baeume[fach] ?: return@flatMap emptyList()
            val total = baum.oberthemen.sumOf { it.punkte }
            baum.oberthemen.sortedByDescending { it.punkte }
                .let { sortiert ->
                    var summe = 0
                    sortiert.takeWhile { o ->
                        val nimm = summe < total / 2
                        summe += o.punkte
                        nimm
                    }
                }.flatMap { o -> o.unterthemen.map { fach to it.code } }
        }.toSet()

        fun zaehle(auswahl: (ThemenFortschritt) -> Boolean): Pair<Int, Int> {
            val treffer = alle.filter(auswahl)
            return treffer.count { it.abgeschlossen } to treffer.size
        }

        val (gFertig, gTotal) = zaehle { (it.fach to it.unterthema) in grundlagen }
        val (sFertig, sTotal) = zaehle {
            (it.fach to it.unterthema) in schwer && (it.fach to it.unterthema) !in grundlagen
        }
        val (rFertig, rTotal) = zaehle {
            (it.fach to it.unterthema) !in grundlagen && (it.fach to it.unterthema) !in schwer
        }

        val (a1, a2, a3) = teile(lernwochen, 3)
        return listOf(
            LernpfadEtappe(
                nummer = 1, titel = "Grundlagen",
                beschreibung = "Themen, auf denen andere aufbauen. Wer sie sitzen hat, tut sich später leichter.",
                abgeschlossen = gFertig, total = gTotal,
                vonWoche = a1.first, bisWoche = a1.second,
            ),
            LernpfadEtappe(
                nummer = 2, titel = "Die grossen Brocken",
                beschreibung = "Die Oberthemen, die zusammen die halbe Prüfung ausmachen.",
                abgeschlossen = sFertig, total = sTotal,
                vonWoche = a2.first, bisWoche = a2.second,
            ),
            LernpfadEtappe(
                nummer = 3, titel = "Der Rest",
                beschreibung = "Alles, was dann noch offen ist — in der Reihenfolge, die am meisten bringt.",
                abgeschlossen = rFertig, total = rTotal,
                vonWoche = a3.first, bisWoche = a3.second,
            ),
            LernpfadEtappe(
                nummer = 4, titel = "Prüfungsform",
                beschreibung = "Die letzten vier Wochen: keine neuen Themen mehr, nur noch Selbsttests " +
                    "und dein Fehlerarchiv. Wiederholen bringt jetzt mehr als Neues.",
                abgeschlossen = 0, total = 0,
                vonWoche = if (wochenTotal > lernwochen) lernwochen + 1 else null,
                bisWoche = if (wochenTotal > lernwochen) wochenTotal else null,
            ),
        )
    }

    /**
     * Verteilt `total` Wochen gleichmässig auf `n` Abschnitte.
     *
     * `max(1, lernwochen / 3)` genügte nicht: Bei einer einzigen Lernwoche ergab
     * das für Abschnitt 3 «Woche 3 bis 1» — ein Abschnitt, der vor seinem Anfang
     * endet, und daneben zwei, die sich überlappen. Betroffen war jede Prüfung,
     * die weniger als sieben Wochen entfernt ist, also genau die Zeit, in der
     * der Pfad am häufigsten geöffnet wird.
     *
     * Wer in vier Wochen Prüfung hat, soll nicht drei erfundene Abschnitte
     * sehen, sondern die Wahrheit: Für manches reicht die Zeit nicht mehr. Ein
     * Abschnitt ohne Woche bekommt `null` und wird ohne Zeitangabe gezeigt.
     *
     * Dieselbe Rechnung steht in der Vorschau als `teile()`.
     */
    private fun teile(total: Int, n: Int): List<Pair<Int?, Int?>> {
        val aus = mutableListOf<Pair<Int?, Int?>>()
        var ab = 1
        for (k in 0 until n) {
            val wie = total / n + if (k < total % n) 1 else 0
            aus += if (wie > 0) (ab to ab + wie - 1) else (null to null)
            ab += wie
        }
        return aus
    }
}
