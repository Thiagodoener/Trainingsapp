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
  Save,
  Loader2,
  Timer,
  SkipForward,
  Trophy,
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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
];

// Optional, more specific categorization nested under each main muscle
// group. Exercises don't need one, but when set, the group's filter chip
// reveals these for narrower filtering.
const SUBGROUPS = {
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
function fmtDecimal(value) {
  const n = toNum(value);
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

const toNum = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Saved logs are read defensively everywhere: an entry written by an older
// version, or one interrupted mid-save, can be missing `entries` or `sets`
// entirely, and a bare .map/.forEach on those would take the whole screen
// down rather than just skipping the damaged record.
const logEntries = (log) => (Array.isArray(log?.entries) ? log.entries.filter(Boolean) : []);
const entrySets = (entry) => (Array.isArray(entry?.sets) ? entry.sets.filter(Boolean) : []);

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

const EXERCISES = [
  // Brust
  { id: "bankdruecken", name: "Bankdrücken", group: "brust" },
  { id: "schraegbank", name: "Schrägbankdrücken", group: "brust" },
  { id: "negativbank", name: "Negativbankdrücken", group: "brust" },
  { id: "kurzhantel-bankdruecken", name: "Kurzhantel-Bankdrücken", group: "brust" },
  { id: "kurzhantel-schraeg", name: "Kurzhantel-Schrägbankdrücken", group: "brust" },
  { id: "fliegende", name: "Fliegende (Kabel)", group: "brust" },
  { id: "kurzhantel-fliegende", name: "Kurzhantel-Fliegende", group: "brust" },
  { id: "butterfly", name: "Butterfly-Maschine", group: "brust" },
  { id: "cable-crossover", name: "Cable Crossover", group: "brust" },
  { id: "liegestuetz", name: "Liegestütz", group: "brust" },
  { id: "diamant-liegestuetz", name: "Diamant-Liegestütz", group: "brust" },
  { id: "brust-maschine", name: "Brustpresse (Maschine)", group: "brust" },
  { id: "pullover", name: "Pullover", group: "brust" },
  { id: "svend-press", name: "Svend Press", group: "brust" },
  { id: "smith-bankdruecken", name: "Bankdrücken (Smith Machine)", group: "brust" },
  { id: "decline-bankdruecken", name: "Negativ-Kurzhantel-Bankdrücken", group: "brust" },
  { id: "brust-dips", name: "Brust-Dips", group: "brust" },
  { id: "landmine-press-brust", name: "Landmine Chest Press", group: "brust" },
  { id: "resistance-band-fliegende", name: "Fliegende (Widerstandsband)", group: "brust" },
  { id: "pike-liegestuetz", name: "Pike Push-up", group: "brust" },

  // Rücken
  { id: "klimmzug", name: "Klimmzug", group: "ruecken" },
  { id: "klimmzug-untergriff", name: "Klimmzug (Untergriff)", group: "ruecken" },
  { id: "latzug", name: "Latzug", group: "ruecken" },
  { id: "latzug-eng", name: "Latzug enger Griff", group: "ruecken" },
  { id: "rudern", name: "Langhantelrudern", group: "ruecken" },
  { id: "kurzhantelrudern", name: "Einarmiges Kurzhantelrudern", group: "ruecken" },
  { id: "kabelrudern", name: "Kabelrudern (sitzend)", group: "ruecken" },
  { id: "t-bar-rudern", name: "T-Bar-Rudern", group: "ruecken" },
  { id: "kreuzheben", name: "Kreuzheben", group: "ruecken" },
  { id: "rumaenisches-kreuzheben", name: "Rumänisches Kreuzheben", group: "ruecken" },
  { id: "sumo-kreuzheben", name: "Sumo-Kreuzheben", group: "ruecken" },
  { id: "hyperextension", name: "Hyperextensionen", group: "ruecken" },
  { id: "face-pull", name: "Face Pull", group: "ruecken" },
  { id: "shrugs", name: "Shrugs (Nackenheben)", group: "ruecken" },
  { id: "good-morning", name: "Good Morning", group: "ruecken" },
  { id: "pull-up-negativ", name: "Negativ-Klimmzug", group: "ruecken" },
  { id: "meron-row", name: "Meadows Row", group: "ruecken" },
  { id: "chest-supported-row", name: "Chest Supported Row", group: "ruecken" },
  { id: "cable-pullover", name: "Kabel-Pullover", group: "ruecken" },
  { id: "reverse-hyperextension", name: "Reverse Hyperextension", group: "ruecken" },
  { id: "renegade-row", name: "Renegade Row", group: "ruecken" },
  { id: "band-pull-apart", name: "Band Pull-Apart", group: "ruecken" },

  // Beine
  { id: "kniebeuge", name: "Kniebeuge", group: "beine" },
  { id: "frontkniebeuge", name: "Frontkniebeuge", group: "beine" },
  { id: "goblet-squat", name: "Goblet Squat", group: "beine" },
  { id: "beinpresse", name: "Beinpresse", group: "beine" },
  { id: "ausfallschritt", name: "Ausfallschritte", group: "beine" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", group: "beine" },
  { id: "beinstrecker", name: "Beinstrecker", group: "beine" },
  { id: "beinbeuger", name: "Beinbeuger", group: "beine" },
  { id: "wadenheben", name: "Wadenheben (stehend)", group: "beine" },
  { id: "wadenheben-sitzend", name: "Wadenheben (sitzend)", group: "beine" },
  { id: "hip-thrust", name: "Hip Thrust", group: "beine" },
  { id: "hueftadduktion", name: "Hüftadduktoren-Maschine", group: "beine" },
  { id: "hueftabduktion", name: "Hüftabduktoren-Maschine", group: "beine" },
  { id: "step-up", name: "Step-ups", group: "beine" },
  { id: "kettlebell-swing", name: "Kettlebell Swing", group: "beine" },
  { id: "hackenschmidt", name: "Hackenschmidt-Kniebeuge", group: "beine" },
  { id: "sissy-squat", name: "Sissy Squat", group: "beine" },
  { id: "nordic-curl", name: "Nordic Hamstring Curl", group: "beine" },
  { id: "sumo-kniebeuge", name: "Sumo-Kniebeuge", group: "beine" },
  { id: "pistol-squat", name: "Pistol Squat", group: "beine" },
  { id: "walking-lunge", name: "Walking Lunges", group: "beine" },
  { id: "curtsy-lunge", name: "Curtsy Lunge", group: "beine" },
  { id: "glute-bridge", name: "Glute Bridge", group: "beine" },
  { id: "seated-calf-raise-maschine", name: "Waden-Maschine (liegend)", group: "beine" },
  { id: "box-jump", name: "Box Jump", group: "beine" },

  // Schultern
  { id: "schulterdruecken", name: "Schulterdrücken", group: "schultern" },
  { id: "military-press", name: "Military Press", group: "schultern" },
  { id: "arnold-press", name: "Arnold Press", group: "schultern" },
  { id: "seitheben", name: "Seitheben", group: "schultern" },
  { id: "kabel-seitheben", name: "Seitheben am Kabel", group: "schultern" },
  { id: "frontheben", name: "Frontheben", group: "schultern" },
  { id: "reverse-fly", name: "Reverse Fly (hintere Schulter)", group: "schultern" },
  { id: "aufrechtes-rudern", name: "Aufrechtes Rudern", group: "schultern" },
  { id: "landmine-press", name: "Landmine Press", group: "schultern" },
  { id: "pike-push-up-schulter", name: "Pike Push-up (Schulter)", group: "schultern" },
  { id: "cuban-press", name: "Cuban Press", group: "schultern" },
  { id: "y-raise", name: "Y-Raise", group: "schultern" },
  { id: "bus-driver", name: "Bus Driver", group: "schultern" },
  { id: "schulterdruecken-maschine", name: "Schulterdrücken (Maschine)", group: "schultern" },
  { id: "plate-raise", name: "Plate Front Raise", group: "schultern" },

  // Arme
  { id: "bizepscurl", name: "Bizepscurl", group: "arme" },
  { id: "langhantelcurl", name: "Langhantel-Bizepscurl", group: "arme" },
  { id: "scottcurl", name: "Scott-Curl", group: "arme" },
  { id: "kabelcurl", name: "Bizepscurl am Kabel", group: "arme" },
  { id: "hammercurl", name: "Hammercurl", group: "arme" },
  { id: "konzentrationscurl", name: "Konzentrationscurl", group: "arme" },
  { id: "trizepsdrucken", name: "Trizepsdrücken (Kabel)", group: "arme" },
  { id: "trizepsdrucken-seil", name: "Trizepsdrücken (Seil)", group: "arme" },
  { id: "franzoesisches-druecken", name: "Französisches Drücken", group: "arme" },
  { id: "trizeps-kickback", name: "Trizeps-Kickback", group: "arme" },
  { id: "dips", name: "Dips", group: "arme" },
  { id: "enges-bankdruecken", name: "Enges Bankdrücken", group: "arme" },
  { id: "unterarm-curl", name: "Unterarm-Curl (Wrist Curl)", group: "arme" },
  { id: "21er-curl", name: "21er Bizepscurl", group: "arme" },
  { id: "spider-curl", name: "Spider Curl", group: "arme" },
  { id: "zottman-curl", name: "Zottman Curl", group: "arme" },
  { id: "overhead-trizepsdruecken", name: "Überkopf-Trizepsdrücken (Kurzhantel)", group: "arme" },
  { id: "trizeps-dips-bank", name: "Trizeps-Dips (Bank)", group: "arme" },
  { id: "reverse-curl", name: "Reverse Curl", group: "arme" },
  { id: "unterarm-curl-reverse", name: "Unterarm-Curl (Reverse)", group: "arme" },

  // Rumpf
  { id: "plank", name: "Plank", group: "rumpf" },
  { id: "seitplank", name: "Seitplank", group: "rumpf" },
  { id: "crunches", name: "Crunches", group: "rumpf" },
  { id: "kabel-crunches", name: "Kabel-Crunches", group: "rumpf" },
  { id: "situps", name: "Sit-ups", group: "rumpf" },
  { id: "beinheben", name: "Beinheben (hängend)", group: "rumpf" },
  { id: "beinheben-liegend", name: "Beinheben (liegend)", group: "rumpf" },
  { id: "russian-twist", name: "Russian Twist", group: "rumpf" },
  { id: "ab-wheel", name: "Ab Wheel Rollout", group: "rumpf" },
  { id: "mountain-climber", name: "Mountain Climbers", group: "rumpf" },
  { id: "hollow-hold", name: "Hollow Hold", group: "rumpf" },
  { id: "dead-bug", name: "Dead Bug", group: "rumpf" },
  { id: "pallof-press", name: "Pallof Press", group: "rumpf" },
  { id: "landmine-twist", name: "Landmine Rotation", group: "rumpf" },
  { id: "v-ups", name: "V-Ups", group: "rumpf" },
  { id: "cable-woodchopper", name: "Kabel-Holzhacker", group: "rumpf" },
  { id: "reverse-crunch", name: "Reverse Crunch", group: "rumpf" },
  { id: "stir-the-pot", name: "Stir the Pot", group: "rumpf" },
];

const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

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
function isTimeBasedInLogs(logs, exerciseId, timeBasedExercises) {
  if (timeBasedExercises && timeBasedExercises[exerciseId]) return true;
  return (logs || []).some((l) =>
    logEntries(l).some((e) => e.exerciseId === exerciseId && e.targetUseTime)
  );
}

function getExerciseHistory(logs, exerciseId, excludeSessionId, isTimeBased = false, gymId = null) {
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

  let lastSets = null;
  let lastDate = null;
  let bestWeight = 0;
  let bestRepsAtBestWeight = 0;
  let lastNote = null;
  let bestDuration = 0;

  for (const log of past) {
    // Logs written by older versions (or a half-finished save) can be
    // missing `entries` or `sets` entirely, so every access is guarded
    // rather than assuming a fully-formed object.
    const entries = Array.isArray(log?.entries) ? log.entries : [];
    const entry = entries.find((e) => e && e.exerciseId === exerciseId);
    if (!entry) continue;
    if (lastNote === null && typeof entry.notes === "string" && entry.notes.trim()) {
      lastNote = entry.notes.trim();
    }

    const sets = Array.isArray(entry.sets) ? entry.sets : [];
    const doneSets = sets.filter(
      (set) =>
        set &&
        set.done &&
        !set.warmup &&
        (isTimeBased ? Number(set.duration) > 0 : Number(set.weight) > 0)
    );
    if (doneSets.length === 0) continue;

    if (!lastSets) {
      lastSets = doneSets;
      lastDate = log.date;
    }

    if (isTimeBased) {
      for (const set of doneSets) bestDuration = Math.max(bestDuration, Number(set.duration) || 0);
    } else {
      // Numbers are compared explicitly: values that slipped through as
      // strings would otherwise compare lexically ("60" > "7" is false).
      for (const set of doneSets) {
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        if (weight > bestWeight) {
          bestWeight = weight;
          bestRepsAtBestWeight = reps;
        } else if (weight === bestWeight && reps > bestRepsAtBestWeight) {
          bestRepsAtBestWeight = reps;
        }
      }
    }
  }

  return { lastSets, lastDate, bestWeight, bestRepsAtBestWeight, bestDuration, lastNote };
}

// Liefert die komplette Verlaufsliste einer Übung über alle Trainings hinweg
// (jüngstes zuerst), inkl. der Notiz, die pro Trainingseinheit dazu hinterlegt wurde.
function getExerciseTimeline(logs, exerciseId) {
  if (!exerciseId) return [];
  return (Array.isArray(logs) ? logs : [])
    .map((l) => {
      // Same defensive treatment as getExerciseHistory: a log saved by an
      // older version may be missing entries/sets.
      const entries = Array.isArray(l?.entries) ? l.entries : [];
      const entry = entries.find((e) => e && e.exerciseId === exerciseId);
      if (!entry) return null;
      const sets = Array.isArray(entry.sets) ? entry.sets : [];
      return {
        date: l.date,
        sets: sets.filter((s) => s && s.done),
        note: typeof entry.notes === "string" && entry.notes.trim() ? entry.notes.trim() : null,
      };
    })
    .filter((t) => t && (t.sets.length > 0 || t.note))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Ist dieser Satz (im Vergleich zum bisherigen Bestwert) ein neuer Rekord?
function isNewPR(set, best, isTimeBased = false) {
  if (!set || !set.done || set.warmup) return false;
  if (isTimeBased) return Number(set.duration) > Number(best.bestDuration || 0) && Number(set.duration) > 0;
  // Explicit casts: a value still held as a string would otherwise be
  // compared lexically instead of numerically.
  const weight = toNum(set.weight);
  const reps = toNum(set.reps);
  const bestWeight = toNum(best.bestWeight);
  const bestReps = toNum(best.bestRepsAtBestWeight);
  if (weight <= 0) return false;
  if (weight > bestWeight) return true;
  return weight === bestWeight && bestWeight > 0 && reps > bestReps;
}


function estimate1RM(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  // Combine two well-established formulas for a more robust estimate than
  // either alone. Epley holds up well across most rep ranges; Brzycki is
  // very accurate for lower reps but becomes unstable (and can go
  // negative) as reps approach 37, so it's only blended in below that.
  const epley = w * (1 + r / 30);
  if (r < 37) {
    const brzycki = w * (36 / (37 - r));
    return (epley + brzycki) / 2;
  }
  return epley;
}

// Best estimated 1RM and best single-set volume (weight x reps in one set,
// not summed across a session) ever recorded for a given exercise. Used to
// show quick "personal best" context whenever someone taps an exercise.
function getExerciseBestStats(logs, exerciseId) {
  let best1RM = 0;
  let bestSetVolume = 0;
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    const entry = logEntries(log).find((e) => e.exerciseId === exerciseId);
    if (!entry) return;
    entrySets(entry).forEach((set) => {
      if (!set.done || set.warmup) return;
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      if (weight <= 0 || reps <= 0) return;
      best1RM = Math.max(best1RM, estimate1RM(weight, reps));
      bestSetVolume = Math.max(bestSetVolume, weight * reps);
    });
  });
  return { best1RM, bestSetVolume };
}

function calculateTrainingStats(logs, exBy, timeBasedExercises) {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalDuration = 0;
  let best1RM = 0;
  let prs = 0;
  const muscleVolume = {};
  // Per exercise we remember both the heaviest weight and how many reps
  // were managed at that weight, so beating either counts as a record.
  const bestByExercise = {};
  const bestDurationByExercise = {};

  // Walk logs oldest-first so we can tell, per exercise, which set was a
  // new record at the time it happened (needed to actually count PRs —
  // this used to be declared but never incremented).
  const chronological = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

  chronological.forEach((log) => {
    (Array.isArray(log?.entries) ? log.entries : []).forEach((entry) => {
      if (!entry) return;
      const ex = exBy[entry.exerciseId];
      if (!ex) return;
      const timeBased = !!timeBasedExercises[entry.exerciseId];
      (Array.isArray(entry.sets) ? entry.sets : []).forEach((set) => {
        if (!set || !set.done || set.warmup) return;
        totalSets += 1;
        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;
        const duration = Number(set.duration) || 0;
        totalReps += reps;
        totalDuration += timeBased ? duration : 0;
        if (!timeBased) {
          const volume = weight * reps;
          totalVolume += volume;
          best1RM = Math.max(best1RM, estimate1RM(weight, reps));
          muscleVolume[ex.group] = (muscleVolume[ex.group] || 0) + volume;
          const prev = bestByExercise[entry.exerciseId] || { weight: 0, reps: 0 };
          if (weight > 0) {
            if (weight > prev.weight) {
              // Heavier than ever before.
              prs += 1;
              bestByExercise[entry.exerciseId] = { weight, reps };
            } else if (weight === prev.weight && reps > prev.reps) {
              // Same weight but more reps is progress too, and used to go
              // uncounted entirely.
              prs += 1;
              bestByExercise[entry.exerciseId] = { weight, reps };
            }
          }
        } else {
          const prevBest = bestDurationByExercise[entry.exerciseId] || 0;
          if (duration > 0 && duration > prevBest) {
            prs += 1;
            bestDurationByExercise[entry.exerciseId] = duration;
          }
        }
      });
    });
  });

  return { totalVolume, totalSets, totalReps, totalDuration, best1RM, prs, muscleVolume };
}

function getTimePR(logs, exerciseId) {
  let best = 0;
  (Array.isArray(logs) ? logs : []).forEach((log) => {
    const entries = Array.isArray(log?.entries) ? log.entries : [];
    const entry = entries.find((e) => e && e.exerciseId === exerciseId);
    const sets = Array.isArray(entry?.sets) ? entry.sets : [];
    sets.forEach((s) => {
      if (s && s.done && !s.warmup) best = Math.max(best, Number(s.duration) || 0);
    });
  });
  return best;
}

const EQUIPMENT_OPTIONS = ["Langhantel", "Kurzhanteln", "Kabelzug", "Maschine", "Kettlebell", "Körpergewicht", "Band", "Sonstiges"];

function getExerciseMeta(exercise) {
  if (exercise?.meta) return exercise.meta;
  const n = (exercise?.name || "").toLowerCase();
  let equipment = "Sonstiges";
  if (n.includes("kabel") || n.includes("cable")) equipment = "Kabelzug";
  else if (n.includes("maschine") || n.includes("presse")) equipment = "Maschine";
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

function beepRestTimer() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (_) {}
  try { navigator.vibrate?.([180, 80, 180]); } catch (_) {}
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

export default function TrainingApp() {
  // Plans is the first thing shown: starting a workout is the most
  // common reason to open the app.
  const [tab, setTab] = useState("plans");
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
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [exerciseNameOverrides, setExerciseNameOverrides] = useState({});
  const [exerciseSubgroupOverrides, setExerciseSubgroupOverrides] = useState({});
  const [exerciseEquipmentOverrides, setExerciseEquipmentOverrides] = useState({});
  const [timeBasedExercises, setTimeBasedExercises] = useState({});

  const [building, setBuilding] = useState(false); // plan builder open
  const [editingPlan, setEditingPlan] = useState(null);
  const [undoDelete, setUndoDelete] = useState(null);
  const undoTimerRef = useRef(null);
  const [session, setSession] = useState(null); // active workout session

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
      const [p, l, c, f, en, no, tb, active, prog, activeProg, sg, ce, cc, eq, th, gy, activeGy] = await Promise.all([
        loadJSON("training-plans", []),
        loadJSON("workout-logs", []),
        loadJSON("custom-exercises", []),
        loadJSON("plan-folders", []),
        loadJSON("exercise-notes", {}),
        loadJSON("exercise-name-overrides", {}),
        loadJSON("exercise-time-based", {}),
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
      setSession(active || null);
      // Landing on the plans list while a workout is still running means
      // hunting for the way back - on a phone the app gets reloaded between
      // sets often enough that this should just resume where it left off.
      if (active) setTab("log");
      setPrograms(migratedPrograms);
      setActiveProgramId(resolvedActiveProgramId);
      setCalendarEntries(ce);
      setCalendarCategories(cc);
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

  const createSessionFromPlan = (plan, gymId = null) => ({
    id: uid(),
    planId: plan.id,
    planName: plan.name,
    gymId: gymId || null,
    date: new Date().toISOString(),
    entries: plan.items.map((it) => {
      const targetSets = it.sets || 1;
      // Start from what was actually achieved last time rather than the
      // numbers stored in the plan - the plan holds the starting point, the
      // last workout holds the current state. With a gym selected the search
      // prefers that gym (weights differ between gyms).
      const history = getExerciseHistory(logs, it.exerciseId, null, !!it.useTime, gymId);
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
      const makeSet = (warmup) => ({
        reps: targetReps,
        // Pre-filled the German way too, so a workout doesn't start showing
        // "62.5" and only switch to "62,5" once the field has been touched.
        weight: warmup ? 0 : fmtDecimal(targetWeight),
        duration: targetDuration,
        done: false,
        warmup,
      });
      const sets = [
        ...Array.from({ length: warmupCount }, () => makeSet(true)),
        ...Array.from({ length: targetSets }, () => makeSet(false)),
      ];
      return {
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
        notes: "",
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
    await saveJSON("active-workout", next);
  };

  const updateSession = async (next) => {
    setSession(next);
    await saveJSON("active-workout", next);
  };

  const clearActiveSession = async () => {
    setSession(null);
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
  const handleSetExerciseEquipment = async (exerciseId, equipment) => {
    await persistExerciseEquipmentOverrides({ ...exerciseEquipmentOverrides, [exerciseId]: equipment });
  };
  const handleToggleTimeBased = async (exerciseId, enabled) => {
    await persistTimeBasedExercises({ ...timeBasedExercises, [exerciseId]: enabled });
  };
  const handleAddCustomExercise = async (exercise) => {
    await persistCustomExercises([...customExercises, exercise]);
  };

  const addCalendarAction = async (date, categoryId, text) => {
    await persistCalendarEntries([
      ...calendarEntries,
      { id: uid(), date, type: "action", categoryId, text },
    ]);
  };
  const scheduleCalendarWorkout = async (date, planId) => {
    await persistCalendarEntries([
      ...calendarEntries,
      { id: uid(), date, type: "workout", planId, logId: null },
    ]);
  };
  // Calendar deletions go through the same confirmation step as deleting a
  // plan or a folder, so a mis-tap can't silently wipe an entry.
  const deleteCalendarEntry = (id) => {
    const entry = calendarEntries.find((ce) => ce.id === id);
    const label =
      entry?.type === "workout"
        ? `Diesen Workout-Termin wirklich aus dem Kalender entfernen?`
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
  const startScheduledWorkout = async (plan, calendarEntryId) => {
    requestStart(plan, calendarEntryId);
  };

  // Asking which gym before the workout begins is what makes the whole
  // thing work: it is the only moment where the answer is certain, and
  // everything downstream (suggestions, PRs, charts) depends on it.
  const [pendingStart, setPendingStart] = useState(null);
  const [gymManagerOpen, setGymManagerOpen] = useState(false);
  const [finishSummary, setFinishSummary] = useState(null);
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
        text: `Sicherung erstellt: ${s.plans} Pläne, ${s.logs} Trainings, ${s.exercises} eigene Übungen.`,
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
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

        :root {
          --bg: #141317;
          --surface: #1d1c21;
          --surface-alt: #26242b;
          --border: #37343c;
          --text: #f4f0e6;
          --text-dim: #9a948d;
          --accent: #c1652e;
          --accent-dim: #8f4a22;
          --brass: #e8c547;
          --success: #6ea866;
          --danger: #d85a4f;
          --shadow-strength: 0.18;
        }
        /* Light mode keeps the same warm accent so the app still feels
           like itself; only the surfaces and text invert. Shadows are
           softened because heavy shadows read as dirt on a light UI. */
        .app-shell.theme-light {
          --bg: #f2efe9;
          --surface: #ffffff;
          --surface-alt: #eae5dc;
          --border: #d6cfc3;
          --text: #23201d;
          --text-dim: #6d675f;
          --accent: #b25a26;
          --accent-dim: #8f4a22;
          --brass: #a8862a;
          --success: #4f8049;
          --danger: #c04437;
          --shadow-strength: 0.08;
        }

        * { box-sizing: border-box; }

        .app-shell {
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
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--border);
          position: relative;
        }

        .content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px 16px 90px;
        }

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

        .sub-tab-row {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }
        .sub-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: 'Inter', sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          padding: 9px 0;
          border-radius: 10px;
          cursor: pointer;
          transition: color 120ms ease, background 120ms ease, transform 100ms ease;
        }
        .sub-tab.active {
          color: var(--accent);
          background: rgba(193, 101, 46, 0.14);
          border-color: var(--accent);
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
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .history-card-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11.5px;
          color: var(--text-dim);
          margin-top: 4px;
        }
        .history-card-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
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
        .history-set-summary {
          color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
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
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--surface-alt);
          color: var(--text-dim);
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
        }
        .tag-subgroup {
          background: transparent;
          border-style: dashed;
          border-color: var(--accent);
          color: var(--accent);
        }
        .tag-equipment {
          background: transparent;
          border-color: transparent;
          color: var(--text-dim);
          padding-left: 0;
        }
        .tag-clickable {
          cursor: pointer;
          text-decoration: underline dotted;
          text-underline-offset: 3px;
        }
        .tag-clickable:active {
          opacity: 0.7;
        }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,var(--shadow-strength));
        }
        .chart-card {
          padding: 16px 12px 14px;
          border-color: rgba(255,255,255,0.06);
        }
        .chart-card .plan-title {
          padding-left: 4px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .stats-grid-secondary {
          grid-template-columns: repeat(3, 1fr);
        }
        .stats-grid-secondary .stat-value {
          font-size: 20px;
        }
        .stat-hero {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: linear-gradient(155deg, var(--surface-alt), var(--surface));
          border: 1px solid var(--border);
          border-left: 3px solid var(--accent);
          border-radius: 14px;
          padding: 18px 18px 16px;
          margin-bottom: 10px;
        }
        .stat-hero-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-dim);
        }
        .stat-hero-value {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: 42px;
          line-height: 1.1;
          color: var(--accent);
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
          gap: 4px;
          background: var(--surface-alt, rgba(255,255,255,0.04));
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 14px 12px;
        }
        .stat-value {
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 28px;
          line-height: 1.1;
          color: var(--accent);
        }
        .stat-label {
          font-size: 12.5px;
          color: var(--text-dim);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 14px;
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
          margin-bottom: 14px;
        }
        .chip {
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-dim);
          cursor: pointer;
        }
        .chip.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .chip-sm {
          padding: 5px 10px;
          font-size: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .ex-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 4px;
          border-bottom: 1px solid var(--border);
        }
        .ex-row:last-child { border-bottom: none; }
        .ex-name { font-weight: 500; font-size: 14.5px; }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14px;
          border-radius: 10px;
          border: none;
          padding: 11px 16px;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-primary { background: var(--accent); color: white; box-shadow: 0 4px 14px rgba(193,101,46,0.35); }
        .btn-ghost { background: var(--surface-alt); color: var(--text); border: 1px solid var(--border); }
        .btn-block { width: 100%; }
        .btn-sm { padding: 7px 10px; font-size: 12.5px; }
        .btn-danger { background: rgba(216,90,79,0.12); color: var(--danger); }
        .btn-icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--surface-alt); border: 1px solid var(--border); color: var(--text);
          cursor: pointer;
        }

        .fab-nav {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          display: flex;
          background: var(--surface);
          border-top: 1px solid var(--border);
          padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
          transition: transform 0.25s ease;
          transform: translateY(0);
          /* The bar carries a transform, which creates its own stacking
             context. Pinning it to a low layer makes sure overlays (200+)
             are always drawn on top, no matter how the browser orders
             transformed siblings. */
          z-index: 10;
        }
        .fab-nav.nav-hidden {
          transform: translateY(100%);
        }
        .nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          background: none;
          border: none;
          color: var(--text-dim);
          font-family: 'Inter', sans-serif;
          font-size: 10.5px;
          padding: 6px 0;
          cursor: pointer;
          transition: color 120ms ease, transform 100ms ease;
        }
        .nav-btn.active { color: var(--accent); }
        .nav-btn:active { transform: scale(0.92); }

        .plan-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.3px;
        }

        /* iOS Safari auto-zooms the page whenever a focused form control
           has a font-size below 16px. Keeping every input at 16px stops
           that jump-and-zoom when tapping a name to rename it. */
        input[type=number], input[type=text] {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 8px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          width: 100%;
        }
        select, textarea {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 8px 10px;
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
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
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

        .set-row {
          display: grid;
          grid-template-columns: 24px 28px 24px minmax(0, 1fr) minmax(0, 1fr);
          gap: 6px;
          align-items: center;
          margin-bottom: 6px;
        }
        .entry-card {
          transition: box-shadow 160ms ease;
          will-change: transform;
        }
        .entry-card.is-dragging {
          position: relative;
          z-index: 20;
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
        .warmup-toggle {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1.5px solid var(--border);
          background: var(--surface-alt);
          color: var(--text-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .warmup-toggle.active {
          background: var(--brass);
          border-color: var(--brass);
          color: var(--bg);
        }
        .set-row.is-warmup input,
        .set-row.is-warmup .set-num {
          opacity: 0.6;
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
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 9px 12px;
          color: var(--text);
          cursor: pointer;
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
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
          background: var(--surface);
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
        .folder-header-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
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
        @keyframes modal-rise {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .modal-overlay, .modal-card { animation: none; }
        }
        .modal-card {
          width: 100%;
          max-height: 100%;
          animation: modal-rise 260ms cubic-bezier(0.22, 0.8, 0.3, 1) both;
          background: var(--surface);
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
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 16px;
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
          padding: 11px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface-alt);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          cursor: pointer;
        }
        .modal-option.active {
          border-color: var(--accent);
          color: var(--accent);
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
          text-decoration-color: var(--border);
          text-underline-offset: 3px;
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
          background: var(--surface);
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
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-radius: 18px 18px 0 0;
          padding: 18px 16px calc(22px + env(safe-area-inset-bottom));
        }
        .move-sheet-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 16px;
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
          background: var(--surface-alt);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 10px;
          padding: 11px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
        }
        .move-option.active {
          border-color: var(--accent);
          background: rgba(193,101,46,0.14);
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
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface-alt);
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
        .duration-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text-dim);
          background: var(--surface-alt);
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
          background: var(--surface);
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
          will-change: transform;
        }
        .plan-item-row.is-dragging {
          position: relative;
          z-index: 20;
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
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text-dim);
          text-align: center;
        }
        .set-check {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1.5px solid var(--border);
          background: var(--surface-alt);
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
          font-size: 12px;
          color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
          background: var(--surface-alt);
          border-radius: 8px;
          padding: 6px 10px;
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
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--accent);
          margin: 10px 2px 4px;
        }
        .superset-card {
          border-color: var(--accent);
          position: relative;
        }
        .superset-card-linked {
          margin-bottom: 2px;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
          border-bottom-width: 0;
        }
        .superset-card + .superset-card {
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
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

        .auto-run-bar {
          background: var(--surface);
          border: 1px solid var(--accent);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
          text-align: center;
        }
        .auto-run-phase {
          font-family: 'Oswald', sans-serif;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .auto-run-time {
          font-family: 'Oswald', sans-serif;
          font-size: 44px;
          font-weight: 600;
          line-height: 1.05;
          color: var(--accent);
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
          background: var(--accent);
          color: white;
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 12px;
        }
        .rest-timer .rest-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 22px;
          font-weight: 600;
        }
        .rest-timer .rest-actions {
          display: flex;
          gap: 6px;
        }
        .rest-btn {
          background: rgba(255,255,255,0.18);
          border: none;
          color: white;
          border-radius: 8px;
          padding: 6px 9px;
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
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
        .confirm-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;max-width:320px;width:100%}
        .confirm-card p{margin:0 0 16px;font-size:14px;line-height:1.5}
        .confirm-actions{display:flex;gap:8px}
        .toast-snackbar{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:35;background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:10px 14px;box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:13px;max-width:90%;text-align:center}
        @media (max-width:600px){.content{padding-left:10px!important;padding-right:10px!important}.card{padding:12px!important}.set-row{grid-template-columns:24px 28px 28px 1fr 1fr!important;gap:5px!important}.set-row input{min-width:0}.meta-grid{grid-template-columns:1fr 1fr}.stat-value{font-size:23px!important}.fab-nav{left:8px!important;right:8px!important;bottom:8px!important}.nav-btn{min-width:0!important}.plan-title{font-size:17px}.btn{min-height:40px}.btn-icon{min-width:36px;min-height:36px}}
        @media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}

        .cal-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .cal-month-label {
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 16px;
          text-transform: capitalize;
          letter-spacing: 0.3px;
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
        .cal-day {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 3px 3px 4px;
          min-height: 40px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cal-day.is-outside {
          opacity: 0.35;
        }
        .cal-day.is-today {
          border-color: var(--accent);
        }
        .cal-day.is-selected {
          background: var(--surface-alt);
          box-shadow: inset 0 0 0 1px var(--accent);
        }
        .cal-day-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
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
        .cal-entry-chip {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 8.5px;
          line-height: 1.3;
          padding: 1.5px 4px;
          border-radius: 5px;
          border: 1px solid var(--border);
          color: var(--text-dim);
          background: var(--surface-alt);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cal-week-row.is-current-week .cal-entry-chip {
          white-space: normal;
          font-size: 10px;
        }
        .cal-entry-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cal-entry-workout {
          border-color: var(--accent);
          color: var(--accent);
        }
        .cal-entry-workout.is-done {
          border-color: var(--success);
          color: var(--success);
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
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
        }
      `}</style>

      <div className="content" onScroll={handleContentScroll}>
        <div className="tab-panel" key={loading ? "loading" : tab}>
        {loading ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={22} />
            <p>Lade deine Daten…</p>
          </div>
        ) : tab === "calendar" ? (
          <CalendarView
            entries={calendarEntries}
            categories={calendarCategories}
            plans={allPlans}
            logs={logs}
            exBy={allExBy}
            onAddAction={addCalendarAction}
            onScheduleWorkout={scheduleCalendarWorkout}
            onDeleteEntry={deleteCalendarEntry}
            onCreateCategory={createCalendarCategory}
            onDeleteCategory={deleteCalendarCategory}
            onStartScheduledWorkout={startScheduledWorkout}
          />
        ) : tab === "exercises" ? (
          <ExercisesView
            gyms={gyms}
            exercises={allExercises}
            logs={logs}
            exerciseNotes={exerciseNotes}
            exerciseSubgroupOverrides={exerciseSubgroupOverrides}
            onSetExerciseSubgroup={handleSetExerciseSubgroup}
            exerciseEquipmentOverrides={exerciseEquipmentOverrides}
            onSetExerciseEquipment={handleSetExerciseEquipment}
            onAddCustom={handleAddCustomExercise}
            onDeleteCustom={async (id) => {
              await persistCustomExercises(customExercises.filter((e) => e.id !== id));
            }}
            onUpdateExerciseNote={handleUpdateExerciseNote}
            onRenameExercise={handleRenameExercise}
            timeBasedExercises={timeBasedExercises}
            onToggleTimeBased={handleToggleTimeBased}
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
              exerciseEquipmentOverrides={exerciseEquipmentOverrides}
              onSetExerciseEquipment={handleSetExerciseEquipment}
              onAddCustom={handleAddCustomExercise}
              timeBasedExercises={timeBasedExercises}
              onUpdateExerciseNote={handleUpdateExerciseNote}
              onRenameExercise={handleRenameExercise}
              onToggleTimeBased={handleToggleTimeBased}
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
            onManageGyms={() => setGymManagerOpen(true)}
            onReorderFolders={persistFolders}
            onOpenBackup={() => setBackupOpen(true)}
              plans={allPlans}
              exBy={allExBy}
              folders={folders}
              theme={theme}
              onToggleTheme={toggleTheme}
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
              onStart={(plan) => requestStart(plan)}
            />
          )
        ) : tab === "log" ? (
          <LogView
            session={session}
            plans={allPlans}
            logs={logs}
            exBy={allExBy}
            exercises={allExercises}
            exerciseNotes={exerciseNotes}
            exerciseSubgroupOverrides={exerciseSubgroupOverrides}
            onSetExerciseSubgroup={handleSetExerciseSubgroup}
            exerciseEquipmentOverrides={exerciseEquipmentOverrides}
            onSetExerciseEquipment={handleSetExerciseEquipment}
            timeBasedExercises={timeBasedExercises}
            onUpdateExerciseNote={handleUpdateExerciseNote}
            onRenameExercise={handleRenameExercise}
            onToggleTimeBased={handleToggleTimeBased}
            onStartFromPlan={(plan) => requestStart(plan)}
            onUpdateSession={updateSession}
            onRequestConfirm={askConfirm}
            gyms={gyms}
            onFinish={async () => {
              if (!session) return;
              const durationMinutes = session.startedAt
                ? Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
                : null;
              const cleaned = {
                ...session,
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
                    // Record that this exercise ran on time. The automatic
                    // mode is a property of the session, which is gone once
                    // the workout is saved - without this flag the history,
                    // records and charts would later read it as a weight
                    // exercise with 0 kg.
                    targetUseTime:
                      (session.autoRun && e.autoRun !== false) || !!e.targetUseTime,
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
                  // Same rule the workout screen uses. Checking only the
                  // global setting missed every exercise that ran on time
                  // because of the automatic mode - so no record was ever
                  // recognised in a HIT workout.
                  const isTimeBased =
                    (session.autoRun && entry.autoRun !== false) ||
                    !!timeBasedExercises[entry.exerciseId] ||
                    !!entry.targetUseTime;
                  const best = getExerciseHistory(
                    logs, entry.exerciseId, cleaned.id, isTimeBased, cleaned.gymId
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
              // instead of a "start workout" prompt from now on.
              if (session.calendarEntryId && cleaned.entries.length > 0) {
                await persistCalendarEntries(
                  calendarEntries.map((ce) =>
                    ce.id === session.calendarEntryId ? { ...ce, logId: cleaned.id } : ce
                  )
                );
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
                  const nextItems = sourcePlan.items.map((item) => {
                    const entry = cleaned.entries.find((e) => e.exerciseId === item.exerciseId);
                    if (!entry) return item;
                    const workingSets = entry.sets.filter((s) => s.done && !s.warmup);
                    const lastSet = workingSets[workingSets.length - 1];
                    if (!lastSet) return item;
                    const achievedReps = Math.round(Number(lastSet.reps) || 0);
                    const achievedWeight = Number(lastSet.weight) || 0;
                    const achievedDuration = Math.round(Number(lastSet.duration) || 0);
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
            onDiscard={() => askConfirm("Aktives Training wirklich verwerfen? Alle nicht gespeicherten Sätze gehen verloren.", clearActiveSession)}
          />
        ) : (
          <ProgressView
            gyms={gyms}
            logs={logs}
            exBy={allExBy}
            exercises={allExercises}
            theme={theme}
            exerciseNotes={exerciseNotes}
            exerciseSubgroupOverrides={exerciseSubgroupOverrides}
            onSetExerciseSubgroup={handleSetExerciseSubgroup}
            exerciseEquipmentOverrides={exerciseEquipmentOverrides}
            onSetExerciseEquipment={handleSetExerciseEquipment}
            timeBasedExercises={timeBasedExercises}
            onUpdateExerciseNote={handleUpdateExerciseNote}
            onRenameExercise={handleRenameExercise}
            onToggleTimeBased={handleToggleTimeBased}
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

          <button
            className="btn btn-primary btn-block btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => setFinishSummary(null)}
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

      <nav className={`fab-nav ${navHidden ? "nav-hidden" : ""}`}>
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
        {session && (
          <button
            className={`nav-btn ${tab === "log" ? "active" : ""}`}
            onClick={() => setTab("log")}
          >
            <Play size={19} />
            Training
          </button>
        )}
        <button
          className={`nav-btn ${tab === "progress" ? "active" : ""}`}
          onClick={() => setTab("progress")}
        >
          <TrendingUp size={19} />
          Fortschritt
        </button>
      </nav>
    </div>
  );
}

function CalendarView({
  entries,
  categories,
  plans,
  logs,
  exBy,
  onAddAction,
  onScheduleWorkout,
  onDeleteEntry,
  onCreateCategory,
  onDeleteCategory,
  onStartScheduledWorkout,
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState("action");
  const [newActionText, setNewActionText] = useState("");
  const [newActionCategory, setNewActionCategory] = useState(null);
  const [workoutQuery, setWorkoutQuery] = useState("");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);

  const todayKey = toDateKey(today);
  const monthMatrix = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      (map[e.date] = map[e.date] || []).push(e);
    });
    return map;
  }, [entries]);
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

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

  const selectedEntries = entriesByDate[selectedDate] || [];

  const handleAddAction = () => {
    const trimmed = newActionText.trim();
    if (!trimmed) return;
    onAddAction(selectedDate, newActionCategory, trimmed);
    setNewActionText("");
    setAddOpen(false);
  };

  const filteredPlansForSchedule = plans.filter((p) =>
    p.name.toLowerCase().includes(workoutQuery.toLowerCase())
  );

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

      <div className="cal-weekday-row">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {monthMatrix.map((week, wi) => {
          const isCurrentWeek = week.some((d) => toDateKey(d) === todayKey);
          return (
            <div className={`cal-week-row ${isCurrentWeek ? "is-current-week" : ""}`} key={wi}>
              {week.map((d) => {
                const key = toDateKey(d);
                const inMonth = d.getMonth() === viewMonth;
                const dayEntries = entriesByDate[key] || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDate;
                const visibleEntries = isCurrentWeek ? dayEntries : dayEntries.slice(0, 2);
                const overflow = isCurrentWeek ? 0 : Math.max(0, dayEntries.length - 2);
                return (
                  <div
                    key={key}
                    className={`cal-day ${!inMonth ? "is-outside" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="cal-day-num">{d.getDate()}</span>
                    <div className="cal-day-entries">
                      {visibleEntries.map((entry) => {
                        if (entry.type === "workout") {
                          const plan = planById[entry.planId];
                          return (
                            <span
                              key={entry.id}
                              className={`cal-entry-chip cal-entry-workout ${entry.logId ? "is-done" : ""}`}
                            >
                              {entry.logId ? <Check size={9} /> : <Play size={9} />}
                              {plan ? plan.name : "Gelöschter Plan"}
                            </span>
                          );
                        }
                        const cat = categoryById[entry.categoryId];
                        return (
                          <span
                            key={entry.id}
                            className="cal-entry-chip"
                            style={cat ? { borderColor: cat.color, color: cat.color } : undefined}
                          >
                            <span className="cal-entry-dot" style={{ background: cat ? cat.color : "var(--text-dim)" }} />
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

        {selectedEntries.length === 0 && !addOpen && (
          <div className="empty-state" style={{ padding: "14px 0" }}>Noch keine Einträge an diesem Tag.</div>
        )}

        <div style={{ marginTop: selectedEntries.length ? 10 : 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedEntries.map((entry) => {
            if (entry.type === "workout") {
              const plan = planById[entry.planId];
              const log = entry.logId ? logs.find((l) => l.id === entry.logId) : null;
              return (
                <div key={entry.id} className="cal-detail-item">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="ex-name">
                      <Dumbbell size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                      {plan ? plan.name : "Gelöschter Plan"}
                    </span>
                    <button className="btn-icon" onClick={() => onDeleteEntry(entry.id)} title="Termin entfernen">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {log ? (
                    <div className="history-exercise-list" style={{ marginTop: 8 }}>
                      {logEntries(log).map((e) => {
                        const ex = exBy[e.exerciseId];
                        const workingSets = entrySets(e).filter((s) => !s.warmup);
                        const summary = workingSets
                          .map((s) => (s.duration ? `${s.duration}s` : `${s.weight || 0}kg×${s.reps || 0}`))
                          .join(", ");
                        return (
                          <div key={e.exerciseId} className="history-exercise-row">
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
                      className="btn btn-primary btn-block btn-sm"
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
            const cat = categoryById[entry.categoryId];
            return (
              <div key={entry.id} className="cal-detail-item">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span className="folder-dot" style={{ background: cat ? cat.color : "var(--text-dim)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entry.text}</span>
                  </span>
                  <button className="btn-icon" onClick={() => onDeleteEntry(entry.id)} title="Eintrag löschen">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {addOpen && (
          <Modal title="Eintrag hinzufügen" onClose={() => setAddOpen(false)} width={420}>
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
                  placeholder="z. B. Physio-Termin, Ruhetag, Waage…"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
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
                          onClick={() => { onScheduleWorkout(selectedDate, p.id); setAddOpen(false); }}
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
  const rafRef = useRef(null);

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

  useEffect(() => {
    if (draggingId === null) return undefined;
    const onMove = (e) => {
      if (e.cancelable) e.preventDefault();
      pendingYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        paintDrag(pendingYRef.current - dragStartYRef.current);
      });
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
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

function NewExerciseForm({ exercises, onAddCustom, onSetExerciseSubgroup, onDone }) {
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState(MUSCLE_GROUPS[0].id);
  const [newSubgroup, setNewSubgroup] = useState(null);
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
    if (newSubgroup) onSetExerciseSubgroup(id, newSubgroup);
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
              onClick={() => { setNewGroup(g.id); setNewSubgroup(null); }}
            >
              {g.label}
            </span>
          ))}
        </div>
      </div>
      {(SUBGROUPS[newGroup] || []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">Untergruppe (optional)</label>
          <div className="chip-row" style={{ marginTop: 6 }}>
            <span
              className={`chip chip-sm ${!newSubgroup ? "active" : ""}`}
              onClick={() => setNewSubgroup(null)}
            >
              Keine
            </span>
            {SUBGROUPS[newGroup].map((sg) => (
              <span
                key={sg.id}
                className={`chip chip-sm ${newSubgroup === sg.id ? "active" : ""}`}
                onClick={() => setNewSubgroup(sg.id)}
              >
                {sg.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Equipment</label>
        <select value={newEquipment} onChange={(e) => setNewEquipment(e.target.value)}>
          {EQUIPMENT_OPTIONS.map((x) => <option key={x}>{x}</option>)}
        </select>
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
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  onAddCustom,
  onDeleteCustom,
  onUpdateExerciseNote,
  onRenameExercise,
  timeBasedExercises,
  onToggleTimeBased,
  onRequestConfirm,
  gyms = [],
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("alle");
  const [subgroupFilter, setSubgroupFilter] = useState("alle");
  const [creating, setCreating] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  // Look the exercise up live so a rename is reflected immediately instead
  // of the overlay being stuck on a stale snapshot.
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;

  const filtered = exercises.filter((e) => {
    const matchesGroup = group === "alle" || e.group === group;
    const matchesSubgroup =
      subgroupFilter === "alle" ||
      exerciseHasSubgroup(e, exerciseSubgroupOverrides, subgroupFilter);
    const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
    return matchesGroup && matchesSubgroup && matchesQuery;
  });
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

      {creating ? (
        <NewExerciseForm
          exercises={exercises}
          onAddCustom={onAddCustom}
          onSetExerciseSubgroup={onSetExerciseSubgroup}
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GroupTag group={e.group} />
                <SubgroupTag
                  group={e.group}
                  subgroupIds={getExerciseSubgroups(e, exerciseSubgroupOverrides)}
                />
                <span className="tag tag-equipment">{getExerciseEquipment(e, exerciseEquipmentOverrides)}</span>
                {e.custom && (
                  <button
                    className="btn-icon"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onRequestConfirm(`Eigene Übung „${e.name}“ wirklich löschen?`, () => onDeleteCustom(e.id));
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
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
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
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onClose,
  gyms = [],
}) {
  // Drei Reiter statt einer langen Liste: Zahlen zuerst, Einstellungen zuletzt.
  const [detailTab, setDetailTab] = useState("stats");
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
                <GroupTag group={exercise.group} />
                <SubgroupTag group={exercise.group} subgroupIds={currentSubgroups} />
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
                <div className="stat-item">
                  <span className="stat-value">{Math.round(bestStats.best1RM)} kg</span>
                  <span className="stat-label">Geschätztes 1RM</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{Math.round(bestStats.bestSetVolume)} kg</span>
                  <span className="stat-label">Bestes Satz-Volumen</span>
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
                {t.sets.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {t.sets.map((s, i) => (
                      <span key={i} className="tag" style={s.warmup ? { opacity: 0.6 } : undefined}>
                        {s.warmup ? "W · " : ""}
                        {timeBasedExercises[exercise.id]
                          ? `${s.duration || 0}s`
                          : `${s.weight || 0}kg×${s.reps || 0}`}
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
              className={`chip chip-sm ${!!timeBasedExercises[exercise.id] ? "active" : ""}`}
              onClick={() => onToggleTimeBased(exercise.id, !timeBasedExercises[exercise.id])}
              title="Zeitangabe für diese Übung aktivieren (z. B. Plank, Sprints)"
            >
              <Clock size={11} /> Zeitbasiert
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

      {editingEquipment && (
        <Modal title="Equipment wählen" onClose={() => setEditingEquipment(false)}>
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
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  onAddCustom,
  timeBasedExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onCancel,
  onSave,
  onCreateFolder,
  gyms = [],
  activeGymId = null,
}) {
  const [name, setName] = useState(initialPlan?.name || "");
  const [items, setItems] = useState(initialPlan?.items || []); // {exerciseId, sets, reps}
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
  const [restPopupFor, setRestPopupFor] = useState(null); // "plan" | exerciseId
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
    getId: (it) => it.exerciseId,
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
    [exercises, group, subgroupFilter, exerciseSubgroupOverrides, query, sortRank]
  );
  // Rendering every one of the ~150 exercises made each tap on "Add"
  // redraw the whole list, which felt sluggish. Only a screenful is
  // rendered; narrowing via search/filter reveals the rest.
  const visibleFiltered = filtered.slice(0, EXERCISE_PICKER_LIMIT);
  const hiddenCount = filtered.length - visibleFiltered.length;
  const activeGroupSubgroups = group !== "alle" ? SUBGROUPS[group] || [] : [];

  const addExercise = (exerciseId) => {
    if (items.some((i) => i.exerciseId === exerciseId)) return;
    // Start from what was last achieved instead of a generic 3x10 - when you
    // build a plan around an exercise you already train, those numbers are
    // the useful starting point.
    const wasTimed = isTimeBasedInLogs(logs, exerciseId, timeBasedExercises);
    const history = getExerciseHistory(logs, exerciseId, null, wasTimed, activeGymId);
    const working = (history?.lastSets || []).filter((set) => !set.warmup);
    const last = working[0];
    const warmCount = (history?.lastSets || []).filter((set) => set.warmup).length;
    setItems([...items, {
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
  const removeExercise = (exerciseId) => {
    setItems(items.filter((i) => i.exerciseId !== exerciseId));
    setExpandedItemId((cur) => (cur === exerciseId ? null : cur));
  };
  const toggleExercise = (exerciseId) => {
    if (items.some((i) => i.exerciseId === exerciseId)) removeExercise(exerciseId);
    else addExercise(exerciseId);
  };
  const toggleSupersetWithNext = (exerciseId) => {
    setItems(
      items.map((i) =>
        i.exerciseId === exerciseId ? { ...i, supersetWithNext: !i.supersetWithNext } : i
      )
    );
  };
  const updateItem = (exerciseId, field, value) => {
    // Store exactly what the user typed while they're typing — clamping to
    // a minimum on every keystroke made it impossible to clear a field to
    // type a new number (deleting the digits always snapped straight back
    // to 1). The minimum is enforced once the field is left, in
    // handleItemBlur below.
    setItems(
      items.map((i) => (i.exerciseId === exerciseId ? { ...i, [field]: value } : i))
    );
  };
  const handleItemBlur = (exerciseId, field, min) => {
    setItems(
      items.map((i) => {
        if (i.exerciseId !== exerciseId) return i;
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
  const updateItemWeight = (exerciseId, value) => {
    setItems(
      items.map((i) => (i.exerciseId === exerciseId ? { ...i, weight: value } : i))
    );
  };
  const toggleItemTime = (exerciseId, useTime) => {
    setItems(
      items.map((i) => (i.exerciseId === exerciseId ? { ...i, useTime } : i))
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
            onSetExerciseSubgroup={onSetExerciseSubgroup}
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
      <div className="card exercise-picker-list">
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: "14px 0" }}>Keine Übung gefunden.</div>
        )}
        {visibleFiltered.map((e) => {
          const added = items.some((i) => i.exerciseId === e.id);
          return (
            <div className="ex-row" key={e.id}>
              <span
                className="ex-name ex-name-clickable"
                onClick={() => setSelectedExerciseId(e.id)}
              >
                {e.name}
              </span>
              <button
                className={`btn btn-sm ${added ? "btn-ghost" : "btn-primary"}`}
                onClick={() => (added ? removeExercise(e.id) : addExercise(e.id))}
              >
                {added ? <Check size={14} /> : <Plus size={14} />}
                {added ? "Drin" : "Add"}
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
                    ? "Satz 1 aller Übungen, dann Satz 2 aller Übungen. Die Satzpause läuft zwischen den Übungen, die Rundenpause nach der letzten Übung einer Runde."
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
                const isDragging = draggingId === it.exerciseId;
                const isOpen = expandedItemId === it.exerciseId;
                const warm = Math.max(0, toNum(it.warmupSets));
                return (
                  <React.Fragment key={it.exerciseId}>
                  <div
                    ref={(el) => { itemRefs.current[it.exerciseId] = el; }}
                    className={`plan-item-row builder-item ${isOpen ? "is-open" : ""} ${itemMenuId === it.exerciseId ? "menu-open" : ""} ${isDragging ? "is-dragging" : ""}`}
                  >
                    <div className="builder-item-head">
                      <span
                        className="drag-handle"
                        title="Gedrückt halten, um die Reihenfolge zu ändern"
                        {...dragHandleProps(it.exerciseId)}
                      >
                        <GripVertical size={16} />
                      </span>
                      <div
                        className="builder-item-main"
                        onClick={() => setExpandedItemId(isOpen ? null : it.exerciseId)}
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
                      <div className={`item-menu-wrap ${itemMenuUp && itemMenuId === it.exerciseId ? "drop-up" : ""}`}>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            const opening = itemMenuId !== it.exerciseId;
                            setItemMenuUp(opening ? shouldDropUp(e.target) : false);
                            setItemMenuId(opening ? it.exerciseId : null);
                          }}
                          title="Weitere Optionen"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {itemMenuId === it.exerciseId && (
                          <div
                            ref={itemMenuRef}
                            className="program-menu"
                            style={{ top: "calc(100% + 4px)", right: 0, left: "auto" }}
                          >
                            {itemIndex < items.length - 1 && (
                              <button
                                className="program-menu-item"
                                onClick={() => { toggleSupersetWithNext(it.exerciseId); setItemMenuId(null); }}
                              >
                                <Repeat size={14} />
                                {it.supersetWithNext ? "Superset-Verknüpfung lösen" : "Mit nächster Übung verknüpfen"}
                              </button>
                            )}
                            {planAutoRun && (
                              <>
                                <button
                                  className="program-menu-item"
                                  onClick={() => { setRestPopupFor(`time:${it.exerciseId}`); setItemMenuId(null); }}
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
                                    updateItem(it.exerciseId, "autoRun", it.autoRun === false ? null : false);
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
                              onClick={() => { setRestPopupFor(it.exerciseId); setItemMenuId(null); }}
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
                                onClick={() => { toggleItemTime(it.exerciseId, !itemUsesTime); setItemMenuId(null); }}
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
                              onClick={() => { removeExercise(it.exerciseId); setItemMenuId(null); }}
                            >
                              <Trash2 size={14} /> Übung entfernen
                            </button>
                          </div>
                        )}
                      </div>
                      <span
                        className="builder-chevron"
                        onClick={() => setExpandedItemId(isOpen ? null : it.exerciseId)}
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
                              min="0"
                              value={it.warmupSets ?? 0}
                              onChange={(e) => updateItem(it.exerciseId, "warmupSets", e.target.value)}
                              onBlur={() => handleItemBlur(it.exerciseId, "warmupSets", 0)}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="field-label">Sätze</label>
                            <input
                              type="number"
                              min="1"
                              value={it.sets}
                              onChange={(e) => updateItem(it.exerciseId, "sets", e.target.value)}
                              onBlur={() => handleItemBlur(it.exerciseId, "sets", 1)}
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
                                min="1"
                                value={shownSeconds}
                                onChange={(e) =>
                                  updateItem(
                                    it.exerciseId,
                                    autoTimed ? "autoSeconds" : "duration",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  handleItemBlur(it.exerciseId, autoTimed ? "autoSeconds" : "duration", 1)
                                }
                              />
                            </div>
                          ) : (
                            <div style={{ flex: 1 }}>
                              <label className="field-label">Wdh.</label>
                              <input
                                type="number"
                                min="1"
                                value={it.reps}
                                onChange={(e) => updateItem(it.exerciseId, "reps", e.target.value)}
                                onBlur={() => handleItemBlur(it.exerciseId, "reps", 1)}
                              />
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <label className="field-label">kg</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={it.weight ?? 0}
                              onChange={(e) => updateItemWeight(it.exerciseId, e.target.value)}
                              onBlur={() => handleItemBlur(it.exerciseId, "weight", 0)}
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
                    reps: Math.max(1, Number(i.reps) || 1),
                    weight: Math.max(0, toNum(i.weight) || 0),
                    duration: Math.max(1, Number(i.duration) || 1),
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
          : restPopupFor.startsWith("time:") ? "itemTime"
          : "itemRest";
        const itemId = restPopupFor.startsWith("time:") ? restPopupFor.slice(5) : restPopupFor;
        const item = items.find((i) => i.exerciseId === itemId);
        const titles = {
          planRest: "Pause nach jedem Satz",
          roundRest: planAutoOrder === "circuit" ? "Pause nach jeder Runde" : "Pause nach jeder Übung",
          autoSeconds: "Zeit pro Satz",
          itemRest: "Pause für diese Übung",
          itemTime: "Zeit für diese Übung",
        };
        const presets = kind === "autoSeconds" || kind === "itemTime"
          ? [15, 20, 30, 40, 45, 60, 90]
          : [0, 15, 30, 45, 60, 90, 120, 180];
        const current =
          kind === "planRest" ? planRest
          : kind === "roundRest" ? planRoundRest
          : kind === "autoSeconds" ? planAutoSeconds
          : kind === "itemTime" ? item?.autoSeconds
          : item?.restSeconds;
        const apply = (sec) => {
          if (kind === "planRest") setPlanRest(sec);
          else if (kind === "roundRest") setPlanRoundRest(sec);
          else if (kind === "autoSeconds") setPlanAutoSeconds(sec);
          else if (kind === "itemTime") updateItem(itemId, "autoSeconds", sec);
          else updateItem(itemId, "restSeconds", sec);
        };
        const inheritLabel =
          kind === "itemTime" ? `Wie im Workout (${planAutoSeconds}s)`
          : `Wie im Workout (${planRest === 0 ? "Aus" : `${planRest}s`})`;
        const canInherit = kind === "itemRest" || kind === "itemTime";
        const minValue = kind === "autoSeconds" || kind === "itemTime" ? 1 : 0;

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
                  {sec === 0 ? "Aus" : `${sec} Sekunden`}
                  {current === sec && <Check size={15} />}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <label className="field-label">Eigener Wert (Sekunden)</label>
              <input
                type="number"
                min={minValue}
                step="5"
                value={current ?? (kind === "itemTime" ? planAutoSeconds : planRest)}
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
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan card (press-and-hold to move into a folder)
// ---------------------------------------------------------------------------

function PlanCard({ plan, exBy, onDelete, onEdit, onStart, onLongPress }) {
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
        <div>
          <div className="plan-title">{plan.name}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn-icon" onClick={guardClick(() => onEdit?.(plan))} title="Plan bearbeiten"><PencilLine size={15} /></button>
          <button className="btn-icon" onClick={guardClick(() => onDelete(plan.id))} title="Plan löschen"><Trash2 size={15} /></button>
        </div>
      </div>
      <div style={{ margin: "10px 0", color: "var(--text-dim)", fontSize: 13 }}>
        {plan.items
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

function PlansView({
  plans,
  exBy,
  folders,
  theme,
  onToggleTheme,
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
  onMovePlan,
  onManageGyms = () => {},
  onOpenBackup = () => {},
  onReorderFolders = () => {},
}) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [movingPlan, setMovingPlan] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [renamingProgram, setRenamingProgram] = useState(false);
  const [renameProgramName, setRenameProgramName] = useState("");
  const toggleFolderCollapsed = (id) =>
    setCollapsedFolders((s) => ({ ...s, [id]: !s[id] }));

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

  const renderPlanCard = (plan) => (
    <PlanCard
      key={plan.id}
      plan={plan}
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
              onClick={() => { setProgramMenuOpen(false); onManageGyms(); }}
            >
              <Dumbbell size={14} /> Gyms verwalten
            </button>
            <button
              className="program-menu-item"
              onClick={() => { setProgramMenuOpen(false); onOpenBackup(); }}
            >
              <Save size={14} /> Daten sichern
            </button>
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
            <div className="program-menu-divider" />
            <button
              className="program-menu-item"
              onClick={() => {
                onToggleTheme();
                setProgramMenuOpen(false);
              }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Heller Modus" : "Dunkler Modus"}
            </button>
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
              <span className="tag" style={{ marginLeft: "auto" }}>{folderPlans.length}</span>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); onDeleteFolder(f.id); }}
                title="Ordner löschen"
              >
                <Trash2 size={13} />
              </button>
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
  exBy,
  exercises,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  timeBasedExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  onStartFromPlan,
  onUpdateSession,
  onFinish,
  onDiscard,
  onRequestConfirm,
  gyms = [],
}) {
  const sessionGymName = session
    ? gyms.find((g) => g.id === session.gymId)?.name || null
    : null;
  // All hooks must run on every render regardless of whether a session is
  // active, so they live here, above the early return below.
  const [restLeft, setRestLeft] = useState(0); // seconds remaining, 0 = inactive
  const [openNotes, setOpenNotes] = useState({});
  const [openRestPicker, setOpenRestPicker] = useState({});
  const [elapsedSec, setElapsedSec] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;
  const [addingExercise, setAddingExercise] = useState(false);
  const [entryMenuUp, setEntryMenuUp] = useState(false);
  // The automatic (HIT/interval) run. Times are stored as an absolute
  // end timestamp rather than a countdown, so a throttled or backgrounded
  // tab still resumes with the correct remaining time.
  const [autoRun, setAutoRun] = useState(null); // {phase,'work'|'rest', exerciseId, setIdx, endsAt}
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
    getId: (e) => e.exerciseId,
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

  useEffect(() => {
    if (!settingsMenuOpen) return;
    const closeOnOutsideClick = (e) => {
      if (!e.target.closest?.(".session-settings")) setSettingsMenuOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [settingsMenuOpen]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const id = setInterval(() => {
      setRestLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [restLeft > 0]);

  useEffect(() => {
    if (restLeft === 0) return;
    if (restLeft === 1) {
      const id = setTimeout(beepRestTimer, 1000);
      return () => clearTimeout(id);
    }
  }, [restLeft]);

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
        info[entries[k].exerciseId] = { groupSize, isFirst: k === i, isLast: k === j };
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

  // Finds the next set to run. Inside a superset group the exercises take
  // turns (set 1 of A, set 1 of B, ... then set 2 of A), everything else is
  // worked through exercise by exercise.
  const findNextSet = (fromExerciseId, fromSetIdx) => {
    const entries = session?.entries || [];
    const idx = entries.findIndex((e) => e.exerciseId === fromExerciseId);
    if (idx === -1) return null;

    // Circuit: set 1 of every exercise, then set 2 of every exercise. This
    // is what a HIT workout actually looks like, and it needs no linking.
    if ((session?.autoOrder || "circuit") === "circuit") {
      for (let k = idx + 1; k < entries.length; k++) {
        if (entries[k].sets[fromSetIdx]) return { exerciseId: entries[k].exerciseId, setIdx: fromSetIdx };
      }
      for (let k = 0; k < entries.length; k++) {
        if (entries[k].sets[fromSetIdx + 1]) return { exerciseId: entries[k].exerciseId, setIdx: fromSetIdx + 1 };
      }
      return null;
    }

    // Classic: finish an exercise before moving on.
    const current = entries[idx];
    if (current.sets[fromSetIdx + 1]) return { exerciseId: current.exerciseId, setIdx: fromSetIdx + 1 };
    for (let k = idx + 1; k < entries.length; k++) {
      if (entries[k].sets[0]) return { exerciseId: entries[k].exerciseId, setIdx: 0 };
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

  // True when the set that just finished closes a round (circuit) or an
  // exercise (classic order) - that is when the longer rest applies.
  const finishesRound = (exerciseId, setIdx) => {
    const entries = session?.entries || [];
    const idx = entries.findIndex((e) => e.exerciseId === exerciseId);
    if (idx === -1) return false;
    if ((session?.autoOrder || "circuit") === "circuit") return idx === entries.length - 1;
    return setIdx >= (entries[idx]?.sets?.length || 1) - 1;
  };

  const restAfter = (exerciseId, setIdx) => {
    const roundRest = toNum(session?.roundRestSeconds);
    if (finishesRound(exerciseId, setIdx)) return Math.max(0, roundRest);
    return Math.max(0, getRestDurationFor(exerciseId));
  };

  const startAutoAt = (exerciseId, setIdx, force = false) => {
    if (!force && !autoRunRef.current) return;
    const entry = (session?.entries || []).find((e) => e.exerciseId === exerciseId);
    if (!entry) { applyAutoRun(null); return; }
    // Only exercises explicitly switched to reps wait for a manual tick;
    // everything else runs on the workout's set length.
    if (!entryAutoRuns(entry)) {
      applyAutoRun({ phase: "waiting", exerciseId, setIdx, endsAt: null });
      return;
    }
    const seconds = setDurationFor(entry);
    applyAutoRun({ phase: "work", exerciseId, setIdx, endsAt: Date.now() + seconds * 1000 });
  };

  const stopAuto = () => {
    applyAutoRun(null);
    setAutoLeft(0);
    releaseAudio();
  };

  const anyAutoRun = (session?.entries || []).some((e) => entryAutoRuns(e));
  const firstUnfinishedSet = () => {
    for (const entry of session?.entries || []) {
      const idx = entry.sets.findIndex((set) => !set.done);
      if (idx !== -1) return { exerciseId: entry.exerciseId, setIdx: idx };
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
      const entry = entries.find((e) => e.exerciseId === autoRun.exerciseId);
      if (!entry) { stopAuto(); return; }

      if (autoRun.phase === "work") {
        const restSeconds = restAfter(autoRun.exerciseId, autoRun.setIdx);
        // One beep when a set ends. If a rest follows, its end gets its own
        // beep; without a rest that single beep is all there is.
        // Deliberately a single tone: with no rest configured this is the
        // only signal, and two short beeps would read as two events.
        playBeep({ frequency: 880, duration: 0.32 });
        if (!entry.sets[autoRun.setIdx]?.done) {
          toggleSetDoneSilently(autoRun.exerciseId, autoRun.setIdx);
        }
        if (restSeconds > 0) {
          applyAutoRun({
            ...autoRun,
            phase: "rest",
            isRoundRest: finishesRound(autoRun.exerciseId, autoRun.setIdx),
            endsAt: Date.now() + restSeconds * 1000,
          });
        } else {
          const next = findNextSet(autoRun.exerciseId, autoRun.setIdx);
          if (next) startAutoAt(next.exerciseId, next.setIdx);
          else { stopAuto(); playBeep({ frequency: 660, duration: 0.4 }); }
        }
        return;
      }

      if (autoRun.phase === "rest") {
        playBeep({ frequency: 1320, duration: 0.35 });
        const next = findNextSet(autoRun.exerciseId, autoRun.setIdx);
        if (next) startAutoAt(next.exerciseId, next.setIdx);
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
    const active = !!autoRun;
    if (active && !wakeLockRef.current && navigator.wakeLock?.request) {
      navigator.wakeLock.request("screen")
        .then((lock) => { wakeLockRef.current = lock; })
        .catch(() => { /* not granted - the run still works, just dimmer */ });
    }
    if (!active && wakeLockRef.current) {
      wakeLockRef.current.release?.().catch(() => {});
      wakeLockRef.current = null;
    }
    return () => {
      if (!active && wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [autoRun]);

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
  const getRestDurationFor = (exerciseId) => {
    const entry = session.entries.find((e) => e.exerciseId === exerciseId);
    return entry && entry.restSeconds != null ? entry.restSeconds : restDuration;
  };
  const startRest = (exerciseId) => {
    // Bei 0 Sekunden gibt es keine Pause - der Timer bleibt einfach aus.
    const sec = exerciseId ? getRestDurationFor(exerciseId) : restDuration;
    setRestLeft(sec > 0 ? sec : 0);
  };
  const stopRest = () => setRestLeft(0);
  const addRestTime = (delta) => setRestLeft((s) => Math.max(0, s + delta));

  const addSet = (exerciseId, warmup = false) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
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
  const updateSet = (exerciseId, idx, field, value) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
            }
          : e
      ),
    });
  };
  // Used by the automatic run: marks a set as done without kicking off the
  // normal rest timer, because the automatic run manages the rest itself.
  const toggleSetDoneSilently = (exerciseId, idx) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.map((set, i) => (i === idx ? { ...set, done: true } : set)) }
          : e
      ),
    });
  };
  // Inputs store exactly what the user typed (see updateSet above) so a
  // field can be cleared and freely retyped instead of the digit typed
  // right after clearing getting stuck after a leftover "0". Once the
  // field is left, normalize it to a clean, valid number.
  const sanitizeSetField = (exerciseId, idx, field) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
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
  const removeSet = (exerciseId, idx) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.filter((_, i) => i !== idx) }
          : e
      ),
    });
  };
  const addExerciseToSession = (exerciseId) => {
    if (session.entries.some((e) => e.exerciseId === exerciseId)) return;
    onUpdateSession({
      ...session,
      entries: [
        ...session.entries,
        {
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
    resetAddFilters();
  };
  const removeExerciseFromSession = (exerciseId) => {
    onUpdateSession({
      ...session,
      entries: session.entries.filter((e) => e.exerciseId !== exerciseId),
    });
  };
  // Swaps an exercise for a different one mid-workout. The target values
  // (planned sets/reps/weight) carry over since they describe the slot in
  // the workout, but the sets actually logged so far are cleared — they
  // were performed on the old exercise and would otherwise misattribute
  // that weight/reps to the new exercise's history and stats.
  const replaceExerciseInSession = (oldExerciseId, newExerciseId) => {
    if (session.entries.some((e) => e.exerciseId === newExerciseId)) return;
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === oldExerciseId
          ? { ...e, exerciseId: newExerciseId, sets: [], notes: "" }
          : e
      ),
    });
    setReplacingExerciseId(null);
    setAddExerciseQuery("");
  };
  const toggleSetDone = (exerciseId, idx) => {
    let nowDone = false;
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
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
    if (autoRun && autoRun.phase === "waiting" && autoRun.exerciseId === exerciseId
        && autoRun.setIdx === idx && nowDone) {
      playBeep({ frequency: 880, duration: 0.22 });
      const restSeconds = restAfter(exerciseId, idx);
      if (restSeconds > 0) {
        applyAutoRun({
          ...autoRun,
          phase: "rest",
          isRoundRest: finishesRound(exerciseId, idx),
          endsAt: Date.now() + restSeconds * 1000,
        });
      } else {
        const next = findNextSet(exerciseId, idx);
        if (next) startAutoAt(next.exerciseId, next.setIdx);
        else stopAuto();
      }
      return;
    }
    // Inside a superset, sets are done back-to-back with no rest between
    // the linked exercises — the timer only starts once the last exercise
    // in the group has a set checked off.
    const isLastInGroup = supersetGroupInfo[exerciseId]?.isLast ?? true;
    if (nowDone && isLastInGroup) startRest(exerciseId);
  };
  const toggleEntryNotes = (exerciseId) => {
    setOpenNotes((s) => ({ ...s, [exerciseId]: !s[exerciseId] }));
  };
  const updateEntryNotes = (exerciseId, notes) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId ? { ...e, notes } : e
      ),
    });
  };
  const toggleWarmup = (exerciseId, idx) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) => (i === idx ? { ...s, warmup: !s.warmup } : s)),
            }
          : e
      ),
    });
  };

  const mm = String(Math.floor(restLeft / 60)).padStart(2, "0");
  const ss = String(restLeft % 60).padStart(2, "0");

  const setRestDuration = (sec) => {
    onUpdateSession({ ...session, restSeconds: sec });
  };
  const setEntryRestDuration = (exerciseId, sec) => {
    onUpdateSession({
      ...session,
      entries: session.entries.map((e) =>
        e.exerciseId === exerciseId ? { ...e, restSeconds: sec } : e
      ),
    });
  };

  const REST_PRESETS = [0, 30, 45, 60, 90, 120, 180];

  const elapsedH = Math.floor(elapsedSec / 3600);
  const elapsedM = Math.floor((elapsedSec % 3600) / 60);
  const elapsedS = elapsedSec % 60;
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
              <SkipForward size={13} /> Skip
            </button>
          </div>
        </div>
      )}

      {autoRun && (
        <div className="auto-run-bar">
          <div className="auto-run-phase">
            {autoRun.phase === "work"
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
            {exBy[autoRun.exerciseId]?.name || "Übung"} · Satz {autoRun.setIdx + 1}
            {autoRun.phase === "waiting" && " · abhaken zum Fortfahren"}
          </div>
          <div className="rest-actions" style={{ marginTop: 8 }}>
            {autoRun.phase !== "waiting" && (
              <button
                className="rest-btn"
                onClick={() => applyAutoRun({ ...autoRun, endsAt: autoRun.endsAt + 15000 })}
              >
                +15s
              </button>
            )}
            <button
              className="rest-btn"
              onClick={() => {
                const next = findNextSet(autoRun.exerciseId, autoRun.setIdx);
                if (next) startAutoAt(next.exerciseId, next.setIdx);
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
            {sessionGymName && (
              <span className="tag tag-equipment" style={{ marginTop: 6, marginLeft: 6, display: "inline-block" }}>
                {sessionGymName}
              </span>
            )}
          </div>
          <div className="session-settings">
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
        // During an automatic run the set is measured in seconds, so the row
        // must show a time field - unless this exercise was kept on reps.
        const isTimeBased =
          entryAutoRuns(entry) && session.autoRun
            ? true
            : !!timeBasedExercises[entry.exerciseId] || !!entry.targetUseTime;
        // Comparing against the same gym only - a record set on a machine
        // that runs lighter elsewhere is not a record here.
        const history = getExerciseHistory(logs, entry.exerciseId, session.id, isTimeBased, session.gymId);
        const ssInfo = supersetGroupInfo[entry.exerciseId] || { groupSize: 1, isFirst: true, isLast: true };
        const isSuperset = ssInfo.groupSize > 1;
        return (
          <React.Fragment key={entry.exerciseId}>
          {isSuperset && ssInfo.isFirst && (
            <div className="superset-label">
              <Repeat size={12} /> Superset ({ssInfo.groupSize} Übungen, keine Pause dazwischen)
            </div>
          )}
          <div
            ref={(el) => { entryRefs.current[entry.exerciseId] = el; }}
            className={`card entry-card ${draggingEntryId === entry.exerciseId ? "is-dragging" : ""} ${isSuperset ? "superset-card" : ""} ${isSuperset && !ssInfo.isLast ? "superset-card-linked" : ""}`}
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
                  {...entryDragProps(entry.exerciseId)}
                >
                  <GripVertical size={16} />
                </span>
                <span
                  className="ex-name ex-name-clickable"
                  onClick={() => setSelectedExerciseId(entry.exerciseId)}
                >
                  {ex.name}
                </span>
              </div>
              <div className={`entry-menu-wrap ${entryMenuUp && openEntryMenu === entry.exerciseId ? "drop-up" : ""}`}>
                <button
                  className={`note-toggle ${(entry.restSeconds != null || entry.notes) ? "has-note" : ""}`}
                  onClick={(e) => {
                    const opening = openEntryMenu !== entry.exerciseId;
                    setEntryMenuUp(opening ? shouldDropUp(e.target) : false);
                    setOpenEntryMenu(opening ? entry.exerciseId : null);
                  }}
                  title="Optionen für diese Übung"
                >
                  <MoreVertical size={15} />
                </button>
                {openEntryMenu === entry.exerciseId && (
                  <div
                    ref={entryMenuRef}
                    className="program-menu"
                    style={{ top: "calc(100% + 4px)", right: 0, left: "auto" }}
                  >
                    <button
                      className="program-menu-item"
                      onClick={() => {
                        setOpenRestPicker((s) => ({ ...s, [entry.exerciseId]: true }));
                        setOpenEntryMenu(null);
                      }}
                    >
                      <Timer size={14} />
                      Pausenzeit{entry.restSeconds != null ? ` · ${getRestDurationFor(entry.exerciseId)}s` : ""}
                    </button>
                    <button
                      className="program-menu-item"
                      onClick={() => {
                        toggleEntryNotes(entry.exerciseId);
                        setOpenEntryMenu(null);
                      }}
                    >
                      <StickyNote size={14} />
                      Notiz{entry.notes ? " · gesetzt" : ""}
                    </button>
                    <button
                      className="program-menu-item"
                      onClick={() => {
                        setReplacingExerciseId(entry.exerciseId);
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
                          () => removeExerciseFromSession(entry.exerciseId)
                        );
                      }}
                    >
                      <Trash2 size={14} /> Entfernen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {replacingExerciseId === entry.exerciseId && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span className="plan-title">Übung ersetzen</span>
                  <button className="btn-icon" onClick={() => { setReplacingExerciseId(null); setAddExerciseQuery(""); }}>
                    <X size={15} />
                  </button>
                </div>
                <div className="search-box" style={{ marginBottom: 10 }}>
                  <Search size={16} color="var(--text-dim)" />
                  <input
                    autoFocus
                    placeholder="Übung suchen…"
                    value={addExerciseQuery}
                    onChange={(e) => setAddExerciseQuery(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {exercises
                    .filter((e) => e.id !== entry.exerciseId)
                    .filter((e) => e.name.toLowerCase().includes(addExerciseQuery.toLowerCase()))
                    .slice(0, EXERCISE_PICKER_LIMIT)
                    .map((e) => {
                      const already = session.entries.some((se) => se.exerciseId === e.id);
                      return (
                        <div className="ex-row" key={e.id}>
                          <span className="ex-name">{e.name}</span>
                          <button
                            className={`btn btn-sm ${already ? "btn-ghost" : "btn-primary"}`}
                            disabled={already}
                            onClick={() => replaceExerciseInSession(entry.exerciseId, e.id)}
                          >
                            {already ? "Schon drin" : "Wählen"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {openRestPicker[entry.exerciseId] && (
              <div className="chip-row" style={{ marginTop: 4, marginBottom: 8 }}>
                {REST_PRESETS.map((sec) => (
                  <span
                    key={sec}
                    className={`chip ${(entry.restSeconds ?? restDuration) === sec ? "active" : ""}`}
                    onClick={() => setEntryRestDuration(entry.exerciseId, sec)}
                  >
                    {sec === 0 ? "Aus" : `${sec}s`}
                  </span>
                ))}
                {entry.restSeconds != null ? (
                  <span className="chip" onClick={() => setEntryRestDuration(entry.exerciseId, null)}>
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
                    isTimeBased
                      ? `${s.duration || 0}s`
                      : `${s.weight || 0}kg×${s.reps || 0}`
                  )
                  .join(", ")}
              </div>
            )}

            {history.lastNote && (
              <div className="last-performance" style={{ marginTop: 6 }}>
                Notiz vom letzten Mal: {history.lastNote}
              </div>
            )}

            {openNotes[entry.exerciseId] && (
              <div style={{ marginTop: 8 }}>
                <textarea
                  className="session-notes"
                  placeholder="Notiz zu dieser Übung, z. B. Ausführung, Beschwerden, Griffweite…"
                  value={entry.notes || ""}
                  onChange={(e) => updateEntryNotes(entry.exerciseId, e.target.value)}
                />
              </div>
            )}

            {entry.sets.length > 0 && (
              <div style={{ marginBottom: 8, marginTop: 8 }}>
                <div className="set-row" style={{ marginBottom: 4 }}>
                  <span />
                  <span />
                  <span />
                  <label className="field-label" style={{ margin: 0 }}>
                    {isTimeBased ? "Sek." : "Wdh."}
                  </label>
                  <label className="field-label" style={{ margin: 0 }}>kg</label>
                </div>
                {entry.sets.map((s, idx) => {
                  const pr = isNewPR(s, history, isTimeBased);
                  return (
                    <React.Fragment key={idx}>
                    <SwipeableSetRow
                      className={`set-row ${s.done ? "is-done" : ""} ${s.warmup ? "is-warmup" : ""}`}
                      onSwipeRight={() => toggleSetDone(entry.exerciseId, idx)}
                      onSwipeLeft={() => removeSet(entry.exerciseId, idx)}
                    >
                      <span className="set-num">{idx + 1}</span>
                      <span
                        className={`set-check ${s.done ? "checked" : ""}`}
                        onClick={() => toggleSetDone(entry.exerciseId, idx)}
                        role="checkbox"
                        aria-checked={!!s.done}
                      >
                        {s.done && <Check size={13} color="white" />}
                      </span>
                      <span
                        className={`warmup-toggle ${s.warmup ? "active" : ""}`}
                        onClick={() => toggleWarmup(entry.exerciseId, idx)}
                        title="Als Aufwärmsatz markieren"
                      >
                        W
                      </span>
                      {/* One column, two meanings: a timed set has no rep
                          count, so the seconds take that slot instead of
                          adding a second row underneath. */}
                      {isTimeBased ? (
                        <input
                          type="number"
                          min="0"
                          value={s.duration ?? ""}
                          onChange={(e) => updateSet(entry.exerciseId, idx, "duration", e.target.value)}
                          onBlur={() => sanitizeSetField(entry.exerciseId, idx, "duration")}
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={s.reps}
                          onChange={(e) => updateSet(entry.exerciseId, idx, "reps", e.target.value)}
                          onBlur={() => sanitizeSetField(entry.exerciseId, idx, "reps")}
                        />
                      )}
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.weight}
                          onChange={(e) => updateSet(entry.exerciseId, idx, "weight", e.target.value)}
                          onBlur={() => sanitizeSetField(entry.exerciseId, idx, "weight")}
                        />
                        {pr && (
                          <span className="pr-badge" title="Neuer Rekord!">
                            <Trophy size={12} />
                          </span>
                        )}
                      </div>
                    </SwipeableSetRow>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => addSet(entry.exerciseId)}
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
              if (first) startAutoAt(first.exerciseId, first.setIdx, true);
            }}
          >
            <Play size={16} /> Automatik starten
          </button>
        )}
        <button className="btn btn-ghost btn-block" onClick={() => setAddingExercise(true)}>
          <Plus size={16} /> Übung hinzufügen
        </button>
      </div>

      {addingExercise && (
        <Modal
          title="Übung hinzufügen"
          onClose={() => { setAddingExercise(false); resetAddFilters(); }}
          width={420}
        >
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
                  const already = session.entries.some((se) => se.exerciseId === e.id);
                  return (
                    <div className="ex-row" key={e.id}>
                      <span className="ex-name">{e.name}</span>
                      <button
                        className={`btn btn-sm ${already ? "btn-ghost" : "btn-primary"}`}
                        disabled={already}
                        onClick={() => addExerciseToSession(e.id)}
                      >
                        {already ? <Check size={14} /> : <Plus size={14} />}
                        {already ? "Drin" : "Add"}
                      </button>
                    </div>
                  );
                })}
            </div>
        </Modal>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn btn-danger" style={{ flex: 1 }} onClick={onDiscard}>
          <X size={16} /> Verwerfen
        </button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onFinish}>
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
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
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

const GYM_LINE_COLORS = ["#c1652e", "#3b82f6", "#16a34a", "#a855f7", "#e11d48"];

function ExerciseCharts({ logs, exerciseId, isTimeBased, theme, gyms = [] }) {
  // Recharts takes plain colour strings rather than CSS variables, so the
  // current theme's values are read off the stylesheet once per render.
  const chartColors = useMemo(() => {
    const read = (name, fallback) => {
      if (typeof window === "undefined") return fallback;
      const shell = document.querySelector(".app-shell");
      if (!shell) return fallback;
      const value = getComputedStyle(shell).getPropertyValue(name).trim();
      return value || fallback;
    };
    return {
      grid: read("--surface-alt", "#26242b"),
      axis: read("--text-dim", "#9a948d"),
      tooltipBg: read("--surface", "#1d1c21"),
      tooltipBorder: read("--border", "#37343c"),
    };
  }, [theme]);

  const selectedIsTimeBased = isTimeBased;
  const selected = exerciseId;
  // Weights are not comparable between gyms, so as soon as an exercise has
  // been trained in more than one, each gym gets its own line instead of a
  // single line that jumps up and down for no real reason.
  const relevantLogs = logs.filter((l) => logEntries(l).some((e) => e.exerciseId === selected));
  const gymKeys = [...new Set(relevantLogs.map((l) => l.gymId || "none"))];
  const splitByGym = gymKeys.length > 1;
  const gymLabel = (key) =>
    key === "none" ? "Ohne Gym" : gyms.find((g) => g.id === key)?.name || "Unbekanntes Gym";

  const chartData = relevantLogs
    .map((l) => {
      const entry = logEntries(l).find((e) => e.exerciseId === selected);
      const workingSets = entrySets(entry).filter((s) => !s.warmup);
      const maxWeight = selectedIsTimeBased
        ? 0
        : Math.max(0, ...workingSets.map((s) => s.weight || 0));
      const totalReps = workingSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
      const totalDuration = workingSets.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
      // Heaviest single set of the session (weight x reps of one set), not
      // the session total — shows how hard the hardest set was over time.
      const maxSetVolume = selectedIsTimeBased
        ? 0
        : Math.max(
            0,
            ...workingSets.map((s) => (Number(s.weight) || 0) * (Number(s.reps) || 0))
          );
      // Best estimated one-rep max of the session: the strongest single set
      // converted to a 1RM, which tracks strength progress even when the
      // rep scheme changes between workouts.
      const best1RM = selectedIsTimeBased
        ? 0
        : Math.max(0, ...workingSets.map((s) => estimate1RM(s.weight, s.reps)));
      const base = {
        date: fmtDate(l.date),
        ts: new Date(l.date).getTime(),
      };
      if (!splitByGym) {
        return { ...base, maxWeight, totalReps, totalDuration, maxSetVolume, best1RM };
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
      };
    })
    .sort((a, b) => a.ts - b.ts);

  const renderLines = (key, fallbackColor) =>
    splitByGym
      ? gymKeys.map((g, i) => {
          const color = GYM_LINE_COLORS[i % GYM_LINE_COLORS.length];
          return (
            <Line
              key={g}
              type="monotone"
              dataKey={`${key}_${g}`}
              name={gymLabel(g)}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          );
        })
      : (
        <Line
          type="monotone"
          dataKey={key}
          stroke={fallbackColor}
          strokeWidth={2.5}
          dot={{ r: 3, fill: fallbackColor, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      );
  const gymLegend = splitByGym ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null;

  if (!selected) return null;
  return chartData.length === 0 ? (
      <div className="empty-state">Keine Daten für diese Übung.</div>
    ) : (
      <>
        {!selectedIsTimeBased && (
        <div className="card chart-card">
          <span className="plan-title">Maximalgewicht pro Training (kg)</span>
          <div style={{ height: 200, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                {renderLines("maxWeight", "#c1652e")}
                {gymLegend}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        <div className="card chart-card">
          <span className="plan-title">
            {selectedIsTimeBased ? "Gesamtzeit pro Training (Sek.)" : "Gesamtwiederholungen pro Training"}
          </span>
          <div style={{ height: 180, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={selectedIsTimeBased ? "totalDuration" : "totalReps"}
                  stroke="#e8c547"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#e8c547", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!selectedIsTimeBased && (
        <div className="card chart-card">
          <span className="plan-title">Maximales Satzvolumen</span>
          <div style={{ height: 180, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${Math.round(value)} kg`, "Max. Satzvolumen"]}
                />
                {renderLines("maxSetVolume", "#5b9aa8")}
                {gymLegend}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {!selectedIsTimeBased && (
        <div className="card chart-card">
          <span className="plan-title">Geschätztes 1RM</span>
          <div style={{ height: 180, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke={chartColors.axis} fontSize={11} axisLine={false} tickLine={false} width={40} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${Math.round(value)} kg`, "Gesch. 1RM"]}
                />
                {renderLines("best1RM", "#9a7bc4")}
                {gymLegend}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
      </>
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
  const nav = document.querySelector(".fab-nav");
  const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
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
// A fraction of a second of silence, inlined so no file has to be shipped.
const SILENT_LOOP_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";

// Keeps the audio session alive. iOS treats sound a web app generates
// itself as a system sound and silences it whenever the ring/silent switch
// is set to silent - which is exactly how a phone sits in a gym bag.
let keepAliveAudio = null;

function unlockAudio() {
  try {
    // Safari 16.4+: declaring the session as playback makes the beeps behave
    // like music, i.e. audible despite the silent switch.
    if (navigator.audioSession) navigator.audioSession.type = "playback";

    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();

    // Fallback for older iOS: a looping (near-silent) media element puts the
    // page into the media category, which the silent switch does not mute.
    // Started from the same user gesture, so iOS allows it.
    if (!keepAliveAudio) {
      keepAliveAudio = new Audio(SILENT_LOOP_WAV);
      keepAliveAudio.loop = true;
      keepAliveAudio.volume = 0.001;
      keepAliveAudio.setAttribute("playsinline", "");
    }
    keepAliveAudio.play().catch(() => { /* not critical */ });

    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

function releaseAudio() {
  try {
    keepAliveAudio?.pause();
  } catch (_) { /* ignore */ }
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

// ---------------------------------------------------------------------------
// Progress view
// ---------------------------------------------------------------------------

function ProgressView({
  logs,
  exBy,
  exercises,
  theme,
  exerciseNotes,
  exerciseSubgroupOverrides,
  onSetExerciseSubgroup,
  exerciseEquipmentOverrides,
  onSetExerciseEquipment,
  timeBasedExercises,
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  gyms = [],
}) {
  const [progressTab, setProgressTab] = useState("stats");


  const exerciseIdsWithData = useMemo(() => {
    const ids = new Set();
    logs.forEach((l) => logEntries(l).forEach((e) => ids.add(e.exerciseId)));
    return Array.from(ids).filter((id) => !!exBy[id]);
  }, [logs, exBy]);

  const [selected, setSelected] = useState(exerciseIdsWithData[0] || "");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;

  useEffect(() => {
    if (exerciseIdsWithData.length === 0) {
      setSelected("");
    } else if (!exerciseIdsWithData.includes(selected)) {
      setSelected(exerciseIdsWithData[0]);
    }
  }, [exerciseIdsWithData, selected]);

  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <TrendingUp size={26} />
        <p>Noch keine Trainingsdaten. Logge dein erstes Training, um Fortschritt zu sehen.</p>
      </div>
    );
  }

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
    </div>
  );

  const stats = useMemo(() => calculateTrainingStats(logs, exBy, timeBasedExercises), [logs, exBy, timeBasedExercises]);

  if (progressTab === "history") {
    return (
      <div>
        {subTabs}
        <HistoryView
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
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
        />
      </div>
    );
  }

  const selectedIsTimeBased = isTimeBasedInLogs(logs, selected, timeBasedExercises);

  const weeklyWorkouts = logs.filter((l) => Date.now() - new Date(l.date).getTime() <= 7 * 86400000).length;
  const last7Volume = logs.filter((l) => Date.now() - new Date(l.date).getTime() <= 7 * 86400000).reduce((sum, l) => sum + logEntries(l).reduce((s, e) => s + entrySets(e).filter((x) => x.done && !x.warmup).reduce((a, x) => a + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0), 0);


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
          <div className="stat-item">
            <span className="stat-value">{Math.round(stats.best1RM)} kg</span>
            <span className="stat-label">Bestes gesch. 1RM</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.prs}</span>
            <span className="stat-label">Neue Rekorde</span>
          </div>
      </div>

      <div className="chip-row">
        {exerciseIdsWithData.map((id) => (
          <span
            key={id}
            className={`chip ${selected === id ? "active" : ""}`}
            onClick={() => setSelected(id)}
          >
            {exBy[id]?.name}
          </span>
        ))}
      </div>

      {selected && (
        <div
          className="ex-name-clickable"
          style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 10 }}
          onClick={() => setSelectedExerciseId(selected)}
        >
          Verlauf &amp; Notizen zu "{exBy[selected]?.name}" ansehen
        </div>
      )}

      <ExerciseCharts logs={logs} exerciseId={selected} isTimeBased={selectedIsTimeBased} theme={theme} gyms={gyms} />

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
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
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
  onUpdateExerciseNote,
  onRenameExercise,
  onToggleTimeBased,
  gyms = [],
}) {
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || null;

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

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
          (sum, e) => sum + entrySets(e).filter((s) => !s.warmup).length,
          0
        );
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
                <Dumbbell size={12} /> {logEntries(log).length} Übungen
              </span>
              <span>
                <ClipboardList size={12} /> {totalSets} Sätze
              </span>
              {log.durationMinutes ? (
                <span>
                  <Clock size={12} /> {log.durationMinutes} Min.
                </span>
              ) : null}
            </div>

            {isOpen && (
              <div className="history-exercise-list" onClick={(e) => e.stopPropagation()}>
                {logEntries(log).map((entry) => {
                  const ex = exBy[entry.exerciseId];
                  if (!ex) return null;
                  const isTimeBased = !!timeBasedExercises[entry.exerciseId];
                  const workingSets = entrySets(entry).filter((s) => !s.warmup);
                  const summary = workingSets
                    .map((s) =>
                      isTimeBased && s.duration
                        ? `${s.duration}s`
                        : `${s.weight || 0}kg×${s.reps || 0}`
                    )
                    .join(", ");
                  return (
                    <div key={entry.exerciseId}>
                      <div className="history-exercise-row">
                        <span
                          className="ex-name-clickable"
                          onClick={() => setSelectedExerciseId(entry.exerciseId)}
                        >
                          {ex.name}
                        </span>
                        <span className="history-set-summary">{summary || "–"}</span>
                      </div>
                      {entry.notes && entry.notes.trim() && (
                        <div className="history-session-notes" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                          {entry.notes.trim()}
                        </div>
                      )}
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
          onUpdateExerciseNote={onUpdateExerciseNote}
          onRenameExercise={onRenameExercise}
          onToggleTimeBased={onToggleTimeBased}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}
