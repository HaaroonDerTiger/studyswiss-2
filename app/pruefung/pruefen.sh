#!/bin/bash
# Alles prüfen. Ein Befehl, zwölf Prüfungen.
#
# Ohne Compiler ist das die Absicherung: Die Vorschau wird mit JavaScriptCore
# wirklich ausgeführt, Kotlin und Dart werden statisch gegengelesen, und die
# Feldnamen zwischen Backend und App werden verglichen.
set -u
cd "$(dirname "$0")"
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
FEHLER=0
lauf() {
  echo ""
  echo "──── $1 ────"
  shift
  if ! "$@"; then FEHLER=1; fi
}

# Zuerst die Kantone: Wenn der Weg vom Kanton bis zur Aufgabe nicht
# aufgeht, ist alles Weitere eine Prüfung an Inhalten, die niemand zu
# sehen bekommt.
lauf "Kantone und Prüfungen"     python3 kantone.py
lauf "Qualitätstore Mathematik"  python3 tore.py
lauf "Qualitätstore Deutsch"     python3 tore_deutsch.py
lauf "Kotlin"                    python3 kotlin_pruefen.py
lauf "Dart"                      python3 dart_pruefen.py
lauf "Vertrag Backend ↔ Clients" python3 vertrag.py
# Die Website ist der zweite Client desselben Backends. Sie hat keinen
# Compiler und keine Typen — eine tote Verknüpfung, ein Feld ohne
# Beschriftung oder ein Preis, der nicht mehr stimmt, bliebe sonst still.
lauf "Website"                   python3 website.py
# Und die Website wird AUSGEFUEHRT. `website.py` liest den gebauten Text
# gegen; ein Knopf, der an nichts haengt, sieht dort aus wie einer, der
# funktioniert. Diese Runde klickt den Lernbereich wirklich durch —
# Uebung, Selbsttest, Standortbestimmung, Aufsatz, Tipps.
lauf "Website ausfuehren"        python3 web_pruefen.py
# Die Vorschau wird gleich AUSGEFUEHRT. Ist sie nicht auf dem Stand der
# Ressourcen, pruefen die sieben Runden einen alten Inhalt — und «alles
# gruen» hiesse dann gar nichts.
lauf "Vorschau aktuell"          python3 vorschau_bauen.py --pruefen
# `app.js` MUSS hier gezogen werden, vor dem Gleichlauf. Es stand frueher
# erst im jsc-Block weiter unten — damit las der Gleichlauf ein app.js vom
# vorletzten Lauf und meldete jede neue Vorlage als «kennt nur eine Seite».
# Beim zweiten Aufruf war derselbe Fehler weg. Ein Pruefer, dessen Befund
# vom letzten Lauf abhaengt, ist keiner.
lauf "Vorschau lesbar machen"    python3 extrahiere.py
lauf "Gleichlauf der Engines"    python3 gleichlauf.py
lauf "Zeichen und Bilder"       python3 zeichen.py

echo ""
echo "──── Vorschau ausführen ────"
if [ -x "$JSC" ]; then
  ARBEIT=$(mktemp -d)
  # `app.js` ist oben schon frisch aus der Vorschau gezogen worden — vor dem
  # Gleichlauf, damit beide Pruefungen denselben Stand sehen.
  # Kein `mktemp` mit Endung: Auf macOS muessen die X am Ende der Vorlage
  # stehen, sonst scheitert es — und der Lauf brach ab, ohne dass eine
  # Pruefung etwas gefunden haette.
  QUELLE="${ARBEIT}/quelle.js"
  cp app.js "$QUELLE"
  # `helfer.js` baut zu jeder Aufgabe die richtige und eine falsche Antwort —
  # in allen vierzehn Formaten. Ohne ihn muesste jede Runde die Formate
  # einzeln kennen, und beim naechsten neuen Format vergisst man eine.
  # Der Startwert des Zufalls. Mit SS_SEED=7 laeuft dieselbe Pruefung ueber
  # andere Ziehungen — und ein roter Lauf bleibt trotzdem wiederholbar.
  SEED="${SS_SEED:-1}"
  echo "  Startwert des Zufalls: $SEED"
  for R in pruefe.js pruefe2.js pruefe3.js pruefe4.js pruefe5.js pruefe6.js pruefe7.js pruefe8.js; do
    printf 'var SS_SEED = %s;\n' "$SEED" > "$ARBEIT/lauf.js"
    cat zufall.js "$QUELLE" helfer.js "$R" >> "$ARBEIT/lauf.js"
    AUS=$("$JSC" "$ARBEIT/lauf.js" 2>&1 | grep -v '^undefined$')
    echo "$AUS" | tail -3
    # «KEINE FEHLER» darf nicht als Fehler gelten — ein Pruefer, der
    # falschen Alarm schlaegt, ist schlimmer als keiner.
    if echo "$AUS" | grep -qE '^(FEHLER:|Exception|[0-9]+ FEHLER)'; then FEHLER=1; fi
  done
  rm -rf "$ARBEIT"
else
  echo "  übersprungen: JavaScriptCore nicht gefunden"
fi

echo ""
if [ $FEHLER -eq 0 ]; then echo "════ Alles grün ════"; else echo "════ FEHLER — siehe oben ════"; fi
exit $FEHLER
