import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'farben.dart';
import 'typografie.dart';

/// Keine Schatten, keine Wellen, flache Flächen. Das Design lebt von Papier,
/// Raster und zwei Schriften. Material-Voreinstellungen wären hier im Weg.
ThemeData studyswissThema() {
  final basis = ThemeData.light(useMaterial3: true);
  return basis.copyWith(
    scaffoldBackgroundColor: Farben.papier,
    colorScheme: basis.colorScheme.copyWith(
      primary: Farben.ink900,
      onPrimary: Farben.creme,
      surface: Farben.karte,
      error: Farben.rot,
    ),
    textTheme: GoogleFonts.nunitoSansTextTheme(basis.textTheme).apply(
      bodyColor: Farben.ink900,
      displayColor: Farben.ink900,
    ),
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: Schrift.h2,
      iconTheme: const IconThemeData(color: Farben.ink700, size: 22),
    ),
    dividerTheme: const DividerThemeData(color: Farben.linie, thickness: 1, space: 1),
  );
}
