import 'package:flutter/material.dart';
import '../daten/modelle.dart';
import 'aufgabe_widgets.dart';
import 'aufgabe_widgets2.dart';

/// Die Antwortfläche, für alle vierzehn Aufgabenarten, an einer Stelle.
///
/// Übung, Selbsttest und Standortbestimmung zeigen dieselben Aufgaben. Hätte
/// jeder Screen seine eigene Verteilung auf die Eingabeflächen, müsste ein
/// neues Format an drei Stellen nachgeführt werden, und die vergessene
/// Stelle fiele erst auf, wenn ein Kind im Selbsttest vor einem Textfeld
/// sässe, wo ein Koordinatengitter hingehört.
///
/// Der Zustand liegt in [AntwortZustand]; die Fläche selbst zeichnet nur.

/// Alles, was ein Kind zu einer Aufgabe eingeben kann.
class AntwortZustand {
  final eingabe = TextEditingController();
  String? wahl;
  final mehrfach = <String>{};
  final stellen = <int>{};

  final felder = <String, TextEditingController>{};
  final zeilen = <int, String>{};
  final punkte = <String, List<double>>{};
  final zuordnung = <int, int>{};
  int? offenesZiel;
  final reihenfolge = <int>[];
  final tabelle = <String, TextEditingController>{};
  final gefaerbt = <int>{};

  /// Legt die Eingabefelder für genau diese Aufgabe an.
  ///
  /// Muss bei jedem Aufgabenwechsel laufen: Sonst trüge die nächste Aufgabe
  /// die Steuerung der vorigen und zeigte deren Text.
  void richten(Aufgabe a) {
    for (final c in felder.values) {
      c.dispose();
    }
    for (final c in tabelle.values) {
      c.dispose();
    }
    felder.clear();
    tabelle.clear();
    for (final f in a.felder) {
      felder[f.name] = TextEditingController();
    }
    final t = a.tabelle;
    if (t != null) {
      // Eine Zeile mehr, als es Lösungen gibt. Sonst verriete die Anzahl
      // Zeilen bereits, wie viele Paare gesucht sind.
      for (var i = 0; i <= t.zeilen; i++) {
        for (var k = 0; k < t.spalten.length; k++) {
          tabelle['$i:$k'] = TextEditingController();
        }
      }
    }
  }

  void leeren(Aufgabe a) {
    eingabe.clear();
    wahl = null;
    mehrfach.clear();
    stellen.clear();
    zeilen.clear();
    punkte.clear();
    zuordnung.clear();
    offenesZiel = null;
    reihenfolge.clear();
    gefaerbt.clear();
    richten(a);
  }

  void entsorgen() {
    eingabe.dispose();
    for (final c in felder.values) {
      c.dispose();
    }
    for (final c in tabelle.values) {
      c.dispose();
    }
  }

  /// Die eingetragenen Zahlenpaare der Wertetabelle, ohne die leeren Zeilen.
  List<List<int>> paare(Aufgabe a) {
    final t = a.tabelle;
    if (t == null) return const [];
    final aus = <List<int>>[];
    for (var i = 0; i <= t.zeilen; i++) {
      final x = int.tryParse((tabelle['$i:0']?.text ?? '').trim());
      final y = int.tryParse((tabelle['$i:1']?.text ?? '').trim());
      if (x != null && y != null) aus.add([x, y]);
    }
    return aus;
  }

  /// Ist die Aufgabe VOLLSTÄNDIG beantwortet?
  bool vollstaendig(Aufgabe a) {
    if (a.istAuswahl) return wahl != null;
    if (a.istMehrfach) return mehrfach.isNotEmpty;
    if (a.istMarkieren) return stellen.isNotEmpty;
    // Bei Kommas ist «kein Komma» eine gültige Antwort.
    if (a.istKommas) return true;
    if (a.istMehrfeld) {
      return a.felder.every((f) => (felder[f.name]?.text ?? '').trim().isNotEmpty);
    }
    if (a.istTabelle) return zeilen.length == a.zeilen.length;
    if (a.istGitter) return a.gitter!.punkte.every((p) => punkte.containsKey(p.name));
    if (a.istZuordnen) return zuordnung.length == a.ziele.length;
    if (a.istSortieren) return reihenfolge.length == a.zuOrdnen.length;
    if (a.istWertetabelle) return paare(a).length >= a.tabelle!.zeilen;
    if (a.istFaerben) return gefaerbt.isNotEmpty;
    return eingabe.text.trim().isNotEmpty;
  }

  /// Ist überhaupt etwas eingetragen?
  bool angefangen(Aufgabe a) {
    if (a.istMehrfeld) {
      return a.felder.any((f) => (felder[f.name]?.text ?? '').trim().isNotEmpty);
    }
    if (a.istTabelle) return zeilen.isNotEmpty;
    if (a.istGitter) return punkte.isNotEmpty;
    if (a.istZuordnen) return zuordnung.isNotEmpty;
    if (a.istSortieren) return reihenfolge.isNotEmpty;
    if (a.istWertetabelle) return paare(a).isNotEmpty;
    return vollstaendig(a);
  }

  /// Ob der Prüfen-Knopf gedrückt werden darf.
  ///
  /// In der **Übung** genügt eine angefangene Antwort: Wer drei von vier
  /// Feldern ausgefüllt hat, soll nicht raten müssen, was ins vierte gehört —
  /// die Rückmeldung sagt es ihm, und genau dafür ist die Übung da. Im
  /// **Selbsttest** und in der **Standortbestimmung** zählt die Aufgabe als
  /// Ganzes, wie in der Prüfung.
  bool abgebbar(Aufgabe a, {required bool uebung}) =>
      uebung ? angefangen(a) : vollstaendig(a);

  /// Die Antwort in der Form, die das Backend erwartet.
  ///
  /// Steht hier und nicht im Screen, damit Übung, Selbsttest und
  /// Standortbestimmung dieselbe Anfrage schicken. Sonst käme eine
  /// Gitteraufgabe im Selbsttest ohne ihre Punkte beim Server an.
  AntwortDaten daten(Aufgabe a) => AntwortDaten(
        eingabe: _freitext(a) ? eingabe.text : '',
        optionId: a.istAuswahl ? wahl : null,
        optionIds: a.istMehrfach ? mehrfach.toList() : const [],
        stellen: a.istAntippen ? (stellen.toList()..sort()) : const [],
        felder: a.istMehrfeld
            ? {for (final f in a.felder) f.name: felder[f.name]?.text.trim() ?? ''}
            : const {},
        zeilen: a.istTabelle ? Map<int, String>.from(zeilen) : const {},
        punkte: a.istGitter ? Map<String, List<double>>.from(punkte) : const {},
        zuordnung: a.istZuordnen ? Map<int, int>.from(zuordnung) : const {},
        reihenfolge: a.istSortieren ? List<int>.from(reihenfolge) : const [],
        paare: a.istWertetabelle ? paare(a) : const [],
        gefaerbt: a.istFaerben ? gefaerbt.toList() : const [],
      );

  /// Ob für dieses Format das einzeilige Feld benutzt wird.
  bool _freitext(Aufgabe a) =>
      !(a.istAuswahl ||
          a.istMehrfach ||
          a.istAntippen ||
          a.istMehrfeld ||
          a.istTabelle ||
          a.istGitter ||
          a.istZuordnen ||
          a.istSortieren ||
          a.istWertetabelle ||
          a.istFaerben);
}

/// Zeichnet die passende Eingabefläche und meldet jede Änderung.
class Antwortflaeche extends StatelessWidget {
  const Antwortflaeche({
    super.key,
    required this.aufgabe,
    required this.zustand,
    required this.onAendert,
    this.feldFehler = const {},
    this.onAbsenden,
  });

  final Aufgabe aufgabe;
  final AntwortZustand zustand;

  /// Wird nach jeder Eingabe gerufen. Der Screen zeichnet neu und richtet
  /// den Prüfen-Knopf danach.
  final VoidCallback onAendert;

  /// Welche Felder die letzte Rückmeldung beanstandet hat.
  final Set<String> feldFehler;

  /// Absenden über die Eingabetaste. Nur dort sinnvoll, wo getippt wird.
  final VoidCallback? onAbsenden;

  @override
  Widget build(BuildContext context) {
    final a = aufgabe;
    final z = zustand;

    if (a.istAuswahl) {
      return AuswahlListe(
        optionen: a.optionen,
        gewaehlt: z.wahl,
        onWahl: (id) {
          z.wahl = id;
          onAendert();
        },
      );
    }
    if (a.istMehrfach) {
      return MehrfachListe(
        optionen: a.optionen,
        gewaehlt: z.mehrfach,
        onWahl: (id) {
          z.mehrfach.contains(id) ? z.mehrfach.remove(id) : z.mehrfach.add(id);
          onAendert();
        },
      );
    }
    if (a.istMarkieren) {
      return WoerterAntippen(
        woerter: a.woerter,
        gewaehlt: z.stellen,
        anzahlGesucht: a.anzahlGesucht,
        onTipp: (i) {
          z.stellen.contains(i) ? z.stellen.remove(i) : z.stellen.add(i);
          onAendert();
        },
      );
    }
    if (a.istKommas) {
      return KommasSetzen(
        woerter: a.woerter,
        gewaehlt: z.stellen,
        onTipp: (i) {
          z.stellen.contains(i) ? z.stellen.remove(i) : z.stellen.add(i);
          onAendert();
        },
      );
    }
    if (a.istMehrfeld) {
      return MehrfeldEingabe(
        felder: a.felder,
        steuer: z.felder,
        fehlerhaft: feldFehler,
        // Welche Tastatur aufgeht, sagt jedes Feld selbst. Hier stand
        // «a.fach != 'mathematik'» Eine Entscheidung an der Kennung des
        // Bereichs. Der erste Kanton mit einem eigenen Mathematikbereich
        // hätte damit Buchstaben statt Zahlen bekommen.
        text: a.felder.every((f) => f.text),
      );
    }
    if (a.istTabelle) {
      return ZeilenAuswahl(
        zeilen: a.zeilen,
        optionen: a.optionen,
        gewaehlt: z.zeilen,
        onWahl: (i, t) {
          // Nochmaliges Antippen nimmt die Wahl zurück.
          if (z.zeilen[i] == t) {
            z.zeilen.remove(i);
          } else {
            z.zeilen[i] = t;
          }
          onAendert();
        },
      );
    }
    if (a.istGitter) {
      return GitterFlaeche(
        gitter: a.gitter!,
        gesetzt: z.punkte,
        onTipp: (x, y) {
          // Steht hier schon ein Punkt? Dann wieder entfernen.
          final da =
              z.punkte.entries.where((e) => e.value[0] == x && e.value[1] == y).toList();
          if (da.isNotEmpty) {
            z.punkte.remove(da.first.key);
          } else {
            final offen = a.gitter!.punkte.where((p) => !z.punkte.containsKey(p.name));
            if (offen.isNotEmpty) z.punkte[offen.first.name] = [x, y];
          }
          onAendert();
        },
        onLoeschen: (name) {
          z.punkte.remove(name);
          onAendert();
        },
      );
    }
    if (a.istZuordnen) {
      return ZuordnenFlaeche(
        ziele: a.ziele,
        elemente: a.elemente,
        zuordnung: z.zuordnung,
        offenesZiel: z.offenesZiel,
        onZiel: (i) {
          z.offenesZiel = z.offenesZiel == i ? null : i;
          onAendert();
        },
        onElement: (k) {
          final ziel = z.offenesZiel;
          if (ziel == null) return;
          // Ein Element kann nur einmal vergeben sein.
          z.zuordnung.removeWhere((_, v) => v == k);
          z.zuordnung[ziel] = k;
          z.offenesZiel = null;
          onAendert();
        },
      );
    }
    if (a.istSortieren) {
      return SortierFlaeche(
        elemente: a.zuOrdnen,
        reihenfolge: z.reihenfolge,
        onTipp: (k) {
          z.reihenfolge.contains(k) ? z.reihenfolge.remove(k) : z.reihenfolge.add(k);
          onAendert();
        },
        onZuruecksetzen: () {
          z.reihenfolge.clear();
          onAendert();
        },
      );
    }
    if (a.istWertetabelle) {
      return WerteTabelle(tabelle: a.tabelle!, steuer: z.tabelle);
    }
    if (a.istFaerben) {
      return RasterFaerben(
        raster: a.raster!,
        gefaerbt: z.gefaerbt,
        onTipp: (i) {
          z.gefaerbt.contains(i) ? z.gefaerbt.remove(i) : z.gefaerbt.add(i);
          onAendert();
        },
      );
    }
    return AntwortFeld(steuer: z.eingabe, einheit: a.einheit, onSubmit: onAbsenden);
  }
}
