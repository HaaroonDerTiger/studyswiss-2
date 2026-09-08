#!/usr/bin/env python3
"""Port der Kotlin-Engine nach Python, um die zwoelf Tore hier zu pruefen.
Muss sich bitgenau wie Rng.kt / Ausdruck.kt / Generator.kt verhalten."""
import json, re, math, sys

M32 = 0xFFFFFFFF
def rundeAuf(x):
    """Kaufmännisch runden: die Hälfte immer nach oben.

       Pythons eingebautes `round` rundet zur geraden Zahl — aus 42.5 wird
       42, aus 43.5 wird 44. JavaScript und Kotlin runden beide die Hälfte
       nach oben. Ohne diese Funktion prüften die Tore andere Zahlen, als
       die App dem Kind anzeigt, und niemand merkte es.
    """
    return math.floor(x + 0.5) if x >= 0 else -math.floor(-x + 0.5)

def i32(x):
    x &= M32
    return x - 0x100000000 if x & 0x80000000 else x
def imul(a, b): return i32((a & M32) * (b & M32) & M32)

class Rng:
    def __init__(self, seed):
        x = i32(seed + 0x9e3779b9)
        x = imul(x ^ ((x & M32) >> 16), 0x21f0aaad)
        x = imul(x ^ ((x & M32) >> 15), 0x735a2d97)
        self.s = i32(x ^ ((x & M32) >> 15))
    def next(self):
        self.s = i32(self.s + 0x6d2b79f5)
        t = self.s
        t = imul(t ^ ((t & M32) >> 15), t | 1)
        t = i32(t ^ (t + imul(t ^ ((t & M32) >> 7), t | 61)))
        return ((t ^ ((t & M32) >> 14)) & M32) / 4294967296.0
    def int(self, a, b): return a + int(self.next() * (b - a + 1))
    def pick(self, a): return a[self.int(0, len(a) - 1)]
    def shuffle(self, a):
        b = list(a)
        for i in range(len(b) - 1, 0, -1):
            j = self.int(0, i); b[i], b[j] = b[j], b[i]
        return b

# ---------- Ausdruck ----------
class Ungueltig(Exception): pass

def _ggt(a, b):
    a, b = abs(int(a)), abs(int(b))
    while b: a, b = b, a % b
    return a

FN = {
 'floor': lambda a: math.floor(a[0]), 'ceil': lambda a: math.ceil(a[0]),
 'round': lambda a: float(math.floor(a[0] + 0.5)), 'abs': lambda a: abs(a[0]),
 'min': lambda a: min(a), 'max': lambda a: max(a),
 'pow': lambda a: a[0] ** a[1], 'sqrt': lambda a: math.sqrt(a[0]),
 'ggt': lambda a: float(_ggt(a[0], a[1])),
 'istGanz': lambda a: 1.0 if abs(a[0] - round(a[0])) < 1e-9 else 0.0,
 'teilerImBereich': lambda a: float(sum(1 for k in range(math.ceil(a[1]), math.floor(a[2]) + 1) if k and int(a[0]) % k == 0)),
}
OPS = ['<=', '>=', '==', '!=', '&&', '||', '+', '-', '*', '/', '%', '<', '>', '?', ':', '!']

def tok(q):
    out, i = [], 0
    while i < len(q):
        c = q[i]
        if c.isspace(): i += 1; continue
        if c.isdigit() or (c == '.' and i + 1 < len(q) and q[i+1].isdigit()):
            j = i
            while i < len(q) and (q[i].isdigit() or q[i] == '.'): i += 1
            out.append(('num', float(q[j:i]))); continue
        if c.isalpha() or c == '_':
            j = i
            while i < len(q) and (q[i].isalnum() or q[i] == '_'): i += 1
            out.append(('name', q[j:i])); continue
        if c == '(': out.append(('(', None)); i += 1; continue
        if c == ')': out.append((')', None)); i += 1; continue
        if c == ',': out.append((',', None)); i += 1; continue
        op = next((o for o in OPS if q.startswith(o, i)), None)
        if op is None: raise Ungueltig("Unerlaubtes Zeichen %r in %r" % (c, q))
        out.append(('op', op)); i += len(op)
    return out

class P:
    def __init__(self, t, scope, q): self.t, self.scope, self.q, self.i = t, scope, q, 0
    def peek(self): return self.t[self.i] if self.i < len(self.t) else None
    def eat(self, *ops):
        p = self.peek()
        if p and p[0] == 'op' and p[1] in ops: self.i += 1; return p[1]
        return None
    def expect(self, kind):
        p = self.peek()
        if not p or p[0] != kind: raise Ungueltig("Erwartet %s in %r" % (kind, self.q))
        self.i += 1
    def cond(self):
        c = self.or_()
        if not self.eat('?'): return c
        a = self.cond()
        if not self.eat(':'): raise Ungueltig("':' fehlt in %r" % self.q)
        b = self.cond()
        return a if c != 0 else b
    def or_(self):
        l = self.and_()
        while self.eat('||'):
            # Die rechte Seite MUSS zuerst gelesen werden. Sie in den
            # `or`-Ausdruck zu schreiben hiesse, sie bei wahrer linker
            # Seite nie zu parsen — dann bliebe sie als Rest stehen und
            # die ganze Bedingung gaelte als ungueltig. Genau so verhaelt
            # sich auch Ausdruck.kt und die Vorschau.
            r = self.and_()
            l = 1.0 if (l != 0 or r != 0) else 0.0
        return l
    def and_(self):
        l = self.cmp_()
        while self.eat('&&'):
            r = self.cmp_(); l = 1.0 if (l != 0 and r != 0) else 0.0
        return l
    def cmp_(self):
        l = self.sum_()
        while True:
            op = self.eat('<', '>', '<=', '>=', '==', '!=')
            if not op: return l
            r = self.sum_()
            b = {'<': l < r - 1e-9, '>': l > r + 1e-9, '<=': l <= r + 1e-9,
                 '>=': l >= r - 1e-9, '==': abs(l - r) < 1e-9, '!=': abs(l - r) >= 1e-9}[op]
            l = 1.0 if b else 0.0
    def sum_(self):
        l = self.prod()
        while True:
            op = self.eat('+', '-')
            if not op: return l
            r = self.prod(); l = l + r if op == '+' else l - r
    def prod(self):
        l = self.un()
        while True:
            op = self.eat('*', '/', '%')
            if not op: return l
            r = self.un()
            if op in '/%' and abs(r) < 1e-12: raise Ungueltig("Division durch null in %r" % self.q)
            l = l * r if op == '*' else (l / r if op == '/' else float(math.fmod(int(l), int(r))))
    def un(self):
        if self.eat('-'): return -self.un()
        if self.eat('+'): return self.un()
        if self.eat('!'): return 1.0 if self.un() == 0 else 0.0
        return self.prim()
    def prim(self):
        p = self.peek()
        if p is None: raise Ungueltig("Ausdruck bricht ab: %r" % self.q)
        if p[0] == 'num': self.i += 1; return p[1]
        if p[0] == '(':
            self.i += 1; v = self.cond(); self.expect(')'); return v
        if p[0] == 'name':
            self.i += 1
            if self.peek() and self.peek()[0] == '(':
                fn = FN.get(p[1])
                if fn is None: raise Ungueltig("Unbekannte Funktion %r in %r" % (p[1], self.q))
                self.i += 1; args = []
                if self.peek() and self.peek()[0] != ')':
                    args.append(self.cond())
                    while self.peek() and self.peek()[0] == ',':
                        self.i += 1; args.append(self.cond())
                self.expect(')'); return fn(args)
            if p[1] not in self.scope: raise Ungueltig("Unbekannter Name %r in %r" % (p[1], self.q))
            return self.scope[p[1]]
        raise Ungueltig("Unerwartet %s in %r" % (p[0], self.q))

def ev(q, scope):
    p = P(tok(q), scope, q); r = p.cond()
    if p.i != len(p.t): raise Ungueltig("Rest nach dem Ausdruck: %r" % q)
    if not math.isfinite(r): raise Ungueltig("%r ergibt %r" % (q, r))
    return round(r * 1e6) / 1e6

def pruefe_namen(q, erlaubt):
    t = tok(q)
    for i, x in enumerate(t):
        if x[0] != 'name': continue
        aufruf = i + 1 < len(t) and t[i+1][0] == '('
        if aufruf:
            if x[1] not in FN: raise Ungueltig("Unbekannte Funktion %r in %r" % (x[1], q))
        elif x[1] not in erlaubt: raise Ungueltig("Unbekannter Name %r in %r" % (x[1], q))

# ---------- Generator ----------
# Die hochgestellten Ziffern. «2^5» ist eine Notloesung aus der Zeit der
# Schreibmaschine; im Aufgabentext, in der Antwort und in der Erklaerung
# steht die Hochzahl hochgestellt — sonst liest ein Kind «zwei Dach fuenf».
HOCHZIFFERN = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
               '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'}


TIEFZIFFERN = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
               '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '-': '₋'}


def hochgestellt(w):
    return ''.join(HOCHZIFFERN.get(c, c) for c in str(int(rundeAuf(w))))


def tiefgestellt(w):
    """Das Gegenstueck zu `hochgestellt`. Ohne den Nenner laesst sich ein
       Bruch mit gezogenen Zahlen nicht setzen: {z:hoch}⁄{n:tief} ergibt
       ⁵⁄₁₂, waehrend «{z}/{n}» dem Kind einen Schraegstrich zeigt."""
    return ''.join(TIEFZIFFERN.get(c, c) for c in str(int(rundeAuf(w))))


def alsBruch(z, n):
    """Ein Bruch wird als Bruch gesetzt: ⁵⁄₁₂, nicht 5/12.

       Getippt wird er weiterhin mit dem Schraegstrich — `alsZahl` nimmt
       beide Schreibweisen entgegen. Nur die ANZEIGE ist gesetzt."""
    return (''.join(HOCHZIFFERN.get(c, c) for c in str(z)) + '⁄'
            + ''.join(TIEFZIFFERN.get(c, c) for c in str(n)))


def formatiere(w, f):
    if f == 'hoch': return hochgestellt(w)
    if f == 'tief': return tiefgestellt(w)
    if f == 'franken':
        g = lambda n: "{:,}".format(int(abs(n))).replace(',', "'")
        if abs(w - rundeAuf(w)) < 1e-9: return "Fr. %s.–" % g(w)
        return "Fr. %s%s" % (g(w), ("%.2f" % (abs(w) % 1))[1:])
    m = re.match(r'dezimal(\d)$', f or '')
    if m:
        n = int(m.group(1)); p10 = 10 ** n
        g = rundeAuf(w * p10) / p10
        return str(int(rundeAuf(g))) if abs(g - rundeAuf(g)) < 1e-9 else str(g)
    if f == 'ganz': return str(int(rundeAuf(w)))
    if abs(w - rundeAuf(w)) < 1e-9: return str(int(rundeAuf(w)))
    # Die Toleranz waechst mit dem Nenner, und sie muss es: Jeder Ausdruck
    # wird auf sechs Stellen gerundet (siehe `ev`), ein Wert wie ⁷⁴⁄₆₃ kommt
    # also als 1.174603 an. Mal 63 fehlen dann 1.1e-5 auf die ganze Zahl —
    # mit der festen Schwelle 1e-7 fand die Schleife den Bruch nie und fiel
    # auf «1.1746» zurueck. Ein falscher Treffer ist ausgeschlossen: Ist n
    # nicht der richtige Nenner, liegt w*n mindestens 1/n von einer ganzen
    # Zahl entfernt, und das ist um Groessenordnungen mehr.
    for n in range(2, 1000):
        z = w * n
        if abs(z - round(z)) < 5e-7 * n:
            zz = int(rundeAuf(z)); t = _ggt(abs(zz), n)
            return alsBruch(zz // t, n // t)
    return "%.4f" % w

def schlicht(w):
    return (str(int(rundeAuf(w))) if abs(w - rundeAuf(w)) < 1e-9
            else str(rundeAuf(w * 1e4) / 1e4))

PH = re.compile(r'\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(\d+))?(?::(ganz|dezimal[1-4]|franken|bruch|hoch|tief|vorlage))?\}')
def ersetze(v, scope, texte, zf):
    def r(m):
        n, idx, fmt = m.group(1), int(m.group(2) or 0), m.group(3) or ''
        if n in texte:
            t = texte[n]; return t[idx] if idx < len(t) else t[0]
        if n not in scope: return m.group(0)
        w = scope[n]
        if fmt == '': return schlicht(w)
        return formatiere(w, zf if fmt == 'vorlage' else fmt)
    return PH.sub(r, v)

VERSUCHE = 400

# ---------- Ziehen: alle acht Zahlenformate --------------------------
# Muss sich Schritt für Schritt wie `zieheMathe` in der Vorschau und wie
# `Generator.kt` verhalten. Wenn hier etwas anders zieht als dort, prüfen
# die Tore etwas anderes, als der Schüler sieht — und sind wertlos.

class Fehlgeschlagen(Exception): pass

def zieheScope(spec, seed):
    """Zieht Variablen und Bedingungen. Gibt scope, Texte und eine zweite
       Rng für Mischungen zurück — dieselbe Aufteilung wie in der Vorschau."""
    variablen, bedingungen = spec.get('variablen', []), spec.get('bedingungen', [])
    for versuch in range(VERSUCHE):
        rng = Rng(imul(seed, 1000003) + versuch)
        s, t, ok = {}, {}, True
        for v in variablen:
            ty = v['typ']
            if ty == 'auswahl': s[v['name']] = float(rng.pick(v['werte']))
            elif ty == 'ganzzahl':
                von, bis, sch = v['von'], v['bis'], v.get('schritt', 1)
                s[v['name']] = float(von + rng.int(0, (bis - von) // sch) * sch)
            elif ty == 'formel':
                try: s[v['name']] = ev(v['ausdruck'], s)
                except Ungueltig: ok = False; break
            elif ty == 'text': t[v['name']] = rng.pick(v.get('texte') or v.get('werte'))
            elif ty == 'tabellenzeile':
                # Eine Zeile ziehen, jede Spalte als eigene Zahl ablegen —
                # so bleibt der Auswerter frei von Listen.
                zeile = rng.pick(v['zeilen'])
                for k, name in enumerate(v['spalten']): s[name] = float(zeile[k])
            else: raise SystemExit('Unbekannter Variablentyp ' + ty)
        if not ok: continue
        try: ok = all(ev(b, s) != 0 for b in bedingungen)
        except Ungueltig: ok = False
        if not ok: continue
        return s, t, Rng(imul(seed, 7919) + versuch)
    return None

def zieheFehler(liste, scope, richtig, E):
    """Fehlermuster, die zufällig die richtige Lösung ergeben, fallen weg —
       sie wären keine Distraktoren, sondern eine zweite richtige Antwort."""
    gesehen, out = set(), []
    for fm in liste or []:
        if 'ausdruck' not in fm: continue
        try: w = ev(fm['ausdruck'], scope)
        except Ungueltig: continue
        if richtig is not None and abs(w - richtig) < 1e-9: continue
        k = round(w * 1e6)
        if k in gesehen: continue
        gesehen.add(k)
        out.append({'wert': w, 'diagnoseId': fm['diagnoseId'],
                    'kurz': fm.get('kurz', ''), 'feedback': E(fm.get('feedback', ''))})
    return out

def ziehe(spec, seed):
    g = zieheScope(spec, seed)
    if g is None: raise Fehlgeschlagen(spec['templateId'])
    scope, texte, rng = g
    zf = spec.get('zahlformat', 'ganz')
    E = lambda x: ersetze(x, scope, texte, zf)
    fmt = spec['format']

    a = {'ref': f"{spec['templateId']}:{seed}", 'templateId': spec['templateId'],
         'format': fmt, 'stamm': E(spec['stamm']), 'scope': scope, 'texte': texte,
         'hinweise': [E(h) for h in spec.get('hinweise', [])],
         'loesungsweg': [E(x) for x in spec.get('loesungsweg', [])],
         'fehler': [], 'loesung': None, 'loesungText': ''}
    d = spec.get('darstellung')
    if d:
        a['darstellung'] = {'typ': d.get('typ'), 'kopf': [E(x) for x in d.get('kopf', [])],
                            'zeilen': [[E(x) for x in z] for z in d.get('zeilen', [])]}
    e = spec.get('erklaerung')
    if e:
        a['erklaerung'] = {'kern': E(e.get('kern', '')), 'falle': E(e.get('falle', '')),
                           'merksatz': E(e.get('merksatz', '')),
                           'schritte': [E(x) for x in e.get('schritte', [])]}

    if fmt == 'zahl_eingeben':
        l = ev(spec['loesung'], scope)
        a.update(loesung=l, loesungText=formatiere(l, zf),
                 fehler=zieheFehler(spec.get('fehler'), scope, l, E))

    elif fmt == 'mehrfeld':
        felder = []
        for f in spec['felder']:
            w = ev(f['ausdruck'], scope)
            fzf = f.get('zahlformat', zf)
            felder.append({'name': f['name'], 'label': E(f.get('label', f['name'])),
                           'einheit': f.get('einheit', ''), 'loesung': w,
                           'zahlformat': fzf, 'loesungText': formatiere(w, fzf),
                           'fehler': zieheFehler(f.get('fehler'), scope, w, E)})
        a.update(felder=felder,
                 loesungText=' · '.join(f"{f['label']}: {f['loesungText']}" for f in felder))

    elif fmt == 'gitter':
        G, z = spec['gitter'], lambda x: ev(x, scope)
        loes = [[[z(p[0]), z(p[1])] for p in v] for v in G['loesungen']]
        a.update(gitter={'xvon': z(G['xvon']), 'xbis': z(G['xbis']),
                         'yvon': z(G['yvon']), 'ybis': z(G['ybis']),
                         'toleranz': z(G.get('toleranz', '0')),
                         'punkte': [{'name': p['name']} for p in G.get('punkte', [])],
                         'loesungen': loes},
                 loesungText=', '.join(f'({schlicht(p[0])} | {schlicht(p[1])})' for p in loes[0]),
                 fehler=zieheFehler(spec.get('fehler'), scope, None, E))

    elif fmt == 'zuordnen':
        paare = [{'index': i, 'element': E(p['element']), 'ziel': E(p['ziel'])}
                 for i, p in enumerate(spec['zuordnen']['paare'])]
        a.update(paare=paare, mischung=rng.shuffle(list(range(len(paare)))),
                 loesungText=' · '.join(f"{p['ziel']} → {p['element']}" for p in paare),
                 fehler=zieheFehler(spec.get('fehler'), scope, None, E))

    elif fmt == 'sortieren':
        werte = [ev(w, scope) for w in spec['sortieren']['werte']]
        elemente = [{'index': i, 'text': E(x['text']), 'wert': werte[i]}
                    for i, x in enumerate(spec['sortieren']['elemente'])]
        reihenfolge = sorted(range(len(werte)), key=lambda i: werte[i])
        mischung = list(range(len(werte)))
        for _ in range(20):
            mischung = rng.shuffle(list(range(len(werte))))
            if mischung != reihenfolge: break
        a.update(elemente=elemente, reihenfolge=reihenfolge, mischung=mischung,
                 loesungText=' < '.join(elemente[i]['text'] for i in reihenfolge),
                 fehler=zieheFehler(spec.get('fehler'), scope, None, E))

    elif fmt == 'wertetabelle':
        W = spec['wertetabelle']
        sp = [{'name': s['name'], 'kopf': E(s['kopf']),
               'von': ev(s['von'], scope), 'bis': ev(s['bis'], scope)} for s in W['spalten']]
        paare = []
        for x in range(math.ceil(sp[0]['von']), math.floor(sp[0]['bis']) + 1):
            for y in range(math.ceil(sp[1]['von']), math.floor(sp[1]['bis']) + 1):
                s2 = dict(scope); s2[sp[0]['name']] = float(x); s2[sp[1]['name']] = float(y)
                try: ok = ev(W['bedingung'], s2) != 0
                except Ungueltig: ok = False
                if ok: paare.append([x, y])
        a.update(wertetabelle={'spalten': sp, 'paare': paare},
                 loesungText=', '.join(f'({p[0]} | {p[1]})' for p in paare),
                 fehler=zieheFehler(spec.get('fehler'), scope, None, E))

    elif fmt == 'faerben':
        R = spec['raster']; felder = []
        for z in R['zellen']:
            try: an = ev(z['bedingung'], scope) != 0
            except Ungueltig: an = False
            if an: felder.append(round(ev(z['index'], scope)))
        a.update(raster={'spalten': round(ev(R['spalten'], scope)),
                         'zeilen': round(ev(R['zeilen'], scope)), 'felder': sorted(felder)},
                 loesungText=f'{len(felder)} Felder',
                 fehler=zieheFehler(spec.get('fehler'), scope, None, E))

    elif fmt == 'loesungsmenge':
        lm = spec['loesungsmenge']
        von, bis = ev(lm['von'], scope), ev(lm['bis'], scope)
        menge = []
        for k in range(math.ceil(von), math.floor(bis) + 1):
            s2 = dict(scope); s2[lm['kandidatenVariable']] = float(k)
            try: ok = ev(lm['bedingung'], s2) != 0
            except Ungueltig: ok = False
            if ok: menge.append(k)
        a.update(loesungsmenge=menge, loesungText=', '.join(str(k) for k in menge),
                 fehler=zieheFehler(spec.get('fehler'), scope, None, E))

    else:
        raise SystemExit('Unbekanntes Format ' + fmt)
    return a
