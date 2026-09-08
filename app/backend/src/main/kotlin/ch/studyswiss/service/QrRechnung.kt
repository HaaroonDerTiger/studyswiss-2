package ch.studyswiss.service

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/**
 * Der Zahlteil der Schweizer QR-Rechnung.
 *
 * Nach den «Schweizer Implementation Guidelines QR-Rechnung»: eine
 * feste Reihenfolge von Feldern, getrennt durch CRLF, als Swiss
 * Payments Code (SPC) im QR-Code, Fehlerkorrektur M, mit dem
 * Schweizerkreuz von 7 × 7 mm in der Mitte.
 *
 * Zwei Dinge sind hier wichtiger als Eleganz:
 *
 * 1. **Die Reihenfolge der Felder ist Gesetz.** Ein verschobenes Feld
 *    ergibt einen Code, der sich einlesen laesst und trotzdem falsch
 *    ist — die Bank bucht dann auf ein anderes Konto oder weist zurueck.
 *    Darum stehen die Feldnamen als Kommentar daneben und nicht nur die
 *    Werte.
 *
 * 2. **Der Code wird nie im Browser gerechnet.** Ein Fehler daran sieht
 *    aus wie kein Fehler; die Schule merkt ihn erst bei der Mahnung.
 *    Er entsteht hier, aus den Daten, die auch auf dem Papier stehen.
 */
object QrRechnung {

    /** Adressen im Zahlteil sind entweder «S» (strukturiert) oder «K»
     *  (kombiniert). Wir schreiben strukturiert — dann kann die Bank
     *  Strasse, Hausnummer, PLZ und Ort einzeln lesen. */
    data class Adresse(
        val name: String,
        val strasse: String = "",
        val hausnummer: String = "",
        val plz: String,
        val ort: String,
        val land: String = "CH",
    )

    /**
     * Die Nutzlast des Codes.
     *
     * @param betragRappen der Betrag in Rappen; auf dem Zahlteil steht er
     *        immer mit zwei Nachkommastellen, auch bei ganzen Franken.
     */
    fun nutzlast(
        iban: String,
        zahlungsempfaenger: Adresse,
        zahler: Adresse,
        betragRappen: Int,
        referenz: String,
        mitteilung: String,
    ): String {
        val z = StringBuilder()
        fun zeile(wert: String) { z.append(wert).append("\r\n") }

        zeile("SPC")                                    // QRType
        zeile("0200")                                   // Version
        zeile("1")                                      // Codierung: Latin-1
        zeile(iban.replace(" ", ""))                    // IBAN

        zeile("S")                                      // Adresstyp Empfaenger
        zeile(zahlungsempfaenger.name)
        zeile(zahlungsempfaenger.strasse)
        zeile(zahlungsempfaenger.hausnummer)
        zeile(zahlungsempfaenger.plz)
        zeile(zahlungsempfaenger.ort)
        zeile(zahlungsempfaenger.land)

        // Endgueltiger Zahlungsempfaenger: sieben leere Zeilen. Sie duerfen
        // NICHT weggelassen werden — die Felder werden gezaehlt, nicht
        // benannt.
        repeat(7) { zeile("") }

        zeile(betragText(betragRappen))                 // Betrag
        zeile("CHF")                                    // Waehrung

        zeile("S")                                      // Adresstyp Zahler
        zeile(zahler.name)
        zeile(zahler.strasse)
        zeile(zahler.hausnummer)
        zeile(zahler.plz)
        zeile(zahler.ort)
        zeile(zahler.land)

        zeile(if (referenz.isBlank()) "NON" else "QRR") // Referenztyp
        zeile(referenz)                                 // Referenz
        zeile(mitteilung.take(140))                     // Unstrukturierte Mitteilung
        z.append("EPD")                                 // Endpunkt, ohne CRLF
        return z.toString()
    }

    /** «1790.15», nie «1790.1» und nie «1'790.15» — im Code steht der
     *  Betrag maschinenlesbar, nicht schweizerisch schoen. */
    fun betragText(rappen: Int): String =
        "${rappen / 100}.${(rappen % 100).toString().padStart(2, '0')}"

    /**
     * Der QR-Code als SVG.
     *
     * SVG und nicht PNG, weil der Zahlteil gedruckt wird: Ein Rasterbild
     * mit 46 mm Kantenlaenge sieht auf Papier ausgefranst aus, und ein
     * ausgefranster QR-Code wird am Schalter abgelehnt.
     *
     * Das Schweizerkreuz wird hier NICHT eingezeichnet — es liegt in der
     * Darstellung darueber (`css/beleg.css`, `.zt-kreuz`). So bleibt der
     * Code selbst unveraendert, und wer ihn pruefen will, liest genau
     * das, was der Encoder erzeugt hat.
     */
    fun svg(nutzlast: String, kantenlaengeMm: Int = 46): String {
        val hinweise = mapOf(
            EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
            EncodeHintType.CHARACTER_SET to "ISO-8859-1",
            EncodeHintType.MARGIN to 0,
        )
        val matrix = QRCodeWriter().encode(nutzlast, BarcodeFormat.QR_CODE, 0, 0, hinweise)
        val n = matrix.width
        val wege = StringBuilder()
        for (y in 0 until matrix.height) {
            var x = 0
            while (x < n) {
                if (matrix.get(x, y)) {
                    // Waagrecht zusammenhaengende Punkte zu einem Rechteck
                    // zusammenfassen: Das macht die Datei rund viermal
                    // kleiner, ohne dass sich am Bild etwas aendert.
                    var breite = 1
                    while (x + breite < n && matrix.get(x + breite, y)) breite++
                    wege.append("M$x ${y}h${breite}v1h-${breite}z")
                    x += breite
                } else x++
            }
        }
        return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 $n $n" """ +
            """width="${kantenlaengeMm}mm" height="${kantenlaengeMm}mm" """ +
            """shape-rendering="crispEdges" role="img" """ +
            """aria-label="QR-Code für die Zahlung"><rect width="$n" height="$n" """ +
            """fill="#fff"/><path d="$wege" fill="#000"/></svg>"""
    }

    /* ------------------------- Referenz ------------------------------ */

    private val M10 = arrayOf(
        intArrayOf(0, 9, 4, 6, 8, 2, 7, 1, 3, 5), intArrayOf(9, 4, 6, 8, 2, 7, 1, 3, 5, 0),
        intArrayOf(4, 6, 8, 2, 7, 1, 3, 5, 0, 9), intArrayOf(6, 8, 2, 7, 1, 3, 5, 0, 9, 4),
        intArrayOf(8, 2, 7, 1, 3, 5, 0, 9, 4, 6), intArrayOf(2, 7, 1, 3, 5, 0, 9, 4, 6, 8),
        intArrayOf(7, 1, 3, 5, 0, 9, 4, 6, 8, 2), intArrayOf(1, 3, 5, 0, 9, 4, 6, 8, 2, 7),
        intArrayOf(3, 5, 0, 9, 4, 6, 8, 2, 7, 1), intArrayOf(5, 0, 9, 4, 6, 8, 2, 7, 1, 3),
    )

    /** Modulo 10 rekursiv — das Verfahren der Schweizer Referenz. */
    fun pruefziffer(ziffern: String): Int {
        var uebertrag = 0
        for (z in ziffern) uebertrag = M10[uebertrag][z - '0']
        return intArrayOf(0, 9, 8, 7, 6, 5, 4, 3, 2, 1)[uebertrag]
    }

    /** 27 Stellen: 26 aus der Laufnummer, dann die Pruefziffer. */
    fun referenz(laufnummer: Long): String {
        val kern = laufnummer.toString().padStart(26, '0').takeLast(26)
        return kern + pruefziffer(kern)
    }

    /** «21 00000 00003 13947 14300 09017» — so steht sie auf dem Papier. */
    fun referenzGruppiert(referenz: String): String =
        referenz.reversed().chunked(5).joinToString(" ").reversed()
}
