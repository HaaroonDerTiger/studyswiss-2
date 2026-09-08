import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';

final _themenProvider = FutureProvider.autoDispose.family(
  (ref, String fach) => ref.watch(katalogRepoProvider).themen(fach),
);

/// Screen 12. Ein Bereich mit allen Oberthemen.
///
/// **Alle Themen sind von Anfang an offen.** Nichts ist gesperrt, es gibt
/// keinen Ring und kein «Prüfungsniveau der ZAP». Der Scheduler schlägt vor,
/// er verbietet nicht.
///
/// Sichtbar ist zunächst nur das Oberthema; die Unterthemen klappen über den
/// Pfeil auf. Ungeklappt standen hier 87 Karten untereinander. Man scrollte
/// an «Zahl und Arithmetik» vorbei, ohne je zu sehen, dass es acht
/// Oberthemen gibt. Die Zahl neben dem Titel sagt, was drin ist, bevor man
/// aufklappt.
class FachScreen extends ConsumerStatefulWidget {
  const FachScreen({super.key, required this.fach});
  final String fach;

  @override
  ConsumerState<FachScreen> createState() => _FachScreenState();
}

class _FachScreenState extends ConsumerState<FachScreen> {
  /// Welche Oberthemen offen sind. Nur für diesen Screen, beim nächsten
  /// Aufruf steht wieder alles zusammengeklappt da, und das ist richtig so:
  /// Die ruhige Übersicht ist der Ausgangszustand.
  final _offen = <int>{};

  @override
  Widget build(BuildContext context) {
    final baum = ref.watch(_themenProvider(widget.fach));
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(baum.valueOrNull?.name ?? ''),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: baum.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
          data: (b) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              for (final o in b.oberthemen) ...[
                _OberthemaKarte(
                  oberthema: o,
                  fach: widget.fach,
                  offen: _offen.contains(o.nr),
                  umschalten: () => setState(
                      () => _offen.contains(o.nr) ? _offen.remove(o.nr) : _offen.add(o.nr)),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 12),
              Text(
                'Jedes Thema hat ein Pflichtset. Wer es gelöst hat, hat das Thema '
                'abgeschlossen. Alle weiteren Aufgaben bleiben unbegrenzt zum Üben da.',
                style: Schrift.klein,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OberthemaKarte extends StatelessWidget {
  const _OberthemaKarte({
    required this.oberthema,
    required this.fach,
    required this.offen,
    required this.umschalten,
  });

  final Oberthema oberthema;
  final String fach;
  final bool offen;
  final VoidCallback umschalten;

  @override
  Widget build(BuildContext context) {
    final o = oberthema;
    final mitAufgaben = o.unterthemen.where((u) => u.hatAufgaben).length;
    final folgen = o.unterthemen.length - mitAufgaben;
    // Was drinsteckt, bevor man aufklappt, und was noch fehlt. Ohne die
    // zweite Zahl stünde oben «5 Themen» und darunter dreimal «Aufgaben
    // folgen»; die Kopfzeile hätte mehr versprochen als die Liste hält.
    final unter = [
      zahlwort(mitAufgaben, 'Thema', 'Themen'),
      if (folgen > 0) '$folgen folgen',
      if (o.punkte > 0) '${o.punkte} Punkte',
    ].join(' · ');
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
                    Text(unter, style: Schrift.klein),
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
                Opacity(
                  opacity: u.hatAufgaben ? 1 : .5,
                  child: InkWell(
                    onTap: u.hatAufgaben
                        ? () => context.push('/uebung?unterthema=${u.code}&fach=$fach')
                        : null,
                    child: Container(
                      decoration: const BoxDecoration(
                        border: Border(bottom: BorderSide(color: Farben.linie)),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                      child: Row(children: [
                        Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(u.name, style: Schrift.h4),
                                const SizedBox(height: 3),
                                Text(
                                  u.hatAufgaben
                                      ? '${u.pflichtset} Pflichtaufgaben'
                                      : 'Aufgaben folgen',
                                  style: Schrift.klein,
                                ),
                              ]),
                        ),
                        if (u.hatAufgaben)
                          const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                      ]),
                    ),
                  ),
                ),
            ]),
          ),
      ]),
    );
  }
}
