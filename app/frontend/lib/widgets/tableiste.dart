import 'package:flutter/material.dart';
import '../core/theme/farben.dart';

/// Die fünf Tabs. Seit Version 1.1 ist der Lernpfad aktiv: Er rechnet die
/// offenen Pflichtaufgaben auf die Wochen bis zur Prüfung um.
class SsTabLeiste extends StatelessWidget {
  const SsTabLeiste({super.key, required this.aktiv, required this.onWahl});
  final int aktiv;
  final ValueChanged<int> onWahl;

  static const tabs = [
    (Icons.menu_book_outlined, 'Lernen'),
    (Icons.route_outlined, 'Lernpfad'),
    (Icons.adjust_outlined, 'Selbsttest'),
    (Icons.bar_chart_outlined, 'Fortschritt'),
    (Icons.settings_outlined, 'Einstellungen'),
  ];

  @override
  Widget build(BuildContext context) => Container(
        height: Mass.tabHoehe,
        decoration: const BoxDecoration(
          color: Farben.karte,
          border: Border(top: BorderSide(color: Farben.linie)),
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              for (var i = 0; i < tabs.length; i++)
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onWahl(i),
                    child: Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            tabs[i].$1,
                            size: 22,
                            color: i == aktiv ? Farben.ink900 : Farben.ink300,
                          ),
                          const SizedBox(height: 5),
                          Text(
                            tabs[i].$2,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: i == aktiv ? FontWeight.w700 : FontWeight.w600,
                              color: i == aktiv ? Farben.ink900 : Farben.ink300,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
}
