import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'farben.dart';

/// Zwei Schriften, mehr nicht: Bitter für Überschriften und alle Zahlen,
/// Nunito Sans für Fliesstext und UI.
abstract final class Schrift {
  static TextStyle _bitter(double groesse, FontWeight g,
          {Color? farbe, double? hoehe, double? abstand}) =>
      GoogleFonts.bitter(
        fontSize: groesse,
        fontWeight: g,
        color: farbe ?? Farben.ink900,
        height: hoehe,
        letterSpacing: abstand,
      );

  static TextStyle _nunito(double groesse, FontWeight g,
          {Color? farbe, double? hoehe, double? abstand}) =>
      GoogleFonts.nunitoSans(
        fontSize: groesse,
        fontWeight: g,
        color: farbe ?? Farben.ink900,
        height: hoehe,
        letterSpacing: abstand,
      );

  // Bitter
  static TextStyle get display => _bitter(34, FontWeight.w700, hoehe: 1.1, abstand: -0.68);
  static TextStyle get h1 => _bitter(27, FontWeight.w600, hoehe: 1.18, abstand: -0.4);
  static TextStyle get titel => _bitter(20, FontWeight.w600);
  static TextStyle get h2 => _bitter(18, FontWeight.w600, hoehe: 1.32);
  static TextStyle get h3 => _bitter(17, FontWeight.w600, hoehe: 1.32);
  static TextStyle get h4 => _bitter(15, FontWeight.w600, hoehe: 1.35);
  /// Kennzahlen stehen immer in Bitter. Nie in der UI-Schrift.
  static TextStyle get kennzahl => _bitter(44, FontWeight.w600, hoehe: 1, abstand: -1.1);
  static TextStyle get kennzahlKlein => _bitter(30, FontWeight.w700, hoehe: 1);

  // Nunito Sans
  static TextStyle get body => _nunito(15, FontWeight.w400, farbe: Farben.ink500, hoehe: 1.5);
  static TextStyle get bodyKlein => _nunito(14, FontWeight.w400, farbe: Farben.ink500, hoehe: 1.5);
  static TextStyle get klein => _nunito(12, FontWeight.w400, farbe: Farben.ink300, hoehe: 1.45);
  static TextStyle get label => _nunito(13, FontWeight.w700);
  static TextStyle get knopf => _nunito(15, FontWeight.w700);

  /// Versale Kleinschrift über Titeln. Immer tan600, immer gesperrt.
  static TextStyle get eyebrow =>
      _nunito(10, FontWeight.w700, farbe: Farben.tan600, abstand: 1.1);
}
