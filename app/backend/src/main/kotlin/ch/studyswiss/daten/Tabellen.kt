package ch.studyswiss.daten

import org.jetbrains.exposed.dao.id.LongIdTable
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import org.jetbrains.exposed.sql.javatime.date

object Nutzers : Table("nutzer") {
    val id = varchar("id", 36)
    val anbieter = varchar("anbieter", 10)
    val fremdId = varchar("fremd_id", 255)
    val email = varchar("email", 255).nullable()
    val vorname = varchar("vorname", 60).nullable()
    val kanton = varchar("kanton", 4).nullable()
    val schultyp = varchar("schultyp", 30).nullable()
    val pruefungsdatum = date("pruefungsdatum").nullable()
    val elternFreigabe = bool("eltern_freigabe").default(false)
    val plusBis = timestamp("plus_bis").nullable()
    val erstelltAm = timestamp("erstellt_am")
    override val primaryKey = PrimaryKey(id)
    init { uniqueIndex("nutzer_anbieter_fremd", anbieter, fremdId) }
}

object RefreshTokens : Table("refresh_token") {
    val token = varchar("token", 64)
    val nutzerId = varchar("nutzer_id", 36).index()
    val laeuftAb = timestamp("laeuft_ab")
    val zurueckgezogen = bool("zurueckgezogen").default(false)
    override val primaryKey = PrimaryKey(token)
}

object Versuche : LongIdTable("versuch") {
    val nutzerId = varchar("nutzer_id", 36).index()
    val aufgabeRef = varchar("aufgabe_ref", 120)
    val lernzielId = varchar("lernziel_id", 20)
    val unterthema = varchar("unterthema", 10)
    val fach = varchar("fach", 30)
    val richtig = bool("richtig")
    val diagnoseId = varchar("diagnose_id", 60).nullable()
    val hinweiseGenutzt = integer("hinweise_genutzt").default(0)
    val quelle = varchar("quelle", 20)
    val zeitpunkt = timestamp("zeitpunkt")
    init { index(false, nutzerId, fach, unterthema) }
}

/** Ein laufendes oder abgeschlossenes Set: Uebung, Standort oder Selbsttest. */
object Sets : Table("set") {
    val id = varchar("id", 36)
    val nutzerId = varchar("nutzer_id", 36).index()
    val art = varchar("art", 20)
    val fach = varchar("fach", 30).nullable()
    val unterthema = varchar("unterthema", 10).nullable()
    val umfang = varchar("umfang", 30).nullable()
    /** Die Aufgabenliste als «templateId:seed», mit Komma getrennt. Mehr
     *  braucht es nicht: Aus Ref und Template ist die Aufgabe herstellbar. */
    val refs = text("refs")
    val begonnen = timestamp("begonnen")
    val beendet = timestamp("beendet").nullable()
    val punkte = integer("punkte").nullable()
    val maximum = integer("maximum").nullable()
    override val primaryKey = PrimaryKey(id)
}

object Aufsaetze : Table("aufsatz") {
    val id = varchar("id", 36)
    val nutzerId = varchar("nutzer_id", 36).index()
    val themaId = integer("thema_id")
    val text = text("text")
    val korrektur = text("korrektur").nullable()
    val geaendert = timestamp("geaendert")
    override val primaryKey = PrimaryKey(id)
}

object Abos : Table("abo") {
    val nutzerId = varchar("nutzer_id", 36)
    val plattform = varchar("plattform", 10)
    val produktId = varchar("produkt_id", 80)
    val originalId = varchar("original_id", 120)
    val laeuftAb = timestamp("laeuft_ab")
    val geprueftAm = timestamp("geprueft_am")
    override val primaryKey = PrimaryKey(nutzerId, plattform)

    /**
     * Eine Quittung gehoert genau einem Konto.
     *
     * Ohne diesen Index liess sich dieselbe Apple-Transaktion beziehungsweise
     * derselbe Play-`purchaseToken` von beliebig vielen Konten einloesen: Der
     * Store bestaetigt nur, DASS es den Kauf gibt, nicht WEM er gehoert. Wer
     * den JWS aus seiner App auslas und weitergab, verschaffte jedem
     * Empfaenger Plus fuer einen einzigen Kauf.
     */
    init { uniqueIndex("abo_plattform_original", plattform, originalId) }
}

/**
 * Der Familien-Pass erzeugt Codes zum Weitergeben. Ein Code gilt genau einmal;
 * wer ihn einlöst, bekommt Plus bis zur **eigenen** Prüfung, nicht bis zu der
 * des Geschwisters.
 */
object Familiencodes : Table("familiencode") {
    val code = varchar("code", 12)
    val besitzerId = varchar("besitzer_id", 36).index()
    val eingeloestVon = varchar("eingeloest_von", 36).nullable()
    val eingeloestAm = timestamp("eingeloest_am").nullable()
    val erstelltAm = timestamp("erstellt_am")
    val laeuftAb = timestamp("laeuft_ab")
    override val primaryKey = PrimaryKey(code)
}

/* ======================================================================
   Schulen
   ======================================================================
   Eine Schule ist kein Nutzer. Sie meldet sich nicht mit Apple oder
   Google an, sondern mit einem Verwaltungsschluessel, den sie mit der
   Bestellbestaetigung bekommt — eine Schulsekretaerin soll dafuer kein
   Konto anlegen muessen, und ein Passwort, das drei Leute im Sekretariat
   teilen, ist ohnehin keines.

   Darum auch kein `nutzer_id` an diesen Tabellen: Die Schule und die
   Kinder, die ihre Codes einloesen, sind absichtlich nicht verbunden.
   Wer die Verbindung zoege, koennte sagen, welches Kind wie weit ist —
   und genau das darf die Schule nicht sehen (§2.6).
   ==================================================================== */

object Schulen : Table("schule") {
    val id = varchar("id", 36)
    /** Der Verwaltungsschluessel. Gehasht, wie ein Passwort: Wer die
     *  Datenbank liest, soll damit keine fremde Schule oeffnen koennen. */
    val schluesselHash = varchar("schluessel_hash", 64).uniqueIndex()
    val name = varchar("name", 160)
    val strasse = varchar("strasse", 160)
    val plz = varchar("plz", 10)
    val ort = varchar("ort", 100)
    val kanton = varchar("kanton", 4).nullable()
    val land = varchar("land", 60).default("Schweiz")
    val kontaktVorname = varchar("kontakt_vorname", 60)
    val kontaktNachname = varchar("kontakt_nachname", 60)
    val kontaktFunktion = varchar("kontakt_funktion", 90).nullable()
    val kontaktEmail = varchar("kontakt_email", 255)
    val kontaktTelefon = varchar("kontakt_telefon", 40).nullable()
    val erstelltAm = timestamp("erstellt_am")
    override val primaryKey = PrimaryKey(id)
}

/** Eine Offerte ist noch keine Bestellung — sie bindet niemanden und
 *  laeuft nach dreissig Tagen ab. Sie steht trotzdem in der Datenbank,
 *  weil die Schulleitung sie Wochen spaeter ueber ihren Link wieder
 *  aufruft. */
object Offerten : Table("offerte") {
    val nummer = varchar("nummer", 24)
    val schulId = varchar("schul_id", 36).index()
    val anzahl = integer("anzahl")
    val einzelpreis = integer("einzelpreis_rappen")
    val netto = integer("netto_rappen")
    val mwst = integer("mwst_rappen")
    val total = integer("total_rappen")
    val mwstSatz = double("mwst_satz")
    val start = date("start")
    val ende = date("ende")
    val bemerkung = text("bemerkung").nullable()
    val erstelltAm = timestamp("erstellt_am")
    val gueltigBis = timestamp("gueltig_bis")
    override val primaryKey = PrimaryKey(nummer)
}

object Bestellungen : Table("bestellung") {
    val nummer = varchar("nummer", 24)
    val schulId = varchar("schul_id", 36).index()
    val ausOfferte = varchar("aus_offerte", 24).nullable()
    val anzahl = integer("anzahl")
    val einzelpreis = integer("einzelpreis_rappen")
    val netto = integer("netto_rappen")
    val mwst = integer("mwst_rappen")
    val total = integer("total_rappen")
    val mwstSatz = double("mwst_satz")
    val start = date("start")
    val ende = date("ende")
    /** Die Bestellnummer der Schule. Ohne sie bleibt eine Rechnung in
     *  mancher Verwaltung liegen, und niemand weiss, warum. */
    val bestellnummerKunde = varchar("bestellnummer_kunde", 60).nullable()
    val versandart = varchar("versandart", 20).default("email")
    val rechnungsEmail = varchar("rechnungs_email", 255).nullable()
    /* Die Rechnungsadresse steht hier und nicht bei der Schule: Oft zahlt
       die Gemeinde, und deren Kreditorenbuchhaltung hat eine andere
       Adresse als das Schulhaus. */
    val reName = varchar("re_name", 160).nullable()
    val reZusatz = varchar("re_zusatz", 160).nullable()
    val reStrasse = varchar("re_strasse", 160).nullable()
    val rePlz = varchar("re_plz", 10).nullable()
    val reOrt = varchar("re_ort", 100).nullable()
    val erstelltAm = timestamp("erstellt_am")
    override val primaryKey = PrimaryKey(nummer)
}

object Rechnungen : Table("rechnung") {
    val nummer = varchar("nummer", 24)
    val bestellNummer = varchar("bestell_nummer", 24).index()
    val schulId = varchar("schul_id", 36).index()
    /** Die 27-stellige QR-Referenz mit Pruefziffer. Sie ist der Schluessel,
     *  mit dem die Bank die Zahlung dem Auftrag zuordnet. */
    val referenz = varchar("referenz", 27).uniqueIndex()
    val total = integer("total_rappen")
    val datum = date("datum")
    val faellig = date("faellig")
    val bezahltAm = timestamp("bezahlt_am").nullable()
    override val primaryKey = PrimaryKey(nummer)
}

/** Ein Code je Lizenz. Er traegt bewusst keinen Namen und keine Klasse
 *  des Kindes — die Klasse ist eine Notiz der Schule fuer sich selbst. */
object Lizenzcodes : Table("lizenzcode") {
    val code = varchar("code", 20)
    val schulId = varchar("schul_id", 36).index()
    val bestellNummer = varchar("bestell_nummer", 24).index()
    val gueltigBis = date("gueltig_bis")
    val klasse = varchar("klasse", 40).nullable()
    val gesperrt = bool("gesperrt").default(false)
    /** Wer den Code eingeloest hat. Diese Spalte wird der Schule NIE
     *  ausgeliefert — sie dient allein dazu, einen Code nur einmal
     *  einloesen zu lassen. */
    val eingeloestVon = varchar("eingeloest_von", 36).nullable()
    val eingeloestAm = timestamp("eingeloest_am").nullable()
    override val primaryKey = PrimaryKey(code)
}
