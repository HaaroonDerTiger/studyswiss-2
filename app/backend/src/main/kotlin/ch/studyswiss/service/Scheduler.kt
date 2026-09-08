package ch.studyswiss.service

import ch.studyswiss.daten.Katalog
import ch.studyswiss.model.*
import ch.studyswiss.repo.VersuchRepo
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

/**
 * Bestimmt, was «zuerst dran» ist.
 *
 * Der Scheduler schlaegt vor, er verbietet nicht: Jedes Thema bleibt jederzeit
 * anwaehlbar. Die Reihenfolge rechnet sich nach jeder Uebung neu, und der
 * Screen sagt das auch so.
 */
class Scheduler(private val versuche: VersuchRepo) {

    private companion object {
        const val W_PRUEFUNG = 0.40
        const val W_SCHWAECHE = 0.25
        const val W_DRINGLICHKEIT = 0.20
        const val W_VERGESSEN = 0.15
        /** Halbwertszeit des Vergessens in Tagen. Ebbinghaus, grob. */
        const val HALBWERT_TAGE = 9.0
    }

    data class Bewertet(val f: ThemenFortschritt, val punkte: Double, val begruendung: String)

    /**
     * @param pruefung Die Pruefung dieses Nutzers. Sie entscheidet mit,
     *   WELCHE Unterthemen ueberhaupt zaehlen: Der Zuercher Mathematikbaum
     *   traegt die ZAP 1, 2 und 3, und vierzehn seiner Unterthemen kommen nur
     *   in der ZAP 3 vor.
     */
    fun fortschritte(
        nutzerId: String,
        faecher: List<String>,
        pruefung: String? = null,
    ): List<ThemenFortschritt> {
        val alle = versuche.alle(nutzerId)
        return faecher.flatMap { fach ->
            val baum = Katalog.baeume[fach] ?: return@flatMap emptyList()
            val bespielt = Katalog.bespielt(fach, pruefung)
            baum.oberthemen.flatMap { o ->
                o.unterthemen.filter { it.code in bespielt }.map { u ->
                    val meine = alle.filter { it.fach == fach && it.unterthema == u.code }
                    val letzte = meine.takeLast(10)
                    ThemenFortschritt(
                        unterthema = u.code,
                        name = u.name,
                        oberthema = o.name,
                        fach = fach,
                        pflichtset = u.pflichtset,
                        // Jede Aufgabe zaehlt einmal: wer dieselbe Ref zweimal
                        // loest, kommt dem Pflichtset nicht naeher.
                        geloest = meine.filter { it.richtig }.map { it.aufgabeRef }.toSet().size,
                        richtigeLetzte10 = letzte.count { it.richtig },
                        versucheLetzte10 = letzte.size,
                        zuletztGeuebt = meine.lastOrNull()?.zeitpunkt,
                    )
                }
            }
        }
    }

    /**
     * Reihenfolge ueber alle Faecher. Zwei Regeln stehen ueber der Formel:
     * Voraussetzungen kommen zuerst, und dasselbe Thema kommt nicht dreimal
     * hintereinander als Vorschlag.
     */
    fun rangliste(
        nutzerId: String,
        faecher: List<String>,
        pruefungsdatum: LocalDate?,
        jetzt: Instant = Instant.now(),
    ): List<Bewertet> {
        val alle = fortschritte(nutzerId, faecher)
        val nachCode = alle.associateBy { it.fach to it.unterthema }
        // «Kein drittes Mal am Stück»: Wer zweimal hintereinander dasselbe
        // Thema vorgeschlagen bekam, sieht beim dritten Mal etwas anderes.
        val zuletzt = versuche.alle(nutzerId).map { it.fach to it.unterthema }
        val zweimalAmStueck = zuletzt.takeLast(20).distinct().takeLast(1)
            .firstOrNull { paar -> zuletzt.takeLast(20).all { it == paar } }

        val tageBis = pruefungsdatum
            ?.let { Duration.between(jetzt, it.atStartOfDay(java.time.ZoneId.of("Europe/Zurich")).toInstant()).toDays() }
            ?.coerceAtLeast(0L)

        return alle.mapNotNull { f ->
            if (f.abgeschlossen) return@mapNotNull null

            val u = Katalog.unterthema(f.fach, f.unterthema) ?: return@mapNotNull null

            // Voraussetzungen zuerst: ein Thema wird zurückgestellt, solange
            // ein Vorgaenger nicht wenigstens halb gefuellt ist.
            val offeneVoraussetzung = u.voraussetzungen.firstOrNull { v ->
                val vf = nachCode[f.fach to v] ?: return@firstOrNull false
                vf.geloest * 2 < vf.pflichtset
            }

            val pruefung = Katalog.pruefungsgewicht(f.fach, f.unterthema)
            val schwaeche = if (f.versucheLetzte10 == 0) 0.6 else 1.0 - f.trefferquote
            val restanteil = 1.0 - min(1.0, f.geloest.toDouble() / f.pflichtset)
            val dringlichkeit = when {
                tageBis == null -> restanteil * 0.5
                tageBis <= 0L -> restanteil
                else -> restanteil * min(1.0, 120.0 / max(1.0, tageBis.toDouble()))
            }
            val tageHer = f.zuletztGeuebt
                ?.let { Duration.between(it, jetzt).toHours() / 24.0 } ?: 30.0
            val vergessen = 1.0 - exp(-tageHer / HALBWERT_TAGE)

            var punkte = W_PRUEFUNG * pruefung + W_SCHWAECHE * schwaeche +
                W_DRINGLICHKEIT * dringlichkeit + W_VERGESSEN * vergessen
            if (offeneVoraussetzung != null) punkte *= 0.25
            if (zweimalAmStueck == (f.fach to f.unterthema)) punkte *= 0.5

            Bewertet(f, punkte, begruendung(f, pruefung, schwaeche, tageHer, offeneVoraussetzung))
        }.sortedByDescending { it.punkte }
    }

    /** Der Satz, der im Screen «Zuerst dran» unter dem Thema steht. */
    private fun begruendung(
        f: ThemenFortschritt,
        pruefung: Double,
        schwaeche: Double,
        tageHer: Double,
        offeneVoraussetzung: String?,
    ): String {
        if (offeneVoraussetzung != null) {
            val name = Katalog.unterthema(f.fach, offeneVoraussetzung)?.name ?: offeneVoraussetzung
            return "Übe zuerst «$name» — darauf baut dieses Thema auf."
        }
        val o = Katalog.oberthemaVon(f.fach, f.unterthema)
        val total = Katalog.baum(f.fach).oberthemen.sumOf { it.punkte }
        return when {
            f.versucheLetzte10 == 0 && pruefung > 0.15 && o != null ->
                "Du hast dieses Thema noch nie geübt, und «${o.name}» trägt ${o.punkte} von $total Punkten in der Prüfung."
            f.versucheLetzte10 == 0 ->
                "Du hast dieses Thema noch nie geübt."
            schwaeche >= 0.5 && o != null ->
                "«${o.name}» trägt ${o.punkte} von $total Punkten, und du hast ${f.richtigeLetzte10} von ${f.versucheLetzte10} Aufgaben getroffen."
            schwaeche >= 0.5 ->
                "Du hast zuletzt ${f.richtigeLetzte10} von ${f.versucheLetzte10} Aufgaben getroffen."
            tageHer >= 7 ->
                "Das liegt ${tageHer.toInt()} Tage zurück — Zeit für eine Auffrischung."
            else ->
                "Dir fehlen noch ${f.pflichtset - f.geloest} von ${f.pflichtset} Pflichtaufgaben."
        }
    }

    fun alsVorschlag(b: Bewertet) = Vorschlag(
        unterthema = b.f.unterthema,
        name = b.f.name,
        oberthema = b.f.oberthema,
        fach = b.f.fach,
        begruendung = b.begruendung,
        geloest = b.f.geloest,
        pflichtset = b.f.pflichtset,
    )
}
