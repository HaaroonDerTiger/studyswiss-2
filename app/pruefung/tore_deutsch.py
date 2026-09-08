#!/usr/bin/env python3
"""Port von TextValidator.kt — prueft die Textbloecke in allen sieben Formaten.

   Wie bei den Zahlen-Templates gibt es zwei Herkuenfte:
   · von Hand geschrieben (`review`/`live`) — Fehlermuster mit benanntem
     Feedback zu jedem Distraktor;
   · `importiert` aus den ZAP-Trainern — dort steht statt der Fehlermuster
     die Erklaerung der Quelle, und die muss dafuer etwas taugen (T18).

   NUR ERWEITERN, NIE LOCKERN."""
import json, glob, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tore_engine import Rng   # dieselbe Rng wie Mathematik

# Der Ordner dieses Skripts ist der Anker — siehe dart_pruefen.py.
WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = os.path.join(WURZEL, "backend/src/main/resources")
MIN_AUFGABEN = 12

def nackt(w):
    return w.strip().strip('«»()"\'.,;:!?–—').lower()

def norm(s): return re.sub(r'\s+', ' ', s.strip())

def loesungsliste(a, fmt):
    """Die Antworten einer Aufgabe — in jedem Format anders abgelegt.

       `mehrfeld` traegt sie in den Feldern, `tabelle_auswahl` in den Zeilen,
       alle übrigen unter `loesung`. Ein Tor, das nur `loesung` kennt,
       stuerzt beim ersten neuen Format ab — und ein abgestuerztes Tor
       prueft gar nichts."""
    if fmt == 'mehrfeld':
        return [w for f in a.get('felder', []) for w in f.get('loesung', [])]
    if fmt == 'tabelle_auswahl':
        return [w for z in a.get('zeilen', []) for w in z.get('loesung', [])]
    return a.get('loesung', [])

ETIKETT = re.compile(
    r'(Lösung|Mögliche Lösung|Möglich|Möglich wären|Möglich wären etwa|Verbale Teile|'
    r'Wortspeicher|Nominativ|Genitiv|Dativ|Akkusativ|Singular|Plural)\s*[:—-]?', re.I)

def traegt(a, fmt):
    """Sagt die Erklaerung etwas, das nicht schon in der Antwort steht?

       Wir ziehen von der Erklaerung alles ab, was der Schueler ohnehin
       sieht: die Loesungen selbst und die reinen Etiketten davor. Was
       uebrig bleibt, muss noch eine Aussage sein."""
    e = a.get('erklaerung', '')
    if not e: return False
    for w in sorted(loesungsliste(a, fmt), key=len, reverse=True):
        if w: e = e.replace(w, ' ')
    for f in a.get('felder', []):
        for w in f.get('loesung', []): e = e.replace(w, ' ')
    e = ETIKETT.sub(' ', e)
    e = re.sub(r'[\s·«»„“”"\'()\[\]:;,.!?—–\-/+=]+', '', e)
    return len(e) >= 15

def pruefe(spec, bekannt):
    b, importiert = [], spec.get('status') == 'importiert'
    F = lambda tor, t: b.append(('FEHLER', tor, t))
    W = lambda tor, t: b.append(('warnung', tor, t))
    fmt = spec['format']
    aufg = spec['aufgaben']

    # ---- T1 Struktur -------------------------------------------------
    if not aufg: F('T1', 'keine Aufgaben')
    if spec.get('umformung') and fmt != 'luecke':
        F('T1', 'umformung ist nur bei Lueckenaufgaben vorgesehen')
    if len(spec.get('hinweise', [])) < 2: F('T1', 'weniger als 2 Hinweise')
    if not spec.get('loesungsweg'): F('T1', 'loesungsweg fehlt')
    for u in spec['unterthemen']:
        if u not in bekannt: F('T1', f'Unterthema {u} steht nicht im Themenbaum')
    if spec.get('status') not in ('entwurf', 'review', 'live', 'importiert'):
        F('T1', f"status «{spec.get('status')}» ist unbekannt")
    h = spec.get('herkunft', {})
    if h.get('beziehung') == 'abgeleitet' and not h.get('quelle'): F('T1', 'herkunft ohne quelle')
    braucht = fmt in ('einfachauswahl', 'mehrfachauswahl')
    if braucht and not spec.get('optionen') and any(not a.get('optionen') for a in aufg):
        F('T1', 'Auswahlaufgabe ohne Optionen')

    for i, a in enumerate(aufg, 1):
        wo = f'Aufgabe {i}'
        if not a.get('stamm'): F('T1', f'{wo}: stamm fehlt')
        loes = loesungsliste(a, fmt)
        if not loes: F('T1', f'{wo}: keine Loesung')
        if len(a.get('erklaerung', '')) < 25: F('T1', f'{wo}: erklaerung zu knapp')
        menge = a.get('optionen') or spec.get('optionen') or []

        # ---- T13 Loesung und Optionen passen zusammen ----------------
        if fmt == 'einfachauswahl':
            if len(a['loesung']) != 1: F('T13', f'{wo}: braucht genau eine Loesung')
            for l in a['loesung']:
                if l not in menge: F('T13', f'{wo}: Loesung «{l}» nicht in den Optionen')
        elif fmt == 'mehrfachauswahl':
            if len(a['loesung']) < 2:
                F('T13', f'{wo}: Mehrfachauswahl mit nur einer Loesung — dann ist es Einfachauswahl')
            if len(a['loesung']) >= len(menge):
                F('T13', f'{wo}: alle Optionen sind richtig, es gibt nichts zu unterscheiden')
            for l in a['loesung']:
                if l not in menge: F('T13', f'{wo}: Loesung «{l}» nicht in den Optionen')
        elif fmt == 'tabelle_auswahl':
            if not a.get('zeilen'): F('T13', f'{wo}: Tabelle ohne Zeilen')
            for k, z in enumerate(a.get('zeilen', []), 1):
                if not z.get('text'): F('T13', f'{wo}/Zeile {k}: kein Text')
                if len(z.get('loesung', [])) != 1:
                    F('T13', f'{wo}/Zeile {k}: braucht genau eine Loesung je Zeile')
                for l in z.get('loesung', []):
                    if l not in menge: F('T13', f'{wo}/Zeile {k}: «{l}» nicht in den Optionen')
            # Steht in jeder Zeile dieselbe Antwort, ist die Aufgabe geraten.
            eins = {z['loesung'][0] for z in a.get('zeilen', []) if z.get('loesung')}
            if len(a.get('zeilen', [])) >= 3 and len(eins) == 1:
                F('T13', f'{wo}: alle Zeilen haben dieselbe Loesung')
        elif fmt == 'mehrfeld':
            if not a.get('felder'): F('T13', f'{wo}: Mehrfeld ohne Felder')
            for f in a.get('felder', []):
                if not f.get('label'): F('T13', f'{wo}: Feld ohne Beschriftung')
                if not f.get('loesung'): F('T13', f"{wo}/{f.get('label','?')}: keine Loesung")

        # ---- T14 Fehlermuster ----------------------------------------
        fl = a.get('fehler', [])
        for fm in fl:
            if fm['antwort'] in loes:
                F('T14', f"{wo}: «{fm['antwort']}» ist Loesung und Fehlermuster zugleich")
            if braucht and fm['antwort'] not in menge:
                F('T14', f"{wo}: Fehlermuster «{fm['antwort']}» nicht in den Optionen")
        if len({x['antwort'] for x in fl}) != len(fl): F('T14', f'{wo}: doppelte Fehlerantwort')

        # ---- T2 Rueckmeldung -----------------------------------------
        # Von Hand geschriebene Blöcke brauchen zu jedem Distraktor einen
        # Satz. Importierte tragen stattdessen die Erklaerung der Quelle —
        # dafuer prueft T18 unten, dass die etwas taugt.
        if not importiert and fmt in ('einfachauswahl', 'mehrfachauswahl', 'luecke') and not fl:
            F('T2', f'{wo}: kein Fehlermuster')
        for fm in fl:
            if len(fm['feedback']) < 40: F('T2', f"{wo}/{fm['diagnoseId']}: Feedback zu knapp")

        # ---- T8 Die Loesung darf nicht im Text stehen ----------------
        if fmt == 'luecke' and not spec.get('umformung'):
            # Der erste Absatz ist die Anweisung. Dass sie das Ausgangswort
            # nennt («Bilde vom Verb gehen …», «Wortfamilie «halten»»), ist
            # der Sinn der Aufgabe und kein Verrat. Alles danach ist der
            # eigentliche Satz — dort darf die Loesung nicht ablesbar sein.
            absaetze = a['stamm'].split('\n\n')
            rest = re.sub(r'\([^)]*\)', '', '\n\n'.join(absaetze[1:]))
            l = a['loesung'][0]
            if len(l) >= 4 and l.lower() in rest.lower():
                F('T8', f'{wo}: die Loesung «{l}» ist aus dem Aufgabensatz ablesbar')

        # ---- T15 Markierte Wörter kommen im Satz vor ----------------
        if fmt == 'markieren':
            satz = (a.get('woerter') or a['stamm'].split('\n\n')[-1].strip().split())
            offen = [nackt(w) for w in satz]
            for w in a['loesung']:
                n = nackt(w)
                if n in offen: offen[offen.index(n)] = ' '
                else: F('T15', f'{wo}: «{w}» kommt im Satz nicht (mehr) vor')
            if a.get('stellen') is not None:
                for k in a['stellen']:
                    if not (0 <= k < len(satz)):
                        F('T15', f'{wo}: Stelle {k} liegt ausserhalb des Satzes')
                # Stellen und Loesungswoerter muessen dasselbe meinen.
                ueber = [nackt(satz[k]) for k in a['stellen'] if 0 <= k < len(satz)]
                if sorted(ueber) != sorted(nackt(w) for w in a['loesung']):
                    F('T15', f'{wo}: die Stellen zeigen auf andere Woerter als die Loesung')

        # ---- T16 Kommasatz und Aufgabensatz sind derselbe ------------
        if fmt == 'kommas':
            mit = a['loesung'][0]
            ohne = mit.replace(',', '')
            satz = a.get('woerter')
            imstamm = ' '.join(satz) if satz else a['stamm'].split('\n\n')[-1].strip()
            if norm(ohne) != norm(imstamm):
                F('T16', f'{wo}: Stamm und Loesungssatz weichen ab\n'
                         f'        Stamm:   {imstamm}\n        Loesung: {ohne}')
            if satz and a.get('stellen') is not None:
                for k in a['stellen']:
                    if not (0 <= k < len(satz)):
                        F('T16', f'{wo}: Kommastelle {k} liegt ausserhalb des Satzes')
                if len(a['stellen']) != mit.count(','):
                    F('T16', f"{wo}: {len(a['stellen'])} Stellen, aber {mit.count(',')} Kommas")
            if ',' not in mit: W('T16', f'{wo}: kein Komma (als Falle in Ordnung)')

    # ---- T18 Die Erklärung muss mehr sagen als die Loesung ----------
    # Nicht die Laenge zaehlt. «‹trotz› fordert den Genitiv.» ist kurz und
    # gut; «Loesung: Er wird darum bitten.» ist laenger und wertlos, weil
    # es nur wiederholt, was der Schueler ohnehin schon sieht. Geprueft
    # wird darum: Bleibt etwas übrig, wenn man die Antwort abzieht?
    if importiert:
        leer = [i for i, a in enumerate(aufg, 1) if not traegt(a, fmt)]
        if len(leer) > len(aufg) * 0.1:
            bsp = ', '.join(f'Aufgabe {i}' for i in leer[:3])
            F('T18', f'{len(leer)} von {len(aufg)} Erklaerungen wiederholen nur die Loesung '
                     f'({bsp}) — der Schueler erfaehrt nicht, warum')

    # ---- T3 Sprache ---------------------------------------------------
    text = ' '.join(spec.get('hinweise', []) + spec.get('loesungsweg', []) +
                    [a['stamm'] for a in aufg] + [a.get('erklaerung', '') for a in aufg] +
                    [f['feedback'] for a in aufg for f in a.get('fehler', [])] +
                    [f.get('label', '') for a in aufg for f in a.get('felder', [])] +
                    [z.get('text', '') for a in aufg for z in a.get('zeilen', [])])
    # Dieselbe Liste wie bei den Zahlen-Templates — zwei Listen liefen
    # frueher oder spaeter auseinander.
    from tore import VERBOTEN, UMSCHRIFT, waehrungsaufgabe, SIE_ANREDE, ohne_rede
    for muster, wort, hi in VERBOTEN:
        if muster.search(text) and not waehrungsaufgabe(wort, text):
            F('T3', f'«{wort}» gefunden — {hi}')
    for m in sorted({m.group(0) for m in UMSCHRIFT.finditer(text)}):
        F('T3', f'«{m}» ist eine Umschrift — schreibe den Umlaut aus')
    for m in sorted({m.group(0) for m in SIE_ANREDE.finditer(ohne_rede(text))}):
        F('T3', f'«{m}» — Jugendliche werden geduzt (§2.1)')
    # Optionen, Loesungen und Fehlerantworten stehen nicht in `text` — sie
    # sind aber genau das, was der Schueler antippt. Ein «4/6» faellt dort am
    # meisten auf. Wo getippt wird, bleibt der Schraegstrich: `alsZahl`
    # versteht beide Schreibweisen, eine Tastatur kennt nur eine.
    if fmt not in ('luecke', 'kommas', 'markieren'):
        gesetzt = re.compile(r'(?<![\d/⁄])(?<![\d][.,])\d{1,3}/\d{1,3}(?![\d/⁄])(?![.,]\d)')
        for a in aufg:
            for w in ((a.get('optionen') or []) + loesungsliste(a, fmt) +
                      [x['antwort'] for x in a.get('fehler', [])]):
                if gesetzt.search(w or ''):
                    F('T3', f'«{w}» — den Bruch setzen: ⁴⁄₆ statt 4/6')
    if re.search(r'<[a-z]+[ />]', text): F('T3', 'HTML-Auszeichnung im Text — Vorlagen sind Daten')

    # ---- T11 Vielfalt --------------------------------------------------
    if len(aufg) < MIN_AUFGABEN: F('T11', f'nur {len(aufg)} Aufgaben, mindestens {MIN_AUFGABEN}')
    # Zwei Aufgaben sind gleich, wenn Stamm UND Antwort gleich sind. Beim
    # Markieren und bei Kommas steht der Satz nicht im Stamm.
    # Der Schluessel muss alles enthalten, was der Schueler sieht. Bei einer
    # Tabelle steht die Aufgabe in den Zeilen, nicht im Stamm — zwei
    # Tabellen mit denselben Lösungen sind trotzdem verschieden, wenn die
    # Saetze andere sind.
    schluessel = [json.dumps([a['stamm'], a.get('woerter'),
                              [z.get('text') for z in a.get('zeilen', [])],
                              [f.get('label') for f in a.get('felder', [])],
                              loesungsliste(a, fmt)],
                             ensure_ascii=False, sort_keys=True) for a in aufg]
    if len(set(schluessel)) != len(schluessel):
        F('T11', f'{len(schluessel) - len(set(schluessel))} Aufgaben sind doppelt')
    # Und der Stamm allein muss auch schon unterscheiden.
    #
    # Zwoelf Aufgaben mit dem Satz «Welche Aussage stimmt im Sinne des
    # Textes?» sind formal verschieden — die Antworten unterscheiden sich —,
    # aber niemand kann sie auseinanderhalten: nicht die Schuelerin, die im
    # Fehlerarchiv nachschaut, und nicht die Pruefung, die eine Aufgabe ueber
    # ihren Stamm wiederfinden will.
    #
    # Bei `tabelle_auswahl` steckt die eigentliche Aufgabe zwar in den Zeilen,
    # und darum stand dieses Format lange nicht in der Liste. Das war ein
    # Irrtum mit Folgen: `setZiehen` verwirft eine Aufgabe, deren Stamm es
    # schon gezogen hat. Ein Block mit zwoelf gleichlautenden Staemmen liefert
    # in der Uebung darum ein Set von GENAU EINER Aufgabe — «1 von 1» statt
    # «1 von 10». Fuenf Bloecke in drei Kantonen waren so, und niemandem fiel
    # es auf, weil alles funktionierte.
    if fmt in ('einfachauswahl', 'mehrfachauswahl', 'tabelle_auswahl'):
        st = [a['stamm'] for a in aufg]
        doppelt = {x for x in st if st.count(x) > 1}
        if doppelt:
            bsp = sorted(doppelt)[0].replace(chr(10), ' ')[:60]
            F('T11', f'{len(doppelt)} Aufgabentexte kommen mehrfach vor, z.B. '
                     f'«{bsp}…» — so sind die Aufgaben nicht auseinanderzuhalten')
    if fmt in ('einfachauswahl', 'tabelle_auswahl') and len(spec.get('optionen', [])) >= 3:
        from collections import Counter
        c = Counter(w for a in aufg for w in loesungsliste(a, fmt))
        gesamt = sum(c.values())
        top, n = c.most_common(1)[0]
        if gesamt and n > gesamt * 0.5:
            F('T11', f'«{top}» ist {n} von {gesamt} Malen die Loesung — man kaeme mit Raten durch')
    return b

def ziehe(spec, seed):
    """Port von TextGenerator.ziehe — prueft, dass jede Ziehung durchlaeuft."""
    rng = Rng(seed)
    i = rng.int(0, len(spec['aufgaben'])-1)
    a = spec['aufgaben'][i]
    menge = a.get('optionen') or spec.get('optionen') or []
    fmt = spec['format']
    if fmt in ('einfachauswahl', 'mehrfachauswahl'):
        optionen = rng.shuffle(menge)
    elif fmt == 'tabelle_auswahl':
        # Die Optionen sind für alle Zeilen dieselben und bleiben in ihrer
        # Reihenfolge — eine Tabelle, deren Spalten springen, ist unlesbar.
        optionen = list(menge)
        for z in a.get('zeilen', []):
            if not z.get('text'): raise ValueError('Zeile ohne Text')
    elif fmt == 'mehrfeld':
        optionen = []
        for f in a.get('felder', []):
            if not f.get('loesung'): raise ValueError('Feld ohne Loesung')
    else:
        optionen = []
    return a, optionen

if __name__ == '__main__':
    # Je Fach der eigene Themenbaum — ein Algebra-Block verweist auf
    # Mathematik-Codes, ein Grammatik-Block auf die deutschen.
    #
    # Welche Baeume es gibt, stand hier frueher als feste Liste. Damit prueft
    # der Pruefer einen neuen Kanton stillschweigend nicht — seine Bloecke
    # faenden keinen Baum und alle ihre Codes gaelten als unbekannt. Jetzt
    # gilt dasselbe Verzeichnis wie fuer Katalog.kt.
    baeume = {}
    verzeichnis = json.load(open(BASE + '/themen/index.json', encoding='utf-8'))
    for datei in verzeichnis['dateien']:
        b = json.load(open(BASE + '/themen/' + datei, encoding='utf-8'))
        baeume[b['fach']] = {u['code'] for o in b['oberthemen'] for u in o['unterthemen']}
    # Genau die Dateien, die auch Katalog.kt als Bloecke liest.
    verz = json.load(open(BASE + '/templates/bloecke.index.json', encoding='utf-8'))
    specs = []
    for name in verz['dateien']:
        specs += json.load(open(BASE + '/templates/' + name, encoding='utf-8'))
    schlecht = 0
    for s in specs:
        fach = s.get('fach', 'sprachbetrachtung')
        if fach not in baeume:
            print(f"FEHLER {s['templateId']}: Fach «{fach}» hat keinen Themenbaum")
            schlecht += 1
            continue
        b = pruefe(s, baeume[fach])
        f = [x for x in b if x[0] == 'FEHLER']
        print(('OK     ' if not f else 'FEHLER ') + s['templateId'].ljust(30) +
              f"{s.get('fach','sprachbetrachtung')[:6]:<7}{s['format']:<15}"
              f"{len(s['aufgaben']):>3} Aufgaben")
        for sw, tor, t in b: print(f'   [{sw}] {tor}: {t}')
        if f: schlecht += 1
        # 60 Ziehungen: laeuft die Engine sauber durch?
        for seed in range(1, 61):
            try: ziehe(s, seed)
            except Exception as e:
                print(f'   [FEHLER] Ziehung Seed {seed}: {e}'); schlecht += 1; break
    print(f'\n{len(specs)-schlecht} von {len(specs)} Deutsch-Bloecken bestehen die Tore.')
    sys.exit(1 if schlecht else 0)
