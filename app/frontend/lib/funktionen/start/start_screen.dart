import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../sitzung.dart';
import '../../widgets/studi.dart';


/// Screen 1. Splash. 1,2 Sekunden, dann weiter. Beim zweiten Start geht es
/// direkt nach «Lernen»: Wer die App kennt, will lernen, nicht begrüsst werden.
class StartScreen extends ConsumerStatefulWidget {
  const StartScreen({super.key});
  @override
  ConsumerState<StartScreen> createState() => _StartScreenState();
}

class _StartScreenState extends ConsumerState<StartScreen> {
  @override
  void initState() {
    super.initState();
    _weiter();
  }

  Future<void> _weiter() async {
    final warten = Future<void>.delayed(const Duration(milliseconds: 1200));
    await ref.read(sitzungProvider.notifier).wiederaufnehmen();
    await warten;
    if (!mounted) return;
    final p = ref.read(sitzungProvider).profil;
    if (p == null) {
      context.go('/onboarding');
    } else if (!p.onboardingFertig) {
      context.go('/kanton');
    } else {
      context.go('/lernen');
    }
  }

  @override
  Widget build(BuildContext context) => PapierGrund(
        kind: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const StudiBild(Studi.winken, breite: 220),
              const SizedBox(height: 16),
              RichText(
                text: TextSpan(children: [
                  TextSpan(text: 'Study', style: Schrift.display),
                  TextSpan(
                    text: 'swiss',
                    style: Schrift.display.copyWith(color: Farben.tan500),
                  ),
                ]),
              ),
              const SizedBox(height: 8),
              Text('Aufnahmeprüfung', style: Schrift.eyebrow),
            ],
          ),
        ),
      );
}
