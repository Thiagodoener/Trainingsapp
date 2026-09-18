// Hier wird die App wirklich gestartet - statt nur einzelne Funktionen
// aufzurufen.
//
// Warum es das braucht: Die Luecke steht schon in pruefe-namen.mjs
// beschrieben. Der Build prueft nur, ob sich die Datei umwandeln laesst; die
// Rechen-Tests rufen einzelne Funktionen auf und fassen die Oberflaeche nie
// an. Genau dazwischen liegt die Art Absturz, die es zweimal bis aufs Handy
// geschafft hat ("Can't find variable: hatGewicht", "undefined is not an
// object (evaluating 'A.name')"): Er passiert beim Rendern, und dort nur,
// wenn man die betroffene Stelle auch antippt.
//
// pruefe-namen.mjs faengt davon eine Haelfte ab - Namen, die es nicht gibt.
// Die andere Haelfte sind Zugriffe auf Daten, die anders aussehen als
// erwartet. Die faengt nur ab, wer die App mit solchen Daten wirklich
// startet. Genau das passiert hier.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import TrainingApp from "./TrainingApp";

// Recharts misst seinen Platz ueber den ResizeObserver, den jsdom nicht hat.
// Ohne diesen Ersatz wuerde jedes Diagramm beim Rendern werfen - und das
// haette nichts mit der Frage zu tun, die hier gestellt wird.
class ResizeObserverErsatz {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Woertlich abgelegter Text - fuer die Faelle, in denen gerade NICHT
// gueltiges JSON in der Ablage stehen soll.
const roh = (text: string) => ({ __roh: text });

function speichere(werte: Record<string, unknown>) {
  window.localStorage.clear();
  for (const [key, wert] of Object.entries(werte)) {
    const text =
      wert && typeof wert === "object" && "__roh" in wert
        ? String((wert as { __roh: string }).__roh)
        : JSON.stringify(wert);
    window.localStorage.setItem(`training-app:${key}`, text);
  }
}

// Die Fehlerseite der App ("Da ist etwas schiefgelaufen") ist die Anzeige
// eines Absturzes, nicht seine Behebung: Sie kommt nach jedem Neuladen
// wieder, weil dieselben kaputten Daten wieder gelesen werden. Fuer diesen
// Test ist sie deshalb ein Fehlschlag wie ein geworfener Fehler auch.
function nichtAbgestuerzt(wo: string) {
  const fehlerseite = screen.queryByText(/Da ist etwas schiefgelaufen/);
  if (fehlerseite) {
    const meldung = document.querySelector("code")?.textContent || "";
    throw new Error(`Absturz in "${wo}": ${meldung}`);
  }
  expect(document.querySelector(".app-shell")).not.toBeNull();
}

// Jeder Reiter einmal. Das ist der eigentliche Punkt dieser Datei: Der
// Startbildschirm allein rendert nur einen Bruchteil der Oberflaeche, und
// genau die anderen Teile - die Listen, die Diagramme, der Verlauf - sind
// die, die man beim Absturz gerade angetippt hatte. Wer nur den Start
// prueft, prueft an der Stelle vorbei, um die es geht.
const REITER = ["Kalender", "Pläne", "Übungen", "Fortschritt", "Start"];

async function appStartetUndLaesstSichBedienen() {
  render(<TrainingApp />);
  await waitFor(() => nichtAbgestuerzt("beim Start"));

  for (const name of REITER) {
    const knopf = screen
      .queryAllByRole("button")
      .find((b) => b.textContent?.trim() === name);
    // Fehlt ein Reiter, ist die Navigationsleiste nicht da - auch das waere
    // ein Befund und kein Grund, stillschweigend weiterzumachen.
    expect(knopf, `Reiter "${name}" nicht gefunden`).toBeTruthy();
    await act(async () => { fireEvent.click(knopf!); });
    await waitFor(() => nichtAbgestuerzt(`Reiter "${name}"`));
  }
}

let warnungen: unknown[][] = [];
let fehler: unknown[][] = [];

beforeEach(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverErsatz;
  warnungen = [];
  fehler = [];
  vi.spyOn(console, "warn").mockImplementation((...a) => { warnungen.push(a); });
  vi.spyOn(console, "error").mockImplementation((...a) => { fehler.push(a); });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("Die App startet, was auch immer in der Ablage steht", () => {
  it("mit leerer Ablage", async () => {
    speichere({});
    await appStartetUndLaesstSichBedienen();
  });

  it("mit ganz normalen Daten", async () => {
    speichere({
      "training-plans": [{ id: "p1", name: "Push", items: [{ exerciseId: "bankdruecken", sets: 3 }] }],
      "workout-logs": [{
        id: "t1", date: new Date().toISOString(), planName: "Push",
        entries: [{ id: "e1", exerciseId: "bankdruecken", sets: [{ done: true, weight: 60, reps: 10 }] }],
      }],
      gyms: [{ id: "g1", name: "Studio" }],
      "active-gym-id": "g1",
    });
    await appStartetUndLaesstSichBedienen();
    expect(fehler).toEqual([]);
  });

  it("wenn Listen als Karten gespeichert sind", async () => {
    // Der Fall, der die App dauerhaft unbenutzbar machte: Nach dem Laden
    // steht ein Objekt dort, wo der Code eine Liste erwartet, und das erste
    // .map() beim Rendern raeumt die Oberflaeche ab. Neuladen half nicht.
    speichere({
      "training-plans": { kaputt: true },
      "workout-logs": { kaputt: true },
      gyms: { kaputt: true },
      "plan-folders": { kaputt: true },
      "training-programs": { kaputt: true },
      "custom-exercises": { kaputt: true },
      "calendar-entries": { kaputt: true },
    });
    await appStartetUndLaesstSichBedienen();
    // Und es bleibt nicht unbemerkt.
    expect(warnungen.length).toBeGreaterThan(0);
  });

  it("wenn Karten als Listen gespeichert sind", async () => {
    speichere({
      "exercise-notes": [1, 2, 3],
      "exercise-name-overrides": [],
      "exercise-subgroup-overrides": "kaputt",
      "exercise-equipment-overrides": 42,
      "exercise-time-based": null,
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("wenn mitten in den Listen null steht", async () => {
    speichere({
      "training-plans": [null, { id: "p1", name: "Push" }, "text", 5],
      "workout-logs": [null, { id: "t1", date: "2026-01-05", entries: [null, {}] }],
      gyms: [null, { id: "g1", name: "Studio" }],
      "plan-folders": [null],
      "training-programs": [null],
      "custom-exercises": [null, {}],
      "resistance-bands": [null],
      "breathing-logs": [null],
      "endurance-logs": [null],
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("wenn die Datei in der Ablage gar kein JSON ist", async () => {
    speichere({
      "training-plans": roh("{ das hier ist kein JSON"),
      "workout-logs": roh("<html>"),
      gyms: roh(""),
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("wenn ein laufendes Training kaputt ist", async () => {
    speichere({
      "active-workout": "das war mal ein Training",
      "rest-timer": Date.now() + 60000,
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("wenn ein laufendes Training auf geloeschte Uebungen zeigt", async () => {
    // Der schon einmal gemeldete Absturz: Das laufende Training wird beim
    // Start angezeigt, und die Uebung dahinter gibt es nicht mehr.
    speichere({
      "active-workout": {
        id: "s1", planName: "Push", startedAt: new Date().toISOString(),
        entries: [
          { id: "e1", exerciseId: "gibt-es-nicht-mehr", sets: [{ done: false, weight: 0, reps: 0 }] },
          null,
          { id: "e2" },
        ],
      },
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("wenn einfache Werte den falschen Typ haben", async () => {
    speichere({
      "app-theme": 42,
      "rest-sound": "ja",
      "deload-interval": "viele",
      "deload-weeks": { kaputt: true },
      "body-weight": "kaputt",
      "active-program-id": [],
      "active-gym-id": {},
      "puls-profil": "kaputt",
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("mit einem halben Jahr Trainingsdaten, in denen Luecken stecken", async () => {
    // Mit leeren Listen zeigen Diagramme, Verlauf und Rekorde gar nichts an -
    // der halbe Code der Auswertung wird dann nie ausgefuehrt. Erst mit
    // genug Trainings rendern sie wirklich, und genau dort sollen die
    // Luecken in den Daten auffallen.
    const tag = 86400000;
    const trainings = Array.from({ length: 60 }, (_, i) => ({
      id: `t${i}`,
      date: new Date(Date.now() - i * 3 * tag).toISOString(),
      planName: i % 7 === 0 ? null : "Push",
      durationMinutes: i % 5 === 0 ? null : 45,
      feeling: i % 4 === 0 ? null : 3,
      gymId: i % 3 === 0 ? "g1" : null,
      entries: [
        {
          id: `e${i}`,
          exerciseId: "bankdruecken",
          // Jedes dritte Training ohne RIR, jedes fuenfte ohne Gewicht -
          // beides kommt in echten Daten dauernd vor.
          rir: i % 3 === 0 ? null : 2,
          sets: [
            { done: true, warmup: false, weight: i % 5 === 0 ? null : 60 + i, reps: 8 },
            { done: true, warmup: false, weight: 60 + i, reps: i % 6 === 0 ? null : 8 },
            i % 4 === 0 ? null : { done: false, warmup: false, weight: 60, reps: 8 },
          ],
        },
        // Eine Uebung, die es im Katalog nicht gibt - der schon einmal
        // gemeldete Absturzgrund.
        i % 8 === 0
          ? { id: `x${i}`, exerciseId: "gibt-es-nicht", sets: [{ done: true, weight: 20, reps: 10 }] }
          : null,
      ],
    }));
    speichere({
      "workout-logs": trainings,
      "training-plans": [
        { id: "p1", name: "Push", items: [{ exerciseId: "bankdruecken", sets: 3 }] },
        { id: "p2", name: null, items: null },
        { id: "p3", items: [{ exerciseId: "gibt-es-nicht", sets: 3 }] },
      ],
      "custom-exercises": [{ id: "custom-x", name: "Eigene" }, { id: "custom-y" }],
      gyms: [{ id: "g1", name: "Studio" }, { id: "g2" }],
      "active-gym-id": "g1",
      "deload-weeks": ["2026-05-04", { start: "2026-06-01", end: "2026-06-07" }, null],
      "body-weight": [{ date: "2026-01-01", kg: 80 }, { date: null, kg: null }],
    });
    await appStartetUndLaesstSichBedienen();
  });

  it("wenn alles gleichzeitig kaputt ist", async () => {
    const muell = ["[]", "{}", "null", "0", '"abc"', "[null]", "{kein json"].map(roh);
    const alles: Record<string, unknown> = {};
    [
      "training-plans", "workout-logs", "custom-exercises", "plan-folders",
      "exercise-notes", "exercise-name-overrides", "exercise-time-based",
      "exercise-gym-independent", "exercise-stats-excluded", "active-workout",
      "training-programs", "active-program-id", "exercise-subgroup-overrides",
      "calendar-entries", "calendar-categories", "exercise-equipment-overrides",
      "app-theme", "gyms", "active-gym-id", "rest-timer", "breathing-exercises",
      "breathing-logs", "deload-weeks", "deload-interval", "resistance-bands",
      "rest-sound", "body-weight", "endurance-logs", "puls-profil",
      "externe-kraft-aktivitaeten", "collapsed-folders",
    ].forEach((key, i) => { alles[key] = muell[i % muell.length]; });
    speichere(alles);
    await appStartetUndLaesstSichBedienen();
  });
});
