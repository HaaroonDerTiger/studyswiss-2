import 'package:flutter/material.dart';
import '../core/theme/farben.dart';
import '../core/theme/typografie.dart';

/// Studi, die Eule.
///
/// Acht Stimmungen, alle auf denselben Rahmen zugeschnitten (600 × 536) —
/// so springt die Figur nicht, wenn die Stimmung wechselt.
///
/// **Sparsam einsetzen.** Die App lebt von Papier, Raster und zwei Schriften;
/// Studi ist der eine Platz, an dem sie Wärme zeigt. Sie erscheint dort, wo
/// eine Person gerade etwas fühlt, beim Ankommen, beim Treffen, beim
/// Danebenliegen, beim Warten, vor einer leeren Liste. Nicht als Dekoration
/// auf jeder Karte.
enum Studi {
  /// Splash und Onboarding: Willkommen.
  winken('studi-winken'),

  /// Vor einer Aufgabe, bei einem Tipp, in der Standortbestimmung.
  denkend('studi-denkend'),

  /// Richtig geantwortet, Übung bestanden, Thema abgeschlossen.
  erfolg('studi-erfolg'),

  /// Danebengelegen. Nie hämisch. Studi wischt sich den Schweiss ab.
  hoppla('studi-hoppla'),

  /// Allgemein positiv: Eltern-Report, Plus freigeschaltet.
  froehlich('studi-froehlich'),

  /// Während etwas lädt.
  laden('studi-laden'),

  /// Leere Liste: keine Fehler im Archiv, nichts mehr offen.
  leer('studi-leer'),

  /// Kein Termin gesetzt, nichts zu tun, Prüfung vorbei.
  schlafend('studi-schlafend');

  const Studi(this.datei);
  final String datei;

  String get pfad => 'assets/studi/$datei.png';
}

/// Zeigt Studi in einer Stimmung.
class StudiBild extends StatelessWidget {
  const StudiBild(this.stimmung, {super.key, this.breite = 180});

  final Studi stimmung;
  final double breite;

  /// Das Seitenverhältnis des gemeinsamen Rahmens.
  static const _verhaeltnis = 600 / 536;

  @override
  Widget build(BuildContext context) => Image.asset(
        stimmung.pfad,
        width: breite,
        height: breite / _verhaeltnis,
        fit: BoxFit.contain,
        // Wenn das Bild fehlt, soll der Screen trotzdem stehen. Eine
        // Illustration ist nie der Grund, warum eine Übung nicht startet.
        errorBuilder: (_, __, ___) => SizedBox(width: breite, height: breite / _verhaeltnis),
      );
}

/// Ein leerer Zustand mit Studi, Titel und einem Satz.
///
/// Überall dort, wo eine Liste nichts zu zeigen hat. Ein leerer Screen ohne
/// Erklärung wirkt wie ein Fehler; mit Erklärung wirkt er wie eine Auskunft.
class StudiLeer extends StatelessWidget {
  const StudiLeer({
    super.key,
    required this.stimmung,
    required this.titel,
    required this.text,
    this.knopf,
  });

  final Studi stimmung;
  final String titel;
  final String text;
  final Widget? knopf;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              StudiBild(stimmung, breite: 170),
              const SizedBox(height: 16),
              Text(titel, style: Schrift.h2, textAlign: TextAlign.center),
              const SizedBox(height: 10),
              Text(text, style: Schrift.body, textAlign: TextAlign.center),
              if (knopf != null) ...[const SizedBox(height: 24), knopf!],
            ],
          ),
        ),
      );
}

/// Ladeanzeige mit Studi statt eines drehenden Kreises.
///
/// Der Kreis sagt «warte»; Studi sagt «wir sind noch da». Bei etwas, das
/// zehn Sekunden dauern kann. Der Aufsatzkorrektur —, ist das der
/// Unterschied zwischen Geduld und Abbruch.
class StudiLaden extends StatelessWidget {
  const StudiLaden({super.key, this.text});
  final String? text;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const StudiBild(Studi.laden, breite: 140),
            const SizedBox(height: 14),
            if (text != null) Text(text!, style: Schrift.body, textAlign: TextAlign.center),
            const SizedBox(height: 14),
            const SizedBox(
              width: 90,
              child: LinearProgressIndicator(
                minHeight: 4,
                backgroundColor: Farben.tan100,
                color: Farben.tan500,
              ),
            ),
          ],
        ),
      );
}
