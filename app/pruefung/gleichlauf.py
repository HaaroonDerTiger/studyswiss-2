#!/usr/bin/env python3
"""Halten die Engine-Fassungen gleichen Schritt?

   Die App gibt es dreimal: in Kotlin (Server), in JavaScript (Vorschau) und
   in Python (die Qualitätstore). Alle drei müssen aus `templateId:seed`
   dieselbe Aufgabe ziehen — sonst zeigt die Vorschau etwas anderes als der
   Server, und ein Tor prüft eine Aufgabe, die es so gar nicht gibt.

   Kotlin lässt sich hier ohne Compiler nicht ausführen. Geprüft wird darum
   Python gegen JavaScript; die Kotlin-Fassung ist Zeile für Zeile der
   JavaScript-Fassung nachgebildet, und `kotlin_pruefen.py` wacht darüber,
   dass sie dieselben Felder kennt.
"""
import json, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tore_engine import ziehe, Fehlgeschlagen, Ungueltig

HIER = os.path.dirname(os.path.abspath(__file__))
JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'
RES = os.path.abspath(os.path.join(HIER, '..', 'backend/src/main/resources/templates'))

def js_lauf():
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(open(f'{HIER}/app.js', encoding='utf-8').read())
        f.write(open(f'{HIER}/gleichlauf.js', encoding='utf-8').read())
        pfad = f.name
    roh = subprocess.run([JSC, pfad], capture_output=True, text=True).stdout
    os.unlink(pfad)
    zeile = [z for z in roh.splitlines() if z.startswith('[[')]
    if not zeile: raise SystemExit('JavaScript hat nichts geliefert:\n' + roh[:500])
    return json.loads(zeile[-1])

def py_lauf(specs):
    aus = []
    for spec in specs:
        for seed in range(1, 26):
            try:
                a = ziehe(spec, seed)
            except (Fehlgeschlagen, Ungueltig):
                aus.append([spec['templateId'], seed, None]); continue
            aus.append([spec['templateId'], seed, {
                'stamm': a['stamm'],
                'loesungText': a['loesungText'],
                'fehler': [[f['diagnoseId'], round(f['wert'] * 1e6)] for f in a['fehler']],
                'felder': [[f['name'], f['loesungText']] for f in a.get('felder', [])],
                'mischung': a.get('mischung'),
                'reihenfolge': a.get('reihenfolge'),
            }])
    return aus

if __name__ == '__main__':
    idx = json.load(open(f'{RES}/vorlagen.index.json', encoding='utf-8'))['dateien']
    specs = []
    for name in idx:
        specs += [t for t in json.load(open(f'{RES}/{name}', encoding='utf-8')) if t.get('variablen')]

    js = {(a, b): c for a, b, c in js_lauf()}
    py = {(a, b): c for a, b, c in py_lauf(specs)}

    fehlt = sorted(set(js) ^ set(py))
    abweichung = []
    for k in sorted(set(js) & set(py)):
        if js[k] != py[k]: abweichung.append(k)

    print(f'{len(js)} Ziehungen in JavaScript · {len(py)} in Python')
    if fehlt:
        print(f'{len(fehlt)} Ziehungen kennt nur eine Seite:')
        for k in fehlt[:5]: print('   ', k)
    if abweichung:
        print(f'{len(abweichung)} Ziehungen laufen auseinander:')
        for k in abweichung[:5]:
            print(f'   {k[0]} Seed {k[1]}')
            for feld in ('stamm', 'loesungText', 'fehler', 'felder', 'mischung', 'reihenfolge'):
                a, b = (js[k] or {}).get(feld), (py[k] or {}).get(feld)
                if a != b:
                    print(f'      {feld}: JS {str(a)[:90]}')
                    print(f'      {" " * len(feld)}  PY {str(b)[:90]}')
    if not fehlt and not abweichung:
        print('✓ JavaScript und Python ziehen Zeichen für Zeichen dasselbe.')
    sys.exit(1 if (fehlt or abweichung) else 0)
