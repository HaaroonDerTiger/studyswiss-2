import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../widgets/grundbausteine.dart';
import 'lernen_screen.dart';

/// Screen 11b. Die Bereiche eines Prüfungsfachs.
///
/// Zwei Ebenen, und der Unterschied trägt die halbe Navigation: Mathematik
/// und Deutsch stehen als **Fächer** nebeneinander; Sprachbetrachtung,
/// Textverständnis und Aufsatz liegen als **Bereiche** darunter. Vorher
/// standen «Mathematik» und «Deutsch Sprachbetrachtung» auf derselben
/// Ebene, als wäre das eine so gross wie das andere, und Textverständnis
/// fehlte ganz, obwohl es an der Prüfung geschrieben wird.
///
/// Fächer mit nur einem Bereich überspringen diesen Screen; für sie führt
/// «Lernen» direkt zur Themenliste.
class BereicheScreen extends ConsumerWidget {
  const BereicheScreen({super.key, required this.fach});
  final String fach;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final katalog = ref.watch(faecherProvider);
    final fortschritt = ref.watch(fortschrittProvider);

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(katalog.valueOrNull?.fach(fach)?.name ?? ''),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: katalog.when(
          loading: () =>
              const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text('Nicht geladen.', style: Schrift.body)),
          data: (k) {
            final f = k.fach(fach);
            if (f == null) return Center(child: Text('Dieses Fach gibt es nicht.', style: Schrift.body));
            final zeile = fortschritt.valueOrNull?.faecher
                .where((x) => x.fach == fach)
                .firstOrNull;
            return ListView(
              padding: const EdgeInsets.fromLTRB(
                  Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
              children: [
                const SsEyebrow('Wähle einen Bereich'),
                const SizedBox(height: 6),
                Text(f.name, style: Schrift.h1),
                const SizedBox(height: 20),
                // Die Bereiche dieses SCHÜLERS, nicht die des Fachs.
                // `Pruefungsfach.bereiche` ist die globale Liste über alle
                // Kantone. Ein Zürcher Kind sah damit die Berner Bereiche
                // untereinanderstehen.
                for (final id in (zeile?.bereichIds ?? const <String>[])) ...[
                  _BereichsZeile(
                    bereich: k.bereich(id),
                    zeile: zeile?.bereiche.where((b) => b.bereich == id).firstOrNull,
                  ),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 10),
                Text(
                  'An der Prüfung zählen alle Bereiche zusammen zur Note im Fach '
                  '${f.name}.',
                  style: Schrift.klein,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BereichsZeile extends StatelessWidget {
  const _BereichsZeile({required this.bereich, required this.zeile});
  final Bereich? bereich;
  final BereichZeile? zeile;

  @override
  Widget build(BuildContext context) {
    final b = bereich;

    // Ein Bereich, den der Katalog nicht kennt, verschwand hier spurlos:
    // `SizedBox.shrink()` zeichnet nichts, und niemand sieht, dass eine
    // Zeile fehlt. Die Fortschrittszeile bringt Name und Art selbst mit,
    // also wird sie gezeigt — eine Lücke, die man sieht, ist besser als
    // eine, die man nicht sieht.
    final art = b?.art ?? zeile?.art ?? 'themenbaum';
    final titel = b?.kurzname ?? zeile?.kurzname ?? zeile?.name;
    if (titel == null) return const SizedBox.shrink();

    // Der Aufsatz hat keinen Themenbaum und kein Pflichtset. Er führt in
    // sein eigenes Modul.
    if (art == 'aufsatz') {
      return SsListenZeile(
        titel: titel,
        untertitel: b?.untertitel ?? '',
        icon: Icons.edit_outlined,
        onTap: () => context.push('/aufsatz'),
      );
    }

    // Hörverstehen und mündliche Prüfung haben ebenfalls keinen Themenbaum.
    // Ohne diesen Zweig stünden sie als «Aufgaben folgen» da, und das wäre
    // gelogen, denn es kommen keine. Was es gibt, ist eine Seite mit dem
    // Ablauf, den Tipps und den Sätzen, die man vorher können sollte.
    if (art == 'tipps') {
      return SsListenZeile(
        titel: titel,
        untertitel: b?.untertitel ?? '',
        icon: Icons.lightbulb_outline,
        onTap: () => context.push('/tipps/${b?.id ?? zeile?.bereich ?? ''}'),
      );
    }

    // Ein Bereich ohne Fortschrittszeile hat noch keinen Themenbaum, und
    // einer mit `total == 0` hat einen Baum, aber keine einzige Aufgabe.
    // Beides endet beim Antippen im Nichts, und beides sieht ohne diesen
    // Zweig gleich aus wie ein fertiger Bereich. «0 von 0 Themen».
    final z = zeile;
    if (z == null || z.total == 0) {
      return Opacity(
        opacity: .5,
        child: SsKarte(
          polster: const EdgeInsets.all(16),
          kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(titel, style: Schrift.h4),
            const SizedBox(height: 6),
            Text('Aufgaben folgen', style: Schrift.klein),
          ]),
        ),
      );
    }

    return SsListenZeile(
      titel: titel,
      // Abzählbare Grösse statt Prozentzahl. Das ist die Regel.
      untertitel: '${z.abgeschlossen} von ${z.total} Themen',
      icon: Icons.menu_book_outlined,
      anteil: z.total > 0 ? z.abgeschlossen / z.total : null,
      onTap: () => context.push('/fach/${b?.id ?? z.bereich}'),
    );
  }
}
