// ---------------------------------------------------------------------------
// Iron Log - Strava-Pförtner
//
// Warum es diesen Baustein überhaupt gibt: Die App läuft vollständig im
// Browser und wird als Dateisammlung ausgeliefert. Alles, was in ihr steht,
// kann jeder auslesen, der die Adresse öffnet - ein Strava-Passwort ("Client
// Secret") darf dort also nicht hinein. Strava kennt kein Verfahren, das
// ohne dieses Passwort auskäme (kein PKCE). Deshalb dieser Pförtner: das
// einzige Stück, das das Passwort kennt.
//
// Was er NICHT tut, und das ist der Punkt:
//   - Er speichert nichts. Kein Zustand, keine Datenbank, kein Protokoll.
//   - Er sieht keine Trainingsdaten. Die Antworten von Strava reicht er
//     unverändert durch, die Auswertung passiert allein auf dem Telefon.
//   - Er kennt die Zugangsdaten des Nutzers nicht über den einzelnen Aufruf
//     hinaus; Access- und Refresh-Token liegen in der App.
//
// Drei Aufgaben:
//   GET  /login?redirect=<App-Adresse>  -> Weiterleitung zur Strava-Anmeldung
//   POST /token   { code, redirect } | { refresh_token }  -> Zugangsdaten
//   GET  /activities?after=<Sekunden>&page=<n>  -> Abfrage an Strava
//
// Einrichtung: siehe ANLEITUNG.md neben dieser Datei.
// ---------------------------------------------------------------------------

// Wohin der Pförtner nach der Anmeldung zurückschicken darf. Ohne diese Liste
// wäre er eine offene Weiterleitung: Jeder könnte ihn mit beliebigem Ziel
// aufrufen und sich die Vertrauenswürdigkeit der Adresse ausleihen, um Leute
// auf eine gefälschte Seite zu schicken. Die Liste ist der ganze Schutz
// dagegen, deshalb ist sie fest verdrahtet und nicht einstellbar.
const ERLAUBTE_ZIELE = [
  "https://thiagodoener.github.io/Trainingsapp/",
  // Für Tests auf dem eigenen Rechner:
  "http://localhost:4173/",
  "http://localhost:5173/",
];

// Nur diese eine Strava-Abfrage wird durchgereicht. Ein Pförtner, der jede
// beliebige Adresse weiterleitet, wäre ein offener Weiterleitungsdienst mit
// angehängtem Passwort - deutlich mehr, als hier gebraucht wird.
const STRAVA_AKTIVITAETEN = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_TOKEN = "https://www.strava.com/oauth/token";

function istErlaubtesZiel(url) {
  return ERLAUBTE_ZIELE.includes(url);
}

// Der anfragende Ursprung darf antworten bekommen, wenn er auf der Liste
// steht. Sonst steht dort die Hauptadresse - dann scheitert der Aufruf im
// Browser, was hier die gewünschte Wirkung ist.
function corsKopf(request) {
  const origin = request.headers.get("Origin") || "";
  const erlaubt = ERLAUBTE_ZIELE.some((z) => z.startsWith(origin) && origin !== "");
  return {
    "Access-Control-Allow-Origin": erlaubt ? origin : ERLAUBTE_ZIELE[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(daten, request, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { "Content-Type": "application/json", ...corsKopf(request) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pfad = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsKopf(request) });
    }

    if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
      return json(
        { fehler: "Dem Pförtner fehlen STRAVA_CLIENT_ID oder STRAVA_CLIENT_SECRET." },
        request,
        500
      );
    }

    // --- Anmeldung anstoßen -------------------------------------------------
    if (pfad === "/login") {
      const ziel = url.searchParams.get("redirect") || "";
      if (!istErlaubtesZiel(ziel)) {
        return json({ fehler: "Dieses Rückkehr-Ziel ist nicht erlaubt." }, request, 400);
      }
      const auth = new URL("https://www.strava.com/oauth/authorize");
      auth.searchParams.set("client_id", env.STRAVA_CLIENT_ID);
      auth.searchParams.set("redirect_uri", ziel);
      auth.searchParams.set("response_type", "code");
      // activity:read_all schließt auch als privat markierte Einheiten ein -
      // ohne das fehlten genau die Trainings, die man nicht öffentlich teilt.
      auth.searchParams.set("scope", "activity:read_all");
      auth.searchParams.set("approval_prompt", "auto");
      return Response.redirect(auth.toString(), 302);
    }

    // --- Code oder Refresh-Token gegen Zugangsdaten tauschen ----------------
    if (pfad === "/token" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return json({ fehler: "Ungültige Anfrage." }, request, 400);
      }
      const daten = new URLSearchParams();
      daten.set("client_id", env.STRAVA_CLIENT_ID);
      daten.set("client_secret", env.STRAVA_CLIENT_SECRET);
      if (body.refresh_token) {
        daten.set("grant_type", "refresh_token");
        daten.set("refresh_token", body.refresh_token);
      } else if (body.code) {
        if (!istErlaubtesZiel(body.redirect || "")) {
          return json({ fehler: "Dieses Rückkehr-Ziel ist nicht erlaubt." }, request, 400);
        }
        daten.set("grant_type", "authorization_code");
        daten.set("code", body.code);
      } else {
        return json({ fehler: "Weder code noch refresh_token angegeben." }, request, 400);
      }
      const antwort = await fetch(STRAVA_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: daten,
      });
      const text = await antwort.text();
      return new Response(text, {
        status: antwort.status,
        headers: { "Content-Type": "application/json", ...corsKopf(request) },
      });
    }

    // --- Einheiten abfragen -------------------------------------------------
    if (pfad === "/activities") {
      const auth = request.headers.get("Authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return json({ fehler: "Kein Zugangstoken mitgeschickt." }, request, 401);
      }
      const ziel = new URL(STRAVA_AKTIVITAETEN);
      // Nur diese drei Angaben werden durchgereicht. Alles andere aus der
      // Anfrage wird verworfen, statt es blind an Strava weiterzugeben.
      for (const name of ["after", "before", "page"]) {
        const wert = url.searchParams.get(name);
        if (wert) ziel.searchParams.set(name, wert);
      }
      ziel.searchParams.set("per_page", url.searchParams.get("per_page") || "50");
      const antwort = await fetch(ziel.toString(), { headers: { Authorization: auth } });
      const text = await antwort.text();
      return new Response(text, {
        status: antwort.status,
        headers: { "Content-Type": "application/json", ...corsKopf(request) },
      });
    }

    // Antwortet auf die Startadresse, damit man beim Einrichten sofort sieht,
    // ob der Pförtner überhaupt läuft.
    if (pfad === "/") {
      return json({ dienst: "Iron Log Strava-Pförtner", bereit: true }, request);
    }

    return json({ fehler: "Unbekannter Pfad." }, request, 404);
  },
};
