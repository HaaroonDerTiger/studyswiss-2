import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';

/// Die Seite eines Bereichs mit `art: "tipps"`.
///
/// Es gibt Prüfungsteile, die man nicht antippen kann: das Hörverstehen im
/// Französisch und die mündliche Prüfung. Ein Video hat die App nicht, ein
/// Gegenüber auch nicht. Was sie hat, ist das Verfahren. Was in welcher
/// Reihenfolge geschieht, worauf es dabei ankommt und welche Sätze man vorher
/// können sollte. Und zum Schluss die Unterthemen, die sich sehr wohl üben
/// lassen: Zahlen, Uhrzeit, Fragen bilden.
///
/// Der Alternative, den Prüfungsteil verschweigen, steht entgegen, dass er
/// an der Prüfung ein Fünftel der Punkte trägt.
final tippsProvider = FutureProvider.autoDispose.family<TippsSeite, String>(
  (ref, bereich) => ref.watch(katalogRepoProvider).tipps(bereich),
);

class TippsScreen extends ConsumerWidget {
  const TippsScreen({super.key, required this.bereich});
  final String bereich;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final seite = ref.watch(tippsProvider(bereich));

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(seite.valueOrNull?.titel ?? ''),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: seite.when(
          loading: () =>
              const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) =>
              Center(child: Text('Nicht geladen.', style: Schrift.body)),
          data: (t) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              SsEyebrow(t.eyebrow),
              const SizedBox(height: 6),
              Text(t.titel, style: Schrift.h1),
              const SizedBox(height: 12),
              Text(t.einleitung, style: Schrift.body),
              const SizedBox(height: 22),

              // 1. Der Ablauf. Wer weiss, was als Nächstes kommt, verliert
              // die ersten Minuten nicht an die Nervosität.
              const SsEyebrow('So läuft die Prüfung ab'),
              const SizedBox(height: 10),
              for (final a in t.ablauf) ...[
                _Schritt(schritt: a),
                const SizedBox(height: 8),
              ],

              // 2. Die Tipps, nach Abschnitten.
              for (final ab in t.abschnitte) ...[
                const SizedBox(height: 16),
                SsEyebrow(ab.titel),
                const SizedBox(height: 10),
                for (final x in ab.tipps) ...[
                  SsKarte(
                    kind: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(x.regel, style: Schrift.h4),
                          const SizedBox(height: 6),
                          Text(x.warum, style: Schrift.body),
                        ]),
                  ),
                  const SizedBox(height: 8),
                ],
              ],

              // 3. Redemittel. Was man auswendig kann, kostet im Gespräch
              // keine Denkzeit.
              if (t.redemittel.isNotEmpty) ...[
                const SizedBox(height: 16),
                const SsEyebrow('Sätze, die du vorher können solltest'),
                const SizedBox(height: 10),
                for (final r in t.redemittel) ...[
                  SsKarte(
                    kind: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r.zweck, style: Schrift.label),
                          for (final s in r.saetze) ...[
                            const SizedBox(height: 6),
                            Text(s, style: Schrift.body),
                          ],
                        ]),
                  ),
                  const SizedBox(height: 8),
                ],
              ],

              // 4, Und das, was sich doch üben lässt.
              if (t.uebungen.isNotEmpty) ...[
                const SizedBox(height: 16),
                const SsEyebrow('Das lässt sich üben'),
                const SizedBox(height: 10),
                Text(
                  'Diese Unterthemen trainieren genau die Fertigkeiten, auf die es '
                  'in diesem Prüfungsteil ankommt.',
                  style: Schrift.klein,
                ),
                const SizedBox(height: 10),
                for (final u in t.uebungen) ...[
                  SsKarte(
                    onTap: () => context.push('/uebung', extra: {
                      'fach': u.bereich,
                      'unterthema': u.unterthema,
                    }),
                    kind: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Expanded(child: Text(u.name, style: Schrift.h4)),
                            const Icon(Icons.chevron_right,
                                size: 20, color: Farben.ink300),
                          ]),
                          const SizedBox(height: 6),
                          Text(u.warum, style: Schrift.body),
                        ]),
                  ),
                  const SizedBox(height: 8),
                ],
              ],

              const SizedBox(height: 20),
              Text(t.grundlage, style: Schrift.klein),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ein Schritt des Ablaufs: Nummer, Titel, allenfalls eine Dauer, Text.
class _Schritt extends StatelessWidget {
  const _Schritt({required this.schritt});
  final Ablaufschritt schritt;

  @override
  Widget build(BuildContext context) => SsKarte(
        kind: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            width: 30,
            child: Text('${schritt.nr}',
                style: Schrift.label.copyWith(color: Farben.tan600)),
          ),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(schritt.titel, style: Schrift.h4)),
                if (schritt.dauer.isNotEmpty) SsChip(schritt.dauer),
              ]),
              const SizedBox(height: 6),
              Text(schritt.text, style: Schrift.body),
            ]),
          ),
        ]),
      );
}
