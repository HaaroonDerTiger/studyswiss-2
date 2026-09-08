#!/usr/bin/env python3
"""Statische Kotlin-Pruefung ohne Compiler.

   Sucht die Fehler, die ohne Uebersetzer am ehesten ueberleben:
   benannte Argumente mit Tippfehler, fehlende Pflichtfelder, unbekannte
   Typen, nicht importierte Symbole.
"""
import re, glob, sys, os, json

# Der Ordner dieses Skripts ist der Anker — siehe dart_pruefen.py.
WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
B = os.path.join(WURZEL, "backend/src/main/kotlin") + os.sep
T = os.path.join(WURZEL, "backend/src/test/kotlin") + os.sep
dateien = sorted(glob.glob(B + "**/*.kt", recursive=True)) + sorted(glob.glob(T + "**/*.kt", recursive=True))
# Eigener Name, weil die Schleife bei Punkt 5 `dateien` ueberschreibt.
KOTLIN_DATEIEN = list(dateien)
fehler, hinweis = [], []

def nur_aussen(t):
    """Ersetzt alles in geschachtelten Klammern durch Platzhalter, damit nur
       die Argumente der obersten Ebene uebrig bleiben."""
    out, tiefe, i = [], 0, 0
    while i < len(t):
        c = t[i]
        if c == '"':
            i += 1
            while i < len(t) and t[i] != '"':
                if t[i] == '\\': i += 1
                i += 1
            if tiefe == 0: out.append('S')
            i += 1; continue
        if c in '([{': tiefe += 1; i += 1; continue
        if c in ')]}': tiefe -= 1; i += 1; continue
        if tiefe == 0: out.append(c)
        i += 1
    return ''.join(out)

def klammer(s, i, auf='(', zu=')'):
    tiefe = 0
    while i < len(s):
        if s[i] == auf: tiefe += 1
        elif s[i] == zu:
            tiefe -= 1
            if tiefe == 0: return i
        elif s[i] == '"':
            i += 1
            while i < len(s) and s[i] != '"':
                if s[i] == '\\': i += 1
                i += 1
        i += 1
    return -1

# ---------- 1) Alle Typen und ihre Konstruktoren sammeln ----------
typen, konstruktoren, objekte, enums = set(), {}, set(), {}
for p in dateien:
    s = open(p, encoding='utf-8').read()
    for m in re.finditer(r'^\s*(?:@\w+\s+)*(?:private |internal |public |open |abstract |sealed )*'
                         r'(data class|class|enum class|object|interface)\s+(\w+)', s, re.M):
        art, name = m.group(1), m.group(2)
        typen.add(name)
        if art == 'object': objekte.add(name)
        if art == 'enum class':
            ende = klammer(s, s.index('{', m.end()), '{', '}')
            enums[name] = set(re.findall(r'\b([A-Z][A-Z0-9_]+)\b', s[m.end():ende]))
        if art in ('data class', 'class'):
            k = s.find('(', m.end())
            g = s.find('{', m.end())
            if k > 0 and (g < 0 or k < g):
                ende = klammer(s, k)
                koerper = s[k+1:ende]
                params = {}
                for f in re.finditer(r'\bva[lr]\s+(\w+)\s*:\s*([^=,\n]+?)\s*(=\s*[^,\n]+)?\s*(?:,|$)',
                                     koerper, re.M):
                    params[f.group(1)] = f.group(3) is not None
                # Konstruktorparameter ohne val/var
                for f in re.finditer(r'(?:^|,)\s*(\w+)\s*:\s*([^=,\n]+?)\s*(=\s*[^,\n]+)?\s*(?=,|$)',
                                     koerper, re.M):
                    if f.group(1) not in params and not re.match(r'va[lr]', f.group(1)):
                        params[f.group(1)] = f.group(3) is not None
                if params: konstruktoren[name] = params
print(f"Typen: {len(typen)} · Konstruktoren mit Parametern: {len(konstruktoren)}")

# ---------- 2) Aufrufe mit benannten Argumenten pruefen ----------
geprueft = 0
for p in dateien:
    s = open(p, encoding='utf-8').read()
    kurz = os.path.basename(p)
    for name, params in konstruktoren.items():
        for m in re.finditer(r'(?<![\w.])' + name + r'\s*\(', s):
            # Deklarationen ueberspringen
            vorher = s[max(0, m.start()-40):m.start()]
            if re.search(r'(data class|^\s*class|enum class|object|interface)\s*$', vorher): continue
            ende = klammer(s, m.end()-1)
            if ende < 0: continue
            arg = nur_aussen(s[m.end():ende])
            geprueft += 1
            benannt = set(re.findall(r'(?:\A|,)\s*(\w+)\s*=(?!=)', arg))
            unbekannt = benannt - set(params)
            if unbekannt:
                zeile = s[:m.start()].count('\n') + 1
                fehler.append(f"{kurz}:{zeile} {name}(...) — unbekannte Argumente: "
                              f"{', '.join(sorted(unbekannt))}. Erlaubt: {', '.join(sorted(params))}")
            # Nur pruefen, wenn ALLE Argumente benannt sind
            teile = [x.strip() for x in arg.split(',') if x.strip()]
            alle_benannt = bool(teile) and all(re.match(r'\w+\s*=(?!=)', x) for x in teile)
            if alle_benannt:
                pflicht = {n for n, vg in params.items() if not vg}
                fehlt = pflicht - benannt
                if fehlt:
                    zeile = s[:m.start()].count('\n') + 1
                    fehler.append(f"{kurz}:{zeile} {name}(...) — Pflichtfelder fehlen: {', '.join(sorted(fehlt))}")

print(f"Konstruktoraufrufe geprueft: {geprueft}")

# ---------- 3) Enum-Werte ----------
for p in dateien:
    s = open(p, encoding='utf-8').read()
    kurz = os.path.basename(p)
    for e, werte in enums.items():
        for m in re.finditer(r'(?<![\w.])' + e + r'\.([A-Z][A-Z0-9_]*)\b', s):
            if m.group(1) not in werte and m.group(1) not in ('Companion',):
                zeile = s[:m.start()].count('\n') + 1
                fehler.append(f"{kurz}:{zeile} {e}.{m.group(1)} gibt es nicht. "
                              f"Vorhanden: {', '.join(sorted(werte))}")

# ---------- 4) Importe zeigen auf vorhandene Projekt-Typen ----------
for p in dateien:
    s = open(p, encoding='utf-8').read()
    kurz = os.path.basename(p)
    for m in re.finditer(r'^import ch\.studyswiss\.[\w.]*\.(\w+)$', s, re.M):
        n = m.group(1)
        if n[0].isupper() and n not in typen and n not in ('*',):
            fehler.append(f"{kurz}: import auf «{n}», das es nicht gibt")

# ---------- 5) Ressourcen, die der Katalog laedt ----------
kat = open(B + "ch/studyswiss/daten/Katalog.kt", encoding='utf-8').read()
res = os.path.join(WURZEL, "backend/src/main/resources")
for m in re.finditer(r'lies\("(/[^"]+)"\)', kat):
    if '$' in m.group(1): continue      # Kotlin-Zeichenkette mit Platzhalter
    if not os.path.exists(res + m.group(1)):
        fehler.append(f"Katalog laedt «{m.group(1)}» — die Datei gibt es nicht")
for m in re.finditer(r'"(/templates/[^"]+)"', kat):
    if '$' in m.group(1): continue
    if not os.path.exists(res + m.group(1)):
        fehler.append(f"Katalog laedt «{m.group(1)}» — die Datei gibt es nicht")

# Jede Vorlagendatei muss in GENAU EINEM Verzeichnis stehen. Steht sie in
# keinem, laedt das Backend sie nie und die Aufgaben verschwinden lautlos;
# steht sie in beiden, wird sie zweimal und mit dem falschen Typ gelesen.
import json as _json, glob as _glob
verzeichnisse = {'vorlagen.index.json': 'variablen',   # Zahlen-Templates
                 'bloecke.index.json':  'aufgaben'}    # Textblöcke
genannt_in = {}
for name, schluessel in verzeichnisse.items():
    idx = f"{res}/templates/{name}"
    if not os.path.exists(idx):
        fehler.append(f"{name} fehlt"); continue
    for f in _json.load(open(idx, encoding='utf-8'))['dateien']:
        pfad = f"{res}/templates/{f}"
        if not os.path.exists(pfad):
            fehler.append(f"{name} nennt «{f}» — die Datei gibt es nicht"); continue
        genannt_in.setdefault(f, []).append(name)
        # Und der Inhalt muss zum Verzeichnis passen.
        inhalt = _json.load(open(pfad, encoding='utf-8'))
        falsch = [x.get('templateId', '?') for x in inhalt if schluessel not in x]
        if falsch:
            fehler.append(f"«{f}» steht in {name}, aber {len(falsch)} Eintraege haben kein "
                          f"«{schluessel}» (etwa {falsch[0]})")

# Eine Kennung darf es nur einmal geben. `templateId:seed` IST die Aufgabe —
# gibt es zwei Templates mit derselben Kennung, zeigt der Server eine andere
# Aufgabe als die Vorschau, und ein Fehlerarchiv-Eintrag stellt die falsche
# Aufgabe wieder her.
_wo = {}
for pfad in sorted(_glob.glob(res + "/templates/*.json")):
    f = os.path.basename(pfad)
    if f.endswith('.index.json'): continue
    for t in _json.load(open(pfad, encoding='utf-8')):
        _wo.setdefault(t['templateId'], []).append(f)
for tid, dateien in sorted(_wo.items()):
    if len(dateien) > 1:
        fehler.append(f"die Kennung «{tid}» gibt es {len(dateien)}-mal "
                      f"({', '.join(dateien)}) — «templateId:seed» ist dann nicht mehr eindeutig")

for pfad in sorted(_glob.glob(res + "/templates/*.json")):
    f = os.path.basename(pfad)
    if f.endswith('.index.json'): continue
    wo = genannt_in.get(f, [])
    if not wo:
        fehler.append(f"«{f}» liegt da, steht aber in keinem Verzeichnis — "
                      f"die Aufgaben werden nie geladen")
    elif len(wo) > 1:
        fehler.append(f"«{f}» steht in {' und '.join(wo)} — sie wird zweimal gelesen")

# ---------- 6) Die DATEN verlangen nur Enum-Werte, die es gibt ----------
# Punkt 3 prueft den Kotlin-Code gegen sich selbst. Hier geht es um die andere
# Richtung: Eine Vorlage, die «dezimal4» sagt, obwohl das Enum bei drei
# aufhoert, wird von Vorschau und Toren anstandslos gerechnet — und die App
# wirft beim Deserialisieren. Genau so ein Fall lag jahrelang bereit.
#
# Zahlen-Templates und Bloecke tragen VERSCHIEDENE Format-Enums; wer beide
# gegen dasselbe haelt, meldet zwoelf Bloecke faelschlich als kaputt.
def _serialnamen(enum):
    """Die @SerialName-Werte eines Enums — das ist der Vertrag zu den Daten."""
    for p in KOTLIN_DATEIEN:
        q = open(p, encoding='utf-8').read()
        m = re.search(r'enum class ' + enum + r'\b[^{]*\{(.*?)\n\}', q, re.S)
        if m:
            return set(re.findall(r'@SerialName\("([^"]+)"\)', m.group(1)))
    return None

# je Verzeichnis: welches Format-Enum gilt, und ob es zahlformat gibt
_VERTRAG = {'vorlagen.index.json': ('Format', True),
            'bloecke.index.json':  ('TextFormat', False)}
for idxname, (enumname, mit_zahlformat) in _VERTRAG.items():
    idx = f"{res}/templates/{idxname}"
    if not os.path.exists(idx): continue
    formate = _serialnamen(enumname)
    zahlformate = _serialnamen('Zahlformat') if mit_zahlformat else None
    if formate is None:
        fehler.append(f"enum class {enumname} nicht gefunden — der "
                      f"Datenvertrag laesst sich nicht pruefen")
        continue
    for f in _json.load(open(idx, encoding='utf-8'))['dateien']:
        pfad = f"{res}/templates/{f}"
        if not os.path.exists(pfad): continue
        for t in _json.load(open(pfad, encoding='utf-8')):
            tid = t.get('templateId', '?')
            w = t.get('format')
            if w and w not in formate:
                fehler.append(f"{f}: «{tid}» verlangt {enumname} «{w}», das "
                              f"Kotlin-Enum kennt nur "
                              f"{', '.join(sorted(formate))}")
            if zahlformate is None: continue
            for z in [t.get('zahlformat')] + \
                     [x.get('zahlformat') for x in t.get('felder', [])]:
                if z and z not in zahlformate:
                    fehler.append(f"{f}: «{tid}» verlangt Zahlformat «{z}», "
                                  f"das Kotlin-Enum kennt nur "
                                  f"{', '.join(sorted(zahlformate))}")

print()
if fehler:
    print(f"{len(fehler)} FEHLER:")
    for f in fehler: print("  ✗ " + f)
else:
    print("✓ Keine Kotlin-Unstimmigkeiten gefunden.")
if hinweis:
    for h in hinweis: print("  · " + h)
sys.exit(1 if fehler else 0)
