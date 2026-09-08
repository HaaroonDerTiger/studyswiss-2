#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Führt den Lernbereich der Website wirklich aus.

`website.py` liest die gebauten Seiten gegen: tote Verknüpfungen,
Platzhalter, Preise im Quelltext, die Sie-Form dort, wo die App duzt.
Was sie nicht kann, ist den Code **ausführen**. Und genau dort liegen
die Fehler, die auf einer Website still bleiben: ein Knopf, der an
nichts hängt, sieht im Quelltext aus wie einer, der funktioniert.
«Abbrechen» stand so monatelang da.

Dieses Skript setzt die Skripte der Einzeldatei in derselben
Reihenfolge zusammen wie `website_bauen.py`, legt das kleine DOM aus
`dom.js` darunter und lässt `pruefe_web.js` echte Wege durchklicken —
Übung, Selbsttest, Standortbestimmung, Aufsatz, Tipps.

    app/pruefung/web_pruefen.py
    SS_SEED=9 app/pruefung/web_pruefen.py
"""
from __future__ import annotations
import io, json, os, re, subprocess, sys, tempfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
WEB = HIER.parent / 'website'
JSC = ('/System/Library/Frameworks/JavaScriptCore.framework/'
       'Versions/A/Helpers/jsc')


def lies(p: Path) -> str:
    return io.open(p, encoding='utf-8').read()


def markup_der_seite(name: str) -> str:
    """Das Gerippe einer gebauten Seite — genau das, was im Browser steht.

       Aus der GEBAUTEN Datei, nicht aus der Quelle: Die Quelle trägt
       noch `{{icon:…}}`-Platzhalter, und ein Prüfer, der etwas anderes
       sieht als der Browser, prüft das Falsche."""
    html = lies(WEB / f'{name}.html')
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.S)
    if not m:
        raise SystemExit(f'{name}.html hat kein <main> — Aufbau geändert?')
    return m.group(1)


def js_reihenfolge() -> list[str]:
    """Dieselbe Reihenfolge wie in der Einzeldatei.

       Sie wird aus `website_bauen.py` gelesen statt hier ein zweites Mal
       aufgeschrieben: Zwei Listen für dieselbe Sache laufen auseinander,
       und dann prüft dieses Skript eine Website, die es so nicht gibt."""
    quelle = lies(HIER / 'website_bauen.py')
    grund = re.search(r"GRUND_JS = \[(.*?)\]", quelle, re.S)
    if not grund:
        raise SystemExit('GRUND_JS in website_bauen.py nicht gefunden')
    namen = re.findall(r"'([\w-]+)'", grund.group(1))
    for block in re.findall(r"js=\[(.*?)\]", quelle, re.S):
        namen += re.findall(r"'([\w-]+)'", block)
    gesehen, aus = set(), []
    for n in namen:
        if n not in gesehen:
            gesehen.add(n)
            aus.append(n)
    return aus


def kotlin_felder(name: str) -> list[str]:
    """Die Feldnamen einer Kotlin-Datenklasse.

       Der Prüflauf vergleicht damit, was die Website sendet und liest,
       gegen das, was der Server wirklich hat. Genau dort lag der grösste
       Fehler dieses Repos: Die Website sprach die Formen der Engine
       (`paare`, `wertetabelle`, `indizes`), der Server die seinen
       (`ziele`, `tabelle`, `anzahlGesucht`). Die Vorschau lief tadellos,
       und im Betrieb wäre kein einziges dieser Formate bedienbar
       gewesen. Ein Vergleich gegen die Quelle fängt das."""
    quelle = lies(HIER.parent / 'backend/src/main/kotlin/ch/studyswiss/model/Dto.kt')
    m = re.search(r'@Serializable data class ' + name + r'\(', quelle)
    if not m:
        raise SystemExit(f'Datenklasse {name} nicht in Dto.kt gefunden')
    i = m.end() - 1
    tiefe = 0
    for j in range(i, len(quelle)):
        if quelle[j] == '(':
            tiefe += 1
        elif quelle[j] == ')':
            tiefe -= 1
            if tiefe == 0:
                break
    return re.findall(r'val (\w+)\s*:', quelle[i + 1:j])


def baue_lauf(seed: str) -> str:
    teile = [
        f'var SS_SEED = {seed};\n',
        lies(HIER / 'zufall.js'),
        lies(HIER / 'dom.js'),
        # Die Vorschau-Schicht statt eines Servers. `window.…` allein
        # genügt in JavaScriptCore nicht: Dort ist `window` ein
        # gewöhnliches Objekt und legt keine globale Variable an.
        'var STUDYSWISS_DEMO = true; window.STUDYSWISS_DEMO = true;\n',
        lies(WEB / 'js/inhalt.js'),
        lies(WEB / 'js/engine.js'),
    ]
    for n in js_reihenfolge():
        teile.append(lies(WEB / f'js/{n}.js'))

    # Die Demo-Daten erzeugt `website_bauen.py`. Sie hier nachzubauen
    # hiesse, zwei Wahrheiten zu pflegen — also wird die Funktion
    # importiert und aufgerufen.
    sys.path.insert(0, str(HIER))
    import website_bauen                                     # noqa: E402
    teile.append(website_bauen.demo_daten())

    # `helfer.js` baut zu jeder Aufgabe die richtige Antwort — in allen
    # vierzehn Formaten. Dieselbe Datei, die schon die App-Vorschau prüft:
    # Ein zweiter Antwortbauer wäre der erste, der ein Format vergisst.
    teile.append(lies(HIER / 'helfer.js'))
    teile.append('var SERVER_AUFGABE = '
                 + json.dumps(kotlin_felder('AufgabeDto')) + ';')
    teile.append('var SERVER_ANTWORT = '
                 + json.dumps(kotlin_felder('Antwort')) + ';')
    teile.append('var LERNEN_MARKUP = ' + js_zeichenkette(markup_der_seite('lernen')) + ';')
    teile.append(lies(HIER / 'pruefe_web.js'))
    return '\n'.join(teile)


def js_zeichenkette(text: str) -> str:
    return ('"' + text.replace('\\', '\\\\').replace('"', '\\"')
            .replace('\n', '\\n').replace('\r', '') + '"')


def main() -> int:
    if not os.path.exists(JSC):
        print('JavaScriptCore nicht gefunden — übersprungen.')
        return 0
    seed = os.environ.get('SS_SEED', '1')
    with tempfile.TemporaryDirectory() as ordner:
        pfad = Path(ordner) / 'lauf.js'
        io.open(pfad, 'w', encoding='utf-8').write(baue_lauf(seed))
        ergebnis = subprocess.run([JSC, str(pfad)], capture_output=True, text=True)
    aus = (ergebnis.stdout + ergebnis.stderr).strip()
    aus = '\n'.join(z for z in aus.split('\n') if z.strip() != 'undefined')
    print(aus)
    schlecht = re.search(r'^(FEHLER:|Exception|\d+ FEHLER)', aus, re.M)
    return 1 if (schlecht or ergebnis.returncode != 0) else 0


if __name__ == '__main__':
    raise SystemExit(main())
