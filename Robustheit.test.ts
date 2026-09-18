// Diese Datei stellt EINE Frage an die ganze App: Stuerzt sie ab, wenn die
// gespeicherten Daten nicht so aussehen, wie der Code es erwartet?
//
// Warum das eine eigene Datei ist: TrainingApp.test.ts prueft, ob richtig
// gerechnet wird - mit sauberen Daten. Die Abstuerze, die es bis aufs Handy
// geschafft haben, kamen aber nie von falschen Zahlen, sondern von Daten, die
// gar nicht erst passten: eine geloeschte Uebung, ein `null` mitten in einer
// Liste, ein abgebrochenes Speichern. Dagegen hilft keine einzelne Pruefung,
// sondern nur eine, die JEDE exportierte Funktion durchgeht.
//
// Deshalb wird hier nicht aufgezaehlt, welche Funktionen geprueft werden
// sollen - es werden automatisch alle genommen, die die Datei exportiert. Wer
// eine neue Funktion dazuschreibt, bekommt sie damit ohne Zutun mitgeprueft,
// und wer eine Absicherung wieder herausnimmt, faellt hier auf.
//
// Der Massstab ist bewusst niedrig gehalten: NICHT "rechnet richtig", sondern
// nur "wirft keine Ausnahme". Was eine Funktion bei Muell zurueckgibt, darf
// sie selbst wissen; was sie nicht darf, ist die Oberflaeche mitreissen.
import { describe, it, expect } from "vitest";
import * as App from "./TrainingApp";
import { passtZurForm } from "./TrainingApp";

// Erste Stufe: blanker Unsinn an jeder Stelle.
const UNSINN = [
  undefined, null, 0, -1, NaN, Infinity, "", "abc", "2026-13-45", true, false,
  [], {}, [null], [undefined], [{}], { data: null }, () => {},
];

// Zweite Stufe: Daten, die plausibel AUSSEHEN, aber halb kaputt sind - so
// sieht echter Datenmuell aus. Ein abgebrochenes Speichern hinterlaesst kein
// "abc", sondern ein Training ohne `entries` oder einen Satz ohne `reps`.
const TRAININGS = [
  null,
  {},
  { id: "a" },
  { id: "b", date: "kaputt", entries: null },
  { id: "c", date: "2026-01-05", entries: [null, {}, { exerciseId: null, sets: null }] },
  { id: "d", date: "2026-02-05", entries: [{ exerciseId: "x", sets: [null, {}, { weight: "abc", reps: null }] }] },
  { id: "e", date: null, entries: [] },
  { id: "f", date: "2026-03-05", entries: [{ exerciseId: "x", sets: [{ weight: 100, reps: 5, done: true }] }], gymId: null },
];
const UEBUNGEN = [null, {}, { id: "x" }, { id: "y", name: null, group: null }];
const WEITERE = [undefined, null, "", "x", 0, NaN, {}, [], "2026-01-05", true, TRAININGS, UEBUNGEN];

function stuerztAb(fn: unknown, args: unknown[]): string | null {
  try {
    (fn as (...a: unknown[]) => unknown)(...args);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const EXPORTIERTE_FUNKTIONEN = Object.entries(App).filter(
  ([, wert]) => typeof wert === "function"
);

describe("Keine exportierte Funktion stuerzt bei kaputten Daten ab", () => {
  it("es werden ueberhaupt Funktionen geprueft", () => {
    // Bricht die automatische Suche einmal weg, soll das auffallen und nicht
    // als "alles gruen" durchgehen.
    expect(EXPORTIERTE_FUNKTIONEN.length).toBeGreaterThan(50);
  });

  for (const [name, fn] of EXPORTIERTE_FUNKTIONEN) {
    it(name, () => {
      const stellen = Math.max(1, Math.min((fn as { length: number }).length, 5));
      const fehler: string[] = [];

      // Ueberall dasselbe Stueck Unsinn, und zusaetzlich nur an erster Stelle
      // (der haeufige Fall: der Aufrufer reicht eine leere Liste durch).
      for (const wert of UNSINN) {
        const alle = stuerztAb(fn, new Array(stellen).fill(wert));
        if (alle) fehler.push(`${name}(${String(wert)} an allen Stellen): ${alle}`);
        const nurErste = stuerztAb(fn, [wert]);
        if (nurErste) fehler.push(`${name}(${String(wert)}): ${nurErste}`);
      }

      // Halbkaputte Trainingsdaten, durchgemischt ueber alle Stellen.
      const toepfe = [[TRAININGS, UEBUNGEN, ...WEITERE], WEITERE, WEITERE, WEITERE, WEITERE];
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < WEITERE.length; j++) {
          const args = Array.from({ length: stellen }, (_, k) => {
            const topf = toepfe[Math.min(k, 4)];
            return topf[(i + j * (k + 1)) % topf.length];
          });
          const meldung = stuerztAb(fn, args);
          if (meldung) fehler.push(`${name}(halbkaputte Daten): ${meldung}`);
        }
      }

      expect([...new Set(fehler)].slice(0, 3)).toEqual([]);
    });
  }
});

describe("Gespeicherte Werte werden gegen die erwartete Form geprueft", () => {
  // Der Kern von loadJSON: Der Ersatzwert sagt an, welche Form erwartet wird.
  // Passt der gespeicherte Wert nicht dazu, wird er verworfen - sonst landet
  // er im Zustand und faellt erst beim ersten .map() auf, also mitten im
  // Rendern, wo ihn niemand mehr abfangen kann.
  it("eine Liste wird nur durch eine Liste ersetzt", () => {
    expect(passtZurForm([1, 2], [])).toBe(true);
    expect(passtZurForm([], [])).toBe(true);
    expect(passtZurForm({}, [])).toBe(false);
    expect(passtZurForm("abc", [])).toBe(false);
    expect(passtZurForm(null, [])).toBe(false);
    expect(passtZurForm(42, [])).toBe(false);
  });

  it("eine Karte wird nur durch eine Karte ersetzt", () => {
    expect(passtZurForm({ a: 1 }, {})).toBe(true);
    // Eine Liste IST in JavaScript ein Objekt - fuer eine Karte, aus der nach
    // ID gelesen wird, waere sie trotzdem falsch.
    expect(passtZurForm([], {})).toBe(false);
    expect(passtZurForm(null, {})).toBe(false);
    expect(passtZurForm("abc", {})).toBe(false);
  });

  it("einfache Werte behalten ihren Typ", () => {
    expect(passtZurForm("dark", "light")).toBe(true);
    expect(passtZurForm(5, "light")).toBe(false);
    expect(passtZurForm(false, true)).toBe(true);
    expect(passtZurForm("nein", true)).toBe(false);
    expect(passtZurForm(3, 0)).toBe(true);
    expect(passtZurForm("3", 0)).toBe(false);
  });

  it("ohne Ersatzwert ist alles erlaubt", () => {
    // Fuer "active-workout", "body-weight" und die Sicherung: dort prueft der
    // Aufrufer selbst, und die Sicherung soll alles mitnehmen, was da ist.
    expect(passtZurForm({ id: "x" }, null)).toBe(true);
    expect(passtZurForm("irgendwas", null)).toBe(true);
    expect(passtZurForm(null, null)).toBe(true);
  });
});
