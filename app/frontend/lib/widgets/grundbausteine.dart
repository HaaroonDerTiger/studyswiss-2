import 'package:flutter/material.dart';
import '../core/theme/farben.dart';
import '../core/theme/typografie.dart';

/// Primärknopf: dunkelbraun, Höhe 54, Radius 14, kein Schatten.
class SsKnopf extends StatelessWidget {
  const SsKnopf(this.text, {super.key, this.onTap, this.art = SsKnopfArt.primaer, this.icon});
  final String text;
  final VoidCallback? onTap;
  final SsKnopfArt art;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final aus = onTap == null;
    final (hintergrund, vordergrund, rahmen) = switch (art) {
      SsKnopfArt.primaer => (Farben.ink900, Farben.creme, null),
      SsKnopfArt.sekundaer => (Colors.transparent, Farben.ink900, Farben.tan300),
      SsKnopfArt.text => (Colors.transparent, Farben.tan600, null),
      SsKnopfArt.apple => (Colors.black, Colors.white, null),
      SsKnopfArt.google => (Colors.white, Farben.ink900, Farben.tan300),
    };
    return Opacity(
      opacity: aus ? 0.4 : 1,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: Mass.knopfHoehe,
          decoration: BoxDecoration(
            color: hintergrund,
            borderRadius: BorderRadius.circular(Mass.radiusKnopf),
            border: rahmen == null ? null : Border.all(color: rahmen),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[icon!, const SizedBox(width: 10)],
              Text(text, style: Schrift.knopf.copyWith(color: vordergrund)),
            ],
          ),
        ),
      ),
    );
  }
}

enum SsKnopfArt { primaer, sekundaer, text, apple, google }

/// Karte: cremeweiss, ein Haar Rahmen, Radius 16, kein Schatten.
class SsKarte extends StatelessWidget {
  const SsKarte({super.key, required this.kind, this.polster = const EdgeInsets.all(16), this.onTap});
  final Widget kind;
  final EdgeInsets polster;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: polster,
          decoration: BoxDecoration(
            color: Farben.karte,
            border: Border.all(color: Farben.linie),
            borderRadius: BorderRadius.circular(Mass.radiusKarte),
          ),
          child: kind,
        ),
      );
}

/// Dunkle Karte für die eine Zahl, auf die es ankommt: Tage bis zur Prüfung.
class SsDunkleKarte extends StatelessWidget {
  const SsDunkleKarte({super.key, required this.kind, this.polster = const EdgeInsets.all(18)});
  final Widget kind;
  final EdgeInsets polster;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: polster,
        decoration: BoxDecoration(
          color: Farben.ink900,
          borderRadius: BorderRadius.circular(Mass.radiusDunkel),
        ),
        child: kind,
      );
}

class SsChip extends StatelessWidget {
  const SsChip(this.text, {super.key, this.aktiv = false, this.onTap});
  final String text;
  final bool aktiv;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          height: 28,
          padding: const EdgeInsets.symmetric(horizontal: 11),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: aktiv ? Farben.ink900 : Farben.karte,
            border: aktiv ? null : Border.all(color: Farben.linie),
            borderRadius: BorderRadius.circular(Mass.radiusChip),
          ),
          child: Text(
            text,
            style: Schrift.klein.copyWith(
              fontWeight: FontWeight.w600,
              color: aktiv ? Farben.creme : Farben.ink900,
            ),
          ),
        ),
      );
}

class SsEyebrow extends StatelessWidget {
  const SsEyebrow(this.text, {super.key, this.farbe});
  final String text;
  final Color? farbe;
  @override
  Widget build(BuildContext context) =>
      Text(text.toUpperCase(), style: Schrift.eyebrow.copyWith(color: farbe));
}

/// Fortschritt als Balken. Bewusst kein Ring und kein Kreisdiagramm. Die
/// Aussage steht als abzählbare Grösse daneben.
class SsBalken extends StatelessWidget {
  const SsBalken({super.key, required this.anteil, this.farbe});
  final double anteil;
  final Color? farbe;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: SizedBox(
          height: 5,
          child: Stack(children: [
            Container(color: Farben.tan100),
            FractionallySizedBox(
              widthFactor: anteil.clamp(0, 1),
              child: Container(color: farbe ?? Farben.tan500),
            ),
          ]),
        ),
      );
}

/// Quadratische Icon-Fläche in Tan, wie im Design-System.
class SsIconFlaeche extends StatelessWidget {
  const SsIconFlaeche(this.icon, {super.key, this.groesse = 44});
  final IconData icon;
  final double groesse;
  @override
  Widget build(BuildContext context) => Container(
        width: groesse,
        height: groesse,
        decoration: BoxDecoration(
          color: Farben.tan100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: groesse * 0.5, color: Farben.tan600),
      );
}

class SsListenZeile extends StatelessWidget {
  const SsListenZeile({
    super.key,
    required this.titel,
    this.untertitel,
    this.icon,
    this.anteil,
    this.nachher,
    this.onTap,
  });
  final String titel;
  final String? untertitel;
  final IconData? icon;
  final double? anteil;
  final Widget? nachher;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => SsKarte(
        onTap: onTap,
        polster: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        kind: Row(children: [
          if (icon != null) ...[SsIconFlaeche(icon!), const SizedBox(width: 14)],
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(titel, style: Schrift.h4),
              if (untertitel != null) ...[
                const SizedBox(height: 2),
                Text(untertitel!, style: Schrift.klein),
              ],
              if (anteil != null) ...[
                const SizedBox(height: 8),
                SsBalken(anteil: anteil!),
              ],
            ]),
          ),
          if (nachher != null) nachher!,
          if (nachher == null && onTap != null)
            const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
        ]),
      );
}

/// Der Satz, der eine Zahl einordnet. Jede Kennzahl trägt Zeitraum und Fach.
class SsKennzahl extends StatelessWidget {
  const SsKennzahl({super.key, required this.wert, required this.titel, required this.zusatz});
  final String wert;
  final String titel;
  final String zusatz;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(wert, style: Schrift.kennzahlKlein),
          const SizedBox(height: 4),
          Text(titel, style: Schrift.label),
          const SizedBox(height: 2),
          Text(zusatz, style: Schrift.klein),
        ],
      );
}

/// Ein- oder Mehrzahl, je nach Anzahl.
///
/// «0 von 1 Themen» ist rechnerisch richtig und trotzdem falsches Deutsch —
/// und es steht ausgerechnet dort, wo ein Oberthema nur ein Thema hat.
String zahlwort(int n, String ein, String mehr) => '$n ${n.abs() == 1 ? ein : mehr}';

/// Eine Wahlkarte. Standortbestimmung und Selbsttest brauchen dieselbe.
///
/// Sie lag als privates `_Wahl` im Selbsttest, und die Standortbestimmung
/// hätte sie ein zweites Mal gebraucht. Zwei Kopien derselben Karte laufen
/// beim ersten Designwechsel auseinander.
class SsWahl extends StatelessWidget {
  const SsWahl({
    super.key,
    required this.titel,
    required this.untertitel,
    required this.gewaehlt,
    required this.onTap,
  });
  final String titel;
  final String untertitel;
  final bool gewaehlt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          decoration: BoxDecoration(
            color: gewaehlt ? Farben.tan100 : Farben.karte,
            border: Border.all(
              color: gewaehlt ? Farben.ink900 : Farben.linie,
              width: gewaehlt ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(Mass.radiusKarte),
          ),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(titel, style: Schrift.h4),
                const SizedBox(height: 3),
                Text(untertitel, style: Schrift.klein),
              ]),
            ),
            if (gewaehlt) const Icon(Icons.check, size: 20, color: Farben.ink900),
          ]),
        ),
      );
}

/// Der Lesetext beim Textverständnis.
///
/// Ein Text, mehrere Fragen, wie in der Prüfung. Er steht über der Aufgabe
/// und lässt sich einklappen: Auf einem Telefon schöbe er die Frage sonst bei
/// jeder Aufgabe aus dem Bild.
class Lesetext extends StatefulWidget {
  const Lesetext(this.text, {super.key});
  final String text;

  @override
  State<Lesetext> createState() => _LesetextState();
}

class _LesetextState extends State<Lesetext> {
  bool _offen = true;

  @override
  Widget build(BuildContext context) {
    // Die erste Zeile ist der Titel des Textes, der Rest sind die Absätze.
    final teile = widget.text.split('\n\n');
    final titel = teile.length > 1 ? teile.first : 'Der Text';
    final absaetze = teile.length > 1 ? teile.sublist(1) : teile;

    return Container(
      decoration: BoxDecoration(
        color: Farben.karte,
        border: Border.all(color: Farben.linie),
        borderRadius: BorderRadius.circular(Mass.radiusKarte),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: [
        Semantics(
          expanded: _offen,
          child: InkWell(
            onTap: () => setState(() => _offen = !_offen),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const SsEyebrow('Lesetext'),
                    const SizedBox(height: 6),
                    Text(titel, style: Schrift.h4),
                  ]),
                ),
                AnimatedRotation(
                  turns: _offen ? 0.25 : 0,
                  duration: const Duration(milliseconds: 150),
                  child: const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                ),
              ]),
            ),
          ),
        ),
        if (_offen)
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Farben.linie)),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (final a in absaetze) ...[
                Text(a, style: Schrift.bodyKlein),
                const SizedBox(height: 10),
              ],
            ]),
          ),
      ]),
    );
  }
}
