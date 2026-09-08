#!/usr/bin/env python3
"""Prueft den Vertrag zwischen Backend und seinen Clients.

   Ohne Compiler ist die Feldbenennung der Fehler, der am ehesten durchrutscht:
   Wenn das Backend ein Feld anders nennt als die App es liest, zeigt der
   Screen still nichts an — keine Ausnahme, kein Hinweis, nur eine leere Karte.

   Es gibt ZWEI Clients, und beide zaehlen: die Flutter-App und die
   Website. Solange hier nur Flutter stand, galt jede Route, die allein
   die Website ruft, als «ohne Client» — und jede Route, die es gar nicht
   gibt, waere der Website durchgegangen.
"""
import re, glob, sys, os

# Der Ordner dieses Skripts ist der Anker — siehe dart_pruefen.py.
WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
B = os.path.join(WURZEL, "backend/src/main/kotlin/ch/studyswiss") + os.sep
F = os.path.join(WURZEL, "frontend/lib") + os.sep
fehler, hinweis = [], []

def klammerblock(s, start):
    """Von der oeffnenden Klammer bis zur passenden schliessenden."""
    tiefe, i = 0, start
    while i < len(s):
        if s[i] == '(': tiefe += 1
        elif s[i] == ')':
            tiefe -= 1
            if tiefe == 0: return s[start+1:i], i
        i += 1
    return '', start

def lies_dtos(pfade):
    """Alle data class mit ihren Feldern. Klammern werden gezaehlt, nicht geraten."""
    out = {}
    for p in pfade:
        s = open(p, encoding='utf-8').read()
        for m in re.finditer(r'data class (\w+)\s*\(', s):
            name = m.group(1)
            koerper, _ = klammerblock(s, m.end() - 1)
            felder = {}
            # Feld je Zeile: val name: Typ [= Vorgabe]
            for f in re.finditer(r'\bva[lr]\s+(\w+)\s*:\s*([^=,\n]+?)\s*(=\s*[^,\n]+)?\s*(?:,|$)',
                                 koerper, re.M):
                felder[f.group(1)] = (f.group(2).strip(), f.group(3) is not None)
            out[name] = felder
    return out

dtos = lies_dtos([B + "model/Dto.kt", B + "model/Domaene.kt"])
print(f"Kotlin-Datenklassen: {len(dtos)}")

def lies_dart():
    """Welche JSON-Felder liest jede Dart-Fabrik? Klassengrenzen ueber die
       Einrueckung von 'class' bis zur naechsten Zeile, die mit } beginnt."""
    out = {}
    for p in glob.glob(F + "daten/*.dart"):
        zeilen = open(p, encoding='utf-8').read().split('\n')
        i = 0
        while i < len(zeilen):
            m = re.match(r'class (\w+)', zeilen[i])
            if not m: i += 1; continue
            name, j = m.group(1), i + 1
            koerper = []
            while j < len(zeilen) and not zeilen[j].startswith('}'):
                koerper.append(zeilen[j]); j += 1
            txt = '\n'.join(koerper)
            if 'vonJson' in txt:
                out[name] = set(re.findall(r"j\['(\w+)'\]", txt))
            i = j + 1
    return out

dart = lies_dart()
print(f"Dart-Modelle mit vonJson: {len(dart)}")

paare = [
 ('ProfilDto','Profil'), ('Sitzung','Sitzung'), ('Kanton','Kanton'), ('Schultyp','Schultyp'),
 ('AufgabeDto','Aufgabe'), ('OptionDto','Option'), ('Rueckmeldung','Rueckmeldung'),
 ('Vorschlag','Vorschlag'), ('VorschlagsListe','VorschlagsListe'), ('Einfuehrung','Einfuehrung'),
 ('UebungDto','Uebung'), ('UebungErgebnis','UebungErgebnis'), ('Startpunkt','Startpunkt'),
 ('SelbsttestDto','Selbsttest'), ('SelbsttestErgebnis','SelbsttestErgebnis'),
 ('OberthemaErgebnis','OberthemaErgebnis'), ('FortschrittDto','Fortschritt'),
 ('FachZeile','FachZeile'), ('WocheDto','Woche'), ('ThemenZeile','ThemenZeile'),
 ('FehlerGruppe','FehlerGruppe'), ('FehlerEintrag','FehlerEintrag'),
 ('ElternReport','ElternReport'), ('Kennzahl','Kennzahl'), ('AufsatzThema','AufsatzThema'),
 ('AboStatus','AboStatus'), ('Produkt','Produkt'),
 ('LernpfadDto','Lernpfad'), ('LernpfadEtappe','LernpfadEtappe'),
 ('LernpfadWoche','LernpfadWoche'), ('LernpfadThema','LernpfadThema'),
 ('Themenbaum','Themenbaum'), ('Oberthema','Oberthema'), ('Unterthema','Unterthema'),
]
print(f"Zu pruefende Paare: {len(paare)}\n")

for k, d in paare:
    if k not in dtos: fehler.append(f"Kotlin-Datenklasse «{k}» fehlt"); continue
    if d not in dart:  fehler.append(f"Dart-Modell «{d}» fehlt"); continue
    kf, df = set(dtos[k]), dart[d]
    zuviel = df - kf
    if zuviel:
        fehler.append(f"{d}.vonJson liest «{', '.join(sorted(zuviel))}» — {k} sendet das nicht")
    pflicht = {n for n,(t,vg) in dtos[k].items() if not vg and not t.endswith('?')}
    fehlt = pflicht - df
    if fehlt:
        hinweis.append(f"{d} liest «{', '.join(sorted(fehlt))}» nicht, obwohl {k} es sendet")

# ---------- Routen mit echter Klammerzählung ----------
def routen_lesen(pfad):
    s = open(pfad, encoding='utf-8').read()
    out, stapel = set(), []
    i = 0
    while i < len(s):
        m = re.compile(r'\b(route|get|post|patch|delete|put)\("([^"]*)"\)').match(s, i)
        if m:
            art, pfadteil = m.group(1), m.group(2)
            if art == 'route':
                # bis zur passenden schliessenden geschweiften Klammer merken
                j = s.index('{', m.end())
                stapel.append((pfadteil, klammerende(s, j)))
            else:
                praefix = ''.join(p for p, ende in stapel if i < ende)
                out.add(praefix + pfadteil)
            i = m.end(); continue
        i += 1
    return out

def klammerende(s, start):
    tiefe, i = 0, start
    while i < len(s):
        if s[i] == '{': tiefe += 1
        elif s[i] == '}':
            tiefe -= 1
            if tiefe == 0: return i
        i += 1
    return len(s)

backend = routen_lesen(B + "route/Routen.kt")
quelle = open(F + "daten/repos.dart", encoding='utf-8').read() + open(F + "daten/kauf.dart", encoding='utf-8').read()
# `Map<String, dynamic>` enthält selbst ein `>` — deshalb nicht auf die
# Generics matchen, sondern ab dem Methodennamen zur ersten Zeichenkette.
client = set()
# `_api.dio` steht oft auf einer eigenen Zeile vor `.get<...>`.
for m in re.finditer(r'\.dio\s*\.\s*(?:get|post|patch|delete)', quelle):
    rest = quelle[m.end():m.end()+400]
    t = re.search(r"'([^']+)'", rest)
    if t: client.add(t.group(1))
# Pfade, die als Variable weitergereicht werden (etwa in `_sitzung(pfad, ...)`).
client |= set(re.findall(r"'(/[a-z][\w/{}$.]*)'", quelle))

# --- Die Website ist der zweite Client ------------------------------------
# Sie ruft `/v1` ueber `api(...)` und ueber das `Schule`-Objekt in
# `js/api.js`. Beide Formen stehen als Zeichenkette da, mit Backtick oder
# mit einfachem Anfuehrungszeichen.
W = os.path.join(WURZEL, "website", "js") + os.sep
webquelle = ""
if os.path.isdir(W):
    for datei in sorted(glob.glob(W + "*.js")):
        if datei.endswith("demo.js") or datei.endswith("demo-daten.js"):
            continue        # die Vorschau ANTWORTET auf Routen, sie ruft keine
        webquelle += open(datei, encoding='utf-8').read()
    # `${encodeURIComponent(nr)}` ist eine Einsetzung wie `$id` in Dart —
    # sie wird zur Platzhalterstelle, sonst gilt jede Route mit Parameter
    # als «nicht gerufen».
    def webpfad(roh):
        return re.sub(r'\$\{[^}]*\}', '{id}', roh)

    for m in re.finditer(r"""api\(\s*[`'"]([^`'"?]+)""", webquelle):
        p_ = webpfad(m.group(1))
        if p_.startswith('/'):
            client.add(p_)
    for m in re.finditer(r"""[`'"]((?:\$\{API_BASIS\})?/(?:schule|abo|auth|katalog|uebung|"""
                         r"""fortschritt|fehler|selbsttest|standort|profil|lernpfad|aufsatz|"""
                         r"""eltern)[^`'"?]*)""", webquelle):
        client.add(m.group(1))

# Der Client haengt /v1 schon in der baseUrl an.
def norm(p):
    """Ein Pfad, wie ihn beide Seiten meinen.

       Der Backend-Pfad heisst `/schule/rechnung/{nummer}`, der Dart-Client
       schreibt `$id`, die Website `${'{'}encodeURIComponent(nr){'}'}`. Alle drei
       meinen dieselbe Stelle. Frueher wurde nur die Dart-Form ersetzt —
       und `/schule/offerte/{nummer}` galt darum als «ohne Client», obwohl
       die Website sie ruft."""
    p = p.replace('${API_BASIS}', '')
    p = re.sub(r'\$\{[^}]*\}', '{id}', p)      # ${...} aus JavaScript
    p = re.sub(r'\$\w+', '{id}', p)             # $name aus Dart
    p = re.sub(r'\{[^}]*\}', '{id}', p)         # {nummer} aus Ktor
    p = re.sub(r'^/v1', '', p if p.startswith('/') else '/' + p)
    return p or '/'

b, c = {norm(x) for x in backend}, {norm(x) for x in client}
print(f"Backend-Routen: {len(b)} · von App und Website gerufen: {len(c)}")
ohne = sorted(x for x in c if x not in b)
if ohne: fehler.append("Client ruft Routen, die es nicht gibt: " + ", ".join(ohne))
unbenutzt = sorted(x for x in b if x not in c and x != '/gesundheit')
if unbenutzt: hinweis.append(f"{len(unbenutzt)} Backend-Routen ohne Client-Aufruf: " + ", ".join(unbenutzt))

print()
if fehler:
    print(f"{len(fehler)} FEHLER:")
    for f in fehler: print("  ✗ " + f)
else:
    print("✓ Keine Vertragsverletzung zwischen Backend und App.")
if hinweis:
    print(f"\n{len(hinweis)} Hinweise:")
    for h in hinweis: print("  · " + h)
sys.exit(1 if fehler else 0)
