import { describe, it, expect } from "vitest";
import {
  toNum,
  fmtDecimal,
  fmtRir,
  estimate1RM,
  typicalRir,
  rirLoadFactor,
  rirComparison,
  recordReserveNote,
  zoomWeekSeries,
  compareWindowSeries,
  buildPercentSeries,
  muscleLoadChange,
  detectLoadSignal,
  getCalibration,
  getFeelingPerformance,
  getExerciseHistory,
  describeSetPRs,
  getFatigueWarning,
  getMuscleLoadSeries,
  canBeCalibration,
  canBeDropset,
  weekStartKey,
  dateFromKey,
  deloadStarts,
  isDeloadDate,
  deloadWeekFlags,
  deloadStatus,
  getDeloadEffect,
  getDeloadEffects,
  performedWorkingSets,
  setNumberLabels,
} from "./TrainingApp";

// Diese Tests sichern die Rechenfunktionen ab - also das, was die App
// eigentlich aussagt. Sie decken bewusst zwei Sorten Fall ab:
//
//   1. Das erwartete Verhalten ("was soll herauskommen").
//   2. Jeden Fehler, der in dieser Datei schon einmal wirklich drin war.
//      Diese Faelle sind mit "Regression:" markiert - sie stehen hier, damit
//      derselbe Fehler nicht ein zweites Mal unbemerkt zurueckkommt.
//
// Alles hier sind reine Funktionen: Eingabe rein, Ergebnis raus, kein Browser
// noetig. Deshalb laufen sie in Sekunden und koennen vor jedem Commit laufen.

const TAG = 86400000;
const WOCHE = 7 * TAG;

const satz = (over: Record<string, unknown> = {}) => ({
  done: true, warmup: false, dropset: false, weight: 60, reps: 10, ...over,
});

const training = (over: Record<string, unknown> = {}) => ({
  id: "t1", date: new Date().toISOString(), planName: "Test", durationMinutes: 45,
  entries: [{ id: "e1", exerciseId: "bankdruecken", sets: [satz()] }], ...over,
});

describe("Zahlen einlesen und ausgeben", () => {
  it("versteht deutsche Kommazahlen", () => {
    expect(toNum("62,5")).toBe(62.5);
    expect(toNum("62.5")).toBe(62.5);
  });

  it("macht aus Unsinn eine 0 statt NaN", () => {
    expect(toNum("abc")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });

  it("zeigt Zahlen deutsch und ohne unnoetige Nullen", () => {
    expect(fmtDecimal(60)).toBe("60");
    expect(fmtDecimal(62.5)).toBe("62,5");
    expect(fmtDecimal(88.81666)).toBe("88,82");
  });
});

describe("RIR-Schreibweise", () => {
  it("schreibt jede Stufe gleich, auch die 0", () => {
    expect(fmtRir(0)).toBe("0 RIR");
    expect(fmtRir(2)).toBe("2 RIR");
  });

  it("deckelt nach oben", () => {
    expect(fmtRir(4)).toBe("4+ RIR");
    expect(fmtRir(9)).toBe("4+ RIR");
  });

  it("liefert nichts, wenn nichts angegeben wurde", () => {
    expect(fmtRir(null)).toBe(null);
    expect(fmtRir(undefined)).toBe(null);
  });
});

describe("1RM-Schaetzung", () => {
  it("gibt bei einer Wiederholung genau das Gewicht zurueck", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("steigt mit den Wiederholungen", () => {
    expect(estimate1RM(100, 8)).toBeGreaterThan(estimate1RM(100, 5));
  });

  it("liefert 0 statt Unsinn ohne Gewicht oder Wiederholungen", () => {
    expect(estimate1RM(0, 8)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe("Ueblicher RIR-Wert einer Uebung", () => {
  it("nimmt den Median, nicht den Schnitt - ein Ausreisser zieht nicht", () => {
    expect(typicalRir([2, 2, 2, 2, 0])).toBe(2);
  });

  it("schweigt unter drei Angaben", () => {
    expect(typicalRir([1, 2])).toBe(null);
    expect(typicalRir([])).toBe(null);
  });

  it("schaut nur auf die juengsten zehn", () => {
    // Erst zehn Nullen (neu), dahinter Vieren (alt): die alten zaehlen nicht.
    const werte = [...Array(10).fill(0), ...Array(10).fill(4)];
    expect(typicalRir(werte)).toBe(0);
    // Mit ausdruecklich unbegrenztem Fenster zaehlt die ganze Historie.
    expect(typicalRir(werte, Infinity)).toBe(2);
  });
});

describe("Reserve-Gewichtung der Belastung", () => {
  it("gewichtet 3 % je Stufe naeher am Limit", () => {
    expect(rirLoadFactor(1, 2)).toBeCloseTo(1.03, 10);
    expect(rirLoadFactor(0, 2)).toBeCloseTo(1.06, 10);
  });

  it("gewichtet symmetrisch nach unten", () => {
    expect(rirLoadFactor(3, 2)).toBeCloseTo(0.97, 10);
    expect(rirLoadFactor(4, 2)).toBeCloseTo(0.94, 10);
  });

  it("aendert nichts beim ueblichen Wert", () => {
    expect(rirLoadFactor(2, 2)).toBe(1);
  });

  it("deckelt bei 12 %", () => {
    expect(rirLoadFactor(0, 99)).toBeCloseTo(1.12, 10);
    expect(rirLoadFactor(99, 0)).toBeCloseTo(0.88, 10);
  });

  it("Regression: ohne Angabe bleibt alles unveraendert", () => {
    // Number(null) ist 0 - eine fehlende Angabe darf nicht als "am Limit"
    // durchgehen und die Belastung nach oben ziehen.
    expect(rirLoadFactor(null, 2)).toBe(1);
    expect(rirLoadFactor(2, null)).toBe(1);
    expect(rirLoadFactor(undefined, undefined)).toBe(1);
  });
});

describe("Vergleich mit dem ueblichen RIR", () => {
  it("nennt die Richtung und den ueblichen Wert", () => {
    expect(rirComparison(0, 2)).toContain("Näher am Limit");
    expect(rirComparison(0, 2)).toContain("2 RIR");
    expect(rirComparison(4, 2)).toContain("Mehr Reserve");
  });

  it("nennt eine halbe Stufe noch nicht als Unterschied", () => {
    expect(rirComparison(2, 2.5)).toContain("Wie üblich");
  });

  it("Regression: keine Aussage, bevor etwas gewaehlt wurde", () => {
    // Sonst stuende der Vergleich da, sobald man die Auswahl wieder abwaehlt -
    // und zwar so, als haette man 0 gewaehlt.
    expect(rirComparison(null, 2)).toBe(null);
    expect(rirComparison(undefined, 2)).toBe(null);
  });

  it("schweigt ohne ueblichen Wert", () => {
    expect(rirComparison(2, null)).toBe(null);
  });
});

describe("Rekord gegen alten Rekord einordnen", () => {
  it("erkennt mehr Reserve als beim alten Rekord", () => {
    expect(recordReserveNote(2, 0)).toContain("Mehr Reserve");
    expect(recordReserveNote(2, 0)).toContain("Limit");
  });

  it("erkennt weniger Reserve", () => {
    expect(recordReserveNote(0, 2)).toContain("Näher am Limit");
  });

  it("Regression: keine Einordnung ohne beide Angaben", () => {
    // Number(null) ist 0: ohne diese Pruefung wurde ein Rekord ohne Angabe
    // als "gleiche Reserve" oder "ging bis ans Limit" ausgegeben.
    expect(recordReserveNote(null, 0)).toBe(null);
    expect(recordReserveNote(2, null)).toBe(null);
    expect(recordReserveNote(null, null)).toBe(null);
  });
});

describe("Zeitraum-Ausschnitt der Kurven", () => {
  const reihe = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("schneidet auf die letzten Wochen zu", () => {
    expect(zoomWeekSeries(reihe, 3)).toEqual([8, 9, 10]);
  });

  it("gibt bei 'Gesamt' alles zurueck", () => {
    expect(zoomWeekSeries(reihe, Infinity)).toEqual(reihe);
  });

  it("Regression: die Grafik zeigt eine Woche mehr als der Vergleich", () => {
    // Der Prozentwert vergleicht die aktuelle Woche gegen die N davor. Die
    // Grafik dazu braucht N+1 Wochen, sonst bliebe bei "Vorwoche" ein
    // einziger Punkt uebrig und die Linie verschwaende.
    expect(compareWindowSeries(reihe, 1)).toHaveLength(2);
    expect(compareWindowSeries(reihe, 4)).toHaveLength(5);
    expect(compareWindowSeries(reihe, Infinity)).toEqual(reihe);
  });
});

describe("Prozentualer Verlauf", () => {
  const punkte = (abstaendeInTagen: number[], werte: number[]) =>
    abstaendeInTagen.map((d, i) => ({
      date: "x", ts: Date.now() - d * TAG, wert: werte[i],
    }));

  it("rechnet die Veraenderung gegen den passenden frueheren Punkt", () => {
    const daten = punkte([7, 0], [100, 110]);
    const out = buildPercentSeries(daten, ["wert"], 1);
    expect(out[1].wert).toBeCloseTo(10, 5);
  });

  it("liefert null, wenn es keinen Vergleichspunkt gibt", () => {
    const daten = punkte([200, 0], [100, 110]);
    expect(buildPercentSeries(daten, ["wert"], 1)[1].wert).toBe(null);
  });

  it("Regression: der Spielraum waechst mit dem Zeitraum", () => {
    // Feste +/-3 Tage waren bei "20 Wochen" absurd streng - man musste die
    // Uebung zufaellig binnen drei Tagen um ein Datum vor fuenf Monaten
    // trainiert haben, sonst riss die Linie.
    const daten = punkte([148, 0], [100, 120]); // 148 Tage ~ 21,1 Wochen
    expect(buildPercentSeries(daten, ["wert"], 1)[1].wert).toBe(null);
    expect(buildPercentSeries(daten, ["wert"], 20)[1].wert).toBeCloseTo(20, 5);
  });
});

describe("Belastungsaenderung und Warnsignale", () => {
  it("vergleicht die letzte Woche gegen den Schnitt davor", () => {
    expect(muscleLoadChange([10, 10, 10, 20], 3)).toBeCloseTo(100, 5);
  });

  it("liefert null ohne Vergleichsgrundlage", () => {
    expect(muscleLoadChange([10], 3)).toBe(null);
    expect(muscleLoadChange([0, 0, 0, 5], 3)).toBe(null);
  });

  it("meldet Ueberlastung erst ab +30 %", () => {
    // Schwellen: +15 % = Hinweis, +30 % = Alarm, gemessen gegen den Schnitt
    // der vier Wochen davor.
    expect(detectLoadSignal([10, 10, 10, 10, 11])?.type).toBe(undefined);
    expect(detectLoadSignal([10, 10, 10, 10, 12])?.type).toBe("overload-watch");
    expect(detectLoadSignal([10, 10, 10, 10, 14])?.type).toBe("overload");
  });

  it("meldet ein Plateau nach drei Wochen ohne neuen Hoechstwert", () => {
    expect(detectLoadSignal([10, 10, 10, 10])?.type).toBe("plateau");
  });

  it("schweigt ohne Trainingshistorie", () => {
    expect(detectLoadSignal([10, 10, 10, 10], 1)).toBe(null);
    expect(detectLoadSignal([])).toBe(null);
  });
});

describe("Eichsaetze", () => {
  const eichsatz = (geschaetzt: number, geschafft: number, tageHer: number) =>
    training({
      id: "e" + tageHer,
      date: new Date(Date.now() - tageHer * TAG).toISOString(),
      entries: [{
        id: "x", exerciseId: "bankdruecken",
        sets: [satz(), satz({ calibration: true, estimatedFailureReps: geschaetzt, reps: geschafft })],
      }],
    });

  it("bildet den Schnitt der Abweichungen", () => {
    const out = getCalibration([eichsatz(8, 11, 21), eichsatz(10, 12, 14), eichsatz(6, 7, 7)]);
    expect(out.count).toBe(3);
    expect(out.avgDiff).toBeCloseTo(2, 5); // +3, +2, +1
    expect(out.ready).toBe(true);
  });

  it("zeigt erst ab drei Eichsaetzen etwas an", () => {
    const out = getCalibration([eichsatz(8, 11, 7), eichsatz(10, 12, 14)]);
    expect(out.count).toBe(2);
    expect(out.ready).toBe(false);
  });

  it("ignoriert Eichsaetze ohne Schaetzung", () => {
    const ohne = training({
      entries: [{ id: "x", exerciseId: "bankdruecken", sets: [satz({ calibration: true })] }],
    });
    expect(getCalibration([ohne]).count).toBe(0);
  });

  it("sortiert die juengsten nach vorne", () => {
    const out = getCalibration([eichsatz(8, 11, 21), eichsatz(10, 12, 7)]);
    expect(out.rows[0].estimated).toBe(10);
  });

  it("wird nur am letzten Satz angeboten", () => {
    expect(canBeCalibration([satz(), satz()], 1)).toBe(true);
    expect(canBeCalibration([satz(), satz()], 0)).toBe(false);
  });
});

describe("Gefuehl gegen Leistung", () => {
  it("rechnet den Trend heraus", () => {
    // Leistung steigt ueber den Zeitraum um 40 %. "Normal"-Tage liegen genau
    // auf dem Niveau - sie muessen trotzdem bei 0 % Abweichung landen, sonst
    // wuerde die Auswertung den Trainingsfortschritt messen statt das Gefuehl.
    const logs = Array.from({ length: 20 }, (_, i) => {
      const fortschritt = 1 + 0.4 * (i / 19);
      return training({
        id: "l" + i,
        date: new Date(Date.now() - (20 - i) * 3 * TAG).toISOString(),
        feeling: 3,
        entries: [{
          id: "x", exerciseId: "bankdruecken",
          sets: [satz({ weight: Math.round(50 * fortschritt) })],
        }],
      });
    });
    const zeile = getFeelingPerformance(logs, {}).rows.find((r) => r.value === 3);
    expect(zeile).toBeDefined();
    expect(Math.abs(zeile!.deviation)).toBeLessThan(1);
  });

  it("erkennt schwaechere Leistung an muede-Tagen", () => {
    const logs = Array.from({ length: 20 }, (_, i) => {
      const muede = i % 4 === 1;
      return training({
        id: "l" + i,
        date: new Date(Date.now() - (20 - i) * 3 * TAG).toISOString(),
        feeling: muede ? 2 : 3,
        entries: [{
          id: "x", exerciseId: "bankdruecken",
          sets: [satz({ weight: muede ? 45 : 50 })],
        }],
      });
    });
    const zeile = getFeelingPerformance(logs, {}).rows.find((r) => r.value === 2);
    expect(zeile).toBeDefined();
    expect(zeile!.deviation).toBeLessThan(0);
  });

  it("zaehlt Trainings, nicht Beobachtungen", () => {
    // Fuenf Uebungen an einem muede-Tag sind ein muede-Tag, kein fuenffacher
    // Beleg - sonst waere die Vertrauensschwelle nach zwei Tagen erreicht.
    const uebungen = ["bankdruecken", "kniebeuge", "latzug", "rudern", "seitheben"];
    const logs = Array.from({ length: 8 }, (_, i) =>
      training({
        id: "l" + i,
        date: new Date(Date.now() - (8 - i) * 3 * TAG).toISOString(),
        feeling: 2,
        entries: uebungen.map((ex, k) => ({ id: "x" + k, exerciseId: ex, sets: [satz()] })),
      })
    );
    const zeile = getFeelingPerformance(logs, {}).rows.find((r) => r.value === 2);
    expect(zeile!.observations).toBeGreaterThan(zeile!.sessions);
    expect(zeile!.sessions).toBeLessThanOrEqual(8);
  });
});

describe("Rekorde und ihre Reserve", () => {
  const alteEinheit = (saetze: unknown[], rir: number | null) =>
    training({
      id: "alt", date: new Date(Date.now() - WOCHE).toISOString(),
      entries: [{ id: "a", exerciseId: "bankdruecken", rir, sets: saetze }],
    });

  it("Regression: die Reserve zaehlt nur, wenn der Rekord im letzten Satz fiel", () => {
    // Bestwert im ERSTEN Satz aufgestellt, RIR beschreibt den zweiten.
    const zuerst = getExerciseHistory([alteEinheit([satz({ weight: 100 }), satz({ weight: 50 })], 0)], "bankdruecken");
    expect(zuerst.bestWeight).toBe(100);
    expect(zuerst.bestWeightRir).toBe(null);

    // Bestwert im LETZTEN Satz - hier gehoert die Angabe dazu.
    const zuletzt = getExerciseHistory([alteEinheit([satz({ weight: 50 }), satz({ weight: 100 })], 0)], "bankdruecken");
    expect(zuletzt.bestWeight).toBe(100);
    expect(zuletzt.bestWeightRir).toBe(0);
  });

  it("merkt sich den ueblichen RIR-Wert der Uebung", () => {
    const logs = [0, 1, 2].map((i) =>
      training({
        id: "l" + i, date: new Date(Date.now() - (i + 1) * WOCHE).toISOString(),
        entries: [{ id: "a", exerciseId: "bankdruecken", rir: 2, sets: [satz()] }],
      })
    );
    expect(getExerciseHistory(logs, "bankdruecken").typicalRir).toBe(2);
  });

  it("erkennt einen neuen Bestwert", () => {
    const best = getExerciseHistory([alteEinheit([satz({ weight: 100, reps: 5 })], 2)], "bankdruecken");
    const rekorde = describeSetPRs(satz({ weight: 110, reps: 5 }), best, false, true, 1);
    expect(rekorde.some((r) => r.title.includes("Höchstes Gewicht"))).toBe(true);
    expect(rekorde[0].currentRir).toBe(1);
  });

  it("meldet keinen Rekord ohne Vorgeschichte", () => {
    const leer = getExerciseHistory([], "bankdruecken");
    expect(describeSetPRs(satz({ weight: 200 }), leer)).toEqual([]);
  });
});

describe("Frühwarnung aus Gefuehl und Belastung", () => {
  // 16 Wochen, zwei Trainings pro Woche. Die letzten drei Wochen sind
  // wahlweise schlechter im Gefuehl und/oder hoeher in der Belastung.
  const bauen = ({ muede, mehr }: { muede: boolean; mehr: boolean }) => {
    const logs = [];
    for (let w = 15; w >= 0; w--) {
      for (const tag of [0, 3]) {
        const datum = Date.now() - (w * 7 + tag) * TAG;
        const neu = Date.now() - datum <= 21 * TAG;
        logs.push(training({
          id: `l${w}_${tag}`,
          date: new Date(datum).toISOString(),
          feeling: neu && muede ? 2 : 4,
          entries: [{
            id: "x", exerciseId: "bankdruecken",
            sets: Array.from({ length: neu && mehr ? 6 : 3 }, () => satz()),
          }],
        }));
      }
    }
    return logs;
  };
  const warnung = (opt: { muede: boolean; mehr: boolean }) => {
    const logs = bauen(opt);
    return getFatigueWarning(logs, getMuscleLoadSeries(logs, { bankdruecken: { id: "bankdruecken", group: "brust" } }, {}, {}, 52));
  };

  it("warnt nur, wenn beide Signale zusammenkommen", () => {
    expect(warnung({ muede: true, mehr: true })).not.toBe(null);
  });

  it("schweigt bei nur einem Signal", () => {
    expect(warnung({ muede: true, mehr: false })).toBe(null);
    expect(warnung({ muede: false, mehr: true })).toBe(null);
    expect(warnung({ muede: false, mehr: false })).toBe(null);
  });

  it("nennt Zahlen, mit denen man etwas anfangen kann", () => {
    const w = warnung({ muede: true, mehr: true })!;
    expect(w.sessions).toBeGreaterThanOrEqual(3);
    expect(w.loadRise).toBeGreaterThan(0);
    expect(w.recentLabel).toBe("Müde");
    expect(w.usualLabel).toBe("Gut");
  });
});

describe("Saetze zaehlen und benennen", () => {
  it("zaehlt nur abgehakte Arbeitssaetze", () => {
    const saetze = [satz(), satz({ done: false }), satz({ warmup: true }), satz({ dropset: true })];
    expect(performedWorkingSets(saetze)).toHaveLength(2);
  });

  it("haengt Dropsaetze als Unternummer an den Satz davor", () => {
    expect(setNumberLabels([satz({ warmup: true }), satz(), satz({ dropset: true }), satz()]))
      .toEqual(["W", "1", "1.1", "2"]);
  });

  it("bietet einen Dropsatz nur nach einem Arbeitssatz an", () => {
    expect(canBeDropset([satz({ warmup: true }), satz()], 1)).toBe(false);
    expect(canBeDropset([satz(), satz()], 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Entlastungswochen
//
// Der Kern dieser Tests ist der Grund, aus dem es die Markierung ueberhaupt
// gibt. Ohne sie meldet die App in einer bewusst leichten Woche ein Plateau
// und danach wochenlang eine Ueberlastung - beides steht hier als "vorher"
// ausdruecklich drin, sonst waere spaeter nicht mehr nachvollziehbar, wovor
// die Markierung schuetzt.
// ---------------------------------------------------------------------------

describe("Entlastungswochen: Datum und Woche", () => {
  it("findet den Montag der Woche, egal welchen Tag man antippt", () => {
    // 9.9.2026 ist ein Mittwoch, 13.9. der Sonntag danach.
    expect(weekStartKey(new Date(2026, 8, 9))).toBe("2026-09-07");
    expect(weekStartKey(new Date(2026, 8, 13))).toBe("2026-09-07");
    expect(weekStartKey(new Date(2026, 8, 7))).toBe("2026-09-07");
    expect(weekStartKey(new Date(2026, 8, 14))).toBe("2026-09-14");
  });

  it("liest einen Datums-Schluessel als lokales Datum, nicht als UTC", () => {
    // new Date("2026-09-07") waere UTC und in westlichen Zeitzonen der 6.9. -
    // die Markierung laege dann eine Woche daneben.
    const d = dateFromKey("2026-09-07")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 7]);
  });

  it("nimmt gespeicherte Objekte und blanke Schluessel gleichermassen", () => {
    expect(deloadStarts([{ start: "2026-09-07" }, "2026-08-03"])).toEqual([
      "2026-08-03", "2026-09-07",
    ]);
    expect(deloadStarts([{ start: "quatsch" }, null, 7])).toEqual([]);
  });

  it("erkennt jeden Tag einer markierten Woche", () => {
    const wochen = [{ start: "2026-09-07" }];
    expect(isDeloadDate(new Date(2026, 8, 10), wochen)).toBe(true);
    expect(isDeloadDate(new Date(2026, 8, 14), wochen)).toBe(false);
  });
});

describe("Entlastungswochen: Markierung der Wochenreihen", () => {
  const jetzt = new Date(2026, 8, 16, 12).getTime(); // Mittwoch

  it("markiert jedes 7-Tage-Fenster, das sich mit der Woche ueberschneidet", () => {
    // Die Wochenreihen rechnen ab heute rueckwaerts, nicht in Kalenderwochen -
    // eine markierte Woche faellt deshalb fast immer in zwei Fenster.
    const flags = deloadWeekFlags([{ start: "2026-09-07" }], 6, jetzt);
    expect(flags).toHaveLength(6);
    expect(flags.filter(Boolean).length).toBe(2);
    // Die aelteste Position liegt gut fuenf Wochen zurueck und kann die
    // Woche vom 7.9. nicht enthalten.
    expect(flags[0]).toBe(false);
  });

  it("liefert ohne Markierung nur false", () => {
    expect(deloadWeekFlags([], 4, jetzt)).toEqual([false, false, false, false]);
    expect(deloadWeekFlags(null, 3, jetzt)).toEqual([false, false, false]);
  });
});

describe("Entlastungswochen: Warnsignale", () => {
  const F = false, T = true;
  // Acht Wochen mit rund 2 % Zuwachs - die Groessenordnung, in der sich eine
  // Belastung ueber Monate tatsaechlich bewegt. Die Entlastungswoche liegt in
  // zwei Fenstern (siehe deloadWeekFlags), deshalb zwei Markierungen.
  const inDerWoche = [96, 98, 100, 102, 104, 106, 108, 50];
  const inDerWocheFlags = [F, F, F, F, F, F, F, T];
  const einsDanach = [98, 100, 102, 104, 106, 74, 52, 108];
  const einsDanachFlags = [F, F, F, F, F, T, T, F];
  const dreiDanach = [102, 104, 106, 74, 52, 108, 110, 112];
  const dreiDanachFlags = [F, F, F, T, T, F, F, F];

  it("vorher: meldet in der Entlastungswoche ein Plateau", () => {
    expect(detectLoadSignal(inDerWoche)?.type).toBe("plateau");
  });

  it("vorher: meldet danach wochenlang eine Ueberlastung", () => {
    expect(detectLoadSignal(einsDanach)?.type).toBe("overload-watch");
    expect(detectLoadSignal(dreiDanach)?.type).toBe("overload");
  });

  it("markiert: schweigt in der Entlastungswoche selbst", () => {
    expect(detectLoadSignal(inDerWoche, Infinity, inDerWocheFlags)).toBe(null);
  });

  it("markiert: keine Meldung mehr in den Wochen danach", () => {
    // Der Vergleichszeitraum wird nicht nach hinten verlaengert (siehe
    // weeksBefore). Fuer die Ueberlastung reichen die zwei sauberen Wochen
    // direkt vor der Entlastung; fuer das Plateau-Zeichen braucht es drei -
    // solange die nicht zusammenkommen, wird geschwiegen statt geraten.
    expect(detectLoadSignal(einsDanach, Infinity, einsDanachFlags)).toBe(null);
    expect(detectLoadSignal(dreiDanach, Infinity, dreiDanachFlags)).toBe(null);
  });

  it("Regression: die Markierung erzeugt keine neue Warnung", () => {
    // Ein frueherer Anlauf verlaengerte den Vergleichszeitraum nach hinten,
    // um vier saubere Wochen zusammenzubekommen. Bei steigender Belastung
    // liegen die aelteren Wochen tiefer - dadurch meldete die App MIT
    // Markierung eine Ueberlastung, die sie ohne nicht gemeldet hatte.
    // Getestet ueber alle vier Wochen nach der Entlastung.
    const nachher = [
      { werte: einsDanach, flags: einsDanachFlags },
      { werte: [100, 102, 104, 106, 74, 52, 108, 110], flags: [F, F, F, F, T, T, F, F] },
      { werte: dreiDanach, flags: dreiDanachFlags },
      { werte: [104, 106, 74, 52, 108, 110, 112, 114], flags: [F, F, T, T, F, F, F, F] },
    ];
    nachher.forEach(({ werte, flags }) => {
      const ohne = detectLoadSignal(werte)?.type;
      const mit = detectLoadSignal(werte, Infinity, flags)?.type;
      const istWarnung = (t?: string) => t === "overload" || t === "overload-watch";
      expect(istWarnung(ohne)).toBe(true);
      expect(istWarnung(mit)).toBe(false);
    });
  });

  it("laesst eine echte Ueberlastung trotz Entlastungswoche durch", () => {
    const echterSprung = [98, 100, 102, 104, 106, 74, 52, 150];
    expect(detectLoadSignal(echterSprung, Infinity, einsDanachFlags)?.type).toBe("overload");
  });

  it("Regression: ohne Markierung rechnet alles wie vorher", () => {
    // weeksBefore hat die frueheren slice-Aufrufe in detectLoadSignal und
    // muscleLoadChange ersetzt. Ohne Markierung muss exakt derselbe
    // Ausschnitt herauskommen wie zuvor.
    expect(detectLoadSignal([10, 10, 10, 10, 11])?.type).toBe(undefined);
    expect(detectLoadSignal([10, 10, 10, 10, 12])?.type).toBe("overload-watch");
    expect(detectLoadSignal([10, 10, 10, 10, 14])?.type).toBe("overload");
    expect(detectLoadSignal([10, 10, 10, 10])?.type).toBe("plateau");
    expect(muscleLoadChange([10, 10, 10, 20], 3)).toBe(100);
  });
});

describe("Entlastungswochen: Zaehlerstand", () => {
  const jetzt = new Date(2026, 8, 16, 12).getTime(); // Mittwoch, Woche ab 14.9.

  it("sagt, wie viele Wochen die letzte her ist", () => {
    const st = deloadStatus([{ start: "2026-08-03" }], 8, jetzt)!;
    expect(st.weeksSince).toBe(6);
    expect(st.intervalWeeks).toBe(8);
    expect(st.isCurrentWeek).toBe(false);
  });

  it("erkennt die laufende Woche", () => {
    const st = deloadStatus([{ start: "2026-09-14" }], null, jetzt)!;
    expect(st.isCurrentWeek).toBe(true);
    expect(st.weeksSince).toBe(0);
    expect(st.intervalWeeks).toBe(null);
  });

  it("zaehlt eine erst geplante Woche nicht als letzte", () => {
    const st = deloadStatus([{ start: "2026-08-03" }, { start: "2026-10-05" }], null, jetzt)!;
    expect(st.lastStart).toBe("2026-08-03");
    expect(st.nextStart).toBe("2026-10-05");
    expect(st.weeksUntilNext).toBe(3);
  });

  it("schweigt ohne jede Markierung", () => {
    expect(deloadStatus([], 8, jetzt)).toBe(null);
  });
});

describe("Entlastungswochen: Wirkung davor gegen danach", () => {
  const montag = new Date(2026, 8, 7).getTime();
  const jetzt = montag + 5 * WOCHE;

  // Vier Trainings davor, vier danach, zwei Uebungen - danach liegt das
  // Gewicht um `nachher` Prozentpunkte hoeher.
  const bauLogs = (nachherFaktor: number) => {
    const tage = [
      montag - 12 * TAG, montag - 9 * TAG, montag - 5 * TAG, montag - 2 * TAG,
      montag + 8 * TAG, montag + 11 * TAG, montag + 15 * TAG, montag + 18 * TAG,
    ];
    return tage.map((ts, i) => {
      const danach = i >= 4;
      const f = danach ? nachherFaktor : 1;
      return training({
        id: "log" + i,
        date: new Date(ts).toISOString(),
        feeling: danach ? 4 : 3,
        entries: [
          { id: "e1", exerciseId: "bankdruecken", sets: [satz({ weight: 100 * f, reps: 10 })] },
          { id: "e2", exerciseId: "kniebeuge", sets: [satz({ weight: 140 * f, reps: 10 })] },
        ],
      });
    });
  };

  it("misst die Leistung je Satz, getrennt nach Uebung", () => {
    const r = getDeloadEffect(bauLogs(1.1), "2026-09-07", {}, jetzt)!;
    expect(Math.round(r.performanceChange)).toBe(10);
    expect(r.exercises).toBe(2);
    expect(r.sessionsBefore).toBe(4);
    expect(r.sessionsAfter).toBe(4);
    expect(r.feelingBefore).toBe(3);
    expect(r.feelingAfter).toBe(4);
  });

  it("wartet, bis die zwei Wochen danach vorbei sind", () => {
    expect(getDeloadEffect(bauLogs(1.1), "2026-09-07", {}, montag + 2 * WOCHE)).toBe(null);
  });

  it("schweigt bei zu duenner Datenlage", () => {
    // Nur ein Training nach der Entlastung - daraus wird keine Aussage.
    expect(getDeloadEffect(bauLogs(1.1).slice(0, 5), "2026-09-07", {}, jetzt)).toBe(null);
  });

  it("laesst die Entlastungswoche selbst aus dem Vergleich heraus", () => {
    // Ein sehr leichtes Training mitten in der Entlastungswoche darf das
    // Ergebnis nicht nach unten ziehen.
    const mitEntlastung = [
      ...bauLogs(1.1),
      training({
        id: "deload",
        date: new Date(montag + 2 * TAG).toISOString(),
        entries: [
          { id: "e1", exerciseId: "bankdruecken", sets: [satz({ weight: 40, reps: 5 })] },
          { id: "e2", exerciseId: "kniebeuge", sets: [satz({ weight: 60, reps: 5 })] },
        ],
      }),
    ];
    const r = getDeloadEffect(mitEntlastung, "2026-09-07", {}, jetzt)!;
    expect(Math.round(r.performanceChange)).toBe(10);
    expect(r.sessionsBefore).toBe(4);
    expect(r.sessionsAfter).toBe(4);
  });

  it("zeigt einen Schnitt erst ab drei ausgewerteten Entlastungen", () => {
    const eine = getDeloadEffects(bauLogs(1.1), [{ start: "2026-09-07" }], {}, jetzt);
    expect(eine.results).toHaveLength(1);
    expect(eine.pattern).toBe(null);
    expect(eine.patternMin).toBe(3);
  });
});

describe("Entlastungswochen: Gefuehl und Leistung", () => {
  it("laesst Trainings aus Entlastungswochen aus dem Abgleich heraus", () => {
    // Sechs Trainings, verteilt ueber zwei Wochen ab Montag, 7.9.2026.
    const montag = new Date(2026, 8, 7).getTime();
    const logs = [0, 2, 4, 7, 9, 11].map((tag, i) =>
      training({
        id: "l" + i,
        date: new Date(montag + tag * TAG).toISOString(),
        feeling: 3,
      })
    );
    const ohne = getFeelingPerformance(logs, {});
    const mit = getFeelingPerformance(logs, {}, [{ start: "2026-09-07" }]);
    expect(ohne.sessionsWithFeeling).toBe(6);
    // Die drei Trainings der ersten Woche fallen heraus.
    expect(mit.sessionsWithFeeling).toBe(3);
  });
});
