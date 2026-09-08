package ch.studyswiss

import ch.studyswiss.daten.Katalog
import ch.studyswiss.engine.*
import ch.studyswiss.engine.sichtbarerSchluessel
import ch.studyswiss.service.AboService
import ch.studyswiss.service.AufgabenService
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class AusdruckTest {

    @Test
    fun `rechnet Punkt vor Strich`() {
        assertEquals(14.0, Ausdruck.werteAus("2+3*4", emptyMap()))
        assertEquals(20.0, Ausdruck.werteAus("(2+3)*4", emptyMap()))
    }

    @Test
    fun `kennt die erlaubten Funktionen`() {
        assertEquals(6.0, Ausdruck.werteAus("ggt(12,18)", emptyMap()))
        assertEquals(1.0, Ausdruck.werteAus("istGanz(4/2)", emptyMap()))
        assertEquals(0.0, Ausdruck.werteAus("istGanz(5/2)", emptyMap()))
    }

    @Test
    fun `vergleicht mit Toleranz, damit Fliesskomma keine Bedingung kippt`() {
        assertTrue(Ausdruck.bedingungErfuellt("0.1+0.2==0.3", emptyMap()))
    }

    @Test
    fun `weist alles zurueck, was kein Ausdruck ist`() {
        // Templates sind Daten. Daten duerfen nie zu Code werden.
        assertFailsWith<Ausdruck.Ungueltig> {
            Ausdruck.werteAus("System.exit(0)", emptyMap())
        }
        assertFailsWith<Ausdruck.Ungueltig> { Ausdruck.werteAus("a+1", emptyMap()) }
        assertFailsWith<Ausdruck.Ungueltig> { Ausdruck.werteAus("1/0", emptyMap()) }
    }

    @Test
    fun `meldet unbekannte Namen schon beim Laden`() {
        assertFailsWith<Ausdruck.Ungueltig> { Ausdruck.pruefe("a*tippfehler", listOf("a")) }
        Ausdruck.pruefe("a*ggt(a,2)", listOf("a"))   // wirft nicht
    }
}

class RngTest {

    @Test
    fun `derselbe Seed liefert dieselbe Folge`() {
        val a = Rng(4711); val b = Rng(4711)
        repeat(50) { assertEquals(a.next(), b.next()) }
    }

    @Test
    fun `benachbarte Seeds streuen`() {
        // Ohne das Streuen im Konstruktor bekämen 1, 2, 3 fast dieselbe
        // erste Ziehung — und damit alle Nutzer dieselben ersten Aufgaben.
        val erste = (1..8).map { Rng(it).int(1, 100) }
        assertTrue(erste.toSet().size >= 6, "zu wenig Streuung: $erste")
    }
}

class GeneratorTest {

    private val alleUnterthemen: Set<String> =
        Katalog.baeume.values.flatMap { b -> b.oberthemen.flatMap { o -> o.unterthemen.map { it.code } } }.toSet()

    @Test
    fun `Template plus Seed ergibt immer dieselbe Aufgabe`() {
        val spec = Katalog.templates.first()
        val a = Generator.ziehe(spec, 4711)
        val b = Generator.ziehe(spec, 4711)
        assertEquals(a.stamm, b.stamm)
        assertEquals(a.loesung, b.loesung)
        assertEquals(a.ref, b.ref)
    }

    @Test
    fun `aus der Ref laesst sich die Aufgabe wiederherstellen`() {
        // Genau darum speichert die App Refs statt Aufgaben.
        val dienst = AufgabenService()
        val spec = Katalog.templates.first()
        val original = Generator.ziehe(spec, 8812)
        val wieder = dienst.herstellen(original.ref)
        assertNotNull(wieder)
        assertEquals(original.stamm, wieder.stamm)
        assertEquals(original.loesung, wieder.loesung)
    }

    @Test
    fun `alle Templates bestehen die zwoelf Tore`() {
        val schlecht = Katalog.templates.mapNotNull { spec ->
            val bericht = Validator.pruefe(spec, alleUnterthemen)
            if (bericht.bestanden) null else Validator.bericht(bericht)
        }
        assertTrue(schlecht.isEmpty(), "Templates mit rotem Tor:\n" + schlecht.joinToString("\n"))
    }

    @Test
    fun `kein Template nennt die Loesung im Aufgabentext`() {
        Katalog.templates.forEach { spec ->
            (1..40).forEach { seed ->
                val a = try { Generator.ziehe(spec, seed) } catch (e: ZiehungFehlgeschlagen) { return@forEach }
                val loesung = a.loesung ?: return@forEach
                // Nur bei Sachaufgaben: Steht im Stamm eine Gleichung, ist
                // eine uebereinstimmende Zahl ein Koeffizient, kein Verrat
                // (dieselbe Regel wie Validator T8).
                if ("=" in a.stamm) return@forEach
                val zahlen = Regex("""-?\d+(?:[.,]\d+)?""").findAll(a.stamm)
                    .mapNotNull { it.value.replace(',', '.').toDoubleOrNull() }
                assertTrue(
                    zahlen.none { Math.abs(it - loesung) < 1e-9 },
                    "${spec.templateId} Seed $seed verrät die Lösung: ${a.stamm}",
                )
            }
        }
    }

    @Test
    fun `jedes Feedback benennt einen Denkfehler`() {
        Katalog.templates.forEach { spec ->
            spec.fehler.forEach { fm ->
                assertTrue(fm.feedback.length >= 40, "${spec.templateId}/${fm.diagnoseId} zu knapp")
                assertTrue(
                    !fm.feedback.trim().equals("Das ist falsch.", ignoreCase = true),
                    "${spec.templateId}/${fm.diagnoseId}: «Das ist falsch» ist kein Feedback",
                )
            }
        }
    }

    @Test
    fun `Schweizer Hochdeutsch ueberall`() {
        Katalog.templates.forEach { spec ->
            val text = spec.stamm + spec.hinweise.joinToString(" ") +
                spec.loesungsweg.joinToString(" ") + spec.fehler.joinToString(" ") { it.feedback }
            assertTrue("ß" !in text, "${spec.templateId} enthält ein ß")
            // «Euro» als Waehrung ist verboten, «Europa» nicht — und eine
            // Umrechnungsaufgabe nennt die Waehrung notgedrungen (§2.1,
            // dieselbe Regel wie Validator T3).
            if (!Validator.waehrungsaufgabe(text)) {
                assertTrue(!Regex("""\bEuros?\b""").containsMatchIn(text) && "€" !in text,
                    "${spec.templateId} rechnet in Euro")
            }
            assertTrue("Fahrrad" !in text, "${spec.templateId}: Velo statt Fahrrad")
        }
    }

    @Test
    fun `Franken werden Schweizerisch geschrieben`() {
        assertEquals("Fr. 24'000.–", Generator.formatiere(24000.0, Zahlformat.FRANKEN))
        assertEquals("Fr. 96.–", Generator.formatiere(96.0, Zahlformat.FRANKEN))
        assertEquals("Fr. 12.50", Generator.formatiere(12.5, Zahlformat.FRANKEN))
    }
}

class AntwortTest {

    private val dienst = AufgabenService()

    @Test
    fun `nimmt entgegen, wie Jugendliche tatsaechlich tippen`() {
        assertEquals(1200.5, dienst.alsZahl("1'200.50"))
        assertEquals(1200.5, dienst.alsZahl("1200,5"))
        assertEquals(96.0, dienst.alsZahl("Fr. 96.–"))
        assertEquals(96.0, dienst.alsZahl("96 cm"))
        assertEquals(0.75, dienst.alsZahl("3/4"))
        assertEquals(null, dienst.alsZahl("weiss nicht"))
    }

    @Test
    fun `erkennt den Denkfehler und benennt ihn`() {
        val spec = Katalog.template("rabatt-rueckwaerts")!!
        val a = Generator.ziehe(spec, 4711)
        val falsch = a.fehler.first()

        val urteil = dienst.bewerte(a, Generator.formatiere(falsch.wert, Zahlformat.FRANKEN), null)
        assertTrue(!urteil.richtig)
        assertEquals(falsch.diagnoseId, urteil.diagnoseId)
        assertTrue(urteil.feedback.length > 40)

        val richtig = dienst.bewerte(a, a.loesungText!!, null)
        assertTrue(richtig.richtig)
    }
}

class KatalogTest {

    @Test
    fun `Themenbaeume sind vollstaendig geladen`() {
        val m = Katalog.baum("mathematik")
        assertEquals(8, m.oberthemen.size)
        assertEquals(87, m.oberthemen.sumOf { it.unterthemen.size })
        assertEquals(40, m.oberthemen.sumOf { it.punkte })

        val d = Katalog.baum("sprachbetrachtung")
        assertEquals(9, d.oberthemen.size)
        assertEquals(52, d.oberthemen.sumOf { it.punkte })

        val t = Katalog.baum("textverstaendnis")
        assertEquals(6, t.oberthemen.size)
        assertEquals(24, t.oberthemen.sumOf { it.unterthemen.size })
        assertEquals(30, t.oberthemen.sumOf { it.punkte })
    }

    @Test
    fun `jedes Pruefungsfach hat mindestens einen uebbaren Bereich`() {
        // Hier standen die drei Zuercher Listen wortwoertlich — «mathematik»
        // habe genau einen Bereich, Franzoesisch gar keinen. Das galt, solange
        // Zuerich der einzige Kanton war; heute fuehrt jeder Kanton eigene
        // Bereiche («mathematik-bern-gym3»), und Franzoesisch ist in acht
        // Kantonen bespielt. Ein Test, der Kantone aufzaehlt, ist derselbe
        // Fehler wie ein Screen, der es tut (§9) — er muss bei jedem neuen
        // Kanton nachgezogen werden und sagt nichts ueber die Zusicherung aus.
        //
        // Geprueft wird darum, was der Name verspricht: Jedes Pruefungsfach
        // hat mindestens einen Bereich, und jeder Bereich mit Themenbaum ist
        // auch wirklich einer, den es gibt.
        Katalog.pruefungsfaecher.forEach { fach ->
            val bereiche = Katalog.bereicheVon(fach.id)
            assertTrue(
                bereiche.isNotEmpty(),
                "Das Pruefungsfach «${fach.id}» hat keinen einzigen Bereich",
            )
            bereiche.forEach { id ->
                assertTrue(
                    Katalog.bereiche.any { it.id == id },
                    "Der Bereich «$id» von «${fach.id}» steht in keiner Bereichszeile",
                )
            }
        }
    }

    @Test
    fun `jeder Bereich kennt sein Pruefungsfach`() {
        Katalog.bereiche.forEach { b ->
            assertTrue(
                Katalog.pruefungsfach(b.pruefungsfach) != null,
                "Bereich ${b.id} zeigt auf ein Fach, das es nicht gibt",
            )
        }
    }

    @Test
    fun `Lernziel-IDs sind eindeutig — sie stecken in Nutzerfortschritten`() {
        val ids = Katalog.baeume.values
            .flatMap { b -> b.oberthemen.flatMap { o -> o.unterthemen.map { it.lernzielId } } }
        assertEquals(ids.size, ids.toSet().size, "doppelte Lernziel-ID")
    }

    @Test
    fun `Voraussetzungen zeigen auf vorhandene Unterthemen`() {
        Katalog.baeume.values.forEach { b ->
            val codes = b.oberthemen.flatMap { o -> o.unterthemen.map { it.code } }.toSet()
            b.oberthemen.forEach { o ->
                o.unterthemen.forEach { u ->
                    u.voraussetzungen.forEach {
                        assertTrue(it in codes, "${u.code} verweist auf unbekanntes $it")
                    }
                }
            }
        }
    }

    @Test
    fun `es gibt vier Aufsatz-Slots`() {
        val slots = Katalog.aufsatzThemen.map { it.slot }.toSet()
        assertEquals(setOf("arg", "erz", "ref", "bild"), slots)
        // 150, nicht 74: Mit den elf Kantonen nach Zuerich sind neun weitere
        // Aufsatzarten dazugekommen, und jede traegt Themen.
        assertEquals(150, Katalog.aufsatzThemen.size)
        slots.forEach { s ->
            assertTrue(Katalog.aufsatzThemen.any { it.slot == s }, "Slot $s ist leer")
        }
    }
}

/* ======================================================================
   Deutsch — Blöcke statt Templates
   ====================================================================== */

class TextTest {

    private val alleUnterthemen: Set<String> =
        Katalog.baeume.values.flatMap { b ->
            b.oberthemen.flatMap { o -> o.unterthemen.map { it.code } }
        }.toSet()

    @Test
    fun `alle Deutsch-Bloecke bestehen ihre Tore`() {
        val schlecht = Katalog.textTemplates.mapNotNull { spec ->
            val bericht = TextValidator.pruefe(spec, alleUnterthemen)
            if (bericht.bestanden) null else Validator.bericht(bericht)
        }
        assertTrue(schlecht.isEmpty(), "Blöcke mit rotem Tor:\n" + schlecht.joinToString("\n"))
    }

    @Test
    fun `Block plus Seed ergibt immer dieselbe Aufgabe`() {
        val spec = Katalog.textTemplates.first()
        val a = TextGenerator.ziehe(spec, 4711)
        val b = TextGenerator.ziehe(spec, 4711)
        assertEquals(a.stamm, b.stamm)
        assertEquals(a.loesungWorte, b.loesungWorte)
        assertEquals(a.optionen.map { it.text }, b.optionen.map { it.text })
    }

    @Test
    fun `die Optionen stehen nicht immer in derselben Reihenfolge`() {
        // Sonst lernt man die Position statt der Sache.
        val spec = Katalog.textTemplates.first { it.format == TextFormat.EINFACHAUSWAHL }
        val reihenfolgen = (1..30).map { TextGenerator.ziehe(spec, it).optionen.map { o -> o.text } }
        assertTrue(reihenfolgen.toSet().size > 3, "Die Optionen werden nicht gemischt")
    }

    @Test
    fun `jede Aufgabe eines Blocks ist erreichbar`() {
        Katalog.textTemplates.forEach { spec ->
            // Verglichen wird alles Sichtbare, nicht nur der Stamm: beim
            // Markieren und bei Kommas ist der Stamm nur die Anweisung.
            //
            // Die Zahl der Ziehungen waechst mit dem Block. Fest 500 zu ziehen
            // hiess, bei einem Block mit 312 Aufgaben rund 249 zu sehen — nicht
            // weil eine Aufgabe unerreichbar waere, sondern weil zufaellige
            // Ziehungen nun einmal so streuen (Sammelbilderproblem). Der Test
            // meldete damit einen Fehler, den es nicht gibt.
            val ziehungen = maxOf(500, spec.aufgaben.size * 20)
            val gesehen = (1..ziehungen).map { TextGenerator.ziehe(spec, it).sichtbarerSchluessel }.toSet()
            assertEquals(
                spec.aufgaben.size, gesehen.size,
                "${spec.templateId}: nur ${gesehen.size} von ${spec.aufgaben.size} Aufgaben erreichbar",
            )
        }
    }

    @Test
    fun `bei Kommas wird der Satz richtig zerlegt`() {
        val spec = Katalog.textTemplates.first { it.format == TextFormat.KOMMAS }
        (1..40).forEach { seed ->
            val a = TextGenerator.ziehe(spec, seed)
            // Aus Wörtern und Stellen muss sich der Lösungssatz wieder ergeben.
            val zurueck = a.woerter.mapIndexed { i, w ->
                if (i in a.loesungIndizes) "$w," else w
            }.joinToString(" ")
            assertEquals(a.loesungText, zurueck, "Seed $seed: Zerlegung stimmt nicht")
        }
    }

    @Test
    fun `beim Markieren stehen die Wörter wirklich im Satz`() {
        val spec = Katalog.textTemplates.first { it.format == TextFormat.MARKIEREN }
        (1..40).forEach { seed ->
            val a = TextGenerator.ziehe(spec, seed)
            assertEquals(a.loesungWorte.size, a.loesungIndizes.size,
                "Seed $seed: nicht jedes gesuchte Wort wurde gefunden")
            a.loesungIndizes.forEach { i ->
                assertTrue(i in a.woerter.indices, "Seed $seed: Stelle $i liegt ausserhalb")
            }
        }
    }

    @Test
    fun `jedes Oberthema des Textverstaendnisses ist bespielt`() {
        val bespielt = Katalog.bespielt("textverstaendnis")
        Katalog.baum("textverstaendnis").oberthemen.forEach { o ->
            assertTrue(
                o.unterthemen.any { it.code in bespielt },
                "Oberthema ${o.nr} «${o.name}» hat keinen einzigen Block",
            )
        }
    }

    @Test
    fun `alle neun Oberthemen sind bespielt`() {
        val bespielt = Katalog.bespielt("sprachbetrachtung")
        Katalog.baum("sprachbetrachtung").oberthemen.forEach { o ->
            assertTrue(
                o.unterthemen.any { it.code in bespielt },
                "Oberthema ${o.nr} «${o.name}» hat keinen einzigen Block",
            )
        }
    }
}

/* ======================================================================
   Lernpfad und Abo
   ====================================================================== */

class AboTest {

    @Test
    fun `es gibt genau drei Produkte, und die IDs sind eindeutig`() {
        val p = AboService.PRODUKTE
        assertEquals(3, p.size)
        assertEquals(p.size, p.map { it.id }.toSet().size)
        // Dieselben IDs stehen in App Store Connect und in der Play Console.
        assertTrue(p.all { it.id.startsWith("ch.studyswiss.plus.") })
    }

    @Test
    fun `genau ein Produkt ist als Hauptweg empfohlen`() {
        assertEquals(1, AboService.PRODUKTE.count { it.empfohlen })
    }
}
