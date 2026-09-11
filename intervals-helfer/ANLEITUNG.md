# Ausdauer-Einheiten automatisch von der Uhr holen

Der Weg ist **Garmin → intervals.icu → Iron Log**.

Warum nicht direkt über Strava: Strava verlangt seit Juni 2026 für den
API-Zugang ein bezahltes Abo. [intervals.icu](https://intervals.icu) ist ein
kostenloser Trainings-Auswertungsdienst, holt sich die Einheiten selbst von
Garmin Connect und gibt jedem Nutzer einen persönlichen Schlüssel – ohne Abo.

Teil 1 dauert etwa 5 Minuten. **Teil 2 brauchst du wahrscheinlich gar nicht** –
erst probieren, dann lesen.

---

## Teil 1 – intervals.icu einrichten

1. Geh auf **https://intervals.icu** und leg ein Konto an (kostenlos).

2. Verbinde **Garmin Connect**: in den Einstellungen gibt es einen Abschnitt für
   verbundene Dienste. Dort Garmin auswählen und die Anmeldung bestätigen.
   Ab jetzt landen deine Einheiten von selbst bei intervals.icu.

   > Warte einmal ab, bis deine letzten Läufe dort auftauchen. Kommt nichts an,
   > hat die Verbindung zu Garmin nicht geklappt – alles Weitere hilft dann auch
   > nicht.

3. Hol dir zwei Angaben aus den **Einstellungen**:

   - **Sportler-Nummer** (Athlete ID) – eine Zahl, oft mit einem `i` davor,
     z. B. `i123456`. Sie steht auch in der Adresszeile, wenn du bei
     intervals.icu eingeloggt bist.
   - **API-Schlüssel** – ganz unten in den Einstellungen unter
     *Developer Settings*. Einmal auf Anzeigen tippen und kopieren.

   ⚠️ Der Schlüssel ist so gut wie ein Passwort. Er gehört in die App auf deinem
   Gerät – nicht in ein Chatfenster, nicht in einen Screenshot, nirgendwo sonst
   hin. Wenn er dir doch einmal abhandenkommt, kannst du in denselben
   Einstellungen einen neuen erzeugen; der alte gilt dann nicht mehr.

4. In Iron Log: Zahnrad links oben → **Ausdauer-Abgleich**.
   Sportler-Nummer und Schlüssel eintragen, **Feld für den Helfer leer lassen**,
   dann **Jetzt abgleichen**.

**Klappt das? Dann bist du fertig.** Ab jetzt holt die App neue Einheiten beim
Öffnen von selbst, höchstens einmal pro Stunde.

---

## Teil 2 – Nur falls der Abgleich mit einem Netzwerkfehler scheitert

Ein Browser darf eine fremde Adresse nur anrufen, wenn diese ausdrücklich
zustimmt. Ob intervals.icu das tut, konnte ich beim Bauen nicht prüfen – meine
Umgebung kommt dort nicht hin. Falls die App also meldet, dass sie
intervals.icu nicht erreicht, stellst du einen kleinen Helfer dazwischen.

Er hütet **kein Geheimnis** – anders als der frühere Strava-Helfer. Er reicht
deinen Schlüssel nur durch, damit der Aufruf nicht mehr direkt aus dem Browser
kommt.

1. **https://dash.cloudflare.com** – Konto anlegen (kostenlos, keine
   Kreditkarte).
2. **Workers & Pages** → neuen Worker erstellen, Name z. B. `ausdauer-helfer`.
3. Die Adresse merken, sie sieht so aus:
   `https://ausdauer-helfer.dein-name.workers.dev`
4. Code-Editor öffnen, den Beispielcode löschen, den vollständigen Inhalt von
   **`worker.js`** aus diesem Ordner einsetzen, **Deploy**.
5. Zum Prüfen die Adresse im Browser aufrufen. Es muss dastehen:
   ```json
   {"dienst":"Iron Log Pförtner für intervals.icu","bereit":true}
   ```
6. In Iron Log diese Adresse ins Feld **Helfer** eintragen und noch einmal
   abgleichen.

Variablen oder Secrets sind hier **nicht** nötig – das war nur beim Strava-Weg so.

---

## Was wo liegt

- Dein **Schlüssel** liegt in der App auf deinem Gerät und kommt bewusst **nicht**
  in die Datensicherung. Eine Sicherungsdatei gibt man weiter; ein Schlüssel
  gehört da nicht hinein. Nach dem Zurückspielen trägst du ihn einmal neu ein.
- Deine **Trainingsdaten** bleiben wie bisher allein auf dem Gerät. Der Helfer
  speichert nichts und wertet nichts aus.

## Wenn etwas klemmt

| Symptom | Ursache |
|---|---|
| „Sportler-Nummer oder Schlüssel stimmt nicht" (401/403) | Schlüssel falsch kopiert, oder die Sportler-Nummer gehört nicht zu diesem Schlüssel. |
| „intervals.icu ist nicht erreichbar" | Genau der Fall aus Teil 2 – Helfer dazwischenstellen. |
| Abgleich läuft, aber es kommt nichts an | Bei intervals.icu nachsehen, ob die Einheiten dort überhaupt liegen. Ist die Garmin-Verbindung aus Teil 1, Schritt 2 aktiv? |
| Einheiten ohne Belastungszahl | Die Einheit hat keinen aufgezeichneten Puls, oder das Puls-Profil fehlt (Zahnrad → Puls-Profil). |
