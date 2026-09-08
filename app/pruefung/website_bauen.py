#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baut die Website aus ihren Quellen.

Zwei Ergebnisse aus denselben Quellen:

1. **Die Seiten** — `index.html`, `schulen.html`, `preise.html` … Jede
   ist eine richtige Datei mit eigener Adresse, damit eine Schule einen
   Link weitergeben und eine Suchmaschine die Seite finden kann.

2. **`StudySwiss-Website.html`** — alles in einer Datei, im Betrieb ohne
   Server. Damit lässt sich die ganze Website anschauen und die
   Schul-Strecke durchklicken, ohne dass etwas läuft. Dieselbe Rolle wie
   `StudySwiss-Vorschau.html` für die App.

Warum ein Bauskript und nicht acht Dateien von Hand: Kopfzeile und Fuss
stehen sonst achtmal da und laufen beim ersten Umbau auseinander. Die
Icons stehen ebenfalls nur einmal — sie werden aus `js/hilfen.js`
gelesen, damit Python und JavaScript nie zwei Wahrheiten haben.

    app/pruefung/website_bauen.py            bauen
    app/pruefung/website_bauen.py --pruefen  nur prüfen, ob es aktuell ist
"""
from __future__ import annotations
import io, json, re, sys, hashlib
from pathlib import Path

HIER = Path(__file__).resolve().parent
WURZEL = HIER.parent                      # app/
WEB = WURZEL / 'website'
QUELLE = WEB / 'quelle'
RESSOURCEN = WURZEL / 'backend/src/main/resources'

# Welche Seite welchen Titel, welche Beschreibung und welche Skripte hat.
# Die Reihenfolge ist die Reihenfolge im Menü und in der Einzeldatei.
SEITEN = [
    dict(name='index',      quelle='start',       titel='StudySwiss — Vorbereitung auf die Aufnahmeprüfung',
         beschreibung='Übe genau den Stoff, den dein Kanton prüft. Zwölf Kantone, '
                      '7’537 Aufgaben, keine Noten. Ein Fach bleibt gratis.',
         js=[]),
    dict(name='schulen',    quelle='schulen',     titel='Für Schulen — StudySwiss',
         beschreibung='Schullizenzen ab Fr. 45.– je Schülerin und Schuljahr. Offerte, '
                      'Bestellung mit Bestellnummer, Rechnung auf 30 Tage.',
         js=['rechner']),
    dict(name='kantone',    quelle='kantone',     titel='Kantone und Prüfungen — StudySwiss',
         beschreibung='Zwölf Kantone, ihre Aufnahmeprüfungen, Fächer und Termine — '
                      'und was StudySwiss dafür bereithält.',
         js=['kantone']),
    dict(name='preise',     quelle='preise',      titel='Preise — StudySwiss',
         beschreibung='Fr. 129.– bis zur Prüfung, ein Fach vollständig gratis, '
                      'Schullizenzen ab Fr. 45.–.',
         js=['preise-seite', 'rechner']),
    dict(name='kaufen',     quelle='kaufen',      titel='Plus kaufen — StudySwiss',
         beschreibung='Prüfungs-Pass, Familien-Pass oder monatlich — mit Karte '
                      'oder TWINT, ohne Konto.',
         js=['preise-seite', 'kaufen']),
    dict(name='bestellen',  quelle='bestellen',   titel='Offerte und Bestellung — StudySwiss',
         beschreibung='Offerte erstellen, bestellen und die Rechnung erhalten — '
                      'in fünf Schritten, ohne Konto.',
         js=['beleg', 'bestellen']),
    dict(name='verwaltung', quelle='verwaltung',  titel='Schulverwaltung — StudySwiss',
         beschreibung='Lizenzen verteilen, Codes drucken, Rechnungen wiederfinden '
                      'und sehen, woran die Klasse hängt.',
         js=['beleg', 'verwaltung']),
    dict(name='lernen',     quelle='lernen',      titel='Lernen — StudySwiss',
         beschreibung='Die Lern-App im Browser. Derselbe Fortschritt wie auf dem '
                      'Telefon, weil es dasselbe Konto ist.',
         js=['antwort', 'uebung', 'selbsttest', 'standort', 'aufsatz', 'lernen']),
    dict(name='konto',      quelle='konto',       titel='Anmelden — StudySwiss',
         beschreibung='Mit Apple, mit Google oder ohne Konto weiterlernen.',
         js=['konto']),
    dict(name='recht',      quelle='recht',       titel='AGB, Datenschutz und Impressum — StudySwiss',
         beschreibung='Allgemeine Geschäftsbedingungen, Datenschutzerklärung und Impressum von StudySwiss — vollständig und in einfacher Sprache.',
         js=[]),
]

STILE = ['marke', 'bausteine', 'seite', 'antwort', 'beleg']
GRUND_JS = ['hilfen', 'zustand', 'preise', 'api', 'demo', 'seite']


def lies(p: Path) -> str:
    return io.open(p, encoding='utf-8').read()


# ---------------------------------------------------------------- Icons
def icons_aus_js() -> dict[str, str]:
    """Die Icon-Pfade stehen in `js/hilfen.js`. Sie hier ein zweites Mal
       zu pflegen wäre genau die Sorte doppelter Angabe, die früher oder
       später auseinanderläuft (§9)."""
    quelle = lies(WEB / 'js/hilfen.js')
    block = re.search(r'const ICON = \{(.*?)\n\};', quelle, re.S)
    if not block:
        raise SystemExit('ICON-Liste in js/hilfen.js nicht gefunden')
    return dict(re.findall(r"(\w+):\s*'([^']+)'", block.group(1)))


def icon_svg(name: str, icons: dict[str, str], groesse: int = 20) -> str:
    d = icons.get(name) or icons['info']
    return (f'<svg width="{groesse}" height="{groesse}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true"><path d="{d}"/></svg>')


def setze_icons(text: str, icons: dict[str, str]) -> str:
    return re.sub(r'\{\{icon:(\w+)\}\}', lambda m: icon_svg(m.group(1), icons), text)


# ------------------------------------------------------------- Markdown
def markdown(text: str) -> str:
    """Ein kleiner Wandler für die Rechtstexte.

       Absichtlich klein: Er kann Überschriften, Absätze, Listen,
       Tabellen, Fett, Code und Links — genau das, was in `agb.md` und
       `datenschutz.md` vorkommt. Ein vollständiger Markdown-Wandler
       wäre eine Abhängigkeit für eine Seite, und diese Seite ändert
       sich zweimal im Jahr.

       Der Grund, warum überhaupt gewandelt wird: Der Rechtstext darf
       nur an EINER Stelle stehen. Zwei Fassungen laufen auseinander,
       und dann gilt die, an die niemand gedacht hat."""
    zeilen = text.split('\n')
    aus, i = [], 0

    def inline(t: str) -> str:
        t = (t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
        t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
        t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
        t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
        return t

    while i < len(zeilen):
        z = zeilen[i]
        if not z.strip():
            i += 1; continue
        if z.startswith('#'):
            # Eine Stufe tiefer: Der Rechtstext ist ein Abschnitt der Seite,
            # nicht die Seite. Zwei <h1> auf einem Blatt verwirren jedes
            # Vorleseprogramm.
            stufe = min(len(z) - len(z.lstrip('#')) + 1, 4)
            aus.append(f'<h{stufe}>{inline(z.lstrip("#").strip())}</h{stufe}>')
            i += 1; continue
        if z.lstrip().startswith('|'):
            tabelle = []
            while i < len(zeilen) and zeilen[i].lstrip().startswith('|'):
                tabelle.append(zeilen[i]); i += 1
            aus.append(tabelle_html(tabelle, inline)); continue
        if z.lstrip().startswith(('- ', '* ')):
            punkte = []
            while i < len(zeilen) and zeilen[i].lstrip().startswith(('- ', '* ')):
                punkte.append(inline(zeilen[i].lstrip()[2:].strip())); i += 1
            aus.append('<ul>' + ''.join(f'<li>{p}</li>' for p in punkte) + '</ul>')
            continue
        if z.lstrip().startswith('>'):
            zitat = []
            while i < len(zeilen) and zeilen[i].lstrip().startswith('>'):
                zitat.append(inline(zeilen[i].lstrip()[1:].strip())); i += 1
            aus.append('<blockquote>' + ' '.join(zitat) + '</blockquote>'); continue
        if set(z.strip()) <= {'-'} and len(z.strip()) >= 3:
            aus.append('<hr>'); i += 1; continue
        absatz = []
        while i < len(zeilen) and zeilen[i].strip() and not zeilen[i].startswith('#') \
              and not zeilen[i].lstrip().startswith(('|', '- ', '* ', '>')):
            absatz.append(zeilen[i].strip()); i += 1
        aus.append('<p>' + inline(' '.join(absatz)) + '</p>')
    return '\n'.join(aus)


def tabelle_html(zeilen: list[str], inline) -> str:
    reihen = [[z.strip() for z in r.strip().strip('|').split('|')] for r in zeilen]
    reihen = [r for r in reihen if not all(set(z) <= set('-: ') for z in r)]
    if not reihen:
        return ''
    kopf, rest = reihen[0], reihen[1:]
    th = ''.join(f'<th>{inline(z)}</th>' for z in kopf)
    tr = ''.join('<tr>' + ''.join(f'<td>{inline(z)}</td>' for z in r) + '</tr>'
                 for r in rest)
    return f'<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def setze_markdown(text: str) -> str:
    def ersetze(m):
        pfad = WURZEL / 'start' / f'{m.group(1)}.md'
        if not pfad.exists():
            return f'<p><b>Fehlt:</b> {pfad.name}</p>'
        return markdown(lies(pfad))
    return re.sub(r'\{\{md:([\w-]+)\}\}', ersetze, text)


# ------------------------------------------------------------- Engine
VORSCHAU = WURZEL / 'preview/StudySwiss-Vorschau.html'

# Welcher Skriptblock der Vorschau was enthält, und woran man ihn erkennt.
# Die Zahl allein wäre zu wenig: Verschiebt sich ein Block, holte das
# Skript stillschweigend den falschen — und die Website rechnete anders
# als die App, ohne dass es jemand merkte.
ENGINE_BLOECKE = [
    (0, 'class Rng',               'Rng, Ausdruck, Generator'),
    (3, 'function ziehe(',         'Einstiegspunkte und Katalog'),
    (4, 'function bewerteText(',   'Deutsch-Engine'),
    (6, 'function zieheMathe(',    'die Formate aus den ZAP-Trainern'),
    (7, 'function bewerteAlles(',  'Bewertung aller Formate'),
]
DATEN_BLOECKE = [
    (1, 'const TEMPLATES',   'Zahlen-Templates, Themenbäume, Katalog'),
    (2, 'const TEXTBLOECKE', 'die Blöcke im Textformat'),
]


def vorschau_bloecke() -> list[str]:
    return re.findall(r'<script>(.*?)</script>', lies(VORSCHAU), re.S)


def engine_js() -> str:
    """Die Engine der Vorschau, für die Website herausgezogen.

       **Nicht abgeschrieben, sondern geholt.** §8 hält drei Fassungen der
       Engine in Gleichschritt — Kotlin, JavaScript, Python. Eine vierte
       wäre eine vierte Baustelle. Die Website benutzt darum wörtlich
       dieselben Zeilen wie die Vorschau; `gleichlauf.py` prüft sie
       ohnehin schon Zeichen für Zeichen gegen Python.

       Was die Website dazugibt, ist die Ansicht — so, wie Flutter eine
       eigene Ansicht über derselben Engine hat."""
    bloecke = vorschau_bloecke()
    teile = []
    for nummer, merkmal, was in ENGINE_BLOECKE:
        if nummer >= len(bloecke) or merkmal not in bloecke[nummer]:
            raise SystemExit(
                f'Der Vorschau-Block {nummer} enthält «{merkmal}» nicht mehr. '
                f'Die Engine der Website würde damit still von der App '
                f'abweichen — bitte ENGINE_BLOECKE in website_bauen.py nachziehen.')
        teile.append(f'/* ---- aus der Vorschau, Block {nummer}: {was} ---- */\n'
                     + bloecke[nummer].strip())
    return (KOPF_ENGINE + '\n\n' + '\n\n'.join(teile) + '\n')


KOPF_ENGINE = """/* StudySwiss — die Engine, aus der Vorschau geholt
   ==================================================================
   ERZEUGT von `app/pruefung/website_bauen.py`. Nicht von Hand ändern —
   die Quelle ist `app/preview/StudySwiss-Vorschau.html`.

   Warum geholt und nicht geschrieben: §8 hält drei Fassungen der Engine
   in Gleichschritt (Kotlin, JavaScript, Python), und `gleichlauf.py`
   vergleicht sie Zeichen für Zeichen. Eine vierte Fassung wäre eine
   vierte Baustelle — und die erste, die still abweicht.

   Die Website benutzt also dieselben Zeilen wie die App-Vorschau. Was
   sie selbst mitbringt, ist die Ansicht: `js/antwort.js` baut die
   Eingabeflächen für den Browser, so wie `widgets/antwortflaeche.dart`
   sie für Flutter baut. Zwei Ansichten, eine Engine.

   Gebraucht wird von aussen: `Z` mit `profil`, `versuche` und
   `selbsttestFach` — siehe `js/zustand.js`.                          */
"""


def inhalt_js() -> str:
    """Der Inhalt für den Betrieb ohne Server.

       Dieselben Daten wie in der App-Vorschau, aus denselben Zeilen
       geholt. Nur die Einzeldatei lädt sie; die ausgelieferte Website
       holt ihre Aufgaben vom Server, wo sie hingehören — dort reist die
       Lösung nie mit (§4.10)."""
    bloecke = vorschau_bloecke()
    teile = []
    for nummer, merkmal, was in DATEN_BLOECKE:
        if nummer >= len(bloecke) or merkmal not in bloecke[nummer]:
            raise SystemExit(f'Der Vorschau-Block {nummer} enthält «{merkmal}» nicht mehr.')
        teile.append(f'/* ---- aus der Vorschau, Block {nummer}: {was} ---- */\n'
                     + bloecke[nummer].strip())
    return ('/* StudySwiss — Inhalt für den Betrieb ohne Server\n'
            '   ERZEUGT von `app/pruefung/website_bauen.py` aus der App-Vorschau.\n'
            '   Nur die Einzeldatei lädt diese Datei. Die ausgelieferte Website\n'
            '   holt ihre Aufgaben vom Server — dort reist die Lösung nie mit. */\n\n'
            + '\n\n'.join(teile) + '\n')


# ------------------------------------------------------------ Demo-Daten
def demo_daten() -> str:
    """Die Vorschau zeigt echte Kantone, Fächer und Themen. Erfundene
       wären eine Falle: Man prüft die Seite, findet sie gut, und im
       Betrieb steht etwas anderes da."""
    katalog = json.loads(lies(RESSOURCEN / 'katalog.json'))
    kantone = [
        dict(id=k.get('id') or k.get('kuerzel'), name=k['name'],
             aktiv=bool(k.get('aktiv')),
             pruefungen=[p.get('name') for p in katalog.get('pruefungen', [])
                         if p.get('kanton') == (k.get('id') or k.get('kuerzel'))])
        for k in katalog.get('kantone', [])
    ]

    # Bereiche je Kanton, damit die Kantonsseite etwas Belegtes zeigt.
    bereiche = {b['id']: b.get('name', b['id']) for b in katalog.get('bereiche', [])}

    # Themen mit der höchsten Fehlerquote — für den Schul-Bericht. Die
    # Namen sind echt, die Quoten sind Muster und heissen auch so.
    schwach = []
    baum_index = json.loads(lies(RESSOURCEN / 'themen/index.json'))
    dateien = baum_index['dateien'] if isinstance(baum_index, dict) else baum_index
    for datei in dateien[:6]:
        baum = json.loads(lies(RESSOURCEN / 'themen' / datei))
        for o in baum.get('oberthemen', [])[:2]:
            for u in o.get('unterthemen', [])[:1]:
                schwach.append(dict(fach=baum.get('fach'), code=u['code'],
                                    name=u['name'], oberthema=o.get('name')))
    schwach = schwach[:6]
    for i, s in enumerate(schwach):
        s['fehlerquote'] = [62, 54, 48, 41, 37, 33][i % 6]

    # Echte Aufgaben fuer die Vorschau. Ohne sie waere der Lernbereich
    # eine Ansammlung leerer Karten — und wer die Website beurteilen soll,
    # kaeme an der Stelle nicht weiter, auf die es am meisten ankommt.
    #
    # Wenige und kleine: Die Vorschau soll die Seite zeigen, nicht den
    # ganzen Bestand mitschleppen. Fuer alles Weitere gibt es den Server.
    aufgaben = demo_aufgaben()

    return 'const DEMO_DATEN = ' + json.dumps(dict(
        kantone=kantone, bereiche=bereiche, schwacheThemen=schwach,
        faecher=demo_faecher(), aufgaben=aufgaben,
    ), ensure_ascii=False, indent=1) + ';\n'


def demo_faecher() -> list[dict]:
    """Die Faecherkarten der Uebersicht — echte Namen, gemuetliche Zahlen."""
    return [
        dict(id='mathematik', name='Mathematik',
             bereiche=['Mathematik'], themen=87, erledigt=34),
        dict(id='deutsch', name='Deutsch',
             bereiche=['Sprachbetrachtung', 'Textverständnis', 'Aufsatz'],
             themen=81, erledigt=22),
    ]


def demo_aufgaben() -> list[dict]:
    """Ein Dutzend echte Blockaufgaben, quer durch die Formate.

       Sie kommen aus den Vorlagen, nicht aus der Fantasie: Eine Vorschau
       mit erfundenen Aufgaben laesst sich pruefen und gutheissen, und im
       Betrieb sieht es dann anders aus."""
    index = json.loads(lies(RESSOURCEN / 'templates/bloecke.index.json'))
    dateien = index['dateien'] if isinstance(index, dict) else index

    # Je vier aus drei Ecken, damit die Vorschau alle drei Bilder zeigt:
    # Rechnen mit gesetzten Bruechen, Sprachbetrachtung und ein
    # Textverstaendnis MIT Lesetext — nur dort sieht man, dass Text und
    # Frage am Laptop nebeneinander stehen.
    ecken = ['mathematik-terme', 'deutsch-wortarten', 'textverstaendnis']
    aus: list[dict] = []
    for ecke in ecken:
        genommen = 0
        for datei in dateien:
            if ecke not in datei or genommen >= 4:
                continue
            for block in json.loads(lies(RESSOURCEN / 'templates' / datei)):
                if block.get('format') != 'einfachauswahl' or genommen >= 4:
                    continue
                for a in block['aufgaben'][:4]:
                    if genommen >= 4:
                        break
                    aus.append(dict(
                        ref=f"{block['templateId']}:{len(aus) + 1}",
                        fach=block.get('fach'),
                        oberthema=block.get('thema'),
                        format=block['format'],
                        stamm=a['stamm'],
                        text=block.get('text') or a.get('text'),
                        optionen=a.get('optionen', []),
                        loesung=(a.get('loesung') or [None])[0],
                        erklaerung=a.get('erklaerung', ''),
                        fehler=a.get('fehler', []),
                        hinweise=block.get('hinweise', []),
                    ))
                    genommen += 1
    return aus
    return aus[:12]


# ---------------------------------------------------------------- Bauen
def baue_seite(s: dict, icons: dict, rahmen: str, einzeln: bool) -> str:
    inhalt = setze_markdown(setze_icons(lies(QUELLE / f"{s['quelle']}.html"), icons))
    eule = lies(WEB / 'bilder/eule-kopf.svg').strip()

    if einzeln:
        stile = skripte = ''      # in der Einzeldatei stehen sie einmal ganz oben
    else:
        stile = '\n'.join(f'<link rel="stylesheet" href="css/{n}.css">' for n in STILE)
        js = GRUND_JS + s['js']
        skripte = '\n'.join(f'<script src="js/{n}.js"></script>' for n in js)

    return (rahmen
            .replace('{{titel}}', s['titel'])
            .replace('{{beschreibung}}', s['beschreibung'])
            .replace('{{stile}}', stile)
            .replace('{{skripte}}', skripte)
            .replace('{{eule}}', eule)
            .replace('{{inhalt}}', inhalt))


def baue_einzeldatei(icons: dict, rahmen: str) -> str:
    """Alle Seiten in einer Datei, mit einem winzigen Wegweiser dazwischen.

       Der Wegweiser tauscht nur den Inhalt von <main> aus und ruft
       `seiteNeuAufbauen()`. Er ist bewusst so klein: Er soll die
       Vorschau möglich machen, nicht ein zweites Verhalten einführen,
       das die echte Website nicht hat."""
    stile = '<style>\n' + '\n'.join(lies(WEB / f'css/{n}.css') for n in STILE) + '\n</style>'
    alle_js = GRUND_JS + [j for s in SEITEN for j in s['js']]
    gesehen, js_liste = set(), []
    for n in alle_js:
        if n not in gesehen:
            gesehen.add(n); js_liste.append(n)

    vorlagen = []
    for s in SEITEN:
        inhalt = setze_markdown(setze_icons(lies(QUELLE / f"{s['quelle']}.html"), icons))
        vorlagen.append(f'<template data-seite="{s["name"]}" data-titel="{s["titel"]}">'
                        f'\n{inhalt}\n</template>')

    # Engine und Inhalt stehen NUR in der Einzeldatei. Die ausgelieferte
    # Website bekommt sie nicht: Mit dem Inhalt reisten die Lösungen mit,
    # und §4.10 sagt, dass sie das nie tun. Wer sie im Quelltext nachlesen
    # kann, übt nicht mehr ehrlich.
    skript = ('<script>window.STUDYSWISS_DEMO = true;</script>\n<script>\n'
              + lies(WEB / 'js/inhalt.js') + '\n'
              + lies(WEB / 'js/engine.js') + '\n'
              + '\n'.join(lies(WEB / f'js/{n}.js') for n in js_liste)
              + '\n' + demo_daten()
              + '\n' + WEGWEISER + '\n</script>')

    erste = SEITEN[0]
    seite = (rahmen
             .replace('{{titel}}', 'StudySwiss — Website-Vorschau')
             .replace('{{beschreibung}}', 'Die ganze Website in einer Datei, ohne Server.')
             .replace('{{stile}}', stile)
             .replace('{{eule}}', lies(WEB / 'bilder/eule-kopf.svg').strip())
             .replace('{{inhalt}}', setze_markdown(setze_icons(lies(QUELLE / f"{erste['quelle']}.html"), icons)))
             .replace('{{skripte}}', '\n'.join(vorlagen) + '\n' + skript))
    return seite


WEGWEISER = r'''
/* --- Wegweiser der Einzeldatei --------------------------------------
   Nur in `StudySwiss-Website.html`. Er fängt Klicks auf `*.html` ab und
   tauscht den Inhalt gegen die passende <template>-Vorlage. Die echte
   Website lädt an dieser Stelle einfach eine neue Datei. */
(function () {
  const seiten = {};
  document.querySelectorAll('template[data-seite]').forEach(t => {
    seiten[t.dataset.seite] = t;
  });
  function zeige(name, ersteAnzeige) {
    const t = seiten[name] || seiten.index;
    if (!t) return false;
    document.getElementById('inhalt').innerHTML = t.innerHTML;
    document.title = t.dataset.titel || document.title;
    if (!ersteAnzeige) window.scrollTo({ top: 0, behavior: 'instant' });
    seiteNeuAufbauen();
    return true;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const href = a.getAttribute('href') || '';
    const m = href.match(/^([\w-]+)\.html(\?[^#]*)?(#.*)?$/);
    if (!m) return;
    e.preventDefault();
    const name = m[1] === 'index' ? 'index' : m[1];
    if (m[2]) history.replaceState({}, '', location.pathname + m[2]);
    else history.replaceState({}, '', location.pathname);
    zeige(name);
    if (m[3]) {
      const ziel = document.querySelector(m[3]);
      if (ziel) ziel.scrollIntoView({ behavior: 'smooth' });
    }
  });
  // Die Bestellstrecke wechselt den Schritt über `history.pushState`.
  window.addEventListener('popstate', () => seiteNeuAufbauen());
})();
'''


def main() -> int:
    nur_pruefen = '--pruefen' in sys.argv
    icons = icons_aus_js()
    rahmen = lies(QUELLE / 'rahmen.html')

    erzeugt: dict[Path, str] = {}
    for s in SEITEN:
        erzeugt[WEB / f"{s['name']}.html"] = baue_seite(s, icons, rahmen, einzeln=False)
    erzeugt[WEB / 'js/engine.js'] = engine_js()
    erzeugt[WEB / 'js/inhalt.js'] = inhalt_js()
    erzeugt[WEB / 'js/demo-daten.js'] = demo_daten()
    # Zuerst schreiben, dann die Einzeldatei bauen: Sie liest engine.js und
    # inhalt.js von der Platte, und eine Datei vom letzten Lauf wäre genau
    # der Fehler, den niemand sieht.
    for pfad, text in list(erzeugt.items()):
        if pfad.suffix == '.js' and not nur_pruefen:
            pfad.parent.mkdir(parents=True, exist_ok=True)
            if not pfad.exists() or lies(pfad) != text:
                io.open(pfad, 'w', encoding='utf-8').write(text)
    erzeugt[WEB / 'StudySwiss-Website.html'] = baue_einzeldatei(icons, rahmen)

    veraltet = []
    for pfad, text in erzeugt.items():
        alt = lies(pfad) if pfad.exists() else None
        if alt != text:
            veraltet.append(pfad.name)
            if not nur_pruefen:
                pfad.parent.mkdir(parents=True, exist_ok=True)
                io.open(pfad, 'w', encoding='utf-8').write(text)

    if nur_pruefen:
        if veraltet:
            print('Die gebaute Website ist nicht auf dem Stand der Quellen:')
            for n in veraltet:
                print('  ', n)
            print('\n  app/pruefung/website_bauen.py')
            return 1
        print('Website ist auf dem Stand der Quellen.')
        return 0

    gross = erzeugt[WEB / 'StudySwiss-Website.html']
    print(f'{len(SEITEN)} Seiten gebaut · Einzeldatei '
          f'{len(gross.encode()) / 1024:.0f} kB')
    for n in veraltet:
        print('  neu:', n)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
