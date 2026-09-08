import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';
import '../../widgets/studi.dart';


final lernpfadProvider =
    FutureProvider.autoDispose((ref) => ref.watch(lernRepoProvider).lernpfad());

/// Der Lernpfad.
///
/// Er beantwortet die Frage, die jedes Kind und jedes Elternteil zuerst
/// stellt: *Reicht die Zeit?* Dafür teilt er die offenen Pflichtaufgaben
/// durch die verbleibenden Wochen und zeigt das Ergebnis als Weg.
///
/// Der Pfad rechnet sich nach jeder Übung neu. Wer eine Woche auslässt,
/// sieht keinen roten Rückstand, sondern ein etwas grösseres Pensum in den
/// übrigen Wochen. Es gibt keine Serie, keine Punkte, keine Abzeichen.
class LernpfadScreen extends ConsumerWidget {
  const LernpfadScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pfad = ref.watch(lernpfadProvider);
    return PapierGrund(
      kind: pfad.when(
        loading: () => const StudiLaden(),
        error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
        data: (p) => p.aktiv ? _Pfad(pfad: p) : _KeinTermin(grund: p.grund ?? ''),
      ),
    );
  }
}

class _KeinTermin extends StatelessWidget {
  const _KeinTermin({required this.grund});
  final String grund;

  @override
  Widget build(BuildContext context) => StudiLeer(
        stimmung: Studi.schlafend,
        titel: 'Dein Weg zur Prüfung',
        text: grund,
        knopf: SsKnopf('Termin setzen', onTap: () => context.push('/einstellungen/pruefung')),
      );
}

class _Pfad extends StatelessWidget {
  const _Pfad({required this.pfad});
  final Lernpfad pfad;

  @override
  Widget build(BuildContext context) {
    final dieseWoche = pfad.wochen.where((w) => w.istDieseWoche).toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(
          Mass.seitenrand, 12, Mass.seitenrand, Mass.tabHoehe + 24),
      children: [
        const SsEyebrow('Von heute bis zur Prüfung'),
        const SizedBox(height: 6),
        Text('Dein Weg', style: Schrift.h1),
        const SizedBox(height: 20),

        // Das Pensum ist die eine Zahl, auf die es ankommt. Abzählbar,
        // nicht in Prozent.
        SsDunkleKarte(
          kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SsEyebrow('Diese Woche', farbe: Farben.tan300),
            const SizedBox(height: 6),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${pfad.geloestDieseWoche} von ${pfad.pensumDieseWoche}',
                  style: Schrift.kennzahlKlein.copyWith(color: Farben.creme)),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('Pflichtaufgaben',
                    style: Schrift.klein.copyWith(color: Farben.tan300)),
              ),
            ]),
            const SizedBox(height: 12),
            SsBalken(
              anteil: pfad.pensumDieseWoche == 0
                  ? 1
                  : pfad.geloestDieseWoche / pfad.pensumDieseWoche,
              farbe: Farben.tan500,
            ),
            const SizedBox(height: 10),
            Text(
              '${pfad.offenTotal} offen · noch ${pfad.wochenBisPruefung} Wochen',
              style: Schrift.klein.copyWith(color: Farben.tan300),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        Text(pfad.hinweis, style: Schrift.klein),
        const SizedBox(height: 24),

        const SsEyebrow('Die vier Abschnitte'),
        const SizedBox(height: 10),
        for (final e in pfad.etappen) ...[_EtappenKarte(etappe: e), const SizedBox(height: 8)],
        const SizedBox(height: 16),

        const SsEyebrow('Woche für Woche'),
        const SizedBox(height: 12),
        // Der Weg als senkrechte Linie. Jede Woche ein Halt.
        for (var i = 0; i < pfad.wochen.length; i++)
          _WochenHalt(
            woche: pfad.wochen[i],
            istLetzte: i == pfad.wochen.length - 1,
          ),
        if (dieseWoche.isNotEmpty && dieseWoche.first.themen.isNotEmpty) ...[
          const SizedBox(height: 20),
          SsKnopf(
            'Mit «${dieseWoche.first.themen.first.name}» beginnen',
            onTap: () => context.push(
              '/uebung?unterthema=${dieseWoche.first.themen.first.unterthema}'
              '&fach=${dieseWoche.first.themen.first.fach}',
            ),
          ),
        ],
      ],
    );
  }
}

class _EtappenKarte extends StatelessWidget {
  const _EtappenKarte({required this.etappe});
  final LernpfadEtappe etappe;

  @override
  Widget build(BuildContext context) => SsKarte(
        polster: const EdgeInsets.all(16),
        kind: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: etappe.total > 0 && etappe.abgeschlossen >= etappe.total
                  ? Farben.gruen
                  : Farben.tan100,
              shape: BoxShape.circle,
            ),
            child: etappe.total > 0 && etappe.abgeschlossen >= etappe.total
                ? const Icon(Icons.check, size: 15, color: Colors.white)
                : Text('${etappe.nummer}',
                    style: Schrift.klein
                        .copyWith(color: Farben.tan600, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(etappe.titel, style: Schrift.h4)),
                // Ohne Woche heisst: Für diesen Abschnitt reicht die Zeit nicht
                // mehr. Das ehrlich hinschreiben, statt «Woche 3–1» oder
                // «Woche 0–0» zu behaupten.
                Text(
                  etappe.vonWoche == null
                      ? 'ohne eigene Woche'
                      : 'Woche ${etappe.vonWoche}–${etappe.bisWoche}',
                  style: Schrift.klein,
                ),
              ]),
              const SizedBox(height: 4),
              Text(etappe.beschreibung, style: Schrift.klein),
              if (etappe.total > 0) ...[
                const SizedBox(height: 8),
                Text('${etappe.abgeschlossen} von ${etappe.total} Themen',
                    style: Schrift.klein.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 5),
                SsBalken(anteil: etappe.abgeschlossen / etappe.total),
              ],
            ]),
          ),
        ]),
      );
}

/// Ein Halt auf dem Weg. Die Linie links verbindet die Wochen. Sie ist der
/// Grund, warum das hier ein Pfad ist und keine Liste.
class _WochenHalt extends StatelessWidget {
  const _WochenHalt({required this.woche, required this.istLetzte});
  final LernpfadWoche woche;
  final bool istLetzte;

  @override
  Widget build(BuildContext context) {
    final hell = woche.istVergangen && !woche.istDieseWoche;
    return Opacity(
      opacity: hell ? 0.45 : 1,
      child: IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Linie und Punkt
          SizedBox(
            width: 28,
            child: Column(children: [
              Container(
                width: woche.istDieseWoche ? 14 : 10,
                height: woche.istDieseWoche ? 14 : 10,
                margin: EdgeInsets.only(top: woche.istDieseWoche ? 16 : 18),
                decoration: BoxDecoration(
                  color: woche.istDieseWoche
                      ? Farben.ink900
                      : woche.istPruefungsform
                          ? Farben.rot
                          : Farben.tan300,
                  shape: BoxShape.circle,
                ),
              ),
              if (!istLetzte)
                Expanded(child: Container(width: 2, color: Farben.tan300)),
            ]),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SsKarte(
                polster: const EdgeInsets.all(14),
                kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                      child: Text(woche.titel,
                          style: woche.istDieseWoche ? Schrift.h3 : Schrift.h4),
                    ),
                    if (woche.pensum > 0)
                      SsChip('${woche.pensum} Aufgaben')
                    else if (woche.istPruefungsform)
                      const SsChip('Wiederholen'),
                  ]),
                  const SizedBox(height: 4),
                  Text('${_kurz(woche.von)} bis ${_kurz(woche.bis)}', style: Schrift.klein),
                  if (woche.auftrag != null) ...[
                    const SizedBox(height: 8),
                    Text(woche.auftrag!, style: Schrift.bodyKlein),
                  ],
                  for (final t in woche.themen) ...[
                    const SizedBox(height: 8),
                    Row(children: [
                      Container(
                        width: 4,
                        height: 4,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: const BoxDecoration(
                            color: Farben.tan500, shape: BoxShape.circle),
                      ),
                      Expanded(
                        child: Text('${t.name} · ${t.aufgaben}',
                            style: Schrift.klein.copyWith(color: Farben.ink500)),
                      ),
                    ]),
                  ],
                ]),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  /// «2027-03-07» wird zu «7.3.» Die Jahreszahl steht schon oben.
  String _kurz(String iso) {
    final t = iso.split('-');
    return t.length == 3 ? '${int.parse(t[2])}.${int.parse(t[1])}.' : iso;
  }
}
