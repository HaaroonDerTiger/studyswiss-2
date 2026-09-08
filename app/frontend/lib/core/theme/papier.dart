import 'package:flutter/material.dart';
import 'farben.dart';

/// Warmes Beige mit 24-px-Karoraster in Tan bei 10 % Deckkraft.
/// Das Raster liegt auf jedem Screen und ist Teil der Marke, nicht Zierde.
class PapierGrund extends StatelessWidget {
  const PapierGrund({super.key, required this.kind});
  final Widget kind;

  @override
  Widget build(BuildContext context) => Material(
        // `Material`, nicht `DecoratedBox`.
        //
        // Ohne einen Material-Vorfahren hat Flutter keinen voreingestellten
        // Textstil und zeichnet **jeden Text mit gelber Doppellinie** — als
        // sichtbare Warnung an die Entwicklerin. Sechs Screens bauen auf
        // `PapierGrund` statt auf `Scaffold`, darunter die drei ersten, die
        // ein Kind ueberhaupt zu sehen bekommt: Splash, Onboarding und
        // Anmeldung. Im Simulator faellt das kaum auf, auf einem Telefon
        // sofort.
        //
        // `Material` bringt den Textstil mit und faerbt zugleich die Flaeche;
        // die Papierfarbe bleibt also, wo sie war.
        color: Farben.papier,
        child: CustomPaint(painter: _RasterMaler(), child: kind),
      );
}

class _RasterMaler extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Tan bei 10 % Deckkraft, als Literal statt withValues() — das gibt es
    // erst ab Flutter 3.27, und die Zahl soll ohnehin fest sein.
    final stift = Paint()
      ..color = const Color(0x1AB0834F)
      ..strokeWidth = 1;
    for (var x = 0.0; x <= size.width; x += Mass.raster) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), stift);
    }
    for (var y = 0.0; y <= size.height; y += Mass.raster) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), stift);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter alt) => false;
}
