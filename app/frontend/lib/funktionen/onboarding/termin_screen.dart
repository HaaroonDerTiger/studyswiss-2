import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../widgets/grundbausteine.dart';
import '../sitzung.dart';

/// Screen 7. Prüfungstermin.
///
/// «**Nächster** Prüfungstermin», nicht «Dein» Er ist aus dem Katalog
/// vorbelegt und lässt sich ändern. Von hier an rechnet die App in Tagen.
class TerminScreen extends ConsumerStatefulWidget {
  const TerminScreen({super.key});
  @override
  ConsumerState<TerminScreen> createState() => _TerminScreenState();
}

class _TerminScreenState extends ConsumerState<TerminScreen> {
  DateTime? _datum;

  @override
  void initState() {
    super.initState();
    // Das Backend hat beim Speichern von Kanton und Schultyp bereits den
    // nächsten Termin eingetragen. Wir zeigen ihn nur an.
    final p = ref.read(sitzungProvider).profil;
    _datum = p?.pruefungsdatum == null ? null : DateTime.parse(p!.pruefungsdatum!);
    if (_datum == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await ref.read(sitzungProvider.notifier).aktualisiere();
        final d = ref.read(sitzungProvider).profil?.pruefungsdatum;
        if (mounted && d != null) setState(() => _datum = DateTime.parse(d));
      });
    }
  }

  int get _tage => _datum == null ? 0 : _datum!.difference(DateTime.now()).inDays.clamp(0, 9999);

  @override
  Widget build(BuildContext context) {
    final formatiert = _datum == null
        ? '—'
        : DateFormat('d. MMMM yyyy', 'de_CH').format(_datum!);

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Schritt 3 von 3')),
        body: Padding(
          padding: const EdgeInsets.symmetric(horizontal: Mass.seitenrand),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 8),
            const SsEyebrow('Wann schreibst du?'),
            const SizedBox(height: 8),
            Text('Nächster\nPrüfungstermin', style: Schrift.h1),
            const SizedBox(height: 24),
            SsDunkleKarte(
              kind: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SsEyebrow('Prüfung in', farbe: Farben.tan300),
                const SizedBox(height: 6),
                Text('$_tage', style: Schrift.kennzahl.copyWith(color: Farben.creme)),
                const SizedBox(height: 4),
                Text('Tagen · $formatiert',
                    style: Schrift.klein.copyWith(color: Farben.tan300)),
              ]),
            ),
            const SizedBox(height: 12),
            SsKarte(
              onTap: _waehle,
              polster: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              kind: Row(children: [
                const SsIconFlaeche(Icons.calendar_today_outlined, groesse: 38),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Anderes Datum wählen', style: Schrift.h4),
                    const SizedBox(height: 2),
                    Text('Falls du zu einem anderen Termin antrittst.', style: Schrift.klein),
                  ]),
                ),
                const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
              ]),
            ),
            const Spacer(),
            Text(
              'Nach diesem Datum richtet sich, was zuerst dran ist. Du kannst es '
              'jederzeit in den Einstellungen ändern.',
              style: Schrift.klein,
            ),
            const SizedBox(height: 16),
            SsKnopf('Weiter zur Standortbestimmung',
                onTap: _datum == null ? null : () => context.go('/standort')),
            const SizedBox(height: Mass.seitenrand),
          ]),
        ),
      ),
    );
  }

  Future<void> _waehle() async {
    final jetzt = DateTime.now();
    final gewaehlt = await showDatePicker(
      context: context,
      initialDate: _datum ?? jetzt.add(const Duration(days: 180)),
      firstDate: jetzt,
      lastDate: jetzt.add(const Duration(days: 900)),
      locale: const Locale('de', 'CH'),
    );
    if (gewaehlt == null) return;
    setState(() => _datum = gewaehlt);
    await ref.read(sitzungProvider.notifier).speichereOnboarding(
          pruefungsdatum: gewaehlt.toIso8601String().substring(0, 10),
        );
  }
}
