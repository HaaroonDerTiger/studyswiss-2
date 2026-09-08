import 'package:flutter/material.dart';
import '../core/theme/farben.dart';
import '../core/theme/typografie.dart';
import '../daten/modelle.dart';
import 'mathe_text.dart';
import 'studi.dart';
import 'grundbausteine.dart';

/// Der Aufgabentext. Steht immer allein auf der Karte, ohne Ablenkung.
class AufgabenStamm extends StatelessWidget {
  const AufgabenStamm(this.aufgabe, {super.key});
  final Aufgabe aufgabe;
  @override
  Widget build(BuildContext context) => MatheText(
        aufgabe.stamm,
        stil: Schrift.h3.copyWith(height: 1.45, fontWeight: FontWeight.w500),
      );
}

/// Eingabefeld für die Antwort. Zeigt die Einheit rechts an, damit niemand
/// sie mittippen muss.
class AntwortFeld extends StatelessWidget {
  const AntwortFeld({
    super.key,
    required this.steuer,
    this.einheit,
    this.onSubmit,
    this.gesperrt = false,
  });
  final TextEditingController steuer;
  final String? einheit;
  final VoidCallback? onSubmit;
  final bool gesperrt;

  @override
  Widget build(BuildContext context) => Container(
        height: 62,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Farben.karte,
          border: Border.all(color: Farben.tan300, width: 1.5),
          borderRadius: BorderRadius.circular(Mass.radiusKnopf),
        ),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: steuer,
              enabled: !gesperrt,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => onSubmit?.call(),
              style: Schrift.titel,
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: 'Deine Antwort',
                hintStyle: Schrift.titel.copyWith(color: Farben.ink300),
              ),
            ),
          ),
          if (einheit != null)
            Text(einheit!, style: Schrift.h4.copyWith(color: Farben.ink300)),
        ]),
      );
}

class AuswahlListe extends StatelessWidget {
  const AuswahlListe({super.key, required this.optionen, required this.gewaehlt, required this.onWahl});
  final List<Option> optionen;
  final String? gewaehlt;
  final ValueChanged<String> onWahl;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          for (final o in optionen) ...[
            GestureDetector(
              onTap: () => onWahl(o.id),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: gewaehlt == o.id ? Farben.tan100 : Farben.karte,
                  border: Border.all(
                    color: gewaehlt == o.id ? Farben.ink900 : Farben.linie,
                    width: gewaehlt == o.id ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(Mass.radiusKnopf),
                ),
                child: MatheText(o.text, stil: Schrift.h4),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ],
      );
}

/// Fortschrittszeile «3 von 10» über der Aufgabe. Abzählbar, nie in Prozent.
class SetFortschritt extends StatelessWidget {
  const SetFortschritt({super.key, required this.bei, required this.total});
  final int bei;
  final int total;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$bei von $total', style: Schrift.klein),
          const SizedBox(height: 6),
          SsBalken(anteil: total == 0 ? 0 : bei / total),
        ],
      );
}

/// Der Tipp-Knopf. Sitzt in der Einführung und in der Aufgabe an **derselben
/// Stelle: oben rechts**. Das war eine ausdrückliche Rückmeldung.
class TippKnopf extends StatelessWidget {
  const TippKnopf({super.key, required this.onTap, this.aktiv = true});
  final VoidCallback onTap;
  final bool aktiv;
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: aktiv ? onTap : null,
        child: Container(
          height: 32,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: aktiv ? Farben.gelb100 : Farben.karte,
            border: Border.all(color: aktiv ? Farben.gelb : Farben.linie),
            borderRadius: BorderRadius.circular(Mass.radiusChip),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.lightbulb_outline, size: 15, color: aktiv ? Farben.gelb : Farben.ink300),
            const SizedBox(width: 6),
            Text('Tipp',
                style: Schrift.klein.copyWith(
                    fontWeight: FontWeight.w700,
                    color: aktiv ? Farben.ink900 : Farben.ink300)),
          ]),
        ),
      );
}

/// Das Blatt, das nach einer Antwort von unten kommt.
///
/// Bei einer falschen Antwort steht hier **der Denkfehler**, nicht «Das ist
/// falsch». Der Satz kommt aus dem Fehlermuster des Templates.
class RueckmeldungsBlatt extends StatelessWidget {
  const RueckmeldungsBlatt({
    super.key,
    required this.rueckmeldung,
    required this.onWeiter,
    this.onNochmal,
  });
  final Rueckmeldung rueckmeldung;
  final VoidCallback onWeiter;
  final VoidCallback? onNochmal;

  @override
  Widget build(BuildContext context) {
    final gut = rueckmeldung.richtig;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(Mass.seitenrand, 16, Mass.seitenrand, 28),
      decoration: const BoxDecoration(
        color: Farben.karte,
        borderRadius: BorderRadius.vertical(top: Radius.circular(Mass.radiusSheet)),
        border: Border(top: BorderSide(color: Farben.linie)),
        // Der einzige Schatten im ganzen Design.
        boxShadow: [
          BoxShadow(color: Color(0x123A1D0A), blurRadius: 24, offset: Offset(0, -12)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 48,
            height: 5,
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: Farben.tan300,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Studi statt eines Hakens: Bei einem Fehler wischt sie sich den
            // Schweiss ab. Das nimmt dem roten Blatt die Härte.
            StudiBild(gut ? Studi.erfolg : Studi.hoppla, breite: 72),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(gut ? 'Richtig' : 'Noch nicht', style: Schrift.h2),
                const SizedBox(height: 6),
                MatheText(rueckmeldung.feedback, stil: Schrift.bodyKlein),
              ]),
            ),
          ]),
          if (!gut && rueckmeldung.loesungsweg.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Farben.papier,
                borderRadius: BorderRadius.circular(Mass.radiusKnopf),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SsEyebrow('So geht es'),
                const SizedBox(height: 8),
                for (final s in rueckmeldung.loesungsweg)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: MatheText(s, stil: Schrift.bodyKlein),
                  ),
              ]),
            ),
          ],
          const SizedBox(height: 14),
          Text(
            '${rueckmeldung.geloestImThema} von ${rueckmeldung.pflichtset} Pflichtaufgaben',
            style: Schrift.klein,
          ),
          const SizedBox(height: 14),
          Row(children: [
            if (!gut && onNochmal != null) ...[
              Expanded(
                child: SsKnopf('Nochmal versuchen',
                    art: SsKnopfArt.sekundaer, onTap: onNochmal),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(child: SsKnopf('Weiter', onTap: onWeiter)),
          ]),
        ]),
      ),
    );
  }
}

/// Wörter im Satz antippen.
///
/// Für die deutschen Aufgabenarten «Objekt markieren» und «verbale Teile
/// markieren». Der Satz kommt als Wortliste vom Server; welche Wörter richtig
/// sind, bleibt dort. Der Client weiss nur, **wie viele** gesucht sind.
/// Trennt das Wort von den Satzzeichen dahinter.
final _satzzeichen = RegExp(r'^(.*?)([.,;:!?»)]*)$');
String _wort(String w) => _satzzeichen.firstMatch(w)?.group(1) ?? w;
String _zeichen(String w) => _satzzeichen.firstMatch(w)?.group(2) ?? '';

class WoerterAntippen extends StatelessWidget {
  const WoerterAntippen({
    super.key,
    required this.woerter,
    required this.gewaehlt,
    required this.anzahlGesucht,
    required this.onTipp,
  });

  final List<String> woerter;
  final Set<int> gewaehlt;
  final int anzahlGesucht;
  final ValueChanged<int> onTipp;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (anzahlGesucht > 0)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                '${gewaehlt.length} von $anzahlGesucht markiert',
                style: Schrift.klein.copyWith(
                  color: gewaehlt.length == anzahlGesucht ? Farben.gruen : Farben.ink300,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          Wrap(
            spacing: 2,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              for (var i = 0; i < woerter.length; i++) ...[
                GestureDetector(
                  onTap: () => onTipp(i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: gewaehlt.contains(i) ? Farben.ink900 : Colors.transparent,
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                        color: gewaehlt.contains(i) ? Farben.ink900 : Farben.tan300,
                      ),
                    ),
                    child: Text(
                      _wort(woerter[i]),
                      style: Schrift.h4.copyWith(
                        fontWeight: FontWeight.w500,
                        color: gewaehlt.contains(i) ? Farben.creme : Farben.ink900,
                      ),
                    ),
                  ),
                ),
                // Satzzeichen bleiben ausserhalb der Schaltfläche. Sonst
                // tippt man auf «Brief.» statt auf «Brief».
                if (_zeichen(woerter[i]).isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 3),
                    child: Text(_zeichen(woerter[i]),
                        style: Schrift.h4.copyWith(fontWeight: FontWeight.w500)),
                  ),
              ],
            ],
          ),
        ],
      );
}

/// Kommas setzen.
///
/// Anders als beim Markieren tippt man nicht auf ein Wort, sondern in die
/// **Lücke danach**. Deshalb sitzt die Schaltfläche zwischen den Wörtern und
/// zeigt das Komma an der Stelle, an der es später steht.
class KommasSetzen extends StatelessWidget {
  const KommasSetzen({
    super.key,
    required this.woerter,
    required this.gewaehlt,
    required this.onTipp,
  });

  final List<String> woerter;
  final Set<int> gewaehlt;
  final ValueChanged<int> onTipp;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              gewaehlt.isEmpty
                  ? 'Tippe in die Lücke, wo ein Komma hingehört'
                  : '${gewaehlt.length} Komma${gewaehlt.length == 1 ? '' : 's'} gesetzt',
              style: Schrift.klein,
            ),
          ),
          Wrap(
            spacing: 0,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              for (var i = 0; i < woerter.length; i++) ...[
                Text(woerter[i],
                    style: Schrift.h4.copyWith(fontWeight: FontWeight.w500)),
                // Nach dem letzten Wort gibt es keine Lücke mehr.
                if (i < woerter.length - 1)
                  GestureDetector(
                    onTap: () => onTipp(i),
                    child: Container(
                      width: 22,
                      height: 30,
                      alignment: Alignment.center,
                      margin: const EdgeInsets.symmetric(horizontal: 1),
                      decoration: BoxDecoration(
                        color: gewaehlt.contains(i) ? Farben.gelb100 : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: gewaehlt.contains(i) ? Farben.gelb : Farben.linie,
                        ),
                      ),
                      child: Text(
                        gewaehlt.contains(i) ? ',' : '·',
                        style: Schrift.h3.copyWith(
                          color: gewaehlt.contains(i) ? Farben.ink900 : Farben.ink300,
                        ),
                      ),
                    ),
                  )
                else
                  const SizedBox(width: 2),
              ],
            ],
          ),
        ],
      );
}

/// Mehrere Optionen ankreuzen. Die Anzahl steht nicht dabei, bei dieser
/// Aufgabenart gehört das Zählen zur Aufgabe.
class MehrfachListe extends StatelessWidget {
  const MehrfachListe({
    super.key,
    required this.optionen,
    required this.gewaehlt,
    required this.onWahl,
  });

  final List<Option> optionen;
  final Set<String> gewaehlt;
  final ValueChanged<String> onWahl;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          for (final o in optionen) ...[
            GestureDetector(
              onTap: () => onWahl(o.id),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: gewaehlt.contains(o.id) ? Farben.tan100 : Farben.karte,
                  border: Border.all(
                    color: gewaehlt.contains(o.id) ? Farben.ink900 : Farben.linie,
                    width: gewaehlt.contains(o.id) ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(Mass.radiusKnopf),
                ),
                child: Row(children: [
                  Icon(
                    gewaehlt.contains(o.id)
                        ? Icons.check_box_outlined
                        : Icons.check_box_outline_blank,
                    size: 20,
                    color: gewaehlt.contains(o.id) ? Farben.ink900 : Farben.ink300,
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(o.text, style: Schrift.h4)),
                ]),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
      );
}
