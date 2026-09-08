#!/usr/bin/env python3
"""Spielt die Inhalte aus `backend/src/main/resources/` in die Vorschau ein.

   Nach jeder Aenderung an Templates, Themenbaum oder Katalog aufrufen —
   sonst zeigt die Vorschau einen alten Stand und man sucht Fehler, die es
   im Code gar nicht mehr gibt.
"""
import json, glob, re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import katalog as kat

WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RES = os.path.join(WURZEL, 'backend/src/main/resources')
VORSCHAU = os.path.join(WURZEL, 'preview/StudySwiss-Vorschau.html')

# Vorlagen, Bloecke und Baeume kommen aus ihren Verzeichnissen — dieselben,
# die auch Katalog.kt liest. Hier standen feste Namen; ein neuer Kanton haette
# seine Inhalte in der Vorschau nie zu sehen bekommen, und die Vorschau ist
# laut Abschnitt 9 die Referenz fuer das Verhalten.
mathe   = kat.vorlagen()
deutsch = kat.bloecke()
baeume  = kat.baeume()
BAEUME  = [(fach, b['_datei']) for fach, b in baeume.items()]
for b in baeume.values(): b.pop('_datei', None)
baum_m  = baeume['mathematik']
baum_d  = baeume['sprachbetrachtung']
# Der Katalog wird AUFGELOEST eingespielt, nicht roh. Die Vorschau soll
# dasselbe sehen wie die App: einen Schultyp mit Faechern, Bedingungen und
# Aufsatzarten, und Termine je Schultyp. Wer hier die Rohdatei einspielte,
# baute eine Vorschau, die etwas anderes zeigt als die App tut.
katalog = kat.aufgeloest()
tippsseiten = kat.tipps()
aufsatz = json.load(open(f'{RES}/aufsatz/themen.json', encoding='utf-8'))
arten   = json.load(open(f'{RES}/aufsatz/arten.json', encoding='utf-8'))

s = open(VORSCHAU, encoding='utf-8').read()

def ersetze(name, wert):
    """Tauscht eine `const NAME = …;`-Zeile gegen den neuen Inhalt."""
    global s
    muster = re.compile(r'^const ' + name + r' = .*?;$', re.M | re.S)
    neu = f'const {name} = ' + json.dumps(wert, ensure_ascii=False) + ';'
    if not muster.search(s):
        raise SystemExit(f'FEHLER: «const {name} = …» steht nicht in der Vorschau')
    s = muster.sub(lambda _: neu, s, count=1)

ersetze('STANDARD_KANTON', kat.standard_kanton())
ersetze('TEMPLATES', mathe)
ersetze('TEXTBLOECKE', deutsch)
ersetze('KATALOG', katalog)
ersetze('AUFSATZ', aufsatz)
ersetze('AUFSATZARTEN', arten)
ersetze('TIPPS', tippsseiten)

# THEMEN ist ein Objekt aus mehreren Baeumen und braucht eine eigene
# Ersetzung. Welche Baeume es gibt, sagt das Verzeichnis.
#
# Der Schluessel wird ANGEFUEHRT. Ohne Anfuehrungszeichen ging es nur so
# lange gut, wie kein Bereich einen Bindestrich im Namen trug: «mathematik-bern»
# ist als blosser Bezeichner ein Syntaxfehler, und die ganze Vorschau blieb
# schwarz.
muster = re.compile(r'^const THEMEN = \{.*?\n\};$', re.M | re.S)
zeilen = ',\n'.join('  ' + json.dumps(b, ensure_ascii=False) + ': '
                    + json.dumps(baeume[b], ensure_ascii=False) for b, _ in BAEUME)
neu = 'const THEMEN = {\n' + zeilen + '\n};'
if not muster.search(s): raise SystemExit('FEHLER: «const THEMEN = {…}» steht nicht in der Vorschau')
s = muster.sub(lambda _: neu, s, count=1)

# Mit `--pruefen` wird nichts geschrieben, sondern nur gemeldet, ob die
# Vorschau noch dem Stand der Ressourcen entspricht.
#
# Das ist noetig, weil `pruefen.sh` die Vorschau AUSFUEHRT. Wer Inhalte
# aendert und vergisst, sie einzuspielen, bekommt sonst «alles gruen» — fuer
# den alten Stand. Ein Pruefer, dem man nicht glauben kann, ist keiner.
if '--pruefen' in sys.argv:
    alt = open(VORSCHAU, encoding='utf-8').read()
    if alt == s:
        print('Die Vorschau ist auf dem Stand der Ressourcen.')
        raise SystemExit(0)
    print('FEHLER: Die Vorschau ist NICHT auf dem Stand der Ressourcen.')
    print('        Inhalte wurden geändert, aber nicht eingespielt.')
    print('        Abhilfe: app/pruefung/vorschau_bauen.py')
    raise SystemExit(1)

open(VORSCHAU, 'w', encoding='utf-8').write(s)

# Beide Aufgabenarten zaehlen: Zahlen-Templates und Textbloecke. Ein
# Algebra-Block steht in einer «mathematik-*.json» und traegt fach=mathematik.
# NUR die Zuercher Mathematik zaehlen. Vorher stand hier jede Vorlage,
# unabhaengig vom Fach — mit den St. Galler Codes meldete die Zeile darum
# «88/87 Unterthemen», eine Zahl, die es nicht geben kann.
bespielt_m = ({u for t in mathe if t.get('fach') == 'mathematik' for u in t['unterthemen']} |
              {u for t in deutsch if t.get('fach') == 'mathematik' for u in t['unterthemen']})
bespielt_d = {u for t in deutsch if t.get('fach', 'sprachbetrachtung') == 'sprachbetrachtung'
              for u in t['unterthemen']}
bespielt_t = {u for t in deutsch if t.get('fach') == 'textverstaendnis' for u in t['unterthemen']}
mathe_vorlagen = [t for t in mathe if t.get('fach') == 'mathematik']
mathe_bloecke = [t for t in deutsch if t.get('fach') == 'mathematik']
deutsch_bloecke = [t for t in deutsch if t.get('fach', 'sprachbetrachtung') == 'sprachbetrachtung']
text_bloecke = [t for t in deutsch if t.get('fach') == 'textverstaendnis']
alle_m = sum(len(o['unterthemen']) for o in baum_m['oberthemen'])
alle_d = sum(len(o['unterthemen']) for o in baum_d['oberthemen'])
alle_t = sum(len(o['unterthemen']) for o in baeume['textverstaendnis']['oberthemen'])
print(f"Vorschau neu gebaut: {len(s.encode())//1024} KB")
print(f"  Insgesamt   {len(mathe)} Zahlen-Vorlagen und {len(deutsch)} Blöcke über alle Kantone")
print(f"  Mathematik  {len(mathe_vorlagen):>2} Templates + {len(mathe_bloecke)} Algebra-Blöcke "
      f"· {len(bespielt_m)}/{alle_m} Unterthemen")
print(f"  Deutsch     {len(deutsch_bloecke):>2} Blöcke · {len(bespielt_d)}/{alle_d} Unterthemen "
      f"· {sum(len(t['aufgaben']) for t in deutsch_bloecke)} Aufgaben")
print(f"  Textverst.  {len(text_bloecke):>2} Blöcke · {len(bespielt_t)}/{alle_t} Unterthemen "
      f"· {sum(len(t['aufgaben']) for t in text_bloecke)} Aufgaben")
print(f"  Aufsatz     {len(aufsatz)} Themen · {len(arten)} Arten")
print(f"  Tipps       {len(tippsseiten)} Seiten für Hörverstehen und mündliche Prüfungen")
