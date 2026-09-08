import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../core/net/api.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';

final _kantoneProvider = FutureProvider((ref) => ref.watch(katalogRepoProvider).kantone());

/// Screen 5. Kantonswahl.
///
/// **Nur Kantone.** Kein Prüfungstyp, keine Fächerliste. Die kamen aus dem
/// Feedback raus, weil sie hier noch niemanden interessieren. Der Prüfungstyp
/// kommt im nächsten Schritt.
class KantonScreen extends ConsumerWidget {
  const KantonScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kantone = ref.watch(_kantoneProvider);
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Schritt 1 von 3')),
        body: kantone.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => _Fehler(text: Api.lesbar(e)),
          data: (liste) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              const SsEyebrow('Wo schreibst du?'),
              const SizedBox(height: 8),
              Text('Dein Kanton', style: Schrift.h1),
              const SizedBox(height: 20),
              for (final k in liste) ...[
                _KantonZeile(k),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 8),
              Text(
                'Andere Kantone kommen dazu, sobald der Prüfungsstoff dort vollständig erfasst ist.',
                style: Schrift.klein,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KantonZeile extends StatelessWidget {
  const _KantonZeile(this.kanton);
  final Kanton kanton;

  @override
  Widget build(BuildContext context) => Opacity(
        opacity: kanton.aktiv ? 1 : 0.45,
        child: SsKarte(
          onTap: kanton.aktiv ? () => context.go('/schule/${kanton.kuerzel}') : null,
          polster: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          kind: Row(children: [
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Farben.tan100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(kanton.kuerzel, style: Schrift.h4.copyWith(color: Farben.tan600)),
            ),
            const SizedBox(width: 14),
            Expanded(child: Text(kanton.name, style: Schrift.h3)),
            if (!kanton.aktiv)
              Text('bald', style: Schrift.klein)
            else
              const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
          ]),
        ),
      );
}

class _Fehler extends StatelessWidget {
  const _Fehler({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(Mass.seitenrand),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('Die Liste liess sich nicht laden.',
                style: Schrift.h3, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(text, style: Schrift.klein, textAlign: TextAlign.center),
          ]),
        ),
      );
}
