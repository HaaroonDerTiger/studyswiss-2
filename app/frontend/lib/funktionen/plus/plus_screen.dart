import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import '../../core/net/api.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../daten/kauf.dart';
import '../../daten/modelle.dart';
import '../../daten/repos.dart';
import '../../widgets/grundbausteine.dart';
import '../sitzung.dart';

/// StudySwiss Plus.
///
/// Drei Wege, einer davon empfohlen, und welcher das ist, **rechnet der
/// Server aus dem Prüfungstermin aus**: Wer noch acht Monate hat, fährt mit
/// dem Pass günstiger; wer noch zwei hat, monatlich. Das steht auf der Karte,
/// nicht im Kleingedruckten.
///
/// Die Preise auf den Karten kommen aus dem Laden, sobald er antwortet —
/// sonst zeigt die App etwas anderes an als die Kaufbestätigung.
class PlusScreen extends ConsumerStatefulWidget {
  const PlusScreen({super.key});
  @override
  ConsumerState<PlusScreen> createState() => _PlusScreenState();
}

class _PlusScreenState extends ConsumerState<PlusScreen> {
  StreamSubscription<KaufErgebnis>? _horcher;
  Map<String, ProductDetails> _ausDemLaden = {};
  String? _laeuft;
  String? _fehler;

  @override
  void initState() {
    super.initState();
    _vorbereiten();
  }

  @override
  void dispose() {
    _horcher?.cancel();
    super.dispose();
  }

  Future<void> _vorbereiten() async {
    final dienst = ref.read(kaufDienstProvider);
    await dienst.starten();
    _horcher = dienst.ergebnisse.listen(_verarbeite);
    final liste = await dienst.angebote();
    if (mounted) setState(() => _ausDemLaden = {for (final p in liste) p.id: p});
  }

  void _verarbeite(KaufErgebnis e) {
    if (!mounted) return;
    switch (e.art) {
      case KaufArt.laeuft:
        setState(() => _fehler = null);
      case KaufArt.abgebrochen:
        setState(() => _laeuft = null);
      case KaufArt.fehler:
        setState(() {
          _laeuft = null;
          _fehler = e.text;
        });
      case KaufArt.fertig:
        setState(() => _laeuft = null);
        // Das Profil trägt das Plus-Kennzeichen, also muss es neu geladen werden.
        ref.read(sitzungProvider.notifier).aktualisiere();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('StudySwiss Plus ist freigeschaltet.'),
            backgroundColor: Farben.gruen,
          ),
        );
        if (context.mounted) context.pop();
    }
  }

  Future<void> _kaufen(Produkt p) async {
    final imLaden = _ausDemLaden[p.id];
    if (imLaden == null) {
      setState(() => _fehler =
          'Dieses Angebot ist gerade nicht verfügbar. Versuch es später nochmals.');
      return;
    }
    setState(() {
      _laeuft = p.id;
      _fehler = null;
    });
    await ref.read(kaufDienstProvider).kaufen(imLaden);
  }

  @override
  Widget build(BuildContext context) {
    final produkte = ref.watch(_produkteProvider);
    final plus = ref.watch(sitzungProvider).profil?.plus ?? false;

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
        ),
        body: produkte.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Farben.tan500)),
          error: (e, _) => Center(child: Text(Api.lesbar(e), style: Schrift.body)),
          data: (liste) => ListView(
            padding: const EdgeInsets.fromLTRB(
                Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
            children: [
              const SsEyebrow('StudySwiss Plus'),
              const SizedBox(height: 8),
              Text(plus ? 'Du hast Plus.' : 'Die ganze\nVorbereitung.', style: Schrift.h1),
              const SizedBox(height: 20),

              if (!plus) ...[
                const _WasDrinIst(),
                const SizedBox(height: 24),
                const SsEyebrow('Wähle deinen Weg'),
                const SizedBox(height: 10),
                for (final p in liste) ...[
                  _ProduktKarte(
                    produkt: p,
                    imLaden: _ausDemLaden[p.id],
                    laeuft: _laeuft == p.id,
                    onKauf: () => _kaufen(p),
                  ),
                  const SizedBox(height: 10),
                ],
                if (_fehler != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Farben.rot100,
                      border: Border.all(color: Farben.rot),
                      borderRadius: BorderRadius.circular(Mass.radiusKnopf),
                    ),
                    child: Text(_fehler!, style: Schrift.bodyKlein.copyWith(color: Farben.ink900)),
                  ),
                ],
                const SizedBox(height: 14),
                SsKnopf(
                  'Kauf wiederherstellen',
                  art: SsKnopfArt.text,
                  onTap: () => ref.read(kaufDienstProvider).wiederherstellen(),
                ),
                SsKnopf(
                  'Ich habe einen Familien-Code',
                  art: SsKnopfArt.text,
                  onTap: () => _codeEingeben(context, ref),
                ),
              ] else
                const _PlusAktiv(),

              const SizedBox(height: 20),
              Text(
                'Der Kauf läuft über den App Store bzw. Google Play. Das Monatsabo '
                'verlängert sich, bis du es dort kündigst; die beiden Pässe laufen von '
                'selbst aus und müssen nicht gekündigt werden.',
                style: Schrift.klein,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _codeEingeben(BuildContext context, WidgetRef ref) async {
    final feld = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Farben.karte,
        title: Text('Familien-Code', style: Schrift.h3),
        content: TextField(
          controller: feld,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          style: Schrift.h3,
          decoration: InputDecoration(
            hintText: 'ABCD2345',
            hintStyle: Schrift.h3.copyWith(color: Farben.ink300),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Abbrechen', style: Schrift.knopf.copyWith(color: Farben.ink500)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, feld.text),
            child: Text('Einlösen', style: Schrift.knopf.copyWith(color: Farben.tan600)),
          ),
        ],
      ),
    );
    if (code == null || code.trim().isEmpty) return;
    try {
      await ref.read(lernRepoProvider).codeEinloesen(code);
      await ref.read(sitzungProvider.notifier).aktualisiere();
      if (context.mounted) context.pop();
    } catch (e) {
      if (mounted) setState(() => _fehler = Api.lesbar(e));
    }
  }
}

final _produkteProvider =
    FutureProvider.autoDispose((ref) => ref.watch(lernRepoProvider).produkte());

class _ProduktKarte extends StatelessWidget {
  const _ProduktKarte({
    required this.produkt,
    required this.imLaden,
    required this.laeuft,
    required this.onKauf,
  });

  final Produkt produkt;
  final ProductDetails? imLaden;
  final bool laeuft;
  final VoidCallback onKauf;

  @override
  Widget build(BuildContext context) {
    // Der Preis aus dem Laden schlägt den vom Server: Er ist lokalisiert und
    // stimmt mit der Kaufbestätigung überein.
    final preis = imLaden?.price ?? produkt.preis;
    final hervor = produkt.empfohlen;

    return GestureDetector(
      onTap: laeuft ? null : onKauf,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: hervor ? Farben.ink900 : Farben.karte,
          border: hervor ? null : Border.all(color: Farben.linie),
          borderRadius: BorderRadius.circular(Mass.radiusDunkel),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (hervor) ...[
            const SsEyebrow('Für deinen Termin am günstigsten', farbe: Farben.tan300),
            const SizedBox(height: 8),
          ],
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(produkt.name,
                    style: Schrift.h3.copyWith(color: hervor ? Farben.creme : Farben.ink900)),
                const SizedBox(height: 3),
                Text(produkt.untertitel,
                    style: Schrift.klein.copyWith(color: hervor ? Farben.tan300 : Farben.ink300)),
              ]),
            ),
            const SizedBox(width: 12),
            Text(preis,
                style: Schrift.kennzahlKlein
                    .copyWith(fontSize: 24, color: hervor ? Farben.creme : Farben.ink900)),
          ]),
          if (produkt.hinweis.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(produkt.hinweis,
                style: Schrift.klein.copyWith(color: hervor ? Farben.tan300 : Farben.ink500)),
          ],
          const SizedBox(height: 14),
          SizedBox(
            height: 44,
            child: laeuft
                ? const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Farben.tan500),
                    ),
                  )
                : Container(
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: hervor ? Farben.creme : Farben.ink900,
                      borderRadius: BorderRadius.circular(Mass.radiusKnopf),
                    ),
                    child: Text(
                      imLaden == null ? 'Nicht verfügbar' : 'Auswählen',
                      style: Schrift.knopf
                          .copyWith(color: hervor ? Farben.ink900 : Farben.creme),
                    ),
                  ),
          ),
        ]),
      ),
    );
  }
}

class _WasDrinIst extends StatelessWidget {
  const _WasDrinIst();

  static const _gratis = [
    'Standortbestimmung',
    'Ein Fach vollständig, nicht nur zur Probe',
    'Lernpfad, Fortschritt und Fehlerarchiv',
  ];
  static const _plus = [
    'Alle Fächer',
    'Selbsttest über die ganze Prüfung',
    'Aufsatzkorrektur nach den vier Prüfungskriterien',
    'Eltern-Report',
  ];

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SsEyebrow('Immer gratis'),
          const SizedBox(height: 10),
          for (final g in _gratis) _Zeile(g, gratis: true),
          const SizedBox(height: 16),
          const SsEyebrow('Mit Plus dazu'),
          const SizedBox(height: 10),
          for (final g in _plus) _Zeile(g, gratis: false),
        ],
      );
}

class _PlusAktiv extends ConsumerWidget {
  const _PlusAktiv();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(_statusProvider);
    return status.when(
      loading: () => const SizedBox(height: 80),
      error: (e, _) => const SizedBox.shrink(),
      data: (s) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SsKarte(
          polster: const EdgeInsets.all(16),
          kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.check_circle_outline, size: 20, color: Farben.gruen),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  switch (s.art) {
                    'pass' => 'Prüfungs-Pass',
                    'familie' => s.ueberFamilie ? 'Über einen Familien-Code' : 'Familien-Pass',
                    'monatlich' => 'Monatsabo',
                    _ => 'Plus',
                  },
                  style: Schrift.h4,
                ),
              ),
            ]),
            if (s.bis != null) ...[
              const SizedBox(height: 8),
              Text('Gültig bis ${s.bis!.substring(0, 10)}', style: Schrift.klein),
            ],
          ]),
        ),
        if (s.freieCodes.isNotEmpty) ...[
          const SizedBox(height: 20),
          const SsEyebrow('Codes zum Weitergeben'),
          const SizedBox(height: 6),
          Text(
            'Gib einen Code an ein Geschwister weiter. Es bekommt Plus bis zur '
            'eigenen Prüfung, nicht bis zu deiner.',
            style: Schrift.klein,
          ),
          const SizedBox(height: 10),
          for (final c in s.freieCodes)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SsKarte(
                polster: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                kind: Row(children: [
                  Expanded(
                    child: Text(c,
                        style: Schrift.h3.copyWith(letterSpacing: 3)),
                  ),
                  const Icon(Icons.content_copy_outlined, size: 18, color: Farben.ink300),
                ]),
              ),
            ),
        ],
      ]),
    );
  }
}

final _statusProvider =
    FutureProvider.autoDispose((ref) => ref.watch(lernRepoProvider).aboStatus());

class _Zeile extends StatelessWidget {
  const _Zeile(this.text, {required this.gratis});
  final String text;
  final bool gratis;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(gratis ? Icons.check_circle_outline : Icons.star_outline,
              size: 19, color: gratis ? Farben.gruen : Farben.tan600),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: Schrift.bodyKlein)),
        ]),
      );
}
