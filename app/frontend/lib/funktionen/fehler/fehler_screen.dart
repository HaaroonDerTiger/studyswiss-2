import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';
import '../../widgets/mathe_text.dart';
import '../../widgets/studi.dart';


final _fehlerProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(lernRepoProvider).fehlerarchiv(),
);

/// Screen 25. «Meine Fehler».
///
/// Gruppiert nach Unterthema, mit dem **Denkfehler** als Überschrift. «Nochmal»
/// erzeugt aus derselben `aufgabeRef` exakt dieselbe Aufgabe. Genau dafür
/// speichert die App Refs statt Aufgaben.
class FehlerScreen extends ConsumerWidget {
  const FehlerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gruppen = ref.watch(_fehlerProvider);
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Meine Fehler'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        ),
        body: gruppen.when(
          loading: () => const StudiLaden(),
          error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
          data: (liste) => liste.isEmpty
              ? const StudiLeer(
                  stimmung: Studi.leer,
                  titel: 'Noch keine offenen Fehler',
                  text: 'Was du später richtig löst, verschwindet hier wieder.',
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(
                      Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
                  children: [
                    for (final g in liste) ...[
                      Padding(
                        padding: const EdgeInsets.only(top: 16, bottom: 10),
                        child: Text(g.name, style: Schrift.h3),
                      ),
                      for (final e in g.eintraege) ...[
                        SsKarte(
                          polster: const EdgeInsets.all(16),
                          kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Container(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Farben.rot100,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(e.denkfehler,
                                    style: Schrift.klein.copyWith(
                                        color: Farben.rot, fontWeight: FontWeight.w700)),
                              ),
                              const Spacer(),
                              Text(e.datum, style: Schrift.klein),
                            ]),
                            const SizedBox(height: 10),
                            MatheText(e.stamm, stil: Schrift.bodyKlein),
                            if (e.feedback.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Farben.papier,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(e.feedback, style: Schrift.klein),
                              ),
                            ],
                            const SizedBox(height: 12),
                            SsKnopf(
                              'Nochmal versuchen',
                              art: SsKnopfArt.sekundaer,
                              // GENAU diese Aufgabe, nicht ein frisches Set
                              // zum Thema. Aus `templateId:seed` entsteht sie
                              // wieder. Dafuer speichert die App Refs.
                              onTap: () => context.push(
                                  '/uebung?ref=${Uri.encodeComponent(e.aufgabeRef)}'
                                  '&unterthema=${g.unterthema}&fach=${g.fach}'),
                            ),
                          ]),
                        ),
                        const SizedBox(height: 10),
                      ],
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}
