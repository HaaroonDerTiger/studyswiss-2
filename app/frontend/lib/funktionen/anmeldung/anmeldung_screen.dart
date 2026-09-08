import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../widgets/studi.dart';

import '../../widgets/grundbausteine.dart';
import '../sitzung.dart';

/// Screen 4. Anmeldung.
///
/// Drei gleichwertige Wege. Auf iOS steht Apple oben (App Store Review 4.8
/// verlangt Sign in with Apple, sobald ein zweiter Anbieter da ist), auf
/// Android Google. Eine E-Mail-Passwort-Anmeldung gibt es nicht.
class AnmeldungScreen extends ConsumerWidget {
  const AnmeldungScreen({super.key});

  bool get _istApple => !kIsWeb && (Platform.isIOS || Platform.isMacOS);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final zustand = ref.watch(sitzungProvider);
    final steuer = ref.read(sitzungProvider.notifier);

    ref.listen(sitzungProvider, (_, neu) {
      if (neu.profil == null) return;
      context.go(neu.profil!.onboardingFertig ? '/lernen' : '/kanton');
    });

    final apple = SsKnopf(
      'Mit Apple anmelden',
      art: SsKnopfArt.apple,
      icon: const Icon(Icons.apple, color: Colors.white, size: 22),
      onTap: zustand.laedt ? null : steuer.mitApple,
    );
    final google = SsKnopf(
      'Mit Google anmelden',
      art: SsKnopfArt.google,
      icon: const _GoogleG(),
      onTap: zustand.laedt ? null : steuer.mitGoogle,
    );

    return PapierGrund(
      kind: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              const Center(child: StudiBild(Studi.winken, breite: 170)),
              const Spacer(),
              const SsEyebrow('Anmelden'),
              const SizedBox(height: 10),
              Text('Damit dein Fortschritt\nnicht verloren geht.', style: Schrift.h1),
              const SizedBox(height: 12),
              Text(
                'Du kannst auch ohne Konto starten und dich später anmelden. '
                'Dein Fortschritt wandert dann mit.',
                style: Schrift.body,
              ),
              const SizedBox(height: 32),

              // Reihenfolge nach Plattform: oben steht der erwartete Weg.
              if (_istApple) ...[apple, const SizedBox(height: 12), google]
              else ...[google, const SizedBox(height: 12), apple],

              const SizedBox(height: 12),
              SsKnopf(
                'Ohne Konto weiterlernen',
                art: SsKnopfArt.text,
                onTap: zustand.laedt ? null : steuer.alsGast,
              ),

              if (zustand.fehler != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Farben.rot100,
                    border: Border.all(color: Farben.rot),
                    borderRadius: BorderRadius.circular(Mass.radiusKnopf),
                  ),
                  child: Text(zustand.fehler!,
                      style: Schrift.bodyKlein.copyWith(color: Farben.ink900)),
                ),
              ],

              const Spacer(),
              Text(
                'Mit der Anmeldung akzeptierst du die Nutzungsbedingungen. '
                'Wir speichern nur, was zum Lernen nötig ist, und geben nichts weiter. '
                'Du kannst dein Konto jederzeit in den Einstellungen löschen.',
                style: Schrift.klein,
              ),
              const SizedBox(height: Mass.seitenrand),
            ],
          ),
        ),
      ),
    );
  }
}

class _GoogleG extends StatelessWidget {
  const _GoogleG();
  @override
  Widget build(BuildContext context) => Container(
        width: 20,
        height: 20,
        alignment: Alignment.center,
        decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF4285F4)),
        child: const Text('G',
            style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
      );
}
