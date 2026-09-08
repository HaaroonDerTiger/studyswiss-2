import 'package:flutter/material.dart';
import '../core/theme/typografie.dart';

/// Text, in dem Brüche wie im Heft stehen: Zähler über Nenner, dazwischen
/// der Strich.
///
/// In den Daten steht ein Bruch als `⁴⁄₆`. Hochgestellter Zähler,
/// Bruchstrich U+2044, tiefgestellter Nenner. Das ist eine gewöhnliche
/// Zeichenkette: Sie reist durch Backend, Vorschau und gespeicherten
/// Fortschritt, bleibt überall lesbar und braucht kein Markup in den
/// Vorlagen. Erst hier wird daraus die zweizeilige Schreibweise.
///
/// Getippt wird ein Bruch weiterhin als `5/12`; `alsZahl` im Backend
/// versteht beide Schreibweisen. Eine Tastatur kennt kein ⁵⁄₁₂.
final _bruch = RegExp(r'([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)⁄([₀₁₂₃₄₅₆₇₈₉₋]+)');

const _zurueck = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6',
  '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6',
  '₇': '7', '₈': '8', '₉': '9', '₋': '-',
};

String _ziffern(String s) => s.split('').map((c) => _zurueck[c] ?? c).join();

class MatheText extends StatelessWidget {
  const MatheText(this.text, {super.key, this.stil, this.zeilen});
  final String text;
  final TextStyle? stil;
  final int? zeilen;

  @override
  Widget build(BuildContext context) {
    final basis = stil ?? Schrift.body;
    // Der häufige Fall kostet nichts: Wo kein Bruch steht, bleibt es ein
    // gewöhnlicher Text.
    if (!_bruch.hasMatch(text)) {
      return Text(text,
          style: basis,
          maxLines: zeilen,
          overflow: zeilen == null ? TextOverflow.clip : TextOverflow.ellipsis);
    }
    final teile = <InlineSpan>[];
    var i = 0;
    for (final m in _bruch.allMatches(text)) {
      if (m.start > i) teile.add(TextSpan(text: text.substring(i, m.start)));
      teile.add(WidgetSpan(
        alignment: PlaceholderAlignment.middle,
        child: BruchZeichen(
          zaehler: _ziffern(m.group(1)!),
          nenner: _ziffern(m.group(2)!),
          stil: basis,
        ),
      ));
      i = m.end;
    }
    if (i < text.length) teile.add(TextSpan(text: text.substring(i)));
    return Text.rich(
      TextSpan(style: basis, children: teile),
      maxLines: zeilen,
      overflow: zeilen == null ? TextOverflow.clip : TextOverflow.ellipsis,
    );
  }
}

/// Ein einzelner Bruch. Der Strich ist so breit wie die längere der beiden
/// Zahlen. Darum steht er in einem `IntrinsicWidth`, nicht auf fester Breite.
class BruchZeichen extends StatelessWidget {
  const BruchZeichen({
    super.key,
    required this.zaehler,
    required this.nenner,
    required this.stil,
  });
  final String zaehler;
  final String nenner;
  final TextStyle stil;

  @override
  Widget build(BuildContext context) {
    // Etwas kleiner als der Fliesstext, damit die zwei Zeilen zusammen nicht
    // höher werden als die Zeile drumherum.
    final klein = stil.copyWith(
      fontSize: (stil.fontSize ?? 15) * 0.82,
      height: 1.05,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: IntrinsicWidth(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(zaehler, style: klein, textAlign: TextAlign.center),
            Container(
              height: 1.4,
              margin: const EdgeInsets.symmetric(vertical: 1.5),
              color: stil.color ?? Colors.black,
            ),
            Text(nenner, style: klein, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
