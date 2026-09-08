/// Spiegelt die DTOs des Backends.
///
/// Von Hand geschrieben statt mit freezed/json_serializable erzeugt: So ist
/// der Code ohne `build_runner` vollständig und lesbar, und man sieht jedem
/// Feld an, woher es kommt.
library;

T? _als<T>(dynamic x) => x is T ? x : null;

class Profil {
  Profil({
    required this.id,
    this.vorname,
    required this.anbieter,
    this.kanton,
    this.schultyp,
    this.pruefungsdatum,
    this.tageBisPruefung,
    required this.elternFreigabe,
    required this.plus,
    required this.onboardingFertig,
  });

  final String id;
  final String? vorname;
  final String anbieter;
  final String? kanton;
  final String? schultyp;
  final String? pruefungsdatum;
  final int? tageBisPruefung;
  final bool elternFreigabe;
  final bool plus;
  final bool onboardingFertig;

  bool get istGast => anbieter == 'gast';

  factory Profil.vonJson(Map<String, dynamic> j) => Profil(
        id: j['id'] as String,
        vorname: _als<String>(j['vorname']),
        anbieter: j['anbieter'] as String? ?? 'gast',
        kanton: _als<String>(j['kanton']),
        schultyp: _als<String>(j['schultyp']),
        pruefungsdatum: _als<String>(j['pruefungsdatum']),
        tageBisPruefung: _als<int>(j['tageBisPruefung']),
        elternFreigabe: j['elternFreigabe'] as bool? ?? false,
        plus: j['plus'] as bool? ?? false,
        onboardingFertig: j['onboardingFertig'] as bool? ?? false,
      );
}

class Sitzung {
  Sitzung(this.accessToken, this.refreshToken, this.nutzer);
  final String accessToken;
  final String refreshToken;
  final Profil nutzer;

  factory Sitzung.vonJson(Map<String, dynamic> j) => Sitzung(
        j['accessToken'] as String,
        j['refreshToken'] as String,
        Profil.vonJson(j['nutzer'] as Map<String, dynamic>),
      );
}

class Kanton {
  Kanton(this.kuerzel, this.name, this.aktiv);
  final String kuerzel;
  final String name;
  final bool aktiv;
  factory Kanton.vonJson(Map<String, dynamic> j) =>
      Kanton(j['kuerzel'] as String, j['name'] as String, j['aktiv'] as bool? ?? false);
}

/// Eine Seite für einen Prüfungsteil, den man nicht antippen kann.
///
/// Hörverstehen und mündliche Prüfungen lassen sich in einer App nicht
/// nachstellen. Es fehlt das Video und es fehlt das Gegenüber. Was sich sehr
/// wohl vermitteln lässt, ist das Verfahren: was in welcher Reihenfolge
/// geschieht, worauf es ankommt und welche Sätze man vorher können sollte.
class TippsSeite {
  TippsSeite(this.bereich, this.titel, this.eyebrow, this.einleitung, this.grundlage,
      this.ablauf, this.abschnitte, this.redemittel, this.uebungen);
  final String bereich;
  final String titel;
  final String eyebrow;
  final String einleitung;

  /// Woher die Angaben stammen. Steht klein unter der Seite.
  final String grundlage;
  final List<Ablaufschritt> ablauf;
  final List<Tippsabschnitt> abschnitte;
  final List<Redemittel> redemittel;

  /// Unterthemen, die genau diese Fertigkeit trainieren.
  final List<Uebungshinweis> uebungen;

  factory TippsSeite.vonJson(Map<String, dynamic> j) => TippsSeite(
        j['bereich'] as String,
        j['titel'] as String,
        j['eyebrow'] as String? ?? '',
        j['einleitung'] as String? ?? '',
        j['grundlage'] as String? ?? '',
        (j['ablauf'] as List? ?? [])
            .map((e) => Ablaufschritt.vonJson(e as Map<String, dynamic>))
            .toList(),
        (j['abschnitte'] as List? ?? [])
            .map((e) => Tippsabschnitt.vonJson(e as Map<String, dynamic>))
            .toList(),
        (j['redemittel'] as List? ?? [])
            .map((e) => Redemittel.vonJson(e as Map<String, dynamic>))
            .toList(),
        (j['uebungen'] as List? ?? [])
            .map((e) => Uebungshinweis.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Ablaufschritt {
  Ablaufschritt(this.nr, this.titel, this.dauer, this.text);
  final int nr;
  final String titel;

  /// «5 Minuten» oder leer, wenn der Schritt keine eigene Zeit hat.
  final String dauer;
  final String text;
  factory Ablaufschritt.vonJson(Map<String, dynamic> j) => Ablaufschritt(
        j['nr'] as int,
        j['titel'] as String,
        j['dauer'] as String? ?? '',
        j['text'] as String,
      );
}

class Tippsabschnitt {
  Tippsabschnitt(this.titel, this.tipps);
  final String titel;
  final List<Tipp> tipps;
  factory Tippsabschnitt.vonJson(Map<String, dynamic> j) => Tippsabschnitt(
        j['titel'] as String,
        (j['tipps'] as List? ?? [])
            .map((e) => Tipp.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// Eine Regel und der Grund dafür. Eine Regel ohne Grund merkt sich niemand;
/// `kantone.py` besteht darauf, dass beides dasteht.
class Tipp {
  Tipp(this.regel, this.warum);
  final String regel;
  final String warum;
  factory Tipp.vonJson(Map<String, dynamic> j) =>
      Tipp(j['regel'] as String, j['warum'] as String);
}

class Redemittel {
  Redemittel(this.zweck, this.saetze);
  final String zweck;
  final List<String> saetze;
  factory Redemittel.vonJson(Map<String, dynamic> j) => Redemittel(
        j['zweck'] as String,
        (j['saetze'] as List? ?? []).cast<String>(),
      );
}

class Uebungshinweis {
  Uebungshinweis(this.bereich, this.unterthema, this.name, this.warum);
  final String bereich;
  final String unterthema;
  final String name;
  final String warum;
  factory Uebungshinweis.vonJson(Map<String, dynamic> j) => Uebungshinweis(
        j['bereich'] as String,
        j['unterthema'] as String,
        j['name'] as String,
        j['warum'] as String,
      );
}

class Schultyp {
  Schultyp(this.id, this.name, this.pruefung, this.kuerzel, this.pruefungsfaecher,
      this.bedingungen, this.aufsatzarten, this.faecherZeile, this.bereiche);
  final String id;
  final String name;
  /// «ZAP 2», «ZAP 3» Der Name der Prüfung im gewählten Kanton. Er steht
  /// nur dort, wo er hingehört; ein Kanton mit eigener Prüfung bringt
  /// seinen eigenen Namen mit.
  final String pruefung;

  /// Das Kürzel allein. «ZAP 3» in Zürich, leer in Bern. Wo es leer ist,
  /// steht in der App das neutrale Wort «Aufnahmeprüfung», nie eine
  /// erfundene Abkürzung.
  final String kuerzel;

  /// Mathematik, Deutsch, allenfalls Französisch. Was hier fehlt, taucht in
  /// der App nirgends auf.
  final List<String> pruefungsfaecher;
  final Bedingungen bedingungen;
  final List<String> aufsatzarten;

  /// «Mathematik · Deutsch · Französisch» Die Zeile unter dem Namen in der
  /// Schulwahl. §6 verlangt dort Prüfungsname UND Fächer; die Fächer fehlten.
  final String faecherZeile;

  /// Die Bereiche dieses Schultyps. Massgeblich für alles, was der Schüler
  /// zu sehen bekommt, nicht die Bereichsliste des Fachs.
  final List<String> bereiche;

  factory Schultyp.vonJson(Map<String, dynamic> j) => Schultyp(
        j['id'] as String,
        j['name'] as String,
        j['pruefung'] as String? ?? '',
        j['kuerzel'] as String? ?? '',
        (j['pruefungsfaecher'] as List? ?? []).cast<String>(),
        Bedingungen.vonJson(j['bedingungen'] as Map<String, dynamic>? ?? {}),
        (j['aufsatzarten'] as List? ?? []).cast<String>(),
        j['faecherZeile'] as String? ?? '',
        (j['bereiche'] as List? ?? []).cast<String>(),
      );
}

/// Wie der Selbsttest läuft. Aus dem Katalog, nicht aus dem Screen: Eine
/// Prüfung, die einen Taschenrechner erlaubt, ist damit eine Datenänderung.
class Bedingungen {
  Bedingungen({
    this.taschenrechner = false,
    this.zurueckblaettern = true,
    this.uhrPausiert = true,
    this.hinweise = false,
    this.dauerMinuten = 90,
    this.anzahlAufgaben = 20,
    this.hilfsmittelText = 'Kein Taschenrechner',
    this.bemerkungen = const [],
  });
  final bool taschenrechner;
  final bool zurueckblaettern;
  final bool uhrPausiert;
  final bool hinweise;
  final int dauerMinuten;
  final int anzahlAufgaben;

  /// «Kein Taschenrechner», «Taschenrechner ohne CAS». Angezeigt wird dieser
  /// Satz, nicht das Ja-Nein daneben. St. Gallen erlaubt einen Rechner, aber
  /// keinen programmierbaren, und «erlaubt» allein wäre dort irreführend.
  final String hilfsmittelText;

  /// Was diese Prüfung sonst noch vorschreibt: In Solothurn wird eine
  /// Mathematikaufgabe nicht bewertet, wenn zwei Lösungswege dastehen, und
  /// im Sprachbogen gibt eine falsche Antwort Abzug. Kommt vom Prüfungsteil.
  final List<String> bemerkungen;

  factory Bedingungen.vonJson(Map<String, dynamic> j) => Bedingungen(
        taschenrechner: j['taschenrechner'] as bool? ?? false,
        zurueckblaettern: j['zurueckblaettern'] as bool? ?? true,
        uhrPausiert: j['uhrPausiert'] as bool? ?? true,
        hinweise: j['hinweise'] as bool? ?? false,
        dauerMinuten: j['dauerMinuten'] as int? ?? 90,
        anzahlAufgaben: j['anzahlAufgaben'] as int? ?? 20,
        hilfsmittelText:
            j['hilfsmittelText'] as String? ?? 'Kein Taschenrechner',
        bemerkungen: ((j['bemerkungen'] as List<dynamic>?) ?? const [])
            .map((e) => e as String)
            .toList(),
      );
}

/// Ein Fach, wie es die Prüfung kennt: Mathematik, Deutsch, Französisch.
/// Darunter liegen die Bereiche; ein Fach selbst hat keinen Themenbaum.
class Pruefungsfach {
  Pruefungsfach(this.id, this.name, this.untertitel, this.icon, this.bereiche);
  final String id;
  final String name;
  final String untertitel;
  final String icon;
  final List<String> bereiche;
  factory Pruefungsfach.vonJson(Map<String, dynamic> j) => Pruefungsfach(
        j['id'] as String,
        j['name'] as String,
        j['untertitel'] as String? ?? '',
        j['icon'] as String? ?? 'buch',
        (j['bereiche'] as List? ?? []).cast<String>(),
      );
}

class Bereich {
  Bereich(this.id, this.name, this.kurzname, this.untertitel, this.pruefungsfach, this.art);
  final String id;
  final String name;
  /// Wie der Bereich UNTER seinem Fach heisst: «Sprachbetrachtung», nicht
  /// «Deutsch Sprachbetrachtung» Das Fach steht schon in der Titelleiste.
  final String kurzname;
  final String untertitel;
  final String pruefungsfach;
  /// themenbaum | aufsatz
  final String art;
  factory Bereich.vonJson(Map<String, dynamic> j) => Bereich(
        j['id'] as String,
        j['name'] as String,
        j['kurzname'] as String? ?? j['name'] as String,
        j['untertitel'] as String? ?? '',
        j['pruefungsfach'] as String? ?? '',
        j['art'] as String? ?? 'themenbaum',
      );
}

/// Fächer und Bereiche in einem Zug. Der Client baut daraus die Navigation
/// unter «Lernen», «Selbsttest» und «Fortschritt».
class Faecher {
  Faecher(this.faecher, this.bereiche);
  final List<Pruefungsfach> faecher;
  final List<Bereich> bereiche;
  factory Faecher.vonJson(Map<String, dynamic> j) => Faecher(
        (j['faecher'] as List? ?? [])
            .map((e) => Pruefungsfach.vonJson(e as Map<String, dynamic>))
            .toList(),
        (j['bereiche'] as List? ?? [])
            .map((e) => Bereich.vonJson(e as Map<String, dynamic>))
            .toList(),
      );

  Pruefungsfach? fach(String id) {
    for (final f in faecher) {
      if (f.id == id) return f;
    }
    return null;
  }

  Bereich? bereich(String id) {
    for (final b in bereiche) {
      if (b.id == id) return b;
    }
    return null;
  }
}

/// Ein Fach zur Auswahl, in der Standortbestimmung und im Selbsttest.
class FachWahl {
  FachWahl(this.fach, this.name, this.untertitel, this.icon, this.themen,
      this.bereiche, this.bereichIds);
  final String fach;
  final String name;
  final String untertitel;
  final String icon;
  final int themen;
  final List<String> bereiche;

  /// Die Kennungen ALLER Bereiche dieses Fachs. Den Aufsatz eingeschlossen.
  /// `bereiche` daneben nennt nur die mit Themenbaum. Massgeblich für alles,
  /// was die Navigation entscheidet.
  final List<String> bereichIds;

  factory FachWahl.vonJson(Map<String, dynamic> j) => FachWahl(
        j['fach'] as String,
        j['name'] as String,
        j['untertitel'] as String? ?? '',
        j['icon'] as String? ?? 'buch',
        j['themen'] as int? ?? 0,
        (j['bereiche'] as List? ?? []).cast<String>(),
        (j['bereichIds'] as List? ?? []).cast<String>(),
      );
}

class Option {
  Option(this.id, this.text);
  final String id;
  final String text;
  factory Option.vonJson(Map<String, dynamic> j) => Option(j['id'] as String, j['text'] as String);
}

/// Die Aufgabe, wie der Client sie sieht: ohne Lösung.
class Aufgabe {
  Aufgabe({
    required this.ref,
    required this.fach,
    required this.unterthema,
    required this.unterthemaName,
    required this.format,
    required this.stamm,
    this.einheit,
    required this.optionen,
    required this.hinweiseVerfuegbar,
    this.woerter = const [],
    this.anzahlGesucht = 0,
    this.felder = const [],
    this.gitter,
    this.ziele = const [],
    this.elemente = const [],
    this.zuOrdnen = const [],
    this.tabelle,
    this.raster,
    this.zeilen = const [],
    this.darstellung,
    this.lesetext,
    this.themaKurz = '',
  });

  final String ref;
  final String fach;
  final String unterthema;
  final String unterthemaName;
  /// Beim Textverständnis der Lesetext, auf den sich die Frage bezieht.
  /// Er gehört zum Block, nicht zur einzelnen Aufgabe: ein Text, viele
  /// Fragen, wie in der Prüfung.
  final String? lesetext;
  /// Das Oberthema, klein und leise über der Aufgabe: «Bruchrechnen»,
  /// «Satzglieder». Kurz, damit die Aufgabe selbst im Blick bleibt.
  final String themaKurz;
  final String format;
  final String stamm;
  final String? einheit;
  final List<Option> optionen;
  final int hinweiseVerfuegbar;
  /// MARKIEREN und KOMMAS: der Satz in Wörter zerlegt.
  final List<String> woerter;
  /// Wie viele Wörter gesucht sind. Ohne diese Zahl wüsste niemand, wann er
  /// fertig ist. Welche es sind, verrät sie nicht.
  final int anzahlGesucht;

  /* --- die neuen Formate ------------------------------------------------
     Hier steht nur, was der Schüler sieht. Keine Lösung, keine
     Sollreihenfolge, keine gesetzten Punkte. Bewertet wird auf dem Server.
     Wer hier ein Lösungsfeld ergänzt, gibt die Antworten an jeden weiter,
     der die Antwort des Servers mitlesen kann. */
  /// MEHRFELD: die Antwortfelder.
  final List<Feld> felder;
  /// GITTER: Rahmen und die zu setzenden Punkte.
  final Gitter? gitter;
  /// ZUORDNEN: Ziele in fester, Elemente in gemischter Reihenfolge.
  final List<Option> ziele;
  final List<Option> elemente;
  /// SORTIEREN: die Elemente in der Startmischung.
  final List<Option> zuOrdnen;
  /// WERTETABELLE: Spaltenköpfe und Anzahl Zeilen.
  final Tabelle? tabelle;
  /// FAERBEN: nur die Rastergrösse.
  final Raster? raster;
  /// TABELLE_AUSWAHL: je Zeile ein Satz.
  final List<Option> zeilen;
  /// Eine Tabelle über der Aufgabe, etwa ein Bauplan.
  final Darstellung? darstellung;

  bool get istAuswahl => format == 'multiple_choice';
  bool get istMehrfach => format == 'mehrfachauswahl';
  bool get istMarkieren => format == 'markieren';
  bool get istKommas => format == 'kommas';
  bool get istAntippen => istMarkieren || istKommas;
  bool get istMehrfeld => format == 'mehrfeld';
  bool get istGitter => format == 'gitter';
  bool get istZuordnen => format == 'zuordnen';
  bool get istSortieren => format == 'sortieren';
  bool get istWertetabelle => format == 'wertetabelle';
  bool get istFaerben => format == 'faerben';
  bool get istTabelle => zeilen.isNotEmpty;

  factory Aufgabe.vonJson(Map<String, dynamic> j) => Aufgabe(
        ref: j['ref'] as String,
        fach: j['fach'] as String,
        unterthema: j['unterthema'] as String? ?? '',
        unterthemaName: j['unterthemaName'] as String? ?? '',
        lesetext: j['lesetext'] as String?,
        themaKurz: j['themaKurz'] as String? ?? '',
        format: j['format'] as String? ?? 'zahl_eingeben',
        stamm: j['stamm'] as String,
        einheit: _als<String>(j['einheit']),
        optionen: (j['optionen'] as List? ?? [])
            .map((e) => Option.vonJson(e as Map<String, dynamic>))
            .toList(),
        hinweiseVerfuegbar: j['hinweiseVerfuegbar'] as int? ?? 0,
        woerter: (j['woerter'] as List? ?? []).cast<String>(),
        anzahlGesucht: j['anzahlGesucht'] as int? ?? 0,
        felder: (j['felder'] as List? ?? [])
            .map((e) => Feld.vonJson(e as Map<String, dynamic>))
            .toList(),
        gitter: j['gitter'] == null
            ? null
            : Gitter.vonJson(j['gitter'] as Map<String, dynamic>),
        ziele: (j['ziele'] as List? ?? [])
            .map((e) => Option.vonJson(e as Map<String, dynamic>))
            .toList(),
        elemente: (j['elemente'] as List? ?? [])
            .map((e) => Option.vonJson(e as Map<String, dynamic>))
            .toList(),
        zuOrdnen: (j['zuOrdnen'] as List? ?? [])
            .map((e) => Option.vonJson(e as Map<String, dynamic>))
            .toList(),
        tabelle: j['tabelle'] == null
            ? null
            : Tabelle.vonJson(j['tabelle'] as Map<String, dynamic>),
        raster: j['raster'] == null
            ? null
            : Raster.vonJson(j['raster'] as Map<String, dynamic>),
        zeilen: (j['zeilen'] as List? ?? [])
            .map((e) => Option.vonJson(e as Map<String, dynamic>))
            .toList(),
        darstellung: j['darstellung'] == null
            ? null
            : Darstellung.vonJson(j['darstellung'] as Map<String, dynamic>),
      );
}

/// Ein Antwortfeld einer Mehrfeld-Aufgabe.
class Feld {
  Feld({required this.name, required this.label, required this.einheit,
        this.text = false});
  final String name;
  final String label;
  final String einheit;

  /// Ob hier ein Wort erwartet wird und keine Zahl. Entscheidet die Tastatur.
  /// Kommt vom Server: Die Aufgabe weiss es, der Bereichsname nicht.
  final bool text;

  factory Feld.vonJson(Map<String, dynamic> j) => Feld(
        name: j['name'] as String,
        label: j['label'] as String? ?? '',
        einheit: j['einheit'] as String? ?? '',
        text: j['text'] as bool? ?? false,
      );
}

class GitterPunkt {
  GitterPunkt({required this.name, required this.label});
  final String name;
  final String label;
  factory GitterPunkt.vonJson(Map<String, dynamic> j) =>
      GitterPunkt(name: j['name'] as String, label: j['label'] as String? ?? '');
}

class GitterMarke {
  GitterMarke({required this.text, required this.x, required this.y});
  final String text;
  final double x;
  final double y;
  factory GitterMarke.vonJson(Map<String, dynamic> j) => GitterMarke(
        text: j['text'] as String? ?? '',
        x: (j['x'] as num).toDouble(),
        y: (j['y'] as num).toDouble(),
      );
}

class GitterStrecke {
  GitterStrecke({
    required this.text,
    required this.stil,
    required this.vonX,
    required this.vonY,
    required this.bisX,
    required this.bisY,
  });
  final String text;
  final String stil;
  final double vonX;
  final double vonY;
  final double bisX;
  final double bisY;
  factory GitterStrecke.vonJson(Map<String, dynamic> j) => GitterStrecke(
        text: j['text'] as String? ?? '',
        stil: j['stil'] as String? ?? '',
        vonX: (j['vonX'] as num).toDouble(),
        vonY: (j['vonY'] as num).toDouble(),
        bisX: (j['bisX'] as num).toDouble(),
        bisY: (j['bisY'] as num).toDouble(),
      );
}

class Gitter {
  Gitter({
    required this.xvon,
    required this.xbis,
    required this.yvon,
    required this.ybis,
    required this.punkte,
    this.vorgabe = const [],
    this.strecken = const [],
  });
  final double xvon;
  final double xbis;
  final double yvon;
  final double ybis;
  final List<GitterPunkt> punkte;
  final List<GitterMarke> vorgabe;
  final List<GitterStrecke> strecken;

  factory Gitter.vonJson(Map<String, dynamic> j) => Gitter(
        xvon: (j['xvon'] as num).toDouble(),
        xbis: (j['xbis'] as num).toDouble(),
        yvon: (j['yvon'] as num).toDouble(),
        ybis: (j['ybis'] as num).toDouble(),
        punkte: (j['punkte'] as List? ?? [])
            .map((e) => GitterPunkt.vonJson(e as Map<String, dynamic>))
            .toList(),
        vorgabe: (j['vorgabe'] as List? ?? [])
            .map((e) => GitterMarke.vonJson(e as Map<String, dynamic>))
            .toList(),
        strecken: (j['strecken'] as List? ?? [])
            .map((e) => GitterStrecke.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Tabellenspalte {
  Tabellenspalte({required this.name, required this.kopf});
  final String name;
  final String kopf;
  factory Tabellenspalte.vonJson(Map<String, dynamic> j) =>
      Tabellenspalte(name: j['name'] as String, kopf: j['kopf'] as String? ?? '');
}

class Tabelle {
  Tabelle({required this.spalten, required this.zeilen});
  final List<Tabellenspalte> spalten;
  final int zeilen;
  factory Tabelle.vonJson(Map<String, dynamic> j) => Tabelle(
        spalten: (j['spalten'] as List? ?? [])
            .map((e) => Tabellenspalte.vonJson(e as Map<String, dynamic>))
            .toList(),
        zeilen: j['zeilen'] as int? ?? 0,
      );
}

class Raster {
  Raster({required this.spalten, required this.zeilen});
  final int spalten;
  final int zeilen;
  factory Raster.vonJson(Map<String, dynamic> j) =>
      Raster(spalten: j['spalten'] as int? ?? 0, zeilen: j['zeilen'] as int? ?? 0);
}

/// Eine Tabelle über der Aufgabe, etwa ein Bauplan.
class Darstellung {
  Darstellung({required this.typ, required this.kopf, required this.zeilen});
  final String typ;
  final List<String> kopf;
  final List<List<String>> zeilen;
  factory Darstellung.vonJson(Map<String, dynamic> j) => Darstellung(
        typ: j['typ'] as String? ?? 'tabelle',
        kopf: (j['kopf'] as List? ?? []).cast<String>(),
        zeilen: (j['zeilen'] as List? ?? [])
            .map((z) => (z as List).cast<String>())
            .toList(),
      );
}

class Rueckmeldung {
  Rueckmeldung({
    required this.richtig,
    required this.feedback,
    this.diagnoseId,
    required this.loesung,
    required this.loesungsweg,
    required this.geloestImThema,
    required this.pflichtset,
    this.feldFehler = const [],
  });

  final bool richtig;
  final String feedback;
  final String? diagnoseId;
  final String loesung;
  final List<String> loesungsweg;
  final int geloestImThema;
  final int pflichtset;
  /// Bei einer Mehrfeld-Aufgabe: die Namen der Felder, die noch nicht
  /// stimmen. Nur diese werden rot. Wer drei von vier richtig hat, soll
  /// das auch sehen.
  final List<String> feldFehler;

  factory Rueckmeldung.vonJson(Map<String, dynamic> j) => Rueckmeldung(
        richtig: j['richtig'] as bool,
        feedback: j['feedback'] as String? ?? '',
        diagnoseId: _als<String>(j['diagnoseId']),
        loesung: j['loesung'] as String? ?? '',
        loesungsweg: (j['loesungsweg'] as List? ?? []).cast<String>(),
        geloestImThema: j['geloestImThema'] as int? ?? 0,
        pflichtset: j['pflichtset'] as int? ?? 20,
        feldFehler: (j['feldFehler'] as List? ?? []).cast<String>(),
      );
}

class Vorschlag {
  Vorschlag({
    required this.unterthema,
    required this.name,
    required this.oberthema,
    required this.fach,
    required this.begruendung,
    required this.geloest,
    required this.pflichtset,
  });

  final String unterthema;
  final String name;
  final String oberthema;
  final String fach;
  final String begruendung;
  final int geloest;
  final int pflichtset;

  factory Vorschlag.vonJson(Map<String, dynamic> j) => Vorschlag(
        unterthema: j['unterthema'] as String,
        name: j['name'] as String,
        oberthema: j['oberthema'] as String? ?? '',
        fach: j['fach'] as String? ?? '',
        begruendung: j['begruendung'] as String? ?? '',
        geloest: j['geloest'] as int? ?? 0,
        pflichtset: j['pflichtset'] as int? ?? 20,
      );
}

class VorschlagsListe {
  VorschlagsListe(this.zuerst, this.danach, this.hinweis);
  final Vorschlag? zuerst;
  final Vorschlag? danach;
  final String hinweis;
  factory VorschlagsListe.vonJson(Map<String, dynamic> j) => VorschlagsListe(
        j['zuerst'] == null ? null : Vorschlag.vonJson(j['zuerst'] as Map<String, dynamic>),
        j['danach'] == null ? null : Vorschlag.vonJson(j['danach'] as Map<String, dynamic>),
        j['hinweis'] as String? ?? '',
      );
}

class Einfuehrung {
  Einfuehrung(this.titel, this.stamm, this.loesungsweg, this.tipp);
  final String titel;
  final String stamm;
  final List<String> loesungsweg;
  final String tipp;
  factory Einfuehrung.vonJson(Map<String, dynamic> j) => Einfuehrung(
        j['titel'] as String? ?? 'Einführung in den Aufgabenblock',
        j['stamm'] as String? ?? '',
        (j['loesungsweg'] as List? ?? []).cast<String>(),
        j['tipp'] as String? ?? '',
      );
}

class Uebung {
  Uebung(this.id, this.unterthema, this.unterthemaName, this.einfuehrung, this.aufgaben);
  final String id;
  final String unterthema;
  final String unterthemaName;
  final Einfuehrung einfuehrung;
  final List<Aufgabe> aufgaben;
  factory Uebung.vonJson(Map<String, dynamic> j) => Uebung(
        j['id'] as String,
        j['unterthema'] as String? ?? '',
        j['unterthemaName'] as String? ?? '',
        Einfuehrung.vonJson(j['einfuehrung'] as Map<String, dynamic>? ?? {}),
        (j['aufgaben'] as List? ?? [])
            .map((e) => Aufgabe.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class UebungErgebnis {
  UebungErgebnis(this.richtig, this.total, this.verpasst, this.themaAbgeschlossen);
  final int richtig;
  final int total;
  final List<String> verpasst;
  final bool themaAbgeschlossen;
  factory UebungErgebnis.vonJson(Map<String, dynamic> j) => UebungErgebnis(
        j['richtig'] as int? ?? 0,
        j['total'] as int? ?? 0,
        (j['verpasst'] as List? ?? []).cast<String>(),
        j['themaAbgeschlossen'] as bool? ?? false,
      );
}

class Startpunkt {
  Startpunkt(this.fach, this.fachName, this.sitzen, this.zuerstUeben, this.offen,
      this.empfehlungen, this.hinweis);
  final String? fach;
  final String? fachName;
  final int sitzen;
  final int zuerstUeben;
  final int offen;
  /// Die Themen mit der höchsten Fehlerquote, als Empfehlung, nicht als
  /// Reihenfolge. Eine verbindliche Reihenfolge legt der Lernpfad fest;
  /// was die Standortbestimmung belegen kann, ist, wo es gehakt hat.
  final List<Vorschlag> empfehlungen;
  final String hinweis;
  factory Startpunkt.vonJson(Map<String, dynamic> j) => Startpunkt(
        j['fach'] as String?,
        j['fachName'] as String?,
        j['sitzen'] as int? ?? 0,
        j['zuerstUeben'] as int? ?? 0,
        j['offen'] as int? ?? 0,
        (j['empfehlungen'] as List? ?? [])
            .map((e) => Vorschlag.vonJson(e as Map<String, dynamic>))
            .toList(),
        j['hinweis'] as String? ?? '',
      );
}

class Themenbaum {
  Themenbaum(this.fach, this.name, this.oberthemen);
  final String fach;
  final String name;
  final List<Oberthema> oberthemen;
  factory Themenbaum.vonJson(Map<String, dynamic> j) => Themenbaum(
        j['fach'] as String,
        j['name'] as String,
        (j['oberthemen'] as List? ?? [])
            .map((e) => Oberthema.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Oberthema {
  Oberthema(this.nr, this.name, this.punkte, this.unterthemen);
  final int nr;
  final String name;
  final int punkte;
  final List<Unterthema> unterthemen;
  factory Oberthema.vonJson(Map<String, dynamic> j) => Oberthema(
        j['nr'] as int? ?? 0,
        j['name'] as String,
        j['punkte'] as int? ?? 0,
        (j['unterthemen'] as List? ?? [])
            .map((e) => Unterthema.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Unterthema {
  Unterthema(this.code, this.name, this.pflichtset, this.hatAufgaben);
  final String code;
  final String name;
  final int pflichtset;
  /// Ob es zu diesem Thema schon Aufgaben gibt. Der Server setzt es beim
  /// Ausliefern; die App zeigt ein Thema ohne Aufgaben blass und ohne
  /// Antippen, statt in eine Fehlermeldung laufen zu lassen.
  final bool hatAufgaben;
  factory Unterthema.vonJson(Map<String, dynamic> j) => Unterthema(
        j['code'] as String,
        j['name'] as String,
        j['pflichtset'] as int? ?? 20,
        j['hatAufgaben'] as bool? ?? true,
      );
}

class Fortschritt {
  Fortschritt({
    required this.themenAbgeschlossen,
    required this.themenTotal,
    required this.faecher,
    required this.verlauf,
    required this.aussage,
    this.staerkstes,
    this.schwaechstes,
  });

  final int themenAbgeschlossen;
  final int themenTotal;
  final List<FachZeile> faecher;
  final List<Woche> verlauf;
  final String aussage;
  final ThemenZeile? staerkstes;
  final ThemenZeile? schwaechstes;

  factory Fortschritt.vonJson(Map<String, dynamic> j) => Fortschritt(
        themenAbgeschlossen: j['themenAbgeschlossen'] as int? ?? 0,
        themenTotal: j['themenTotal'] as int? ?? 0,
        faecher: (j['faecher'] as List? ?? [])
            .map((e) => FachZeile.vonJson(e as Map<String, dynamic>))
            .toList(),
        verlauf: (j['verlauf'] as List? ?? [])
            .map((e) => Woche.vonJson(e as Map<String, dynamic>))
            .toList(),
        aussage: j['aussage'] as String? ?? '',
        staerkstes: j['staerkstes'] == null
            ? null
            : ThemenZeile.vonJson(j['staerkstes'] as Map<String, dynamic>),
        schwaechstes: j['schwaechstes'] == null
            ? null
            : ThemenZeile.vonJson(j['schwaechstes'] as Map<String, dynamic>),
      );
}

class FachZeile {
  FachZeile(this.fach, this.name, this.abgeschlossen, this.total, this.pflichtGeloest,
      this.pflichtTotal, this.bereiche, this.bereichIds);
  /// Das PRÜFUNGSFACH. «deutsch», nicht «sprachbetrachtung».
  final String fach;
  final String name;
  final int abgeschlossen;
  final int total;
  final int pflichtGeloest;
  final int pflichtTotal;
  /// Die Bereiche darunter. Bei Mathematik genau einer.
  final List<BereichZeile> bereiche;

  /// Die Kennungen ALLER Bereiche. Den Aufsatz eingeschlossen. Ohne sie
  /// verschwände an der FMS Bern das Fach «Deutsch», dessen Prüfung aus
  /// nichts anderem als einem Text besteht.
  final List<String> bereichIds;

  factory FachZeile.vonJson(Map<String, dynamic> j) => FachZeile(
        j['fach'] as String,
        j['name'] as String,
        j['abgeschlossen'] as int? ?? 0,
        j['total'] as int? ?? 0,
        j['pflichtGeloest'] as int? ?? 0,
        j['pflichtTotal'] as int? ?? 0,
        (j['bereiche'] as List? ?? [])
            .map((e) => BereichZeile.vonJson(e as Map<String, dynamic>))
            .toList(),
        (j['bereichIds'] as List? ?? []).cast<String>(),
      );
}

class BereichZeile {
  BereichZeile(this.bereich, this.name, this.kurzname, this.abgeschlossen, this.total,
      this.pflichtGeloest, this.pflichtTotal, this.art);
  final String bereich;
  final String name;
  final String kurzname;
  final int abgeschlossen;
  final int total;
  final int pflichtGeloest;
  final int pflichtTotal;

  /// `themenbaum`, `aufsatz` oder `tipps`.
  ///
  /// Steht auch im Katalog — hier trotzdem, weil der Bereichs-Screen
  /// sonst von zwei Quellen abhängt. Findet er den Bereich im Katalog
  /// nicht, verschwand die Zeile bisher spurlos.
  final String art;

  factory BereichZeile.vonJson(Map<String, dynamic> j) => BereichZeile(
        j['bereich'] as String,
        j['name'] as String,
        j['kurzname'] as String? ?? j['name'] as String,
        j['abgeschlossen'] as int? ?? 0,
        j['total'] as int? ?? 0,
        j['pflichtGeloest'] as int? ?? 0,
        j['pflichtTotal'] as int? ?? 0,
        j['art'] as String? ?? 'themenbaum',
      );
}

class Woche {
  Woche(this.label, this.quote, this.versuche);
  final String label;
  final int quote;
  final int versuche;
  factory Woche.vonJson(Map<String, dynamic> j) =>
      Woche(j['label'] as String, j['quote'] as int? ?? 0, j['versuche'] as int? ?? 0);
}

class ThemenZeile {
  ThemenZeile(this.unterthema, this.name, this.fachName, this.quote, this.zeitraum);
  final String unterthema;
  final String name;
  final String fachName;
  final int quote;
  final String zeitraum;
  factory ThemenZeile.vonJson(Map<String, dynamic> j) => ThemenZeile(
        j['unterthema'] as String,
        j['name'] as String,
        j['fachName'] as String? ?? '',
        j['quote'] as int? ?? 0,
        j['zeitraum'] as String? ?? '',
      );
}

class FehlerGruppe {
  FehlerGruppe(this.unterthema, this.name, this.fach, this.eintraege);
  final String unterthema;
  final String name;
  final String fach;
  final List<FehlerEintrag> eintraege;
  factory FehlerGruppe.vonJson(Map<String, dynamic> j) => FehlerGruppe(
        j['unterthema'] as String,
        j['name'] as String,
        j['fach'] as String? ?? '',
        (j['eintraege'] as List? ?? [])
            .map((e) => FehlerEintrag.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class FehlerEintrag {
  FehlerEintrag(this.aufgabeRef, this.stamm, this.denkfehler, this.feedback, this.datum);
  final String aufgabeRef;
  final String stamm;
  final String denkfehler;
  final String feedback;
  final String datum;
  factory FehlerEintrag.vonJson(Map<String, dynamic> j) => FehlerEintrag(
        j['aufgabeRef'] as String,
        j['stamm'] as String,
        j['denkfehler'] as String? ?? '',
        j['feedback'] as String? ?? '',
        j['datum'] as String? ?? '',
      );
}

class Selbsttest {
  Selbsttest(this.id, this.fach, this.fachName, this.umfang, this.minuten, this.bedingungen,
      this.aufgaben);
  final String id;
  /// Das PRÜFUNGSFACH. «deutsch», nicht «sprachbetrachtung». Ein
  /// Deutsch-Selbsttest mischt Sprachbetrachtung und Textverständnis, wie
  /// die Prüfung.
  final String fach;
  final String fachName;
  final String umfang;
  final int minuten;
  final Bedingungen bedingungen;
  final List<Aufgabe> aufgaben;
  factory Selbsttest.vonJson(Map<String, dynamic> j) => Selbsttest(
        j['id'] as String,
        j['fach'] as String,
        j['fachName'] as String? ?? '',
        j['umfang'] as String? ?? 'alle',
        j['minuten'] as int? ?? 30,
        Bedingungen.vonJson(j['bedingungen'] as Map<String, dynamic>? ?? {}),
        (j['aufgaben'] as List? ?? [])
            .map((e) => Aufgabe.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class SelbsttestErgebnis {
  SelbsttestErgebnis(this.punkte, this.maximum, this.proOberthema, this.fehlerRefs);
  final int punkte;
  final int maximum;
  final List<OberthemaErgebnis> proOberthema;
  final List<String> fehlerRefs;
  factory SelbsttestErgebnis.vonJson(Map<String, dynamic> j) => SelbsttestErgebnis(
        j['punkte'] as int? ?? 0,
        j['maximum'] as int? ?? 0,
        (j['proOberthema'] as List? ?? [])
            .map((e) => OberthemaErgebnis.vonJson(e as Map<String, dynamic>))
            .toList(),
        (j['fehlerRefs'] as List? ?? []).cast<String>(),
      );
}

class OberthemaErgebnis {
  OberthemaErgebnis(this.name, this.erreicht, this.moeglich);
  final String name;
  final int erreicht;
  final int moeglich;
  factory OberthemaErgebnis.vonJson(Map<String, dynamic> j) => OberthemaErgebnis(
        j['name'] as String, j['erreicht'] as int? ?? 0, j['moeglich'] as int? ?? 0);
}

class ElternReport {
  ElternReport(this.vorname, this.zeitraum, this.kennzahlen, this.hinweis);
  final String? vorname;
  final String zeitraum;
  final List<Kennzahl> kennzahlen;
  final String hinweis;
  factory ElternReport.vonJson(Map<String, dynamic> j) => ElternReport(
        _als<String>(j['vorname']),
        j['zeitraum'] as String? ?? '',
        (j['kennzahlen'] as List? ?? [])
            .map((e) => Kennzahl.vonJson(e as Map<String, dynamic>))
            .toList(),
        j['hinweis'] as String? ?? '',
      );
}

class Kennzahl {
  Kennzahl(this.titel, this.wert, this.fach, this.zeitraum);
  final String titel;
  final String wert;
  final String fach;
  final String zeitraum;
  factory Kennzahl.vonJson(Map<String, dynamic> j) => Kennzahl(
        j['titel'] as String,
        j['wert'] as String,
        j['fach'] as String? ?? '',
        j['zeitraum'] as String? ?? '',
      );
}

/// Eine Aufsatzart. Erst die Art wählen, dann das Thema. Sie trägt auch
/// die beiden Hilfen hinter dem Tipp-Knopf beim Schreiben.
class Aufsatzart {
  Aufsatzart(this.id, this.name, this.untertitel, this.beschreibung, this.themen,
      this.aufbau, this.satzstarter);
  final String id;
  final String name;
  final String untertitel;
  final String beschreibung;
  /// Null heisst «Themen folgen» Die Art kommt an dieser Prüfung vor, wir
  /// haben nur noch nichts dazu.
  final int themen;
  final List<String> aufbau;

  /// Satzanfänge, nach Abschnitten geordnet. Wer nicht weiterweiss, steckt
  /// an einer bestimmten Stelle fest, meist am Anfang eines Abschnitts.
  final List<Satzstartergruppe> satzstarter;
  factory Aufsatzart.vonJson(Map<String, dynamic> j) => Aufsatzart(
        j['id'] as String,
        j['name'] as String,
        j['untertitel'] as String? ?? '',
        j['beschreibung'] as String? ?? '',
        j['themen'] as int? ?? 0,
        (j['aufbau'] as List? ?? []).cast<String>(),
        (j['satzstarter'] as List? ?? [])
            .map((e) => Satzstartergruppe.vonJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// Eine Gruppe von Satzanfängen für einen Abschnitt des Aufsatzes.
class Satzstartergruppe {
  Satzstartergruppe(this.abschnitt, this.saetze);
  final String abschnitt;
  final List<String> saetze;
  factory Satzstartergruppe.vonJson(Map<String, dynamic> j) => Satzstartergruppe(
        j['abschnitt'] as String? ?? '',
        (j['saetze'] as List? ?? []).cast<String>(),
      );
}

class AufsatzThema {
  AufsatzThema(this.id, this.slot, this.sorte, this.titel, this.auftrag, this.teile);
  final int id;
  final String slot;
  final String sorte;
  final String titel;
  final String auftrag;
  final List<String> teile;
  factory AufsatzThema.vonJson(Map<String, dynamic> j) => AufsatzThema(
        j['id'] as int,
        j['slot'] as String,
        j['sorte'] as String,
        j['titel'] as String,
        j['auftrag'] as String,
        (j['teile'] as List? ?? []).cast<String>(),
      );
}

/* ============================== Abo ================================== */

class AboStatus {
  AboStatus({
    required this.aktiv,
    this.bis,
    this.produkt,
    required this.art,
    required this.freieCodes,
    required this.ueberFamilie,
  });

  final bool aktiv;
  final String? bis;
  final String? produkt;
  /// monatlich | pass | familie | keiner
  final String art;
  /// Beim Familien-Pass: die Codes, die noch frei sind.
  final List<String> freieCodes;
  final bool ueberFamilie;

  factory AboStatus.vonJson(Map<String, dynamic> j) => AboStatus(
        aktiv: j['aktiv'] as bool? ?? false,
        bis: _als<String>(j['bis']),
        produkt: _als<String>(j['produkt']),
        art: j['art'] as String? ?? 'keiner',
        freieCodes: (j['freieCodes'] as List? ?? []).cast<String>(),
        ueberFamilie: j['ueberFamilie'] as bool? ?? false,
      );
}

class Produkt {
  Produkt({
    required this.id,
    required this.name,
    required this.preis,
    required this.untertitel,
    required this.art,
    required this.empfohlen,
    required this.hinweis,
  });

  final String id;
  final String name;
  /// Der Preis vom Server. Im Kauf-Screen wird er durch den lokalisierten
  /// Preis aus dem Laden ersetzt, sobald dieser da ist.
  final String preis;
  final String untertitel;
  final String art;
  final bool empfohlen;
  final String hinweis;

  factory Produkt.vonJson(Map<String, dynamic> j) => Produkt(
        id: j['id'] as String,
        name: j['name'] as String,
        preis: j['preis'] as String? ?? '',
        untertitel: j['untertitel'] as String? ?? '',
        art: j['art'] as String? ?? 'pass',
        empfohlen: j['empfohlen'] as bool? ?? false,
        hinweis: j['hinweis'] as String? ?? '',
      );
}

/* ============================ Lernpfad =============================== */

class Lernpfad {
  Lernpfad({
    required this.aktiv,
    this.grund,
    required this.etappen,
    required this.wochen,
    required this.pensumDieseWoche,
    required this.geloestDieseWoche,
    required this.offenTotal,
    required this.wochenBisPruefung,
    required this.hinweis,
  });

  final bool aktiv;
  final String? grund;
  final List<LernpfadEtappe> etappen;
  final List<LernpfadWoche> wochen;
  final int pensumDieseWoche;
  final int geloestDieseWoche;
  final int offenTotal;
  final int wochenBisPruefung;
  final String hinweis;

  factory Lernpfad.vonJson(Map<String, dynamic> j) => Lernpfad(
        aktiv: j['aktiv'] as bool? ?? false,
        grund: _als<String>(j['grund']),
        etappen: (j['etappen'] as List? ?? [])
            .map((e) => LernpfadEtappe.vonJson(e as Map<String, dynamic>))
            .toList(),
        wochen: (j['wochen'] as List? ?? [])
            .map((e) => LernpfadWoche.vonJson(e as Map<String, dynamic>))
            .toList(),
        pensumDieseWoche: j['pensumDieseWoche'] as int? ?? 0,
        geloestDieseWoche: j['geloestDieseWoche'] as int? ?? 0,
        offenTotal: j['offenTotal'] as int? ?? 0,
        wochenBisPruefung: j['wochenBisPruefung'] as int? ?? 0,
        hinweis: j['hinweis'] as String? ?? '',
      );
}

class LernpfadEtappe {
  LernpfadEtappe(this.nummer, this.titel, this.beschreibung, this.abgeschlossen,
      this.total, this.vonWoche, this.bisWoche);
  final int nummer;
  final String titel;
  final String beschreibung;
  final int abgeschlossen;
  final int total;
  final int? vonWoche;
  final int? bisWoche;
  factory LernpfadEtappe.vonJson(Map<String, dynamic> j) => LernpfadEtappe(
        j['nummer'] as int? ?? 0,
        j['titel'] as String,
        j['beschreibung'] as String? ?? '',
        j['abgeschlossen'] as int? ?? 0,
        j['total'] as int? ?? 0,
        j['vonWoche'] as int?,
        j['bisWoche'] as int?,
      );
}

class LernpfadWoche {
  LernpfadWoche({
    required this.nummer,
    required this.titel,
    required this.von,
    required this.bis,
    required this.istDieseWoche,
    required this.istVergangen,
    required this.istPruefungsform,
    required this.pensum,
    required this.geloest,
    required this.themen,
    this.auftrag,
  });

  final int nummer;
  final String titel;
  final String von;
  final String bis;
  final bool istDieseWoche;
  final bool istVergangen;
  final bool istPruefungsform;
  final int pensum;
  final int geloest;
  final List<LernpfadThema> themen;
  final String? auftrag;

  factory LernpfadWoche.vonJson(Map<String, dynamic> j) => LernpfadWoche(
        nummer: j['nummer'] as int? ?? 0,
        titel: j['titel'] as String? ?? '',
        von: j['von'] as String? ?? '',
        bis: j['bis'] as String? ?? '',
        istDieseWoche: j['istDieseWoche'] as bool? ?? false,
        istVergangen: j['istVergangen'] as bool? ?? false,
        istPruefungsform: j['istPruefungsform'] as bool? ?? false,
        pensum: j['pensum'] as int? ?? 0,
        geloest: j['geloest'] as int? ?? 0,
        themen: (j['themen'] as List? ?? [])
            .map((e) => LernpfadThema.vonJson(e as Map<String, dynamic>))
            .toList(),
        auftrag: _als<String>(j['auftrag']),
      );
}

class LernpfadThema {
  LernpfadThema(this.unterthema, this.name, this.fach, this.fachName,
      this.oberthema, this.aufgaben);
  final String unterthema;
  final String name;
  final String fach;
  final String fachName;
  final String oberthema;
  final int aufgaben;
  factory LernpfadThema.vonJson(Map<String, dynamic> j) => LernpfadThema(
        j['unterthema'] as String,
        j['name'] as String,
        j['fach'] as String? ?? '',
        j['fachName'] as String? ?? '',
        j['oberthema'] as String? ?? '',
        j['aufgaben'] as int? ?? 0,
      );
}


/// Eine Antwort, so wie sie ans Backend geht.
///
/// Eine einzige Gestalt für alle vierzehn Aufgabenarten und alle drei
/// Laufarten. Gäbe es je Screen eine eigene, käme eine Gitteraufgabe im
/// Selbsttest ohne ihre Punkte beim Server an, und niemand merkte es,
/// bis ein Kind sie als falsch zurückbekäme.
class AntwortDaten {
  const AntwortDaten({
    this.eingabe = '',
    this.optionId,
    this.optionIds = const [],
    this.stellen = const [],
    this.felder = const {},
    this.zeilen = const {},
    this.punkte = const {},
    this.zuordnung = const {},
    this.reihenfolge = const [],
    this.paare = const [],
    this.gefaerbt = const [],
  });

  final String eingabe;
  final String? optionId;
  final List<String> optionIds;
  final List<int> stellen;
  final Map<String, String> felder;
  final Map<int, String> zeilen;
  final Map<String, List<double>> punkte;
  final Map<int, int> zuordnung;
  final List<int> reihenfolge;
  final List<List<int>> paare;
  final List<int> gefaerbt;

  /// Leere Felder gar nicht erst mitschicken. Der Server setzt dieselben
  /// Vorgaben, und die Anfrage bleibt lesbar.
  Map<String, dynamic> alsJson(String aufgabeRef) => {
        'aufgabeRef': aufgabeRef,
        'eingabe': eingabe,
        if (optionId != null) 'optionId': optionId,
        if (optionIds.isNotEmpty) 'optionIds': optionIds,
        if (stellen.isNotEmpty) 'stellen': stellen,
        if (felder.isNotEmpty) 'felder': felder,
        if (zeilen.isNotEmpty) 'zeilen': zeilen.map((k, v) => MapEntry('$k', v)),
        if (punkte.isNotEmpty) 'punkte': punkte,
        if (zuordnung.isNotEmpty) 'zuordnung': zuordnung.map((k, v) => MapEntry('$k', v)),
        if (reihenfolge.isNotEmpty) 'reihenfolge': reihenfolge,
        if (paare.isNotEmpty) 'paare': paare,
        if (gefaerbt.isNotEmpty) 'gefaerbt': gefaerbt,
      };
}
