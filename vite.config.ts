import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
