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

**Der Rundenmodus ist keine neue Datenstruktur.**
Im Zirkel *ist* „Satz N" gleichbedeutend mit „Runde N": Satz 1 aller Übungen ist Runde 1. Die
Rundenzahl ist deshalb einfach die Satzzahl aller Übungen. Im Plan wird die Runde einmal
definiert (die Übungsliste) und dazu gesagt, wie oft sie läuft; die Automatik-Leiste zeigt
„Runde X von Y" statt „Satz X". Sind die Satzzahlen unterschiedlich, steht im Plan „gemischt"
und die Leiste rechnet mit der längsten Übung.

---

## Offene Punkte

- **Unterbelastung erkennen** (Stufe 2, Normalbereich je Muskelgruppe) – die letzte offene der
  drei Zielsetzungen. Braucht das Fortschritts-Signal darunter als zweites Standbein.
- **Progressive Overload in Klartext:** „Kraft seit 8 Wochen flach, Volumen +18 %". Kraft =
  geschätztes 1RM des *ersten* Arbeitssatzes je Übung (Begründung in Stufe 2), Volumen getrennt
  davon. Existiert bisher nirgends – auch nicht als Rechnung im Hintergrund.
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

- **1RM-Formel statt roher Tonnage** in `loadSetWork`: Die Wurzel-Lösung über RIR ist gebaut
  (siehe Tabelle oben). Die ursprünglich vorgeschlagene Formel-Mischung aus Epley, Brzycki und
  Lombardi wurde damit hinfällig – geraten wird nicht mehr, es wird gemessen.
