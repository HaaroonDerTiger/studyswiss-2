#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Geht den Weg eines Schülers durch — für jeden Kanton, jeden Schultyp.

   Kantonswahl → Schulwahl → Termin → Fächer → Bereiche → Themenbaum →
   Aufgaben → Selbsttest → Aufsatz. An jeder Stelle wird gefragt: Kommt hier
   wirklich etwas an?

   Das ist der Prüfer, den es vorher nicht gab, und er fängt genau die
   Sorte Fehler, die ohne Compiler durchrutscht und in der App als LEERE
   KARTE endet — ein Schultyp, der eine Aufsatzart nennt, die es nicht gibt;
   ein Bereich ohne Themenbaum; ein Fach ohne eine einzige Aufgabe; ein
   Prüfungstermin, der in der Vergangenheit liegt.

   Für einen Kanton mit `aktiv: false` gilt der weiche Massstab: Die Struktur
   muss stimmen, Inhalt darf fehlen. Er ist in der App ausgegraut und nicht
   antippbar. Ein Kanton mit `aktiv: true` verspricht dagegen, dass alles da
   ist — und genau dieses Versprechen wird hier geprüft.

   NUR ERWEITERN, NIE LOCKERN.
"""
import json, os, sys, datetime

# Der Ordner dieses Skripts ist der Anker, nicht das Arbeitsverzeichnis.
WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RES = os.path.join(WURZEL, 'backend/src/main/resources')

TASCHENRECHNER = {'keiner', 'einfach', 'nicht_cas', 'beliebig'}
HEUTE = datetime.date.today()

befunde = []          # (schwere, wo, text)
def F(wo, text): befunde.append(('FEHLER', wo, text))
def W(wo, text): befunde.append(('warnung', wo, text))


def lies(*pfad):
    with open(os.path.join(RES, *pfad), encoding='utf-8') as f:
        return json.load(f)


def laden():
    k = lies('katalog.json')
    baeume = {}
    for datei in lies('themen', 'index.json')['dateien']:
        b = lies('themen', datei)
        baeume[b['fach']] = b
        b['_datei'] = datei
    vorlagen, bloecke = [], []
    for datei in lies('templates', 'vorlagen.index.json')['dateien']:
        vorlagen += lies('templates', datei)
    for datei in lies('templates', 'bloecke.index.json')['dateien']:
        bloecke += lies('templates', datei)
    tipps = {}
    for datei in lies('tipps', 'index.json')['dateien']:
        t = lies('tipps', datei)
        tipps[t['bereich']] = t
        t['_datei'] = datei
    return (k, baeume, vorlagen, bloecke,
            lies('aufsatz', 'arten.json'), lies('aufsatz', 'themen.json'), tipps)


# ====================================================================== Bäume
def pruefe_baeume(baeume, bereiche, pruefungen, baum_je_pruefung):
    """Ein Themenbaum ist die inhaltliche Achse. Stimmt er nicht, stimmt
       nichts, was darauf steht — Scheduler, Lernpfad und Fortschritt rechnen
       alle mit seinen Punkten."""
    alle_lernziele = {}
    for fach, b in baeume.items():
        wo = f"Baum {b['_datei']}"
        if fach not in bereiche:
            F(wo, f"Baum für «{fach}», aber es gibt keinen Bereich mit dieser "
                  f"Kennung — der Baum wird geladen und nie angezeigt")
        for feld in ('name', 'pruefung'):
            if not b.get(feld): F(wo, f'{feld} fehlt')
        if not b.get('oberthemen'): F(wo, 'keine Oberthemen'); continue

        anteil = sum(o.get('anteil', 0) for o in b['oberthemen'])
        if anteil != 100:
            F(wo, f'die Anteile ergeben {anteil} %, nicht 100 % — der '
                  f'Fortschritt-Screen rechnet damit')
        punkte = sum(o.get('punkte', 0) for o in b['oberthemen'])
        if b.get('punkteTotal') is not None and punkte != b['punkteTotal']:
            F(wo, f"punkteTotal sagt {b['punkteTotal']}, die Oberthemen "
                  f"ergeben {punkte}")
        if punkte == 0:
            W(wo, 'alle Oberthemen haben 0 Punkte — der Scheduler kann nicht '
                  'nach Prüfungsgewicht ordnen')

        codes, nummern = {}, set()
        for o in b['oberthemen']:
            if o['nr'] in nummern: F(wo, f"Oberthema-Nummer {o['nr']} doppelt")
            nummern.add(o['nr'])
            if not o.get('unterthemen'):
                F(wo, f"Oberthema {o['nr']} «{o['name']}» hat keine Unterthemen")
            for u in o.get('unterthemen', []):
                if u['code'] in codes:
                    F(wo, f"Unterthema-Code {u['code']} kommt zweimal vor")
                codes[u['code']] = o
                lz = u.get('lernzielId')
                if not lz:
                    F(wo, f"{u['code']}: lernzielId fehlt — sie steckt in "
                          f"gespeicherten Fortschritten und darf nie fehlen")
                elif lz in alle_lernziele:
                    F(wo, f"lernzielId {lz} gibt es schon in "
                          f"{alle_lernziele[lz]} — IDs müssen über ALLE Bäume "
                          f"eindeutig sein, sonst mischen sich Fortschritte")
                else:
                    alle_lernziele[lz] = b['_datei']
                if u.get('pflichtset', 20) <= 0:
                    F(wo, f"{u['code']}: pflichtset ist 0 — das Thema wäre nie "
                          f"abzuschliessen")
                # Ein Baum bedient mehrere Pruefungen; einzelne Unterthemen
                # kommen nur in einer davon vor. Zeigt die Angabe ins Leere,
                # wirkt sie nicht — und das faellt sonst niemandem auf.
                nur = set(u.get('nurGeprueftIn', []))
                nicht = set(u.get('nichtGeprueftIn', []))
                for pid in nur | nicht:
                    if pid not in pruefungen:
                        F(wo, f"{u['code']}: verweist auf die Prüfung «{pid}», "
                              f"die es nicht gibt")
                    elif pid not in baum_je_pruefung.get(b['fach'], set()):
                        F(wo, f"{u['code']}: verweist auf die Prüfung «{pid}», "
                              f"die diesen Themenbaum gar nicht benutzt — die "
                              f"Einschränkung wirkt nie")
                if nur & nicht:
                    F(wo, f"{u['code']}: {sorted(nur & nicht)} steht in "
                          f"nurGeprueftIn UND in nichtGeprueftIn")
        for o in b['oberthemen']:
            for u in o.get('unterthemen', []):
                for v in u.get('voraussetzungen', []):
                    if v not in codes:
                        F(wo, f"{u['code']}: Voraussetzung {v} gibt es in "
                              f"diesem Baum nicht")
                    elif v == u['code']:
                        F(wo, f"{u['code']} ist seine eigene Voraussetzung")
    return alle_lernziele


# ================================================================== Aufgaben
def bespielt(vorlagen, bloecke):
    """Welche Unterthemen je Bereich wirklich eine Aufgabe haben. Ohne diese
       Auskunft zeigt die App ein Thema als antippbar, das beim Antippen
       nichts liefert."""
    aus = {}
    for t in vorlagen + bloecke:
        if t.get('status') == 'entwurf': continue
        aus.setdefault(t.get('fach', ''), set()).update(t.get('unterthemen', []))
    return aus


def pruefe_aufgaben(vorlagen, bloecke, baeume):
    for t in vorlagen + bloecke:
        fach = t.get('fach', '')
        wo = f"Vorlage {t.get('templateId','?')}"
        if fach not in baeume:
            F(wo, f"fach «{fach}» hat keinen Themenbaum — diese Aufgaben sind "
                  f"unerreichbar")
            continue
        codes = {u['code'] for o in baeume[fach]['oberthemen']
                 for u in o['unterthemen']}
        for u in t.get('unterthemen', []):
            if u not in codes:
                F(wo, f"verweist auf Unterthema {u}, das es im Baum «{fach}» "
                      f"nicht gibt")


def pruefe_pflichtset(vorlagen, bloecke, baeume):
    """Ist das Pflichtset ueberhaupt erreichbar?

       Der Fortschritt zaehlt VERSCHIEDENE Aufgaben: `geloest` ist die Menge
       der geloesten `ref`, und `setZiehen` verwirft jede Aufgabe, deren Stamm
       schon gezogen wurde. Ein Block liefert darum genau so viele
       verschiedene Aufgaben, wie er Eintraege hat — nie mehr.

       Steht das Pflichtset eines Unterthemas hoeher, als es Aufgaben gibt,
       bleibt der Zaehler stehen: «12 von 20 Pflichtaufgaben», fuer immer.
       Das Thema wird nie `abgeschlossen`, der Lernpfad zaehlt es ewig als
       offen, und die Dringlichkeit im Scheduler sinkt nie. Es sieht dabei
       vollstaendig in Ordnung aus — genau die Sorte Fehler, die ohne
       Compiler durchrutscht.

       Ein Unterthema mit mindestens einer Zahlen-Vorlage ist nie betroffen:
       Der Generator zieht daraus beliebig viele verschiedene Aufgaben."""
    hat_vorlage, aus_bloecken = {}, {}
    for t in vorlagen:
        if t.get('status') == 'entwurf': continue
        for u in t.get('unterthemen', []):
            hat_vorlage.setdefault(t.get('fach', ''), set()).add(u)
    for b in bloecke:
        if b.get('status') == 'entwurf': continue
        n = len(b.get('aufgaben', []))
        for u in b.get('unterthemen', []):
            schl = (b.get('fach', ''), u)
            aus_bloecken[schl] = aus_bloecken.get(schl, 0) + n
    for fach, baum in baeume.items():
        for o in baum['oberthemen']:
            for u in o['unterthemen']:
                code = u['code']
                if code in hat_vorlage.get(fach, set()):
                    continue
                da = aus_bloecken.get((fach, code), 0)
                if da == 0:
                    continue          # gar nicht bespielt — faengt schon `bespielt`
                soll = u.get('pflichtset', 20)
                if da < soll:
                    F(f"Baum {fach}",
                      f"Unterthema {code} «{u['name']}»: Pflichtset {soll}, "
                      f"aber nur {da} verschiedene Aufgaben — der Zaehler "
                      f"bleibt bei {da} von {soll} stehen")


# ================================================================== Katalog
def pruefe_katalog(k, baeume, hat_aufgaben, arten, aufsatzthemen, tipps):
    bereiche = {b['id']: b for b in k['bereiche']}
    faecher = {f['id']: f for f in k['pruefungsfaecher']}
    pruefungen = {p['id']: p for p in k['pruefungen']}
    artenIds = {a['id'] for a in arten}
    themenJeSorte = {}
    for t in aufsatzthemen:
        themenJeSorte[t.get('sorte')] = themenJeSorte.get(t.get('sorte'), 0) + 1

    # ---- Fächer und Bereiche hängen zusammen ---------------------------
    # Welche Bereiche zu einem Fach gehören, steht NUR am Bereich. Früher
    # stand es zusätzlich am Fach, und beide Listen liefen beim ersten
    # neuen Kanton auseinander.
    for f in k['pruefungsfaecher']:
        if 'bereiche' in f:
            F(f"Fach {f['id']}",
              'trägt eine eigene Bereichsliste — die wird aus den Bereichen '
              'abgeleitet und darf hier nicht noch einmal stehen')
    for b in k['bereiche']:
        if b['pruefungsfach'] not in faecher:
            F(f"Bereich {b['id']}",
              f"gehört zum Fach «{b['pruefungsfach']}», das es nicht gibt")
        if b['art'] not in ('themenbaum', 'aufsatz', 'tipps'):
            F(f"Bereich {b['id']}", f"unbekannte art «{b['art']}»")
        if b['art'] == 'themenbaum' and b['id'] not in baeume:
            F(f"Bereich {b['id']}",
              'ist als Themenbaum ausgewiesen, hat aber keinen — er wird '
              'gefiltert und erscheint nirgends')
        # Ein Tipps-Bereich ist die Antwort auf einen Pruefungsteil, den man
        # nicht antippen kann: Hoerverstehen, muendliche Pruefung. Er hat
        # keinen Themenbaum, dafuer eine Seite — und ohne die waere er eine
        # leere Karte mit einem Versprechen darauf.
        if b['art'] == 'tipps':
            t = tipps.get(b['id'])
            if not t:
                F(f"Bereich {b['id']}",
                  'ist als Tipps-Seite ausgewiesen, hat aber keine Datei in '
                  'tipps/index.json — der Screen bliebe leer')
            else:
                if not t.get('ablauf'):
                    F(f"Tipps {b['id']}", 'ohne «ablauf» — der Screen soll zuerst '
                                          'sagen, was in der Prüfung geschieht')
                if not t.get('abschnitte'):
                    F(f"Tipps {b['id']}", 'ohne «abschnitte» — dann gibt es keine Tipps')
                for a in t.get('abschnitte', []):
                    for x in a.get('tipps', []):
                        if len(x.get('warum', '')) < 30:
                            F(f"Tipps {b['id']}",
                              f"«{x.get('regel','')[:40]}…»: kein Grund genannt — "
                              'eine Regel ohne Grund merkt sich niemand')
                # Die Uebungshinweise zeigen auf echte Unterthemen. Ein Verweis
                # ins Leere endet als Karte, die nichts oeffnet.
                for u in t.get('uebungen', []):
                    baum = baeume.get(u['bereich'])
                    if not baum:
                        F(f"Tipps {b['id']}",
                          f"verweist auf den Bereich «{u['bereich']}», der keinen "
                          'Themenbaum hat')
                        continue
                    codes = {c['code'] for o in baum['oberthemen']
                             for c in o['unterthemen']}
                    if u['unterthema'] not in codes:
                        F(f"Tipps {b['id']}",
                          f"verweist auf {u['bereich']} {u['unterthema']}, das es "
                          'im Themenbaum nicht gibt')

    # ---- Prüfungen ------------------------------------------------------
    kantone = {x['kuerzel']: x for x in k['kantone']}
    termine_je_pruefung = {}
    for t in k['termine']:
        termine_je_pruefung.setdefault(t['pruefung'], []).append(t)

    for p in k['pruefungen']:
        wo = f"Prüfung {p['id']}"
        if p['kanton'] not in kantone:
            F(wo, f"gehört zum Kanton «{p['kanton']}», den es nicht gibt")
        aktiv = kantone.get(p['kanton'], {}).get('aktiv', False)
        if not p.get('teile'): F(wo, 'hat keine Prüfungsteile'); continue

        teilIds, wahlgruppen = set(), set()
        for teil in p['teile']:
            two = f"{wo}/{teil['id']}"
            if teil['id'] in teilIds: F(two, 'Teil-Kennung doppelt')
            teilIds.add(teil['id'])
            if teil['pruefungsfach'] not in faecher:
                F(two, f"Prüfungsfach «{teil['pruefungsfach']}» gibt es nicht")
            for b in teil.get('bereiche', []):
                if b not in bereiche:
                    F(two, f'nennt Bereich «{b}», den es nicht gibt')
                elif bereiche[b]['pruefungsfach'] != teil['pruefungsfach']:
                    F(two, f"nennt Bereich «{b}», der zum Fach "
                           f"«{bereiche[b]['pruefungsfach']}» gehört, nicht zu "
                           f"«{teil['pruefungsfach']}»")
            h = teil.get('hilfsmittel', {})
            if h.get('taschenrechner') not in TASCHENRECHNER:
                F(two, f"taschenrechner «{h.get('taschenrechner')}» ist "
                       f"unbekannt — erlaubt: {sorted(TASCHENRECHNER)}")
            if teil.get('dauerMinuten', 0) <= 0:
                F(two, 'dauerMinuten fehlt oder ist 0')
            if teil.get('anzahlAufgaben', 0) <= 0:
                F(two, 'anzahlAufgaben fehlt oder ist 0')
            if teil.get('wahlgruppe'): wahlgruppen.add(teil['wahlgruppe'])

            # Ein Teil eines AKTIVEN Kantons muss etwas zu üben haben —
            # es sei denn, die App bietet ihn erklärtermassen nicht an.
            if teil.get('angeboten') is None:
                F(two, 'angeboten fehlt — es muss dastehen, ob die App für '
                       'diesen Prüfungsteil überhaupt etwas anbietet')
            if aktiv and teil.get('angeboten', True):
                uebbar = [b for b in teil.get('bereiche', [])
                          if bereiche.get(b, {}).get('art') == 'themenbaum']
                if not teil.get('bereiche'):
                    F(two, 'hat keine Bereiche — in einem aktiven Kanton '
                           'stünde das Fach in der App und wäre leer')
                elif not uebbar and all(bereiche.get(b, {}).get('art')
                                        not in ('aufsatz', 'tipps')
                                        for b in teil['bereiche']):
                    F(two, 'hat keinen einzigen übbaren Bereich')
                for b in uebbar:
                    if not hat_aufgaben.get(b):
                        F(two, f'Bereich «{b}» hat keine einzige Aufgabe')

        # ---- Wahlgruppen ------------------------------------------------
        deklariert = {w['id'] for w in p.get('wahl', [])}
        for g in wahlgruppen - deklariert:
            F(wo, f"Teile verweisen auf Wahlgruppe «{g}», die nicht unter "
                  f"«wahl» steht — die App wüsste nicht, dass sie fragen muss")
        for w in p.get('wahl', []):
            if w['id'] not in wahlgruppen:
                F(wo, f"Wahlgruppe «{w['id']}» wird von keinem Teil benutzt")
            for a in w['aus']:
                if a not in teilIds:
                    F(wo, f"Wahlgruppe «{w['id']}» bietet «{a}» an, "
                          f"das kein Prüfungsteil ist")
            if w.get('standard') and w['standard'] not in w['aus']:
                F(wo, f"Wahlgruppe «{w['id']}»: standard «{w['standard']}» "
                      f"steht nicht in der Auswahl")

        # ---- Aufsatzarten ----------------------------------------------
        for a in p.get('aufsatzarten', []):
            if a not in artenIds:
                F(wo, f"nennt die Aufsatzart «{a}», die es in "
                      f"aufsatz/arten.json nicht gibt — der Screen bliebe leer")
            elif aktiv:
                sorte = next(x['sorte'] for x in arten if x['id'] == a)
                if not themenJeSorte.get(sorte):
                    W(wo, f"Aufsatzart «{a}» hat kein einziges Thema — sie "
                          f"erscheint blass mit «Themen folgen»")
        schreibt = [t for t in p['teile']
                    if 'aufsatz' in t.get('bereiche', [])]
        if schreibt and not p.get('aufsatzarten'):
            F(wo, 'hat einen Aufsatzteil, aber keine Aufsatzarten')
        # Ohne Massstab korrigiert das Sprachmodell nach dem, was es selbst
        # für richtig hält — und liefert trotzdem eine ordentlich aussehende
        # Antwort. Ein Fehler, den niemand sieht, ist der schlimmste.
        if schreibt:
            r = p.get('aufsatzrahmen') or {}
            if not r.get('anforderungen'):
                (F if aktiv else W)(
                    wo, 'hat einen Aufsatzteil, aber keinen aufsatzrahmen — '
                        'die Korrektur hätte keinen kantonalen Massstab')

        # ---- Termine ----------------------------------------------------
        liste = termine_je_pruefung.get(p['id'], [])
        if not liste:
            F(wo, 'hat keinen Termin — der Lernpfad kann nichts rechnen und '
                  'der Termin-Screen nichts vorbelegen')
        sessions = set()
        for t in liste:
            if t.get('session') in sessions:
                F(wo, f"zwei Termine für die Session «{t.get('session')}»")
            sessions.add(t.get('session'))
            hat_datum = bool(t.get('datum'))
            hat_fenster = bool(t.get('von') and t.get('bis'))
            if not hat_datum and not hat_fenster:
                F(wo, 'Termin ohne datum und ohne von/bis')
            tag = t.get('datum') or t.get('bis')
            if tag:
                d = datetime.date.fromisoformat(tag)
                if d < HEUTE and aktiv:
                    F(wo, f'Termin {tag} liegt in der Vergangenheit — die App '
                          f'zeigte «Prüfung in -12 Tagen»')
                elif d < HEUTE:
                    W(wo, f'Termin {tag} liegt in der Vergangenheit')

    # ---- Kantone und Schultypen ----------------------------------------
    for kt in k['kantone']:
        wo = f"Kanton {kt['kuerzel']}"
        liste = k['schultypen'].get(kt['kuerzel'], [])
        if kt['aktiv'] and not liste:
            F(wo, 'ist aktiv, hat aber keinen einzigen Schultyp — der Screen '
                  'nach der Kantonswahl wäre leer')
        if not kt['aktiv'] and liste:
            W(wo, f'ist nicht aktiv, bringt aber schon {len(liste)} Schultypen '
                  f'mit — das ist in Ordnung, aber niemand sieht sie')
        ids = set()
        for s in liste:
            swo = f"{wo}/{s['id']}"
            if s['id'] in ids: F(swo, 'Schultyp-Kennung doppelt')
            ids.add(s['id'])
            if not s.get('name'): F(swo, 'name fehlt')
            p = pruefungen.get(s.get('pruefung'))
            if p is None:
                F(swo, f"verweist auf die Prüfung «{s.get('pruefung')}», die "
                       f"es nicht gibt")
                continue
            if p['kanton'] != kt['kuerzel']:
                F(swo, f"verweist auf «{p['id']}», eine Prüfung des Kantons "
                       f"{p['kanton']}")
            if kt['aktiv']:
                # Jedes Fach dieses Schultyps muss übbar sein — sonst
                # verschwindet es still aus der App und der Schüler bekommt
                # weniger, als die Prüfung von ihm verlangt.
                gezeigt = []
                for teil in p['teile']:
                    if not teil.get('angeboten', True): continue
                    ok = [b for b in teil.get('bereiche', [])
                          if bereiche.get(b, {}).get('art') in ('aufsatz', 'tipps')
                          or hat_aufgaben.get(b)]
                    if ok: gezeigt.append(teil['pruefungsfach'])
                # Eine Wahlgruppe verlangt nur, dass EINE ihrer Möglichkeiten
                # da ist — Bern prüft Französisch ODER Englisch.
                verlangt = {t['pruefungsfach'] for t in p['teile']
                            if not t.get('wahlgruppe') and t.get('angeboten', True)}
                for w in p.get('wahl', []):
                    moeglich = [t for t in p['teile'] if t['id'] in w['aus']
                                and t.get('angeboten', True)]
                    if moeglich and not any(t['pruefungsfach'] in gezeigt
                                            for t in moeglich):
                        F(swo, f"von der Wahl «{w['id']}» ist keine einzige "
                               f"Möglichkeit übbar")
                fehlt = verlangt - set(gezeigt)
                if fehlt:
                    F(swo, f"die Prüfung verlangt {sorted(verlangt)}, übbar ist "
                           f"aber nur {sorted(set(gezeigt))} — {sorted(fehlt)} "
                           f"fehlt in der App ganz")
                if not gezeigt:
                    F(swo, 'kein einziges übbares Fach')


def main():
    k, baeume, vorlagen, bloecke, arten, aufsatzthemen, tipps = laden()
    bereiche = {b['id'] for b in k['bereiche']}
    # Welche Pruefung benutzt welchen Baum? Das braucht die Baumpruefung, um
    # zu sehen, ob eine Einschraenkung ueberhaupt greifen kann.
    baum_je_pruefung = {}
    for p in k['pruefungen']:
        for t in p['teile']:
            for b in t.get('bereiche', []):
                baum_je_pruefung.setdefault(b, set()).add(p['id'])
    pruefe_baeume(baeume, bereiche, {p['id'] for p in k['pruefungen']},
                  baum_je_pruefung)
    pruefe_aufgaben(vorlagen, bloecke, baeume)
    pruefe_pflichtset(vorlagen, bloecke, baeume)
    pruefe_katalog(k, baeume, bespielt(vorlagen, bloecke), arten, aufsatzthemen,
                   tipps)

    # ---- Bericht: der Weg jedes Kantons, wie ihn ein Schüler geht -------
    faecher = {f['id']: f for f in k['pruefungsfaecher']}
    br = {b['id']: b for b in k['bereiche']}
    ha = bespielt(vorlagen, bloecke)
    pr = {p['id']: p for p in k['pruefungen']}
    for kt in k['kantone']:
        marke = 'aktiv ' if kt['aktiv'] else 'bald  '
        liste = k['schultypen'].get(kt['kuerzel'], [])
        print(f"\n{marke} {kt['kuerzel']}  {kt['name']}"
              f"  —  {len(liste)} Schultypen")
        for s in liste:
            p = pr.get(s.get('pruefung'))
            if not p: continue
            kuerzel = f" ({p['kuerzel']})" if p.get('kuerzel') else ''
            print(f"    {s['name']}{kuerzel}")
            for teil in p['teile']:
                inhalt = []
                for b in teil.get('bereiche', []):
                    n = len(ha.get(b, ()))
                    art = br.get(b, {}).get('art')
                    inhalt.append(f"{br.get(b,{}).get('kurzname', b)}"
                                  f"{'' if art == 'aufsatz' else f' {n}'}")
                tr = teil.get('hilfsmittel', {}).get('taschenrechner', '?')
                wahl = f" [Wahl: {teil['wahlgruppe']}]" if teil.get('wahlgruppe') else ''
                if not teil.get('angeboten', True): wahl += ' [nicht angeboten]'
                print(f"       {teil['name']:<16} {teil['dauerMinuten']:>3} min  "
                      f"TR:{tr:<10} {', '.join(inhalt) or '— kein Inhalt'}{wahl}")

    fehler = [b for b in befunde if b[0] == 'FEHLER']
    print()
    for schwere, wo, text in befunde:
        print(f"[{schwere}] {wo}: {text}")
    print(f"\n{len(fehler)} Fehler, {len(befunde)-len(fehler)} Warnungen.")
    return 1 if fehler else 0


if __name__ == '__main__':
    sys.exit(main())
