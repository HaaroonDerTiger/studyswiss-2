#!/usr/bin/env python3
"""Die Qualitätstore für alle Zahlen-Templates.

   Es gibt zwei Herkünfte mit unterschiedlichen Garantien, beide geprüft:

   · `review`/`live` — von Hand geschrieben. Volle Strenge: Gegenprobe,
     mindestens drei Fehlermuster, benanntes Feedback je Distraktor.
   · `importiert`   — aus dem ZAP-Trainer übernommen. Statt einer Gegenprobe
     gilt dort: ausführliche Erklärung mit Kern und Falle, und mindestens
     zwei benannte Fehlermuster je Antwortfeld.

   Beide Standards sind hier festgeschrieben. NUR ERWEITERN, NIE LOCKERN.
"""
import json, re, glob, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tore_engine import (ziehe, ev, Ungueltig, Fehlgeschlagen, pruefe_namen,
                         schlicht, formatiere)

RES = os.path.abspath(os.path.join(os.path.dirname(__file__), '..',
                                   'backend/src/main/resources'))
SEEDS = 200
MIN_VARIANTEN = 60   # so viele verschiedene Aufgaben muss ein Template hergeben
ZAHL = re.compile(r'-?\d+(?:[.,]\d+)?')
# Woerter, die in keinem Text vorkommen duerfen — als Muster, nicht als
# Teilzeichenkette. «Euro» als Waehrung ist verboten, «Europa» und
# «europaeisch» sind es nicht: Ein Pruefer, der einen Text ueber Nachtzuege
# durch Europa ablehnt, schlaegt falschen Alarm, und ein Pruefer mit falschem
# Alarm ist schlimmer als keiner. Fuer «Fahrrad» gilt das nicht — «Fahrraeder»
# und «Fahrradweg» sind ebenso gemeint und bleiben als Teilwort erfasst.
VERBOTEN = [
    (re.compile('ß'), 'ß', '«ss» statt «ß»'),
    (re.compile(r'\bEuros?\b'), 'Euro', 'Franken'),
    (re.compile('€'), '€', 'Franken'),
    # «Fahrraeder» traegt einen Umlaut und rutschte durch, solange hier
    # bloss «Fahrrad» stand.
    (re.compile('Fahrr[aä]d'), 'Fahrrad', 'Velo'),
    (re.compile('Bahnsteig'), 'Bahnsteig', 'Perron'),
    # «2^5» ist eine Notloesung aus der Zeit der Schreibmaschine. Ein Kind
    # liest dort «zwei Dach fuenf» und muss erst uebersetzen. Im Aufgabentext,
    # in der Antwort und in der Erklaerung steht die Hochzahl hochgestellt:
    # 2⁵ bei fester Hochzahl, {n:hoch} wenn sie aus einer Variablen kommt.
    (re.compile(r'\^'), '^', 'die Hochzahl hochgestellt setzen: 2⁵ statt 2^5, '
                             'oder {n:hoch} bei einer Variablen'),
    # «4/6» ist der Schraegstrich einer Tastatur, kein Bruch. Angezeigt wird
    # ⁴⁄₆; getippt werden darf weiterhin 4/6, denn `alsZahl` versteht beide.
    # Der Punkt und das Komma sperren nur, wenn eine Ziffer daran haengt —
    # «1.5/2» ist keine Bruchzahl, «2/3.» am Satzende sehr wohl.
    (re.compile(r'(?<![\d/⁄])(?<![\d][.,])\d{1,3}/\d{1,3}(?![\d/⁄])(?![.,]\d)'),
     '4/6', 'den Bruch setzen: ⁴⁄₆ statt 4/6'),
]

# Umschriften wie «Loesung» oder «Praesens». Sie entstehen, wenn jemand ohne
# Umlaut-Tastatur schreibt — und sie stehen dann so im Aufgabentext, den ein
# Kind liest. Die Liste nennt nur Wortteile, die im Deutschen nie ein echtes
# Vokalpaar sind; «Dauer», «quer» und «Koeffizient» fallen nicht darunter.
UMSCHRIFT = re.compile(
    r'\b(?:'
    r'[A-Za-zÄÖÜäöüß]*(?:loes|Loes|hoeh|Hoeh|groess|Groess|koenn|Koenn|moegl|Moegl|'
    r'woert|Woert|oeffn|Oeffn|schoen|Schoen|hoer|Hoer|stoer|Stoer|'
    r'muess|Muess|fuer|Fuer|ueber|Ueber|zurueck|Zurueck|pruef|Pruef|uebung|Uebung|'
    r'schuel|Schuel|duerf|Duerf|fuehr|Fuehr|kuerz|Kuerz|stueck|Stueck|glueck|Glueck|'
    r'waer|Waer|haett|Haett|laeng|Laeng|flaech|Flaech|naechst|Naechst|spaet|Spaet|'
    r'zaehl|Zaehl|aend|Aend|erklaer|Erklaer|saetz|Saetz|taegl|Taegl|praes|Praes|'
    r'praet|Praet|praep|Praep|aequi|Aequi|qualitaet|Qualitaet'
    # «einheitli» stand hier und war ein Fehlalarm: «einheitlich» traegt gar
    # kein Vokalpaar, das ein Umlaut sein koennte. Das Muster hatte nie
    # angeschlagen, weil das Wort in keiner Vorlage vorkam — beim ersten
    # Textverstaendnis-Block, der «einheitliche Uhr» schrieb, meldete es
    # einen Fehler, den es nicht gibt. Ein Pruefer mit falschem Alarm ist
    # schlimmer als keiner (§8), darum ist der Eintrag weg.
    r')[A-Za-zÄÖÜäöüß]*)\b')

def zahlen(t): return [float(x.replace(',', '.')) for x in ZAHL.findall(t or '')]
def normiert(a): return ''.join(sorted((a or '').replace(' ', '')))

def waehrungsaufgabe(wort, text):
    """Darf «Euro» hier stehen?

    Nur in einer Umrechnungsaufgabe: Sie nennt einen Wechselkurs UND einen
    Frankenbetrag. Eine Aufgabe, die bloss Preise in Euro auszeichnet, hat
    beides nicht — und bleibt verboten.
    """
    if wort not in ('Euro', '€'):
        return False
    return bool(re.search(r'\bKurs\b', text)) and 'Fr.' in text


# Arbeitsanweisungen in der Sie-Form. §2.1 sagt: Jugendliche werden geduzt,
# immer — «Tippe in die Luecken», nicht «Tippen Sie in die Luecken». T3 nannte
# die Du-Form von Anfang an, pruefte sie aber nie, und so standen 63 solche
# Anweisungen im Bestand, ohne dass je ein Tor angeschlagen haette.
# Was NICHT gemeint ist: die woertliche Rede. In einem Lesetext siezt eine
# fremde Frau einen Jugendlichen voellig zu Recht («Rufen Sie an», sagte sie),
# und ein Tor, das dort anschlaegt, ist ein Tor mit falschem Alarm. Darum
# werden Passagen in Anfuehrungszeichen vorher herausgeschnitten.
SIE_ANREDE = re.compile(
    r'\b(?:Tippen|Setzen|Bestimmen|Ergaenzen|Ergänzen|Waehlen|Wählen|Formen|'
    r'Korrigieren|Schreiben|Berechnen|Loesen|Lösen|Ersetzen|Ordnen|Markieren|'
    r'Streichen|Notieren|Nennen|Erklaeren|Erklären|Begruenden|Begründen|'
    r'Vergleichen|Zeichnen|Pruefen|Prüfen|Lesen|Achten|Beantworten|Verbinden|'
    r'Kreuzen|Uebertragen|Übertragen|Rechnen|Bilden|Suchen|Zaehlen|Zählen)\s+Sie\b')

def ohne_rede(text):
    """Der Text ohne alles, was in Anfuehrungszeichen steht."""
    return re.sub(r'«[^»]*»|"[^"]*"|\u201e[^\u201c]*\u201c', ' ', text)

def alle_texte(spec):
    aus = [spec.get('stamm','')] + spec.get('hinweise', []) + spec.get('loesungsweg', [])
    e = spec.get('erklaerung') or {}
    aus += [e.get('kern',''), e.get('falle',''), e.get('merksatz','')] + e.get('schritte', [])
    for f in spec.get('felder', []):
        aus.append(f.get('label',''))
        aus += [x.get('feedback','') for x in f.get('fehler', [])]
    aus += [x.get('feedback','') for x in spec.get('fehler', [])]
    return [x for x in aus if x]

def loesungSchluessel(a):
    """Die Lösung einer Aufgabe, so genau, dass zwei verschiedene Lösungen
       auch verschieden aussehen. Nur für die Tore, nie für die Anzeige."""
    for feld in ('loesungsmenge',):
        if a.get(feld) is not None: return repr(a[feld])
    if a.get('raster'): return repr(a['raster']['felder'])
    if a.get('gitter'): return repr(a['gitter']['loesungen'])
    if a.get('wertetabelle'): return repr(a['wertetabelle']['paare'])
    if a.get('reihenfolge'): return repr(a['reihenfolge'])
    if a.get('paare'): return repr([(p['ziel'], p['element']) for p in a['paare']])
    return a.get('loesungText', '')

def sichtbar(a):
    """Alles, was der Schüler von einer Ziehung zu sehen bekommt.

       T11 fragt, ob zwei Ziehungen verschiedene Aufgaben sind. Bei
       `zahl_eingeben` steht das ganz im Stamm. Bei Zuordnen, Sortieren,
       Gitter, Färben und Mehrfeld ist der Stamm eine feste Anweisung
       («Ordne zu») — dort unterscheiden sich die Aufgaben in den Elementen.
       Nur den Stamm zu zählen hiesse, dort das Falsche zu messen."""
    t = [a['stamm']]
    for f in a.get('felder', []): t += [f['label'], f['loesungText']]
    for p in a.get('paare', []): t += [p['element'], p['ziel']]
    for e in a.get('elemente', []): t.append(e['text'])
    g = a.get('gitter')
    if g: t.append(repr(g['loesungen']))
    w = a.get('wertetabelle')
    if w: t.append(repr(w['paare']))
    r = a.get('raster')
    if r: t.append(repr(r['felder']))
    if a.get('loesungsmenge') is not None: t.append(repr(a['loesungsmenge']))
    # Ein Bauplan über der Aufgabe gehört dazu: zwei Ziehungen mit gleicher
    # Antwort, aber verschiedenem Plan sind verschiedene Aufgaben.
    d = a.get('darstellung')
    if d: t.append(repr(d['zeilen']))
    return ' | '.join(t)

def pruefe(spec, bekannt):
    b, importiert = [], spec.get('status') == 'importiert'
    F = lambda tor, t: b.append(('FEHLER', tor, t))
    W = lambda tor, t: b.append(('warnung', tor, t))
    fmt = spec['format']

    # ---- T1 Struktur -------------------------------------------------
    if not spec.get('stamm'): F('T1', 'stamm fehlt')
    if not spec.get('variablen'): F('T1', 'keine Variablen — dann ist es kein Template')
    if not spec.get('unterthemen'): F('T1', 'unterthemen fehlt')
    for u in spec.get('unterthemen', []):
        if u not in bekannt: F('T1', f'Unterthema {u} steht nicht im Themenbaum')
    if spec.get('status') not in ('entwurf','review','live','importiert'):
        F('T1', f"status «{spec.get('status')}» ist unbekannt")
    h = spec.get('herkunft') or {}
    if h.get('beziehung') == 'abgeleitet' and not h.get('quelle'): F('T1', 'herkunft ohne quelle')
    if not spec.get('hinweise'): F('T1', 'keine Hinweise')
    if not spec.get('loesungsweg'): F('T1', 'kein Lösungsweg')

    # Namen aller Ausdrücke gegen die Variablen pruefen
    namen = set()
    for v in spec['variablen']:
        namen.add(v['name'])
        namen |= set(v.get('spalten', []))
    # Wertetabelle und Gitter führen eigene Namen ein: die Spaltennamen
    # sind innerhalb der Tabellenbedingung gebunden, nicht im Scope.
    namen |= {sp['name'] for sp in (spec.get('wertetabelle') or {}).get('spalten', [])}
    def check(a, wo):
        if not isinstance(a, str) or not a.strip(): return
        try: pruefe_namen(a, namen)
        except Ungueltig as e: F('T1', f'{wo}: {e}')
    for v in spec['variablen']:
        if v.get('ausdruck'): check(v['ausdruck'], 'Variable ' + v['name'])
    for x in spec.get('bedingungen', []): check(x, 'Bedingung')
    check(spec.get('loesung'), 'loesung')
    check(spec.get('gegenprobe'), 'gegenprobe')
    for f in spec.get('felder', []):
        check(f.get('ausdruck'), 'Feld ' + f.get('name',''))
        for x in f.get('fehler', []): check(x.get('ausdruck'), 'Fehlermuster')
    for x in spec.get('fehler', []): check(x.get('ausdruck'), 'Fehlermuster')
    G = spec.get('gitter') or {}
    for k in ('xvon','xbis','yvon','ybis','toleranz'): check(G.get(k), 'gitter.' + k)
    for v in G.get('loesungen', []):
        for p in v: check(p[0], 'gitter.loesung.x'); check(p[1], 'gitter.loesung.y')
    for x in (spec.get('sortieren') or {}).get('werte', []): check(x, 'sortieren.wert')
    # NICHT `W` nennen: So hiess hier eine lokale Variable, und sie
    # ueberschrieb die Warn-Funktion `W` von weiter oben. Jede Warnung nach
    # dieser Zeile brachte damit den ganzen Pruefer zum Absturz — und ein
    # abgestuerzter Pruefer prueft gar nichts. Aufgefallen ist es erst beim
    # ersten Mehrfeld-Template mit einer sehr grossen Feldloesung.
    WT = spec.get('wertetabelle') or {}
    check(WT.get('bedingung'), 'wertetabelle.bedingung')
    for sp in WT.get('spalten', []):
        check(sp.get('von'), 'wertetabelle.von'); check(sp.get('bis'), 'wertetabelle.bis')
    R = spec.get('raster') or {}
    check(R.get('spalten'), 'raster.spalten'); check(R.get('zeilen'), 'raster.zeilen')
    for z in R.get('zellen', []):
        check(z.get('index'), 'raster.index'); check(z.get('bedingung'), 'raster.bedingung')
    LM = spec.get('loesungsmenge') or {}
    if isinstance(LM, dict):
        check(LM.get('von'), 'loesungsmenge.von'); check(LM.get('bis'), 'loesungsmenge.bis')
        # Die Kandidatenvariable ist innerhalb der Bedingung erlaubt.
        if LM.get('bedingung'):
            try: pruefe_namen(LM['bedingung'], namen | {LM.get('kandidatenVariable','')})
            except Ungueltig as e: F('T1', f'loesungsmenge.bedingung: {e}')

    # Platzhalter müssen deklariert sein
    for t in alle_texte(spec):
        for m in re.finditer(r'\{([A-Za-z_]\w*)(?:[.:][^}]*)?\}', t):
            if m.group(1) not in namen: F('T1', f'Platzhalter {{{m.group(1)}}} ist keine Variable')

    # ---- T2 Fehlermuster ---------------------------------------------
    if fmt == 'mehrfeld':
        if not spec.get('felder'): F('T1', 'mehrfeld ohne Felder')
        for f in spec.get('felder', []):
            n = len(f.get('fehler', []))
            mindest = 2 if importiert else 3
            if n < mindest:
                F('T2', f"Feld «{f.get('name')}»: nur {n} Fehlermuster, mindestens {mindest}")
            for x in f.get('fehler', []):
                if len(x.get('feedback','')) < 40:
                    F('T2', f"{f.get('name')}/{x.get('diagnoseId')}: Feedback zu knapp")
    elif fmt in ('zahl_eingeben','loesungsmenge'):
        n = len(spec.get('fehler', []))
        mindest = 2 if importiert else 3
        if n < mindest: F('T2', f'nur {n} Fehlermuster, mindestens {mindest}')
        for x in spec.get('fehler', []):
            if len(x.get('feedback','')) < 40:
                F('T2', f"{x.get('diagnoseId')}: Feedback zu knapp")

    # ---- T5 Gegenprobe (nur von Hand geschriebene) --------------------
    if not importiert and fmt == 'zahl_eingeben':
        if not spec.get('gegenprobe'): F('T5', 'gegenprobe fehlt')
        elif normiert(spec['loesung']) == normiert(spec['gegenprobe']):
            F('T5', 'gegenprobe ist dieselbe Formel')

    # ---- T18 Erklärung (nur importierte) -----------------------------
    if importiert:
        e = spec.get('erklaerung') or {}
        if len(e.get('kern','')) < 60: F('T18', 'erklaerung.kern fehlt oder ist zu knapp')
        if len(e.get('falle','')) < 40: F('T18', 'erklaerung.falle fehlt oder ist zu knapp')
        if not e.get('schritte'): F('T18', 'erklaerung.schritte fehlt')

    # Eine Gittervorgabe wird gezeichnet, nicht getippt — und sie braucht
    # ihre Beschriftung im Feld `text`. Fehlt sie, zeichnet die Vorschau
    # nichts mehr, und zwar mit einem Abbruch statt mit einer leeren Karte.
    for v in (spec.get('gitter') or {}).get('vorgabe', []):
        if not v.get('text'):
            F('T1', 'Gittervorgabe ohne «text» — die Beschriftung fehlt')
        if v.get('x') is None or v.get('y') is None:
            F('T1', 'Gittervorgabe ohne «x» oder «y»')

    # ---- T3 Sprache ---------------------------------------------------
    text = ' '.join(alle_texte(spec))
    for muster, wort, hi in VERBOTEN:
        if muster.search(text) and not waehrungsaufgabe(wort, text):
            F('T3', f'«{wort}» gefunden — {hi}')
    # Platzhalter enthalten Variablennamen, kein Deutsch — die bleiben ASCII
    # und werden hier übersprungen.
    prosa = re.sub(r'\{[^}]*\}', ' ', text)
    for m in sorted({m.group(0) for m in UMSCHRIFT.finditer(prosa)}):
        F('T3', f'«{m}» ist eine Umschrift — schreibe den Umlaut aus')
    for m in sorted({m.group(0) for m in SIE_ANREDE.finditer(ohne_rede(text))}):
        F('T3', f'«{m}» — Jugendliche werden geduzt (§2.1)')

    # ---- Ziehungen ----------------------------------------------------
    gelungen, staemme, loesungen = 0, set(), set()
    treffer = set()
    for seed in range(1, SEEDS + 1):
        try: a = ziehe(spec, seed)
        except Fehlgeschlagen: F('T4', f'Seed {seed}: keine gueltige Ziehung in 400 Versuchen'); continue
        except Ungueltig as e: F('T4', f'Seed {seed}: {e}'); continue
        except Exception as e: F('T4', f'Seed {seed}: {type(e).__name__}: {e}'); continue
        if not a: continue
        gelungen += 1
        staemme.add(sichtbar(a))

        if '{' in a['stamm'] and re.search(r'\{[A-Za-z_]', a['stamm']):
            F('T1', f'Seed {seed}: nicht ersetzter Platzhalter im Stamm')
        for wort in ('undefined','NaN','[object'):
            if wort in a['stamm']: F('T1', f'Seed {seed}: «{wort}» im Stamm')

        # ---- T17 Zwei Punkte duerfen nicht auf demselben Feld liegen ----
        # Ein zweites Antippen nimmt die Wahl zurueck (Abschnitt 4.5). Fallen
        # zwei Bildpunkte zusammen, loescht das Setzen des zweiten den ersten,
        # und die Aufgabe ist ueber die echte Bedienung unloesbar — sie sieht
        # aber voellig in Ordnung aus. Genau so ein Fall steckte in
        # «drehung-gitter»: A' und B' landeten auf (10|11).
        if fmt == 'gitter':
            for lage in a['gitter']['loesungen']:
                stellen = [tuple(p) for p in lage]
                if len(set(stellen)) != len(stellen):
                    doppelt = [p for p in stellen if stellen.count(p) > 1][0]
                    F('T17', f'Seed {seed}: zwei Bildpunkte liegen auf '
                             f'{doppelt[0]}|{doppelt[1]} — das zweite Antippen '
                             f'nimmt das erste zurueck, die Aufgabe ist nicht '
                             f'bedienbar')
                    break

        if fmt == 'zahl_eingeben':
            loesungen.add(round(a['loesung']*1e6))
            if not importiert and spec.get('gegenprobe'):
                try: gp = ev(spec['gegenprobe'], a['scope'])
                except Ungueltig: gp = None
                if gp is None or abs(gp - a['loesung']) > 1e-6:
                    F('T5', f"Seed {seed}: Loesung {a['loesung']} vs. Gegenprobe {gp}")
            zf = spec.get('zahlformat','ganz')
            if zf == 'ganz' and abs(a['loesung'] - round(a['loesung'])) > 1e-9:
                F('T6', f"Seed {seed}: zahlformat ganz, Loesung {a['loesung']}")
            if abs(a['loesung']) > 1e6: W('T6', f'Seed {seed}: Loesung zu gross für den Kopf')
            # Nur bei Sachaufgaben. Steht im Stamm eine Gleichung, dann ist
            # eine uebereinstimmende Zahl ein Koeffizient und kein Verrat.
            if '=' not in a['stamm'] and \
               any(abs(z - a['loesung']) < 1e-9 for z in zahlen(a['stamm'])):
                F('T8', f"Seed {seed}: die Loesung {schlicht(a['loesung'])} steht im Aufgabentext")
            for f in a['fehler']: treffer.add(f['diagnoseId'])
        elif fmt == 'mehrfeld':
            loesungen.add(tuple(round(f['loesung']*1e6) for f in a['felder']))
            for f in a['felder']:
                # Dieselbe Prüfung wie bei einem einzelnen Feld: Wer «ganz»
                # sagt und 43.75 rechnet, zeigt dem Schüler 44 und nennt
                # dessen richtige 43.75 falsch.
                if f['zahlformat'] == 'ganz' and abs(f['loesung'] - round(f['loesung'])) > 1e-9:
                    F('T6', f"Seed {seed}: Feld «{f['name']}» ist ganz, Loesung {f['loesung']}")
                if abs(f['loesung']) > 1e6:
                    W('T6', f"Seed {seed}: Feld «{f['name']}» zu gross fuer den Kopf")
                for x in f['fehler']: treffer.add(x['diagnoseId'])
        else:
            # Nicht `loesungText` — der ist für Menschen geschrieben («7
            # Felder») und unterscheidet zu wenig. Der Prüfer braucht die
            # Lösung selbst; die App darf davon nichts merken.
            loesungen.add(loesungSchluessel(a))

        h1 = (a.get('hinweise') or [None])[0]
        if h1 and fmt == 'zahl_eingeben' and any(abs(z - a['loesung']) < 1e-9 for z in zahlen(h1)):
            F('T9', f'Seed {seed}: der erste Hinweis nennt die Loesung')

    # ---- T10 Ausbeute · T11 Vielfalt · T12 Fehlermuster greifen -------
    if gelungen < SEEDS * 0.9:
        F('T10', f'nur {gelungen} von {SEEDS} Ziehungen gelingen')
    if gelungen:
        # T11 fragt: Trifft ein Schüler, der dreissig Aufgaben übt, dieselbe
        # zweimal? Ein Template, dessen Welt kleiner ist als MIN_VARIANTEN —
        # ein Würfel hat nun einmal nur 48 Lagen —, muss das mit
        # `variantenGrenze` und einem Grund ausweisen. Die Schwelle bleibt,
        # die Ausnahme steht in den Daten und ist nachlesbar.
        grenze = spec.get('variantenGrenze')
        soll = min(MIN_VARIANTEN, grenze['anzahl']) if grenze else MIN_VARIANTEN
        if grenze and not grenze.get('grund'):
            F('T1', 'variantenGrenze ohne grund')
        if len(staemme) < soll:
            F('T11', f'nur {len(staemme)} verschiedene Aufgaben aus {gelungen} Ziehungen, '
                     f'verlangt sind {soll}')
        if grenze and len(staemme) > grenze['anzahl']:
            F('T11', f"variantenGrenze sagt {grenze['anzahl']}, es sind aber {len(staemme)} — "
                     f'die Grenze stimmt nicht mehr')
        if len(loesungen) < 8:
            F('T11', f'nur {len(loesungen)} verschiedene Lösungen')
    alleIds = {x['diagnoseId'] for x in spec.get('fehler', [])} | \
              {x['diagnoseId'] for f in spec.get('felder', []) for x in f.get('fehler', [])}
    for i in sorted(alleIds - treffer):
        if fmt in ('zahl_eingeben','mehrfeld'):
            F('T12', f'{i} liefert nie einen brauchbaren Distraktor')

    # Ein Tor, das dreissigmal dasselbe meldet, verdeckt die anderen.
    # Je Tor hoechstens drei Beispiele, danach nur noch die Zahl.
    zaehler, out = {}, []
    for sw, tor, t in b:
        t = re.sub(r'Seed \d+', 'Seed N', t)
        zaehler.setdefault(tor, [0, sw])
        zaehler[tor][0] += 1
        if zaehler[tor][0] <= 3: out.append((sw, tor, t))
    for tor, (n, sw) in zaehler.items():
        if n > 3: out.append((sw, tor, f'... und {n-3} weitere Meldungen dieses Tors'))
    return out

if __name__ == '__main__':
    # Baeume und Vorlagen kommen aus ihren Verzeichnissen — genau wie in
    # Katalog.kt. Hier standen feste Listen: zwei Baeume und die eine Datei
    # `mathematik.json`. Ein neuer Kanton bringt eigene Baeume und eigene
    # Vorlagendateien mit; sie waeren stillschweigend ungeprueft geblieben,
    # und «alles gruen» haette dann nichts mehr bedeutet.
    baeume = {}
    for datei in json.load(open(f'{RES}/themen/index.json', encoding='utf-8'))['dateien']:
        bm = json.load(open(f'{RES}/themen/{datei}', encoding='utf-8'))
        baeume[bm['fach']] = {u['code'] for o in bm['oberthemen'] for u in o['unterthemen']}

    specs = []
    for datei in json.load(open(f'{RES}/templates/vorlagen.index.json',
                                encoding='utf-8'))['dateien']:
        specs += json.load(open(f'{RES}/templates/{datei}', encoding='utf-8'))

    schlecht = 0
    for s in specs:
        fach = s.get('fach', '')
        if fach not in baeume:
            print(f"FEHLER {s['templateId']}: Fach «{fach}» hat keinen Themenbaum")
            schlecht += 1
            continue
        b = pruefe(s, baeume[fach])
        f = [x for x in b if x[0] == 'FEHLER']
        kopf = ('OK     ' if not f else 'FEHLER ') + s['templateId'].ljust(28) + \
               f"{s['format']:<15}{s.get('status',''):<12}"
        print(kopf)
        for sw, tor, t in b: print(f'   [{sw}] {tor}: {t}')
        if f: schlecht += 1
    print(f'\n{len(specs)-schlecht} von {len(specs)} Zahlen-Templates bestehen die Tore.')
    sys.exit(1 if schlecht else 0)
