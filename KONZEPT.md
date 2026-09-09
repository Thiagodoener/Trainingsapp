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
| Überbelastung | gut | Zusätzlich zum Belastungssignal je Muskelgruppe gibt es die Frühwarnung aus Gefühl **und** steigender Belastung (`getFatigueWarning`), gemessen gegen den eigenen Normalwert statt gegen einen Bevölkerungsschnitt. Geplante Entlastungswochen sind markierbar und fallen aus allen Warnungen heraus. |
| Unterbelastung | fehlt | `detectLoadSignal` kennt nur `overload`, `overload-watch`, `plateau`. Alles wird nur relativ zum eigenen jüngsten Schnitt gemessen – sinkt der Schnitt langsam mit, fällt schleichender Abbau nie auf. |
| Progressive Overload | Rohdaten da, Zusammenfassung fehlt | Charts und Plateau-Signal existieren, aber nirgends steht in Klartext „Kraft seit X Wochen flach". Kraft und Volumen werden in einer Kennzahl vermischt, obwohl es zwei verschiedene Wege sind, zu progressieren. |
| Vergleich früher/heute | gut | Zeiträume, Sparklines, %-Vergleiche, Verlauf. |

Damit ist die Unterbelastung die letzte offene der drei – und sie hängt am Fortschritts-Signal:
laut Stufe 2 braucht sie *weniger als sonst* **und** *kein Fortschritt* gleichzeitig, das zweite
Signal existiert noch nicht.

---

## Stufenplan

### Stufe 1 – Eingabe: RIR und Sitzungsgefühl ✅ gebaut

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

### Stufe 2 – Die zwei fehlenden Signale ⬜ offen

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

**Ein kurzer Tag darf das Bild nicht kippen.** ✅ Für die Belastungsreihe erledigt (Sept. 2026),
für das Kraft-Signal steht der Erst-Satz-Anker weiter aus. Die Plateau-Erkennung verglich früher
die aktuelle Woche gegen das Maximum der drei Wochen davor, mit 5 % Toleranz – das verlangte in
*jeder* Woche mehr als 5 % Zuwachs und ließ eine einzelne Woche mit wenig Zeit sofort als
Stillstand erscheinen. Jetzt stehen zwei Wochen gegen zwei Wochen (siehe „Getroffene
Entscheidungen"). Und: ausgefallene Einheiten sind **Lücken, keine Nullen** – auch im
Vergleichs-Schnitt der Überlastungs-Erkennung.

### Stufe 3 – Kalibrierungs-Schleife ✅ bis auf die Warnungs-Antworten gebaut

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
- **Antworten auf Warnungen justieren die Schwellen** (siehe Regel 2 oben). ⬜ Als einziges
  Stück dieser Stufe noch offen.

**Wie es tatsächlich gebaut wurde – zwei Abweichungen von oben:**
- Die Erwartung entsteht aus den bis zu 2 Einheiten **davor und danach**, nicht nur aus den
  vorherigen. Ein einseitiger Schnitt hinkt einem steigenden Niveau hinterher und schenkt
  dadurch jedem Tag ein paar Prozent. Für den Vergleich der Gefühlsstufen untereinander wäre
  das egal, für die angezeigte Zahl nicht – und rückblickend über abgeschlossene Trainings sind
  beide Seiten verfügbar.
- Für die Vertrauensschwelle zählen **Trainings**, nicht Beobachtungen: Fünf Übungen an einem
  müden Tag sind ein müder Tag, kein fünffacher Beleg. Ab 3 Trainings je Stufe eine Tendenz,
  ab 5 eine Prozentzahl, die Grundlage steht immer dabei.
- Die Eichsatz-Auswertung rechnet über **alle Übungen zusammen**: Eichsätze kosten Überwindung
  und bleiben selten, je Übung käme auf Jahre keine tragfähige Zahl zustande. Aus dem Ergebnis
  wird bewusst **nichts** automatisch umgerechnet – weder bisherige RIR-Angaben noch die
  Belastung. Wie genau man bei einem All-out-Satz schätzt, ist verwandt mit dem RIR-Schätzen im
  Alltag, aber nicht dasselbe.

---

## Was mit welchem Datum passiert

Umsetzung von Regel 4. Jede Zeile beantwortet: Wofür wird es gebraucht, **wo sieht man es**,
und ab wann liefert es etwas. Ein Feld ohne Zeile in dieser Tabelle wird nicht gebaut.

Spalte „Stand": ✅ gebaut, ⬜ noch nicht.

| Datum | Speist | Sichtbar als | Ab wann | Stand |
|---|---|---|---|---|
| **RIR letzter Satz** | Kontext zum letzten Mal | „Letztes Mal: 100 kg × 8 · 1 RIR" im Training | 2. Training | ✅ |
| | Rekorderkennung mit Kontext | „Mehr Reserve als beim alten Rekord – der ging bis ans Limit." | sofort | ✅ |
| | Kontext „war der Tag so hart wie sonst?" | „Mehr Reserve als üblich (sonst meist 2 RIR)." nach der Eingabe | 3 Sitzungen je Übung | ✅ |
| | Belastung pro Muskelgruppe | Reserve-Gewichtung des letzten Satzes, ±3 % je Stufe | sofort | ✅ |
| **Sitzungsgefühl 1–5** | Abgleich Gefühl ↔ Leistung | „An ‚müde'-Tagen liegst du bei 97 % deiner üblichen Leistung" | 3 Trainings je Stufe (Tendenz), 5 (Prozent) | ✅ |
| | Frühwarnung Überlastung | „Seit 3 Wochen … schlechter als sonst – bei X % höherer Belastung" | ~3 Wochen + 12 Wochen Vergleichszeitraum | ✅ |
| | Kontext für schwache Wochen | Unterbelastungs-Warnung unterscheidet „wenig Zeit" von „ausgelaugt" | sofort | ⬜ hängt an der Unterbelastung |
| **Eichsatz-Schätzung** | Kalibrierungskurve | „Du unterschätzt dich im Schnitt um 2 Wiederholungen." | 3 Eichsätze | ✅ |
| **Entlastung (Zeitraum)** | Warnsignale | keine Meldung im Zeitraum selbst, kein verzerrter Vergleich danach | sofort | ✅ |
| | Diagramm | hohler Punkt in der Belastungs-Kurve, getönte Tage im Kalender mit Beschriftung | sofort | ✅ |
| | Kachel „kg Volumen" | „+184 % ggü. **Entlastungswoche**" statt „ggü. Vorwoche" | sofort | ✅ |
| | Zählerstand | „Letzte Entlastung: vor 7 von 8 Wochen." | sofort | ✅ |
| **Rhythmus (eigene Angabe)** | Fälligkeit | Hinweis auf der Startseite und Vorschlag im Kalender, sobald er erreicht ist | ab der 2. Entlastung | ✅ |
| | Wirkung | „Leistung je Satz +3,4 % · Gefühl 3,7 statt 3,2" | 2 Wochen nach der Entlastung | ✅ |
| **Schätzung nach der Entlastung** | Abgleich Wahrnehmung ↔ Zahlen | „Du hattest ‚besser' geschätzt – gemessen: gleich." | sofort nach der Abgabe | ✅ |
| **Antwort auf eine Warnung** | persönliche Schwellen | Warnung kommt später oder gar nicht mehr | nach ~3 Antworten | ⬜ |

Ehrlich dazu: Die Kalibrierungs-Auswertungen brauchen Datenpunkte und liefern in den ersten
Wochen nichts. Die RIR-Effekte auf Rekorde, „Letztes Mal" und Intensität wirken sofort.

**Zur RIR-Zuordnung – gilt überall:** Die Angabe beschreibt den *letzten* Satz einer Übung.
Ein Rekord, der in einem früheren Satz fiel, bekommt deshalb **keine** Reserve-Angabe statt einer
geliehenen; und in der Belastungsrechnung wird nur die Arbeit des letzten Satzes gewichtet.
Dass damit bei drei Sätzen nur rund ein Drittel der Wirkung übrigbleibt, ist der bewusst
gezahlte Preis dafür, nichts zu behaupten, was nicht erfasst wurde. Ein früherer Anlauf
multiplizierte die Summe der ganzen Übung mit dem Faktor – das ist dasselbe wie jeden Satz
einzeln zu gewichten (`f × (a+b+c) = f·a + f·b + f·c`) und war damit genau die Fehlzuordnung,
die es zu vermeiden galt.

## Getroffene Entscheidungen

**Dropsätze zählen nicht als eigener Satz in „Sätze pro Muskelgruppe".**
Die Kennzahl bildet unabhängige Trainingsreize mit Erholung dazwischen ab (MEV/MAV/MRV-Logik);
zwischen einem Satz und seinen Drops gibt es keine Erholung. In Volumen, Wiederholungssummen
und „Belastung pro Muskelgruppe" zählen sie dagegen voll mit – die Arbeit wurde ja geleistet.

**„Belastung pro Muskelgruppe" misst Arbeit, nicht Satzanzahl.**
Jeder Satz wird gegen den besten Einzelsatz derselben Übung normiert, danach über rollierende
7-Tage-Fenster summiert. Zwei getrennte Kennzahlen (Anzahl vs. Arbeit) sind Absicht.

**Dieselbe Übung darf mehrfach in einem Training stehen.**
Ein Zirkel ist oft A → B → A → C. Jeder Platz ist ein eigener Eintrag mit eigener ID; die
Übungs-ID identifiziert also *nicht mehr* eindeutig einen Eintrag. Alles, was im Nachhinein
rechnet, muss deshalb **alle** Plätze einer Übung zusammennehmen (`logEntriesFor` /
`logSetsFor`). Ein `.find()` würde die Sätze des zweiten Platzes still verschlucken – sie wären
für Rekorde, Verlauf und Charts dauerhaft verloren, ohne dass irgendwo ein Fehler auftaucht.
Genau dieser Fall ist mit einem eigenen Test abgesichert.

**Gezählt wird nur, was abgehakt ist.**
Beim Speichern bleiben auch nicht abgehakte Sätze im Log stehen – sie gehörten zum Plan dieses
Trainings. Für jede Auswertung und jede Anzeige zählt aber ausschließlich, was abgehakt wurde
(`performedSets` / `performedWorkingSets`). Sonst wäre ein vorbelegter, nie ausgeführter Satz
geleistete Arbeit – und die Statistik würde Trainings behaupten, die nie stattgefunden haben.

**Plateau heißt „vier Wochen ohne Zuwachs", nicht „diese Woche kein neuer Höchstwert".**
Verglichen wird der Schnitt der letzten zwei Wochen gegen den Schnitt der zwei davor; liegt der
neue Schnitt nicht mindestens 2 % darüber, ist es ein Plateau. Vorher stand dort: aktuelle Woche
gegen das Maximum der drei Wochen davor, 5 % Toleranz. Das hieß in der Praxis „mehr als 5 %
Zuwachs in **jeder** Woche, sonst Stillstand" – bei realistischen 2–3 % pro Woche war das Zeichen
damit fast dauerhaft an, und ein einzelner kurzer Tag löste es aus. Von den vier Wochen darf
höchstens eine fehlen (Urlaub, Krankheit, Entlastung); aus einer Woche gegen eine Woche wird kein
Urteil gefällt. Der Zeitraum ist bewusst kurz gehalten (Wunsch: eher früh melden) – die Mittelung
über je zwei Wochen federt den einzelnen schwachen Tag trotzdem ab.

**Leere Wochen zählen auch im Überlastungs-Schnitt als Lücke.**
Bis Sept. 2026 wurde der Vier-Wochen-Schnitt durch alle vier Wochen geteilt, auch durch die
leeren. Eine Woche Urlaub drückte ihn damit um ein Viertel, und die erste ganz normale Woche
danach löste einen Überlastungs-Alarm aus: aus `[100, 102, 0, 106]` wurde ein Schnitt von 77 statt
103, die nächste Woche mit 108 lag damit 40 % darüber statt 5 %. Derselbe Falschalarm wie bei einer
nicht markierten Entlastung – und ein Verstoß gegen die eigene Regel „Lücken, keine Nullen".
Eine wirklich leichte Woche (nicht null) zählt dagegen weiterhin mit; wenn sie geplant war, wird
sie markiert.

**Entlastungen sind Lücken, keine Tiefs – aber nur in den Warnungen.**
Eine bewusst leichtere Woche liest die App sonst als Einbruch. Gemessen an einem
steigenden Verlauf mit einer Entlastungswoche bei −55 % Arbeit: in der Woche selbst
„Plateau", in den vier Wochen danach „Überlastung", ab der fünften wieder Ruhe. Bei
einer Entlastung alle 6–8 Wochen trüge damit die Mehrheit aller Wochen ein falsches
Etikett – und eine Warnung, die meistens danebenliegt, wird zu Recht ignoriert.
Deshalb:
- **Warnungen** (`detectLoadSignal`, `getFatigueWarning`, `getFeelingPerformance` und die
  Prozentzahl neben einem Signal) lassen markierte Wochen aus dem Vergleich heraus.
- **Beschreibende Vergleiche** (Zeitraum-Chips, Sparklines, Charts) zeigen sie unverändert.
  Die Delle ist echt und soll sichtbar bleiben; sie wird markiert (hohler Punkt), nicht
  versteckt. Wo eine Zahl dadurch missverständlich wird, wird sie **beschriftet** statt
  gefiltert: „+184 % ggü. Entlastungswoche" statt „ggü. Vorwoche".
- **Der Vergleichszeitraum wird nicht nach hinten verlängert.** Ein erster Anlauf suchte so
  lange weiter zurück, bis wieder vier saubere Wochen zusammenkamen – und erzeugte damit
  Überlastungs-Meldungen, die es ohne Markierung nicht gab: Wer stetig mehr trainiert,
  dessen Wochen von vor zwei Monaten liegen tiefer, der Schnitt sinkt, und der normale
  Wiedereinstieg sieht wieder wie ein Sprung aus. Die zwei Wochen direkt vor der Entlastung
  sind der richtige Maßstab, auch wenn es weniger sind. Bleiben weniger als zwei saubere
  Wochen übrig, wird geschwiegen statt geraten.
- **Markiert wird ein beliebiger Zeitraum, nicht die Kalenderwoche.** Eine Entlastung läuft
  nicht zwingend Montag bis Sonntag – Mittwoch bis übernächsten Donnerstag ist genauso ein
  Zeitraum. Gespeichert wird `{ start, end }`; ältere Einträge ohne `end` werden still als
  Sieben-Tage-Woche gelesen. Gerechnet wird weiterhin in rollierenden 7-Tage-Fenstern, ein
  Zeitraum fällt deshalb fast immer in mehrere Fenster; alle davon werden übersprungen.
- **Bedienung: zwei Tippser.** Ersten Tag antippen, „Entlastung ab hier", letzten Tag antippen.
  Ein neuer Zeitraum ersetzt bestehende, die er überschneidet – sonst gäbe es zwei Einträge für
  dieselben Tage, die sich in jeder Auswertung doppelt auswirken.
- **Die App schlägt nie von sich aus eine Entlastung vor** (Regel 3). Sie sagt, wann der
  Rhythmus erreicht ist, den der Mensch selbst eingetragen hat – auf der Startseite als
  Feststellung („Seit 8 Wochen keine Entlastung – dein Rhythmus sind 6 Wochen") und im Kalender
  als Vorschlag an genau dem Tag, an dem er fällig wurde, mit einem Knopf zum Ausblenden.
  Ausgeblendet wird der *Zeitpunkt*, nicht der Hinweis an sich: Nach der nächsten Entlastung
  verschiebt sich die Fälligkeit, und der Hinweis kommt beim nächsten Mal von selbst wieder.
- **Die Wirkung wird je Übung gemessen**, nicht als Wochensumme: Sonst hinge das Ergebnis
  vor allem daran, wie viel Zeit gerade da war. Wer nach der Entlastung eine Einheit mehr
  schafft, sähe automatisch besser aus, ohne stärker geworden zu sein.

**Die Zeitraum-Chips bedeuten überall dasselbe: Sie schneiden das Diagramm zu.**
Bei den Übungs-Charts taten sie das bis Sept. 2026 nicht – dort standen sie nur in der
Prozent-Ansicht und änderten ausschließlich die Vergleichsbasis, während die Datumsleiste
unverändert blieb. „4 Wochen" liest sich aber wie „zeig mir 4 Wochen", und genau daneben tut
derselbe Chip bei den Muskelgruppen genau das. Jetzt gilt überall: dieselben Zeiträume
(`MUSCLE_COMPARE_OPTIONS`), immer sichtbar, N+1 Wochen im Bild (sonst bliebe bei „Vorwoche" ein
einzelner Punkt übrig). Gerechnet wird weiterhin auf der **vollen** Reihe und erst danach
zugeschnitten – der Vergleichspartner eines Punktes liegt naturgemäß vor dem sichtbaren
Zeitraum.

Was die Chips *rechnen*, bleibt dabei unterschiedlich, und das ist Absicht: Bei den
Muskelgruppen ist es „diese Woche gegen den **Schnitt** der N Wochen davor", bei den
Übungs-Charts „jeder Punkt gegen den **Wert** von vor N Wochen". Zwei verschiedene Fragen an
zwei verschiedene Datenformen. „Gesamt" heißt deshalb auch zweierlei: bei den Muskelgruppen der
Schnitt über die ganze Historie, bei den Übungs-Charts der Vergleich mit dem **ersten erfassten
Wert** („+34 % seit Beginn") – ohne diesen Fall wäre der Chip dort tot.

**Ein Knopf muss dorthin führen, wo er hinzuführen verspricht.**
„Verlauf dieser Übung ansehen" im 1RM-Fenster setzte bis Sept. 2026 nur die Auswahl für die
Chart-Liste weiter unten auf der Seite. Sichtbar wurde davon nichts: Das Fenster schloss sich,
die Seite blieb auf Scroll-Position 0 stehen, und es sah aus, als sei der Klick ins Leere
gegangen. Jetzt öffnet der Knopf das Übungs-Fenster, und zwar auf dem Reiter „Verlauf".

**Bänder bekommen einen kg-Wert, statt gar keinen.**
Bandübungen liefen bis Sept. 2026 ganz ohne Gewichtsfeld („ein Band hat kein sinnvolles
Gewicht"). Genau dadurch war ein Bandwechsel für die Statistik unsichtbar: Ein stärkeres Band
bei gleichen Wiederholungen sah aus wie Stillstand, ein schwächeres mit mehr Wiederholungen wie
Fortschritt. Jetzt legt man seine Bänder einmal an – Name plus ungefährer kg-Wert – und wählt
im Training das Band statt eine Zahl zu tippen.
- Der kg-Wert ist bewusst grob. Er muss nicht stimmen, er muss die Bänder nur **untereinander**
  richtig ordnen; ab da rechnet die App wie bei jeder Hantel.
- Gespeichert werden Kennung, **Name und kg-Wert am Satz**. Der Name steht später in
  „Letztes Mal" („Rot ×15"), und weil er mitgeschrieben statt nachgeschlagen wird, ändert ein
  Umbenennen oder Löschen des Bandes alte Trainings nicht rückwirkend.
- **Keine 1RM-Schätzung bei Bändern.** Der Widerstand steigt mit der Dehnung; ein „einmaliges
  Maximum" ist dabei keine sinnvolle Größe, anders als bei einer Hantel, die auf dem ganzen Weg
  gleich schwer bleibt.

**Atemübungen lassen sich nachtragen.**
Ein Atem-Protokoll entstand bis Sept. 2026 ausschließlich am Ende einer in der App gelaufenen
Sitzung, mit dem Zeitstempel „jetzt". Wer frei atmet – nach dem Training oder beim Laufen, ohne
Telefon in der Hand – konnte das nirgends festhalten. Ein geplanter Kalendereintrag half nicht:
Der bleibt ohne Protokoll für immer „offen" und taucht in keiner Statistik auf.
- Nachgetragen wird im Kalender (Tag → „+" → Atem → **Nachtragen**) oder direkt im
  Abschluss-Fenster eines Trainings.
- Angelegt wird ein **echtes Protokoll**, kein Sondereintrag: Dauer, Runden und Anhaltedauer
  zählen damit in allen Atem-Statistiken genau wie eine gelaufene Sitzung.
- Auch **ohne hinterlegte Übung** („Frei geatmet"): Die Statistik fällt schon immer auf den
  gespeicherten Namen zurück, wenn keine Übung dahintersteht – so eine Sitzung bekommt dort
  ihre eigene Zeile.
- Das Feld `manual: true` hält fest, dass die Dauer eine **Angabe** ist und keine Messung.
- Der Zeitstempel steht auf **12:00 Uhr** des gewählten Tages: Um Mitternacht könnte eine
  Zeitzonen-Verschiebung den Eintrag auf den Vortag rutschen lassen.

**Die Trainingsansicht wird ohne Sitzung nicht gerendert.**
Sie hing an `session || tab === "log"`. Beim Beenden eines Trainings wird die Sitzung auf `null`
gesetzt, der Reiter steht in dem Moment aber noch auf „log" – die Ansicht lief also einmal ohne
Sitzung durch, griff darin auf `session.entries` zu und riss die ganze App in den
Fehlerbildschirm. React meldete das als „Rendered fewer hooks than expected", weil der Absturz
mitten zwischen zwei Hooks passierte; die eigentliche Ursache stand nirgends. Jetzt entscheidet
allein die Sitzung über das Rendern, und `clearActiveSession` wechselt zurück auf die
Startseite, damit der Reiter nicht leer dasteht.

**Jede Bestwert-Zahl nennt ihre Herkunft.**
„213 kg" ohne den Satz dahinter ist eine Zahl, zu der man nicht einmal die Übung sagen kann –
und genau das fragt man sich als Erstes. Auf der Fortschritt-Seite war das gelöst, im
Übungs-Fenster nicht: `getExerciseBestStats` rechnete zwei Maxima aus und warf die Herkunft weg.
Beide Kacheln (geschätztes 1RM, bestes Satz-Volumen) sind jetzt antippbar und nennen Satz und
Datum. Dasselbe gilt für „Rekorde (7 Tage)": Die Kachel zählte nur, die Rekorde selbst waren
nirgends abrufbar. Aufgeschlüsselt wird jetzt nach Übung, Rekordart, Wert, vorherigem Bestwert
und Datum – und pro Übung zählt nur der **beste Satz** des Trainings, wie beim Pokal in der
Trainingsansicht: Wer sich 60/70/80 hocharbeitet, schlägt mit allen drei Sätzen den alten
Bestwert, aber drei Einträge dafür sagen weniger als einer.

**Nebenmuskelgruppen stehen an der Übung, nicht nur in der Rechnung.**
Die halben Sätze für Nebengruppen waren zuerst nur eine Rechnung – *welche* Gruppen das bei
einer Übung sind, stand nirgends. Jetzt im Kopf des Übungs-Fensters als blassere Marken neben
der Hauptgruppe, und im Reiter „Info" ein Satz dazu, was das bedeutet.

**Das Belastungs-Diagramm hat zwei Skalen.**
Links die relative Belastung, rechts der Abstand zum Schnitt des gewählten Zeitraums in Prozent,
als zweite, gestrichelte Linie. Grund: Die Kurve selbst ist an den eigenen Bestwert gebunden und
liegt deshalb je nach Trainingsstand unterschiedlich hoch – eine gute Woche ist als Ausschlag
nach oben nicht immer zu erkennen. Die Prozentlinie beantwortet genau diese Frage unabhängig vom
Niveau. Der Tooltip nennt beide Werte.

Gemessen wird gegen **denselben** Schnitt, gegen den auch die Prozentzahl neben der Muskelgruppe
in der Übersicht rechnet (`muscleLoadBasis`, herausgezogen aus `muscleLoadChange`). Damit steht
am rechten Ende der Linie exakt die Zahl aus der Liste. Zuerst zeigte die Linie die Veränderung
zur jeweiligen Vorwoche – dieselbe Ansicht, aber zwei verschiedene Zahlen für dieselbe Frage;
das ist genau die Sorte Widerspruch, die eine Statistik unglaubwürdig macht. Gibt es keinen
Schnitt (in den Vergleichswochen wurde nichts trainiert), bleibt die Linie leer statt 0 zu
behaupten.

**Einen eigenen Zeitraum im Diagramm markieren.**
Zwei Tipser auf die Kurve markieren Anfang und Ende; darunter steht, wie sich die Belastung über
genau diesen Zeitraum verändert hat, plus der Schnitt darin. Verglichen werden die beiden
Randwochen – das ist die Frage, die die Markierung stellt. Ist eine davon leer, gibt es keine
Zahl: „−100 %" hieße, die Belastung sei eingebrochen, dabei war schlicht Pause. Die Markierung
fällt weg, sobald Muskelgruppe oder Zeitraum wechseln – dieselbe Position zeigt dann auf eine
andere Woche und wäre schlicht falsch.

**Pokale, wo ein Rekord gefallen ist.**
Im Verlauf trägt jedes Training die Zahl seiner Rekorde, und im aufgeklappten Training steht
neben der Übung ein antippbarer Pokal: welcher Rekord, welcher Wert, was war vorher. In den
Übungs-Diagrammen sitzt der Pokal auf dem Punkt selbst – aber nur auf der Kurve, zu der der
Rekord gehört (`key` an jedem Rekord). Ein Wiederholungs-Rekord auf der Gewichtskurve würde
behaupten, das Gewicht sei gestiegen.

Dabei fielen zwei Fehler auf, die vorher unbemerkt in der Rechnung standen:

- **Ein Rekord blieb keiner.** `getExerciseHistory` kennt keine Zeitrichtung: Es nimmt alle
  Trainings außer dem einen ausgeschlossenen – also auch spätere. Im laufenden Training ist das
  egal, beim Nachschlagen nicht: Der Rekord vom Mai wäre keiner mehr, sobald er im Juli
  überboten wird. `logsBefore` schneidet jetzt bei jedem Nachschlagen alles Spätere ab.
- **Der Wiederholungs-Rekord hing an der Leserichtung.** Er zählt nur bei mindestens demselben
  Gewicht wie der bisherige – und wurde rückwärts gerechnet, von neu nach alt. Ein älterer Satz
  mit mehr Wiederholungen bei weniger Gewicht fiel damit still hinten runter, obwohl er zu
  seiner Zeit der Rekord war. Gerechnet wird jetzt von alt nach neu.

Und eine Rechnung, die vorher nicht getragen hätte: Für jedes Training die ganze Historie davor
neu aufzubauen kostet bei 300 Trainings gut 700 ms – jedes Mal, wenn der Verlauf aufgeht. Die
Historie wird deshalb einmal von alt nach neu mitgeführt (`walkLogPRs`), was denselben Fall auf
gut 20 ms bringt und linear mitwächst. Der Rechenweg ist derselbe, nur die Reihenfolge ist eine
andere; ein Test hält beide Wege über zufällige Trainingshistorien aneinander, damit sie nicht
auseinanderlaufen können.

**Der Rundenmodus ist keine neue Datenstruktur.**
Im Zirkel *ist* „Satz N" gleichbedeutend mit „Runde N": Satz 1 aller Übungen ist Runde 1. Die
Rundenzahl ist deshalb einfach die Satzzahl aller Übungen. Im Plan wird die Runde einmal
definiert (die Übungsliste) und dazu gesagt, wie oft sie läuft; die Automatik-Leiste zeigt
„Runde X von Y" statt „Satz X". Sind die Satzzahlen unterschiedlich, steht im Plan „gemischt"
und die Leiste rechnet mit der längsten Übung.

**Gewichte mit Komma haben die halbe Statistik lahmgelegt.**
Ein Gewicht wird so gespeichert, wie es getippt wurde – deutsch also „62,5". Der Kommentar im Code
sagte „gerechnet wird überall mit `toNum()`", nur stimmte das an acht Stellen nicht: Dort stand
`Number()`, und `Number("62,5")` ist `NaN`. Die Folgen waren einzeln unauffällig und zusammen
verheerend: kein geschätztes 1RM (die Kachel stand auf 0), kein Gewichts-Bestwert – wodurch
*jeder* Satz mit 62,5 kg erneut als „Höchstes Gewicht" gemeldet wurde –, ein Wochenvolumen, in dem
der Satz fehlte, eine Satzvolumen-Kurve auf null, und ein Plan, der das erreichte Gewicht nicht
übernahm. `Math.max(0, "62,5")` ergibt außerdem `NaN` und riss die Maximalgewichts-Kurve komplett
mit. Betroffen war jeder, der in Halb-Kilo-Schritten arbeitet – also fast jeder.

**Bei Klimmzügen ist der Körper das Gewicht.**
In der App steht bei einer Körpergewichts-Übung nur das *Zusatz*gewicht. Die Belastungsrechnung
fragte aber „hat diese Übung irgendwann Gewicht gehabt?" und schwenkte dann auf Kilogramm um –
ab dem ersten Klimmzug mit Gurt war damit jeder Satz ohne Gurt null Kilogramm Arbeit.
Gemessen: 3,0 pro Woche über Monate, und ein einziger Satz mit Gurt drückte die gesamte Historie
dieser Übung auf 0,0.

Gelöst über eine freiwillige Angabe im Zahnrad-Menü: Mit eingetragenem Körpergewicht rechnet die
Belastung mit (Körpergewicht + Zusatz) × Wdh., ohne Angabe über die Wiederholungen. Dann bleibt
der Gurt zwar unberücksichtigt, aber nichts fällt auf null – lieber eine Lücke in der Aussage als
eine falsche Zahl. Welche Übung eine Körpergewichts-Übung ist, kommt aus dem Gerät an der Übung
(mit deiner Korrektur), nicht aus den Zahlen: Eine Maschinenübung, die jemand versehentlich mit
0 kg protokolliert, ist keine. Bewusst *kein* Anteil je Übung (Liegestütz ~65 % des Körpers,
Klimmzug ~100 %): Das wäre eine erfundene Tabelle, und die Zahl wird ohnehin gegen den eigenen
besten Satz derselben Übung normiert, wo ein konstanter Faktor sich weitgehend heraus kürzt.
Ebenfalls bewusst keine Verlaufskurve des Körpergewichts – die Zahl ist eine Umrechnungsgröße,
kein Messwert, den die App beurteilen würde (Regel 3).

**Das geschätzte 1RM rechnet die Reserve mit.**
Epley und Brzycki beschreiben einen Satz *bis zum Muskelversagen*. Acht Wiederholungen mit drei in
Reserve sind aber ungefähr ein Elfer-Maximum. Ohne diese Umrechnung wurde das Maximum systematisch
zu niedrig geschätzt, und zwar umso mehr, je vorsichtiger trainiert wurde – wer denselben Satz
einmal näher am Limit macht, sah einen „Kraftzuwachs", der keiner war. Gerechnet wird jetzt mit
Wdh. + Reserve, und wie überall sonst gilt die Angabe nur für den letzten abgehakten Arbeitssatz,
weil nur für den gefragt wird. Ohne Angabe bleibt es exakt die alte Rechnung. Die Grenze von 12
Wiederholungen gilt für Wdh. + Reserve zusammen: 10 Wdh. mit 3 in Reserve werden nicht mehr
geschätzt.

**Wo es keine Zahl gab, steht jetzt eine Lücke.**
Die Übungs-Kurven „Satzvolumen", „1RM", „Gesamtvolumen" und „Maximalgewicht" setzten für ein
Training ohne Gewicht eine 0. Bei einer Körpergewichts-Übung, die man manchmal mit Gurt macht, fiel
die Kurve damit bei jedem Training ohne Gurt bis auf den Boden, als wäre die Leistung eingebrochen.
Diese Zahl gab es an dem Tag aber schlicht nicht – die Linie bricht dort jetzt.

**Der Ton am Pausenende merkt sich seinen Zustand.**
Er stand in einem lokalen Zustand der Trainingsansicht und war nach jedem Tab-Wechsel wieder an.
Jetzt gespeichert und in der Sicherung mit dabei.

**Das Körpergewicht ist keine feste Zahl.**
Zuerst war es genau eine: Wer nach einem halben Jahr 5 kg mehr wiegt und den Wert korrigiert,
hätte damit rückwirkend jede vergangene Woche neu gerechnet – ohne dass sich an einem einzigen
Training etwas geändert hätte. Gespeichert wird deshalb eine Liste „ab wann galt welcher Wert",
und jede Woche rechnet mit dem Gewicht, das damals galt. Für Trainings vor der ältesten Angabe
wird mit der ältesten gerechnet: Wer heute zum ersten Mal wiegt, hat es letztes Jahr nicht getan,
aber die älteste bekannte Zahl ist näher dran als gar keine. Der alte Speicherstand (eine blanke
Zahl) wird als „gilt von Anfang an" gelesen – für ihn ändert sich nichts.

Weiterhin bewusst *keine* Gewichtskurve mit Auswertung: Die Zahl ist eine Umrechnungsgröße für
Körpergewichts-Übungen, kein Messwert, zu dem die App etwas zu sagen hätte (Regel 3).

**„Verwerfen" beim Bearbeiten hat das Training gelöscht.**
Ein altes Training zum Bearbeiten zu öffnen nahm es aus dem Verlauf und machte eine laufende
Sitzung daraus. Wer danach auf „Verwerfen" tippte, verlor es endgültig – und die Rückfrage sagte
dabei beruhigend „alle nicht gespeicherten Sätze gehen verloren", was den eigentlichen Verlust
verschwieg. Das unveränderte Original wandert jetzt mit in die Sitzung (gespeichert, nicht nur im
Arbeitsspeicher, damit es auch einen Neustart übersteht) und kommt beim Verwerfen zurück in den
Verlauf. Die Rückfrage sagt jetzt, was wirklich passiert: „Das Training vom 05.09. bleibt so, wie
es war."

**Kraft und Volumen nebeneinander – die Frage, für die die App gebaut wurde.**
Beide Zahlen gab es längst: Volumen auf der Startseite, geschätztes 1RM in den Übungs-Charts.
Nur nie nebeneinander – und einzeln sagt keine von beiden das Entscheidende. Wer 18 % mehr Arbeit
leistet und dabei gleich stark bleibt, sieht in jeder Zahl für sich nichts Auffälliges.

- **Kraft** = bestes geschätztes 1RM der Woche (mit Reserve). Nicht das reine Maximalgewicht: Das
  springt nur beim Scheibenwechsel und ist blind dafür, ob es fünf oder zehn Wiederholungen waren.
  Nicht das Satzvolumen: Das vermischt wieder genau die beiden Größen, die getrennt werden sollen.
- **Volumen** = bewegte Kilogramm der Woche, dieselbe Rechnung wie „Volumen diese Woche".
- **Verglichen** wird die zweite Hälfte des gewählten Zeitraums gegen die erste, jeweils über die
  Wochen mit Daten. Bewusst *nicht* „aktuelle Woche gegen den Schnitt davor" wie bei der Belastung:
  Dort geht es um diese eine Woche, hier um die Richtung über Wochen – und eine Übung, die man
  diese Woche zufällig nicht gemacht hat, hätte sonst gar keinen Wert. Wochen ohne Training zählen
  in keiner Hälfte mit; bei ungerader Wochenzahl fällt die mittlere heraus.
- **Für eine Muskelgruppe** wird die Kraft jeder Übung erst an ihrem eigenen Bestwert gemessen und
  dann gemittelt – sonst bestimmte die Beinpresse mit 200 kg allein, wie sich „die Kraft der Beine"
  entwickelt. Gezählt wird nur die Hauptgruppe, anders als bei den Karten darüber: Für eine
  Kraftaussage wären mitarbeitende Muskeln Rauschen.
- **Körpergewichts- und Bandübungen** tauchen nicht auf. Für sie gibt es keine Kraftzahl, die sich
  vergleichen ließe, und eine erfundene wäre schlechter als keine.

Der Satz unter einer Zeile ist die einzige Stelle in der App, an der über die reine Beschreibung
hinausgegangen wird: „Deutlich mehr Arbeit, aber die Kraft steht – der Punkt, an dem sich
Mehrarbeit oft nicht mehr in Kraft übersetzt." Das ist eine bewusste Entscheidung von Max, weil
genau dieser Fall der Grund für die Karte war. Was daraus folgt, sagt die App trotzdem nicht: Das
hängt von Ziel, Zeit und Erholung ab, und davon weiß sie nichts (Regel 3). Der Satz rechnet mit
denselben gerundeten Zahlen, die daneben stehen – sonst bekäme eine Zeile mit „+10 %" keinen Satz,
weil dahinter 9,6 steht, und die daneben mit derselben Anzeige schon.

**Ein fehlender Name hat die Übungsansicht zum Absturz gebracht.**
Beim Antippen einer beliebigen Übung erschien nur noch „Da ist etwas schiefgelaufen –
Can't find variable: hatGewicht". Die Variable war beim Bearbeiten verloren gegangen, an vier
Stellen aber weiter benutzt worden.

Bemerkenswert ist nicht der Fehler, sondern dass ihn nichts abgefangen hat:

- Der **Build** wandelt nur um. Er prüft nicht, ob es einen Namen gibt.
- Die **Rechen-Tests** rufen einzelne Funktionen auf, keine Oberfläche.
- Die **Browser-Prüfung** hätte ihn gefunden – zwei Skripte scheiterten sogar genau an dieser
  Stelle. Beide Fehlschläge wurden als Bedienfehler des Skripts abgetan statt nachgesehen.

Deshalb gibt es jetzt `pruefe-namen.mjs`, angehängt an `npm test`: TypeScript beantwortet die eine
Frage „gibt es diesen Namen?" auch für eine ungetypte Datei. Geprüft wird ausschließlich auf
TS2304/TS2552; alles andere, was TypeScript an reinem JavaScript auszusetzen hat, wird bewusst
ignoriert, damit die Prüfung eine klare Aussage behält. Gegengeprüft am kaputten Stand: Sie meldet
genau die vier Zeilen.

Und für die Browser-Prüfung gilt ab jetzt: Ein Skript, das an einer Bedienung scheitert, ist ein
Befund, kein Skriptproblem – bis nachgesehen wurde. Zur Prüfung gehört, mindestens eine Übung jedes
Typs zu öffnen (mit Gewicht, Körpergewicht, Zeit).

**Veröffentlicht wird über GitHub, nicht mehr über Netlify.**
Netlify rechnete jede Aktualisierung gegen ein Guthaben ab, was dazu führte, dass Verbesserungen
gesammelt statt ausgeliefert wurden. GitHub Pages kostet bei einem öffentlichen Repository nichts
und hat dieselbe Aufgabe: `.github/workflows/app-veroeffentlichen.yml` baut die App bei jedem Push
auf `main` und stellt sie online.

Zwei Entscheidungen darin:

- **Die Prüfungen laufen mit.** Sie hängen bewusst nicht am Build (siehe oben), damit man beim
  Entwickeln nicht bei jedem Speichern aufgehalten wird. Beim Veröffentlichen ist die Abwägung
  umgekehrt: Eine kaputte App auf dem Telefon ist schlimmer als eine Aktualisierung, die ausbleibt.
  Schlägt eine Prüfung fehl, geht nichts online und die App bleibt auf dem letzten funktionierenden
  Stand.
- **`base: './'` statt des fest eingetragenen Ordnernamens.** Bei GitHub Pages liegt die App in
  einem Unterordner; mit absoluten Pfaden suchte der Browser die Dateien eine Ebene zu weit oben und
  die Seite bliebe weiß. Relativ gebaut läuft dieselbe App an jeder Stelle – im Unterordner, oben
  auf einer eigenen Adresse, lokal beim Entwickeln – ohne dass die Konfiguration angefasst werden
  muss. Möglich ist das, weil die App nur eine einzige Seite hat und keine Unteradressen benutzt.

**Der Umzug kostet die Daten, wenn man ihn falsch macht.** Die App legt alles im Browser ab, und der
trennt streng nach Adresse. Unter der neuen Adresse startet sie deshalb leer. Erst sichern
(Zahnrad → Daten sichern), dann drüben wiederherstellen, dann das Symbol auf dem Homescreen neu
anlegen.

**Sekunden standen da, wo Wiederholungen hingehören.**
Im Verlauf las man bei Ausfallschritten und RDLs „30s, 30s" statt der Wiederholungen. Drei Ursachen
lagen übereinander, jede für sich harmlos, zusammen durchgehend falsch:

1. **Jeder Satz bekam eine Dauer mit.** Die Plan-Vorgabe steht auf 30 Sekunden – auch bei reinen
   Wiederholungs-Übungen, wo das Feld gar nicht sichtbar ist. Diese 30 wanderte ins Training, wurde
   mitgespeichert und beim nächsten Mal wieder vorgetragen: Der Fehler hielt sich selbst am Leben.
   Eine Dauer bekommt jetzt nur noch, was auch in Sekunden gemessen wird.
2. **Die Anzeige entschied nach dem Satz statt nach der Übung.** `shortSet` zeigte eine vorhandene
   Dauer *vor* Gewicht und Wiederholungen – und überstimmte damit sogar Aufrufer, die vorher
   ausgerechnet hatten, dass die Übung gar keine Zeit-Übung ist. Jetzt entscheidet ausschließlich
   die Übung; nur wenn ein Satz weder Gewicht noch Wiederholungen hat, bleiben die Sekunden als
   Letztes übrig.
3. **Der Automatik-Modus taktet, aber er maß auch.** Er schrieb für *jede* Übung eines getakteten
   Trainings „wird in Sekunden gemessen" ins Protokoll. Weil diese Angabe über alle Trainings
   gelesen wird, machte ein einziges getaktetes Training aus Ausfallschritten dauerhaft eine
   Sekunden-Übung – rückwirkend auch in allen anderen Trainings, in Kalender, Verlauf und
   Diagrammen. Und während des Trainings zeigte die Zeile nur ein Sekundenfeld, sodass sich
   Wiederholungen gar nicht mehr eintragen ließen.

Für **bereits aufgezeichnete** Trainings gilt: Die Zeit-Markierung aus einem getakteten Training
zählt nicht mehr. Sie wurde von einem Fehler geschrieben, nicht von einer Entscheidung. Wer eine
Übung wirklich in Sekunden misst, stellt das an der Übung ein – diese Angabe gewinnt gegen alles
andere und ist der einzige Weg, der je gemeint war.

---

## Offene Punkte

- **Unterbelastung erkennen** (Stufe 2, Normalbereich je Muskelgruppe) – die letzte offene der
  drei Zielsetzungen. Braucht das Fortschritts-Signal darunter als zweites Standbein.
- **Antworten auf Warnungen justieren die Schwellen** (Regel 2). Die Warnungen stellen derzeit
  etwas fest und hören auf; die Rückfrage und das Merken der Antwort fehlen.
- **Ausdauer** (Laufen, Rad, Schwimmen, Airbike) als eigene Einheiten mit Session-RPE als
  gemeinsamer Belastungswährung.

### Bewusst verworfen

Damit sie nicht in jeder Runde neu vorgeschlagen werden:

- **Bestwert-Bezug zeitlich begrenzen** (`best[exerciseId]` als Bestwert aller Zeiten) – von Max
  abgelehnt, September 2026.
- **Gym-Trennung in `getMuscleLoadSeries`** – von Max abgelehnt, September 2026.

### Erledigt

- **Progressive Overload in Klartext** – gebaut als Karte „Kraft und Volumen" (siehe oben).
  Abweichung vom ursprünglichen Vorschlag: Kraft kommt aus dem BESTEN Satz der Woche, nicht aus dem
  ersten Arbeitssatz. Der erste Satz ist nicht zwangsläufig der stärkste (Aufwärmeffekt,
  Steigerungssätze), und die Reserve-Angabe liegt ohnehin nur für den letzten Satz vor.

- **1RM-Formel statt roher Tonnage** in `loadSetWork`: Die Wurzel-Lösung über RIR ist gebaut
  (siehe Tabelle oben). Die ursprünglich vorgeschlagene Formel-Mischung aus Epley, Brzycki und
  Lombardi wurde damit hinfällig – geraten wird nicht mehr, es wird gemessen.
