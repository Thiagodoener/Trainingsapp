# Hinweise für Claude

## Arbeitsweise

- Änderungen immer auf einem eigenen Branch (`claude/<kurzer-name>`) committen
  und pushen, dann **ohne Nachfrage** einen Pull Request nach `main` anlegen
  und ihn direkt mergen.
- Vor dem Push `npm test` und `npx vite build` laufen lassen; nur mergen,
  wenn beides grün ist.
