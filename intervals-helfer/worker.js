// ---------------------------------------------------------------------------
// Iron Log - Pförtner für intervals.icu
//
// ACHTUNG: Dieser Baustein ist OPTIONAL. Probier die App erst ohne ihn.
//
// Warum er überhaupt existiert: Ein Browser darf eine fremde Adresse nur dann
// anrufen, wenn diese ausdrücklich zustimmt ("CORS"). Ob intervals.icu das
// tut, ließ sich beim Bauen nicht prüfen. Falls die App dort direkt
// hinkommt, brauchst du diesen Pförtner nicht - dann bleibt das Feld in der
// App einfach leer. Erst wenn der Abgleich mit einem Netzwerkfehler
// scheitert, stellst du ihn dazwischen.
//
// Anders als beim früheren Strava-Weg hütet er KEIN Geheimnis mehr:
// intervals.icu braucht kein Client Secret, sondern nur deinen persönlichen
// Schlüssel - und der liegt in der App auf deinem Gerät. Der Pförtner reicht
// ihn nur durch. Er ist reine Umleitung, kein Tresor.
//
// Eine Aufgabe:
//   GET /activities?athlete=<id>&oldest=JJJJ-MM-TT&newest=JJJJ-MM-TT
//       mit Authorization-Kopf  ->  Antwort von intervals.icu
//
// Einrichtung: siehe ANLEITUNG.md neben dieser Datei.
// ---------------------------------------------------------------------------

// Wer Antworten bekommen darf. Ein Pförtner, der jedem antwortet, wäre ein
// offener Umleitungsdienst, über den Fremde ihre Aufrufe waschen könnten.
const ERLAUBTE_URSPRUENGE = [
  "https://thiagodoener.github.io",
  "http://localhost:4173",
  "http://localhost:5173",
];

// Nur diese eine Abfrage wird durchgereicht - nicht "irgendeine Adresse bei
// intervals.icu" und erst recht nicht "irgendeine Adresse im Netz".
const INTERVALS = "https://intervals.icu/api/v1/athlete";

function corsKopf(request) {
  const origin = request.headers.get("Origin") || "";
  const erlaubt = ERLAUBTE_URSPRUENGE.includes(origin);
  return {
    "Access-Control-Allow-Origin": erlaubt ? origin : ERLAUBTE_URSPRUENGE[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  async fetch(request) {
    const url = new URL(request.url);
    const pfad = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsKopf(request) });
    }

    if (pfad === "/activities") {
      const auth = request.headers.get("Authorization") || "";
      if (!auth) return json({ fehler: "Kein Schlüssel mitgeschickt." }, request, 401);

      // Die Sportler-Nummer steht in der Adresse und muss genau so aussehen,
      // wie intervals.icu sie vergibt: Ziffern, evtl. mit einem "i" davor.
      // Ungeprüft übernommen könnte hier ein "../../" stehen und den Aufruf
      // auf eine ganz andere Adresse umbiegen.
      const athlet = url.searchParams.get("athlete") || "";
      if (!/^i?\d+$/.test(athlet)) {
        return json({ fehler: "Ungültige Sportler-Nummer." }, request, 400);
      }

      const ziel = new URL(`${INTERVALS}/${athlet}/activities`);
      for (const name of ["oldest", "newest", "limit"]) {
        const wert = url.searchParams.get(name);
        if (wert) ziel.searchParams.set(name, wert);
      }
      const antwort = await fetch(ziel.toString(), {
        headers: { Authorization: auth, Accept: "application/json" },
      });
      const text = await antwort.text();
      return new Response(text, {
        status: antwort.status,
        headers: { "Content-Type": "application/json", ...corsKopf(request) },
      });
    }

    // Beim Einrichten sofort sichtbar, ob der Pförtner überhaupt läuft.
    if (pfad === "/") {
      return json({ dienst: "Iron Log Pförtner für intervals.icu", bereit: true }, request);
    }

    return json({ fehler: "Unbekannter Pfad." }, request, 404);
  },
};
