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
import '../../widgets/grundbausteine.dart';
import '../../widgets/studi.dart';


final _artenProvider =
    FutureProvider.autoDispose((ref) => ref.watch(lernRepoProvider).aufsatzarten());

final _aufsatzThemenProvider = FutureProvider.autoDispose.family(
  (ref, String art) => ref.watch(lernRepoProvider).aufsatzThemen(art),
);

/// Screen 26. Die Aufsatzarten.
///
/// Zwei Schritte statt einem: erst die Art, dann das Thema. Vorher lagen
/// vier Themen aus vier Töpfen nebeneinander, und wer eine bestimmte
/// Textsorte üben wollte. Der Normalfall, weil man Erzählen anders lernt
/// als Argumentieren —, musste so lange würfeln, bis sie kam.
///
/// Welche Arten erscheinen, hängt an der gewählten Prüfung. Eine Art, die
/// dort vorkommt und zu der wir noch keine Themen haben, steht mit
/// «Themen folgen» da, statt eine leere Liste zu öffnen.
class AufsatzArtenScreen extends ConsumerWidget {
  const AufsatzArtenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final arten = ref.watch(_artenProvider);
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Aufsatz'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        ),
        body: arten.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text(Api.lesbar(e), style: Schrift.body)),
          data: (liste) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              const SsEyebrow('Wähle eine Aufsatzart aus, die du üben möchtest'),
              const SizedBox(height: 8),
              Text('Aufsatz', style: Schrift.h1),
              const SizedBox(height: 20),
              for (final a in liste) ...[
                if (a.themen > 0)
                  SsKarte(
                    onTap: () => context.push('/aufsatz/art/${a.id}'),
                    polster: const EdgeInsets.all(18),
                    kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(a.name, style: Schrift.h3)),
                        const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
                      ]),
                      const SizedBox(height: 8),
                      Text(a.beschreibung, style: Schrift.bodyKlein),
                      const SizedBox(height: 12),
                      SsChip('${a.themen} Themen'),
                    ]),
                  )
                else
                  Opacity(
                    opacity: .5,
                    child: SsKarte(
                      polster: const EdgeInsets.all(18),
                      kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(a.name, style: Schrift.h3),
                        const SizedBox(height: 8),
                        Text(a.beschreibung, style: Schrift.bodyKlein),
                        const SizedBox(height: 10),
                        Text(
                          'Themen folgen. Diese Art kommt an deiner Prüfung vor, '
                          'wir haben aber noch keine Aufgaben dazu.',
                          style: Schrift.klein,
                        ),
                      ]),
                    ),
                  ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 6),
              Text(
                'An der Prüfung stehen mehrere Themen zur Wahl. Hier übst du gezielt '
                'die Art, die dir noch schwerfällt.',
                style: Schrift.klein,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Screen 26b. Die Themen einer Aufsatzart.
class AufsatzThemenScreen extends ConsumerWidget {
  const AufsatzThemenScreen({super.key, required this.art});
  final String art;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themen = ref.watch(_aufsatzThemenProvider(art));
    final info = ref
        .watch(_artenProvider)
        .valueOrNull
        ?.where((a) => a.id == art)
        .firstOrNull;
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(info?.name ?? 'Aufsatz'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Andere Themen',
              onPressed: () => ref.invalidate(_aufsatzThemenProvider(art)),
            ),
          ],
        ),
        body: themen.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text(Api.lesbar(e), style: Schrift.body)),
          data: (liste) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              const SsEyebrow('Wähle ein Thema'),
              const SizedBox(height: 8),
              Text('90 Minuten,\n450 bis 700 Wörter', style: Schrift.h1),
              if (info != null) ...[
                const SizedBox(height: 10),
                Text(info.beschreibung, style: Schrift.body),
              ],
              const SizedBox(height: 20),
              for (final t in liste) ...[
                SsKarte(
                  onTap: () => context.push('/aufsatz/schreiben/${t.id}?art=$art'),
                  polster: const EdgeInsets.all(18),
                  kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    SsChip(t.sorte),
                    const SizedBox(height: 12),
                    Text(t.titel, style: Schrift.h3),
                    const SizedBox(height: 8),
                    Text(t.auftrag,
                        style: Schrift.bodyKlein, maxLines: 4, overflow: TextOverflow.ellipsis),
                  ]),
                ),
                const SizedBox(height: 12),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Screen 27. Schreibfläche. Wortzähler, Uhr, Teilaufträge zum Abhaken.
/// Der Entwurf wird automatisch gespeichert; niemand soll Text verlieren.
class AufsatzSchreibenScreen extends ConsumerStatefulWidget {
  const AufsatzSchreibenScreen({super.key, required this.themaId, required this.art});
  final int themaId;
  /// Welche Aufsatzart geübt wird. Sie trägt die beiden Hilfen hinter dem
  /// Tipp-Knopf, ohne sie wüsste der Screen nicht, welchen Aufbau er zeigt.
  final String art;
  @override
  ConsumerState<AufsatzSchreibenScreen> createState() => _AufsatzSchreibenScreenState();
}

class _AufsatzSchreibenScreenState extends ConsumerState<AufsatzSchreibenScreen> {
  final _text = TextEditingController();
  final _haken = <int>{};

  /// Korrekturen 2.0, Punkt 7: Die Aufgabenstellung muss jederzeit wieder
  /// einsehbar sein, auch mitten im Schreiben. Sie startet offen.
  bool _auftragOffen = true;
  /// Was vom Aufbau schon drin ist. Die Checkliste im Tipp.
  final _aufbauHaken = <int>{};
  String? _aufsatzId;
  Timer? _speicherUhr;
  Timer? _pruefungsUhr;
  int _sekunden = 90 * 60;
  bool _speichert = false;

  int get _woerter =>
      RegExp(r"[\p{L}\p{N}'’\-]+", unicode: true).allMatches(_text.text).length;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
    // Alle zwanzig Sekunden sichern, nicht bei jedem Tastendruck.
    _speicherUhr = Timer.periodic(const Duration(seconds: 20), (_) => _speichere());
    _pruefungsUhr = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _sekunden--);
    });
  }

  @override
  void dispose() {
    _speicherUhr?.cancel();
    _pruefungsUhr?.cancel();
    _text.dispose();
    super.dispose();
  }

  Future<void> _speichere() async {
    if (_text.text.trim().isEmpty || _speichert) return;
    _speichert = true;
    try {
      _aufsatzId = await ref
          .read(lernRepoProvider)
          .aufsatzSpeichern(widget.themaId, _text.text, id: _aufsatzId);
    } catch (_) {/* beim nächsten Takt nochmals */} finally {
      _speichert = false;
    }
  }

  String get _uhrzeit {
    final s = _sekunden.clamp(0, 999999);
    return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
  }

  /// Die zwei Hilfen. «Aufbau & Checkliste» und «Satzstarter».
  ///
  /// Zusammen in einem Kasten wären sie eine Wand aus Text genau in dem
  /// Moment, in dem jemand nicht weiterweiss. Deshalb zwei Reiter in einem
  /// Blatt von unten, wie überall sonst in der App.
  void _tipp(Aufsatzart art) {
    var welche = 'aufbau';
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Farben.karte,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Mass.radiusSheet)),
      ),
      builder: (blattKontext) => StatefulBuilder(
        builder: (blattKontext, setzeBlatt) {
          Widget reiter(String id, String text) => Expanded(
                child: GestureDetector(
                  onTap: () => setzeBlatt(() => welche = id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    decoration: BoxDecoration(
                      color: welche == id ? Farben.tan100 : Farben.karte,
                      border: Border.all(
                          color: welche == id ? Farben.ink900 : Farben.linie),
                      borderRadius: BorderRadius.circular(Mass.radiusKarte),
                    ),
                    child: Text(text,
                        style: Schrift.h4.copyWith(
                            color: welche == id ? Farben.ink900 : Farben.ink300)),
                  ),
                ),
              );

          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(Mass.seitenrand),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Farben.tan300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(art.name, style: Schrift.h2),
                    const SizedBox(height: 4),
                    Text(art.untertitel, style: Schrift.klein),
                  ]),
                ),
                const SizedBox(height: 14),
                Row(children: [
                  reiter('aufbau', 'Aufbau & Checkliste'),
                  const SizedBox(width: 8),
                  reiter('starter', 'Satzstarter'),
                ]),
                const SizedBox(height: 14),
                Flexible(
                  child: SingleChildScrollView(
                    child: welche == 'aufbau'
                        ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Hak ab, was du schon drin hast.', style: Schrift.klein),
                            const SizedBox(height: 8),
                            for (var i = 0; i < art.aufbau.length; i++)
                              GestureDetector(
                                onTap: () => setzeBlatt(() => _aufbauHaken.contains(i)
                                    ? _aufbauHaken.remove(i)
                                    : _aufbauHaken.add(i)),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Icon(
                                          _aufbauHaken.contains(i)
                                              ? Icons.check_box_outlined
                                              : Icons.check_box_outline_blank,
                                          size: 18,
                                          color: _aufbauHaken.contains(i)
                                              ? Farben.gruen
                                              : Farben.ink300,
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                            child: Text(art.aufbau[i],
                                                style: Schrift.bodyKlein)),
                                      ]),
                                ),
                              ),
                          ])
                        : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(
                              'Anfänge, die weiterhelfen, wenn der Satz nicht kommt. '
                              'Schreib sie nicht ab, bau sie um.',
                              style: Schrift.klein,
                            ),
                            const SizedBox(height: 10),
                            for (final g in art.satzstarter) ...[
                              const SizedBox(height: 6),
                              SsEyebrow(g.abschnitt),
                              const SizedBox(height: 6),
                              for (final z in g.saetze) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Farben.papier,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(z,
                                      style: Schrift.bodyKlein
                                          .copyWith(color: Farben.ink900)),
                                ),
                                const SizedBox(height: 8),
                              ],
                            ],
                          ]),
                  ),
                ),
                const SizedBox(height: 14),
                SsKnopf('Schliessen',
                    art: SsKnopfArt.sekundaer,
                    onTap: () => Navigator.of(blattKontext).pop()),
              ]),
            ),
          );
        },
      ),
    ).then((_) => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    final blatt = ref.watch(_aufsatzThemenProvider(widget.art));
    final treffer =
        blatt.valueOrNull?.where((t) => t.id == widget.themaId).toList() ?? const [];
    final thema = treffer.isEmpty ? null : treffer.first;
    final art = ref
        .watch(_artenProvider)
        .valueOrNull
        ?.where((a) => a.id == widget.art)
        .firstOrNull;

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text('$_woerter Wörter'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () async {
              await _speichere();
              if (context.mounted) context.pop();
            },
          ),
          actions: [
            Center(child: Text(_uhrzeit, style: Schrift.h4)),
            const SizedBox(width: 10),
            // Derselbe Tipp-Knopf wie in Mathematik, an derselben Stelle:
            // oben rechts. Dahinter liegen der Aufbau als Checkliste und
            // die Satzstarter.
            if (art != null)
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: TextButton.icon(
                  onPressed: () => _tipp(art),
                  icon: const Icon(Icons.lightbulb_outline, size: 15, color: Farben.gelb),
                  label: Text('Tipp',
                      style: Schrift.label.copyWith(color: Farben.ink900)),
                  style: TextButton.styleFrom(
                    backgroundColor: Farben.gelb100,
                    side: const BorderSide(color: Farben.gelb),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Mass.radiusChip)),
                  ),
                ),
              ),
          ],
        ),
        body: Column(children: [
          if (thema != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 0, Mass.seitenrand, 12),
              child: SsKarte(
                polster: const EdgeInsets.all(14),
                kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  GestureDetector(
                    onTap: () => setState(() => _auftragOffen = !_auftragOffen),
                    child: Row(children: [
                      Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SsEyebrow('Aufgabenstellung'),
                              const SizedBox(height: 6),
                              Text(thema.titel, style: Schrift.h4),
                            ]),
                      ),
                      Icon(_auftragOffen
                              ? Icons.keyboard_arrow_down
                              : Icons.keyboard_arrow_right,
                          size: 20, color: Farben.ink300),
                    ]),
                  ),
                  if (_auftragOffen) ...[
                    const SizedBox(height: 10),
                    Text(thema.auftrag, style: Schrift.body),
                    const SizedBox(height: 12),
                    const SsEyebrow('Das gehört in den Text'),
                    const SizedBox(height: 6),
                  ],
                  // Teilaufträge zum Abhaken: Wer sie vergisst, verliert
                  // Punkte in Kriterium A.
                  if (_auftragOffen)
                  for (var i = 0; i < thema.teile.length; i++)
                    GestureDetector(
                      onTap: () => setState(() =>
                          _haken.contains(i) ? _haken.remove(i) : _haken.add(i)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Icon(
                            _haken.contains(i)
                                ? Icons.check_box_outlined
                                : Icons.check_box_outline_blank,
                            size: 18,
                            color: _haken.contains(i) ? Farben.gruen : Farben.ink300,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(thema.teile[i], style: Schrift.klein)),
                        ]),
                      ),
                    ),
                ]),
              ),
            ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Farben.karte,
                  border: Border.all(color: Farben.linie),
                  borderRadius: BorderRadius.circular(Mass.radiusKarte),
                ),
                child: TextField(
                  controller: _text,
                  maxLines: null,
                  expands: true,
                  textAlignVertical: TextAlignVertical.top,
                  style: Schrift.body.copyWith(color: Farben.ink900, height: 1.6),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    hintText: 'Schreib hier deinen Text …',
                    hintStyle: Schrift.body,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(Mass.seitenrand),
            child: SsKnopf(
              'Korrigieren lassen',
              onTap: _woerter < 120
                  ? null
                  : () async {
                      await _speichere();
                      if (_aufsatzId != null && context.mounted) {
                        context.push('/aufsatz/korrektur/$_aufsatzId');
                      }
                    },
            ),
          ),
        ]),
      ),
    );
  }
}

/// Die vier Stufen der Rückmeldung.
///
/// Sie treten an die Stelle der Note. Eine Stufe sagt, wo der Text steht,
/// und der Kommentar daneben sagt, was als Nächstes zu tun ist. Das ist
/// die Rückmeldung, aus der man etwas machen kann.
const _stufen = <String, ({String text, Color farbe, Color flaeche, bool zaehlt})>{
  'noch_nicht': (text: 'noch nicht erreicht', farbe: Farben.rot, flaeche: Farben.rot100, zaehlt: false),
  'teilweise': (text: 'teilweise erreicht', farbe: Farben.gelb, flaeche: Farben.gelb100, zaehlt: false),
  'erreicht': (text: 'erreicht', farbe: Farben.gruen, flaeche: Farben.gruen100, zaehlt: true),
  'sicher': (text: 'sicher erreicht', farbe: Farben.gruen, flaeche: Farben.gruen100, zaehlt: true),
};

int _erreicht(List<Map<String, dynamic>> kriterien) =>
    kriterien.where((k) => _stufen[k['stufe']]?.zaehlt ?? false).length;

class _StufenChip extends StatelessWidget {
  const _StufenChip({required this.stufe});
  final String stufe;

  @override
  Widget build(BuildContext context) {
    final s = _stufen[stufe];
    if (s == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: s.flaeche,
        borderRadius: BorderRadius.circular(Mass.radiusChip),
      ),
      child: Text(s.text,
          style: Schrift.label.copyWith(color: s.farbe, fontSize: 12)),
    );
  }
}

/// Screen 28. Korrektur. Vier Kriterien mit Stufe, Teilaufträge, Textstellen.
class AufsatzKorrekturScreen extends ConsumerStatefulWidget {
  const AufsatzKorrekturScreen({super.key, required this.aufsatzId});
  final String aufsatzId;
  @override
  ConsumerState<AufsatzKorrekturScreen> createState() => _AufsatzKorrekturScreenState();
}

class _AufsatzKorrekturScreenState extends ConsumerState<AufsatzKorrekturScreen> {
  Map<String, dynamic>? _k;
  String? _fehler;

  @override
  void initState() {
    super.initState();
    _hole();
  }

  Future<void> _hole() async {
    try {
      final k = await ref.read(lernRepoProvider).aufsatzKorrektur(widget.aufsatzId);
      if (mounted) setState(() => _k = k);
    } catch (e) {
      if (mounted) {
        setState(() => _fehler = Api.brauchtPlus(e)
            ? 'Die Aufsatzkorrektur gehört zu StudySwiss Plus.'
            : Api.lesbar(e));
      }
    }
  }

  @override
  Widget build(BuildContext context) => PapierGrund(
        kind: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            title: const Text('Korrektur'),
            leading:
                IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
          ),
          body: _fehler != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Mass.seitenrand),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_fehler!, style: Schrift.body, textAlign: TextAlign.center),
                      const SizedBox(height: 20),
                      SsKnopf('StudySwiss Plus ansehen',
                          onTap: () => context.push('/plus')),
                    ]),
                  ),
                )
              : _k == null
                  ? const StudiLaden(text: 'Dein Text wird gelesen …')
                  : _Korrektur(k: _k!),
        ),
      );
}

class _Korrektur extends StatelessWidget {
  const _Korrektur({required this.k});
  final Map<String, dynamic> k;

  @override
  Widget build(BuildContext context) {
    final kriterien = (k['kriterien'] as List? ?? []).cast<Map<String, dynamic>>();
    final stellen = (k['textstellen'] as List? ?? []).cast<Map<String, dynamic>>();
    final schritte = (k['naechsteSchritte'] as List? ?? []).cast<Map<String, dynamic>>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(
          Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
      children: [
        SsDunkleKarte(
          kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SsEyebrow('Rückmeldung', farbe: Farben.tan300),
            const SizedBox(height: 6),
            // Keine Note. Eine Zahl von 1 bis 6 sagt einer 14-Jährigen, wo
            // sie steht, aber nicht, was sie tun soll, und sie erzeugt
            // Druck genau dort, wo Übung nötig wäre. Stattdessen die
            // abzählbare Grösse, wie überall sonst in der App.
            Text('${_erreicht(kriterien)} von ${kriterien.length}',
                style: Schrift.kennzahl.copyWith(color: Farben.creme)),
            Text('Kriterien erreicht',
                style: Schrift.klein.copyWith(color: Farben.tan300)),
            const SizedBox(height: 10),
            Text('${k['gesamt']}',
                style: Schrift.bodyKlein.copyWith(color: Farben.tan300)),
          ]),
        ),
        const SizedBox(height: 20),
        const SsEyebrow('Die vier Kriterien'),
        const SizedBox(height: 10),
        for (final kr in kriterien) ...[
          SsKarte(
            polster: const EdgeInsets.all(16),
            kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration:
                      const BoxDecoration(color: Farben.tan100, shape: BoxShape.circle),
                  child: Text('${kr['kuerzel']}',
                      style: Schrift.klein.copyWith(
                          color: Farben.tan600, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 10),
                Expanded(child: Text('${kr['name']}', style: Schrift.h4)),
              ]),
              const SizedBox(height: 10),
              _StufenChip(stufe: '${kr['stufe']}'),
              const SizedBox(height: 10),
              Text('${kr['kommentar']}', style: Schrift.bodyKlein),
            ]),
          ),
          const SizedBox(height: 8),
        ],
        if (stellen.isNotEmpty) ...[
          const SizedBox(height: 14),
          const SsEyebrow('Stellen im Text'),
          const SizedBox(height: 10),
          for (final s in stellen) ...[
            SsKarte(
              polster: const EdgeInsets.all(16),
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SsChip('${s['art']}'),
                const SizedBox(height: 10),
                Text('«${s['zitat']}»',
                    style: Schrift.bodyKlein.copyWith(fontStyle: FontStyle.italic)),
                const SizedBox(height: 8),
                Text('${s['problem']}', style: Schrift.klein),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Farben.gruen100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text('${s['besser']}',
                      style: Schrift.bodyKlein.copyWith(color: Farben.ink900)),
                ),
              ]),
            ),
            const SizedBox(height: 8),
          ],
        ],
        if (schritte.isNotEmpty) ...[
          const SizedBox(height: 14),
          const SsEyebrow('Beim nächsten Mal'),
          const SizedBox(height: 10),
          for (final s in schritte)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SsKarte(
                polster: const EdgeInsets.all(16),
                kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${s['fokus']}', style: Schrift.h4),
                  const SizedBox(height: 4),
                  Text('${s['uebung']}', style: Schrift.klein),
                ]),
              ),
            ),
        ],
      ],
    );
  }
}
