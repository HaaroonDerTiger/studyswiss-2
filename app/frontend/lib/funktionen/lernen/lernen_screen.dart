import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';
import '../sitzung.dart';

final vorschlagProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(lernRepoProvider).vorschlag(),
);
final fortschrittProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(lernRepoProvider).fortschritt(),
);

/// Fächer und Bereiche. Sie ändern sich während einer Sitzung nicht und
/// werden deshalb nur einmal geholt. «Lernen», «Fortschritt» und der
/// Bereichs-Screen teilen sich denselben Aufruf.
final faecherProvider = FutureProvider(
  (ref) => ref.watch(katalogRepoProvider).faecher(),
);

/// Der Schultyp dieses Schülers, aufgelöst aus dem Katalog.
///
/// Er wird für eine einzige Zeile gebraucht: die Kennung der Prüfung über
/// dem Gruss. «ZAP 3» steht nur dort, wo der Kanton sie wirklich führt —
/// Bern führt keine, dort steht das neutrale Wort.
final meinSchultypProvider = FutureProvider((ref) async {
  final p = ref.watch(sitzungProvider).profil;
  final kanton = p?.kanton;
  final id = p?.schultyp;
  if (kanton == null || id == null) return null;
  final liste = await ref.watch(katalogRepoProvider).schultypen(kanton);
  for (final t in liste) {
    if (t.id == id) return t;
  }
  return null;
});

/// Screen 11. «Lernen». Die Startseite.
///
/// Drei Dinge, in dieser Reihenfolge: wie viele Tage noch, was zuerst dran ist,
/// und wie weit die Fächer sind. Keine Serie, keine Punkte, keine Abzeichen.
class LernenScreen extends ConsumerWidget {
  const LernenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profil = ref.watch(sitzungProvider).profil;
    final vorschlag = ref.watch(vorschlagProvider);
    final fortschritt = ref.watch(fortschrittProvider);
    // Die Kennung der Prüfung kommt aus dem Katalog, nicht aus dem Code.
    // «Zentrale Aufnahmeprüfung» ist der Zürcher Name; er stand hier fest
    // und log bei jedem anderen Kanton. Bern führt kein Kürzel. Dort steht
    // das neutrale Wort, nicht eine erfundene Abkürzung.
    final kuerzel = ref.watch(meinSchultypProvider).valueOrNull?.kuerzel ?? '';

    return PapierGrund(
      kind: RefreshIndicator(
        color: Farben.tan600,
        backgroundColor: Farben.karte,
        onRefresh: () async {
          ref.invalidate(vorschlagProvider);
          ref.invalidate(fortschrittProvider);
          await ref.read(sitzungProvider.notifier).aktualisiere();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 12, Mass.seitenrand, Mass.tabHoehe + 24),
          children: [
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SsEyebrow(kuerzel.isEmpty ? 'Aufnahmeprüfung' : kuerzel),
                  const SizedBox(height: 6),
                  Text(
                    profil?.vorname == null ? 'Lernen' : 'Hallo ${profil!.vorname}',
                    style: Schrift.h1,
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 18),

            // Die eine Zahl, auf die es ankommt.
            SsDunkleKarte(
              kind: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const SsEyebrow('Prüfung in', farbe: Farben.tan300),
                    const SizedBox(height: 6),
                    Text('${profil?.tageBisPruefung ?? '—'}',
                        style: Schrift.kennzahl.copyWith(color: Farben.creme)),
                  ]),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('Tagen',
                      style: Schrift.h3.copyWith(color: Farben.tan300)),
                ),
              ]),
            ),
            const SizedBox(height: 22),

            const SsEyebrow('Zuerst dran'),
            const SizedBox(height: 10),
            vorschlag.when(
              loading: () => const _Platzhalter(),
              error: (e, _) => Text('Die Empfehlung liess sich nicht laden.', style: Schrift.body),
              data: (v) => v.zuerst == null
                  ? SsKarte(
                      kind: Text(
                        'Alle Themen sind abgeschlossen. Übe weiter, so viel du willst. '
                        'weitere Aufgaben zählen nicht mehr in die Zahl hinein.',
                        style: Schrift.body,
                      ),
                    )
                  : Column(children: [
                      _VorschlagsKarte(v.zuerst!, hervorgehoben: true),
                      if (v.danach != null) ...[
                        const SizedBox(height: 10),
                        _VorschlagsKarte(v.danach!, hervorgehoben: false),
                      ],
                      const SizedBox(height: 10),
                      Text(v.hinweis, style: Schrift.klein),
                    ]),
            ),
            const SizedBox(height: 24),

            const SsEyebrow('Deine Fächer'),
            const SizedBox(height: 10),
            fortschritt.when(
              loading: () => const _Platzhalter(),
              error: (e, _) => const SizedBox.shrink(),
              data: (f) => Column(children: [
                // Mathematik und Deutsch stehen auf DERSELBEN Ebene. Was
                // darunter liegt, Sprachbetrachtung, Textverständnis,
                // Aufsatz, ist eine Ebene tiefer und erscheint erst nach
                // dem Antippen.
                //
                // Das erste Fach ist gratis. Vollständig, nicht als
                // Kostprobe. Jedes weitere gehört zu Plus. Das steht hier
                // sichtbar, statt die Person erst beim Antippen in eine
                // Absage laufen zu lassen.
                for (final (i, fach) in f.faecher.indexed) ...[
                  Builder(builder: (context) {
                    final offen = i == 0 || (profil?.plus ?? false);
                    final k = ref.watch(faecherProvider).valueOrNull;
                    final info = k?.fach(fach.fach);
                    // Die Bereiche dieses SCHÜLERS. `Pruefungsfach.bereiche`
                    // ist die globale Liste über alle Kantone, damit stand
                    // unter «Deutsch» irgendwann die Berner Fassung neben der
                    // Zürcher.
                    final meine = fach.bereichIds;
                    final teile =
                        meine.map((b) => k?.bereich(b)?.kurzname ?? b).join(' · ');
                    final einBereich = meine.length <= 1;
                    // Besteht ein Fach nur aus dem Aufsatz. Deutsch an der
                    // FMS Bern und am Berner GYM 3 —, gibt es keinen
                    // Themenbaum. «0 von 0 Themen» wäre dort eine tote Karte.
                    final nurAufsatz = einBereich &&
                        meine.isNotEmpty &&
                        k?.bereich(meine.first)?.art == 'aufsatz';
                    return SsListenZeile(
                      titel: fach.name,
                      // Abzählbare Grösse statt Prozentzahl. Das ist die Regel.
                      untertitel: !offen
                          ? 'Mit Plus freischalten'
                          : nurAufsatz
                              ? (k?.bereich(meine.first)?.untertitel ?? 'Aufsatz')
                              : einBereich
                                  ? '${fach.abgeschlossen} von ${fach.total} Themen'
                                  : teile,
                      icon: nurAufsatz ? _icon('stift') : _icon(info?.icon ?? fach.fach),
                      anteil: offen && !nurAufsatz && fach.total > 0
                          ? fach.abgeschlossen / fach.total
                          : null,
                      nachher: offen ? null : const SsChip('Plus'),
                      onTap: () => context.push(
                        !offen
                            ? '/plus'
                            : einBereich
                                ? (meine.firstOrNull != null &&
                                        k?.bereich(meine.first)?.art == 'aufsatz'
                                    ? '/aufsatz'
                                    : '/fach/${meine.firstOrNull ?? fach.fach}')
                                : '/bereiche/${fach.fach}',
                      ),
                    );
                  }),
                  const SizedBox(height: 10),
                ],
              ]),
            ),
          ],
        ),
      ),
    );
  }

  /// Das Icon kommt aus dem Katalog («rechner», «buch», «stift»).
  ///
  /// Hier standen zusätzlich Bereichskennungen, «mathematik»,
  /// «sprachbetrachtung», als Rückfall. Das ging nur so lange gut, wie es
  /// je Fach genau eine Kennung gab; «mathematik-bern» fiel durch und bekam
  /// das Schulhaus-Icon. Der Katalog nennt das Icon, und nur er.
  IconData _icon(String name) => switch (name) {
        'rechner' => Icons.calculate_outlined,
        'buch' => Icons.menu_book_outlined,
        'stift' => Icons.edit_outlined,
        _ => Icons.school_outlined,
      };
}

class _VorschlagsKarte extends StatelessWidget {
  const _VorschlagsKarte(this.v, {required this.hervorgehoben});
  final Vorschlag v;
  final bool hervorgehoben;

  @override
  Widget build(BuildContext context) => SsKarte(
        onTap: () => context.push('/uebung?unterthema=${v.unterthema}&fach=${v.fach}'),
        polster: const EdgeInsets.all(16),
        kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(v.name, style: hervorgehoben ? Schrift.h3 : Schrift.h4)),
            const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
          ]),
          const SizedBox(height: 6),
          // Die Begründung kommt aus dem Scheduler und steht immer dabei.
          Text(v.begruendung, style: Schrift.bodyKlein),
          const SizedBox(height: 10),
          Row(children: [
            SsChip('${v.geloest} von ${v.pflichtset} Pflichtaufgaben'),
            const SizedBox(width: 8),
            Flexible(child: Text(v.oberthema, style: Schrift.klein, overflow: TextOverflow.ellipsis)),
          ]),
        ]),
      );
}

class _Platzhalter extends StatelessWidget {
  const _Platzhalter();
  @override
  Widget build(BuildContext context) => Container(
        height: 96,
        decoration: BoxDecoration(
          color: Farben.karte,
          border: Border.all(color: Farben.linie),
          borderRadius: BorderRadius.circular(Mass.radiusKarte),
        ),
      );
}
