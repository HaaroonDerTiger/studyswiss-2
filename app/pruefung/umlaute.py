# -*- coding: utf-8 -*-
"""ue/ae/oe zurück in Umlaute — aber nur, wo es welche sind.

   «Dauer», «Steuer», «quer» und «Koeffizient» enthalten echte Vokalpaare.
   Die Ausnahmeliste stammt nicht aus dem Bauch, sondern aus den
   Aufgabentexten selbst: Was dort mit ue/ae/oe steht, ist korrektes Deutsch,
   denn diese Texte sind mit Umlauten geschrieben.
"""
import re

ECHT = {
 # aus dem Wortschatz der Aufgabentexte, von Hand durchgesehen
 'Anschauen','Augenbrauen','Baguettes','Baue','Bauer','Bauern','Bauernhof','Bouquets',
 'Dauer','Dauerzustand','Dreiecksquerschnitt','Fehlerquelle','Feuer','Feuerstelle','Guetzli',
 'Hinschauen','Knonauer','Koeffizient','Koeffizienten','Kongruenz','Mauer','Mehrwertsteuer',
 'Neue','Neuen','Neuer','Neues','Quelle','Quellen','Quellordner','Quellordnern','Querschnitt',
 'Querschnitts','Sauer','Schauen','Säue','Trapezquerschnitt','Trauer','Wegschauen','Zuerst',
 'Zuschauende','Zuschauenden','Zuschauender','Zuschauer','Zuschauereffekt','Steuer','Steuern',
 'andauern','anschauen','anvertrauen','aufbauen','ausbauen','bauen','bequem','bereuen',
 'beteuern','betrauern','blaue','blauen','dauere','dauerhaft','dauerhafte','dauern','dauernd',
 'dauert','dauerte','durchschauen','einbauen','erfreuen','erneuert','freuen','genau','genaue',
 'genauem','genauen','genauer','genaues','graue','grauem','grauen','grauer','hauen',
 'heimlichtuerisch','hinschauen','hinzuschauen','kahlgehauen','kauerte','konsequent','neu',
 'neue','neuem','neuen','neuer','neues','quer','rauer','sauer','schauen','scheuernden',
 'scheuerte','scheuerten','schlauer','steuert','teuer','teuersten','trauern','tue','virtuell',
 'zueinander','zuerst','zusteuern','überdauern','Abenteuer','Beute','Freude','Leute','heute',
 'Heute','heutige','deuten','bedeuten','Bedeutung','bedeutet','deutlich','deutliche','deutet',
 'Deutsch','deutsch','deutschen','Deutschen','Zeugnis','Zeugnisse','Euro','aktuell','Aktuell',
 'individuell','Quader','Quadrat','Quadrate','Quadratmeter','Aquarium','Poesie','Aloe','Poet',
 'erneut','Trauerspiel','Frauen','Frau','grauem','Schauer','brauen','kauen','Verdauung',
 'true','false','value','continue','queue','Queue','blue','statue','Statue','Revue',
}

TAUSCH = {'ue':'ü','ae':'ä','oe':'ö','Ue':'Ü','Ae':'Ä','Oe':'Ö'}
WORT = re.compile(r'[A-Za-zÄÖÜäöüß]+')

def wort(w):
    """Ein einzelnes Wort zurückverwandeln.

       Die wichtigste Regel steht zuerst: **Ein Wort, das schon einen Umlaut
       trägt, ist bereits korrektes Deutsch.** Ohne sie wurde «Bäuerin» zu
       «Bäürin» und «Querschnittsfläche» zu «Qürschnittsfläche» — das ue
       darin ist echt, und der Umlaut daneben beweist, dass jemand das Wort
       bereits richtig geschrieben hat."""
    if re.search(r'[äöüÄÖÜ]', w): return w
    if w in ECHT: return w

    def einer(m):
        vor = w[m.start() - 1] if m.start() else ''
        # Steht vor dem «ue» ein a, e oder q, ist es ein echtes Vokalpaar —
        # Ba-uer, ne-ue, ferti-g? nein: q-uer, Ste-uer, vertra-uensvoll.
        # Das ist keine Ausnahmeliste, sondern eine ganze Wortfamilie:
        # alles mit -bauer-, -dauer-, -trauen-, neu-, -steuer-, que-.
        # `vor` muss geprüft werden: In Python ist '' in 'aeq' wahr, und
        # dann bliebe «Ueberschlagen» am Wortanfang unverändert.
        if m.group(0).lower() == 'ue' and vor and vor.lower() in 'aeq':
            return m.group(0)
        return TAUSCH[m.group(0)]

    return re.sub(r'ue|ae|oe|Ue|Ae|Oe', einer, w)

def richte(text, schutz=()):
    """Ein Stück Text zurückverwandeln.

       `schutz` sind Bezeichner, die unverändert bleiben müssen — Feldnamen,
       Variablennamen, Klassennamen. Sie sind der Vertrag zwischen Backend,
       App und Vorschau; wer sie ändert, bricht ihn."""
    def einer(m):
        w = m.group(0)
        if w in schutz: return w
        return wort(w)
    return WORT.sub(einer, text)

def ohnePlatzhalter(text, schutz=()):
    """Wie `richte`, lässt aber `{platzhalter}` in Ruhe — dort stehen
       Variablennamen, keine Wörter."""
    teile = re.split(r'(\{[^}]*\})', text)
    return ''.join(t if t.startswith('{') else richte(t, schutz) for t in teile)
