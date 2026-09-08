import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/net/api.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/antwortflaeche.dart';
import '../../widgets/aufgabe_widgets.dart';
import '../../widgets/aufgabe_widgets2.dart';
import '../../widgets/grundbausteine.dart';
import '../../widgets/studi.dart';


/// Screens 8–10. Standortbestimmung.
///
/// 24 Aufgaben, 20–25 Minuten, unterbrechbar. Sie läuft **je Fach**:
/// Mathematik und Deutsch werden getrennt geprüft, und eine gemeinsame Zahl
/// sagt niemandem, wo er steht.
///
/// **Keine Note, keine Einstufung**, und, solange der Lernpfad nicht steht,
/// auch keine verbindliche Reihenfolge. Was herauskommt, sind
/// Themenempfehlungen nach Fehlerquote. Deshalb gibt es auch während des
/// Laufs kein Feedback.
///
/// Der Begriff heisst überall «Standortbestimmung», nie «Test». Das ist
/// keine Wortklauberei: «Test» weckt genau die Erwartung, die der Screen
/// gleich darauf verneinen muss.
class StandortScreen extends ConsumerStatefulWidget {
  const StandortScreen({super.key});
  @override
  ConsumerState<StandortScreen> createState() => _StandortScreenState();
}

enum _P { erklaerung, laedt, lauf, ergebnis }

class _StandortScreenState extends ConsumerState<StandortScreen> {
  _P _phase = _P.erklaerung;
  /// Das gewählte Prüfungsfach. Ohne Wahl startet nichts.
  String? _fach;
  String? _setId;
  List<Aufgabe> _aufgaben = [];
  Startpunkt? _startpunkt;
  int _bei = 0;
  /// Die Antwort, für alle vierzehn Aufgabenarten an einer Stelle.
  final _antwort = AntwortZustand();

  @override
  void dispose() {
    _antwort.entsorgen();
    super.dispose();
  }

  Future<void> _starte() async {
    setState(() => _phase = _P.laedt);
    try {
      final (id, aufgaben) = await ref.read(lernRepoProvider).standortStarten(_fach!);
      if (!mounted) return;
      setState(() {
        _setId = id;
        _aufgaben = aufgaben;
        _phase = _P.lauf;
        if (aufgaben.isNotEmpty) _antwort.richten(aufgaben.first);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _phase = _P.erklaerung);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(Api.lesbar(e))));
    }
  }

  Future<void> _weiter() async {
    final a = _aufgaben[_bei];
    await ref.read(lernRepoProvider).standortAntwort(_setId!, a.ref, _antwort.daten(a));
    if (!mounted) return;
    if (_bei + 1 >= _aufgaben.length) return _abschluss();
    setState(() {
      _bei++;
      _antwort.leeren(_aufgaben[_bei]);
    });
  }

  Future<void> _abschluss() async {
    setState(() => _phase = _P.laedt);
    final s = await ref.read(lernRepoProvider).startpunkt(_setId!);
    if (!mounted) return;
    setState(() {
      _startpunkt = s;
      _phase = _P.ergebnis;
    });
  }

  @override
  Widget build(BuildContext context) => PapierGrund(
        kind: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: switch (_phase) {
              _P.laedt => const StudiLaden(text: 'Aufgaben werden zusammengestellt …'),
              _P.erklaerung => _Erklaerung(
                  gewaehlt: _fach,
                  onWaehlen: (f) => setState(() => _fach = f),
                  onStart: _fach == null ? null : _starte,
                ),
              _P.lauf => _lauf(),
              _P.ergebnis => _Ergebnis(startpunkt: _startpunkt!),
            },
          ),
        ),
      );

  Widget _lauf() {
    final a = _aufgaben[_bei];
    // Wie im Selbsttest: Die Aufgabe zählt als Ganzes. Wer nicht weiter
    // weiss, überspringt sie. Dafür gibt es den Knopf darunter.
    final bereit = _antwort.abgebbar(a, uebung: false);
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 12, Mass.seitenrand, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SsEyebrow('Standortbestimmung'),
          const SizedBox(height: 10),
          SetFortschritt(bei: _bei + 1, total: _aufgaben.length),
        ]),
      ),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 24, Mass.seitenrand, 24),
          children: [
            if (a.lesetext != null) ...[
              Lesetext(a.lesetext!),
              const SizedBox(height: 12),
            ],
            if (a.darstellung != null) DarstellungsTabelle(a.darstellung!),
            SsKarte(polster: const EdgeInsets.all(20), kind: AufgabenStamm(a)),
            const SizedBox(height: 20),
            Antwortflaeche(
              aufgabe: a,
              zustand: _antwort,
              onAendert: () => setState(() {}),
              onAbsenden: bereit ? _weiter : null,
            ),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(
            Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
        child: Column(children: [
          SsKnopf(_bei + 1 == _aufgaben.length ? 'Beenden' : 'Weiter',
              onTap: bereit ? _weiter : null),
          const SizedBox(height: 8),
          SsKnopf('Überspringen', art: SsKnopfArt.text, onTap: () {
            if (_bei + 1 >= _aufgaben.length) {
              _abschluss();
            } else {
              setState(() {
                _bei++;
                _antwort.leeren(_aufgaben[_bei]);
              });
            }
          }),
        ]),
      ),
    ]);
  }
}

/// Die Fächer kommen vom Server. Genau die der gewählten Prüfung.
final _standortFaecherProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(lernRepoProvider).standortFaecher(),
);

class _Erklaerung extends ConsumerWidget {
  const _Erklaerung({required this.gewaehlt, required this.onWaehlen, required this.onStart});
  final String? gewaehlt;
  final void Function(String) onWaehlen;
  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final faecher = ref.watch(_standortFaecherProvider);
    return Column(children: [
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 12, Mass.seitenrand, 12),
          children: [
            const Center(child: StudiBild(Studi.denkend, breite: 160)),
            const SizedBox(height: 16),
            const SsEyebrow('Bevor es losgeht'),
            const SizedBox(height: 10),
            Text('Wo stehst du\ngerade?', style: Schrift.h1),
            const SizedBox(height: 16),
            Text(
              'Vierundzwanzig Aufgaben quer durch ein Fach. Du kannst '
              'jederzeit unterbrechen und später weitermachen.',
              style: Schrift.body,
            ),
            const SizedBox(height: 20),
            SsKarte(
              polster: const EdgeInsets.all(16),
              kind: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.info_outline, size: 20, color: Farben.tan600),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Die Standortbestimmung gibt keine Note. Sie zeigt dir, welche '
                    'Themen du bereits gut beherrschst und welche du noch üben '
                    'solltest.',
                    style: Schrift.bodyKlein,
                  ),
                ),
              ]),
            ),
            const SizedBox(height: 24),
            const SsEyebrow('Welches Fach?'),
            const SizedBox(height: 10),
            faecher.when(
              loading: () => const Center(
                  child: CircularProgressIndicator(color: Farben.tan500)),
              error: (e, _) =>
                  Text('Die Fächer liessen sich nicht laden.', style: Schrift.body),
              data: (liste) => Column(children: [
                for (final f in liste) ...[
                  SsWahl(
                    titel: f.name,
                    untertitel: '${f.bereiche.join(' · ')} · '
                        '${f.themen} Themen mit Aufgaben',
                    gewaehlt: gewaehlt == f.fach,
                    onTap: () => onWaehlen(f.fach),
                  ),
                  const SizedBox(height: 8),
                ],
              ]),
            ),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(
            Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
        child: Column(children: [
          SsKnopf('Standortbestimmung starten', onTap: onStart),
          const SizedBox(height: 8),
          SsKnopf('Später machen',
              art: SsKnopfArt.text, onTap: () => context.go('/lernen')),
        ]),
      ),
    ]);
  }
}

/// Screen 10. «Dein Startpunkt». Drei Zahlen, dann die Reihenfolge.
class _Ergebnis extends StatelessWidget {
  const _Ergebnis({required this.startpunkt});
  final Startpunkt startpunkt;

  @override
  Widget build(BuildContext context) => Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 24, Mass.seitenrand, 12),
            children: [
              const Center(child: StudiBild(Studi.erfolg, breite: 160)),
              const SizedBox(height: 14),
              SsEyebrow(startpunkt.fachName == null
                  ? 'Standortbestimmung'
                  : 'Standortbestimmung · ${startpunkt.fachName}'),
              const SizedBox(height: 10),
              Text('Dein Startpunkt', style: Schrift.h1),
              const SizedBox(height: 20),
              SsKarte(
                polster: const EdgeInsets.all(18),
                kind: Row(children: [
                  Expanded(
                    child: SsKennzahl(
                      wert: '${startpunkt.sitzen}',
                      titel: 'sitzen',
                      zusatz: 'richtig gelöst',
                    ),
                  ),
                  Expanded(
                    child: SsKennzahl(
                      wert: '${startpunkt.zuerstUeben}',
                      titel: 'zuerst üben',
                      zusatz: 'noch unsicher',
                    ),
                  ),
                  Expanded(
                    child: SsKennzahl(
                      wert: '${startpunkt.offen}',
                      titel: 'noch offen',
                      zusatz: 'nicht geprüft',
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 12),
              Text(startpunkt.hinweis, style: Schrift.klein),
              const SizedBox(height: 24),
              // Empfehlungen, keine Rangliste. Hier standen die Plätze 1 bis
              // 3 und darüber «In dieser Reihenfolge». Das versprach mehr,
              // als eine halbe Stunde Aufgaben belegen kann: Eine
              // verbindliche Reihenfolge legt der Lernpfad fest. Was hier
              // steht, ist das, was die Standortbestimmung wirklich zeigt —
              // die Themen mit der höchsten Fehlerquote.
              if (startpunkt.empfehlungen.isEmpty)
                SsKarte(
                  kind: Text(
                    'In dieser Runde ist nichts danebengegangen. Such dir unter '
                    '«Lernen» ein Thema aus, oder mach die Standortbestimmung im '
                    'anderen Fach.',
                    style: Schrift.body,
                  ),
                )
              else ...[
                const SsEyebrow('Empfohlene Themen zum Weiterüben'),
                const SizedBox(height: 10),
                for (final v in startpunkt.empfehlungen) ...[
                  SsKarte(
                    onTap: () => context
                        .go('/uebung?unterthema=${v.unterthema}&fach=${v.fach}'),
                    polster: const EdgeInsets.all(16),
                    kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(v.name, style: Schrift.h4)),
                        const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                      ]),
                      const SizedBox(height: 6),
                      Text(v.begruendung, style: Schrift.klein),
                    ]),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
          child: Column(children: [
            if (startpunkt.empfehlungen.isNotEmpty) ...[
              SsKnopf(
                'Mit «${startpunkt.empfehlungen.first.name}» beginnen',
                onTap: () => context.go(
                  '/uebung?unterthema=${startpunkt.empfehlungen.first.unterthema}'
                  '&fach=${startpunkt.empfehlungen.first.fach}',
                ),
              ),
              const SizedBox(height: 8),
            ],
            SsKnopf('Zur Übersicht',
                art: SsKnopfArt.text, onTap: () => context.go('/lernen')),
          ]),
        ),
      ]);
}
