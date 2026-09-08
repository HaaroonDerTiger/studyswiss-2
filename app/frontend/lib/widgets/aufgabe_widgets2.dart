import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/theme/farben.dart';
import '../core/theme/typografie.dart';
import '../daten/modelle.dart';

/// Die Bedienelemente der sechs Aufgabenarten, die aus den ZAP-Trainern
/// dazugekommen sind.
///
/// **Alles wird angetippt, nichts gezogen.** Auf einem Telefon ist Ziehen mit
/// dem Daumen unzuverlässig. Man verfehlt das Ziel, das Blatt scrollt
/// stattdessen weg, und ein Kind, das eine Aufgabe lösen kann, scheitert an
/// der Bedienung. Zuordnen und Sortieren funktionieren deshalb über zwei
/// Tipps statt über Ziehen.
///
/// **Ein zweites Antippen nimmt die Wahl zurück.** Ohne das gäbe es keinen
/// Weg, einen Fehlgriff zu berichtigen, ausser die Aufgabe abzubrechen.

/* ══════════════════════════════════════════════════════════════════════
   Eine Tabelle über der Aufgabe, etwa ein Bauplan.
   ══════════════════════════════════════════════════════════════════ */
class DarstellungsTabelle extends StatelessWidget {
  const DarstellungsTabelle(this.d, {super.key});
  final Darstellung d;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Farben.karte,
          border: Border.all(color: Farben.linie),
          borderRadius: BorderRadius.circular(Mass.radiusKarte),
        ),
        clipBehavior: Clip.antiAlias,
        // Ein breiter Bauplan darf seitlich rollen. Die Seite selbst nie.
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(12),
          child: Table(
            defaultColumnWidth: const IntrinsicColumnWidth(),
            border: TableBorder.all(color: Farben.linie, width: 1),
            children: [
              if (d.kopf.isNotEmpty)
                TableRow(
                  decoration: const BoxDecoration(color: Farben.tan100),
                  children: [
                    for (final k in d.kopf) _zelle(k, kopf: true),
                  ],
                ),
              for (final z in d.zeilen)
                TableRow(children: [for (final w in z) _zelle(w)]),
            ],
          ),
        ),
      );

  Widget _zelle(String t, {bool kopf = false}) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        child: Text(
          t,
          textAlign: TextAlign.center,
          style: kopf
              ? Schrift.label.copyWith(color: Farben.tan600, fontSize: 12)
              : Schrift.h4.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        ),
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Mehrere Antwortfelder
   ══════════════════════════════════════════════════════════════════ */
class MehrfeldEingabe extends StatelessWidget {
  const MehrfeldEingabe({
    super.key,
    required this.felder,
    required this.steuer,
    required this.fehlerhaft,
    this.text = false,
  });

  final List<Feld> felder;
  final Map<String, TextEditingController> steuer;

  /// Welche Felder die letzte Rückmeldung beanstandet hat. Nur diese werden
  /// rot. Wer drei von vier richtig hat, soll das auch sehen.
  final Set<String> fehlerhaft;

  /// Rückfall, wenn ein Feld selbst nichts dazu sagt. Massgeblich ist
  /// `Feld.text`. Ein Block kann Wort- und Zahlenfelder mischen, und eine
  /// Entscheidung für die ganze Aufgabe wäre dann für die Hälfte falsch.
  final bool text;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final f in felder) ...[
            Text(f.label, style: Schrift.bodyKlein),
            const SizedBox(height: 6),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: steuer[f.name],
                  keyboardType: (f.text || text)
                      ? TextInputType.text
                      : const TextInputType.numberWithOptions(decimal: true, signed: true),
                  textInputAction: TextInputAction.next,
                  style: Schrift.h3,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: fehlerhaft.contains(f.name) ? Farben.rot100 : Farben.creme,
                    hintText: '—',
                    hintStyle: Schrift.body.copyWith(color: Farben.ink300),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    enabledBorder: _rahmen(
                        fehlerhaft.contains(f.name) ? Farben.rot : Farben.tan300),
                    focusedBorder: _rahmen(Farben.tan500, dick: true),
                    border: _rahmen(Farben.tan300),
                  ),
                ),
              ),
              if (f.einheit.isNotEmpty) ...[
                const SizedBox(width: 10),
                Text(f.einheit, style: Schrift.bodyKlein),
              ],
            ]),
            const SizedBox(height: 14),
          ],
        ],
      );

  OutlineInputBorder _rahmen(Color c, {bool dick = false}) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(Mass.radiusKnopf),
        borderSide: BorderSide(color: c, width: dick ? 2 : 1.5),
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Tabelle mit einer Wahl je Zeile
   ══════════════════════════════════════════════════════════════════ */
class ZeilenAuswahl extends StatelessWidget {
  const ZeilenAuswahl({
    super.key,
    required this.zeilen,
    required this.optionen,
    required this.gewaehlt,
    required this.onWahl,
  });

  final List<Option> zeilen;
  final List<Option> optionen;

  /// Zeilennummer → gewählter Optionstext.
  final Map<int, String> gewaehlt;
  final void Function(int zeile, String text) onWahl;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${gewaehlt.length} von ${zeilen.length} Zeilen',
              style: Schrift.klein.copyWith(
                color: gewaehlt.length == zeilen.length ? Farben.gruen : Farben.ink300,
                fontWeight: FontWeight.w700,
              )),
          const SizedBox(height: 12),
          for (var i = 0; i < zeilen.length; i++) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Farben.karte,
                border: Border.all(color: Farben.linie),
                borderRadius: BorderRadius.circular(Mass.radiusKarte),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(zeilen[i].text, style: Schrift.h4.copyWith(fontWeight: FontWeight.w500)),
                const SizedBox(height: 10),
                // Die Optionen bleiben in fester Reihenfolge: Sie sind die
                // Kopfzeile der Tabelle und müssen über alle Zeilen gleich
                // stehen. Eine Tabelle, deren Spalten springen, ist unlesbar.
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final o in optionen)
                      _Waehlchip(
                        text: o.text,
                        an: gewaehlt[i] == o.text,
                        onTap: () => onWahl(i, o.text),
                      ),
                  ],
                ),
              ]),
            ),
            const SizedBox(height: 8),
          ],
        ],
      );
}

class _Waehlchip extends StatelessWidget {
  const _Waehlchip({required this.text, required this.an, required this.onTap});
  final String text;
  final bool an;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: an ? Farben.ink900 : Farben.tan100,
            borderRadius: BorderRadius.circular(Mass.radiusChip),
          ),
          child: Text(text,
              style: Schrift.label.copyWith(
                  color: an ? Farben.creme : Farben.ink700, fontSize: 13)),
        ),
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Punkte im Koordinatengitter
   ══════════════════════════════════════════════════════════════════ */
class GitterFlaeche extends StatelessWidget {
  const GitterFlaeche({
    super.key,
    required this.gitter,
    required this.gesetzt,
    required this.onTipp,
    required this.onLoeschen,
  });

  final Gitter gitter;

  /// Punktname → (x, y).
  final Map<String, List<double>> gesetzt;
  final void Function(double x, double y) onTipp;
  final ValueChanged<String> onLoeschen;

  @override
  Widget build(BuildContext context) {
    final offen = gitter.punkte.where((p) => !gesetzt.containsKey(p.name)).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(
        offen.isEmpty
            ? 'Alle Punkte gesetzt'
            : 'Als Nächstes: ${offen.first.label}',
        style: Schrift.klein.copyWith(
            color: offen.isEmpty ? Farben.gruen : Farben.ink300,
            fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 10),
      AspectRatio(
        aspectRatio: 1,
        child: LayoutBuilder(builder: (ctx, mass) {
          return GestureDetector(
            onTapUp: (d) {
              final k = _koordinate(d.localPosition, mass.maxWidth, mass.maxHeight);
              onTipp(k.$1, k.$2);
            },
            child: CustomPaint(
              painter: _GitterMaler(gitter: gitter, gesetzt: gesetzt),
              size: Size.infinite,
            ),
          );
        }),
      ),
      const SizedBox(height: 10),
      // Gesetzte Punkte lassen sich einzeln wieder entfernen. Ein Kind, das
      // sich vertippt hat, soll nicht die ganze Aufgabe neu beginnen.
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final p in gitter.punkte)
            if (gesetzt[p.name] != null)
              GestureDetector(
                onTap: () => onLoeschen(p.name),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: Farben.tan100,
                    borderRadius: BorderRadius.circular(Mass.radiusChip),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(
                      '${p.label} (${_z(gesetzt[p.name]![0])} | ${_z(gesetzt[p.name]![1])})',
                      style: Schrift.label.copyWith(fontSize: 12.5),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.close, size: 14, color: Farben.ink300),
                  ]),
                ),
              ),
        ],
      ),
    ]);
  }

  /// Rechnet einen Tipp auf dem Bildschirm in Gitterkoordinaten um und rastet
  /// auf ganze Schritte ein, auf ein Feld daneben zu tippen wäre sonst der
  /// häufigste Fehler, und er hätte nichts mit Mathematik zu tun.
  (double, double) _koordinate(Offset p, double b, double h) {
    const rand = 26.0;
    // Ein Gitter ohne Höhe ist ein ZAHLENSTRAHL. Ohne diese Klammer stünde
    // hier eine Division durch null, und jeder Tipp ergäbe NaN.
    final spanX = (gitter.xbis - gitter.xvon).abs() < 1e-9 ? 1.0 : gitter.xbis - gitter.xvon;
    final spanY = (gitter.ybis - gitter.yvon).abs() < 1e-9 ? 1.0 : gitter.ybis - gitter.yvon;
    final sx = (b - 2 * rand) / spanX;
    final sy = (h - 2 * rand) / spanY;
    final x = ((p.dx - rand) / sx + gitter.xvon).roundToDouble();
    final y = gitter.ybis == gitter.yvon
        ? gitter.yvon
        : (gitter.ybis - (p.dy - rand) / sy).roundToDouble();
    return (
      x.clamp(gitter.xvon, gitter.xbis),
      y.clamp(gitter.yvon, gitter.ybis),
    );
  }

  static String _z(double w) =>
      w == w.roundToDouble() ? w.round().toString() : w.toString();
}

class _GitterMaler extends CustomPainter {
  _GitterMaler({required this.gitter, required this.gesetzt});
  final Gitter gitter;
  final Map<String, List<double>> gesetzt;

  static const _rand = 26.0;

  @override
  void paint(Canvas c, Size s) {
    // Ein Gitter ohne Höhe ist ein Zahlenstrahl: eine Achse mit
    // Teilstrichen. Dieselbe Bedienung, dasselbe Format, und die Division
    // durch null, die es vorher gab, ist damit weg.
    final strahl = (gitter.ybis - gitter.yvon).abs() < 1e-9;
    final spanX = (gitter.xbis - gitter.xvon).abs() < 1e-9 ? 1.0 : gitter.xbis - gitter.xvon;
    final sx = (s.width - 2 * _rand) / spanX;
    final sy = strahl ? 0.0 : (s.height - 2 * _rand) / (gitter.ybis - gitter.yvon);
    Offset punkt(double x, double y) => Offset(
          _rand + (x - gitter.xvon) * sx,
          strahl ? s.height / 2 : s.height - _rand - (y - gitter.yvon) * sy,
        );

    final grund = Paint()..color = Farben.karte;
    c.drawRRect(
      RRect.fromRectAndRadius(Offset.zero & s, const Radius.circular(Mass.radiusKarte)),
      grund,
    );

    final fein = Paint()
      ..color = Farben.linie
      ..strokeWidth = 1;
    if (strahl) {
      final achse = Paint()
        ..color = Farben.ink900
        ..strokeWidth = 1.6;
      c.drawLine(punkt(gitter.xvon, 0), punkt(gitter.xbis, 0), achse);
      for (var x = gitter.xvon; x <= gitter.xbis; x++) {
        final gross = (x - gitter.xvon) % 5 == 0;
        final o = punkt(x, 0);
        c.drawLine(Offset(o.dx, o.dy - (gross ? 7 : 4)),
            Offset(o.dx, o.dy + (gross ? 7 : 4)), achse);
        if (gross) {
          _beschriften(c, GitterFlaeche._z(x), Offset(o.dx - 8, o.dy + 20),
              Farben.ink500);
        }
      }
    } else {
      for (var x = gitter.xvon; x <= gitter.xbis; x++) {
        c.drawLine(punkt(x, gitter.yvon), punkt(x, gitter.ybis), fein);
      }
      for (var y = gitter.yvon; y <= gitter.ybis; y++) {
        c.drawLine(punkt(gitter.xvon, y), punkt(gitter.xbis, y), fein);
      }
    }

    final achse = Paint()
      ..color = Farben.ink300
      ..strokeWidth = 1.6;
    if (!strahl && gitter.yvon <= 0 && gitter.ybis >= 0) {
      c.drawLine(punkt(gitter.xvon, 0), punkt(gitter.xbis, 0), achse);
    }
    if (!strahl && gitter.xvon <= 0 && gitter.xbis >= 0) {
      c.drawLine(punkt(0, gitter.yvon), punkt(0, gitter.ybis), achse);
    }

    final strich = Paint()
      ..color = Farben.tan500
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (final st in gitter.strecken) {
      c.drawLine(punkt(st.vonX, st.vonY), punkt(st.bisX, st.bisY), strich);
    }

    final vorgabe = Paint()..color = Farben.tan500;
    for (final v in gitter.vorgabe) {
      c.drawCircle(punkt(v.x, v.y), 4.5, vorgabe);
      _beschriften(c, v.text, punkt(v.x, v.y), Farben.tan600);
    }

    final meiner = Paint()..color = Farben.ink900;
    gesetzt.forEach((name, xy) {
      if (xy.length != 2) return;
      final o = punkt(xy[0], xy[1]);
      c.drawCircle(o, 7, meiner);
      final p = gitter.punkte.where((q) => q.name == name);
      if (p.isNotEmpty) _beschriften(c, p.first.label, o, Farben.ink900);
    });
  }

  void _beschriften(Canvas c, String t, Offset o, Color farbe) {
    if (t.isEmpty) return;
    final tp = TextPainter(
      text: TextSpan(
        text: t,
        style: Schrift.klein.copyWith(color: farbe, fontWeight: FontWeight.w700),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(c, o + const Offset(9, -18));
  }

  @override
  bool shouldRepaint(_GitterMaler alt) =>
      alt.gesetzt != gesetzt || alt.gitter != gitter;
}

/* ══════════════════════════════════════════════════════════════════════
   Zuordnen. Zwei Tipps statt Ziehen
   ══════════════════════════════════════════════════════════════════ */
class ZuordnenFlaeche extends StatelessWidget {
  const ZuordnenFlaeche({
    super.key,
    required this.ziele,
    required this.elemente,
    required this.zuordnung,
    required this.offenesZiel,
    required this.onZiel,
    required this.onElement,
  });

  final List<Option> ziele;
  final List<Option> elemente;

  /// Zielnummer → Anzeigeposition des Elements.
  final Map<int, int> zuordnung;

  /// Welches Ziel gerade wartet. Erst Ziel antippen, dann Element.
  final int? offenesZiel;
  final ValueChanged<int> onZiel;
  final ValueChanged<int> onElement;

  @override
  Widget build(BuildContext context) {
    final vergeben = zuordnung.values.toSet();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(
        offenesZiel == null
            ? 'Tippe zuerst eine Zeile an, dann die passende Antwort.'
            : 'Und jetzt die passende Antwort.',
        style: Schrift.klein,
      ),
      const SizedBox(height: 12),
      for (var i = 0; i < ziele.length; i++) ...[
        GestureDetector(
          onTap: () => onZiel(i),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Farben.karte,
              border: Border.all(
                color: offenesZiel == i ? Farben.tan500 : Farben.linie,
                width: offenesZiel == i ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(Mass.radiusKarte),
            ),
            child: Row(children: [
              Expanded(child: Text(ziele[i].text, style: Schrift.h4)),
              const SizedBox(width: 10),
              if (zuordnung[i] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                  decoration: BoxDecoration(
                    color: Farben.ink900,
                    borderRadius: BorderRadius.circular(Mass.radiusChip),
                  ),
                  child: Text(elemente[zuordnung[i]!].text,
                      style: Schrift.label.copyWith(color: Farben.creme, fontSize: 13)),
                )
              else
                Text('—', style: Schrift.body.copyWith(color: Farben.ink300)),
            ]),
          ),
        ),
        const SizedBox(height: 8),
      ],
      const SizedBox(height: 10),
      const SsEyebrowKlein('Zur Auswahl'),
      const SizedBox(height: 8),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (var k = 0; k < elemente.length; k++)
            Opacity(
              opacity: vergeben.contains(k) ? 0.35 : 1,
              child: _Waehlchip(
                text: elemente[k].text,
                an: false,
                onTap: () => onElement(k),
              ),
            ),
        ],
      ),
    ]);
  }
}

/// Ein kleines Etikett. Dieselbe Auszeichnung wie `SsEyebrow`, aber ohne
/// Abhängigkeit auf die Grundbausteine, damit diese Datei für sich steht.
class SsEyebrowKlein extends StatelessWidget {
  const SsEyebrowKlein(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text.toUpperCase(),
        style: Schrift.klein.copyWith(
          color: Farben.tan600,
          fontWeight: FontWeight.w800,
          fontSize: 11,
          letterSpacing: 1.2,
        ),
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Sortieren. Der Reihe nach antippen
   ══════════════════════════════════════════════════════════════════ */
class SortierFlaeche extends StatelessWidget {
  const SortierFlaeche({
    super.key,
    required this.elemente,
    required this.reihenfolge,
    required this.onTipp,
    required this.onZuruecksetzen,
  });

  final List<Option> elemente;

  /// Die angetippten Anzeigepositionen, in der Reihenfolge des Antippens.
  final List<int> reihenfolge;
  final ValueChanged<int> onTipp;
  final VoidCallback onZuruecksetzen;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text('Tippe der Reihe nach an, vom kleinsten zum grössten.',
                  style: Schrift.klein),
            ),
            if (reihenfolge.isNotEmpty)
              TextButton(
                onPressed: onZuruecksetzen,
                child: Text('Zurücksetzen',
                    style: Schrift.label.copyWith(color: Farben.tan600, fontSize: 13)),
              ),
          ]),
          const SizedBox(height: 10),
          for (var k = 0; k < elemente.length; k++) ...[
            GestureDetector(
              onTap: () => onTipp(k),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: reihenfolge.contains(k) ? Farben.tan100 : Farben.karte,
                  border: Border.all(
                      color: reihenfolge.contains(k) ? Farben.tan500 : Farben.linie),
                  borderRadius: BorderRadius.circular(Mass.radiusKarte),
                ),
                child: Row(children: [
                  Container(
                    width: 26,
                    height: 26,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: reihenfolge.contains(k) ? Farben.ink900 : Farben.tan100,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      reihenfolge.contains(k) ? '${reihenfolge.indexOf(k) + 1}' : '',
                      style: Schrift.klein
                          .copyWith(color: Farben.creme, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(elemente[k].text, style: Schrift.h4)),
                ]),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Wertetabelle
   ══════════════════════════════════════════════════════════════════ */
class WerteTabelle extends StatelessWidget {
  const WerteTabelle({
    super.key,
    required this.tabelle,
    required this.steuer,
  });

  final Tabelle tabelle;

  /// «Zeile:Spalte» → Eingabefeld.
  final Map<String, TextEditingController> steuer;

  @override
  Widget build(BuildContext context) {
    // Eine Zeile mehr, als es Lösungen gibt. Sonst verriete die Anzahl
    // Zeilen bereits, wie viele Paare gesucht sind.
    final zeilen = tabelle.zeilen + 1;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: Farben.karte,
        border: Border.all(color: Farben.linie),
        borderRadius: BorderRadius.circular(Mass.radiusKnopf),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Ein Raster, keine Reihe aus flexiblen Kästen: Ein flexibles Kind
        // schrumpft nicht unter die Breite seines Inhalts, und dadurch liefe
        // die Tabelle auf einem schmalen Telefon aus dem Bild.
        Row(children: [
          const SizedBox(width: 24),
          for (final sp in tabelle.spalten) ...[
            Expanded(
              child: Text(sp.kopf.toUpperCase(),
                  style: Schrift.klein.copyWith(
                      color: Farben.tan600, fontWeight: FontWeight.w800, fontSize: 11)),
            ),
            const SizedBox(width: 8),
          ],
        ]),
        const SizedBox(height: 8),
        const Divider(height: 1, color: Farben.linie),
        const SizedBox(height: 8),
        for (var i = 0; i < zeilen; i++) ...[
          Row(children: [
            SizedBox(
              width: 24,
              child: Text('${i + 1}',
                  textAlign: TextAlign.right,
                  style: Schrift.klein.copyWith(color: Farben.ink300)),
            ),
            for (var k = 0; k < tabelle.spalten.length; k++) ...[
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: steuer['$i:$k'],
                  keyboardType: const TextInputType.numberWithOptions(signed: true),
                  textAlign: TextAlign.center,
                  style: Schrift.h4.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()]),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: Farben.papier,
                    hintText: '—',
                    hintStyle: Schrift.klein.copyWith(color: Farben.tan300),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    enabledBorder: _r(Farben.tan300),
                    focusedBorder: _r(Farben.tan500, dick: true),
                    border: _r(Farben.tan300),
                  ),
                ),
              ),
            ],
          ]),
          const SizedBox(height: 8),
        ],
        Text('Leere Zeilen werden nicht gewertet.', style: Schrift.klein),
      ]),
    );
  }

  OutlineInputBorder _r(Color c, {bool dick = false}) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c, width: dick ? 2 : 1.5),
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Felder färben. Die Ansicht eines Würfelkörpers
   ══════════════════════════════════════════════════════════════════ */
class RasterFaerben extends StatelessWidget {
  const RasterFaerben({
    super.key,
    required this.raster,
    required this.gefaerbt,
    required this.onTipp,
  });

  final Raster raster;
  final Set<int> gefaerbt;
  final ValueChanged<int> onTipp;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${gefaerbt.length} Felder gefärbt', style: Schrift.klein),
          const SizedBox(height: 10),
          LayoutBuilder(builder: (ctx, mass) {
            final kante = math.min(
              (mass.maxWidth - (raster.spalten - 1) * 6) / raster.spalten,
              54.0,
            );
            return Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (var i = 0; i < raster.spalten * raster.zeilen; i++)
                  GestureDetector(
                    onTap: () => onTipp(i),
                    child: Container(
                      width: kante,
                      height: kante,
                      decoration: BoxDecoration(
                        color: gefaerbt.contains(i) ? Farben.ink900 : Farben.karte,
                        border: Border.all(
                            color: gefaerbt.contains(i) ? Farben.ink900 : Farben.tan300),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ),
              ],
            );
          }),
        ],
      );
}

/* ══════════════════════════════════════════════════════════════════════
   Die Aufgabennummer
   ══════════════════════════════════════════════════════════════════ */
/// Steht unter jeder Aufgabe, ganz leise.
///
/// Sie ist keine Zierde: Wenn eine Schülerin schreibt «bei der Aufgabe mit
/// den Pumpen stimmt etwas nicht», sucht das Team lange. Mit
/// «umgekehrt-proportional-tabelle:412» ist die Aufgabe in einer Sekunde
/// wieder da. Dieselbe Kennung ergibt überall dieselbe Aufgabe. Über die
/// Lösung verrät sie nichts; die steht nur im Server.
class AufgabenNummer extends StatefulWidget {
  const AufgabenNummer({super.key, required this.ref});
  final String ref;

  @override
  State<AufgabenNummer> createState() => _AufgabenNummerState();
}

class _AufgabenNummerState extends State<AufgabenNummer> {
  bool _kopiert = false;

  Future<void> _kopieren() async {
    await Clipboard.setData(ClipboardData(text: widget.ref));
    if (!mounted) return;
    setState(() => _kopiert = true);
    await Future<void>.delayed(const Duration(milliseconds: 1600));
    if (mounted) setState(() => _kopiert = false);
  }

  @override
  Widget build(BuildContext context) => Center(
        child: TextButton(
          onPressed: _kopieren,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: _kopiert
              ? Text('Nummer kopiert',
                  style: Schrift.klein.copyWith(color: Farben.gruen))
              : RichText(
                  text: TextSpan(
                    style: Schrift.klein,
                    children: [
                      const TextSpan(text: 'Aufgabe '),
                      TextSpan(
                        text: widget.ref,
                        style: Schrift.klein.copyWith(
                          color: Farben.tan600,
                          fontWeight: FontWeight.w700,
                          fontFamily: Schrift.h4.fontFamily,
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      );
}
