const DEMO_DATEN = {
 "kantone": [
  {
   "id": "ZH",
   "name": "Zürich",
   "aktiv": true,
   "pruefungen": [
    "Zentrale Aufnahmeprüfung ins Langgymnasium",
    "Zentrale Aufnahmeprüfung ins Kurzgymnasium",
    "Zentrale Aufnahmeprüfung in FMS, HMS und IMS"
   ]
  },
  {
   "id": "BE",
   "name": "Bern",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung für das 1. Jahr des gymnasialen Bildungsgangs",
    "Aufnahmeprüfung für das 1. Jahr des FMS-Bildungsgangs",
    "Aufnahmeprüfung für das 3. Jahr des gymnasialen Bildungsgangs"
   ]
  },
  {
   "id": "BS",
   "name": "Basel-Stadt",
   "aktiv": true,
   "pruefungen": [
    "Freiwillige Aufnahmeprüfung in die Sekundarstufe II"
   ]
  },
  {
   "id": "SG",
   "name": "St. Gallen",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung Gymnasium",
    "Aufnahmeprüfung FMS, WMS und IMS"
   ]
  },
  {
   "id": "AG",
   "name": "Aargau",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung an das Gymnasium",
    "Aufnahmeprüfung an FMS, WMS und IMS"
   ]
  },
  {
   "id": "LU",
   "name": "Luzern",
   "aktiv": true,
   "pruefungen": [
    "Zentrale Aufnahmeprüfung, Herbstprüfung",
    "Zentrale Aufnahmeprüfung, Frühlingsprüfung"
   ]
  },
  {
   "id": "TG",
   "name": "Thurgau",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung an die Gymnasiale Maturitätsschule, aus der 2. Sek",
    "Aufnahmeprüfung an die Gymnasiale Maturitätsschule, aus der 3. Sek",
    "Aufnahmeprüfung an die Fachmittelschule, aus der 2. Sek",
    "Aufnahmeprüfung an die Fachmittelschule, aus der 3. Sek"
   ]
  },
  {
   "id": "SO",
   "name": "Solothurn",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung BM, FMS und Gymnasium"
   ]
  },
  {
   "id": "AR",
   "name": "Appenzell Ausserrhoden",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung Gymnasium Kantonsschule Trogen",
    "Aufnahmeprüfung an die nichtgymnasialen Maturitätslehrgänge"
   ]
  },
  {
   "id": "GL",
   "name": "Glarus",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung in die 1. Klasse des Gymnasiums",
    "Aufnahmeprüfung in die 3. Klasse des Gymnasiums",
    "Aufnahmeprüfung an die Fachmittelschule"
   ]
  },
  {
   "id": "GR",
   "name": "Graubünden",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung 1G ins sechsjährige Gymnasium",
    "Einheitsprüfung für Gymnasium, HMS, FMS und IMS"
   ]
  },
  {
   "id": "SZ",
   "name": "Schwyz",
   "aktiv": true,
   "pruefungen": [
    "Aufnahmeprüfung an die Gymnasien",
    "Aufnahmeprüfung an die Fachmittelschulen",
    "Aufnahmeprüfung in die 1. Klasse des Untergymnasiums"
   ]
  }
 ],
 "bereiche": {
  "mathematik": "Mathematik",
  "sprachbetrachtung": "Deutsch Sprachbetrachtung",
  "textverstaendnis": "Deutsch Textverständnis",
  "aufsatz": "Deutsch Aufsatz",
  "franzoesisch": "Französisch",
  "mathematik-bern": "Mathematik",
  "mathematik-bern-gym3": "Mathematik",
  "sprache-bern": "Deutsch Sprache",
  "textverstaendnis-bern": "Deutsch Textverständnis",
  "mathematik-sg": "Mathematik",
  "sprache-sg": "Deutsch Sprache",
  "textverstaendnis-sg": "Deutsch Textverständnis",
  "franzoesisch-sg": "Französisch",
  "franzoesisch-muendlich-be": "Französisch mündlich",
  "franzoesisch-bildimpuls-be": "Französisch mündlich: Bild und Gespräch",
  "franzoesisch-hoeren-sg": "Französisch Hören und Sehen",
  "mathematik-bs": "Mathematik",
  "textverstaendnis-bs": "Deutsch Textverständnis",
  "mathematik-so": "Mathematik",
  "textverstaendnis-so": "Deutsch Textverständnis",
  "sprache-so": "Deutsch Sprache",
  "franzoesisch-so": "Französisch",
  "englisch-so": "Englisch",
  "franzoesisch-hoeren-so": "Französisch Hörverstehen",
  "englisch-hoeren-so": "Englisch Listening",
  "mathematik-tg": "Mathematik",
  "textverstaendnis-tg": "Deutsch Textverständnis",
  "sprache-tg": "Deutsch Sprache",
  "franzoesisch-muendlich-tg": "Französisch mündlich",
  "mathematik-ag": "Mathematik",
  "textverstaendnis-ag": "Deutsch Textverständnis",
  "sprache-ag": "Deutsch Sprachbetrachtung",
  "franzoesisch-ag": "Französisch",
  "englisch-ag": "Englisch",
  "mathematik-ar": "Mathematik",
  "textverstaendnis-ar": "Deutsch Textverständnis",
  "sprache-ar": "Deutsch Grammatik",
  "franzoesisch-ar": "Französisch",
  "englisch-ar": "Englisch",
  "franzoesisch-hoeren-ar": "Französisch Hörverständnis",
  "englisch-hoeren-ar": "Englisch Listening",
  "mathematik-gl": "Mathematik",
  "textverstaendnis-gl": "Deutsch Textverständnis",
  "sprache-gl": "Deutsch Sprachkunde",
  "mathematik-gr": "Mathematik",
  "kopfrechnen-gr": "Fixierendes Kopfrechnen",
  "textverstaendnis-gr": "Erstsprache: Lesen",
  "sprache-gr": "Sprache im Fokus",
  "englisch-gr": "Englisch",
  "mathematik-lu": "Mathematik",
  "textverstaendnis-lu": "Deutsch Leseverstehen",
  "sprache-lu": "Deutsch Sprachreflexion",
  "franzoesisch-lu": "Französisch Leseverstehen",
  "franzoesisch-hoeren-lu": "Französisch Hörverstehen",
  "englisch-lu": "Use of English",
  "englisch-schreiben-lu": "English Writing",
  "mathematik-sz": "Mathematik",
  "textverstaendnis-sz": "Deutsch Textverständnis",
  "sprache-sz": "Deutsch Sprache im Fokus",
  "englisch-sz": "Englisch",
  "englisch-hoeren-sz": "Englisch Hörverstehen",
  "franzoesisch-sz": "Französisch",
  "franzoesisch-hoeren-sz": "Französisch Hörverstehen",
  "mathematik-einsiedeln": "Mathematik: Zahl, Variable und Grössen",
  "geometrie-einsiedeln": "Mathematik: Form und Raum",
  "textverstaendnis-einsiedeln": "Deutsch Textverständnis",
  "sprache-einsiedeln": "Deutsch Sprache im Fokus",
  "englisch-muendlich-sz": "Englisch mündlich",
  "franzoesisch-muendlich-sz": "Französisch mündlich"
 },
 "schwacheThemen": [
  {
   "fach": "mathematik",
   "code": "1.01",
   "name": "Rechenregeln, Punkt vor Strich, Klammern",
   "oberthema": "Zahl und Arithmetik",
   "fehlerquote": 62
  },
  {
   "fach": "mathematik",
   "code": "2.01",
   "name": "Terme aus Sach- und Geometriekontexten ableiten",
   "oberthema": "Terme und Gleichungen",
   "fehlerquote": 54
  },
  {
   "fach": "sprachbetrachtung",
   "code": "1.01",
   "name": "Wortfamilie: Nomen, Verb, Adjektiv ableiten",
   "oberthema": "Wortschatz",
   "fehlerquote": 48
  },
  {
   "fach": "sprachbetrachtung",
   "code": "2.01",
   "name": "Wortart im Satz bestimmen",
   "oberthema": "Wortarten bestimmen",
   "fehlerquote": 41
  },
  {
   "fach": "textverstaendnis",
   "code": "1.01",
   "name": "Angaben im Text finden",
   "oberthema": "Informationen entnehmen",
   "fehlerquote": 37
  },
  {
   "fach": "textverstaendnis",
   "code": "2.01",
   "name": "Wortbedeutung aus dem Zusammenhang",
   "oberthema": "Wortschatz im Text",
   "fehlerquote": 33
  }
 ],
 "faecher": [
  {
   "id": "mathematik",
   "name": "Mathematik",
   "bereiche": [
    "Mathematik"
   ],
   "themen": 87,
   "erledigt": 34
  },
  {
   "id": "deutsch",
   "name": "Deutsch",
   "bereiche": [
    "Sprachbetrachtung",
    "Textverständnis",
    "Aufsatz"
   ],
   "themen": 81,
   "erledigt": 22
  }
 ],
 "aufgaben": [
  {
   "ref": "be-brueche-rechnen:1",
   "fach": "mathematik-bern",
   "oberthema": "Brüche",
   "format": "einfachauswahl",
   "stamm": "Berechne und kürze vollständig:\n\n¹⁴⁄₂₁ − ⁵⁄₂₀",
   "text": null,
   "optionen": [
    "⁵⁄₁₂",
    "⁹⁄₁",
    "¹⁹⁄₄₁",
    "²⁄₃"
   ],
   "loesung": "⁵⁄₁₂",
   "erklaerung": "¹⁴⁄₂₁ kürzt sich zu ²⁄₃, ⁵⁄₂₀ zu ¹⁄₄. Der gemeinsame Nenner von 3 und 4 ist 12: ⁸⁄₁₂ − ³⁄₁₂ = ⁵⁄₁₂.",
   "fehler": [
    {
     "antwort": "⁹⁄₁",
     "diagnoseId": "zaehler_und_nenner_getrennt",
     "feedback": "Du hast Zähler von Zähler und Nenner von Nenner abgezogen. Brüche werden erst auf denselben Nenner gebracht, dann werden nur die Zähler verrechnet."
    },
    {
     "antwort": "²⁄₃",
     "diagnoseId": "nur_gekuerzt",
     "feedback": "Das ist ¹⁴⁄₂₁ gekürzt. Der zweite Bruch muss noch abgezogen werden."
    }
   ],
   "hinweise": [
    "Kürze zuerst, wo es geht, mit kleineren Zahlen rechnet es sich leichter.",
    "Beim Addieren und Subtrahieren brauchst du denselben Nenner. Beim Multiplizieren und Dividieren nicht.",
    "Durch einen Bruch teilen heisst mit seinem Kehrwert multiplizieren."
   ]
  },
  {
   "ref": "be-brueche-rechnen:2",
   "fach": "mathematik-bern",
   "oberthema": "Brüche",
   "format": "einfachauswahl",
   "stamm": "Berechne und kürze vollständig:\n\n⁵⁵⁄₁₁ + ¹⁄₄",
   "text": null,
   "optionen": [
    "²¹⁄₄",
    "⁵⁶⁄₁₅",
    "⁵⁄₄",
    "²⁰⁄₄"
   ],
   "loesung": "²¹⁄₄",
   "erklaerung": "⁵⁵⁄₁₁ ist 5. Mit ¹⁄₄ zusammen ergibt das 5 + ¹⁄₄ = ²⁰⁄₄ + ¹⁄₄ = ²¹⁄₄.",
   "fehler": [
    {
     "antwort": "⁵⁶⁄₁₅",
     "diagnoseId": "zaehler_und_nenner_getrennt",
     "feedback": "Du hast Zähler und Nenner einzeln addiert. So rechnet man mit Brüchen nicht. Erst auf denselben Nenner bringen."
    },
    {
     "antwort": "²⁰⁄₄",
     "diagnoseId": "summand_vergessen",
     "feedback": "²⁰⁄₄ ist ⁵⁵⁄₁₁ als Viertel geschrieben. Das eine Viertel fehlt noch."
    }
   ],
   "hinweise": [
    "Kürze zuerst, wo es geht, mit kleineren Zahlen rechnet es sich leichter.",
    "Beim Addieren und Subtrahieren brauchst du denselben Nenner. Beim Multiplizieren und Dividieren nicht.",
    "Durch einen Bruch teilen heisst mit seinem Kehrwert multiplizieren."
   ]
  },
  {
   "ref": "be-brueche-rechnen:3",
   "fach": "mathematik-bern",
   "oberthema": "Brüche",
   "format": "einfachauswahl",
   "stamm": "Berechne und kürze vollständig:\n\n³⁄₄ · ⁸⁄₉",
   "text": null,
   "optionen": [
    "²⁄₃",
    "²⁴⁄₃₆",
    "¹¹⁄₁₃",
    "²⁷⁄₃₂"
   ],
   "loesung": "²⁄₃",
   "erklaerung": "Beim Multiplizieren mal Zähler mit Zähler und Nenner mit Nenner: ²⁴⁄₃₆. Gekürzt mit 12 ergibt das ²⁄₃.",
   "fehler": [
    {
     "antwort": "²⁴⁄₃₆",
     "diagnoseId": "nicht_gekuerzt",
     "feedback": "Richtig gerechnet, aber nicht fertig. 24 und 36 haben den gemeinsamen Teiler 12. Gekürzt bleibt ²⁄₃."
    },
    {
     "antwort": "¹¹⁄₁₃",
     "diagnoseId": "addiert_statt_multipliziert",
     "feedback": "Du hast Zähler und Nenner addiert. Multipliziert wird über Kreuz nicht. Einfach Zähler mal Zähler, Nenner mal Nenner."
    }
   ],
   "hinweise": [
    "Kürze zuerst, wo es geht, mit kleineren Zahlen rechnet es sich leichter.",
    "Beim Addieren und Subtrahieren brauchst du denselben Nenner. Beim Multiplizieren und Dividieren nicht.",
    "Durch einen Bruch teilen heisst mit seinem Kehrwert multiplizieren."
   ]
  },
  {
   "ref": "be-brueche-rechnen:4",
   "fach": "mathematik-bern",
   "oberthema": "Brüche",
   "format": "einfachauswahl",
   "stamm": "Berechne und kürze vollständig:\n\n⁵⁄₆ : ⁵⁄₁₂",
   "text": null,
   "optionen": [
    "2",
    "²⁵⁄₇₂",
    "¹⁄₂",
    "¹⁰⁄₁₂"
   ],
   "loesung": "2",
   "erklaerung": "Durch einen Bruch teilen heisst mit seinem Kehrwert multiplizieren: ⁵⁄₆ · ¹²⁄₅ = ⁶⁰⁄₃₀ = 2.",
   "fehler": [
    {
     "antwort": "²⁵⁄₇₂",
     "diagnoseId": "statt_kehrwert_multipliziert",
     "feedback": "Du hast die beiden Brüche multipliziert. Beim Teilen wird der zweite Bruch umgedreht, aus ⁵⁄₁₂ wird ¹²⁄₅."
    },
    {
     "antwort": "¹⁄₂",
     "diagnoseId": "kehrwert_beim_falschen",
     "feedback": "Du hast den ersten Bruch umgedreht statt den zweiten. Gekehrt wird immer der Divisor, also der hintere."
    }
   ],
   "hinweise": [
    "Kürze zuerst, wo es geht, mit kleineren Zahlen rechnet es sich leichter.",
    "Beim Addieren und Subtrahieren brauchst du denselben Nenner. Beim Multiplizieren und Dividieren nicht.",
    "Durch einen Bruch teilen heisst mit seinem Kehrwert multiplizieren."
   ]
  },
  {
   "ref": "wortart-im-satz:5",
   "fach": "sprachbetrachtung",
   "oberthema": null,
   "format": "einfachauswahl",
   "stamm": "Welche Wortart hat «dennoch» in diesem Satz?\n\nSie war müde, dennoch ging sie noch ins Training.",
   "text": null,
   "optionen": [],
   "loesung": "übrige Partikeln",
   "erklaerung": "«dennoch» lässt sich nicht beugen, fordert keinen Fall und leitet keinen Nebensatz ein. Die Personalform «ging» steht gleich danach. Damit bleibt nur die letzte Wortart.",
   "fehler": [
    {
     "antwort": "Konjunktion",
     "diagnoseId": "partikel_als_konjunktion",
     "feedback": "Bei einer Konjunktion stünde die Personalform am Ende des Nebensatzes. Hier steht «ging» direkt nach «dennoch» Der Satz bleibt ein Hauptsatz. Also keine Konjunktion."
    },
    {
     "antwort": "Adjektiv",
     "diagnoseId": "unbeugbar_als_adjektiv",
     "feedback": "Ein Adjektiv liesse sich steigern oder vor ein Nomen setzen: «das dennochere Training» geht nicht. Wörter, die sich nie verändern, sind keine Adjektive."
    }
   ],
   "hinweise": [
    "Was kann das Wort? Lässt es sich beugen, steigern, oder bleibt es immer gleich?",
    "Drei Proben helfen: Lässt es sich deklinieren oder steigern, ist es Nomen oder Adjektiv. Verbindet es zwei Sätze, ist es Konjunktion. Steht es vor einer Nomengruppe und fordert einen Fall, ist es Präposition.",
    "Bleibt nach allen Proben nichts übrig, sind es die übrigen Partikeln. Dort landen Wörter wie «doch», «schon», «nicht»."
   ]
  },
  {
   "ref": "wortart-im-satz:6",
   "fach": "sprachbetrachtung",
   "oberthema": null,
   "format": "einfachauswahl",
   "stamm": "Welche Wortart hat «während» in diesem Satz?\n\nWährend des Spaziergangs schwieg er.",
   "text": null,
   "optionen": [],
   "loesung": "Präposition",
   "erklaerung": "«während» steht hier vor der Nomengruppe «des Spaziergangs» und fordert den Genitiv. Wer einen Fall fordert, ist Präposition.",
   "fehler": [
    {
     "antwort": "Konjunktion",
     "diagnoseId": "gleiches_wort_andere_rolle",
     "feedback": "«während» kann beides sein. Als Konjunktion leitet es einen Nebensatz mit eigenem Verb ein: «Während er sprach, …». Hier folgt aber keine Personalform, sondern eine Nomengruppe im Genitiv."
    },
    {
     "antwort": "übrige Partikeln",
     "diagnoseId": "fall_uebersehen",
     "feedback": "Die übrigen Partikeln fordern keinen Fall. Frage dich: Steht danach «des Spaziergangs» wegen dieses Wortes im Genitiv? Dann ist es eine Präposition."
    }
   ],
   "hinweise": [
    "Was kann das Wort? Lässt es sich beugen, steigern, oder bleibt es immer gleich?",
    "Drei Proben helfen: Lässt es sich deklinieren oder steigern, ist es Nomen oder Adjektiv. Verbindet es zwei Sätze, ist es Konjunktion. Steht es vor einer Nomengruppe und fordert einen Fall, ist es Präposition.",
    "Bleibt nach allen Proben nichts übrig, sind es die übrigen Partikeln. Dort landen Wörter wie «doch», «schon», «nicht»."
   ]
  },
  {
   "ref": "wortart-im-satz:7",
   "fach": "sprachbetrachtung",
   "oberthema": null,
   "format": "einfachauswahl",
   "stamm": "Welche Wortart hat «während» in diesem Satz?\n\nWährend er sprach, schwieg sie.",
   "text": null,
   "optionen": [],
   "loesung": "Konjunktion",
   "erklaerung": "Hier folgt ein ganzer Nebensatz mit der Personalform «sprach» am Ende. Ein Wort, das zwei Teilsätze verbindet, ist eine Konjunktion.",
   "fehler": [
    {
     "antwort": "Präposition",
     "diagnoseId": "gleiches_wort_andere_rolle",
     "feedback": "Dasselbe Wort, andere Rolle: Als Präposition stünde danach eine Nomengruppe, keine Personalform. Achte immer darauf, was folgt, nicht nur auf das Wort selbst."
    },
    {
     "antwort": "übrige Partikeln",
     "diagnoseId": "nebensatz_uebersehen",
     "feedback": "Der Nebensatz mit «sprach» am Ende und dem Komma davor zeigt: Hier verbindet etwas zwei Teilsätze. Das können die übrigen Partikeln nicht."
    }
   ],
   "hinweise": [
    "Was kann das Wort? Lässt es sich beugen, steigern, oder bleibt es immer gleich?",
    "Drei Proben helfen: Lässt es sich deklinieren oder steigern, ist es Nomen oder Adjektiv. Verbindet es zwei Sätze, ist es Konjunktion. Steht es vor einer Nomengruppe und fordert einen Fall, ist es Präposition.",
    "Bleibt nach allen Proben nichts übrig, sind es die übrigen Partikeln. Dort landen Wörter wie «doch», «schon», «nicht»."
   ]
  },
  {
   "ref": "wortart-im-satz:8",
   "fach": "sprachbetrachtung",
   "oberthema": null,
   "format": "einfachauswahl",
   "stamm": "Welche Wortart hat «die» in diesem Satz?\n\nDie Nachbarin hat den Schlüssel gefunden.",
   "text": null,
   "optionen": [],
   "loesung": "Pronomen",
   "erklaerung": "An der ZAP zählen die Artikel zu den Pronomen. «die» begleitet hier das Nomen «Nachbarin».",
   "fehler": [
    {
     "antwort": "Nomen",
     "diagnoseId": "begleiter_als_nomen",
     "feedback": "Das Nomen ist «Nachbarin». «die» begleitet es nur und gibt Fall, Zahl und Geschlecht an."
    },
    {
     "antwort": "übrige Partikeln",
     "diagnoseId": "artikel_nicht_zugeordnet",
     "feedback": "Artikel wie «der», «die», «ein» werden an der ZAP zu den Pronomen gezählt. Merk dir diese Regel. Sie kommt regelmässig vor."
    }
   ],
   "hinweise": [
    "Was kann das Wort? Lässt es sich beugen, steigern, oder bleibt es immer gleich?",
    "Drei Proben helfen: Lässt es sich deklinieren oder steigern, ist es Nomen oder Adjektiv. Verbindet es zwei Sätze, ist es Konjunktion. Steht es vor einer Nomengruppe und fordert einen Fall, ist es Präposition.",
    "Bleibt nach allen Proben nichts übrig, sind es die übrigen Partikeln. Dort landen Wörter wie «doch», «schon», «nicht»."
   ]
  },
  {
   "ref": "be-tv-worterklaerung-warten:9",
   "fach": "textverstaendnis-bern",
   "oberthema": "Worterklärungen",
   "format": "einfachauswahl",
   "stamm": "Was bedeutet der Ausdruck im Textzusammenhang?\n\n«hält die Leere kaum aus» (Abschnitt A)",
   "text": "Warum Warten so schwerfällt\nA\n  1  Elf Sekunden. So lange dauert es im Schnitt, bis eine Person an der\n     Bushaltestelle zum ersten Mal aufs Handy schaut. Das hat eine Gruppe von\n     Studierenden in Bern herausgefunden, die einen Nachmittag lang gezählt hat,\n     wer wann in die Tasche greift. Wer wartet, hält die Leere kaum aus. Dabei\n  5  warten wir jeden Tag: an der Kasse, vor dem Schulzimmer, auf eine Antwort, die\n     nicht kommt.\n\nB\n     Dass sich Warten zäh anfühlt, ist keine Einbildung. In Versuchen schätzen\n     Menschen leere Zeit regelmässig länger ein, als sie ist, im Schnitt um gut\n     ein Drittel. Ist die Zeit dagegen gefüllt, etwa mit einem Gespräch oder einer\n 10  Aufgabe, schrumpft sie im Rückblick zusammen. Unser Zeitgefühl misst nicht\n     Minuten, sondern Ereignisse. Wo nichts geschieht, gibt es nichts zu messen,\n     und der Kopf füllt die Lücke mit Ungeduld.\n\nC\n     Entscheidend ist weniger die Dauer als die Auskunft. Eine Anzeigetafel, die\n     «noch 4 Minuten» meldet, macht das Warten erträglich, obwohl sie es um keine\n 15  Sekunde verkürzt. Fehlt die Anzeige, wird aus vier Minuten ein offenes Ende.\n     Verkehrsbetriebe wissen das seit Langem: Die Tafel am Perron ist keine\n     technische Spielerei, sondern das billigste Mittel gegen Beschwerden, das sie\n     haben.\n\nD\n     Am schwersten wiegt die Ungewissheit. Wer weiss, dass der Zug zwanzig Minuten\n 20  Verspätung hat, richtet sich ein und kauft sich einen Kaffee. Wer nur hört,\n     der Zug verspäte sich «auf unbestimmte Zeit», bleibt stehen und starrt auf die\n     Gleise. Psychologinnen nennen das den Unterschied zwischen einem geschlossenen\n     und einem offenen Warten. Das offene kostet mehr Kraft, weil man sich nicht\n     entscheiden kann, ob man bleibt oder geht.\n\nE\n 25  Aus diesem Wissen ist längst ein Handwerk geworden. An manchen Flughäfen führt\n     der Weg vom Flugzeug zum Gepäckband einen Umweg. Die Reisenden gehen sieben\n     Minuten und warten dann eine, statt eine Minute zu gehen und sieben zu warten.\n     Die Gesamtzeit bleibt gleich, die Beschwerden gehen zurück. In Freizeitparks\n     stehen entlang der Schlange Spiegel, Bildschirme und kleine Rätsel. Nichts\n 30  davon macht die Schlange kürzer.\n\nF\n     Man kann das für einen Trick halten. Man kann es auch nüchtern betrachten: Wer\n     wartet, leidet nicht an der Zeit, sondern an der Leere und am Nichtwissen.\n     Beides lässt sich füllen, ohne jemanden zu täuschen. Wer das nächste Mal an\n     der Haltestelle steht, kann es selbst ausprobieren, nicht aufs Handy schauen,\n 35  sondern auf die Uhr, und danach schätzen, wie lange es gedauert hat. Die\n     meisten liegen deutlich daneben.",
   "optionen": [
    "erträgt es schlecht, wenn nichts geschieht",
    "hat zu wenig Platz um sich herum",
    "kann sich nichts merken",
    "möchte gern allein sein"
   ],
   "loesung": "erträgt es schlecht, wenn nichts geschieht",
   "erklaerung": "Gemeint ist die inhaltliche Leere der Wartezeit, nicht Platz im Raum. Der Satz steht direkt nach der Beobachtung, dass alle sofort zum Handy greifen.",
   "fehler": [
    {
     "antwort": "hat zu wenig Platz um sich herum",
     "diagnoseId": "wortsinn_statt_uebertragung",
     "feedback": "Du hast «Leere» räumlich verstanden. Hier geht es nicht um Platz an der Haltestelle, sondern um die Zeit, in der nichts passiert. Darum greifen die Leute ja zum Handy."
    },
    {
     "antwort": "möchte gern allein sein",
     "diagnoseId": "gegenteil",
     "feedback": "Das ist beinahe das Gegenteil. Wer die Leere nicht aushält, sucht Beschäftigung, statt sie zu suchen."
    }
   ],
   "hinweise": [
    "Lies den Satz noch einmal ganz. Der Ausdruck allein sagt zu wenig. Was passiert davor, was danach?",
    "Setze jede der vier Bedeutungen probeweise in den Satz ein. Meist bleiben zwei übrig, die beide gehen könnten.",
    "Bei den letzten zwei entscheidet der Ton des Abschnitts: Ist die Stelle sachlich, kritisch oder eher wohlwollend gemeint?"
   ]
  },
  {
   "ref": "be-tv-worterklaerung-warten:10",
   "fach": "textverstaendnis-bern",
   "oberthema": "Worterklärungen",
   "format": "einfachauswahl",
   "stamm": "Was bedeutet der Ausdruck im Textzusammenhang?\n\n«im Schnitt» (Abschnitt A)",
   "text": "Warum Warten so schwerfällt\nA\n  1  Elf Sekunden. So lange dauert es im Schnitt, bis eine Person an der\n     Bushaltestelle zum ersten Mal aufs Handy schaut. Das hat eine Gruppe von\n     Studierenden in Bern herausgefunden, die einen Nachmittag lang gezählt hat,\n     wer wann in die Tasche greift. Wer wartet, hält die Leere kaum aus. Dabei\n  5  warten wir jeden Tag: an der Kasse, vor dem Schulzimmer, auf eine Antwort, die\n     nicht kommt.\n\nB\n     Dass sich Warten zäh anfühlt, ist keine Einbildung. In Versuchen schätzen\n     Menschen leere Zeit regelmässig länger ein, als sie ist, im Schnitt um gut\n     ein Drittel. Ist die Zeit dagegen gefüllt, etwa mit einem Gespräch oder einer\n 10  Aufgabe, schrumpft sie im Rückblick zusammen. Unser Zeitgefühl misst nicht\n     Minuten, sondern Ereignisse. Wo nichts geschieht, gibt es nichts zu messen,\n     und der Kopf füllt die Lücke mit Ungeduld.\n\nC\n     Entscheidend ist weniger die Dauer als die Auskunft. Eine Anzeigetafel, die\n     «noch 4 Minuten» meldet, macht das Warten erträglich, obwohl sie es um keine\n 15  Sekunde verkürzt. Fehlt die Anzeige, wird aus vier Minuten ein offenes Ende.\n     Verkehrsbetriebe wissen das seit Langem: Die Tafel am Perron ist keine\n     technische Spielerei, sondern das billigste Mittel gegen Beschwerden, das sie\n     haben.\n\nD\n     Am schwersten wiegt die Ungewissheit. Wer weiss, dass der Zug zwanzig Minuten\n 20  Verspätung hat, richtet sich ein und kauft sich einen Kaffee. Wer nur hört,\n     der Zug verspäte sich «auf unbestimmte Zeit», bleibt stehen und starrt auf die\n     Gleise. Psychologinnen nennen das den Unterschied zwischen einem geschlossenen\n     und einem offenen Warten. Das offene kostet mehr Kraft, weil man sich nicht\n     entscheiden kann, ob man bleibt oder geht.\n\nE\n 25  Aus diesem Wissen ist längst ein Handwerk geworden. An manchen Flughäfen führt\n     der Weg vom Flugzeug zum Gepäckband einen Umweg. Die Reisenden gehen sieben\n     Minuten und warten dann eine, statt eine Minute zu gehen und sieben zu warten.\n     Die Gesamtzeit bleibt gleich, die Beschwerden gehen zurück. In Freizeitparks\n     stehen entlang der Schlange Spiegel, Bildschirme und kleine Rätsel. Nichts\n 30  davon macht die Schlange kürzer.\n\nF\n     Man kann das für einen Trick halten. Man kann es auch nüchtern betrachten: Wer\n     wartet, leidet nicht an der Zeit, sondern an der Leere und am Nichtwissen.\n     Beides lässt sich füllen, ohne jemanden zu täuschen. Wer das nächste Mal an\n     der Haltestelle steht, kann es selbst ausprobieren, nicht aufs Handy schauen,\n 35  sondern auf die Uhr, und danach schätzen, wie lange es gedauert hat. Die\n     meisten liegen deutlich daneben.",
   "optionen": [
    "durchschnittlich",
    "mindestens",
    "höchstens",
    "an einem Schnittpunkt"
   ],
   "loesung": "durchschnittlich",
   "erklaerung": "«Im Schnitt» ist die Kurzform von «im Durchschnitt». Es nennt einen Mittelwert, keine Grenze nach oben oder unten.",
   "fehler": [
    {
     "antwort": "mindestens",
     "diagnoseId": "grenze_statt_mittel",
     "feedback": "«Im Schnitt» nennt keinen kleinsten Wert. Einzelne schauen früher hin, andere später. Elf Sekunden liegen dazwischen."
    },
    {
     "antwort": "an einem Schnittpunkt",
     "diagnoseId": "wortsinn_statt_uebertragung",
     "feedback": "Du hast an das Schneiden gedacht. «Im Schnitt» ist eine feste Wendung und meint den Durchschnitt."
    }
   ],
   "hinweise": [
    "Lies den Satz noch einmal ganz. Der Ausdruck allein sagt zu wenig. Was passiert davor, was danach?",
    "Setze jede der vier Bedeutungen probeweise in den Satz ein. Meist bleiben zwei übrig, die beide gehen könnten.",
    "Bei den letzten zwei entscheidet der Ton des Abschnitts: Ist die Stelle sachlich, kritisch oder eher wohlwollend gemeint?"
   ]
  },
  {
   "ref": "be-tv-worterklaerung-warten:11",
   "fach": "textverstaendnis-bern",
   "oberthema": "Worterklärungen",
   "format": "einfachauswahl",
   "stamm": "Was bedeutet der Ausdruck im Textzusammenhang?\n\n«ist keine Einbildung» (Abschnitt B)",
   "text": "Warum Warten so schwerfällt\nA\n  1  Elf Sekunden. So lange dauert es im Schnitt, bis eine Person an der\n     Bushaltestelle zum ersten Mal aufs Handy schaut. Das hat eine Gruppe von\n     Studierenden in Bern herausgefunden, die einen Nachmittag lang gezählt hat,\n     wer wann in die Tasche greift. Wer wartet, hält die Leere kaum aus. Dabei\n  5  warten wir jeden Tag: an der Kasse, vor dem Schulzimmer, auf eine Antwort, die\n     nicht kommt.\n\nB\n     Dass sich Warten zäh anfühlt, ist keine Einbildung. In Versuchen schätzen\n     Menschen leere Zeit regelmässig länger ein, als sie ist, im Schnitt um gut\n     ein Drittel. Ist die Zeit dagegen gefüllt, etwa mit einem Gespräch oder einer\n 10  Aufgabe, schrumpft sie im Rückblick zusammen. Unser Zeitgefühl misst nicht\n     Minuten, sondern Ereignisse. Wo nichts geschieht, gibt es nichts zu messen,\n     und der Kopf füllt die Lücke mit Ungeduld.\n\nC\n     Entscheidend ist weniger die Dauer als die Auskunft. Eine Anzeigetafel, die\n     «noch 4 Minuten» meldet, macht das Warten erträglich, obwohl sie es um keine\n 15  Sekunde verkürzt. Fehlt die Anzeige, wird aus vier Minuten ein offenes Ende.\n     Verkehrsbetriebe wissen das seit Langem: Die Tafel am Perron ist keine\n     technische Spielerei, sondern das billigste Mittel gegen Beschwerden, das sie\n     haben.\n\nD\n     Am schwersten wiegt die Ungewissheit. Wer weiss, dass der Zug zwanzig Minuten\n 20  Verspätung hat, richtet sich ein und kauft sich einen Kaffee. Wer nur hört,\n     der Zug verspäte sich «auf unbestimmte Zeit», bleibt stehen und starrt auf die\n     Gleise. Psychologinnen nennen das den Unterschied zwischen einem geschlossenen\n     und einem offenen Warten. Das offene kostet mehr Kraft, weil man sich nicht\n     entscheiden kann, ob man bleibt oder geht.\n\nE\n 25  Aus diesem Wissen ist längst ein Handwerk geworden. An manchen Flughäfen führt\n     der Weg vom Flugzeug zum Gepäckband einen Umweg. Die Reisenden gehen sieben\n     Minuten und warten dann eine, statt eine Minute zu gehen und sieben zu warten.\n     Die Gesamtzeit bleibt gleich, die Beschwerden gehen zurück. In Freizeitparks\n     stehen entlang der Schlange Spiegel, Bildschirme und kleine Rätsel. Nichts\n 30  davon macht die Schlange kürzer.\n\nF\n     Man kann das für einen Trick halten. Man kann es auch nüchtern betrachten: Wer\n     wartet, leidet nicht an der Zeit, sondern an der Leere und am Nichtwissen.\n     Beides lässt sich füllen, ohne jemanden zu täuschen. Wer das nächste Mal an\n     der Haltestelle steht, kann es selbst ausprobieren, nicht aufs Handy schauen,\n 35  sondern auf die Uhr, und danach schätzen, wie lange es gedauert hat. Die\n     meisten liegen deutlich daneben.",
   "optionen": [
    "beruht auf etwas Nachprüfbarem",
    "ist nicht vorstellbar",
    "ist gut ausgedacht",
    "lässt sich nicht erklären"
   ],
   "loesung": "beruht auf etwas Nachprüfbarem",
   "erklaerung": "Der Satz wehrt den Verdacht ab, das Gefühl sei bloss subjektiv. Direkt danach folgen Versuchsergebnisse. Genau das ist das Nachprüfbare.",
   "fehler": [
    {
     "antwort": "ist nicht vorstellbar",
     "diagnoseId": "wortverwandtschaft",
     "feedback": "Du hast «Einbildung» mit «Vorstellung» gleichgesetzt. Eine Einbildung ist etwas, das nur im Kopf besteht und dort falsch ist."
    },
    {
     "antwort": "lässt sich nicht erklären",
     "diagnoseId": "gegenteil",
     "feedback": "Der Abschnitt erklärt es gerade: Leere Zeit wird länger geschätzt. Der Satz kündigt die Erklärung an, statt sie zu verweigern."
    }
   ],
   "hinweise": [
    "Lies den Satz noch einmal ganz. Der Ausdruck allein sagt zu wenig. Was passiert davor, was danach?",
    "Setze jede der vier Bedeutungen probeweise in den Satz ein. Meist bleiben zwei übrig, die beide gehen könnten.",
    "Bei den letzten zwei entscheidet der Ton des Abschnitts: Ist die Stelle sachlich, kritisch oder eher wohlwollend gemeint?"
   ]
  },
  {
   "ref": "be-tv-worterklaerung-warten:12",
   "fach": "textverstaendnis-bern",
   "oberthema": "Worterklärungen",
   "format": "einfachauswahl",
   "stamm": "Was bedeutet der Ausdruck im Textzusammenhang?\n\n«schrumpft sie im Rückblick zusammen» (Abschnitt B)",
   "text": "Warum Warten so schwerfällt\nA\n  1  Elf Sekunden. So lange dauert es im Schnitt, bis eine Person an der\n     Bushaltestelle zum ersten Mal aufs Handy schaut. Das hat eine Gruppe von\n     Studierenden in Bern herausgefunden, die einen Nachmittag lang gezählt hat,\n     wer wann in die Tasche greift. Wer wartet, hält die Leere kaum aus. Dabei\n  5  warten wir jeden Tag: an der Kasse, vor dem Schulzimmer, auf eine Antwort, die\n     nicht kommt.\n\nB\n     Dass sich Warten zäh anfühlt, ist keine Einbildung. In Versuchen schätzen\n     Menschen leere Zeit regelmässig länger ein, als sie ist, im Schnitt um gut\n     ein Drittel. Ist die Zeit dagegen gefüllt, etwa mit einem Gespräch oder einer\n 10  Aufgabe, schrumpft sie im Rückblick zusammen. Unser Zeitgefühl misst nicht\n     Minuten, sondern Ereignisse. Wo nichts geschieht, gibt es nichts zu messen,\n     und der Kopf füllt die Lücke mit Ungeduld.\n\nC\n     Entscheidend ist weniger die Dauer als die Auskunft. Eine Anzeigetafel, die\n     «noch 4 Minuten» meldet, macht das Warten erträglich, obwohl sie es um keine\n 15  Sekunde verkürzt. Fehlt die Anzeige, wird aus vier Minuten ein offenes Ende.\n     Verkehrsbetriebe wissen das seit Langem: Die Tafel am Perron ist keine\n     technische Spielerei, sondern das billigste Mittel gegen Beschwerden, das sie\n     haben.\n\nD\n     Am schwersten wiegt die Ungewissheit. Wer weiss, dass der Zug zwanzig Minuten\n 20  Verspätung hat, richtet sich ein und kauft sich einen Kaffee. Wer nur hört,\n     der Zug verspäte sich «auf unbestimmte Zeit», bleibt stehen und starrt auf die\n     Gleise. Psychologinnen nennen das den Unterschied zwischen einem geschlossenen\n     und einem offenen Warten. Das offene kostet mehr Kraft, weil man sich nicht\n     entscheiden kann, ob man bleibt oder geht.\n\nE\n 25  Aus diesem Wissen ist längst ein Handwerk geworden. An manchen Flughäfen führt\n     der Weg vom Flugzeug zum Gepäckband einen Umweg. Die Reisenden gehen sieben\n     Minuten und warten dann eine, statt eine Minute zu gehen und sieben zu warten.\n     Die Gesamtzeit bleibt gleich, die Beschwerden gehen zurück. In Freizeitparks\n     stehen entlang der Schlange Spiegel, Bildschirme und kleine Rätsel. Nichts\n 30  davon macht die Schlange kürzer.\n\nF\n     Man kann das für einen Trick halten. Man kann es auch nüchtern betrachten: Wer\n     wartet, leidet nicht an der Zeit, sondern an der Leere und am Nichtwissen.\n     Beides lässt sich füllen, ohne jemanden zu täuschen. Wer das nächste Mal an\n     der Haltestelle steht, kann es selbst ausprobieren, nicht aufs Handy schauen,\n 35  sondern auf die Uhr, und danach schätzen, wie lange es gedauert hat. Die\n     meisten liegen deutlich daneben.",
   "optionen": [
    "erscheint sie nachträglich kürzer",
    "vergeht sie langsamer",
    "wird sie tatsächlich kürzer",
    "kann man sich nicht mehr an sie erinnern"
   ],
   "loesung": "erscheint sie nachträglich kürzer",
   "erklaerung": "«Im Rückblick» heisst: wenn man später darauf zurückschaut. Gemeint ist die Einschätzung, nicht die gemessene Dauer.",
   "fehler": [
    {
     "antwort": "wird sie tatsächlich kürzer",
     "diagnoseId": "schaetzung_und_messung",
     "feedback": "Die Zeit selbst ändert sich nicht. Nur wie lang sie einem vorkommt. Genau diesen Unterschied macht der ganze Abschnitt."
    },
    {
     "antwort": "vergeht sie langsamer",
     "diagnoseId": "gegenteil",
     "feedback": "Das ist die andere Richtung. Gefüllte Zeit kommt einem kürzer vor, nicht länger."
    }
   ],
   "hinweise": [
    "Lies den Satz noch einmal ganz. Der Ausdruck allein sagt zu wenig. Was passiert davor, was danach?",
    "Setze jede der vier Bedeutungen probeweise in den Satz ein. Meist bleiben zwei übrig, die beide gehen könnten.",
    "Bei den letzten zwei entscheidet der Ton des Abschnitts: Ist die Stelle sachlich, kritisch oder eher wohlwollend gemeint?"
   ]
  }
 ]
};
