import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/net/api.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../lernen/lernen_screen.dart' show faecherProvider;
import '../../widgets/antwortflaeche.dart';
import '../../widgets/aufgabe_widgets.dart';
import '../../widgets/aufgabe_widgets2.dart';
import '../../widgets/grundbausteine.dart';

/// Screen 18. Selbsttest wählen.
///
/// Erst das Fach, dann der Umfang. **Keine Punktevergabe**. «+6 Punkte zum
/// letzten Mal» kam aus dem Feedback raus.
class SelbsttestScreen extends ConsumerStatefulWidget {
  const SelbsttestScreen({super.key});
  @override
  ConsumerState<SelbsttestScreen> createState() => _SelbsttestScreenState();
}

/// Die Fächer des Selbsttests. Genau die der gewählten Prüfung, mit ihren
/// Bereichen. Auf der ersten Ebene steht das FACH, nicht einer seiner Teile:
/// «Deutsch Sprachbetrachtung» stand hier neben «Mathematik», als wäre das
/// eine so gross wie das andere.
final _selbsttestFaecherProvider =
    FutureProvider.autoDispose((ref) => ref.watch(lernRepoProvider).selbsttestFaecher());

/// Was gilt: Taschenrechner, Zurückblättern, Dauer. Aus dem Katalog, und
/// zwar für das GEWÄHLTE FACH. In Basel-Stadt dauert Mathematik 90 Minuten
/// mit Taschenrechner, Deutsch 45 Minuten ohne; ohne das Fach zeigte der
/// Screen für beide dasselbe und log damit für eines von beiden.
final _bedingungenProvider = FutureProvider.autoDispose
    .family<Bedingungen, String?>((ref, fach) =>
        ref.watch(lernRepoProvider).selbsttestBedingungen(fach: fach));

class _SelbsttestScreenState extends ConsumerState<SelbsttestScreen> {
  String? _fach;
  String? _umfang;

  /// Ob dieses Fach an der Prüfung auch einen Aufsatz hat.
  ///
  /// Gefragt wird an `FachWahl.bereichIds`. Den Bereichen DIESES Schülers.
  /// Vorher stand hier die globale Liste des Fachs; die sagt bei mehreren
  /// Kantonen «ja» für jeden, sobald irgendein Kanton einen Aufsatz führt.
  bool _hatAufsatz(List<FachWahl> liste, String fach) {
    final k = ref.watch(faecherProvider).valueOrNull;
    final meine = liste.where((f) => f.fach == fach).firstOrNull;
    return meine?.bereichIds.any((b) => k?.bereich(b)?.art == 'aufsatz') ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final faecher = ref.watch(_selbsttestFaecherProvider);
    final bed = ref.watch(_bedingungenProvider(_fach)).valueOrNull;
    // Die Zahlen der ganzen Prüfung stehen im Katalog, nicht hier.
    final umfaenge = [
      ('alle', 'Alle Themen', 'Zwölf Aufgaben quer durch das Fach.'),
      ('einzelne', 'Einzelne Themen wählen', 'Du bestimmst, was geprüft wird.'),
      (
        'pruefung',
        'Ganze Prüfung',
        bed == null
            ? 'Wie am Prüfungstag.'
            : '${bed.anzahlAufgaben} Aufgaben, ${bed.dauerMinuten} Minuten, '
                'wie am Prüfungstag.'
      ),
    ];

    return PapierGrund(
      kind: ListView(
        padding: const EdgeInsets.fromLTRB(
            Mass.seitenrand, 12, Mass.seitenrand, Mass.tabHoehe + 24),
        children: [
          const SsEyebrow('Wie am Prüfungstag'),
          const SizedBox(height: 6),
          Text('Selbsttest', style: Schrift.h1),
          const SizedBox(height: 22),

          const SsEyebrow('1 · Fach'),
          const SizedBox(height: 10),
          faecher.when(
            loading: () => const SizedBox(height: 70),
            error: (e, _) => Text('Nicht geladen.', style: Schrift.body),
            data: (liste) => Column(children: [
              for (final fach in liste) ...[
                SsWahl(
                  titel: fach.name,
                  // Was im Test drinsteckt, steht dabei: Ein
                  // Deutsch-Selbsttest mischt Sprachbetrachtung und
                  // Textverständnis, so wie die Prüfung.
                  untertitel: '${fach.bereiche.join(' · ')} · '
                      '${zahlwort(fach.themen, 'Thema', 'Themen')} mit Aufgaben',
                  gewaehlt: _fach == fach.fach,
                  onTap: () => setState(() => _fach = fach.fach),
                ),
                const SizedBox(height: 8),
              ],
              // Der Aufsatz gehört an der Prüfung zum Fach Deutsch, ist aber
              // keine Aufgabe, die man in dreissig Minuten ankreuzt. Er
              // braucht 90 Minuten und eine eigene Korrektur. Statt ihn
              // stillschweigend wegzulassen, steht hier, wo er ist.
              if (_fach != null && _hatAufsatz(liste, _fach!))
                SsKarte(
                  onTap: () => context.push('/aufsatz'),
                  polster: const EdgeInsets.all(14),
                  kind: Row(children: [
                    Expanded(
                      child: Text(
                        'An der Prüfung kommt zum Deutsch-Teil noch der Aufsatz '
                        'dazu. Den schreibst du separat. 90 Minuten, unter '
                        '«Aufsatz».',
                        style: Schrift.klein,
                      ),
                    ),
                    const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                  ]),
                ),
            ]),
          ),
          const SizedBox(height: 22),

          const SsEyebrow('2 · Umfang'),
          const SizedBox(height: 10),
          for (final u in umfaenge) ...[
            SsWahl(
              titel: u.$2,
              untertitel: u.$3,
              gewaehlt: _umfang == u.$1,
              onTap: () => setState(() => _umfang = u.$1),
            ),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 22),
          SsKnopf(
            'Bedingungen ansehen',
            onTap: (_fach == null || _umfang == null)
                ? null
                : () => context.push('/selbsttest/start?fach=$_fach&umfang=$_umfang'),
          ),
        ],
      ),
    );
  }
}

/// Screen 20. Bedingungen. Steht bewusst vor dem Start: Wer eine Prüfung
/// simuliert, soll wissen, worauf er sich einlässt.
class SelbsttestStartScreen extends ConsumerWidget {
  const SelbsttestStartScreen({super.key, required this.fach, required this.umfang});
  final String fach;
  final String umfang;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Die vier Zeilen standen fest im Screen. Damit log die App, sobald eine
    // Prüfung andere Regeln hat, und sie log auch über sich selbst: Die Uhr
    // hält an, und Zurückblättern ist möglich, weil an der Prüfung das Blatt
    // vor einem liegt. Jetzt kommt jede Zeile aus dem Katalog des Schultyps
    // und beschreibt, was der Selbsttest wirklich tut.
    final b = ref.watch(_bedingungenProvider(fach)).valueOrNull ?? Bedingungen();
    final bedingungen = [
      (
        Icons.timer_outlined,
        '${b.dauerMinuten} Minuten',
        b.uhrPausiert
            ? 'Die Uhr hält an, wenn du die App verlässt, und läuft weiter, '
                'sobald du zurück bist.'
            : 'Die Uhr läuft weiter, auch wenn du die App verlässt.'
      ),
      (
        Icons.calculate_outlined,
        // Der Klartext kommt aus dem Katalog. «Taschenrechner erlaubt» allein
        // wäre für St. Gallen irreführend: Dort ist einer erlaubt, aber kein
        // programmierbarer, kein grafikfähiger und keiner mit CAS.
        b.hilfsmittelText,
        b.taschenrechner
            ? 'An dieser Prüfung ist einer erlaubt. Du findest ihn oben rechts.'
            : 'An dieser Prüfung ist auch keiner erlaubt.'
      ),
      (
        Icons.lightbulb_outline,
        b.hinweise ? 'Tipps erlaubt' : 'Keine Tipps',
        b.hinweise ? 'Wie beim Üben.' : 'Hinweise gibt es erst wieder beim Üben.'
      ),
      (
        b.zurueckblaettern ? Icons.swap_horiz : Icons.arrow_back,
        b.zurueckblaettern ? 'Zurückblättern möglich' : 'Kein Zurück',
        b.zurueckblaettern
            ? 'Du kannst zu früheren Aufgaben zurück und deine Antwort ändern. '
                'wie am Prüfungstag, wo das Blatt vor dir liegt.'
            : 'Eine abgegebene Antwort bleibt stehen.'
      ),
    ];

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Bedingungen'),
          leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
        ),
        body: Padding(
          padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 8),
            Text('So läuft der Selbsttest', style: Schrift.h1),
            const SizedBox(height: 20),
            for (final b in bedingungen) ...[
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SsIconFlaeche(b.$1, groesse: 38),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(b.$2, style: Schrift.h4),
                    const SizedBox(height: 2),
                    Text(b.$3, style: Schrift.klein),
                  ]),
                ),
              ]),
              const SizedBox(height: 18),
            ],
            if (b.bemerkungen.isNotEmpty)
              SsKarte(
                kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('WAS AN DIESER PRÜFUNG SONST NOCH GILT', style: Schrift.eyebrow),
                  const SizedBox(height: 10),
                  for (final satz in b.bemerkungen) ...[
                    Text(satz, style: Schrift.klein),
                    const SizedBox(height: 6),
                  ],
                ]),
              ),
            const Spacer(),
            SsKnopf('Selbsttest beginnen',
                onTap: () => context.pushReplacement('/selbsttest/lauf?fach=$fach&umfang=$umfang')),
            const SizedBox(height: Mass.seitenrand),
          ]),
        ),
      ),
    );
  }
}

/// Screens 21 und 22. Laufender Test und Ergebnis.
class SelbsttestLaufScreen extends ConsumerStatefulWidget {
  const SelbsttestLaufScreen({super.key, required this.fach, required this.umfang});
  final String fach;
  final String umfang;
  @override
  ConsumerState<SelbsttestLaufScreen> createState() => _SelbsttestLaufScreenState();
}

class _SelbsttestLaufScreenState extends ConsumerState<SelbsttestLaufScreen>
    with WidgetsBindingObserver {
  Selbsttest? _test;
  SelbsttestErgebnis? _ergebnis;
  int _bei = 0;

  /// Ein Antwortzustand JE AUFGABE, nicht einer für den ganzen Lauf.
  ///
  /// An der Prüfung liegt das Blatt vor einem: Man springt vor und zurück
  /// und ändert eine Antwort, die einem nicht mehr gefällt. Mit einem
  /// einzigen Zustand wäre beim Zurückblättern alles leer, und weil jede
  /// Antwort sofort an den Server ging, zählte die Aufgabe dann zweimal.
  /// Deshalb: alles lokal halten und erst bei der Abgabe schicken, wie beim
  /// Korrigieren eines Prüfungsblatts.
  final _zustaende = <AntwortZustand>[];
  bool _gibtAb = false;

  Timer? _uhr;
  int _restSekunden = 0;
  /// Die Uhr hält an, wenn die App im Hintergrund ist. Sofern die Prüfung
  /// das so vorsieht. Sonst bestraft der Selbsttest einen Anruf.
  bool _imHintergrund = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lade();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState zustand) {
    setState(() => _imHintergrund = zustand != AppLifecycleState.resumed);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _uhr?.cancel();
    for (final z in _zustaende) {
      z.entsorgen();
    }
    super.dispose();
  }

  AntwortZustand get _antwort => _zustaende[_bei];
  bool get _darfZurueck =>
      (_test?.bedingungen.zurueckblaettern ?? true) && _bei > 0;

  Future<void> _lade() async {
    try {
      final t = await ref
          .read(lernRepoProvider)
          .selbsttestStarten(widget.fach, widget.umfang, const []);
      if (!mounted) return;
      setState(() {
        _test = t;
        _restSekunden = t.minuten * 60;
        for (final a in t.aufgaben) {
          _zustaende.add(AntwortZustand()..richten(a));
        }
      });
      _uhr = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        if ((_test?.bedingungen.uhrPausiert ?? true) && _imHintergrund) return;
        setState(() => _restSekunden--);
        if (_restSekunden <= 0) _abgeben();
      });
    } catch (e) {
      if (!mounted) return;
      final text = Api.brauchtPlus(e)
          ? 'Die ganze Prüfung gehört zu StudySwiss Plus.'
          : Api.lesbar(e);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
      context.pop();
    }
  }

  /// Kein Feedback während des Laufs. Das ist der Punkt eines Selbsttests.
  /// Und nichts wird unterwegs verbucht: Erst die Abgabe schickt alle
  /// Antworten, jede Aufgabe genau einmal.
  void _weiter() {
    if (_bei + 1 >= _test!.aufgaben.length) {
      _abgeben();
      return;
    }
    setState(() => _bei++);
  }

  void _zurueck() {
    if (_bei > 0) setState(() => _bei--);
  }

  Future<void> _abgeben() async {
    if (_gibtAb) return;
    _gibtAb = true;
    _uhr?.cancel();
    final repo = ref.read(lernRepoProvider);
    for (var i = 0; i < _test!.aufgaben.length; i++) {
      final a = _test!.aufgaben[i];
      await repo.selbsttestAntwort(_test!.id, a.ref, _zustaende[i].daten(a));
    }
    final e = await repo.selbsttestAbgeben(_test!.id);
    if (!mounted) return;
    setState(() => _ergebnis = e);
  }

  String get _uhrzeit {
    final s = _restSekunden.clamp(0, 99999);
    return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_ergebnis != null) return _ErgebnisAnsicht(ergebnis: _ergebnis!);
    if (_test == null) {
      return const PapierGrund(
          kind: Center(child: CircularProgressIndicator(color: Farben.tan500)));
    }
    final a = _test!.aufgaben[_bei];
    // Im Selbsttest muss die Aufgabe VOLLSTÄNDIG beantwortet sein, wie in
    // der Prüfung. Nur in der Übung genügt eine angefangene Antwort.
    final bereit = _antwort.abgebbar(a, uebung: false);
    final knapp = _restSekunden < 300;

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 12, Mass.seitenrand, 0),
              child: Row(children: [
                Expanded(
                  child: SetFortschritt(bei: _bei + 1, total: _test!.aufgaben.length),
                ),
                const SizedBox(width: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: knapp ? Farben.rot100 : Farben.karte,
                    border: Border.all(color: knapp ? Farben.rot : Farben.linie),
                    borderRadius: BorderRadius.circular(Mass.radiusChip),
                  ),
                  child: Text(_uhrzeit,
                      style: Schrift.h4.copyWith(color: knapp ? Farben.rot : Farben.ink900)),
                ),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                    Mass.seitenrand, 24, Mass.seitenrand, 24),
                children: [
                  // Im Selbsttest steht kein Themen-Titel über der Aufgabe.
                  // Wer an der Prüfung eine Textaufgabe liest, bekommt auch
                  // nicht daneben geschrieben, worum es geht.
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
              child: Row(children: [
                if (_darfZurueck) ...[
                  Expanded(
                    child: SsKnopf('Zurück', art: SsKnopfArt.sekundaer, onTap: _zurueck),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: SsKnopf(
                    _bei + 1 == _test!.aufgaben.length ? 'Abgeben' : 'Weiter',
                    onTap: bereit ? _weiter : null,
                  ),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class _ErgebnisAnsicht extends StatelessWidget {
  const _ErgebnisAnsicht({required this.ergebnis});
  final SelbsttestErgebnis ergebnis;

  @override
  Widget build(BuildContext context) => PapierGrund(
        kind: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: Column(children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                      Mass.seitenrand, 24, Mass.seitenrand, 12),
                  children: [
                    const SsEyebrow('Selbsttest beendet'),
                    const SizedBox(height: 10),
                    Text('${ergebnis.punkte} von ${ergebnis.maximum} Punkten',
                        style: Schrift.h1),
                    const SizedBox(height: 24),
                    const SsEyebrow('Nach Oberthema'),
                    const SizedBox(height: 10),
                    for (final o in ergebnis.proOberthema) ...[
                      SsKarte(
                        polster: const EdgeInsets.all(14),
                        kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Expanded(child: Text(o.name, style: Schrift.h4)),
                            Text('${o.erreicht} von ${o.moeglich}', style: Schrift.label),
                          ]),
                          const SizedBox(height: 8),
                          SsBalken(
                            anteil: o.moeglich == 0 ? 0 : o.erreicht / o.moeglich,
                            farbe: o.erreicht * 2 < o.moeglich ? Farben.rot : Farben.tan500,
                          ),
                        ]),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
                child: Column(children: [
                  SsKnopf('Meine Fehler ansehen', onTap: () => context.go('/fehler')),
                  const SizedBox(height: 8),
                  SsKnopf('Fertig',
                      art: SsKnopfArt.text, onTap: () => context.go('/selbsttest')),
                ]),
              ),
            ]),
          ),
        ),
      );
}
