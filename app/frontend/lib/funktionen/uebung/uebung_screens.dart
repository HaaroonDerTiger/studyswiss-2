import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/net/api.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/aufgabe_widgets.dart';
import '../../widgets/mathe_text.dart';
import '../../widgets/antwortflaeche.dart';
import '../../widgets/aufgabe_widgets2.dart';
import '../../widgets/grundbausteine.dart';
import '../../widgets/studi.dart';


/// Screens 13–17. Einführung, Aufgabe, Rückmeldung, Ergebnis.
///
/// Ein Screen, weil der Ablauf einer ist: Wer die Einführung gelesen hat,
/// rutscht direkt in die erste Aufgabe.
class UebungScreen extends ConsumerStatefulWidget {
  const UebungScreen({super.key, this.unterthema, this.fach, this.aufgabeRef});
  final String? unterthema;
  final String? fach;

  /// Gesetzt, wenn «Nochmal» im Fehlerarchiv gedrückt wurde: dann wird genau
  /// **diese eine** Aufgabe wiederhergestellt, nicht ein frisches Set zum
  /// Thema. Aus `templateId:seed` entsteht sie Zeichen für Zeichen wieder —
  /// genau dafür speichert die App Refs statt Aufgaben.
  final String? aufgabeRef;

  @override
  ConsumerState<UebungScreen> createState() => _UebungScreenState();
}

enum _Phase { laedt, einfuehrung, aufgabe, ergebnis, fehler }

class _UebungScreenState extends ConsumerState<UebungScreen> {
  _Phase _phase = _Phase.laedt;
  Uebung? _uebung;
  UebungErgebnis? _ergebnis;
  String _fehlertext = '';

  int _bei = 0;
  /// Die Antwort, für alle vierzehn Aufgabenarten an einer Stelle.
  final _antwort = AntwortZustand();
  Rueckmeldung? _rueckmeldung;
  int _hinweisStufe = 0;
  String? _hinweis;

  @override
  void initState() {
    super.initState();
    _lade();
  }

  @override
  void dispose() {
    _antwort.entsorgen();
    super.dispose();
  }

  Future<void> _lade() async {
    try {
      // «Nochmal» aus dem Fehlerarchiv: eine einzelne Aufgabe aus ihrer Ref,
      // ohne Einführung. Das Thema kennt man, es geht um diese eine Aufgabe.
      final ref0 = widget.aufgabeRef;
      if (ref0 != null && ref0.isNotEmpty) {
        final a = await ref.read(lernRepoProvider).nochmal(ref0);
        if (!mounted) return;
        setState(() {
          _uebung = Uebung(
            // Kein Set dahinter. Der Server nimmt das Unterthema dann aus der
            // Aufgabe selbst, und der Versuch wird trotzdem verbucht. Nur so
            // verschwindet der Eintrag aus dem Archiv, wenn es diesmal sitzt.
            'nochmal', a.unterthema, a.unterthemaName,
            Einfuehrung('', '', const [], ''),
            [a],
          );
          _phase = _Phase.aufgabe;
          _antwort.richten(a);
        });
        return;
      }

      final u = await ref
          .read(lernRepoProvider)
          .uebungStarten(unterthema: widget.unterthema, fach: widget.fach);
      if (!mounted) return;
      setState(() {
        _uebung = u;
        _phase = _Phase.einfuehrung;
        _antwort.richten(u.aufgaben.first);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _fehlertext = Api.lesbar(e);
        _phase = _Phase.fehler;
      });
    }
  }

  Aufgabe get _aufgabe => _uebung!.aufgaben[_bei];

  bool get _bereit => _antwort.abgebbar(_aufgabe, uebung: true);

  Future<void> _antworten() async {
    final u = _uebung!;
    final a = _aufgabe;
    if (!_bereit) return;
    try {
      final r = await ref
          .read(lernRepoProvider)
          .antworten(u.id, a.ref, _antwort.daten(a), hinweise: _hinweisStufe);
      if (!mounted) return;
      setState(() => _rueckmeldung = r);
    } catch (e) {
      if (!mounted) return;
      _melde(Api.lesbar(e));
    }
  }

  Future<void> _tipp() async {
    if (_hinweisStufe >= _aufgabe.hinweiseVerfuegbar) return;
    try {
      final t = await ref
          .read(lernRepoProvider)
          .hinweis(_uebung!.id, _aufgabe.ref, _hinweisStufe + 1);
      if (!mounted) return;
      setState(() {
        _hinweisStufe++;
        _hinweis = t;
      });
    } catch (e) {
      if (mounted) _melde(Api.lesbar(e));
    }
  }

  void _weiter() {
    if (_bei + 1 >= _uebung!.aufgaben.length) {
      _abschliessen();
      return;
    }
    setState(() {
      _bei++;
      _rueckmeldung = null;
      _hinweis = null;
      _hinweisStufe = 0;
      // Alles an einer Stelle zurücksetzen: Jede vergessene Zeile hier
      // hiesse, dass die nächste Aufgabe mit der Antwort der vorigen
      // beginnt, und das fiele erst beim Prüfen auf.
      _antwort.leeren(_aufgabe);
    });
  }

  void _nochmal() => setState(() {
        _rueckmeldung = null;
        _antwort.leeren(_aufgabe);
      });

  Future<void> _abschliessen() async {
    try {
      final e = await ref.read(lernRepoProvider).uebungAbschliessen(_uebung!.id);
      if (!mounted) return;
      setState(() {
        _ergebnis = e;
        _phase = _Phase.ergebnis;
      });
    } catch (e) {
      if (mounted) _melde(Api.lesbar(e));
    }
  }

  void _melde(String text) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(text), backgroundColor: Farben.ink900));

  @override
  Widget build(BuildContext context) => PapierGrund(
        kind: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: switch (_phase) {
              _Phase.laedt => const StudiLaden(text: 'Aufgaben werden gezogen …'),
              _Phase.fehler => _FehlerAnsicht(text: _fehlertext),
              _Phase.einfuehrung => _Einfuehrung(
                  uebung: _uebung!,
                  onStart: () => setState(() => _phase = _Phase.aufgabe),
                ),
              _Phase.aufgabe => _aufgabenAnsicht(),
              _Phase.ergebnis => _ErgebnisAnsicht(
                  ergebnis: _ergebnis!,
                  unterthemaName: _uebung!.unterthemaName,
                  // Das Fach der Aufgaben, nicht das der Route: Wer die
                  // Übung über «Zuerst dran» gestartet hat, gab keines mit.
                  fach: _uebung!.aufgaben.first.fach,
                  onWeiterUeben: () {
                    setState(() {
                      _phase = _Phase.laedt;
                      _bei = 0;
                      _rueckmeldung = null;
                    });
                    _lade();
                  },
                ),
            },
          ),
          bottomSheet: _rueckmeldung == null
              ? null
              : RueckmeldungsBlatt(
                  rueckmeldung: _rueckmeldung!,
                  onWeiter: _weiter,
                  onNochmal: _nochmal,
                ),
        ),
      );

  Widget _aufgabenAnsicht() {
    final a = _aufgabe;
    return Column(children: [
      // Schliessen links, Tipp rechts. Genau wie in der Einführung.
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Row(children: [
          IconButton(
            icon: const Icon(Icons.close, color: Farben.ink700),
            onPressed: () => context.pop(),
          ),
          // Der Themenname ist ein Knopf, kein Schild: Antippen führt zur
          // Themenliste des Fachs. Ohne diesen Weg käme man aus einer Übung
          // nur über das X zurück, und wer die Übung von «Lernen» aus
          // gestartet hat, müsste sich zwei Schritte weit wieder
          // hineinklicken, um das nächste Thema zu wählen.
          Expanded(
            child: TextButton(
              onPressed: () => context.push('/fach/${a.fach}'),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(_uebung!.unterthemaName,
                        style: Schrift.h4,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, size: 18, color: Farben.ink300),
                ],
              ),
            ),
          ),
          TippKnopf(onTap: _tipp, aktiv: _hinweisStufe < a.hinweiseVerfuegbar),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
        child: SetFortschritt(bei: _bei + 1, total: _uebung!.aufgaben.length),
      ),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 24, Mass.seitenrand, 24),
          children: [
            // Der kleine, leise Titel über der Aufgabe. Er nennt das
            // OBERTHEMA. «Bruchrechnen», «Satzglieder» —, nicht das
            // Unterthema: «Brüche mit ungleichem Nenner addieren» wäre zwei
            // Zeilen lang und nähme der Aufgabe den Platz, den sie braucht.
            if (a.themaKurz.isNotEmpty) ...[
              SsEyebrow(a.themaKurz, farbe: Farben.ink300),
              const SizedBox(height: 10),
            ],
            // Beim Textverständnis steht der Lesetext über der Frage: ein
            // Text, mehrere Fragen, wie in der Prüfung.
            if (a.lesetext != null) ...[
              Lesetext(a.lesetext!),
              const SizedBox(height: 12),
            ],
            if (a.darstellung != null) DarstellungsTabelle(a.darstellung!),
            SsKarte(polster: const EdgeInsets.all(20), kind: AufgabenStamm(a)),
            if (_hinweis != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Farben.gelb100,
                  border: Border.all(color: Farben.gelb),
                  borderRadius: BorderRadius.circular(Mass.radiusKnopf),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SsEyebrow('Tipp $_hinweisStufe von ${a.hinweiseVerfuegbar}',
                      farbe: Farben.gelb),
                  const SizedBox(height: 6),
                  Text(_hinweis!, style: Schrift.bodyKlein.copyWith(color: Farben.ink900)),
                ]),
              ),
            ],
            const SizedBox(height: 20),
            Antwortflaeche(
              aufgabe: a,
              zustand: _antwort,
              onAendert: () => setState(() {}),
              feldFehler: _rueckmeldung?.feldFehler.toSet() ?? const {},
              onAbsenden: _antworten,
            ),
            // Die Aufgabennummer stand hier, direkt unter der Aufgabe. Sie
            // war für den Support gedacht, aber sie war das Erste, was einer
            // Schülerin unter der Aufgabe entgegensprang, und sie erklärte
            // sich nicht. Auffindbar bleibt eine Aufgabe trotzdem: Im
            // Fehlerarchiv steht die Nummer weiter, und genau dort schaut
            // man nach, wenn jemand ein Problem meldet.
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(
            Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
        child: SsKnopf('Antwort prüfen', onTap: _bereit ? _antworten : null),
      ),
    ]);
  }
}

class _Einfuehrung extends StatelessWidget {
  const _Einfuehrung({required this.uebung, required this.onStart});
  final Uebung uebung;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final e = uebung.einfuehrung;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Row(children: [
          IconButton(
            icon: const Icon(Icons.close, color: Farben.ink700),
            onPressed: () => context.pop(),
          ),
          const Spacer(),
          // Derselbe Knopf an derselben Stelle wie später in der Aufgabe.
          TippKnopf(
            onTap: () => showDialog<void>(
              context: context,
              builder: (_) => AlertDialog(
                backgroundColor: Farben.karte,
                title: Text('Tipp', style: Schrift.h3),
                content: Text(e.tipp, style: Schrift.body),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('Verstanden',
                        style: Schrift.knopf.copyWith(color: Farben.tan600)),
                  ),
                ],
              ),
            ),
          ),
        ]),
      ),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 8, Mass.seitenrand, 24),
          children: [
            const SsEyebrow('Einführung in den Aufgabenblock'),
            const SizedBox(height: 8),
            Text(uebung.unterthemaName, style: Schrift.h1),
            const SizedBox(height: 20),
            SsKarte(
              polster: const EdgeInsets.all(20),
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SsEyebrow('Ein Beispiel'),
                const SizedBox(height: 10),
                MatheText(e.stamm, stil: Schrift.h4.copyWith(height: 1.45)),
              ]),
            ),
            const SizedBox(height: 12),
            SsKarte(
              polster: const EdgeInsets.all(20),
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SsEyebrow('So kommst du hin'),
                const SizedBox(height: 12),
                for (var i = 0; i < e.loesungsweg.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Container(
                        width: 22,
                        height: 22,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                            color: Farben.tan100, shape: BoxShape.circle),
                        child: Text('${i + 1}',
                            style: Schrift.klein.copyWith(
                                color: Farben.tan600, fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                          child: MatheText(e.loesungsweg[i], stil: Schrift.bodyKlein)),
                    ]),
                  ),
              ]),
            ),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(
            Mass.seitenrand, 0, Mass.seitenrand, Mass.seitenrand),
        child: SsKnopf('Jetzt ${uebung.aufgaben.length} Aufgaben lösen', onTap: onStart),
      ),
    ]);
  }
}

class _ErgebnisAnsicht extends StatelessWidget {
  const _ErgebnisAnsicht({
    required this.ergebnis,
    required this.unterthemaName,
    required this.fach,
    required this.onWeiterUeben,
  });
  final UebungErgebnis ergebnis;
  final String unterthemaName;
  /// Wohin «Zu den Themen» führt. Die Themenliste des geübten Fachs.
  final String fach;
  final VoidCallback onWeiterUeben;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Spacer(),
          Center(
            child: StudiBild(
              // Wer die Hälfte trifft, hat etwas geschafft.
              ergebnis.richtig * 2 >= ergebnis.total ? Studi.erfolg : Studi.denkend,
              breite: 170,
            ),
          ),
          const SizedBox(height: 18),
          const SsEyebrow('Übung beendet'),
          const SizedBox(height: 10),
          Text('${ergebnis.richtig} von ${ergebnis.total} richtig', style: Schrift.h1),
          const SizedBox(height: 8),
          Text(unterthemaName, style: Schrift.body),
          if (ergebnis.themaAbgeschlossen) ...[
            const SizedBox(height: 20),
            SsDunkleKarte(
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SsEyebrow('Pflichtset voll', farbe: Farben.tan300),
                const SizedBox(height: 6),
                Text('Thema abgeschlossen',
                    style: Schrift.h2.copyWith(color: Farben.creme)),
                const SizedBox(height: 6),
                Text(
                  'Weitere Aufgaben bleiben zum Üben offen. Sie zählen nicht mehr in die Zahl hinein.',
                  style: Schrift.klein.copyWith(color: Farben.tan300),
                ),
              ]),
            ),
          ],
          if (ergebnis.verpasst.isNotEmpty) ...[
            const SizedBox(height: 20),
            const SsEyebrow('Daran hakt es noch'),
            const SizedBox(height: 10),
            for (final v in ergebnis.verpasst)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: SsKarte(
                  polster: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  kind: Text(v, style: Schrift.h4),
                ),
              ),
          ],
          const Spacer(),
          Row(children: [
            Expanded(
              child: SsKnopf('Zu den Themen',
                  art: SsKnopfArt.sekundaer,
                  onTap: () => context.go('/fach/$fach')),
            ),
            const SizedBox(width: 10),
            Expanded(child: SsKnopf('Weiterüben', onTap: onWeiterUeben)),
          ]),
          const SizedBox(height: Mass.seitenrand),
        ]),
      );
}

class _FehlerAnsicht extends StatelessWidget {
  const _FehlerAnsicht({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(Mass.seitenrand),
          child: StudiLeer(
            stimmung: Studi.hoppla,
            titel: 'Das hat nicht geklappt',
            text: text,
            knopf: SsKnopf('Zurück', art: SsKnopfArt.sekundaer, onTap: () => context.go('/lernen')),
          ),
        ),
      );
}
