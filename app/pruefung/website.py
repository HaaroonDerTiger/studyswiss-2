#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prüft die Website.

Dieselbe Rolle wie `dart_pruefen.py` für Flutter: Es gibt keinen
Compiler, der eine tote Verknüpfung oder ein Feld ohne Beschriftung
findet. Diese Prüfung ersetzt ihn — und sie prüft genau die Fehler, die
auf einer Website still bleiben und darum nie gemeldet werden:

* eine Verknüpfung auf eine Seite, die es nicht gibt
* ein Platzhalter `{{…}}`, den niemand ersetzt hat
* ein Eingabefeld ohne Beschriftung — ein Vorleseprogramm sagt dann
  nur «Eingabefeld», und eine Schulsekretärin, die mit der Tastatur
  arbeitet, weiss nicht, was hineingehört
* ein Preis, der im Quelltext steht statt in `preise.js` (§9)
* «ß», Euro und die Sie-Form dort, wo die App duzt (§2.1)
* die gebaute Seite ist nicht auf dem Stand ihrer Quelle

    app/pruefung/website.py
"""
from __future__ import annotations
import io, re, sys, subprocess
from pathlib import Path

HIER = Path(__file__).resolve().parent
WEB = HIER.parent / 'website'

# Was `website_bauen.py` erzeugt. Diese Dateien werden nicht wie Quelle
# geprüft: `engine.js` ist wörtlich die der App-Vorschau, `inhalt.js` sind
# deren Daten. Wer sie an den Regeln für handgeschriebene Dateien misst,
# meldet Fehler, die es in der Quelle gar nicht gibt.
ERZEUGT = {'engine.js', 'inhalt.js', 'demo-daten.js'}

fehler: list[str] = []
warnungen: list[str] = []


def F(wo: str, was: str) -> None:
    fehler.append(f'{wo}: {was}')


def W(wo: str, was: str) -> None:
    warnungen.append(f'{wo}: {was}')


def lies(p: Path) -> str:
    return io.open(p, encoding='utf-8').read()


# ------------------------------------------------------------- Sprache
# Dieselbe Liste wie in `tore.py`, für dieselben Gründe. Sie hier zu
# wiederholen wäre eine zweite Wahrheit — darum wird sie importiert.
sys.path.insert(0, str(HIER))
from tore import VERBOTEN, UMSCHRIFT, SIE_ANREDE, ohne_rede  # noqa: E402

# Die Schulseiten siezen mit Absicht: Dort bestellt eine Behörde, keine
# Jugendliche. Geduzt wird, wo die App duzt — im Lernbereich und auf der
# Startseite.
# Die Namen der GEBAUTEN Seiten, nicht der Quellen: `start.html` wird zu
# `index.html`. Beim ersten Versuch stand hier «start», und das Tor
# schwieg zu jeder Sie-Form auf der Startseite (§8: einmal absichtlich
# brechen — genau dafür).
DUZENDE_SEITEN = {'index', 'lernen', 'konto'}


def pruefe_sprache(name: str, text: str) -> None:
    sichtbar = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', ' ', text)
    for muster, wort, hinweis in VERBOTEN:
        if wort in ('4/6',):        # Brüche kommen auf der Website nicht vor
            continue
        if muster.search(sichtbar):
            F(name, f'«{wort}» gefunden — {hinweis}')
    prosa = re.sub(r'<[^>]+>', ' ', sichtbar)
    # Bezeichner bleiben ASCII (§2.1): `rabatt-rueckwaerts:8812` ist eine
    # Aufgabenkennung, kein Fliesstext. Ein Tor, das sie anmahnt, schlägt
    # falschen Alarm — und ein Prüfer mit falschem Alarm ist schlimmer als
    # keiner (§8).
    prosa = re.sub(r'\b[a-z0-9]+(?:-[a-z0-9]+)+(?::\d+)?\b', ' ', prosa)
    for m in sorted({m.group(0) for m in UMSCHRIFT.finditer(prosa)}):
        F(name, f'«{m}» ist eine Umschrift — schreibe den Umlaut aus')
    if name in DUZENDE_SEITEN:
        for m in sorted({m.group(0) for m in SIE_ANREDE.finditer(ohne_rede(prosa))}):
            F(name, f'«{m}» — hier wird geduzt (§2.1)')


# ------------------------------------------------------------ Struktur
def pruefe_seite(pfad: Path, seiten: set[str]) -> None:
    name = pfad.stem
    text = lies(pfad)

    # --- Platzhalter --------------------------------------------------
    for m in set(re.findall(r'\{\{[^}]+\}\}', text)):
        F(name, f'Platzhalter {m} ist nicht ersetzt worden')

    # --- Verknüpfungen ------------------------------------------------
    for ziel in set(re.findall(r'href="([^"#?][^"]*?)"', text)):
        if ziel.startswith(('http', 'mailto:', 'tel:', '//', 'data:')):
            continue
        z = ziel.split('#')[0].split('?')[0]
        if not z:
            continue
        if z.endswith('.html'):
            if z[:-5] not in seiten:
                F(name, f'Verknüpfung auf «{z}» — diese Seite gibt es nicht')
        elif not (WEB / z).exists():
            F(name, f'Verknüpfung auf «{z}» — diese Datei gibt es nicht')

    # --- Kopf ----------------------------------------------------------
    if '<html lang="de-CH">' not in text:
        F(name, 'die Seitensprache fehlt oder ist nicht de-CH')
    if not re.search(r'<meta name="description" content="[^"]{40,}"', text):
        F(name, 'die Beschreibung fehlt oder ist zu kurz für eine Suchmaschine')
    # Eine Seite hat eine erste Überschrift. Eine Strecke aus Schritten
    # zeigt aber immer nur einen Schritt — dort gehört je Schritt eine,
    # und alles andere wäre für ein Vorleseprogramm schlechter, nicht besser.
    schritte = re.findall(r'<section[^>]+data-(?:schritt|kauf|lern|teil)="[^"]+"[^>]*>',
                          text)
    if '<h1' not in text:
        W(name, 'kein <h1> — jede Seite braucht genau eine erste Überschrift')
    elif not schritte and text.count('<h1') > 1:
        W(name, f'{text.count("<h1")} mal <h1> — genau eine gehört auf eine Seite')
    elif schritte and text.count('<h1') > len(schritte):
        W(name, f'{text.count("<h1")} mal <h1> bei {len(schritte)} Schritten')

    # --- Bedienbarkeit --------------------------------------------------
    # Ein Feld ohne Beschriftung ist für ein Vorleseprogramm ein leeres
    # Kästchen. Erlaubt sind `<label>` drumherum oder `aria-label`.
    for feld in re.findall(r'<(input|select|textarea)\b[^>]*>', text):
        if 'type="hidden"' in feld or 'type="checkbox"' in feld or 'type="radio"' in feld:
            continue
        if 'aria-label' in feld:
            continue
        kennung = re.search(r'\bid="([^"]+)"', feld)
        umgeben = ('<label class="feld"' in text or '<label' in text)
        if not umgeben and not kennung:
            F(name, f'Eingabefeld ohne Beschriftung: {feld[:70]}')
    for bild in re.findall(r'<img\b[^>]*>', text):
        if 'alt=' not in bild:
            F(name, f'Bild ohne Alternativtext: {bild[:70]}')
    for knopf in re.findall(r'<button\b[^>]*>\s*</button>', text):
        F(name, f'Knopf ohne Beschriftung: {knopf[:70]}')
    if 'class="spring"' not in text:
        W(name, 'kein Sprung zum Inhalt — Tastaturnutzer müssen durch das ganze Menü')

    pruefe_sprache(name, text)


# ------------------------------------------------------------- Preise
def ohne_kommentare(js: str) -> str:
    """Ein Preis in einem Beispiel («Fr. 24\'000.–») ist keiner im Code."""
    js = re.sub(r'/\*[\s\S]*?\*/', ' ', js)
    return re.sub(r'(?m)^\s*//.*$', ' ', js)


def bekannte_preise() -> set[int]:
    """Die Zahlen, die in `preise.js` stehen. Alles andere im Text ist
       eine zweite Wahrheit."""
    text = lies(WEB / 'js/preise.js')
    return {int(m) for m in re.findall(r'preis:\s*(\d+)', text)} | \
           {int(m) for m in re.findall(r'einzelpass:\s*(\d+)', text)} | \
           {int(m) for m in re.findall(r'preis:\s*(\d+)', lies(WEB / 'js/preise-seite.js'))}


def pruefe_preise() -> None:
    """§9: Kein Preis im Code. Er steht in `preise.js`, kommt von dort
       aus dem Server und wird sonst nirgends noch einmal getippt.

       Im Fliesstext einer Seite darf ein Preis stehen — «Fr. 129.– bis
       zur Prüfung» ist der Satz, wegen dem jemand klickt. Er muss dann
       aber mit `preise.js` übereinstimmen, sonst behauptet die
       Startseite etwas, das der Kauf nicht hält."""
    # Erzeugte Dateien sind keine Quelle. `inhalt.js` enthält die
    # Marktzahlen und Produktpreise der App-Vorschau; sie kämen dort aus
    # dem Laden und nicht aus `preise.js`.
    erlaubt = {'preise.js', 'preise-seite.js'} | ERZEUGT
    for js in sorted((WEB / 'js').glob('*.js')):
        if js.name in erlaubt:
            continue
        text = ohne_kommentare(lies(js))
        for m in re.finditer(r"Fr\.\s*\d[\d'’]*\.[–\d]", text):
            F(js.name, f'Preis «{m.group(0)}» im Quelltext — er gehört in preise.js')

    gueltig = bekannte_preise()
    for seite in sorted(WEB.glob('*.html')):
        if seite.name == 'StudySwiss-Website.html':
            continue
        sichtbar = re.sub(r'<script[\s\S]*?</script>', ' ', lies(seite))
        # Marktzahlen sind fremde Preise (§4.9: «Woher der Preis kommt»).
        # Sie gehören nicht in `preise.js` und dürfen dort nicht stehen.
        sichtbar = re.sub(r'<(\w+)[^>]*\bdata-fremdpreis\b[\s\S]*?</\1>', ' ', sichtbar)
        for m in re.finditer(r"Fr\.\s*(\d[\d'’]*)\.–", sichtbar):
            wert = int(m.group(1).replace("\'", '').replace('’', ''))
            if wert not in gueltig:
                W(seite.stem, f'«{m.group(0)}» im Text steht nicht in preise.js — '
                              f'beim Ändern der Preise mitziehen')


# ------------------------------------------------------- Rechenproben
def pruefe_rechnen() -> int:
    """Die Beträge auf einer Rechnung müssen stimmen, und zwar
       nachweislich. Die Proben laufen mit JavaScriptCore über genau die
       Dateien, die auch die Website lädt — nicht über eine Kopie."""
    probe = WEB / 'proben.js'
    if not probe.exists():
        W('proben.js', 'fehlt — die Rechenproben laufen nicht')
        return 0
    jsc = ('/System/Library/Frameworks/JavaScriptCore.framework/'
           'Versions/A/Helpers/jsc')
    if not Path(jsc).exists():
        W('proben.js', 'JavaScriptCore nicht gefunden, Proben übersprungen')
        return 0
    lauf = subprocess.run([jsc, str(probe)], capture_output=True, text=True, cwd=WEB)
    aus = (lauf.stdout or '') + (lauf.stderr or '')
    if lauf.returncode != 0 or 'FEHLER' in aus:
        for zeile in aus.splitlines():
            if 'FEHLER' in zeile or 'Exception' in zeile:
                F('Rechenprobe', zeile.strip())
    return len([z for z in aus.splitlines() if z.startswith('ok')])


# ------------------------------------------- Engine gegen Vorschau
def pruefe_engine() -> None:
    """Die Engine der Website muss Zeichen für Zeichen die der Vorschau sein.

       §8 hält drei Fassungen in Gleichschritt — Kotlin, JavaScript,
       Python — und `gleichlauf.py` vergleicht sie. Die Website benutzt
       darum keine vierte, sondern dieselbe. Diese Prüfung ist der
       Beweis: Weicht `js/engine.js` von der Vorschau ab, hat jemand sie
       von Hand angefasst, und die Website rechnete ab dann anders als
       die App — ohne dass es irgendwo aufgefallen wäre."""
    engine = WEB / 'js/engine.js'
    if not engine.exists():
        F('engine.js', 'fehlt — app/pruefung/website_bauen.py aufrufen')
        return
    vorschau = HIER.parent / 'preview/StudySwiss-Vorschau.html'
    if not vorschau.exists():
        return
    bloecke = re.findall(r'<script>(.*?)</script>', lies(vorschau), re.S)
    text = lies(engine)
    for nummer, merkmal in ((0, 'class Rng'), (3, 'function ziehe('),
                            (4, 'function bewerteText('), (6, 'function zieheMathe('),
                            (7, 'function bewerteAlles(')):
        if nummer >= len(bloecke):
            F('engine.js', f'Die Vorschau hat keinen Block {nummer} mehr')
            continue
        if bloecke[nummer].strip() not in text:
            F('engine.js', f'Block {nummer} («{merkmal}») weicht von der '
                           f'App-Vorschau ab — die Website würde anders rechnen '
                           f'als die App. website_bauen.py aufrufen.')


# ------------------------------------------- Vorschau gegen Betrieb
def pruefe_gleichstand() -> None:
    """Die Vorschau darf nicht grosszügiger sein als der Server.

       Sie spiegelt zwei Regeln, die im Backend stehen: die Preisstaffel
       und die Mindestgruppe für den Schul-Bericht. Läuft eine davon
       auseinander, prüft jemand die Vorschau, findet sie gut — und im
       Betrieb steht etwas anderes da. Beim ersten Lauf war genau das der
       Fall: Der Bericht der Vorschau zeigte Kennzahlen, die der Server
       verweigert."""
    kt = HIER.parent / 'backend/src/main/kotlin/ch/studyswiss/service/SchulService.kt'
    if not kt.exists():
        return
    kotlin = lies(kt)
    js_preise = lies(WEB / 'js/preise.js')
    js_demo = lies(WEB / 'js/demo.js')

    m = re.search(r'MINDESTGRUPPE\s*=\s*(\d+)', kotlin)
    j = re.search(r'MINDESTGRUPPE\s*=\s*(\d+)', js_demo)
    if m and j and m.group(1) != j.group(1):
        F('demo.js', f'Mindestgruppe {j.group(1)} statt {m.group(1)} wie im '
                     f'SchulService — die Vorschau zeigt dann einen Bericht, '
                     f'den der Server verweigert')

    kt_staffel = re.findall(r'PreisStufe\(ab = (\d+), preis = (\d+)', kotlin)
    js_staffel = re.findall(r'\{\s*ab:\s*(\d+),\s*preis:\s*(\d+)', js_preise)
    if kt_staffel and js_staffel and kt_staffel != js_staffel:
        F('preise.js', f'Die Staffel weicht vom SchulService ab: '
                       f'{js_staffel} statt {kt_staffel}')

    kt_mwst = re.search(r'mwstSatz.*?\?:\s*([\d.]+)', lies(HIER.parent /
                        'backend/src/main/kotlin/ch/studyswiss/Konfig.kt'))
    js_mwst = re.search(r'mwstSatz:\s*([\d.]+)', js_preise)
    if kt_mwst and js_mwst and kt_mwst.group(1) != js_mwst.group(1):
        W('preise.js', f'Mehrwertsteuersatz {js_mwst.group(1)} statt '
                       f'{kt_mwst.group(1)} wie in der Konfiguration')


def pruefe_keine_loesungen() -> None:
    """Die ausgelieferten Seiten dürfen `inhalt.js` nicht laden.

       §4.10: **Die Aufgabe reist nie mit ihrer Lösung.** `inhalt.js`
       enthält alle Templates und Blöcke — samt Lösungen und
       Fehlermustern. In der Einzeldatei-Vorschau ist das richtig, weil
       dort kein Server antwortet und die Datei sich selbst als Vorschau
       ausweist. Auf der ausgelieferten Website wäre es der Unterschied
       zwischen Üben und Abschreiben."""
    for seite in sorted(WEB.glob('*.html')):
        if seite.name == 'StudySwiss-Website.html':
            continue
        text = lies(seite)
        for verboten in ('js/inhalt.js', 'js/engine.js'):
            if verboten in text:
                F(seite.stem, f'lädt {verboten} — damit stünde die Lösung jeder '
                              f'Aufgabe im Quelltext der Seite (§4.10)')


# ------------------------------------------------------- Ein Skript
def pruefe_namen() -> None:
    """In der Einzeldatei stehen alle Skripte in EINEM `<script>`.

       Zwei gleiche Namen auf oberster Ebene sind dort kein Schönheits-
       fehler, sondern ein Abbruch beim Laden: Der Browser wirft
       «Identifier has already been declared», und die ganze Seite bleibt
       leer — auf jeder Seite, nicht nur auf der einen. Beim Bauen fällt
       es nicht auf, weil Python nur Text zusammenhängt.

       Der Fall ist real: `pruefe()` hiess zuerst in `hilfen.js` die
       Formularprüfung. Ein zweites `pruefe()` woanders hätte gereicht."""
    namen: dict[str, list[str]] = {}
    for js in sorted((WEB / 'js').glob('*.js')):
        if js.name in ERZEUGT:
            continue
        text = ohne_kommentare(lies(js))
        for m in re.finditer(r'^(?:const|let|var|class|function|async function)\s+(\w+)',
                             text, re.M):
            namen.setdefault(m.group(1), []).append(js.name)
    for name, dateien in sorted(namen.items()):
        if len(dateien) > 1:
            F('js', f'«{name}» steht in {", ".join(dateien)} — in der Einzeldatei '
                    f'bricht das Laden ab, und jede Seite bleibt leer')


def pruefe_einzeldatei() -> int:
    """Die gebaute Einzeldatei wird wirklich ausgeführt.

       Sie ist das, was man anklickt, wenn kein Server läuft. Ob sie sich
       überhaupt laden lässt, sagt kein Textvergleich — dafür muss sie
       durch einen Interpreter."""
    datei = WEB / 'StudySwiss-Website.html'
    jsc = ('/System/Library/Frameworks/JavaScriptCore.framework/'
           'Versions/A/Helpers/jsc')
    if not datei.exists() or not Path(jsc).exists():
        return 0
    text = lies(datei)
    bloecke = re.findall(r'<script>([\s\S]*?)</script>', text)
    gross = max(bloecke, key=len) if bloecke else ''
    if not gross:
        F('StudySwiss-Website.html', 'kein Skriptblock gefunden')
        return 0
    # Ohne Browser gibt es kein `document`. Geprüft wird darum, ob sich das
    # Ganze als EIN Skript übersetzen lässt — genau der Fehler, der sonst
    # erst beim Öffnen auffällt.
    import tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False,
                                     encoding='utf-8') as f:
        f.write('try { new Function(' + repr_js(gross) +
                '); print("LADBAR"); } catch (e) { print("FEHLER " + e); }')
        pfad = f.name
    lauf = subprocess.run([jsc, pfad], capture_output=True, text=True)
    Path(pfad).unlink(missing_ok=True)
    aus = (lauf.stdout or '') + (lauf.stderr or '')
    if 'LADBAR' not in aus:
        F('StudySwiss-Website.html', 'lässt sich nicht als ein Skript laden: '
                                     + aus.strip()[:200])
        return 0
    return 1


def repr_js(text: str) -> str:
    """Eine JavaScript-Zeichenkette aus beliebigem Text."""
    return ('"' + text.replace('\\', '\\\\').replace('"', '\\"')
            .replace('\n', '\\n').replace('\r', '') + '"')


# ---------------------------------------------------------------- Lauf
def main() -> int:
    if not WEB.exists():
        print('Kein Ordner app/website — nichts zu prüfen.')
        return 0

    # Ist die gebaute Website auf dem Stand ihrer Quellen?
    bauen = subprocess.run([sys.executable, str(HIER / 'website_bauen.py'), '--pruefen'],
                           capture_output=True, text=True)
    if bauen.returncode != 0:
        F('website_bauen.py', 'die gebauten Seiten sind älter als ihre Quellen — '
                              'app/pruefung/website_bauen.py aufrufen')

    seiten = {p.stem for p in WEB.glob('*.html') if p.name != 'StudySwiss-Website.html'}
    seiten.add('index')
    for pfad in sorted(WEB.glob('*.html')):
        if pfad.name == 'StudySwiss-Website.html':
            continue
        pruefe_seite(pfad, seiten)

    pruefe_preise()
    pruefe_namen()
    pruefe_gleichstand()
    pruefe_engine()
    pruefe_keine_loesungen()
    proben = pruefe_rechnen()
    ladbar = pruefe_einzeldatei()

    for w in warnungen:
        print('  Warnung  ', w)
    for f in fehler:
        print('  FEHLER   ', f)
    print()
    print(f'{len(seiten)} Seiten · {proben} Rechenproben · '
          f'Einzeldatei {"ladbar" if ladbar else "nicht geprüft"} · '
          f'{len(fehler)} Fehler, {len(warnungen)} Warnungen.')
    return 1 if fehler else 0


if __name__ == '__main__':
    raise SystemExit(main())
