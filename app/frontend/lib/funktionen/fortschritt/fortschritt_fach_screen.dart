import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';

final _fortschrittFachProvider =
    FutureProvider.autoDispose((ref) => ref.watch(lernRepoProvider).fortschritt());

final _fortschrittBaumProvider = FutureProvider.autoDispose.family(
  (ref, String bereich) => ref.watch(katalogRepoProvider).themen(bereich),
);

/// Screen 24. Fortschritt je Prüfungsfach.
///
/// Erst das ganze Fach, dann die Bereiche, darin die Oberthemen, und die
/// Unterthemen klappen über den Pfeil auf. Dieselbe Ordnung wie unter
/// «Lernen»; wer sich dort zurechtfindet, findet sich hier zurecht.
///
/// **Abzählbare Grössen, keine Kreisdiagramme.** Jede Zahl trägt ihren
/// Bezug: «13 von 20 Pflichtaufgaben», nicht «65 %».
class FortschrittFachScreen extends ConsumerStatefulWidget {
  const FortschrittFachScreen({super.key, required this.fach});
  final String fach;

  @override
  ConsumerState<FortschrittFachScreen> createState() => _FortschrittFachScreenState();
}

class _FortschrittFachScreenState extends ConsumerState<FortschrittFachScreen> {
  /// Offene Oberthemen, je Bereich. Oberthema 2 gibt es in Mathematik und in
  /// Deutsch. Der Schlüssel muss den Bereich mittragen.
  final _offen = <String>{};

  @override
  Widget build(BuildContext context) {
    final f = ref.watch(_fortschrittFachProvider);
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(_zeile(f.valueOrNull)?.name ?? ''),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: f.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
          data: (d) {
            final z = _zeile(d);
            if (z == null) {
              return Center(child: Text('Dieses Fach gibt es nicht.', style: Schrift.body));
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(
                  Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
              children: [
                SsDunkleKarte(
                  kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const SsEyebrow('Abgeschlossene Themen', farbe: Farben.tan300),
                    const SizedBox(height: 6),
                    Text('${z.abgeschlossen} von ${z.total}',
                        style: Schrift.kennzahlKlein.copyWith(color: Farben.creme)),
                    const SizedBox(height: 6),
                    Text(
                      '${z.name} · ${z.pflichtGeloest} von ${z.pflichtTotal} '
                      'Pflichtaufgaben · seit Beginn',
                      style: Schrift.klein.copyWith(color: Farben.tan300),
                    ),
                  ]),
                ),
                for (final b in z.bereiche) ...[
                  const SizedBox(height: 22),
                  SsEyebrow('${b.kurzname} · ${b.abgeschlossen} von ${b.total} Themen'),
                  const SizedBox(height: 10),
                  _BereichsBaum(
                    bereich: b,
                    offen: _offen,
                    umschalten: (k) => setState(
                        () => _offen.contains(k) ? _offen.remove(k) : _offen.add(k)),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  FachZeile? _zeile(Fortschritt? d) {
    for (final z in d?.faecher ?? const <FachZeile>[]) {
      if (z.fach == widget.fach) return z;
    }
    return null;
  }
}

class _BereichsBaum extends ConsumerWidget {
  const _BereichsBaum({
    required this.bereich,
    required this.offen,
    required this.umschalten,
  });
  final BereichZeile bereich;
  final Set<String> offen;
  final void Function(String) umschalten;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final baum = ref.watch(_fortschrittBaumProvider(bereich.bereich));
    return baum.when(
      loading: () => const SizedBox(height: 60),
      error: (e, _) => Text('Themen nicht geladen.', style: Schrift.klein),
      data: (b) => Column(children: [
        for (final o in b.oberthemen) ...[
          _OberthemaZeile(
            oberthema: o,
            bereich: bereich.bereich,
            offen: offen.contains('${bereich.bereich}|${o.nr}'),
            umschalten: () => umschalten('${bereich.bereich}|${o.nr}'),
          ),
          const SizedBox(height: 8),
        ],
      ]),
    );
  }
}

class _OberthemaZeile extends StatelessWidget {
  const _OberthemaZeile({
    required this.oberthema,
    required this.bereich,
    required this.offen,
    required this.umschalten,
  });
  final Oberthema oberthema;
  final String bereich;
  final bool offen;
  final VoidCallback umschalten;

  @override
  Widget build(BuildContext context) {
    final o = oberthema;
    final total = o.unterthemen.fold<int>(0, (a, u) => a + u.pflichtset);
    return Container(
      decoration: BoxDecoration(
        color: Farben.karte,
        border: Border.all(color: Farben.linie),
        borderRadius: BorderRadius.circular(Mass.radiusKarte),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: [
        Semantics(
          expanded: offen,
          child: InkWell(
            onTap: umschalten,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${o.nr}. ${o.name}', style: Schrift.h4),
                    const SizedBox(height: 6),
                    Text('${o.unterthemen.length} Themen · $total Pflichtaufgaben',
                        style: Schrift.klein),
                  ]),
                ),
                AnimatedRotation(
                  turns: offen ? 0.25 : 0,
                  duration: const Duration(milliseconds: 150),
                  child: const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                ),
              ]),
            ),
          ),
        ),
        if (offen)
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Farben.linie)),
            ),
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: Column(children: [
              for (final u in o.unterthemen)
                InkWell(
                  onTap: () =>
                      context.push('/uebung?unterthema=${u.code}&fach=$bereich'),
                  child: Container(
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: Farben.linie)),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(u.name, style: Schrift.h4),
                          const SizedBox(height: 3),
                          Text('${u.pflichtset} Pflichtaufgaben', style: Schrift.klein),
                        ]),
                      ),
                      const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                    ]),
                  ),
                ),
            ]),
          ),
      ]),
    );
  }
}
