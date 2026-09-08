import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/thema.dart';
import 'funktionen/aufsatz/aufsatz_screens.dart';
import 'funktionen/anmeldung/anmeldung_screen.dart';
import 'funktionen/einstellungen/einstellungen_screens.dart';
import 'funktionen/eltern/eltern_screen.dart';
import 'funktionen/fehler/fehler_screen.dart';
import 'funktionen/fortschritt/fortschritt_fach_screen.dart';
import 'funktionen/fortschritt/fortschritt_screen.dart';
import 'funktionen/lernen/bereiche_screen.dart';
import 'funktionen/lernen/fach_screen.dart';
import 'funktionen/lernen/tipps_screen.dart';
import 'funktionen/lernen/lernen_screen.dart';
import 'funktionen/lernpfad/lernpfad_screen.dart';
import 'funktionen/onboarding/kanton_screen.dart';
import 'funktionen/onboarding/onboarding_screen.dart';
import 'funktionen/onboarding/schule_screen.dart';
import 'funktionen/onboarding/termin_screen.dart';
import 'funktionen/selbsttest/selbsttest_screens.dart';
import 'funktionen/standort/standort_screens.dart';
import 'funktionen/start/start_screen.dart';
import 'funktionen/uebung/uebung_screens.dart';
import 'widgets/tableiste.dart';

class StudySwissApp extends StatelessWidget {
  const StudySwissApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp.router(
        title: 'StudySwiss',
        debugShowCheckedModeBanner: false,
        theme: studyswissThema(),
        routerConfig: _router,
        locale: const Locale('de', 'CH'),
        supportedLocales: const [Locale('de', 'CH'), Locale('de')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
      );
}

final _schale = GlobalKey<NavigatorState>();

/// Die fünf Tabs liegen in einer ShellRoute, alles andere darüber. So bleibt
/// die Tab-Leiste stehen, wo sie hingehört, und verschwindet in Übung,
/// Selbsttest und Standortbestimmung. Dort soll nichts ablenken.
final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const StartScreen()),
    GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
    GoRoute(path: '/anmeldung', builder: (_, __) => const AnmeldungScreen()),
    GoRoute(path: '/kanton', builder: (_, __) => const KantonScreen()),
    GoRoute(
      path: '/schule/:kanton',
      builder: (_, s) => SchuleScreen(kanton: s.pathParameters['kanton']!),
    ),
    GoRoute(path: '/termin', builder: (_, __) => const TerminScreen()),
    GoRoute(path: '/standort', builder: (_, __) => const StandortScreen()),

    ShellRoute(
      navigatorKey: _schale,
      builder: (context, state, kind) => _Schale(kind: kind, ort: state.uri.path),
      routes: [
        GoRoute(path: '/lernen', builder: (_, __) => const LernenScreen()),
        GoRoute(path: '/lernpfad', builder: (_, __) => const LernpfadScreen()),
        GoRoute(path: '/selbsttest', builder: (_, __) => const SelbsttestScreen()),
        GoRoute(path: '/fortschritt', builder: (_, __) => const FortschrittScreen()),
        GoRoute(path: '/einstellungen', builder: (_, __) => const EinstellungenScreen()),
      ],
    ),

    // Zwei Ebenen: das Fach mit seinen Bereichen, und der Bereich mit
    // seinen Oberthemen. Ein Fach mit nur einem Bereich überspringt die
    // erste. «Lernen» führt dann direkt auf `/fach/...`.
    GoRoute(
      path: '/bereiche/:fach',
      builder: (_, s) => BereicheScreen(fach: s.pathParameters['fach']!),
    ),
    GoRoute(
      path: '/fach/:fach',
      builder: (_, s) => FachScreen(fach: s.pathParameters['fach']!),
    ),
    // Hörverstehen und mündliche Prüfung: kein Themenbaum, sondern eine
    // Seite mit Ablauf, Tipps und Redemitteln.
    GoRoute(
      path: '/tipps/:bereich',
      builder: (_, s) => TippsScreen(bereich: s.pathParameters['bereich']!),
    ),
    GoRoute(
      path: '/fortschritt/:fach',
      builder: (_, s) => FortschrittFachScreen(fach: s.pathParameters['fach']!),
    ),
    GoRoute(
      path: '/uebung',
      builder: (_, s) => UebungScreen(
        unterthema: s.uri.queryParameters['unterthema'],
        fach: s.uri.queryParameters['fach'],
        aufgabeRef: s.uri.queryParameters['ref'],
      ),
    ),
    GoRoute(
      path: '/selbsttest/start',
      builder: (_, s) => SelbsttestStartScreen(
        fach: s.uri.queryParameters['fach'] ?? 'mathematik',
        umfang: s.uri.queryParameters['umfang'] ?? 'alle',
      ),
    ),
    GoRoute(
      path: '/selbsttest/lauf',
      builder: (_, s) => SelbsttestLaufScreen(
        fach: s.uri.queryParameters['fach'] ?? 'mathematik',
        umfang: s.uri.queryParameters['umfang'] ?? 'alle',
      ),
    ),
    GoRoute(path: '/fehler', builder: (_, __) => const FehlerScreen()),
    GoRoute(path: '/eltern', builder: (_, __) => const ElternScreen()),
    // Erst die Aufsatzart, dann das Thema.
    GoRoute(path: '/aufsatz', builder: (_, __) => const AufsatzArtenScreen()),
    GoRoute(
      path: '/aufsatz/art/:art',
      builder: (_, s) => AufsatzThemenScreen(art: s.pathParameters['art']!),
    ),
    GoRoute(
      path: '/aufsatz/schreiben/:themaId',
      builder: (_, s) => AufsatzSchreibenScreen(
        themaId: int.parse(s.pathParameters['themaId']!),
        art: s.uri.queryParameters['art'] ?? 'erzaehlung',
      ),
    ),
    GoRoute(
      path: '/aufsatz/korrektur/:id',
      builder: (_, s) => AufsatzKorrekturScreen(aufsatzId: s.pathParameters['id']!),
    ),
    GoRoute(path: '/einstellungen/pruefung', builder: (_, __) => const EinstellungenPruefungScreen()),
    GoRoute(path: '/profil', builder: (_, __) => const ProfilScreen()),
    GoRoute(path: '/plus', builder: (_, __) => const PlusScreen()),
  ],
);

class _Schale extends StatelessWidget {
  const _Schale({required this.kind, required this.ort});
  final Widget kind;
  final String ort;

  static const _pfade = ['/lernen', '/lernpfad', '/selbsttest', '/fortschritt', '/einstellungen'];

  @override
  Widget build(BuildContext context) {
    final aktiv = _pfade.indexWhere((p) => ort.startsWith(p));
    return Scaffold(
      body: SafeArea(bottom: false, child: kind),
      bottomNavigationBar: SsTabLeiste(
        aktiv: aktiv < 0 ? 0 : aktiv,
        onWahl: (i) => context.go(_pfade[i]),
      ),
    );
  }
}
