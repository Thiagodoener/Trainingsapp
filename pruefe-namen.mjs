// Sucht Namen, die benutzt, aber nirgends deklariert sind.
//
// Warum es das gibt: Genau so ein Fehler ist einmal bis aufs Handy
// durchgerutscht. Beim Antippen einer Übung stürzte die App ab
// ("Can't find variable: hatGewicht") - eine Variable war beim Bearbeiten
// verloren gegangen, aber überall weiter benutzt worden.
//
// Der Build merkt das nicht: Er wandelt nur um und schaut nicht nach, ob es
// die Namen gibt. Die Rechen-Tests merken es auch nicht, weil sie einzelne
// Funktionen aufrufen und nicht die Oberfläche. Erst im Browser fällt es auf -
// und dort nur, wenn man genau die Stelle antippt.
//
// TypeScript kann diese eine Frage beantworten, ohne dass die Datei getypt
// sein muss. Deshalb wird hier NUR auf die beiden Fehlerarten geprüft, die
// "diesen Namen gibt es nicht" bedeuten (TS2304/TS2552); alles andere, was
// TypeScript an einer reinen JavaScript-Datei auszusetzen hat, wird bewusst
// ignoriert.
import { execFileSync } from "node:child_process";

const DATEI = "TrainingApp.tsx";
const ARGS = [
  "--noEmit", "--allowJs", "--jsx", "preserve",
  "--target", "es2022", "--module", "esnext",
  "--moduleResolution", "bundler", "--skipLibCheck",
  DATEI,
];

let ausgabe = "";
try {
  execFileSync("node_modules/.bin/tsc", ARGS, { encoding: "utf8" });
} catch (e) {
  ausgabe = (e.stdout || "") + (e.stderr || "");
}

const treffer = ausgabe
  .split("\n")
  .filter((z) => /error TS2304|error TS2552/.test(z));

if (treffer.length > 0) {
  console.error("\nUnbekannte Namen gefunden – die App würde an dieser Stelle abstürzen:\n");
  treffer.forEach((z) => console.error("  " + z.trim()));
  console.error("");
  process.exit(1);
}
console.log(`${DATEI}: keine unbekannten Namen.`);
