package ch.studyswiss.service

import ch.studyswiss.Konfig
import ch.studyswiss.daten.*
import ch.studyswiss.model.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.LocalDate
import java.time.Month
import java.time.ZoneId
import java.time.temporal.WeekFields
import java.util.Locale
import java.util.UUID

/**
 * Der Schulverkauf: Offerte, Bestellung, Rechnung, Lizenzen, Bericht.
 *
 * Drei Entscheide tragen diesen Dienst, und alle drei sind fachlich,
 * nicht technisch:
 *
 * 1. **Die Schule ist kein Nutzerkonto.** Sie meldet sich mit einem
 *    Verwaltungsschluessel an. Eine Schulsekretaerin soll dafuer kein
 *    Konto anlegen muessen, und ein Passwort, das drei Leute im
 *    Sekretariat teilen, ist ohnehin keines.
 *
 * 2. **Der Zugang gilt ab der Bestellung, nicht ab dem Zahlungseingang.**
 *    Eine Gemeinde bezahlt in dreissig Tagen. Wer die Kinder so lange
 *    warten liesse, haette das Schuljahr verpasst.
 *
 * 3. **Die Schule sieht nie eine einzelne Schuelerin.** Der Bericht ist
 *    zusammengefasst, und unterhalb einer Mindestgruppe gibt es gar
 *    keinen — bei drei eingeloesten Lizenzen ist «eine Person war aktiv»
 *    keine Kennzahl mehr, sondern eine Aussage ueber eine Person.
 */
class SchulService(private val konfig: Konfig) {

    private val zufall = SecureRandom()

    /* ====================================================================
       Preise
       ==================================================================== */

    /**
     * Die Staffel. Sie steht hier und nicht im Quelltext der Website,
     * damit eine Preisaenderung an einer Stelle geschieht — sonst zeigt
     * die Startseite eine Zahl an, die der Kauf nicht haelt (§9).
     */
    fun preise(): SchulPreise = SchulPreise(
        mwstSatz = konfig.mwstSatz,
        einzelpass = 129,
        staffel = STAFFEL,
        zahlungsfristTage = konfig.zahlungsfristTage,
        offerteGueltigTage = OFFERTE_GUELTIG_TAGE,
    )

    private fun stufeFuer(anzahl: Int): PreisStufe =
        STAFFEL.last { anzahl >= it.ab }

    /**
     * Rechnet eine Bestellung durch — in Rappen, nicht in Franken.
     *
     * Fliesskomma und Geld vertragen sich nicht: `0.1 + 0.2` ist nicht
     * `0.3`, und auf einer Rechnung ueber sechzig Lizenzen faellt genau
     * das irgendwann als ein Rappen Differenz auf. Gerechnet wird darum
     * ganzzahlig, und erst die Anzeige macht Franken daraus.
     *
     * Gerundet wird auf **fuenf Rappen** — so steht es auf jeder
     * Schweizer Rechnung, und nur so stimmt der Betrag mit dem Zahlteil
     * ueberein.
     */
    fun rechne(anzahl: Int): RechnungPosten {
        val n = anzahl.coerceIn(1, 5000)
        val stufe = stufeFuer(n)
        val einzelRappen = stufe.preis * 100
        val nettoRappen = n * einzelRappen
        val mwstGenau = Math.round(nettoRappen * konfig.mwstSatz / 100.0)
        val mwstRappen = aufFuenfRappen(mwstGenau)
        val totalRappen = aufFuenfRappen(nettoRappen + mwstRappen)
        return RechnungPosten(
            anzahl = n,
            stufe = stufe,
            einzelpreis = franken(einzelRappen),
            netto = franken(nettoRappen),
            zwischensumme = franken(nettoRappen),
            mwstSatz = konfig.mwstSatz,
            mwst = franken(mwstRappen),
            total = franken(totalRappen),
            proLizenz = Math.round(totalRappen.toDouble() / n) / 100.0,
            gespartGegenEinzeln = maxOf(0.0, franken(n * 129 * 100 - totalRappen)),
        )
    }

    private fun aufFuenfRappen(rappen: Long): Long = Math.round(rappen / 5.0) * 5
    private fun aufFuenfRappen(rappen: Int): Long = aufFuenfRappen(rappen.toLong())
    private fun franken(rappen: Long): Double = rappen / 100.0
    private fun franken(rappen: Int): Double = rappen / 100.0

    /* ====================================================================
       Offerte
       ==================================================================== */

    fun offerte(bitte: OfferteBitte): OfferteDto = transaction {
        val start = bitte.start?.let { LocalDate.parse(it) } ?: LocalDate.now()
        val ende = schuljahrEnde(start)
        val posten = rechne(bitte.anzahl)

        // Eine Offerte legt schon eine Schule an, samt Schluessel. So kann
        // die Schulleitung den Link Wochen spaeter wieder oeffnen, ohne
        // dass jemand das Formular ein zweites Mal ausfuellt.
        val schluessel = neuerSchluessel()
        val schulId = legeSchuleAn(bitte.schule, bitte.kontakt, schluessel)
        val nummer = neueNummer("OFF", Offerten, Offerten.nummer)
        val jetzt = Instant.now()

        Offerten.insert {
            it[Offerten.nummer] = nummer
            it[Offerten.schulId] = schulId
            it[anzahl] = posten.anzahl
            it[einzelpreis] = (posten.einzelpreis * 100).toInt()
            it[netto] = (posten.netto * 100).toInt()
            it[mwst] = (posten.mwst * 100).toInt()
            it[total] = (posten.total * 100).toInt()
            it[mwstSatz] = posten.mwstSatz
            it[Offerten.start] = start
            it[Offerten.ende] = ende
            it[bemerkung] = bitte.bemerkung
            it[erstelltAm] = jetzt
            it[gueltigBis] = jetzt.plusSeconds(OFFERTE_GUELTIG_TAGE * 86400L)
        }

        OfferteDto(
            nummer = nummer, schluessel = schluessel,
            erstellt = jetzt.toString(),
            gueltigBis = jetzt.plusSeconds(OFFERTE_GUELTIG_TAGE * 86400L).toString(),
            schule = bitte.schule, kontakt = bitte.kontakt,
            anzahl = posten.anzahl, rechnung = posten,
            start = start.toString(), ende = ende.toString(),
            bemerkung = bitte.bemerkung, anbieter = anbieter(),
        )
    }

    fun offerteHolen(nummer: String, schluessel: String): OfferteDto? = transaction {
        val schulId = schuleZuSchluessel(schluessel) ?: return@transaction null
        val zeile = Offerten
            .selectAll()
            .where { (Offerten.nummer eq nummer) and (Offerten.schulId eq schulId) }
            .singleOrNull() ?: return@transaction null
        val schule = schuleLesen(schulId) ?: return@transaction null

        OfferteDto(
            nummer = nummer, schluessel = schluessel,
            erstellt = zeile[Offerten.erstelltAm].toString(),
            gueltigBis = zeile[Offerten.gueltigBis].toString(),
            schule = schule.first, kontakt = schule.second,
            anzahl = zeile[Offerten.anzahl],
            rechnung = rechne(zeile[Offerten.anzahl]),
            start = zeile[Offerten.start].toString(),
            ende = zeile[Offerten.ende].toString(),
            bemerkung = zeile[Offerten.bemerkung],
            anbieter = anbieter(),
        )
    }

    /* ====================================================================
       Bestellung, Rechnung und Lizenzen — ein Vorgang
       ==================================================================== */

    /**
     * Die Bestellung erzeugt in einem Zug die Auftragsnummer, die Codes
     * und die Rechnung.
     *
     * Alles in einer Transaktion: Eine Bestellung ohne Codes waere eine
     * Schule, die bezahlt hat und nichts bekommt; Codes ohne Rechnung
     * waeren Zugaenge, die niemand verrechnet. Beides faellt erst
     * Wochen spaeter auf.
     */
    fun bestellen(bitte: BestellBitte, schluesselAusOfferte: String?): BestellAntwort = transaction {
        val posten = rechne(bitte.anzahl)
        val start = bitte.start?.let { LocalDate.parse(it) } ?: LocalDate.now()
        val ende = schuljahrEnde(start)

        // Kommt die Bestellung aus einer Offerte, gehoert sie zu deren
        // Schule — sonst legen wir eine an.
        val vorhanden = schluesselAusOfferte?.let { schuleZuSchluessel(it) }
        val schluessel = if (vorhanden != null) schluesselAusOfferte!! else neuerSchluessel()
        val schulId = vorhanden ?: legeSchuleAn(
            bitte.schule ?: fehlt("Ohne Schule keine Bestellung."),
            bitte.kontakt ?: fehlt("Ohne Kontaktperson keine Bestellung."),
            schluessel,
        )
        val (schuleDto, kontaktDto) = schuleLesen(schulId) ?: fehlt("Die Schule gibt es nicht.")

        val bestellNr = neueNummer("BES", Bestellungen, Bestellungen.nummer)
        val jetzt = Instant.now()
        val re = bitte.rechnungsadresse

        Bestellungen.insert {
            it[nummer] = bestellNr
            it[Bestellungen.schulId] = schulId
            it[ausOfferte] = bitte.ausOfferte
            it[anzahl] = posten.anzahl
            it[einzelpreis] = (posten.einzelpreis * 100).toInt()
            it[netto] = (posten.netto * 100).toInt()
            it[mwst] = (posten.mwst * 100).toInt()
            it[total] = (posten.total * 100).toInt()
            it[mwstSatz] = posten.mwstSatz
            it[Bestellungen.start] = start
            it[Bestellungen.ende] = ende
            it[bestellnummerKunde] = bitte.bestellnummer?.takeIf { s -> s.isNotBlank() }
            it[versandart] = bitte.versandart
            it[rechnungsEmail] = bitte.rechnungsEmail?.takeIf { s -> s.isNotBlank() }
            it[reName] = re?.name
            it[reZusatz] = re?.zusatz
            it[reStrasse] = re?.strasse
            it[rePlz] = re?.plz
            it[reOrt] = re?.ort
            it[erstelltAm] = jetzt
        }

        // Die Codes. Sie sind ab jetzt gueltig — nicht ab Zahlungseingang.
        val codes = (1..posten.anzahl).map { neuerCode() }
        Lizenzcodes.batchInsert(codes) { c ->
            this[Lizenzcodes.code] = c
            this[Lizenzcodes.schulId] = schulId
            this[Lizenzcodes.bestellNummer] = bestellNr
            this[Lizenzcodes.gueltigBis] = ende
        }

        val rechnungNr = neueNummer("RG", Rechnungen, Rechnungen.nummer)
        val referenz = QrRechnung.referenz(System.currentTimeMillis())
        val datum = LocalDate.now()
        val faellig = datum.plusDays(konfig.zahlungsfristTage.toLong())

        Rechnungen.insert {
            it[nummer] = rechnungNr
            it[bestellNummer] = bestellNr
            it[Rechnungen.schulId] = schulId
            it[Rechnungen.referenz] = referenz
            it[total] = (posten.total * 100).toInt()
            it[Rechnungen.datum] = datum
            it[Rechnungen.faellig] = faellig
        }

        val rechnungsadresse = re ?: schuleDto
        BestellAntwort(
            bestellung = BestellungDto(
                nummer = bestellNr, schluessel = schluessel, erstellt = jetzt.toString(),
                schule = schuleDto, kontakt = kontaktDto,
                rechnungsadresse = rechnungsadresse,
                bestellnummer = bitte.bestellnummer, anzahl = posten.anzahl,
                rechnung = posten, start = start.toString(), ende = ende.toString(),
                ausOfferte = bitte.ausOfferte,
            ),
            rechnung = RechnungDto(
                nummer = rechnungNr, bestellnummer = bestellNr,
                bestellnummerKunde = bitte.bestellnummer,
                datum = datum.toString(), faellig = faellig.toString(),
                referenz = referenz, bezahlt = false,
                schule = schuleDto, rechnungsadresse = rechnungsadresse,
                anzahl = posten.anzahl, rechnung = posten,
                start = start.toString(), ende = ende.toString(),
                anbieter = anbieter(),
            ),
        )
    }

    fun rechnung(nummer: String, schluessel: String): RechnungDto? = transaction {
        val schulId = schuleZuSchluessel(schluessel) ?: return@transaction null
        val r = Rechnungen.selectAll()
            .where { (Rechnungen.nummer eq nummer) and (Rechnungen.schulId eq schulId) }
            .singleOrNull() ?: return@transaction null
        val b = Bestellungen.selectAll()
            .where { Bestellungen.nummer eq r[Rechnungen.bestellNummer] }
            .singleOrNull() ?: return@transaction null
        val (schuleDto, _) = schuleLesen(schulId) ?: return@transaction null

        RechnungDto(
            nummer = nummer, bestellnummer = r[Rechnungen.bestellNummer],
            bestellnummerKunde = b[Bestellungen.bestellnummerKunde],
            datum = r[Rechnungen.datum].toString(),
            faellig = r[Rechnungen.faellig].toString(),
            referenz = r[Rechnungen.referenz],
            bezahlt = r[Rechnungen.bezahltAm] != null,
            schule = schuleDto,
            rechnungsadresse = rechnungsadresseVon(b, schuleDto),
            anzahl = b[Bestellungen.anzahl],
            rechnung = rechne(b[Bestellungen.anzahl]),
            start = b[Bestellungen.start].toString(),
            ende = b[Bestellungen.ende].toString(),
            anbieter = anbieter(),
        )
    }

    /** Der Zahlteil als SVG — erzeugt aus denselben Daten wie das Papier. */
    fun zahlteilSvg(nummer: String, schluessel: String): String? {
        if (konfig.rechnungIban.isBlank()) return null
        val r = rechnung(nummer, schluessel) ?: return null
        val empf = r.rechnungsadresse
        val nutzlast = QrRechnung.nutzlast(
            iban = konfig.rechnungIban,
            zahlungsempfaenger = QrRechnung.Adresse(
                name = konfig.rechnungAbsender,
                strasse = konfig.rechnungStrasse,
                plz = konfig.rechnungPlz, ort = konfig.rechnungOrt,
            ),
            zahler = QrRechnung.Adresse(
                name = empf.name, strasse = empf.strasse ?: "",
                plz = empf.plz ?: "", ort = empf.ort ?: "",
            ),
            betragRappen = Math.round(r.rechnung.total * 100).toInt(),
            referenz = r.referenz,
            mitteilung = "Rechnung ${r.nummer}" +
                (r.bestellnummerKunde?.let { ", Bestellung $it" } ?: ""),
        )
        return QrRechnung.svg(nutzlast)
    }

    /* ====================================================================
       Verwaltung
       ==================================================================== */

    fun lizenzen(schluessel: String): LizenzenDto? = transaction {
        val schulId = schuleZuSchluessel(schluessel) ?: return@transaction null
        val (schuleDto, _) = schuleLesen(schulId) ?: return@transaction null
        val codes = Lizenzcodes.selectAll()
            .where { Lizenzcodes.schulId eq schulId }
            .orderBy(Lizenzcodes.code)
            .map {
                // `eingeloestVon` bleibt hier. Die Schule erfaehrt, DASS ein
                // Code eingeloest ist, nie von wem.
                LizenzcodeDto(
                    code = it[Lizenzcodes.code],
                    eingeloest = it[Lizenzcodes.eingeloestVon] != null,
                    gesperrt = it[Lizenzcodes.gesperrt],
                    klasse = it[Lizenzcodes.klasse],
                )
            }
        val spanne = Bestellungen.selectAll()
            .where { Bestellungen.schulId eq schulId }
            .orderBy(Bestellungen.erstelltAm to SortOrder.DESC)
            .firstOrNull()
        LizenzenDto(
            schule = schuleDto, codes = codes,
            start = (spanne?.get(Bestellungen.start) ?: LocalDate.now()).toString(),
            ende = (spanne?.get(Bestellungen.ende) ?: schuljahrEnde(LocalDate.now())).toString(),
        )
    }

    /**
     * Die Klassennotiz und die Sperre eines Codes.
     *
     * Die Klasse ist eine Notiz der Schule fuer sich selbst — sie haengt
     * am Code, nicht am Kind. Wir wissen nicht, wer welchen Code hat, und
     * das soll so bleiben.
     *
     * Gesperrt wird ein Code, dessen Zettel verloren ging. Der Fortschritt
     * bleibt beim Kind, weil er am Konto haengt und nicht am Code — die
     * Sperre nimmt niemandem etwas weg, sie verhindert nur, dass ein
     * Fremder den Zettel benutzt.
     */
    fun aendereCode(schluessel: String, code: String, aenderung: CodeAenderung): Boolean =
        transaction {
            val schulId = schuleZuSchluessel(schluessel) ?: return@transaction false
            val treffer = Lizenzcodes.update({
                (Lizenzcodes.code eq code) and (Lizenzcodes.schulId eq schulId)
            }) {
                aenderung.klasse?.let { k -> it[klasse] = k.take(40).ifBlank { null } }
                aenderung.gesperrt?.let { g -> it[gesperrt] = g }
            }
            treffer > 0
        }

    fun belege(schluessel: String): List<BelegDto> = transaction {
        val schulId = schuleZuSchluessel(schluessel) ?: return@transaction emptyList()
        val rechnungen = Rechnungen.selectAll()
            .where { Rechnungen.schulId eq schulId }
            .orderBy(Rechnungen.datum to SortOrder.DESC)
            .map {
                BelegDto("Rechnung", it[Rechnungen.nummer], it[Rechnungen.datum].toString(),
                    it[Rechnungen.total] / 100.0, it[Rechnungen.bezahltAm] != null)
            }
        val offerten = Offerten.selectAll()
            .where { Offerten.schulId eq schulId }
            .orderBy(Offerten.erstelltAm to SortOrder.DESC)
            .map {
                BelegDto("Offerte", it[Offerten.nummer],
                    it[Offerten.erstelltAm].toString().take(10),
                    it[Offerten.total] / 100.0, false)
            }
        rechnungen + offerten
    }

    /**
     * Der Bericht — und die Stelle, an der am meisten schiefgehen kann.
     *
     * §2.6: Die Nutzer sind minderjaehrig. Die Schule bekommt Kennzahlen
     * ueber die Gruppe, nie den Stand einer Person.
     *
     * Darum die **Mindestgruppe**: Unter fuenf eingeloesten Lizenzen gibt
     * es keinen Bericht. Bei drei Kindern ist «einer war diese Woche
     * aktiv» keine Kennzahl mehr, sondern eine Aussage ueber eine
     * bestimmte Person — und «Thema 4.02 laeuft schlecht» wird bei drei
     * Kindern zur Note eines einzelnen. Ein Schwellenwert ist die
     * einzige Verteidigung, die auch dann noch haelt, wenn spaeter
     * jemand eine Kennzahl dazunimmt, ohne an diesen Satz zu denken.
     */
    fun bericht(schluessel: String): SchulBericht? = transaction {
        val schulId = schuleZuSchluessel(schluessel) ?: return@transaction null
        val codes = Lizenzcodes.selectAll().where { Lizenzcodes.schulId eq schulId }.toList()
        val eingeloest = codes.count { it[Lizenzcodes.eingeloestVon] != null }

        if (eingeloest < MINDESTGRUPPE) {
            return@transaction SchulBericht(
                lizenzen = codes.size, eingeloest = eingeloest,
                aktivLetzteWoche = 0, pflichtaufgabenWoche = 0,
                zeitraum = kalenderwoche(),
                schwacheThemen = emptyList(),
                hinweis = "Ab $MINDESTGRUPPE eingelösten Lizenzen erscheinen hier " +
                    "Kennzahlen. Vorher wären es keine Zahlen über die Gruppe mehr, " +
                    "sondern Aussagen über einzelne Kinder — und die sieht die Schule nie.",
            )
        }

        val nutzer = codes.mapNotNull { it[Lizenzcodes.eingeloestVon] }
        val seit = Instant.now().minusSeconds(7 * 86400L)
        val aktiv = Versuche
            .select(Versuche.nutzerId)
            .where { (Versuche.nutzerId inList nutzer) and (Versuche.zeitpunkt greater seit) }
            .withDistinct()
            .count().toInt()

        // Die Themen mit der hoechsten Fehlerquote in der Gruppe. Das ist
        // die Angabe, die den Unterricht wirklich veraendert — und sie ist
        // zusammengefasst.
        val schwach = Versuche.selectAll()
            .where { (Versuche.nutzerId inList nutzer) and (Versuche.zeitpunkt greater seit) }
            .groupBy { Triple(it[Versuche.fach], it[Versuche.unterthema], it[Versuche.lernzielId]) }
            .filter { (_, zeilen) -> zeilen.size >= MINDESTVERSUCHE }
            .map { (schluessel3, zeilen) ->
                val quote = 100 * zeilen.count { !it[Versuche.richtig] } / zeilen.size
                SchwachesThema(
                    fach = schluessel3.first, code = schluessel3.second,
                    name = Katalog.unterthema(schluessel3.first, schluessel3.second)?.name
                        ?: schluessel3.second,
                    oberthema = Katalog.oberthemaVon(schluessel3.first, schluessel3.second)?.name,
                    fehlerquote = quote,
                )
            }
            .sortedByDescending { it.fehlerquote }
            .take(6)

        val versucheWoche = Versuche
            .selectAll()
            .where { (Versuche.nutzerId inList nutzer) and (Versuche.zeitpunkt greater seit) }
            .count().toInt()

        SchulBericht(
            lizenzen = codes.size, eingeloest = eingeloest,
            aktivLetzteWoche = aktiv,
            pflichtaufgabenWoche = if (aktiv > 0) versucheWoche / aktiv else 0,
            zeitraum = kalenderwoche(),
            schwacheThemen = schwach,
            hinweis = "Alle Zahlen beziehen sich auf die ganze Gruppe. Einzelne " +
                "Schülerinnen und Schüler sind hier nicht sichtbar — auch nicht " +
                "für die Schule.",
        )
    }

    /**
     * Einen Code einloesen.
     *
     * Der Fortschritt haengt am Konto, nicht am Code: Geht ein Blatt
     * verloren und die Schule gibt einen neuen Code aus, bleibt alles
     * Gelernte beim Kind.
     */
    fun loeseCodeEin(nutzerId: String, roh: String): LocalDate? = transaction {
        val code = roh.trim().uppercase()
        val zeile = Lizenzcodes.selectAll().where { Lizenzcodes.code eq code }.singleOrNull()
            ?: return@transaction null
        if (zeile[Lizenzcodes.gesperrt]) return@transaction null
        if (zeile[Lizenzcodes.eingeloestVon] != null) return@transaction null
        Lizenzcodes.update({ Lizenzcodes.code eq code }) {
            it[eingeloestVon] = nutzerId
            it[eingeloestAm] = Instant.now()
        }
        zeile[Lizenzcodes.gueltigBis]
    }

    /* ====================================================================
       Werkzeug
       ==================================================================== */

    fun anbieter(): AnbieterDto {
        // Sichtbare Platzhalter statt erfundener Werte: Ein Impressum mit
        // falscher Adresse ist schlimmer als eines, dem man ansieht, dass
        // es noch nicht fertig ist (`app/start/agb.md` haelt es genauso).
        fun oder(wert: String, platzhalter: String) =
            wert.ifBlank { platzhalter }
        return AnbieterDto(
            name = konfig.rechnungAbsender,
            zusatz = konfig.rechnungZusatz.ifBlank { "[Firma und Rechtsform]" },
            strasse = oder(konfig.rechnungStrasse, "[Strasse und Nummer]"),
            plzOrt = oder("${konfig.rechnungPlz} ${konfig.rechnungOrt}".trim(), "[PLZ Ort]"),
            // Ohne MWST-Pflicht gibt es keine MWST-Nummer. Der Platzhalter
            // «[CHE-000.000.000 MWST]» auf einer Rechnung, die gar keine
            // Steuer ausweist, behauptet eine Registrierung, die es nicht
            // gibt — schlimmer als eine fehlende Zeile.
            uid = if (konfig.mwstSatz == 0.0) konfig.rechnungUid
                  else oder(konfig.rechnungUid, "[CHE-000.000.000 MWST]"),
            iban = oder(konfig.rechnungIban, "[CH00 0000 0000 0000 0000 0]"),
            email = konfig.rechnungEmail,
        )
    }

    /** Das Ende des Schuljahrs: der 31. Juli. Wer im Mai bestellt, bekaeme
     *  sonst zwei Monate — darum laeuft eine Lizenz, die spaet im
     *  Schuljahr beginnt, bis zum Juli des Folgejahres. */
    fun schuljahrEnde(start: LocalDate): LocalDate {
        val ende = LocalDate.of(start.year, Month.JULY, 31)
        return if (start.isAfter(ende.minusDays(150))) ende.plusYears(1) else ende
    }

    private fun neuerSchluessel(): String =
        (1..12).map { ZEICHEN[zufall.nextInt(ZEICHEN.length)] }.joinToString("")

    private fun neuerCode(): String {
        val kern = (1..8).map { ZEICHEN[zufall.nextInt(ZEICHEN.length)] }.joinToString("")
        return "SSW-${kern.take(4)}-${kern.drop(4)}"
    }

    private fun hash(s: String): String =
        MessageDigest.getInstance("SHA-256").digest(s.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private fun schuleZuSchluessel(schluessel: String): String? =
        Schulen.selectAll().where { Schulen.schluesselHash eq hash(schluessel.trim()) }
            .singleOrNull()?.get(Schulen.id)

    private fun schuleLesen(schulId: String): Pair<AdresseDto, KontaktDto>? {
        val z = Schulen.selectAll().where { Schulen.id eq schulId }.singleOrNull() ?: return null
        return AdresseDto(
            name = z[Schulen.name], strasse = z[Schulen.strasse],
            plz = z[Schulen.plz], ort = z[Schulen.ort],
            kanton = z[Schulen.kanton], land = z[Schulen.land],
        ) to KontaktDto(
            vorname = z[Schulen.kontaktVorname], nachname = z[Schulen.kontaktNachname],
            funktion = z[Schulen.kontaktFunktion], email = z[Schulen.kontaktEmail],
            telefon = z[Schulen.kontaktTelefon],
        )
    }

    private fun legeSchuleAn(schule: AdresseDto, kontakt: KontaktDto, schluessel: String): String {
        val id = UUID.randomUUID().toString()
        Schulen.insert {
            it[Schulen.id] = id
            it[schluesselHash] = hash(schluessel)
            it[name] = schule.name
            it[strasse] = schule.strasse ?: ""
            it[plz] = schule.plz ?: ""
            it[ort] = schule.ort ?: ""
            it[kanton] = schule.kanton
            it[land] = schule.land
            it[kontaktVorname] = kontakt.vorname
            it[kontaktNachname] = kontakt.nachname
            it[kontaktFunktion] = kontakt.funktion
            it[kontaktEmail] = kontakt.email
            it[kontaktTelefon] = kontakt.telefon
            it[erstelltAm] = Instant.now()
        }
        return id
    }

    private fun rechnungsadresseVon(b: ResultRow, schule: AdresseDto): AdresseDto =
        b[Bestellungen.reName]?.let {
            AdresseDto(name = it, zusatz = b[Bestellungen.reZusatz],
                strasse = b[Bestellungen.reStrasse], plz = b[Bestellungen.rePlz],
                ort = b[Bestellungen.reOrt])
        } ?: schule

    /** «OFF-2026-0007». Die Jahreszahl gehoert hinein: Eine Buchhaltung
     *  legt nach Jahren ab, und eine Nummer ohne Jahr zwingt sie, in der
     *  Rechnung nachzuschauen. */
    private fun neueNummer(praefix: String, tabelle: Table, spalte: Column<String>): String {
        val jahr = LocalDate.now().year
        val bisher = tabelle.selectAll()
            .where { spalte like "$praefix-$jahr-%" }
            .count().toInt()
        return "$praefix-$jahr-${(bisher + 1).toString().padStart(4, '0')}"
    }

    private fun kalenderwoche(): String {
        val w = LocalDate.now().get(WeekFields.of(Locale.GERMAN).weekOfWeekBasedYear())
        return "KW $w"
    }

    private fun fehlt(was: String): Nothing = throw Abgelehnt(was)

    /** Eine Bitte, die so nicht erfuellbar ist — mit einem Satz, den man
     *  einer Schulsekretaerin zeigen kann. */
    class Abgelehnt(text: String) : RuntimeException(text)

    private companion object {
        /** Ohne I, O, 1 und 0 — wer einen Code von einem Blatt abtippt,
         *  verwechselt sie sonst, und dann ruft die Schule an. */
        const val ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        const val OFFERTE_GUELTIG_TAGE = 30
        /** Unter so vielen eingeloesten Lizenzen gibt es keinen Bericht. */
        const val MINDESTGRUPPE = 5
        /** Ein Thema mit zwei Versuchen hat keine Fehlerquote, sondern
         *  einen Zufall. */
        const val MINDESTVERSUCHE = 8

        val STAFFEL = listOf(
            PreisStufe(ab = 1, preis = 89, name = "Einzelne Klasse"),
            PreisStufe(ab = 20, preis = 69, name = "Zwei Klassen"),
            PreisStufe(ab = 50, preis = 55, name = "Ganze Stufe"),
            PreisStufe(ab = 200, preis = 45, name = "Ganze Schule"),
        )
    }
}
