// Eine Rauchprobe, mehr nicht.
//
// Die eigentliche Absicherung leisten die Pruefungen in `app/pruefung/`: Sie
// fuehren die Vorschau mit JavaScriptCore wirklich aus und pruefen alle
// vierzehn Formate. Dieser Test hier beantwortet nur die eine Frage, die sie
// nicht beantworten koennen — laesst sich die Flutter-App ueberhaupt bauen
// und zeichnen?
//
// Er ist bewusst duenn. Ein Test, der die Fachlogik ein zweites Mal nachbaut,
// waere eine zweite Stelle zum Pflegen und bei der ersten Aenderung falsch.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:studyswiss/core/theme/farben.dart';
import 'package:studyswiss/core/theme/papier.dart';

void main() {
  test('Die Farben stammen aus dem Design-System', () {
    // Stichproben aus §5.3. Wer einen dieser Werte aendert, aendert die
    // Marke — dann soll es hier auffallen und nicht auf dem Screen.
    expect(Farben.ink900, const Color(0xFF3A1D0A));
    expect(Farben.papier, const Color(0xFFFBF5EA));
    expect(Farben.tan500, const Color(0xFFC99A66));
  });

  testWidgets('Die App zeichnet sich, ohne zu werfen', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: Scaffold(body: Text('StudySwiss'))),
      ),
    );
    expect(find.text('StudySwiss'), findsOneWidget);
  });

  testWidgets('PapierGrund bringt einen Material-Vorfahren mit', (tester) async {
    // Ohne Material hat Flutter keinen voreingestellten Textstil und zeichnet
    // jeden Text mit gelber Doppellinie. Sechs Screens bauen direkt auf
    // `PapierGrund` statt auf `Scaffold` — Splash, Onboarding und Anmeldung
    // sind darunter, also genau das, was ein Kind zuerst sieht.
    await tester.pumpWidget(
      const MaterialApp(
        home: PapierGrund(kind: Center(child: Text('Prüfsatz'))),
      ),
    );

    expect(
      find.ancestor(of: find.text('Prüfsatz'), matching: find.byType(Material)),
      findsWidgets,
      reason: 'Text ohne Material bekommt die gelbe Doppellinie',
    );

    // Und der Stil muss wirklich ankommen: keine Unterstreichung.
    final stil = DefaultTextStyle.of(tester.element(find.text('Prüfsatz'))).style;
    expect(stil.decoration, isNot(TextDecoration.underline));
  });
}
