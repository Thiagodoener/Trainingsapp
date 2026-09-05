# Iron Log – Leitgedanken und Statistik-Konzept

Diese Datei hält fest, **wofür** die App gebaut wird und **warum** die Statistiken so
gerechnet werden, wie sie gerechnet werden. Sie ist die Messlatte für neue Features:
Was gegen die Leitgedanken läuft, wird nicht gebaut – auch wenn es technisch reizvoll ist.

---

## Leitprinzip

**Die App soll das eigene Körpergefühl schärfen, nicht ersetzen.**

Ein Werkzeug, das einem das Urteil abnimmt, lässt das eigene Urteil verkümmern. Ein
Werkzeug, das die eigene Einschätzung abfragt und danach die Daten dagegen hält, macht
die Einschätzung besser. Der Unterschied liegt in genau einer Frage: **wer schätzt zuerst?**

Daraus folgen drei Regeln:

1. **Erst schätzen lassen, dann Zahlen zeigen.** Wo es geht, fragt die App nach der
   eigenen Einschätzung, bevor sie ihre eigene Auswertung zeigt.
2. **Warnungen sind Fragen, keine Urteile.** Nicht „Überlastung, reduziere", sondern
   „liegt 34 % über deinem Schnitt – wie fühlt sich das an?". Die Antwort wird gemerkt
   und justiert mit der Zeit die persönlichen Schwellen.
3. **Keine Trainingsvorschläge.** Die App zeigt Zustand und Verlauf. Was daraus folgt,
   entscheidet der Mensch. Genau an der Stelle würde sonst das Abtrainieren des eigenen
   Gefühls beginnen.

---

## Die drei Ziele der Statistik

1. **Über- und Unterbelastung erkennen.**
2. **Zeigen, ob progressive Overload noch stattfindet.**
3. **Aktuellen Zustand mit der Vergangenheit vergleichbar machen.**

### Stand heute (Sept. 2026)

| Ziel | Stand | Lücke |
|---|---|---|
| Überbelastung | teilweise | Schwellen sind Bevölkerungsdurchschnitt, nicht persönlich. Nach einer Pause entstehen Fehlalarme, weil der Vergleichsschnitt niedrig ist. |
| Unterbelastung | fehlt | `detectLoadSignal` kennt nur `overload`, `overload-watch`, `plateau`. Alles wird nur relativ zum eigenen jüngsten Schnitt gemessen – sinkt der Schnitt langsam mit, fällt schleichender Abbau nie auf. |
| Progressive Overload | Rohdaten da, Urteil fehlt | Charts und Plateau-Signal existieren, aber nirgends steht in Klartext „läuft" / „steht seit X Wochen". Kraft und Volumen werden in einer Kennzahl vermischt. |
| Vergleich früher/heute | gut | Zeiträume, Sparklines, %-Vergleiche, Verlauf. |

---

## Stufenplan

### Stufe 1 – Eingabe: RIR und Sitzungsgefühl

Ohne diese Daten bleibt alles andere eine Schätzung aus Tonnage.

- **RIR pro Übung, nicht pro Satz** – abgefragt nach dem *letzten* Satz einer Übung.
  Begründung: 1RM-Schätzungen sind nur nahe am Muskelversagen belastbar; ein Satz mit
  4 Wiederholungen Reserve liefert kaum verwertbare Information. Der letzte Satz trägt
  die Aussage, die übrigen kosten vor allem Tipparbeit.
- **Sitzungsgefühl 1–5 mit sprachlichen Ankern** (nicht 1–10, nicht nur Zahlen).
  Begründung: Menschen unterscheiden subjektive Zustände zuverlässig in etwa 5–7 Stufen;
  eine feinere Skala liefert Scheingenauigkeit statt Signal. Worte statt Zahlen, weil man
  Monate später gegen einen Begriff vergleichen kann, nicht gegen die Erinnerung an eine „7".
- **Kein „nur Abweichungen eintragen"-Modell.** Klingt bequem, macht aber „nichts
  eingetragen" zweideutig: wie geplant gelaufen, oder schlicht nicht erfasst?

### Stufe 2 – Die zwei fehlenden Signale

**Zielkorridor je Muskelgruppe** (löst Unterbelastung):
- Spanne aus den letzten 12–16 Wochen, konkret das 25.–75. Perzentil der Wochenwerte
  (robuster als Mittelwert ± Streuung, einzelne Ausreißerwochen verzerren nicht).
- Wochen ganz ohne Training fließen nicht ein, sonst zieht jeder Urlaub den Korridor nach unten.
- Angezeigt wird die Lage zum eigenen Korridor (darunter / drin / darüber), nicht eine
  nackte Prozentzahl. Innerhalb der Spanne gibt es keine Meldung – das ist normales Auf und Ab.
- Der Korridor der Vorperiode (Woche 13–26) blass dahinter macht schleichenden Abbau sichtbar:
  wandert das Band selbst nach unten, sieht man es.
- **Beschreibend, nicht vorschreibend.** Der Korridor sagt „das ist deine normale
  Arbeitsspanne", nicht „das ist die richtige Menge für dein Ziel".

**Progressive-Overload-Urteil je Übung**, auf zwei getrennten Achsen:
- **Kraft** aus dem *besten Satz* je Übung (geschätztes 1RM), **Volumen** getrennt davon.
- Vier Fälle in Klartext: Kraft ↑ Volumen ↑ = Fortschritt · Kraft ↑ Volumen gleich =
  effizienter · **Kraft flach, Volumen ↑ = mehr Arbeit ohne Ertrag** (der wichtigste Fall,
  heute nirgends sichtbar) · Kraft ↓ Volumen ↓ = Rückschritt oder Erholungsproblem.

**Ein kurzer Tag darf das Urteil nicht kippen.** Heute tut er das: die Plateau-Erkennung
vergleicht die aktuelle Woche gegen das Maximum der drei Wochen davor, eine Woche mit wenig
Zeit löst deshalb eine Plateau-Meldung aus. Gegenmittel:
- Kraft am besten Satz messen, nicht an der Wochensumme – zwei starke Sätze statt fünf
  bedeuten weniger Volumen, aber keinen Kraftverlust.
- Trend über mehrere Wochen statt Einzelwochen-Vergleich.
- Ausgefallene Einheiten sind **Lücken, keine Nullen**.

### Stufe 3 – Kalibrierungs-Schleife

- **Eichsätze mit Vorher-Schätzung:** gelegentlich ein letzter Satz bis zum echten Versagen,
  Schätzung vorher. Danach: „8 geschätzt, 11 geschafft." Über Wochen entsteht die eigene
  Kalibrierungskurve („ich unterschätze mich um ~2 Wiederholungen").
- **Gefühl gegen Leistung:** „Wenn du dich schwach fühlst, machst du trotzdem 95 % deiner
  üblichen Leistung" – Rückmeldung auf die eigene Wahrnehmung.
- **Antworten auf Warnungen justieren die Schwellen** (siehe Regel 2 oben).

---

## Getroffene Entscheidungen

**Dropsätze zählen nicht als eigener Satz in „Sätze pro Muskelgruppe".**
Die Kennzahl bildet unabhängige Trainingsreize mit Erholung dazwischen ab (MEV/MAV/MRV-Logik);
zwischen einem Satz und seinen Drops gibt es keine Erholung. In Volumen, Wiederholungssummen
und „Belastung pro Muskelgruppe" zählen sie dagegen voll mit – die Arbeit wurde ja geleistet.

**„Belastung pro Muskelgruppe" misst Arbeit, nicht Satzanzahl.**
Jeder Satz wird gegen den besten Einzelsatz derselben Übung normiert, danach über rollierende
7-Tage-Fenster summiert. Zwei getrennte Kennzahlen (Anzahl vs. Arbeit) sind Absicht.

---

## Offene Punkte

- **1RM-Formel statt roher Tonnage** in `loadSetWork`: `Gewicht × Wdh.` vermischt Volumen und
  Intensität – ein Wechsel von 5×5 auf 3×12 sieht wie ein Belastungssprung aus, obwohl die
  relative Intensität sinkt. Vorschlag: Mittelwert aus Epley, Brzycki und Lombardi (Lombardi
  bleibt bei hohen Wiederholungszahlen konservativ und dämpft Brzyckis Ausreißen nach oben).
  Zurückgestellt, weil RPE/RIR aus Stufe 1 das Problem an der Wurzel löst, statt es besser zu raten.
- **Bestwert-Bezug zeitlich begrenzen:** `best[exerciseId]` ist der beste Satz *aller Zeiten*.
  Ein alter Ausreißer verschiebt den Maßstab dauerhaft.
- **Gym-Trennung** fehlt in `getMuscleLoadSeries` – anders als bei den Einzelübungs-Statistiken
  wird dort über alle Gyms hinweg gerechnet.
- **Ausdauer** (Laufen, Rad, Schwimmen, Airbike) als eigene Einheiten mit Session-RPE als
  gemeinsamer Belastungswährung.
