# Strava mit Iron Log verbinden

Einmalige Einrichtung, etwa 10 Minuten. Danach holt die App deine Einheiten
von selbst.

Du machst zwei Dinge: einen Strava-Zugang anlegen und den Pförtner ins Netz
stellen. Beides kostenlos.

> Die Beschriftungen bei Strava und Cloudflare ändern sich ab und zu. Wenn ein
> Knopf anders heißt als hier beschrieben, such nach dem, was inhaltlich
> gemeint ist – die Reihenfolge stimmt.

---

## Teil 1 – Strava-Zugang anlegen (ca. 3 Minuten)

1. Öffne **https://www.strava.com/settings/api** und melde dich an.
2. Fülle das Formular aus:

   | Feld | Was rein muss |
   |---|---|
   | Application Name | `Iron Log` |
   | Category | `Training` |
   | Club | leer lassen |
   | Website | `https://thiagodoener.github.io/Trainingsapp/` |
   | Application Description | z. B. `Meine eigene Trainings-App` |
   | **Authorization Callback Domain** | `thiagodoener.github.io` |

   ⚠️ Das letzte Feld ist das wichtigste. Dort steht **nur der Name des
   Servers**, ohne `https://`, ohne `/Trainingsapp/` dahinter. Stimmt das
   nicht, bricht die Anmeldung später mit einer Fehlermeldung ab.

3. Auf **Create** tippen. Strava zeigt dir jetzt zwei Angaben:

   - **Client ID** – eine Zahl, z. B. `123456`
   - **Client Secret** – eine lange Zeichenfolge (erst nach einem Klick auf
     „Show" sichtbar)

**Lass diese Seite offen** oder kopier dir beides zwischen – du brauchst es
gleich. Das Client Secret ist ein echtes Passwort: Es gehört nur in
Cloudflare, in kein Chatfenster und in keine Datei in deinem Projekt.

---

## Teil 2 – Den Pförtner ins Netz stellen (ca. 7 Minuten)

1. Geh auf **https://dash.cloudflare.com** und leg ein Konto an (E-Mail und
   Passwort genügen, keine Kreditkarte).

2. In der linken Leiste **Workers & Pages** (oder „Compute") auswählen und
   einen **neuen Worker erstellen**. Als Namen nimm `strava-helfer`.

3. Cloudflare legt einen Beispiel-Worker an und zeigt dir seine Adresse. Sie
   sieht so ähnlich aus:

   ```
   https://strava-helfer.dein-name.workers.dev
   ```

   **Diese Adresse brauchst du am Ende für die App.** Kopier sie dir.

4. Öffne den Code-Editor des Workers („Edit code" / „Bearbeiten"). Lösch
   allen Beispielcode und setz stattdessen den vollständigen Inhalt der Datei
   **`worker.js`** aus diesem Ordner ein. Dann **Deploy** / **Speichern und
   veröffentlichen**.

5. Jetzt die beiden Strava-Angaben hinterlegen. Geh in die **Einstellungen**
   des Workers, zum Abschnitt **Variables and Secrets** (je nach Oberfläche
   auch „Umgebungsvariablen"), und leg zwei Einträge an:

   | Name | Typ | Wert |
   |---|---|---|
   | `STRAVA_CLIENT_ID` | Text (Plaintext) | deine Client ID aus Teil 1 |
   | `STRAVA_CLIENT_SECRET` | **Secret / verschlüsselt** | dein Client Secret aus Teil 1 |

   Beim zweiten Eintrag unbedingt den verschlüsselten Typ wählen. Dann ist der
   Wert auch für dich selbst nicht mehr lesbar – genau so soll es sein.

6. Noch einmal **Deploy**, damit die beiden Werte übernommen werden.

7. **Prüfen, ob er läuft:** Ruf die Adresse aus Schritt 3 im Browser auf. Es
   muss dastehen:

   ```json
   {"dienst":"Iron Log Strava-Pförtner","bereit":true}
   ```

   Kommt stattdessen eine Fehlermeldung über fehlende Angaben, hat Schritt 5
   oder 6 nicht geklappt.

---

## Teil 3 – In der App eintragen

1. Iron Log öffnen → Zahnrad links oben → **Strava**.
2. Die Adresse aus Teil 2, Schritt 3 eintragen.
3. Auf **Verbinden** tippen. Du landest bei Strava, bestätigst den Zugriff und
   kommst zurück in die App.

Fertig. Ab jetzt holt die App neue Einheiten beim Öffnen, und über **Jetzt
abgleichen** auch sofort.

---

## Was der Pförtner sieht und was nicht

- Er **speichert nichts**. Kein Zustand, keine Datenbank, keine Protokolle.
- Er **sieht deine Trainingsdaten nicht aus**. Was Strava antwortet, reicht er
  unverändert durch; ausgewertet wird allein auf deinem Telefon.
- Er kennt als Einziger das Client Secret – das ist sein ganzer Zweck.
- Deine Zugangsdaten für Strava liegen in der App auf deinem Gerät, nicht bei
  Cloudflare.

Der Pförtner nimmt nur Anfragen von der Adresse deiner App an und leitet nach
der Anmeldung auch nur dorthin zurück. Diese Liste steht fest im Code
(`ERLAUBTE_ZIELE`) und lässt sich nicht von außen verbiegen – ohne sie könnte
jemand die Adresse deines Pförtners benutzen, um andere auf eine gefälschte
Seite zu schicken.

## Wenn etwas klemmt

| Symptom | Ursache |
|---|---|
| Strava meldet beim Verbinden „redirect_uri mismatch" | Das Feld **Authorization Callback Domain** in Teil 1 stimmt nicht. Dort gehört nur `thiagodoener.github.io` hinein. |
| Der Pförtner meldet fehlende Angaben | `STRAVA_CLIENT_ID` oder `STRAVA_CLIENT_SECRET` fehlen, oder es wurde nach dem Anlegen nicht noch einmal veröffentlicht. |
| „Dieses Rückkehr-Ziel ist nicht erlaubt" | Die App läuft unter einer Adresse, die nicht in `ERLAUBTE_ZIELE` steht. |
| Es kommen keine neuen Einheiten | Garmin schiebt die Aufzeichnung erst zu Strava, wenn sich die Uhr synchronisiert hat. Erst dann kann die App sie holen. |
