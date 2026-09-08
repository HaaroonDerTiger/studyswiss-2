import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../widgets/studi.dart';

import '../../widgets/grundbausteine.dart';

/// Screens 2 und 3. Onboarding, **zwei Schritte, nicht mehr**.
///
/// Aus der Feedback-Runde: Der Screen «Fach, Thema, üben» ist raus, es gibt
/// keine 12-Tage-Serie und keine feste Lernzeit. Das Tempo gibt der
/// Prüfungstermin vor, nicht eine Zahl.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _seiten = PageController();
  int _seite = 0;

  static const _inhalt = [
    (
      stimmung: Studi.winken,
      eyebrow: 'Aufnahmeprüfung',
      titel: 'Die Prüfung,\nSchritt für Schritt.',
      text: 'Mathematik und Deutsch, genau nach dem Prüfungsstoff deines Kantons. '
          'Jede Aufgabe erklärt dir, was du gerade übst, und bei einem Fehler, '
          'woran es lag.',
    ),
    (
      stimmung: Studi.denkend,
      eyebrow: 'Dein Tempo',
      titel: 'Dein Termin gibt\ndas Tempo vor.',
      text: 'Du sagst uns, wann du die Prüfung schreibst. Danach richtet sich, was '
          'zuerst dran ist. Los geht es mit einer kurzen Standortbestimmung. '
          'sie gibt keine Note, sondern nur die Reihenfolge.',
    ),
  ];

  @override
  void dispose() {
    _seiten.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PapierGrund(
        kind: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: PageView.builder(
                  controller: _seiten,
                  itemCount: _inhalt.length,
                  onPageChanged: (i) => setState(() => _seite = i),
                  itemBuilder: (_, i) {
                    final s = _inhalt[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 24),
                          Center(child: StudiBild(s.stimmung, breite: 200)),
                          const Spacer(),
                          SsEyebrow(s.eyebrow),
                          const SizedBox(height: 10),
                          Text(s.titel, style: Schrift.display),
                          const SizedBox(height: 16),
                          Text(s.text, style: Schrift.body),
                          const SizedBox(height: 48),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
                child: Column(children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _inhalt.length,
                      (i) => Container(
                        width: i == _seite ? 20 : 7,
                        height: 7,
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        decoration: BoxDecoration(
                          color: i == _seite ? Farben.ink900 : Farben.tan300,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SsKnopf(
                    _seite == _inhalt.length - 1 ? 'Los geht es' : 'Weiter',
                    onTap: () {
                      if (_seite < _inhalt.length - 1) {
                        _seiten.nextPage(
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOut,
                        );
                      } else {
                        context.go('/anmeldung');
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  SsKnopf('Überspringen',
                      art: SsKnopfArt.text, onTap: () => context.go('/anmeldung')),
                ]),
              ),
            ],
          ),
        ),
      );
}
