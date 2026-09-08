#!/usr/bin/env python3
"""Statische Dart-Pruefung ohne Analyzer.

   Prueft, was ohne Werkzeug am ehesten durchrutscht: benannte Argumente mit
   Tippfehler, fehlende `required`-Felder, benutzte Klassen ohne Import.
"""
import re, glob, os, sys

# Der Ordner dieses Skripts ist der Anker. Vorher stand hier ein fest
# verdrahteter Pfad auf ein bestimmtes Verzeichnis — wer das Repo kopierte
# oder umbenannte, pruefte danach still die alte Kopie weiter.
WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
F = os.path.join(WURZEL, "frontend/lib") + os.sep
dateien = sorted(glob.glob(F + "**/*.dart", recursive=True))
fehler, hinweis = [], []

def nur_aussen(t):
    """Die Argumente eines Aufrufs, ohne verschachtelte Aufrufe.

       Kommentare fallen weg. Ohne das schlug der Prüfer falschen Alarm:
       Steht ein erklärender Kommentar zwischen zwei benannten Argumenten,
       fand das folgende Muster das nächste Argument nicht mehr — und der
       Prüfer meldete ein fehlendes `required`, das dastand."""
    out, tiefe, i = [], 0, 0
    while i < len(t):
        c = t[i]
        if t.startswith('//', i):
            j = t.find('\n', i)
            i = len(t) if j < 0 else j
            continue
        if t.startswith('/*', i):
            j = t.find('*/', i)
            i = len(t) if j < 0 else j + 2
            continue
        if c in '\'"':
            q = c; i += 1
            while i < len(t) and t[i] != q:
                if t[i] == '\\': i += 1
                i += 1
            if tiefe == 0: out.append('S')
            i += 1; continue
        if c in '([{': tiefe += 1; i += 1; continue
        if c in ')]}': tiefe -= 1; i += 1; continue
        if tiefe == 0: out.append(c)
        i += 1
    return ''.join(out)

def klammer(s, i):
    tiefe = 0
    while i < len(s):
        c = s[i]
        if c in '\'"':
            q = c; i += 1
            while i < len(s) and s[i] != q:
                if s[i] == '\\': i += 1
                i += 1
        elif c == '(': tiefe += 1
        elif c == ')':
            tiefe -= 1
            if tiefe == 0: return i
        i += 1
    return -1

# ---------- 1) Klassen und ihre Konstruktoren ----------
klassen, ktor, wo = {}, {}, {}
for p in dateien:
    s = open(p, encoding='utf-8').read()
    for m in re.finditer(r'^(?:abstract\s+final\s+|abstract\s+|final\s+|sealed\s+)?class\s+(\w+)', s, re.M):
        name = m.group(1)
        klassen[name] = p; wo[name] = p
        # const Name({...}) oder Name(this.a, this.b)
        for c in re.finditer(r'(?:const\s+)?' + name + r'\(', s):
            ende = klammer(s, c.end()-1)
            if ende < 0: continue
            arg = s[c.end():ende]
            # nur Deklarationen: danach folgt ; oder : super oder {
            danach = s[ende+1:ende+40].lstrip()
            if not (danach.startswith(';') or danach.startswith(':') or danach.startswith('{')):
                continue
            params = {}
            for f in re.finditer(r'(required\s+)?(?:this\.)?(\w+)\s*(?:=\s*[^,}]+)?\s*(?:,|\}|$)', arg):
                if f.group(2) in ('required',): continue
                params[f.group(2)] = bool(f.group(1))
            if params:
                schluessel = (p, name) if name.startswith('_') else name
                if schluessel not in ktor: ktor[schluessel] = params
    for m in re.finditer(r'^enum\s+(\w+)', s, re.M):
        klassen[m.group(1)] = p; wo[m.group(1)] = p
print(f"Dart-Klassen: {len(klassen)} · Konstruktoren erfasst: {len(ktor)}")

# ---------- 2) Benannte Argumente pruefen ----------
geprueft = 0
eigene = {n for n in ktor if isinstance(n, str) and wo.get(n, '').startswith(F)}
for p in dateien:
    s = open(p, encoding='utf-8').read()
    kurz = os.path.relpath(p, F)
    for schluessel, params in ktor.items():
        privat = isinstance(schluessel, tuple)
        if privat and schluessel[0] != p: continue   # gilt nur in seiner Datei
        name = schluessel[1] if privat else schluessel
        if not name.startswith(('Ss','_','Eule','Wortmarke','Papier','Aufgabe','Woerter','Kommas','Mehrfach','Antwort','Set','Tipp','Rueckmeldungs','Auswahl')):
            continue   # nur eigene Widgets, nicht Flutters
        for m in re.finditer(r'(?<![\w.])' + re.escape(name) + r'\s*\(', s):
            vorher = s[max(0, m.start()-30):m.start()]
            if re.search(r'class\s+$|enum\s+$', vorher): continue
            if re.search(r'(?:const\s+)?' + re.escape(name) + r'\($', vorher + name + '('):
                pass
            ende = klammer(s, m.end()-1)
            if ende < 0: continue
            danach = s[ende+1:ende+30].lstrip()
            if danach.startswith((';', ':', '{')): continue   # die Deklaration selbst
            arg = nur_aussen(s[m.end():ende])
            geprueft += 1
            benannt = set(re.findall(r'(?:\A|,)\s*(\w+)\s*:(?!:)', arg))
            unbekannt = benannt - set(params)
            if unbekannt:
                zeile = s[:m.start()].count('\n') + 1
                fehler.append(f"{kurz}:{zeile} {name}(...) — unbekannt: {', '.join(sorted(unbekannt))}. "
                              f"Erlaubt: {', '.join(sorted(params))}")
            pflicht = {n for n, r in params.items() if r}
            fehlt = pflicht - benannt
            if fehlt and benannt:
                zeile = s[:m.start()].count('\n') + 1
                fehler.append(f"{kurz}:{zeile} {name}(...) — required fehlt: {', '.join(sorted(fehlt))}")
print(f"Widget-Aufrufe geprueft: {geprueft}")

# ---------- 3) Benutzte Projektklassen ohne Import ----------
for p in dateien:
    s = open(p, encoding='utf-8').read()
    kurz = os.path.relpath(p, F)
    hier = {m.group(1) for m in re.finditer(r'^(?:abstract\s+final\s+|abstract\s+|final\s+|sealed\s+)?(?:class|enum)\s+(\w+)', s, re.M)}
    erreichbar = set(hier)
    for imp in re.findall(r"import\s+'([^']+)'", s):
        if imp.startswith(('package:', 'dart:')): continue
        z = os.path.normpath(os.path.join(os.path.dirname(p), imp))
        if os.path.exists(z):
            t = open(z, encoding='utf-8').read()
            erreichbar |= {m.group(1) for m in re.finditer(r'^(?:abstract\s+final\s+|abstract\s+|final\s+|sealed\s+)?(?:class|enum)\s+(\w+)', t, re.M)}
            # Re-Exporte
            for imp2 in re.findall(r"import\s+'([^']+)'", t):
                if imp2.startswith(('package:', 'dart:')): continue
                z2 = os.path.normpath(os.path.join(os.path.dirname(z), imp2))
                if os.path.exists(z2):
                    t2 = open(z2, encoding='utf-8').read()
                    erreichbar |= {m.group(1) for m in re.finditer(r'^(?:abstract\s+final\s+|abstract\s+|final\s+|sealed\s+)?(?:class|enum)\s+(\w+)', t2, re.M)}
    for n in sorted(eigene | set(klassen)):
        if n in erreichbar or n.startswith('_') or len(n) < 4: continue
        if not re.search(r'(?<![\w.\'"])' + re.escape(n) + r'\s*[(\.]', s): continue
        # Kommt der Name nur in Text vor?
        treffer = [m for m in re.finditer(r'(?<![\w.\'"])' + re.escape(n) + r'\s*[(\.]', s)]
        echte = [m for m in treffer if not re.search(r"//.*$", s[s.rfind('\n', 0, m.start()):m.start()])]
        if echte:
            fehler.append(f"{kurz}: benutzt «{n}», ohne es zu importieren")

# ---------- 4) Provider ----------
provider = {}
for p in dateien:
    s = open(p, encoding='utf-8').read()
    for m in re.finditer(r'^final\s+(\w+)\s*=\s*(?:\w+\.)*(?:Provider|FutureProvider|StateNotifierProvider|StreamProvider)', s, re.M):
        provider.setdefault(m.group(1), []).append(p)
doppelt = {k: v for k, v in provider.items() if len(v) > 1}
if doppelt:
    for k, v in doppelt.items():
        fehler.append(f"Provider «{k}» ist {len(v)}-mal definiert: " +
                      ", ".join(os.path.relpath(x, F) for x in v))
print(f"Provider: {len(provider)}")

# ---------- 5) Assets, die pubspec verspricht ----------
pub = open(F + "../pubspec.yaml", encoding='utf-8').read()
for m in re.finditer(r'^\s+-\s+(assets/\S+)\s*$', pub, re.M):
    pfad = F + "../" + m.group(1)
    if not os.path.exists(pfad.rstrip('/')):
        fehler.append(f"pubspec verspricht «{m.group(1)}» — es gibt den Pfad nicht")

# ---------- 6) Ungenutzte Importe (in Dart eine Warnung, aber Unrat) ----------
for p in dateien:
    s = open(p, encoding='utf-8').read()
    kurz = os.path.relpath(p, F)
    kopf_ende = 0
    for m in re.finditer(r"^import .*$", s, re.M): kopf_ende = m.end()
    rumpf = s[kopf_ende:]
    for m in re.finditer(r"^import\s+'([^']+)'(?:\s+show\s+([\w,\s]+))?;", s, re.M):
        ziel, zeige = m.group(1), m.group(2)
        if zeige:
            for n in [x.strip() for x in zeige.split(',')]:
                if n and not re.search(r'(?<![\w.])' + re.escape(n) + r'\b', rumpf):
                    hinweis.append(f"{kurz}: importiert «{n}», benutzt es aber nicht")
            continue
        if ziel.startswith('dart:'): continue
        z = os.path.normpath(os.path.join(os.path.dirname(p), ziel)) if not ziel.startswith('package:') else None
        if z and os.path.exists(z):
            t = open(z, encoding='utf-8').read()
            namen = {x.group(1) for x in re.finditer(
                r'^(?:abstract\s+final\s+|abstract\s+|final\s+|sealed\s+)?(?:class|enum|mixin)\s+(\w+)', t, re.M)}
            namen |= {x.group(1) for x in re.finditer(r'^(?:final|const)\s+(?:\w[\w<>,\s?]*\s+)?(\w+)\s*=', t, re.M)}
            namen |= {x.group(2) for x in re.finditer(r'^([\w<>,\s?]+?)\s+(\w+)\s*\(', t, re.M)}
            namen |= {x.group(1) for x in re.finditer(r'^(?:extension\s+)?(\w+)\s+on\s', t, re.M)}
            namen |= {x.group(1) for x in re.finditer(r'^abstract final class (\w+)', t, re.M)}
            if namen and not any(re.search(r'(?<![\w.])' + re.escape(n) + r'\b', rumpf) for n in namen):
                hinweis.append(f"{kurz}: importiert «{ziel}», benutzt daraus nichts")

# Ein Screen, der eine Aufgabe zeigt, muss die gemeinsame `Antwortflaeche`
# benutzen und darf die Eingabeflächen nicht selbst zusammensetzen.
#
# Der Grund ist eine Klasse von Fehlern, die genau einmal aufgetreten ist:
# Übung, Selbsttest und Standortbestimmung hatten je eine eigene Verteilung
# auf die Eingabeflächen. Als acht neue Aufgabenarten dazukamen, wurde nur
# die Übung nachgeführt — im Selbsttest sass man dann vor einem Textfeld,
# wo ein Koordinatengitter hingehört, und niemand merkte es.
import glob as _g2, os as _o2
FLAECHEN = ('AuswahlListe(', 'MehrfachListe(', 'WoerterAntippen(', 'KommasSetzen(',
            'MehrfeldEingabe(', 'ZeilenAuswahl(', 'GitterFlaeche(', 'ZuordnenFlaeche(',
            'SortierFlaeche(', 'WerteTabelle(', 'RasterFaerben(', 'AntwortFeld(')
ERLAUBT = {'antwortflaeche.dart'}
for pfad in sorted(_g2.glob(F + 'funktionen/**/*.dart', recursive=True)):
    name = _o2.path.basename(pfad)
    if name in ERLAUBT: continue
    quelle = open(pfad, encoding='utf-8').read()
    gefunden = sorted({f for f in FLAECHEN if f in quelle})
    if gefunden:
        fehler.append(f"{name} baut Eingabeflächen selbst ({', '.join(gefunden)}) — "
                      f"das gehört in Antwortflaeche, sonst wird ein neues Format "
                      f"hier vergessen")

print()
if hinweis:
    print(f"{len(hinweis)} Hinweise:")
    for h in sorted(set(hinweis)): print("  · " + h)
if fehler:
    print(f"{len(fehler)} FEHLER:")
    for f in fehler: print("  ✗ " + f)
else:
    print("✓ Keine Dart-Unstimmigkeiten gefunden.")
sys.exit(1 if fehler else 0)
