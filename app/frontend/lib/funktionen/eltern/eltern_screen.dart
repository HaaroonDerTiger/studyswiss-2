import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';
import '../../widgets/studi.dart';


final _reportProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(lernRepoProvider).elternReport(),
);

/// Screen 34. Eltern-Report.
///
/// Jede Zahl trägt Zeitraum und Fachbezug, und **alle beziehen sich auf
/// dieselbe Woche**. Es steht «Aufnahmeprüfung», nie «ZAP». Keine Aufsatztexte,
/// keine einzelnen Aufgaben, und die Freigabe erteilt die Schülerin selbst.
class ElternScreen extends ConsumerWidget {
  const ElternScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(_reportProvider);
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Eltern-Report'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        ),
        body: report.when(
          loading: () => const StudiLaden(),
          error: (e, _) => const _NichtFreigegeben(),
          data: (r) => r == null
              ? const _NichtFreigegeben()
              : ListView(
                  padding: const EdgeInsets.fromLTRB(
                      Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
                  children: [
                    const SsEyebrow('Vorbereitung auf die Aufnahmeprüfung'),
                    const SizedBox(height: 8),
                    Text(r.vorname == null ? 'Der Report' : 'Report zu ${r.vorname}',
                        style: Schrift.h1),
                    const SizedBox(height: 6),
                    Text('Zeitraum: ${r.zeitraum}', style: Schrift.body),
                    const SizedBox(height: 20),
                    for (final k in r.kennzahlen) ...[
                      SsKarte(
                        polster: const EdgeInsets.all(16),
                        kind: Row(children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(k.titel, style: Schrift.h4),
                                const SizedBox(height: 3),
                                // Fach und Zeitraum stehen bei jeder Zahl.
                                Text('${k.fach} · ${k.zeitraum}', style: Schrift.klein),
                              ],
                            ),
                          ),
                          Text(k.wert, style: Schrift.kennzahlKlein),
                        ]),
                      ),
                      const SizedBox(height: 10),
                    ],
                    const SizedBox(height: 12),
                    Text(r.hinweis, style: Schrift.klein),
                  ],
                ),
        ),
      ),
    );
  }
}

class _NichtFreigegeben extends ConsumerWidget {
  const _NichtFreigegeben();

  @override
  Widget build(BuildContext context, WidgetRef ref) => StudiLeer(
        stimmung: Studi.froehlich,
        titel: 'Noch nicht freigegeben',
        text: 'Der Report zeigt vier Kennzahlen zu deinem Lernen, keine Aufsätze '
            'und keine einzelnen Aufgaben. Du entscheidest, ob deine Eltern ihn sehen.',
        knopf: SsKnopf('Jetzt freigeben', onTap: () async {
          await ref.read(lernRepoProvider).elternFreigabe(true);
          ref.invalidate(_reportProvider);
        }),
      );
}
