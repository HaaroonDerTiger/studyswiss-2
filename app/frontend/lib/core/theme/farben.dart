import 'package:flutter/material.dart';

/// Die Farben stammen aus `gestaltung/design frontend/03_Screens_HTML/DesignSystem.dc.html`
/// und werden nicht neu erfunden. Kein Screen schreibt eine Farbe als Literal.
abstract final class Farben {
  // Braun. Text, Primärknopf, dunkle Flächen
  static const ink900 = Color(0xFF3A1D0A);
  static const ink700 = Color(0xFF5C3A1E);
  static const ink500 = Color(0xFF7C5836);
  static const ink300 = Color(0xFFA98B66);

  // Tan. Marke, Fortschritt, Rahmen
  static const tan600 = Color(0xFFB0834F);
  static const tan500 = Color(0xFFC99A66);
  static const tan300 = Color(0xFFE4CBA9);
  static const tan100 = Color(0xFFF2E4CF);

  // Flächen
  static const papier = Color(0xFFFBF5EA);
  static const karte = Color(0xFFFFFDF8);
  static const linie = Color(0xFFEADCC6);
  static const creme = Color(0xFFFFF7EA);

  /// Rot ist Marke und Fehler. Sonst nichts.
  static const rot = Color(0xFFE2231A);
  static const rot100 = Color(0xFFFBE3E1);
  static const gruen = Color(0xFF3F7A4D);
  static const gruen100 = Color(0xFFE3F0E4);
  static const gelb = Color(0xFFD99A2B);
  static const gelb100 = Color(0xFFFAEED6);
}

/// Masse, die im ganzen Design gleich sind.
abstract final class Mass {
  static const seitenrand = 24.0;
  static const knopfHoehe = 54.0;
  static const tabHoehe = 86.0;
  static const radiusKarte = 16.0;
  static const radiusDunkel = 18.0;
  static const radiusKnopf = 14.0;
  static const radiusChip = 9.0;
  static const radiusSheet = 20.0;
  /// Das Karoraster der Papierfläche.
  static const raster = 24.0;
}
