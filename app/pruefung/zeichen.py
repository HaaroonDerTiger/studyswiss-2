#!/usr/bin/env python3
"""Zeichen an der falschen Stelle.

   Anlass war ein selbstverschuldeter Schaden: Ein Suchen-und-Ersetzen über
   Kommentare las das `//` in einer Base64-Zeichenkette als Zeilenkommentar
   und schrieb 461 Umlaute mitten in die eingebetteten Bilder. Die Vorschau
   zeigte danach keine Illustration mehr — und kein anderer Prüfer merkte es,
   weil alle nur Verhalten prüfen, nicht Zeichen.

   Geprüft wird deshalb: Steht irgendwo ein Umlaut, wo nur ASCII stehen darf?
   Base64, URLs, Dateipfade, CSS-Variablen, Bezeichner. Und umgekehrt: Sind
   alle Dateien gültiges UTF-8?
"""
import re, glob, os, sys, json, base64

import struct, zlib

W = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def pngPruefen(roh):
    """Ein PNG von vorn bis hinten durchgehen.

       Die ersten acht Bytes zu prüfen genügt nicht — genau daran ist ein
       beschädigtes Bild einmal vorbeigekommen: Es trug die richtige
       Signatur, aber der Bildkopf dahinter hiess «IHDz» statt «IHDR», und
       kein Browser zeigte es an. Jeder Block trägt eine Prüfsumme; die
       kostet nichts und findet genau solche Einzelbyte-Schäden.
    """
    fehlt = []
    if roh[:8] != b'\x89PNG\r\n\x1a\n':
        return ['keine PNG-Signatur']
    if len(roh) < 3000:
        fehlt.append(f'nur {len(roh)} Bytes gross')

    i, bloecke = 8, []
    while i + 12 <= len(roh):
        laenge = struct.unpack('>I', roh[i:i + 4])[0]
        typ = roh[i + 4:i + 8]
        if i + 12 + laenge > len(roh):
            fehlt.append(f'Block «{typ.decode("latin1")}» reicht über das Dateiende hinaus')
            break
        soll = struct.unpack('>I', roh[i + 8 + laenge:i + 12 + laenge])[0]
        ist = zlib.crc32(roh[i + 4:i + 8 + laenge]) & 0xffffffff
        if ist != soll:
            fehlt.append(f'Block «{typ.decode("latin1")}» hat eine falsche Prüfsumme — '
                         f'da ist ein Byte verfälscht')
        bloecke.append(typ)
        i += 12 + laenge

    if not bloecke or bloecke[0] != b'IHDR':
        fehlt.append('der erste Block ist nicht der Bildkopf IHDR')
    elif len(roh) >= 24:
        breite, hoehe = struct.unpack('>II', roh[16:24])
        if not (100 <= breite <= 2000 and 100 <= hoehe <= 2000):
            fehlt.append(f'unglaubwürdige Masse {breite}×{hoehe}')
    if b'IEND' not in bloecke:
        fehlt.append('kein Endblock IEND — die Datei ist abgeschnitten')
    if b'IDAT' not in bloecke:
        fehlt.append('kein Bilddatenblock IDAT')
    return fehlt
UMLAUT = r'[äöüÄÖÜß]'

STELLEN = [
    (rf'\b[A-Za-z0-9+/]{{20,}}{UMLAUT}[A-Za-z0-9+/]{{20,}}', 'Base64-Daten'),
    (rf'https?://[^\s"\'`<>)]*{UMLAUT}[^\s"\'`<>)]*', 'URL'),
    # Ein Attributwert steht auf einer Zeile und ist kurz. Ohne diese
    # Schranke greift das Muster über einen regulären Ausdruck im Prüfcode
    # hinweg bis in den deutschen Text dahinter — und meldet einen Umlaut,
    # der dort hingehört.
    (rf'class="[^"\n]{{0,80}}{UMLAUT}[^"\n]{{0,80}}"', 'class-Attribut'),
    (rf'\bid="[^"\n]{{0,80}}{UMLAUT}[^"\n]{{0,80}}"', 'id-Attribut'),
    (rf'--[a-z-]*{UMLAUT}[a-z-]*', 'CSS-Variable'),
    (rf'[\w/.-]*{UMLAUT}[\w/.-]*\.(?:dart|kt|py|js|json|png|svg|html)\b', 'Dateiname'),
    (rf'import\s+[\'"][^\'"]*{UMLAUT}[^\'"]*[\'"]', 'Import'),
    (rf'\bApp\.[a-zA-Z]*{UMLAUT}', 'Funktionsname'),
]

DATEIEN = ['backend/src/**/*.kt', 'frontend/lib/**/*.dart', 'pruefung/*.py',
           'pruefung/*.js', 'preview/*.html', 'marke/*.svg',
           'backend/src/main/resources/**/*.json']

fehler = []

for muster in DATEIEN:
    for pfad in sorted(glob.glob(f'{W}/{muster}', recursive=True)):
        kurz = os.path.relpath(pfad, W)
        try:
            t = open(pfad, encoding='utf-8').read()
        except UnicodeDecodeError as e:
            fehler.append(f'{kurz}: kein gültiges UTF-8 — {e}')
            continue
        for rx, was in STELLEN:
            for m in re.finditer(rx, t, re.M):
                zeile = t[:m.start()].count('\n') + 1
                fehler.append(f'{kurz}:{zeile} Umlaut in {was}: {m.group(0)[:70]}')

# Variablennamen in den Vorlagen müssen ASCII sein — ein Umlaut darin bricht
# jeden Ausdruck, der die Variable benutzt.
R = f'{W}/backend/src/main/resources/templates'
for name in json.load(open(f'{R}/vorlagen.index.json', encoding='utf-8'))['dateien']:
    for t in json.load(open(f'{R}/{name}', encoding='utf-8')):
        for v in t.get('variablen', []):
            for n in [v['name']] + list(v.get('spalten', [])):
                if re.search(UMLAUT, n):
                    fehler.append(f'{name}: Variable «{n}» in {t["templateId"]} — '
                                  f'Namen müssen ASCII bleiben')
        for f in t.get('felder', []):
            if re.search(UMLAUT, f.get('name', '')):
                fehler.append(f'{name}: Feld «{f["name"]}» in {t["templateId"]} — '
                              f'Namen müssen ASCII bleiben')

# Und die eingebetteten Bilder müssen sich noch dekodieren lassen.
vorschau = f'{W}/preview/StudySwiss-Vorschau.html'
if os.path.exists(vorschau):
    s = open(vorschau, encoding='utf-8').read()
    m = re.search(r'const STUDI = (\{.*?\});', s, re.S)
    if not m:
        fehler.append('preview: der Studi-Block fehlt')
    else:
        try:
            bilder = json.loads(m.group(1))
        except Exception as e:
            fehler.append(f'preview: der Studi-Block ist kein gültiges JSON — {e}')
            bilder = {}
        if len(bilder) < 8:
            fehler.append(f'preview: nur {len(bilder)} von 8 Studi-Bildern')
        for name, url in sorted(bilder.items()):
            try:
                roh = base64.b64decode(url.split(',', 1)[1], validate=True)
            except Exception as e:
                fehler.append(f'preview: Studi «{name}» ist kein gültiges Base64 — {e}')
                continue
            for satz in pngPruefen(roh):
                fehler.append(f'preview: Studi «{name}» — {satz}')
    # Und die Eule muss ihre Pfade behalten haben.
    for marke, mindest in [('const EULE', 2), ('const APPICON', 2)]:
        i = s.find(marke)
        if i < 0:
            fehler.append(f'preview: {marke} fehlt')
            continue
        # Genau bis zum Ende der Vorlagenzeichenkette, nicht ein festes
        # Fenster: Ein zu weites Fenster läuft in normalen Code hinein, und
        # der Prüfer meldet dann Umlaute, die dort hingehören.
        anf = s.index('`', i)
        ende = s.index('`;', anf + 1)
        block = s[anf:ende]
        if block.count('<path') < mindest:
            fehler.append(f'preview: {marke} hat nur {block.count("<path")} Pfade')
        if re.search(UMLAUT, re.sub(r'aria-label="[^"]*"', '', block)):
            fehler.append(f'preview: Umlaut in den Pfaddaten von {marke}')

print(f'Geprüft: {sum(len(glob.glob(f"{W}/{m}", recursive=True)) for m in DATEIEN)} Dateien')
print()
if fehler:
    print(f'{len(fehler)} FEHLER:')
    for f in fehler[:25]: print('  ✗', f)
    sys.exit(1)
print('✓ Keine Zeichen an der falschen Stelle. Bilder und Marke sind unversehrt.')
