package ch.studyswiss.model

import kotlinx.serialization.Serializable

/* ---- Auth ---- */
@Serializable data class AppleAnmeldung(val identityToken: String, val nonce: String, val vorname: String? = null)
@Serializable data class GoogleAnmeldung(val idToken: String)
@Serializable data class GastAnmeldung(val geraeteId: String)
@Serializable data class RefreshBitte(val refreshToken: String)
@Serializable data class Sitzung(
    val accessToken: String,
    val refreshToken: String,
    val gueltigSekunden: Long,
    val nutzer: ProfilDto,
)

/* ---- Katalog ----
   Zwei Ebenen: Ein Pruefungsfach ist Mathematik oder Deutsch; darunter liegen
   die Bereiche. Der Client baut daraus die Navigation unter «Lernen»,
   «Selbsttest» und «Fortschritt» — ueberall dieselbe Ordnung. */
@Serializable data class FaecherAntwort(
    val faecher: List<Pruefungsfach>,
    val bereiche: List<Bereich>,
)

/** Ein Fach zur Auswahl, mit dem, was daran haengt. */
@Serializable data class FachWahl(
    val fach: String,
    val name: String,
    val untertitel: String,
    val icon: String,
    /** Wie viele Unterthemen es in diesem Fach mit Aufgaben gibt. */
    val themen: Int,
    /** Die Kurznamen der Bereiche: «Sprachbetrachtung · Textverstaendnis». */
    val bereiche: List<String>,
    /**
     * Die KENNUNGEN aller Bereiche dieses Fachs — den Aufsatz eingeschlossen.
     *
     * `bereiche` daneben nennt nur die mit Themenbaum, weil es um Zaehlungen
     * geht. Die App braucht aber auch den Aufsatz: An der FMS Bern besteht
     * die ganze Deutschpruefung aus einem Text, und ohne diese Liste haette
     * der Screen dort nichts anzuzeigen.
     */
    val bereichIds: List<String> = emptyList(),
)

/* ---- Profil ---- */
@Serializable data class ProfilDto(
    val id: String,
    val vorname: String?,
    val anbieter: String,
    val kanton: String?,
    val schultyp: String?,
    val pruefungsdatum: String?,
    val tageBisPruefung: Int?,
    val elternFreigabe: Boolean,
    val plus: Boolean,
    val onboardingFertig: Boolean,
)
@Serializable data class ProfilAenderung(
    val vorname: String? = null,
    val kanton: String? = null,
    val schultyp: String? = null,
    val pruefungsdatum: String? = null,
)

/* ---- Aufgaben ----
   Die Aufgabe reist NIE mit ihrer Loesung. Der Client bekommt `ref`, Stamm,
   Optionen und die Anzahl Hinweise; bewertet wird auf dem Server. */
@Serializable data class AufgabeDto(
    val ref: String,
    val fach: String,
    val unterthema: String,
    val unterthemaName: String,
    val format: String,
    val stamm: String,
    val einheit: String?,
    val optionen: List<OptionDto>,
    val hinweiseVerfuegbar: Int,
    /** MARKIEREN und KOMMAS: der Satz in Woerter zerlegt. Der Client zeigt
     *  sie einzeln antippbar an; die Loesung bleibt auf dem Server. */
    val woerter: List<String> = emptyList(),
    /** Wie viele Woerter zu markieren sind. Ohne diese Zahl wuesste niemand,
     *  wann er fertig ist — die Loesung verraet sie trotzdem nicht. */
    val anzahlGesucht: Int = 0,

    /* --- die neuen Formate -------------------------------------------
       Alles hier ist das, was der Schueler SIEHT. Keine Loesung, keine
       Sollreihenfolge, keine gesetzten Punkte — die bleiben im Server,
       und bewertet wird nur in POST /antwort. Wer hier ein Loesungsfeld
       ergaenzt, gibt die Antworten an jeden weiter, der die Antwort des
       Servers mitlesen kann. */
    /** MEHRFELD: die Antwortfelder, ohne ihre Loesungen. */
    val felder: List<FeldDto> = emptyList(),
    /** GITTER: der Rahmen und die zu setzenden Punkte. */
    val gitter: GitterDto? = null,
    /** ZUORDNEN: Ziele in fester, Elemente in gemischter Reihenfolge. */
    val ziele: List<OptionDto> = emptyList(),
    val elemente: List<OptionDto> = emptyList(),
    /** SORTIEREN: die Elemente in der Startmischung. */
    val zuOrdnen: List<OptionDto> = emptyList(),
    /** WERTETABELLE: die Spaltenkoepfe und die Anzahl auszufuellender Zeilen. */
    val tabelle: TabelleDto? = null,
    /** FAERBEN: nur die Rastergroesse — wie viele Felder es sind, waere ein Hinweis. */
    val raster: RasterDto? = null,
    /** TABELLE_AUSWAHL: je Zeile ein Satz. Gewaehlt wird aus `optionen`. */
    val zeilen: List<OptionDto> = emptyList(),
    /** Eine Tabelle ueber der Aufgabe, etwa ein Bauplan. */
    val darstellung: DarstellungDto? = null,
    /** Beim Textverstaendnis der Lesetext, auf den sich die Frage bezieht.
     *  Er steht ueber der Aufgabe und wiederholt sich ueber einen ganzen
     *  Block — ein Text, viele Fragen, wie in der Pruefung. */
    val lesetext: String? = null,
    /** Das Unterthema, klein ueber der Aufgabe: «Bruchrechnen», «Satzglieder».
     *  Kurz, damit die Aufgabe selbst im Blick bleibt. */
    val themaKurz: String = "",
)
@Serializable data class OptionDto(val id: String, val text: String)
/**
 * Ein Eingabefeld einer Mehrfeldaufgabe.
 *
 * `text` sagt, ob eine Wortantwort erwartet wird oder eine Zahl — davon
 * haengt die Tastatur ab, die auf dem Telefon aufgeht. Die App entschied das
 * frueher an der Kennung des Bereichs: alles ausser «mathematik» galt als
 * Text. Damit bekam der erste Kanton mit einem eigenen Mathematikbereich —
 * «mathematik-bern» — eine Buchstabentastatur fuer Zahlenfelder. Die Aufgabe
 * weiss es selbst; sie soll es auch sagen.
 */
@Serializable data class FeldDto(
    val name: String, val label: String, val einheit: String,
    val text: Boolean = false,
)
@Serializable data class GitterPunktDto(val name: String, val label: String)
@Serializable data class GitterMarkeDto(val text: String, val x: Double, val y: Double)
@Serializable data class GitterStreckeDto(
    val text: String, val stil: String,
    val vonX: Double, val vonY: Double, val bisX: Double, val bisY: Double,
)
@Serializable data class GitterDto(
    val xvon: Double, val xbis: Double, val yvon: Double, val ybis: Double,
    val punkte: List<GitterPunktDto>,
    val vorgabe: List<GitterMarkeDto> = emptyList(),
    val strecken: List<GitterStreckeDto> = emptyList(),
)
@Serializable data class TabellenspalteDto(
    val name: String, val kopf: String, val von: Double, val bis: Double,
)
@Serializable data class TabelleDto(val spalten: List<TabellenspalteDto>, val zeilen: Int)
@Serializable data class RasterDto(val spalten: Int, val zeilen: Int)
@Serializable data class DarstellungDto(
    val typ: String, val kopf: List<String>, val zeilen: List<List<String>>,
)

@Serializable data class Antwort(
    val aufgabeRef: String,
    /** Freitext bei Zahlen- und Lueckenaufgaben. */
    val eingabe: String = "",
    /** Einfachauswahl. */
    val optionId: String? = null,
    /** Mehrfachauswahl. */
    val optionIds: List<String> = emptyList(),
    /** MARKIEREN und KOMMAS: die angetippten Wortstellen. */
    val stellen: List<Int> = emptyList(),

    /* --- die neuen Formate ------------------------------------------- */
    /** MEHRFELD: Feldname → das, was im Feld steht. */
    val felder: Map<String, String> = emptyMap(),
    /** TABELLE_AUSWAHL: Zeilennummer → gewählte Option. */
    val zeilen: Map<Int, String> = emptyMap(),
    /** GITTER: Punktname → gesetzte Koordinate. */
    val punkte: Map<String, List<Double>> = emptyMap(),
    /** ZUORDNEN: Zielnummer → Elementnummer. */
    val zuordnung: Map<Int, Int> = emptyMap(),
    /** SORTIEREN: die Elementnummern in der gelegten Reihenfolge. */
    val reihenfolge: List<Int> = emptyList(),
    /** WERTETABELLE: die eingetragenen Zahlenpaare. */
    val paare: List<List<Int>> = emptyList(),
    /** FAERBEN: die eingefärbten Rasterfelder. */
    val gefaerbt: List<Int> = emptyList(),
)

@Serializable data class Rueckmeldung(
    val richtig: Boolean,
    /** Bei falscher Antwort: der Satz, der den Denkfehler benennt. Nie «Das ist falsch». */
    val feedback: String,
    val diagnoseId: String?,
    val loesung: String,
    val loesungsweg: List<String>,
    val geloestImThema: Int,
    val pflichtset: Int,
    /** Bei einer Mehrfeld-Aufgabe: die Namen der Felder, die noch nicht
     *  stimmen. Nur diese werden in der App rot — wer drei von vier richtig
     *  hat, soll das auch sehen. */
    val feldFehler: List<String> = emptyList(),
)

@Serializable data class HinweisBitte(val aufgabeRef: String, val stufe: Int)
@Serializable data class HinweisDto(val stufe: Int, val text: String, val weitere: Boolean)

/* ---- Uebung ---- */
@Serializable data class Vorschlag(
    val unterthema: String,
    val name: String,
    val oberthema: String,
    val fach: String,
    /** Warum gerade dieses Thema. Steht so im Screen «Zuerst dran». */
    val begruendung: String,
    val geloest: Int,
    val pflichtset: Int,
)
@Serializable data class VorschlagsListe(
    val zuerst: Vorschlag?,
    val danach: Vorschlag?,
    val hinweis: String = "Die Reihenfolge rechnet sich nach jeder Übung neu.",
)
@Serializable data class UebungStart(val unterthema: String? = null, val fach: String? = null, val anzahl: Int = 10)
@Serializable data class UebungDto(
    val id: String,
    val unterthema: String,
    val unterthemaName: String,
    val einfuehrung: Einfuehrung,
    val aufgaben: List<AufgabeDto>,
)
@Serializable data class Einfuehrung(
    val titel: String = "Einführung in den Aufgabenblock",
    val stamm: String,
    val loesungsweg: List<String>,
    val tipp: String,
)
@Serializable data class UebungErgebnis(
    val richtig: Int,
    val total: Int,
    val verpasst: List<String>,
    val neuGeloest: Int,
    val themaAbgeschlossen: Boolean,
)

/* ---- Standortbestimmung ---- */
@Serializable data class StandortDto(
    val id: String,
    val fach: String,
    val fachName: String,
    val aufgaben: List<AufgabeDto>,
    val minuten: Int = 25,
)
@Serializable data class Startpunkt(
    val fach: String?,
    val fachName: String?,
    val sitzen: Int,
    val zuerstUeben: Int,
    val offen: Int,
    /**
     * Die Themen mit der hoechsten Fehlerquote im Test — als Empfehlung, nicht
     * als Reihenfolge.
     *
     * Hier stand eine Rangliste mit den Plaetzen 1 bis 3. Sie versprach mehr,
     * als die Standortbestimmung belegen kann: Eine verbindliche Reihenfolge
     * legt erst der Lernpfad fest. Was der Test zeigt, ist, wo es gehakt hat.
     */
    val empfehlungen: List<Vorschlag>,
    val sitzenListe: List<Vorschlag>,
    /** Ausdruecklich: keine Note, keine Niveau-Einstufung. */
    val hinweis: String = "Die Standortbestimmung gibt keine Note. Sie zeigt dir, " +
        "welche Themen du bereits gut beherrschst und welche du noch üben solltest.",
)

/* ---- Selbsttest ---- */
@Serializable data class SelbsttestStart(val fach: String, val umfang: String, val themen: List<String> = emptyList())
@Serializable data class SelbsttestDto(
    val id: String,
    /** Das Pruefungsfach — «deutsch», nicht «sprachbetrachtung». */
    val fach: String,
    val fachName: String,
    val umfang: String,
    val minuten: Int,
    /** Was gilt: Taschenrechner, Zurueckblaettern, ob die Uhr pausiert.
     *  Kommt aus dem Katalog des Schultyps, nicht aus dem Screen. */
    val bedingungen: Bedingungen,
    val aufgaben: List<AufgabeDto>,
)
@Serializable data class SelbsttestErgebnis(
    val id: String,
    val punkte: Int,
    val maximum: Int,
    val proOberthema: List<OberthemaErgebnis>,
    val fehlerRefs: List<String>,
)
@Serializable data class OberthemaErgebnis(val name: String, val erreicht: Int, val moeglich: Int)
@Serializable data class Versuchsliste(val versuche: List<VersuchZeile>)
@Serializable data class VersuchZeile(val id: String, val fach: String, val umfang: String, val datum: String, val punkte: Int, val maximum: Int)

/* ---- Lernpfad ----
   Wird bei jedem Aufruf neu gerechnet. Es gibt keinen gespeicherten Plan,
   der veralten koennte — eine ausgelassene Woche verteilt sich von selbst. */
@Serializable data class LernpfadDto(
    val aktiv: Boolean,
    /** Warum es keinen Pfad gibt — nur gesetzt, wenn `aktiv` falsch ist. */
    val grund: String? = null,
    val etappen: List<LernpfadEtappe>,
    val wochen: List<LernpfadWoche>,
    val pensumDieseWoche: Int,
    val geloestDieseWoche: Int = 0,
    val offenTotal: Int,
    val wochenBisPruefung: Int,
    val hinweis: String = "",
)
@Serializable data class LernpfadEtappe(
    val nummer: Int, val titel: String, val beschreibung: String,
    val abgeschlossen: Int, val total: Int,
    /** `null`, wenn fuer diesen Abschnitt keine Woche mehr uebrig ist —
     *  etwa wenn die Pruefung in drei Wochen ist. Der Screen zeigt ihn
     *  dann ohne Zeitangabe, statt «Woche 3–1» zu behaupten. */
    val vonWoche: Int? = null, val bisWoche: Int? = null,
)
@Serializable data class LernpfadWoche(
    val nummer: Int, val titel: String, val von: String, val bis: String,
    val istDieseWoche: Boolean, val istVergangen: Boolean, val istPruefungsform: Boolean,
    val pensum: Int, val geloest: Int,
    val themen: List<LernpfadThema>,
    /** Steht statt der Themenliste, wenn die Woche keine neuen Themen hat. */
    val auftrag: String? = null,
)
@Serializable data class LernpfadThema(
    val unterthema: String, val name: String, val fach: String, val fachName: String,
    val oberthema: String, val aufgaben: Int,
)

/* ---- Fortschritt ---- */
@Serializable data class FortschrittDto(
    val themenAbgeschlossen: Int,
    val themenTotal: Int,
    val faecher: List<FachZeile>,
    val verlauf: List<WocheDto>,
    val aussage: String,
    val staerkstes: ThemenZeile?,
    val schwaechstes: ThemenZeile?,
)
@Serializable data class FachZeile(
    val fach: String,
    val name: String,
    val abgeschlossen: Int,
    val total: Int,
    val pflichtGeloest: Int,
    val pflichtTotal: Int,
    /** Die Bereiche darunter — bei Deutsch Sprachbetrachtung und
     *  Textverstaendnis. Bei Mathematik genau einer. */
    val bereiche: List<BereichZeile> = emptyList(),
    /** Alle Bereichskennungen dieses Fachs, den Aufsatz eingeschlossen.
     *  Siehe `FachWahl.bereichIds`. */
    val bereichIds: List<String> = emptyList(),
)
@Serializable data class BereichZeile(
    val bereich: String,
    val name: String,
    val kurzname: String,
    val abgeschlossen: Int,
    val total: Int,
    val pflichtGeloest: Int,
    val pflichtTotal: Int,
    /** `themenbaum`, `aufsatz` oder `tipps`.
     *
     *  Ohne diese Angabe kann kein Client die Bereiche eines Fachs
     *  richtig anbieten: Der Aufsatz fuehrt zur Schreibflaeche, eine
     *  Tipps-Seite zum Ablauf, und nur ein Themenbaum zu Aufgaben. Sie
     *  fehlte, und die Liste enthielt ausserdem nur die Bereiche MIT
     *  Baum — der Aufsatz kam darin gar nicht vor, obwohl er an der
     *  FMS Bern die ganze Deutschpruefung ist. */
    val art: String = "themenbaum",
)
@Serializable data class WocheDto(val label: String, val quote: Int, val versuche: Int)
@Serializable data class ThemenZeile(val unterthema: String, val name: String, val fach: String, val fachName: String, val quote: Int, val versuche: Int, val zeitraum: String)

/* ---- Fehlerarchiv ---- */
@Serializable data class FehlerGruppe(val unterthema: String, val name: String, val fach: String, val eintraege: List<FehlerEintrag>)
@Serializable data class FehlerEintrag(val aufgabeRef: String, val stamm: String, val denkfehler: String, val feedback: String, val datum: String)

/* ---- Eltern ---- */
@Serializable data class ElternReport(
    val vorname: String?,
    val zeitraum: String,
    val kennzahlen: List<Kennzahl>,
    val hinweis: String = "Alle Zahlen beziehen sich auf dieselbe Woche. Aufsätze und einzelne Aufgaben sind nicht enthalten.",
)
@Serializable data class Kennzahl(val titel: String, val wert: String, val fach: String, val zeitraum: String)
@Serializable data class Freigabe(val aktiv: Boolean)

/* ---- Aufsatz ---- */
@Serializable data class AufsatzThema(val id: Int, val slot: String, val sorte: String, val titel: String, val auftrag: String, val teile: List<String>)
/** Eine Aufsatzart auf dem Auswahl-Screen: erst die Art, dann das Thema. */
@Serializable data class AufsatzartDto(
    val id: String,
    val name: String,
    val untertitel: String,
    val beschreibung: String,
    /** Wie viele Themen es zu dieser Art gibt. Null heisst «Themen folgen» —
     *  die Art kommt in der Pruefung vor, wir haben nur noch nichts dazu. */
    val themen: Int,
    val aufbau: List<String>,
    /** Nach Abschnitten geordnet, nicht als flache Liste: Wer nicht
     *  weiterweiss, steckt an einer bestimmten Stelle fest — meist am
     *  Anfang eines Abschnitts. Der Client liest genau diese Form. */
    val satzstarter: List<Satzstartergruppe>,
)
@Serializable data class AufsatzEntwurf(val themaId: Int, val text: String, val id: String? = null)
@Serializable data class AufsatzDto(val id: String, val themaId: Int, val text: String, val woerter: Int, val korrektur: Korrektur?)
/**
 * Die Aufsatzkorrektur — bewusst ohne Note.
 *
 * Eine Zahl von 1 bis 6 sagt einer 14-Jährigen, wo sie steht, aber nicht, was
 * sie tun soll. Sie erzeugt Druck an der Stelle, an der Übung nötig wäre.
 * Deshalb trägt jedes der vier Kriterien eine beschreibende Stufe, und die
 * abzählbare Grösse daneben ist «3 von 4 Kriterien erreicht».
 */
/**
 * Die Listen tragen Vorgabewerte.
 *
 * Ohne sie warf `decodeFromString`, sobald das Modell auch nur ein Feld
 * wegliess — `textstellen` bei einem sauberen Text ist der wahrscheinliche
 * Fall. Der Fehler fing niemand, und aus 90 Minuten Schreiben wurde
 * «Da ist etwas schiefgelaufen».
 */
@Serializable data class Korrektur(
    val gesamt: String = "",
    val kriterien: List<Kriterium> = emptyList(),
    val teilauftraege: List<Teilauftrag> = emptyList(),
    val textstellen: List<Textstelle> = emptyList(),
    val staerken: List<String> = emptyList(),
    val naechsteSchritte: List<Schritt> = emptyList(),
)
@Serializable data class Kriterium(
    val kuerzel: String,
    val name: String,
    /** noch_nicht | teilweise | erreicht | sicher — nie eine Zahl. */
    val stufe: String,
    val kommentar: String,
    val staerken: List<String> = emptyList(),
    val baustellen: List<String> = emptyList(),
) {
    /** Wie die Stufe im Text heisst. */
    val stufeName: String get() = when (stufe) {
        "noch_nicht" -> "noch nicht erreicht"
        "teilweise" -> "teilweise erreicht"
        "erreicht" -> "erreicht"
        "sicher" -> "sicher erreicht"
        else -> stufe
    }
    /** Zählt fürs «x von 4 Kriterien erreicht». */
    val erreicht: Boolean get() = stufe == "erreicht" || stufe == "sicher"
}
@Serializable data class Teilauftrag(val nr: Int, val text: String, val status: String, val hinweis: String)
@Serializable data class Textstelle(val zitat: String, val art: String, val problem: String, val besser: String, val warum: String)
@Serializable data class Schritt(val fokus: String, val uebung: String)

/* ---- Abo ---- */
@Serializable data class AppleQuittung(val signedTransaction: String)
@Serializable data class GoogleQuittung(val purchaseToken: String, val produktId: String)
@Serializable data class AboStatus(
    val aktiv: Boolean,
    val bis: String?,
    val produkt: String?,
    /** monatlich | pass | familie | keiner */
    val art: String = "keiner",
    /** Beim Familien-Pass: die Codes, die noch frei sind. */
    val freieCodes: List<String> = emptyList(),
    /** Ob dieses Konto einen fremden Familiencode eingelöst hat. */
    val ueberFamilie: Boolean = false,
)
@Serializable data class Produkt(
    val id: String,
    val name: String,
    val preis: String,
    val untertitel: String,
    /** monatlich | pass | familie */
    val art: String,
    val empfohlen: Boolean = false,
    val hinweis: String = "",
)
@Serializable data class CodeEinloesen(val code: String)

/* ---- Fehler ---- */
@Serializable data class Problem(val type: String, val title: String, val status: Int, val detail: String)

/* ======================================================================
   Schulen
   ======================================================================
   Der Schulverkauf ist ein eigener Zweig: keine Anmeldung mit Apple oder
   Google, kein Nutzerkonto, sondern ein Verwaltungsschluessel. Die
   Datentypen sind darum bewusst nicht die des Lernbereichs — eine Schule
   ist kein Nutzer, und wer beides in denselben Typ zwaengt, verbindet
   frueher oder spaeter ein Kind mit seiner Schule (§2.6).
   ==================================================================== */

@Serializable data class AdresseDto(
    val name: String,
    val zusatz: String? = null,
    val strasse: String? = null,
    val plz: String? = null,
    val ort: String? = null,
    val kanton: String? = null,
    val land: String = "Schweiz",
)

@Serializable data class KontaktDto(
    val vorname: String,
    val nachname: String,
    val funktion: String? = null,
    val email: String,
    val telefon: String? = null,
)

/** Die Staffel, offen hingelegt. Eine Schule muss den Preis im
 *  Budgetantrag begruenden koennen — «Preis auf Anfrage» kostet beide
 *  Seiten eine Woche. */
@Serializable data class PreisStufe(val ab: Int, val preis: Int, val name: String)

@Serializable data class SchulPreise(
    val waehrung: String = "CHF",
    val mwstSatz: Double,
    val einzelpass: Int,
    val staffel: List<PreisStufe>,
    val zahlungsfristTage: Int,
    val offerteGueltigTage: Int,
)

/** Eine durchgerechnete Bestellung. Sie entsteht genau einmal, auf dem
 *  Server, und reist dann unveraendert durch Offerte, Bestellung und
 *  Rechnung — sonst steht auf dem Papier ein anderer Betrag als auf dem
 *  Schirm. */
@Serializable data class RechnungPosten(
    val anzahl: Int,
    val stufe: PreisStufe,
    val einzelpreis: Double,
    val netto: Double,
    val rabattProzent: Double = 0.0,
    val rabatt: Double = 0.0,
    val zwischensumme: Double,
    val mwstSatz: Double,
    val mwst: Double,
    val total: Double,
    val proLizenz: Double,
    val gespartGegenEinzeln: Double,
)

@Serializable data class OfferteBitte(
    val schule: AdresseDto,
    val kontakt: KontaktDto,
    val anzahl: Int,
    val start: String? = null,
    val bemerkung: String? = null,
)

@Serializable data class OfferteDto(
    val nummer: String,
    val schluessel: String,
    val erstellt: String,
    val gueltigBis: String,
    val schule: AdresseDto,
    val kontakt: KontaktDto,
    val anzahl: Int,
    val rechnung: RechnungPosten,
    val start: String,
    val ende: String,
    val bemerkung: String? = null,
    val anbieter: AnbieterDto,
    val muster: Boolean = false,
)

@Serializable data class BestellBitte(
    val ausOfferte: String? = null,
    val schule: AdresseDto? = null,
    val kontakt: KontaktDto? = null,
    val anzahl: Int,
    val start: String? = null,
    val bestellnummer: String? = null,
    val versandart: String = "email",
    val rechnungsEmail: String? = null,
    val rechnungsadresse: AdresseDto? = null,
)

@Serializable data class BestellungDto(
    val nummer: String,
    val schluessel: String,
    val erstellt: String,
    val schule: AdresseDto,
    val kontakt: KontaktDto,
    val rechnungsadresse: AdresseDto,
    val bestellnummer: String? = null,
    val anzahl: Int,
    val rechnung: RechnungPosten,
    val start: String,
    val ende: String,
    val ausOfferte: String? = null,
)

@Serializable data class RechnungDto(
    val nummer: String,
    val bestellnummer: String,
    val bestellnummerKunde: String? = null,
    val datum: String,
    val faellig: String,
    val referenz: String,
    val bezahlt: Boolean,
    val schule: AdresseDto,
    val rechnungsadresse: AdresseDto,
    val anzahl: Int,
    val rechnung: RechnungPosten,
    val start: String,
    val ende: String,
    val anbieter: AnbieterDto,
    val muster: Boolean = false,
)

@Serializable data class BestellAntwort(
    val bestellung: BestellungDto,
    val rechnung: RechnungDto,
)

/** Absender und Bankverbindung kommen vom Server, damit sie an einer
 *  Stelle gepflegt sind und nicht im Quelltext der Website stehen. */
@Serializable data class AnbieterDto(
    val name: String,
    val zusatz: String? = null,
    val strasse: String? = null,
    val plzOrt: String? = null,
    val land: String = "Schweiz",
    val uid: String? = null,
    val iban: String? = null,
    val email: String? = null,
    val web: String = "studyswiss.ch",
)

/** Ein Code, so wie die Schule ihn sehen darf: ohne die Angabe, WER ihn
 *  eingeloest hat. Diese Spalte gibt es in der Datenbank, aber sie
 *  verlaesst den Server nicht. */
@Serializable data class LizenzcodeDto(
    val code: String,
    val eingeloest: Boolean,
    val gesperrt: Boolean = false,
    val klasse: String? = null,
)

@Serializable data class LizenzenDto(
    val schule: AdresseDto,
    val codes: List<LizenzcodeDto>,
    val start: String,
    val ende: String,
)

@Serializable data class BelegDto(
    val art: String,
    val nummer: String,
    val datum: String,
    val betrag: Double,
    val bezahlt: Boolean,
)

/** Der Schul-Bericht. Was hier NICHT drinsteht, ist der eigentliche
 *  Entscheid: kein Name, kein einzelner Lernstand, kein Aufsatztext.
 *  Eine Lehrperson bekommt Kennzahlen ueber die Gruppe — das ist der
 *  Grund, warum eine Schule das Werkzeug ueberhaupt einsetzen darf. */
@Serializable data class SchwachesThema(
    val fach: String,
    val code: String,
    val name: String,
    val oberthema: String? = null,
    val fehlerquote: Int,
)

@Serializable data class SchulBericht(
    val lizenzen: Int,
    val eingeloest: Int,
    val aktivLetzteWoche: Int,
    val pflichtaufgabenWoche: Int,
    val zeitraum: String,
    val schwacheThemen: List<SchwachesThema>,
    val hinweis: String,
)

/* ---- Kauf und Anmeldung im Browser ----
   Beide Wege enden bei einem Fremden — dem Zahlungsanbieter bzw. Apple
   oder Google. Der Server sagt dem Browser, wohin er gehen soll; er
   leitet nicht selbst weiter, damit der Browser den Wechsel als das
   sieht, was er ist. */
@Serializable data class WebKaufBitte(
    val produktId: String,
    val zahlungsart: String = "karte",
    val email: String,
    val name: String? = null,
)

@Serializable data class WebStart(
    val weiterleitung: String? = null,
    val hinweis: String? = null,
)

@Serializable data class WebAnmeldeBitte(val anbieter: String)

/** Was die Schule an einem Code ändern darf: die Klassennotiz und ob er
 *  gesperrt ist. Mehr gibt es nicht — der Code selbst ist unveränderlich,
 *  und wer ihn eingelöst hat, geht die Schule nichts an. */
@Serializable data class CodeAenderung(
    val klasse: String? = null,
    val gesperrt: Boolean? = null,
)
