# Roamwise

Roamwise är en personlig stadsguide. Besökaren anger stad, start- och slutadress, tider och
intressen. Appen hämtar platser från öppna datakällor, placerar måltider och aktiviteter inom
registrerade öppettider och räknar fram en gångrutt med tidsmarginal. Under dagen finns ett
guideläge som följer med, räknar om vid förseningar och föreslår mat och tips i luckor. Turen
sparas privat i webbläsaren via en cookie.

Appen körs på [vinext](https://github.com/cloudflare/vinext) (Next.js App Router på Cloudflare
Workers) med Cloudflare D1 för sparade turer. Den utvecklades ursprungligen i OpenAI Sites, vars
byggkedja finns kvar under `scripts/` och `.openai/`.

## Kom igång

Kräver Node.js 22.13 eller nyare.

```bash
npm ci
npm run db:migrate:local
npm run dev
```

`db:migrate:local` skapar tabellen för sparade turer i den lokala D1-databasen som dev-servern
använder. Utan den svarar `/api/trip` med 503 och appen visar att turen inte kan sparas.

## Kommandon

| Kommando                   | Vad det gör                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `npm run dev`              | Startar Vite/vinext med simulerade Cloudflare-bindningar    |
| `npm run build`            | Bygger Worker och klient till `dist/`                       |
| `npm start`                | Kör det byggda Worker-paketet lokalt                        |
| `npm test`                 | Bygger och kör hela testsviten                              |
| `npm run test:unit`        | Kör testerna som inte behöver ett bygge                     |
| `npm run lint`             | ESLint                                                      |
| `npm run typecheck`        | TypeScript utan utdata                                      |
| `npm run format`           | Prettier på all källkod                                     |
| `npm run db:generate`      | Genererar Drizzle-migreringar efter ändringar i `db/schema` |
| `npm run db:migrate:local` | Applicerar migreringarna på den lokala D1-databasen         |
| `npm run build:sites`      | Tidsbegränsat bygge för OpenAI Sites (kräver Linux)         |

Testerna använder Node:s inbyggda TypeScript-stöd. På Node 22.13–22.17 sätter testskriptet
flaggan `--experimental-strip-types`; på nyare versioner behövs den inte.

## Miljövariabler

Alla externa tjänster kan bytas ut via miljövariabler, se [`.env.example`](.env.example). Kopiera
filen till `.dev.vars` för lokal utveckling. Standardvärdena pekar på fria community-tjänster
(Nominatim, Photon, Overpass, Valhalla, NYC Open Data) som har hastighetsgränser och saknar
driftgarantier. Sätt `APP_URL` till den publika adressen så att OpenStreetMap-tjänsterna får en
korrekt User-Agent och delningsbilder får rätt adress.

## Kodstruktur

```
app/
  page.tsx            Sidans tillstånd och handlers; komponerar delarna nedan
  components/         Presentationskomponenter (formulär, ruttlista, guide, karta, dialoger)
  api/                API-routes: catalog, geo, walking, trip
  planner.ts          Schemaläggning av stopp med öppettider, måltider och marginal
  meals.ts            Tilldelning av frukost, lunch och middag till restauranger
  route-builder.ts    Väljer kandidatplatser utifrån önskemål (testbar utan webbläsare)
  cities.ts           Stadsspecifik kunskap: tidszoner, stadsdelar, områden, landmärken
  catalog.ts          Kategorier och OpenStreetMap-selektorer
  midtown-backup.ts   Kontrollerat reservutbud för New York när tjänsterna ligger nere
  upstream.ts         Konfiguration av externa tjänster (server)
  geo-client.ts       Klienter mot appens egna API-routes (webbläsare)
db/                   Drizzle-schema och D1-åtkomst
drizzle/              Genererade migreringar
tests/                node:test-svit
worker/index.ts       Cloudflare Worker-ingång
```

## Städer

Roamwise söker platser i hela världen via OpenStreetMap. Stadsspecifika funktioner som stadsdelar,
områdesval för måltider och aktiviteter, restaurangregister och reservutbud finns i dag bara för
New York. Lägg till en stad i `app/cities.ts` för att ge den tidszon, stadsdelar och områden.

## Datakällor

- Restauranger i New York: NYC Open Data, DOHMH Restaurant Inspection Results
- Övriga platser: OpenStreetMap via Overpass
- Adresser: Nominatim, med Photon som reserv
- Gångvägar: Valhalla
- Kartor: Leaflet med OpenStreetMap-kakel

Öppettider och priser är inte verifierade. Appen säger tydligt vad som är uppskattat och vad som
måste kontrolleras hos verksamheten.
