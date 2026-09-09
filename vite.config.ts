import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative Pfade zu den eigenen Dateien.
  //
  // Bei GitHub Pages liegt die App nicht ganz oben auf der Adresse, sondern in
  // einem Unterordner (.../Trainingsapp/). Mit den sonst ueblichen absoluten
  // Pfaden ("/assets/app.js") suchte der Browser die Dateien eine Ebene zu
  // weit oben und faende nichts - die Seite bliebe weiss.
  //
  // Bewusst "./" statt des fest eingetragenen Ordnernamens: So laeuft
  // dieselbe gebaute App an jeder Stelle - oben auf einer eigenen Adresse, in
  // einem Unterordner, oder lokal beim Entwickeln - ohne dass die
  // Konfiguration angefasst werden muss. Moeglich ist das, weil die App nur
  // eine einzige Seite hat und keine Unteradressen benutzt.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Die Bibliotheken von der eigenen App trennen.
        //
        // Warum das die Ladezeit senkt, obwohl insgesamt dieselbe Menge
        // uebertragen wird: Der Dateiname enthaelt eine Pruefsumme des
        // Inhalts. Aendert sich TrainingApp.tsx - also bei jeder
        // Aktualisierung -, bekommt nur der App-Teil einen neuen Namen. Die
        // Bibliotheken behalten ihren und liegen weiterhin im Browser-Cache;
        // sie werden also nicht noch einmal geladen.
        //
        // Konkret: Bei einer Aktualisierung laedt das Telefon statt rund
        // 230 KB nur noch etwa 130 KB. Beim allerersten Oeffnen aendert sich
        // nichts, da ist ohnehin alles neu.
        //
        // Alle Bibliotheken in EIN Paket statt in mehrere: React, Recharts
        // und Lucide haengen voneinander ab, einzeln aufgeteilt landet React
        // ohnehin beim groessten Abhaengigen und es bleibt ein leeres
        // Restpaket uebrig - ein zusaetzlicher Netzwerkaufruf fuer nichts.
        manualChunks: (id) => (id.includes('node_modules') ? 'bibliotheken' : undefined),
      },
    },
  },
});
