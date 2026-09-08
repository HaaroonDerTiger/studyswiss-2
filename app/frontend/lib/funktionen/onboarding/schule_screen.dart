import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/repos.dart';
import '../sitzung.dart';
import '../../widgets/grundbausteine.dart';

final _schultypenProvider = FutureProvider.family(
  (ref, String kanton) => ref.watch(katalogRepoProvider).schultypen(kanton),
);

/// Screen 6. Schulwahl.
///
/// Fünf einzelne Optionen statt einer Sammelkachel, begrenzt auf das Angebot
/// im gewählten Kanton. Auch das kam aus dem Feedback.
class SchuleScreen extends ConsumerWidget {
  const SchuleScreen({super.key, required this.kanton});
  final String kanton;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final typen = ref.watch(_schultypenProvider(kanton));
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Schritt 2 von 3')),
        body: typen.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
          data: (liste) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              const SsEyebrow('Wohin willst du?'),
              const SizedBox(height: 8),
              Text('Deine Schule', style: Schrift.h1),
              const SizedBox(height: 20),
              for (final t in liste) ...[
                SsKarte(
                  onTap: () async {
                    // Über den Controller, damit der naechste Screen den neuen
                    // Stand sofort sieht, samt vorbelegtem Pruefungstermin.
                    await ref
                        .read(sitzungProvider.notifier)
                        .speichereOnboarding(kanton: kanton, schultyp: t.id);
                    if (context.mounted) context.go('/termin');
                  },
                  polster: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  kind: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(t.name, style: Schrift.h3),
                        const SizedBox(height: 3),
                        // §6 verlangt hier Prüfungsname UND Fächer. Der
                        // Prüfungsname steht nur, wo der Kanton wirklich einen
                        // führt. «ZAP 2» ist Zürcher; Bern hat kein Kürzel,
                        // und dann steht dort nichts statt einer Erfindung.
                        Text(
                          [if (t.pruefung.isNotEmpty) t.pruefung, t.faecherZeile]
                              .where((x) => x.isNotEmpty)
                              .join(' · '),
                          style: Schrift.klein,
                        ),
                      ]),
                    ),
                    const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                  ]),
                ),
                const SizedBox(height: 10),
              ],
              if (liste.isEmpty)
                Text('Für diesen Kanton ist noch kein Prüfungsstoff hinterlegt.',
                    style: Schrift.body),
            ],
          ),
        ),
      ),
    );
  }
}
