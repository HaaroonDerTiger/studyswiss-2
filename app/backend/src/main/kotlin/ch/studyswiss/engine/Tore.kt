package ch.studyswiss.engine

import ch.studyswiss.daten.Katalog
import kotlin.system.exitProcess

/** `./gradlew tore` — die zwoelf Qualitaetstore auf alle Templates. */
fun main() {
    var schlecht = 0
    var total = 0

    Katalog.baeume.keys.forEach { fach ->
        val bekannt = Katalog.baum(fach).oberthemen.flatMap { o -> o.unterthemen.map { it.code } }.toSet()

        // Mathematik: parametrisierte Templates, zwoelf Tore ueber 200 Ziehungen.
        Katalog.templates.filter { it.fach == fach }.forEach { spec ->
            val bericht = Validator.pruefe(spec, bekannt)
            println(Validator.bericht(bericht))
            total++
            if (!bericht.bestanden) schlecht++
        }

        // Deutsch: Bloecke gleichartiger Aufgaben, eigene Tore.
        Katalog.textTemplates.filter { it.fach == fach }.forEach { spec ->
            val bericht = TextValidator.pruefe(spec, bekannt)
            println(Validator.bericht(bericht))
            total++
            if (!bericht.bestanden) schlecht++
        }
    }
    println("\n${total - schlecht} von $total Blöcken bestehen die Tore.")
    if (schlecht > 0) {
        println("Ein rotes Tor blockiert den Merge. Repariere das Template, nie das Tor.")
        exitProcess(1)
    }
}
