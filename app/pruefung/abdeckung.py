#!/usr/bin/env python3
"""Was ist bespielt, was fehlt — nach Prüfungspunkten sortiert.

   Zählt beide Aufgabenarten: die parametrisierten Zahlen-Templates und die
   Blöcke im Textformat, in denen die Lösung ein Term oder eine Wortform ist.
"""
import json, glob, os, sys

RES = os.path.abspath(os.path.join(os.path.dirname(__file__), '..',
                                   'backend/src/main/resources'))

# Genau die Dateien, die auch das Backend laedt — sonst zaehlt die
# Abdeckung Aufgaben mit, die nie ausgeliefert werden.
def ausVerzeichnis(name):
    aus = []
    for datei in json.load(open(f'{RES}/templates/{name}', encoding='utf-8'))['dateien']:
        aus += json.load(open(f'{RES}/templates/{datei}', encoding='utf-8'))
    return aus

zahlen = ausVerzeichnis('vorlagen.index.json')
bloecke = ausVerzeichnis('bloecke.index.json')

def bespielt(fach):
    aus = set()
    for t in zahlen:
        if t.get('fach', 'mathematik') == fach: aus |= set(t['unterthemen'])
    for t in bloecke:
        if t.get('fach', 'sprachbetrachtung') == fach: aus |= set(t['unterthemen'])
    return aus

def aufgabenzahl(fach):
    n = sum(1 for t in zahlen if t.get('fach', 'mathematik') == fach)
    m = sum(len(t['aufgaben']) for t in bloecke if t.get('fach','sprachbetrachtung') == fach)
    return n, m

print("StudySwiss — Abdeckung des Prüfungsstoffs\n")
gesamt_pkt = gesamt_ab = 0
# Die Baeume kommen aus ihrem Verzeichnis, die Ueberschrift aus dem Baum
# selbst. Hier stand eine feste Liste mit drei Zuercher Baeumen und
# handgeschriebenen Titeln — ein neuer Kanton waere in der Abdeckung nie
# aufgetaucht, und die Zahl «100 von 122 Punkten» haette stillschweigend
# etwas anderes gemeint als das, was die App anbietet.
KATALOG = json.load(open(f'{RES}/katalog.json', encoding='utf-8'))
KANTON_JE_BEREICH = {}
for _p in KATALOG['pruefungen']:
    for _t in _p['teile']:
        for _b in _t.get('bereiche', []):
            KANTON_JE_BEREICH.setdefault(_b, set()).add(_p['kanton'])

BEREICHE = []
for datei in json.load(open(f'{RES}/themen/index.json', encoding='utf-8'))['dateien']:
    _baum = json.load(open(f'{RES}/themen/{datei}', encoding='utf-8'))
    _kantone = '/'.join(sorted(KANTON_JE_BEREICH.get(_baum['fach'], {'—'})))
    BEREICHE.append((datei, _baum['fach'],
                     f"{_baum['name'].upper()} — {_baum['pruefung']}  [{_kantone}]"))

for datei, fach, titel in BEREICHE:
    baum = json.load(open(f'{RES}/themen/{datei}', encoding='utf-8'))
    bes = bespielt(fach)
    tmpl, aufg = aufgabenzahl(fach)
    print(f"{titel}")
    print(f"{'':2}{'Pkt':>4}  {'Oberthema':<36} {'bespielt':>9}")
    abgedeckt = 0
    for o in sorted(baum['oberthemen'], key=lambda x: (-x['punkte'], x['nr'])):
        da = [u for u in o['unterthemen'] if u['code'] in bes]
        fehlt = [u for u in o['unterthemen'] if u['code'] not in bes]
        anteil = len(da) / len(o['unterthemen'])
        abgedeckt += o['punkte'] * anteil
        print(f"{'':2}{o['punkte']:>4}  {o['name'][:36]:<36} {len(da):>4}/{len(o['unterthemen']):<4} "
              f"{'█'*len(da)}{'░'*len(fehlt)}")
    alle = sum(len(o['unterthemen']) for o in baum['oberthemen'])
    tot = sum(o['punkte'] for o in baum['oberthemen'])
    gesamt_pkt += tot; gesamt_ab += abgedeckt
    print(f"{'':2}      {len(bes)}/{alle} Unterthemen ({len(bes)*100//alle} %) · "
          f"{tmpl} Templates, {aufg} Einzelaufgaben · "
          f"rund {abgedeckt:.0f} von {tot} Prüfungspunkten abgedeckt\n")

print(f"Zusammen: rund {gesamt_ab:.0f} von {gesamt_pkt} Prüfungspunkten "
      f"({gesamt_ab*100/gesamt_pkt:.0f} %)\n")

if '--offen' in sys.argv:
    print("Noch ohne Aufgaben, nach Wert sortiert:\n")
    zeilen = []
    for datei, fach, _ in BEREICHE:
        baum = json.load(open(f'{RES}/themen/{datei}', encoding='utf-8'))
        bes = bespielt(fach)
        for o in baum['oberthemen']:
            fehlt = [u for u in o['unterthemen'] if u['code'] not in bes]
            if not fehlt or o['punkte'] == 0: continue
            wert = o['punkte'] / len(o['unterthemen'])
            for u in fehlt:
                zeilen.append((wert, fach, u['code'], u['name'], o['name']))
    for wert, fach, code, name, ober in sorted(zeilen, reverse=True):
        print(f"  {wert:4.2f} Pkt  {fach[:6]:<7} {code}  {name[:44]:<44} ({ober[:22]})")
