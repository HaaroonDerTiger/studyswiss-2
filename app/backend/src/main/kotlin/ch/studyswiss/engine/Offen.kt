package ch.studyswiss.engine

import ch.studyswiss.daten.Katalog

/** `./gradlew offen` — Unterthemen, fuer die es noch kein Template gibt. */
fun main(args: Array<String>) {
    val nurOberthema = args.firstOrNull()?.toIntOrNull()
    Katalog.baeume.values.forEach { baum ->
        val bespielt = Katalog.bespielt(baum.fach)
        println("\n${baum.name} — ${baum.pruefung}")
        baum.oberthemen
            .filter { nurOberthema == null || it.nr == nurOberthema }
            .forEach { o ->
                val offen = o.unterthemen.filter { it.code !in bespielt }
                val da = o.unterthemen.size - offen.size
                println("  ${o.nr}. ${o.name} — $da von ${o.unterthemen.size} bespielt, ${o.punkte} Punkte")
                offen.forEach { println("      offen  ${it.code}  ${it.name}") }
                // Punkte pro offenem Unterthema: wo sich neue Blöcke am
                // meisten lohnen. Ein offenes Unterthema in einem 18-Punkte-
                // Oberthema wiegt schwerer als eines in einem 0-Punkte-Thema.
                if (offen.isNotEmpty() && o.punkte > 0) {
                    println("      → %.1f Punkte je offenes Unterthema".format(o.punkte.toDouble() / offen.size))
                }
            }
    }
}
