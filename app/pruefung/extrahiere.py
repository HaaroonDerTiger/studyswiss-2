#!/usr/bin/env python3
"""Zieht die <script>-Bloecke aus der Vorschau und legt eine Datei an, die
   unter jsc laeuft: mit DOM-Attrappen davor und ohne den Startaufruf."""
import re, sys, os

# Der Ordner dieses Skripts ist der Anker. Hier war der verdrahtete Pfad am
# gefaehrlichsten: Die vier Vorschau-Runden fuehrten eine FREMDE Kopie der
# Vorschau aus und meldeten «alles gruen», waehrend die geaenderte Datei
# ungeprueft blieb.
WURZEL = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
q = os.path.join(WURZEL, "preview/StudySwiss-Vorschau.html")
s = open(q, encoding='utf-8').read()
bloecke = re.findall(r'<script>(.*?)</script>', s, re.S)

stub = r'''
/* --- DOM-Attrappen. jsc kennt kein document; die App ruft es beim Zeichnen
       auf. Wir merken uns, was gezeichnet wurde, statt es anzuzeigen. --- */
var GEZEICHNET = {};
function knoten(id){
  return {
    id: id, _html: '', style: {}, textContent: '', disabled: false, value: '',
    dataset: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
    set innerHTML(v){ this._html = v; GEZEICHNET[this.id] = v; },
    get innerHTML(){ return this._html; },
    querySelector(){ return knoten('q'); },
    querySelectorAll(){ return []; },
    focus(){}, setSelectionRange(){},
    appendChild(){}, addEventListener(){},
  };
}
// Die Knoten werden gemerkt, nicht jedes Mal neu gebaut. Sonst ginge
// verloren, was `App.zeichne()` hineinschreibt — und eine Pruefung koennte
// nie sehen, was auf dem Bildschirm steht.
var KNOTEN = {};
function merkeKnoten(id){ return KNOTEN[id] || (KNOTEN[id] = knoten(id)); }
var document = {
  getElementById(id){ return merkeKnoten(id); },
  querySelector(sel){ return merkeKnoten(sel); },
  querySelectorAll(sel){ return []; },
  createElement(t){ return knoten(t); },
  body: merkeKnoten('body'),
};
/** Was gerade auf dem Bildschirm steht — inklusive Meldungen und Blaettern,
 *  die `App.zeichne()` ueber den Screen legt. */
function bildschirm(){ App.zeichne(); return merkeKnoten('app').innerHTML || ''; }
var window = { top: null, self: null };
var FEHLERPROTOKOLL = [];
// Browser-Dialoge sind in einem eingebetteten Rahmen gesperrt — dort passiert
// dann einfach nichts, und der Knopf wirkt kaputt. Die App hat dafuer eigene
// Bausteine (App.melde, App.frage, App.eingabeblatt). Wer hier wieder einen
// Dialog einbaut, soll es sofort merken:
function confirm(t){ throw new Error('confirm() ist gesperrt — nimm App.frage(): ' + t); }
function alert(t){ throw new Error('alert() ist gesperrt — nimm App.melde(): ' + t); }
function prompt(t, v){ throw new Error('prompt() ist gesperrt — nimm App.eingabeblatt(): ' + t); }
var TIMER = [];
function setInterval(f, ms){ TIMER.push(f); return TIMER.length; }
function clearInterval(i){}
function setTimeout(f, ms){ return 0; }
function clearTimeout(i){}
'''

# Der letzte Block startet die App und braucht ein echtes DOM. Wir nehmen
# den Startaufruf und den Navigationsaufbau heraus.
letzter = bloecke[-1]
letzter = letzter.replace("document.getElementById('navliste').innerHTML = NAVGRUPPEN.map",
                          "var _NAVHTML = NAVGRUPPEN.map")
letzter = re.sub(r'\nApp\.zeichne\(\);\s*$', '\n', letzter)
bloecke[-1] = letzter

open("app.js", "w", encoding='utf-8').write(stub + "\n" + "\n".join(bloecke))
print(f"app.js geschrieben: {len(bloecke)} Bloecke, "
      f"{(stub + chr(10).join(bloecke)).count(chr(10))} Zeilen")
