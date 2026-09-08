#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Der Katalog, aufgeloest — das Gegenstueck zu `daten/Katalog.kt`.

   In `katalog.json` steht die Prüfung EINMAL, und die Schultypen verweisen
   darauf. Was die App bekommt, ist etwas anderes: ein Schultyp mit allem
   schon eingesetzt. Diese Umrechnung gibt es im Backend in Kotlin — und sie
   wird hier ein zweites Mal gebraucht, von der Vorschau und vom
   Kantonsprüfer.

   Zwei Fassungen laufen auseinander, wenn man sie laesst. Darum steht sie
   hier genau einmal und nicht in jedem Skript neu.
"""
import json, os, datetime

WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RES = os.path.join(WURZEL, 'backend/src/main/resources')


def _lies(*p):
    with open(os.path.join(RES, *p), encoding='utf-8') as f:
        return json.load(f)


def rechnertext(art):
    return {'keiner': 'Kein Taschenrechner',
            'einfach': 'Einfacher Taschenrechner, nicht programmierbar',
            'nicht_cas': 'Taschenrechner ohne CAS'}.get(art, 'Taschenrechner erlaubt')


def bedingungen_aus(teil, bemerkungen=()):
    h = teil.get('hilfsmittel', {})
    return {'taschenrechner': h.get('taschenrechner', 'keiner') != 'keiner',
            'zurueckblaettern': teil.get('zurueckblaettern', True),
            'uhrPausiert': teil.get('uhrPausiert', True),
            'hinweise': teil.get('hinweise', False),
            'dauerMinuten': teil.get('dauerMinuten', 90),
            'anzahlAufgaben': teil.get('anzahlAufgaben', 20),
            'hilfsmittelText': rechnertext(h.get('taschenrechner', 'keiner')),
            # Alle Bemerkungen der Teile dieses Fachs, nicht nur die des
            # strengsten: Deutsch besteht in Solothurn aus Aufsatz UND
            # Sprachbogen, und beide sagen etwas Eigenes.
            'bemerkungen': [b for b in bemerkungen if b]}


def _rang(teil):
    """Je kleiner, desto strenger — ohne Taschenrechner und kuerzer."""
    h = teil.get('hilfsmittel', {})
    return (0 if h.get('taschenrechner', 'keiner') == 'keiner' else 1000) \
        + teil.get('dauerMinuten', 90)


def aufgeloest():
    """Der Katalog in der Form, die App und Vorschau sehen."""
    k = _lies('katalog.json')
    pruefungen = {p['id']: p for p in k['pruefungen']}
    bereiche = k['bereiche']

    # Die Bereiche eines Fachs werden abgeleitet, nie doppelt gepflegt.
    faecher = []
    for f in k['pruefungsfaecher']:
        f = dict(f)
        f['bereiche'] = [b['id'] for b in bereiche if b['pruefungsfach'] == f['id']]
        faecher.append(f)
    fachname = {f['id']: f['name'] for f in faecher}

    schultypen, termine = {}, []
    heute = datetime.date.today()
    for kanton, liste in k['schultypen'].items():
        aus = []
        for e in liste:
            p = pruefungen.get(e['pruefung'])
            if p is None:
                raise SystemExit(f"Schultyp {e['id']} verweist auf die Prüfung "
                                 f"{e['pruefung']}, die es nicht gibt")
            teile = [t for t in p['teile'] if t.get('angeboten', True)]
            fl = list(dict.fromkeys(t['pruefungsfach'] for t in teile))
            jeFach = {}
            for fach in fl:
                des_fachs = [t for t in teile if t['pruefungsfach'] == fach]
                streng = min(des_fachs, key=_rang)
                jeFach[fach] = bedingungen_aus(
                    streng, [t.get('bemerkung', '') for t in des_fachs])
            aus.append({
                'id': e['id'], 'name': e['name'],
                'pruefung': p.get('kuerzel') or p['name'],
                'kuerzel': p.get('kuerzel', ''),
                'pruefungsfaecher': fl,
                'bedingungen': (bedingungen_aus(teile[0], [teile[0].get('bemerkung', '')])
                                if teile else bedingungen_aus({})),
                'aufsatzarten': p.get('aufsatzarten', []),
                'bereiche': list(dict.fromkeys(b for t in teile for b in t.get('bereiche', []))),
                'bedingungenJeFach': jeFach,
                'pruefungId': p['id'],
                'faecherZeile': ' · '.join(fachname.get(x, x) for x in fl),
                'teile': teile,
                'wahl': p.get('wahl', []),
            })
            # Termine haengen an der Pruefung; die App will sie je Schultyp.
            eintraege = [t for t in k['termine'] if t['pruefung'] == p['id']]
            gebaut = []
            for t in eintraege:
                tag = t.get('datum') or t.get('bis')
                if not tag: continue
                gebaut.append({'kanton': kanton, 'schultyp': e['id'], 'datum': tag,
                               'bemerkung': t.get('bemerkung', ''),
                               'session': t.get('session', 'fruehling'),
                               'genau': t.get('datum') is not None})
            gebaut.sort(key=lambda t: t['datum'])
            kuenftig = [t for t in gebaut
                        if datetime.date.fromisoformat(t['datum']) >= heute]
            termine += (kuenftig or gebaut[-1:])
        schultypen[kanton] = aus

    return {'kantone': k['kantone'], 'pruefungen': k['pruefungen'],
            'schultypen': schultypen, 'termine': termine,
            'pruefungsfaecher': faecher, 'bereiche': bereiche}


def standard_kanton():
    k = _lies('katalog.json')
    aktiv = [x for x in k['kantone'] if x.get('aktiv')]
    return (aktiv or k['kantone'])[0]['kuerzel']


def baeume():
    aus = {}
    for datei in _lies('themen', 'index.json')['dateien']:
        b = _lies('themen', datei)
        b['_datei'] = datei
        aus[b['fach']] = b
    return aus


def tipps():
    """Die Seiten fuer Pruefungsteile, die man nicht antippen kann —
       Hoerverstehen und muendliche Pruefungen. Ein Bereich mit
       `art: "tipps"` zeigt genau auf eine davon."""
    aus = {}
    for datei in _lies('tipps', 'index.json')['dateien']:
        t = _lies('tipps', datei)
        aus[t['bereich']] = t
    return aus


def vorlagen():
    aus = []
    for datei in _lies('templates', 'vorlagen.index.json')['dateien']:
        aus += _lies('templates', datei)
    return aus


def bloecke():
    aus = []
    for datei in _lies('templates', 'bloecke.index.json')['dateien']:
        aus += _lies('templates', datei)
    return aus


if __name__ == '__main__':
    a = aufgeloest()
    print('Standardkanton:', standard_kanton())
    for kanton, liste in a['schultypen'].items():
        for s in liste:
            print(f"  {kanton} {s['id']:<12} {s['pruefung'][:34]:<36} "
                  f"{s['faecherZeile']}")
