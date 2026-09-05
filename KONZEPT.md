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
4. **Kein Eingabefeld ohne konkrete Rückmeldung.** Lässt sich für ein geplantes Feld nicht
   benennen, *wo* es sichtbar wird und *ab wann*, wird es nicht gebaut. Sonst entstehen
   Datenfriedhöfe: man tippt bei jedem Training etwas ein und sieht nie wieder etwas davon.
   Die Tabelle unter „Was mit welchem Datum passiert" ist die Umsetzung dieser Regel und
   ist bei jedem neuen Feld zu ergänzen.

---

## Die drei Ziele der Statistik

1. **Über- und Unterbelastung erkennen.** Mit einer wichtigen Einschränkung: „zu wenig für
   dein Ziel" kann keine App aus Trainingsdaten allein bestimmen – siehe Stufe 2.
2. **Zeigen, ob progressive Overload noch stattfindet.**
3. **Aktuellen Zustand mit der Vergangenheit vergleichbar machen.**

### Stand heute (Sept. 2026)

| Ziel | Stand | Lücke |
|---|---|---|
| Überbelastung | teilweise | Schwellen sind Bevölkerungsdurchschnitt, nicht persönlich. Nach einer Pause entstehen Fehlalarme, weil der Vergleichsschnitt niedrig ist. |
| Unterbelastung | fehlt | `detectLoadSignal` kennt nur `overload`, `overload-watch`, `plateau`. Alles wird nur relativ zum eigenen jüngsten Schnitt gemessen – sinkt der Schnitt langsam mit, fällt schleichender Abbau nie auf. |
| Progressive Overload | Rohdaten da, Zusammenfassung fehlt | Charts und Plateau-Signal existieren, aber nirgends steht in Klartext „Kraft seit X Wochen flach". Kraft und Volumen werden in einer Kennzahl vermischt, obwohl es zwei verschiedene Wege sind, zu progressieren. |
| Vergleich früher/heute | gut | Zeiträume, Sparklines, %-Vergleiche, Verlauf. |

---

## Stufenplan

### Stufe 1 – Eingabe: RIR und Sitzungsgefühl

Ohne diese Daten bleibt alles andere eine Schätzung aus Tonnage.

- **RIR pro Übung, nicht pro Satz** – abgefragt nach dem *letzten* Satz einer Übung.
  Begründung: 1RM-Schätzungen sind nur nahe am Muskelversagen belastbar; ein Satz mit
  4 Wiederholungen Reserve liefert kaum verwertbare Information. Der letzte Satz trägt
  die Aussage, die übrigen kosten vor allem Tipparbeit.
- **RIR, nicht RPE** – erfasst wird, wie viele Wiederholungen noch drin gewesen wären,
  nicht ein Wert auf einer 10er-Skala. In der Bedienung steht schlicht „RIR"; die Frage
  ausformuliert hinzuschreiben kostet im Training nur Platz. Begründung:
  - Beides misst dasselbe: Die moderne Kraftsport-RPE-Skala (Zourdos et al. 2016) ist über
    RIR *definiert* (RPE 10 = 0 RIR, RPE 9 = 1 RIR). Die Frage ist also nur, welche
    Formulierung zuverlässiger beantwortet wird.
  - Die RIR-basierte Skala gilt gegenüber der klassischen RPE-Skala als valider, besonders
    bei Sätzen nahe am Limit – genau dort, wo hier gemessen wird.
  - RIR fragt etwas Zählbares; RPE verlangt zusätzlich eine Übersetzung in eine abstrakte
    Zahl, und jeder Übersetzungsschritt kostet Genauigkeit.
  - Genauigkeit hängt stark von der Nähe zum Versagen ab: bei 1 RIR sind Trainierte deutlich
    genauer als bei 3 oder 5 RIR (mittlerer Fehler bei Trainierten ≈ 0,65 Wdh.). Erfahrene
    unterschätzen um ca. 1–2 Wiederholungen, Unerfahrene um 4–5 (Steele et al. 2017).
    Das Trainingsmuster hier (1–2 in Reserve, letzter Satz nahe ans Versagen) liegt genau im
    genauesten Bereich der Skala – bei „4–5 im Tank" wäre die Datenqualität deutlich schlechter.
  - Gespeichert wird RIR; RPE ist daraus jederzeit berechenbar (RPE = 10 − RIR).
- **Sitzungsgefühl 1–5 mit sprachlichen Ankern** (nicht 1–10, nicht nur Zahlen).
  Begründung: Menschen unterscheiden subjektive Zustände zuverlässig in etwa 5–7 Stufen;
  eine feinere Skala liefert Scheingenauigkeit statt Signal. Worte statt Zahlen, weil man
  Monate später gegen einen Begriff vergleichen kann, nicht gegen die Erinnerung an eine „7".
- **Kein „nur Abweichungen eintragen"-Modell.** Klingt bequem, macht aber „nichts
  eingetragen" zweideutig: wie geplant gelaufen, oder schlicht nicht erfasst?

### Stufe 2 – Die zwei fehlenden Signale

**Normalbereich je Muskelgruppe** – bewusst *nicht* „Unterbelastungs-Erkennung" genannt:
Der Bereich wird aus dem eigenen Verhalten gebildet und kann deshalb nur sagen
„weniger als sonst", niemals „zu wenig für dein Ziel".
- Verglichen wird ein **rollierender 3-Wochen-Schnitt**, nicht eine Einzelwoche. Das macht
  die Trainingsfrequenz egal: eine Muskelgruppe, die alle 10 Tage drankommt, fällt sonst
  in halbleeren Wochen fälschlich unter den Bereich.
- Der Bereich selbst kommt aus **16–20 Wochen** Historie. Aus 12 Wochenwerten ist ein
  Perzentilband zu dünn geschätzt und wandert von Woche zu Woche spürbar.
- Gemeldet wird erst nach **zwei aufeinanderfolgenden** Zeiträumen außerhalb – ein
  Hinweis, der bei jedem Ausreißer anspringt, wird zu Recht ignoriert.
- Der Bereich der Vorperiode blass dahinter macht schleichenden Abbau sichtbar: wandert
  das Band selbst nach unten, sieht man es.

**Echte Unterbelastung braucht zwei Signale gleichzeitig:** *weniger als sonst* **und**
*kein Fortschritt* über mehrere Wochen. Erst diese Kombination erlaubt die Aussage „das ist
für dich zu wenig" – hergeleitet aus der eigenen Reaktion statt aus einer Lehrbuchzahl.
Jedes Signal für sich kann das nicht.

**Progressive Overload: zwei Trends zeigen, kein Urteil fällen.**
- **Kraft** = geschätztes 1RM des **ersten Arbeitssatzes** je Übung. Begründung: Bei
  gleichbleibendem Gewicht über alle Sätze (der hier genutzte Stil) ist der letzte Satz der
  am stärksten vorermüdete – und wie viel Vorermüdung drinsteckt, hängt davon ab, wie viele
  Sätze an dem Tag geschafft wurden. Ein kurzer Tag sähe damit wie Kraftzuwachs aus. Der
  erste Satz wird dagegen immer frisch ausgeführt, egal wie lang das Training war. Dass dort
  1–3 Wiederholungen in Reserve bleiben, macht die Schätzung systematisch etwas zu niedrig –
  aber immer gleich, und für einen Trend zählt Vergleichbarkeit, nicht absolute Genauigkeit.
- **Volumen** getrennt davon, über einen mehrwöchigen Trend statt Einzelwochen-Vergleich.
- **Kein Label wie „mehr Arbeit ohne Ertrag".** Kraft flach bei steigendem Volumen ist in
  einer Hypertrophie-Phase im 10–15er-Bereich völlig normal. Welche Phase gerade läuft, weiß
  die App nicht – ein Urteil zu fällen, das die Absicht nicht kennt, verstößt gegen Regel 3.
  Gezeigt wird „Kraft seit 8 Wochen flach, Volumen +18 %", gedeutet wird selbst.

**Ein kurzer Tag darf das Bild nicht kippen.** Heute tut er das: die Plateau-Erkennung
vergleicht die aktuelle Woche gegen das Maximum der drei Wochen davor, eine Woche mit wenig
Zeit löst deshalb eine Plateau-Meldung aus. Gegenmittel sind der Erst-Satz-Anker oben, der
Mehrwochen-Trend, und: ausgefallene Einheiten sind **Lücken, keine Nullen**.

### Stufe 3 – Kalibrierungs-Schleife

- **Eichsätze mit Vorher-Schätzung:** gelegentlich ein letzter Satz bis zum echten Versagen,
  Schätzung vorher. Danach: „8 geschätzt, 11 geschafft." Über Wochen entsteht die eigene
  Kalibrierungskurve („ich unterschätze mich um ~2 Wiederholungen").
- **Gefühl gegen Leistung:** Rückmeldung auf die eigene Wahrnehmung. Zwei Fallstricke:
  - Die Leistung steigt über die Zeit ohnehin. Verglichen wird deshalb nicht gegen einen
    flachen Durchschnitt, sondern gegen die **Erwartung für diesen Tag** (rollierender
    Schnitt der letzten vergleichbaren Sitzungen); ausgewertet wird die *Abweichung* davon,
    die per Konstruktion keinen Trend mehr enthält.
  - Die Datenmenge ist der Engpass: Aus 10–15 Sitzungen entstehen nur eine Handvoll „müde"-
    Tage, ein Mittelwert daraus ist Rauschen. Die Abweichung wird deshalb **pro Übung**
    gerechnet (4–5 Beobachtungen je Training statt einer) – kein echter Faktor 5, weil die
    Übungen eines Tages sich ähneln, aber deutlich schneller. Bis die Basis trägt, wird
    **keine Prozentzahl** gezeigt, sondern eine Tendenz, immer mit der Angabe, worauf sie
    beruht („aus 7 müden Tagen").
- **Antworten auf Warnungen justieren die Schwellen** (siehe Regel 2 oben).

---

## Was mit welchem Datum passiert

Umsetzung von Regel 4. Jede Zeile beantwortet: Wofür wird es gebraucht, **wo sieht man es**,
und ab wann liefert es etwas. Ein Feld ohne Zeile in dieser Tabelle wird nicht gebaut.

| Datum | Speist | Sichtbar als | Ab wann |
|---|---|---|---|
| **RIR letzter Satz** | %1RM-Schätzung des Satzes | „Letztes Mal: 100 kg × 8 (1 in Reserve)" im Training | 2. Training |
| | Rekorderkennung mit Kontext | „100 × 5 mit 2 in Reserve – stärker als der alte Rekord am Limit" | sofort |
| | Kontext „war der Tag so hart wie sonst?" | Vergleich mit dem üblichen RIR derselben Übung | 3–4 Sitzungen je Übung |
| | Belastung pro Muskelgruppe | korrekte statt geschätzter Intensität | sofort |
| | Kalibrierung (Stufe 3) | Vorhersage gegen tatsächliche Leistung | siehe Eichsätze |
| **Sitzungsgefühl 1–5** | Abgleich Gefühl ↔ Leistung | „An ‚müde'-Tagen liegst du bei 97 % deiner üblichen Leistung" | 10–15 Sitzungen |
| | Kontext für schwache Wochen | Unterbelastungs-Warnung unterscheidet „wenig Zeit" von „ausgelaugt" | sofort |
| | Frühwarnung Überlastung | „3 Wochen ‚ausgelaugt' bei steigender Belastung" | ~3 Wochen |
| **Antwort auf eine Warnung** | persönliche Schwellen | Warnung kommt später oder gar nicht mehr | nach ~3 Antworten |
| **Eichsatz-Schätzung** | Kalibrierungskurve | „Du unterschätzt dich um 2,4 Wdh." | 3–5 Eichsätze |

Ehrlich dazu: Die Kalibrierungs-Auswertungen brauchen Datenpunkte und liefern in den ersten
Wochen nichts. Die RIR-Effekte auf Rekorde, „Letztes Mal" und Intensität wirken sofort.

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
