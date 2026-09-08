import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../widgets/grundbausteine.dart';
import '../lernen/lernen_screen.dart' show fortschrittProvider;

/// Screen 23. Fortschritt.
///
/// **Keine Kreisdiagramme, keine Prozentzahl als Hauptaussage.** Jede
/// Kennzahl trägt Zeitraum und Fachbezug. Das Säulendiagramm hat eine Achse
/// von 0 bis 100 %, eine 50-%-Linie, den Wert auf jeder Säule und darunter
/// einen Satz, der die Aussage benennt.
class FortschrittScreen extends ConsumerWidget {
  const FortschrittScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final f = ref.watch(fortschrittProvider);
    return PapierGrund(
      kind: f.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
        error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
        data: (d) => ListView(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 12, Mass.seitenrand, Mass.tabHoehe + 24),
          children: [
            const SsEyebrow('Wie weit du bist'),
            const SizedBox(height: 6),
            Text('Fortschritt', style: Schrift.h1),
            const SizedBox(height: 20),

            SsDunkleKarte(
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SsEyebrow('Abgeschlossene Themen', farbe: Farben.tan300),
                const SizedBox(height: 6),
                Text('${d.themenAbgeschlossen} von ${d.themenTotal}',
                    style: Schrift.kennzahlKlein.copyWith(color: Farben.creme)),
                const SizedBox(height: 4),
                Text('alle Fächer · seit Beginn',
                    style: Schrift.klein.copyWith(color: Farben.tan300)),
              ]),
            ),
            const SizedBox(height: 20),

            const SsEyebrow('Trefferquote je Woche'),
            const SizedBox(height: 12),
            SsKarte(
              polster: const EdgeInsets.fromLTRB(16, 18, 16, 16),
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _Saeulen(wochen: d.verlauf),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 12),
                // Der Satz, der die Aussage benennt. Ohne ihn ist ein
                // Diagramm nur Dekoration.
                Text(d.aussage, style: Schrift.bodyKlein.copyWith(color: Farben.ink900)),
              ]),
            ),
            const SizedBox(height: 22),

            const SsEyebrow('Je Fach'),
            const SizedBox(height: 10),
            for (final fach in d.faecher) ...[
              SsListenZeile(
                titel: fach.name,
                untertitel: '${fach.abgeschlossen} von ${fach.total} Themen · '
                    '${fach.pflichtGeloest} von ${fach.pflichtTotal} Pflichtaufgaben',
                anteil: fach.pflichtTotal == 0 ? 0 : fach.pflichtGeloest / fach.pflichtTotal,
                // Gegliedert wird nach FACH, nicht nach Bereich. Dieselbe
                // Ordnung wie unter «Lernen». Vorher stand hier «Deutsch
                // Sprachbetrachtung» auf der ersten Ebene, und
                // Textverständnis fehlte ganz.
                onTap: () => context.push('/fortschritt/${fach.fach}'),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 12),

            // Stärkstes und schwächstes Thema über ALLE Fächer, mit Fachangabe.
            if (d.staerkstes != null) ...[
              const SsEyebrow('Am sichersten'),
              const SizedBox(height: 10),
              _ThemenKarte(zeile: d.staerkstes!, gut: true),
              const SizedBox(height: 16),
            ],
            if (d.schwaechstes != null) ...[
              const SsEyebrow('Am unsichersten'),
              const SizedBox(height: 10),
              _ThemenKarte(zeile: d.schwaechstes!, gut: false),
            ],
          ],
        ),
      ),
    );
  }
}

class _ThemenKarte extends StatelessWidget {
  const _ThemenKarte({required this.zeile, required this.gut});
  final ThemenZeile zeile;
  final bool gut;

  @override
  Widget build(BuildContext context) => SsKarte(
        polster: const EdgeInsets.all(16),
        kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(zeile.name, style: Schrift.h4)),
            Text('${zeile.quote} %',
                style: Schrift.h3.copyWith(color: gut ? Farben.gruen : Farben.rot)),
          ]),
          const SizedBox(height: 4),
          // Fachangabe und Zeitraum stehen bei jeder Zahl.
          Text('${zeile.fachName} · ${zeile.zeitraum}', style: Schrift.klein),
        ]),
      );
}

/// Säulen mit Achse 0–100 %, 50-%-Linie und Wert auf jeder Säule.
class _Saeulen extends StatelessWidget {
  const _Saeulen({required this.wochen});
  final List<Woche> wochen;

  @override
  Widget build(BuildContext context) {
    if (wochen.isEmpty) {
      return SizedBox(
        height: 120,
        child: Center(
          child: Text('Noch keine Übungswoche erfasst.', style: Schrift.klein),
        ),
      );
    }
    return SizedBox(
      height: 160,
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        // Achse
        SizedBox(
          width: 30,
          height: 160,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('100', style: Schrift.klein),
              Text('50', style: Schrift.klein),
              Text('0', style: Schrift.klein),
              const SizedBox(height: 16),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Stack(children: [
            // Die 50-%-Linie ist der Bezug, ohne den die Säulen nichts sagen.
            Positioned(
              left: 0,
              right: 0,
              top: 72,
              child: Container(height: 1, color: Farben.tan300),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final w in wochen)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('${w.quote}',
                              style: Schrift.klein.copyWith(
                                  fontWeight: FontWeight.w700, color: Farben.ink900)),
                          const SizedBox(height: 3),
                          Container(
                            height: (w.quote / 100 * 120).clamp(3, 120).toDouble(),
                            decoration: const BoxDecoration(
                              color: Farben.tan500,
                              borderRadius:
                                  BorderRadius.vertical(top: Radius.circular(3)),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(w.label,
                              style: Schrift.klein.copyWith(fontSize: 10),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ]),
        ),
      ]),
    );
  }
}
