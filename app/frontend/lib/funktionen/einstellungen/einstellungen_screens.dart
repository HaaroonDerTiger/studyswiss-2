import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/farben.dart';
import '../../core/theme/papier.dart';
import '../../core/theme/typografie.dart';
import '../../widgets/grundbausteine.dart';
import '../sitzung.dart';

/// Screen 30. Einstellungen.
class EinstellungenScreen extends ConsumerWidget {
  const EinstellungenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(sitzungProvider).profil;
    final steuer = ref.read(sitzungProvider.notifier);

    return PapierGrund(
      kind: ListView(
        padding: const EdgeInsets.fromLTRB(
            Mass.seitenrand, 12, Mass.seitenrand, Mass.tabHoehe + 24),
        children: [
          const SsEyebrow('Dein Konto'),
          const SizedBox(height: 6),
          Text('Einstellungen', style: Schrift.h1),
          const SizedBox(height: 20),

          SsKarte(
            onTap: () => context.push('/profil'),
            polster: const EdgeInsets.all(16),
            kind: Row(children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration:
                    const BoxDecoration(color: Farben.tan100, shape: BoxShape.circle),
                child: Text(
                  _initial(p?.vorname),
                  style: Schrift.h2.copyWith(color: Farben.tan600),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p?.vorname ?? 'Ohne Namen', style: Schrift.h3),
                  const SizedBox(height: 2),
                  Text(
                    switch (p?.anbieter) {
                      'apple' => 'Mit Apple angemeldet',
                      'google' => 'Mit Google angemeldet',
                      _ => 'Ohne Konto. Nur auf diesem Gerät',
                    },
                    style: Schrift.klein,
                  ),
                ]),
              ),
              const Icon(Icons.chevron_right, size: 20, color: Farben.ink300),
            ]),
          ),
          const SizedBox(height: 12),

          if (p?.plus != true)
            GestureDetector(
              onTap: () => context.push('/plus'),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Farben.ink900,
                  borderRadius: BorderRadius.circular(Mass.radiusDunkel),
                ),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const SsEyebrow('StudySwiss Plus', farbe: Farben.tan300),
                      const SizedBox(height: 6),
                      Text('Alle Fächer, ganze Prüfung,\nAufsatzkorrektur',
                          style: Schrift.h3.copyWith(color: Farben.creme)),
                    ]),
                  ),
                  const Icon(Icons.chevron_right, color: Farben.tan300),
                ]),
              ),
            ),
          const SizedBox(height: 22),

          const SsEyebrow('Prüfung'),
          const SizedBox(height: 10),
          SsListenZeile(
            titel: 'Prüfung & Kanton',
            untertitel: [
              p?.kanton,
              p?.schultyp,
              p?.pruefungsdatum == null
                  ? null
                  : DateFormat('d.M.yyyy').format(DateTime.parse(p!.pruefungsdatum!)),
            ].whereType<String>().join(' · '),
            icon: Icons.school_outlined,
            onTap: () => context.push('/einstellungen/pruefung'),
          ),
          const SizedBox(height: 10),
          SsListenZeile(
            titel: 'Eltern-Report',
            untertitel: p?.elternFreigabe == true ? 'Freigegeben' : 'Nicht freigegeben',
            icon: Icons.family_restroom_outlined,
            onTap: () => context.push('/eltern'),
          ),
          const SizedBox(height: 10),
          SsListenZeile(
            titel: 'Meine Fehler',
            untertitel: 'Was du zuletzt falsch hattest',
            icon: Icons.error_outline,
            onTap: () => context.push('/fehler'),
          ),
          const SizedBox(height: 22),

          const SsEyebrow('Konto'),
          const SizedBox(height: 10),
          if (p?.istGast == true) ...[
            SsListenZeile(
              titel: 'Konto verknüpfen',
              untertitel: 'Damit dein Fortschritt auch auf einem neuen Gerät da ist',
              icon: Icons.link,
              onTap: steuer.verknuepfen,
            ),
            const SizedBox(height: 10),
          ],
          SsListenZeile(
            titel: 'Abmelden',
            icon: Icons.logout,
            onTap: () async {
              await steuer.abmelden();
              if (context.mounted) context.go('/anmeldung');
            },
          ),
          const SizedBox(height: 10),
          SsListenZeile(
            titel: 'Konto löschen',
            untertitel: 'Löscht alles: Fortschritt, Fehler und Aufsätze',
            icon: Icons.delete_outline,
            onTap: () => _bestaetigeLoeschung(context, steuer),
          ),
          const SizedBox(height: 24),
          Text(
            'StudySwiss 1.0 · Wir speichern nur, was zum Lernen nötig ist. '
            'Aufsätze werden nicht weitergegeben und nach dem Löschen des Kontos '
            'innerhalb von 30 Tagen entfernt.',
            style: Schrift.klein,
          ),
        ],
      ),
    );
  }

  /// Erster Buchstabe des Vornamens. Ohne `package:characters`, dafür mit
  /// Schutz gegen den leeren String.
  String _initial(String? name) =>
      (name == null || name.trim().isEmpty) ? '?' : name.trim().substring(0, 1).toUpperCase();

  Future<void> _bestaetigeLoeschung(BuildContext context, SitzungsController steuer) async {
    final ja = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Farben.karte,
        title: Text('Konto wirklich löschen?', style: Schrift.h3),
        content: Text(
          'Damit sind dein Fortschritt, deine Fehler und deine Aufsätze weg. '
          'Das lässt sich nicht rückgängig machen.',
          style: Schrift.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Behalten', style: Schrift.knopf.copyWith(color: Farben.ink900)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Löschen', style: Schrift.knopf.copyWith(color: Farben.rot)),
          ),
        ],
      ),
    );
    if (ja != true) return;
    await steuer.kontoLoeschen();
    if (context.mounted) context.go('/anmeldung');
  }
}

/// Screen 31. Prüfung & Kanton ändern.
class EinstellungenPruefungScreen extends ConsumerWidget {
  const EinstellungenPruefungScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(sitzungProvider).profil;
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Prüfung & Kanton'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
          children: [
            SsListenZeile(
              titel: 'Kanton',
              untertitel: p?.kanton ?? 'nicht gesetzt',
              onTap: () => context.push('/kanton'),
            ),
            const SizedBox(height: 10),
            SsListenZeile(
              titel: 'Schule',
              untertitel: p?.schultyp ?? 'nicht gesetzt',
              // Ohne gewählten Kanton führt der Weg zur Kantonswahl zurück,
              // statt still Zürich anzunehmen.
              onTap: () => context.push(
                  p?.kanton == null ? '/kanton' : '/schule/${p!.kanton}'),
            ),
            const SizedBox(height: 10),
            SsListenZeile(
              titel: 'Prüfungstermin',
              untertitel: p?.pruefungsdatum == null
                  ? 'nicht gesetzt'
                  : '${DateFormat('d. MMMM yyyy', 'de_CH').format(DateTime.parse(p!.pruefungsdatum!))}'
                      ' · noch ${p.tageBisPruefung} Tage',
              onTap: () async {
                final jetzt = DateTime.now();
                final d = await showDatePicker(
                  context: context,
                  initialDate: p?.pruefungsdatum == null
                      ? jetzt.add(const Duration(days: 180))
                      : DateTime.parse(p!.pruefungsdatum!),
                  firstDate: jetzt,
                  lastDate: jetzt.add(const Duration(days: 900)),
                  locale: const Locale('de', 'CH'),
                );
                if (d == null) return;
                await ref.read(sitzungProvider.notifier).speichereOnboarding(
                      pruefungsdatum: d.toIso8601String().substring(0, 10),
                    );
              },
            ),
            const SizedBox(height: 20),
            Text(
              'Der Termin bestimmt, wie dringend ein Thema ist. Wer ihn ändert, '
              'ändert damit auch die Reihenfolge unter «Zuerst dran».',
              style: Schrift.klein,
            ),
          ],
        ),
      ),
    );
  }
}

/// Screen 32. Profil.
class ProfilScreen extends ConsumerStatefulWidget {
  const ProfilScreen({super.key});
  @override
  ConsumerState<ProfilScreen> createState() => _ProfilScreenState();
}

class _ProfilScreenState extends ConsumerState<ProfilScreen> {
  late final TextEditingController _vorname =
      TextEditingController(text: ref.read(sitzungProvider).profil?.vorname ?? '');

  @override
  void dispose() {
    _vorname.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(sitzungProvider).profil;
    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Profil'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
          children: [
            const SsEyebrow('Wie sollen wir dich nennen?'),
            const SizedBox(height: 10),
            Container(
              height: 58,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Farben.karte,
                border: Border.all(color: Farben.linie),
                borderRadius: BorderRadius.circular(Mass.radiusKnopf),
              ),
              child: TextField(
                controller: _vorname,
                style: Schrift.h4,
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Vorname (freiwillig)',
                  hintStyle: Schrift.h4.copyWith(color: Farben.ink300),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text('Ein Vorname genügt. Wir brauchen keinen Nachnamen.', style: Schrift.klein),
            const SizedBox(height: 20),
            SsKnopf('Speichern', onTap: () async {
              await ref
                  .read(sitzungProvider.notifier)
                  .speichereOnboarding(vorname: _vorname.text.trim());
              if (context.mounted) context.pop();
            }),
            const SizedBox(height: 24),
            SsListenZeile(
              titel: 'Anmeldung',
              untertitel: switch (p?.anbieter) {
                'apple' => 'Apple',
                'google' => 'Google',
                _ => 'Ohne Konto',
              },
            ),
            const SizedBox(height: 10),
            SsListenZeile(
              titel: 'StudySwiss Plus',
              untertitel: p?.plus == true ? 'Aktiv' : 'Nicht aktiv',
              onTap: () => context.push('/plus'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Screen 33. StudySwiss Plus.
class PlusScreen extends ConsumerWidget {
  const PlusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const gratis = [
      'Standortbestimmung',
      'Ein Fach vollständig üben',
      'Fortschritt und Fehlerarchiv',
    ];
    const plus = [
      'Alle Fächer',
      'Selbsttest über die ganze Prüfung',
      'Aufsatzkorrektur nach den vier Prüfungskriterien',
      'Eltern-Report',
    ];

    return PapierGrund(
      kind: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(
              Mass.seitenrand, 8, Mass.seitenrand, Mass.seitenrand),
          children: [
            const SsEyebrow('StudySwiss Plus'),
            const SizedBox(height: 8),
            Text('Die ganze\nVorbereitung.', style: Schrift.h1),
            const SizedBox(height: 24),
            const SsEyebrow('Immer gratis'),
            const SizedBox(height: 10),
            for (final g in gratis) _Zeile(g, gratis: true),
            const SizedBox(height: 20),
            const SsEyebrow('Mit Plus dazu'),
            const SizedBox(height: 10),
            for (final g in plus) _Zeile(g, gratis: false),
            const SizedBox(height: 28),
            // OFFEN: Preis und Familien-Abo sind noch nicht entschieden.
            SsKnopf('Plus freischalten', onTap: () => _kaufe(context)),
            const SizedBox(height: 8),
            SsKnopf('Kauf wiederherstellen',
                art: SsKnopfArt.text, onTap: () => _kaufe(context)),
            const SizedBox(height: 16),
            Text(
              'Das Abo läuft über den App Store bzw. Google Play und verlängert sich, '
              'bis du es dort kündigst. Kündigen geht jederzeit.',
              style: Schrift.klein,
            ),
          ],
        ),
      ),
    );
  }

  void _kaufe(BuildContext context) => ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Der Kauf wird über den App Store abgewickelt.'),
          backgroundColor: Farben.ink900,
        ),
      );
}

class _Zeile extends StatelessWidget {
  const _Zeile(this.text, {required this.gratis});
  final String text;
  final bool gratis;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(children: [
          Icon(gratis ? Icons.check_circle_outline : Icons.star_outline,
              size: 20, color: gratis ? Farben.gruen : Farben.tan600),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: Schrift.bodyKlein)),
        ]),
      );
}
