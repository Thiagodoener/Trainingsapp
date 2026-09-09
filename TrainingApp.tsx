import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dumbbell,
  ClipboardList,
  TrendingUp,
  Plus,
  X,
  Check,
  ChevronRight,
  Trash2,
  Search,
  Play,
  Pause,
  Save,
  Loader2,
  Timer,
  SkipForward,
  Trophy,
  Smile,
  StickyNote,
  Pencil,
  Calendar,
  Clock,
  PencilLine,
  RotateCcw,
  MoreVertical,
  ChevronDown,
  GripVertical,
  Folder,
  Repeat,
  Sun,
  Moon,
  Globe,
  Wind,
  AlertTriangle,
  Minus,
  Home,
  Info,
  BatteryLow,
  Settings,
  User,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

// A shared 16-color palette for anything the person color-codes themselves
// (folders, calendar categories). Colors are grouped by hue family (reds,
// oranges, greens, blues, purples, neutrals) so the palette reads as an
// organized, familiar spectrum — but within each family the shades are
// deliberately spread out (lightness/saturation/hue-lean) so two adjacent
// swatches from the same family still stay easy to tell apart at a glance.
const SWATCH_COLORS = [
  // Reds
  "#d85a4f", "#b5524a",
  // Oranges
  "#c1652e", "#e07a3f", "#e8a13e",
  // Yellow
  "#e8c547",
  // Greens
  "#a8b544", "#6ea866", "#3f9e7c",
  // Blues / teals
  "#5b9aa8", "#4f83b8", "#6d7fd0",
  // Purples
  "#9a7bc4", "#c06fb0",
  // Neutrals
  "#8a6f5c", "#8f9296",
];
const FOLDER_COLORS = SWATCH_COLORS;
const CATEGORY_COLORS = SWATCH_COLORS;

// ---------------------------------------------------------------------------
// Atemübungen
//
// Eine Atemübung ist eine Liste von Phasen, die als Runde mehrfach
// durchlaufen wird. Bewusst frei zusammenstellbar statt fester
// Einatmen/Halten/Ausatmen-Vorlage: Box Breathing, 4-7-8, der
// physiologische Seufzer, CO2-Tabellen und Wim Hof haben strukturell
// nichts gemeinsam außer "Phasen nacheinander".
//
// seconds === null heißt "offene Phase": kein Countdown, die Zeit läuft
// hoch und weiter geht es erst auf Antippen. Genau das braucht der
// Atemanhalte-Teil bei Wim Hof, wo die Dauer eben nicht vorher feststeht.
//
// direction steuert die Grafik und ist deshalb Pflicht, nicht optional:
// beim Kreis wächst/schrumpft er, bei der Linie läuft der Punkt nach
// oben, unten oder waagerecht.
// ---------------------------------------------------------------------------
const BREATHING_COLOR = "#6ea8d8"; // Himmelblau, auch im Kalender
const BREATHING_DIRECTIONS = [
  { id: "in", label: "Einatmen" },
  { id: "hold", label: "Halten" },
  { id: "out", label: "Ausatmen" },
];
const BREATHING_DISPLAYS = [
  { id: "line", label: "Linie" },
  { id: "circle", label: "Kreis" },
];

// Fertige Vorlagen, damit man nicht bei jeder bekannten Übung von Null
// anfängt. Werden beim Anlegen als Startpunkt angeboten und danach ganz
// normal weiterbearbeitet.
const BREATHING_TEMPLATES = [
  {
    name: "Box Breathing",
    display: "line",
    rounds: 6,
    phases: [
      { label: "Einatmen", direction: "in", seconds: 4 },
      { label: "Halten", direction: "hold", seconds: 4 },
      { label: "Ausatmen", direction: "out", seconds: 4 },
      { label: "Halten", direction: "hold", seconds: 4 },
    ],
  },
  {
    name: "4-7-8 Atmung",
    display: "line",
    rounds: 4,
    phases: [
      { label: "Einatmen", direction: "in", seconds: 4 },
      { label: "Halten", direction: "hold", seconds: 7 },
      { label: "Ausatmen", direction: "out", seconds: 8 },
    ],
  },
  {
    name: "Physiologischer Seufzer",
    display: "line",
    rounds: 5,
    phases: [
      { label: "Einatmen", direction: "in", seconds: 2 },
      { label: "Nochmal kurz einatmen", direction: "in", seconds: 1 },
      { label: "Lang ausatmen", direction: "out", seconds: 6 },
    ],
  },
  {
    name: "Wim Hof",
    display: "circle",
    rounds: 3,
    phases: [
      { label: "30 schnelle Atemzüge", direction: "in", seconds: 60 },
      { label: "Ausatmen & halten", direction: "hold", seconds: null },
      { label: "Einatmen & halten", direction: "hold", seconds: 15 },
    ],
  },
  {
    name: "CO2-Schwellentraining",
    display: "line",
    rounds: 1,
    phases: [
      { label: "Ruhig atmen", direction: "in", seconds: 60 },
      { label: "Anhalten", direction: "hold", seconds: 30 },
      { label: "Ruhig atmen", direction: "in", seconds: 60 },
      { label: "Anhalten", direction: "hold", seconds: 40 },
      { label: "Ruhig atmen", direction: "in", seconds: 60 },
      { label: "Anhalten", direction: "hold", seconds: 50 },
      { label: "Ruhig atmen", direction: "in", seconds: 60 },
      { label: "Anhalten", direction: "hold", seconds: 60 },
    ],
  },
];

// Eine Übung ohne Phasen liefe sonst als Endlosschleife durch nichts.
function breathingPhases(exercise) {
  return Array.isArray(exercise?.phases) ? exercise.phases.filter(Boolean) : [];
}
function breathingRounds(exercise) {
  const n = toNum(exercise?.rounds);
  return n > 0 ? n : 1;
}
// Gesamtdauer in Sekunden - null, sobald eine offene Phase dabei ist, denn
// dann steht die Dauer vorher schlicht nicht fest.
function breathingTotalSeconds(exercise) {
  const phases = breathingPhases(exercise);
  if (phases.length === 0) return 0;
  if (phases.some((p) => p.seconds == null)) return null;
  return phases.reduce((sum, p) => sum + toNum(p.seconds), 0) * breathingRounds(exercise);
}

// Kurzer Doppelpuls für ein normales Phasenende - spürbar auch wenn das
// Handy auf dem Tisch liegt statt in der Hand, aber bewusst dezenter als das
// Pausenzeit-Ende (siehe scheduleRestBeep-Umfeld), weil eine Atemübung ein
// ruhiger Kontext ist.
const BREATHING_PHASE_VIBRATION = [50, 40, 50];
// Deutlich kräftiger - markiert das tatsächliche Ende der ganzen Übung
// (letzte Phase der letzten Runde), nicht nur einen Phasenwechsel.
const BREATHING_EXERCISE_END_VIBRATION = [150, 100, 150, 100, 150];

// Exercise pickers only render a screenful at a time. Drawing all ~150
// rows made every tap inside the picker redraw the entire list, which
// felt like a stutter on each "Add".
const EXERCISE_PICKER_LIMIT = 40;

const MUSCLE_GROUPS = [
  { id: "brust", label: "Brust" },
  { id: "ruecken", label: "Rücken" },
  { id: "beine", label: "Beine" },
  { id: "schultern", label: "Schultern" },
  { id: "arme", label: "Arme" },
  { id: "rumpf", label: "Rumpf" },
  { id: "nacken", label: "Nacken" },
];

// Optional, more specific categorization nested under each main muscle
// group. Exercises don't need one, but when set, the group's filter chip
// reveals these for narrower filtering.
const SUBGROUPS = {
  nacken: [
    { id: "nacken-seite", label: "Seitlicher Nacken" },
    { id: "nacken-hinten", label: "Hinterer Nacken" },
    { id: "nacken-vorne", label: "Vorderer Nacken" },
  ],
  brust: [
    { id: "brust-oben", label: "Obere Brust" },
    { id: "brust-mitte", label: "Mittlere Brust" },
    { id: "brust-unten", label: "Untere Brust" },
  ],
  ruecken: [
    { id: "lat", label: "Lat" },
    { id: "oberer-ruecken", label: "Oberer Rücken" },
    { id: "unterer-ruecken", label: "Unterer Rücken" },
    { id: "trapez", label: "Trapez" },
  ],
  beine: [
    { id: "quadrizeps", label: "Quadrizeps" },
    { id: "beinbizeps", label: "Beinbizeps" },
    { id: "gesaess", label: "Gesäß" },
    { id: "waden", label: "Waden" },
    { id: "adduktoren", label: "Adduktoren/Abduktoren" },
  ],
  schultern: [
    { id: "vordere-schulter", label: "Vordere Schulter" },
    { id: "seitliche-schulter", label: "Seitliche Schulter" },
    { id: "hintere-schulter", label: "Hintere Schulter" },
  ],
  arme: [
    { id: "bizeps", label: "Bizeps" },
    { id: "trizeps", label: "Trizeps" },
    { id: "unterarme", label: "Unterarme" },
  ],
  rumpf: [
    { id: "bauch", label: "Bauch" },
    { id: "seitliche-bauchmuskeln", label: "Seitliche Bauchmuskeln" },
    { id: "core-unterer-ruecken", label: "Unterer Rücken (Core)" },
  ],
};

// German keyboards put a comma on the decimal key, and a plain
// Number("62,5") is NaN — so every numeric field is read through this
// helper and both "62.5" and "62,5" mean the same thing.
// Weights are stored as numbers but entered/displayed German-style with a
// comma (62,5). Trailing ".0" is dropped so 60 stays "60", not "60,0".
export function fmtDecimal(value) {
  const n = toNum(value);
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

// "1 Übungen" liest sich falsch, und es stand an einem Dutzend Stellen so da.
// Eine Stelle fuer alle Zaehlungen, statt an jeder einzelnen daran zu denken.
// Gezaehlt wird ueber fmtDecimal, weil Saetze halbe Werte haben koennen
// (Nebengruppen zaehlen halb) - "0,5 Sätze" ist richtig, "1 Satz" auch.
export function plural(n, einzahl, mehrzahl) {
  return `${fmtDecimal(n)} ${toNum(n) === 1 ? einzahl : mehrzahl}`;
}

export const toNum = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Saved logs are read defensively everywhere: an entry written by an older
// version, or one interrupted mid-save, can be missing `entries` or `sets`
// entirely, and a bare .map/.forEach on those would take the whole screen
// down rather than just skipping the damaged record.
const logEntries = (log) => (Array.isArray(log?.entries) ? log.entries.filter(Boolean) : []);

// Ein Eintrag im Training ist ein *Platz* in der Reihenfolge, nicht "die
// Uebung". Erst dadurch kann dieselbe Uebung mehrfach vorkommen (Zirkel:
// A, B, A, C). Alles, was einen bestimmten Eintrag meint, laeuft ueber
// diese ID; die Uebungs-ID bleibt daneben stehen und beantwortet weiterhin
// "welche Uebung ist das" (Name, Historie, Statistik).
// Aeltere Trainings und Logs haben sie noch nicht - die bekommen sie beim
// Laden nachgereicht.
// Dieselbe Uebung kann mehrfach in einem Training stehen (Zirkel: A, B, A, C).
// Alles, was im Nachhinein rechnet, muss deshalb ALLE Plaetze dieser Uebung
// zusammennehmen. Ein .find() wuerde die zweite Kopie still verschlucken -
// ihre Saetze waeren fuer Rekorde, Verlauf und Charts dauerhaft verloren,
// ohne dass irgendwo ein Fehler auftaucht.
const logEntriesFor = (log, exerciseId) =>
  logEntries(log).filter((e) => e && e.exerciseId === exerciseId);
const logSetsFor = (log, exerciseId) =>
  logEntriesFor(log, exerciseId).flatMap((e) => entrySets(e));

// Bringt ein gespeichertes Training in die Form, die die Trainingsansicht
// voraussetzt: jeder Eintrag hat eine ID und ein sets-Array. Aeltere Logs
// und Eintraege aus beschaedigten Sicherungen haben beides nicht - und die
// Trainingsansicht greift beim Rendern direkt auf entry.sets zu.
function withEntryIds(session) {
  if (!session || !Array.isArray(session.entries)) return session;
  const clean = session.entries.filter(Boolean);
  const alreadyFine =
    clean.length === session.entries.length &&
    clean.every((e) => e.id && Array.isArray(e.sets));
  if (alreadyFine) return session;
  return {
    ...session,
    entries: clean.map((e) => ({
      ...e,
      id: e.id || uid(),
      sets: Array.isArray(e.sets) ? e.sets.filter(Boolean) : [],
    })),
  };
}
const entrySets = (entry) => (Array.isArray(entry?.sets) ? entry.sets.filter(Boolean) : []);

// Beim Speichern bleiben auch nicht abgehakte Saetze im Log stehen - sie
// gehoerten zum Plan dieses Trainings. Gemacht wurde aber nur, was abgehakt
// ist, und genau danach richtet sich jede Auswertung: ohne diesen Filter
// zaehlt ein vorbelegter, nie ausgefuehrter Satz als geleistete Arbeit.
export const performedSets = (sets) => (Array.isArray(sets) ? sets : []).filter((s) => s && s.done);
export const performedWorkingSets = (sets) => performedSets(sets).filter((s) => !s.warmup);

// Ein Satz ist entweder Aufwaermsatz, Dropsatz oder ein normaler Arbeitssatz.
// Aufwaermsaetze bleiben ueberall aus der Statistik ausgeschlossen; ein
// Dropsatz ist echtes Arbeitsvolumen und zaehlt wie jeder andere Satz mit.
const SET_KINDS = [
  ["normal", "Normaler Satz"],
  ["warmup", "Aufwärmsatz"],
  ["dropset", "Dropsatz"],
  ["calibration", "Eichsatz"],
];
export const setKind = (set) =>
  set?.warmup ? "warmup" : set?.dropset ? "dropset" : set?.calibration ? "calibration" : "normal";
export const setKindFlags = (kind) => ({
  warmup: kind === "warmup",
  dropset: kind === "dropset",
  calibration: kind === "calibration",
});

// Wiederholungen in Reserve (RIR) am letzten Satz einer Uebung - siehe
// KONZEPT.md. Bewusst RIR statt RPE: beides misst dasselbe (die moderne
// Kraftsport-RPE-Skala ist ueber RIR definiert), aber RIR fragt etwas
// Zaehlbares und braucht keinen Uebersetzungsschritt in eine abstrakte Zahl.
// Nach oben gedeckelt, weil oberhalb von ~4 in Reserve niemand mehr
// zuverlaessig zwischen 4, 5 und 6 unterscheidet.
const RIR_MAX = 4;
const RIR_OPTIONS = [0, 1, 2, 3, 4];
const rirLabel = (rir) => (rir >= RIR_MAX ? `${RIR_MAX}+` : String(rir));
// Überall dieselbe Schreibweise, auch bei 0: "0 RIR" statt "bis Versagen".
// Beides heißt dasselbe, aber eine einheitliche Zahl lässt sich zwischen
// Trainings vergleichen, ohne im Kopf zu übersetzen - und der Sonderfall
// stand nur an manchen Stellen, was zwei Skalen vortäuschte, wo es eine gibt.
export function fmtRir(rir) {
  if (rir == null || !Number.isFinite(Number(rir))) return null;
  const n = Math.max(0, Math.min(RIR_MAX, Math.round(Number(rir))));
  return `${rirLabel(n)} RIR`;
}

// Sitzungsgefuehl: fuenf Stufen mit Worten statt einer 10er-Skala. Worte,
// weil man Monate spaeter gegen einen Begriff vergleichen kann und nicht
// gegen die Erinnerung an eine "7" - siehe KONZEPT.md.
const FEELING_OPTIONS = [
  [1, "Ausgelaugt"],
  [2, "Müde"],
  [3, "Normal"],
  [4, "Gut"],
  [5, "Stark"],
];
const feelingLabel = (value) =>
  FEELING_OPTIONS.find(([v]) => v === Number(value))?.[1] || null;

// Ein Dropsatz haengt immer an dem Arbeitssatz davor - ohne einen solchen
// (erster Satz der Uebung, oder davor stehen nur Aufwaermsaetze) ergibt er
// keinen Sinn und wird gar nicht erst angeboten.
export function canBeDropset(sets, idx) {
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (!sets[i]?.warmup) return true;
  }
  return false;
}

// Ein Eichsatz geht bis zum echten Muskelversagen. Danach ist kein sinnvoller
// Satz mehr moeglich - stuende er mitten in der Uebung, waere jeder folgende
// Satz von der Erschoepfung verfaelscht. Angeboten wird er deshalb nur ganz
// am Ende. Ein bereits gesetzter Eichsatz bleibt bestehen, auch wenn spaeter
// noch ein Satz angehaengt wird: geschaetzt und bis zum Versagen trainiert
// wurde ja trotzdem.
export function canBeCalibration(sets, idx) {
  return idx === (Array.isArray(sets) ? sets.length : 0) - 1;
}

// Eichsatz-Auswertung: Wie gut trifft die Schaetzung vor dem Satz das, was
// dann wirklich geht? Der einzige Ort in der App, an dem eine Selbstein-
// schaetzung gegen eine ueberpruefte Zahl gehalten wird - bei jedem normalen
// Satz bleibt RIR eine Vermutung, die niemand nachprueft.
//
// Bewusst ueber alle Uebungen zusammen statt je Uebung: Eichsaetze sind
// selten (sie kosten Ueberwindung), und die Frage "wie gut kenne ich meine
// eigene Grenze" ist eine Eigenschaft der Person, nicht der Uebung. Je Uebung
// gerechnet kaeme auf Jahre hinaus nirgends eine tragfaehige Zahl zusammen.
const CALIBRATION_MIN_SETS = 3;

export function getCalibration(logs) {
  const rows = [];
  (Array.isArray(logs) ? logs : []).forEach((l) => {
    const ts = new Date(l?.date).getTime();
    logEntries(l).forEach((e) => {
      entrySets(e).forEach((s) => {
        if (!s || !s.done || !s.calibration) return;
        const estimated = toNum(s.estimatedFailureReps);
        const actual = toNum(s.reps);
        // Ohne beide Zahlen gibt es nichts zu vergleichen - ein Eichsatz, bei
        // dem die Schaetzung fehlt, ist einfach ein harter Satz.
        if (!(estimated > 0) || !(actual > 0)) return;
        rows.push({
          date: l.date,
          ts: Number.isFinite(ts) ? ts : 0,
          exerciseId: e.exerciseId,
          estimated,
          actual,
          diff: actual - estimated,
        });
      });
    });
  });
  rows.sort((a, b) => b.ts - a.ts);
  const count = rows.length;
  const avgDiff = count > 0 ? rows.reduce((sum, r) => sum + r.diff, 0) / count : null;
  return { rows, count, avgDiff, ready: count >= CALIBRATION_MIN_SETS };
}

// Sichtbare Nummer je Satz: Aufwaermsaetze zeigen "W", Dropsaetze haengen als
// Unternummer am vorangehenden Arbeitssatz (3.1, 3.2), alles andere zaehlt
// hoch. Dropsaetze bekommen also keine eigene Satznummer.
export function setNumberLabels(sets) {
  let working = 0;
  let drops = 0;
  return (Array.isArray(sets) ? sets : []).map((s) => {
    if (s?.warmup) return "W";
    if (s?.dropset && working > 0) {
      drops += 1;
      return `${working}.${drops}`;
    }
    working += 1;
    drops = 0;
    return String(working);
  });
}

// A subgroup assignment always comes from the override map (works the same
// way for built-in and custom exercises), so there is exactly one place
// that decides an exercise's subgroup.
// Returns ALL subgroups of an exercise. Older data stored a single id as a
// plain string; that is read as a one-element list here so existing
// assignments keep working without a migration step.
function getExerciseSubgroups(exercise, subgroupOverrides) {
  const raw = subgroupOverrides && subgroupOverrides[exercise.id];
  if (!raw) return [];
  return Array.isArray(raw) ? raw.filter(Boolean) : [raw];
}

// Kept for the places that only need one value (e.g. a compact tag).
function getExerciseSubgroup(exercise, subgroupOverrides) {
  return getExerciseSubgroups(exercise, subgroupOverrides)[0] || null;
}

function exerciseHasSubgroup(exercise, subgroupOverrides, subgroupId) {
  return getExerciseSubgroups(exercise, subgroupOverrides).includes(subgroupId);
}

export const EXERCISES = [
  // Brust
  { id: "bankdruecken", name: "Bankdrücken", group: "brust", equipment: "Langhantel", secondary: ["schultern", "arme"] },
  { id: "schraegbank", name: "Schrägbankdrücken", group: "brust", equipment: "Langhantel", secondary: ["schultern", "arme"] },
  { id: "negativbank", name: "Negativbankdrücken", group: "brust", equipment: "Langhantel", secondary: ["arme"] },
  { id: "kurzhantel-bankdruecken", name: "Kurzhantel-Bankdrücken", group: "brust", equipment: "Kurzhanteln", secondary: ["schultern", "arme"] },
  { id: "kurzhantel-schraeg", name: "Kurzhantel-Schrägbankdrücken", group: "brust", equipment: "Kurzhanteln", secondary: ["schultern", "arme"] },
  { id: "fliegende", name: "Fliegende (Kabel)", group: "brust", equipment: "Kabelzug", secondary: ["schultern"] },
  { id: "kurzhantel-fliegende", name: "Kurzhantel-Fliegende", group: "brust", equipment: "Kurzhanteln", secondary: ["schultern"] },
  { id: "butterfly", name: "Butterfly-Maschine", group: "brust", equipment: "Maschine", secondary: ["schultern"] },
  { id: "cable-crossover", name: "Cable Crossover", group: "brust", equipment: "Kabelzug", secondary: ["schultern"] },
  { id: "liegestuetz", name: "Liegestütz", group: "brust", equipment: "Körpergewicht", secondary: ["schultern", "arme", "rumpf"] },
  { id: "diamant-liegestuetz", name: "Diamant-Liegestütz", group: "brust", equipment: "Körpergewicht", secondary: ["arme", "schultern"] },
  { id: "brust-maschine", name: "Brustpresse (Maschine)", group: "brust", equipment: "Maschine", secondary: ["schultern", "arme"] },
  { id: "pullover", name: "Pullover", group: "brust", equipment: "Kurzhanteln", secondary: ["ruecken", "arme"] },
  { id: "svend-press", name: "Svend Press", group: "brust", equipment: "Gewichtsscheibe", secondary: ["schultern", "arme"] },
  { id: "smith-bankdruecken", name: "Bankdrücken (Smith Machine)", group: "brust", equipment: "Maschine", secondary: ["schultern", "arme"] },
  { id: "decline-bankdruecken", name: "Negativ-Kurzhantel-Bankdrücken", group: "brust", equipment: "Kurzhanteln", secondary: ["arme"] },
  { id: "brust-dips", name: "Brust-Dips", group: "brust", equipment: "Körpergewicht", secondary: ["arme", "schultern"] },
  { id: "landmine-press-brust", name: "Landmine Chest Press", group: "brust", equipment: "Langhantel", secondary: ["schultern", "arme"] },
  { id: "resistance-band-fliegende", name: "Fliegende (Widerstandsband)", group: "brust", equipment: "Band", secondary: ["schultern"] },
  { id: "pike-liegestuetz", name: "Pike Push-up", group: "brust", equipment: "Körpergewicht", secondary: ["schultern", "arme"] },

  // Rücken
  { id: "klimmzug", name: "Klimmzug", group: "ruecken", equipment: "Körpergewicht", secondary: ["arme", "schultern"] },
  { id: "klimmzug-untergriff", name: "Klimmzug (Untergriff)", group: "ruecken", equipment: "Körpergewicht", secondary: ["arme"] },
  { id: "latzug", name: "Latzug", group: "ruecken", equipment: "Kabelzug", secondary: ["arme"] },
  { id: "latzug-eng", name: "Latzug enger Griff", group: "ruecken", equipment: "Kabelzug", secondary: ["arme"] },
  { id: "rudern", name: "Langhantelrudern", group: "ruecken", equipment: "Langhantel", secondary: ["arme", "schultern"] },
  { id: "kurzhantelrudern", name: "Einarmiges Kurzhantelrudern", group: "ruecken", equipment: "Kurzhanteln", secondary: ["arme", "schultern"] },
  { id: "kabelrudern", name: "Kabelrudern (sitzend)", group: "ruecken", equipment: "Kabelzug", secondary: ["arme", "schultern"] },
  { id: "t-bar-rudern", name: "T-Bar-Rudern", group: "ruecken", equipment: "Langhantel", secondary: ["arme", "schultern"] },
  { id: "kreuzheben", name: "Kreuzheben", group: "ruecken", equipment: "Langhantel", secondary: ["beine", "rumpf"] },
  { id: "rumaenisches-kreuzheben", name: "Rumänisches Kreuzheben", group: "ruecken", equipment: "Langhantel", secondary: ["beine", "rumpf"] },
  { id: "sumo-kreuzheben", name: "Sumo-Kreuzheben", group: "ruecken", equipment: "Langhantel", secondary: ["beine", "rumpf"] },
  { id: "hyperextension", name: "Hyperextensionen", group: "ruecken", equipment: "Körpergewicht", secondary: ["beine", "rumpf"] },
  { id: "face-pull", name: "Face Pull", group: "ruecken", equipment: "Kabelzug", secondary: ["schultern"] },
  { id: "shrugs", name: "Shrugs (Nackenheben)", group: "ruecken", equipment: "Langhantel", secondary: ["nacken"] },
  { id: "good-morning", name: "Good Morning", group: "ruecken", equipment: "Langhantel", secondary: ["beine", "rumpf"] },
  { id: "pull-up-negativ", name: "Negativ-Klimmzug", group: "ruecken", equipment: "Körpergewicht", secondary: ["arme", "schultern"] },
  { id: "meron-row", name: "Meadows Row", group: "ruecken", equipment: "Kurzhanteln", secondary: ["arme", "schultern"] },
  { id: "chest-supported-row", name: "Chest Supported Row", group: "ruecken", equipment: "Kurzhanteln", secondary: ["arme", "schultern"] },
  { id: "cable-pullover", name: "Kabel-Pullover", group: "ruecken", equipment: "Kabelzug", secondary: ["brust", "arme"] },
  { id: "reverse-hyperextension", name: "Reverse Hyperextension", group: "ruecken", equipment: "Körpergewicht", secondary: ["beine", "rumpf"] },
  { id: "renegade-row", name: "Renegade Row", group: "ruecken", equipment: "Kurzhanteln", secondary: ["arme", "rumpf", "schultern"] },
  { id: "band-pull-apart", name: "Band Pull-Apart", group: "ruecken", equipment: "Band", secondary: ["schultern"] },

  // Beine
  { id: "kniebeuge", name: "Kniebeuge", group: "beine", equipment: "Langhantel", secondary: ["rumpf", "ruecken"] },
  { id: "frontkniebeuge", name: "Frontkniebeuge", group: "beine", equipment: "Langhantel", secondary: ["rumpf", "ruecken"] },
  { id: "goblet-squat", name: "Goblet Squat", group: "beine", equipment: "Kurzhanteln", secondary: ["rumpf"] },
  { id: "beinpresse", name: "Beinpresse", group: "beine", equipment: "Maschine" },
  { id: "ausfallschritt", name: "Ausfallschritte", group: "beine", equipment: "Kurzhanteln", secondary: ["rumpf"] },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", group: "beine", equipment: "Kurzhanteln", secondary: ["rumpf"] },
  { id: "beinstrecker", name: "Beinstrecker", group: "beine", equipment: "Maschine" },
  { id: "beinbeuger", name: "Beinbeuger", group: "beine", equipment: "Maschine" },
  { id: "wadenheben", name: "Wadenheben (stehend)", group: "beine", equipment: "Maschine" },
  { id: "wadenheben-sitzend", name: "Wadenheben (sitzend)", group: "beine", equipment: "Maschine" },
  { id: "hip-thrust", name: "Hip Thrust", group: "beine", equipment: "Langhantel", secondary: ["rumpf"] },
  { id: "hueftadduktion", name: "Hüftadduktoren-Maschine", group: "beine", equipment: "Maschine" },
  { id: "hueftabduktion", name: "Hüftabduktoren-Maschine", group: "beine", equipment: "Maschine" },
  { id: "step-up", name: "Step-ups", group: "beine", equipment: "Kurzhanteln", secondary: ["rumpf"] },
  { id: "kettlebell-swing", name: "Kettlebell Swing", group: "beine", equipment: "Kettlebell", secondary: ["ruecken", "rumpf"] },
  { id: "hackenschmidt", name: "Hackenschmidt-Kniebeuge", group: "beine", equipment: "Maschine" },
  { id: "sissy-squat", name: "Sissy Squat", group: "beine", equipment: "Körpergewicht", secondary: ["rumpf"] },
  { id: "nordic-curl", name: "Nordic Hamstring Curl", group: "beine", equipment: "Körpergewicht", secondary: ["rumpf"] },
  { id: "sumo-kniebeuge", name: "Sumo-Kniebeuge", group: "beine", equipment: "Langhantel", secondary: ["rumpf", "ruecken"] },
  { id: "pistol-squat", name: "Pistol Squat", group: "beine", equipment: "Körpergewicht", secondary: ["rumpf"] },
  { id: "walking-lunge", name: "Walking Lunges", group: "beine", equipment: "Kurzhanteln", secondary: ["rumpf"] },
  { id: "curtsy-lunge", name: "Curtsy Lunge", group: "beine", equipment: "Kurzhanteln", secondary: ["rumpf"] },
  { id: "glute-bridge", name: "Glute Bridge", group: "beine", equipment: "Körpergewicht", secondary: ["rumpf"] },
  { id: "seated-calf-raise-maschine", name: "Waden-Maschine (liegend)", group: "beine", equipment: "Maschine" },
  { id: "box-jump", name: "Box Jump", group: "beine", equipment: "Körpergewicht", secondary: ["rumpf"] },

  // Schultern
  { id: "schulterdruecken", name: "Schulterdrücken", group: "schultern", equipment: "Langhantel", secondary: ["arme", "rumpf"] },
  { id: "military-press", name: "Military Press", group: "schultern", equipment: "Langhantel", secondary: ["arme", "rumpf"] },
  { id: "arnold-press", name: "Arnold Press", group: "schultern", equipment: "Kurzhanteln", secondary: ["arme"] },
  { id: "seitheben", name: "Seitheben", group: "schultern", equipment: "Kurzhanteln" },
  { id: "kabel-seitheben", name: "Seitheben am Kabel", group: "schultern", equipment: "Kabelzug" },
  { id: "frontheben", name: "Frontheben", group: "schultern", equipment: "Kurzhanteln" },
  { id: "reverse-fly", name: "Reverse Fly (hintere Schulter)", group: "schultern", equipment: "Kurzhanteln", secondary: ["ruecken"] },
  { id: "aufrechtes-rudern", name: "Aufrechtes Rudern", group: "schultern", equipment: "Langhantel", secondary: ["nacken", "arme"] },
  { id: "landmine-press", name: "Landmine Press", group: "schultern", equipment: "Langhantel", secondary: ["arme", "rumpf"] },
  { id: "pike-push-up-schulter", name: "Pike Push-up (Schulter)", group: "schultern", equipment: "Körpergewicht", secondary: ["arme", "brust"] },
  { id: "cuban-press", name: "Cuban Press", group: "schultern", equipment: "Kurzhanteln", secondary: ["ruecken"] },
  { id: "y-raise", name: "Y-Raise", group: "schultern", equipment: "Kurzhanteln", secondary: ["ruecken"] },
  { id: "bus-driver", name: "Bus Driver", group: "schultern", equipment: "Gewichtsscheibe" },
  { id: "schulterdruecken-maschine", name: "Schulterdrücken (Maschine)", group: "schultern", equipment: "Maschine", secondary: ["arme"] },
  { id: "plate-raise", name: "Plate Front Raise", group: "schultern", equipment: "Gewichtsscheibe" },

  // Arme
  { id: "bizepscurl", name: "Bizepscurl", group: "arme", equipment: "Kurzhanteln" },
  { id: "langhantelcurl", name: "Langhantel-Bizepscurl", group: "arme", equipment: "Langhantel" },
  { id: "scottcurl", name: "Scott-Curl", group: "arme", equipment: "Langhantel" },
  { id: "kabelcurl", name: "Bizepscurl am Kabel", group: "arme", equipment: "Kabelzug" },
  { id: "hammercurl", name: "Hammercurl", group: "arme", equipment: "Kurzhanteln" },
  { id: "konzentrationscurl", name: "Konzentrationscurl", group: "arme", equipment: "Kurzhanteln" },
  { id: "trizepsdrucken", name: "Trizepsdrücken (Kabel)", group: "arme", equipment: "Kabelzug" },
  { id: "trizepsdrucken-seil", name: "Trizepsdrücken (Seil)", group: "arme", equipment: "Kabelzug" },
  { id: "franzoesisches-druecken", name: "Französisches Drücken", group: "arme", equipment: "Langhantel" },
  { id: "trizeps-kickback", name: "Trizeps-Kickback", group: "arme", equipment: "Kurzhanteln" },
  { id: "dips", name: "Dips", group: "arme", equipment: "Körpergewicht", secondary: ["brust", "schultern"] },
  { id: "enges-bankdruecken", name: "Enges Bankdrücken", group: "arme", equipment: "Langhantel", secondary: ["brust", "schultern"] },
  { id: "unterarm-curl", name: "Unterarm-Curl (Wrist Curl)", group: "arme", equipment: "Langhantel" },
  { id: "21er-curl", name: "21er Bizepscurl", group: "arme", equipment: "Langhantel" },
  { id: "spider-curl", name: "Spider Curl", group: "arme", equipment: "Kurzhanteln" },
  { id: "zottman-curl", name: "Zottman Curl", group: "arme", equipment: "Kurzhanteln" },
  { id: "overhead-trizepsdruecken", name: "Überkopf-Trizepsdrücken (Kurzhantel)", group: "arme", equipment: "Kurzhanteln" },
  { id: "trizeps-dips-bank", name: "Trizeps-Dips (Bank)", group: "arme", equipment: "Körpergewicht", secondary: ["brust", "schultern"] },
  { id: "reverse-curl", name: "Reverse Curl", group: "arme", equipment: "Langhantel" },
  { id: "unterarm-curl-reverse", name: "Unterarm-Curl (Reverse)", group: "arme", equipment: "Langhantel" },

  // Rumpf
  { id: "plank", name: "Plank", group: "rumpf", equipment: "Körpergewicht", secondary: ["schultern"] },
  { id: "seitplank", name: "Seitplank", group: "rumpf", equipment: "Körpergewicht", secondary: ["schultern"] },
  { id: "crunches", name: "Crunches", group: "rumpf", equipment: "Körpergewicht" },
  { id: "kabel-crunches", name: "Kabel-Crunches", group: "rumpf", equipment: "Kabelzug" },
  { id: "situps", name: "Sit-ups", group: "rumpf", equipment: "Körpergewicht" },
  { id: "beinheben", name: "Beinheben (hängend)", group: "rumpf", equipment: "Körpergewicht" },
  { id: "beinheben-liegend", name: "Beinheben (liegend)", group: "rumpf", equipment: "Körpergewicht" },
  { id: "russian-twist", name: "Russian Twist", group: "rumpf", equipment: "Gewichtsscheibe" },
  { id: "ab-wheel", name: "Ab Wheel Rollout", group: "rumpf", equipment: "Sonstiges", secondary: ["schultern", "ruecken"] },
  { id: "mountain-climber", name: "Mountain Climbers", group: "rumpf", equipment: "Körpergewicht", secondary: ["schultern"] },
  { id: "hollow-hold", name: "Hollow Hold", group: "rumpf", equipment: "Körpergewicht" },
  { id: "dead-bug", name: "Dead Bug", group: "rumpf", equipment: "Körpergewicht" },
  { id: "pallof-press", name: "Pallof Press", group: "rumpf", equipment: "Kabelzug", secondary: ["schultern"] },
  { id: "landmine-twist", name: "Landmine Rotation", group: "rumpf", equipment: "Langhantel", secondary: ["schultern"] },
  { id: "v-ups", name: "V-Ups", group: "rumpf", equipment: "Körpergewicht" },
  { id: "cable-woodchopper", name: "Kabel-Holzhacker", group: "rumpf", equipment: "Kabelzug", secondary: ["schultern"] },
  { id: "reverse-crunch", name: "Reverse Crunch", group: "rumpf", equipment: "Körpergewicht" },
  { id: "stir-the-pot", name: "Stir the Pot", group: "rumpf", equipment: "Sonstiges", secondary: ["schultern"] },

  // Nacken
  { id: "nackenheben-kurzhantel", name: "Nackenheben (Kurzhanteln)", group: "nacken", equipment: "Kurzhanteln", secondary: ["ruecken"] },
  { id: "nackenheben-langhantel", name: "Nackenheben (Langhantel)", group: "nacken", equipment: "Langhantel", secondary: ["ruecken"] },
  { id: "neck-curl", name: "Nacken-Curl (liegend)", group: "nacken", equipment: "Gewichtsscheibe" },
  { id: "neck-extension", name: "Nacken-Extension (liegend)", group: "nacken", equipment: "Gewichtsscheibe" },
  { id: "neck-lateral", name: "Seitliches Nackenheben", group: "nacken", equipment: "Gewichtsscheibe" },
  { id: "neck-harness", name: "Nackentraining mit Kopfgeschirr", group: "nacken", equipment: "Sonstiges" },
];

const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

// Mit wie viel eine Uebung auf einer NEBEN-Muskelgruppe zaehlt.
//
// Bankdruecken trainiert nicht nur die Brust: Schultern und Trizeps arbeiten
// deutlich mit. Bis Sept. 2026 zaehlte jede Uebung zu 100 % auf genau eine
// Gruppe und zu 0 % auf alle anderen - "Saetze pro Muskelgruppe" hat damit
// Schultern und Arme systematisch zu niedrig ausgewiesen, und zwar umso
// staerker, je mehr Grunduebungen im Plan stehen.
//
// 0,5 ist die in der Trainingsplanung uebliche Verrechnung indirekter Arbeit
// (Israetel u. a., Volumen-Landmarken): ein halber Satz je Nebengruppe. Die
// Zahl ist bewusst grob - sie soll die Groessenordnung richtigstellen, nicht
// Genauigkeit vortaeuschen, die es bei Muskelbeteiligung ohne EMG nicht gibt.
const SECONDARY_SHARE = 0.5;

// Alle Gruppen einer Uebung mit ihrem Anteil: die Hauptgruppe voll, jede
// Nebengruppe halb. Eine Gruppe kommt nie doppelt vor.
export function exerciseGroupShares(exercise) {
  const out = [];
  if (!exercise?.group) return out;
  out.push([exercise.group, 1]);
  (Array.isArray(exercise.secondary) ? exercise.secondary : []).forEach((g) => {
    if (g && g !== exercise.group && !out.some(([id]) => id === g)) out.push([g, SECONDARY_SHARE]);
  });
  return out;
}

const uid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });

// Local-date (not UTC) YYYY-MM-DD key, so a calendar day always matches the
// day the person actually sees on their device, regardless of timezone.
const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Builds a 6x7 grid (weeks x days) covering the full month plus the
// leading/trailing days needed to fill complete weeks, Monday-first.
function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(year, month, 1 - startOffset);
  const weeks = [];
  let cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Liefert für eine Übung: die zuletzt protokollierten Sätze (aus vergangenen
// Logs, jüngste zuerst) sowie den bisherigen Bestwert (schwerster Satz +
// meiste Wdh. bei diesem Gewicht), um "Letzte Leistung" & PR-Badges anzuzeigen.
// An exercise counts as time-based when it is flagged globally OR when its
// recorded sets were done on time (automatic mode writes targetUseTime into
// the log). Without this, a HIT workout would show up as a weight exercise
// with 0 kg in the stats and charts.
// Whether an exercise is treated as time-based (seconds) rather than reps.
// A manual choice always wins, including an explicit "off" - once someone
// has set this, old logs from before that choice must not override it.
// Only an exercise that was never set at all falls back to guessing from
// its log history.
export function isTimeBasedInLogs(logs, exerciseId, timeBasedExercises) {
  if (timeBasedExercises && Object.prototype.hasOwnProperty.call(timeBasedExercises, exerciseId)) {
    return !!timeBasedExercises[exerciseId];
  }
  return (logs || []).some((l) => {
    // Trainings aus dem Automatik-Modus zaehlen hier nicht mit. Der Modus hat
    // frueher JEDE Uebung eines solchen Trainings als Zeit-Uebung
    // weggeschrieben, obwohl er nur taktet. Ein einziges getaktetes Training
    // machte damit aus Ausfallschritten dauerhaft eine Sekunden-Uebung -
    // rueckwirkend auch in allen anderen Trainings, weil diese Abfrage ueber
    // alle Logs geht.
    //
    // Neue Trainings schreiben dieses Kennzeichen gar nicht mehr aus dem Takt
    // heraus; diese Zeile gilt also nur den Aufzeichnungen von davor. Wer
    // eine Uebung wirklich in Sekunden misst, stellt das an der Uebung ein -
    // und diese Angabe gewinnt oben ohnehin gegen alles.
    if (l?.autoRun) return false;
    return logEntries(l).some((e) => e.exerciseId === exerciseId && e.targetUseTime);
  });
}

// Übungen, die überall gleich sind - Liegestütze, Plank, alles mit Band.
// Bei ihnen hängt die Leistung nicht am Studio, also darf die Historie auch
// nicht pro Gym auseinandergerissen werden: eine durchgehende Linie im
// Diagramm, ein durchgehender Rekord, ein "letztes Mal" über alle Gyms.
// Die Einstellung wird pro Übung gesetzt und bleibt dauerhaft.
function isGymIndependent(exerciseId, gymIndependentExercises) {
  return !!(gymIndependentExercises && gymIndependentExercises[exerciseId]);
}

// Die eine Stelle, die entscheidet, ob nach Gym getrennt wird. Wer null
// zurückbekommt, vergleicht über alle Gyms hinweg. Jede Auswertung, die ein
// gymId weiterreicht, schickt es zuerst hier durch - sonst würde eine
// vergessene Stelle die Übung weiterhin aufsplitten, während der Rest der
// App sie längst als überall-gleich behandelt.
function effectiveGymId(exerciseId, gymId, gymIndependentExercises) {
  return isGymIndependent(exerciseId, gymIndependentExercises) ? null : gymId;
}

// Der Zustand, den getExerciseHistory zusammentraegt: alle Bestwerte dieser
// Uebung plus das letzte Mal. Als eigenes Objekt herausgezogen, damit
// dieselbe Rechnung auch Training fuer Training vorwaerts laufen kann - das
// braucht der Verlauf fuer die Pokale. Wuerde er stattdessen fuer JEDES
// Training die ganze Historie davor neu durchgehen, waere das bei ein paar
// hundert Trainings eine knappe Sekunde Wartezeit, jedes Mal.
function emptyExerciseHistory() {
  return {
    lastSets: null,
    lastDate: null,
    lastRir: null,
    lastNote: null,
    bestWeight: 0,
    bestRepsAtBestWeight: 0,
    bestDuration: 0,
    // Records the trophy is based on. Per set: 1RM, set volume, reps, seconds.
    // Per exercise (all sets of one workout added up): volume, reps, seconds.
    best1RM: 0,
    bestSetVolume: 0,
    bestSetReps: 0,
    // Bei welchem Gewicht der Wiederholungs-Rekord aufgestellt wurde. Ohne das
    // gilt ein leichter Ausbelastungssatz (20 Wdh. mit 40 kg) als Rekord fuer
    // eine Uebung, die sonst mit 8 Wdh. bei 100 kg laeuft - und macht den
    // Rekord bei echtem Arbeitsgewicht dauerhaft unschlagbar.
    bestSetRepsWeight: 0,
    bestTotalVolume: 0,
    bestTotalReps: 0,
    bestTotalDuration: 0,
    comparableSessions: 0,
    // Zu jedem Bestwert das RIR der Einheit, in der er aufgestellt wurde. Ein
    // Rekord sagt für sich genommen nur "mehr als vorher"; erst zusammen mit
    // der Reserve wird daraus eine Aussage: derselbe Wert mit 2 in Reserve ist
    // etwas anderes als derselbe Wert am Limit.
    bestWeightRir: null,
    best1RMRir: null,
    bestSetVolumeRir: null,
    bestSetRepsRir: null,
    bestDurationRir: null,
    bestTotalVolumeRir: null,
    bestTotalRepsRir: null,
    bestTotalDurationRir: null,
    // Alle RIR-Angaben dieser Übung - Grundlage für "wie hart beendest du
    // diese Übung sonst?".
    rirHistory: [],
  };
}

// Ein einzelnes Training in den Zustand einrechnen.
// newestFirst sagt, in welcher Richtung gelaufen wird: rueckwaerts (so wie
// getExerciseHistory es tut) ist das ERSTE Training mit Saetzen das juengste,
// vorwaerts das LETZTE. Nur davon haengt ab, welches Training "das letzte
// Mal" ist - alle Bestwerte sind von der Richtung unabhaengig.
function addSessionToExerciseHistory(h, log, exerciseId, isTimeBased, newestFirst = true) {
  // Logs written by older versions (or a half-finished save) can be
  // missing `entries` or `sets` entirely, so every access is guarded
  // rather than assuming a fully-formed object.
  const matching = logEntriesFor(log, exerciseId);
  if (matching.length === 0) return;
  if (!newestFirst || h.lastNote === null) {
    const noted = matching.find((e) => typeof e.notes === "string" && e.notes.trim());
    if (noted) h.lastNote = noted.notes.trim();
  }

  // Saetze aller Plaetze dieser Uebung in diesem Training, in der
  // Reihenfolge, in der sie im Training standen.
  const sets = matching.flatMap((e) => (Array.isArray(e.sets) ? e.sets : []));
  // Ein Satz zaehlt, wenn ueberhaupt Arbeit drinsteht. Frueher wurde bei
  // Uebungen ohne Zeit AUSSCHLIESSLICH auf Gewicht geprueft - damit fielen
  // alle Koerpergewichts-Uebungen komplett heraus: Klimmzug, Dips,
  // Liegestuetz und alles andere mit 0 kg hatte gar keine Historie. Kein
  // "Letztes Mal", keine Rekorde, keine Reserve-Einordnung, obwohl die
  // Saetze sauber protokolliert waren.
  const doneSets = sets.filter(
    (set) =>
      set &&
      set.done &&
      !set.warmup &&
      (isTimeBased
        ? toNum(set.duration) > 0
        : toNum(set.weight) > 0 || toNum(set.reps) > 0)
  );
  if (doneSets.length === 0) return;

  // Bei mehreren Plaetzen zaehlt die erste vorhandene Angabe.
  const rirEntry = matching.find((e) => Number.isFinite(Number(e.rir)));
  const sessionRir = rirEntry ? Number(rirEntry.rir) : null;
  if (sessionRir != null) h.rirHistory.push(sessionRir);

  if (!newestFirst || !h.lastSets) {
    h.lastSets = doneSets;
    h.lastDate = log.date;
    h.lastRir = sessionRir;
  }

  h.comparableSessions += 1;
  // Per-exercise totals of this session. Bewusst kein Math.max mehr: nur
  // wer merkt, WANN ein Bestwert überboten wurde, kann auch festhalten,
  // mit welcher Reserve das geschah.
  const totalReps = doneSets.reduce((a, x) => a + toNum(x.reps), 0);
  if (totalReps > h.bestTotalReps) { h.bestTotalReps = totalReps; h.bestTotalRepsRir = sessionRir; }
  const totalDuration = doneSets.reduce((a, x) => a + toNum(x.duration), 0);
  if (totalDuration > h.bestTotalDuration) { h.bestTotalDuration = totalDuration; h.bestTotalDurationRir = sessionRir; }
  const totalVolume = doneSets.reduce((a, x) => a + toNum(x.weight) * toNum(x.reps), 0);
  if (totalVolume > h.bestTotalVolume) { h.bestTotalVolume = totalVolume; h.bestTotalVolumeRir = sessionRir; }

  // Die RIR-Angabe beschreibt den LETZTEN Satz der Übung - so wird sie im
  // Training auch abgefragt. Für einen Rekord, der in einem früheren Satz
  // fiel, ist sie nicht die Reserve, mit der er erreicht wurde: Wer
  // 100×8 / 100×6 / 90×5 macht, stellt den Gewichtsrekord im ERSTEN Satz
  // auf, während die Angabe den dritten beschreibt. Solche Rekorde bekommen
  // deshalb keine Reserve zugeordnet - lieber keine Angabe als eine falsche.
  const lastDoneSet = doneSets[doneSets.length - 1];
  const rirOf = (set) => (set === lastDoneSet ? sessionRir : null);

  for (const set of doneSets) {
    const reps = toNum(set.reps);
    const weightHere = toNum(set.weight);
    if (reps > h.bestSetReps && weightHere >= h.bestSetRepsWeight) {
      h.bestSetReps = reps;
      h.bestSetRepsWeight = weightHere;
      h.bestSetRepsRir = rirOf(set);
    }
    const vol = toNum(set.weight) * reps;
    if (vol > h.bestSetVolume) { h.bestSetVolume = vol; h.bestSetVolumeRir = rirOf(set); }
    const oneRM = set1RM(set, rirOf(set));
    if (oneRM > h.best1RM) { h.best1RM = oneRM; h.best1RMRir = rirOf(set); }
  }

  if (isTimeBased) {
    for (const set of doneSets) {
      const dur = toNum(set.duration);
      if (dur > h.bestDuration) { h.bestDuration = dur; h.bestDurationRir = rirOf(set); }
    }
  } else {
    // Numbers are compared explicitly: values that slipped through as
    // strings would otherwise compare lexically ("60" > "7" is false).
    for (const set of doneSets) {
      const weight = toNum(set.weight);
      const reps = toNum(set.reps);
      if (weight > h.bestWeight) {
        h.bestWeight = weight;
        h.bestRepsAtBestWeight = reps;
        h.bestWeightRir = rirOf(set);
      } else if (weight === h.bestWeight && reps > h.bestRepsAtBestWeight) {
        h.bestRepsAtBestWeight = reps;
        h.bestWeightRir = rirOf(set);
      }
    }
  }
}

// Aus dem Zustand die fertige Historie machen. typicalRir schaut nur auf die
// juengsten Angaben, deshalb muss die Liste hier neueste-zuerst stehen - bei
// der Vorwaerts-Richtung also umgedreht werden.
function finishExerciseHistory(h, newestFirst = true) {
  const rirHistory = newestFirst ? h.rirHistory : [...h.rirHistory].reverse();
  return { ...h, rirHistory, typicalRir: typicalRir(rirHistory) };
}

export function getExerciseHistory(logs, exerciseId, excludeSessionId, isTimeBased = false, gymId = null) {
  const all = logs
    .filter((l) => l.id !== excludeSessionId)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Weights differ between gyms, so a personal record only means something
  // within the same gym. When a gym is given we look at that gym only; if
  // there is nothing there yet (first visit) we fall back to everything,
  // otherwise the first workout in a new gym would start from scratch.
  const sameGym = gymId ? all.filter((l) => l.gymId === gymId) : all;
  const past = gymId && sameGym.length > 0 ? sameGym : all;

  // Gerechnet wird von ALT nach NEU, obwohl die Liste neueste-zuerst steht.
  // Das ist keine Kosmetik: Der Wiederholungs-Rekord haengt an der Reihenfolge,
  // weil er nur bei mindestens demselben Gewicht wie der bisherige zaehlt.
  // Rueckwaerts gelesen entstand daraus ein "Bestwert", der aus den juengsten
  // Saetzen zuerst gebaut wurde - ein aelterer Satz mit mehr Wiederholungen
  // bei weniger Gewicht fiel dann still hinten runter, obwohl er zu seiner
  // Zeit der Rekord war. Vorwaerts gelesen entsteht genau das, was die Regel
  // sagt: der beste Wert, den es zu diesem Zeitpunkt zu schlagen gab.
  const h = emptyExerciseHistory();
  for (let i = past.length - 1; i >= 0; i--) {
    addSessionToExerciseHistory(h, past[i], exerciseId, isTimeBased, false);
  }
  return finishExerciseHistory(h, false);
}

// Wie hart beendest du diese Übung üblicherweise? Median statt Mittelwert,
// weil die Skala nur fünf Stufen hat und ein einzelner Ausreißer-Tag
// ("heute ging gar nichts") den Schnitt sonst spürbar zieht. Nur die
// jüngsten Einheiten zählen: wie nah man ans Limit geht, ändert sich mit
// der Trainingsphase, ein Wert von vor einem Jahr beschreibt nicht mehr,
// wie man heute trainiert.
const TYPICAL_RIR_WINDOW = 10;
const TYPICAL_RIR_MIN_SESSIONS = 3;

// ---------------------------------------------------------------------------
// RIR in der Belastungsrechnung
//
// Das Problem steht in KONZEPT.md unter "Offene Punkte": Gewicht × Wdh.
// vermischt Volumen und Intensität. Zwei Einheiten mit derselben Tonnage sind
// nicht dieselbe Belastung, wenn eine davon am Limit endete und die andere
// mit vier Wiederholungen in Reserve. Dort steht auch, dass RIR das an der
// Wurzel löst, statt es besser zu raten - genau das passiert hier.
//
// Drei Entscheidungen, die den Eingriff sicher machen:
//
// 1. Gemessen wird gegen den EIGENEN Normalwert dieser Übung, nicht gegen
//    eine feste Grenze. Wer alles am Limit trainiert, bekommt sonst pauschal
//    höhere Werte, ohne dass sich etwas geändert hätte.
// 2. Ohne Angabe bleibt der Faktor exakt 1. Eine Woche ohne RIR-Eingaben
//    sieht damit aus wie vorher - fehlende Daten verschieben nichts.
// 3. Gewichtet wird ausschließlich die Arbeit des LETZTEN abgehakten
//    Arbeitssatzes - nur für ihn liegt die Angabe vor. Ein erster Versuch
//    multiplizierte die Summe der ganzen Übung mit dem Faktor, mit der
//    Begründung, das sei etwas anderes als eine Gewichtung je Satz. Das war
//    schlicht falsch: f × (a+b+c) ist dasselbe wie f·a + f·b + f·c. Damit
//    wären auch die früheren Sätze mitgewichtet worden, für die es keine
//    Angabe gibt - dieselbe Fehlzuordnung, die bei den Rekorden schon einmal
//    drinsteckte. Der Preis dieser Ehrlichkeit: Bei drei Sätzen bleibt rund
//    ein Drittel der Wirkung übrig, und je mehr Sätze, desto weniger. Das ist
//    die Folge davon, dass genau ein Satz je Übung erfasst wird.
//
// Die Schrittweite kommt aus der Faustregel, dass eine Wiederholung grob
// 2,5-3 % des 1RM entspricht: Eine Stufe näher am Limit ist ungefähr so viel
// wert wie 3 % mehr Gewicht. Bewusst klein gehalten - die Kennzahl soll sich
// verfeinern, nicht umgeschrieben werden.
// ---------------------------------------------------------------------------
const RIR_LOAD_PER_STEP = 0.03;
const RIR_LOAD_CAP = 0.12;

export function rirLoadFactor(rir, typical) {
  if (rir == null || typical == null) return 1;
  const now = Number(rir);
  const usual = Number(typical);
  if (!Number.isFinite(now) || !Number.isFinite(usual)) return 1;
  // Näher am Limit als sonst = weniger Reserve = positiver Ausschlag.
  const steps = usual - now;
  return 1 + Math.max(-RIR_LOAD_CAP, Math.min(RIR_LOAD_CAP, steps * RIR_LOAD_PER_STEP));
}

// Sammelt je Übung den üblichen RIR-Wert. Anders als bei "war der Tag so hart
// wie sonst" zählt hier die GESAMTE Historie, nicht nur die letzten zehn
// Einheiten: Der Wert ist eine Umrechnungseinheit, die auf alle Wochen gleich
// angewendet wird. Käme er nur aus den jüngsten Einheiten und hätte sich der
// Trainingsstil verschoben, läge die halbe Historie auf einer Seite und die
// Kurve bekäme einen Trend, den es nie gab.
export function typicalRirByExercise(logs) {
  const collected = {};
  const chronological = [...(Array.isArray(logs) ? logs : [])]
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  chronological.forEach((l) => {
    const seen = new Set();
    logEntries(l).forEach((e) => {
      if (!e || seen.has(e.exerciseId)) return;
      const rir = Number(e.rir);
      if (!Number.isFinite(rir)) return;
      seen.add(e.exerciseId);
      (collected[e.exerciseId] || (collected[e.exerciseId] = [])).push(rir);
    });
  });
  const out = {};
  Object.entries(collected).forEach(([id, values]) => {
    out[id] = typicalRir(values, Infinity);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Gefühl gegen Leistung (KONZEPT.md, Stufe 3)
//
// Die Frage: Sagt dein Gefühl nach dem Training etwas über deine tatsächliche
// Leistung aus? Zwei Fallen stecken darin, und beide sind der Grund, warum
// hier mehr steht als ein Mittelwert je Gefühlsstufe:
//
// 1. Die Leistung steigt über Monate ohnehin. Gegen einen flachen Durchschnitt
//    verglichen, sähen späte Trainings pauschal gut aus - man würde den
//    Trainingsfortschritt messen, nicht das Gefühl. Verglichen wird deshalb
//    gegen die ERWARTUNG für genau diesen Tag: den Schnitt der letzten
//    Einheiten derselben Übung davor. Ausgewertet wird nur die Abweichung
//    davon, und die enthält den Trend per Konstruktion nicht mehr.
//
// 2. Die Datenmenge ist der Engpass. Aus 15 Trainings werden vielleicht fünf
//    "müde"-Tage; ein Mittelwert aus fünf Zahlen ist Rauschen. Gerechnet wird
//    deshalb pro ÜBUNG statt pro Training - das sind vier bis fünf
//    Beobachtungen je Einheit statt einer. Kein echter Faktor fünf, weil die
//    Übungen eines Tages sich ähneln, aber deutlich schneller belastbar.
//    Genau deshalb zählt für die Vertrauensschwelle unten die Zahl der
//    TRAININGS, nicht die der Beobachtungen: Übungen desselben Tages sind
//    kein unabhängiger Nachweis.
//
// Leistung heißt hier Arbeit JE SATZ, nicht Arbeit insgesamt. Ein kurzer Tag
// mit weniger Sätzen ist sonst nicht von einem schwachen Tag zu unterscheiden.
// ---------------------------------------------------------------------------

// Wie viele Nachbar-Einheiten je Seite die Erwartung bilden. Bewusst
// beidseitig, obwohl KONZEPT.md von den "letzten" Sitzungen spricht: Ein
// Schnitt nur aus der Vergangenheit hinkt einem steigenden Niveau immer um
// ein paar Wochen hinterher, wodurch JEDER Tag ein kleines Plus bekäme - bei
// spürbarem Fortschritt schnell mehrere Prozent. Für den Vergleich der
// Gefühlsstufen untereinander wäre das egal (alle Stufen bekämen dasselbe
// Plus), für die Zahl, die dasteht, nicht. Die Auswertung läuft ohnehin
// rückblickend über abgeschlossene Trainings, deshalb ist "das Niveau um
// diesen Tag herum" verfügbar und ehrlicher als eine Vorhersage.
const FEELING_EXPECT_SIDE = 2;     // bis zu 2 Einheiten davor und 2 danach
const FEELING_EXPECT_MIN = 2;      // darunter ist es keine Erwartung, sondern ein Einzelwert
const FEELING_MIN_SESSIONS_TENDENCY = 3;  // ab hier eine Tendenz in Worten
const FEELING_MIN_SESSIONS_PERCENT = 5;   // ab hier eine Prozentzahl

export function getFeelingPerformance(logs, timeBasedExercises, deloadWeeks = null, opts = {}) {
  // Trainings aus Entlastungswochen bleiben draußen. Sie sind absichtlich
  // leichter und würden gleich doppelt stören: Die Einheit selbst läge weit
  // unter der Erwartung, und als Nachbar-Einheit zöge sie die Erwartung der
  // normalen Trainings ringsherum nach unten - die sähen dadurch besser aus,
  // als sie waren.
  const deloadMarked = deloadRanges(deloadWeeks).length > 0;
  const safeLogs = (Array.isArray(logs) ? logs : [])
    .filter(Boolean)
    .filter((l) => !deloadMarked || !isDeloadDate(new Date(l?.date), deloadWeeks));
  const chronological = [...safeLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Womit die Arbeit eines Satzes gemessen wird, hängt an der Übungsart -
  // einmal je Übung bestimmt statt in jeder Schleifenrunde neu.
  const modeCache = {};
  // opts.exBy nennt die Uebungen, opts.bodyWeights das Koerpergewicht - ohne
  // beides rechnet es wie vorher (siehe loadModeFor).
  // Das Koerpergewicht galt nicht immer gleich - deshalb pro Training, nicht
  // pro Uebung (siehe bodyWeightAt).
  const bodyLoadOf = (exerciseId, ts) => bodyLoadAt(opts?.exBy?.[exerciseId], opts, ts);
  const usesBodyWeight = bodyWeightKnown(opts);
  const modeFor = (exerciseId) => {
    if (modeCache[exerciseId]) return modeCache[exerciseId];
    const isTime = isTimeBasedInLogs(safeLogs, exerciseId, timeBasedExercises);
    const hasWeight = safeLogs.some((l) =>
      performedWorkingSets(logSetsFor(l, exerciseId)).some((s) => toNum(s.weight) > 0)
    );
    modeCache[exerciseId] = loadModeFor(opts?.exBy?.[exerciseId], {
      isTime, hasWeight, usesBodyWeight,
      equipmentOverrides: opts?.equipmentOverrides,
    });
    return modeCache[exerciseId];
  };

  // Erster Durchgang: je Übung die Leistung jeder Einheit, in zeitlicher
  // Reihenfolge. Erst wenn die Reihe vollständig ist, lässt sich das Niveau
  // um einen Tag herum bestimmen.
  const seriesByExercise = {};
  let sessionsWithFeeling = 0;

  chronological.forEach((log) => {
    const feeling = Number.isFinite(Number(log.feeling)) ? Number(log.feeling) : null;
    if (feeling != null) sessionsWithFeeling += 1;

    const logTs = new Date(log?.date).getTime();
    // Eine Übung kann mehrfach im selben Training stehen (Zirkel: A, B, A).
    // Alle Plätze gehören zusammen, sonst zählte derselbe Tag doppelt.
    const exerciseIds = [...new Set(logEntries(log).map((e) => e.exerciseId).filter(Boolean))];

    exerciseIds.forEach((exerciseId) => {
      const sets = performedWorkingSets(logSetsFor(log, exerciseId));
      if (sets.length === 0) return;
      const mode = modeFor(exerciseId);
      const perSet =
        sets.reduce((sum, s) => sum + loadSetWork(s, mode, bodyLoadOf(exerciseId, logTs)), 0) /
        sets.length;
      if (!(perSet > 0)) return;
      const series = seriesByExercise[exerciseId] || (seriesByExercise[exerciseId] = []);
      series.push({ logId: log.id, feeling, perSet });
    });
  });

  // Zweiter Durchgang: jede Einheit mit Gefühlsangabe gegen ihre Nachbarn.
  // Die Erwartung entsteht aus ALLEN Nachbar-Einheiten, auch aus denen ohne
  // Gefühlsangabe - sie beschreibt das übliche Niveau, nicht die Stimmung.
  const byFeeling = {};
  Object.values(seriesByExercise).forEach((series) => {
    series.forEach((point, i) => {
      if (point.feeling == null) return;
      const neighbours = [
        ...series.slice(Math.max(0, i - FEELING_EXPECT_SIDE), i),
        ...series.slice(i + 1, i + 1 + FEELING_EXPECT_SIDE),
      ];
      if (neighbours.length < FEELING_EXPECT_MIN) return;
      const expected = neighbours.reduce((sum, p) => sum + p.perSet, 0) / neighbours.length;
      if (!(expected > 0)) return;
      const row = byFeeling[point.feeling] || (byFeeling[point.feeling] = { deviations: [], sessions: new Set() });
      row.deviations.push(((point.perSet - expected) / expected) * 100);
      row.sessions.add(point.logId);
    });
  });

  const rows = FEELING_OPTIONS.map(([value, label]) => {
    const row = byFeeling[value];
    if (!row || row.deviations.length === 0) return null;
    const sessions = row.sessions.size;
    if (sessions < FEELING_MIN_SESSIONS_TENDENCY) return null;
    const avg = row.deviations.reduce((sum, v) => sum + v, 0) / row.deviations.length;
    return {
      value,
      label,
      sessions,
      observations: row.deviations.length,
      deviation: avg,
      // Unter der Prozent-Schwelle wird bewusst keine Zahl gezeigt: sie wäre
      // genauer, als die Datenlage hergibt.
      showPercent: sessions >= FEELING_MIN_SESSIONS_PERCENT,
    };
  }).filter(Boolean);

  return { rows, sessionsWithFeeling };
}

// ---------------------------------------------------------------------------
// Frühwarnung: schlechteres Gefühl bei steigender Belastung
//
// Beide Signale für sich sagen wenig. Belastung steigt beim Aufbau ständig -
// das ist der Sinn der Sache. Müde ist man auch mal, aus Gründen, die nichts
// mit dem Training zu tun haben. Erst die Kombination über mehrere Wochen ist
// eine Beobachtung wert: mehr Arbeit, und der Körper meldet gleichzeitig
// weniger zurück. Dieselbe Zwei-Signal-Logik, mit der KONZEPT.md auch die
// Unterbelastung begründet.
//
// Gemessen wird gegen den EIGENEN Normalwert, nicht gegen eine feste Grenze.
// Wer grundsätzlich "müde" antippt, hätte sonst eine Dauerwarnung; wer
// grundsätzlich "stark" wählt, bekäme nie eine.
// ---------------------------------------------------------------------------

const FATIGUE_WINDOW_WEEKS = 3;      // beobachteter Zeitraum
const FATIGUE_MIN_SESSIONS = 3;      // so viele Gefühlsangaben braucht es darin
const FATIGUE_BASELINE_WEEKS = 12;   // so weit reicht der persönliche Normalwert zurück
const FATIGUE_MIN_BASELINE = 6;      // und auf so vielen Angaben muss er beruhen
const FATIGUE_FEELING_DROP = 0.5;    // um so viel muss das Gefühl darunter liegen
const FATIGUE_LOAD_RISE = 1.1;       // und die Belastung um so viel darüber
const FATIGUE_LOAD_LOOKBACK = 4;     // Vergleichszeitraum für die Belastung

export function getFatigueWarning(logs, muscleLoadSeries, nowTs = Date.now(), deloadWeeks = null) {
  // Entlastungswochen gehören hier auf beiden Seiten heraus: Ihr Gefühl ist
  // nicht mit einer normalen Woche vergleichbar, und ihre kleine Arbeitsmenge
  // im Vergleichszeitraum würde die Warnung zu leicht auslösen (weil der
  // Schnitt davor sinkt) bzw. im beobachteten Zeitraum eine echte Warnung
  // verschlucken (weil der aktuelle Schnitt sinkt).
  const deloadMarked = deloadRanges(deloadWeeks).length > 0;
  const safeLogs = (Array.isArray(logs) ? logs : [])
    .filter(Boolean)
    .filter((l) => !deloadMarked || !isDeloadDate(new Date(l?.date), deloadWeeks));
  const windowMs = FATIGUE_WINDOW_WEEKS * LOAD_WEEK_MS;
  const baselineMs = windowMs + FATIGUE_BASELINE_WEEKS * LOAD_WEEK_MS;

  const recent = [];
  const baseline = [];
  safeLogs.forEach((l) => {
    const feeling = Number(l.feeling);
    if (!Number.isFinite(feeling)) return;
    const ts = new Date(l.date).getTime();
    if (!Number.isFinite(ts)) return;
    const age = nowTs - ts;
    if (age < 0) return;
    if (age <= windowMs) recent.push(feeling);
    else if (age <= baselineMs) baseline.push(feeling);
  });

  if (recent.length < FATIGUE_MIN_SESSIONS || baseline.length < FATIGUE_MIN_BASELINE) return null;
  const mean = (list) => list.reduce((sum, v) => sum + v, 0) / list.length;
  const recentFeeling = mean(recent);
  const usualFeeling = mean(baseline);
  if (recentFeeling > usualFeeling - FATIGUE_FEELING_DROP) return null;

  // Gesamtbelastung: die Wochenreihen aller Muskelgruppen aufsummiert. Jede
  // Übung gehört zu genau einer Gruppe, es wird also nichts doppelt gezählt.
  const groups = Array.isArray(muscleLoadSeries) ? muscleLoadSeries : [];
  const weeks = groups[0]?.primaryValues?.length || groups[0]?.values?.length || 0;
  if (weeks < FATIGUE_WINDOW_WEEKS + FATIGUE_LOAD_LOOKBACK) return null;
  const totals = new Array(weeks).fill(0);
  groups.forEach((g) => {
    // primaryValues, nicht values: Mit den Nebengruppen aufsummiert käme
    // dieselbe Arbeit mehrfach vor (siehe getMuscleLoadSeries).
    const reihe = Array.isArray(g.primaryValues) ? g.primaryValues : g.values;
    (Array.isArray(reihe) ? reihe : []).forEach((v, i) => { totals[i] += v || 0; });
  });

  const flags = deloadMarked ? deloadWeekFlags(deloadWeeks, weeks, nowTs) : null;
  const withoutDeload = (from, to) =>
    totals.slice(from, to).filter((_, i) => !flags || !flags[from + i]);
  const recentWeeks = withoutDeload(weeks - FATIGUE_WINDOW_WEEKS, weeks);
  const beforeWeeks = withoutDeload(
    weeks - FATIGUE_WINDOW_WEEKS - FATIGUE_LOAD_LOOKBACK,
    weeks - FATIGUE_WINDOW_WEEKS
  );
  // Ohne saubere Woche auf einer der beiden Seiten gibt es nichts zu
  // vergleichen - dann lieber gar nichts sagen.
  if (recentWeeks.length === 0 || beforeWeeks.length === 0) return null;
  const recentLoad = mean(recentWeeks);
  const beforeLoad = mean(beforeWeeks);
  if (!(beforeLoad > 0) || !(recentLoad >= beforeLoad * FATIGUE_LOAD_RISE)) return null;

  return {
    sessions: recent.length,
    recentFeeling,
    usualFeeling,
    recentLabel: feelingLabel(Math.round(recentFeeling)),
    usualLabel: feelingLabel(Math.round(usualFeeling)),
    loadRise: Math.round((recentLoad / beforeLoad - 1) * 100),
  };
}

// "War der Tag so hart wie sonst?" - der heutige RIR-Wert gegen den üblichen
// derselben Übung. Bewusst nur beschreibend: ob "näher am Limit" gut oder
// schlecht ist, hängt davon ab, ob heute mehr Gewicht auf der Stange lag,
// wie die Woche lief und wie man sich fühlt. Das weiß die App nicht, und ein
// Urteil zu fällen, dessen Grundlage man nicht kennt, verstößt gegen Regel 3.
// Halbe Werte sind möglich (Median aus einer geraden Anzahl), deshalb wird
// die Anzeige gerundet - "sonst 1,5 RIR" wäre eine Scheingenauigkeit, die es
// auf einer Fünf-Stufen-Skala nicht gibt.
export function rirComparison(currentRir, typical) {
  // Wie in recordReserveNote: Number(null) ist 0. Ohne diese Zeile bliebe der
  // Vergleich stehen, nachdem man die Angabe wieder abgewählt hat - und zwar
  // so, als hätte man 0 gewählt.
  if (currentRir == null) return null;
  const now = Number(currentRir);
  if (!Number.isFinite(now) || typical == null) return null;
  const usual = Number(typical);
  if (!Number.isFinite(usual)) return null;
  const shown = `sonst meist ${rirLabel(Math.round(usual))} RIR`;
  // Eine halbe Stufe ist auf dieser Skala kein Unterschied, sondern
  // Rauschen - erst ab einer ganzen Stufe wird etwas behauptet.
  if (Math.abs(now - usual) < 1) return `Wie üblich für diese Übung (${shown}).`;
  return now < usual
    ? `Näher am Limit als üblich (${shown}).`
    : `Mehr Reserve als üblich (${shown}).`;
}

// Ordnet einen Rekord gegen den alten ein - nicht über die Zahl, sondern
// über den Preis: Mehr Reserve heißt, derselbe Rekord kostete weniger als
// beim letzten Mal. Bewusst nur eine Feststellung, kein Lob und kein Rat
// (siehe KONZEPT.md, Regel 3) - und nur dort, wo beide Seiten eine Angabe
// haben. Ohne alten RIR-Wert wäre jede Einordnung geraten.
export function recordReserveNote(currentRir, previousRir) {
  // null zuerst abfangen: Number(null) ist 0 und damit "endlich" - eine
  // fehlende Angabe würde sonst als "am Limit" durchgehen und einen
  // Vergleich behaupten, für den es gar keine Grundlage gibt.
  if (currentRir == null || previousRir == null) return null;
  const now = Number(currentRir);
  const before = Number(previousRir);
  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  if (now > before) {
    return before === 0
      ? "Mehr Reserve als beim alten Rekord – der ging bis ans Limit."
      : `Mehr Reserve als beim alten Rekord (${rirLabel(before)} RIR).`;
  }
  if (now < before) return `Näher am Limit als beim alten Rekord (${rirLabel(before)} RIR).`;
  return "Gleiche Reserve wie beim alten Rekord.";
}

export function typicalRir(values, window = TYPICAL_RIR_WINDOW) {
  const list = (Array.isArray(values) ? values : [])
    .filter((v) => Number.isFinite(Number(v)))
    .slice(0, Number.isFinite(window) ? window : undefined)
    .map(Number)
    .sort((a, b) => a - b);
  if (list.length < TYPICAL_RIR_MIN_SESSIONS) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 === 1 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

// Live-Vergleich zum letzten Mal, während der Eingabe - nicht erst wenn ein
// Satz abgehakt wird. "Volumen" heißt hier je nach Übungsart Gewicht×Wdh.,
// Sekunden oder reine Wiederholungen - dieselben drei Maße, die der Rest der
// App für diese Übungsarten schon verwendet.
// Anders als bei der Muskelgruppen-Belastung gibt es hier kein Geräte-
// Problem: Es wird immer dieselbe Übung mit sich selbst verglichen, nie
// Langhantel gegen Kurzhantel - deshalb ist rohes Volumen hier unproblematisch.
// Vorbelegte Felder entsprechen zu Beginn exakt dem letzten Mal, macht also
// bewusst 0 % - erst eine tatsächliche Änderung an Gewicht oder Wdh. bewegt
// die Zahl. null bedeutet "keine Vorgeschichte", nicht 0 %.
// Volumen dieser Übung gegen das letzte Mal - live, während man einträgt.
//
// Gezählt werden hier BEWUSST alle eingetragenen Sätze, auch die noch nicht
// abgehakten. Das Abzeichen beantwortet nicht "was habe ich schon geschafft",
// sondern "worauf läuft es hinaus, wenn ich es so mache, wie es dasteht" -
// und es zieht sofort mit, sobald man Gewicht oder Wiederholungen ändert.
// Deshalb ist es die einzige Stelle in der App, an der auch geplante Sätze
// zählen; überall sonst gilt "nur was abgehakt ist" (KONZEPT.md).
//
// Ein Anlauf, das auf abgehakte Sätze umzustellen, ist wieder zurückgebaut
// worden: Er nahm dem Abzeichen genau den Zweck, für den es da ist.
function exerciseVolumeChange(currentSets, lastSets, isTimeBased, usesWeight) {
  if (!Array.isArray(lastSets) || lastSets.length === 0) return null;
  const metric = (set) =>
    isTimeBased
      ? toNum(set.duration)
      : usesWeight
      ? toNum(set.weight) * toNum(set.reps)
      : toNum(set.reps);
  const sum = (sets) =>
    (Array.isArray(sets) ? sets : [])
      .filter((s) => s && !s.warmup)
      .reduce((total, s) => total + metric(s), 0);
  const lastTotal = sum(lastSets);
  if (lastTotal <= 0) return null;
  return ((sum(currentSets) - lastTotal) / lastTotal) * 100;
}

// Liefert die komplette Verlaufsliste einer Übung über alle Trainings hinweg
// (jüngstes zuerst), inkl. der Notiz, die pro Trainingseinheit dazu hinterlegt wurde.
function getExerciseTimeline(logs, exerciseId) {
  if (!exerciseId) return [];
  return (Array.isArray(logs) ? logs : [])
    .map((l) => {
      // Same defensive treatment as getExerciseHistory: a log saved by an
      // older version may be missing entries/sets.
      const matching = logEntriesFor(l, exerciseId);
      if (matching.length === 0) return null;
      const sets = matching.flatMap((e) => (Array.isArray(e.sets) ? e.sets : []));
      const rirEntry = matching.find((e) => Number.isFinite(Number(e.rir)));
      const noted = matching.find((e) => typeof e.notes === "string" && e.notes.trim());
      return {
        date: l.date,
        sets: sets.filter((s) => s && s.done),
        rir: rirEntry ? Number(rirEntry.rir) : null,
        feeling: Number.isFinite(Number(l.feeling)) ? Number(l.feeling) : null,
        note: noted ? noted.notes.trim() : null,
      };
    })
    .filter((t) => t && (t.sets.length > 0 || t.note))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Ist dieser Satz (im Vergleich zum bisherigen Bestwert) ein neuer Rekord?
// Records the trophy is awarded for, per set. Deliberately a fixed list:
// anything not in here does not count, so the trophy keeps its meaning.
// Without an earlier session there is nothing to beat, so nothing counts.
// setRir = die Reserve, die fuer GENAU DIESEN Satz gilt - also die Angabe der
// Uebung nur dann, wenn dieser Satz ihr letzter war (siehe getExerciseHistory).
// key = die Kennzahl, zu der dieser Rekord gehoert. Damit weiss die
// Uebungs-Statistik, an welche Kurve der Pokal gehoert: Ein
// Wiederholungs-Rekord hat auf der Gewichts-Kurve nichts zu suchen.
export function describeSetPRs(set, best, isTimeBased = false, hasWeight = true, setRir = null) {
  if (!set || !set.done || set.warmup) return [];
  if (!best || (best.comparableSessions || 0) === 0) return [];
  const found = [];

  if (isTimeBased) {
    const dur = toNum(set.duration);
    if (dur > 0 && dur > toNum(best.bestDuration)) {
      found.push({
        key: "maxDuration",
        title: "Längster Satz",
        value: `${dur} Sek.`,
        previous: toNum(best.bestDuration) > 0 ? `${toNum(best.bestDuration)} Sek.` : null,
        previousRir: best.bestDurationRir,
        currentRir: setRir,
      });
    }
    return found;
  }

  const weight = toNum(set.weight);
  const reps = toNum(set.reps);

  // Ein Wiederholungs-Rekord zaehlt nur bei mindestens demselben Gewicht wie
  // der bisherige. Sonst waere jeder leichte Ausbelastungssatz ein "Rekord".
  if (reps > 0 && reps > toNum(best.bestSetReps) && weight >= toNum(best.bestSetRepsWeight)) {
    found.push({
      key: "maxReps",
      title: "Meiste Wiederholungen in einem Satz",
      value: `${reps} Wdh.`,
      previous: toNum(best.bestSetReps) > 0 ? `${toNum(best.bestSetReps)} Wdh.` : null,
      previousRir: best.bestSetRepsRir,
      currentRir: setRir,
    });
  }

  // Volume and 1RM are meaningless without weight (bodyweight, bands):
  // they would always be zero and could never be beaten.
  if (!hasWeight || weight <= 0) return found;

  if (weight > toNum(best.bestWeight)) {
    found.push({
      key: "maxWeight",
      title: "Höchstes Gewicht",
      value: `${fmtDecimal(weight)} kg`,
      previous: toNum(best.bestWeight) > 0 ? `${fmtDecimal(best.bestWeight)} kg` : null,
      previousRir: best.bestWeightRir,
      currentRir: setRir,
    });
  }
  const oneRM = set1RM(set, setRir);
  if (oneRM > 0 && oneRM > toNum(best.best1RM)) {
    found.push({
      key: "best1RM",
      title: "Höchste geschätzte 1RM",
      value: `${Math.round(oneRM)} kg`,
      previous: toNum(best.best1RM) > 0 ? `${Math.round(toNum(best.best1RM))} kg` : null,
      previousRir: best.best1RMRir,
      currentRir: setRir,
    });
  }
  const vol = weight * reps;
  if (vol > 0 && vol > toNum(best.bestSetVolume)) {
    found.push({
      key: "maxSetVolume",
      title: "Höchstes Satzvolumen",
      value: `${Math.round(vol)} kg`,
      previous: toNum(best.bestSetVolume) > 0 ? `${Math.round(toNum(best.bestSetVolume))} kg` : null,
      previousRir: best.bestSetVolumeRir,
      currentRir: setRir,
    });
  }
  return found;
}

// Records that only make sense once every set of the exercise is counted.
// These belong next to the exercise name, not to a single set.
// Hier gilt die Angabe der ganzen Uebung: diese Rekorde fassen alle Saetze
// zusammen, es gibt also keinen einzelnen Satz, dem sie gehoeren muesste.
export function describeExercisePRs(sets, best, isTimeBased = false, hasWeight = true, sessionRir = null) {
  if (!best || (best.comparableSessions || 0) === 0) return [];
  const done = (Array.isArray(sets) ? sets : []).filter((x) => x && x.done && !x.warmup);
  if (done.length === 0) return [];
  const found = [];

  if (isTimeBased) {
    const total = done.reduce((a, x) => a + toNum(x.duration), 0);
    if (total > 0 && total > toNum(best.bestTotalDuration)) {
      found.push({
        key: "totalDuration",
        title: "Längste Gesamtzeit der Übung",
        value: `${total} Sek.`,
        previous: toNum(best.bestTotalDuration) > 0 ? `${toNum(best.bestTotalDuration)} Sek.` : null,
        previousRir: best.bestTotalDurationRir,
        currentRir: sessionRir,
      });
    }
    return found;
  }

  const totalReps = done.reduce((a, x) => a + toNum(x.reps), 0);
  if (totalReps > 0 && totalReps > toNum(best.bestTotalReps)) {
    found.push({
      key: "totalReps",
      title: "Meiste Wiederholungen der Übung",
      value: `${totalReps} Wdh.`,
      previous: toNum(best.bestTotalReps) > 0 ? `${toNum(best.bestTotalReps)} Wdh.` : null,
      previousRir: best.bestTotalRepsRir,
      currentRir: sessionRir,
    });
  }
  if (hasWeight) {
    const totalVol = done.reduce((a, x) => a + toNum(x.weight) * toNum(x.reps), 0);
    if (totalVol > 0 && totalVol > toNum(best.bestTotalVolume)) {
      found.push({
        key: "totalVolume",
        title: "Höchstes Gesamtvolumen der Übung",
        value: `${Math.round(totalVol)} kg`,
        previous: toNum(best.bestTotalVolume) > 0
          ? `${Math.round(toNum(best.bestTotalVolume))} kg` : null,
        previousRir: best.bestTotalVolumeRir,
        currentRir: sessionRir,
      });
    }
  }
  return found;
}

function isNewPR(set, best, isTimeBased = false) {
  return describeSetPRs(set, best, isTimeBased).length > 0;
}



// Ab wie vielen Wiederholungen keine 1RM-Schaetzung mehr abgegeben wird.
//
// Die Formeln sind bis rund 12 Wiederholungen belastbar; darueber laufen sie
// weit auseinander und ueberschaetzen deutlich. 100 kg x 20 Wdh. ergaben hier
// 189 kg, realistisch waeren rund 135. Ein einziger Ausbelastungssatz mit
// hoher Wiederholungszahl besetzte damit die Kachel "Bestes gesch. 1RM"
// dauerhaft mit einer Zahl, die es nie gab. Lieber keine Schaetzung als eine
// erfundene: 0 heisst "dazu sagt die App nichts".
const ONE_RM_MAX_REPS = 12;

// 1RM eines einzelnen Satzes. Bei einem Band gibt es keine: Der Widerstand
// steigt mit der Dehnung, ein "einmaliges Maximum" ist dabei keine sinnvolle
// Groesse - anders als bei einer Hantel, die auf dem ganzen Weg gleich schwer
// bleibt. Ein Bandsatz liefert deshalb 0, also "dazu sagt die App nichts".
export function set1RM(set, rir = null) {
  if (!set || set.bandId) return 0;
  return estimate1RM(set.weight, toNum(set.reps) + reserveReps(rir));
}

// Wie viele Wiederholungen noch drin gewesen waeren. Epley und Brzycki
// beschreiben einen Satz BIS ZUM MUSKELVERSAGEN - acht Wiederholungen mit drei
// in Reserve sind aber kein Achter-Maximum, sondern ungefaehr ein Elfer. Ohne
// diese Umrechnung wird das Maximum systematisch zu niedrig geschaetzt, und
// zwar umso mehr, je vorsichtiger trainiert wurde: Wer denselben Satz einmal
// naeher am Limit macht, saehe einen "Kraftzuwachs", der keiner ist.
//
// Ohne Angabe wird nichts dazugerechnet (Reserve 0) - das ist der Satz, wie
// er dasteht, und damit genau die alte Rechnung. Fehlende Daten verschieben
// nichts.
//
// Gilt nur fuer den LETZTEN abgehakten Arbeitssatz einer Uebung: Nur fuer den
// wird die Reserve abgefragt. Dieselbe Regel wie bei der Belastungsrechnung
// (siehe rirLoadFactor) und bei den Rekorden.
function reserveReps(rir) {
  const n = Number(rir);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(RIR_MAX, Math.round(n));
}

// Geht die abgehakten Arbeitssaetze eines Uebungs-Eintrags durch und reicht
// die Reserve-Angabe genau dem letzten davon weiter. Diese Regel steht sonst
// an vier Stellen gleichzeitig - und wenn sie an einer davon fehlt, rechnet
// eine Kachel anders als die Kurve daneben.
function forEachPerformedSet(entry, fn) {
  const performed = performedWorkingSets(entrySets(entry));
  const last = performed[performed.length - 1] || null;
  performed.forEach((set) => fn(set, set === last ? entry?.rir : null));
}

export function estimate1RM(weight, reps) {
  // toNum statt Number: Ein Gewicht steht so da, wie es getippt wurde -
  // bei "62,5" ergibt Number() NaN und daraus wird still eine 0.
  const w = toNum(weight);
  const r = toNum(reps);
  if (w <= 0 || r <= 0) return 0;
  if (r > ONE_RM_MAX_REPS) return 0;
  if (r === 1) return w;
  // Zwei etablierte Formeln gemittelt - robuster als jede einzelne. Epley
  // haelt ueber den ganzen Bereich, Brzycki ist bei niedrigen
  // Wiederholungszahlen genauer. Oberhalb von ONE_RM_MAX_REPS wird gar nicht
  // mehr geschaetzt, deshalb kann Brzycki hier nicht mehr entgleisen.
  const epley = w * (1 + r / 30);
  const brzycki = w * (36 / (37 - r));
  return (epley + brzycki) / 2;
}

// Best estimated 1RM and best single-set volume (weight x reps in one set,
// not summed across a session) ever recorded for a given exercise. Used to
// show quick "personal best" context whenever someone taps an exercise.
// Die beiden Bestwerte einer Übung - und woher sie stammen.
//
// Die Herkunft wurde früher weggeworfen: In den Kacheln stand "213 kg", und
// aus welchem Satz an welchem Tag das kam, war nirgends abrufbar. Auf der
// Fortschritt-Seite gibt es das längst; hier fehlte es.
export function getExerciseBestStats(logs, exerciseId) {
  let best1RM = 0;
  let best1RMSource = null;
  let bestSetVolume = 0;
  let bestSetVolumeSource = null;
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    // Ueber die Eintraege statt ueber die blanken Saetze, weil die Reserve am
    // Eintrag haengt und ins geschaetzte 1RM eingeht (siehe set1RM).
    logEntriesFor(log, exerciseId).forEach((entry) => {
      forEachPerformedSet(entry, (set, rir) => {
        const weight = toNum(set.weight);
        const reps = toNum(set.reps);
        if (weight <= 0 || reps <= 0) return;
        const herkunft = { date: log.date, weight, reps, bandName: set.bandName || null };
        const oneRM = set1RM(set, rir);
        if (oneRM > best1RM) { best1RM = oneRM; best1RMSource = herkunft; }
        const vol = weight * reps;
        if (vol > bestSetVolume) { bestSetVolume = vol; bestSetVolumeSource = herkunft; }
      });
    });
  });
  return { best1RM, best1RMSource, bestSetVolume, bestSetVolumeSource };
}

// Das beste geschaetzte 1RM ueber alle Trainings - und der Satz, aus dem es
// stammt. Ohne die Herkunft ist "213 kg" eine Zahl, zu der man nicht einmal
// die Uebung nennen kann, und genau die Frage stellt man sich als Erstes.
//
// Frueher hiess die Funktion calculateTrainingStats und rechnete nebenbei
// Gesamtvolumen, Satz- und Wiederholungssummen, Trainingszeit, Volumen je
// Muskelgruppe und einen Lebenszeit-Rekordzaehler aus. Angezeigt wurde davon
// nichts (der Rekordzaehler ist bewusst entfallen, siehe "Rekorde (7 Tage)")
// - es war ein vollstaendiger Durchlauf durch alle Saetze aller Trainings bei
// jedem Aufbau der Statistik-Seite, fuer Werte, die niemand zu sehen bekam.
function getBest1RMOverall(logs, exBy, timeBasedExercises) {
  let best1RM = 0;
  let best1RMSource = null;
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    logEntries(log).forEach((entry) => {
      const ex = exBy[entry.exerciseId];
      if (!ex) return;
      if (isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises)) return;
      forEachPerformedSet(entry, (set, rir) => {
        const weight = toNum(set.weight);
        const reps = toNum(set.reps);
        const oneRM = set1RM(set, rir);
        if (oneRM > best1RM) {
          best1RM = oneRM;
          best1RMSource = {
            exerciseId: entry.exerciseId,
            exerciseName: ex.name,
            date: log.date,
            logId: log.id,
            weight,
            reps,
          };
        }
      });
    });
  });
  return { best1RM, best1RMSource };
}

function getTimePR(logs, exerciseId) {
  let best = 0;
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    // Alle Plaetze der Uebung, nicht nur den ersten - sonst faellt der
    // Rekord aus dem zweiten Zirkel-Durchgang unter den Tisch.
    logSetsFor(log, exerciseId).forEach((s) => {
      if (s && s.done && !s.warmup) best = Math.max(best, toNum(s.duration));
    });
  });
  return best;
}

// ---------------------------------------------------------------------------
// Belastung pro Muskelgruppe
//
// Die Frage dahinter: "Habe ich diese Muskelgruppe mehr oder weniger belastet
// als in den Wochen davor?" - und zwar so, dass die Antwort stimmt.
//
// Warum nicht Kilogramm: Kilogramm-Volumen ist zwischen Übungen NICHT
// vergleichbar. Wer von der Langhantel auf Kurzhanteln wechselt, bewegt bei
// gleicher Anstrengung viel weniger Kilogramm - die Kurve würde einen
// Rückschritt zeigen, den es nie gab.
//
// Warum nicht nur Sätze: Sätze lösen das Geräte-Problem, stagnieren aber
// zwangsläufig. Wer bei gleicher Satzzahl schwerer wird, sieht davon nichts.
//
// Deshalb wird JEDER Satz an der eigenen Bestleistung in GENAU DIESER Übung
// gemessen: "Wie viel von meinem besten Satz war das?" Ein Satz auf
// Bestniveau zählt 1,0. Ein Kurzhantel-Satz mit 22 kg ist damit genauso viel
// wert wie ein Langhantel-Satz mit 60 kg, wenn beide gleich nah am jeweiligen
// persönlichen Bestwert liegen - und mehr Gewicht bei gleicher Satzzahl hebt
// den Wert trotzdem an.
//
// Der Bestwert ist dabei nur eine Umrechnungseinheit: Er wird auf ALLE Wochen
// gleich angewendet und kürzt sich beim Prozentvergleich einer einzelnen
// Übung vollständig heraus. Ein neuer Rekord verfälscht die Historie also
// nicht, er skaliert sie einheitlich um - genau deshalb bleibt der Vergleich
// über Wochen hinweg ehrlich.
// ---------------------------------------------------------------------------

const LOAD_WEEK_MS = 7 * 86400000;

// Zeiträume für "Sätze pro Muskelgruppe" und "Belastung pro Muskelgruppe"
// (Karten + ihre Modal-Charts) - an einer Stelle definiert, damit beide
// Karten und beide Modals immer dieselben Chips zeigen. Angelehnt an
// gängige Periodisierungs-Zeiträume (Mesozyklus/Quartal/Halbjahr/Jahr) statt
// beliebiger Wochenzahlen. muscleLoadChange kommt mit Infinity ("Gesamt")
// klar, weil es dort um einen Schnitt über die verfügbare Historie geht,
// nicht um einen Punkt-zu-Punkt-Vergleich zu einem festen Zeitpunkt.
const MUSCLE_COMPARE_OPTIONS = [
  [1, "Vorwoche"],
  [4, "4 Wochen"],
  [12, "12 Wochen"],
  [26, "26 Wochen"],
  [52, "52 Wochen"],
  [Infinity, "Gesamt"],
];

// Erklärtexte hinter den Überschriften der Statistik-Karten (antippen).
// Umsetzung von Regel 4 aus KONZEPT.md aus der Leserichtung: eine Kennzahl,
// deren Rechenweg man nicht nachvollziehen kann, ist so wenig wert wie ein
// Eingabefeld ohne Rückmeldung. Beantwortet werden bewusst zwei Fragen -
// "was sehe ich hier?" und "wie wird das gerechnet?" - und zwar in derselben
// Sprache wie die Herleitungen im Code darüber, nur ohne Fachbegriffe.
const STAT_EXPLANATIONS = {
  weeklySets: {
    title: "Sätze pro Muskelgruppe",
    paragraphs: [
      "Zeigt, wie viele Arbeitssätze jede Muskelgruppe in den letzten 7 Tagen abbekommen hat - und ob das mehr oder weniger ist als sonst.",
      "Eine Übung zählt nicht nur auf eine Gruppe: Bankdrücken trainiert die Brust, aber Schultern und Trizeps arbeiten deutlich mit. Deshalb zählt jeder Satz voll auf die Hauptgruppe und mit einem halben Satz auf jede beteiligte Nebengruppe. Bankdrücken heißt also 1 Satz Brust, ein halber Satz Schultern, ein halber Satz Arme - daher auch die krummen Zahlen wie 12,5.",
      "Der halbe Satz ist eine grobe, in der Trainingsplanung übliche Verrechnung, keine Messung. Wie stark ein Muskel wirklich mitarbeitet, hängt von Ausführung, Griffweite und Körperbau ab - das weiß die App nicht. Sie stellt damit die Größenordnung richtig, nicht mehr.",
      "Die Untergruppen darunter bekommen nur die Hauptgruppe ab. Welcher Teil der Schulter beim Bankdrücken mitarbeitet, kann diese Zuordnung nicht beantworten, und eine erfundene Antwort wäre schlechter als keine.",
      "Gezählt wird nur, was du auch abgehakt hast. Ein vorbelegter, aber nie ausgeführter Satz zählt nicht mit, sonst würde die Statistik Trainings behaupten, die nie stattgefunden haben. Aufwärmsätze zählen ebenfalls nicht.",
      "Dropsätze zählen hier bewusst nicht als eigener Satz: Die Zahl bildet Trainingsreize mit Erholung dazwischen ab, und zwischen einem Satz und seinen Drops gibt es keine Erholung. In der Belastungs-Karte darunter zählen sie dagegen voll mit - die Arbeit wurde ja geleistet.",
      "Die Prozentzahl vergleicht die aktuelle Woche gegen den Durchschnitt der Wochen davor - wie viele, bestimmst du mit den Feldern oben. Die Linie daneben zeigt genau diesen Zeitraum.",
    ],
    formula: [
      "Sätze = Anzahl abgehakter Sätze ohne Aufwärm- und Dropsätze, gezählt über die letzten 7 Tage. Hauptgruppe × 1, jede Nebengruppe × 0,5.",
      "Änderung = (diese Woche − Schnitt der gewählten Wochen davor) ÷ Schnitt × 100.",
    ],
  },
  muscleLoad: {
    title: "Belastung pro Muskelgruppe",
    paragraphs: [
      "Beantwortet eine andere Frage als die Karte darüber: nicht \"wie viele Sätze?\", sondern \"wie viel Arbeit?\". Zwei getrennte Kennzahlen, mit Absicht.",
      "Kilogramm allein taugen dafür nicht: Wer von der Langhantel auf Kurzhanteln wechselt, bewegt bei gleicher Anstrengung viel weniger Kilogramm - die Kurve würde einen Rückschritt zeigen, den es nie gab. Reine Satzzahlen taugen auch nicht: Wer bei gleicher Satzzahl schwerer wird, sähe davon nichts.",
      "Deshalb wird jeder Satz an deinem eigenen besten Satz in genau dieser Übung gemessen: \"Wie viel von meinem Bestwert war das?\" Ein Satz auf Bestniveau zählt 1,0. Ein Kurzhantel-Satz mit 22 kg ist damit genauso viel wert wie ein Langhantel-Satz mit 60 kg, wenn beide gleich nah am jeweiligen persönlichen Bestwert liegen.",
      "Wie bei den Sätzen darüber zählt die Arbeit voll auf die Hauptgruppe und halb auf jede Nebengruppe: Bankdrücken belastet auch Schultern und Trizeps.",
      "Ein neuer Rekord verfälscht die Vergangenheit dabei nicht - er wird auf alle Wochen gleich angewendet und kürzt sich beim Prozentvergleich wieder heraus.",
      "Bei Klimmzügen, Dips oder Liegestützen ist dein Körper das Gewicht, und in der App steht dort nur das Zusatzgewicht. Ohne dein Körpergewicht (Zahnrad-Menü) zählt die App deshalb die Wiederholungen und lässt den Gurt weg; mit der Angabe rechnet sie mit Körpergewicht + Zusatz. Bewusst nicht geschätzt: Ein erfundenes Körpergewicht wäre schlechter als keins.",
      "Zusätzlich zählt, wie hart du den letzten Satz einer Übung beendet hast: Derselbe Satz ist nicht dieselbe Belastung, wenn er einmal am Limit und einmal mit vier Wiederholungen in Reserve endete. Gewichtet wird nur dieser eine Satz, denn nur für ihn gibt es die Angabe - die früheren Sätze bleiben unangetastet. Verglichen wird mit deiner eigenen üblichen Reserve für genau diese Übung; ohne Angabe ändert sich nichts.",
      "Die Warnzeichen rechts kommen aus derselben Reihe: ein Hinweis, wenn die aktuelle Woche mehr als 15 % über dem Schnitt der 4 Wochen davor liegt, ein deutlicher Alarm ab 30 %, und ein Plateau-Zeichen, wenn die letzten zwei Wochen im Schnitt nicht über den zwei Wochen davor liegen. Das sind Fragen, keine Urteile - wie es sich anfühlt, weißt nur du.",
    ],
    formula: [
      "Wert eines Satzes = (kg × Wdh.) ÷ bester Satz dieser Übung. Bei Übungen ohne Gewicht zählen die Wiederholungen, bei Zeit-Übungen die Sekunden. Bei Körpergewichts-Übungen mit eingetragenem Körpergewicht: (Körpergewicht + Zusatz) × Wdh.",
      "Reserve-Gewichtung = nur auf den letzten abgehakten Arbeitssatz: je Stufe RIR unter deinem Üblichen 3 % mehr, je Stufe darüber 3 % weniger, höchstens 12 % in beide Richtungen. Ohne RIR-Angabe: keine Änderung.",
      "Wochenwert = Summe aller Satzwerte der Muskelgruppe in einem 7-Tage-Fenster. Dropsätze zählen hier voll mit.",
      "Plateau = Schnitt der letzten 2 Wochen ≤ Schnitt der 2 Wochen davor plus 2 %. Wochen ohne Training und markierte Entlastungen zählen als Lücke; von den vier Wochen darf höchstens eine fehlen, sonst wird nichts gemeldet.",
      "Änderung = (diese Woche − Schnitt der gewählten Wochen davor) ÷ Schnitt × 100.",
    ],
  },
  strengthVolume: {
    title: "Kraft und Volumen",
    paragraphs: [
      "Die Frage dahinter: Werde ich stärker, oder mache ich nur mehr? Beide Zahlen standen schon vorher in der App – Volumen auf der Startseite, geschätztes 1RM in den Übungs-Charts –, nur nie nebeneinander. Erst nebeneinander wird daraus eine Aussage: Wer 18 % mehr Arbeit leistet und dabei gleich stark bleibt, sieht in jeder der beiden Zahlen für sich nichts Auffälliges.",
      "Kraft ist das beste geschätzte 1RM der Woche – der stärkste Satz, umgerechnet auf ein Einer-Maximum, mit deiner Reserve verrechnet. Bewusst nicht das reine Maximalgewicht: Das springt nur, wenn du eine Scheibe wechselst, und ist blind dafür, ob es fünf oder zehn Wiederholungen waren.",
      "Volumen sind die bewegten Kilogramm der Woche (kg × Wdh. aller Arbeitssätze) – dieselbe Rechnung wie „Volumen diese Woche\" auf der Startseite.",
      "Beides braucht Gewicht auf der Stange. Klimmzüge, Liegestütze und Bandübungen tauchen hier nicht auf: Für sie gibt es keine Kraftzahl, die sich vergleichen ließe, und eine erfundene wäre schlechter als keine.",
      "Für eine Muskelgruppe wird die Kraft jeder Übung erst an ihrem eigenen Bestwert gemessen und dann gemittelt. Ohne das würde die Beinpresse mit 200 kg allein bestimmen, wie sich „die Kraft der Beine\" entwickelt, und der Beinstrecker käme gar nicht vor. Gezählt wird nur die Hauptgruppe einer Übung – anders als bei den Karten darüber, wo Nebengruppen halb mitzählen: Für eine Kraftaussage wären mitarbeitende Muskeln Rauschen.",
      "Der Satz unter einer Zeile beschreibt, was die beiden Zahlen zusammen zeigen. Er sagt nicht, was zu tun ist – das hängt von Ziel, Zeit und Erholung ab, und davon weiß die App nichts.",
    ],
    formula: [
      "Kraft einer Woche = bestes geschätztes 1RM dieser Woche. Volumen einer Woche = Summe aus kg × Wdh. aller abgehakten Arbeitssätze.",
      "Veränderung = zweite Hälfte des gewählten Zeitraums gegen die erste, jeweils als Durchschnitt über die Wochen mit Daten. Wochen ohne Training zählen in keiner Hälfte mit; bei ungerader Wochenzahl fällt die mittlere heraus.",
      "Bewusst nicht „aktuelle Woche gegen den Schnitt davor\" wie bei der Belastung: Dort geht es um diese eine Woche, hier um die Richtung über Wochen. Eine Übung, die du diese Woche zufällig nicht gemacht hast, hätte sonst gar keinen Wert.",
      "Ein Strich statt einer Zahl heißt: In einer der beiden Hälften fehlen die Daten.",
    ],
  },
  deload: {
    title: "Entlastungen",
    paragraphs: [
      "Eine Entlastung ist ein absichtlich leichterer Zeitraum. Damit die App ihn nicht für einen Einbruch hält, trägst du ihn im Kalender ein: ersten Tag antippen, „Entlastung ab hier\" wählen, letzten Tag antippen. Der Zeitraum darf beliebig laufen - Mittwoch bis übernächsten Donnerstag genauso wie Montag bis Sonntag.",
      "Was das ändert: Im markierten Zeitraum zeigt die App keine Warnzeichen, und in den Wochen danach lässt sie ihn aus dem Vergleich heraus. Sonst würde dein ganz normaler Wiedereinstieg wie ein Sprung nach oben aussehen - der Schnitt, gegen den verglichen wird, wäre ja nach unten gezogen.",
      "Sichtbar bleibt sie trotzdem: In den Diagrammen und in den Zeitraum-Vergleichen steht die Delle unverändert da. Sie soll nur nicht kommentiert werden.",
      "Der Zähler darunter sagt, wie lange die letzte her ist. Wann du entlastest, entscheidest du - die App schlägt von sich aus nie eine Entlastungswoche vor.",
      "Nach jeder Entlastung vergleicht sie die zwei Wochen davor mit den zwei Wochen danach - „danach\" beginnt am Tag nach dem Ende, bei einer langen Entlastung also später. Damit die eigene Wahrnehmung nicht von der Zahl überschrieben wird, fragt sie vorher nach deiner Schätzung.",
    ],
    formula: [
      "Verglichen wird die Arbeit je Satz, getrennt für jede Übung, und dann über die Übungen gemittelt, die in beiden Zeiträumen vorkommen. Nicht die Gesamtarbeit einer Woche - sonst würde vor allem gemessen, wie viel Zeit gerade da war.",
      "Die Entlastungswoche selbst zählt in diesem Vergleich nicht mit.",
      "Mindestens 2 Trainings je Seite und 2 gemeinsame Übungen, sonst wird kein Ergebnis gezeigt.",
      "Ein Durchschnitt über mehrere Entlastungen erscheint ab der dritten ausgewerteten.",
    ],
  },
  feelingPerformance: {
    title: "Gefühl und Leistung",
    paragraphs: [
      "Beantwortet eine Frage, die man sich sonst nur ungefähr beantworten kann: Sagt dein Gefühl nach dem Training überhaupt etwas über deine tatsächliche Leistung aus?",
      "Bei manchen Menschen tut es das deutlich, bei anderen kaum - wer an „müde\"-Tagen genauso stark ist wie sonst, kann sich das Zögern vor solchen Einheiten sparen. Wessen Leistung dagegen spürbar einbricht, hat einen guten Grund, auf das Gefühl zu hören.",
      "Verglichen wird nicht gegen einen festen Durchschnitt, sondern gegen die Erwartung für genau diesen Tag: das Niveau der letzten Einheiten derselben Übung. Sonst würde die Auswertung nur zeigen, dass du über die Monate stärker geworden bist - und das weißt du schon.",
      "Gerechnet wird pro Übung statt pro Training, weil sonst zu wenige Zahlen zusammenkommen. Für die Frage „ist das belastbar?\" zählt trotzdem die Zahl der Trainings: fünf Übungen an einem müden Tag sind ein müder Tag, nicht fünf Belege.",
    ],
    formula: [
      "Leistung einer Übung an einem Tag = (kg × Wdh.) aller abgehakten Arbeitssätze ÷ Anzahl dieser Sätze. Also die Arbeit je Satz - ein kurzer Tag mit weniger Sätzen zählt dadurch nicht als schwach.",
      "Erwartung = Schnitt derselben Übung über die bis zu 2 Einheiten davor und 2 danach. Beide Seiten, weil ein Schnitt nur aus der Vergangenheit einem steigenden Niveau hinterherhinkt und dadurch jeden Tag zu gut aussehen ließe.",
      "Abweichung = (Leistung − Erwartung) ÷ Erwartung × 100, danach gemittelt über alle Übungen mit derselben Gefühlsangabe.",
      "Ab 3 Trainings je Stufe erscheint eine Tendenz, ab 5 eine Prozentzahl.",
    ],
  },
  calibration: {
    title: "Eichsätze",
    paragraphs: [
      "Ein Eichsatz ist ein letzter Satz bis zum echten Muskelversagen – und davor die Schätzung, wie viele Wiederholungen du schaffen wirst. Danach steht beides nebeneinander: „8 geschätzt, 11 geschafft\".",
      "Das ist die einzige Stelle in der App, an der eine Selbsteinschätzung gegen eine überprüfte Zahl gehalten wird. Bei jedem normalen Satz bleibt die RIR-Angabe eine Vermutung, die niemand nachprüft – hier gehst du wirklich bis zur Grenze und siehst, wo sie lag.",
      "Was du davon hast: Zeigt sich über mehrere Eichsätze, dass du dich um zwei Wiederholungen unterschätzt, dann heißt dein Gefühl von „2 in Reserve\" in Wirklichkeit eher „gleich ist Schluss\". Dieses Wissen nimmst du in jedes Training mit.",
      "Die App rechnet damit bewusst nichts automatisch um: Weder deine bisherigen RIR-Angaben noch die Belastung werden nachträglich korrigiert. Wie nah man bei einem All-out-Satz an die eigene Grenze schätzt, ist verwandt mit dem RIR-Schätzen im Alltag, aber nicht dasselbe – eine automatische Umrechnung wäre geraten.",
      "Gerechnet wird über alle Übungen zusammen. Eichsätze kosten Überwindung und sind selten; je Übung getrennt käme auf Jahre hinaus keine tragfähige Zahl zustande. Wie gut man die eigene Grenze kennt, ist ohnehin eher eine Eigenschaft der Person als der Übung.",
    ],
    formula: [
      "Abweichung eines Eichsatzes = tatsächliche Wiederholungen − vorher geschätzte Wiederholungen. Positiv heißt: mehr geschafft als gedacht, also unterschätzt.",
      `Angezeigt wird der Durchschnitt aller Eichsätze, sobald mindestens ${CALIBRATION_MIN_SETS} vorliegen.`,
    ],
  },
};

// Wie viele Wochen die Rohdaten-Serie mindestens abdecken muss, damit jeder
// MUSCLE_COMPARE_OPTIONS-Zeitraum (inkl. "Gesamt") daraus bedient werden
// kann - die längste feste Option (52) als Minimum, plus die komplette
// echte Historie, falls die länger zurückreicht.
function muscleSeriesWeekCount(historyWeeks) {
  return Math.max(52, historyWeeks + 1);
}

// Schneidet eine Wochenreihe (alt -> neu) auf die letzten `weeks` Wochen
// zurecht - für den Zoom im Modal-Chart. Infinity ("Gesamt") liefert die
// komplette Reihe unverändert.
export function zoomWeekSeries(values, weeks) {
  if (!Array.isArray(values)) return [];
  if (!Number.isFinite(weeks)) return values;
  return values.slice(Math.max(0, values.length - weeks));
}

// Der Prozentwert daneben vergleicht die AKTUELLE Woche gegen den Schnitt der
// `compareWeeks` Wochen DAVOR (siehe muscleLoadChange). Eine Grafik, die zu
// dieser Zahl passt, muss deshalb `compareWeeks + 1` Wochen zeigen: den
// Vergleichszeitraum und die Woche, die dagegen gehalten wird. Mit nur
// `compareWeeks` bliebe bei "Vorwoche" ein einziger Punkt übrig - eine Linie
// aus einem Punkt gibt es nicht, die Sparkline fiele auf ihren leeren
// Platzhalter-Strich zurück.
export function compareWindowSeries(values, compareWeeks) {
  return zoomWeekSeries(values, Number.isFinite(compareWeeks) ? compareWeeks + 1 : compareWeeks);
}

// Womit die "Arbeit" eines Satzes gemessen wird, hängt an der Übungsart.
// Bei Übungen ohne Gewicht wären Kilogramm immer 0, bei Zeit-Übungen gibt es
// gar keine Wiederholungen - jede Art braucht ihr eigenes Maß.
function loadSetWork(set, mode, bodyWeight = 0) {
  if (mode === "time") return toNum(set.duration);
  if (mode === "reps") return toNum(set.reps);
  // Bei einer Koerpergewichts-Uebung ist das eingetragene Gewicht das
  // ZUSATZgewicht; das eigentliche Gewicht ist der Koerper. Ohne diese Zeile
  // wiegt ein Klimmzug ohne Gurt null Kilogramm - und die gesamte Historie
  // einer Uebung faellt in dem Moment auf null, in dem zum ersten Mal ein
  // Gurt dazukommt (siehe modeOf).
  return (bodyWeight + toNum(set.weight)) * toNum(set.reps);
}

// Eine Uebung, bei der der eigene Koerper die Last ist. Genommen wird das
// Geraet, das an der Uebung steht (mit deiner Korrektur, falls du eine
// gesetzt hast) - nicht geraten aus den Zahlen: Eine Maschinenuebung, die
// jemand versehentlich mit 0 kg protokolliert, ist keine
// Koerpergewichts-Uebung.
function isBodyweightExercise(exercise, equipmentOverrides) {
  if (!exercise) return false;
  return getExerciseEquipment(exercise, equipmentOverrides) === "Körpergewicht";
}

// Das Koerpergewicht ist keine feste Zahl - es aendert sich ueber Monate.
// Gespeichert wird deshalb eine Liste "ab wann galt welcher Wert", und jede
// Woche rechnet mit dem Gewicht, das DAMALS galt. Mit einer einzigen Zahl
// wuerde eine Zunahme von 5 kg rueckwirkend die gesamte Klimmzug-Historie
// umschreiben, ohne dass sich an einem einzigen Training etwas geaendert
// haette.
//
// date === null heisst "gilt von Anfang an" - so wird die eine Zahl gelesen,
// die frueher gespeichert wurde, und so bleibt fuer sie alles beim Alten.
// Bewusst KEINE Gewichtskurve mit Auswertung: Die Zahl ist eine
// Umrechnungsgroesse, kein Messwert, den die App beurteilen wuerde (Regel 3).
export function bodyWeightEntries(raw) {
  // Eine blanke Zahl ist der alte Speicherstand.
  if (typeof raw === "number" || typeof raw === "string") {
    const kg = toNum(raw);
    return kg > 0 ? [{ id: "alt", date: null, kg, ts: -Infinity }] : [];
  }
  return (Array.isArray(raw) ? raw : [])
    .map((e) => {
      const kg = toNum(e?.kg);
      if (!(kg > 0)) return null;
      const ts = e?.date ? dateFromKey(e.date)?.getTime() : -Infinity;
      if (e?.date && !Number.isFinite(ts)) return null;
      return { id: e?.id || `${e?.date || "alt"}-${kg}`, date: e?.date || null, kg, ts };
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
}

// Das Gewicht, das zu diesem Zeitpunkt galt. Liegt der Zeitpunkt vor der
// aeltesten Angabe, wird die aelteste genommen: Wer sein Gewicht heute
// eintraegt, hat es letztes Jahr nicht gewogen - aber mit dem heutigen Wert
// zu rechnen ist immer noch naeher dran als mit gar keinem.
export function bodyWeightAt(entries, ts) {
  const liste = Array.isArray(entries) ? entries : [];
  if (liste.length === 0) return 0;
  let treffer = null;
  for (const e of liste) {
    if (e.ts <= ts) treffer = e;
  }
  return (treffer || liste[0]).kg;
}

// Gibt es ueberhaupt eine Angabe? Davon haengt ab, ob eine
// Koerpergewichts-Uebung in Kilogramm oder in Wiederholungen gemessen wird -
// und das muss fuer die ganze Reihe gleich bleiben, sonst mischen sich
// Einheiten.
function bodyWeightKnown(opts) {
  return bodyWeightEntries(opts?.bodyWeights ?? opts?.bodyWeight).length > 0;
}

// Wie viel Koerpergewicht bei dieser Uebung an diesem Tag als Last zaehlt.
function bodyLoadAt(exercise, opts, ts) {
  if (!isBodyweightExercise(exercise, opts?.equipmentOverrides)) return 0;
  return bodyWeightAt(bodyWeightEntries(opts?.bodyWeights ?? opts?.bodyWeight), ts);
}

// Womit eine Uebung gemessen wird. Der Sonderfall steht hier an einer Stelle,
// weil ihn sonst vier Auswertungen einzeln kennen muessten:
//
// Eine Koerpergewichts-Uebung wird ueber die Wiederholungen gemessen - das
// eingetragene Gewicht ist ja nur das ZUSATZgewicht. Fruehe Versionen haben
// stattdessen "hat irgendwann Gewicht" gefragt und sind dann auf Kilogramm
// umgeschwenkt: Ab dem ersten Klimmzug mit Gurt zaehlte jeder Satz ohne Gurt
// null Kilogramm, und die ganze Historie dieser Uebung fiel auf null.
// Mit eingetragenem Koerpergewicht wird stattdessen in Kilogramm gerechnet
// (Koerper + Zusatz), und beides zaehlt richtig.
function loadModeFor(exercise, { isTime, hasWeight, usesBodyWeight, equipmentOverrides }) {
  if (isTime) return "time";
  if (isBodyweightExercise(exercise, equipmentOverrides)) {
    return usesBodyWeight ? "weight" : "reps";
  }
  return hasWeight ? "weight" : "reps";
}

// weekCount = wie viele 7-Tage-Fenster zurück betrachtet werden. Fenster 0 ist
// immer "die letzten 7 Tage", damit die Zahlen zur bestehenden Karte
// "Sätze pro Muskelgruppe (7 Tage)" passen.
export function getMuscleLoadSeries(
  logs,
  exBy,
  subgroupOverrides,
  timeBasedExercises,
  weekCount = 12,
  nowTs = Date.now(),
  // { equipmentOverrides, bodyWeights } - siehe loadModeFor. Ohne diese
  // Angaben rechnet alles wie vorher.
  opts = {}
) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const emptyWeeks = () => new Array(weekCount).fill(0);

  // Schritt 1: Pro Übung festlegen, wie "Arbeit" gemessen wird. Ob eine Übung
  // zeitbasiert ist, entscheidet weiterhin isTimeBasedInLogs - das ist die
  // eine Stelle im Code, die das beantwortet, und das soll so bleiben. Das
  // Ergebnis wird gemerkt, weil die Funktion sonst pro Übung erneut alle Logs
  // durchsucht.
  const timeCache = {};
  const hasWeight = {};
  safeLogs.forEach((l) => {
    logEntries(l).forEach((e) => {
      entrySets(e).forEach((s) => {
        if (!s.done || s.warmup) return;
        if (toNum(s.weight) > 0) hasWeight[e.exerciseId] = true;
      });
    });
  });
  const usesBodyWeight = bodyWeightKnown(opts);
  const bodyLoadOf = (exerciseId, ts) => bodyLoadAt(exBy[exerciseId], opts, ts);
  const modeOf = (exerciseId) => {
    if (!(exerciseId in timeCache)) {
      timeCache[exerciseId] = isTimeBasedInLogs(safeLogs, exerciseId, timeBasedExercises);
    }
    return loadModeFor(exBy[exerciseId], {
      isTime: timeCache[exerciseId],
      hasWeight: !!hasWeight[exerciseId],
      usesBodyWeight,
      equipmentOverrides: opts?.equipmentOverrides,
    });
  };

  // Schritt 2: Der beste Einzelsatz aller Zeiten je Übung - der Maßstab, an
  // dem später jeder Satz gemessen wird.
  const best = {};
  safeLogs.forEach((l) => {
    const bestTs = new Date(l?.date).getTime();
    logEntries(l).forEach((e) => {
      const mode = modeOf(e.exerciseId);
      entrySets(e).forEach((s) => {
        if (!s.done || s.warmup) return;
        const work = loadSetWork(s, mode, bodyLoadOf(e.exerciseId, bestTs));
        if (work > (best[e.exerciseId] || 0)) best[e.exerciseId] = work;
      });
    });
  });

  // Schritt 2b: Der übliche RIR-Wert je Übung - der Nullpunkt, gegen den die
  // Reserve einer einzelnen Einheit gehalten wird (siehe rirLoadFactor).
  const typicalRirs = typicalRirByExercise(safeLogs);

  // Schritt 3: Jeden Satz seinem 7-Tage-Fenster und seinen Muskelgruppen
  // zuordnen.
  const groupWeeks = {};
  const primaryWeeks = {};
  const subWeeks = {};
  safeLogs.forEach((l) => {
    const ts = new Date(l?.date).getTime();
    if (!Number.isFinite(ts)) return;
    // Ein Datum minimal in der Zukunft (Zeitzonen, Uhr verstellt) würde einen
    // negativen Index ergeben und den Eintrag verschlucken - der zählt zur
    // laufenden Woche.
    const idx = Math.max(0, Math.floor((nowTs - ts) / LOAD_WEEK_MS));
    if (idx >= weekCount) return;
    logEntries(l).forEach((e) => {
      const ex = exBy[e.exerciseId];
      if (!ex) return;
      const reference = best[e.exerciseId] || 0;
      if (reference <= 0) return; // ohne Bestwert kein Maßstab
      const mode = modeOf(e.exerciseId);
      // Nur der letzte abgehakte Arbeitssatz trägt die Reserve-Gewichtung -
      // für die übrigen liegt keine Angabe vor (siehe rirLoadFactor).
      const performed = performedWorkingSets(entrySets(e));
      const lastPerformed = performed[performed.length - 1] || null;
      const rirFactor = rirLoadFactor(e.rir, typicalRirs[e.exerciseId]);
      let score = 0;
      performed.forEach((s) => {
        const work = loadSetWork(s, mode, bodyLoadOf(e.exerciseId, ts)) / reference;
        score += s === lastPerformed ? work * rirFactor : work;
      });
      if (score === 0) return;
      // Hauptgruppe voll, Nebengruppen halb (siehe SECONDARY_SHARE) - dieselbe
      // Verrechnung wie bei den Sätzen, sonst würden die beiden Karten
      // dieselbe Übung unterschiedlich zuordnen.
      exerciseGroupShares(ex).forEach(([gruppe, anteil]) => {
        if (!groupWeeks[gruppe]) groupWeeks[gruppe] = emptyWeeks();
        groupWeeks[gruppe][idx] += score * anteil;
      });
      // Die Gesamtbelastung (für die Frühwarnung) zählt jede Arbeit GENAU
      // EINMAL - über die Hauptgruppen. Mit den Nebengruppen aufsummiert
      // käme dieselbe Arbeit mehrfach vor, und "Belastung um X % gestiegen"
      // hinge davon ab, wie viele Nebengruppen die Übungen des Zeitraums
      // zufällig hatten.
      if (!primaryWeeks[ex.group]) primaryWeeks[ex.group] = emptyWeeks();
      primaryWeeks[ex.group][idx] += score;
      // Gleiche Regel wie bei den Sätzen: ohne zugewiesene Untergruppe läuft
      // die Arbeit unter "Sonstige", bei mehreren zählt sie in jeder davon -
      // aber nur einmal in der Summe der Hauptgruppe.
      const subs = getExerciseSubgroups(ex, subgroupOverrides);
      if (!subWeeks[ex.group]) subWeeks[ex.group] = {};
      (subs.length > 0 ? subs : ["sonstige"]).forEach((key) => {
        if (!subWeeks[ex.group][key]) subWeeks[ex.group][key] = emptyWeeks();
        subWeeks[ex.group][key][idx] += score;
      });
    });
  });

  // Schritt 4: Ausgabe von alt nach neu drehen, damit eine Sparkline die
  // Werte direkt von links nach rechts zeichnen kann.
  const toSeries = (weeks) => (weeks ? [...weeks].reverse() : emptyWeeks());
  return MUSCLE_GROUPS.map((g) => {
    const values = toSeries(groupWeeks[g.id]);
    const subDefs = SUBGROUPS[g.id] || [];
    const subs = subDefs
      .map((sg) => ({ id: sg.id, label: sg.label, values: toSeries(subWeeks[g.id]?.[sg.id]) }))
      .concat([{ id: "sonstige", label: "Sonstige", values: toSeries(subWeeks[g.id]?.sonstige) }])
      .map((sg) => ({ ...sg, current: sg.values[sg.values.length - 1] || 0 }));
    return {
      id: g.id, label: g.label, values, current: values[values.length - 1] || 0, subs,
      // Nur die Hauptgruppen-Arbeit - siehe die Herleitung oben. Wird für die
      // Gesamtbelastung in getFatigueWarning gebraucht.
      primaryValues: toSeries(primaryWeeks[g.id]),
    };
  });
}

// Wochenweise Satzzahl pro Muskelgruppe (und Untergruppe) - dieselbe
// rollierende 7-Tage-Fenster-Bucketing wie getMuscleLoadSeries oben, nur
// dass hier schlicht abgehakte Arbeitssätze gezählt werden statt relativer
// Arbeit. weekCount=21, weil der weiteste angebotene Vergleich "vor 20
// Wochen" ist und dafür 20 Wochen Vorgeschichte plus die aktuelle Woche
// gebraucht werden.
// Dropsätze zählen hier nicht als eigener Satz: die Kennzahl bildet
// unabhängige Trainingsreize mit Erholung dazwischen ab (MEV/MAV/MRV-
// Logik), und genau die fehlt zwischen einem Satz und seinen Drops - sie
// sind ein Anhängsel des Satzes, den sie fortsetzen, kein zusätzlicher.
// Ihre Arbeit fehlt dadurch nicht in der Statistik, sie steht bereits
// vollständig in Volumen, Wdh.-Summen und "Belastung pro Muskelgruppe".
function getWeeklySetSeries(logs, exBy, subgroupOverrides, weekCount = 21, nowTs = Date.now()) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const emptyWeeks = () => new Array(weekCount).fill(0);
  const groupWeeks = {};
  const subWeeks = {};
  safeLogs.forEach((l) => {
    const ts = new Date(l?.date).getTime();
    if (!Number.isFinite(ts)) return;
    const idx = Math.max(0, Math.floor((nowTs - ts) / LOAD_WEEK_MS));
    if (idx >= weekCount) return;
    logEntries(l).forEach((e) => {
      const ex = exBy[e.exerciseId];
      if (!ex) return;
      const done = entrySets(e).filter((x) => x.done && !x.warmup && !x.dropset).length;
      if (done === 0) return;
      // Hauptgruppe voll, Nebengruppen halb (siehe SECONDARY_SHARE).
      exerciseGroupShares(ex).forEach(([gruppe, anteil]) => {
        if (!groupWeeks[gruppe]) groupWeeks[gruppe] = emptyWeeks();
        groupWeeks[gruppe][idx] += done * anteil;
      });
      // Untergruppen bekommen nur die Hauptgruppe ab: Welcher Teil der
      // Schulter beim Bankdruecken mitarbeitet, ist eine Frage, die diese
      // Zuordnung nicht beantworten kann - und eine erfundene Antwort waere
      // schlechter als keine.
      const subs = getExerciseSubgroups(ex, subgroupOverrides);
      if (!subWeeks[ex.group]) subWeeks[ex.group] = {};
      (subs.length > 0 ? subs : ["sonstige"]).forEach((key) => {
        if (!subWeeks[ex.group][key]) subWeeks[ex.group][key] = emptyWeeks();
        subWeeks[ex.group][key][idx] += done;
      });
    });
  });
  const toSeries = (weeks) => (weeks ? [...weeks].reverse() : emptyWeeks());
  return MUSCLE_GROUPS.map((g) => {
    const values = toSeries(groupWeeks[g.id]);
    const subDefs = SUBGROUPS[g.id] || [];
    const subs = subDefs
      .map((sg) => ({ id: sg.id, label: sg.label, values: toSeries(subWeeks[g.id]?.[sg.id]) }))
      .map((sg) => ({ ...sg, current: sg.values[sg.values.length - 1] || 0 }))
      .sort((a, b) => b.current - a.current);
    // "Sonstige" hängt immer unsortiert hinten dran, auch bei 0 - siehe
    // getMuscleLoadSeries/weeklySetsByGroup für die Begründung.
    const sonstige = { id: "sonstige", label: "Sonstige", values: toSeries(subWeeks[g.id]?.sonstige) };
    subs.push({ ...sonstige, current: sonstige.values[sonstige.values.length - 1] || 0 });
    return { id: g.id, label: g.label, values, current: values[values.length - 1] || 0, subs };
  }).sort((a, b) => b.current - a.current);
}

// Wochenweise Anzahl absolvierter Atemübungs-Sitzungen - keine Gruppen wie
// bei den Muskelgruppen, nur eine einzelne Reihe, dieselbe rollierende
// 7-Tage-Fenster-Logik wie oben.
function getBreathingWeeklySeries(breathingLogs, weekCount = 21, nowTs = Date.now()) {
  const weeks = new Array(weekCount).fill(0);
  (Array.isArray(breathingLogs) ? breathingLogs : []).forEach((l) => {
    const ts = new Date(l?.date).getTime();
    if (!Number.isFinite(ts)) return;
    const idx = Math.max(0, Math.floor((nowTs - ts) / LOAD_WEEK_MS));
    if (idx >= weekCount) return;
    weeks[idx] += 1;
  });
  const values = [...weeks].reverse();
  return { values, current: values[values.length - 1] || 0 };
}

// Tage in Folge (bis heute zurückgerechnet) mit mindestens einer Sitzung.
// Ein Tag ohne Sitzung bricht die Serie erst, sobald er tatsächlich vorbei
// ist - "heute noch nichts gemacht" darf die gestrige Serie nicht sofort
// auf 0 zurücksetzen, der Tag läuft schließlich noch.
function breathingStreak(breathingLogs, nowTs = Date.now()) {
  const days = new Set(
    (Array.isArray(breathingLogs) ? breathingLogs : [])
      .map((l) => (Number.isFinite(new Date(l?.date).getTime()) ? toDateKey(new Date(l.date)) : null))
      .filter(Boolean)
  );
  let cursor = new Date(nowTs);
  if (!days.has(toDateKey(cursor))) cursor = new Date(cursor.getTime() - 86400000);
  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

// Wie viele volle Wochen liegen zwischen jetzt und dem allerersten jemals
// geloggten Training - unabhängig von Muskelgruppe oder Übung. Das ist die
// Obergrenze dafür, wie weit ein Vergleichszeitraum zurückreichen darf: eine
// Woche vor dem ersten Trainingseintrag ist keine "0 %-Woche", sie hat
// schlicht noch nicht existiert (die App wurde noch nicht genutzt). Ohne
// diese Grenze würde "vs. Schnitt 4 Wochen" bei erst 2 Wochen Historie zwei
// nicht vorhandene Wochen als Nullen einrechnen und den Schnitt künstlich
// nach unten ziehen - genau der Fehler, der beim ersten Test auffiel.
function logsHistoryWeeks(logs, nowTs = Date.now()) {
  let oldest = Infinity;
  (Array.isArray(logs) ? logs : []).forEach((l) => {
    const ts = new Date(l?.date).getTime();
    if (Number.isFinite(ts) && ts < oldest) oldest = ts;
  });
  if (!Number.isFinite(oldest)) return 0;
  return Math.max(0, Math.floor((nowTs - oldest) / LOAD_WEEK_MS));
}

// Prozentuale Veränderung der laufenden Woche gegenüber den Wochen davor.
// compareWeeks = 1 vergleicht mit der Vorwoche, 4 mit dem Schnitt der letzten
// vier Wochen. Der Mittelwert ist bewusst wählbar: ein einzelner Ausfalltag
// verzerrt den Vergleich mit genau einer Woche stark, über vier Wochen kaum.
// maxLookback (siehe logsHistoryWeeks) kappt den Vergleichszeitraum auf das,
// was an echter Historie überhaupt existiert - sonst würden Wochen vor dem
// ersten Trainingseintrag als "0" mitgezählt.
// Rückgabe null bedeutet "nicht berechenbar" (keine Vorgeschichte oder vorher
// gar nichts trainiert) - das ist etwas anderes als 0 % und muss in der
// Anzeige auch anders aussehen.
// deloadFlags wird nur dort mitgegeben, wo die Prozentzahl NEBEN einem
// Warnsignal steht - dann muss sie aus denselben Wochen kommen wie das
// Signal, sonst widersprechen sich Zahl und Zeichen. Die frei gewählten
// Zeitraum-Vergleiche in der Statistik lassen die Entlastungswochen bewusst
// drin: Dort ist die Frage "wie viel war es verglichen mit damals?", und die
// leichte Woche gehört zur Antwort.
// Der Schnitt, GEGEN den diese Prozentzahl rechnet - als eigene Funktion,
// weil ihn auch das Diagramm braucht: Dort wird jeder einzelne Punkt gegen
// denselben Schnitt gestellt, damit der Punkt ganz rechts exakt die Zahl
// trifft, die in der Übersicht neben der Muskelgruppe steht. Wäre der Schnitt
// dort nochmal getrennt gerechnet, würden Liste und Diagramm sich früher oder
// später widersprechen.
// null heißt auch hier "nicht berechenbar" - keine Vorgeschichte, oder in
// den Vergleichswochen wurde gar nichts trainiert.
export function muscleLoadBasis(values, compareWeeks, maxLookback = Infinity, deloadFlags = null) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const usableWeeks = Math.min(compareWeeks, maxLookback);
  if (usableWeeks <= 0) return null;
  const reference = weeksBefore(values, values.length - 1, usableWeeks, deloadFlags);
  if (reference.length === 0) return null;
  const avg = reference.reduce((sum, v) => sum + (v || 0), 0) / reference.length;
  return avg > 0 ? avg : null;
}

export function muscleLoadChange(values, compareWeeks, maxLookback = Infinity, deloadFlags = null) {
  if (!Array.isArray(values) || values.length < 2) return null;
  if (Array.isArray(deloadFlags) && deloadFlags[values.length - 1]) return null;
  const avg = muscleLoadBasis(values, compareWeeks, maxLookback, deloadFlags);
  if (avg == null) return null;
  const current = values[values.length - 1] || 0;
  return ((current - avg) / avg) * 100;
}

// Schwellen für die Plateau-/Überlastungs-Erkennung in detectLoadSignal.
// Fest codiert statt einstellbar - ein sinnvoller erster Standard ist
// wichtiger als Konfigurierbarkeit, kann bei Bedarf später ein Setting werden.
// Plateau = "seit vier Wochen bewegt sich nichts". Verglichen wird der Schnitt
// der letzten beiden Wochen gegen den Schnitt der beiden davor.
//
// Vorher stand hier: aktuelle Woche gegen das Maximum der drei Wochen davor,
// mit 5 % Toleranz. Das verlangte in JEDER einzelnen Woche mehr als 5 %
// Zuwachs - bei realistischen 2-3 % pro Woche war das Zeichen deshalb fast
// dauerhaft an, und eine einzelne Woche mit wenig Zeit löste es sofort aus.
// KONZEPT.md hatte genau das schon als Fehler notiert ("Ein kurzer Tag darf
// das Bild nicht kippen"). Zwei Wochen gegen zwei Wochen federt einen
// schwachen Tag ab, ohne den Zeitraum unnötig lang zu machen.
const PLATEAU_BLOCK_WEEKS = 2;  // so viele Wochen je Block
const PLATEAU_GROWTH = 1.02;    // darunter gilt der Zuwachs als "nichts bewegt"
// Von den vier Wochen darf höchstens eine fehlen (Urlaub, Krankheit,
// Entlastung). Aus einer Woche gegen eine Woche wird kein Urteil gefällt.
const PLATEAU_MIN_WEEKS = 3;
const OVERLOAD_LOOKBACK = 4;    // Vergleichs-Schnitt aus den 4 Wochen davor
// Zwei Stufen, angelehnt an die Acute:Chronic-Workload-Ratio aus der
// Sportwissenschaft (Gabbett): Ratio ~1,3 gilt dort schon als Punkt, ab dem
// das Verletzungsrisiko zu steigen beginnt (Ende des "Sweet Spot" 0,8-1,3),
// ~1,5 als Hochrisikozone. Harter Alarm bei +30% statt +50%, um früher zu
// warnen - dafür der weiche Hinweis bei +15% als Vorstufe, damit nicht jede
// Woche im oberen Sweet-Spot-Bereich schon als Alarm auftaucht.
// So viele saubere Wochen muss der Vergleichszeitraum mindestens noch
// enthalten. Ohne Entlastungswochen sind es immer alle vier; liegt eine darin,
// bleiben meist zwei - die zwei Wochen direkt davor, und die sind der
// richtige Maßstab. Bleibt weniger übrig, wird nichts gemeldet.
const OVERLOAD_MIN_CLEAN = 2;
const OVERLOAD_WATCH_THRESHOLD = 1.15;  // aktuelle Woche > 15% über dem Schnitt = weicher Hinweis
const OVERLOAD_ALERT_THRESHOLD = 1.3;   // aktuelle Woche > 30% über dem Schnitt = harter Alarm

// Ermittelt aus einer Wochenreihe (alt -> neu, wie von getMuscleLoadSeries /
// getExerciseLoadSeries geliefert) ein Warnsignal für die aktuelle Woche:
// - "overload": Belastung gegenüber dem Schnitt der OVERLOAD_LOOKBACK Wochen
//   davor sprunghaft gestiegen (akutes Risiko, hat deshalb Vorrang vor allem
//   anderen).
// - "overload-watch": spürbarer, aber (noch) nicht dramatischer Anstieg -
//   Vorstufe zu "overload", kein Grund zur Sorge, aber im Auge behalten.
// - "plateau": über vier Wochen hinweg kein Zuwachs - die letzten zwei Wochen
//   liegen im Schnitt nicht über den zwei davor.
// historyWeeks (siehe logsHistoryWeeks) verhindert ein Urteil, wenn es dafür
// schlicht noch nicht genug Trainingshistorie gibt. Null heißt "kein
// auffälliges Signal" - das schließt "diese Woche noch nichts trainiert" und
// "zu wenig Historie" mit ein.
export function detectLoadSignal(values, historyWeeks = Infinity, deloadFlags = null) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const current = values[values.length - 1] || 0;
  if (current <= 0) return null;
  // Eine absichtlich leichte Woche ist kein Befund. Weder Plateau noch
  // Überlastung wird hier gemeldet - es gibt nichts zu melden, was nicht so
  // geplant gewesen wäre.
  if (Array.isArray(deloadFlags) && deloadFlags[values.length - 1]) return null;

  const overloadSlice = weeksBefore(values, values.length - 1, OVERLOAD_LOOKBACK, deloadFlags);
  // Wochen ohne Training zaehlen als Luecke, nicht als Null - dieselbe Regel,
  // die KONZEPT.md fuer ausgefallene Einheiten aufstellt.
  //
  // Vorher wurde durch alle vier Wochen geteilt, auch durch die leeren. Eine
  // Woche Urlaub druckte den Schnitt damit um ein Viertel nach unten, und die
  // erste ganz normale Woche danach loeste einen Ueberlastungs-Alarm aus:
  // aus [100, 102, 0, 106] wurde ein Schnitt von 77 statt 103, die naechste
  // Woche mit 108 lag damit 40 % darueber statt 5 %. Genau derselbe
  // Falschalarm wie bei einer nicht markierten Entlastung.
  const overloadWeeks = overloadSlice.filter((v) => v > 0);
  if (overloadWeeks.length >= OVERLOAD_MIN_CLEAN && historyWeeks >= OVERLOAD_LOOKBACK) {
    const baseline = overloadWeeks.reduce((sum, v) => sum + v, 0) / overloadWeeks.length;
    if (baseline > 0) {
      if (current > baseline * OVERLOAD_ALERT_THRESHOLD) return { type: "overload" };
      if (current > baseline * OVERLOAD_WATCH_THRESHOLD) return { type: "overload-watch" };
    }
  }

  // Zwei Blöcke à zwei Wochen: die letzten beiden (einschließlich der
  // laufenden) gegen die beiden davor. Wochen ohne Training und markierte
  // Entlastungen zählen als Lücke, nicht als Null - sonst würde eine
  // ausgefallene Woche als Stillstand gelesen.
  const usable = (fromIdx, toIdx) => {
    const out = [];
    for (let i = Math.max(0, fromIdx); i <= toIdx && i < values.length; i++) {
      if (Array.isArray(deloadFlags) && deloadFlags[i]) continue;
      const v = values[i] || 0;
      if (v > 0) out.push(v);
    }
    return out;
  };
  const lastIdx = values.length - 1;
  const recent = usable(lastIdx - PLATEAU_BLOCK_WEEKS + 1, lastIdx);
  const prior = usable(lastIdx - 2 * PLATEAU_BLOCK_WEEKS + 1, lastIdx - PLATEAU_BLOCK_WEEKS);
  if (
    historyWeeks >= 2 * PLATEAU_BLOCK_WEEKS &&
    recent.length > 0 &&
    prior.length > 0 &&
    recent.length + prior.length >= PLATEAU_MIN_WEEKS
  ) {
    const mean = (list) => list.reduce((sum, v) => sum + v, 0) / list.length;
    if (mean(recent) <= mean(prior) * PLATEAU_GROWTH) {
      return { type: "plateau" };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Kraft gegen Volumen
//
// Die Frage, für die die App eigentlich gebaut wurde: "Werde ich stärker,
// oder mache ich nur mehr?" Beide Zahlen gab es längst - Volumen in der
// Startseite, geschätztes 1RM in den Übungs-Charts -, nur nie nebeneinander.
// Genau nebeneinander wird daraus aber erst eine Aussage: Wer 18 % mehr
// Arbeit leistet und dabei gleich stark bleibt, sieht in beiden Zahlen
// einzeln nichts Auffälliges.
//
// Kraft = das beste geschätzte 1RM der Woche (mit Reserve, siehe set1RM).
// Bewusst nicht das reine Maximalgewicht: Das springt nur beim
// Scheibenwechsel und ist blind dafür, ob es fünf oder zehn Wiederholungen
// waren. Und bewusst nicht das Satzvolumen: Das vermischt wieder genau die
// beiden Größen, die hier getrennt werden sollen.
//
// Volumen = bewegte Kilogramm der Woche (kg × Wdh. aller Arbeitssätze) -
// dieselbe Rechnung wie "Volumen diese Woche" auf der Startseite.
//
// Beides braucht Gewicht auf der Stange. Körpergewichts- und Bandübungen
// haben hier keine Kraftzahl, und eine erfundene wäre schlechter als keine.
// ---------------------------------------------------------------------------

// Beide Wochenreihen für ALLE Übungen in einem Durchgang - getrennt je Übung
// gerechnet, weil ein 1RM nur innerhalb derselben Übung vergleichbar ist.
// Rückgabe alt -> neu, wie überall.
export function getStrengthVolumeSeries(logs, weekCount = 26, nowTs = Date.now()) {
  const out = {};
  const leer = () => new Array(weekCount).fill(0);
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    const ts = new Date(log?.date).getTime();
    if (!Number.isFinite(ts)) return;
    const idx = Math.max(0, Math.floor((nowTs - ts) / LOAD_WEEK_MS));
    if (idx >= weekCount) return;
    logEntries(log).forEach((entry) => {
      // Zeit-Übungen haben weder Gewicht noch Wiederholungen - dort gibt es
      // nichts zu vergleichen.
      if (entry.targetUseTime) return;
      const reihe =
        out[entry.exerciseId] || (out[entry.exerciseId] = { strength: leer(), volume: leer() });
      forEachPerformedSet(entry, (set, rir) => {
        const oneRM = set1RM(set, rir);
        // Die Woche bekommt den BESTEN Satz, nicht die Summe: Kraft ist das,
        // was einmal ging, nicht was oft ging.
        if (oneRM > reihe.strength[idx]) reihe.strength[idx] = oneRM;
        reihe.volume[idx] += toNum(set.weight) * toNum(set.reps);
      });
    });
  });
  Object.values(out).forEach((r) => {
    r.strength.reverse();
    r.volume.reverse();
  });
  return out;
}

// Wie hat sich eine Reihe über den gewählten Zeitraum verändert: die zweite
// Hälfte gegen die erste.
//
// Bewusst NICHT "aktuelle Woche gegen den Schnitt davor" wie bei der
// Belastung. Dort geht es um "wie war diese Woche"; hier um "wohin läuft das
// über Wochen". Eine einzelne Woche als Endpunkt wäre dafür zu wacklig -
// eine Übung, die man diese Woche zufällig nicht gemacht hat, hätte gar
// keinen Wert.
//
// Wochen ohne Daten zählen in keiner der beiden Hälften mit: Sie sind eine
// Lücke, keine Null. Bei ungerader Wochenzahl fällt die mittlere Woche
// heraus, damit beide Hälften gleich lang sind.
export function halfPeriodChange(values, compareWeeks) {
  const reihe = compareWindowSeries(Array.isArray(values) ? values : [], compareWeeks);
  const haelfte = Math.floor(reihe.length / 2);
  if (haelfte < 1) return null;
  const erste = reihe.slice(0, haelfte).filter((v) => v > 0);
  const zweite = reihe.slice(reihe.length - haelfte).filter((v) => v > 0);
  if (erste.length === 0 || zweite.length === 0) return null;
  const mittel = (l) => l.reduce((sum, v) => sum + v, 0) / l.length;
  const vorher = mittel(erste);
  if (!(vorher > 0)) return null;
  return {
    change: (mittel(zweite) / vorher - 1) * 100,
    weeksBefore: erste.length,
    weeksAfter: zweite.length,
  };
}

// Ab wann eine Veränderung als "bewegt sich" gilt, und ab wann als "steht".
// Dieselbe Größenordnung wie beim Plateau-Zeichen (2 % über zwei Wochen),
// nur über einen längeren Zeitraum gelesen.
const SV_FLAT = 3;   // bis hierhin gilt eine Kennzahl als unverändert
const SV_CLEAR = 10; // ab hier gilt sie als deutlich verändert

// Ein Satz zu dem, was da steht - und zwar nur für die Fälle, in denen die
// beiden Zahlen zusammen etwas sagen, das keine von beiden allein sagt.
// Beschreibend, kein Rat: WAS zu tun ist, hängt von Ziel, Zeit und Erholung
// ab, und davon weiß die App nichts (Regel 3). Der auffällige Fall - viel
// mehr Arbeit bei stehender Kraft - ist der einzige, bei dem eine Einordnung
// über die reine Beschreibung hinausgeht; das ist eine bewusste Entscheidung
// (siehe KONZEPT.md), weil genau dieser Fall der Grund für die Karte war.
export function strengthVolumeNote(rohKraft, rohVolumen) {
  if (rohKraft == null || rohVolumen == null) return null;
  // Gerechnet wird mit denselben gerundeten Zahlen, die daneben stehen.
  // Sonst bekommt eine Zeile mit "+10 %" keinen Satz, weil dahinter 9,6
  // stehen - und die daneben mit derselben Anzeige schon.
  const kraft = Math.round(rohKraft);
  const volumen = Math.round(rohVolumen);
  const kraftSteht = Math.abs(kraft) <= SV_FLAT;
  if (volumen >= SV_CLEAR && kraft <= SV_FLAT) {
    return "Deutlich mehr Arbeit, aber die Kraft steht – der Punkt, an dem sich Mehrarbeit oft nicht mehr in Kraft übersetzt.";
  }
  if (kraft >= SV_CLEAR && volumen <= SV_FLAT) {
    return "Mehr Kraft bei gleicher oder weniger Arbeit.";
  }
  if (kraft >= SV_FLAT && volumen >= SV_FLAT) {
    return "Kraft und Arbeit steigen zusammen.";
  }
  if (volumen <= -SV_CLEAR && kraftSteht) {
    return "Deutlich weniger Arbeit, die Kraft hält sich.";
  }
  if (volumen <= -SV_FLAT && kraft <= -SV_FLAT) {
    return "Weniger Arbeit, und die Kraft geht mit.";
  }
  return null;
}

// Wöchentliche relative Belastung einer einzelnen Übung - dieselbe
// Bestwert-Normierung wie getMuscleLoadSeries (siehe dort für die Herleitung),
// nur ohne die Aggregation über Muskelgruppen. Grundlage für
// detectLoadSignal auf Einzelübungs-Ebene.
function getExerciseLoadSeries(logs, exerciseId, timeBasedExercises, weekCount = 12, nowTs = Date.now(), opts = {}) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const isTime = isTimeBasedInLogs(safeLogs, exerciseId, timeBasedExercises);
  const hasWeight = safeLogs.some((l) =>
    logEntries(l).some(
      (e) =>
        e.exerciseId === exerciseId &&
        entrySets(e).some((s) => s.done && !s.warmup && toNum(s.weight) > 0)
    )
  );
  // opts.exercise ist die Uebung selbst - ohne sie waere hier nicht zu
  // erkennen, dass der Koerper die Last ist (siehe loadModeFor).
  const bodyLoadOf = (ts) => bodyLoadAt(opts?.exercise, opts, ts);
  const mode = loadModeFor(opts?.exercise, {
    isTime, hasWeight, usesBodyWeight: bodyWeightKnown(opts),
    equipmentOverrides: opts?.equipmentOverrides,
  });

  let best = 0;
  safeLogs.forEach((l) => {
    const bestTs = new Date(l?.date).getTime();
    logEntries(l).forEach((e) => {
      if (e.exerciseId !== exerciseId) return;
      entrySets(e).forEach((s) => {
        if (!s.done || s.warmup) return;
        const work = loadSetWork(s, mode, bodyLoadOf(bestTs));
        if (work > best) best = work;
      });
    });
  });

  const weeks = new Array(weekCount).fill(0);
  if (best <= 0) return weeks;
  // Dieselbe Reserve-Gewichtung wie in getMuscleLoadSeries - sonst zeigten
  // die Einzelübung und die Muskelgruppe, zu der sie gehört, unterschiedliche
  // Verläufe für dieselben Sätze.
  const typicalHere = typicalRirByExercise(safeLogs)[exerciseId];
  safeLogs.forEach((l) => {
    const ts = new Date(l?.date).getTime();
    if (!Number.isFinite(ts)) return;
    const idx = Math.max(0, Math.floor((nowTs - ts) / LOAD_WEEK_MS));
    if (idx >= weekCount) return;
    logEntries(l).forEach((e) => {
      if (e.exerciseId !== exerciseId) return;
      const performed = performedWorkingSets(entrySets(e));
      const lastPerformed = performed[performed.length - 1] || null;
      const rirFactor = rirLoadFactor(e.rir, typicalHere);
      performed.forEach((s) => {
        const work = loadSetWork(s, mode, bodyLoadOf(ts)) / best;
        weeks[idx] += s === lastPerformed ? work * rirFactor : work;
      });
    });
  });
  return [...weeks].reverse();
}

// ---------------------------------------------------------------------------
// Entlastungswochen (Deload)
//
// Eine bewusst leichtere Woche ist keine schwache Woche. Ohne diese
// Unterscheidung liest die App sie als Einbruch - nachgemessen an einem
// steigenden Verlauf mit einer Entlastungswoche bei -55 % Arbeit:
//
//   Entlastungswoche selbst   -> "Plateau"
//   1. bis 4. Woche danach    -> "Überlastung - im Auge behalten"
//   ab der 5. Woche           -> wieder ruhig
//
// Der Grund für die vier Wochen danach ist der Vergleichs-Schnitt in
// detectLoadSignal: Die leichte Woche zieht ihn nach unten, der ganz normale
// Wiedereinstieg sieht dadurch aus wie ein Sprung. Bei einer Entlastung alle
// 6-8 Wochen trüge also die Mehrheit aller Wochen ein falsches Etikett - und
// eine Warnung, die meistens danebenliegt, wird zu Recht ignoriert.
//
// Deshalb gilt eine markierte Woche in allen WARNUNGEN als Lücke, nicht als
// Tief; dieselbe Behandlung, die KONZEPT.md für ausgefallene Einheiten
// vorsieht ("Lücken, keine Nullen"). Beschreibende Vergleiche - die
// Zeitraum-Chips, Sparklines, Charts - zeigen sie dagegen unverändert: Die
// Delle ist echt und soll sichtbar bleiben, sie soll nur nicht kommentiert
// werden.
//
// Was die App bewusst NICHT tut: von sich aus eine Entlastungswoche
// vorschlagen. Wann und wie oft entlastet wird, ist eine Trainingsentscheidung
// (Regel 3). Die App zählt nur mit.
// ---------------------------------------------------------------------------

// Montag der Woche, in der dieses Datum liegt. Die Woche ist die Einheit, in
// der eine Entlastung geplant wird - nicht der einzelne Satz und nicht das
// einzelne Training.
export function weekStartKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  const offset = (d.getDay() + 6) % 7; // Montag = 0, wie im Kalender
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
}

// Tage auf ein Datum addieren, ohne bei Sommerzeit-Umstellungen zu verrutschen:
// über die Kalender-Felder statt über Millisekunden.
export function addDays(date, days) {
  const d = date instanceof Date ? date : dateFromKey(date);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

// Gegenstück zu toDateKey: "2026-09-07" zurück in ein lokales Datum. Bewusst
// nicht new Date("2026-09-07") - das liest ISO-Daten als UTC und kippt je nach
// Zeitzone auf den Vortag.
export function dateFromKey(key) {
  if (typeof key !== "string") return null;
  const [y, m, d] = key.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

// Ein Eintrag ist ein Zeitraum: { id, start, end, guess }, beides
// Datums-Schlüssel, `end` einschließlich. Eine Entlastung muss nicht Montag
// bis Sonntag laufen - Mittwoch bis übernächsten Donnerstag ist genauso ein
// Zeitraum. Ältere Einträge ohne `end` sind Kalenderwochen und werden hier
// still auf sieben Tage ergänzt; blanke Datums-Schlüssel ebenso.
export function deloadRanges(deloadWeeks) {
  const list = Array.isArray(deloadWeeks) ? deloadWeeks : [];
  const out = [];
  list.forEach((w, i) => {
    const startKey = typeof w === "string" ? w : w?.start;
    const startDate = dateFromKey(startKey);
    if (!startDate) return;
    const endDate = dateFromKey(typeof w === "string" ? null : w?.end) || addDays(startDate, 6);
    // Verdrehte Eingaben (Ende vor Anfang) werden gedreht statt verworfen.
    const [von, bis] = endDate.getTime() < startDate.getTime() ? [endDate, startDate] : [startDate, endDate];
    out.push({
      id: (typeof w === "string" ? null : w?.id) || "deload-" + i,
      start: toDateKey(von),
      end: toDateKey(bis),
      guess: (typeof w === "string" ? null : w?.guess) || null,
      startTs: von.getTime(),
      // Das Ende ist einschließlich, gerechnet wird bis zum Ende dieses Tages.
      endTs: bis.getTime() + 86400000,
    });
  });
  return out.sort((a, b) => a.startTs - b.startTs);
}

// Liegt dieser Tag in einem markierten Zeitraum?
export function isDeloadDate(date, deloadWeeks) {
  const d = date instanceof Date ? date : dateFromKey(date) || new Date(date);
  const ts = d?.getTime?.();
  if (!Number.isFinite(ts)) return false;
  return deloadRanges(deloadWeeks).some((r) => ts >= r.startTs && ts < r.endTs);
}

// Für die Kalender-Darstellung: gehört der Tag zu einem Zeitraum, und ist er
// dessen erster oder letzter Tag? Der erste bekommt die Beschriftung.
export function deloadDayInfo(date, deloadWeeks) {
  const d = date instanceof Date ? date : dateFromKey(date);
  if (!d) return null;
  const key = toDateKey(d);
  const range = deloadRanges(deloadWeeks).find((r) => {
    const ts = d.getTime();
    return ts >= r.startTs && ts < r.endTs;
  });
  if (!range) return null;
  return { range, isStart: key === range.start, isEnd: key === range.end };
}

// Markierungen passend zu einer Wochenreihe aus getMuscleLoadSeries
// (alt -> neu, Position 0 ist die älteste Woche).
//
// Wichtig: Diese Reihen rechnen in rollierenden 7-Tage-Fenstern ab heute,
// nicht in Kalenderwochen. Ein markierter Zeitraum fällt deshalb fast immer
// in zwei dieser Fenster, bei längeren Zeiträumen in mehr. Markiert wird
// jedes Fenster, das sich mit ihm überschneidet - lieber ein Fenster zu viel
// überspringen als einen halb verfälschten Vergleich anstellen.
export function deloadWeekFlags(deloadWeeks, weekCount, nowTs = Date.now()) {
  const flags = new Array(Math.max(0, weekCount)).fill(false);
  const ranges = deloadRanges(deloadWeeks);
  if (ranges.length === 0 || flags.length === 0) return flags;
  ranges.forEach((r) => {
    for (let i = 0; i < flags.length; i++) {
      const bucketEnd = nowTs - (flags.length - 1 - i) * LOAD_WEEK_MS;
      if (r.startTs < bucketEnd && r.endTs > bucketEnd - LOAD_WEEK_MS) flags[i] = true;
    }
  });
  return flags;
}

// Der Vergleichszeitraum: die `count` Wochen vor `endIdx`, ohne die
// Entlastungswochen darin. Ohne Markierungen (deloadFlags = null) ist das
// exakt derselbe zusammenhängende Ausschnitt wie früher - für alle, die keine
// Entlastung eintragen, ändert sich also nichts.
//
// Wichtig ist, was hier NICHT passiert: Der Zeitraum wird nicht nach hinten
// verlängert, um die fehlenden Wochen zu ersetzen. Ein erster Anlauf tat
// genau das - und erzeugte damit eine Überlastungs-Meldung, die es ohne
// Markierung nicht gab: Wer stetig mehr trainiert, dessen Wochen von vor zwei
// Monaten liegen tiefer, der Schnitt sinkt, und der normale Wiedereinstieg
// sieht wieder wie ein Sprung aus. Die Wochen direkt vor der Entlastung sind
// der richtige Vergleich, auch wenn es weniger sind.
function weeksBefore(values, endIdx, count, deloadFlags) {
  const marked = Array.isArray(deloadFlags);
  const out = [];
  for (let i = endIdx - 1; i >= 0 && endIdx - i <= count; i--) {
    if (marked && deloadFlags[i]) continue;
    out.push(values[i] || 0);
  }
  return out.reverse();
}

// Wo die letzte Entlastung liegt und wie lange sie her ist. Ein schon
// eingetragener, aber noch bevorstehender Zeitraum zählt dabei nicht als
// "letzter" - er steht getrennt als `next` daneben.
//
// Gezählt wird von Anfang zu Anfang, nicht von Ende zu Anfang: "alle 8 Wochen"
// beschreibt den Abstand zwischen zwei Entlastungen, und der hängt sonst
// davon ab, wie lang die letzte war.
//
// Bewusst nur Zahlen, kein Rat: `intervalWeeks` ist der Rhythmus, den der
// Mensch selbst eingetragen hat. Die App leitet daraus keine Empfehlung ab,
// sie sagt, wann er erreicht ist (Regel 3).
export function deloadStatus(deloadWeeks, intervalWeeks = null, nowTs = Date.now()) {
  const ranges = deloadRanges(deloadWeeks);
  if (ranges.length === 0) return null;
  const current = ranges.find((r) => nowTs >= r.startTs && nowTs < r.endTs) || null;
  const past = ranges.filter((r) => r.startTs <= nowTs);
  const future = ranges.filter((r) => r.startTs > nowTs);
  const last = past.length ? past[past.length - 1] : null;
  const next = future.length ? future[0] : null;
  const interval =
    Number.isFinite(Number(intervalWeeks)) && Number(intervalWeeks) > 0 ? Number(intervalWeeks) : null;
  const weeksSince = last ? Math.floor((nowTs - last.startTs) / LOAD_WEEK_MS) : null;
  return {
    count: ranges.length,
    last,
    next,
    current,
    weeksSince,
    daysUntilNext: next ? Math.ceil((next.startTs - nowTs) / 86400000) : null,
    intervalWeeks: interval,
    // Wann der eigene Rhythmus erreicht ist - und ob er es schon ist.
    dueAt: last && interval ? last.startTs + interval * LOAD_WEEK_MS : null,
    due: !!(last && interval && !current && !next && nowTs >= last.startTs + interval * LOAD_WEEK_MS),
  };
}

const DELOAD_EFFECT_WEEKS = 2;        // so viele Wochen davor gegen so viele danach
const DELOAD_EFFECT_MIN_EXERCISES = 2; // darunter ist der Vergleich ein Einzelfall
const DELOAD_EFFECT_MIN_SESSIONS = 2;  // je Seite, sonst hängt alles an einem Tag
const DELOAD_PATTERN_MIN = 3;          // ab so vielen Entlastungen ein Durchschnitt

// Was eine einzelne Entlastung gebracht hat: die zwei Wochen davor gegen die
// zwei Wochen danach. "Danach" beginnt am Tag nach dem Ende des Zeitraums -
// bei einer langen Entlastung also später als bei einer kurzen.
//
// Verglichen wird die Leistung JE ÜBUNG, nicht die Gesamtarbeit einer Woche.
// Sonst würde vor allem gemessen, wie viel Zeit gerade da war: Wer nach der
// Entlastung eine Einheit mehr schafft, hätte automatisch ein besseres
// Ergebnis, ohne stärker geworden zu sein. Gemittelt wird über die Übungen,
// die auf beiden Seiten vorkommen - eine Übung, die nur einmal auftaucht,
// hätte keinen Vergleichswert.
export function getDeloadEffect(logs, range, timeBasedExercises, nowTs = Date.now(), opts = {}) {
  const r = range && typeof range === "object" && range.startTs
    ? range
    : deloadRanges([range])[0];
  if (!r) return null;
  const beforeFrom = r.startTs - DELOAD_EFFECT_WEEKS * LOAD_WEEK_MS;
  const afterFrom = r.endTs;
  const afterTo = afterFrom + DELOAD_EFFECT_WEEKS * LOAD_WEEK_MS;
  // Solange die Wochen danach noch laufen, gibt es nichts zu vergleichen.
  if (nowTs < afterTo) return null;

  const safeLogs = (Array.isArray(logs) ? logs : []).filter(Boolean);
  const pick = (from, to) =>
    safeLogs.filter((l) => {
      const ts = new Date(l?.date).getTime();
      return Number.isFinite(ts) && ts >= from && ts < to;
    });
  const before = pick(beforeFrom, r.startTs);
  const after = pick(afterFrom, afterTo);
  if (before.length < DELOAD_EFFECT_MIN_SESSIONS || after.length < DELOAD_EFFECT_MIN_SESSIONS) return null;

  const modeCache = {};
  // opts.exBy nennt die Uebungen, opts.bodyWeights das Koerpergewicht - ohne
  // beides rechnet es wie vorher (siehe loadModeFor).
  // Das Koerpergewicht galt nicht immer gleich - deshalb pro Training, nicht
  // pro Uebung (siehe bodyWeightAt).
  const bodyLoadOf = (exerciseId, ts) => bodyLoadAt(opts?.exBy?.[exerciseId], opts, ts);
  const usesBodyWeight = bodyWeightKnown(opts);
  const modeFor = (exerciseId) => {
    if (modeCache[exerciseId]) return modeCache[exerciseId];
    const isTime = isTimeBasedInLogs(safeLogs, exerciseId, timeBasedExercises);
    const hasWeight = safeLogs.some((l) =>
      performedWorkingSets(logSetsFor(l, exerciseId)).some((s) => toNum(s.weight) > 0)
    );
    modeCache[exerciseId] = loadModeFor(opts?.exBy?.[exerciseId], {
      isTime, hasWeight, usesBodyWeight,
      equipmentOverrides: opts?.equipmentOverrides,
    });
    return modeCache[exerciseId];
  };

  // Arbeit je Satz, je Übung gemittelt - dieselbe Messgröße wie in
  // getFeelingPerformance, damit beide Karten dasselbe "Leistung" meinen.
  const perExercise = (group) => {
    const acc = {};
    group.forEach((log) => {
      const logTs = new Date(log?.date).getTime();
      const ids = [...new Set(logEntries(log).map((e) => e.exerciseId).filter(Boolean))];
      ids.forEach((id) => {
        const sets = performedWorkingSets(logSetsFor(log, id));
        if (sets.length === 0) return;
        const perSet =
          sets.reduce((sum, s) => sum + loadSetWork(s, modeFor(id), bodyLoadOf(id, logTs)), 0) /
          sets.length;
        if (!(perSet > 0)) return;
        const row = acc[id] || (acc[id] = { sum: 0, n: 0 });
        row.sum += perSet;
        row.n += 1;
      });
    });
    return acc;
  };

  const beforeBy = perExercise(before);
  const afterBy = perExercise(after);
  const ratios = [];
  Object.keys(beforeBy).forEach((id) => {
    if (!afterBy[id]) return;
    const b = beforeBy[id].sum / beforeBy[id].n;
    const a = afterBy[id].sum / afterBy[id].n;
    if (b > 0 && a > 0) ratios.push(a / b);
  });
  if (ratios.length < DELOAD_EFFECT_MIN_EXERCISES) return null;

  const meanOf = (list) => list.reduce((sum, v) => sum + v, 0) / list.length;
  const feelingsOf = (group) =>
    group.map((l) => Number(l.feeling)).filter((v) => Number.isFinite(v));
  const feelBefore = feelingsOf(before);
  const feelAfter = feelingsOf(after);

  return {
    start: r.start,
    end: r.end,
    days: Math.round((r.endTs - r.startTs) / 86400000),
    exercises: ratios.length,
    sessionsBefore: before.length,
    sessionsAfter: after.length,
    performanceChange: (meanOf(ratios) - 1) * 100,
    // Das Gefühl bleibt optional: Wer es nicht einträgt, bekommt trotzdem
    // den Leistungsvergleich.
    feelingBefore: feelBefore.length ? meanOf(feelBefore) : null,
    feelingAfter: feelAfter.length ? meanOf(feelAfter) : null,
  };
}

// Alle auswertbaren Entlastungen, neueste zuerst, plus der Durchschnitt -
// letzterer erst ab DELOAD_PATTERN_MIN Entlastungen. Bei einer Entlastung alle
// 6-8 Wochen sind das rund sieben Datenpunkte im Jahr; eine Zahl aus einem
// einzigen Vorgang wäre eine Behauptung, kein Muster.
export function getDeloadEffects(logs, deloadWeeks, timeBasedExercises, nowTs = Date.now(), opts = {}) {
  const results = deloadRanges(deloadWeeks)
    .map((r) => getDeloadEffect(logs, r, timeBasedExercises, nowTs, opts))
    .filter(Boolean)
    .reverse();
  const pattern =
    results.length >= DELOAD_PATTERN_MIN
      ? results.reduce((sum, r) => sum + r.performanceChange, 0) / results.length
      : null;
  return { results, pattern, patternMin: DELOAD_PATTERN_MIN };
}

const EQUIPMENT_OPTIONS = ["Langhantel", "Kurzhanteln", "Kabelzug", "Maschine", "Kettlebell", "Gewichtsscheibe", "Körpergewicht", "Band", "Sonstiges"];

export function getExerciseMeta(exercise) {
  if (exercise?.meta) return exercise.meta;
  const n = (exercise?.name || "").toLowerCase();
  // Die mitgelieferten Übungen tragen ihr Gerät selbst. Vorher wurde es aus
  // dem Namen geraten, und das ging bei 72 von 126 Übungen daneben - sie
  // landeten alle auf "Sonstiges", womit der Geräte-Filter in der
  // Übungsliste die Mehrheit der Übungen nicht mehr auseinanderhalten
  // konnte. Geraten wird jetzt nur noch bei selbst angelegten Übungen.
  let equipment = EQUIPMENT_OPTIONS.includes(exercise?.equipment) ? exercise.equipment : "Sonstiges";
  if (exercise?.equipment) { /* schon gesetzt */ }
  else if (n.includes("kabel") || n.includes("cable")) equipment = "Kabelzug";
  else if (n.includes("maschine") || n.includes("presse")) equipment = "Maschine";
  else if (n.includes("band") || n.includes("gummi")) equipment = "Band";
  else if (n.includes("kurzhantel") || n.includes("dumbbell")) equipment = "Kurzhanteln";
  else if (n.includes("langhantel") || n.includes("bankdrücken") || n.includes("kniebeuge") || n.includes("kreuzheben")) equipment = "Langhantel";
  else if (n.includes("kettlebell")) equipment = "Kettlebell";
  else if (["liegestütz", "plank", "sit-up", "crunch", "klimmzug", "dips"].some((x) => n.includes(x))) equipment = "Körpergewicht";
  return {
    equipment,
    primary: MUSCLE_GROUPS.find((g) => g.id === exercise?.group)?.label || exercise?.group || "–",
    secondary: "Je nach Ausführung",
    description: `${exercise?.name || "Übung"} – individuelle Technik und Bewegungsumfang beachten.`,
    video: "",
  };
}

// The equipment shown/edited for an exercise always checks the override
// map first (works the same for built-in and custom exercises), falling
// back to whatever getExerciseMeta guessed or was set at creation.
function getExerciseEquipment(exercise, equipmentOverrides) {
  return (equipmentOverrides && equipmentOverrides[exercise.id]) || getExerciseMeta(exercise).equipment;
}


// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function loadJSON(key, fallback) {
  try {
    if (typeof window === "undefined") return fallback;
    if (window.storage?.get) {
      const res = await window.storage.get(key, false);
      if (res?.value) return JSON.parse(res.value) ?? fallback;
    }
    // Outside Claude.ai (i.e. running as a standalone app via `npm run dev`
    // or a deployed build) window.storage doesn't exist, so fall back to
    // localStorage — otherwise nothing would ever persist between reloads.
    const local = window.localStorage?.getItem(`training-app:${key}`);
    return local ? (JSON.parse(local) ?? fallback) : fallback;
  } catch (e) {
    console.error(`Laden fehlgeschlagen: ${key}`, e);
    return fallback;
  }
}

async function saveJSON(key, value) {
  try {
    if (typeof window === "undefined") return false;
    const json = JSON.stringify(value);
    if (window.storage?.set) {
      await window.storage.set(key, json, false);
    }
    try {
      window.localStorage?.setItem(`training-app:${key}`, json);
    } catch (_) {}
    return true;
  } catch (e) {
    console.error(`Speichern fehlgeschlagen: ${key}`, e);
    return false;
  }
}

// Every key the app persists. Kept in one place so a backup can never
// silently miss a feature that was added later - if something new is stored,
// it belongs in this list.
const BACKUP_KEYS = [
  "training-plans",
  "workout-logs",
  "custom-exercises",
  "plan-folders",
  "exercise-notes",
  "exercise-name-overrides",
  "exercise-time-based",
  "exercise-gym-independent",
  "breathing-exercises",
  "breathing-logs",
  "exercise-subgroup-overrides",
  "exercise-equipment-overrides",
  "training-programs",
  "active-program-id",
  "calendar-entries",
  "calendar-categories",
  "gyms",
  "active-gym-id",
  "app-theme",
  "active-workout",
  "collapsed-folders",
  "deload-weeks",
  "deload-interval",
  "deload-suggestion-hidden",
  "resistance-bands",
  "rest-sound",
  "body-weight",
];

async function buildBackup() {
  const data = {};
  for (const key of BACKUP_KEYS) {
    data[key] = await loadJSON(key, null);
  }
  return {
    app: "iron-log",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

// Restores a backup. Deliberately strict: a file that isn't a backup, or is
// missing the data block, is rejected rather than half-applied - a partial
// restore would be worse than none at all.
async function restoreBackup(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
    throw new Error("Das ist keine gültige Sicherungsdatei.");
  }
  const keys = Object.keys(parsed.data).filter((k) => BACKUP_KEYS.includes(k));
  if (keys.length === 0) throw new Error("Die Datei enthält keine bekannten Daten.");
  for (const key of keys) {
    // A key present in the file is applied even when its value is null -
    // otherwise a workout still running locally would survive a restore of a
    // state that had none, and keep referring to data that no longer exists.
    // Keys absent from the file (older backup) are left untouched.
    await saveJSON(key, parsed.data[key]);
  }
  return keys.length;
}

function summarizeBackup(parsed) {
  const d = parsed?.data || {};
  const count = (v) => (Array.isArray(v) ? v.length : 0);
  return {
    plans: count(d["training-plans"]),
    logs: count(d["workout-logs"]),
    exercises: count(d["custom-exercises"]),
    folders: count(d["plan-folders"]),
    gyms: count(d["gyms"]),
    exportedAt: parsed?.exportedAt || null,
  };
}

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------

function GroupTag({ group }) {
  const label = MUSCLE_GROUPS.find((g) => g.id === group)?.label || group;
  return <span className="tag">{label}</span>;
}

// Shown next to the main muscle group whenever an exercise has been given a
// more specific subgroup, so the finer categorization is visible at a glance
// in the list rather than only inside the detail sheet.
// Shows the subgroups when an exercise has any, otherwise the main group.
// The subgroup is the more precise information, so repeating "Rücken" next
// to "Lat" only adds noise - filtering by the main group still finds the
// exercise, because that relationship lives in the data, not in this label.
function MuscleTag({ exercise, subgroupOverrides }) {
  const ids = getExerciseSubgroups(exercise, subgroupOverrides);
  if (ids.length === 0) return <GroupTag group={exercise.group} />;
  return <SubgroupTag group={exercise.group} subgroupIds={ids} />;
}

// Short "how long ago" label, e.g. "heute", "vor 3 T.", "vor 2 Wo.".
// Kept terse because it sits next to the plan name on a narrow screen.
// Picks black or white text for a coloured background. A yellow bar with
// white text is unreadable, so the decision follows the actual brightness
// rather than a fixed choice.
function readableTextOn(hex) {
  try {
    const h = String(hex || "").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    if (full.length !== 6) return "#fff";
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    // Perceived brightness: green counts most, blue least.
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? "#1a1a1a" : "#fff";
  } catch (_) {
    return "#fff";
  }
}

function timeAgoShort(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86400000);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} T.`;
  if (days < 31) {
    const w = Math.floor(days / 7);
    return `vor ${w} Wo.`;
  }
  const m = Math.floor(days / 30);
  if (m < 12) return `vor ${m} Mon.`;
  return `vor ${Math.floor(days / 365)} J.`;
}

function SubgroupTag({ group, subgroupId, subgroupIds }) {
  const ids = subgroupIds && subgroupIds.length ? subgroupIds : subgroupId ? [subgroupId] : [];
  if (ids.length === 0) return null;
  const labels = ids
    .map((id) => (SUBGROUPS[group] || []).find((s) => s.id === id)?.label)
    .filter(Boolean);
  if (labels.length === 0) return null;
  return (
    <>
      {labels.map((label) => (
        <span className="tag tag-subgroup" key={label}>{label}</span>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fehlernetz
//
// Ohne dieses Netz macht ein einziger Renderfehler die App vollstaendig
// unbenutzbar: React haengt den kompletten Baum aus, zurueck bleibt ein
// weisser Bildschirm - und weil die Ursache im gespeicherten Datenbestand
// liegt, kommt sie nach jedem Neuladen wieder. Genau dann sind die
// Trainingsdaten aber noch da; wichtiger als eine huebsche Fehlerseite ist
// deshalb, dass man sie von hier aus herausbekommt.
// ---------------------------------------------------------------------------
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Unerwarteter Fehler in der App", error, info);
  }
  async saveBackup() {
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iron-log-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      console.error("Sicherung im Fehlerfall fehlgeschlagen", e);
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", background: "#ffffff", color: "#1c1c1e",
        padding: 24, fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 14,
      }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Da ist etwas schiefgelaufen</div>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: "#6e6e73", margin: 0 }}>
          Deine Trainingsdaten sind noch da. Lade die App neu – wenn der Fehler
          bleibt, sichere die Daten zuerst und stelle sie danach wieder her.
        </p>
        <code style={{
          fontSize: 12, background: "#f4f4f5", padding: "10px 12px",
          borderRadius: 10, wordBreak: "break-word", color: "#6e6e73",
        }}>
          {String(this.state.error?.message || this.state.error)}
        </code>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "13px 16px", borderRadius: 12, border: "none",
            background: "#b25a26", color: "#fff", fontSize: 16, fontWeight: 600,
          }}
        >
          App neu laden
        </button>
        <button
          onClick={() => this.saveBackup()}
          style={{
            padding: "13px 16px", borderRadius: 12, fontSize: 16,
            border: "1px solid rgba(60,60,67,0.32)", background: "transparent", color: "#1c1c1e",
          }}
        >
          Sicherung herunterladen
        </button>
      </div>
    );
  }
}

export default function TrainingApp() {
  return (
    <AppErrorBoundary>
      <TrainingAppInner />
    </AppErrorBoundary>
  );
}

function TrainingAppInner() {
  // Plans is the first thing shown: starting a workout is the most
  // common reason to open the app.
  const [tab, setTab] = useState("dashboard");
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  // Same exercise, different gym, different weights: a leg press at 60kg in
  // one gym is not the leg press at 60kg in another. Tagging each workout
  // with a gym keeps suggestions, PRs and charts from mixing the two.
  const [gyms, setGyms] = useState([]);
  const [activeGymId, setActiveGymId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customExercises, setCustomExercises] = useState([]);
  const [folders, setFolders] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [calendarCategories, setCalendarCategories] = useState([]);
  // Entlastungswochen: je Eintrag der Montag der Woche und - sobald abgegeben -
  // die eigene Schätzung, wie sie gewirkt hat (Regel 1: erst schätzen, dann
  // Zahlen). deloadInterval ist der selbst eingetragene Rhythmus in Wochen;
  // null heißt "kein fester Rhythmus", dann steht nur der Zählerstand da.
  const [deloadWeeks, setDeloadWeeks] = useState([]);
  const [deloadInterval, setDeloadInterval] = useState(null);
  // Welcher Faelligkeits-Zeitpunkt weggetippt wurde. Gespeichert wird der
  // Zeitpunkt, nicht ein blosses "aus": Sobald die naechste Entlastung
  // eingetragen ist, verschiebt sich die Faelligkeit - und der Hinweis kommt
  // beim naechsten Mal von selbst wieder.
  const [deloadSuggestionHiddenAt, setDeloadSuggestionHiddenAt] = useState(null);
  // Widerstandsbänder: Name plus ungefährer kg-Wert. Ohne diese Liste war ein
  // Bandwechsel für die App unsichtbar - Bandübungen wurden ganz ohne Gewicht
  // geführt, ein stärkeres Band bei gleichen Wiederholungen sah aus wie
  // Stillstand, ein schwächeres mit mehr Wiederholungen wie Fortschritt.
  const [bands, setBands] = useState([]);
  // Zählerstand zur Entlastung. Wird an drei Stellen gebraucht - Hinweis auf
  // der Startseite, Vorschlag im Kalender, Karte im Fortschritt -, deshalb
  // einmal hier oben gerechnet.
  const deloadInfo = useMemo(
    () => deloadStatus(deloadWeeks, deloadInterval),
    [deloadWeeks, deloadInterval]
  );
  const deloadSuggestionHidden =
    !!deloadInfo?.dueAt && deloadSuggestionHiddenAt === toDateKey(new Date(deloadInfo.dueAt));
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [exerciseNameOverrides, setExerciseNameOverrides] = useState({});
  const [exerciseSubgroupOverrides, setExerciseSubgroupOverrides] = useState({});
  const [exerciseEquipmentOverrides, setExerciseEquipmentOverrides] = useState({});
  const [timeBasedExercises, setTimeBasedExercises] = useState({});
  const [gymIndependentExercises, setGymIndependentExercises] = useState({});
  const [breathingExercises, setBreathingExercises] = useState([]);
  const [breathingLogs, setBreathingLogs] = useState([]);
  const [breathingManagerOpen, setBreathingManagerOpen] = useState(false);
  // null = Liste, sonst die gerade bearbeitete Übung (ohne id = neu).
  const [breathingEditing, setBreathingEditing] = useState(null);
  // Die laufende Atem-Sitzung. Liegt wie der Pausentimer in der Root-
  // Komponente, damit ein Tabwechsel sie nicht abräumt.
  const [breathingSession, setBreathingSession] = useState(null);

  const [building, setBuilding] = useState(false); // plan builder open
  const [editingPlan, setEditingPlan] = useState(null);
  const [undoDelete, setUndoDelete] = useState(null);
  const undoTimerRef = useRef(null);
  const [session, setSession] = useState(null); // active workout session
  // The rest timer lives up here, not in LogView. LogView is unmounted the
  // moment another tab is opened, which took the running rest with it. Only
  // the target timestamp is kept - the remaining seconds are always derived
  // from "target minus now", so a screen that was off, an app that was in
  // the background and even a full reload all resolve to the correct value.
  const [restEndsAt, setRestEndsAt] = useState(0);
  // Der Ton am Ende der Pause. Gehoert zum Geraet, nicht zum Training -
  // deshalb hier oben und gespeichert: Wer ihn ausschaltet, weil er im Buero
  // trainiert, will ihn nicht beim naechsten Training wieder anhaben.
  const [soundOn, setSoundOn] = useState(true);
  // Das eigene Koerpergewicht - freiwillig, als Liste "ab wann galt was"
  // (siehe bodyWeightEntries). Eine Umrechnungseinheit fuer
  // Koerpergewichts-Uebungen, kein Messwert, den die App auswerten wuerde.
  const [bodyWeights, setBodyWeights] = useState([]);

  // Native window.confirm()/alert() are unreliable inside a sandboxed
  // artifact preview — they can silently no-op, which made every delete
  // action look broken. These replace them with an in-app dialog/toast.
  const [confirmState, setConfirmState] = useState(null); // { message, onConfirm }
  const askConfirm = (message, onConfirm) => setConfirmState({ message, onConfirm });
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const [navHidden, setNavHidden] = useState(false);
  const [theme, setTheme] = useState("light");
  const lastScrollY = useRef(0);
  const handleContentScroll = (e) => {
    const y = e.currentTarget.scrollTop;
    const last = lastScrollY.current;
    if (y < 10) {
      setNavHidden(false);
    } else if (y > last + 6) {
      setNavHidden(true);
    } else if (y < last - 6) {
      setNavHidden(false);
    }
    lastScrollY.current = y;
  };

  useEffect(() => {
    (async () => {
      const [p, l, c, f, en, no, tb, gi, active, prog, activeProg, sg, ce, cc, eq, th, gy, activeGy, restEnd, brEx, brLogs, dw, di, dsh, bnd, snd, bw] = await Promise.all([
        loadJSON("training-plans", []),
        loadJSON("workout-logs", []),
        loadJSON("custom-exercises", []),
        loadJSON("plan-folders", []),
        loadJSON("exercise-notes", {}),
        loadJSON("exercise-name-overrides", {}),
        loadJSON("exercise-time-based", {}),
        loadJSON("exercise-gym-independent", {}),
        loadJSON("active-workout", null),
        loadJSON("training-programs", []),
        loadJSON("active-program-id", null),
        loadJSON("exercise-subgroup-overrides", {}),
        loadJSON("calendar-entries", []),
        loadJSON("calendar-categories", []),
        loadJSON("exercise-equipment-overrides", {}),
        loadJSON("app-theme", "light"),
        loadJSON("gyms", []),
        loadJSON("active-gym-id", null),
        loadJSON("rest-timer", 0),
        loadJSON("breathing-exercises", []),
        loadJSON("breathing-logs", []),
        loadJSON("deload-weeks", []),
        loadJSON("deload-interval", null),
        loadJSON("deload-suggestion-hidden", null),
        loadJSON("resistance-bands", []),
        loadJSON("rest-sound", true),
        loadJSON("body-weight", null),
      ]);
      // Migration: users who already had folders before "programs" existed
      // get one default program that all their existing folders are
      // assigned to, so nothing they built before suddenly disappears.
      let migratedPrograms = prog;
      let migratedFolders = f;
      if (migratedPrograms.length === 0) {
        const defaultProgram = { id: uid(), name: "Mein Programm" };
        migratedPrograms = [defaultProgram];
        migratedFolders = f.map((folder) =>
          folder.programId ? folder : { ...folder, programId: defaultProgram.id }
        );
        await saveJSON("training-programs", migratedPrograms);
        if (migratedFolders !== f) await saveJSON("plan-folders", migratedFolders);
      }
      const resolvedActiveProgramId =
        activeProg && migratedPrograms.some((pr) => pr.id === activeProg)
          ? activeProg
          : migratedPrograms[0]?.id || null;
      setPlans(p);
      setLogs(l);
      setCustomExercises(c);
      setFolders(migratedFolders);
      setExerciseNotes(en);
      setExerciseNameOverrides(no);
      setExerciseSubgroupOverrides(sg);
      setTimeBasedExercises(tb);
      setGymIndependentExercises(gi);
      setBreathingExercises(Array.isArray(brEx) ? brEx : []);
      setBreathingLogs(Array.isArray(brLogs) ? brLogs : []);
      setSession(active ? withEntryIds(active) : null);
      // A rest that already expired while the app was closed is not restored -
      // it would show a dead "0:00" bar with nothing to count down to.
      setRestEndsAt(active && typeof restEnd === "number" && restEnd > Date.now() ? restEnd : 0);
      // Landing on the plans list while a workout is still running means
      // hunting for the way back - on a phone the app gets reloaded between
      // sets often enough that this should just resume where it left off.
      if (active) setTab("log");
      setPrograms(migratedPrograms);
      setActiveProgramId(resolvedActiveProgramId);
      setCalendarEntries(ce);
      setCalendarCategories(cc);
      setDeloadWeeks(Array.isArray(dw) ? dw : []);
      setDeloadInterval(Number.isFinite(Number(di)) && Number(di) > 0 ? Number(di) : null);
      setDeloadSuggestionHiddenAt(typeof dsh === "string" ? dsh : null);
      setBands(Array.isArray(bnd) ? bnd : []);
      setSoundOn(snd !== false);
      setBodyWeights(bodyWeightEntries(bw));
      setGyms(gy);
      setActiveGymId(activeGy && gy.some((g) => g.id === activeGy) ? activeGy : gy[0]?.id || null);
      setExerciseEquipmentOverrides(eq);
      setTheme(th === "light" ? "light" : "dark");
      setLoading(false);
    })();
  }, []);

  // Tapping a number field should let you type the new value straight away
  // instead of clearing the old one first. Selecting the content on focus
  // does that, and leaving without typing keeps the previous value. Done
  // globally so fields added later behave the same way automatically.
  useEffect(() => {
    const selectNumberOnFocus = (e) => {
      const el = e.target;
      if (!el || el.tagName !== "INPUT") return;
      const isNumeric = el.type === "number" || el.inputMode === "decimal";
      if (!isNumeric) return;
      // A frame later, otherwise Safari places the caret after selecting.
      requestAnimationFrame(() => {
        try { el.select(); } catch (_) { /* field already left */ }
      });
    };
    document.addEventListener("focusin", selectNumberOnFocus);
    return () => document.removeEventListener("focusin", selectNumberOnFocus);
  }, []);

  // While a backup is being restored the page reloads on purpose. The
  // unload handler below would otherwise write the still-in-memory workout
  // back to storage and undo part of the restore.
  const restoringRef = useRef(false);

  useEffect(() => {
    const saveOnLeave = () => {
      if (restoringRef.current) return;
      if (session) saveJSON("active-workout", session);
    };
    window.addEventListener("beforeunload", saveOnLeave);
    const onVisibility = () => { if (document.visibilityState === "hidden") saveOnLeave(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("beforeunload", saveOnLeave); document.removeEventListener("visibilitychange", onVisibility); };
  }, [session]);

  const deletePlan = (id) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    askConfirm(`Plan „${plan.name}“ wirklich löschen?`, async () => {
      await persistPlans(plans.filter((p) => p.id !== id));
      setUndoDelete(plan);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoDelete(null), 6000);
    });
  };
  const undoPlanDelete = async () => {
    if (!undoDelete) return;
    await persistPlans([...plans, undoDelete]);
    setUndoDelete(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const persistPlans = async (next) => {
    setPlans(next);
    await saveJSON("training-plans", next);
  };
  const persistLogs = async (next) => {
    setLogs(next);
    await saveJSON("workout-logs", next);
  };
  const persistCustomExercises = async (next) => {
    setCustomExercises(next);
    await saveJSON("custom-exercises", next);
  };
  const persistFolders = async (next) => {
    setFolders(next);
    await saveJSON("plan-folders", next);
  };
  const persistPrograms = async (next) => {
    setPrograms(next);
    await saveJSON("training-programs", next);
  };
  const persistActiveProgramId = async (id) => {
    setActiveProgramId(id);
    await saveJSON("active-program-id", id);
  };
  const persistCalendarEntries = async (next) => {
    setCalendarEntries(next);
    await saveJSON("calendar-entries", next);
  };
  const persistDeloadWeeks = async (next) => {
    setDeloadWeeks(next);
    await saveJSON("deload-weeks", next);
  };
  // Einen Zeitraum als Entlastung eintragen. Zwei Tage, in beliebiger
  // Reihenfolge angetippt - Montag bis Sonntag ist ein möglicher Zeitraum,
  // aber kein vorgeschriebener.
  const addDeloadRange = async (fromDate, toDate) => {
    const a = fromDate instanceof Date ? fromDate : dateFromKey(fromDate);
    const b = (toDate instanceof Date ? toDate : dateFromKey(toDate)) || a;
    if (!a || !b) return;
    const [von, bis] = b.getTime() < a.getTime() ? [b, a] : [a, b];
    const startKey = toDateKey(von);
    const endKey = toDateKey(bis);
    // Überschneidet der neue Zeitraum bestehende, ersetzt er sie - sonst
    // entstünden zwei Einträge für dieselben Tage, die sich in jeder
    // Auswertung doppelt auswirken.
    const behalten = deloadRanges(deloadWeeks).filter(
      (r) => r.endTs <= von.getTime() || r.startTs > bis.getTime()
    );
    await persistDeloadWeeks([
      ...behalten.map((r) => ({ id: r.id, start: r.start, end: r.end, guess: r.guess })),
      { id: uid(), start: startKey, end: endKey, guess: null },
    ]);
    const tage = Math.round((bis.getTime() - von.getTime()) / 86400000) + 1;
    showToast(`Entlastung eingetragen: ${tage} ${tage === 1 ? "Tag" : "Tage"}`);
  };
  // Den Zeitraum entfernen, in dem dieser Tag liegt.
  const removeDeloadAt = async (date) => {
    const d = date instanceof Date ? date : dateFromKey(date);
    if (!d) return;
    const ts = d.getTime();
    const bleibt = deloadRanges(deloadWeeks).filter((r) => !(ts >= r.startTs && ts < r.endTs));
    if (bleibt.length === deloadRanges(deloadWeeks).length) return;
    await persistDeloadWeeks(
      bleibt.map((r) => ({ id: r.id, start: r.start, end: r.end, guess: r.guess }))
    );
    showToast("Entlastung entfernt");
  };
  // Die eigene Schätzung zu einer Entlastung, bevor die Zahlen dazu sichtbar
  // werden.
  const setDeloadGuess = async (start, guess) => {
    await persistDeloadWeeks(
      deloadRanges(deloadWeeks).map((r) =>
        r.start === start
          ? { id: r.id, start: r.start, end: r.end, guess }
          : { id: r.id, start: r.start, end: r.end, guess: r.guess }
      )
    );
  };
  const hideDeloadSuggestion = async () => {
    const key = deloadInfo?.dueAt ? toDateKey(new Date(deloadInfo.dueAt)) : null;
    if (!key) return;
    setDeloadSuggestionHiddenAt(key);
    await saveJSON("deload-suggestion-hidden", key);
  };
  const persistBands = async (next) => {
    setBands(next);
    await saveJSON("resistance-bands", next);
  };
  const persistDeloadInterval = async (next) => {
    setDeloadInterval(next);
    await saveJSON("deload-interval", next);
  };
  const persistGyms = async (next) => {
    setGyms(next);
    await saveJSON("gyms", next);
  };
  const persistActiveGymId = async (id) => {
    setActiveGymId(id);
    await saveJSON("active-gym-id", id);
  };

  const persistCalendarCategories = async (next) => {
    setCalendarCategories(next);
    await saveJSON("calendar-categories", next);
  };
  const persistExerciseNotes = async (next) => {
    setExerciseNotes(next);
    await saveJSON("exercise-notes", next);
  };
  const persistExerciseNameOverrides = async (next) => {
    setExerciseNameOverrides(next);
    await saveJSON("exercise-name-overrides", next);
  };
  const persistExerciseSubgroupOverrides = async (next) => {
    setExerciseSubgroupOverrides(next);
    await saveJSON("exercise-subgroup-overrides", next);
  };
  const persistExerciseEquipmentOverrides = async (next) => {
    setExerciseEquipmentOverrides(next);
    await saveJSON("exercise-equipment-overrides", next);
  };
  const persistTimeBasedExercises = async (next) => {
    setTimeBasedExercises(next);
    await saveJSON("exercise-time-based", next);
  };
  const persistGymIndependentExercises = async (next) => {
    setGymIndependentExercises(next);
    await saveJSON("exercise-gym-independent", next);
  };
  const persistBreathingExercises = async (next) => {
    setBreathingExercises(next);
    await saveJSON("breathing-exercises", next);
  };
  const persistBreathingLogs = async (next) => {
    setBreathingLogs(next);
    await saveJSON("breathing-logs", next);
  };

  const createSessionFromPlan = (plan, gymId = null) => ({
    id: uid(),
    planId: plan.id,
    planName: plan.name,
    gymId: gymId || null,
    date: new Date().toISOString(),
    // Defensiv: ein Plan aus einer beschaedigten oder aelteren Sicherung
    // kann ohne items ankommen. Ein ungeschuetztes .map() darauf reisst die
    // gesamte App in einen weissen Bildschirm, aus dem es keinen Weg zurueck
    // gibt - der Plan liegt ja weiter im Speicher.
    entries: (Array.isArray(plan?.items) ? plan.items : []).map((it) => {
      const targetSets = it.sets || 1;
      // Start from what was actually achieved last time rather than the
      // numbers stored in the plan - the plan holds the starting point, the
      // last workout holds the current state. With a gym selected the search
      // prefers that gym (weights differ between gyms) - unless the exercise
      // is marked as being the same everywhere.
      const history = getExerciseHistory(
        logs, it.exerciseId, null, !!it.useTime,
        effectiveGymId(it.exerciseId, gymId, gymIndependentExercises)
      );
      const lastWorking = history?.lastSets?.find((set) => !set.warmup);
      const targetReps =
        lastWorking && toNum(lastWorking.reps) > 0 ? toNum(lastWorking.reps) : it.reps || 10;
      const targetWeight =
        lastWorking && toNum(lastWorking.weight) > 0
          ? toNum(lastWorking.weight)
          : it.weight || 0;
      const targetUseTime = !!it.useTime;
      const targetDuration =
        lastWorking && toNum(lastWorking.duration) > 0
          ? toNum(lastWorking.duration)
          : it.duration || 0;
      // Pre-create the number of sets the plan asks for, already filled
      // in with the target reps/weight/duration, so a workout starts
      // ready-to-go instead of empty every time.
      // Planned warm-up sets come first and start already flagged, so the
      // "W" no longer has to be tapped on every single workout.
      const warmupCount = Math.max(0, Math.round(toNum(it.warmupSets)));
      // Each set gets the values of the SAME set from last time - set 1 from
      // set 1, set 2 from set 2. A pyramid (60/70/80) would otherwise start
      // every set at the first weight. Beyond the sets done last time the
      // last known values carry on.
      const lastWorkingSets = (history?.lastSets || []).filter((set) => !set.warmup);
      const makeSet = (warmup, index) => {
        const ref = lastWorkingSets.length
          ? lastWorkingSets[Math.min(index, lastWorkingSets.length - 1)]
          : null;
        const reps = ref && toNum(ref.reps) > 0 ? toNum(ref.reps) : targetReps;
        const weight = ref && toNum(ref.weight) > 0 ? toNum(ref.weight) : targetWeight;
        const duration = ref && toNum(ref.duration) > 0 ? toNum(ref.duration) : targetDuration;
        return {
          reps,
          // Pre-filled the German way too, so a workout doesn't start showing
          // "62.5" and only switch to "62,5" once the field has been touched.
          weight: warmup ? 0 : fmtDecimal(weight),
          // Eine Dauer bekommt nur, was auch in Sekunden gemessen wird.
          //
          // Vorher trug JEDER Satz eine Dauer mit sich - die Plan-Vorgabe
          // steht auf 30 Sekunden, auch bei reinen Wiederholungs-Uebungen.
          // Diese 30 landeten im Training, wurden mitgespeichert und tauchten
          // ueberall als "30s" statt "60kg x 8" auf. Schlimmer noch: Beim
          // naechsten Mal wurde die gespeicherte Dauer wieder vorgetragen
          // (siehe ref oben), womit sich der Fehler selbst am Leben hielt.
          duration: targetUseTime ? duration : 0,
          done: false,
          warmup,
        };
      };
      const sets = [
        ...Array.from({ length: warmupCount }, () => makeSet(true, 0)),
        ...Array.from({ length: targetSets }, (_, i) => makeSet(false, i)),
      ];
      return {
        id: uid(),
        // Woher dieser Platz stammt. Ohne das liesse sich beim Beenden nicht
        // sagen, welcher von zwei gleichen Plan-Eintraegen gemeint ist.
        planItemId: it.id || null,
        exerciseId: it.exerciseId,
        targetSets,
        targetReps,
        targetWeight,
        targetUseTime,
        targetDuration,
        supersetWithNext: !!it.supersetWithNext,
        // Rest per exercise comes from the plan; null means "use the
        // workout-wide value" and is a meaningful state, so it is kept.
        restSeconds: it.restSeconds != null ? it.restSeconds : null,
        autoRun: it.autoRun === true || it.autoRun === false ? it.autoRun : null,
        autoSeconds: it.autoSeconds != null ? it.autoSeconds : null,
        sets,
        // Pre-filled with the exercise's permanent note so what you wrote
        // last time is there again instead of an empty box.
        notes: exerciseNotes[it.exerciseId] || "",
      };
    }),
    restSeconds: plan.restSeconds != null ? plan.restSeconds : 90,
    autoRun: !!plan.autoRun,
    autoSetSeconds: plan.autoSetSeconds != null ? plan.autoSetSeconds : 30,
    autoOrder: plan.autoOrder || "circuit",
    roundRestSeconds: plan.roundRestSeconds != null ? plan.roundRestSeconds : 60,
    notes: "",
    startedAt: new Date().toISOString(),
  });

  const startSession = async (plan, calendarEntryId = null, gymId = undefined) => {
    const next = createSessionFromPlan(plan, gymId === undefined ? activeGymId : gymId);
    if (calendarEntryId) next.calendarEntryId = calendarEntryId;
    setSession(next);
    await updateRestEndsAt(0);
    await saveJSON("active-workout", next);
  };

  const updateSession = async (next) => {
    setSession(next);
    await saveJSON("active-workout", next);
  };

  const updateRestEndsAt = async (endsAt) => {
    const value = typeof endsAt === "number" && endsAt > Date.now() ? endsAt : 0;
    setRestEndsAt(value);
    await saveJSON("rest-timer", value);
  };

  const persistBodyWeights = async (next) => {
    const sauber = bodyWeightEntries(next).map(({ id, date, kg }) => ({ id, date, kg }));
    setBodyWeights(bodyWeightEntries(sauber));
    await saveJSON("body-weight", sauber);
  };
  // Ein neuer Wert ersetzt einen zum selben Datum - sonst stapeln sich
  // Korrekturen desselben Tages.
  const addBodyWeight = async (kg, dateKey) => {
    const n = toNum(kg);
    if (!(n > 0)) return;
    const datum = dateKey || toDateKey(new Date());
    await persistBodyWeights([
      ...bodyWeights.filter((e) => e.date !== datum),
      { id: uid(), date: datum, kg: n },
    ]);
  };
  const removeBodyWeight = async (id) => {
    await persistBodyWeights(bodyWeights.filter((e) => e.id !== id));
  };

  const updateSoundOn = async (value) => {
    setSoundOn(!!value);
    await saveJSON("rest-sound", !!value);
  };

  // restoreOriginal nur beim VERWERFEN: Beim Beenden ist das bearbeitete
  // Training gerade eben gespeichert worden, und das Original noch einmal
  // dazuzulegen ergaebe es doppelt.
  const clearActiveSession = async ({ restoreOriginal = false } = {}) => {
    // Ein bearbeitetes Training verwerfen heisst: die Aenderungen verwerfen,
    // nicht das Training. Das Original kommt zurueck in den Verlauf.
    const original = restoreOriginal ? session?.resumedFromLog : null;
    if (original?.id && !logs.some((l) => l.id === original.id)) {
      await persistLogs([...logs, original]);
      showToast(`Änderungen verworfen – Training vom ${fmtDate(original.date)} unverändert`);
    }
    setSession(null);
    // Der Reiter "Training" hat ohne Sitzung nichts mehr zu zeigen - wer nach
    // dem Beenden dort stehen bliebe, sähe eine leere Seite.
    setTab((t) => (t === "log" ? "dashboard" : t));
    await updateRestEndsAt(0);
    await saveJSON("active-workout", null);
  };

  const allPlans = plans;
  const allExercises = [...EXERCISES, ...customExercises].map((e) =>
    exerciseNameOverrides[e.id] ? { ...e, name: exerciseNameOverrides[e.id] } : e
  );
  const allExBy = Object.fromEntries(allExercises.map((e) => [e.id, e]));

  const handleUpdateExerciseNote = async (exerciseId, note) => {
    await persistExerciseNotes({ ...exerciseNotes, [exerciseId]: note });
  };
  const handleRenameExercise = async (exerciseId, name) => {
    await persistExerciseNameOverrides({ ...exerciseNameOverrides, [exerciseId]: name });
  };
  // subgroupId === null clears every assignment; otherwise the given
  // subgroup is toggled, so an exercise can belong to several at once.
  const handleSetExerciseSubgroup = async (exerciseId, subgroupId) => {
    const next = { ...exerciseSubgroupOverrides };
    if (!subgroupId) {
      delete next[exerciseId];
    } else {
      const raw = next[exerciseId];
      const current = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];
      const updated = current.includes(subgroupId)
        ? current.filter((id) => id !== subgroupId)
        : [...current, subgroupId];
      if (updated.length === 0) delete next[exerciseId];
      else next[exerciseId] = updated;
    }
    await persistExerciseSubgroupOverrides(next);
  };
  // Sets the complete subgroup list in one call, instead of toggling one at
  // a time like handleSetExerciseSubgroup above. Needed for a freshly
  // created exercise with several subgroups chosen at once: calling the
  // toggle handler once per subgroup would fire multiple synchronous state
  // updates that all read the same stale exerciseSubgroupOverrides closure,
  // so every call but the last would be silently lost.
  const handleSetExerciseSubgroups = async (exerciseId, subgroupIds) => {
    const next = { ...exerciseSubgroupOverrides };
    if (!subgroupIds || subgroupIds.length === 0) delete next[exerciseId];
    else next[exerciseId] = subgroupIds;
    await persistExerciseSubgroupOverrides(next);
  };
  const handleSetExerciseEquipment = async (exerciseId, equipment) => {
    await persistExerciseEquipmentOverrides({ ...exerciseEquipmentOverrides, [exerciseId]: equipment });
  };
  const handleToggleTimeBased = async (exerciseId, enabled) => {
    await persistTimeBasedExercises({ ...timeBasedExercises, [exerciseId]: enabled });
  };
  const handleToggleGymIndependent = async (exerciseId, enabled) => {
    await persistGymIndependentExercises({ ...gymIndependentExercises, [exerciseId]: enabled });
  };
  const handleAddCustomExercise = async (exercise) => {
    await persistCustomExercises([...customExercises, exercise]);
  };

  // Activities are training too, just a kind the workout logger cannot hold:
  // a walk to work, breathing drills, tendon rehab. They get the two things
  // that make an entry a diary record instead of a note - an optional
  // duration and a "done" mark - without the detour through exercises and
  // sets. durationMinutes/doneAt stay absent on older entries, which read
  // as "no duration" and "not done" without any migration.
  const addCalendarAction = async (date, categoryId, text, durationMinutes) => {
    await persistCalendarEntries([
      ...calendarEntries,
      {
        id: uid(),
        date,
        type: "action",
        categoryId,
        text,
        durationMinutes: durationMinutes || null,
        doneAt: null,
      },
    ]);
  };
  // One tap marks an activity as done or undone. The timestamp is kept
  // rather than a plain boolean so a later "what did I do when" view has
  // something to work with.
  const toggleCalendarActionDone = async (id) => {
    await persistCalendarEntries(
      calendarEntries.map((ce) =>
        ce.id === id ? { ...ce, doneAt: ce.doneAt ? null : new Date().toISOString() } : ce
      )
    );
  };
  const scheduleCalendarWorkout = async (date, planId) => {
    await persistCalendarEntries([
      ...calendarEntries,
      { id: uid(), date, type: "workout", planId, logId: null },
    ]);
  };
  // Atemübungen im Kalender funktionieren genau wie Workouts: geplant mit
  // logId null, nach dem Abschluss zeigt logId auf die absolvierte Sitzung.
  const scheduleCalendarBreathing = async (date, breathingId) => {
    await persistCalendarEntries([
      ...calendarEntries,
      { id: uid(), date, type: "breathing", breathingId, logId: null },
    ]);
  };

  const saveBreathingExercise = async (exercise) => {
    const exists = breathingExercises.some((b) => b.id === exercise.id);
    await persistBreathingExercises(
      exists
        ? breathingExercises.map((b) => (b.id === exercise.id ? exercise : b))
        : [...breathingExercises, exercise]
    );
  };
  const deleteBreathingExercise = (id) => {
    const ex = breathingExercises.find((b) => b.id === id);
    askConfirm(
      `Atemübung „${ex?.name || ""}“ löschen? Bereits absolvierte Sitzungen bleiben im Verlauf erhalten.`,
      async () => {
        await persistBreathingExercises(breathingExercises.filter((b) => b.id !== id));
      }
    );
  };
  const startBreathingSession = (exercise, calendarEntryId = null) => {
    if (breathingPhases(exercise).length === 0) {
      showToast("Diese Atemübung hat noch keine Phasen.");
      return;
    }
    setBreathingManagerOpen(false);
    setBreathingSession({ exercise, calendarEntryId, startedAt: Date.now() });
  };
  // Abschluss einer Atem-Sitzung: Protokoll schreiben und - wie beim
  // Training - einen offenen Kalendereintrag von heute automatisch abhaken,
  // egal ob die Übung über den Kalender oder direkt gestartet wurde. Gibt es
  // für heute noch gar keinen Eintrag (Übung direkt gestartet, nie geplant),
  // wird einer nachgetragen - schon als erledigt markiert, damit der Tag im
  // Kalender die tatsächlich absolvierte Übung zeigt statt leer zu bleiben.
  const finishBreathingSession = async ({ exercise, calendarEntryId, startedAt, completedRounds, maxHoldSeconds }) => {
    const log = {
      id: uid(),
      breathingId: exercise.id,
      name: exercise.name,
      date: new Date().toISOString(),
      rounds: completedRounds,
      plannedRounds: breathingRounds(exercise),
      durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
      // null statt 0, wenn die Übung gar keine offene Phase hatte - "nicht
      // gemessen" ist etwas anderes als "0 Sekunden gehalten".
      maxHoldSeconds: maxHoldSeconds > 0 ? Math.round(maxHoldSeconds) : null,
    };
    await persistBreathingLogs([...breathingLogs, log]);
    const dayKey = toDateKey(new Date(log.date));
    const match =
      calendarEntries.find((ce) => ce.id === calendarEntryId) ||
      calendarEntries.find(
        (ce) =>
          ce.type === "breathing" &&
          !ce.logId &&
          ce.date === dayKey &&
          ce.breathingId === exercise.id
      );
    if (match) {
      await persistCalendarEntries(
        calendarEntries.map((ce) => (ce.id === match.id ? { ...ce, logId: log.id } : ce))
      );
    } else {
      await persistCalendarEntries([
        ...calendarEntries,
        { id: uid(), date: dayKey, type: "breathing", breathingId: exercise.id, logId: log.id },
      ]);
    }
    setBreathingSession(null);
  };
  // Eine Atemübung nachtragen: legt ein echtes Protokoll an (damit es in allen
  // Statistiken zählt) und hängt es als erledigten Kalendereintrag an den Tag.
  const addBreathingLogManually = async (dateKey, { breathingId, name, minutes, holdSeconds }) => {
    const ex = breathingExercises.find((b) => b.id === breathingId) || null;
    const tag = dateFromKey(dateKey) || new Date();
    // Mittags statt Mitternacht: So kann keine Zeitzonen-Verschiebung den
    // Eintrag auf den Vortag rutschen lassen.
    const date = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), 12, 0, 0).toISOString();
    const runden = ex ? breathingRounds(ex) : null;
    const log = {
      id: uid(),
      breathingId: ex ? ex.id : null,
      name: ex ? ex.name : name || "Freie Atemübung",
      date,
      rounds: runden,
      plannedRounds: runden,
      durationSeconds: Math.max(0, Math.round(toNum(minutes) * 60)),
      maxHoldSeconds: toNum(holdSeconds) > 0 ? Math.round(toNum(holdSeconds)) : null,
      // Merkt sich, dass die Sitzung nicht in der App gelaufen ist - die
      // Dauer ist damit eine Angabe, keine Messung.
      manual: true,
    };
    await persistBreathingLogs([...breathingLogs, log]);
    await persistCalendarEntries([
      ...calendarEntries,
      { id: uid(), date: dateKey, type: "breathing", breathingId: log.breathingId, logId: log.id },
    ]);
    showToast("Atemübung nachgetragen");
  };
  // Moving an entry to another day, swapping its linked plan/exercise, or
  // editing an action's category/text/duration all go through this one
  // patch-merge - only entries that have not happened yet ever reach it
  // (the edit button itself is hidden once logId is set).
  const updateCalendarEntry = async (id, patch) => {
    await persistCalendarEntries(
      calendarEntries.map((ce) => (ce.id === id ? { ...ce, ...patch } : ce))
    );
  };
  // Calendar deletions go through the same confirmation step as deleting a
  // plan or a folder, so a mis-tap can't silently wipe an entry.
  const deleteCalendarEntry = (id) => {
    const entry = calendarEntries.find((ce) => ce.id === id);
    const label =
      entry?.type === "workout"
        ? `Diesen Workout-Termin wirklich aus dem Kalender entfernen?`
        : entry?.type === "breathing"
        ? `Diese Atemübung wirklich aus dem Kalender entfernen?`
        : `Eintrag „${entry?.text || ""}“ wirklich löschen?`;
    askConfirm(label, async () => {
      await persistCalendarEntries(calendarEntries.filter((ce) => ce.id !== id));
    });
  };
  const createCalendarCategory = async (name, color) => {
    await persistCalendarCategories([...calendarCategories, { id: uid(), name, color }]);
  };
  const deleteCalendarCategory = (id) => {
    const category = calendarCategories.find((c) => c.id === id);
    const affected = calendarEntries.filter((ce) => ce.categoryId === id).length;
    const suffix = affected
      ? ` ${affected} Eintrag${affected === 1 ? "" : "e"} bleibt dann ohne Kategorie.`
      : "";
    askConfirm(`Kategorie „${category?.name || ""}“ wirklich löschen?${suffix}`, async () => {
      await persistCalendarCategories(calendarCategories.filter((c) => c.id !== id));
      // Entries in a deleted category become uncategorized rather than
      // silently disappearing.
      await persistCalendarEntries(
        calendarEntries.map((ce) => (ce.categoryId === id ? { ...ce, categoryId: null } : ce))
      );
    });
  };
  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await saveJSON("app-theme", next);
  };

  // Die Statusleiste des iPhones faerbt sich nach diesem Meta-Tag. Ohne
  // Nachfuehren bliebe oben ein dunkler Streifen ueber der hellen App stehen.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
  }, [theme]);
  // Turns a finished workout back into an editable session. The log is
  // removed from the history for the duration - finishing writes it back,
  // discarding restores nothing, which matches "the workout is running again".
  const resumeLog = async (log, mode = "resume") => {
    if (session) {
      askConfirm(
        "Es läuft bereits ein Training. Erst beenden oder verwerfen, dann kann dieses fortgesetzt werden.",
        () => {}
      );
      return;
    }
    // "resume" picks the clock back up where it stopped: the original start
    // is shifted so the elapsed time continues from the recorded duration.
    // "edit" freezes it - correcting a typo should not inflate the workout.
    const minutes = Math.max(0, Number(log.durationMinutes) || 0);
    const restored = {
      ...log,
      startedAt: mode === "edit"
        ? null
        : new Date(Date.now() - minutes * 60000).toISOString(),
      frozenDurationMinutes: mode === "edit" ? minutes : null,
      resumedFrom: log.id,
      // Das unveraenderte Original wandert mit in die Sitzung. Ohne das war
      // "Verwerfen" beim Bearbeiten eines alten Trainings ein endgueltiges
      // Loeschen: Der Eintrag wurde hier aus dem Verlauf genommen, und wer
      // danach abbrach, hatte ihn fuer immer verloren - waehrend die
      // Rueckfrage beruhigend "alle nicht gespeicherten Saetze" sagte.
      // In der Sitzung gespeichert und nicht nur im Arbeitsspeicher, damit es
      // auch einen Neustart des Handys ueberlebt.
      resumedFromLog: log,
    };
    await persistLogs(logs.filter((l) => l.id !== log.id));
    const withIds = withEntryIds(restored);
    setSession(withIds);
    await saveJSON("active-workout", withIds);
    setTab("log");
  };

  const startScheduledWorkout = async (plan, calendarEntryId) => {
    requestStart(plan, calendarEntryId);
  };

  // Asking which gym before the workout begins is what makes the whole
  // thing work: it is the only moment where the answer is certain, and
  // everything downstream (suggestions, PRs, charts) depends on it.
  const [pendingStart, setPendingStart] = useState(null);
  const [gymManagerOpen, setGymManagerOpen] = useState(false);
  // Set when jumping from the calendar into the history, so that log opens
  // straight away instead of leaving you to search for it.
  const [historyFocusLogId, setHistoryFocusLogId] = useState(null);
  const [finishSummary, setFinishSummary] = useState(null);
  // Das Gefuehl wird nach dem Speichern nachgetragen, damit das Beenden des
  // Trainings nicht an einer zusaetzlichen Frage haengt.
  const setLogFeeling = async (logId, feeling) => {
    setFinishSummary((prev) => (prev ? { ...prev, feeling } : prev));
    await persistLogs(logs.map((l) => (l.id === logId ? { ...l, feeling } : l)));
  };
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);
  const backupFileRef = useRef(null);

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const backup = await buildBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iron-log-sicherung-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give Safari a moment to pick up the blob before it is released.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      const s = summarizeBackup(backup);
      setBackupMessage({
        kind: "ok",
        text: `Sicherung erstellt: ${plural(s.plans, "Plan", "Pläne")}, ${plural(s.logs, "Training", "Trainings")}, ${plural(s.exercises, "eigene Übung", "eigene Übungen")}.`,
      });
    } catch (e) {
      setBackupMessage({ kind: "error", text: "Sicherung fehlgeschlagen: " + e.message });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const info = summarizeBackup(parsed);
      // Confirm with real numbers from the file, so it is obvious what is
      // about to replace the current data.
      askConfirm(
        `Sicherung einspielen? Enthalten sind ${info.plans} Pläne, ${info.logs} absolvierte Trainings und ${info.exercises} eigene Übungen. Deine aktuellen Daten werden dabei ersetzt.`,
        async () => {
          try {
            restoringRef.current = true;
            await restoreBackup(parsed);
            window.location.reload();
          } catch (e) {
            restoringRef.current = false;
            setBackupMessage({ kind: "error", text: e.message });
          }
        }
      );
    } catch (e) {
      setBackupMessage({
        kind: "error",
        text: "Datei konnte nicht gelesen werden. Ist es eine Sicherungsdatei dieser App?",
      });
    } finally {
      setBackupBusy(false);
      if (backupFileRef.current) backupFileRef.current.value = "";
    }
  };
  // Ist im Abschluss-Fenster das Nachtrag-Formular für eine Atemübung offen?
  const [finishBreathingOpen, setFinishBreathingOpen] = useState(false);
  const [bandManagerOpen, setBandManagerOpen] = useState(false);
  const [bodyWeightOpen, setBodyWeightOpen] = useState(false);
  const [bodyWeightDraft, setBodyWeightDraft] = useState("");
  const [bodyWeightDate, setBodyWeightDate] = useState("");
  // Der Wert, der heute gilt - fuer die Anzeige im Menue.
  const bodyWeightNow = useMemo(() => bodyWeightAt(bodyWeights, Date.now()), [bodyWeights]);
  const [bandDraft, setBandDraft] = useState({ name: "", kg: "" });
  const [renamingBandId, setRenamingBandId] = useState(null);
  const [gymDraftName, setGymDraftName] = useState("");
  const [renamingGymId, setRenamingGymId] = useState(null);
  const [newGymName, setNewGymName] = useState("");
  const requestStart = (plan, calendarEntryId = null) => {
    setPendingStart({ plan, calendarEntryId });
    setNewGymName("");
  };
  const confirmStart = async (gymId) => {
    if (!pendingStart) return;
    if (gymId) await persistActiveGymId(gymId);
    await startSession(pendingStart.plan, pendingStart.calendarEntryId, gymId);
    setPendingStart(null);
    setTab("log");
  };
  const createGymAndStart = async () => {
    const name = newGymName.trim();
    if (!name) return;
    const gym = { id: uid(), name };
    await persistGyms([...gyms, gym]);
    await confirmStart(gym.id);
  };

  return (
    <div className={`app-shell ${theme === "light" ? "theme-light" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600;700&display=swap');

        /* Farbwelt: neutrale Flaechen, Trennung durch Haarlinien statt
           durch Kaesten. Die Akzentfarbe ist ausschliesslich fuer
           Bedienelemente da (Knoepfe, aktiver Reiter, Links) - Zahlen und
           Ueberschriften stehen in der normalen Textfarbe, Rot/Gelb bleiben
           den Belastungssignalen vorbehalten.
           Hier stehen die Werte des dunklen Modus; der helle Modus (Standard)
           ueberschreibt sie direkt darunter. */
        :root {
          --bg: #000000;
          --surface: #000000;
          --surface-alt: #161616;
          /* Schwebende Ebenen (Modal, Sheet, Menue) heben sich vom Grund ab. */
          --elevated: #1c1c1e;
          --border: rgba(255,255,255,0.14);
          --border-strong: rgba(255,255,255,0.30);
          --text: #f5f5f7;
          --text-dim: #98989d;
          --text-faint: #616166;
          --accent: #dd8442;
          --accent-dim: #a8632f;
          --brass: #d3a63f;
          --success: #79ac6d;
          --danger: #e0705c;
          --fill: rgba(255,255,255,0.07);
          /* Bank hinter einer markierten Entlastung. Bewusst ein eigener Wert
             und nicht --fill oder --surface-alt: Auf schwarzem Grund sind
             beide so dunkel, dass die Markierung praktisch verschwindet. */
          --deload-band: rgba(255,255,255,0.13);
          --shadow-strength: 0.5;
          /* Diagrammfarben: gedaempft und untereinander abgestimmt. */
          --chart-accent: #dd8442;
          --chart-gold: #d3a63f;
          --chart-teal: #6fb0c0;
          --chart-violet: #a493cf;
          --chart-green: #85b078;
          --chart-green-2: #5f8f6a;
        }
        .app-shell.theme-light {
          color-scheme: light;
          --bg: #ffffff;
          --surface: #ffffff;
          --surface-alt: #f4f4f5;
          --elevated: #ffffff;
          --border: rgba(60,60,67,0.15);
          --border-strong: rgba(60,60,67,0.32);
          --text: #1c1c1e;
          --text-dim: #6e6e73;
          --text-faint: #a3a3a8;
          --accent: #b25a26;
          --accent-dim: #8f4a22;
          --brass: #a67c14;
          --success: #3f7a4e;
          --danger: #c0402e;
          --fill: rgba(60,60,67,0.06);
          --deload-band: rgba(60,60,67,0.11);
          --shadow-strength: 0.10;
          --chart-accent: #b25a26;
          --chart-gold: #9a7414;
          --chart-teal: #41707d;
          --chart-violet: #6f5f92;
          --chart-green: #4f7a48;
          --chart-green-2: #3c6b52;
        }

        * { box-sizing: border-box; }

        .app-shell {
          /* Sagt dem Browser, in welchem Modus er seine eigenen Bedienelemente
             zeichnen soll - sonst bleiben Zahlenfeld-Pfeile und Scrollbalken
             im dunklen Modus hell. */
          color-scheme: dark;
          /* Die Seite laeuft wegen viewport-fit=cover bis unter die
             Statusleiste. Unten war der Abstand schon beruecksichtigt, oben
             fehlte er - dadurch lag die Kopfzeile unter Uhrzeit und
             Empfangsanzeige und war nicht antippbar. */
          padding-top: env(safe-area-inset-top);
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          width: 100%;
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          /* Kein Rahmen und keine abgerundeten Ecken mehr: die App soll
             randlos wirken wie eine native App, nicht wie eine Seite in
             einem Kasten. */
          overflow: hidden;
          position: relative;
        }

        .content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 8px 20px 90px;
        }
        /* Die Trainings-Leiste sitzt über der Navigation und würde sonst den
           letzten Inhalt der Seite verdecken. */
        .content.with-session-bar {
          padding-bottom: 132px;
        }

        /* Das versteckte Trainings-Panel (siehe Kommentar am Rendern der
           Trainingsansicht) darf keinen Platz einnehmen. Explizit, damit
           keine spaetere display-Regel das hidden-Attribut aushebelt. */
        .tab-panel[hidden] { display: none !important; }
        .tab-panel {
          /* No "both"/"forwards" fill-mode: leaving a lingering (even
             no-op) transform value on this element after the animation
             ends turns it into a new positioning context for any
             position:absolute descendant — e.g. the exercise detail sheet
             overlay — anchoring it to this element's full (often very
             tall, scrollable) height instead of the visible screen, and
             pushing the sheet itself off-screen. Once the 180ms animation
             finishes, "transform" reverts to none and that problem goes
             away, with no visible difference in the fade-in itself. */
          animation: tab-fade-in 180ms ease;
        }
        @keyframes tab-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Textreiter mit Unterstrich statt Kaesten - dieselbe Sprache wie
           die Abschnittslinien darunter. */
        .sub-tab-row {
          display: flex;
          gap: 24px;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--border-strong);
        }
        .sub-tab {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          color: var(--text-dim);
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 4px 0 10px;
          border-radius: 0;
          cursor: pointer;
          transition: color 120ms ease, border-color 120ms ease;
        }
        .sub-tab.active {
          color: var(--text);
          background: none;
          border-bottom-color: var(--accent);
        }
        .sub-tab:active {
          transform: scale(0.97);
        }

        .history-card {
          cursor: pointer;
          transition: transform 100ms ease, border-color 120ms ease;
        }
        .history-card:active {
          transform: scale(0.985);
        }
        .history-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .history-card-date {
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .history-card-meta {
          display: flex;
          align-items: center;
          /* Umbrechen als ganze Angaben, nicht innerhalb einer Angabe: Sobald
             die Zeile zu voll wird (zweistellige Rekordzahl reicht schon),
             quetschte sie sonst jede einzelne Angabe auf zwei Zeilen -
             "5 / Übungen", "19 / Sätze", "55 / Min." untereinander. Jetzt
             rutscht die letzte Angabe als Ganzes in die nächste Zeile. */
          flex-wrap: wrap;
          gap: 4px 10px;
          font-size: 11.5px;
          color: var(--text-dim);
          margin-top: 4px;
        }
        .history-card-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .history-exercise-list {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .history-exercise-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12.5px;
        }
        .history-exercise-row .ex-name-clickable {
          font-weight: 500;
        }
        /* Uebungsname und Pokal gehoeren zusammen und stehen links; die
           Satzzusammenfassung bleibt rechts (space-between der Zeile). */
        .history-exercise-name {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .pr-trophy {
          background: var(--fill);
          border: 1px solid var(--border);
          color: var(--brass);
          border-radius: 999px;
          padding: 2px 6px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
        }
        .pr-trophy.active {
          border-color: var(--brass);
          background: transparent;
        }
        .history-pr-count {
          color: var(--brass);
        }
        .history-pr-list {
          margin: 4px 0 2px;
          padding-left: 18px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-dim);
        }
        .history-set-summary {
          color: var(--text-dim);
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 12px;
        }
        .history-session-notes {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          font-size: 12.5px;
          color: var(--text-dim);
          font-style: italic;
        }


        .tag {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          letter-spacing: 0.1px;
          background: var(--fill);
          color: var(--text-dim);
          padding: 3px 9px;
          border-radius: 999px;
          border: none;
        }
        .tag-subgroup {
          background: transparent;
          border: none;
          color: var(--text-dim);
          padding-left: 0;
        }
        .tag-equipment {
          background: transparent;
          border-color: transparent;
          color: var(--text-dim);
          padding-left: 0;
        }
        /* Nebenmuskelgruppe: dieselbe Form wie die Hauptgruppe, nur blasser -
           sie zaehlt ja auch nur halb. */
        .tag-secondary {
          background: transparent;
          border: 1px dashed var(--border-strong);
          color: var(--text-dim);
        }
        .tag-clickable {
          cursor: pointer;
          text-decoration: underline dotted;
          text-underline-offset: 3px;
        }
        .tag-clickable:active {
          opacity: 0.7;
        }

        /* Karten sind keine Kaesten mehr, sondern Abschnitte, die eine
           Haarlinie voneinander trennt. Dadurch faellt eine komplette
           Rahmenebene weg und die Seite wird deutlich ruhiger. */
        .card {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          padding: 14px 0;
          margin-bottom: 0;
          box-shadow: none;
        }
        /* In Modalen und Sheets liegt der Inhalt schon auf einer eigenen
           Flaeche - dort braucht die letzte Karte keine Abschlusslinie. */
        .modal-body > .card:last-child,
        .exercise-detail-body > .card:last-child {
          border-bottom: none;
        }
        .chart-card {
          padding: 16px 0 14px;
        }
        .chart-card .plan-title {
          padding-left: 0;
        }

        .stat-section-title {
          display: block;
          margin: 26px 0 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-strong);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-faint);
        }

        .stat-search-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 0 2px 10px;
        }
        .stat-search-head .ex-name {
          font-size: 14px;
          font-weight: 600;
        }
        .stat-search-head-title {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        /* Kennzahlen ohne Kaesten: ein Raster, das nur durch Haarlinien
           geteilt wird. */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .stats-grid .stat-item:nth-child(odd) {
          border-right: 1px solid var(--border);
          padding-right: 16px;
        }
        .stats-grid .stat-item:nth-child(even) {
          padding-left: 18px;
        }
        .stats-grid-secondary {
          grid-template-columns: repeat(3, 1fr);
        }
        .stats-grid-secondary .stat-value {
          font-size: 24px;
        }
        /* Im Dreierraster gilt die gerade/ungerade Regel nicht - hier
           bekommt jede Spalte ausser der letzten die Trennlinie. */
        .stats-grid-secondary .stat-item:nth-child(odd),
        .stats-grid-secondary .stat-item:nth-child(even) {
          border-right: none;
          padding-left: 12px;
          padding-right: 12px;
        }
        .stats-grid-secondary .stat-item:not(:nth-child(3n)) {
          border-right: 1px solid var(--border);
        }
        .stats-grid-secondary .stat-item:nth-child(3n + 1) {
          padding-left: 0;
        }
        .stat-hero {
          display: flex;
          flex-direction: column-reverse;
          gap: 6px;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          padding: 14px 0 18px;
          margin-bottom: 0;
        }
        .stat-hero-label {
          font-size: 11.5px;
          letter-spacing: 0.2px;
          color: var(--text-dim);
        }
        .stat-hero-value {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 400;
          font-size: 46px;
          line-height: 1;
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
          color: var(--text);
        }
        .stat-hero-value small {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-dim);
          margin-left: 4px;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 7px;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          padding: 16px 0 18px;
        }
        .stat-value {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 400;
          font-size: 32px;
          line-height: 1;
          letter-spacing: -0.6px;
          font-variant-numeric: tabular-nums;
          color: var(--text);
        }
        .stat-label {
          font-size: 11.5px;
          line-height: 1.45;
          color: var(--text-dim);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border-strong);
          border-radius: 0;
          padding: 4px 0 9px;
          margin-bottom: 12px;
          color: var(--text-faint);
        }
        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          width: 100%;
        }
        .search-box input::placeholder { color: var(--text-dim); }

        .chip-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 12px;
        }
        /* Randlose Pillen: die Auswahl zeigt sich durch die Fuellung, nicht
           durch einen zusaetzlichen Rahmen. Gemischte Gross-/Kleinschreibung
           statt Versalien, damit die Beschriftungen lesbar bleiben. */
        .chip {
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.1px;
          padding: 7px 13px;
          border-radius: 999px;
          border: none;
          background: var(--fill);
          color: var(--text);
          cursor: pointer;
        }
        .chip.active {
          background: var(--accent);
          color: #fff;
          font-weight: 500;
        }
        /* Im Abschluss-Fenster passen die fuenf Gefuehls-Worte nicht in eine
           Zeile. Umbrechen statt seitlich scrollen: eine Auswahl, die man
           erst wegschieben muss, wird uebersehen. */
        .chip-row-wrap {
          flex-wrap: wrap;
          overflow-x: visible;
        }
        .chip-sm {
          padding: 6px 11px;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .ex-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 4px;
          border-bottom: 1px solid var(--border);
        }
        .ex-row:last-child { border-bottom: none; }
        /* Name and labels each get their own space: without this the long
           subgroup labels wrapped onto two lines and ran into the name. */
        .ex-row .ex-name {
          flex: 1 1 auto;
          /* A floor, not 0: with two subgroup tags plus an equipment tag,
             none of which ever shrink, the name used to be squeezed down to
             a single letter before it had a chance to ellipsize. */
          min-width: 64px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ex-row .tag {
          white-space: nowrap;
          flex-shrink: 0;
        }
        /* A very long subgroup name is shortened rather than pushing the
           exercise name out of the row. */
        .ex-row .tag-subgroup {
          max-width: 128px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ex-name {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 18px;
          letter-spacing: -0.1px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.1px;
          border-radius: 12px;
          border: none;
          padding: 13px 18px;
          cursor: pointer;
        }
        /* Ein ausgegrauter Knopf soll nicht wie eine verblasste Version
           des aktiven aussehen, sondern klar unbenutzbar: neutrale Flaeche
           statt durchscheinender Akzentfarbe. */
        .btn:disabled {
          background: var(--fill);
          color: var(--text-faint);
          cursor: not-allowed;
        }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-ghost { background: var(--fill); color: var(--accent); border: none; }
        .btn-block { width: 100%; }
        .btn-sm { padding: 8px 12px; font-size: 13px; border-radius: 9px; }
        .btn-danger { background: transparent; color: var(--danger); }
        /* Bereits hinzugefuegt: ruhig und abgehakt, nicht als Aktion. */
        .btn-done { background: var(--fill); color: var(--success); }
        .btn-icon {
          width: 34px; height: 34px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--fill); border: none; color: var(--text);
          cursor: pointer;
        }

        /* Dock = laufende Trainings-Leiste + Navigation. Die Positionierung
           sitzt hier, damit beide beim Wegscrollen gemeinsam verschwinden. */
        .bottom-dock {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          transition: transform 0.25s ease;
          transform: translateY(0);
          /* The bar carries a transform, which creates its own stacking
             context. Pinning it to a low layer makes sure overlays (200+)
             are always drawn on top, no matter how the browser orders
             transformed siblings. */
          z-index: 10;
        }
        .bottom-dock.nav-hidden {
          transform: translateY(100%);
        }
        .fab-nav {
          display: flex;
          background: var(--bg);
          border-top: 1px solid var(--border-strong);
          /* Unten nur der halbe Safe-Area-Abstand: der volle Wert ließ auf
             dem iPhone einen fingerbreiten leeren Streifen unter den
             Beschriftungen stehen. Die Hälfte hält die Knöpfe weiterhin
             klar über dem Home-Indikator, gibt den Rest aber frei. */
          padding: 8px 4px calc(4px + env(safe-area-inset-bottom) * 0.5);
        }
        .session-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          border: none;
          border-bottom: 1px solid var(--border);
          background: var(--accent);
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          padding: 9px 14px;
          cursor: pointer;
        }
        .session-bar-main {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .session-bar-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .session-bar-time {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 16px;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .session-bar-time.is-rest {
          background: rgba(255,255,255,0.18);
          border-radius: 6px;
          padding: 1px 7px;
        }
        .dash-signal-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 0;
          cursor: pointer;
        }
        .dash-signal-label {
          font-size: 13.5px;
          color: var(--text);
          flex-shrink: 0;
        }
        .dash-signal-text {
          font-size: 12.5px;
          color: var(--text-dim);
          flex: 1;
          min-width: 0;
        }
        .nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          color: var(--text-faint);
          font-family: 'Inter', sans-serif;
          /* "Fortschritt" ist die laengste Beschriftung und muss in ein
             Fuenftel der Bildschirmbreite passen, ohne den Rand zu beruehren. */
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 6px 0;
          cursor: pointer;
          transition: color 120ms ease, transform 100ms ease;
        }
        .nav-btn.active { color: var(--text); }
        .nav-btn.active svg { color: var(--accent); }
        .nav-btn:active { transform: scale(0.92); }

        .plan-title {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 21px;
          line-height: 1.15;
          letter-spacing: -0.2px;
        }

        /* Eine Überschrift, hinter der eine Erklärung steckt. Das (i) ist der
           einzige Hinweis darauf, dass hier etwas passiert - ohne Icon sähe
           sie aus wie jede andere Überschrift und niemand käme auf die Idee,
           sie anzutippen. Bewusst gedämpft: es ist ein Angebot, kein
           Bedienelement, das nach Aufmerksamkeit verlangt. */
        .plan-title-explain {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          color: var(--text);
          cursor: pointer;
          text-align: left;
        }
        .plan-title-explain .plan-title-info {
          color: var(--text-faint);
          flex-shrink: 0;
          transition: color 150ms ease;
        }
        .plan-title-explain:hover .plan-title-info,
        .plan-title-explain:focus-visible .plan-title-info {
          color: var(--accent);
        }
        /* Fließtext im Erklärfenster - schmaler gesetzt und mit mehr
           Zeilenabstand als die Bedien-Oberfläche, weil das hier gelesen
           und nicht bedient wird. */
        .explain-body p {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-dim);
        }
        .explain-body p:last-child { margin-bottom: 0; }

        /* Die Karte "Letztes Training" führt in den Verlauf. position:
           relative steht hier bewusst: der Pfeil rechts wird daran
           ausgerichtet und würde sonst - wie das Pokal-Abzeichen zuvor - an
           der nächsthöheren positionierten Ebene kleben. */
        .dash-last-log {
          position: relative;
          cursor: pointer;
          padding-right: 30px;
        }
        .dash-last-log-arrow {
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
          color: var(--text-faint);
        }

        /* Eine Kachel, hinter der noch etwas steckt. Der Pfeil im Label ist
           der eigentliche Hinweis darauf; die Fläche reagiert nur beim
           Antippen, damit sie im Ruhezustand wie ihre Nachbarn aussieht. */
        .stat-item-clickable {
          cursor: pointer;
          border-radius: 10px;
          transition: background 150ms ease;
        }
        .stat-item-clickable:active { background: var(--fill); }

        /* Die Frühwarnung aus Gefühl und Belastung. Warnfarbe nur im Symbol,
           der Text bleibt normal gesetzt: eine Beobachtung, die man lesen
           soll, kein Alarm, der Schrecken verbreiten will. */
        .fatigue-note {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
          padding-bottom: 12px;
          margin-bottom: 4px;
          border-bottom: 1px solid var(--border);
        }
        .fatigue-note:last-child {
          padding-bottom: 0;
          margin-bottom: 0;
          border-bottom: none;
        }
        .fatigue-note-icon {
          color: var(--danger);
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Eine Gefühlsstufe mit ihrem Leistungsvergleich. Die Herkunftsangabe
           steht bewusst als eigene Zeile darunter statt klein daneben - sie
           gehört zur Aussage, nicht als Fußnote an ihren Rand. */
        .feeling-row {
          display: grid;
          grid-template-columns: 86px 1fr;
          gap: 2px 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--border);
        }
        .feeling-row:last-child { border-bottom: none; }
        .feeling-row-label {
          grid-row: span 2;
          align-self: center;
          font-size: 14px;
          color: var(--text);
        }
        .feeling-row-value {
          font-size: 14px;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }
        .feeling-row-basis {
          font-size: 12px;
          color: var(--text-faint);
        }

        /* Erklärender Nachsatz unter einem Chart - leiser als der Chart
           selbst, aber nah genug dran, dass klar ist, worauf er sich
           bezieht. */
        .chart-hint {
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--text-faint);
        }

        /* Der Rechenweg im Erklärfenster. Abgesetzt vom Fließtext, weil er
           nachgeschlagen und nicht gelesen wird. */
        .explain-formula {
          margin-top: 14px;
          padding: 11px 12px;
          border-radius: 10px;
          background: var(--fill);
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
        }
        .explain-formula-label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 6px;
        }
        .explain-formula code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12.5px;
        }

        /* Eine Atemübung in der "Pro Übung"-Liste. Name und Kennzahlen
           untereinander statt nebeneinander: auf einem Telefon wären drei
           Werte plus Übungsname in einer Zeile entweder abgeschnitten oder
           unlesbar klein. Trennung durch Haarlinien wie überall sonst. */
        .breathing-ex-row {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .breathing-ex-row:last-child { border-bottom: none; }
        .breathing-ex-row:first-child { padding-top: 2px; }
        .breathing-ex-name {
          font-size: 15px;
          color: var(--text);
        }
        .breathing-ex-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          font-size: 12.5px;
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
        }

        /* iOS Safari auto-zooms the page whenever a focused form control
           has a font-size below 16px. Keeping every input at 16px stops
           that jump-and-zoom when tapping a name to rename it. */
        input[type=number], input[type=text] {
          background: var(--surface-alt);
          border: none;
          color: var(--text);
          border-radius: 9px;
          padding: 10px 11px;
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 16px;
          width: 100%;
        }
        select, textarea {
          background: var(--surface-alt);
          border: none;
          color: var(--text);
          border-radius: 9px;
          padding: 10px 11px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          width: 100%;
        }
        select option {
          background: var(--surface-alt);
          color: var(--text);
        }
        textarea {
          font-family: inherit;
          resize: vertical;
        }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.6; }

        /* Sicherheitsnetz gegen das automatische Hineinzoomen auf dem iPhone:
           iOS zoomt bei JEDEM fokussierten Formularfeld unter 16px. Diese
           Regel ist spezifischer als Einzelregeln wie .session-notes und
           greift damit auch fuer Felder, die spaeter dazukommen. */
        .app-shell input,
        .app-shell select,
        .app-shell textarea {
          font-size: 16px;
        }
        label.field-label {
          font-size: 11px;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 6px;
          display: block;
        }

        .session-notes {
          width: 100%;
          min-height: 64px;
          resize: vertical;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          background: var(--surface-alt);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .session-notes:focus {
          outline: none;
          border-color: var(--accent);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-dim);
        }
        .empty-state svg { margin-bottom: 10px; opacity: 0.5; }
        /* Defensive guard: if an icon ever renders without explicit
           width/height (e.g. a stale bundle or icon lib mismatch), SVGs
           fall back to their native 300x150 box and silently cover
           surrounding clickable rows. Cap them so a rendering glitch can
           never block taps on exercises, plans, etc. */
        svg { flex-shrink: 0; max-width: 32px; max-height: 32px; }
        /* The guard above is meant for small lucide-react icons only. It
           was also catching the recharts <svg> (which recharts renders
           without HTML width/height for auto-scaling), squashing every
           statistics graph down to a 32x32px box. Charts get their real
           size back here. */
        .recharts-wrapper,
        .recharts-wrapper svg,
        .recharts-surface {
          max-width: none !important;
          max-height: none !important;
          width: 100% !important;
          height: 100% !important;
        }
        /* Aus demselben Grund wie bei recharts: die 32px-Sperre oben ist für
           Icons gedacht und würde auch selbstgezeichnete SVGs auf
           Briefmarkengröße stauchen. Beide brauchen ihre echte Größe. */
        .sparkline,
        .breathing-line {
          max-width: none;
          max-height: none;
        }

        .set-row {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) minmax(0, 1fr) 30px;
          gap: 6px;
          align-items: center;
        }
        /* Band exercises drop the weight column entirely - the reps then get
           the space instead of sitting next to an input that only ever holds 0. */
        .set-row.set-row-noweight {
          grid-template-columns: 38px minmax(0, 1fr) 30px;
        }
        /* Jede Zeile liegt in einem eigenen Kaestchen, damit das Satzart-Menue
           darunter aufklappen kann, ohne von der naechsten Zeile verdeckt zu
           werden. */
        .set-line {
          position: relative;
        }
        .set-line + .set-line {
          margin-top: 5px;
        }
        /* Dropsaetze ruecken eng an den Satz, zu dem sie gehoeren. */
        .set-line.is-drop {
          margin-top: 2px;
        }
        .set-line.menu-open {
          z-index: 40;
        }
        /* Nur die Nummer ruecke ein, nicht die ganze Zeile - Wdh.-, Kg- und
           Haken-Spalte bleiben mit den Saetzen darueber auf einer Linie. */
        .set-row.is-drop .set-kind {
          justify-content: flex-start;
          padding-left: 14px;
        }
        /* Die kleine Ecke zeigt, an welchem Arbeitssatz der Drop haengt. */
        .set-row.is-drop::after {
          content: "";
          position: absolute;
          left: 5px;
          top: -4px;
          bottom: 50%;
          width: 9px;
          border-left: 1.5px solid var(--border-strong);
          border-bottom: 1.5px solid var(--border-strong);
          border-bottom-left-radius: 6px;
          pointer-events: none;
        }
        /* Die RIR-Frage am Ende einer Uebung. Bewusst schmal und ruhig: sie
           soll auffallen, wenn die Uebung durch ist, aber nicht mit dem
           "Satz hinzufuegen"-Knopf um Aufmerksamkeit konkurrieren. */
        .rir-ask {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 10px 0 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }
        .rir-ask-label {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        /* Die Einordnung unter der RIR-Abfrage. Leise gesetzt: sie ist eine
           Beobachtung am Rande, kein Ergebnis, das Aufmerksamkeit fordert. */
        .rir-compare {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-faint);
        }

        .rir-ask-row {
          margin-bottom: 0;
        }
        /* Satznummer = Schalter fuer die Satzart. */
        .set-kind {
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-faint);
          user-select: none;
        }
        .set-kind.is-warmup {
          font-style: italic;
        }
        .set-kind.is-dropset {
          font-size: 12.5px;
          color: var(--text-dim);
        }
        .set-kind.is-open {
          background: var(--fill);
          color: var(--text);
        }
        .set-kind-menu {
          position: absolute;
          left: 0;
          top: calc(100% + 4px);
          z-index: 50;
          width: 190px;
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,calc(var(--shadow-strength) * 2));
          padding: 6px;
          animation: modal-fade 140ms ease-out both;
        }
        .set-kind-menu.drop-up {
          top: auto;
          bottom: calc(100% + 4px);
        }
        .set-kind-option {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          text-align: left;
          padding: 11px 10px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          cursor: pointer;
        }
        .set-kind-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--text-faint);
        }
        .set-kind-option.is-warmup .set-kind-dot { background: var(--brass); }
        .set-kind-option.is-dropset .set-kind-dot { background: var(--accent); }
        /* Der Eichsatz bekommt die Signalfarbe: Er ist der eine Satz, der
           bewusst bis ans Ende geht - das darf man ihm ansehen. */
        .set-kind-option.is-calibration .set-kind-dot { background: var(--danger); }
        .set-kind.is-calibration {
          color: var(--danger);
          font-weight: 600;
        }

        /* Schätzung gegen Ergebnis, direkt nach dem Eichsatz. */
        .calibration-result {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.45;
          color: var(--text);
        }
        .calibration-result-diff { color: var(--text-dim); }

        .calibration-headline {
          font-size: 15px;
          line-height: 1.45;
          color: var(--text);
        }
        .calibration-basis {
          margin-top: 3px;
          font-size: 12px;
          color: var(--text-faint);
        }
        /* Die einzelnen Eichsätze als Beleg unter dem Schnitt. Name und Werte
           nebeneinander, Datum darunter - auf Telefonbreite passt sonst
           nichts davon in eine Zeile. */
        .calibration-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 2px 10px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .calibration-row:last-child { border-bottom: none; }
        .calibration-row-name { color: var(--text); }
        .calibration-row-values {
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
          text-align: right;
        }
        .calibration-row-date {
          grid-column: 1 / -1;
          font-size: 11.5px;
          color: var(--text-faint);
        }
        .entry-card {
          transition: box-shadow 160ms ease;
        }
        /* will-change only while actually dragging, not on every card all
           the time: it forces a new stacking context, which was trapping
           each exercise's "..." dropdown menu inside its own card - any
           part of the menu extending past the card's bottom edge got
           painted over by the next exercise card instead of floating above
           it, since sibling stacking contexts always paint in DOM order
           regardless of z-index inside them. */
        .entry-card.is-dragging {
          position: relative;
          z-index: 20;
          will-change: transform;
          box-shadow: 0 12px 30px rgba(0,0,0,calc(var(--shadow-strength) * 2.6));
          cursor: grabbing;
        }
        .set-swipe {
          position: relative;
        }
        /* The action icons sit behind the row and are revealed as it slides
           away, so the direction of the swipe explains itself. */
        .set-swipe-hint {
          position: absolute;
          inset: -2px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-radius: 8px;
          opacity: 0;
          pointer-events: none;
        }
        .set-swipe-hint[data-dir="right"] { background: rgba(110, 168, 102, 0.2); }
        .set-swipe-hint[data-dir="left"] { background: rgba(216, 90, 79, 0.2); }
        .set-swipe-hint[data-dir="right"] .set-swipe-del { opacity: 0; }
        .set-swipe-hint[data-dir="left"] .set-swipe-done { opacity: 0; }
        .set-swipe-done { color: var(--success); display: flex; }
        .set-swipe-del { color: var(--danger); display: flex; }
        .set-swipe > .set-row {
          position: relative;
          background: var(--surface);
          /* Horizontal panning is handled in JS; letting the browser also
             pan would fight the gesture. */
          touch-action: pan-y;
        }
        .set-row.is-warmup input,
        .set-row.is-warmup .set-kind {
          opacity: 0.6;
        }
        /* Zahnrad links oben auf der Startseite. Sitzt als schmale Zeile
           ueber dem Inhalt, damit darunter nichts verrutscht. */
        /* Steht in der kg-Spalte der Satzzeile und sieht aus wie das
           Eingabefeld daneben, ist aber ein Knopf. */
        .band-pick {
          width: 100%;
          font-family: inherit;
          font-size: 13px;
          padding: 9px 6px;
          border-radius: 9px;
          border: 1px solid var(--border);
          background: var(--surface-alt);
          color: var(--text);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }
        .dash-settings {
          position: relative;
          display: flex;
          margin-bottom: 4px;
        }
        .dash-settings-trigger.is-open { background: var(--fill); }
        .dash-settings-menu {
          top: calc(100% + 4px);
          left: 0;
          right: auto;
        }
        .program-switcher {
          position: relative;
          margin-bottom: 10px;
        }
        .program-trigger {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          max-width: 100%;
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 2px 0;
          color: var(--text);
          cursor: pointer;
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 30px;
          letter-spacing: -0.5px;
        }
        .program-trigger-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .program-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 240px;
          max-width: calc(100vw - 32px);
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 26px rgba(0,0,0,calc(var(--shadow-strength) * 2.2));
          padding: 6px;
          z-index: 60;
        }
        .program-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: none;
          border: none;
          border-radius: 8px;
          padding: 10px 10px;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
        }
        .program-menu-item.active {
          background: var(--accent);
          color: white;
        }
        .program-menu-item.danger {
          color: var(--danger, #d85a4f);
        }
        .program-menu-divider {
          height: 1px;
          background: var(--border);
          margin: 5px 2px;
        }
        .folder-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding: 0 2px;
        }
        .folder-header .tag {
          flex-shrink: 0;
          white-space: nowrap;
        }
        .folder-header-title {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 19px;
          letter-spacing: -0.1px;
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .muscle-week-label {
          font-size: 12.5px;
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .muscle-week-value {
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 13px;
          text-align: right;
          color: var(--text);
        }
        .muscle-week-subs {
          margin: -1px 0 10px 14px;
          padding-left: 10px;
          border-left: 1px solid var(--border);
        }
        /* Sparkline + Badge instead of the old proportional bar - label,
           trend, current count, % change, expand-chevron. */
        .muscle-week-row-v2 {
          display: grid;
          grid-template-columns: 76px 1fr 30px 46px 14px;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
        }
        .muscle-week-row-v2-clickable {
          cursor: pointer;
        }
        .muscle-week-row-v2-sub {
          grid-template-columns: 76px 1fr 30px 46px;
          margin-bottom: 7px;
        }
        .muscle-week-row-v2-sub .muscle-week-label {
          font-size: 12px;
        }
        .muscle-week-row-v2-sub .muscle-week-value {
          font-size: 12px;
          color: var(--text-dim);
        }
        .muscle-week-chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          margin: -6px;
        }
        .muscle-load-row {
          display: grid;
          grid-template-columns: 80px 1fr 46px 18px 14px;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
        }
        .muscle-load-row-clickable {
          cursor: pointer;
        }
        /* Kraft und Volumen: zwei Zahlen nebeneinander, damit man sie
           gegeneinander lesen kann - das ist der ganze Zweck der Karte. */
        .sv-row {
          display: grid;
          grid-template-columns: 1fr 52px 52px 14px;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
        }
        .sv-row-clickable { cursor: pointer; }
        .sv-row-sub { margin-bottom: 7px; }
        .sv-row-sub .muscle-week-label { font-size: 12px; }
        .sv-head {
          display: grid;
          grid-template-columns: 1fr 52px 52px 14px;
          gap: 8px;
          font-size: 10.5px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: var(--text-faint);
          margin-bottom: 6px;
        }
        .sv-head span { text-align: right; }
        .sv-head span:first-child { text-align: left; }
        .sv-note {
          font-size: 12px;
          line-height: 1.45;
          color: var(--text-dim);
          margin: -3px 0 10px;
          padding-left: 2px;
        }
        .muscle-load-row-sub {
          grid-template-columns: 80px 1fr 46px 18px;
          margin-bottom: 7px;
        }
        .muscle-load-row-sub .muscle-week-label {
          font-size: 12px;
        }
        .load-signal {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
        }
        .load-signal-overload { color: var(--danger); }
        .load-signal-watch { color: var(--brass); }
        .load-signal-plateau { color: var(--text-dim); }
        .sparkline {
          display: block;
          width: 100%;
          overflow: visible;
        }
        .sparkline polyline {
          stroke: var(--text-dim);
        }
        .sparkline-empty line {
          stroke: var(--border);
          stroke-width: 1.5;
          stroke-dasharray: 2 2;
        }
        .load-change {
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 12.5px;
          text-align: right;
          white-space: nowrap;
        }
        .load-change-up { color: var(--success); }
        .load-change-down { color: var(--danger); }
        .load-change-neutral { color: var(--text-dim); }
        .plan-last-done {
          display: inline-block;
          margin-top: 2px;
          font-size: 11.5px;
          color: var(--text-dim);
        }
        .folder-drag-handle {
          display: flex;
          align-items: center;
          color: var(--text-dim);
          flex-shrink: 0;
          margin-left: -2px;
          cursor: grab;
        }
        .folder-header .btn-icon {
          width: 26px;
          height: 26px;
        }
        .folder-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .folder-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .folder-chip .folder-dot {
          width: 8px;
          height: 8px;
        }
        .card.is-pressing {
          transform: scale(0.97);
          opacity: 0.85;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .modal-overlay {
          position: fixed;
          top: 0; right: 0; bottom: 0; left: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: calc(16px + env(safe-area-inset-top)) 16px
                   calc(16px + env(safe-area-inset-bottom));
          z-index: 300;
          /* The popup used to snap in; a short fade of the backdrop and a
             gentle rise of the card make it land instead of jump. */
          animation: modal-fade 220ms ease-out both;
        }
        @keyframes modal-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Fades in without moving. A sliding card keeps changing position
           while it animates, and a button that is still travelling can
           swallow the first tap - a calm fade avoids that entirely. */
        @keyframes modal-rise {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .modal-overlay, .modal-card { animation: none; }
        }
        .modal-card {
          width: 100%;
          max-height: 100%;
          animation: modal-rise 200ms ease-out both;
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 18px 48px rgba(0,0,0,0.45);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 14px 10px;
          flex-shrink: 0;
        }
        .modal-title {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 21px;
          letter-spacing: -0.2px;
          color: var(--text);
        }
        .modal-body {
          padding: 0 14px 16px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          min-height: 0;
        }
        .modal-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .modal-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          text-align: left;
          padding: 12px 12px;
          border-radius: 10px;
          border: none;
          background: var(--fill);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          cursor: pointer;
        }
        .modal-option.active {
          background: var(--accent);
          color: #fff;
          font-weight: 500;
        }
        .move-overlay {
          /* Lag vorher absolut im scrollenden Inhaltsbereich und wurde von
             dessen Rand beschnitten; zusaetzlich deckte die untere Leiste
             das Ende ab. Fixed + hoher z-index loesen es aus beidem heraus. */
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 200;
        }
        .ex-row-clickable {
          cursor: pointer;
        }
        .ex-name-clickable {
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: color-mix(in srgb, var(--text-faint) 45%, transparent);
          text-decoration-thickness: 1px;
          text-underline-offset: 4px;
        }
        .quick-toggle-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .time-toggle-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text);
          cursor: pointer;
        }
        .time-toggle-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          accent-color: var(--accent);
        }
        .exercise-detail-sheet {
          width: 100%;
          max-width: 480px;
          /* Hoehe am sichtbaren Bereich ausrichten und den Rand unten
             (Home-Indikator) freihalten, damit das Ende erreichbar bleibt. */
          max-height: calc(100dvh - env(safe-area-inset-top) - 24px);
          /* Opens at a usable size right away. Sizing itself to its content
             meant the tabs sat just above the navigation bar and everything
             below had to be scrolled into view first. */
          min-height: min(72dvh, calc(100dvh - env(safe-area-inset-top) - 24px));
          background: var(--elevated);
          border-top: 1px solid var(--border);
          border-radius: 18px 18px 0 0;
          padding: 18px 16px calc(22px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
        }
        .exercise-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .exercise-detail-body {
          /* A flex child defaults to min-height:auto, which stops it from
             shrinking below its content — so overflow-y never actually
             produced a working scroll area and the sheet felt stuck.
             flex:1 + min-height:0 make it a proper scroll container. */
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          /* Keeps a scroll gesture inside the sheet instead of chaining
             through to the page behind it once the end is reached. */
          overscroll-behavior: contain;
        }
        .move-sheet {
          width: 100%;
          max-width: 480px;
          max-height: calc(100dvh - env(safe-area-inset-top) - 24px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          background: var(--elevated);
          border-top: 1px solid var(--border);
          border-radius: 18px 18px 0 0;
          padding: 18px 16px calc(22px + env(safe-area-inset-bottom));
        }
        .move-sheet-title {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 21px;
          letter-spacing: -0.2px;
          margin-bottom: 12px;
        }
        .move-sheet-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 260px;
          overflow-y: auto;
        }
        .move-option {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--fill);
          border: none;
          color: var(--text);
          border-radius: 10px;
          padding: 12px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          text-align: left;
        }
        .move-option.active {
          background: var(--accent);
          color: #fff;
          font-weight: 500;
        }
        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
        }
        .color-swatch.active {
          border-color: var(--text);
        }
        .color-swatch-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
          justify-items: center;
        }
        .color-swatch-grid .color-swatch {
          width: 26px;
          height: 26px;
        }
        .entry-menu-wrap {
          position: relative;
        }
        .note-toggle {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: none;
          background: var(--fill);
          color: var(--text-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .note-toggle.has-note {
          background: var(--brass);
          border-color: var(--brass);
          color: var(--bg);
        }
        .floating-timer {
          position: fixed;
          top: calc(env(safe-area-inset-top) + 8px);
          right: 14px;
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 999px;
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 12.5px;
          color: var(--text-dim);
          background: var(--surface-alt);
          border: 1px solid var(--border);
          /* Deliberately understated: small, muted and slightly see-through
             so it reads as a status line, not as a notification. */
          opacity: 0.92;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          animation: modal-fade 200ms ease-out both;
          pointer-events: none;
        }
        .duration-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 12px;
          color: var(--text-dim);
          background: var(--fill);
          border-radius: 8px;
          padding: 5px 9px;
          height: fit-content;
        }
        .session-settings {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .session-settings-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 260px;
          max-width: calc(100vw - 48px);
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 26px rgba(0,0,0,calc(var(--shadow-strength) * 2.2));
          padding: 12px;
          z-index: 60;
        }
        .plan-item-row {
          /* The row lifts off the list while dragging; keeping the shadow
             and background on a transition avoids a hard visual pop. */
          transition: box-shadow 160ms ease, background 160ms ease;
        }
        /* will-change moved here (see .entry-card.is-dragging for why): it
           creates a stacking context, which otherwise traps this row's
           "..." dropdown menu and lets the next row paint over it. */
        .plan-item-row.is-dragging {
          position: relative;
          z-index: 20;
          will-change: transform;
          box-shadow: 0 12px 30px rgba(0,0,0,calc(var(--shadow-strength) * 2.6));
          background: var(--surface-alt);
          border-radius: 10px;
          cursor: grabbing;
        }
        .drag-handle:active { cursor: grabbing; }
        .drag-handle {
          display: flex;
          align-items: center;
          color: var(--text-dim);
          cursor: grab;
          touch-action: none;
          padding: 2px;
        }
        .set-num {
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 13px;
          color: var(--text-faint);
          text-align: center;
        }
        .set-check {
          width: 24px;
          height: 24px;
          justify-self: end;
          border-radius: 999px;
          border: 1.5px solid var(--border-strong);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .set-check.checked {
          background: var(--success);
          border-color: var(--success);
        }
        .set-row.is-done input {
          opacity: 0.55;
        }

        .last-performance {
          font-size: 12.5px;
          color: var(--text-dim);
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          background: var(--fill);
          border-radius: 8px;
          padding: 7px 10px;
          margin-top: 2px;
        }
        .superset-link-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          background: none;
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 6px;
          margin: -6px 0 12px;
          font-size: 11px;
          color: var(--text-dim);
          cursor: pointer;
        }
        .superset-link-toggle.active {
          border-style: solid;
          border-color: var(--accent);
          color: var(--accent);
        }
        .superset-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Inter', sans-serif;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          margin: 10px 0 4px;
        }
        .superset-card {
          position: relative;
          border-left: 2px solid var(--accent);
          padding-left: 12px;
        }
        .superset-card-linked {
          border-bottom-color: transparent;
        }
        /* Collapsed exercise cards in the plan builder: a whole workout
           fits on one screen instead of scrolling through five tall cards. */
        .builder-item {
          padding: 8px 10px;
        }
        .drag-handle {
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }
        /* The dropdown hangs over the card below it. Without lifting the
           whole card into its own layer, the neighbouring card swallows the
           taps meant for the menu. */
        .builder-item.menu-open {
          position: relative;
          z-index: 70;
        }
        .builder-item-head {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .builder-item-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
          cursor: pointer;
          padding: 4px 0;
        }
        .builder-item-summary {
          font-size: 11.5px;
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .builder-chevron {
          display: flex;
          align-items: center;
          color: var(--text-dim);
          cursor: pointer;
          flex-shrink: 0;
          padding: 4px 0 4px 2px;
        }
        .builder-item-body {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }
        .item-menu-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .item-menu-wrap.drop-up .program-menu {
          top: auto !important;
          bottom: calc(100% + 4px);
        }
        .entry-menu-wrap.drop-up .program-menu {
          top: auto !important;
          bottom: calc(100% + 4px);
        }
        .superset-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 11px;
          color: var(--brass);
          margin: -6px 0 6px;
        }
        /* Die Liste ist jetzt die Hauptflaeche des ersten Schritts, deshalb
           bekommt sie so viel Hoehe wie der Bildschirm hergibt. */
        /* Step 1 is laid out as a column that fills the visible area exactly.
           Guessing a max-height for the list never held up: the search field
           can be open or closed, and the status bar inset differs per device -
           any fixed number pushed the buttons under the navigation bar in some
           combination. Letting the list take whatever is left over is exact. */
        .picker-step {
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 150px);
        }
        .exercise-picker-list {
          flex: 1;
          min-height: 140px;
          overflow-y: auto;
        }
        .picker-actions {
          flex-shrink: 0;
        }
        .pr-badge-clickable {
          cursor: pointer;
        }
        /* Next to the exercise name it sits in the flow, not absolutely
           positioned like the one inside a set field.
           Zwei Klassen im Selektor, weil .pr-badge weiter unten steht: bei
           gleicher Spezifität gewinnt die spätere Regel, und das absolute
           "top/right" von .pr-badge hat dieses Abzeichen aus der Zeile heraus
           in die obere rechte Ecke der GANZEN App geschossen - dort war die
           nächste positionierte Ebene. */
        .pr-badge.pr-badge-inline {
          position: static;
          margin-left: 6px;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .pr-badge {
          position: absolute;
          top: -7px;
          right: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--brass);
          color: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px var(--surface);
        }
        /* Live-Vorschau des Volumen-Vergleichs zum letzten Mal - neben dem
           Übungsnamen, damit sie beim Eintragen im Blick bleibt. */
        .volume-change-badge {
          margin-left: 4px;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          background: var(--fill);
        }
        .volume-change-up { color: var(--success); }
        .volume-change-down { color: var(--danger); }
        .volume-change-neutral { color: var(--text-dim); }

        /* Bleibt beim Scrollen oben stehen, wie der manuelle Pausen-Timer -
           sonst verschwindet die Automatik samt Restzeit und Pause-Knopf
           sobald man an ihr vorbeiscrollt. */
        .auto-run-bar {
          position: sticky;
          top: 0;
          z-index: 5;
          background: var(--surface);
          border: 1px solid var(--accent);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
          text-align: center;
        }
        .auto-run-phase {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .auto-run-time {
          font-family: 'Newsreader', Georgia, serif;
          font-variant-numeric: tabular-nums;
          font-size: 50px;
          font-weight: 400;
          line-height: 1;
          letter-spacing: -1.4px;
          color: var(--text);
        }
        .auto-run-what {
          font-size: 12.5px;
          color: var(--text-dim);
          margin-top: 2px;
        }
        .rest-timer {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--bg);
          color: var(--text);
          border-top: 1px solid var(--border-strong);
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          padding: 12px 0;
          margin-bottom: 12px;
        }
        .rest-timer .rest-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Newsreader', Georgia, serif;
          font-variant-numeric: tabular-nums;
          font-size: 26px;
          font-weight: 400;
        }
        .rest-timer .rest-actions {
          display: flex;
          gap: 6px;
        }
        /* Dieselbe Klasse steckt auch in der Automatik-Leiste, dort fehlte
           bisher die Zeilen-Anordnung - die Knoepfe stapelten sich einzeln
           untereinander. Jetzt bei Bedarf zwei Zeilen statt vier. */
        .auto-run-bar .rest-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
        }
        .rest-btn {
          background: var(--fill);
          border: none;
          color: var(--accent);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }


        .undo-snackbar{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:30;background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:13px}
        /* Die Rueckfrage muss ueber allem liegen - auch ueber Popups (z-index 300),
   sonst laesst sie sich nicht bestaetigen, wenn sie aus einem Popup
   heraus ausgeloest wurde. Fixed statt absolute, damit sie nicht vom
   scrollenden Inhaltsbereich beschnitten wird. */
        .confirm-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:400;padding:calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))}
        .confirm-card{background:var(--elevated);border:1px solid var(--border);border-radius:14px;padding:18px;max-width:320px;width:100%}
        .confirm-card p{margin:0 0 16px;font-size:14px;line-height:1.5}
        .confirm-actions{display:flex;gap:8px}
        .confirm-actions .btn{background:transparent}
        .toast-snackbar{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:35;background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:10px 14px;box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:13px;max-width:90%;text-align:center}
        @media (max-width:600px){.content{padding-left:18px!important;padding-right:18px!important}.card{padding:14px 0!important}.set-row{grid-template-columns:36px 1fr 1fr 30px!important;gap:6px!important}.set-row.set-row-noweight{grid-template-columns:36px 1fr 30px!important}.set-row input{min-width:0}.meta-grid{grid-template-columns:1fr 1fr}.stat-value{font-size:28px}.bottom-dock{left:0!important;right:0!important;bottom:0!important}.nav-btn{min-width:0!important}.plan-title{font-size:19px}.btn{min-height:44px}.btn-icon{min-width:36px;min-height:36px}}
        @media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}

        .cal-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .cal-month-label {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 26px;
          letter-spacing: -0.4px;
          text-transform: capitalize;
          cursor: pointer;
        }
        .cal-category-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
        }
        .cal-weekday-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
          margin-bottom: 4px;
        }
        .cal-weekday-row span {
          text-align: center;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--text-dim);
        }
        .cal-grid {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 10px;
        }
        .cal-week-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
        }
        /* Entlastung: die betroffenen TAGE bekommen eine ruhige Bank, nicht
           mehr die ganze Kalenderwoche - ein Zeitraum darf mitten in der
           Woche anfangen. Bewusst neutral in der Farbe: Rot und Gelb
           gehoeren den Belastungssignalen, eine geplante Entlastung ist
           keine Warnung. Deutlich wird sie ueber die Flaeche, die Randlinie
           und die Beschriftung am ersten Tag. */
        .cal-day.is-deload {
          background: var(--deload-band);
          box-shadow: inset 0 2px 0 var(--border-strong), inset 0 -2px 0 var(--border-strong);
        }
        .cal-day.is-deload-start {
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
        }
        .cal-day.is-deload-end {
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .cal-day.is-deload-draft {
          background: var(--fill);
          box-shadow: inset 0 2px 0 var(--accent);
        }
        .cal-deload-label {
          display: block;
          margin: 1px 1px 0;
          font-size: 8px;
          line-height: 1.2;
          letter-spacing: 0;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cal-deload-label.is-due { color: var(--accent); }
        .deload-draft-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding: 8px 10px 8px 12px;
          border-radius: 10px;
          background: var(--accent);
          color: #fff;
          font-size: 12.5px;
        }
        .deload-draft-bar span { flex: 1; }
        .deload-draft-bar .btn-icon { color: #fff; }
        .deload-due-note {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: var(--fill);
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text);
        }
        .deload-due-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .deload-toggle.is-draft {
          background: var(--fill);
          color: var(--text);
        }
        .deload-toggle .deload-remove { color: #fff; }
        .deload-toggle {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 7px 11px;
          border-radius: 999px;
          background: var(--fill);
          color: var(--text-dim);
          font-size: 12.5px;
          cursor: pointer;
          user-select: none;
        }
        .deload-toggle.is-active {
          background: var(--accent);
          color: #fff;
        }
        .deload-toggle span { flex: 1; }
        .pr-list-row {
          padding-bottom: 10px;
          margin-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }
        .pr-list-row:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: none; }
        .pr-list-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .pr-list-detail {
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-dim);
          margin-top: 3px;
        }
        .deload-status {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
          margin-top: 10px;
        }
        .deload-effect {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .deload-effect:last-of-type {
          padding-bottom: 0;
          margin-bottom: 0;
          border-bottom: none;
        }
        .deload-effect-title {
          font-size: 12px;
          color: var(--text-dim);
          letter-spacing: 0.2px;
        }
        .deload-effect-value {
          font-size: 13.5px;
          color: var(--text);
          margin-top: 4px;
        }
        .deload-question {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
          margin: 6px 0 0;
        }
        .deload-basis {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-dim);
          margin: 5px 0 0;
        }
        /* Der im Diagramm markierte Zeitraum. Abgesetzter Kasten statt einer
           weiteren Zeile Fließtext: Was hier steht, gehört zur eigenen
           Auswahl und nicht zur festen Erklärung darüber. */
        .range-summary {
          margin-top: 8px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--fill);
        }
        .range-summary-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
        }
        .link-like {
          color: var(--accent);
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .cal-day {
          background: transparent;
          border: none;
          border-top: 1px solid var(--border);
          border-radius: 0;
          padding: 4px 2px 6px;
          min-height: 46px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
          /* Grid columns default to shrinking no further than their content's
             own width. A long, unbroken entry like "Arbeitsweg" would then
             force this column past its 1fr share, pushing the whole week -
             and with it Sunday, the last column - past the screen edge and
             behind the app shell's overflow:hidden. min-width: 0 lets the
             column actually shrink to its fair share, so the chip's own
             ellipsis (not the missing screen space) is what truncates text. */
          min-width: 0;
        }
        .cal-day.is-outside {
          opacity: 0.35;
        }
        .cal-day.is-today {
          border-top-color: var(--accent);
        }
        .cal-day.is-selected {
          background: var(--fill);
        }
        .cal-day-num {
          font-family: 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          color: var(--text-dim);
          padding-left: 1px;
        }
        .cal-day.is-today .cal-day-num {
          color: var(--accent);
          font-weight: 700;
        }
        .cal-day-entries {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        /* Solid colour bars instead of outlined chips: at this size an
           outline is barely visible, a filled bar reads at a glance. Every
           week looks the same so the month keeps a calm rhythm. */
        .cal-entry-chip {
          display: block;
          width: 100%;
          font-size: 9px;
          font-weight: 600;
          line-height: 1.35;
          padding: 2px 4px;
          border-radius: 4px;
          border: none;
          color: #fff;
          background: var(--text-dim);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
        }
        .cal-entry-chip svg {
          vertical-align: -1px;
          margin-right: 2px;
        }
        /* One colour for every workout entry, planned or done - the tick
           versus play icon is what carries the status, same language as
           the activity chips. */
        .cal-entry-workout {
          background: color-mix(in srgb, var(--accent) 35%, transparent);
          color: var(--text);
        }
        /* Atemübungen im Himmelblau - gleiche Logik wie bei den Workouts:
           eine Farbe für geplant wie erledigt, den Unterschied macht das
           Symbol (▷ bzw. ✓). */
        .cal-entry-breathing {
          background: color-mix(in srgb, ${BREATHING_COLOR} 42%, transparent);
          color: var(--text);
        }
        .cal-entry-more {
          font-size: 8.5px;
          color: var(--text-dim);
          padding-left: 4px;
        }
        .picker-more-hint {
          text-align: center;
          font-size: 11.5px;
          color: var(--text-dim);
          padding: 10px 4px 4px;
        }
        .cal-detail-item {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          padding: 12px 0;
        }
        /* Anything already done gets a green left edge, so a day reads as
           "what happened" versus "what is still planned" without having to
           compare the individual rows. The class was used before this rule
           existed and simply did nothing. */
        .cal-detail-done {
          border-left: 2px solid var(--success);
          padding-left: 10px;
        }
        /* Der letzte Eintrag des Tages braucht keine eigene Abschlusslinie -
           die des umgebenden Abschnitts steht direkt darunter. */
        .cal-detail-item:last-child {
          border-bottom: none;
        }

        /* --- Atemübung: geführte Sitzung ---------------------------------
           Vollbild statt Popup: während der Übung soll nichts anderes im
           Blick sein, und die Grafik braucht die ganze Fläche. */
        .breathing-overlay {
          position: absolute;
          inset: 0;
          z-index: 60;
          background: var(--bg);
          display: flex;
          flex-direction: column;
          padding: calc(env(safe-area-inset-top) + 14px) 18px 24px;
        }
        .breathing-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .breathing-title {
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.2px;
          color: var(--text);
        }
        .breathing-round {
          font-size: 12.5px;
          color: var(--text-dim);
          margin-top: 2px;
        }
        .breathing-stage {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px 0;
        }
        /* Offene Phase: die ganze Flaeche ist der Knopf. */
        .breathing-stage.is-tappable {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .breathing-stage.is-tappable:active { opacity: 0.75; }
        .breathing-tap-hint {
          text-align: center;
          font-size: 12px;
          color: var(--text-faint);
          margin-top: 6px;
        }
        .breathing-circle-wrap {
          position: relative;
          width: min(62vw, 240px);
          height: min(62vw, 240px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .breathing-circle {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: color-mix(in srgb, ${BREATHING_COLOR} 55%, transparent);
          /* Kein CSS-Übergang: die Größe kommt aus dem gemessenen
             Phasenfortschritt und wird pro Bild neu gesetzt. Ein zusätzlicher
             transition würde der Atmung hinterherlaufen statt ihr zu folgen. */
        }
        .breathing-circle-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px dashed color-mix(in srgb, ${BREATHING_COLOR} 45%, transparent);
        }
        .breathing-line-wrap {
          position: relative;
          width: 100%;
          height: min(46vh, 260px);
        }
        .breathing-line {
          width: 100%;
          height: 100%;
          display: block;
        }
        .breathing-line polyline {
          stroke: color-mix(in srgb, ${BREATHING_COLOR} 45%, transparent);
        }
        .breathing-dot {
          position: absolute;
          width: 16px;
          height: 16px;
          margin: -8px 0 0 -8px;
          border-radius: 50%;
          background: ${BREATHING_COLOR};
          box-shadow: 0 0 0 5px color-mix(in srgb, ${BREATHING_COLOR} 22%, transparent);
        }
        .breathing-phase {
          text-align: center;
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 25px;
          color: var(--text);
        }
        .breathing-time {
          text-align: center;
          font-family: 'Newsreader', Georgia, serif;
          font-variant-numeric: tabular-nums;
          font-size: 48px;
          letter-spacing: -1px;
          color: ${BREATHING_COLOR};
          margin: 2px 0 18px;
        }
        .breathing-controls {
          flex-shrink: 0;
        }
        .breathing-phase-row {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px;
        }
      `}</style>

      <div
        className={`content ${session && tab !== "log" ? "with-session-bar" : ""}`}
        onScroll={handleContentScroll}
      >
        {/* Die Trainingsansicht bleibt montiert, solange ein Training laeuft -
            auch wenn man zwischendurch in eine andere Ansicht wechselt. Die
            Automatik (Timer, Toene, automatisches Abhaken) lebt in dieser
            Komponente; wuerde sie beim Tabwechsel abgebaut, waere ein
            kurzer Blick in die Statistik das Ende des laufenden Zirkels.
            Deshalb steht sie ausserhalb des Panels, das beim Tabwechsel
            per key neu aufgebaut wird. */}
        {/* Ohne laufende Sitzung wird die Trainingsansicht NICHT gerendert.
            Vorher stand hier "session || tab === 'log'": Beim Beenden eines
            Trainings wird die Sitzung auf null gesetzt, der Reiter steht in
            diesem Moment aber noch auf "log" - LogView lief also einmal mit
            session = null durch, griff darin auf session.entries zu und riss
            die ganze App in den Fehlerbildschirm ("Da ist etwas
            schiefgelaufen"). React meldete das als "Rendered fewer hooks than
            expected", weil der Absturz mitten zwischen zwei Hooks passierte.
            Damit der Reiter danach nicht leer dasteht, wechselt
            clearActiveSession zurück auf die Startseite. */}
        {!loading && session && (
          <div className="tab-panel" hidden={tab !== "log"}>
            <LogView
              session={session}
              plans={allPlans}
              logs={logs}
              bands={bands}
              exBy={allExBy}
              exercises={allExercises}
              exerciseNotes={exerciseNotes}
              exerciseSubgroupOverrides={exerciseSubgroupOverrides}
              onSetExerciseSubgroup={handleSetExerciseSubgroup}
              onSetExerciseSubgroups={handleSetExerciseSubgroups}
              exerciseEquipmentOverrides={exerciseEquipmentOverrides}
              onSetExerciseEquipment={handleSetExerciseEquipment}
              timeBasedExercises={timeBasedExercises}
              gymIndependentExercises={gymIndependentExercises}
              onUpdateExerciseNote={handleUpdateExerciseNote}
              onRenameExercise={handleRenameExercise}
              onToggleTimeBased={handleToggleTimeBased}
              onToggleGymIndependent={handleToggleGymIndependent}
              onStartFromPlan={(plan) => requestStart(plan)}
              onUpdateSession={updateSession}
              onRequestConfirm={askConfirm}
              gyms={gyms}
              onFinish={async () => {
                if (!session) return;
                // A workout opened for editing keeps its recorded duration -
                // otherwise fixing one number would rewrite how long it took.
                const durationMinutes =
                  session.frozenDurationMinutes != null
                    ? session.frozenDurationMinutes
                    : session.startedAt
                    ? Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
                    : null;
                // Die Felder, die nur zur laufenden Sitzung gehoeren, gehen
                // nicht mit in den Verlauf - resumedFromLog waere sonst ein
                // komplettes Training im Training.
                const { resumedFromLog: _original, resumedFrom: _von,
                        frozenDurationMinutes: _eingefroren, ...sessionData } = session;
                const cleaned = {
                  ...sessionData,
                  // Sets now start pre-filled from the plan's targets, so an
                  // exercise the user never actually touched would otherwise
                  // still have "sets" and slip into the saved log. Only keep
                  // entries where at least one set was actually checked off.
                  // Also normalize every numeric field here in case a field
                  // was still focused (never blurred) when the user tapped
                  // "Training beenden".
                  entries: session.entries
                    .filter((e) => e.sets.some((s) => s.done))
                    .map((e) => ({
                      ...e,
                      // Nur die Einstellung an der Uebung entscheidet, ob
                      // sie in Sekunden gemessen wird. Frueher setzte der
                      // Automatik-Modus dieses Kennzeichen fuer JEDE Uebung
                      // des Trainings - und weil isTimeBasedInLogs es fuer
                      // alle Logs liest, war die Uebung damit dauerhaft eine
                      // Zeit-Uebung: keine Kilogramm, kein 1RM, keine
                      // Wiederholungen mehr, in Verlauf, Kalender und
                      // Diagrammen.
                      targetUseTime: !!e.targetUseTime,
                      // toNum, not Number: weights are held as typed ("62,5"),
                      // and Number("62,5") is NaN - which would silently store
                      // the set as 0 kg.
                      sets: e.sets.map((s) => ({
                        ...s,
                        reps: Math.max(0, toNum(s.reps)),
                        weight: Math.max(0, toNum(s.weight)),
                        duration: Math.max(0, toNum(s.duration)),
                      })),
                    })),
                  durationMinutes,
                };
                if (cleaned.entries.length > 0) {
                  // Work out the summary against the logs as they were BEFORE
                  // this workout is added, otherwise every set would compare
                  // against itself and nothing would ever count as a record.
                  let totalVolume = 0;
                  let totalSeconds = 0;
                  let doneSets = 0;
                  const records = [];
                  cleaned.entries.forEach((entry) => {
                    // Dieselbe Regel wie in der Trainingsansicht: allein die
                    // Einstellung an der Uebung zaehlt, nicht der Takt.
                    const isTimeBased =
                      isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises) ||
                      !!entry.targetUseTime;
                    const best = getExerciseHistory(
                      logs, entry.exerciseId, cleaned.id, isTimeBased,
                      effectiveGymId(entry.exerciseId, cleaned.gymId, gymIndependentExercises)
                    );
                    let bestOfEntry = null;
                    entry.sets.forEach((set) => {
                      if (!set.done || set.warmup) return;
                      doneSets += 1;
                      if (isTimeBased) totalSeconds += toNum(set.duration);
                      else totalVolume += toNum(set.weight) * toNum(set.reps);
                      if (isNewPR(set, best, isTimeBased)) {
                        const label = isTimeBased
                          ? `${toNum(set.duration)} Sek.`
                          : `${toNum(set.reps)} × ${fmtDecimal(set.weight)} kg`;
                        bestOfEntry = label;
                      }
                    });
                    if (bestOfEntry) {
                      records.push({
                        name: allExBy[entry.exerciseId]?.name || "Übung",
                        label: bestOfEntry,
                      });
                    }
                  });
                  setFinishSummary({
                    logId: cleaned.id,
                    feeling: null,
                    planName: cleaned.planName,
                    durationMinutes,
                    totalVolume,
                    totalSeconds,
                    doneSets,
                    exercises: cleaned.entries.length,
                    gymName: gyms.find((g) => g.id === cleaned.gymId)?.name || null,
                    records,
                  });
                  await persistLogs([...logs, cleaned]);
                }
                // If this workout was started from a calendar entry, link the
                // finished log back to it so the calendar can show results
                // instead of a "start workout" prompt from now on. If none
                // exists for today (started directly, never planned), one is
                // added instead - already marked done, so the calendar shows
                // what was actually trained instead of staying empty.
                if (cleaned.entries.length > 0) {
                  // Either the entry the workout was started from, or - if it
                  // was started from the plans page - an open entry for the
                  // same workout on the same day. Without this the calendar
                  // would show the plan as still open next to the finished
                  // workout, i.e. the same session twice.
                  const dayKey = toDateKey(new Date(cleaned.date));
                  const match =
                    // Ein bereits verknuepfter Eintrag zuerst: wird ein
                    // gespeichertes Training noch einmal bearbeitet, gibt es
                    // ihn schon. Ohne diese Zeile faenden die Suchen darunter
                    // nichts (die letzte verlangt !ce.logId) und jedes
                    // Bearbeiten legte den Tag ein weiteres Mal an.
                    calendarEntries.find((ce) => ce.logId === cleaned.id) ||
                    (session.calendarEntryId
                      ? calendarEntries.find((ce) => ce.id === session.calendarEntryId)
                      : null) ||
                    calendarEntries.find(
                      (ce) =>
                        ce.type === "workout" &&
                        !ce.logId &&
                        ce.date === dayKey &&
                        ce.planId === cleaned.planId
                    );
                  if (match) {
                    await persistCalendarEntries(
                      calendarEntries.map((ce) =>
                        // Datum mitziehen: wird ein Training an einem
                        // anderen Tag bearbeitet, gehoert der Eintrag dorthin.
                        ce.id === match.id ? { ...ce, date: dayKey, logId: cleaned.id } : ce
                      )
                    );
                  } else {
                    await persistCalendarEntries([
                      ...calendarEntries,
                      { id: uid(), date: dayKey, type: "workout", planId: cleaned.planId ?? null, logId: cleaned.id },
                    ]);
                  }
                }
                // Targets always track what was actually achieved last time,
                // so the plan auto-adjusts to real progress instead of
                // needing constant manual upkeep. For every exercise that
                // belongs to the plan this session came from, take the last
                // completed working set's numbers and, if they differ from
                // the plan's current target, update the plan.
                if (session.planId) {
                  const sourcePlan = plans.find((p) => p.id === session.planId);
                  if (sourcePlan) {
                    let planChanged = false;
                    const nextItems = (Array.isArray(sourcePlan.items) ? sourcePlan.items : []).map((item) => {
                      // Ueber die Plan-Eintrags-ID, nicht ueber die Uebung:
                      // steht dieselbe Uebung zweimal im Plan, bekaeme sonst
                      // beide Male der erste Platz seine Zahlen.
                      const entry =
                        cleaned.entries.find((e) => item.id && e.planItemId === item.id) ||
                        cleaned.entries.find((e) => !e.planItemId && e.exerciseId === item.exerciseId);
                      if (!entry) return item;
                      const workingSets = entry.sets.filter((s) => s.done && !s.warmup);
                      const lastSet = workingSets[workingSets.length - 1];
                      if (!lastSet) return item;
                      const achievedReps = Math.round(toNum(lastSet.reps));
                      const achievedWeight = toNum(lastSet.weight);
                      const achievedDuration = Math.round(toNum(lastSet.duration));
                      const isTime = !!item.useTime;
                      const changed = isTime
                        ? achievedDuration > 0 && achievedDuration !== item.duration
                        : (achievedReps > 0 && achievedReps !== item.reps) ||
                          (achievedWeight > 0 && achievedWeight !== item.weight);
                      if (!changed) return item;
                      planChanged = true;
                      return isTime
                        ? { ...item, duration: achievedDuration }
                        : { ...item, reps: achievedReps, weight: achievedWeight };
                    });
                    if (planChanged) {
                      await persistPlans(
                        plans.map((p) => (p.id === sourcePlan.id ? { ...p, items: nextItems } : p))
                      );
                    }
                  }
                }
                await clearActiveSession();
              }}
              onDiscard={() =>
                askConfirm(
                  session?.resumedFromLog
                    ? `Änderungen verwerfen? Das Training vom ${fmtDate(session.resumedFromLog.date)} bleibt so, wie es war.`
                    : "Aktives Training wirklich verwerfen? Alle nicht gespeicherten Sätze gehen verloren.",
                  () => clearActiveSession({ restoreOriginal: true })
                )
              }
              restEndsAt={restEndsAt}
              onSetRestEndsAt={updateRestEndsAt}
              soundOn={soundOn}
              onSetSoundOn={updateSoundOn}
              onAddCustom={handleAddCustomExercise}
            />
          </div>
        )}
        <div className="tab-panel" key={loading ? "loading" : tab}>
        {loading ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={22} />
            <p>Lade deine Daten…</p>
          </div>
        ) : tab === "dashboard" ? (
          <DashboardView
            exerciseEquipmentOverrides={exerciseEquipmentOverrides}
            bodyWeights={bodyWeights}
            bodyWeightNow={bodyWeightNow}
            plans={allPlans}
            logs={logs}
            exBy={allExBy}
            calendarEntries={calendarEntries}
            breathingExercises={breathingExercises}
            breathingLogs={breathingLogs}
            exerciseSubgroupOverrides={exerciseSubgroupOverrides}
            timeBasedExercises={timeBasedExercises}
            gymIndependentExercises={gymIndependentExercises}
            deloadWeeks={deloadWeeks}
            deloadStatusInfo={deloadInfo}
            theme={theme}
            onToggleTheme={toggleTheme}
            onManageGyms={() => setGymManagerOpen(true)}
            onManageBands={() => setBandManagerOpen(true)}
            onEditBodyWeight={() => {
              setBodyWeightDraft("");
              setBodyWeightDate(toDateKey(new Date()));
              setBodyWeightOpen(true);
            }}
            onManageBreathing={() => { setBreathingEditing(null); setBreathingManagerOpen(true); }}
            onOpenBackup={() => setBackupOpen(true)}
            onStartWorkout={(plan, entryId) => startScheduledWorkout(plan, entryId)}
            onStartBreathing={(exercise, entryId) => startBreathingSession(exercise, entryId)}
            onOpenProgress={() => setTab("progress")}
            // Derselbe Sprung, den der Kalender schon macht: in den Verlauf
            // und dieses Training gleich aufgeklappt.
            onOpenLog={(log) => { setTab("progress"); setHistoryFocusLogId(log.id); }}
          />
        ) : tab === "calendar" ? (
          <CalendarView
            onOpenLog={(log) => { setTab("progress"); setHistoryFocusLogId(log.id); }}
            entries={calendarEntries}
            categories={calendarCategories}
            plans={allPlans}
            logs={logs}
            timeBasedExercises={timeBasedExercises}
            exBy={allExBy}
            onAddAction={addCalendarAction}
            onScheduleWorkout={scheduleCalendarWorkout}
            onDeleteEntry={deleteCalendarEntry}
            onUpdateEntry={updateCalendarEntry}
            onToggleActionDone={toggleCalendarActionDone}
            onCreateCategory={createCalendarCategory}
            onDeleteCategory={deleteCalendarCategory}
            onStartScheduledWorkout={startScheduledWorkout}
            breathingExercises={breathingExercises}
            breathingLogs={breathingLogs}
            onScheduleBreathing={scheduleCalendarBreathing}
            onLogBreathing={addBreathingLogManually}
            onStartScheduledBreathing={startBreathingSession}
            deloadWeeks={deloadWeeks}
            onAddDeloadRange={addDeloadRange}
            onRemoveDeloadAt={removeDeloadAt}
            deloadStatusInfo={deloadInfo}
            deloadSuggestionHidden={deloadSuggestionHidden}
            onHideDeloadSuggestion={hideDeloadSuggestion}
          />
        ) : tab === "exercises" ? (
          <ExercisesView
            gyms={gyms}
            exercises={allExercises}
            logs={logs}
            exerciseNotes={exerciseNotes}
            exerciseSubgroupOverrides={exerciseSubgroupOverrides}
            onSetExerciseSubgroup={handleSetExerciseSubgroup}
            onSetExerciseSubgroups={handleSetExerciseSubgroups}
            exerciseEquipmentOverrides={exerciseEquipmentOverrides}
            onSetExerciseEquipment={handleSetExerciseEquipment}
            onAddCustom={handleAddCustomExercise}
            onDeleteCustom={async (id) => {
              await persistCustomExercises(customExercises.filter((e) => e.id !== id));
            }}
            onUpdateExerciseNote={handleUpdateExerciseNote}
            onRenameExercise={handleRenameExercise}
            timeBasedExercises={timeBasedExercises}
            gymIndependentExercises={gymIndependentExercises}
            onToggleTimeBased={handleToggleTimeBased}
            onToggleGymIndependent={handleToggleGymIndependent}
            onRequestConfirm={askConfirm}
          />
        ) : tab === "plans" ? (
          building ? (
            <PlanBuilder
              gyms={gyms}
              activeGymId={activeGymId}
              initialPlan={editingPlan}
              exercises={allExercises}
              folders={folders}
              logs={logs}
              plans={plans}
              exerciseNotes={exerciseNotes}
              exerciseSubgroupOverrides={exerciseSubgroupOverrides}
              onSetExerciseSubgroup={handleSetExerciseSubgroup}
              onSetExerciseSubgroups={handleSetExerciseSubgroups}
              exerciseEquipmentOverrides={exerciseEquipmentOverrides}
              onSetExerciseEquipment={handleSetExerciseEquipment}
              onAddCustom={handleAddCustomExercise}
              timeBasedExercises={timeBasedExercises}
              gymIndependentExercises={gymIndependentExercises}
              onUpdateExerciseNote={handleUpdateExerciseNote}
              onRenameExercise={handleRenameExercise}
              onToggleTimeBased={handleToggleTimeBased}
              onToggleGymIndependent={handleToggleGymIndependent}
              onCancel={() => { setBuilding(false); setEditingPlan(null); }}
              onSave={async (plan) => {
                const next = editingPlan
                  ? plans.map((p) => p.id === editingPlan.id ? { ...plan, id: editingPlan.id, programId: editingPlan.programId ?? activeProgramId } : p)
                  : [...plans, { ...plan, programId: activeProgramId }];
                await persistPlans(next);
                setBuilding(false);
                setEditingPlan(null);
              }}
              onCreateFolder={async (folder) => {
                await persistFolders([...folders, { ...folder, programId: activeProgramId }]);
              }}
            />
          ) : (
            <PlansView
              logs={logs}
              onReorderFolders={persistFolders}
              plans={allPlans}
              exBy={allExBy}
              folders={folders}
              programs={programs}
              activeProgramId={activeProgramId}
              onSelectProgram={persistActiveProgramId}
              onCreateProgram={async (name) => {
                const newProgram = { id: uid(), name };
                await persistPrograms([...programs, newProgram]);
                await persistActiveProgramId(newProgram.id);
              }}
              onRenameProgram={async (id, name) => {
                await persistPrograms(programs.map((pr) => (pr.id === id ? { ...pr, name } : pr)));
              }}
              onDeleteProgram={(id) => {
                if (programs.length <= 1) {
                  showToast("Du brauchst mindestens ein Trainingsprogramm.");
                  return;
                }
                const program = programs.find((pr) => pr.id === id);
                askConfirm(`Programm „${program?.name}“ wirklich löschen? Enthaltene Ordner und Pläne werden mitgelöscht.`, async () => {
                  const folderIdsInProgram = folders.filter((f) => f.programId === id).map((f) => f.id);
                  const remainingPrograms = programs.filter((pr) => pr.id !== id);
                  const isFirstProgram = programs[0]?.id === id;
                  await persistFolders(folders.filter((f) => f.programId !== id));
                  await persistPlans(
                    plans.filter((p) => {
                      // Plans inside one of this program's folders go away with it.
                      if (folderIdsInProgram.includes(p.folderId)) return false;
                      // So do folder-less plans belonging to this program
                      // (including legacy plans shown in the first program).
                      const isLoose = !p.folderId || !folders.some((f) => f.id === p.folderId);
                      if (isLoose) {
                        if (p.programId) return p.programId !== id;
                        return !isFirstProgram;
                      }
                      return true;
                    })
                  );
                  await persistPrograms(remainingPrograms);
                  if (activeProgramId === id) await persistActiveProgramId(remainingPrograms[0]?.id || null);
                });
              }}
              onCreate={() => { setEditingPlan(null); setBuilding(true); }}
              onDelete={deletePlan}
              onEdit={(plan) => { setEditingPlan(plan); setBuilding(true); }}
              onCreateFolder={async (folder) => {
                await persistFolders([...folders, { ...folder, programId: activeProgramId }]);
              }}
              onDeleteFolder={(id) => {
                askConfirm("Ordner wirklich löschen? Die Pläne bleiben erhalten.", async () => {
                  await persistFolders(folders.filter((f) => f.id !== id));
                  await persistPlans(
                    plans.map((p) => (p.folderId === id ? { ...p, folderId: null } : p))
                  );
                });
              }}
              onMovePlan={async (planId, folderId) => {
                await persistPlans(
                  plans.map((p) => (p.id === planId ? { ...p, folderId } : p))
                );
              }}
              onToggleFolderStatsExcluded={async (id) => {
                await persistFolders(
                  folders.map((f) => (f.id === id ? { ...f, statsExcluded: !f.statsExcluded } : f))
                );
              }}
              onStart={(plan) => requestStart(plan)}
            />
          )
        ) : tab === "log" ? (
          // Die Trainingsansicht wird oben gerendert und bleibt dort montiert.
          null
        ) : (
          <ProgressView
            bodyWeights={bodyWeights}
            focusLogId={historyFocusLogId}
            onFocusHandled={() => setHistoryFocusLogId(null)}
            onResumeLog={resumeLog}
            gyms={gyms}
            logs={logs}
            plans={allPlans}
            folders={folders}
            exBy={allExBy}
            exercises={allExercises}
            theme={theme}
            exerciseNotes={exerciseNotes}
            exerciseSubgroupOverrides={exerciseSubgroupOverrides}
            onSetExerciseSubgroup={handleSetExerciseSubgroup}
            exerciseEquipmentOverrides={exerciseEquipmentOverrides}
            onSetExerciseEquipment={handleSetExerciseEquipment}
            timeBasedExercises={timeBasedExercises}
            gymIndependentExercises={gymIndependentExercises}
            onUpdateExerciseNote={handleUpdateExerciseNote}
            onRenameExercise={handleRenameExercise}
            onToggleTimeBased={handleToggleTimeBased}
            onToggleGymIndependent={handleToggleGymIndependent}
            breathingExercises={breathingExercises}
            breathingLogs={breathingLogs}
            deloadWeeks={deloadWeeks}
            deloadInterval={deloadInterval}
            onSetDeloadInterval={persistDeloadInterval}
            onSetDeloadGuess={setDeloadGuess}
          />
        )}
        </div>
      </div>

      {finishSummary && (
        <Modal title="Training abgeschlossen" onClose={() => setFinishSummary(null)}>
          <div className="plan-title" style={{ marginBottom: 10 }}>
            {finishSummary.planName}
            {finishSummary.gymName && (
              <span className="tag tag-equipment" style={{ marginLeft: 8 }}>
                {finishSummary.gymName}
              </span>
            )}
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">
                {finishSummary.durationMinutes ? `${finishSummary.durationMinutes}` : "–"}
              </span>
              <span className="stat-label">
                {finishSummary.durationMinutes === 1 ? "Minute" : "Minuten"}
              </span>
            </div>
            {/* A timed workout has no volume worth showing (weight is 0),
                so the time actually spent under tension takes that slot. */}
            {finishSummary.totalVolume > 0 || finishSummary.totalSeconds === 0 ? (
              <div className="stat-item">
                <span className="stat-value">{Math.round(finishSummary.totalVolume)}</span>
                <span className="stat-label">kg Volumen</span>
              </div>
            ) : (
              <div className="stat-item">
                <span className="stat-value">
                  {finishSummary.totalSeconds >= 60
                    ? `${Math.round(finishSummary.totalSeconds / 60)}`
                    : finishSummary.totalSeconds}
                </span>
                <span className="stat-label">
                  {finishSummary.totalSeconds >= 60 ? "Min. unter Spannung" : "Sek. unter Spannung"}
                </span>
              </div>
            )}
            <div className="stat-item">
              <span className="stat-value">{finishSummary.doneSets}</span>
              <span className="stat-label">Sätze</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{finishSummary.exercises}</span>
              <span className="stat-label">Übungen</span>
            </div>
          </div>

          {finishSummary.records.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <label className="field-label">
                <Trophy size={12} /> Neue Bestleistung
                {finishSummary.records.length > 1 ? "en" : ""}
              </label>
              <div className="modal-list" style={{ marginTop: 8 }}>
                {finishSummary.records.map((r) => (
                  <div className="modal-option active" key={r.name}>
                    <span>{r.name}</span>
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label className="field-label">Wie war das Training?</label>
            <div className="chip-row chip-row-wrap" style={{ marginTop: 8, marginBottom: 0 }}>
              {FEELING_OPTIONS.map(([value, label]) => (
                <span
                  key={value}
                  className={`chip chip-sm ${finishSummary.feeling === value ? "active" : ""}`}
                  onClick={() => setLogFeeling(finishSummary.logId, value)}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Direkt nach dem Training frei geatmet? Dann steht die Abkürzung
              genau hier, statt dass man den Kalender aufmachen und den
              heutigen Tag suchen muss. */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {finishBreathingOpen ? (
              <BreathingLogForm
                breathingExercises={breathingExercises}
                dateLabel="heute"
                onSave={async (daten) => {
                  await addBreathingLogManually(toDateKey(new Date()), daten);
                  setFinishBreathingOpen(false);
                }}
                onCancel={() => setFinishBreathingOpen(false)}
              />
            ) : (
              <button
                className="btn btn-ghost btn-block btn-sm"
                onClick={() => setFinishBreathingOpen(true)}
              >
                <Wind size={14} /> Noch eine Atemübung gemacht?
              </button>
            )}
          </div>

          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => { setFinishSummary(null); setFinishBreathingOpen(false); }}
          >
            <Check size={14} /> Fertig
          </button>
        </Modal>
      )}

      {backupOpen && (
        <Modal title="Daten sichern" onClose={() => { setBackupOpen(false); setBackupMessage(null); }}>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px" }}>
            Die Sicherung enthält alles: Pläne, Ordner, Programme, absolvierte
            Trainings, eigene Übungen, Notizen, Kalender und Gyms. Lege die
            Datei in „Dateien" oder iCloud ab.
          </p>
          <button
            className="btn btn-primary btn-block btn-sm"
            disabled={backupBusy}
            onClick={handleExportBackup}
          >
            <Save size={14} /> Sicherung erstellen
          </button>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label className="field-label">Sicherung einspielen</label>
            <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "4px 0 8px" }}>
              Ersetzt deine aktuellen Daten durch den Inhalt der Datei.
            </p>
            <input
              ref={backupFileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
            <button
              className="btn btn-ghost btn-block btn-sm"
              disabled={backupBusy}
              onClick={() => backupFileRef.current?.click()}
            >
              <RotateCcw size={14} /> Datei auswählen
            </button>
          </div>
          {backupMessage && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12.5,
                color: backupMessage.kind === "error" ? "var(--danger, #e11d48)" : "var(--accent)",
              }}
            >
              {backupMessage.text}
            </div>
          )}
        </Modal>
      )}

      {breathingManagerOpen && (
        <Modal
          title={breathingEditing ? (breathingEditing.id ? "Atemübung bearbeiten" : "Neue Atemübung") : "Atemübungen"}
          width={420}
          onClose={() => { setBreathingManagerOpen(false); setBreathingEditing(null); }}
        >
          {breathingEditing ? (
            <BreathingEditor
              // Auch eine Vorlage muss den Editor vorbefüllen. Nur die id
              // fehlt ihr - daran hängt lediglich, ob gespeichert oder neu
              // angelegt wird, nicht ob Felder übernommen werden.
              initial={breathingEditing}
              onCancel={() => setBreathingEditing(null)}
              onSave={async (ex) => {
                await saveBreathingExercise(ex);
                setBreathingEditing(null);
              }}
            />
          ) : (
            <>
              {breathingExercises.length === 0 && (
                <div className="empty-state" style={{ padding: "14px 0" }}>
                  Noch keine Atemübung angelegt. Nimm unten eine Vorlage oder baue dir eine eigene.
                </div>
              )}
              <div className="modal-list">
                {breathingExercises.map((b) => {
                  const total = breathingTotalSeconds(b);
                  return (
                    <div className="modal-option" key={b.id}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block" }}>{b.name}</span>
                        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                          {plural(breathingPhases(b).length, "Phase", "Phasen")} ·{" "}
                          {plural(breathingRounds(b), "Runde", "Runden")}
                          {total == null ? " · offene Dauer" : ` · ca. ${Math.round(total / 60)} Min.`}
                        </span>
                      </span>
                      <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => startBreathingSession(b)}
                          title="Starten"
                        >
                          <Play size={13} />
                        </button>
                        <button className="btn-icon" title="Bearbeiten" onClick={() => setBreathingEditing(b)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn-icon" title="Löschen" onClick={() => deleteBreathingExercise(b.id)}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                className="btn btn-primary btn-block btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setBreathingEditing({ phases: [] })}
              >
                <Plus size={14} /> Eigene Atemübung
              </button>
              <label className="field-label" style={{ marginTop: 14 }}>Vorlagen</label>
              <div className="chip-row">
                {BREATHING_TEMPLATES.map((t) => (
                  <span
                    key={t.name}
                    className="chip chip-sm"
                    onClick={() => setBreathingEditing({ ...t, phases: t.phases.map((p) => ({ ...p })) })}
                  >
                    <Plus size={11} /> {t.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {breathingSession && (
        <BreathingSessionView
          session={breathingSession}
          onFinish={finishBreathingSession}
          onCancel={() => setBreathingSession(null)}
        />
      )}

      {bodyWeightOpen && (
        <Modal title="Körpergewicht" onClose={() => setBodyWeightOpen(false)}>
          {/* Wozu die Zahl da ist, steht direkt daneben - eine Eingabe ohne
              erkennbaren Zweck ist eine Zumutung (Regel 4 aus KONZEPT.md).
              Und was NICHT passiert, steht auch da: Die App wertet das
              Gewicht nicht aus und sagt nichts dazu. */}
          <p className="deload-basis" style={{ marginTop: 0 }}>
            Bei Klimmzügen, Dips oder Liegestützen ist dein Körper das Gewicht.
            Ohne diese Angabe zählt die App dort nur die Wiederholungen – ein
            Klimmzug mit 20 kg Gurt ist dann so viel wert wie einer ohne. Mit
            der Angabe rechnet sie in der Belastungs-Statistik mit
            Körpergewicht + Zusatz.
          </p>
          <p className="deload-basis">
            Freiwillig. Die Zahl wird nirgends ausgewertet und nirgends
            beurteilt – sie ist nur eine Umrechnungsgröße.
          </p>
          <p className="deload-basis">
            Trag den Wert neu ein, wenn er sich geändert hat – jede Woche
            rechnet dann mit dem Gewicht, das damals galt. Ohne das würde eine
            Zunahme von 5 kg deine ganze Klimmzug-Historie rückwirkend
            umschreiben.
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Gewicht in kg</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="z. B. 78,5"
                value={bodyWeightDraft}
                onChange={(e) => setBodyWeightDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addBodyWeight(bodyWeightDraft, bodyWeightDate);
                    setBodyWeightDraft("");
                  }
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">gültig ab</label>
              <input
                type="date"
                value={bodyWeightDate}
                onChange={(e) => setBodyWeightDate(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 10 }}
            disabled={!(toNum(bodyWeightDraft) > 0)}
            onClick={() => {
              addBodyWeight(bodyWeightDraft, bodyWeightDate);
              setBodyWeightDraft("");
            }}
          >
            <Plus size={14} /> Eintragen
          </button>

          {bodyWeights.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label className="field-label">Eingetragen</label>
              {/* Neueste zuerst - das ist der Wert, der gerade gilt. */}
              <div className="modal-list">
                {[...bodyWeights].reverse().map((e) => (
                  <div className="modal-option" key={e.id}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {fmtDecimal(e.kg)} kg
                      <span className="tag">
                        {e.date ? `ab ${fmtDate(e.date)}` : "von Anfang an"}
                      </span>
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => removeBodyWeight(e.id)}
                      title="Diesen Wert entfernen"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="deload-basis">
                Für Trainings vor der ältesten Angabe rechnet die App mit
                dieser ältesten – näher dran als mit gar keiner.
              </p>
            </div>
          )}
        </Modal>
      )}

      {bandManagerOpen && (
        <Modal
          title="Bänder verwalten"
          onClose={() => { setBandManagerOpen(false); setBandDraft({ name: "", kg: "" }); setRenamingBandId(null); }}
        >
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
            Trag deine Bänder einmal ein – Name und ungefähr, wie viel Kilogramm
            sie sich anfühlen. Im Training wählst du dann nur noch das Band aus.
            Der kg-Wert muss nicht genau sein; er sorgt dafür, dass ein
            stärkeres Band in der Statistik auch als mehr zählt.
          </p>
          {bands.length === 0 && <div className="empty-state">Noch keine Bänder angelegt.</div>}
          <div className="modal-list">
            {bands.map((b) => (
              <div key={b.id}>
                {renamingBandId === b.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={bandDraft.name}
                        onChange={(e) => setBandDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                    </div>
                    <div style={{ width: 74 }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bandDraft.kg}
                        onChange={(e) => setBandDraft((d) => ({ ...d, kg: e.target.value }))}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!bandDraft.name.trim() || !(toNum(bandDraft.kg) > 0)}
                      onClick={async () => {
                        await persistBands(
                          bands.map((x) =>
                            x.id === b.id
                              ? { ...x, name: bandDraft.name.trim(), kg: toNum(bandDraft.kg) }
                              : x
                          )
                        );
                        setRenamingBandId(null);
                        setBandDraft({ name: "", kg: "" });
                      }}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="modal-option">
                    <span>{b.name}</span>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span className="tag">{fmtDecimal(b.kg)} kg</span>
                      <button
                        className="btn-icon"
                        title="Bearbeiten"
                        onClick={() => {
                          setRenamingBandId(b.id);
                          setBandDraft({ name: b.name, kg: String(b.kg) });
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Löschen"
                        onClick={() =>
                          askConfirm(
                            `Band „${b.name}" löschen? Bereits gespeicherte Sätze behalten ihren Wert.`,
                            async () => { await persistBands(bands.filter((x) => x.id !== b.id)); }
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label className="field-label">Neues Band</label>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="z. B. Rot (mittel)"
                  value={renamingBandId ? "" : bandDraft.name}
                  onChange={(e) => { setRenamingBandId(null); setBandDraft((d) => ({ ...d, name: e.target.value })); }}
                />
              </div>
              <div style={{ width: 74 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="kg"
                  value={renamingBandId ? "" : bandDraft.kg}
                  onChange={(e) => { setRenamingBandId(null); setBandDraft((d) => ({ ...d, kg: e.target.value })); }}
                />
              </div>
            </div>
            <button
              className="btn btn-primary btn-block btn-sm"
              style={{ marginTop: 10 }}
              disabled={!bandDraft.name.trim() || !(toNum(bandDraft.kg) > 0) || !!renamingBandId}
              onClick={async () => {
                await persistBands([
                  ...bands,
                  { id: uid(), name: bandDraft.name.trim(), kg: toNum(bandDraft.kg) },
                ]);
                setBandDraft({ name: "", kg: "" });
              }}
            >
              <Plus size={14} /> Band hinzufügen
            </button>
          </div>
        </Modal>
      )}

      {gymManagerOpen && (
        <Modal
          title="Gyms verwalten"
          onClose={() => { setGymManagerOpen(false); setRenamingGymId(null); setGymDraftName(""); }}
        >
          {gyms.length === 0 && (
            <div className="empty-state">Noch keine Gyms angelegt.</div>
          )}
          <div className="modal-list">
            {gyms.map((g) => (
              <div key={g.id}>
                {renamingGymId === g.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={gymDraftName}
                        onChange={(e) => setGymDraftName(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!gymDraftName.trim()}
                      onClick={async () => {
                        await persistGyms(
                          gyms.map((x) => (x.id === g.id ? { ...x, name: gymDraftName.trim() } : x))
                        );
                        setRenamingGymId(null);
                        setGymDraftName("");
                      }}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="modal-option">
                    <span>{g.name}</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn-icon"
                        title="Umbenennen"
                        onClick={() => { setRenamingGymId(g.id); setGymDraftName(g.name); }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Löschen"
                        onClick={() =>
                          askConfirm(
                            `Gym „${g.name}" löschen? Bereits gespeicherte Trainings bleiben erhalten, verlieren aber ihre Gym-Zuordnung.`,
                            async () => {
                              await persistGyms(gyms.filter((x) => x.id !== g.id));
                              if (activeGymId === g.id) await persistActiveGymId(null);
                            }
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label className="field-label">Neues Gym</label>
            <input
              type="text"
              placeholder="z. B. Fitness Nord"
              value={renamingGymId ? "" : gymDraftName}
              onChange={(e) => { setRenamingGymId(null); setGymDraftName(e.target.value); }}
            />
            <button
              className="btn btn-primary btn-block btn-sm"
              style={{ marginTop: 10 }}
              disabled={!gymDraftName.trim() || !!renamingGymId}
              onClick={async () => {
                await persistGyms([...gyms, { id: uid(), name: gymDraftName.trim() }]);
                setGymDraftName("");
              }}
            >
              <Plus size={14} /> Gym hinzufügen
            </button>
          </div>
        </Modal>
      )}

      {pendingStart && (
        <Modal title="In welchem Gym trainierst du?" onClose={() => setPendingStart(null)}>
          {gyms.length > 0 && (
            <div className="modal-list" style={{ marginBottom: 12 }}>
              {gyms.map((g) => (
                <button
                  key={g.id}
                  className={`modal-option ${g.id === activeGymId ? "active" : ""}`}
                  onClick={() => confirmStart(g.id)}
                >
                  {g.name}
                  {g.id === activeGymId && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
          <label className="field-label">
            {gyms.length === 0 ? "Erstes Gym anlegen" : "Neues Gym"}
          </label>
          <input
            type="text"
            placeholder="z. B. Fitness Nord"
            value={newGymName}
            onChange={(e) => setNewGymName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createGymAndStart(); }}
          />
          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 10 }}
            disabled={!newGymName.trim()}
            onClick={createGymAndStart}
          >
            <Plus size={14} /> Anlegen und starten
          </button>
          <button
            className="btn btn-ghost btn-block btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => confirmStart(null)}
          >
            Ohne Gym trainieren
          </button>
        </Modal>
      )}

      {confirmState && (
        <div className="confirm-overlay" onClick={() => setConfirmState(null)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <p>{confirmState.message}</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmState(null)}>
                Abbrechen
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn?.();
                }}
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-snackbar">{toast}</div>
      )}

      {undoDelete && (
        <div className="undo-snackbar">
          <span>„{undoDelete.name}“ gelöscht</span>
          <button className="btn btn-primary btn-sm" onClick={undoPlanDelete}><RotateCcw size={13} /> Rückgängig</button>
        </div>
      )}

      {/* Leiste und Navigation sitzen in einem gemeinsamen Dock: so
          verschieben sie sich beim Ausblenden zusammen, statt getrennt
          übereinander wegzurutschen. */}
      <div className={`bottom-dock ${navHidden ? "nav-hidden" : ""}`}>
        {session && tab !== "log" && (
          <ActiveSessionBar
            session={session}
            restEndsAt={restEndsAt}
            onOpen={() => setTab("log")}
          />
        )}
        <nav className="fab-nav">
          <button
            className={`nav-btn ${tab === "dashboard" ? "active" : ""}`}
            onClick={() => setTab("dashboard")}
          >
            <Home size={19} />
            Start
          </button>
          <button
            className={`nav-btn ${tab === "calendar" ? "active" : ""}`}
            onClick={() => setTab("calendar")}
          >
            <Calendar size={19} />
            Kalender
          </button>
          <button
            className={`nav-btn ${tab === "plans" ? "active" : ""}`}
            onClick={() => {
              setBuilding(false);
              setTab("plans");
            }}
          >
            <ClipboardList size={19} />
            Pläne
          </button>
          <button
            className={`nav-btn ${tab === "exercises" ? "active" : ""}`}
            onClick={() => setTab("exercises")}
          >
            <Dumbbell size={19} />
            Übungen
          </button>
          <button
            className={`nav-btn ${tab === "progress" ? "active" : ""}`}
            onClick={() => setTab("progress")}
          >
            <TrendingUp size={19} />
            Fortschritt
          </button>
        </nav>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard (Start)
// ---------------------------------------------------------------------------

// Schmale Leiste über der Navigation, solange ein Training läuft und man
// gerade woanders ist. Ersetzt den früheren "Training"-Reiter als Rückweg -
// und zeigt zusätzlich die laufende Satzpause, die vorher nur innerhalb der
// Trainingsansicht sichtbar war. Eigene Komponente mit eigenem Sekundentakt,
// damit nicht die ganze App im Sekundenrhythmus neu rendert.
function ActiveSessionBar({ session, restEndsAt, onOpen }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const restLeft = restEndsAt > now ? Math.round((restEndsAt - now) / 1000) : 0;
  const startedAt = session?.startedAt ? new Date(session.startedAt).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <button className="session-bar" onClick={onOpen}>
      <span className="session-bar-main">
        <Play size={14} />
        <span className="session-bar-name">{session.planName || "Freies Training"}</span>
      </span>
      <span className={`session-bar-time ${restLeft > 0 ? "is-rest" : ""}`}>
        {restLeft > 0 ? `Pause ${fmtClock(restLeft)}` : fmtClock(elapsed)}
      </span>
    </button>
  );
}

// Zählt die Rekorde eines einzelnen Trainings nach - dieselbe Regel wie die
// Abschluss-Zusammenfassung: verglichen wird gegen die Historie OHNE dieses
// Training, sonst schlüge jeder Satz seinen eigenen Wert.
// Die Rekorde der letzten Tage, einzeln aufgeschlüsselt: welche Übung, welche
// Art Rekord, welcher Wert, wann.
//
// Gezählt wird pro Übung nur der BESTE Satz des Trainings - genau wie beim
// Pokal in der Trainingsansicht. Wer sich 60/70/80 hocharbeitet, schlägt mit
// allen drei Sätzen den alten Bestwert; drei Einträge dafür sagen weniger als
// einer für den Satz, auf den es ankam.
// Die Historie, wie sie VOR diesem Training aussah. getExerciseHistory kennt
// von sich aus keine Zeitrichtung - es nimmt alle Logs ausser dem einen
// ausgeschlossenen, also auch spaetere. Im laufenden Training ist das
// dasselbe (es gibt nichts Spaeteres), beim Nachschlagen alter Trainings
// nicht: Ein Rekord vom Mai waere sonst nachtraeglich keiner mehr, sobald er
// im Juli ueberboten wurde. Er war aber im Mai einer, und genau darum geht es
// bei einem Pokal im Verlauf.
export function logsBefore(logs, log) {
  const ts = new Date(log?.date).getTime();
  const alle = Array.isArray(logs) ? logs : [];
  if (!Number.isFinite(ts)) return alle;
  return alle.filter((l) => {
    if (l?.id === log?.id) return false;
    const t = new Date(l?.date).getTime();
    return Number.isFinite(t) && t < ts;
  });
}

// Die Rekorde EINES Trainings fuer EINE Uebung, gemessen an einer schon
// fertigen Historie. Der eigentliche Kern - alles andere unterscheidet sich
// nur darin, WOHER diese Historie kommt.
//
// Gezaehlt wird pro Uebung nur der BESTE Satz des Trainings - genau wie beim
// Pokal in der Trainingsansicht. Wer sich 60/70/80 hocharbeitet, schlaegt mit
// allen drei Saetzen den alten Bestwert; drei Eintraege dafuer sagen weniger
// als einer fuer den Satz, auf den es ankam.
function prsAgainstHistory(entry, history, isTime) {
  const performed = performedWorkingSets(entrySets(entry));
  const hasWeight = performed.some((x) => toNum(x.weight) > 0);
  let bester = null;
  let bestesErgebnis = [];
  let bestePunkte = -1;
  performed.forEach((set) => {
    const prs = describeSetPRs(set, history, isTime, hasWeight, entry.rir);
    if (prs.length === 0) return;
    // Derselbe Massstab wie in der Trainingsansicht: der schwerste Satz,
    // bei Gleichstand der mit den meisten Wiederholungen.
    const punkte = isTime
      ? toNum(set.duration)
      : toNum(set.weight) * 1000 + toNum(set.reps);
    if (punkte > bestePunkte) { bestePunkte = punkte; bester = set; bestesErgebnis = prs; }
  });
  // Getrennt gehalten, weil nicht jede Anzeige beides will: Die Liste
  // "Rekorde der letzten 7 Tage" zeigt nur die Satz-Rekorde - ein
  // Gesamtvolumen ist schon ueberboten, wenn man einen Satz mehr macht, und
  // wuerde die Liste zumuellen. Die Uebungs-Diagramme zeigen beides, weil es
  // dort eine eigene Kurve fuer das Gesamtvolumen gibt.
  const gesamt = describeExercisePRs(performed, history, isTime, hasWeight, entry.rir);
  if (!bester && gesamt.length === 0) return null;
  return { set: bester, prs: bestesErgebnis, gesamt };
}

// Dasselbe fuer ein einzelnes Training, mit frisch aufgebauter Historie.
export function entryPRs(logs, log, entry, isTime, gymId) {
  const history = getExerciseHistory(logsBefore(logs, log), entry.exerciseId, log.id, isTime, gymId);
  return prsAgainstHistory(entry, history, isTime);
}

// Alle Trainings einmal von alt nach neu durchgehen und zu jedem melden,
// welche Rekorde es gebracht hat. Die Historie waechst dabei mit, statt fuer
// jedes Training neu aufgebaut zu werden - das ist der Unterschied zwischen
// "ist sofort da" und "eine Sekunde Standbild" bei ein paar hundert
// Trainings.
//
// Die Gym-Regel aus getExerciseHistory gilt unveraendert: Gemessen wird
// innerhalb desselben Gyms, solange es dort schon ein frueheres Training
// gab - sonst gegen alles. Deshalb laufen zwei Konten nebeneinander mit.
function walkLogPRs(logs, timeBasedExercises, gymIndependentExercises, melde) {
  const chronologisch = (Array.isArray(logs) ? logs : [])
    .filter(Boolean)
    .map((l) => ({ log: l, ts: new Date(l?.date).getTime() }))
    .filter((x) => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
  const ueberAlles = {};        // exerciseId -> Historie ueber alle Gyms
  const proGym = {};            // gymId -> exerciseId -> Historie
  const trainingsProGym = {};   // gymId -> Anzahl frueherer Trainings
  const zeitCache = {};         // exerciseId -> ist das eine Zeit-Uebung?
  const istZeit = (entry) => {
    if (!(entry.exerciseId in zeitCache)) {
      zeitCache[entry.exerciseId] = isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises);
    }
    return zeitCache[entry.exerciseId] || !!entry.targetUseTime;
  };
  const konto = (topf, exerciseId) =>
    topf[exerciseId] || (topf[exerciseId] = emptyExerciseHistory());
  chronologisch.forEach(({ log }) => {
    const eintraege = logEntries(log);
    eintraege.forEach((entry) => {
      const isTime = istZeit(entry);
      const gymId = effectiveGymId(entry.exerciseId, log.gymId, gymIndependentExercises);
      // Genau die Bedingung aus getExerciseHistory: In diesem Gym gab es
      // schon ein Training (irgendeines, nicht nur dieser Uebung).
      const imGym = !!gymId && (trainingsProGym[gymId] || 0) > 0;
      const stand = imGym
        ? konto(proGym[gymId] || (proGym[gymId] = {}), entry.exerciseId)
        : konto(ueberAlles, entry.exerciseId);
      const treffer = prsAgainstHistory(entry, finishExerciseHistory(stand, false), isTime);
      if (treffer) melde(log, entry, treffer);
    });
    // Erst danach zaehlt dieses Training selbst mit - fuer alle spaeteren.
    const gesehen = new Set();
    eintraege.forEach((entry) => {
      if (gesehen.has(entry.exerciseId)) return;
      gesehen.add(entry.exerciseId);
      const isTime = istZeit(entry);
      addSessionToExerciseHistory(konto(ueberAlles, entry.exerciseId), log, entry.exerciseId, isTime, false);
      if (log.gymId) {
        const gymKonten = proGym[log.gymId] || (proGym[log.gymId] = {});
        addSessionToExerciseHistory(konto(gymKonten, entry.exerciseId), log, entry.exerciseId, isTime, false);
      }
    });
    if (log.gymId) trainingsProGym[log.gymId] = (trainingsProGym[log.gymId] || 0) + 1;
  });
}

// Welche Trainings dieser Uebung einen Rekord gebracht haben - als
// Nachschlagewerk { logId: [Rekorde] } fuer die Pokale in den Diagrammen.
export function getExercisePRHistory(logs, exerciseId, isTimeBased = false, gymIndependent = false) {
  const map = {};
  walkLogPRs(
    logs,
    { [exerciseId]: !!isTimeBased },
    gymIndependent ? { [exerciseId]: true } : {},
    (log, entry, treffer) => {
      if (entry.exerciseId !== exerciseId) return;
      map[log.id] = [...(map[log.id] || []), ...treffer.prs, ...treffer.gesamt];
    }
  );
  return map;
}

// Welche Trainings welche Rekorde gebracht haben - fuer die Pokale im
// Verlauf. { logId: { entrySchluessel: [Rekorde] } }.
// Einmal fuer alle Trainings gerechnet statt pro aufgeklapptem Training:
// Die Pokale sollen in der Liste zu SEHEN sein, nicht erst auftauchen, wenn
// man ein Training oeffnet - sonst muesste man jedes einzeln aufklappen, um
// zu finden, wo etwas passiert ist.
export function getLogsPRIndex(logs, timeBasedExercises, gymIndependentExercises) {
  const index = {};
  walkLogPRs(logs, timeBasedExercises, gymIndependentExercises, (log, entry, treffer) => {
    const alle = [...treffer.prs, ...treffer.gesamt];
    if (alle.length === 0) return;
    if (!index[log.id]) index[log.id] = {};
    index[log.id][entry.id || entry.exerciseId] = alle;
  });
  return index;
}

export function getRecentPRs(
  logs, exBy, timeBasedExercises, gymIndependentExercises, days = 7, nowTs = Date.now()
) {
  const von = nowTs - days * 86400000;
  const treffer = [];
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    const ts = new Date(log?.date).getTime();
    if (!Number.isFinite(ts) || ts < von) return;
    logEntries(log).forEach((entry) => {
      const ex = exBy[entry.exerciseId];
      if (!ex) return;
      const isTime =
        isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises) || !!entry.targetUseTime;
      const gefunden = entryPRs(
        logs, log, entry, isTime,
        effectiveGymId(entry.exerciseId, log.gymId, gymIndependentExercises)
      );
      if (!gefunden) return;
      gefunden.prs.forEach((pr) => {
        treffer.push({
          exerciseId: entry.exerciseId,
          exerciseName: ex.name,
          date: log.date,
          title: pr.title,
          value: pr.value,
          previous: pr.previous,
          set: gefunden.set,
        });
      });
    });
  });
  return treffer.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function countLogPRs(log, logs, exBy, timeBasedExercises, gymIndependentExercises) {
  let prs = 0;
  logEntries(log).forEach((entry) => {
    if (!exBy[entry.exerciseId]) return;
    const isTime =
      isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises) || !!entry.targetUseTime;
    const history = getExerciseHistory(
      logsBefore(logs, log), entry.exerciseId, log.id, isTime,
      effectiveGymId(entry.exerciseId, log.gymId, gymIndependentExercises)
    );
    if (entrySets(entry).some((s) => s.done && !s.warmup && isNewPR(s, history, isTime))) prs += 1;
  });
  return prs;
}

function DashboardView({
  plans,
  logs,
  exBy,
  calendarEntries,
  breathingExercises,
  breathingLogs,
  exerciseSubgroupOverrides,
  exerciseEquipmentOverrides,
  timeBasedExercises,
  gymIndependentExercises,
  bodyWeights = [],
  bodyWeightNow = 0,
  deloadWeeks = [],
  deloadStatusInfo = null,
  theme,
  onToggleTheme = () => {},
  onManageGyms = () => {},
  onManageBands = () => {},
  onEditBodyWeight = () => {},
  onManageBreathing = () => {},
  onOpenBackup = () => {},
  onStartWorkout,
  onStartBreathing,
  onOpenProgress,
  onOpenLog,
}) {
  const todayKey = toDateKey(new Date());
  // Das Zahnrad links oben. Gyms, Atemübungen, Sicherung und der
  // Hell/Dunkel-Umschalter lagen früher im Programm-Menü im Reiter "Pläne" -
  // sie gehören aber nicht zu einem Trainingsprogramm, sondern zur ganzen App.
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (!settingsOpen) return;
    const close = (e) => { if (!e.target.closest?.(".dash-settings")) setSettingsOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [settingsOpen]);

  // Nur was heute noch offen ist - schon Erledigtes steht im Kalender und
  // im Verlauf, hier wäre es nur Ballast.
  const todayOpen = useMemo(
    () => calendarEntries.filter((ce) => ce.date === todayKey && !ce.logId && ce.type !== "action"),
    [calendarEntries, todayKey]
  );

  // Belastungssignale: dieselbe Auswertung wie im Fortschritt-Tab, hier aber
  // auf die auffälligen Gruppen eingedampft.
  const loadHistoryWeeks = useMemo(() => logsHistoryWeeks(logs), [logs]);
  // Die Wochenreihen werden zweimal gebraucht - für die Signale je
  // Muskelgruppe und für die Gesamtbelastung in der Frühwarnung. Einmal
  // gerechnet reicht; die Reihe über alle Gyms und Übungen ist nicht billig.
  const loadSeries = useMemo(
    () => getMuscleLoadSeries(
      logs, exBy, exerciseSubgroupOverrides, timeBasedExercises,
      muscleSeriesWeekCount(loadHistoryWeeks), Date.now(),
      { equipmentOverrides: exerciseEquipmentOverrides, bodyWeights }
    ),
    [logs, exBy, exerciseSubgroupOverrides, timeBasedExercises, loadHistoryWeeks,
     exerciseEquipmentOverrides, bodyWeights]
  );

  // Entlastungswochen zählen in den Warnungen als Lücke, nicht als Tief -
  // siehe den Block bei deloadWeekFlags. Ohne markierte Wochen sind die
  // Flags durchgehend false und alles rechnet wie zuvor.
  const deloadFlags = useMemo(
    () => deloadWeekFlags(deloadWeeks, loadSeries[0]?.values?.length || 0),
    [deloadWeeks, loadSeries]
  );

  const signals = useMemo(
    () => loadSeries
      .map((g) => ({
        id: g.id,
        label: g.label,
        signal: detectLoadSignal(g.values, loadHistoryWeeks, deloadFlags),
        change: muscleLoadChange(g.values, 4, loadHistoryWeeks, deloadFlags),
      }))
      .filter((g) => g.signal),
    [loadSeries, loadHistoryWeeks, deloadFlags]
  );

  const fatigueWarning = useMemo(
    () => getFatigueWarning(logs, loadSeries, Date.now(), deloadWeeks),
    [logs, loadSeries, deloadWeeks]
  );

  const lastLog = useMemo(() => {
    let best = null;
    logs.forEach((l) => {
      const ts = new Date(l?.date).getTime();
      if (!Number.isFinite(ts)) return;
      if (!best || ts > new Date(best.date).getTime()) best = l;
    });
    return best;
  }, [logs]);

  const lastLogInfo = useMemo(() => {
    if (!lastLog) return null;
    const doneSets = logEntries(lastLog).reduce(
      (sum, e) => sum + entrySets(e).filter((s) => s.done && !s.warmup).length, 0
    );
    return {
      name: lastLog.planName || lastLog.name || "Freies Training",
      date: lastLog.date,
      minutes: toNum(lastLog.durationMinutes),
      doneSets,
      prs: countLogPRs(lastLog, logs, exBy, timeBasedExercises, gymIndependentExercises),
    };
  }, [lastLog, logs, exBy, timeBasedExercises, gymIndependentExercises]);

  // Die vier Kacheln. Alle rollierend über 7 Tage gerechnet, wie überall
  // sonst in der App - nicht nach Kalenderwoche, damit "diese Woche" am
  // Montagmorgen nicht plötzlich bei null steht.
  const tiles = useMemo(() => {
    const now = Date.now();
    const week = 7 * 86400000;
    const workingSets = (l) =>
      logEntries(l).flatMap((e) => entrySets(e).filter((s) => s.done && !s.warmup));
    const volumeOf = (list) =>
      list.reduce((sum, l) => sum + workingSets(l).reduce(
        (s, x) => s + toNum(x.weight) * toNum(x.reps), 0
      ), 0);

    const inWindow = (from, to) => logs.filter((l) => {
      const ts = new Date(l?.date).getTime();
      return Number.isFinite(ts) && ts > now - from && ts <= now - to;
    });
    const thisWeek = inWindow(week, 0);
    const lastWeek = inWindow(2 * week, week);
    const volume = volumeOf(thisWeek);
    const prevVolume = volumeOf(lastWeek);
    const volumeChange = prevVolume > 0 ? Math.round(((volume - prevVolume) / prevVolume) * 100) : null;
    // War die Vorwoche eine Entlastungswoche, wird die Zahl nicht versteckt,
    // sondern beschriftet: "+184 % ggü. Vorwoche" ist zwar richtig, sagt aber
    // ohne diesen Zusatz das Gegenteil von dem, was passiert ist.
    const prevWasDeload = lastWeek.some((l) => isDeloadDate(new Date(l?.date), deloadWeeks));

    const daysSince = lastLog
      ? Math.max(0, Math.floor((now - new Date(lastLog.date).getTime()) / 86400000))
      : null;

    // Vernachlässigt heißt: seit dem längsten Zeitraum nicht mehr trainiert.
    // Nie trainierte Gruppen bleiben außen vor - die sind meist Absicht und
    // stünden sonst dauerhaft und unveränderlich in der Kachel.
    const lastByGroup = {};
    logs.forEach((l) => {
      const ts = new Date(l?.date).getTime();
      if (!Number.isFinite(ts)) return;
      logEntries(l).forEach((e) => {
        const g = exBy[e.exerciseId]?.group;
        if (!g) return;
        if (!entrySets(e).some((s) => s.done && !s.warmup)) return;
        if (!lastByGroup[g] || ts > lastByGroup[g]) lastByGroup[g] = ts;
      });
    });
    let neglected = null;
    Object.entries(lastByGroup).forEach(([g, ts]) => {
      const days = Math.floor((now - ts) / 86400000);
      if (!neglected || days > neglected.days) {
        neglected = { days, label: MUSCLE_GROUPS.find((m) => m.id === g)?.label || g };
      }
    });

    return { daysSince, count: thisWeek.length, volume, volumeChange, prevWasDeload, neglected };
  }, [logs, exBy, lastLog, deloadWeeks]);

  const planById = useMemo(() => {
    const map = {};
    plans.forEach((p) => { map[p.id] = p; });
    return map;
  }, [plans]);
  const breathingById = useMemo(() => {
    const map = {};
    breathingExercises.forEach((b) => { map[b.id] = b; });
    return map;
  }, [breathingExercises]);

  // Geschätzte Dauer aus den bisherigen Durchläufen desselben Plans - eine
  // gemittelte Erfahrung sagt mehr als jede Formel aus Sätzen mal Pausenzeit.
  const planMinutes = (planId) => {
    const durations = logs
      .filter((l) => l.planId === planId && toNum(l.durationMinutes) > 0)
      .map((l) => toNum(l.durationMinutes));
    if (durations.length === 0) return null;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  };

  const planGroups = (plan) => {
    const seen = [];
    (Array.isArray(plan?.items) ? plan.items : []).forEach((it) => {
      const g = exBy[it.exerciseId]?.group;
      if (g && !seen.includes(g)) seen.push(g);
    });
    return seen.map((g) => MUSCLE_GROUPS.find((m) => m.id === g)?.label || g);
  };

  return (
    <div>
      <div className="dash-settings">
        <button
          className={`btn-icon dash-settings-trigger ${settingsOpen ? "is-open" : ""}`}
          onClick={(e) => { e.stopPropagation(); setSettingsOpen((o) => !o); }}
          title="Einstellungen"
        >
          <Settings size={17} />
        </button>
        {settingsOpen && (
          <div className="program-menu dash-settings-menu">
            <button
              className="program-menu-item"
              onClick={() => { setSettingsOpen(false); onManageGyms(); }}
            >
              <Dumbbell size={14} /> Gyms verwalten
            </button>
            <button
              className="program-menu-item"
              onClick={() => { setSettingsOpen(false); onManageBands(); }}
            >
              <Repeat size={14} /> Bänder verwalten
            </button>
            <button
              className="program-menu-item"
              onClick={() => { setSettingsOpen(false); onManageBreathing(); }}
            >
              <Wind size={14} /> Atemübungen
            </button>
            <button
              className="program-menu-item"
              onClick={() => { setSettingsOpen(false); onEditBodyWeight(); }}
            >
              <User size={14} /> Körpergewicht
              {bodyWeightNow > 0 && (
                <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>
                  {fmtDecimal(bodyWeightNow)} kg
                </span>
              )}
            </button>
            <button
              className="program-menu-item"
              onClick={() => { setSettingsOpen(false); onOpenBackup(); }}
            >
              <Save size={14} /> Daten sichern
            </button>
            <div className="program-menu-divider" />
            <button
              className="program-menu-item"
              onClick={() => { setSettingsOpen(false); onToggleTheme(); }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Heller Modus" : "Dunkler Modus"}
            </button>
          </div>
        )}
      </div>

      {todayOpen.length > 0 && (
        <>
          <span className="stat-section-title">Heute</span>
          {todayOpen.map((ce, idx) => {
            if (ce.type === "breathing") {
              const ex = breathingById[ce.breathingId];
              if (!ex) return null;
              const total = breathingTotalSeconds(ex);
              return (
                <div className="card" key={ce.id}>
                  <div className="plan-title">
                    <Wind size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                    {ex.name}
                  </div>
                  <div style={{ margin: "6px 0 10px", color: "var(--text-dim)", fontSize: 13 }}>
                    {plural(breathingPhases(ex).length, "Phase", "Phasen")} ·{" "}
                    {plural(breathingRounds(ex), "Runde", "Runden")}
                    {total == null ? " · offene Dauer" : ` · ca. ${Math.max(1, Math.round(total / 60))} Min.`}
                  </div>
                  <button
                    className={`btn ${idx === 0 ? "btn-primary" : "btn-ghost"} btn-block`}
                    onClick={() => onStartBreathing(ex, ce.id)}
                  >
                    <Play size={15} /> Starten
                  </button>
                </div>
              );
            }
            const plan = planById[ce.planId];
            if (!plan) return null;
            const groups = planGroups(plan);
            const minutes = planMinutes(plan.id);
            return (
              <div className="card" key={ce.id}>
                <div className="plan-title">{plan.name}</div>
                <div style={{ margin: "6px 0 10px", color: "var(--text-dim)", fontSize: 13 }}>
                  {groups.length > 0 && <>{groups.join(" · ")}<br /></>}
                  {plural((plan.items || []).length, "Übung", "Übungen")}
                  {minutes ? ` · ca. ${minutes} Min.` : ""}
                </div>
                <button
                  className={`btn ${idx === 0 ? "btn-primary" : "btn-ghost"} btn-block`}
                  onClick={() => onStartWorkout(plan, ce.id)}
                >
                  <Play size={15} /> Training starten
                </button>
              </div>
            );
          })}
        </>
      )}

      {lastLog && (
        <div className="stats-grid" style={{ marginBottom: 4 }}>
          <div className="stat-item">
            <span className="stat-value">{tiles.daysSince}</span>
            <span className="stat-label">
              {tiles.daysSince === 0 ? "Heute trainiert" : "Tage seit Training"}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{tiles.count}</span>
            <span className="stat-label">Trainings (7 Tage)</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{Math.round(tiles.volume).toLocaleString("de-DE")}</span>
            <span className="stat-label">
              kg Volumen
              {tiles.volumeChange != null && (
                <>
                  {" "}· {tiles.volumeChange > 0 ? "+" : ""}{tiles.volumeChange} % ggü.{" "}
                  {tiles.prevWasDeload ? "Entlastungswoche" : "Vorwoche"}
                </>
              )}
            </span>
          </div>
          {tiles.neglected && (
            <div className="stat-item">
              <span className="stat-value">{tiles.neglected.days}</span>
              <span className="stat-label">Tage ohne {tiles.neglected.label}</span>
            </div>
          )}
        </div>
      )}

      <span className="stat-section-title">Belastung</span>
      <div className="card">
        {/* Steht über den Gruppen-Signalen, weil es den ganzen Menschen
            betrifft und nicht eine Muskelgruppe. Bewusst nur zwei
            Feststellungen und kein Rat: ob das ein Grund zum Zurückschalten
            ist, hängt von der Trainingsphase und vom Rest des Lebens ab -
            beides weiß die App nicht (KONZEPT.md, Regel 2 und 3). */}
        {fatigueWarning && (
          <div className="fatigue-note">
            <AlertTriangle size={14} className="fatigue-note-icon" />
            <div>
              Seit {FATIGUE_WINDOW_WEEKS} Wochen fühlen sich deine Trainings schlechter an als
              sonst – im Schnitt „{fatigueWarning.recentLabel}" statt „{fatigueWarning.usualLabel}"
              {" "}(aus {fatigueWarning.sessions} {fatigueWarning.sessions === 1 ? "Training" : "Trainings"}).
              Gleichzeitig liegt deine Belastung {fatigueWarning.loadRise} % über den Wochen davor.
            </div>
          </div>
        )}
        {/* Der eigene Rhythmus ist erreicht. Eine Feststellung mit einer
            Zahl, keine Aufforderung - ob jetzt entlastet wird, entscheidet
            der Mensch (KONZEPT.md, Regel 3). Das Intervall ist ohnehin die
            Zahl, die er selbst eingetragen hat. */}
        {deloadStatusInfo?.due && (
          <div className="fatigue-note">
            <BatteryLow size={14} className="fatigue-note-icon" />
            <div>
              Seit {plural(deloadStatusInfo.weeksSince, "Woche", "Wochen")} keine
              Entlastung – dein Rhythmus sind {deloadStatusInfo.intervalWeeks} Wochen.
            </div>
          </div>
        )}
        {signals.length === 0 && !fatigueWarning && !deloadStatusInfo?.due ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            Keine Auffälligkeiten.
          </div>
        ) : (
          signals.map((g) => (
            <div className="dash-signal-row" key={g.id} onClick={onOpenProgress}>
              <LoadSignalBadge signal={g.signal} />
              <span className="dash-signal-label">{g.label}</span>
              <span className="dash-signal-text">
                {g.signal.type === "plateau"
                  ? "seit Wochen keine Steigerung"
                  : `${g.change != null && g.change > 0 ? "+" : ""}${g.change != null ? Math.round(g.change) : "?"} % ggü. 4-Wochen-Schnitt`}
              </span>
              <ChevronRight size={14} color="var(--text-dim)" />
            </div>
          ))
        )}
      </div>

      {lastLogInfo && (
        <>
          <span className="stat-section-title">Letztes Training</span>
          <div
            className="card dash-last-log"
            onClick={() => onOpenLog?.(lastLog)}
            title="Antippen: das ganze Training ansehen"
          >
            <div className="plan-title">{lastLogInfo.name}</div>
            <div style={{ marginTop: 6, color: "var(--text-dim)", fontSize: 13 }}>
              {timeAgoShort(lastLogInfo.date)}
              {lastLogInfo.minutes > 0 ? ` · ${lastLogInfo.minutes} Min.` : ""}
              {` · ${plural(lastLogInfo.doneSets, "Satz", "Sätze")}`}
            </div>
            {lastLogInfo.prs > 0 && (
              <div style={{ marginTop: 6, color: "var(--brass)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} /> {lastLogInfo.prs} {lastLogInfo.prs === 1 ? "Rekord" : "Rekorde"}
              </div>
            )}
            <ChevronRight size={16} className="dash-last-log-arrow" />
          </div>
        </>
      )}

    </div>
  );
}

function CalendarView({
  entries,
  categories,
  plans,
  logs,
  exBy,
  timeBasedExercises = {},
  onAddAction,
  onScheduleWorkout,
  onDeleteEntry,
  onUpdateEntry,
  onToggleActionDone,
  onCreateCategory,
  onDeleteCategory,
  onStartScheduledWorkout,
  onOpenLog,
  breathingExercises = [],
  breathingLogs = [],
  onScheduleBreathing,
  onLogBreathing,
  onStartScheduledBreathing,
  deloadWeeks = [],
  onAddDeloadRange,
  onRemoveDeloadAt,
  deloadStatusInfo = null,
  deloadSuggestionHidden = false,
  onHideDeloadSuggestion,
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState("action");
  // Im Atem-Reiter: vormerken oder nachtragen.
  const [breathingMode, setBreathingMode] = useState("plan");
  const [newActionText, setNewActionText] = useState("");
  const [newActionCategory, setNewActionCategory] = useState(null);
  const [newActionDuration, setNewActionDuration] = useState("");
  const [workoutQuery, setWorkoutQuery] = useState("");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  // Editing an existing entry: date can move for every type, plan/exercise
  // can be swapped for workout/breathing, and action entries additionally
  // get their category/text/duration reopened for editing.
  const [editingEntry, setEditingEntry] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editActionCategory, setEditActionCategory] = useState(null);
  const [editActionText, setEditActionText] = useState("");
  const [editActionDuration, setEditActionDuration] = useState("");
  const [editSwapQuery, setEditSwapQuery] = useState("");
  // Erster angetippter Tag einer Entlastung. Solange er gesetzt ist, schliesst
  // der naechste Tipp im Kalender den Zeitraum ab - deshalb der deutlich
  // sichtbare Streifen ueber dem Gitter mit dem Abbrechen-Knopf.
  const [deloadDraft, setDeloadDraft] = useState(null);

  const todayKey = toDateKey(today);
  const monthMatrix = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const entriesByDate = useMemo(() => {
    const map = {};
    const todayKey = toDateKey(new Date());
    entries.forEach((e) => {
      // A planned workout that never happened simply disappears once the day
      // is over - keeping it around would only ever be a reproach.
      const verpasst =
        (e.type === "workout" || e.type === "breathing") && !e.logId && e.date < todayKey;
      if (verpasst) return;
      (map[e.date] = map[e.date] || []).push(e);
    });
    return map;
  }, [entries]);

  // Workouts actually done, grouped by day. The calendar was purely a plan
  // until now - what you really trained was only visible in the history.
  const logsByDate = useMemo(() => {
    const map = {};
    (logs || []).forEach((l) => {
      if (!l?.date) return;
      const key = toDateKey(new Date(l.date));
      (map[key] = map[key] || []).push(l);
    });
    return map;
  }, [logs]);
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);
  // A completed session keeps its own snapshot of the plan's name (taken at
  // the time it was done), so a calendar entry for an already-finished
  // workout can still show the right name even after the plan itself was
  // deleted from the folder structure afterwards.
  const logById = useMemo(() => Object.fromEntries((logs || []).map((l) => [l.id, l])), [logs]);
  const breathingById = useMemo(
    () => Object.fromEntries(breathingExercises.map((b) => [b.id, b])),
    [breathingExercises]
  );
  const breathingLogById = useMemo(
    () => Object.fromEntries(breathingLogs.map((l) => [l.id, l])),
    [breathingLogs]
  );

  const goPrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayKey);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  const planned = entriesByDate[selectedDate] || [];
  // Done workouts that are not already represented by a planned entry.
  const selectedLogs = (logsByDate[selectedDate] || []).filter(
    (l) => !planned.some((e) => e.logId === l.id)
  );
  const selectedEntries = planned;
  const selectedDeload = deloadDayInfo(dateFromKey(selectedDate), deloadWeeks);

  const handleAddAction = () => {
    const trimmed = newActionText.trim();
    if (!trimmed) return;
    onAddAction(selectedDate, newActionCategory, trimmed, toNum(newActionDuration));
    closeAddDialog();
  };
  // Closing without saving has to clear the draft as well, otherwise the
  // abandoned text and duration greet you again the next time the dialog
  // opens.
  const closeAddDialog = () => {
    setAddOpen(false);
    setNewActionText("");
    setNewActionDuration("");
    setWorkoutQuery("");
  };

  const filteredPlansForSchedule = plans.filter((p) =>
    p.name.toLowerCase().includes(workoutQuery.toLowerCase())
  );

  // Only entries that have not happened yet can be moved or re-linked - a
  // completed session's own log already fixes the date and what was done,
  // so editing the calendar marker afterwards would only make the two
  // disagree, not change any history.
  const openEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditDate(entry.date);
    setEditSwapQuery("");
    if (entry.type === "action") {
      setEditActionCategory(entry.categoryId || null);
      setEditActionText(entry.text || "");
      setEditActionDuration(entry.durationMinutes ? String(entry.durationMinutes) : "");
    }
  };
  const closeEditDialog = () => setEditingEntry(null);
  const filteredPlansForSwap = plans.filter((p) =>
    p.name.toLowerCase().includes(editSwapQuery.toLowerCase())
  );
  const filteredBreathingForSwap = breathingExercises.filter((b) =>
    b.name.toLowerCase().includes(editSwapQuery.toLowerCase())
  );

  // Der Bereich, der sich waehrend der Auswahl schon mitfaerbt: vom ersten
  // angetippten Tag bis zum gerade ausgewaehlten, in beliebiger Richtung.
  const draftRange = deloadDraft
    ? [deloadDraft, selectedDate].sort()
    : null;
  const finishDraft = (key) => {
    const von = deloadDraft;
    setDeloadDraft(null);
    setSelectedDate(key);
    onAddDeloadRange?.(dateFromKey(von), dateFromKey(key));
  };
  // Der Rhythmus ist erreicht - hier steht der Vorschlag, im Kalender an dem
  // Tag, an dem er faellig wurde. Bewusst ein Vorschlag und keine Ansage: ob
  // und wann entlastet wird, entscheidet der Mensch (KONZEPT.md, Regel 3).
  const deloadDueKey =
    deloadStatusInfo?.due && deloadStatusInfo.dueAt
      ? toDateKey(new Date(deloadStatusInfo.dueAt))
      : null;

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onCreateCategory(trimmed, newCategoryColor);
    setNewCategoryName("");
    setNewCategoryColor(CATEGORY_COLORS[0]);
  };

  return (
    <div>
      <div className="cal-header">
        <button className="btn-icon" onClick={goPrevMonth} title="Vorheriger Monat">
          <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
        </button>
        <span className="cal-month-label" onClick={goToday}>{monthLabel}</span>
        <button className="btn-icon" onClick={goNextMonth} title="Nächster Monat">
          <ChevronRight size={16} />
        </button>
        <button
          className="btn-icon"
          style={{ marginLeft: "auto" }}
          onClick={() => setCategoryManagerOpen((s) => !s)}
          title="Kategorien verwalten"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {categoryManagerOpen && (
        <Modal title="Kategorien" onClose={() => setCategoryManagerOpen(false)}>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {categories.length === 0 && (
              <div className="empty-state" style={{ padding: "8px 0" }}>
                Noch keine Kategorien. Lege unten deine erste an.
              </div>
            )}
            {categories.map((c) => (
              <div key={c.id} className="cal-category-row">
                <span className="folder-dot" style={{ background: c.color }} />
                <span style={{ flex: 1 }}>{c.name}</span>
                <button className="btn-icon" onClick={() => onDeleteCategory(c.id)} title="Kategorie löschen">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label className="field-label">Neue Kategorie</label>
            <input
              type="text"
              placeholder="z. B. Physio"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <div className="color-swatch-grid" style={{ marginTop: 8 }}>
              {CATEGORY_COLORS.map((c) => (
                <span
                  key={c}
                  className={`color-swatch ${newCategoryColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewCategoryColor(c)}
                />
              ))}
            </div>
            <button
              className="btn btn-primary btn-block btn-sm"
              style={{ marginTop: 10 }}
              disabled={!newCategoryName.trim()}
              onClick={handleCreateCategory}
            >
              <Plus size={14} /> Kategorie erstellen
            </button>
          </div>
        </Modal>
      )}

      {deloadDraft && (
        <div className="deload-draft-bar">
          <BatteryLow size={14} />
          <span>
            Entlastung ab {fmtDate(dateFromKey(deloadDraft))} – jetzt den letzten Tag antippen.
          </span>
          <button className="btn-icon" onClick={() => setDeloadDraft(null)} title="Abbrechen">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="cal-weekday-row">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {monthMatrix.map((week, wi) => {
          const isCurrentWeek = week.some((d) => toDateKey(d) === todayKey);
          return (
            <div
              className={`cal-week-row ${isCurrentWeek ? "is-current-week" : ""}`}
              key={wi}
            >
              {week.map((d) => {
                const key = toDateKey(d);
                const inMonth = d.getMonth() === viewMonth;
                // Workouts that were actually done, minus the ones already
                // shown through their calendar entry - otherwise a planned
                // and completed workout would appear twice.
                const dayLogs = (logsByDate[key] || []).filter(
                  (l) => !(entriesByDate[key] || []).some((e) => e.logId === l.id)
                );
                const dayEntries = [
                  ...(entriesByDate[key] || []),
                  ...dayLogs.map((l) => ({ id: "log:" + l.id, type: "done", log: l })),
                ];
                const isToday = key === todayKey;
                const isSelected = key === selectedDate;
                // Entlastung: der Tag selbst wird eingefaerbt, nicht mehr die
                // ganze Kalenderwoche - ein Zeitraum kann jetzt mitten in der
                // Woche anfangen und in der naechsten enden.
                const deloadInfo = deloadDayInfo(d, deloadWeeks);
                // Waehrend der Auswahl faerbt sich der Bereich zwischen dem
                // ersten angetippten Tag und dem Tag darunter schon mit.
                const inDraft = draftRange && key >= draftRange[0] && key <= draftRange[1];
                // Every week is treated the same, so the month grid keeps an
                // even rhythm instead of one row bulging out.
                const visibleEntries = dayEntries.slice(0, 3);
                const overflow = Math.max(0, dayEntries.length - 3);
                return (
                  <div
                    key={key}
                    className={[
                      "cal-day",
                      !inMonth ? "is-outside" : "",
                      isToday ? "is-today" : "",
                      isSelected ? "is-selected" : "",
                      deloadInfo ? "is-deload" : "",
                      deloadInfo?.isStart ? "is-deload-start" : "",
                      deloadInfo?.isEnd ? "is-deload-end" : "",
                      inDraft ? "is-deload-draft" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => (deloadDraft ? finishDraft(key) : setSelectedDate(key))}
                  >
                    <span className="cal-day-num">{d.getDate()}</span>
                    {/* Nur der erste Tag wird beschriftet, und zwar ohne
                        Symbol davor: In einer Spalte von rund 46 Pixeln passt
                        beides zusammen nicht, das Wort wuerde abgeschnitten. */}
                    {deloadInfo?.isStart && (
                      <span className="cal-deload-label">Entlastung</span>
                    )}
                    {key === deloadDueKey && !deloadSuggestionHidden && !deloadInfo && (
                      <span className="cal-deload-label is-due">fällig</span>
                    )}
                    <div className="cal-day-entries">
                      {visibleEntries.map((entry) => {
                        if (entry.type === "done") {
                          return (
                            <span
                              key={entry.id}
                              className="cal-entry-chip cal-entry-workout"
                            >
                              <Check size={9} />
                              {entry.log.planName || "Training"}
                            </span>
                          );
                        }
                        if (entry.type === "workout") {
                          const plan = planById[entry.planId];
                          const doneName = entry.logId ? logById[entry.logId]?.planName : null;
                          return (
                            <span
                              key={entry.id}
                              className="cal-entry-chip cal-entry-workout"
                            >
                              {entry.logId ? <Check size={9} /> : <Play size={9} />}
                              {plan ? plan.name : doneName || "Gelöschter Plan"}
                            </span>
                          );
                        }
                        if (entry.type === "breathing") {
                          const br = breathingById[entry.breathingId];
                          const doneName = entry.logId ? breathingLogById[entry.logId]?.name : null;
                          return (
                            <span key={entry.id} className="cal-entry-chip cal-entry-breathing">
                              {entry.logId ? <Check size={9} /> : <Play size={9} />}
                              {br ? br.name : doneName || "Gelöschte Atemübung"}
                            </span>
                          );
                        }
                        const cat = categoryById[entry.categoryId];
                        // Same visual language as workouts: a tick means it
                        // happened, no tick means it is still ahead.
                        return (
                          <span
                            key={entry.id}
                            className="cal-entry-chip"
                            style={cat ? { background: cat.color, color: readableTextOn(cat.color) } : undefined}
                          >
                            {entry.doneAt && <Check size={9} />}
                            {entry.text}
                          </span>
                        );
                      })}
                      {overflow > 0 && <span className="cal-entry-more">+{overflow} mehr</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="plan-title">
            {new Date(selectedDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
          </span>
          <button className="btn-icon" onClick={() => setAddOpen((s) => !s)} title="Eintrag hinzufügen">
            <Plus size={16} />
          </button>
        </div>

        {/* Die Entlastung gehört zum Tag darüber, weil man sie hier plant:
            ersten Tag antippen, letzten Tag antippen, fertig. Sie lässt sich
            vorher setzen (man plant sie ja) und nachträglich (falls man es
            vergisst). Was sie bewirkt, steht in der Statistik - siehe
            KONZEPT.md. */}
        {selectedDeload ? (
          <div className="deload-toggle is-active">
            <BatteryLow size={14} />
            <span>
              Entlastung {fmtDate(dateFromKey(selectedDeload.range.start))} bis{" "}
              {fmtDate(dateFromKey(selectedDeload.range.end))}
              {" · "}
              {plural(
                Math.round((selectedDeload.range.endTs - selectedDeload.range.startTs) / 86400000),
                "Tag",
                "Tage"
              )}
            </span>
            <button
              className="btn-icon deload-remove"
              onClick={() => onRemoveDeloadAt?.(dateFromKey(selectedDate))}
              title="Entlastung entfernen"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : deloadDraft ? (
          <div className="deload-toggle is-draft">
            <BatteryLow size={14} />
            <span>Letzten Tag der Entlastung antippen.</span>
            <button className="btn-icon" onClick={() => setDeloadDraft(null)} title="Abbrechen">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div
            className="deload-toggle"
            onClick={() => setDeloadDraft(selectedDate)}
            title="Diesen Tag als Beginn einer Entlastung setzen"
          >
            <BatteryLow size={14} />
            <span>Entlastung ab hier</span>
          </div>
        )}

        {/* Der Rhythmus ist erreicht. Eine Feststellung mit einem Knopf daneben,
            kein Termin, den die App selbst einträgt. */}
        {deloadDueKey === selectedDate && !deloadSuggestionHidden && !selectedDeload && (
          <div className="deload-due-note">
            <div>
              Dein Rhythmus von {deloadStatusInfo.intervalWeeks} Wochen ist hier erreicht –
              die letzte Entlastung begann am{" "}
              {fmtDate(dateFromKey(deloadStatusInfo.last.start))}.
            </div>
            <div className="deload-due-actions">
              <span className="chip chip-sm" onClick={() => setDeloadDraft(selectedDate)}>
                Entlastung ab hier
              </span>
              <span className="chip chip-sm" onClick={() => onHideDeloadSuggestion?.()}>
                Ausblenden
              </span>
            </div>
          </div>
        )}

        {selectedEntries.length === 0 && selectedLogs.length === 0 && !addOpen && (
          <div className="empty-state" style={{ padding: "14px 0" }}>Noch keine Einträge an diesem Tag.</div>
        )}

        {/* Workouts actually done on this day, tappable straight through to
            the history. */}
        {selectedLogs.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedLogs.map((l) => {
              const saetze = logEntries(l).reduce(
                (n, e) => n + entrySets(e).filter((x) => x.done && !x.warmup).length, 0
              );
              return (
                <div
                  key={l.id}
                  className="cal-detail-item cal-detail-done"
                  onClick={() => onOpenLog?.(l)}
                  style={{ cursor: onOpenLog ? "pointer" : "default" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="ex-name">
                      <Check size={13} style={{ marginRight: 6, verticalAlign: -2, color: "var(--accent)" }} />
                      {l.planName || "Training"}
                    </span>
                    {onOpenLog && <ChevronRight size={15} color="var(--text-dim)" />}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
                    {plural(logEntries(l).length, "Übung", "Übungen")} ·{" "}
                    {plural(saetze, "Satz", "Sätze")}
                    {l.durationMinutes ? ` · ${l.durationMinutes} Min.` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: selectedEntries.length ? 10 : 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedEntries.map((entry) => {
            if (entry.type === "workout") {
              const plan = planById[entry.planId];
              const log = entry.logId ? logs.find((l) => l.id === entry.logId) : null;
              return (
                <div key={entry.id} className={`cal-detail-item ${log ? "cal-detail-done" : ""}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="ex-name">
                      <Dumbbell size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                      {plan ? plan.name : log?.planName || "Gelöschter Plan"}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {!entry.logId && (
                        <button className="btn-icon" onClick={() => openEditEntry(entry)} title="Termin bearbeiten">
                          <PencilLine size={13} />
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => onDeleteEntry(entry.id)} title="Termin entfernen">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {log ? (
                    <div className="history-exercise-list" style={{ marginTop: 8 }}>
                      {logEntries(log).map((e) => {
                        const ex = exBy[e.exerciseId];
                        const workingSets = performedWorkingSets(entrySets(e));
                        // Die Uebung entscheidet, ob Sekunden oder kg x Wdh.
                        // dastehen - nicht der einzelne Satz (siehe shortSet).
                        const zeitUebung = isTimeBasedInLogs(logs, e.exerciseId, timeBasedExercises);
                        const summary = workingSets
                          .map((s) => (s.dropset ? "↓" : "") + shortSet(s, zeitUebung))
                          .join(", ");
                        return (
                          <div key={e.id || e.exerciseId} className="history-exercise-row">
                            <span>{ex ? ex.name : e.exerciseId}</span>
                            <span className="history-set-summary">{summary || "–"}</span>
                          </div>
                        );
                      })}
                      {log.durationMinutes ? (
                        <div className="history-card-meta" style={{ marginTop: 6 }}>
                          <span><Clock size={12} /> {log.durationMinutes} Min.</span>
                        </div>
                      ) : null}
                    </div>
                  ) : plan ? (
                    <button
                      className="btn btn-ghost btn-block btn-sm"
                      style={{ marginTop: 10 }}
                      onClick={() => onStartScheduledWorkout(plan, entry.id)}
                    >
                      <Play size={14} /> Training starten
                    </button>
                  ) : (
                    <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
                      Dieser Plan wurde gelöscht.
                    </p>
                  )}
                </div>
              );
            }
            if (entry.type === "breathing") {
              const br = breathingById[entry.breathingId];
              const log = entry.logId ? breathingLogById[entry.logId] : null;
              return (
                <div key={entry.id} className={`cal-detail-item ${log ? "cal-detail-done" : ""}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="ex-name">
                      <Wind size={13} style={{ marginRight: 6, verticalAlign: -2, color: BREATHING_COLOR }} />
                      {br ? br.name : log?.name || "Gelöschte Atemübung"}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {!entry.logId && (
                        <button className="btn-icon" onClick={() => openEditEntry(entry)} title="Termin bearbeiten">
                          <PencilLine size={13} />
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => onDeleteEntry(entry.id)} title="Termin entfernen">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {log ? (
                    <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
                      {log.rounds != null && log.plannedRounds != null
                        ? `${log.rounds} von ${log.plannedRounds} Runden`
                        : "Nachgetragen"}
                      {log.durationSeconds
                        ? ` · ${Math.max(1, Math.round(log.durationSeconds / 60))} Min.`
                        : ""}
                    </div>
                  ) : br ? (
                    <button
                      className="btn btn-ghost btn-block btn-sm"
                      style={{ marginTop: 10 }}
                      onClick={() => onStartScheduledBreathing?.(br, entry.id)}
                    >
                      <Play size={14} /> Atemübung starten
                    </button>
                  ) : (
                    <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
                      Diese Atemübung wurde gelöscht.
                    </p>
                  )}
                </div>
              );
            }
            const cat = categoryById[entry.categoryId];
            const isDone = !!entry.doneAt;
            return (
              <div key={entry.id} className={`cal-detail-item ${isDone ? "cal-detail-done" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {/* One tap is the whole logging flow for these - no
                        exercise picker, no sets, just done or not done. */}
                    <span
                      className={`set-check ${isDone ? "checked" : ""}`}
                      role="checkbox"
                      aria-checked={isDone}
                      title={isDone ? "Als offen markieren" : "Als erledigt markieren"}
                      onClick={() => onToggleActionDone?.(entry.id)}
                    >
                      {isDone && <Check size={13} color="var(--bg)" />}
                    </span>
                    <span className="folder-dot" style={{ background: cat ? cat.color : "var(--text-dim)", flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          opacity: isDone ? 0.65 : 1,
                        }}
                      >
                        {entry.text}
                      </span>
                      {entry.durationMinutes ? (
                        <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                          <Clock size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                          {entry.durationMinutes} Min.
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn-icon" onClick={() => openEditEntry(entry)} title="Eintrag bearbeiten">
                      <PencilLine size={13} />
                    </button>
                    <button className="btn-icon" onClick={() => onDeleteEntry(entry.id)} title="Eintrag löschen">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {addOpen && (
          <Modal title="Eintrag hinzufügen" onClose={closeAddDialog} width={420}>
            <div className="sub-tab-row" style={{ marginBottom: 10 }}>
              <button
                className={`sub-tab ${addMode === "action" ? "active" : ""}`}
                onClick={() => setAddMode("action")}
              >
                Aktion
              </button>
              <button
                className={`sub-tab ${addMode === "workout" ? "active" : ""}`}
                onClick={() => setAddMode("workout")}
              >
                <Dumbbell size={13} /> Workout
              </button>
              <button
                className={`sub-tab ${addMode === "breathing" ? "active" : ""}`}
                onClick={() => setAddMode("breathing")}
              >
                <Wind size={13} /> Atem
              </button>
            </div>

            {addMode === "action" ? (
              <>
                <label className="field-label">Kategorie</label>
                <div className="chip-row" style={{ marginTop: 6, marginBottom: 10 }}>
                  <span
                    className={`chip chip-sm ${newActionCategory === null ? "active" : ""}`}
                    onClick={() => setNewActionCategory(null)}
                  >
                    Ohne
                  </span>
                  {categories.map((c) => (
                    <span
                      key={c.id}
                      className={`chip chip-sm ${newActionCategory === c.id ? "active" : ""}`}
                      onClick={() => setNewActionCategory(c.id)}
                      style={newActionCategory === c.id ? { background: c.color, borderColor: c.color, color: "white" } : undefined}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
                <label className="field-label">Eintrag</label>
                <input
                  type="text"
                  placeholder="z. B. Arbeitsweg, Atemübung, Sehnenreha…"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                />
                <label className="field-label" style={{ marginTop: 10 }}>
                  Dauer in Minuten (optional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="z. B. 15"
                  value={newActionDuration}
                  onChange={(e) => setNewActionDuration(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-block btn-sm"
                  style={{ marginTop: 10 }}
                  disabled={!newActionText.trim()}
                  onClick={handleAddAction}
                >
                  <Save size={14} /> Speichern
                </button>
              </>
            ) : addMode === "breathing" ? (
              <>
                {/* Zwei verschiedene Absichten am selben Ort: etwas für später
                    vormerken oder etwas nachtragen, das schon passiert ist. */}
                <div className="chip-row" style={{ marginTop: 0, marginBottom: 10 }}>
                  <span
                    className={`chip chip-sm ${breathingMode === "plan" ? "active" : ""}`}
                    onClick={() => setBreathingMode("plan")}
                  >
                    Vormerken
                  </span>
                  <span
                    className={`chip chip-sm ${breathingMode === "log" ? "active" : ""}`}
                    onClick={() => setBreathingMode("log")}
                  >
                    Nachtragen
                  </span>
                </div>
                {breathingMode === "log" ? (
                  <BreathingLogForm
                    breathingExercises={breathingExercises}
                    dateLabel={fmtDate(dateFromKey(selectedDate))}
                    onSave={(daten) => { onLogBreathing?.(selectedDate, daten); closeAddDialog(); }}
                  />
                ) : (
                  <div style={{ maxHeight: 260, overflowY: "auto" }}>
                    {breathingExercises.length === 0 ? (
                      <div className="empty-state" style={{ padding: "10px 0" }}>
                        Noch keine Atemübung angelegt. Lege sie auf der Startseite
                        unter dem Zahnrad links oben an.
                      </div>
                    ) : (
                      breathingExercises.map((b) => (
                        <div className="ex-row" key={b.id}>
                          <span className="ex-name">{b.name}</span>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { onScheduleBreathing?.(selectedDate, b.id); closeAddDialog(); }}
                          >
                            Eintragen
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="search-box" style={{ marginBottom: 10 }}>
                  <Search size={16} color="var(--text-dim)" />
                  <input
                    placeholder="Plan suchen…"
                    value={workoutQuery}
                    onChange={(e) => setWorkoutQuery(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {filteredPlansForSchedule.length === 0 ? (
                    <div className="empty-state" style={{ padding: "10px 0" }}>Keine Pläne gefunden.</div>
                  ) : (
                    filteredPlansForSchedule.map((p) => (
                      <div className="ex-row" key={p.id}>
                        <span className="ex-name">{p.name}</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { onScheduleWorkout(selectedDate, p.id); closeAddDialog(); }}
                        >
                          Eintragen
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </Modal>
        )}

        {editingEntry && (
          <Modal
            title={
              editingEntry.type === "action"
                ? "Eintrag bearbeiten"
                : editingEntry.type === "workout"
                ? "Workout-Termin bearbeiten"
                : "Atemübungs-Termin bearbeiten"
            }
            onClose={closeEditDialog}
            width={420}
          >
            {editingEntry.type === "action" ? (
              <>
                <label className="field-label">Kategorie</label>
                <div className="chip-row" style={{ marginTop: 6, marginBottom: 10 }}>
                  <span
                    className={`chip chip-sm ${editActionCategory === null ? "active" : ""}`}
                    onClick={() => setEditActionCategory(null)}
                  >
                    Ohne
                  </span>
                  {categories.map((c) => (
                    <span
                      key={c.id}
                      className={`chip chip-sm ${editActionCategory === c.id ? "active" : ""}`}
                      onClick={() => setEditActionCategory(c.id)}
                      style={editActionCategory === c.id ? { background: c.color, borderColor: c.color, color: "white" } : undefined}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
                <label className="field-label">Eintrag</label>
                <input
                  type="text"
                  value={editActionText}
                  onChange={(e) => setEditActionText(e.target.value)}
                />
                <label className="field-label" style={{ marginTop: 10 }}>
                  Dauer in Minuten (optional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editActionDuration}
                  onChange={(e) => setEditActionDuration(e.target.value)}
                />
                <label className="field-label" style={{ marginTop: 10 }}>Datum</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                <button
                  className="btn btn-primary btn-block btn-sm"
                  style={{ marginTop: 10 }}
                  disabled={!editActionText.trim() || !editDate}
                  onClick={() => {
                    const trimmed = editActionText.trim();
                    if (!trimmed || !editDate) return;
                    onUpdateEntry(editingEntry.id, {
                      categoryId: editActionCategory,
                      text: trimmed,
                      durationMinutes: toNum(editActionDuration) || null,
                      date: editDate,
                    });
                    closeEditDialog();
                  }}
                >
                  <Save size={14} /> Speichern
                </button>
              </>
            ) : (
              <>
                <label className="field-label">Datum</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!editDate}
                    onClick={() => { onUpdateEntry(editingEntry.id, { date: editDate }); closeEditDialog(); }}
                  >
                    <Save size={14} /> Übernehmen
                  </button>
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <label className="field-label">
                    {editingEntry.type === "workout" ? "Anderen Plan wählen" : "Andere Atemübung wählen"}
                  </label>
                  <div className="search-box" style={{ marginTop: 6, marginBottom: 10 }}>
                    <Search size={16} color="var(--text-dim)" />
                    <input
                      placeholder={editingEntry.type === "workout" ? "Plan suchen…" : "Atemübung suchen…"}
                      value={editSwapQuery}
                      onChange={(e) => setEditSwapQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {editingEntry.type === "workout" ? (
                      filteredPlansForSwap.length === 0 ? (
                        <div className="empty-state" style={{ padding: "10px 0" }}>Keine Pläne gefunden.</div>
                      ) : (
                        filteredPlansForSwap.map((p) => (
                          <div className="ex-row" key={p.id}>
                            <span className="ex-name">{p.name}</span>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => { onUpdateEntry(editingEntry.id, { planId: p.id }); closeEditDialog(); }}
                            >
                              Übernehmen
                            </button>
                          </div>
                        ))
                      )
                    ) : filteredBreathingForSwap.length === 0 ? (
                      <div className="empty-state" style={{ padding: "10px 0" }}>Keine Atemübung gefunden.</div>
                    ) : (
                      filteredBreathingForSwap.map((b) => (
                        <div className="ex-row" key={b.id}>
                          <span className="ex-name">{b.name}</span>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { onUpdateEntry(editingEntry.id, { breathingId: b.id }); closeEditDialog(); }}
                          >
                            Übernehmen
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Long-press-and-drag reordering for a list of rows. Used by both the plan
// builder and the live workout screen.
//
// The geometry of every row is measured ONCE when the drag starts and then
// treated as fixed "slots". Re-measuring live while the list reorders
// itself meant a row could cross a boundary, get moved, and immediately
// cross back, which made the other rows flicker. With static slots the
// target index is a pure function of how far the finger travelled, so it
// cannot oscillate.
//
// Nothing is committed to React state until the finger lifts: during the
// drag only CSS transforms move, which keeps it smooth.
// ---------------------------------------------------------------------------

const LONG_PRESS_MS = 500;
const SHIFT_TRANSITION = "transform 200ms cubic-bezier(0.2, 0, 0, 1)";
// How close to the top/bottom edge of the scrollable area a drag has to get
// before it starts auto-scrolling, and how fast that scroll goes at most -
// without this a list longer than one screen simply can't be reordered from
// bottom to top (or back), since the target row is off-screen the whole time.
const AUTO_SCROLL_EDGE = 70;
const AUTO_SCROLL_MAX_SPEED = 16;

// While a row is being dragged the browser would otherwise select the text
// under the finger, leaving words and numbers highlighted in blue.
function setDragSelectionBlocked(blocked) {
  if (typeof document === "undefined") return;
  const el = document.body;
  if (!el) return;
  el.style.userSelect = blocked ? "none" : "";
  el.style.webkitUserSelect = blocked ? "none" : "";
  if (blocked) window.getSelection?.()?.removeAllRanges?.();
}

function useDragReorder({ items, getId, onReorder }) {
  const [draggingId, setDraggingId] = useState(null);
  const draggingIdRef = useRef(null);
  const dragPressTimer = useRef(null);
  const itemRefs = useRef({});
  const itemsRef = useRef(items);
  const slotsRef = useRef([]);
  const fromIndexRef = useRef(0);
  const targetIndexRef = useRef(0);
  const dragStartYRef = useRef(0);
  const pressStartYRef = useRef(0);
  const pendingYRef = useRef(0);
  // How much the scrollable container has been auto-scrolled since the drag
  // began (positive = scrolled down). The dragged row's transform and the
  // target-slot math both need this added back in, because scrolling moves
  // every row's on-screen position without moving the pointer at all.
  const autoScrolledRef = useRef(0);
  const autoScrollLoopRef = useRef(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Moves rows to where they would sit if the drop happened now. Only the
  // rows between the original and the target slot shift, by exactly the
  // height of the dragged row.
  const paintDrag = (delta) => {
    const slots = slotsRef.current;
    const fromIndex = fromIndexRef.current;
    const draggedId = draggingIdRef.current;
    if (!slots.length || draggedId === null) return;

    const draggedCenter = slots[fromIndex].center + delta;
    let target = fromIndex;
    for (let i = 0; i < slots.length; i++) {
      if (i === fromIndex) continue;
      if (i > fromIndex && draggedCenter > slots[i].center) target = Math.max(target, i);
      if (i < fromIndex && draggedCenter < slots[i].center) target = Math.min(target, i);
    }
    targetIndexRef.current = target;

    slots.forEach((slot, i) => {
      const el = itemRefs.current[slot.id];
      if (!el) return;
      if (slot.id === draggedId) {
        el.style.transform = `translateY(${delta}px) scale(1.02)`;
        return;
      }
      // Each row shifts by the exact distance to its neighbour's slot
      // rather than by one assumed row height, so rows of differing
      // heights — or rows separated by a superset label — still land
      // precisely where they belong.
      let shiftBy = 0;
      if (target > fromIndex && i > fromIndex && i <= target) {
        shiftBy = -(slot.center - slots[i - 1].center);
      } else if (target < fromIndex && i >= target && i < fromIndex) {
        shiftBy = slots[i + 1].center - slot.center;
      }
      const next = shiftBy ? `translateY(${shiftBy}px)` : "";
      // Only write when it actually changes, so the CSS transition is not
      // restarted on every frame.
      if (el.style.transform !== next) el.style.transform = next;
    });
  };

  // Runs every frame for the whole drag, not just when the pointer moves:
  // holding the finger still right at the edge must keep scrolling, which a
  // move-triggered callback alone would never do. Scrolls the container when
  // the pointer sits in the edge zone, then repaints using the finger's raw
  // movement plus whatever the auto-scroll has contributed so far.
  const runAutoScrollFrame = () => {
    if (draggingIdRef.current === null) return;
    const container = document.querySelector(".content");
    if (container) {
      const rect = container.getBoundingClientRect();
      const y = pendingYRef.current;
      let speed = 0;
      if (y < rect.top + AUTO_SCROLL_EDGE) {
        speed = -AUTO_SCROLL_MAX_SPEED * Math.min(1, (rect.top + AUTO_SCROLL_EDGE - y) / AUTO_SCROLL_EDGE);
      } else if (y > rect.bottom - AUTO_SCROLL_EDGE) {
        speed = AUTO_SCROLL_MAX_SPEED * Math.min(1, (y - (rect.bottom - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE);
      }
      if (speed !== 0) {
        const before = container.scrollTop;
        container.scrollTop = before + speed;
        autoScrolledRef.current += container.scrollTop - before;
      }
    }
    paintDrag(pendingYRef.current - dragStartYRef.current + autoScrolledRef.current);
    autoScrollLoopRef.current = requestAnimationFrame(runAutoScrollFrame);
  };

  useEffect(() => {
    if (draggingId === null) return undefined;
    const onMove = (e) => {
      if (e.cancelable) e.preventDefault();
      pendingYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    };
    const onUp = () => {
      if (autoScrollLoopRef.current !== null) {
        cancelAnimationFrame(autoScrollLoopRef.current);
        autoScrollLoopRef.current = null;
      }
      const from = fromIndexRef.current;
      const target = targetIndexRef.current;
      const slots = slotsRef.current;

      // Drop the transforms and commit the new order in the same tick: the
      // rows already appear to be in the new order, so clearing the
      // transforms as the real order changes looks seamless.
      slots.forEach((slot) => {
        const el = itemRefs.current[slot.id];
        if (!el) return;
        el.style.transition = "none";
        el.style.transform = "";
      });

      if (from !== target) {
        const next = [...itemsRef.current];
        const [moved] = next.splice(from, 1);
        next.splice(target, 0, moved);
        itemsRef.current = next;
        onReorder(next);
      }

      requestAnimationFrame(() => {
        slots.forEach((slot) => {
          const el = itemRefs.current[slot.id];
          if (el) el.style.transition = "";
        });
      });

      draggingIdRef.current = null;
      slotsRef.current = [];
      setDragSelectionBlocked(false);
      setDraggingId(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
      // Falls die Ansicht mitten im Ziehen wechselt, darf die Sperre nicht
      // auf der Seite haengen bleiben.
      setDragSelectionBlocked(false);
    };
  }, [draggingId]);

  const startItemPress = (id, clientY) => {
    pressStartYRef.current = clientY;
    dragPressTimer.current = setTimeout(() => {
      dragPressTimer.current = null;
      const order = itemsRef.current.map(getId);
      const slots = [];
      order.forEach((rowId) => {
        const el = itemRefs.current[rowId];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        slots.push({ id: rowId, center: rect.top + rect.height / 2 });
      });
      if (!slots.length) return;

      slotsRef.current = slots;
      fromIndexRef.current = slots.findIndex((s) => s.id === id);
      targetIndexRef.current = fromIndexRef.current;
      dragStartYRef.current = pressStartYRef.current;
      pendingYRef.current = pressStartYRef.current;
      autoScrolledRef.current = 0;
      draggingIdRef.current = id;

      slots.forEach((slot) => {
        const el = itemRefs.current[slot.id];
        if (!el) return;
        // The dragged row must track the finger with no easing; the others
        // glide into place.
        el.style.transition = slot.id === id ? "none" : SHIFT_TRANSITION;
      });

      if (navigator.vibrate) navigator.vibrate(15);
      setDragSelectionBlocked(true);
      setDraggingId(id);
      autoScrollLoopRef.current = requestAnimationFrame(runAutoScrollFrame);
    }, LONG_PRESS_MS);
  };
  const cancelItemPress = () => {
    if (dragPressTimer.current) {
      clearTimeout(dragPressTimer.current);
      dragPressTimer.current = null;
    }
  };
  // Scrolling with a finger that happens to rest on the handle should not
  // turn into a drag, so meaningful movement before the timer fires aborts.
  const maybeCancelPress = (clientY) => {
    if (!dragPressTimer.current) return;
    if (Math.abs(clientY - pressStartYRef.current) > 10) cancelItemPress();
  };

  const dragHandleProps = (id) => ({
    onTouchStart: (e) => startItemPress(id, e.touches[0].clientY),
    onTouchMove: (e) => maybeCancelPress(e.touches[0].clientY),
    onTouchEnd: cancelItemPress,
    onMouseDown: (e) => startItemPress(id, e.clientY),
    onMouseMove: (e) => maybeCancelPress(e.clientY),
    onMouseUp: cancelItemPress,
  });

  return { draggingId, itemRefs, dragHandleProps };
}

// ---------------------------------------------------------------------------
// A set row that responds to horizontal swipes: right marks the set done,
// left deletes it. Mid-workout both actions previously needed a precise tap
// on a ~30px target, which is fiddly with tired or chalky hands.
//
// The listeners are attached natively rather than through React props
// because React registers touchmove passively, and a passive listener
// cannot call preventDefault() — without which the page scrolls sideways
// instead of the row following the finger.
// ---------------------------------------------------------------------------

const SWIPE_THRESHOLD = 64;
// Shared stable reference for "nothing to reorder yet".
const EMPTY_LIST = [];

function SwipeableSetRow({ className, onSwipeRight, onSwipeLeft, children }) {
  const rowRef = useRef(null);
  const hintRef = useRef(null);
  // Kept in a ref so the effect can stay mounted for the row's lifetime
  // while still calling the latest handlers.
  const callbacks = useRef({ onSwipeRight, onSwipeLeft });
  useEffect(() => {
    callbacks.current = { onSwipeRight, onSwipeLeft };
  });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let decided = false;
    let active = false;
    let down = false;
    // A finished swipe is still followed by a click on whatever sits under
    // the finger. Without swallowing it, swiping across the checkmark
    // would toggle the set twice and cancel itself out.
    let suppressClick = false;

    const paint = (value) => {
      row.style.transform = value ? `translateX(${value}px)` : "";
      const hint = hintRef.current;
      if (!hint) return;
      hint.dataset.dir = value > 0 ? "right" : value < 0 ? "left" : "";
      hint.style.opacity = String(Math.min(1, Math.abs(value) / SWIPE_THRESHOLD));
    };

    const begin = (x, y) => {
      startX = x;
      startY = y;
      dx = 0;
      decided = false;
      active = false;
      down = true;
      row.style.transition = "none";
    };
    const move = (x, y, e) => {
      if (!down) return;
      const ddx = x - startX;
      const ddy = y - startY;
      if (!decided) {
        if (Math.abs(ddx) < 10 && Math.abs(ddy) < 10) return;
        // Lock the direction once: a mostly-vertical drag stays a scroll.
        decided = true;
        active = Math.abs(ddx) > Math.abs(ddy) * 1.4;
      }
      if (!active) return;
      if (e && e.cancelable) e.preventDefault();
      dx = ddx;
      paint(dx);
    };
    const end = () => {
      if (!down) return;
      down = false;
      if (!active) return;
      const travelled = dx;
      dx = 0;
      active = false;
      row.style.transition = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
      paint(0);
      if (Math.abs(travelled) > 6) {
        suppressClick = true;
        // Safety net in case no click follows at all.
        setTimeout(() => { suppressClick = false; }, 400);
      }
      if (travelled > SWIPE_THRESHOLD) callbacks.current.onSwipeRight?.();
      else if (travelled < -SWIPE_THRESHOLD) callbacks.current.onSwipeLeft?.();
    };
    const swallowClick = (e) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const onTouchStart = (e) => begin(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e) => move(e.touches[0].clientX, e.touches[0].clientY, e);
    const onMouseDown = (e) => begin(e.clientX, e.clientY);
    const onMouseMove = (e) => move(e.clientX, e.clientY, e);

    row.addEventListener("click", swallowClick, true);
    row.addEventListener("touchstart", onTouchStart, { passive: true });
    row.addEventListener("touchmove", onTouchMove, { passive: false });
    row.addEventListener("touchend", end);
    row.addEventListener("touchcancel", end);
    row.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", end);
    return () => {
      row.removeEventListener("click", swallowClick, true);
      row.removeEventListener("touchstart", onTouchStart);
      row.removeEventListener("touchmove", onTouchMove);
      row.removeEventListener("touchend", end);
      row.removeEventListener("touchcancel", end);
      row.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", end);
    };
  }, []);

  return (
    <div className="set-swipe">
      <div className="set-swipe-hint" ref={hintRef}>
        <span className="set-swipe-done"><Check size={15} /></span>
        <span className="set-swipe-del"><Trash2 size={15} /></span>
      </div>
      <div className={className} ref={rowRef}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared "create a new exercise" form. Used both from the Exercises tab and
// from inside the plan builder's "..." menu, so a person never has to leave
// what they're doing (building a workout) just to add a missing exercise.
// ---------------------------------------------------------------------------

function NewExerciseForm({ exercises, onAddCustom, onSetExerciseSubgroups, onDone }) {
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState(MUSCLE_GROUPS[0].id);
  // Mehrere Untergruppen möglich, wie beim Bearbeiten einer bestehenden
  // Übung ("Untergruppen wählen" in der Detailansicht) - vorher konnte man
  // beim Neuanlegen nur eine einzige wählen, obwohl das Datenmodell und der
  // Bearbeiten-Dialog längst mehrere erlauben.
  const [newSubgroups, setNewSubgroups] = useState([]);
  const [newEquipment, setNewEquipment] = useState("Körpergewicht");
  const [newDescription, setNewDescription] = useState("");
  const [newVideo, setNewVideo] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const slugify = (s) =>
    s
      .toLowerCase()
      .trim()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMsg("Bitte einen Namen eingeben.");
      return;
    }
    const baseId = slugify(trimmed) || uid();
    let id = `custom-${baseId}`;
    if (exercises.some((e) => e.id === id)) {
      id = `custom-${baseId}-${uid()}`;
    }
    if (exercises.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("Diese Übung gibt es schon.");
      return;
    }
    const newExercise = { id, name: trimmed, group: newGroup, custom: true, meta: { equipment: newEquipment, primary: MUSCLE_GROUPS.find((g) => g.id === newGroup)?.label || newGroup, secondary: "–", description: newDescription.trim() || `${trimmed} – eigene Übung.`, video: newVideo.trim() } };
    onAddCustom(newExercise);
    if (newSubgroups.length > 0) onSetExerciseSubgroups(id, newSubgroups);
    // The parent's exercise list hasn't re-rendered with the new entry yet
    // (state update is still pending), so hand the fresh object back
    // directly instead of making the caller look it up.
    onDone(newExercise);
  };

  return (
    <div className="card">
      <span className="plan-title">Neue Übung</span>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Name</label>
        <input
          type="text"
          placeholder="z. B. Kabelzug rückwärts"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setErrorMsg("");
          }}
        />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Muskelgruppe</label>
        <div className="chip-row" style={{ marginTop: 6 }}>
          {MUSCLE_GROUPS.map((g) => (
            <span
              key={g.id}
              className={`chip ${newGroup === g.id ? "active" : ""}`}
              onClick={() => { setNewGroup(g.id); setNewSubgroups([]); }}
            >
              {g.label}
            </span>
          ))}
        </div>
      </div>
      {(SUBGROUPS[newGroup] || []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">Untergruppen (optional)</label>
          <div className="chip-row" style={{ marginTop: 6 }}>
            <span
              className={`chip chip-sm ${newSubgroups.length === 0 ? "active" : ""}`}
              onClick={() => setNewSubgroups([])}
            >
              Keine
            </span>
            {SUBGROUPS[newGroup].map((sg) => (
              <span
                key={sg.id}
                className={`chip chip-sm ${newSubgroups.includes(sg.id) ? "active" : ""}`}
                onClick={() =>
                  setNewSubgroups((prev) =>
                    prev.includes(sg.id) ? prev.filter((id) => id !== sg.id) : [...prev, sg.id]
                  )
                }
              >
                {sg.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Gerät</label>
        <div className="chip-row" style={{ marginTop: 6 }}>
          {EQUIPMENT_OPTIONS.map((opt) => (
            <span
              key={opt}
              className={`chip ${newEquipment === opt ? "active" : ""}`}
              onClick={() => setNewEquipment(opt)}
            >
              {opt}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Beschreibung</label>
        <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Kurze Technik-/Hinweisbeschreibung" />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Video-Link (optional)</label>
        <input value={newVideo} onChange={(e) => setNewVideo(e.target.value)} placeholder="https://…" />
      </div>
      {errorMsg && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={() => onDone(null)}
        >
          <X size={15} /> Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate}>
          <Save size={15} /> Speichern
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercises view
// ---------------------------------------------------------------------------

function ExercisesView({
  exercises,
  logs,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  onSetExerciseSubgroups,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  onAddCustom,
  onDeleteCustom,
  onUpdateExerciseNote,
  onRenameExercise,
  timeBasedExercises,
  gymIndependentExercises,
  onToggleTimeBased,
  onToggleGymIndependent,
  onRequestConfirm,
  gyms = [],
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("alle");
  const [subgroupFilter, setSubgroupFilter] = useState("alle");
  const [equipmentFilter, setEquipmentFilter] = useState("alle");
  const [creating, setCreating] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  // Eine geloeschte Uebung verschwindet nicht nur aus der Liste: ihre
  // Saetze stehen weiter in den Logs, werden aber von jeder Auswertung
  // uebersprungen (die kennt die Uebung nicht mehr). Monate an Verlauf
  // waeren also ohne Vorwarnung aus der Statistik weg - deshalb sagt die
  // Rueckfrage, was tatsaechlich daran haengt.
  const deleteExerciseQuestion = (exercise) => {
    const trainings = (Array.isArray(logs) ? logs : []).filter(
      (l) => logEntriesFor(l, exercise.id).length > 0
    ).length;
    const base = `Eigene Übung „${exercise.name}“ wirklich löschen?`;
    if (trainings === 0) return base;
    return (
      base +
      ` Sie steckt in ${trainings} ${trainings === 1 ? "Training" : "Trainings"} –` +
      " deren Sätze verschwinden danach aus Verlauf und Statistik."
    );
  };

  // Look the exercise up live so a rename is reflected immediately instead
  // of the overlay being stuck on a stale snapshot.
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;

  // Wann eine Übung zuletzt wirklich trainiert wurde. "Wirklich" heißt: mit
  // mindestens einem abgehakten Arbeitssatz - eine Übung, die nur im Plan
  // stand und dann ausfiel, wurde nicht gemacht und darf die Liste nicht
  // anführen. Alle Plätze einer Übung zählen (Zirkel: A, B, A).
  const lastPerformed = useMemo(() => {
    const last = {};
    (Array.isArray(logs) ? logs : []).forEach((l) => {
      const ts = new Date(l?.date).getTime();
      if (!Number.isFinite(ts)) return;
      logEntries(l).forEach((e) => {
        if (performedWorkingSets(entrySets(e)).length === 0) return;
        if (!(last[e.exerciseId] >= ts)) last[e.exerciseId] = ts;
      });
    });
    return last;
  }, [logs]);

  const filtered = exercises.filter((e) => {
    const matchesGroup = group === "alle" || e.group === group;
    const matchesSubgroup =
      subgroupFilter === "alle" ||
      exerciseHasSubgroup(e, exerciseSubgroupOverrides, subgroupFilter);
    const matchesEquipment =
      equipmentFilter === "alle" ||
      getExerciseEquipment(e, exerciseEquipmentOverrides) === equipmentFilter;
    const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
    return matchesGroup && matchesSubgroup && matchesEquipment && matchesQuery;
  })
    // Zuletzt Trainiertes zuerst: die Liste soll die eigene Praxis abbilden,
    // nicht die Reihenfolge des Katalogs. Sortiert wird auf der Kopie aus
    // filter(), nie auf den Übungen selbst - sort() arbeitet an Ort und
    // Stelle und würde sonst die Reihenfolge der App-weiten Liste ändern.
    // Nie trainierte Übungen haben alle denselben Wert 0 und behalten
    // untereinander damit ihre Katalogreihenfolge (sort ist stabil), stehen
    // aber geschlossen unter den trainierten.
    .sort((a, b) => (lastPerformed[b.id] || 0) - (lastPerformed[a.id] || 0));
  const activeGroupSubgroups = group !== "alle" ? SUBGROUPS[group] || [] : [];

  return (
    <div>
      <div className="search-box">
        <Search size={16} color="var(--text-dim)" />
        <input
          placeholder="Übung suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="chip-row">
        <span
          className={`chip ${group === "alle" ? "active" : ""}`}
          onClick={() => { setGroup("alle"); setSubgroupFilter("alle"); }}
        >
          Alle
        </span>
        {MUSCLE_GROUPS.map((g) => (
          <span
            key={g.id}
            className={`chip ${group === g.id ? "active" : ""}`}
            onClick={() => {
              setSubgroupFilter("alle");
              setGroup((current) => (current === g.id ? "alle" : g.id));
            }}
          >
            {g.label}
          </span>
        ))}
      </div>
      {activeGroupSubgroups.length > 0 && (
        <div className="chip-row" style={{ marginTop: 4 }}>
          <span
            className={`chip chip-sm ${subgroupFilter === "alle" ? "active" : ""}`}
            onClick={() => setSubgroupFilter("alle")}
          >
            Alle {MUSCLE_GROUPS.find((g) => g.id === group)?.label}
          </span>
          {activeGroupSubgroups.map((sg) => (
            <span
              key={sg.id}
              className={`chip chip-sm ${subgroupFilter === sg.id ? "active" : ""}`}
              onClick={() => setSubgroupFilter(sg.id)}
            >
              {sg.label}
            </span>
          ))}
        </div>
      )}

      <div className="chip-row" style={{ marginTop: 4 }}>
        <span
          className={`chip chip-sm ${equipmentFilter === "alle" ? "active" : ""}`}
          onClick={() => setEquipmentFilter("alle")}
        >
          Alle Geräte
        </span>
        {EQUIPMENT_OPTIONS.map((opt) => (
          <span
            key={opt}
            className={`chip chip-sm ${equipmentFilter === opt ? "active" : ""}`}
            onClick={() => setEquipmentFilter(opt)}
          >
            {opt}
          </span>
        ))}
      </div>

      {creating ? (
        <NewExerciseForm
          exercises={exercises}
          onAddCustom={onAddCustom}
          onSetExerciseSubgroups={onSetExerciseSubgroups}
          onDone={() => setCreating(false)}
        />
      ) : (
        <button
          className="btn btn-ghost btn-block"
          style={{ marginBottom: 12 }}
          onClick={() => setCreating(true)}
        >
          <Plus size={16} /> Eigene Übung erstellen
        </button>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">Keine Übung gefunden.</div>
        ) : (
          filtered.map((e) => (
            <div
              className="ex-row ex-row-clickable"
              key={e.id}
              onClick={() => setSelectedExerciseId(e.id)}
            >
              <span className="ex-name">{e.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Untergruppen stehen bewusst nicht mehr hier - bei mehreren
                    zugewiesenen Untergruppen wurde die Zeile zu voll und
                    quetschte den Namen zusammen. Die Übungs-Detailansicht
                    (ein Tap entfernt) zeigt und bearbeitet sie weiterhin. */}
                <span className="tag tag-equipment">{getExerciseEquipment(e, exerciseEquipmentOverrides)}</span>
                {e.custom && (
                  <button
                    className="btn-icon"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onRequestConfirm(deleteExerciseQuestion(e), () => onDeleteCustom(e.id));
                    }}
                    title="Eigene Übung löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <ChevronRight size={15} color="var(--text-dim)" />
              </div>
            </div>
          ))
        )}
      </div>

      {selectedExercise && (
        <ExerciseDetailSheet
          gyms={gyms}
          key={selectedExercise.id}
          exercise={selectedExercise}
          exercises={exercises}
          logs={logs}
          exerciseNotes={exerciseNotes}
          exerciseSubgroupOverrides={exerciseSubgroupOverrides}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
          exerciseEquipmentOverrides={exerciseEquipmentOverrides}
          onSetExerciseEquipment={onSetExerciseEquipment}
          timeBasedExercises={timeBasedExercises}
          gymIndependentExercises={gymIndependentExercises}
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onToggleGymIndependent={onToggleGymIndependent}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise detail sheet (history, notes, rename, time-tracking toggle) —
// shared by every place an exercise can be tapped to inspect it.
// ---------------------------------------------------------------------------

function ExerciseDetailSheet({
  exercise,
  exercises,
  logs,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  timeBasedExercises,
  gymIndependentExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onToggleGymIndependent,
  onClose,
  gyms = [],
  initialTab = "stats",
}) {
  // Drei Reiter statt einer langen Liste: Zahlen zuerst, Einstellungen zuletzt.
  const [detailTab, setDetailTab] = useState(initialTab);
  // Welche Bestwert-Kachel gerade aufgeschlagen ist ({ title, wert, quelle }).
  const [bestInfo, setBestInfo] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(exercise.name);
  const [renameError, setRenameError] = useState("");
  const [editingSubgroup, setEditingSubgroup] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(false);
  const availableSubgroups = SUBGROUPS[exercise.group] || [];
  const currentSubgroups = getExerciseSubgroups(exercise, exerciseSubgroupOverrides);
  const currentSubgroup = currentSubgroups[0] || null;
  const meta = getExerciseMeta(exercise);
  const currentEquipment = getExerciseEquipment(exercise, exerciseEquipmentOverrides);

  useEffect(() => {
    if (!editingSubgroup) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".subgroup-picker")) setEditingSubgroup(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [editingSubgroup]);

  useEffect(() => {
    if (!editingEquipment) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".equipment-picker")) setEditingEquipment(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [editingEquipment]);

  // Escape closes the sheet, matching the tap-outside behaviour for anyone
  // on a keyboard. While a name is being edited Escape belongs to that
  // field, so the sheet stays open.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (editingName || editingSubgroup || editingEquipment) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingName, editingSubgroup, onClose]);

  const timeline = useMemo(
    () => getExerciseTimeline(logs, exercise.id),
    [logs, exercise.id]
  );
  const isTimeBasedExercise = isTimeBasedInLogs(logs, exercise.id, timeBasedExercises);
  const isGymIndependentExercise = isGymIndependent(exercise.id, gymIndependentExercises);
  const bestStats = useMemo(
    () => (isTimeBasedExercise ? null : getExerciseBestStats(logs, exercise.id)),
    [logs, exercise.id, isTimeBasedExercise]
  );

  const startEditingName = () => {
    setNameDraft(exercise.name);
    setRenameError("");
    setEditingName(true);
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setRenameError("Bitte einen Namen eingeben.");
      return;
    }
    const clash = exercises.some(
      (e) => e.id !== exercise.id && e.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (clash) {
      setRenameError("Diese Übung gibt es schon.");
      return;
    }
    onRenameExercise(exercise.id, trimmed);
    setEditingName(false);
    setRenameError("");
  };

  return (
    <div className="move-overlay" onClick={onClose}>
      <div className="exercise-detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="exercise-detail-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div>
                <input
                  type="text"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    setRenameError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                {renameError && (
                  <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 6 }}>
                    {renameError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setEditingName(false)}
                  >
                    Abbrechen
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={saveName}
                  >
                    <Check size={14} /> Speichern
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="plan-title">{exercise.name}</div>
                <span className="note-toggle" onClick={startEditingName} title="Namen bearbeiten">
                  <Pencil size={13} />
                </span>
              </div>
            )}
            {!editingName && (
              <span style={{ marginTop: 6, display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                <MuscleTag exercise={exercise} subgroupOverrides={exerciseSubgroupOverrides} />
                {/* Die Nebengruppen. Sie waren bis Sept. 2026 nur in der
                    Rechnung sichtbar (halber Satz je Nebengruppe), nirgends
                    in der Bedienung - man konnte also nicht nachsehen, warum
                    eine Übung bei den Armen mitzählt. */}
                {(exercise.secondary || []).map((g) => (
                  <span className="tag tag-secondary" key={g} title="Nebenmuskelgruppe – zählt mit einem halben Satz">
                    {MUSCLE_GROUPS.find((m) => m.id === g)?.label || g}
                  </span>
                ))}
                <span
                  className="tag tag-equipment tag-clickable"
                  onClick={() => setEditingEquipment(true)}
                  title="Equipment ändern"
                >
                  {currentEquipment}
                </span>
              </span>
            )}
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="exercise-detail-body">
          <div className="sub-tab-row" style={{ marginBottom: 12 }}>
            <button
              className={`sub-tab ${detailTab === "stats" ? "active" : ""}`}
              onClick={() => setDetailTab("stats")}
            >
              <TrendingUp size={14} /> Statistik
            </button>
            <button
              className={`sub-tab ${detailTab === "history" ? "active" : ""}`}
              onClick={() => setDetailTab("history")}
            >
              <ClipboardList size={14} /> Verlauf
            </button>
            <button
              className={`sub-tab ${detailTab === "info" ? "active" : ""}`}
              onClick={() => setDetailTab("info")}
            >
              <StickyNote size={14} /> Info
            </button>
          </div>

          {detailTab === "stats" && (
            <>
          {bestStats && (bestStats.best1RM > 0 || bestStats.bestSetVolume > 0) && (
            <div className="card stats-summary">
              <div className="stats-grid">
                <div
                  className={`stat-item ${bestStats.best1RMSource ? "stat-item-clickable" : ""}`}
                  onClick={() =>
                    bestStats.best1RMSource &&
                    setBestInfo({
                      title: "Geschätztes 1RM",
                      wert: `${Math.round(bestStats.best1RM)} kg`,
                      quelle: bestStats.best1RMSource,
                      erklaerung:
                        "Aus Gewicht und Wiederholungen dieses einen Satzes wird geschätzt, was einmal maximal gegangen wäre. Hast du für die Übung eine Reserve angegeben, wird sie beim letzten Satz mitgezählt: 8 Wdh. mit 3 in Reserve rechnen wie 11 bis zum Muskelversagen - sonst wäre derselbe Satz näher am Limit fälschlich ein Kraftzuwachs. Je mehr Wiederholungen, desto ungenauer; ab 13 (Wdh. plus Reserve) wird gar nicht mehr geschätzt.",
                    })
                  }
                  title={bestStats.best1RMSource ? "Antippen: aus welchem Satz stammt dieser Wert?" : undefined}
                >
                  <span className="stat-value">{Math.round(bestStats.best1RM)} kg</span>
                  <span className="stat-label">
                    Geschätztes 1RM
                    {bestStats.best1RMSource && (
                      <ChevronRight size={12} style={{ verticalAlign: -2, marginLeft: 3 }} />
                    )}
                  </span>
                </div>
                <div
                  className={`stat-item ${bestStats.bestSetVolumeSource ? "stat-item-clickable" : ""}`}
                  onClick={() =>
                    bestStats.bestSetVolumeSource &&
                    setBestInfo({
                      title: "Bestes Satz-Volumen",
                      wert: `${Math.round(bestStats.bestSetVolume)} kg`,
                      quelle: bestStats.bestSetVolumeSource,
                      erklaerung:
                        "Gewicht mal Wiederholungen eines einzelnen Satzes - die meiste Arbeit, die du in dieser Übung je in einem Satz geleistet hast.",
                    })
                  }
                  title={bestStats.bestSetVolumeSource ? "Antippen: aus welchem Satz stammt dieser Wert?" : undefined}
                >
                  <span className="stat-value">{Math.round(bestStats.bestSetVolume)} kg</span>
                  <span className="stat-label">
                    Bestes Satz-Volumen
                    {bestStats.bestSetVolumeSource && (
                      <ChevronRight size={12} style={{ verticalAlign: -2, marginLeft: 3 }} />
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
              {timeline.length === 0 ? (
                <div className="empty-state">Noch keine Daten für diese Übung.</div>
              ) : (
                <ExerciseCharts
                  logs={logs}
                  exerciseId={exercise.id}
                  isTimeBased={isTimeBasedExercise}
                  gyms={gyms}
                  gymIndependent={isGymIndependentExercise}
                />
              )}
            </>
          )}

          {detailTab === "history" && (
            <>
          {timeline.length === 0 ? (
            <div className="empty-state">Noch keine Einträge für diese Übung.</div>
          ) : (
            timeline.map((t, idx) => (
              <div className="card" key={idx}>
                <span className="tag">{fmtDate(t.date)}</span>
                {fmtRir(t.rir) && (
                  <span className="tag" style={{ marginLeft: 6 }}>{fmtRir(t.rir)}</span>
                )}
                {feelingLabel(t.feeling) && (
                  <span className="tag tag-equipment" style={{ marginLeft: 6 }}>
                    {feelingLabel(t.feeling)}
                  </span>
                )}
                {t.sets.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {t.sets.map((s, i) => (
                      <span key={i} className="tag" style={s.warmup ? { opacity: 0.6 } : undefined}>
                        {s.warmup ? "W · " : ""}
                        {s.dropset ? "↓ " : ""}
                        {shortSet(s, isTimeBasedInLogs(logs, exercise.id, timeBasedExercises))}
                      </span>
                    ))}
                  </div>
                )}
                {t.note && (
                  <div className="last-performance" style={{ marginTop: 8 }}>
                    {t.note}
                  </div>
                )}
              </div>
            ))
          )}
            </>
          )}

          {detailTab === "info" && (
            <>
          {/* Was die Nebengruppen im Kopf bedeuten - der Kopf zeigt nur, DASS
              sie mitzaehlen, hier steht, wie stark. */}
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, margin: "0 0 12px" }}>
            {(exercise.secondary || []).length > 0 ? (
              <>
                Zählt voll auf{" "}
                <strong>{MUSCLE_GROUPS.find((m) => m.id === exercise.group)?.label || exercise.group}</strong>
                {" "}und je zur Hälfte auf{" "}
                <strong>
                  {(exercise.secondary || [])
                    .map((g) => MUSCLE_GROUPS.find((m) => m.id === g)?.label || g)
                    .join(" und ")}
                </strong>
                . Diese Übung trainiert die Nebengruppen deutlich mit; ein halber Satz
                ist die übliche grobe Verrechnung dafür, keine Messung.
              </>
            ) : (
              <>
                Zählt allein auf{" "}
                <strong>{MUSCLE_GROUPS.find((m) => m.id === exercise.group)?.label || exercise.group}</strong>
                {" "}– für diese Übung sind keine Nebenmuskelgruppen hinterlegt.
              </>
            )}
          </p>
          {meta.video && (
            <a
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 10, display: "inline-flex" }}
              href={meta.video}
              target="_blank"
              rel="noreferrer"
            >
              Video öffnen
            </a>
          )}
          <div className="quick-toggle-row">
            <button
              className={`chip chip-sm ${isTimeBasedExercise ? "active" : ""}`}
              onClick={() => onToggleTimeBased(exercise.id, !isTimeBasedExercise)}
              title="Zeitangabe für diese Übung aktivieren (z. B. Plank, Sprints)"
            >
              <Clock size={11} /> Zeitbasiert
            </button>

            {/* Liegestütze, Plank, Bandübungen: die Leistung hängt nicht am
                Studio. Ohne diesen Schalter würde die Historie beim Wechsel
                des Gyms in getrennte Linien zerfallen. */}
            <button
              className={`chip chip-sm ${isGymIndependentExercise ? "active" : ""}`}
              onClick={() => onToggleGymIndependent(exercise.id, !isGymIndependentExercise)}
              title="Diese Übung ist in jedem Gym gleich (z. B. Liegestütze, Plank, Bandübungen) – Verlauf, Rekorde und „letztes Mal“ werden dann nicht nach Gym getrennt"
            >
              <Globe size={11} /> Überall gleich
            </button>

            {availableSubgroups.length > 0 && (
              <button
                className={`chip chip-sm ${currentSubgroups.length > 0 ? "active" : ""}`}
                onClick={() => setEditingSubgroup(true)}
                title="Untergruppe bearbeiten"
              >
                <Pencil size={11} />
                {currentSubgroups.length === 0
                  ? "Untergruppe"
                  : currentSubgroups.length === 1
                  ? availableSubgroups.find((s) => s.id === currentSubgroups[0])?.label
                  : `${currentSubgroups.length} Untergruppen`}
              </button>
            )}
          </div>
          <div className="card">
            <label className="field-label">Notizen zu dieser Übung</label>
            <textarea
              className="session-notes"
              placeholder="z. B. Form-Cues, Verletzungshistorie, bevorzugtes Equipment…"
              value={exerciseNotes[exercise.id] || ""}
              onChange={(e) => onUpdateExerciseNote(exercise.id, e.target.value)}
            />
          </div>
            </>
          )}
        </div>
      </div>

      {/* Woher ein Bestwert stammt - derselbe Aufbau wie das Fenster hinter
          der 1RM-Kachel im Fortschritt: Wert, der Satz dahinter, das Datum
          und in einem Satz, wie gerechnet wird. */}
      {bestInfo && (
        <Modal title={bestInfo.title} onClose={() => setBestInfo(null)} width={380}>
          <div className="plan-title" style={{ marginBottom: 10 }}>{bestInfo.wert}</div>
          <div className="modal-list">
            <div className="modal-option">
              <span>Erreicht mit</span>
              <span>
                {bestInfo.quelle.bandName
                  ? `${bestInfo.quelle.bandName} × ${bestInfo.quelle.reps}`
                  : `${fmtDecimal(bestInfo.quelle.weight)} kg × ${bestInfo.quelle.reps}`}
              </span>
            </div>
            <div className="modal-option">
              <span>Wann</span>
              <span>{fmtDate(bestInfo.quelle.date)}</span>
            </div>
          </div>
          <div className="explain-formula" style={{ marginTop: 12 }}>
            <span className="explain-formula-label">So wird gerechnet</span>
            <div>{bestInfo.erklaerung}</div>
          </div>
        </Modal>
      )}

      {editingEquipment && (
        <Modal title="Gerät wählen" onClose={() => setEditingEquipment(false)}>
          <div className="modal-list">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`modal-option ${currentEquipment === opt ? "active" : ""}`}
                onClick={() => { onSetExerciseEquipment(exercise.id, opt); setEditingEquipment(false); }}
              >
                {opt}
                {currentEquipment === opt && <Check size={15} />}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {editingSubgroup && (
        <Modal title="Untergruppen wählen" onClose={() => setEditingSubgroup(false)}>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 10px" }}>
            Mehrere möglich – die Übung erscheint dann bei jedem dieser Filter.
          </p>
          <div className="modal-list">
            {/* Stays open while picking: choosing several in a row is the
                whole point, so it should not close after the first tap. */}
            {availableSubgroups.map((sg) => {
              const on = currentSubgroups.includes(sg.id);
              return (
                <button
                  key={sg.id}
                  className={`modal-option ${on ? "active" : ""}`}
                  onClick={() => onSetExerciseSubgroup(exercise.id, sg.id)}
                >
                  {sg.label}
                  {on && <Check size={15} />}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              disabled={currentSubgroups.length === 0}
              onClick={() => onSetExerciseSubgroup(exercise.id, null)}
            >
              Alle entfernen
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => setEditingSubgroup(false)}
            >
              <Check size={14} /> Fertig
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan builder
// ---------------------------------------------------------------------------

function PlanBuilder({
  initialPlan,
  exercises,
  folders,
  logs,
  plans = [],
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  onSetExerciseSubgroups,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  onAddCustom,
  timeBasedExercises,
  gymIndependentExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onToggleGymIndependent,
  onCancel,
  onSave,
  onCreateFolder,
  gyms = [],
  activeGymId = null,
}) {
  const [name, setName] = useState(initialPlan?.name || "");
  // Plaene aus aelteren Versionen haben noch keine Eintrags-IDs - ohne
  // Nachreichen haetten alle Eintraege dieselbe (undefined) Identitaet.
  const [items, setItems] = useState(() =>
    (initialPlan?.items || []).map((it) => (it && it.id ? it : { ...it, id: uid() }))
  );
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("alle");
  const [subgroupFilter, setSubgroupFilter] = useState("alle");
  const [folderId, setFolderId] = useState(initialPlan?.folderId || null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [pickingFromHistory, setPickingFromHistory] = useState(false);
  // The builder runs in two steps: pick the exercises first (step 1), then
  // fine-tune sets/reps/weight (step 2). Showing everything at once meant a
  // very long scroll on a phone. Editing an existing plan opens on step 2
  // because the exercises are usually already the right ones.
  const [step, setStep] = useState(initialPlan?.items?.length ? 2 : 1);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState("alle");
  // Rest times are set here so a workout starts with the right pause
  // instead of having to be adjusted mid-session every time.
  const [planRest, setPlanRest] = useState(initialPlan?.restSeconds ?? 90);
  // HIT/interval workouts run by themselves: the set timer checks the set
  // off and moves on. Per exercise this can be null (= follow the workout),
  // true or false, so a single rep-based exercise can opt out.
  const [planAutoRun, setPlanAutoRun] = useState(!!initialPlan?.autoRun);
  // One central set length for the whole workout; individual exercises may
  // override it. In automatic mode this replaces reps everywhere unless an
  // exercise is explicitly switched back to counting reps.
  const [planAutoSeconds, setPlanAutoSeconds] = useState(initialPlan?.autoSetSeconds ?? 30);
  const [planAutoOrder, setPlanAutoOrder] = useState(initialPlan?.autoOrder || "circuit");
  const [planRoundRest, setPlanRoundRest] = useState(initialPlan?.roundRestSeconds ?? 60);
  const [restPopupFor, setRestPopupFor] = useState(null); // "plan" | Eintrags-ID
  const [itemMenuId, setItemMenuId] = useState(null);
  const [itemMenuUp, setItemMenuUp] = useState(false);
  const itemMenuRef = useMenuFlip(itemMenuId, setItemMenuUp);
  const pastLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [logs]
  );

  useEffect(() => {
    if (!headerMenuOpen) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".builder-header-actions")) setHeaderMenuOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [headerMenuOpen]);

  useEffect(() => {
    if (!itemMenuId) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".item-menu-wrap")) setItemMenuId(null);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [itemMenuId]);

  const applyFromLog = (log) => {
    setName(`${log.planName} (Kopie ${fmtDate(log.date)})`);
    setItems(
      logEntries(log).map((e) => {
        const sets = entrySets(e);
        const working = sets.filter((s) => !s.warmup);
        const first = working[0] || sets[0] || {};
        return {
          id: uid(),
          exerciseId: e.exerciseId,
          sets: e.targetSets || working.length || sets.length,
          warmupSets: sets.filter((s) => s.warmup).length,
          reps: e.targetReps || first.reps || 10,
          weight: e.targetWeight || first.weight || 0,
          useTime: !!e.targetUseTime,
          duration: e.targetDuration || first.duration || 30,
        };
      })
    );
    setPickingFromHistory(false);
    setHeaderMenuOpen(false);
  };

  // Long-press a row, then drag it up or down to reorder. The mechanics
  // live in useDragReorder so the workout screen can reuse them.
  const {
    draggingId,
    itemRefs,
    dragHandleProps,
  } = useDragReorder({
    items,
    getId: (it) => it.id,
    onReorder: setItems,
  });

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const folder = { id: uid(), name: trimmed, color: newFolderColor };
    onCreateFolder(folder);
    setFolderId(folder.id);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setCreatingFolder(false);
  };

  const exById = useMemo(
    () => Object.fromEntries(exercises.map((e) => [e.id, e])),
    [exercises]
  );
  // Suggestions above the picker: an alphabetical list of ~150 exercises is
  // a poor starting point — what you want is almost always something you
  // trained recently or already put into other plans.
  const recentIds = useMemo(() => {
    const seen = [];
    [...logs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((log) => {
        logEntries(log).forEach((e) => {
          if (!seen.includes(e.exerciseId)) seen.push(e.exerciseId);
        });
      });
    return seen.slice(0, 8);
  }, [logs]);
  const frequentIds = useMemo(() => {
    const counts = {};
    (plans || []).forEach((pl) => {
      (pl.items || []).forEach((i) => {
        counts[i.exerciseId] = (counts[i.exerciseId] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 8);
  }, [plans]);

  // Die Liste sortiert sich selbst statt separate Vorschlagsbalken zu zeigen:
  // zuletzt trainierte Uebungen ganz oben, danach die, die schon oft in
  // Plaenen stecken, der Rest alphabetisch wie gehabt.
  const sortRank = useMemo(() => {
    const rank = {};
    recentIds.forEach((id, i) => { rank[id] = i; });
    frequentIds.forEach((id, i) => {
      if (rank[id] === undefined) rank[id] = recentIds.length + i;
    });
    return rank;
  }, [recentIds, frequentIds]);

  const filtered = useMemo(
    () => {
      const matching = exercises.filter(
        (e) =>
          (group === "alle" || e.group === group) &&
          (subgroupFilter === "alle" || exerciseHasSubgroup(e, exerciseSubgroupOverrides, subgroupFilter)) &&
          (equipmentFilter === "alle" ||
            getExerciseEquipment(e, exerciseEquipmentOverrides) === equipmentFilter) &&
          e.name.toLowerCase().includes(query.toLowerCase())
      );
      const BOTTOM = Number.MAX_SAFE_INTEGER;
      return matching.sort((a, b) => {
        const ra = sortRank[a.id] ?? BOTTOM;
        const rb = sortRank[b.id] ?? BOTTOM;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, "de");
      });
    },
    [exercises, group, subgroupFilter, exerciseSubgroupOverrides,
     equipmentFilter, exerciseEquipmentOverrides, query, sortRank]
  );
  // Rendering every one of the ~150 exercises made each tap on "Add"
  // redraw the whole list, which felt sluggish. Only a screenful is
  // rendered; narrowing via search/filter reveals the rest.
  const visibleFiltered = filtered.slice(0, EXERCISE_PICKER_LIMIT);
  const hiddenCount = filtered.length - visibleFiltered.length;
  const activeGroupSubgroups = group !== "alle" ? SUBGROUPS[group] || [] : [];

  const addExercise = (exerciseId) => {
    // Start from what was last achieved instead of a generic 3x10 - when you
    // build a plan around an exercise you already train, those numbers are
    // the useful starting point.
    const wasTimed = isTimeBasedInLogs(logs, exerciseId, timeBasedExercises);
    const history = getExerciseHistory(
      logs, exerciseId, null, wasTimed,
      effectiveGymId(exerciseId, activeGymId, gymIndependentExercises)
    );
    const working = (history?.lastSets || []).filter((set) => !set.warmup);
    const last = working[0];
    const warmCount = (history?.lastSets || []).filter((set) => set.warmup).length;
    setItems([...items, {
      // Eigene ID je Platz - dieselbe Uebung darf mehrfach im Plan stehen
      // (Zirkel: A, B, A, C), deshalb kann die Uebungs-ID das nicht leisten.
      id: uid(),
      exerciseId,
      sets: working.length > 0 ? working.length : 3,
      warmupSets: warmCount,
      reps: last && toNum(last.reps) > 0 ? toNum(last.reps) : 10,
      weight: last && toNum(last.weight) > 0 ? fmtDecimal(last.weight) : 0,
      useTime: wasTimed,
      duration: last && toNum(last.duration) > 0 ? toNum(last.duration) : 30,
      supersetWithNext: false,
      restSeconds: null,
      autoRun: null,
      autoSeconds: null,
    }]);
  };
  const removeItem = (itemId) => {
    setItems(items.filter((i) => i.id !== itemId));
    setExpandedItemId((cur) => (cur === itemId ? null : cur));
  };
  const toggleSupersetWithNext = (itemId) => {
    setItems(
      items.map((i) =>
        i.id === itemId ? { ...i, supersetWithNext: !i.supersetWithNext } : i
      )
    );
  };
  const updateItem = (itemId, field, value) => {
    // Store exactly what the user typed while they're typing — clamping to
    // a minimum on every keystroke made it impossible to clear a field to
    // type a new number (deleting the digits always snapped straight back
    // to 1). The minimum is enforced once the field is left, in
    // handleItemBlur below.
    setItems(
      items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i))
    );
  };
  // Rundenmodus: im Zirkel ist "Satz N" gleichbedeutend mit "Runde N" -
  // Satz 1 aller Uebungen ist Runde 1. Statt die Satzzahl bei jeder Uebung
  // einzeln einzustellen, wird die Runde einmal definiert (die Uebungsliste)
  // und dazu gesagt, wie oft sie laufen soll. Eine eigene Datenstruktur
  // braucht es dafuer nicht: die Rundenzahl ist die Satzzahl aller Uebungen.
  const roundCount = (() => {
    if (items.length === 0) return 0;
    const first = Math.max(1, toNum(items[0].sets));
    return items.every((i) => Math.max(1, toNum(i.sets)) === first) ? first : 0;
  })();
  const setRoundCount = (n) => {
    const rounds = Math.max(1, Math.round(toNum(n)) || 1);
    setItems(items.map((i) => ({ ...i, sets: rounds })));
  };

  const handleItemBlur = (itemId, field, min) => {
    setItems(
      items.map((i) => {
        if (i.id !== itemId) return i;
        const n = Math.max(min, toNum(i[field]));
        const value = n || min;
        // Weight is shown German-style: typing 62,5 should not silently turn
        // into 62.5 on blur. It stays a string here; toNum() is used
        // everywhere the value is actually calculated with.
        return { ...i, [field]: field === "weight" ? fmtDecimal(value) : value };
      })
    );
  };
  // Weight can legitimately be 0 (bodyweight exercises); like updateItem,
  // this only stores what was typed — cleanup happens on blur.
  const updateItemWeight = (itemId, value) => {
    setItems(
      items.map((i) => (i.id === itemId ? { ...i, weight: value } : i))
    );
  };
  const toggleItemTime = (itemId, useTime) => {
    setItems(
      items.map((i) => (i.id === itemId ? { ...i, useTime } : i))
    );
  };

  // Suggestions only make sense as a starting point — once you search or
  // filter, the list below is already the answer and the chips just add noise.

  return (
    <div>
      <div className="builder-header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, position: "relative" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* The name used to hide behind a tap on the heading, which meant
              the very first thing you do needed a step nobody discovers.
              Step 1 has room for a plain field; step 2 keeps the compact
              heading so the exercise cards stay the focus. */}
          {/* Always a plain field, in both steps: editing an existing plan
              opens on step 2, so hiding the name behind a tap there would
              just move the original problem instead of solving it. */}
          <input
            type="text"
            placeholder="Name des Workouts"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {step === 1 && (
            <button
              className={`btn-icon ${query ? "has-note" : ""}`}
              onClick={() => setSearchOpen((v) => { if (v) setQuery(""); return !v; })}
              title="Übung suchen"
            >
              <Search size={16} />
            </button>
          )}
          <button
            className={`btn-icon ${folderId ? "has-note" : ""}`}
            onClick={() => setShowFolderPicker((s) => !s)}
            title="Ordner wählen"
          >
            <Folder size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => setHeaderMenuOpen((s) => !s)}
            title="Weitere Optionen"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        {headerMenuOpen && (
          <div className="program-menu" style={{ top: "calc(100% + 4px)", right: 0, left: "auto" }}>
            <button
              className="program-menu-item"
              onClick={() => { setPickingFromHistory(true); setHeaderMenuOpen(false); }}
            >
              <ClipboardList size={14} /> Aus vergangenem Training übernehmen
            </button>
            <button
              className="program-menu-item"
              onClick={() => { setCreatingExercise(true); setHeaderMenuOpen(false); }}
            >
              <Plus size={14} /> Neue Übung erstellen
            </button>
          </div>
        )}
      </div>

      {creatingExercise && (
        <Modal title="Neue Übung erstellen" onClose={() => setCreatingExercise(false)} width={420}>
          <NewExerciseForm
            exercises={exercises}
            onAddCustom={onAddCustom}
            onSetExerciseSubgroups={onSetExerciseSubgroups}
            onDone={(newExercise) => {
              setCreatingExercise(false);
              // Jump straight to it in the picker below so it can be added
              // to the plan right away instead of having to search again.
              if (newExercise) { setQuery(newExercise.name); setSearchOpen(true); }
            }}
          />
        </Modal>
      )}

      {pickingFromHistory && (
        <Modal title="Aus vergangenem Training" onClose={() => setPickingFromHistory(false)}>
          {pastLogs.length === 0 ? (
            <div className="empty-state">Noch keine vergangenen Trainings vorhanden.</div>
          ) : (
            <div className="modal-list">
              {pastLogs.map((log) => (
                <button
                  className="modal-option"
                  key={log.id}
                  onClick={() => { applyFromLog(log); setPickingFromHistory(false); }}
                >
                  <span>
                    {log.planName}
                    <span className="tag" style={{ marginLeft: 8 }}>{fmtDate(log.date)}</span>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {showFolderPicker && (
        <Modal title="Ordner wählen" onClose={() => { setShowFolderPicker(false); setCreatingFolder(false); }}>
          <div className="modal-list">
            <button
              className={`modal-option ${folderId === null ? "active" : ""}`}
              onClick={() => { setFolderId(null); setShowFolderPicker(false); }}
            >
              Kein Ordner
              {folderId === null && <Check size={15} />}
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className={`modal-option ${folderId === f.id ? "active" : ""}`}
                onClick={() => { setFolderId(f.id); setShowFolderPicker(false); }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="folder-dot" style={{ background: f.color }} />
                  {f.name}
                </span>
                {folderId === f.id && <Check size={15} />}
              </button>
            ))}
          </div>

          {creatingFolder ? (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <label className="field-label">Ordnername</label>
              <input
                type="text"
                placeholder="z. B. Push/Pull/Legs"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <label className="field-label" style={{ marginTop: 8 }}>Farbe</label>
              <div className="color-swatch-grid" style={{ marginTop: 6 }}>
                {FOLDER_COLORS.map((c) => (
                  <span
                    key={c}
                    className={`color-swatch ${newFolderColor === c ? "active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setNewFolderColor(c)}
                  />
                ))}
              </div>
              <button
                className="btn btn-primary btn-block btn-sm"
                style={{ marginTop: 10 }}
                disabled={!newFolderName.trim()}
                onClick={handleCreateFolder}
              >
                <Save size={14} /> Ordner erstellen
              </button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-block btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => setCreatingFolder(true)}
            >
              <Plus size={14} /> Neuer Ordner
            </button>
          )}
        </Modal>
      )}

      {step === 1 ? (
        <div className="picker-step">
      {searchOpen && (
        <div className="search-box">
          <Search size={16} color="var(--text-dim)" />
          <input
            autoFocus
            placeholder="Übung suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn-icon"
            onClick={() => { setQuery(""); setSearchOpen(false); }}
            title="Suche schließen"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <span
          className={`chip ${group === "alle" ? "active" : ""}`}
          onClick={() => { setGroup("alle"); setSubgroupFilter("alle"); }}
        >
          Alle
        </span>
        {MUSCLE_GROUPS.map((g) => (
          <span
            key={g.id}
            className={`chip ${group === g.id ? "active" : ""}`}
            onClick={() => {
              setSubgroupFilter("alle");
              setGroup((current) => (current === g.id ? "alle" : g.id));
            }}
          >
            {g.label}
          </span>
        ))}
      </div>
      {activeGroupSubgroups.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 10 }}>
          <span
            className={`chip chip-sm ${subgroupFilter === "alle" ? "active" : ""}`}
            onClick={() => setSubgroupFilter("alle")}
          >
            Alle {MUSCLE_GROUPS.find((g) => g.id === group)?.label}
          </span>
          {activeGroupSubgroups.map((sg) => (
            <span
              key={sg.id}
              className={`chip chip-sm ${subgroupFilter === sg.id ? "active" : ""}`}
              onClick={() => setSubgroupFilter(sg.id)}
            >
              {sg.label}
            </span>
          ))}
        </div>
      )}
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <span
          className={`chip chip-sm ${equipmentFilter === "alle" ? "active" : ""}`}
          onClick={() => setEquipmentFilter("alle")}
        >
          Alle Geräte
        </span>
        {EQUIPMENT_OPTIONS.map((opt) => (
          <span
            key={opt}
            className={`chip chip-sm ${equipmentFilter === opt ? "active" : ""}`}
            onClick={() => setEquipmentFilter(opt)}
          >
            {opt}
          </span>
        ))}
      </div>
      <div className="card exercise-picker-list">
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: "14px 0" }}>Keine Übung gefunden.</div>
        )}
        {visibleFiltered.map((e) => {
          const addedCount = items.filter((i) => i.exerciseId === e.id).length;
          return (
            <div className="ex-row" key={e.id}>
              <span
                className="ex-name ex-name-clickable"
                onClick={() => setSelectedExerciseId(e.id)}
              >
                {e.name}
              </span>
              {addedCount > 0 && (
                <span className="tag" title="So oft ist die Übung schon im Plan">
                  {addedCount}×
                </span>
              )}
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => addExercise(e.id)}
              >
                <Plus size={14} /> Hinzufügen
              </button>
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="picker-more-hint">
            + {hiddenCount} weitere – suche oder filtere, um sie zu finden
          </div>
        )}
      </div>

          {items.length === 0 && (
            <div style={{ color: "var(--text-dim)", fontSize: 12.5, marginTop: 4, marginBottom: 4 }}>
              Wähle mindestens eine Übung aus.
            </div>
          )}
          <div className="picker-actions" style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
              <X size={16} /> Abbrechen
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={items.length === 0}
              onClick={() => setStep(2)}
            >
              Weiter ({items.length} {items.length === 1 ? "Übung" : "Übungen"})
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <button
              className="modal-option"
              onClick={() => setRestPopupFor("plan")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Timer size={15} /> {planAutoRun ? "Pause nach jedem Satz" : "Pause zwischen den Sätzen"}
              </span>
              <span style={{ color: "var(--accent)" }}>
                {planRest === 0 ? "Aus" : `${planRest}s`}
              </span>
            </button>
            <button
              className="modal-option"
              style={{ marginTop: 6 }}
              onClick={() => setPlanAutoRun((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Play size={15} /> Automatisch durchlaufen
              </span>
              <span style={{ color: planAutoRun ? "var(--accent)" : "var(--text-dim)" }}>
                {planAutoRun ? "An" : "Aus"}
              </span>
            </button>
            {planAutoRun && (
              <>
                <button
                  className="modal-option"
                  style={{ marginTop: 6 }}
                  onClick={() => setRestPopupFor("autoSeconds")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={15} /> Zeit pro Satz
                  </span>
                  <span style={{ color: "var(--accent)" }}>{planAutoSeconds}s</span>
                </button>
                <button
                  className="modal-option"
                  style={{ marginTop: 6 }}
                  onClick={() => setPlanAutoOrder(planAutoOrder === "circuit" ? "exercise" : "circuit")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Repeat size={15} /> Reihenfolge
                  </span>
                  <span style={{ color: "var(--accent)" }}>
                    {planAutoOrder === "circuit" ? "Zirkel" : "Übung für Übung"}
                  </span>
                </button>
                {planAutoOrder === "circuit" && items.length > 0 && (
                  <button
                    className="modal-option"
                    style={{ marginTop: 6 }}
                    onClick={() => setRestPopupFor("rounds")}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <RotateCcw size={15} /> Runden
                    </span>
                    <span style={{ color: "var(--accent)" }}>
                      {roundCount > 0 ? `${roundCount}×` : "gemischt"}
                    </span>
                  </button>
                )}
                <button
                  className="modal-option"
                  style={{ marginTop: 6 }}
                  onClick={() => setRestPopupFor("roundRest")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Timer size={15} />
                    {planAutoOrder === "circuit" ? "Pause nach jeder Runde" : "Pause nach jeder Übung"}
                  </span>
                  <span style={{ color: "var(--accent)" }}>
                    {planRoundRest === 0 ? "Aus" : `${planRoundRest}s`}
                  </span>
                </button>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                  {planAutoOrder === "circuit"
                    ? "Satz 1 aller Übungen, dann Satz 2 aller Übungen. Die Satzpause läuft zwischen den Übungen, die Rundenpause nach der letzten Übung einer Runde. Über „Runden“ stellst du die Übungsliste einmal zusammen und sagst nur noch, wie oft sie durchlaufen wird."
                    : "Alle Sätze einer Übung am Stück, danach die nächste Übung."}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <span className="plan-title">Übungen einstellen</span>
            <div style={{ marginTop: 10 }}>
              {items.map((it, itemIndex) => {
                const ex = exById[it.exerciseId];
                // With the automatic run on, every exercise is timed unless it
                // was explicitly switched back to reps - so the summary and the
                // fields below have to show seconds, not reps.
                const autoTimed = planAutoRun && it.autoRun !== false;
                const itemUsesTime = autoTimed || !!it.useTime;
                const shownSeconds = autoTimed
                  ? (it.autoSeconds != null ? it.autoSeconds : planAutoSeconds)
                  : (it.duration ?? 30);
                const isDragging = draggingId === it.id;
                const isOpen = expandedItemId === it.id;
                const warm = Math.max(0, toNum(it.warmupSets));
                return (
                  <React.Fragment key={it.id}>
                  <div
                    ref={(el) => { itemRefs.current[it.id] = el; }}
                    className={`plan-item-row builder-item ${isOpen ? "is-open" : ""} ${itemMenuId === it.id ? "menu-open" : ""} ${isDragging ? "is-dragging" : ""}`}
                  >
                    <div className="builder-item-head">
                      <span
                        className="drag-handle"
                        title="Gedrückt halten, um die Reihenfolge zu ändern"
                        {...dragHandleProps(it.id)}
                      >
                        <GripVertical size={16} />
                      </span>
                      <div
                        className="builder-item-main"
                        onClick={() => setExpandedItemId(isOpen ? null : it.id)}
                      >
                        <span className="ex-name">{ex.name}</span>
                        <span className="builder-item-summary">
                          {warm > 0 && `${warm}W + `}
                          {`${it.sets}×${itemUsesTime ? `${shownSeconds} Sek.` : it.reps}`}
                          {!itemUsesTime && toNum(it.weight) > 0 && ` · ${fmtDecimal(it.weight)} kg`}
                          {it.restSeconds != null && ` · Pause ${it.restSeconds === 0 ? "aus" : `${it.restSeconds}s`}`}
                          {planAutoRun && it.autoRun === false && " · zählt Wdh."}
                        </span>
                      </div>
                      <div className={`item-menu-wrap ${itemMenuUp && itemMenuId === it.id ? "drop-up" : ""}`}>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            const opening = itemMenuId !== it.id;
                            setItemMenuUp(opening ? shouldDropUp(e.target) : false);
                            setItemMenuId(opening ? it.id : null);
                          }}
                          title="Weitere Optionen"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {itemMenuId === it.id && (
                          <div
                            ref={itemMenuRef}
                            className="program-menu"
                            style={{ top: "calc(100% + 4px)", right: 0, left: "auto" }}
                          >
                            {itemIndex < items.length - 1 && (
                              <button
                                className="program-menu-item"
                                onClick={() => { toggleSupersetWithNext(it.id); setItemMenuId(null); }}
                              >
                                <Repeat size={14} />
                                {it.supersetWithNext ? "Superset-Verknüpfung lösen" : "Mit nächster Übung verknüpfen"}
                              </button>
                            )}
                            {planAutoRun && (
                              <>
                                <button
                                  className="program-menu-item"
                                  onClick={() => { setRestPopupFor(`time:${it.id}`); setItemMenuId(null); }}
                                >
                                  <Clock size={14} />
                                  {it.autoSeconds != null
                                    ? `Zeit: ${it.autoSeconds}s`
                                    : `Zeit: wie im Workout (${planAutoSeconds}s)`}
                                </button>
                                <button
                                  className="program-menu-item"
                                  onClick={() => {
                                    // false = this exercise counts reps and the
                                    // run waits for the set to be ticked off.
                                    updateItem(it.id, "autoRun", it.autoRun === false ? null : false);
                                    setItemMenuId(null);
                                  }}
                                >
                                  <Repeat size={14} />
                                  {it.autoRun === false
                                    ? "Wieder auf Zeit umstellen"
                                    : "Auf Wiederholungen umstellen"}
                                </button>
                              </>
                            )}
                            <button
                              className="program-menu-item"
                              onClick={() => { setRestPopupFor(it.id); setItemMenuId(null); }}
                            >
                              <Timer size={14} />
                              {it.restSeconds != null
                                ? `Pausenzeit · ${it.restSeconds === 0 ? "Aus" : `${it.restSeconds}s`}`
                                : "Pausenzeit"}
                            </button>
                            {/* Redundant while the automatic run is on: the
                                set length comes from the workout there, and
                                two similar-sounding entries only confuse. */}
                            {!planAutoRun && (
                              <button
                                className="program-menu-item"
                                onClick={() => { toggleItemTime(it.id, !itemUsesTime); setItemMenuId(null); }}
                              >
                                <Clock size={14} />
                                {itemUsesTime ? "Wieder Wiederholungen zählen" : "Zeit pro Satz statt Wiederholungen"}
                              </button>
                            )}
                            <button
                              className="program-menu-item"
                              onClick={() => { setSelectedExerciseId(it.exerciseId); setItemMenuId(null); }}
                            >
                              <StickyNote size={14} /> Übungs-Details & Notiz
                            </button>
                            <button
                              className="program-menu-item danger"
                              onClick={() => { removeItem(it.id); setItemMenuId(null); }}
                            >
                              <Trash2 size={14} /> Übung entfernen
                            </button>
                          </div>
                        )}
                      </div>
                      <span
                        className="builder-chevron"
                        onClick={() => setExpandedItemId(isOpen ? null : it.id)}
                      >
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </span>
                    </div>

                    {isOpen && (
                      <div className="builder-item-body">
                        <div style={{ display: "flex", gap: 8 }}>
                          {/* Warm-up sets are planned separately from working sets
                              and get created already flagged as "W" when the
                              workout starts. */}
                          <div style={{ flex: "0 0 52px" }}>
                            <label className="field-label" title="Aufwärmsätze">W</label>
                            <input
                              type="number"
                                inputMode="numeric"
                              min="0"
                              value={it.warmupSets ?? 0}
                              onChange={(e) => updateItem(it.id, "warmupSets", e.target.value)}
                              onBlur={() => handleItemBlur(it.id, "warmupSets", 0)}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="field-label">Sätze</label>
                            <input
                              type="number"
                                inputMode="numeric"
                              min="1"
                              value={it.sets}
                              onChange={(e) => updateItem(it.id, "sets", e.target.value)}
                              onBlur={() => handleItemBlur(it.id, "sets", 1)}
                            />
                          </div>
                          {itemUsesTime ? (
                            <div style={{ flex: 1 }}>
                              <label className="field-label">Sek.</label>
                              {/* In automatic mode this field edits the
                                  exercise's own set length, so changing it
                                  here does the same as the menu entry. */}
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={shownSeconds}
                                onChange={(e) =>
                                  updateItem(
                                    it.id,
                                    autoTimed ? "autoSeconds" : "duration",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  handleItemBlur(it.id, autoTimed ? "autoSeconds" : "duration", 1)
                                }
                              />
                            </div>
                          ) : (
                            <div style={{ flex: 1 }}>
                              <label className="field-label">Wdh.</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={it.reps}
                                onChange={(e) => updateItem(it.id, "reps", e.target.value)}
                                onBlur={() => handleItemBlur(it.id, "reps", 1)}
                              />
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <label className="field-label">kg</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={it.weight ?? 0}
                              onChange={(e) => updateItemWeight(it.id, e.target.value)}
                              onBlur={() => handleItemBlur(it.id, "weight", 0)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {it.supersetWithNext && itemIndex < items.length - 1 && (
                    <div className="superset-connector">
                      <Repeat size={12} /> Superset mit nächster Übung
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {!name.trim() && (
            <div style={{ color: "var(--text-dim)", fontSize: 12.5, marginTop: 4, marginBottom: 4 }}>
              Gib oben einen Plan-Namen ein, um zu speichern.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setStep(1); setItemMenuId(null); }}>
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Übungen
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={!name.trim() || items.length === 0}
              onClick={() =>
                onSave({
                  id: initialPlan?.id || uid(),
                  name: name.trim(),
                  author: "Eigener Plan",
                  premade: false,
                  folderId,
                  restSeconds: planRest,
                  autoRun: planAutoRun,
                  autoSetSeconds: Math.max(1, Number(planAutoSeconds) || 30),
                  autoOrder: planAutoOrder,
                  roundRestSeconds: Math.max(0, Number(planRoundRest) || 0),
                  // Fields are stored as whatever the user typed while editing
                  // (see updateItem/updateItemWeight) so a field can be freely
                  // cleared and retyped. Normalize everything to valid numbers
                  // here in case a field is saved before it was ever blurred.
                  items: items.map((i) => ({
                    ...i,
                    restSeconds: i.restSeconds != null ? Math.max(0, Number(i.restSeconds) || 0) : null,
                    autoRun: i.autoRun === true || i.autoRun === false ? i.autoRun : null,
                    autoSeconds: i.autoSeconds != null ? Math.max(1, Number(i.autoSeconds) || 1) : null,
                    sets: Math.max(1, Number(i.sets) || 1),
                    reps: Math.max(1, toNum(i.reps) || 1),
                    weight: Math.max(0, toNum(i.weight) || 0),
                    duration: Math.max(1, toNum(i.duration) || 1),
                  })),
                })
              }
            >
              {initialPlan ? <><PencilLine size={16} /> Änderungen speichern</> : <><Save size={16} /> Plan speichern</>}
            </button>
          </div>
        </>
      )}

      {restPopupFor && (() => {
        // One popup serves four things: workout rest, per-exercise rest,
        // the central set length and the round rest. The differences are
        // collected here instead of being repeated in the markup.
        const kind =
          restPopupFor === "plan" ? "planRest"
          : restPopupFor === "roundRest" ? "roundRest"
          : restPopupFor === "autoSeconds" ? "autoSeconds"
          : restPopupFor === "rounds" ? "rounds"
          : restPopupFor.startsWith("time:") ? "itemTime"
          : "itemRest";
        const itemId = restPopupFor.startsWith("time:") ? restPopupFor.slice(5) : restPopupFor;
        const item = items.find((i) => i.id === itemId);
        const titles = {
          planRest: "Pause nach jedem Satz",
          roundRest: planAutoOrder === "circuit" ? "Pause nach jeder Runde" : "Pause nach jeder Übung",
          autoSeconds: "Zeit pro Satz",
          itemRest: "Pause für diese Übung",
          itemTime: "Zeit für diese Übung",
          rounds: "Runden",
        };
        const presets = kind === "rounds"
          ? [2, 3, 4, 5, 6, 8, 10]
          : kind === "autoSeconds" || kind === "itemTime"
          ? [15, 20, 30, 40, 45, 60, 90]
          : [0, 15, 30, 45, 60, 90, 120, 180];
        const current =
          kind === "planRest" ? planRest
          : kind === "roundRest" ? planRoundRest
          : kind === "autoSeconds" ? planAutoSeconds
          : kind === "rounds" ? (roundCount > 0 ? roundCount : null)
          : kind === "itemTime" ? item?.autoSeconds
          : item?.restSeconds;
        const apply = (sec) => {
          if (kind === "planRest") setPlanRest(sec);
          else if (kind === "roundRest") setPlanRoundRest(sec);
          else if (kind === "autoSeconds") setPlanAutoSeconds(sec);
          else if (kind === "rounds") setRoundCount(sec);
          else if (kind === "itemTime") updateItem(itemId, "autoSeconds", sec);
          else updateItem(itemId, "restSeconds", sec);
        };
        const inheritLabel =
          kind === "itemTime" ? `Wie im Workout (${planAutoSeconds}s)`
          : `Wie im Workout (${planRest === 0 ? "Aus" : `${planRest}s`})`;
        const canInherit = kind === "itemRest" || kind === "itemTime";
        const minValue = kind === "autoSeconds" || kind === "itemTime" || kind === "rounds" ? 1 : 0;
        // Runden sind Anzahlen, keine Sekunden - Beschriftung und Schrittweite
        // muessen das widerspiegeln, sonst steht "3 Sekunden" fuer 3 Runden.
        // Bei gemischten Satzzahlen gibt es keine gemeinsame Rundenzahl - dann
        // steht im Eingabefeld die groesste, damit nichts still gekuerzt wird.
        const maxItemSets = Math.max(1, ...items.map((i) => Math.max(1, toNum(i.sets))));
        const presetLabel = (n) =>
          kind === "rounds"
            ? plural(n, "Runde", "Runden")
            : n === 0
            ? "Aus"
            : plural(n, "Sekunde", "Sekunden");

        return (
          <Modal title={titles[kind]} onClose={() => setRestPopupFor(null)}>
            <div className="modal-list">
              {canInherit && (
                <button
                  className={`modal-option ${current == null ? "active" : ""}`}
                  onClick={() => {
                    updateItem(itemId, kind === "itemTime" ? "autoSeconds" : "restSeconds", null);
                    setRestPopupFor(null);
                  }}
                >
                  {inheritLabel}
                  {current == null && <Check size={15} />}
                </button>
              )}
              {presets.map((sec) => (
                <button
                  key={sec}
                  className={`modal-option ${current === sec ? "active" : ""}`}
                  onClick={() => { apply(sec); setRestPopupFor(null); }}
                >
                  {presetLabel(sec)}
                  {current === sec && <Check size={15} />}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <label className="field-label">
                {kind === "rounds" ? "Eigener Wert (Runden)" : "Eigener Wert (Sekunden)"}
              </label>
              <input
                type="number"
                                inputMode="numeric"
                min={minValue}
                step={kind === "rounds" ? "1" : "5"}
                value={
                  current ??
                  (kind === "rounds" ? maxItemSets : kind === "itemTime" ? planAutoSeconds : planRest)
                }
                onChange={(e) => apply(Math.max(minValue, Number(e.target.value) || minValue))}
              />
            </div>
          </Modal>
        );
      })()}

      {selectedExercise && (
        <ExerciseDetailSheet
          gyms={gyms}
          key={selectedExercise.id}
          exercise={selectedExercise}
          exercises={exercises}
          logs={logs}
          exerciseNotes={exerciseNotes}
          exerciseSubgroupOverrides={exerciseSubgroupOverrides}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
          exerciseEquipmentOverrides={exerciseEquipmentOverrides}
          onSetExerciseEquipment={onSetExerciseEquipment}
          timeBasedExercises={timeBasedExercises}
          gymIndependentExercises={gymIndependentExercises}
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onToggleGymIndependent={onToggleGymIndependent}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan card (press-and-hold to move into a folder)
// ---------------------------------------------------------------------------

function PlanCard({ plan, exBy, onDelete, onEdit, onStart, onLongPress, lastDone }) {
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);
  const [pressing, setPressing] = useState(false);
  const canMove = !!onLongPress;

  const startPress = () => {
    if (!canMove) return;
    longPressFired.current = false;
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setPressing(false);
      onLongPress(plan);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    setPressing(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const guardClick = (fn) => () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    fn();
  };

  return (
    <div
      className={`card ${pressing ? "is-pressing" : ""}`}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="plan-title">{plan.name}</div>
          {lastDone && (
            <span className="plan-last-done">{timeAgoShort(lastDone)}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn-icon" onClick={guardClick(() => onEdit?.(plan))} title="Plan bearbeiten"><PencilLine size={15} /></button>
          <button className="btn-icon" onClick={guardClick(() => onDelete(plan.id))} title="Plan löschen"><Trash2 size={15} /></button>
        </div>
      </div>
      <div style={{ margin: "10px 0", color: "var(--text-dim)", fontSize: 13 }}>
        {(Array.isArray(plan.items) ? plan.items : [])
          .map((i) => exBy[i.exerciseId]?.name)
          .filter(Boolean)
          .join(" · ")}
      </div>
      <button className="btn btn-ghost btn-block" onClick={guardClick(() => onStart(plan))}>
        <Play size={15} /> Training starten <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plans view
// ---------------------------------------------------------------------------

// Survives unmounting of PlansView and, via storage, also a restart of the
// app - reopening it should look exactly like it was left.
let rememberedCollapsedFolders = {};
try {
  const raw = typeof window !== "undefined"
    ? window.localStorage?.getItem("training-app:collapsed-folders")
    : null;
  if (raw) rememberedCollapsedFolders = JSON.parse(raw) || {};
} catch (_) { /* view state is optional */ }

function PlansView({
  plans,
  exBy,
  folders,

  programs,
  activeProgramId,
  onSelectProgram,
  onCreateProgram,
  onRenameProgram,
  onDeleteProgram,
  onCreate,
  onDelete,
  onEdit,
  onStart,
  onCreateFolder,
  onDeleteFolder,
  onToggleFolderStatsExcluded = () => {},
  onMovePlan,
  onReorderFolders = () => {},
  logs = [],
}) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [movingPlan, setMovingPlan] = useState(null);
  // Kept outside the component so switching tabs (which unmounts this view)
  // does not throw the open/closed state away and pop every folder open again.
  const [collapsedFolders, setCollapsedFolders] = useState(rememberedCollapsedFolders);
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [renamingProgram, setRenamingProgram] = useState(false);
  const [renameProgramName, setRenameProgramName] = useState("");
  const [folderMenuId, setFolderMenuId] = useState(null);
  const [folderMenuUp, setFolderMenuUp] = useState(false);
  const folderMenuRef = useMenuFlip(folderMenuId, setFolderMenuUp);
  useEffect(() => {
    if (!folderMenuId) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".item-menu-wrap")) setFolderMenuId(null);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [folderMenuId]);
  const toggleFolderCollapsed = (id) =>
    setCollapsedFolders((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      rememberedCollapsedFolders = next;
      saveJSON("collapsed-folders", next);
      return next;
    });

  const activeProgram = programs.find((p) => p.id === activeProgramId) || null;

  // Close the program switcher when tapping anywhere outside of it.
  useEffect(() => {
    if (!programMenuOpen) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".program-switcher")) setProgramMenuOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [programMenuOpen]);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolder({ id: uid(), name: trimmed, color: newFolderColor });
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setCreatingFolder(false);
  };

  const handleCreateProgram = () => {
    const trimmed = newProgramName.trim();
    if (!trimmed) return;
    onCreateProgram(trimmed);
    setNewProgramName("");
    setCreatingProgram(false);
  };

  const handleRenameProgram = () => {
    const trimmed = renameProgramName.trim();
    if (!trimmed || !activeProgramId) return;
    onRenameProgram(activeProgramId, trimmed);
    setRenamingProgram(false);
  };

  // Only folders belonging to the currently selected program are shown, and
  // a plan only counts as "in" a folder of this program.
  const programFolders = folders.filter((f) => f.programId === activeProgramId);
  // Folders can be reordered by press-and-drag, same feel as the exercises
  // in the plan builder. Only the folders of the active program move; the
  // rest of the list keeps its order.
  const {
    draggingId: draggingFolderId,
    itemRefs: folderRefs,
    dragHandleProps: folderDragProps,
  } = useDragReorder({
    items: programFolders,
    getId: (f) => f.id,
    // The hook hands over the already reordered list, not two indices.
    onReorder: (reordered) => {
      // Write the new order back into the positions the program's folders
      // occupy in the full list, so folders of other programs stay put.
      const positions = [];
      folders.forEach((f, i) => { if (f.programId === activeProgramId) positions.push(i); });
      const next = [...folders];
      positions.forEach((pos, i) => { next[pos] = reordered[i]; });
      onReorderFolders(next);
    },
  });
  const programFolderIds = programFolders.map((f) => f.id);
  const customPlans = plans;
  // A plan with no folder still belongs to exactly one program, otherwise
  // the "Ohne Ordner" section would show the same plans in every program.
  // Plans from before programs existed have no programId and are shown in
  // the first program so they never become invisible.
  const unassignedPlans = customPlans.filter((p) => {
    const hasValidFolder = p.folderId && folders.some((f) => f.id === p.folderId);
    if (hasValidFolder) return false;
    if (!p.programId) return programs[0]?.id === activeProgramId;
    return p.programId === activeProgramId;
  });

  // Most recent workout per plan, so each card can show how long ago it was.
  const lastDoneByPlan = useMemo(() => {
    const map = {};
    (logs || []).forEach((l) => {
      const key = l.planId || l.planName;
      if (!key) return;
      if (!map[key] || new Date(l.date) > new Date(map[key])) map[key] = l.date;
    });
    return map;
  }, [logs]);

  const renderPlanCard = (plan) => (
    <PlanCard
      key={plan.id}
      plan={plan}
      lastDone={lastDoneByPlan[plan.id] || lastDoneByPlan[plan.name]}
      exBy={exBy}
      onDelete={onDelete}
      onEdit={onEdit}
      onStart={onStart}
      onLongPress={setMovingPlan}
    />
  );

  return (
    <div>
      <div className="program-switcher">
        <button
          className="program-trigger"
          onClick={() => setProgramMenuOpen((s) => !s)}
        >
          <span className="program-trigger-label">
            {activeProgram ? activeProgram.name : "Kein Programm"}
          </span>
          <ChevronDown
            size={16}
            style={{
              transition: "transform 150ms ease",
              transform: programMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          />
        </button>
        {programMenuOpen && (
          <div className="program-menu">
            {programs.map((pr) => (
              <button
                key={pr.id}
                className={`program-menu-item ${pr.id === activeProgramId ? "active" : ""}`}
                onClick={() => {
                  onSelectProgram(pr.id);
                  setProgramMenuOpen(false);
                  setRenamingProgram(false);
                  setCreatingProgram(false);
                }}
              >
                {pr.name}
                <span className="tag" style={{ marginLeft: "auto" }}>
                  {folders.filter((f) => f.programId === pr.id).length}
                </span>
              </button>
            ))}
            <div className="program-menu-divider" />
            <button
              className="program-menu-item"
              onClick={() => {
                setProgramMenuOpen(false);
                // Reuses the exact same start flow as a real plan (gym
                // picker included) - just with an empty exercise list.
                // Exercises get added afterwards via "+ Übung hinzufügen",
                // already there in the live logging screen.
                onStart({ id: null, name: "Freies Training", items: [] });
              }}
            >
              <Play size={14} /> Training ohne Plan starten
            </button>
            {/* Gyms, Atemübungen, Sicherung und der Hell/Dunkel-Umschalter
                standen früher hier mit drin. Sie gehören nicht zu einem
                Programm, sondern zur ganzen App - und stehen deshalb jetzt im
                Zahnrad links oben auf der Startseite. Hier bleibt, was mit
                Plänen und Programmen zu tun hat, plus das freie Training. */}
            <div className="program-menu-divider" />
            <button
              className="program-menu-item"
              onClick={() => {
                setCreatingProgram(true);
                setRenamingProgram(false);
                setProgramMenuOpen(false);
              }}
            >
              <Plus size={14} /> Neues Programm
            </button>
            {activeProgram && (
              <>
                <button
                  className="program-menu-item"
                  onClick={() => {
                    setRenameProgramName(activeProgram.name);
                    setRenamingProgram(true);
                    setCreatingProgram(false);
                    setProgramMenuOpen(false);
                  }}
                >
                  <Pencil size={14} /> Umbenennen
                </button>
                <button
                  className="program-menu-item danger"
                  onClick={() => {
                    setProgramMenuOpen(false);
                    onDeleteProgram(activeProgram.id);
                  }}
                >
                  <Trash2 size={14} /> Programm löschen
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {creatingProgram && (
        <div className="card">
          <label className="field-label">Name des Programms</label>
          <input
            type="text"
            placeholder="z. B. Hypertrophie"
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              className="btn btn-primary btn-block btn-sm"
              disabled={!newProgramName.trim()}
              onClick={handleCreateProgram}
            >
              <Save size={14} /> Erstellen
            </button>
            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => { setCreatingProgram(false); setNewProgramName(""); }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {renamingProgram && (
        <div className="card">
          <label className="field-label">Programm umbenennen</label>
          <input
            type="text"
            value={renameProgramName}
            onChange={(e) => setRenameProgramName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              className="btn btn-primary btn-block btn-sm"
              disabled={!renameProgramName.trim()}
              onClick={handleRenameProgram}
            >
              <Save size={14} /> Speichern
            </button>
            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => setRenamingProgram(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={onCreate}
        >
          <Plus size={15} /> Workout
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1 }}
          onClick={() => setCreatingFolder((s) => !s)}
        >
          <Plus size={15} /> Ordner
        </button>
      </div>

      {creatingFolder && (
        <Modal title="Neuer Ordner" onClose={() => setCreatingFolder(false)}>
          <label className="field-label">Ordnername</label>
          <input
            type="text"
            autoFocus
            placeholder="z. B. Push/Pull/Legs"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) handleCreateFolder(); }}
          />
          <label className="field-label" style={{ marginTop: 10 }}>Farbe</label>
          <div className="color-swatch-grid" style={{ marginTop: 6 }}>
            {FOLDER_COLORS.map((c) => (
              <span
                key={c}
                className={`color-swatch ${newFolderColor === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setNewFolderColor(c)}
              />
            ))}
          </div>
          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 12 }}
            disabled={!newFolderName.trim()}
            onClick={handleCreateFolder}
          >
            <Save size={14} /> Ordner erstellen
          </button>
        </Modal>
      )}

      <div style={{ height: 14 }} />

      {programFolders.length === 0 && (
        <div className="empty-state">
          Noch keine Ordner in diesem Programm. Erstelle z. B. „Push“, „Pull“ oder „Beine“.
        </div>
      )}

      {programFolders.map((f) => {
        const folderPlans = customPlans.filter((p) => p.folderId === f.id);
        const collapsed = !!collapsedFolders[f.id];
        return (
          <div
            style={{ marginBottom: 18 }}
            key={f.id}
            ref={(el) => { folderRefs.current[f.id] = el; }}
            className={draggingFolderId === f.id ? "is-dragging" : ""}
          >
            <div
              className="folder-header"
              style={{ cursor: "pointer" }}
              onClick={() => toggleFolderCollapsed(f.id)}
            >
              <span
                className="drag-handle folder-drag-handle"
                title="Gedrückt halten, um den Ordner zu verschieben"
                onClick={(e) => e.stopPropagation()}
                {...folderDragProps(f.id)}
              >
                <GripVertical size={15} />
              </span>
              <ChevronRight
                size={15}
                color="var(--text-dim)"
                style={{
                  transition: "transform 150ms ease",
                  transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
                }}
              />
              <span className="folder-dot" style={{ background: f.color }} />
              <span className="folder-header-title">{f.name}</span>
              {f.statsExcluded && (
                <span className="tag" title="Sätze aus diesem Ordner zählen nicht in „Sätze pro Muskelgruppe“ und „Belastung pro Muskelgruppe“">
                  ohne Statistik
                </span>
              )}
              <span className="tag" style={{ marginLeft: "auto" }}>{folderPlans.length}</span>
              <div
                className={`item-menu-wrap ${folderMenuUp && folderMenuId === f.id ? "drop-up" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    const opening = folderMenuId !== f.id;
                    setFolderMenuUp(opening ? shouldDropUp(e.target) : false);
                    setFolderMenuId(opening ? f.id : null);
                  }}
                  title="Weitere Optionen"
                >
                  <MoreVertical size={14} />
                </button>
                {folderMenuId === f.id && (
                  <div
                    ref={folderMenuRef}
                    className="program-menu"
                    style={{ top: "calc(100% + 4px)", right: 0, left: "auto" }}
                  >
                    <button
                      className="program-menu-item"
                      onClick={() => { onToggleFolderStatsExcluded(f.id); setFolderMenuId(null); }}
                    >
                      <TrendingUp size={14} />
                      {f.statsExcluded
                        ? "Wieder für Muskelgruppen-Statistik zählen"
                        : "Nicht für Muskelgruppen-Statistik zählen"}
                    </button>
                    <div className="program-menu-divider" />
                    <button
                      className="program-menu-item danger"
                      onClick={() => { setFolderMenuId(null); onDeleteFolder(f.id); }}
                    >
                      <Trash2 size={14} /> Ordner löschen
                    </button>
                  </div>
                )}
              </div>
            </div>
            {!collapsed && (
              folderPlans.length === 0 ? (
                <div className="empty-state" style={{ padding: "14px 0" }}>
                  Noch keine Pläne in diesem Ordner.
                </div>
              ) : (
                folderPlans.map(renderPlanCard)
              )
            )}
          </div>
        );
      })}

      <div style={{ marginBottom: 18 }}>
        <div className="folder-header">
          <span className="folder-dot" style={{ background: "var(--text-dim)" }} />
          <span className="folder-header-title">Ohne Ordner</span>
        </div>
        {unassignedPlans.length === 0 ? (
          <div className="empty-state" style={{ padding: "14px 0" }}>
            Keine Pläne ohne Ordner.
          </div>
        ) : (
          unassignedPlans.map(renderPlanCard)
        )}
      </div>

      {movingPlan && (
        <div className="move-overlay" onClick={() => setMovingPlan(null)}>
          <div className="move-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="move-sheet-title">"{movingPlan.name}" verschieben</div>
            {programFolders.length === 0 ? (
              <>
                <div className="empty-state" style={{ padding: "10px 0" }}>
                  Du hast noch keinen Ordner.
                </div>
                <button
                  className="btn btn-primary btn-block btn-sm"
                  onClick={() => {
                    setMovingPlan(null);
                    setCreatingFolder(true);
                  }}
                >
                  <Plus size={14} /> Ordner erstellen
                </button>
              </>
            ) : (
              <div className="move-sheet-options">
                <button
                  className={`move-option ${!movingPlan.folderId ? "active" : ""}`}
                  onClick={() => {
                    onMovePlan(movingPlan.id, null);
                    setMovingPlan(null);
                  }}
                >
                  <span className="folder-dot" style={{ background: "var(--text-dim)" }} />
                  Kein Ordner
                </button>
                {programFolders.map((f) => (
                  <button
                    key={f.id}
                    className={`move-option ${movingPlan.folderId === f.id ? "active" : ""}`}
                    onClick={() => {
                      onMovePlan(movingPlan.id, f.id);
                      setMovingPlan(null);
                    }}
                  >
                    <span className="folder-dot" style={{ background: f.color }} />
                    {f.name}
                  </button>
                ))}
              </div>
            )}
            <button
              className="btn btn-ghost btn-block btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => setMovingPlan(null)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log view (active session)
// ---------------------------------------------------------------------------

function LogView({
  session,
  plans,
  logs,
  bands = [],
  exBy,
  exercises,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  onSetExerciseSubgroups,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  timeBasedExercises,
  gymIndependentExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onToggleGymIndependent,
  onStartFromPlan,
  onUpdateSession,
  onFinish,
  onDiscard,
  onRequestConfirm,
  gyms = [],
  restEndsAt = 0,
  onSetRestEndsAt,
  soundOn = true,
  onSetSoundOn,
  onAddCustom,
}) {
  const sessionGymName = session
    ? gyms.find((g) => g.id === session.gymId)?.name || null
    : null;
  // All hooks must run on every render regardless of whether a session is
  // active, so they live here, above the early return below.
  const [restLeft, setRestLeft] = useState(() =>
    Math.max(0, Math.round((restEndsAt - Date.now()) / 1000))
  );
  // The end timestamp itself is owned by the app root and persisted, so the
  // rest survives a tab switch and a reload. Only the displayed seconds are
  // local, and they are always recomputed from that timestamp - counting
  // down second by second went wrong as soon as the screen switched off,
  // because iOS throttles timers in the background.
  const restBeepedRef = useRef(restEndsAt <= Date.now());
  // Tracks whether the rest-end tone is already sitting on the audio clock,
  // so the countdown does not play a second one on top of it. Initialised
  // from the module-level handle, because the scheduled tone lives in the
  // audio graph and outlives this component being unmounted by a tab switch.
  const restBeepScheduledRef = useRef(hasPendingRestBeep());
  const [openNotes, setOpenNotes] = useState({});
  const [openRestPicker, setOpenRestPicker] = useState({});
  // Offenes Satzart-Menue: { entryId, idx } oder null.
  const [openSetKind, setOpenSetKind] = useState(null);
  // Für welchen Satz gerade ein Band gewählt wird ({ entryId, idx }).
  const [bandPickFor, setBandPickFor] = useState(null);
  const [setKindMenuUp, setSetKindMenuUp] = useState(false);
  const setKindMenuRef = useMenuFlip(openSetKind, setSetKindMenuUp);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;
  const [addingExercise, setAddingExercise] = useState(false);
  // Creating an exercise mid-workout: the picker only ever offered what
  // already existed, so noticing a missing exercise meant leaving the
  // running session to go and create it first.
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [entryMenuUp, setEntryMenuUp] = useState(false);
  const [prInfo, setPrInfo] = useState(null);
  const [headerOutOfView, setHeaderOutOfView] = useState(false);
  const sessionHeaderRef = useRef(null);

  useEffect(() => {
    const el = sessionHeaderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([e]) => setHeaderOutOfView(!e.isIntersecting),
      { root: document.querySelector(".content"), threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [session?.id]);
  // The automatic (HIT/interval) run. Times are stored as an absolute
  // end timestamp rather than a countdown, so a throttled or backgrounded
  // tab still resumes with the correct remaining time.
  // {phase: 'work'|'rest'|'waiting', entryId, exerciseId, setIdx, endsAt}
  // entryId ist die Identitaet (welcher Platz im Zirkel), exerciseId steht
  // nur fuer Name und Satzlaenge daneben.
  const [autoRun, setAutoRun] = useState(null);
  const [autoLeft, setAutoLeft] = useState(0);
  // React state updates are async, but the ticker below runs every 200ms.
  // Without a synchronous mirror, a tick that fires between "Stopp" and the
  // re-render would still start the next set.
  const autoRunRef = useRef(null);
  const applyAutoRun = (next) => {
    autoRunRef.current = next;
    setAutoRun(next);
  };
  const wakeLockRef = useRef(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState(null);
  const [addExerciseQuery, setAddExerciseQuery] = useState("");
  // Filters for the mid-workout exercise picker, mirroring the ones in the
  // Exercises tab so finding a substitute doesn't mean scrolling ~150 rows.
  const [addGroup, setAddGroup] = useState("alle");
  const [addSubgroup, setAddSubgroup] = useState("alle");
  const [addEquipment, setAddEquipment] = useState("alle");
  // Exercises can be reordered mid-workout the same way as in the builder.
  // This runs above the "no active session" early return, so it must cope
  // with session being null rather than reaching into it.
  const {
    draggingId: draggingEntryId,
    itemRefs: entryRefs,
    dragHandleProps: entryDragProps,
  } = useDragReorder({
    items: session ? session.entries : EMPTY_LIST,
    getId: (e) => e.id,
    onReorder: (entries) => {
      if (!session) return;
      onUpdateSession({ ...session, entries });
    },
  });
  const resetAddFilters = () => {
    setAddExerciseQuery("");
    setAddGroup("alle");
    setAddSubgroup("alle");
    setAddEquipment("alle");
  };
  const addPickerMatches = (e) =>
    (addGroup === "alle" || e.group === addGroup) &&
    (addSubgroup === "alle" ||
      exerciseHasSubgroup(e, exerciseSubgroupOverrides, addSubgroup)) &&
    (addEquipment === "alle" ||
      getExerciseEquipment(e, exerciseEquipmentOverrides) === addEquipment) &&
    e.name.toLowerCase().includes(addExerciseQuery.toLowerCase());
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [openEntryMenu, setOpenEntryMenu] = useState(null);
  const entryMenuRef = useMenuFlip(openEntryMenu, setEntryMenuUp);

  useEffect(() => {
    if (!openEntryMenu) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".entry-menu-wrap")) setOpenEntryMenu(null);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [openEntryMenu]);

  // The inline rest-time picker used to have no way to close at all - picking
  // a preset closes it directly (see setEntryRestDuration below), and this
  // is the safety net for tapping away without picking anything.
  useEffect(() => {
    const anyOpen = Object.values(openRestPicker).some(Boolean);
    if (!anyOpen) return;
    // mousedown, not click: the trigger button (the "Pausenzeit" menu item)
    // lives outside .rest-picker-inline, since that row doesn't exist until
    // after this same click opens it. Listening for "click" meant the still-
    // bubbling click that opened the picker also reached this listener and
    // closed it again immediately. "mousedown" fires and finishes before
    // "click" does, so a listener added in reaction to a click can never
    // catch that same click's mousedown - only a genuinely later one.
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".rest-picker-inline")) setOpenRestPicker({});
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openRestPicker]);

  // Satzart-Menue: schliesst beim Tippen irgendwo daneben. Der oeffnende
  // Klick trifft die Nummer selbst, kann also nicht sein eigenes Menue
  // wieder zuklappen.
  useEffect(() => {
    if (!openSetKind) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".set-kind") && !e.target.closest?.(".set-kind-menu")) {
        setOpenSetKind(null);
      }
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [openSetKind]);

  useEffect(() => {
    if (!settingsMenuOpen) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".session-settings")) setSettingsMenuOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [settingsMenuOpen]);

  useEffect(() => {
    if (restEndsAt <= Date.now()) {
      setRestLeft(0);
      return;
    }
    const tick = () => {
      // Cheap no-op once the clock is already running - tried on every tick
      // so a bell that is still due gets the earliest possible chance to
      // fire once the phone comes back from a screen-off suspension,
      // instead of waiting until the countdown itself reaches zero.
      resumeAudioIfSuspended();
      const left = Math.max(0, Math.round((restEndsAt - Date.now()) / 1000));
      setRestLeft(left);
      if (left === 0 && !restBeepedRef.current) {
        restBeepedRef.current = true;
        const wasScheduled = restBeepScheduledRef.current;
        restBeepScheduledRef.current = false;
        if (soundOn) {
          if (!wasScheduled) {
            // Nothing was ever put on the clock (sound was off, or no
            // audio context existed yet) - play it directly.
            playBell();
          } else {
            // Scheduling succeeded at the time, but that only proves the
            // call did not throw - not that the bell actually rang. It
            // normally finishes right about now; if iOS suspended the
            // clock while the screen was off, it is still sitting there
            // unplayed. Give it a brief moment to complete on its own,
            // then treat a bell still pending as stuck and play a fresh
            // one instead of trusting a stale "scheduling worked" flag.
            setTimeout(() => {
              if (hasPendingRestBeep()) {
                cancelRestBeep();
                playBell();
              }
            }, 500);
          }
        }
        // Backup signal for a muted phone. Vibration needs JS to be
        // running, so it only lands with the app in the foreground - which
        // is exactly the case the scheduled tone handles worst.
        if (navigator.vibrate) {
          try { navigator.vibrate([120, 80, 120]); } catch (_) {}
        }
      }
    };
    tick();
    const id = setInterval(tick, 500);
    // Coming back from a locked screen: recalculate immediately instead of
    // waiting for the next tick.
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [restEndsAt, soundOn]);

  useEffect(() => {
    if (!session || !session.startedAt) return;
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.startedAt]);

  // Supersets: entries flagged with supersetWithNext chain together with
  // whichever entries follow them that carry the same flag, so a group can
  // be 2 or more exercises. Used to render linked exercises as one visual
  // block and to hold off starting the rest timer until the last exercise
  // in the group is done, not after every individual one.
  const supersetGroupInfo = useMemo(() => {
    const info = {};
    const entries = session?.entries || [];
    let i = 0;
    while (i < entries.length) {
      let j = i;
      while (j < entries.length - 1 && entries[j].supersetWithNext) j++;
      const groupSize = j - i + 1;
      for (let k = i; k <= j; k++) {
        info[entries[k].id] = { groupSize, isFirst: k === i, isLast: k === j };
      }
      i = j + 1;
    }
    return info;
  }, [session?.entries]);

  // --- Automatic run -------------------------------------------------------
  const entryAutoRuns = (entry) => {
    if (!entry) return false;
    if (entry.autoRun === true) return true;
    if (entry.autoRun === false) return false;
    return !!session?.autoRun;
  };

  // Finds the next set to run. Circuit order walks across all slots; inside
  // a superset group the linked exercises take turns (set 1 of A, set 1 of B,
  // then set 2 of A); everything else is worked through exercise by exercise.
  const findNextSet = (fromEntryId, fromSetIdx) => {
    const entries = session?.entries || [];
    const idx = entries.findIndex((e) => e.id === fromEntryId);
    if (idx === -1) return null;

    // Circuit: set 1 of every exercise, then set 2 of every exercise. This
    // is what a HIT workout actually looks like, and it needs no linking.
    // Dieselbe Uebung darf mehrfach in der Liste stehen - der Zirkel laeuft
    // ueber die Plaetze, nicht ueber die Uebungen, deshalb ergibt sich
    // A -> B -> A -> C von selbst aus der Reihenfolge.
    if ((session?.autoOrder || "circuit") === "circuit") {
      for (let k = idx + 1; k < entries.length; k++) {
        if (entries[k].sets[fromSetIdx]) return { entryId: entries[k].id, setIdx: fromSetIdx };
      }
      for (let k = 0; k < entries.length; k++) {
        if (entries[k].sets[fromSetIdx + 1]) return { entryId: entries[k].id, setIdx: fromSetIdx + 1 };
      }
      return null;
    }

    // Superset: die verknuepften Uebungen wechseln sich ab - Satz 1 von A,
    // Satz 1 von B, dann Satz 2 von A. Ohne diesen Zweig liefe die Automatik
    // erst A komplett durch und danach B, also genau kein Superset.
    let groupStart = idx;
    while (groupStart > 0 && entries[groupStart - 1]?.supersetWithNext) groupStart -= 1;
    let groupEnd = idx;
    while (groupEnd < entries.length - 1 && entries[groupEnd]?.supersetWithNext) groupEnd += 1;
    if (groupEnd > groupStart) {
      // Rest der Runde innerhalb der Gruppe.
      for (let k = idx + 1; k <= groupEnd; k++) {
        if (entries[k].sets[fromSetIdx]) return { entryId: entries[k].id, setIdx: fromSetIdx };
      }
      // Runde voll - naechster Satz, wieder beim ersten Platz der Gruppe.
      for (let k = groupStart; k <= groupEnd; k++) {
        if (entries[k].sets[fromSetIdx + 1]) return { entryId: entries[k].id, setIdx: fromSetIdx + 1 };
      }
      // Gruppe fertig - weiter hinter ihr.
      for (let k = groupEnd + 1; k < entries.length; k++) {
        if (entries[k].sets[0]) return { entryId: entries[k].id, setIdx: 0 };
      }
      return null;
    }

    // Classic: finish an exercise before moving on.
    const current = entries[idx];
    if (current.sets[fromSetIdx + 1]) return { entryId: current.id, setIdx: fromSetIdx + 1 };
    for (let k = idx + 1; k < entries.length; k++) {
      if (entries[k].sets[0]) return { entryId: entries[k].id, setIdx: 0 };
    }
    return null;
  };

  // In automatic mode the set length comes from the workout (or the
  // exercise, if it overrides it) - not from the reps/duration fields, so a
  // rep-based exercise runs on time too without being edited first.
  const setDurationFor = (entry) => {
    if (entry?.autoSeconds != null && toNum(entry.autoSeconds) > 0) return toNum(entry.autoSeconds);
    const fromSession = toNum(session?.autoSetSeconds);
    if (fromSession > 0) return fromSession;
    const fromSet = toNum(entry?.sets?.[0]?.duration);
    return fromSet > 0 ? fromSet : 30;
  };

  // Im Zirkel ist "Satz 3" in Wahrheit "Runde 3": Satz 1 aller Uebungen ist
  // Runde 1. Die Rundenzahl ist deshalb nichts Eigenes, was gespeichert
  // werden muesste - sie ergibt sich aus der laengsten Uebung der Liste.
  // 0 heisst: kein Zirkel, also von Saetzen statt von Runden sprechen.
  const roundTotal =
    (session?.autoOrder || "circuit") === "circuit"
      ? (session?.entries || []).reduce((m, e) => Math.max(m, entrySets(e).length), 0)
      : 0;

  // True when the set that just finished closes a round (circuit) or an
  // exercise (classic order) - that is when the longer rest applies.
  const finishesRound = (entryId, setIdx) => {
    const entries = session?.entries || [];
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return false;
    if ((session?.autoOrder || "circuit") === "circuit") return idx === entries.length - 1;
    return setIdx >= (entries[idx]?.sets?.length || 1) - 1;
  };

  // Folgt auf diesen Satz direkt ein Dropsatz? Dann faellt die Pause weg.
  const nextSetIsDrop = (entryId, setIdx) => {
    const sets = (session?.entries || []).find((e) => e.id === entryId)?.sets;
    return !!(Array.isArray(sets) && sets[setIdx + 1]?.dropset);
  };

  const restAfter = (entryId, setIdx) => {
    if (nextSetIsDrop(entryId, setIdx)) return 0;
    // Innerhalb eines Supersets wird ohne Pause zur naechsten Uebung
    // gewechselt - dieselbe Regel, nach der auch das Abhaken von Hand die
    // Pausenuhr erst nach dem letzten Platz der Gruppe startet.
    if ((session?.autoOrder || "circuit") !== "circuit"
        && supersetGroupInfo[entryId]
        && supersetGroupInfo[entryId].groupSize > 1
        && !supersetGroupInfo[entryId].isLast) {
      return 0;
    }
    const roundRest = toNum(session?.roundRestSeconds);
    if (finishesRound(entryId, setIdx)) return Math.max(0, roundRest);
    return Math.max(0, getRestDurationFor(entryId));
  };

  const startAutoAt = (entryId, setIdx, force = false) => {
    if (!force && !autoRunRef.current) return;
    const entry = (session?.entries || []).find((e) => e.id === entryId);
    if (!entry) { applyAutoRun(null); return; }
    // Only exercises explicitly switched to reps wait for a manual tick;
    // everything else runs on the workout's set length.
    if (!entryAutoRuns(entry)) {
      applyAutoRun({ phase: "waiting", entryId, exerciseId: entry.exerciseId, setIdx, endsAt: null });
      return;
    }
    const seconds = setDurationFor(entry);
    applyAutoRun({
      phase: "work",
      entryId,
      exerciseId: entry.exerciseId,
      setIdx,
      endsAt: Date.now() + seconds * 1000,
    });
  };

  const stopAuto = () => {
    applyAutoRun(null);
    setAutoLeft(0);
    releaseAudio();
  };

  // Friert die laufende Phase an genau der Restzeit ein, statt sie wie
  // "Stopp" zu verwerfen - man macht an derselben Stelle weiter, nicht am
  // Anfang des nächsten unerledigten Satzes.
  const pauseAuto = () => {
    if (!autoRun || !autoRun.endsAt || autoRun.paused) return;
    const left = Math.max(0, autoRun.endsAt - Date.now());
    setAutoLeft(left);
    applyAutoRun({ ...autoRun, paused: true, pausedLeftMs: left, endsAt: null });
  };
  const resumeAuto = () => {
    if (!autoRun || !autoRun.paused) return;
    applyAutoRun({
      ...autoRun,
      paused: false,
      endsAt: Date.now() + (autoRun.pausedLeftMs || 0),
      pausedLeftMs: undefined,
    });
  };

  const anyAutoRun = (session?.entries || []).some((e) => entryAutoRuns(e));
  const firstUnfinishedSet = () => {
    for (const entry of session?.entries || []) {
      const idx = entry.sets.findIndex((set) => !set.done);
      if (idx !== -1) return { entryId: entry.id, setIdx: idx };
    }
    return null;
  };

  // Ticks often enough to look smooth, but the remaining time always comes
  // from the stored end timestamp so a throttled tab cannot drift.
  useEffect(() => {
    if (!autoRun || !autoRun.endsAt) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled || !autoRunRef.current) return;
      const left = Math.max(0, autoRun.endsAt - Date.now());
      setAutoLeft(left);
      if (left > 0) return;

      const entries = session?.entries || [];
      const entry = entries.find((e) => e.id === autoRun.entryId);
      if (!entry) { stopAuto(); return; }

      if (autoRun.phase === "work") {
        const restSeconds = restAfter(autoRun.entryId, autoRun.setIdx);
        // One beep when a set ends. If a rest follows, its end gets its own
        // beep; without a rest that single beep is all there is.
        // Deliberately a single tone: with no rest configured this is the
        // only signal, and two short beeps would read as two events.
        playBeep({ frequency: 880, duration: 0.32 });
        if (!entry.sets[autoRun.setIdx]?.done) {
          toggleSetDoneSilently(autoRun.entryId, autoRun.setIdx);
        }
        if (restSeconds > 0) {
          applyAutoRun({
            ...autoRun,
            phase: "rest",
            isRoundRest: finishesRound(autoRun.entryId, autoRun.setIdx),
            endsAt: Date.now() + restSeconds * 1000,
          });
        } else {
          const next = findNextSet(autoRun.entryId, autoRun.setIdx);
          if (next) startAutoAt(next.entryId, next.setIdx);
          else { stopAuto(); playBeep({ frequency: 660, duration: 0.4 }); }
        }
        return;
      }

      if (autoRun.phase === "rest") {
        playBell();
        const next = findNextSet(autoRun.entryId, autoRun.setIdx);
        if (next) startAutoAt(next.entryId, next.setIdx);
        else { stopAuto(); playBeep({ frequency: 660, duration: 0.4 }); }
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => { cancelled = true; clearInterval(id); };
  }, [autoRun, session]);

  // Keeps the screen awake during an automatic run - a locked screen stops
  // iOS from playing the beeps.
  useEffect(() => {
    if (autoRun) {
      if (!wakeLockRef.current && navigator.wakeLock?.request) {
        navigator.wakeLock.request("screen")
          .then((lock) => { wakeLockRef.current = lock; })
          .catch(() => { /* not granted - the run still works, just dimmer */ });
      }
      return;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release?.().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [autoRun]);

  // Freigeben, wenn die Ansicht verschwindet. Der Zweig oben greift dafuer
  // nicht: beim Abbau ist autoRun noch gesetzt, die Sperre bliebe also
  // bestehen und der Bildschirm dauerhaft an.
  useEffect(() => () => {
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // Endet das Training (beendet oder verworfen), waehrend die Automatik
  // laeuft, hat sie nichts mehr, worauf sie zeigen koennte.
  useEffect(() => {
    if (!session && autoRunRef.current) stopAuto();
  }, [session]);

  if (!session) {
    return (
      <div>
        <div className="empty-state">
          <ClipboardList size={26} />
          <p>Kein aktives Training. Wähle einen Plan, um zu starten.</p>
        </div>
        {plans.map((plan) => (
          <div className="card" key={plan.id}>
            <div className="plan-title">{plan.name}</div>
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 8 }}
              onClick={() => onStartFromPlan(plan)}
            >
              <Play size={15} /> Starten
            </button>
          </div>
        ))}
      </div>
    );
  }

  // 0 bedeutet "keine Pause" und ist ein gueltiger Wert, deshalb ?? statt ||.
  const restDuration = session.restSeconds ?? 90;

  // Rest can be overridden per exercise (entry.restSeconds); exercises
  // without their own setting fall back to the session-wide default above.
  const getRestDurationFor = (entryId) => {
    const entry = session.entries.find((e) => e.id === entryId);
    return entry && entry.restSeconds != null ? entry.restSeconds : restDuration;
  };
  // Schedules the rest-end tone on the audio clock right away instead of
  // firing it from a timer when the rest is over. A JS timer stops the moment
  // the screen goes off or the app is backgrounded, so a timer-driven tone
  // simply never happened - which is why the beep kept going missing.
  const armRestBeep = (seconds) => {
    cancelRestBeep();
    restBeepScheduledRef.current = false;
    if (!soundOn || seconds <= 0) return;
    // The tap that starts the rest is the gesture iOS requires before any
    // sound may be produced, so the context is opened here.
    if (!unlockAudio()) return;
    restBeepScheduledRef.current = scheduleRestBeep(seconds);
  };

  const startRest = (entryId) => {
    // Bei 0 Sekunden gibt es keine Pause - der Timer bleibt einfach aus.
    const sec = entryId ? getRestDurationFor(entryId) : restDuration;
    restBeepedRef.current = sec <= 0;
    armRestBeep(sec);
    setRestLeft(sec > 0 ? sec : 0);
    onSetRestEndsAt?.(sec > 0 ? Date.now() + sec * 1000 : 0);
  };
  const stopRest = () => {
    cancelRestBeep();
    restBeepScheduledRef.current = false;
    restBeepedRef.current = true;
    setRestLeft(0);
    onSetRestEndsAt?.(0);
  };
  const addRestTime = (delta) => {
    const nextEnd = Math.max(Date.now(), restEndsAt) + delta * 1000;
    const left = Math.max(0, Math.round((nextEnd - Date.now()) / 1000));
    if (delta > 0) restBeepedRef.current = false;
    // The tone sits at a fixed point on the audio clock, so shifting the rest
    // means replacing it rather than moving it.
    armRestBeep(left);
    setRestLeft(left);
    onSetRestEndsAt?.(left > 0 ? nextEnd : 0);
  };

  const addSet = (entryId, warmup = false) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  reps: warmup ? "" : e.targetReps || 10,
                  weight: warmup ? "" : e.targetWeight || 0,
                  duration: warmup ? "" : e.targetDuration || 0,
                  done: false,
                  warmup,
                },
              ],
            }
          : e
      ),
    });
  };
  const updateSet = (entryId, idx, field, value) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
            }
          : e
      ),
    });
  };
  // Mehrere Felder eines Satzes auf einmal - die Band-Auswahl setzt Kennung,
  // Name und Gewicht zusammen, und drei einzelne Aufrufe wuerden auf dem
  // jeweils veralteten Stand aufsetzen.
  // Ein Band ab diesem Satz setzen: der angetippte Satz immer, die folgenden
  // nur, solange dort noch kein Band steht und sie nicht abgehakt sind.
  const applyBandFrom = (entryId, idx, band) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s, i) => {
                if (i < idx) return s;
                if (i > idx && (s.bandId || s.done)) return s;
                return { ...s, bandId: band.id, bandName: band.name, weight: band.kg };
              }),
            }
          : e
      ),
    });
  };
  const updateSetFields = (entryId, idx, patch) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? { ...e, sets: e.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
          : e
      ),
    });
  };
  // Used by the automatic run: marks a set as done without kicking off the
  // normal rest timer, because the automatic run manages the rest itself.
  const toggleSetDoneSilently = (entryId, idx) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? { ...e, sets: e.sets.map((set, i) => (i === idx ? { ...set, done: true } : set)) }
          : e
      ),
    });
  };
  // Inputs store exactly what the user typed (see updateSet above) so a
  // field can be cleared and freely retyped instead of the digit typed
  // right after clearing getting stuck after a leftover "0". Once the
  // field is left, normalize it to a clean, valid number.
  const sanitizeSetField = (entryId, idx, field) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s, i) => {
                if (i !== idx) return s;
                const n = Math.max(0, toNum(s[field]));
                // Keep the comma the user typed instead of rewriting it to a
                // dot; every calculation goes through toNum() anyway.
                return { ...s, [field]: field === "weight" ? fmtDecimal(n) : n };
              }),
            }
          : e
      ),
    });
  };
  const removeSet = (entryId, idx) => {
    setOpenSetKind(null);
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? { ...e, sets: e.sets.filter((_, i) => i !== idx) }
          : e
      ),
    });
  };
  const addExerciseToSession = (exerciseId) => {
    onUpdateSession({
      ...session,
      entries: [
        ...session.entries,
        {
          id: uid(),
          exerciseId,
          targetSets: 3,
          targetReps: 10,
          targetWeight: 0,
          targetUseTime: false,
          targetDuration: 0,
          sets: [],
          notes: "",
        },
      ],
    });
    setAddingExercise(false);
    setCreatingExercise(false);
    resetAddFilters();
  };
  const removeExerciseFromSession = (entryId) => {
    onUpdateSession({
      ...session,
      entries: session.entries.filter((e) => e.id !== entryId),
    });
  };
  // Swaps an exercise for a different one mid-workout. The target values
  // (planned sets/reps/weight) carry over since they describe the slot in
  // the workout, but the sets actually logged so far are cleared — they
  // were performed on the old exercise and would otherwise misattribute
  // that weight/reps to the new exercise's history and stats.
  const replaceExerciseInSession = (entryId, newExerciseId) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? { ...e, exerciseId: newExerciseId, sets: [], notes: "" }
          : e
      ),
    });
    setReplacingExerciseId(null);
    setAddExerciseQuery("");
  };
  const toggleSetDone = (entryId, idx) => {
    let nowDone = false;
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s, i) => {
                if (i !== idx) return s;
                nowDone = !s.done;
                return { ...s, done: nowDone };
              }),
            }
          : e
      ),
    });
    // The automatic run parks on rep-based exercises; checking the set off
    // by hand is the signal to carry on.
    if (autoRun && autoRun.phase === "waiting" && autoRun.entryId === entryId
        && autoRun.setIdx === idx && nowDone) {
      playBeep({ frequency: 880, duration: 0.22 });
      const restSeconds = restAfter(entryId, idx);
      if (restSeconds > 0) {
        applyAutoRun({
          ...autoRun,
          phase: "rest",
          isRoundRest: finishesRound(entryId, idx),
          endsAt: Date.now() + restSeconds * 1000,
        });
      } else {
        const next = findNextSet(entryId, idx);
        if (next) startAutoAt(next.entryId, next.setIdx);
        else stopAuto();
      }
      return;
    }
    // Inside a superset, sets are done back-to-back with no rest between
    // the linked exercises — the timer only starts once the last exercise
    // in the group has a set checked off.
    const isLastInGroup = supersetGroupInfo[entryId]?.isLast ?? true;
    // Vor einem Dropsatz gibt es keine Pause: das Gewicht wird sofort
    // reduziert und weitergemacht - genau das macht ihn zum Dropsatz.
    if (nowDone && isLastInGroup && !nextSetIsDrop(entryId, idx)) startRest(entryId);
  };
  const toggleEntryNotes = (entryId) => {
    setOpenNotes((s) => ({ ...s, [entryId]: !s[entryId] }));
  };
  const updateEntryNotes = (entryId, notes) => {
    const target = session.entries.find((e) => e.id === entryId);
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId ? { ...e, notes } : e
      ),
    });
    // Written to the exercise as well, so it survives this workout. The copy
    // in the session still goes into the log, which keeps the history of
    // what the note said on a given day.
    if (target) onUpdateExerciseNote?.(target.exerciseId, notes);
  };
  const setEntryRir = (entryId, rir) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        // Nochmal antippen nimmt die Angabe zurueck - eine falsch getippte
        // Zahl waere sonst nicht mehr korrigierbar.
        e.id === entryId ? { ...e, rir: e.rir === rir ? null : rir } : e
      ),
    });
  };
  const changeSetKind = (entryId, idx, kind, extra = null) => {
    setOpenSetKind(null);
    setSetKindMenuUp(false);
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === idx
                  ? {
                      ...s,
                      ...setKindFlags(kind),
                      // Die Schätzung gehört zum Eichsatz. Bleibt sie beim
                      // Umschalten liegen, taucht sie später unversehens
                      // wieder auf, sobald der Satz erneut einer wird.
                      ...(kind === "calibration" ? {} : { estimatedFailureReps: null }),
                      ...(extra || {}),
                    }
                  : s
              ),
            }
          : e
      ),
    });
  };

  // Ein Eichsatz braucht die Schätzung VOR dem Satz - hinterher wäre sie
  // keine Schätzung mehr, sondern eine Erinnerung an das Ergebnis. Deshalb
  // wird beim Umschalten erst gefragt und die Satzart erst danach gesetzt.
  const [calibrationPrompt, setCalibrationPrompt] = useState(null);
  const [calibrationGuess, setCalibrationGuess] = useState("");
  const askCalibration = (entryId, idx) => {
    setOpenSetKind(null);
    setSetKindMenuUp(false);
    setCalibrationGuess("");
    setCalibrationPrompt({ entryId, idx });
  };
  const confirmCalibration = () => {
    if (!calibrationPrompt) return;
    const guess = Math.round(toNum(calibrationGuess));
    if (!(guess > 0)) return;
    changeSetKind(calibrationPrompt.entryId, calibrationPrompt.idx, "calibration", {
      estimatedFailureReps: guess,
    });
    setCalibrationPrompt(null);
    setCalibrationGuess("");
  };

  const mm = String(Math.floor(restLeft / 60)).padStart(2, "0");
  const ss = String(restLeft % 60).padStart(2, "0");

  const setRestDuration = (sec) => {
    onUpdateSession({ ...session, restSeconds: sec });
  };
  const setEntryRestDuration = (entryId, sec) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.id === entryId ? { ...e, restSeconds: sec } : e
      ),
    });
  };

  const REST_PRESETS = [0, 30, 45, 60, 90, 120, 180];

  // In edit mode the clock stands still and shows the recorded duration,
  // so it is obvious that correcting values does not change how long the
  // workout took.
  const isEditing = session?.frozenDurationMinutes != null;
  const shownSeconds = isEditing ? session.frozenDurationMinutes * 60 : elapsedSec;
  const elapsedH = Math.floor(shownSeconds / 3600);
  const elapsedM = Math.floor((shownSeconds % 3600) / 60);
  const elapsedS = shownSeconds % 60;
  const elapsedLabel = elapsedH > 0
    ? `${elapsedH}:${String(elapsedM).padStart(2, "0")}:${String(elapsedS).padStart(2, "0")}`
    : `${elapsedM}:${String(elapsedS).padStart(2, "0")}`;

  return (
    <div>
      {restLeft > 0 && (
        <div className="rest-timer">
          <span className="rest-label">
            <Timer size={20} />
            {mm}:{ss}
          </span>
          <div className="rest-actions">
            <button className="rest-btn" onClick={() => addRestTime(-15)}>-15s</button>
            <button className="rest-btn" onClick={() => addRestTime(15)}>+15s</button>
            <button className="rest-btn" onClick={stopRest}>
              <SkipForward size={13} /> Überspringen
            </button>
          </div>
        </div>
      )}

      {/* Stays reachable while scrolling through a long workout, but only
          appears once the header with the same value has scrolled away -
          otherwise the time would be on screen twice. */}
      {headerOutOfView && !autoRun && (
        <div className="floating-timer">
          <Timer size={13} /> {elapsedLabel}
        </div>
      )}

      {autoRun && (
        <div className="auto-run-bar">
          <div className="auto-run-phase">
            {autoRun.paused
              ? "Pausiert"
              : autoRun.phase === "work"
              ? "Satz läuft"
              : autoRun.phase === "rest"
              ? autoRun.isRoundRest
                ? ((session.autoOrder || "circuit") === "circuit" ? "Rundenpause" : "Übungspause")
                : "Pause"
              : "Wartet auf dich"}
          </div>
          <div className="auto-run-time">
            {autoRun.phase === "waiting"
              ? "–"
              : `${Math.ceil(autoLeft / 1000)}s`}
          </div>
          <div className="auto-run-what">
            {exBy[autoRun.exerciseId]?.name || "Übung"} ·{" "}
            {roundTotal > 0
              ? `Runde ${Math.min(autoRun.setIdx + 1, roundTotal)} von ${roundTotal}`
              : `Satz ${autoRun.setIdx + 1}`}
            {autoRun.phase === "waiting" && " · abhaken zum Fortfahren"}
          </div>
          <div className="rest-actions" style={{ marginTop: 8 }}>
            {autoRun.phase !== "waiting" && !autoRun.paused && (
              <button
                className="rest-btn"
                onClick={() => applyAutoRun({ ...autoRun, endsAt: autoRun.endsAt + 15000 })}
              >
                +15s
              </button>
            )}
            {autoRun.phase !== "waiting" && (
              autoRun.paused ? (
                <button className="rest-btn" onClick={resumeAuto}>
                  <Play size={13} /> Fortsetzen
                </button>
              ) : (
                <button className="rest-btn" onClick={pauseAuto}>
                  <Pause size={13} /> Pause
                </button>
              )
            )}
            <button
              className="rest-btn"
              onClick={() => {
                const next = findNextSet(autoRun.entryId, autoRun.setIdx);
                if (next) startAutoAt(next.entryId, next.setIdx);
                else stopAuto();
              }}
            >
              <SkipForward size={13} /> Weiter
            </button>
            <button className="rest-btn" onClick={stopAuto}>Stopp</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="plan-title">{session.planName}</div>
            <span className="tag" style={{ marginTop: 6, display: "inline-block" }}>
              {fmtDate(session.date)}
            </span>
            {isEditing && (
              <span className="tag" style={{ marginTop: 6, marginLeft: 6, display: "inline-block" }}>
                Bearbeiten
              </span>
            )}
            {sessionGymName && (
              <span className="tag tag-equipment" style={{ marginTop: 6, marginLeft: 6, display: "inline-block" }}>
                {sessionGymName}
              </span>
            )}
          </div>
          <div className="session-settings" ref={sessionHeaderRef}>
            <span className="duration-badge">
              <Timer size={13} /> {elapsedLabel}
            </span>
            <button
              className={`btn-icon ${session.notes ? "has-note" : ""}`}
              onClick={() => setSettingsMenuOpen((s) => !s)}
              title="Trainings-Einstellungen & Notizen"
            >
              <MoreVertical size={16} />
            </button>
            {settingsMenuOpen && (
              <div className="session-settings-menu">
                <span className="plan-title">Standard-Pausenzeit</span>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-dim)" }}>
                  Gilt für alle Übungen ohne eigene Einstellung.
                </p>
                <div className="chip-row" style={{ marginTop: 10, marginBottom: 8 }}>
                  {REST_PRESETS.map((sec) => (
                    <span
                      key={sec}
                      className={`chip ${restDuration === sec ? "active" : ""}`}
                      onClick={() => setRestDuration(sec)}
                    >
                      {sec === 0 ? "Aus" : `${sec}s`}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Eigene Zeit (Sek.)</label>
                    <input
                      type="number"
                                inputMode="numeric"
                      min="0"
                      step="5"
                      value={restDuration}
                      onChange={(e) => setRestDuration(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  {restDuration > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => startRest()}>
                      <Timer size={14} /> Pause starten
                    </button>
                  )}
                </div>

                <button
                  className="modal-option"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    const next = !soundOn;
                    onSetSoundOn?.(next);
                    if (next) playBell();
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Timer size={15} /> Ton am Pausenende
                  </span>
                  <span style={{ color: soundOn ? "var(--accent)" : "var(--text-dim)" }}>
                    {soundOn ? "An" : "Aus"}
                  </span>
                </button>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <label className="field-label">Notizen zum Training</label>
                  <textarea
                    className="session-notes"
                    placeholder="Wie fühlt sich das Training an? Besonderheiten, Form, Energielevel…"
                    value={session.notes || ""}
                    onChange={(e) => onUpdateSession({ ...session, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {session.entries.map((entry, entryIndex) => {
        const ex = exBy[entry.exerciseId];
        // Nummern haengen an der ganzen Satzliste (Dropsaetze bekommen eine
        // Unternummer), nicht an der Position der einzelnen Zeile.
        const setLabels = setNumberLabels(entry.sets);
        // Bandübungen haben statt eines kg-Feldes eine Band-Auswahl in
        // derselben Spalte. Früher blieb die Spalte hier ganz leer ("ein Band
        // hat kein sinnvolles Gewicht") - genau dadurch war ein Bandwechsel
        // für die Statistik unsichtbar: Ein stärkeres Band bei gleichen
        // Wiederholungen sah aus wie Stillstand. Über die Bandliste bekommt
        // jedes Band einen ungefähren kg-Wert, und ab da rechnet die App wie
        // bei jeder Hantel.
        const isBandExercise =
          !!ex && getExerciseEquipment(ex, exerciseEquipmentOverrides) === "Band";
        const usesWeight = !ex || !isBandExercise || bands.length > 0;
        // Der Automatik-Modus TAKTET das Training - er entscheidet nicht,
        // WOMIT eine Uebung gemessen wird. Frueher stand hier "waehrend eines
        // automatischen Laufs ist jeder Satz eine Zeitangabe": Damit zeigte
        // die Zeile fuer jede Uebung ein Sekundenfeld, und Ausfallschritte
        // oder RDLs liessen sich gar nicht mehr in Wiederholungen eintragen.
        // Wer wirklich auf Zeit trainiert, stellt das an der Uebung ein
        // (Plan: "Zeit statt Wiederholungen") - dann greift genau dieselbe
        // Abfrage wie in jedem anderen Training auch.
        const isTimeBased =
          isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises) || !!entry.targetUseTime;
        // Comparing against the same gym only - a record set on a machine
        // that runs lighter elsewhere is not a record here.
        const history = getExerciseHistory(
          logs, entry.exerciseId, session.id, isTimeBased,
          effectiveGymId(entry.exerciseId, session.gymId, gymIndependentExercises)
        );
        // Only the single best set of this workout carries the trophy: when
        // you work up 60/70/80 all three would beat the old best, and three
        // trophies in a row say less than one on the set that counts.
        const hasWeightHere = usesWeight && entry.sets.some((x) => toNum(x.weight) > 0);
        // Die RIR-Angabe gilt dem letzten abgehakten Arbeitssatz. Fällt ein
        // Rekord in einem früheren Satz, gehört sie nicht zu ihm - dann wird
        // gar keine Reserve genannt statt einer, die woanders herkommt.
        const performedHere = performedWorkingSets(entry.sets);
        const lastPerformedHere = performedHere[performedHere.length - 1] || null;
        let setPrIndex = -1;
        let setPrList = null;
        let bestScore = -1;
        entry.sets.forEach((x, i) => {
          const prs = describeSetPRs(
            x, history, isTimeBased, hasWeightHere,
            x === lastPerformedHere ? entry.rir : null
          );
          if (prs.length === 0) return;
          // Rank by what was actually lifted (or held), so the strongest set wins.
          const score = isTimeBased ? toNum(x.duration) : toNum(x.weight) * 1000 + toNum(x.reps);
          if (score > bestScore) { bestScore = score; setPrIndex = i; setPrList = prs; }
        });
        const exercisePrs = describeExercisePRs(entry.sets, history, isTimeBased, hasWeightHere, entry.rir);
        const volumeChange = exerciseVolumeChange(entry.sets, history.lastSets, isTimeBased, usesWeight);
        const volumeChangeRounded = volumeChange === null ? null : Math.round(volumeChange);
        const ssInfo = supersetGroupInfo[entry.id] || { groupSize: 1, isFirst: true, isLast: true };
        const isSuperset = ssInfo.groupSize > 1;
        return (
          <React.Fragment key={entry.id}>
          {isSuperset && ssInfo.isFirst && (
            <div className="superset-label">
              <Repeat size={12} /> Superset ({ssInfo.groupSize} Übungen, keine Pause dazwischen)
            </div>
          )}
          <div
            ref={(el) => { entryRefs.current[entry.id] = el; }}
            className={`card entry-card ${draggingEntryId === entry.id ? "is-dragging" : ""} ${isSuperset ? "superset-card" : ""} ${isSuperset && !ssInfo.isLast ? "superset-card-linked" : ""}`}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  className="drag-handle"
                  title="Gedrückt halten und ziehen, um die Reihenfolge zu ändern"
                  {...entryDragProps(entry.id)}
                >
                  <GripVertical size={16} />
                </span>
                <span
                  className="ex-name ex-name-clickable"
                  onClick={() => setSelectedExerciseId(entry.exerciseId)}
                >
                  {ex.name}
                </span>
                {/* Records covering all sets of the exercise belong here, not
                    on one particular set. */}
                {exercisePrs.length > 0 && (
                  <span
                    className="pr-badge pr-badge-inline pr-badge-clickable"
                    title="Rekord für die ganze Übung – antippen"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setPrInfo({ list: exercisePrs, exerciseName: ex?.name || "Übung" });
                    }}
                  >
                    <Trophy size={12} />
                  </span>
                )}
                {volumeChange !== null && (
                  <span
                    className={`volume-change-badge ${
                      volumeChangeRounded > 0
                        ? "volume-change-up"
                        : volumeChangeRounded < 0
                        ? "volume-change-down"
                        : "volume-change-neutral"
                    }`}
                    title="Volumen dieser Übung im Vergleich zum letzten Mal – live, während du einträgst"
                  >
                    {volumeChangeRounded > 0 ? "+" : ""}
                    {volumeChangeRounded}%
                  </span>
                )}
              </div>
              <div className={`entry-menu-wrap ${entryMenuUp && openEntryMenu === entry.id ? "drop-up" : ""}`}>
                <button
                  className={`note-toggle ${(entry.restSeconds != null || entry.notes) ? "has-note" : ""}`}
                  onClick={(e) => {
                    const opening = openEntryMenu !== entry.id;
                    setEntryMenuUp(opening ? shouldDropUp(e.target) : false);
                    setOpenEntryMenu(opening ? entry.id : null);
                  }}
                  title="Optionen für diese Übung"
                >
                  <MoreVertical size={15} />
                </button>
                {openEntryMenu === entry.id && (
                  <div
                    ref={entryMenuRef}
                    className="program-menu"
                    style={{ top: "calc(100% + 4px)", right: 0, left: "auto" }}
                  >
                    <button
                      className="program-menu-item"
                      onClick={() => {
                        toggleEntryNotes(entry.id);
                        setOpenEntryMenu(null);
                      }}
                    >
                      <StickyNote size={14} />
                      {entry.notes ? "Notiz bearbeiten" : "Notiz hinzufügen"}
                    </button>
                    <button
                      className="program-menu-item"
                      onClick={() => {
                        setOpenRestPicker((s) => ({ ...s, [entry.id]: true }));
                        setOpenEntryMenu(null);
                      }}
                    >
                      <Timer size={14} />
                      Pausenzeit{entry.restSeconds != null ? ` · ${getRestDurationFor(entry.id)}s` : ""}
                    </button>
                    <button
                      className="program-menu-item"
                      onClick={() => {
                        setReplacingExerciseId(entry.id);
                        setOpenEntryMenu(null);
                      }}
                    >
                      <Repeat size={14} /> Übung ersetzen
                    </button>
                    <div className="program-menu-divider" />
                    <button
                      className="program-menu-item danger"
                      onClick={() => {
                        setOpenEntryMenu(null);
                        onRequestConfirm(
                          `„${ex.name}“ aus diesem Training entfernen?`,
                          () => removeExerciseFromSession(entry.id)
                        );
                      }}
                    >
                      <Trash2 size={14} /> Entfernen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {replacingExerciseId === entry.id && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span className="plan-title">Übung ersetzen</span>
                  <button className="btn-icon" onClick={() => { setReplacingExerciseId(null); setAddExerciseQuery(""); resetAddFilters(); }}>
                    <X size={15} />
                  </button>
                </div>
                <div className="search-box" style={{ marginBottom: 8 }}>
                  <Search size={16} color="var(--text-dim)" />
                  <input
                    autoFocus
                    placeholder="Übung suchen…"
                    value={addExerciseQuery}
                    onChange={(e) => setAddExerciseQuery(e.target.value)}
                  />
                </div>
                {/* Same filters as when adding an exercise - replacing one is
                    the same kind of search, usually with a clear idea of the
                    muscle group or the equipment that is free right now. */}
                <div className="chip-row" style={{ marginBottom: 8 }}>
                  <span
                    className={`chip ${addGroup === "alle" ? "active" : ""}`}
                    onClick={() => { setAddGroup("alle"); setAddSubgroup("alle"); }}
                  >
                    Alle
                  </span>
                  {MUSCLE_GROUPS.map((g) => (
                    <span
                      key={g.id}
                      className={`chip ${addGroup === g.id ? "active" : ""}`}
                      onClick={() => { setAddGroup(g.id); setAddSubgroup("alle"); }}
                    >
                      {g.label}
                    </span>
                  ))}
                </div>
                {addGroup !== "alle" && (SUBGROUPS[addGroup] || []).length > 0 && (
                  <div className="chip-row" style={{ marginBottom: 8 }}>
                    <span
                      className={`chip chip-sm ${addSubgroup === "alle" ? "active" : ""}`}
                      onClick={() => setAddSubgroup("alle")}
                    >
                      Alle
                    </span>
                    {SUBGROUPS[addGroup].map((sg) => (
                      <span
                        key={sg.id}
                        className={`chip chip-sm ${addSubgroup === sg.id ? "active" : ""}`}
                        onClick={() => setAddSubgroup(sg.id)}
                      >
                        {sg.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="chip-row" style={{ marginBottom: 10 }}>
                  <span
                    className={`chip chip-sm ${addEquipment === "alle" ? "active" : ""}`}
                    onClick={() => setAddEquipment("alle")}
                  >
                    Alle Geräte
                  </span>
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <span
                      key={opt}
                      className={`chip chip-sm ${addEquipment === opt ? "active" : ""}`}
                      onClick={() => setAddEquipment(opt)}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {exercises.filter((e) => e.id !== entry.exerciseId && addPickerMatches(e)).length === 0 && (
                    <div className="empty-state" style={{ padding: "14px 0" }}>Keine Übung gefunden.</div>
                  )}
                  {exercises
                    .filter((e) => e.id !== entry.exerciseId)
                    .filter(addPickerMatches)
                    .slice(0, EXERCISE_PICKER_LIMIT)
                    .map((e) => {
                      // Beim Tauschen wird nicht mehr blockiert, wenn die
                      // Uebung schon vorkommt - im Zirkel ist genau das
                      // gewollt. Die Anzahl steht nur als Hinweis daneben.
                      const addedCount = session.entries.filter((se) => se.exerciseId === e.id).length;
                      return (
                        <div className="ex-row" key={e.id}>
                          <span className="ex-name">{e.name}</span>
                          {addedCount > 0 && (
                            <span className="tag" title="So oft ist die Übung schon im Training">
                              {addedCount}×
                            </span>
                          )}
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => replaceExerciseInSession(entry.id, e.id)}
                          >
                            Wählen
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {openRestPicker[entry.id] && (
              <div className="chip-row rest-picker-inline" style={{ marginTop: 4, marginBottom: 8 }}>
                {REST_PRESETS.map((sec) => (
                  <span
                    key={sec}
                    className={`chip ${(entry.restSeconds ?? restDuration) === sec ? "active" : ""}`}
                    onClick={() => {
                      setEntryRestDuration(entry.id, sec);
                      setOpenRestPicker((s) => ({ ...s, [entry.id]: false }));
                    }}
                  >
                    {sec === 0 ? "Aus" : `${sec}s`}
                  </span>
                ))}
                {entry.restSeconds != null ? (
                  <span
                    className="chip"
                    onClick={() => {
                      setEntryRestDuration(entry.id, null);
                      setOpenRestPicker((s) => ({ ...s, [entry.id]: false }));
                    }}
                  >
                    Standard nutzen
                  </span>
                ) : null}
              </div>
            )}

            {history.lastSets && (
              <div className="last-performance">
                Letztes Mal ({fmtDate(history.lastDate)}):{" "}
                {history.lastSets
                  .map((s) =>
                    // Ohne Pfeil saehe ein Dropsatz in dieser Zeile wie ein
                    // Leistungseinbruch aus.
                    (s.dropset ? "↓" : "") + shortSet(s, isTimeBased)
                  )
                  .join(", ")}
                {fmtRir(history.lastRir) ? ` · ${fmtRir(history.lastRir)}` : ""}
              </div>
            )}

            {/* Note field: reached via the ⋮-menu ("Notiz hinzufügen" /
                "Notiz bearbeiten") instead of its own button, so the entry
                stays compact. Once a note has text it keeps showing here
                permanently - no toggle needed to see it again later. */}
            {(openNotes[entry.id] || entry.notes) && (
              <textarea
                className="session-notes note-inline"
                placeholder="Notiz zu dieser Übung, z. B. Ausführung, Beschwerden, Griffweite…"
                autoFocus={openNotes[entry.id]}
                value={entry.notes || history.lastNote || ""}
                onChange={(e) => updateEntryNotes(entry.id, e.target.value)}
              />
            )}

            {entry.sets.length > 0 && (
              <div style={{ marginBottom: 8, marginTop: 8 }}>
                <div
                  className={`set-row ${usesWeight ? "" : "set-row-noweight"}`}
                  style={{ marginBottom: 4 }}
                >
                  <span />
                  <label className="field-label" style={{ margin: 0 }}>
                    {isTimeBased ? "Sek." : "Wdh."}
                  </label>
                  {usesWeight && (
                    <label className="field-label" style={{ margin: 0 }}>
                      {isBandExercise ? "Band" : "kg"}
                    </label>
                  )}
                  <span />
                </div>
                {entry.sets.map((s, idx) => {
                  const pr = setPrIndex === idx ? setPrList : null;
                  const kind = setKind(s);
                  const kindMenuOpen =
                    openSetKind?.entryId === entry.id && openSetKind?.idx === idx;
                  return (
                    <div
                      className={`set-line ${s.dropset ? "is-drop" : ""} ${kindMenuOpen ? "menu-open" : ""}`}
                      key={idx}
                    >
                    <SwipeableSetRow
                      className={`set-row ${s.done ? "is-done" : ""} ${s.warmup ? "is-warmup" : ""} ${s.dropset ? "is-drop" : ""} ${usesWeight ? "" : "set-row-noweight"}`}
                      onSwipeRight={() => toggleSetDone(entry.id, idx)}
                      onSwipeLeft={() => removeSet(entry.id, idx)}
                    >
                      {/* Die Nummer ist zugleich der Schalter fuer die Satzart:
                          antippen, dann Aufwaermsatz oder Dropsatz waehlen. */}
                      <span
                        className={`set-kind is-${kind} ${kindMenuOpen ? "is-open" : ""}`}
                        onClick={() => {
                          setSetKindMenuUp(false);
                          setOpenSetKind(
                            kindMenuOpen ? null : { entryId: entry.id, idx }
                          );
                        }}
                        role="button"
                        title="Satzart wählen"
                      >
                        {setLabels[idx]}
                      </span>
                      {/* One column, two meanings: a timed set has no rep
                          count, so the seconds take that slot instead of
                          adding a second row underneath. */}
                      {isTimeBased ? (
                        <input
                          type="number"
                                inputMode="numeric"
                          min="0"
                          value={s.duration ?? ""}
                          onChange={(e) => updateSet(entry.id, idx, "duration", e.target.value)}
                          onBlur={() => sanitizeSetField(entry.id, idx, "duration")}
                        />
                      ) : (
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={s.reps}
                            onChange={(e) => updateSet(entry.id, idx, "reps", e.target.value)}
                            onBlur={() => sanitizeSetField(entry.id, idx, "reps")}
                          />
                          {pr && !usesWeight && (
                            <span
                              className="pr-badge pr-badge-clickable"
                              title="Was für ein Rekord? Antippen."
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setPrInfo({ list: pr, exerciseName: ex?.name || "Übung" });
                              }}
                            >
                              <Trophy size={12} />
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ position: "relative", display: usesWeight ? undefined : "none" }}>
                        {isBandExercise ? (
                          <button
                            className="band-pick"
                            onClick={() => setBandPickFor({ entryId: entry.id, idx })}
                            title="Band wählen"
                          >
                            {s.bandName || "Band"}
                          </button>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={s.weight}
                            onChange={(e) => updateSet(entry.id, idx, "weight", e.target.value)}
                            onBlur={() => sanitizeSetField(entry.id, idx, "weight")}
                          />
                        )}
                        {pr && (
                          <span
                            className="pr-badge pr-badge-clickable"
                            title="Was für ein Rekord? Antippen."
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setPrInfo({ list: pr, exerciseName: ex?.name || "Übung" });
                            }}
                          >
                            <Trophy size={12} />
                          </span>
                        )}
                      </div>
                      <span
                        className={`set-check ${s.done ? "checked" : ""}`}
                        onClick={() => toggleSetDone(entry.id, idx)}
                        role="checkbox"
                        aria-checked={!!s.done}
                      >
                        {s.done && <Check size={13} color="white" />}
                      </span>
                    </SwipeableSetRow>
                    {kindMenuOpen && (
                      <div
                        className={`set-kind-menu ${setKindMenuUp ? "drop-up" : ""}`}
                        ref={setKindMenuRef}
                      >
                        {SET_KINDS.filter(
                          ([id]) =>
                            id !== kind &&
                            (id !== "dropset" || canBeDropset(entry.sets, idx)) &&
                            (id !== "calibration" || canBeCalibration(entry.sets, idx))
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            className={`set-kind-option is-${id}`}
                            onClick={() =>
                              id === "calibration"
                                ? askCalibration(entry.id, idx)
                                : changeSetKind(entry.id, idx, id)
                            }
                          >
                            <span className="set-kind-dot" />
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Die Frage taucht erst auf, wenn die Uebung durch ist - vorher
                waere sie nur im Weg. Nur eine Angabe pro Uebung, am letzten
                Satz: 1RM-Schaetzungen sind nur nahe am Versagen belastbar,
                bei 3-4 in Reserve raet man ohnehin (siehe KONZEPT.md). */}
            {!isTimeBased && entry.sets.length > 0
              && entry.sets.every((s) => s.done)
              && entry.sets.some((s) => s.done && !s.warmup) && (
              <div className="rir-ask">
                <span className="rir-ask-label" title="Wiederholungen in Reserve im letzten Satz – 0 heißt bis zum Muskelversagen">
                  RIR
                </span>
                <div className="chip-row rir-ask-row">
                  {RIR_OPTIONS.map((value) => (
                    <span
                      key={value}
                      className={`chip chip-sm ${entry.rir === value ? "active" : ""}`}
                      onClick={() => setEntryRir(entry.id, value)}
                      title={value === 0 ? "Bis zum Muskelversagen" : undefined}
                    >
                      {rirLabel(value)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* "War der Tag so hart wie sonst?" - erscheint bewusst ERST,
                nachdem ein Wert gewählt wurde. Stünde der übliche Wert schon
                vorher da, wäre er eine Vorgabe: man tippt ihn an, statt
                hinzuspüren, und die Angabe wäre wertlos. Genau das meint
                Regel 1 in KONZEPT.md mit "erst schätzen lassen, dann Zahlen
                zeigen". */}
            {rirComparison(entry.rir, history.typicalRir) && (
              <div className="rir-compare">{rirComparison(entry.rir, history.typicalRir)}</div>
            )}

            {/* Eichsatz: Schätzung gegen Ergebnis, sofort nach dem Satz. Der
                einzige Moment in der App, in dem eine Selbsteinschätzung
                überprüft wird - deshalb steht das Ergebnis direkt da und
                nicht erst in einer Statistik Wochen später. */}
            {entrySets(entry).map((s, i) =>
              s?.calibration && s.done && toNum(s.estimatedFailureReps) > 0 && toNum(s.reps) > 0 ? (
                <div className="calibration-result" key={i}>
                  {toNum(s.estimatedFailureReps)} geschätzt, {toNum(s.reps)} geschafft
                  {toNum(s.reps) !== toNum(s.estimatedFailureReps) && (
                    <span className="calibration-result-diff">
                      {" · "}
                      {toNum(s.reps) > toNum(s.estimatedFailureReps)
                        ? `${toNum(s.reps) - toNum(s.estimatedFailureReps)} mehr als gedacht`
                        : `${toNum(s.estimatedFailureReps) - toNum(s.reps)} weniger als gedacht`}
                    </span>
                  )}
                </div>
              ) : null
            )}

            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => addSet(entry.id)}
            >
              <Plus size={14} /> Satz hinzufügen
            </button>
          </div>
          </React.Fragment>
        );
      })}

      <div className="card">
        {anyAutoRun && !autoRun && (
          <button
            className="btn btn-primary btn-block"
            style={{ marginBottom: 8 }}
            onClick={() => {
              // Must happen inside the tap: iOS only unlocks audio from a
              // real user gesture.
              unlockAudio();
              playBeep({ frequency: 660, duration: 0.12, volume: 0.15 });
              const first = firstUnfinishedSet();
              if (first) startAutoAt(first.entryId, first.setIdx, true);
            }}
          >
            <Play size={16} /> Automatik starten
          </button>
        )}
        <button className="btn btn-ghost btn-block" onClick={() => setAddingExercise(true)}>
          <Plus size={16} /> Übung hinzufügen
        </button>
      </div>

      {calibrationPrompt && (
        <Modal
          title="Eichsatz"
          onClose={() => { setCalibrationPrompt(null); setCalibrationGuess(""); }}
          width={360}
        >
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-dim)" }}>
            Diesen Satz bis zum echten Muskelversagen führen – also bis keine saubere
            Wiederholung mehr geht. Vorher: Was schätzt du, wie viele schaffst du?
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Wiederholungen"
            value={calibrationGuess}
            onChange={(e) => setCalibrationGuess(e.target.value)}
            style={{ width: "100%", marginTop: 12 }}
            autoFocus
          />
          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 12 }}
            disabled={!(toNum(calibrationGuess) > 0)}
            onClick={confirmCalibration}
          >
            <Check size={14} /> Schätzung merken
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-faint)", lineHeight: 1.45 }}>
            Die Schätzung wird jetzt festgehalten und nach dem Satz mit dem tatsächlichen
            Ergebnis verglichen.
          </div>
        </Modal>
      )}

      {/* Band-Auswahl für einen Satz. Gespeichert werden Kennung, Name UND
          kg-Wert: Der Name steht später in "Letztes Mal", der kg-Wert geht in
          Volumen, Belastung und Rekorde ein. Der Name wird mitgeschrieben und
          nicht nachgeschlagen, damit ein Umbenennen oder Löschen des Bandes
          alte Trainings nicht rückwirkend verändert. */}
      {bandPickFor && (
        <Modal title="Band wählen" onClose={() => setBandPickFor(null)}>
          {bands.length === 0 ? (
            <div className="empty-state" style={{ padding: "10px 0" }}>
              Noch keine Bänder angelegt. Du findest die Liste auf der Startseite
              unter dem Zahnrad links oben.
            </div>
          ) : (
            <div className="modal-list">
              {bands.map((b) => (
                <div
                  className="modal-option"
                  key={b.id}
                  onClick={() => {
                    // Wer ein Band waehlt, nimmt fast immer dasselbe fuer die
                    // restlichen Saetze der Uebung. Gefuellt werden deshalb
                    // auch die folgenden Saetze - aber nur die, bei denen noch
                    // kein Band steht und die noch nicht abgehakt sind.
                    applyBandFrom(bandPickFor.entryId, bandPickFor.idx, b);
                    setBandPickFor(null);
                  }}
                >
                  <span>{b.name}</span>
                  <span className="tag">{fmtDecimal(b.kg)} kg</span>
                </div>
              ))}
              <div
                className="modal-option"
                onClick={() => {
                  updateSetFields(bandPickFor.entryId, bandPickFor.idx, {
                    bandId: null,
                    bandName: null,
                    weight: 0,
                  });
                  setBandPickFor(null);
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>Kein Band</span>
              </div>
            </div>
          )}
        </Modal>
      )}

      {prInfo && (
        <Modal
          title={(prInfo.list || []).length > 1 ? "Neue Rekorde" : "Neuer Rekord"}
          onClose={() => setPrInfo(null)}
        >
          <div className="plan-title" style={{ marginBottom: 10 }}>{prInfo.exerciseName}</div>
          {/* One set can beat several records at once (weight and 1RM and
              volume), so they are all listed instead of picking one. */}
          {(prInfo.list || []).map((r, i) => (
            <div key={i} className="stat-hero" style={{ marginBottom: 8 }}>
              <span className="stat-hero-label">
                <Trophy size={12} style={{ verticalAlign: -1, marginRight: 5 }} />
                {r.title}
              </span>
              <span className="stat-hero-value">{r.value}</span>
              {/* Die eigentliche Aussage: ein Rekord mit mehr Reserve als der
                  alte ist mehr wert als die Zahl allein verrät. Nur wenn
                  beide Seiten eine Angabe haben - ohne Vergleichswert wäre
                  jede Einordnung geraten.
                  Achtung Reihenfolge: .stat-hero ist column-reverse, die
                  Anzeige läuft also von unten nach oben. Damit dieser Satz
                  direkt UNTER der "Bisher"-Zeile landet, auf die er sich
                  bezieht, muss er im Code davor stehen. */}
              {recordReserveNote(r.currentRir, r.previousRir) ? (
                <div style={{ fontSize: 12.5, color: "var(--brass)" }}>
                  {recordReserveNote(r.currentRir, r.previousRir)}
                </div>
              ) : fmtRir(r.currentRir) ? (
                // Ohne alten Vergleichswert lässt sich nichts einordnen -
                // die heutige Reserve zu nennen ist aber trotzdem sinnvoll.
                <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                  Heute erreicht mit {fmtRir(r.currentRir)}.
                </div>
              ) : null}
              <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                {r.previous ? `Bisher: ${r.previous}` : "Erste gewertete Bestmarke"}
                {r.previous && fmtRir(r.previousRir) ? ` (${fmtRir(r.previousRir)})` : ""}
              </div>
            </div>
          ))}
          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => setPrInfo(null)}
          >
            <Check size={14} /> Alles klar
          </button>
        </Modal>
      )}

      {addingExercise && (
        <Modal
          title="Übung hinzufügen"
          onClose={() => { setAddingExercise(false); setCreatingExercise(false); resetAddFilters(); }}
          width={420}
        >
          {creatingExercise ? (
            <>
              <NewExerciseForm
                exercises={exercises}
                onAddCustom={onAddCustom}
                onSetExerciseSubgroups={onSetExerciseSubgroups}
                onDone={(created) => {
                  setCreatingExercise(false);
                  // The parent's exercise list has not re-rendered yet, so the
                  // freshly created object is added straight to the session
                  // rather than looked up by id.
                  if (created?.id) addExerciseToSession(created.id);
                }}
              />
              <button
                className="btn btn-ghost btn-block"
                onClick={() => setCreatingExercise(false)}
              >
                Zurück zur Auswahl
              </button>
            </>
          ) : (
            <>
            <div className="search-box" style={{ marginBottom: 10 }}>
              <Search size={16} color="var(--text-dim)" />
              <input
                autoFocus
                placeholder="Übung suchen…"
                value={addExerciseQuery}
                onChange={(e) => setAddExerciseQuery(e.target.value)}
              />
            </div>
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <span
                className={`chip ${addGroup === "alle" ? "active" : ""}`}
                onClick={() => { setAddGroup("alle"); setAddSubgroup("alle"); }}
              >
                Alle
              </span>
              {MUSCLE_GROUPS.map((g) => (
                <span
                  key={g.id}
                  className={`chip ${addGroup === g.id ? "active" : ""}`}
                  onClick={() => { setAddGroup(g.id); setAddSubgroup("alle"); }}
                >
                  {g.label}
                </span>
              ))}
            </div>
            {addGroup !== "alle" && (SUBGROUPS[addGroup] || []).length > 0 && (
              <div className="chip-row" style={{ marginBottom: 8 }}>
                <span
                  className={`chip chip-sm ${addSubgroup === "alle" ? "active" : ""}`}
                  onClick={() => setAddSubgroup("alle")}
                >
                  Alle
                </span>
                {SUBGROUPS[addGroup].map((sg) => (
                  <span
                    key={sg.id}
                    className={`chip chip-sm ${addSubgroup === sg.id ? "active" : ""}`}
                    onClick={() => setAddSubgroup(sg.id)}
                  >
                    {sg.label}
                  </span>
                ))}
              </div>
            )}
            <div className="chip-row" style={{ marginBottom: 10 }}>
              <span
                className={`chip chip-sm ${addEquipment === "alle" ? "active" : ""}`}
                onClick={() => setAddEquipment("alle")}
              >
                Alle Geräte
              </span>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <span
                  key={opt}
                  className={`chip chip-sm ${addEquipment === opt ? "active" : ""}`}
                  onClick={() => setAddEquipment(opt)}
                >
                  {opt}
                </span>
              ))}
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {exercises.filter(addPickerMatches).length === 0 && (
                <div className="empty-state" style={{ padding: "14px 0" }}>Keine Übung gefunden.</div>
              )}
              {exercises
                .filter(addPickerMatches)
                .slice(0, EXERCISE_PICKER_LIMIT)
                .map((e) => {
                  const addedCount = session.entries.filter((se) => se.exerciseId === e.id).length;
                  return (
                    <div className="ex-row" key={e.id}>
                      <span className="ex-name">{e.name}</span>
                      {addedCount > 0 && (
                        <span className="tag" title="So oft ist die Übung schon im Training">
                          {addedCount}×
                        </span>
                      )}
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => addExerciseToSession(e.id)}
                      >
                        <Plus size={14} /> Hinzufügen
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              className="btn btn-ghost btn-block"
              style={{ marginTop: 10 }}
              onClick={() => setCreatingExercise(true)}
            >
              <Plus size={16} /> Neue Übung erstellen
            </button>
            </>
          )}
        </Modal>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn btn-danger" style={{ flex: 1 }} onClick={onDiscard}>
          <X size={16} /> Verwerfen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={() => {
            const open = session.entries.reduce(
              (n, e) => n + e.sets.filter((set) => !set.done && !set.warmup).length,
              0
            );
            onRequestConfirm(
              open > 0
                ? `Training wirklich beenden? ${open} ${open === 1 ? "Satz ist" : "Sätze sind"} noch nicht abgehakt.`
                : "Training wirklich beenden und speichern?",
              onFinish
            );
          }}
        >
          <Check size={16} /> Training beenden & speichern
        </button>
      </div>

      {selectedExercise && (
        <ExerciseDetailSheet
          gyms={gyms}
          key={selectedExercise.id}
          exercise={selectedExercise}
          exercises={exercises}
          logs={logs}
          exerciseNotes={exerciseNotes}
          exerciseSubgroupOverrides={exerciseSubgroupOverrides}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
          exerciseEquipmentOverrides={exerciseEquipmentOverrides}
          onSetExerciseEquipment={onSetExerciseEquipment}
          timeBasedExercises={timeBasedExercises}
          gymIndependentExercises={gymIndependentExercises}
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onToggleGymIndependent={onToggleGymIndependent}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts for a single exercise - used both in the progress view and in the
// exercise detail sheet, so both always show identical numbers.
// ---------------------------------------------------------------------------

const GYM_LINE_COLORS = ["#b25a26", "#41707d", "#4f7a48", "#6f5f92", "#9a7414"];

// Recharts takes plain colour strings rather than CSS variables, so the
// current theme's values are read off the stylesheet once per render.
function useChartColors(theme) {
  return useMemo(() => {
    const read = (name, fallback) => {
      if (typeof window === "undefined") return fallback;
      const shell = document.querySelector(".app-shell");
      if (!shell) return fallback;
      const value = getComputedStyle(shell).getPropertyValue(name).trim();
      return value || fallback;
    };
    return {
      grid: read("--border", "rgba(60,60,67,0.15)"),
      axis: read("--text-faint", "#a3a3a8"),
      tooltipBg: read("--elevated", "#ffffff"),
      tooltipBorder: read("--border", "rgba(60,60,67,0.15)"),
      series: {
        accent: read("--chart-accent", "#b25a26"),
        gold: read("--chart-gold", "#9a7414"),
        teal: read("--chart-teal", "#41707d"),
        violet: read("--chart-violet", "#6f5f92"),
        green: read("--chart-green", "#4f7a48"),
        green2: read("--chart-green-2", "#3c6b52"),
      },
    };
  }, [theme]);
}

// Punkt-zu-Punkt-Vergleich für die Übungs-Charts: für jeden Datenpunkt wird
// der Wert von ungefähr compareWeeks Wochen zuvor gesucht (±toleranceDays
// Tage, gegen zufällige Ausreißer/Trainingslücken am exakten Stichtag) und
// die prozentuale Veränderung daraus berechnet. Bewusst kein Wochen-
// Mittelwert wie bei den Muskelgruppen-Karten: eine einzelne Übung wird oft
// unregelmäßig trainiert, ein Mittelwert über leere Wochen würde das genau
// wie dort verwässern. keys erlaubt mehrere Datenreihen auf einmal (z. B.
// eine pro Gym, wenn nach Gym aufgesplittet wird) - jede wird nur gegen
// ihre eigene Historie verglichen.
// Der Spielraum wächst mit dem Vergleichszeitraum. Feste ±3 Tage sind bei
// "Vorwoche" richtig, bei "20 Wochen" aber absurd streng: man müsste dieselbe
// Übung zufällig innerhalb von drei Tagen um ein Datum vor fünf Monaten
// trainiert haben, sonst gibt es keinen Vergleichswert - und die Linie reißt
// an dieser Stelle. 15 % des Abstands halten das Fenster proportional
// (±3 Tage bei einer Woche, ~±12 Tage bei zwölf).
const PERCENT_TOLERANCE_SHARE = 0.15;
const PERCENT_TOLERANCE_MIN_DAYS = 3;

export function buildPercentSeries(data, keys, compareWeeks, toleranceDays = PERCENT_TOLERANCE_MIN_DAYS) {
  // "Gesamt" hat hier keinen Zeitpunkt in der Vergangenheit, den man ansteuern
  // koennte - also wird gegen den ERSTEN erfassten Wert verglichen: "wie weit
  // bin ich seit dem Anfang gekommen". Ohne diesen Fall waere der Chip in den
  // Uebungs-Charts tot, waehrend er bei den Muskelgruppen daneben funktioniert.
  if (!Number.isFinite(compareWeeks)) {
    const ersteWerte = {};
    return data.map((pt) => {
      // prs wandert unveraendert mit: Ein Rekord bleibt derselbe, egal ob die
      // Karte gerade absolute Zahlen oder Prozente zeigt.
      const out = { date: pt.date, ts: pt.ts, prs: pt.prs };
      keys.forEach((key) => {
        const val = pt[key];
        if (!(val > 0)) { out[key] = null; return; }
        if (ersteWerte[key] == null) {
          ersteWerte[key] = val;
          // Der Startpunkt selbst ist per Definition 0 % Veraenderung.
          out[key] = 0;
          return;
        }
        out[key] = ((val - ersteWerte[key]) / ersteWerte[key]) * 100;
      });
      return out;
    });
  }
  const targetOffsetMs = compareWeeks * LOAD_WEEK_MS;
  const toleranceMs = Math.max(
    toleranceDays * 86400000,
    targetOffsetMs * PERCENT_TOLERANCE_SHARE
  );
  return data.map((pt, i) => {
    const out = { date: pt.date, ts: pt.ts, prs: pt.prs };
    keys.forEach((key) => {
      const val = pt[key];
      if (!(val > 0)) { out[key] = null; return; }
      const targetTs = pt.ts - targetOffsetMs;
      let best = null;
      let bestDiff = Infinity;
      for (let j = 0; j < i; j++) {
        const cVal = data[j][key];
        if (!(cVal > 0)) continue;
        const diff = Math.abs(data[j].ts - targetTs);
        if (diff <= toleranceMs && diff < bestDiff) {
          bestDiff = diff;
          best = cVal;
        }
      }
      out[key] = best == null ? null : ((val - best) / best) * 100;
    });
    return out;
  });
}

// "80 kg × 8" - die Kurzschreibweise, in der ein Satz überall sonst in der App
// auch auftaucht (Verlauf, "Letztes Mal"). Null, wo es nichts zu beschreiben
// gibt, damit der Tooltip die Zeile dann einfach weglässt.
// Kurzschreibweise fuer Satz-Listen ("Letztes Mal", Verlauf, Kalender).
// Ohne Gewicht steht dort die Wiederholungszahl allein: "0kg×8" bei einem
// Klimmzug ist keine Information, sondern ein Formatierungsunfall - und er
// fiel bisher nur nicht auf, weil Koerpergewichts-Uebungen gar keine
// Historie hatten (siehe getExerciseHistory).
// Wie ein Satz in einer Zeile aussieht. isTimeBased sagt, WOMIT die Uebung
// gemessen wird - und nur das entscheidet, ob Sekunden oder kg x Wdh.
// dastehen.
//
// Frueher entschied das der Satz selbst: Stand irgendeine Dauer drin, wurden
// Sekunden angezeigt - vor Gewicht und Wiederholungen. Das ging schief, weil
// bis dahin JEDER Satz eine Dauer mitbekam, auch bei reinen
// Wiederholungs-Uebungen (siehe makeSet). Aus "60kg x 8" wurde so "30s", und
// das quer durch die App: im Verlauf, in der Tagesansicht des Kalenders, in
// der Uebungs-Detailseite. Die Anzeige ueberstimmte damit sogar Aufrufer,
// die vorher ausgerechnet hatten, dass die Uebung gar keine Zeit-Uebung ist.
export function shortSet(s, isTimeBased = false) {
  if (!s) return "";
  if (isTimeBased) return `${toNum(s.duration)}s`;
  const weight = toNum(s.weight);
  const reps = toNum(s.reps);
  // Bei einem Band sagt der Name mehr als die Kilogramm: "Rot ×15" ist die
  // Angabe, mit der man am Gerät wieder etwas anfangen kann.
  if (s.bandName) return `${s.bandName}×${reps}`;
  if (weight > 0) return `${fmtDecimal(weight)}kg×${reps}`;
  // Weder Gewicht noch Wiederholungen, aber eine Dauer: Dann ist die Dauer
  // das Einzige, was der Satz ueberhaupt hergibt. Das rettet Saetze aus der
  // Zeit vor dieser Trennung, bei denen nur die Sekunden echt sind.
  if (reps <= 0 && toNum(s.duration) > 0) return `${toNum(s.duration)}s`;
  return `${reps} Wdh.`;
}

function describeSet(set) {
  if (!set) return null;
  const weight = toNum(set.weight);
  const reps = toNum(set.reps);
  if (reps <= 0) return null;
  return weight > 0 ? `${fmtDecimal(weight)} kg × ${reps}` : `${reps} Wdh.`;
}

function ExerciseCharts({ logs, exerciseId, isTimeBased, theme, gyms = [], gymIndependent = false }) {
  const chartColors = useChartColors(theme);

  const selectedIsTimeBased = isTimeBased;
  const selected = exerciseId;
  // Weights are not comparable between gyms, so as soon as an exercise has
  // been trained in more than one, each gym gets its own line instead of a
  // single line that jumps up and down for no real reason. Exercises marked
  // as being the same everywhere (bodyweight, bands) are the exception -
  // there the split would tear one continuous progression into fragments.
  // Nur Trainings, in denen wirklich ein Satz dieser Uebung abgehakt wurde -
  // sonst haenge ein 0-Punkt in der Kurve, wo die Uebung nur geplant war.
  const relevantLogs = logs.filter(
    (l) => performedWorkingSets(logSetsFor(l, selected)).length > 0
  );
  const gymKeys = [...new Set(relevantLogs.map((l) => l.gymId || "none"))];
  const splitByGym = gymKeys.length > 1 && !gymIndependent;
  const gymLabel = (key) =>
    key === "none" ? "Ohne Gym" : gyms.find((g) => g.id === key)?.name || "Unbekanntes Gym";

  // In welchem Training wurde mit dieser Uebung ein Rekord aufgestellt - fuer
  // die Pokale in den Kurven. Bewusst gemerkt statt bei jedem Neuzeichnen
  // gerechnet: Dafuer muss fuer jedes Training die komplette Historie davor
  // durchgegangen werden.
  const prHistory = useMemo(
    () => getExercisePRHistory(logs, selected, selectedIsTimeBased, gymIndependent),
    [logs, selected, selectedIsTimeBased, gymIndependent]
  );

  const chartData = relevantLogs
    .map((l) => {
      // Eine Uebung kann mehrfach im selben Training stehen (Zirkel: A, B, A).
      // Deshalb alle Plaetze zusammennehmen - ein .find() wuerde die Saetze
      // der zweiten Kopie still aus allen Charts entfernen.
      const workingSets = performedWorkingSets(logSetsFor(l, selected));
      // Zu welchem Satz die Reserve-Angabe gehoert - sie geht ins geschaetzte
      // 1RM ein (siehe set1RM) und haengt am Eintrag, nicht am Satz.
      const rirBySet = new Map();
      logEntriesFor(l, selected).forEach((entry) => {
        forEachPerformedSet(entry, (set, rir) => { if (rir != null) rirBySet.set(set, rir); });
      });
      const oneRMOf = (set) => set1RM(set, rirBySet.get(set) ?? null);
      // Hatte dieses Training ueberhaupt Gewicht auf der Stange? Bei einer
      // Koerpergewichts-Uebung, die man manchmal mit Gurt macht, haben die
      // Trainings ohne Gurt kein Satzvolumen und kein 1RM. Frueher stand dort
      // eine 0 und die Kurve fiel bis auf den Boden, als waere die Leistung
      // eingebrochen - dabei gab es diese Zahl an dem Tag schlicht nicht.
      // Lieber eine Luecke als eine Null (siehe KONZEPT.md).
      const hatGewicht = workingSets.some((s) => toNum(s.weight) > 0);
      const maxWeight = selectedIsTimeBased || !hatGewicht
        ? null
        // toNum: Math.max("62,5") ist NaN, und ein NaN in der Reihe reisst
        // die ganze Kurve mit.
        : Math.max(0, ...workingSets.map((s) => toNum(s.weight)));
      const totalReps = workingSets.reduce((sum, s) => sum + toNum(s.reps), 0);
      const totalDuration = workingSets.reduce((sum, s) => sum + toNum(s.duration), 0);
      // Heaviest single set of the session (weight x reps of one set), not
      // the session total — shows how hard the hardest set was over time.
      const maxSetVolume = selectedIsTimeBased || !hatGewicht
        ? null
        : Math.max(
            0,
            ...workingSets.map((s) => toNum(s.weight) * toNum(s.reps))
          );
      // Nicht nur WIE VIEL, sondern WOMIT: zu jedem Punkt der Kurve wird der
      // Satz gemerkt, aus dem der Wert entstanden ist. Ohne das ist "640" oder
      // ein geschätztes 1RM eine Zahl ohne Herkunft - man sieht die
      // Veränderung, kann sie aber nicht einordnen.
      const bestVolumeSet = selectedIsTimeBased
        ? null
        : workingSets.reduce(
            (best, s) =>
              !best || toNum(s.weight) * toNum(s.reps) > toNum(best.weight) * toNum(best.reps)
                ? s
                : best,
            null
          );
      const best1RMSet = selectedIsTimeBased
        ? null
        : workingSets.reduce(
            (best, s) =>
              !best || oneRMOf(s) > oneRMOf(best) ? s : best,
            null
          );
      // Best estimated one-rep max of the session: the strongest single set
      // converted to a 1RM, which tracks strength progress even when the
      // rep scheme changes between workouts.
      const best1RM = selectedIsTimeBased || !hatGewicht
        ? null
        : Math.max(0, ...workingSets.map(oneRMOf));
      // Whole-session volume (all sets added up) and the best single set by
      // reps or seconds - the numbers the charts below are built from.
      const totalVolume = selectedIsTimeBased || !hatGewicht
        ? null
        : workingSets.reduce((sum, x) => sum + toNum(x.weight) * toNum(x.reps), 0);
      const maxReps = Math.max(0, ...workingSets.map((x) => toNum(x.reps)));
      const maxDuration = Math.max(0, ...workingSets.map((x) => toNum(x.duration)));
      // Beim Gesamtvolumen gibt es keinen einzelnen Satz dahinter - es ist die
      // Summe aller. Deshalb die Zusammensetzung, gekürzt: eine Tooltip-Box
      // auf einem Telefon verträgt keine acht Sätze in einer Zeile.
      const setList = workingSets.map(describeSet).filter(Boolean);
      const totalVolumeDetail = setList.length === 0
        ? null
        : setList.length <= 3
        ? setList.join(", ")
        : `${setList.slice(0, 3).join(", ")} +${setList.length - 3} weitere`;
      const details = {
        maxSetVolume__detail: describeSet(bestVolumeSet),
        best1RM__detail: describeSet(best1RMSet) ? `aus ${describeSet(best1RMSet)}` : null,
        totalVolume__detail: totalVolumeDetail,
      };

      // Zu jedem Punkt die Rekorde dieses Trainings, sortiert nach der
      // Kennzahl, zu der sie gehoeren - damit der Pokal auf der Kurve
      // auftaucht, die den Rekord auch zeigt.
      const prByKey = {};
      (prHistory[l.id] || []).forEach((pr) => {
        if (pr.key && !prByKey[pr.key]) prByKey[pr.key] = pr;
      });

      const base = {
        date: fmtDate(l.date),
        ts: new Date(l.date).getTime(),
        prs: prByKey,
      };
      if (!splitByGym) {
        return { ...base, ...details, maxWeight, totalReps, totalDuration, maxSetVolume,
                 best1RM, totalVolume, maxReps, maxDuration };
      }
      // One key per gym so Recharts draws separate lines; the gaps are
      // bridged with connectNulls so each gym reads as one continuous line.
      const g = l.gymId || "none";
      return {
        ...base,
        [`maxWeight_${g}`]: maxWeight,
        [`totalReps_${g}`]: totalReps,
        [`totalDuration_${g}`]: totalDuration,
        [`maxSetVolume_${g}`]: maxSetVolume,
        [`best1RM_${g}`]: best1RM,
        [`totalVolume_${g}`]: totalVolume,
        [`maxReps_${g}`]: maxReps,
        [`maxDuration_${g}`]: maxDuration,
        // Der Tooltip sucht die Herkunft unter dem Schlüssel der Linie, und
        // die heißt hier pro Gym anders - sonst bliebe die Angabe bei
        // getrennten Gym-Linien leer.
        [`maxSetVolume_${g}__detail`]: details.maxSetVolume__detail,
        [`best1RM_${g}__detail`]: details.best1RM__detail,
        [`totalVolume_${g}__detail`]: details.totalVolume__detail,
      };
    })
    .sort((a, b) => a.ts - b.ts);

  if (!selected) return null;

  // Which charts make sense depends on how the exercise is trained. Bodyweight
  // and band work has no weight, so volume and 1RM would be flat zero lines -
  // there the rep counts are what actually shows progress.
  const hasAnyWeight = relevantLogs.some((l) =>
    performedWorkingSets(logSetsFor(l, selected)).some((x) => toNum(x.weight) > 0)
  );
  const cards = selectedIsTimeBased
    ? [
        { key: "maxDuration", title: "Längster Satz (Sek.)", color: chartColors.series.accent },
        { key: "totalDuration", title: "Gesamtzeit pro Training (Sek.)", color: chartColors.series.gold },
      ]
    : !hasAnyWeight
    ? [
        { key: "maxReps", title: "Maximale Wdh. pro Satz", color: chartColors.series.accent },
        { key: "totalReps", title: "Gesamte Wdh. pro Training", color: chartColors.series.gold },
      ]
    : [
        { key: "maxSetVolume", title: "Maximales Satzvolumen", color: chartColors.series.teal },
        { key: "best1RM", title: "Geschätztes 1RM", color: chartColors.series.violet },
        { key: "totalVolume", title: "Gesamtvolumen pro Training", color: chartColors.series.gold },
        { key: "maxWeight", title: "Maximalgewicht pro Training (kg)", color: chartColors.series.accent },
        // Reps werden bei Gewichtsübungen längst pro Satz erfasst (siehe
        // workingSets oben), standen als eigene Karte bisher aber nur bei
        // reinen Bodyweight-Übungen zur Verfügung.
        { key: "maxReps", title: "Maximale Wdh. pro Satz", color: chartColors.series.green },
        { key: "totalReps", title: "Gesamte Wdh. pro Training", color: chartColors.series.green2 },
      ];

  return chartData.length === 0 ? (
    <div className="empty-state">Keine Daten für diese Übung.</div>
  ) : (
    <>
      {cards.map((c) => (
        <ExerciseStatCard
          key={c.key}
          title={c.title}
          dataKey={c.key}
          color={c.color}
          chartData={chartData}
          splitByGym={splitByGym}
          gymKeys={gymKeys}
          gymLabel={gymLabel}
          chartColors={chartColors}
        />
      ))}
    </>
  );
}

// Ein Pokal MITTEN IN EINEM DIAGRAMM. Bewusst als Pfad gezeichnet und nicht
// als das fertige Symbol aus der Icon-Sammlung: Das ist selbst ein <svg>, und
// ein <svg> in einem <svg> ignoriert die angegebene Groesse - es fuellt
// stattdessen die ganze Zeichenflaeche. In der Karte darunter (normales HTML)
// ist das Symbol dagegen unproblematisch.
// Die Pfade sind dieselben wie beim Symbol "Trophy", gezeichnet auf 24x24 und
// hier auf die gewuenschte Groesse heruntergerechnet.
const TROPHY_PATHS = [
  "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
  "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
  "M4 22h16",
  "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
  "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
  "M18 2H6v7a6 6 0 0 0 12 0V2Z",
];

function TrophyGlyph({ cx, cy, size = 11, color, strokeWidth = 2.4 }) {
  const f = size / 24;
  return (
    <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${f})`}>
      {/* Die Strichstaerke wird mitverkleinert, also vorher hochgerechnet -
          sonst waere der Pokal bei 11 Pixeln nur noch ein Schatten. */}
      <g
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth / f}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {TROPHY_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </g>
  );
}

// Eine einzelne Übungs-Statistik-Karte mit zwei Reitern: "Absolut" (wie
// bisher) und "Verlauf in %" - dieselbe Karte, nur mit einer anderen
// Datenreihe (siehe buildPercentSeries), damit man nicht zwischen zwei
// getrennten Karten hin- und herspringen muss.
// Zeitraum-Leiste, siehe unten: Sie steht jetzt ueber BEIDEN Ansichten und
// schneidet das Diagramm zu. Vorher gab es sie nur in der Prozent-Ansicht und
// sie aenderte ausschliesslich die Vergleichsbasis - die Datumsleiste blieb
// stehen, egal was man antippte. "4 Wochen" liest sich aber wie "zeig mir
// 4 Wochen", und bei den Muskelgruppen-Karten tut derselbe Chip genau das.
function ExerciseStatCard({ title, dataKey, color, chartData, splitByGym, gymKeys, gymLabel, chartColors }) {
  const [mode, setMode] = useState("absolute");
  // "Gesamt" als Startwert: Beim Oeffnen einer Uebung will man ihren ganzen
  // Verlauf sehen, nicht die letzten sieben Tage. In der Prozent-Ansicht
  // heisst derselbe Chip "seit deinem ersten Training dieser Uebung".
  const [compareWeeks, setCompareWeeks] = useState(Infinity);
  const percentKeys = useMemo(
    () => (splitByGym ? gymKeys.map((g) => `${dataKey}_${g}`) : [dataKey]),
    [splitByGym, gymKeys, dataKey]
  );
  // Gerechnet wird immer auf der VOLLEN Reihe, erst danach wird zugeschnitten:
  // Der Vergleichspartner eines Punktes liegt naturgemaess vor dem sichtbaren
  // Zeitraum. Wuerde man zuerst schneiden, waere die Prozent-Ansicht am linken
  // Rand immer leer.
  const percentData = useMemo(
    () => buildPercentSeries(chartData, percentKeys, compareWeeks),
    [chartData, percentKeys, compareWeeks]
  );
  // Sichtbarer Ausschnitt: dieselbe Rechnung wie compareWindowSeries bei den
  // Muskelgruppen - N+1 Wochen, damit bei "Vorwoche" nicht ein einzelner
  // Punkt uebrigbleibt und die Linie verschwindet.
  const imZeitraum = useMemo(() => {
    if (!Number.isFinite(compareWeeks)) return () => true;
    const von = Date.now() - (compareWeeks + 1) * LOAD_WEEK_MS;
    return (pt) => pt.ts >= von;
  }, [compareWeeks]);
  const sichtbarAbsolut = useMemo(() => chartData.filter(imZeitraum), [chartData, imZeitraum]);
  const sichtbarProzent = useMemo(() => percentData.filter(imZeitraum), [percentData, imZeitraum]);
  const hasPercentValues = sichtbarProzent.some((pt) => percentKeys.some((k) => pt[k] != null));
  // Trainings, für die es keinen Vergleichspartner gibt, haben keinen Wert -
  // dort bricht die Linie. Das ist richtig so (eine durchgezogene Linie würde
  // eine Zahl behaupten, die nie berechnet wurde), aber ohne Erklärung sieht
  // es nach einem Fehler aus. Gezählt wird nur, was auch absolut vorhanden
  // war: ein Training ohne diesen Wert fehlt in beiden Ansichten und ist
  // keine Lücke des Prozent-Vergleichs.
  const percentGaps = useMemo(
    () =>
      percentData.filter(
        (pt, i) => imZeitraum(pt) && percentKeys.some((k) => pt[k] == null && chartData[i]?.[k] > 0)
      ).length,
    [percentData, percentKeys, chartData, imZeitraum]
  );
  const activeData = mode === "percent" ? sichtbarProzent : sichtbarAbsolut;

  // Ein Pokal an jeder Stelle, an der in DIESER Kennzahl ein Rekord steht.
  // Nicht an jedem Rekord des Trainings: Ein Wiederholungs-Rekord auf der
  // Gewichts-Kurve wuerde behaupten, das Gewicht sei gestiegen.
  const [openPR, setOpenPR] = useState(null);
  const hatPokale = activeData.some((pt) => pt?.prs?.[dataKey]);
  const prDot = (dotColor) => (dotProps) => {
    const { cx, cy, index, payload } = dotProps;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    const pr = payload?.prs?.[dataKey];
    if (!pr) return <circle key={index} cx={cx} cy={cy} r={3} fill={dotColor} />;
    const aktiv = openPR?.index === index;
    return (
      <g key={index} style={{ cursor: "pointer" }}>
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={chartColors.tooltipBg}
          stroke={aktiv ? chartColors.series.gold : dotColor}
          strokeWidth={aktiv ? 2.5 : 1.5}
        />
        <TrophyGlyph cx={cx} cy={cy} size={11} color={chartColors.series.gold} strokeWidth={1.3} />
        {/* Antippbare Flaeche: Ein 11-Pixel-Symbol trifft kein Finger. */}
        <rect
          x={cx - 16}
          y={cy - 16}
          width={32}
          height={32}
          fill="transparent"
          onClick={() => setOpenPR(aktiv ? null : { pr, date: payload.date, index })}
        />
      </g>
    );
  };

  const renderLines = () =>
    splitByGym
      ? gymKeys.map((g, i) => {
          const lineColor = GYM_LINE_COLORS[i % GYM_LINE_COLORS.length];
          return (
            <Line
              key={g}
              type="monotone"
              dataKey={`${dataKey}_${g}`}
              name={gymLabel(g)}
              stroke={lineColor}
              strokeWidth={2.5}
              dot={prDot(lineColor)}
              activeDot={{ r: 5 }}
              connectNulls={mode === "absolute"}
            />
          );
        })
      : (
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          dot={prDot(color)}
          activeDot={{ r: 5 }}
        />
      );
  const gymLegend = splitByGym ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null;
  const compareLabel = MUSCLE_COMPARE_OPTIONS.find(([w]) => w === compareWeeks)?.[1] || `${compareWeeks} Wochen`;

  return (
    <div className="card chart-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span className="plan-title">{title}</span>
        <div className="chip-row" style={{ margin: 0, padding: 0, overflow: "visible" }}>
          <span
            className={`chip chip-sm ${mode === "absolute" ? "active" : ""}`}
            onClick={() => setMode("absolute")}
          >
            Absolut
          </span>
          <span
            className={`chip chip-sm ${mode === "percent" ? "active" : ""}`}
            onClick={() => setMode("percent")}
          >
            Verlauf in %
          </span>
        </div>
      </div>
      {/* Dieselben Zeiträume wie bei "Sätze pro Muskelgruppe" und "Belastung
          pro Muskelgruppe" - und in beiden Ansichten sichtbar, weil sie jetzt
          auch beide zuschneiden. */}
      <div className="chip-row" style={{ marginTop: 10, marginBottom: 0 }}>
        {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
          <span
            key={weeks}
            className={`chip chip-sm ${compareWeeks === weeks ? "active" : ""}`}
            onClick={() => setCompareWeeks(weeks)}
          >
            {label}
          </span>
        ))}
      </div>
      {activeData.length === 0 ? (
        <div className="empty-state" style={{ padding: "14px 0" }}>
          In diesem Zeitraum wurde diese Übung nicht trainiert.
        </div>
      ) : mode === "percent" && !hasPercentValues ? (
        <div className="empty-state" style={{ padding: "14px 0" }}>
          {!Number.isFinite(compareWeeks)
            ? "Noch kein Vergleichswert – dafür braucht es mindestens zwei Trainings dieser Übung."
            : `Noch kein Vergleichswert für „${compareLabel}" – dafür fehlt ein Training von vor diesem Zeitraum.`}
        </div>
      ) : (
        <div style={{ height: 190, marginTop: 14 }}>
          <ResponsiveContainer width="99%" height="100%" debounce={1}>
            <LineChart data={activeData} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} />
              <YAxis
                stroke={chartColors.axis}
                fontSize={11}
                axisLine={false}
                tickLine={false}
                width={mode === "percent" ? 44 : 40}
                tickFormatter={mode === "percent" ? (v) => `${Math.round(v)}%` : undefined}
              />
              <Tooltip
                contentStyle={{
                  background: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                // Ohne Namen vor dem Wert bliebe sonst dessen Trennzeichen
                // stehen und die Zeile begänne mit einem losen ": ".
                separator={mode === "absolute" && splitByGym ? " : " : ""}
                formatter={
                  mode === "percent"
                    ? (v) => [`${v == null ? "–" : Math.round(v)}%`, ""]
                    : (v, name, item) => {
                        // Woraus der Wert entstanden ist, steht im Datenpunkt
                        // unter dem Schlüssel der jeweiligen Linie (siehe
                        // ExerciseCharts). Karten ohne solche Angabe - etwa
                        // "Maximalgewicht" - zeigen weiterhin nur die Zahl.
                        const detail = item?.payload?.[`${item?.dataKey}__detail`];
                        // Geschätzte 1RM-Werte sind krumm (88,8166...) - roh
                        // ausgegeben füllen sie die halbe Tooltip-Zeile mit
                        // Nachkommastellen, die nichts aussagen.
                        const num = typeof v === "number" ? fmtDecimal(v) : v;
                        const shown = detail ? `${num} · ${detail}` : num;
                        // Ohne Gym-Trennung gibt es nur eine Linie; deren
                        // technischer Name ("maxSetVolume") stand bisher mit
                        // im Tooltip und sagt niemandem etwas.
                        return [shown, splitByGym ? name : ""];
                      }
                }
              />
              {mode === "percent" && <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="3 3" />}
              {renderLines()}
              {gymLegend}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Was der angetippte Pokal bedeutet. Bewusst unter der Kurve statt in
          einem eigenen Fenster: Man sieht den Punkt und die Erklaerung
          gleichzeitig und muss nichts wegklicken, um weiterzuschauen. */}
      {openPR && (
        <div className="range-summary">
          <div className="range-summary-head">
            <span>
              <Trophy size={13} style={{ verticalAlign: -2, marginRight: 4, color: "var(--brass)" }} />
              Rekord am {openPR.date}
            </span>
            <span className="link-like" onClick={() => setOpenPR(null)}>
              Schließen
            </span>
          </div>
          <p className="deload-basis" style={{ marginTop: 4 }}>
            {openPR.pr.title}: <strong>{openPR.pr.value}</strong>
            {openPR.pr.previous
              ? ` – vorher ${openPR.pr.previous}`
              : " – der erste Wert dieser Art, es gab noch nichts zu schlagen"}
            {fmtRir(openPR.pr.currentRir) ? ` · ${fmtRir(openPR.pr.currentRir)}` : ""}
            {openPR.pr.previous && fmtRir(openPR.pr.previousRir)
              ? ` (vorher ${fmtRir(openPR.pr.previousRir)})`
              : ""}
          </p>
        </div>
      )}
      {hatPokale && !openPR && (
        <div className="chart-hint">
          Die Pokale markieren Trainings mit einem Rekord in dieser Zahl – antippen zeigt welchen.
        </div>
      )}
      {/* Ein einzelner Punkt ohne Linie sieht aus wie ein Fehler. Er ist
          keiner - in diesem Zeitraum gab es eben nur ein Training. */}
      {activeData.length === 1 && (
        <div className="chart-hint">
          Nur ein Training in diesem Zeitraum – für eine Linie braucht es mindestens zwei.
        </div>
      )}
      {mode === "percent" && hasPercentValues && percentGaps > 0 && (
        // Bewusst nicht "unterbrochene Linie": fehlen die Werte am Anfang der
        // Reihe, ist die Linie nur kürzer und nirgends unterbrochen. Die
        // Aussage, die in beiden Fällen stimmt, ist die über die Trainings.
        <div className="chart-hint">
          {percentGaps === 1 ? "Für ein Training" : `Für ${percentGaps} Trainings`} fehlt in
          dieser Ansicht der Punkt: Es gab kein Training dieser Übung im Abstand von
          „{compareLabel}", gegen das sich vergleichen ließe.
        </div>
      )}
    </div>
  );
}

// Dropdown menus live inside the scrolling content area, which clips them.
// Near the bottom of the screen they would disappear behind the navigation
// bar, so they flip open upwards instead. Measured from the trigger button
// at the moment of opening.
const MENU_SPACE_NEEDED = 300;

// The usable area ends at the top of the navigation bar, not at the bottom
// of the window - measuring against the window let menus slide underneath it.
function usableBottom() {
  // Das Dock zuerst: liegt eine Trainings-Leiste über der Navigation, ist
  // deren Oberkante die eigentliche Grenze, nicht die der Navigation.
  const dock = document.querySelector(".bottom-dock") || document.querySelector(".fab-nav");
  const navTop = dock ? dock.getBoundingClientRect().top : window.innerHeight;
  return Math.min(navTop, window.innerHeight) - 8;
}

// First guess at opening time, so the menu does not visibly jump.
function shouldDropUp(eventTarget) {
  try {
    const btn = eventTarget?.closest?.("button");
    if (!btn) return false;
    return usableBottom() - btn.getBoundingClientRect().bottom < MENU_SPACE_NEEDED;
  } catch (_) {
    return false;
  }
}

// The number of entries varies (superset, automatic mode, ...), so the guess
// above is corrected once the menu is actually on screen and its real height
// is known.
function useMenuFlip(isOpen, setDropUp) {
  const ref = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const check = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      if (rect.bottom > usableBottom()) setDropUp(true);
    };
    check();
    const id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, [isOpen, setDropUp]);
  return ref;
}

// A short beep via the Web Audio API - no audio file to ship, and it can be
// triggered at an exact moment. iOS only allows sound after a user gesture,
// so the context is created when the user taps "Start".
let sharedAudioCtx = null;
function unlockAudio() {
  try {
    // "transient" means: a short signal tone. Music from another app is
    // briefly ducked and continues afterwards. "playback" would announce the
    // beeps as music of our own and stop Spotify entirely - which is exactly
    // what happened before. There is no silent loop either: it held the audio
    // channel permanently and pushed other apps out of the way.
    if (navigator.audioSession) navigator.audioSession.type = "transient";

    // A context iOS has fully closed (not just suspended) is unusable and
    // has to be replaced, not reused - it would silently no-op forever.
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

function releaseAudio() {
  // Nothing to release: no channel is held open any more.
}

// If iOS suspended the audio clock while the screen was off, nothing on it
// fires until something resumes it again - and nothing did that on its own.
// Calling this whenever the app becomes visible (or on the running rest
// timer's own tick) gives a stuck rest tone a chance to still catch up the
// moment the phone is looked at again, instead of staying silent forever.
function resumeAudioIfSuspended() {
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    try { sharedAudioCtx.resume(); } catch (_) {}
  }
}

// A struck-bell timbre - like a boxing round bell - built from several
// inharmonic sine partials instead of one pure tone. A single oscillator
// only ever sounds like a synthesizer beep; a real struck bell/gong has
// several overtones that are NOT whole-number multiples of the fundamental
// (unlike a plucked string) and each rings out at its own speed - higher
// partials fade fastest, which is exactly what gives struck metal its
// characteristic shimmer-then-hum. Ratios and decay times are chosen by
// ear for that "boxing bell", not physically modelled from a real bell.
const BELL_PARTIALS = [
  { ratio: 1,    gain: 1,    decay: 1.5 },
  { ratio: 2.01, gain: 0.55, decay: 1.15 },
  { ratio: 2.76, gain: 0.35, decay: 0.85 },
  { ratio: 4.07, gain: 0.22, decay: 0.6 },
  { ratio: 5.4,  gain: 0.14, decay: 0.42 },
  { ratio: 6.8,  gain: 0.08, decay: 0.3 },
];
const BELL_FUNDAMENTAL = 430;

// Schedules every partial at the given audio-clock time and reports back
// once the longest-ringing one finishes, so callers can tell a completed
// bell from one still open on the clock (or stuck in a suspended context).
function scheduleBell(ctx, atTime, volume, onComplete) {
  const oscillators = [];
  const gains = [];
  let longest = null;
  BELL_PARTIALS.forEach((p) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = BELL_FUNDAMENTAL * p.ratio;
    const peak = Math.max(0.0001, volume * p.gain);
    // A bell is struck, not faded in - a fast linear rise into an
    // exponential decay is what makes the attack read as a hit.
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.linearRampToValueAtTime(peak, atTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + p.decay);
    osc.connect(gain).connect(ctx.destination);
    const stopAt = atTime + p.decay + 0.05;
    osc.start(atTime);
    osc.stop(stopAt);
    oscillators.push(osc);
    gains.push(gain);
    if (!longest || stopAt > longest.stopAt) longest = { osc, stopAt };
  });
  longest.osc.onended = () => onComplete?.();
  return { oscillators, gains };
}

function playBell(volume = 0.6) {
  const ctx = unlockAudio();
  if (!ctx) return;
  try {
    scheduleBell(ctx, ctx.currentTime, volume, () => {});
  } catch (_) { /* sound is optional, never break the workout over it */ }
}

// The rest-end bell is placed on the audio clock the moment the rest starts,
// not fired by a timer when it ends. setInterval is throttled to a standstill
// as soon as the screen goes off or the app moves to the background, so a
// timer-driven tone never arrived. The Web Audio clock keeps its own time, so
// a tone started with a delay still sounds once the clock is running. If iOS
// suspended the clock for the whole rest, resumeAudioIfSuspended() plus the
// completion check in the rest-timer effect are what catch that instead of
// silently trusting that scheduling succeeding earlier means it played.
let pendingRestBeep = null;

function scheduleRestBeep(delaySeconds, volume = 0.6) {
  const ctx = sharedAudioCtx;
  if (!ctx || ctx.state === "closed") return false;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const at = ctx.currentTime + Math.max(0, delaySeconds);
    const handle = scheduleBell(ctx, at, volume, () => {
      if (pendingRestBeep === handle) pendingRestBeep = null;
    });
    pendingRestBeep = handle;
    return true;
  } catch (_) {
    return false;
  }
}

// Skipping or extending a rest has to take the already-scheduled bell back
// off the clock, otherwise it would sound at the original moment anyway.
function cancelRestBeep() {
  if (!pendingRestBeep) return;
  const { oscillators, gains } = pendingRestBeep;
  pendingRestBeep = null;
  oscillators.forEach((osc) => { try { osc.stop(); } catch (_) {} try { osc.disconnect(); } catch (_) {} });
  gains.forEach((gain) => { try { gain.disconnect(); } catch (_) {} });
}

function hasPendingRestBeep() {
  return !!pendingRestBeep;
}

function playBeep({ frequency = 880, duration = 0.18, volume = 0.6 } = {}) {
  const ctx = sharedAudioCtx;
  if (!ctx || ctx.state === "closed") return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    osc.type = "sine";
    // Fade in/out, otherwise the start and end click audibly.
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch (_) { /* sound is optional, never break the workout over it */ }
}

// ---------------------------------------------------------------------------
// Atemübung: geführte Sitzung
// ---------------------------------------------------------------------------

// Baut den Linienverlauf einer kompletten Runde: pro Phase ein Streckenstück,
// dessen Breite der Dauer entspricht und dessen Höhe die Atemrichtung
// abbildet - hoch beim Einatmen, runter beim Ausatmen, waagerecht beim
// Halten. Bei Box Breathing (4 gleich lange Phasen) ergibt das genau die
// namensgebende Kastenform.
//
// Die Höhe wird am Ende auf 0..1 normiert statt fest zugeordnet: eine Übung
// wie der physiologische Seufzer atmet zweimal hintereinander ein und nur
// einmal aus, da würde eine feste Skala oben aus dem Bild laufen.
const BREATHING_OPEN_WIDTH = 8; // Breite einer offenen Phase (Dauer unbekannt)

// Füllstand der Lunge nach jeder Phase: 0 = leer, 1 = voll. levels[0] ist der
// Start (leer), levels[i+1] der Stand nach Phase i.
//
// Aufeinanderfolgende Phasen gleicher Richtung teilen sich den Weg, statt
// jede für sich eine feste Stufe zu gehen. Der physiologische Seufzer atmet
// zweimal hintereinander ein und einmal lang aus - würde jede Phase pauschal
// eine Stufe zählen, käme das Ausatmen nur auf halbe Höhe zurück statt die
// Lunge zu leeren, und die Linie liefe von Runde zu Runde weg.
function breathingLevels(phases) {
  const levels = [0];
  let i = 0;
  while (i < phases.length) {
    const dir = phases[i].direction;
    if (dir !== "in" && dir !== "out") {
      levels.push(levels[levels.length - 1]); // Halten: Stand bleibt
      i += 1;
      continue;
    }
    let run = 0;
    while (i + run < phases.length && phases[i + run].direction === dir) run += 1;
    const start = levels[levels.length - 1];
    const target = dir === "in" ? 1 : 0;
    for (let j = 1; j <= run; j++) levels.push(start + (target - start) * (j / run));
    i += run;
  }
  return levels;
}

function buildBreathingPath(phases) {
  if (!phases.length) return [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  const widths = phases.map((p) =>
    p.seconds == null ? BREATHING_OPEN_WIDTH : Math.max(0.5, toNum(p.seconds))
  );
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const levels = breathingLevels(phases);
  let x = 0;
  const points = [{ x: 0, y: levels[0] }];
  widths.forEach((w, i) => {
    x += w / total;
    points.push({ x, y: levels[i + 1] });
  });
  return points;
}

function BreathingSessionView({ session, onFinish, onCancel }) {
  const { exercise } = session;
  const phases = breathingPhases(exercise);
  const totalRounds = breathingRounds(exercise);
  const isCircle = exercise.display === "circle";

  const [round, setRound] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseStart, setPhaseStart] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const phase = phases[phaseIndex] || null;
  const isOpen = phase ? phase.seconds == null : false;
  const phaseSeconds = phase && !isOpen ? Math.max(0.1, toNum(phase.seconds)) : 0;
  const elapsed = Math.max(0, ((paused ? pausedAt : now) - phaseStart) / 1000);
  const progress = isOpen ? 0 : Math.min(1, elapsed / phaseSeconds);

  // Offene Phasen (z.B. eine Wim-Hof-Retention) haben keine vorgegebene
  // Dauer - wie lange sie tatsächlich gedauert haben, bevor "Weiter" getippt
  // wurde, ist selbst die interessante Kennzahl. Der längste Wert der ganzen
  // Sitzung wandert ins Protokoll ("maximale Atemanhaltedauer").
  const maxOpenSecondsRef = useRef(0);

  // Eine Referenz auf den aktuellen Zustand, damit die Animationsschleife
  // nicht bei jedem Frame neu aufgebaut werden muss.
  const advanceRef = useRef(null);
  const goNext = () => {
    if (isOpen) maxOpenSecondsRef.current = Math.max(maxOpenSecondsRef.current, elapsed);
    const nextIndex = phaseIndex + 1;
    // Vibriert für die Phase, die hier gerade endet - egal ob per Timer oder
    // per Tippen auf "Weiter" bei einer offenen Phase. Die letzte Phase der
    // letzten Runde bekommt das kräftigere Ende-Muster statt des normalen.
    if (phase?.vibrate && navigator.vibrate) {
      const isExerciseEnd = nextIndex >= phases.length && round >= totalRounds;
      try {
        navigator.vibrate(isExerciseEnd ? BREATHING_EXERCISE_END_VIBRATION : BREATHING_PHASE_VIBRATION);
      } catch (_) {}
    }
    if (nextIndex < phases.length) {
      setPhaseIndex(nextIndex);
      setPhaseStart(Date.now());
      return;
    }
    if (round < totalRounds) {
      setRound(round + 1);
      setPhaseIndex(0);
      setPhaseStart(Date.now());
      return;
    }
    onFinish({ ...session, completedRounds: totalRounds, maxHoldSeconds: maxOpenSecondsRef.current });
  };
  advanceRef.current = goNext;

  useEffect(() => {
    if (paused) return;
    let raf = null;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [paused]);

  // Der Phasenwechsel hängt am gemessenen Fortschritt, nicht an einem
  // eigenen Timer: so bleibt die Anzeige und der Wechsel garantiert
  // synchron, auch wenn ein Frame mal ausfällt.
  useEffect(() => {
    if (paused || isOpen || !phase) return;
    if (elapsed >= phaseSeconds) advanceRef.current?.();
  }, [now, paused, isOpen, phase, elapsed, phaseSeconds]);

  const togglePause = () => {
    if (paused) {
      // Die im Pausenzustand vergangene Zeit darf nicht als Phasenfortschritt
      // zählen, deshalb wandert der Startzeitpunkt mit.
      setPhaseStart(Date.now() - (pausedAt - phaseStart));
      setPaused(false);
    } else {
      setPausedAt(Date.now());
      setPaused(true);
    }
  };

  const path = useMemo(() => buildBreathingPath(phases), [phases]);
  const levels = useMemo(() => breathingLevels(phases), [phases]);
  if (!phase) return null;

  const polyline = path.map((p) => `${(p.x * 100).toFixed(2)},${((1 - p.y) * 100).toFixed(2)}`).join(" ");
  const from = path[phaseIndex] || path[0];
  const to = path[phaseIndex + 1] || from;
  const dotX = from.x + (to.x - from.x) * (isOpen ? 1 : progress);
  const dotY = from.y + (to.y - from.y) * (isOpen ? 1 : progress);

  // Der Kreis folgt demselben Füllstand wie die Linie - beide Darstellungen
  // zeigen dieselbe Übung, nur anders gezeichnet.
  const startLevel = levels[phaseIndex] ?? 0;
  const endLevel = levels[phaseIndex + 1] ?? startLevel;
  const level = startLevel + (endLevel - startLevel) * (isOpen ? 1 : progress);
  const circleScale = 0.35 + 0.65 * level;

  const remaining = isOpen ? elapsed : Math.max(0, phaseSeconds - elapsed);
  const timeLabel = isOpen
    ? `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`
    : String(Math.ceil(remaining));

  return (
    <div className="breathing-overlay">
      <div className="breathing-head">
        <div style={{ minWidth: 0 }}>
          <div className="breathing-title">{exercise.name}</div>
          <div className="breathing-round">Runde {round} von {totalRounds}</div>
        </div>
        <button className="btn-icon" onClick={onCancel} title="Beenden">
          <X size={18} />
        </button>
      </div>

      {/* Bei einer offenen Phase (z. B. Luft anhalten) genügt ein Tipp
          irgendwo in die Mitte, um weiterzuschalten - man liegt dabei oft
          mit geschlossenen Augen und trifft keinen Knopf. Getaktete Phasen
          bleiben unberührt: Sie laufen von selbst ab, und ein versehentlicher
          Tipp würde die Übung verkürzen. */}
      <div
        className={`breathing-stage ${isOpen ? "is-tappable" : ""}`}
        onClick={isOpen ? () => advanceRef.current?.() : undefined}
        role={isOpen ? "button" : undefined}
        title={isOpen ? "Antippen: nächste Phase" : undefined}
      >
        {isCircle ? (
          <div className="breathing-circle-wrap">
            <span
              className="breathing-circle"
              style={{ transform: `scale(${circleScale.toFixed(3)})` }}
            />
            <span className="breathing-circle-ring" />
          </div>
        ) : (
          // Der Punkt liegt als eigenes Element über der Grafik statt als
          // SVG-Kreis darin: die Linie wird in die Breite gezogen
          // (preserveAspectRatio "none"), ein Kreis im selben Koordinaten-
          // system würde genauso mitgezogen und als Ei erscheinen.
          <div className="breathing-line-wrap">
            <svg className="breathing-line" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={polyline} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <span
              className="breathing-dot"
              style={{ left: `${(dotX * 100).toFixed(2)}%`, top: `${((1 - dotY) * 100).toFixed(2)}%` }}
            />
          </div>
        )}
      </div>

      <div className="breathing-phase">{phase.label || BREATHING_DIRECTIONS.find((d) => d.id === phase.direction)?.label}</div>
      <div className="breathing-time">{timeLabel}</div>
      {isOpen && <div className="breathing-tap-hint">Zum Weiterschalten in die Mitte tippen</div>}

      <div className="breathing-controls">
        {isOpen ? (
          <button className="btn btn-primary btn-block" onClick={() => advanceRef.current?.()}>
            Weiter <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn btn-ghost btn-block" onClick={togglePause}>
            {paused ? <><Play size={15} /> Fortsetzen</> : <><Timer size={15} /> Pause</>}
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm btn-block"
          style={{ marginTop: 8 }}
          onClick={() => {
            // Wird mitten in einer offenen Phase abgebrochen, zählt der bis
            // dahin gehaltene Atem noch mit - das war schließlich der
            // tatsächliche Versuch, auch wenn er nie per "Weiter" bestätigt wurde.
            const finalMax = isOpen ? Math.max(maxOpenSecondsRef.current, elapsed) : maxOpenSecondsRef.current;
            onFinish({ ...session, completedRounds: round - 1, maxHoldSeconds: finalMax });
          }}
        >
          <Check size={14} /> Vorzeitig beenden & speichern
        </button>
      </div>
    </div>
  );
}

// Editor für eine Atemübung: Phasen frei zusammenstellbar, jede mit Name,
// Richtung und Dauer - oder "offen", wenn die Dauer nicht vorher feststeht.
// Formular zum NACHTRAGEN einer Atemübung. Wird an zwei Stellen benutzt: im
// Kalender für einen beliebigen Tag und direkt nach dem Speichern eines
// Trainings für heute.
//
// Warum es das braucht: Ein Atem-Protokoll entstand bis Sept. 2026
// ausschließlich am Ende einer in der App gelaufenen Sitzung, mit dem
// Zeitstempel "jetzt". Wer frei atmet - nach dem Training oder beim Laufen,
// ohne Telefon in der Hand - konnte das nirgends festhalten. Ein geplanter
// Kalendereintrag half nicht: Der bleibt ohne Protokoll für immer "offen" und
// taucht in keiner Statistik auf.
function BreathingLogForm({ breathingExercises = [], dateLabel, onSave, onCancel }) {
  const [pickedId, setPickedId] = useState(breathingExercises[0]?.id || "frei");
  const [freeName, setFreeName] = useState("");
  // Die Dauer ist schon beim Öffnen vorbelegt, nicht erst beim Umschalten -
  // sonst steht das Feld leer da, obwohl oben bereits eine Übung ausgewählt
  // ist, und der häufigste Fall (Übung wie geplant gemacht) kostet trotzdem
  // eine Eingabe.
  const [minutes, setMinutes] = useState(() => {
    const total = breathingExercises[0] ? breathingTotalSeconds(breathingExercises[0]) : null;
    return total == null ? "" : String(Math.max(1, Math.round(total / 60)));
  });
  const [holdSeconds, setHoldSeconds] = useState("");
  const picked = breathingExercises.find((b) => b.id === pickedId) || null;
  // Hat die gewählte Übung eine offene Phase, ist die Anhaltedauer die
  // eigentlich interessante Zahl - dann wird das Feld auch gezeigt.
  const hasOpenPhase = picked
    ? breathingPhases(picked).some((ph) => ph.seconds == null)
    : true;

  // Beim Wechsel der Übung die Dauer vorbelegen: die geplante Gesamtzeit der
  // Übung ist fast immer die richtige Antwort, korrigiert wird nur der
  // Ausnahmefall.
  const choose = (id) => {
    setPickedId(id);
    const ex = breathingExercises.find((b) => b.id === id) || null;
    const total = ex ? breathingTotalSeconds(ex) : null;
    setMinutes(total == null ? "" : String(Math.max(1, Math.round(total / 60))));
  };

  const gueltig = toNum(minutes) > 0 && (picked || freeName.trim() || pickedId === "frei");
  return (
    <>
      <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
        Wird als absolvierte Sitzung für {dateLabel} gespeichert und zählt in
        allen Atem-Statistiken mit.
      </p>
      <label className="field-label">Übung</label>
      <div className="chip-row chip-row-wrap" style={{ marginTop: 6, marginBottom: 10 }}>
        {breathingExercises.map((b) => (
          <span
            key={b.id}
            className={`chip chip-sm ${pickedId === b.id ? "active" : ""}`}
            onClick={() => choose(b.id)}
          >
            {b.name}
          </span>
        ))}
        <span
          className={`chip chip-sm ${pickedId === "frei" ? "active" : ""}`}
          onClick={() => choose("frei")}
        >
          Frei geatmet
        </span>
      </div>

      {pickedId === "frei" && (
        <>
          <label className="field-label">Bezeichnung (optional)</label>
          <input
            type="text"
            placeholder="z. B. Nach dem Laufen"
            value={freeName}
            onChange={(e) => setFreeName(e.target.value)}
            style={{ marginBottom: 10 }}
          />
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="field-label">Dauer (Min.)</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="z. B. 5"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        {hasOpenPhase && (
          <div style={{ flex: 1 }}>
            <label className="field-label">Längste Anhaltedauer (Sek.)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="optional"
              value={holdSeconds}
              onChange={(e) => setHoldSeconds(e.target.value)}
            />
          </div>
        )}
      </div>

      <button
        className="btn btn-primary btn-block btn-sm"
        style={{ marginTop: 14 }}
        disabled={!gueltig}
        onClick={() =>
          onSave({
            breathingId: picked ? picked.id : null,
            name: picked ? picked.name : freeName.trim() || "Freie Atemübung",
            minutes: toNum(minutes),
            holdSeconds: toNum(holdSeconds),
          })
        }
      >
        <Check size={14} /> Nachtragen
      </button>
      {onCancel && (
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 8 }} onClick={onCancel}>
          Abbrechen
        </button>
      )}
    </>
  );
}

function BreathingEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [rounds, setRounds] = useState(String(initial?.rounds ?? 4));
  const [display, setDisplay] = useState(initial?.display || "line");
  // Zentraler Schalter: setzt beim Umschalten alle Phasen auf denselben Wert
  // (siehe toggleVibrateDefault) und ist der Startwert für neu hinzugefügte
  // Phasen - ist aber selbst kein "lebender" Aggregatwert, der bei
  // individuellem Abweichen einzelner Phasen automatisch nachgeführt wird.
  const [vibrateOnPhaseEnd, setVibrateOnPhaseEnd] = useState(!!initial?.vibrateOnPhaseEnd);
  const [phases, setPhases] = useState(
    initial?.phases?.length
      ? initial.phases.map((p) => ({ ...p, seconds: p.seconds == null ? "" : String(p.seconds), vibrate: !!p.vibrate }))
      : [{ label: "Einatmen", direction: "in", seconds: "4", vibrate: false }]
  );

  const updatePhase = (idx, patch) =>
    setPhases(phases.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const addPhase = () =>
    setPhases([...phases, { label: "", direction: "hold", seconds: "4", vibrate: vibrateOnPhaseEnd }]);
  const removePhase = (idx) => setPhases(phases.filter((_, i) => i !== idx));
  const movePhase = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= phases.length) return;
    const next = [...phases];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPhases(next);
  };
  const toggleVibrateDefault = () => {
    const next = !vibrateOnPhaseEnd;
    setVibrateOnPhaseEnd(next);
    setPhases(phases.map((p) => ({ ...p, vibrate: next })));
  };

  const canSave = name.trim() && phases.length > 0;
  const save = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id || uid(),
      name: name.trim(),
      display,
      rounds: Math.max(1, toNum(rounds) || 1),
      vibrateOnPhaseEnd,
      phases: phases.map((p) => ({
        label: p.label.trim() || BREATHING_DIRECTIONS.find((d) => d.id === p.direction)?.label || "Phase",
        direction: p.direction,
        // Leeres Feld heißt bewusst "offen" - das ist die Wim-Hof-Phase,
        // bei der man selbst weitertippt statt einem Countdown zu folgen.
        // Kommazahlen sind erlaubt (toNum wandelt "4,5" -> 4.5), die
        // Session-Anzeige läuft ohnehin über echte Sekundenbruchteile.
        seconds: String(p.seconds).trim() === "" ? null : Math.max(1, toNum(p.seconds) || 1),
        vibrate: !!p.vibrate,
      })),
    });
  };

  return (
    <>
      <label className="field-label">Name</label>
      <input type="text" placeholder="z. B. Box Breathing" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="field-label" style={{ marginTop: 12 }}>Darstellung</label>
      <div className="chip-row" style={{ marginTop: 4, marginBottom: 4 }}>
        {BREATHING_DISPLAYS.map((d) => (
          <span
            key={d.id}
            className={`chip chip-sm ${display === d.id ? "active" : ""}`}
            onClick={() => setDisplay(d.id)}
          >
            {d.label}
          </span>
        ))}
      </div>

      <label className="time-toggle-row" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={vibrateOnPhaseEnd} onChange={toggleVibrateDefault} />
        Vibration am Ende jeder Phase
      </label>

      <label className="field-label" style={{ marginTop: 8 }}>Phasen</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {phases.map((p, idx) => (
          <div className="breathing-phase-row" key={idx}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span className="set-num" style={{ minWidth: 16 }}>{idx + 1}</span>
              <input
                type="text"
                placeholder="Bezeichnung (optional)"
                value={p.label}
                onChange={(e) => updatePhase(idx, { label: e.target.value })}
                style={{ flex: 1 }}
              />
              <button className="btn-icon" title="Nach oben" onClick={() => movePhase(idx, -1)}>
                <ChevronRight size={14} style={{ transform: "rotate(-90deg)" }} />
              </button>
              <button className="btn-icon" title="Nach unten" onClick={() => movePhase(idx, 1)}>
                <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} />
              </button>
              <button className="btn-icon" title="Phase entfernen" onClick={() => removePhase(idx)}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="chip-row" style={{ marginBottom: 6 }}>
              {BREATHING_DIRECTIONS.map((d) => (
                <span
                  key={d.id}
                  className={`chip chip-sm ${p.direction === d.id ? "active" : ""}`}
                  onClick={() => updatePhase(idx, { direction: d.id })}
                >
                  {d.label}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Sekunden"
                value={p.seconds}
                onChange={(e) => updatePhase(idx, { seconds: e.target.value })}
                style={{ flex: 1 }}
              />
              <span
                className={`chip chip-sm ${String(p.seconds).trim() === "" ? "active" : ""}`}
                onClick={() => updatePhase(idx, { seconds: String(p.seconds).trim() === "" ? "4" : "" })}
                title="Offene Phase: kein Countdown, du tippst selbst auf Weiter"
              >
                Offen
              </span>
            </div>
            <label className="time-toggle-row" style={{ marginTop: 6, fontSize: 12.5 }}>
              <input
                type="checkbox"
                checked={!!p.vibrate}
                onChange={(e) => updatePhase(idx, { vibrate: e.target.checked })}
              />
              Vibration am Ende dieser Phase
            </label>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={addPhase}>
        <Plus size={14} /> Phase hinzufügen
      </button>

      <label className="field-label" style={{ marginTop: 12 }}>Runden</label>
      <input type="text" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} />

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn btn-ghost btn-block" onClick={onCancel}>
          <X size={14} /> Abbrechen
        </button>
        <button className="btn btn-primary btn-block" disabled={!canSave} onClick={save}>
          <Save size={14} /> Speichern
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Popup used for every "pick something" step: folders, equipment, rest times,
// calendar entries. Previously these opened inline and pushed the rest of the
// page around; a popup keeps the context still and, crucially, keeps a scroll
// gesture inside itself instead of moving the page behind it.
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children, width = 360 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Freezing the page behind the popup stops a swipe that runs past the end
    // of the popup from scrolling the list underneath.
    const content = document.querySelector(".content");
    const previous = content ? content.style.overflow : null;
    if (content) content.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (content) content.style.overflow = previous || "";
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose} title="Schließen">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// A tiny inline trend line - no axes, no tooltip, just the shape of the last
// few weeks at a glance. Plain SVG rather than recharts: a chart this small
// doesn't need an interactive library, and it stays legible even with only
// one or two non-zero weeks in the series.
// viewWidth ist eine beliebige interne Einheit, keine Pixelgröße - die
// viewBox streckt sich per width="100%" auf die tatsächliche Breite der
// Grid-Spalte (vorher: feste 64px in einer 1fr-Spalte, die auf den meisten
// Handys 130-150px breit ist - der Rest blieb toter Raum). preserveAspectRatio
// "none" erlaubt genau dieses Strecken, vectorEffect="non-scaling-stroke"
// verhindert, dass die Linie dabei unterschiedlich dick wird.
function Sparkline({ values, height = 24 }) {
  const list = Array.isArray(values) ? values : [];
  const max = Math.max(0, ...list);
  const viewWidth = 100;
  if (list.length < 2 || max <= 0) {
    return (
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        className="sparkline sparkline-empty"
        aria-hidden="true"
      >
        <line x1={2} y1={height / 2} x2={viewWidth - 2} y2={height / 2} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const stepX = (viewWidth - 4) / (list.length - 1);
  const points = list
    .map((v, i) => {
      const x = 2 + i * stepX;
      const y = height - 2 - (Math.max(0, v) / max) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className="sparkline"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Überschrift einer Statistik-Karte, hinter der eine Erklärung steckt
// (siehe STAT_EXPLANATIONS). Als <button>, nicht als <span> mit onClick,
// damit sie auch per Tastatur erreichbar ist und Screenreader sie als
// bedienbar ansagen.
function ExplainableTitle({ children, onExplain }) {
  return (
    <button
      type="button"
      className="plan-title-explain"
      onClick={onExplain}
      title="Antippen: Was steht hier und wie wird es gerechnet?"
    >
      <span className="plan-title">{children}</span>
      <Info size={14} className="plan-title-info" />
    </button>
  );
}

// change is a percentage (can be negative), or null when there is no
// history yet to compare against - that is not the same as 0 % and reads
// as a dash instead of a misleading "unchanged".
function LoadChangeBadge({ change }) {
  if (change === null) {
    return <span className="load-change load-change-neutral">–</span>;
  }
  const rounded = Math.round(change);
  const cls = rounded > 0 ? "load-change-up" : rounded < 0 ? "load-change-down" : "load-change-neutral";
  const sign = rounded > 0 ? "+" : "";
  return <span className={`load-change ${cls}`}>{sign}{rounded}%</span>;
}

// Warn-Icon für detectLoadSignal: Plateau (Minus), weicher Belastungs-
// Hinweis oder harter Überlastungs-Alarm (beide AlertTriangle, nur Farbe/
// Text unterschiedlich). Rendert bei fehlendem Signal einen leeren
// Platzhalter statt null, damit die Grid-Spalte in der Muskelgruppen-/
// Übungs-Zeile nicht je nach Zustand springt.
function LoadSignalBadge({ signal }) {
  if (!signal) return <span className="load-signal load-signal-empty" aria-hidden="true" />;
  if (signal.type === "overload") {
    return (
      <span
        className="load-signal load-signal-overload"
        title="Belastung deutlich über dem Schnitt der letzten Wochen – Risiko für Überlastung"
      >
        <AlertTriangle size={14} />
      </span>
    );
  }
  if (signal.type === "overload-watch") {
    return (
      <span
        className="load-signal load-signal-watch"
        title="Belastung spürbar über dem Schnitt der letzten Wochen – im Auge behalten"
      >
        <AlertTriangle size={14} />
      </span>
    );
  }
  return (
    <span
      className="load-signal load-signal-plateau"
      title="Seit mehreren Wochen keine Steigerung – möglicherweise ein Plateau"
    >
      <Minus size={14} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Progress view
// ---------------------------------------------------------------------------

function ProgressView({
  logs,
  plans = [],
  folders = [],
  exBy,
  exercises,
  theme,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  timeBasedExercises,
  gymIndependentExercises,
  bodyWeights = [],
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onToggleGymIndependent,
  gyms = [],
  onResumeLog,
  focusLogId,
  onFocusHandled,
  breathingExercises = [],
  breathingLogs = [],
  deloadWeeks = [],
  deloadInterval = null,
  onSetDeloadInterval,
  onSetDeloadGuess,
}) {
  const [progressTab, setProgressTab] = useState(focusLogId ? "history" : "stats");
  useEffect(() => {
    if (focusLogId) setProgressTab("history");
  }, [focusLogId]);


  const exerciseIdsWithData = useMemo(() => {
    const ids = new Set();
    logs.forEach((l) => logEntries(l).forEach((e) => ids.add(e.exerciseId)));
    return Array.from(ids).filter((id) => !!exBy[id]);
  }, [logs, exBy]);

  // Nothing is charted until it is asked for: opening the tab used to expand
  // up to four charts for whichever exercise happened to be first, which is
  // rarely the one being looked for.
  const [selected, setSelected] = useState("");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;

  useEffect(() => {
    if (selected && !exerciseIdsWithData.includes(selected)) setSelected("");
  }, [exerciseIdsWithData, selected]);

  const searchResults = useMemo(() => {
    const needle = exerciseQuery.trim().toLowerCase();
    if (!needle) return [];
    return exerciseIdsWithData
      .filter((id) => (exBy[id]?.name || "").toLowerCase().includes(needle))
      .sort((a, b) => (exBy[a]?.name || "").localeCompare(exBy[b]?.name || "", "de"))
      .slice(0, 12);
  }, [exerciseQuery, exerciseIdsWithData, exBy]);

  const subTabs = (
    <div className="sub-tab-row">
      <button
        className={`sub-tab ${progressTab === "stats" ? "active" : ""}`}
        onClick={() => setProgressTab("stats")}
      >
        <TrendingUp size={14} /> Statistik
      </button>
      <button
        className={`sub-tab ${progressTab === "history" ? "active" : ""}`}
        onClick={() => setProgressTab("history")}
      >
        <Calendar size={14} /> Verlauf
      </button>
      <button
        className={`sub-tab ${progressTab === "breathing" ? "active" : ""}`}
        onClick={() => setProgressTab("breathing")}
      >
        <Wind size={14} /> Atem
      </button>
    </div>
  );

  const stats = useMemo(() => getBest1RMOverall(logs, exBy, timeBasedExercises), [logs, exBy, timeBasedExercises]);
  const feelingPerformance = useMemo(
    () => getFeelingPerformance(logs, timeBasedExercises, deloadWeeks, {
      exBy, equipmentOverrides: exerciseEquipmentOverrides, bodyWeights,
    }),
    [logs, timeBasedExercises, deloadWeeks, exBy, exerciseEquipmentOverrides, bodyWeights]
  );
  const calibration = useMemo(() => getCalibration(logs), [logs]);
  // Rekorde der letzten 7 Tage statt eines Lebenszeit-Zaehlers. Gezaehlt wird
  // mit derselben Funktion wie die Abzeichen im Training (countLogPRs) - die
  // trennt nach Gym, wie der Rest der App auch, und die Zahl passt damit zu
  // dem, was man beim Trainieren gesehen hat.
  const recentPRs = useMemo(
    () => getRecentPRs(logs, exBy, timeBasedExercises, gymIndependentExercises, 7),
    [logs, exBy, timeBasedExercises, gymIndependentExercises]
  );
  // Ist die Liste hinter der Rekord-Kachel aufgeschlagen?
  const [recentPRsOpen, setRecentPRsOpen] = useState(false);
  const deloadInfo = useMemo(
    () => deloadStatus(deloadWeeks, deloadInterval),
    [deloadWeeks, deloadInterval]
  );
  const deloadEffects = useMemo(
    () => getDeloadEffects(logs, deloadWeeks, timeBasedExercises, Date.now(), {
      exBy, equipmentOverrides: exerciseEquipmentOverrides, bodyWeights,
    }),
    [logs, deloadWeeks, timeBasedExercises, exBy, exerciseEquipmentOverrides, bodyWeights]
  );
  const deloadGuessOf = (start) =>
    deloadRanges(deloadWeeks).find((r) => r.start === start)?.guess || null;

  // Folders can be marked "ohne Statistik" (e.g. EMOM/Conditioning) so their
  // sets don't dilute "Sätze pro Muskelgruppe" - that card is deliberately a
  // pure hypertrophy-set counter. "Belastung pro Muskelgruppe" answers a
  // different question (overall load / steady progression), and an EMOM set
  // is real load regardless of training goal, so it keeps using every log.
  // PRs, "Letztes Mal", the per-exercise charts and Verlauf are unaffected
  // either way.
  const excludedFolderIds = useMemo(
    () => new Set(folders.filter((f) => f.statsExcluded).map((f) => f.id)),
    [folders]
  );
  const excludedPlanIds = useMemo(
    () => new Set(plans.filter((p) => p.folderId && excludedFolderIds.has(p.folderId)).map((p) => p.id)),
    [plans, excludedFolderIds]
  );
  const hypertrophyLogs = useMemo(
    () => (excludedPlanIds.size === 0 ? logs : logs.filter((l) => !l.planId || !excludedPlanIds.has(l.planId))),
    [logs, excludedPlanIds]
  );

  // Grenze für den Vergleichszeitraum - siehe logsHistoryWeeks. Muss vor der
  // Serie berechnet werden, weil deren Länge jetzt von der echten Historie
  // abhängt (wegen "Gesamt" in MUSCLE_COMPARE_OPTIONS).
  const setsHistoryWeeks = useMemo(() => logsHistoryWeeks(hypertrophyLogs), [hypertrophyLogs]);
  // Weekly set count per muscle group - the number that actually steers
  // hypertrophy training, and the one gap that showed up when looking at
  // what the app already knows but never displays. weekCount deckt jetzt
  // immer mindestens 52 Wochen ab, plus die komplette echte Historie für
  // die Chip-Option "Gesamt".
  const weeklySetSeries = useMemo(
    () => getWeeklySetSeries(hypertrophyLogs, exBy, exerciseSubgroupOverrides, muscleSeriesWeekCount(setsHistoryWeeks)),
    [hypertrophyLogs, exBy, exerciseSubgroupOverrides, setsHistoryWeeks]
  );
  // Same shape as the old single-window version (g.sets/sg.sets) so the
  // existing render code keeps working, plus .values for sparkline/badge/
  // full chart.
  const weeklySetsByGroup = useMemo(
    () => weeklySetSeries.map((g) => ({
      id: g.id,
      label: g.label,
      sets: g.current,
      values: g.values,
      subs: g.subs.map((sg) => ({ id: sg.id, label: sg.label, sets: sg.current, values: sg.values })),
    })),
    [weeklySetSeries]
  );
  const weeklySetsTotal = weeklySetsByGroup.reduce((sum, g) => sum + g.sets, 0);
  const [setsCompareWeeks, setSetsCompareWeeks] = useState(1);
  // Welche Karten-Erklärung gerade offen ist (siehe STAT_EXPLANATIONS) -
  // null heißt: keine.
  const [explain, setExplain] = useState(null);
  // Herkunft des besten geschätzten 1RM, sobald die Kachel angetippt wurde.
  const [best1RMInfo, setBest1RMInfo] = useState(null);
  // Mit welchem Reiter das Übungs-Fenster aufgeht. Wird beim Öffnen gesetzt,
  // damit „Verlauf dieser Übung ansehen" auch dort landet.
  const [exerciseSheetTab, setExerciseSheetTab] = useState("stats");
  // Collapsed by default - opening a group is a deliberate look at detail,
  // not something that should greet you on every visit to the tab.
  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleGroupExpanded = (id) =>
    setExpandedGroups((s) => ({ ...s, [id]: !s[id] }));
  // Tapping a muscle group opens a full chart (axes + tooltip) of its
  // weekly set history - the sparkline next to it is deliberately minimal.
  // Gezoomt auf setsCompareWeeks (dieselbe Auswahl wie die Chips über der
  // Liste), damit das Chart genau den Zeitraum zeigt, der gerade ausgewählt
  // ist - inklusive "Gesamt", das die komplette Reihe unverändert liefert.
  const [chartGroup, setChartGroup] = useState(null);
  const chartColors = useChartColors(theme);
  const chartGroupData = useMemo(() => {
    if (!chartGroup) return [];
    const zoomed = compareWindowSeries(chartGroup.values, setsCompareWeeks);
    const weekCount = zoomed.length;
    return zoomed.map((v, i) => {
      const weeksAgo = weekCount - 1 - i;
      const ts = Date.now() - weeksAgo * LOAD_WEEK_MS;
      return { date: fmtDate(new Date(ts).toISOString()), sets: v };
    });
  }, [chartGroup, setsCompareWeeks]);

  // Grenze für den Vergleichszeitraum - siehe logsHistoryWeeks. Muss vor der
  // Serie berechnet werden, weil deren Länge jetzt von der echten Historie
  // abhängt (wegen "Gesamt" in MUSCLE_COMPARE_OPTIONS).
  const loadHistoryWeeks = useMemo(() => logsHistoryWeeks(logs), [logs]);
  // Belastung pro Muskelgruppe - siehe getMuscleLoadSeries für die Herleitung
  // der Formel. weekCount deckt jetzt immer mindestens 52 Wochen ab, plus die
  // komplette echte Historie für die Chip-Option "Gesamt".
  const muscleLoadSeries = useMemo(
    () => getMuscleLoadSeries(
      logs, exBy, exerciseSubgroupOverrides, timeBasedExercises,
      muscleSeriesWeekCount(loadHistoryWeeks), Date.now(),
      { equipmentOverrides: exerciseEquipmentOverrides, bodyWeights }
    ),
    [logs, exBy, exerciseSubgroupOverrides, timeBasedExercises, loadHistoryWeeks,
     exerciseEquipmentOverrides, bodyWeights]
  );
  // Kraft gegen Volumen (siehe getStrengthVolumeSeries). Je Muskelgruppe
  // zusammengefasst, mit den Übungen darunter beim Aufklappen.
  const [svCompareWeeks, setSvCompareWeeks] = useState(12);
  const strengthVolume = useMemo(() => {
    const weekCount = muscleSeriesWeekCount(loadHistoryWeeks);
    const perEx = getStrengthVolumeSeries(logs, weekCount);
    const leer = () => new Array(weekCount).fill(0);
    const gruppen = {};
    Object.entries(perEx).forEach(([exId, reihen]) => {
      const ex = exBy[exId];
      if (!ex?.group) return;
      // Ohne Gewicht gibt es keine Kraftzahl - Körpergewichts- und
      // Bandübungen bleiben hier außen vor, statt mit einer 0 zu behaupten,
      // die Kraft sei weg.
      const bestStrength = Math.max(0, ...reihen.strength);
      if (!(bestStrength > 0)) return;
      const g =
        gruppen[ex.group] ||
        (gruppen[ex.group] = { relSum: leer(), relCount: leer(), volume: leer(), exercises: [] });
      // Kraft je Übung an ihrem EIGENEN Bestwert gemessen, bevor gemittelt
      // wird: Sonst bestimmte die Beinpresse mit 200 kg allein, wie sich die
      // "Kraft der Beine" entwickelt, und der Beinstrecker käme nicht vor.
      reihen.strength.forEach((v, i) => {
        if (v > 0) {
          g.relSum[i] += v / bestStrength;
          g.relCount[i] += 1;
        }
      });
      reihen.volume.forEach((v, i) => { g.volume[i] += v; });
      g.exercises.push({
        id: exId,
        name: ex.name,
        strength: halfPeriodChange(reihen.strength, svCompareWeeks),
        volume: halfPeriodChange(reihen.volume, svCompareWeeks),
      });
    });
    return MUSCLE_GROUPS.map((mg) => {
      const g = gruppen[mg.id];
      if (!g) return { id: mg.id, label: mg.label, strength: null, volume: null, exercises: [] };
      const kraftReihe = g.relSum.map((sum, i) => (g.relCount[i] > 0 ? sum / g.relCount[i] : 0));
      return {
        id: mg.id,
        label: mg.label,
        strengthSeries: kraftReihe,
        volumeSeries: g.volume,
        strength: halfPeriodChange(kraftReihe, svCompareWeeks),
        volume: halfPeriodChange(g.volume, svCompareWeeks),
        exercises: g.exercises.sort((a, b) => a.name.localeCompare(b.name, "de")),
      };
    }).filter((g) => g.exercises.length > 0);
  }, [logs, exBy, loadHistoryWeeks, svCompareWeeks]);
  const [expandedSvGroups, setExpandedSvGroups] = useState({});
  const toggleSvGroup = (id) => setExpandedSvGroups((s) => ({ ...s, [id]: !s[id] }));

  // Entlastungswochen als Lücke behandeln - aber nur in den Warnzeichen,
  // nicht in den frei gewählten Zeitraum-Vergleichen (siehe muscleLoadChange).
  const loadDeloadFlags = useMemo(
    () => deloadWeekFlags(deloadWeeks, muscleLoadSeries[0]?.values?.length || 0),
    [deloadWeeks, muscleLoadSeries]
  );
  const [loadCompareWeeks, setLoadCompareWeeks] = useState(1);
  const [expandedLoadGroups, setExpandedLoadGroups] = useState({});
  const toggleLoadGroupExpanded = (id) =>
    setExpandedLoadGroups((s) => ({ ...s, [id]: !s[id] }));
  // Wie bei "Sätze pro Muskelgruppe": Tippen auf eine Zeile öffnet ein
  // Vollbild-Chart, gezoomt auf loadCompareWeeks.
  const [loadChartGroup, setLoadChartGroup] = useState(null);
  // Der Maßstab der rechten Achse: derselbe Schnitt, gegen den auch die
  // Prozentzahl neben der Muskelgruppe in der Liste rechnet (muscleLoadBasis).
  // Deshalb steht am rechten Ende der gestrichelten Linie genau diese Zahl.
  const loadChartBasis = useMemo(
    () => (loadChartGroup ? muscleLoadBasis(loadChartGroup.values, loadCompareWeeks, loadHistoryWeeks) : null),
    [loadChartGroup, loadCompareWeeks, loadHistoryWeeks]
  );
  const loadChartGroupData = useMemo(() => {
    if (!loadChartGroup) return [];
    const zoomed = compareWindowSeries(loadChartGroup.values, loadCompareWeeks);
    const weekCount = zoomed.length;
    // Der Ausschnitt beginnt weiter hinten in der vollen Reihe - ohne diesen
    // Versatz läge die Markierung bei jedem anderen Zeitraum auf der
    // falschen Woche.
    const offset = loadChartGroup.values.length - weekCount;
    return zoomed.map((v, i) => {
      const weeksAgo = weekCount - 1 - i;
      const ts = Date.now() - weeksAgo * LOAD_WEEK_MS;
      // Abstand zum Schnitt des Vergleichszeitraums - die zweite Linie auf
      // der rechten Achse. Jeder Punkt wird gegen DENSELBEN Schnitt gestellt,
      // nicht gegen seine eigene Vorwoche: So liest sich die Linie als "wie
      // weit über oder unter dem Üblichen lag diese Woche", und der letzte
      // Punkt ist die Zahl aus der Übersicht.
      // null (nicht 0) heißt "nicht berechenbar" - in den Vergleichswochen
      // wurde gar nichts trainiert, es gibt also keinen Schnitt.
      const change = loadChartBasis == null ? null : (v / loadChartBasis - 1) * 100;
      return {
        date: fmtDate(new Date(ts).toISOString()),
        load: v,
        change,
        deload: !!loadDeloadFlags[offset + i],
      };
    });
  }, [loadChartGroup, loadCompareWeeks, loadDeloadFlags, loadChartBasis]);

  // Frei markierbarer Zeitraum im Diagramm: erster Tipp setzt den Anfang,
  // zweiter das Ende. Ein dritter Tipp beginnt eine neue Markierung, ein
  // Tipp auf dieselbe Woche hebt sie auf. Gespeichert werden Positionen in
  // loadChartGroupData, nicht Daten - der Ausschnitt wechselt ja mit dem
  // gewählten Zeitraum.
  const [loadRange, setLoadRange] = useState(null);
  // Beim Wechsel von Muskelgruppe oder Zeitraum zeigt dieselbe Position auf
  // eine andere Woche. Eine stehengebliebene Markierung wäre dann schlicht
  // falsch, deshalb fällt sie weg.
  useEffect(() => { setLoadRange(null); }, [loadChartGroup, loadCompareWeeks]);
  const pickLoadRange = (e) => {
    const idx = e?.activeTooltipIndex;
    if (!Number.isFinite(idx)) return;
    setLoadRange((r) => {
      if (!r || r.b != null) return { a: idx, b: null };
      if (idx === r.a) return null;
      return { a: Math.min(r.a, idx), b: Math.max(r.a, idx) };
    });
  };
  const loadRangeInfo = useMemo(() => {
    if (!loadRange || loadRange.b == null) return null;
    const von = loadChartGroupData[loadRange.a];
    const bis = loadChartGroupData[loadRange.b];
    if (!von || !bis) return null;
    const werte = loadChartGroupData.slice(loadRange.a, loadRange.b + 1).map((d) => d.load || 0);
    const schnitt = werte.reduce((s, v) => s + v, 0) / werte.length;
    // Verglichen werden die beiden Randwochen - das ist die Frage, die die
    // Markierung stellt ("wie hat es sich von hier bis hier verändert?").
    // Ist eine der beiden leer, gibt es darauf keine ehrliche Antwort:
    // "-100 %" hieße, die Belastung sei eingebrochen, dabei war schlicht
    // Pause. Lieber keine Zahl als eine erfundene.
    const prozent = von.load > 0 && bis.load > 0 ? (bis.load / von.load - 1) * 100 : null;
    return { von, bis, schnitt, prozent, wochen: werte.length };
  }, [loadRange, loadChartGroupData]);

  // Plateau-/Überlastungs-Signal für die aktuell aufgeklappte Einzelübung
  // (siehe detectLoadSignal). Eigene, übungsspezifische Historienlänge statt
  // loadHistoryWeeks - eine erst kürzlich hinzugefügte Übung soll nicht an
  // der Gesamthistorie aller Logs gemessen werden.
  const selectedExerciseSeries = useMemo(
    () =>
      selected
        ? getExerciseLoadSeries(logs, selected, timeBasedExercises, 12, Date.now(), {
            exercise: exBy[selected],
            equipmentOverrides: exerciseEquipmentOverrides,
            bodyWeights,
          })
        : [],
    [selected, logs, timeBasedExercises, exBy, exerciseEquipmentOverrides, bodyWeights]
  );
  const selectedExerciseHistoryWeeks = useMemo(() => {
    if (!selected) return 0;
    let oldest = Infinity;
    logs.forEach((l) => {
      if (!logEntries(l).some((e) => e.exerciseId === selected)) return;
      const ts = new Date(l?.date).getTime();
      if (Number.isFinite(ts) && ts < oldest) oldest = ts;
    });
    if (!Number.isFinite(oldest)) return 0;
    return Math.max(0, Math.floor((Date.now() - oldest) / LOAD_WEEK_MS));
  }, [selected, logs]);
  const selectedExerciseSignal = useMemo(
    () => detectLoadSignal(
      selectedExerciseSeries,
      selectedExerciseHistoryWeeks,
      deloadWeekFlags(deloadWeeks, selectedExerciseSeries.length)
    ),
    [selectedExerciseSeries, selectedExerciseHistoryWeeks, deloadWeeks]
  );

  // Both of these (like the empty-state bail below) must come after every
  // hook above - React rejects a component that calls a different number
  // of hooks between renders, which an earlier return would cause the
  // moment progressTab actually changes.
  if (progressTab === "breathing") {
    return (
      <div>
        {subTabs}
        <BreathingProgressView breathingExercises={breathingExercises} breathingLogs={breathingLogs} />
      </div>
    );
  }
  if (logs.length === 0) {
    // Die Reiterleiste bleibt sichtbar, auch ohne Trainingsdaten - sonst
    // käme jemand, der ausschließlich Atemübungen protokolliert, nie an
    // deren Statistik heran.
    return (
      <div>
        {subTabs}
        <div className="empty-state">
          <TrendingUp size={26} />
          <p>Noch keine Trainingsdaten. Logge dein erstes Training, um Fortschritt zu sehen.</p>
        </div>
      </div>
    );
  }

  if (progressTab === "history") {
    return (
      <div>
        {subTabs}
        <HistoryView
          focusLogId={focusLogId}
          onFocusHandled={onFocusHandled}
          onResumeLog={onResumeLog}
          gyms={gyms}
          logs={logs}
          exBy={exBy}
          exercises={exercises}
          exerciseNotes={exerciseNotes}
          exerciseSubgroupOverrides={exerciseSubgroupOverrides}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
          exerciseEquipmentOverrides={exerciseEquipmentOverrides}
          onSetExerciseEquipment={onSetExerciseEquipment}
          timeBasedExercises={timeBasedExercises}
          gymIndependentExercises={gymIndependentExercises}
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onToggleGymIndependent={onToggleGymIndependent}
        />
      </div>
    );
  }

  const selectedIsTimeBased = isTimeBasedInLogs(logs, selected, timeBasedExercises);

  const weeklyWorkouts = logs.filter((l) => Date.now() - new Date(l.date).getTime() <= 7 * 86400000).length;
  const last7Volume = logs.filter((l) => Date.now() - new Date(l.date).getTime() <= 7 * 86400000).reduce((sum, l) => sum + logEntries(l).reduce((s, e) => s + entrySets(e).filter((x) => x.done && !x.warmup).reduce((a, x) => a + toNum(x.weight) * toNum(x.reps), 0), 0), 0);


  return (
    <div>
      {subTabs}

      <div className="stat-hero">
        <span className="stat-hero-label">Volumen diese Woche</span>
        <span className="stat-hero-value">
          {Math.round(last7Volume).toLocaleString("de-DE")}
          <small>kg</small>
        </span>
      </div>

      <div className="stats-grid stats-grid-secondary">
          <div className="stat-item">
            <span className="stat-value">{weeklyWorkouts}</span>
            <span className="stat-label">Trainings (7 Tage)</span>
          </div>
          <div
            className={`stat-item ${stats.best1RMSource ? "stat-item-clickable" : ""}`}
            onClick={() => stats.best1RMSource && setBest1RMInfo(stats.best1RMSource)}
            title={stats.best1RMSource ? "Antippen: aus welchem Satz stammt dieser Wert?" : undefined}
          >
            <span className="stat-value">{Math.round(stats.best1RM)} kg</span>
            <span className="stat-label">
              Bestes gesch. 1RM
              {stats.best1RMSource && <ChevronRight size={12} style={{ verticalAlign: -2, marginLeft: 3 }} />}
            </span>
          </div>
          <div
            className={`stat-item ${recentPRs.length > 0 ? "stat-item-clickable" : ""}`}
            onClick={() => recentPRs.length > 0 && setRecentPRsOpen(true)}
            title={recentPRs.length > 0 ? "Antippen: welche Rekorde waren das?" : undefined}
          >
            <span className="stat-value">{recentPRs.length}</span>
            <span className="stat-label">
              Rekorde (7 Tage)
              {recentPRs.length > 0 && (
                <ChevronRight size={12} style={{ verticalAlign: -2, marginLeft: 3 }} />
              )}
            </span>
          </div>
      </div>

      <div className="card">
        <ExplainableTitle onExplain={() => setExplain(STAT_EXPLANATIONS.weeklySets)}>
          Sätze pro Muskelgruppe (7 Tage)
        </ExplainableTitle>
        <div className="chip-row" style={{ marginTop: 10, marginBottom: 4 }}>
          {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
            <span
              key={weeks}
              className={`chip chip-sm ${setsCompareWeeks === weeks ? "active" : ""}`}
              onClick={() => setSetsCompareWeeks(weeks)}
            >
              {label}
            </span>
          ))}
        </div>
        {weeklySetsTotal === 0 ? (
          <div className="empty-state" style={{ padding: "14px 0" }}>
            Noch keine abgehakten Sätze in dieser Woche.
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {weeklySetsByGroup.map((g) => {
              const isExpanded = !!expandedGroups[g.id];
              const change = muscleLoadChange(g.values, setsCompareWeeks, setsHistoryWeeks);
              return (
                <div key={g.id}>
                  <div
                    className="muscle-week-row-v2 muscle-week-row-v2-clickable"
                    onClick={() => setChartGroup(g)}
                    title="Tippen für den Verlauf im gewählten Zeitraum"
                  >
                    <span className="muscle-week-label">{g.label}</span>
                    <Sparkline values={compareWindowSeries(g.values, setsCompareWeeks)} />
                    <span className="muscle-week-value">{fmtDecimal(g.sets)}</span>
                    <LoadChangeBadge change={change} />
                    <span
                      className="muscle-week-chevron"
                      onClick={(e) => { e.stopPropagation(); toggleGroupExpanded(g.id); }}
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} color="var(--text-dim)" />
                      ) : (
                        <ChevronRight size={14} color="var(--text-dim)" />
                      )}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="muscle-week-subs">
                      {g.subs.map((sg) => (
                        <div className="muscle-week-row-v2 muscle-week-row-v2-sub" key={sg.id}>
                          <span className="muscle-week-label">{sg.label}</span>
                          <Sparkline values={compareWindowSeries(sg.values, setsCompareWeeks)} />
                          <span className="muscle-week-value">{fmtDecimal(sg.sets)}</span>
                          <LoadChangeBadge change={muscleLoadChange(sg.values, setsCompareWeeks, setsHistoryWeeks)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <ExplainableTitle onExplain={() => setExplain(STAT_EXPLANATIONS.muscleLoad)}>
          Belastung pro Muskelgruppe
        </ExplainableTitle>
        <div className="chip-row" style={{ marginTop: 10, marginBottom: 4 }}>
          {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
            <span
              key={weeks}
              className={`chip chip-sm ${loadCompareWeeks === weeks ? "active" : ""}`}
              onClick={() => setLoadCompareWeeks(weeks)}
            >
              {label}
            </span>
          ))}
        </div>
        {muscleLoadSeries.every((g) => g.current === 0) ? (
          <div className="empty-state" style={{ padding: "14px 0" }}>
            Noch keine Trainingsdaten für diese Auswertung.
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {muscleLoadSeries.map((g) => {
              const isExpanded = !!expandedLoadGroups[g.id];
              const change = muscleLoadChange(g.values, loadCompareWeeks, loadHistoryWeeks);
              return (
                <div key={g.id}>
                  <div
                    className="muscle-load-row muscle-load-row-clickable"
                    onClick={() => setLoadChartGroup(g)}
                    title="Tippen für den Verlauf im gewählten Zeitraum"
                  >
                    <span className="muscle-week-label">{g.label}</span>
                    <Sparkline values={compareWindowSeries(g.values, loadCompareWeeks)} />
                    <LoadChangeBadge change={change} />
                    <LoadSignalBadge signal={detectLoadSignal(g.values, loadHistoryWeeks, loadDeloadFlags)} />
                    <span
                      className="muscle-week-chevron"
                      onClick={(e) => { e.stopPropagation(); toggleLoadGroupExpanded(g.id); }}
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} color="var(--text-dim)" />
                      ) : (
                        <ChevronRight size={14} color="var(--text-dim)" />
                      )}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="muscle-week-subs">
                      {g.subs.map((sg) => (
                        <div className="muscle-load-row muscle-load-row-sub" key={sg.id}>
                          <span className="muscle-week-label">{sg.label}</span>
                          <Sparkline values={compareWindowSeries(sg.values, loadCompareWeeks)} />
                          <LoadChangeBadge change={muscleLoadChange(sg.values, loadCompareWeeks, loadHistoryWeeks)} />
                          <LoadSignalBadge signal={detectLoadSignal(sg.values, loadHistoryWeeks, loadDeloadFlags)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Kraft gegen Volumen - die Frage, für die die App gebaut wurde.
          Siehe getStrengthVolumeSeries für die Herleitung. */}
      <div className="card">
        <ExplainableTitle onExplain={() => setExplain(STAT_EXPLANATIONS.strengthVolume)}>
          Kraft und Volumen
        </ExplainableTitle>
        <div className="chip-row" style={{ marginTop: 10, marginBottom: 4 }}>
          {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
            <span
              key={weeks}
              className={`chip chip-sm ${svCompareWeeks === weeks ? "active" : ""}`}
              onClick={() => setSvCompareWeeks(weeks)}
            >
              {label}
            </span>
          ))}
        </div>
        {strengthVolume.length === 0 ? (
          <div className="empty-state" style={{ padding: "14px 0" }}>
            Dafür braucht es Übungen mit Gewicht. Bei Körpergewichts- und
            Bandübungen gibt es keine Kraftzahl, die sich vergleichen ließe.
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div className="sv-head">
              <span />
              <span>Kraft</span>
              <span>Volumen</span>
              <span />
            </div>
            {strengthVolume.map((g) => {
              const offen = !!expandedSvGroups[g.id];
              const hinweis = strengthVolumeNote(g.strength?.change ?? null, g.volume?.change ?? null);
              return (
                <div key={g.id}>
                  <div
                    className="sv-row sv-row-clickable"
                    onClick={() => toggleSvGroup(g.id)}
                    title="Antippen: die einzelnen Übungen dieser Gruppe"
                  >
                    <span className="muscle-week-label">{g.label}</span>
                    <LoadChangeBadge change={g.strength ? g.strength.change : null} />
                    <LoadChangeBadge change={g.volume ? g.volume.change : null} />
                    <span className="muscle-week-chevron">
                      {offen ? (
                        <ChevronDown size={14} color="var(--text-dim)" />
                      ) : (
                        <ChevronRight size={14} color="var(--text-dim)" />
                      )}
                    </span>
                  </div>
                  {hinweis && <div className="sv-note">{hinweis}</div>}
                  {offen && (
                    <div className="muscle-week-subs">
                      {g.exercises.map((ex) => (
                        <div className="sv-row sv-row-sub" key={ex.id}>
                          <span className="muscle-week-label">{ex.name}</span>
                          <LoadChangeBadge change={ex.strength ? ex.strength.change : null} />
                          <LoadChangeBadge change={ex.volume ? ex.volume.change : null} />
                          <span className="muscle-week-chevron" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="deload-basis">
              Verglichen wird die zweite Hälfte des gewählten Zeitraums gegen
              die erste. Ein Strich heißt: dafür fehlen in einer der beiden
              Hälften die Daten.
            </p>
          </div>
        )}
      </div>

      {/* Entlastungswochen. Die Karte ist bewusst eine Zähl- und
          Vergleichskarte, keine Empfehlung: Der Rhythmus ist die Zahl, die
          der Mensch selbst eingetragen hat, und die Auswertung steht erst
          nach der eigenen Schätzung da (KONZEPT.md, Regeln 1 und 3). */}
      <div className="card">
        <ExplainableTitle onExplain={() => setExplain(STAT_EXPLANATIONS.deload)}>
          Entlastungen
        </ExplainableTitle>

        {!deloadInfo ? (
          <div className="empty-state" style={{ padding: "12px 0 4px" }}>
            Noch keine Entlastung eingetragen. Im Kalender den ersten Tag
            antippen, „Entlastung ab hier" wählen und dann den letzten Tag
            antippen – der Zeitraum darf beliebig laufen, nicht nur Montag
            bis Sonntag.
          </div>
        ) : (
          <div className="deload-status">
            {deloadInfo.current
              ? `Läuft gerade: Entlastung bis ${fmtDate(dateFromKey(deloadInfo.current.end))}.`
              : deloadInfo.weeksSince == null
              ? "Noch keine Entlastung absolviert."
              : deloadInfo.weeksSince === 0
              ? "Letzte Entlastung: diese Woche."
              : `Letzte Entlastung: vor ${deloadInfo.weeksSince} ${
                  deloadInfo.weeksSince === 1 ? "Woche" : "Wochen"
                }${deloadInfo.intervalWeeks ? ` von ${deloadInfo.intervalWeeks}` : ""}.`}
            {deloadInfo.next && (
              <>
                {" "}
                Nächste geplant ab {fmtDate(dateFromKey(deloadInfo.next.start))}
                {deloadInfo.daysUntilNext > 0
                  ? ` (in ${deloadInfo.daysUntilNext} ${deloadInfo.daysUntilNext === 1 ? "Tag" : "Tagen"})`
                  : ""}
                .
              </>
            )}
          </div>
        )}

        <label className="field-label" style={{ marginTop: 12, display: "block" }}>
          Dein Rhythmus
        </label>
        <div className="chip-row chip-row-wrap" style={{ marginTop: 8, marginBottom: 0 }}>
          {[[6, "alle 6 Wochen"], [7, "alle 7 Wochen"], [8, "alle 8 Wochen"], [null, "kein fester"]].map(
            ([value, label]) => (
              <span
                key={label}
                className={`chip chip-sm ${deloadInterval === value ? "active" : ""}`}
                onClick={() => onSetDeloadInterval?.(value)}
              >
                {label}
              </span>
            )
          )}
        </div>

        {deloadEffects.results.length === 0 ? (
          deloadInfo && (
            <p className="deload-basis" style={{ marginTop: 12 }}>
              Der Vergleich „zwei Wochen davor gegen zwei Wochen danach"
              erscheint hier, sobald die zwei Wochen nach einer
              Entlastungswoche vorbei sind und in beiden Zeiträumen genug
              trainiert wurde.
            </p>
          )
        ) : (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {deloadEffects.results.map((r) => {
              const guess = deloadGuessOf(r.start);
              // Totzone, damit ein Prozent Rauschen nicht als "besser" oder
              // "schlechter" verkauft wird.
              const gemessen =
                r.performanceChange > 2 ? "besser" : r.performanceChange < -2 ? "schlechter" : "gleich";
              return (
                <div className="deload-effect" key={r.start}>
                  <div className="deload-effect-title">
                    Entlastung {fmtDate(dateFromKey(r.start))} bis {fmtDate(dateFromKey(r.end))}
                    {" · "}{r.days} {r.days === 1 ? "Tag" : "Tage"}
                  </div>
                  {!guess ? (
                    <>
                      <p className="deload-question">
                        Wie liefen die zwei Wochen danach im Vergleich zu den zwei
                        Wochen davor? Erst schätzen, dann zeigt die App ihre Zahlen.
                      </p>
                      <div className="chip-row chip-row-wrap" style={{ marginTop: 8, marginBottom: 0 }}>
                        {["besser", "gleich", "schlechter"].map((option) => (
                          <span
                            key={option}
                            className="chip chip-sm"
                            onClick={() => onSetDeloadGuess?.(r.start, option)}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="deload-effect-value">
                        Leistung je Satz {r.performanceChange >= 0 ? "+" : "−"}
                        {fmtDecimal(Math.abs(Math.round(r.performanceChange * 10) / 10))} %
                        {r.feelingBefore != null && r.feelingAfter != null && (
                          <>
                            {" · Gefühl "}
                            {fmtDecimal(Math.round(r.feelingAfter * 10) / 10)} statt{" "}
                            {fmtDecimal(Math.round(r.feelingBefore * 10) / 10)}
                          </>
                        )}
                      </div>
                      <div className="deload-basis">
                        Aus {r.sessionsBefore} Trainings davor und {r.sessionsAfter} danach,
                        {" "}{r.exercises} {r.exercises === 1 ? "Übung" : "Übungen"} verglichen.
                        {" "}Du hattest „{guess}" geschätzt –{" "}
                        {guess === gemessen ? "das passt." : `gemessen: ${gemessen}.`}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <p className="deload-basis" style={{ marginTop: 10 }}>
              {deloadEffects.pattern != null
                ? `Über ${deloadEffects.results.length} ausgewertete Entlastungen im Schnitt ${
                    deloadEffects.pattern >= 0 ? "+" : "−"
                  }${fmtDecimal(Math.abs(Math.round(deloadEffects.pattern * 10) / 10))} %.`
                : `Ein Schnitt über mehrere Entlastungen erscheint ab ${deloadEffects.patternMin} ausgewerteten – bisher ${deloadEffects.results.length}.`}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <ExplainableTitle onExplain={() => setExplain(STAT_EXPLANATIONS.feelingPerformance)}>
          Gefühl und Leistung
        </ExplainableTitle>
        {feelingPerformance.rows.length === 0 ? (
          // Auch ohne Ergebnis sichtbar, und zwar mit Zählerstand: Wer nach
          // jedem Training eine Angabe macht, soll sehen, dass sie ankommt
          // und ab wann sie etwas liefert. Eine stumme Karte wäre genau der
          // Datenfriedhof, den Regel 4 verhindern soll.
          <div className="chart-hint" style={{ marginTop: 10 }}>
            {feelingPerformance.sessionsWithFeeling === 0
              ? "Sobald du nach dem Training angibst, wie es sich angefühlt hat, wird hier verglichen, ob dein Gefühl zu deiner tatsächlichen Leistung passt."
              : `Bisher ${feelingPerformance.sessionsWithFeeling} ${
                  feelingPerformance.sessionsWithFeeling === 1 ? "Training" : "Trainings"
                } mit Gefühlsangabe. Ab 3 Trainings mit derselben Angabe erscheint hier die erste Tendenz.`}
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {feelingPerformance.rows.map((r) => (
              <div className="feeling-row" key={r.value}>
                <span className="feeling-row-label">{r.label}</span>
                <span className="feeling-row-value">
                  {r.showPercent
                    ? `${Math.round(100 + r.deviation)} % deiner üblichen Leistung`
                    : Math.abs(r.deviation) < 2
                    ? "wie üblich"
                    : r.deviation < 0
                    ? "etwas darunter"
                    : "etwas darüber"}
                </span>
                {/* Woraus die Aussage stammt, steht immer dabei - ohne das
                    wirkt eine Zahl aus vier Tagen wie ein Naturgesetz. */}
                <span className="feeling-row-basis">
                  aus {r.sessions} {r.sessions === 1 ? "Training" : "Trainings"}
                  {r.showPercent ? "" : " – für eine Prozentzahl noch zu wenig"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <ExplainableTitle onExplain={() => setExplain(STAT_EXPLANATIONS.calibration)}>
          Eichsätze
        </ExplainableTitle>
        {calibration.ready ? (
          <div style={{ marginTop: 10 }}>
            <div className="calibration-headline">
              {Math.abs(calibration.avgDiff) < 0.5
                ? "Deine Schätzung trifft im Schnitt zu."
                : calibration.avgDiff > 0
                ? `Du unterschätzt dich im Schnitt um ${fmtDecimal(Math.abs(calibration.avgDiff))} Wiederholungen.`
                : `Du überschätzt dich im Schnitt um ${fmtDecimal(Math.abs(calibration.avgDiff))} Wiederholungen.`}
            </div>
            <div className="calibration-basis">
              aus {calibration.count} {calibration.count === 1 ? "Eichsatz" : "Eichsätzen"}
            </div>
            {/* Die einzelnen Sätze darunter: Ohne sie ist der Schnitt eine
                Zahl ohne Beleg, und gerade hier will man die Fälle sehen. */}
            <div style={{ marginTop: 12 }}>
              {calibration.rows.slice(0, 5).map((r, i) => (
                <div className="calibration-row" key={i}>
                  <span className="calibration-row-name">
                    {exBy[r.exerciseId]?.name || "Übung"}
                  </span>
                  <span className="calibration-row-values">
                    {r.estimated} geschätzt, {r.actual} geschafft
                  </span>
                  <span className="calibration-row-date">{fmtDate(r.date)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chart-hint" style={{ marginTop: 10 }}>
            {calibration.count === 0
              ? `Ein Eichsatz ist ein letzter Satz bis zum echten Muskelversagen, mit einer Schätzung davor. Im Training über das Menü am letzten Satz auswählen. Ab ${CALIBRATION_MIN_SETS} Eichsätzen steht hier, wie gut du dich einschätzt.`
              : `Bisher ${calibration.count} ${calibration.count === 1 ? "Eichsatz" : "Eichsätze"} – ab ${CALIBRATION_MIN_SETS} steht hier, wie gut du dich einschätzt.`}
          </div>
        )}
      </div>

      <span className="stat-section-title">Einzelne Übung ansehen</span>
      <div className="search-box">
        <Search size={16} color="var(--text-dim)" />
        <input
          placeholder="Übung suchen…"
          value={exerciseQuery}
          onChange={(e) => setExerciseQuery(e.target.value)}
        />
        {exerciseQuery && (
          <button
            className="btn-icon"
            onClick={() => setExerciseQuery("")}
            title="Suche leeren"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {exerciseQuery.trim() !== "" && (
        <div className="card">
          {searchResults.length === 0 ? (
            <div className="empty-state">Keine Übung mit Trainingsdaten gefunden.</div>
          ) : (
            searchResults.map((id) => (
              <div
                className="ex-row ex-row-clickable"
                key={id}
                onClick={() => {
                  setSelected(id);
                  setExerciseQuery("");
                }}
              >
                <span className="ex-name">{exBy[id]?.name}</span>
                <ChevronRight size={15} color="var(--text-dim)" />
              </div>
            ))
          )}
        </div>
      )}

      {selected && (
        <>
          <div className="stat-search-head">
            <div className="stat-search-head-title">
              <span
                className="ex-name ex-name-clickable"
                onClick={() => { setExerciseSheetTab("stats"); setSelectedExerciseId(selected); }}
              >
                {exBy[selected]?.name}
              </span>
              <LoadSignalBadge signal={selectedExerciseSignal} />
            </div>
            <button className="btn-icon" onClick={() => setSelected("")} title="Schließen">
              <X size={15} />
            </button>
          </div>
          <ExerciseCharts
            logs={logs}
            exerciseId={selected}
            isTimeBased={selectedIsTimeBased}
            theme={theme}
            gyms={gyms}
            gymIndependent={isGymIndependent(selected, gymIndependentExercises)}
          />
        </>
      )}

      {selectedExercise && (
        <ExerciseDetailSheet
          gyms={gyms}
          key={selectedExercise.id}
          exercise={selectedExercise}
          exercises={exercises}
          logs={logs}
          exerciseNotes={exerciseNotes}
          exerciseSubgroupOverrides={exerciseSubgroupOverrides}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
          exerciseEquipmentOverrides={exerciseEquipmentOverrides}
          onSetExerciseEquipment={onSetExerciseEquipment}
          timeBasedExercises={timeBasedExercises}
          gymIndependentExercises={gymIndependentExercises}
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onToggleGymIndependent={onToggleGymIndependent}
          initialTab={exerciseSheetTab}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}

      {/* Was hinter "Rekorde (7 Tage)" steckt: welche Übung, welche Art
          Rekord, der Wert, der vorherige Bestwert und wann. */}
      {recentPRsOpen && (
        <Modal title="Rekorde der letzten 7 Tage" onClose={() => setRecentPRsOpen(false)} width={400}>
          <div className="modal-list">
            {recentPRs.map((r, i) => (
              <div className="pr-list-row" key={`${r.exerciseId}-${r.title}-${i}`}>
                <div className="pr-list-head">
                  <span className="ex-name">{r.exerciseName}</span>
                  <span className="tag">{fmtDate(r.date)}</span>
                </div>
                <div className="pr-list-detail">
                  {r.title}: <strong>{r.value}</strong>
                  {r.previous ? ` · vorher ${r.previous}` : " · erster Wert"}
                </div>
                <div className="pr-list-detail" style={{ color: "var(--text-faint)" }}>
                  Aus dem Satz{" "}
                  {shortSet(r.set, isTimeBasedInLogs(logs, r.exerciseId, timeBasedExercises))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {best1RMInfo && (
        <Modal title="Bestes geschätztes 1RM" onClose={() => setBest1RMInfo(null)} width={380}>
          <div className="plan-title" style={{ marginBottom: 10 }}>{best1RMInfo.exerciseName}</div>
          <div className="stat-hero" style={{ marginBottom: 10 }}>
            <span className="stat-hero-label">Erreicht mit</span>
            <span className="stat-hero-value">
              {fmtDecimal(best1RMInfo.weight)} kg × {best1RMInfo.reps}
            </span>
            <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--text-dim)" }}>
              {fmtDate(best1RMInfo.date)}
            </div>
          </div>
          {/* Der Satz selbst ist die Antwort auf "woher kommt die Zahl" - der
              Rechenweg gehört dazu, sonst bleibt die Schätzung undurchsichtig. */}
          <div className="explain-formula">
            <span className="explain-formula-label">So wird gerechnet</span>
            <div>
              Aus Gewicht und Wiederholungen dieses einen Satzes wird geschätzt, was einmal
              maximal gegangen wäre. Je mehr Wiederholungen, desto ungenauer die Schätzung -
              ein Satz mit 3 Wiederholungen ist belastbarer als einer mit 15.
            </div>
          </div>
          {/* Vorher setzte dieser Knopf nur die Auswahl für die Chart-Liste
              weiter unten auf der Seite - sichtbar wurde davon nichts, das
              Fenster schloss sich und man stand wieder oben. Jetzt geht das
              Übungs-Fenster auf, und zwar gleich auf dem Reiter, der hier
              versprochen wird. */}
          <button
            className="btn btn-ghost btn-block btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => {
              setExerciseSheetTab("history");
              setSelectedExerciseId(best1RMInfo.exerciseId);
              setBest1RMInfo(null);
            }}
          >
            Verlauf dieser Übung ansehen
          </button>
        </Modal>
      )}

      {explain && (
        <Modal title={explain.title} onClose={() => setExplain(null)} width={420}>
          <div className="explain-body">
            {explain.paragraphs.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
            {explain.formula && (
              <div className="explain-formula">
                <span className="explain-formula-label">So wird gerechnet</span>
                {explain.formula.map((line, i) => (
                  <div key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {chartGroup && (
        <Modal title={`${chartGroup.label} – Sätze pro Woche`} onClose={() => setChartGroup(null)} width={420}>
          <div className="chip-row" style={{ marginTop: 0, marginBottom: 10 }}>
            {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
              <span
                key={weeks}
                className={`chip chip-sm ${setsCompareWeeks === weeks ? "active" : ""}`}
                onClick={() => setSetsCompareWeeks(weeks)}
              >
                {label}
              </span>
            ))}
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="99%" height="100%" debounce={1}>
              <LineChart data={chartGroupData} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={chartColors.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.ceil(chartGroupData.length / 6) - 1)}
                />
                <YAxis
                  stroke={chartColors.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v) => [plural(v, "Satz", "Sätze"), ""]}
                />
                <Line
                  type="monotone"
                  dataKey="sets"
                  stroke={chartColors.series.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: chartColors.series.accent, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Modal>
      )}

      {loadChartGroup && (
        <Modal title={`${loadChartGroup.label} – Belastung pro Woche`} onClose={() => setLoadChartGroup(null)} width={420}>
          <div className="chip-row" style={{ marginTop: 0, marginBottom: 10 }}>
            {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
              <span
                key={weeks}
                className={`chip chip-sm ${loadCompareWeeks === weeks ? "active" : ""}`}
                onClick={() => setLoadCompareWeeks(weeks)}
              >
                {label}
              </span>
            ))}
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="99%" height="100%" debounce={1}>
              <LineChart
                data={loadChartGroupData}
                margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
                onClick={pickLoadRange}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={chartColors.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.ceil(loadChartGroupData.length / 6) - 1)}
                />
                <YAxis
                  yAxisId="links"
                  stroke={chartColors.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                {/* Rechts dieselbe Kurve noch einmal, gemessen am Schnitt
                    des gewählten Zeitraums. Links steht "wie viel Arbeit war
                    das", rechts "wie viel mehr oder weniger als üblich" -
                    und der Punkt ganz rechts ist genau die Prozentzahl, die
                    in der Übersicht neben dieser Muskelgruppe steht. */}
                <YAxis
                  yAxisId="rechts"
                  orientation="right"
                  stroke={chartColors.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => `${Math.round(v)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v, name, item) => {
                    if (name === "Veränderung") {
                      return [v == null ? "–" : `${v > 0 ? "+" : ""}${Math.round(v)} %`, "ggü. Schnitt"];
                    }
                    return [
                      `${(Math.round(v * 100) / 100).toLocaleString("de-DE")}${
                        item?.payload?.deload ? " · Entlastungswoche" : ""
                      }`,
                      "Relative Belastung",
                    ];
                  }}
                />
                <ReferenceLine yAxisId="rechts" y={0} stroke={chartColors.axis} strokeDasharray="3 3" />
                {/* Der markierte Zeitraum. Nach dem ersten Tipp steht erst
                    eine einzelne Linie da - sonst sähe es aus, als wäre der
                    Tipp ins Leere gegangen. */}
                {loadRange && loadRange.b != null && loadChartGroupData[loadRange.a] && loadChartGroupData[loadRange.b] && (
                  <ReferenceArea
                    yAxisId="links"
                    x1={loadChartGroupData[loadRange.a].date}
                    x2={loadChartGroupData[loadRange.b].date}
                    fill={chartColors.series.accent}
                    fillOpacity={0.12}
                    stroke={chartColors.series.accent}
                    strokeOpacity={0.4}
                  />
                )}
                {loadRange && loadRange.b == null && loadChartGroupData[loadRange.a] && (
                  <ReferenceLine
                    yAxisId="links"
                    x={loadChartGroupData[loadRange.a].date}
                    stroke={chartColors.series.accent}
                    strokeWidth={2}
                  />
                )}
                <Line
                  yAxisId="rechts"
                  type="monotone"
                  dataKey="change"
                  name="Veränderung"
                  stroke={chartColors.series.teal}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  yAxisId="links"
                  type="monotone"
                  dataKey="load"
                  stroke={chartColors.series.accent}
                  strokeWidth={2.5}
                  // Entlastungswochen bekommen einen hohlen Punkt: Die Delle
                  // bleibt sichtbar, sie ist nur als geplant gekennzeichnet.
                  dot={(dotProps) => {
                    const { cx, cy, index, payload } = dotProps;
                    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                    return payload?.deload ? (
                      <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={chartColors.tooltipBg}
                        stroke={chartColors.series.accent}
                        strokeWidth={2}
                      />
                    ) : (
                      <circle key={index} cx={cx} cy={cy} r={3} fill={chartColors.series.accent} />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="deload-basis" style={{ marginTop: 6 }}>
            Durchgezogen: relative Belastung (Skala links). Gestrichelt: wie
            viel Prozent über oder unter dem Schnitt des gewählten Zeitraums
            (Skala rechts) – der Punkt ganz rechts ist genau die Zahl, die in
            der Übersicht neben dieser Gruppe steht.
          </p>
          {/* Frei markierbarer Zeitraum. Die Anleitung steht immer da, wo man
              gerade ist: erst "zwei Wochen antippen", dann "jetzt die
              Endwoche", dann das Ergebnis. */}
          {!loadRange && loadChartGroupData.length > 1 && (
            <p className="deload-basis" style={{ marginTop: 6 }}>
              Tippe zwei Wochen im Diagramm an, um einen eigenen Zeitraum zu
              markieren.
            </p>
          )}
          {loadRange && loadRange.b == null && (
            <p className="deload-basis" style={{ marginTop: 6 }}>
              Start {loadChartGroupData[loadRange.a]?.date} – jetzt die
              Endwoche antippen.
            </p>
          )}
          {loadRangeInfo && (
            <div className="range-summary">
              <div className="range-summary-head">
                <span>
                  {loadRangeInfo.von.date} → {loadRangeInfo.bis.date} ·{" "}
                  {loadRangeInfo.wochen} Wochen
                </span>
                <span className="link-like" onClick={() => setLoadRange(null)}>
                  Aufheben
                </span>
              </div>
              {loadRangeInfo.prozent == null ? (
                <p className="deload-basis" style={{ marginTop: 4 }}>
                  In einer der beiden Randwochen wurde nichts trainiert – daraus
                  lässt sich keine Veränderung rechnen. Schnitt im Zeitraum:{" "}
                  {fmtDecimal(loadRangeInfo.schnitt)}.
                </p>
              ) : (
                <p className="deload-basis" style={{ marginTop: 4 }}>
                  Belastung{" "}
                  <strong>
                    {loadRangeInfo.prozent > 0 ? "+" : ""}
                    {Math.round(loadRangeInfo.prozent)} %
                  </strong>{" "}
                  – von {fmtDecimal(loadRangeInfo.von.load)} in der ersten auf{" "}
                  {fmtDecimal(loadRangeInfo.bis.load)} in der letzten Woche.
                  Schnitt im Zeitraum: {fmtDecimal(loadRangeInfo.schnitt)}.
                </p>
              )}
            </div>
          )}
          {loadChartGroupData.some((d) => d.deload) && (
            <p className="deload-basis" style={{ marginTop: 6 }}>
              Hohle Punkte sind Entlastungswochen – absichtlich leichter, deshalb
              ohne Warnzeichen.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

// Fortschritt für Atemübungen - bewusst schlank gehalten (siehe Absprache):
// Häufigkeit, Gesamtzeit, Konsistenz, Verteilung auf die einzelnen Übungen
// und die längste gehaltene Atemanhaltedauer. Eine Statistik- und
// Fortschrittsseite für einzelne Atemübungen kommt erst später dazu.
function BreathingProgressView({ breathingExercises = [], breathingLogs = [] }) {
  const weeklySeries = useMemo(() => getBreathingWeeklySeries(breathingLogs, 21), [breathingLogs]);
  const historyWeeks = useMemo(() => logsHistoryWeeks(breathingLogs), [breathingLogs]);
  const [compareWeeks, setCompareWeeks] = useState(1);
  const change = muscleLoadChange(weeklySeries.values, compareWeeks, historyWeeks);
  const streak = useMemo(() => breathingStreak(breathingLogs), [breathingLogs]);
  const totalMinutesAll = useMemo(
    () => Math.round(breathingLogs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / 60),
    [breathingLogs]
  );
  const totalMinutesWeek = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return Math.round(
      breathingLogs
        .filter((l) => new Date(l.date).getTime() >= since)
        .reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / 60
    );
  }, [breathingLogs]);
  const maxHold = useMemo(
    () => breathingLogs.reduce((max, l) => (l.maxHoldSeconds > max ? l.maxHoldSeconds : max), 0),
    [breathingLogs]
  );
  const breathingById = useMemo(
    () => Object.fromEntries(breathingExercises.map((b) => [b.id, b])),
    [breathingExercises]
  );
  // Nach Name gruppiert statt nur nach id, weil eine gelöschte Übung sonst
  // unter mehreren Einträgen mit demselben (dann unbekannten) Namen verteilt
  // würde, sobald mehrere ihrer Sitzungen zusammengezählt werden sollen.
  const perExercise = useMemo(() => {
    const byLabel = {};
    breathingLogs.forEach((l) => {
      const label = breathingById[l.breathingId]?.name || l.name || "Unbekannte Übung";
      if (!byLabel[label]) byLabel[label] = { label, count: 0, seconds: 0, maxHold: 0 };
      const row = byLabel[label];
      row.count += 1;
      row.seconds += toNum(l.durationSeconds);
      // maxHoldSeconds bleibt beim Speichern null, wenn die Übung gar keine
      // offene Halte-Phase hat (siehe finishBreathingSession). maxHold bleibt
      // dann 0 und die Zeile wird unten weggelassen - "0 Sek. Anhaltedauer"
      // sähe nach Fehler aus, wo es schlicht nichts zu messen gab.
      const hold = toNum(l.maxHoldSeconds);
      if (hold > row.maxHold) row.maxHold = hold;
    });
    return Object.values(byLabel).sort((a, b) => b.count - a.count);
  }, [breathingLogs, breathingById]);

  if (breathingLogs.length === 0) {
    return (
      <div className="empty-state">
        <Wind size={26} />
        <p>Noch keine Atemübungs-Sitzungen. Starte deine erste über das Programm-Menü oder den Kalender.</p>
      </div>
    );
  }

  const fmtHold = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")} Min.` : `${sec} Sek.`;
  };

  // Gesamtzeiten summieren sich über Monate und reichen von Sekunden bis in
  // Stunden. Eine reine Minutenzahl wäre am oberen Ende schwer zu lesen
  // ("312 Min.") und am unteren Ende einfach "0".
  const fmtTotal = (totalSeconds) => {
    const s = Math.max(0, Math.round(toNum(totalSeconds)));
    if (s < 60) return `${s} Sek.`;
    const minutes = Math.round(s / 60);
    if (minutes < 60) return `${minutes} Min.`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
  };

  return (
    <div>
      <div className="stats-grid stats-grid-secondary">
        <div className="stat-item">
          <span className="stat-value">{streak}</span>
          <span className="stat-label">Tage Serie</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalMinutesWeek}</span>
          <span className="stat-label">Min. diese Woche</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalMinutesAll}</span>
          <span className="stat-label">Min. gesamt</span>
        </div>
      </div>

      {maxHold > 0 && (
        <div className="stat-hero">
          <span className="stat-hero-label">Längste Atemanhaltedauer</span>
          <span className="stat-hero-value">{fmtHold(maxHold)}</span>
        </div>
      )}

      <div className="card">
        <span className="plan-title">Sitzungen pro Woche</span>
        <div className="chip-row" style={{ marginTop: 10, marginBottom: 4 }}>
          {MUSCLE_COMPARE_OPTIONS.map(([weeks, label]) => (
            <span
              key={weeks}
              className={`chip chip-sm ${compareWeeks === weeks ? "active" : ""}`}
              onClick={() => setCompareWeeks(weeks)}
            >
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <span className="muscle-week-label" style={{ minWidth: 66 }}>Sitzungen</span>
          <span style={{ flex: 1 }}>
            <Sparkline values={compareWindowSeries(weeklySeries.values, compareWeeks)} />
          </span>
          <LoadChangeBadge change={change} />
        </div>
      </div>

      <div className="card">
        <span className="plan-title">Pro Übung</span>
        <div style={{ marginTop: 10 }}>
          {perExercise.map((ex) => (
            <div className="breathing-ex-row" key={ex.label}>
              <span className="breathing-ex-name">{ex.label}</span>
              <div className="breathing-ex-meta">
                <span>{ex.count}× gemacht</span>
                <span>{fmtTotal(ex.seconds)} gesamt</span>
                {ex.maxHold > 0 && <span>längste Anhaltedauer {fmtHold(ex.maxHold)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History view (past workout sessions)
// ---------------------------------------------------------------------------

function HistoryView({
  logs,
  exBy,
  exercises,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  timeBasedExercises,
  gymIndependentExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onToggleGymIndependent,
  gyms = [],
  onResumeLog,
  focusLogId,
  onFocusHandled,
}) {
  const [expandedLogId, setExpandedLogId] = useState(focusLogId || null);
  useEffect(() => {
    if (!focusLogId) return;
    setExpandedLogId(focusLogId);
    onFocusHandled?.();
  }, [focusLogId]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  // Pokale: wo wurde ein Rekord aufgestellt. Einmal gerechnet und gemerkt -
  // dafuer muss zu jedem Training die gesamte Historie davor durchgegangen
  // werden, das darf nicht bei jedem Antippen neu passieren.
  const prIndex = useMemo(
    () => getLogsPRIndex(logs, timeBasedExercises, gymIndependentExercises),
    [logs, timeBasedExercises, gymIndependentExercises]
  );
  // Welcher Pokal gerade aufgeklappt ist: "logId:entrySchluessel".
  const [openPRKey, setOpenPRKey] = useState(null);

  if (sortedLogs.length === 0) {
    return (
      <div className="empty-state">
        <Calendar size={26} />
        <p>Noch keine vergangenen Trainings. Sobald du eines abschließst, taucht es hier auf.</p>
      </div>
    );
  }

  return (
    <div>
      {sortedLogs.map((log) => {
        const isOpen = expandedLogId === log.id;
        const totalSets = logEntries(log).reduce(
          (sum, e) => sum + performedWorkingSets(entrySets(e)).length,
          0
        );
        const logPRs = prIndex[log.id] || {};
        const logPRCount = Object.values(logPRs).reduce((sum, l) => sum + l.length, 0);
        return (
          <div
            className="card history-card"
            key={log.id}
            onClick={() => setExpandedLogId(isOpen ? null : log.id)}
          >
            <div className="history-card-header">
              <div>
                <div className="plan-title">{log.planName || "Freies Training"}</div>
                <div className="history-card-date">{fmtDate(log.date)}</div>
              </div>
              <ChevronRight
                size={18}
                style={{
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                  color: "var(--text-dim)",
                  flexShrink: 0,
                }}
              />
            </div>
            <div className="history-card-meta">
              <span>
                <Dumbbell size={12} /> {plural(logEntries(log).length, "Übung", "Übungen")}
              </span>
              <span>
                <ClipboardList size={12} /> {plural(totalSets, "Satz", "Sätze")}
              </span>
              {logPRCount > 0 && (
                <span className="history-pr-count" title="In diesem Training wurde ein Rekord aufgestellt">
                  <Trophy size={12} /> {logPRCount} {logPRCount === 1 ? "Rekord" : "Rekorde"}
                </span>
              )}
              {log.durationMinutes ? (
                <span>
                  <Clock size={12} /> {log.durationMinutes} Min.
                </span>
              ) : null}
              {feelingLabel(log.feeling) && (
                <span title="Wie sich das Training angefühlt hat">
                  <Smile size={12} /> {feelingLabel(log.feeling)}
                </span>
              )}
            </div>

            {isOpen && (
              <div className="history-exercise-list" onClick={(e) => e.stopPropagation()}>
                {onResumeLog && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onResumeLog(log, "resume")}
                      title="Die Trainingszeit läuft ab hier weiter"
                    >
                      <Play size={14} /> Fortsetzen
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onResumeLog(log, "edit")}
                      title="Nur Werte korrigieren, die Dauer bleibt unverändert"
                    >
                      <Pencil size={14} /> Bearbeiten
                    </button>
                  </div>
                )}
                {logEntries(log).map((entry) => {
                  const ex = exBy[entry.exerciseId];
                  if (!ex) return null;
                  const isTimeBased = isTimeBasedInLogs(logs, entry.exerciseId, timeBasedExercises);
                  const workingSets = performedWorkingSets(entrySets(entry));
                  const summary = workingSets
                    .map(
                      (s) =>
                        (s.dropset ? "↓" : "") + shortSet(s, isTimeBased)
                    )
                    .join(", ");
                  const entryKey = entry.id || entry.exerciseId;
                  const entryPRList = logPRs[entryKey] || [];
                  const prOffen = openPRKey === `${log.id}:${entryKey}`;
                  return (
                    <div key={entryKey}>
                      <div className="history-exercise-row">
                        <span className="history-exercise-name">
                        <span
                          className="ex-name-clickable"
                          onClick={() => setSelectedExerciseId(entry.exerciseId)}
                        >
                          {ex.name}
                        </span>
                        {entryPRList.length > 0 && (
                          <button
                            className={`pr-trophy ${prOffen ? "active" : ""}`}
                            onClick={() =>
                              setOpenPRKey(prOffen ? null : `${log.id}:${entryKey}`)
                            }
                            title="Antippen: welcher Rekord war das?"
                          >
                            <Trophy size={13} />
                            {entryPRList.length > 1 && <span>{entryPRList.length}</span>}
                          </button>
                        )}
                        </span>
                        <span className="history-set-summary">
                          {summary || "–"}
                          {fmtRir(entry.rir) ? ` · ${fmtRir(entry.rir)}` : ""}
                        </span>
                      </div>
                      {/* Der Rekord steht erst da, wenn man den Pokal antippt:
                          In der Liste zaehlt der Ueberblick, die Herleitung
                          holt man sich gezielt. */}
                      {prOffen && (
                        <ul className="history-pr-list">
                          {entryPRList.map((pr, i) => (
                            <li key={i}>
                              <strong>{pr.title}:</strong> {pr.value}
                              {pr.previous
                                ? ` – vorher ${pr.previous}`
                                : " – der erste Wert dieser Art"}
                              {fmtRir(pr.currentRir) ? ` · ${fmtRir(pr.currentRir)}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* Die Übungsnotiz steht bewusst nicht hier: sie ist eine
                          dauerhafte Notiz zur Übung und wiederholt sich sonst
                          unter jedem Training. Zu sehen ist sie im Training
                          selbst und in der Übungs-Detailseite. */}
                    </div>
                  );
                })}
                {log.notes && log.notes.trim() && (
                  <div className="history-session-notes">
                    <StickyNote size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {log.notes.trim()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {selectedExercise && (
        <ExerciseDetailSheet
          gyms={gyms}
          key={selectedExercise.id}
          exercise={selectedExercise}
          exercises={exercises}
          logs={logs}
          exerciseNotes={exerciseNotes}
          exerciseSubgroupOverrides={exerciseSubgroupOverrides}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
          exerciseEquipmentOverrides={exerciseEquipmentOverrides}
          onSetExerciseEquipment={onSetExerciseEquipment}
          timeBasedExercises={timeBasedExercises}
          gymIndependentExercises={gymIndependentExercises}
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onToggleGymIndependent={onToggleGymIndependent}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}
