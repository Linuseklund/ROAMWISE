# Roamwise

En personlig stadsguide. Användaren anger stad, start- och slutadress,
start- och sluttid samt vilka typer av platser de är intresserade av.
Roamwise bygger en rutt med stopp i ordning, med tid avsatt för besök,
måltider och transport.

## Hur det fungerar

- **Ruttplanering** (`app/planner.ts`): en girig heuristik — närmast-granne
  för turordningen, sedan schemaläggning inom öppettider, måltider och
  eventuella låsta stopp (t.ex. en konsert med fast starttid). Det är
  inte en global optimering av totalsträckan.
- **Gångrutter**: hämtas från [Valhalla](https://github.com/valhalla/valhalla)
  (en offentlig OSM-baserad routingserver) via `/api/walking`, med en
  schablonuppskattning (raka avståndet × omvägsfaktor ÷ gånghastighet)
  som fallback när riktig data saknas.
- **"Promenad + lokaltrafik"**: ger en uppskattad restid (fast
  tillgångs-/väntetidspåslag + en antagen medelhastighet), inte en
  verklig tidtabell. Ingen GTFS eller motsvarande kollektivtrafikkälla
  är kopplad.
- **Öppettider** (`app/opening.ts`): en egen, medvetet konservativ
  parser för en delmängd av OSM:s `opening_hours`-syntax. Komplexa
  regler och helgdagar känns inte igen — planeraren markerar då att
  öppettiden måste kontrolleras manuellt istället för att anta att
  platsen är öppen.
- **Platskatalog**: NYC Open Data (restauranger i New York) och
  OpenStreetMap/Overpass (övriga kategorier och städer), med ett litet
  handkurerat reservutbud för New York om de externa källorna är nere.
- **Turlagring**: sparas i Cloudflare D1, kopplat till en anonym,
  `HttpOnly`-cookie i webbläsaren — inget konto. En tur som planeras på
  en enhet nås därför inte automatiskt från en annan.

## Utveckling

```bash
npm run install:ci   # låst beroendeinstallation (npm ci)
npm run dev           # utvecklingsserver (Vite + vinext + Cloudflare-emulering)
npm run build         # bygg driftklar artefakt
npm run start         # starta den byggda vinext-applikationen
npm test              # bygg och kör hela testsviten
npm run lint          # eslint
npm run db:generate   # generera Drizzle-migrationer efter schemaändringar
```

Kräver Node.js `>=22.13.0`.

## Kända begränsningar

- Öppettider och program är inte verifierade mot en levande källa —
  kontrollera alltid själv innan besöket.
- "Promenad + lokaltrafik" ger en uppskattad tid, ingen verklig
  tidtabell eller linjeinformation.
- Katalogen är mest komplett för New York; andra städer har färre
  inbyggda genvägar (t.ex. områdesfilter).
- En tur är knuten till webbläsarens cookie, inte ett konto.

## Stack

Next.js (via [vinext](https://github.com/cloudflare/vinext)) på
Cloudflare Workers, React 19, Tailwind CSS 4, Drizzle ORM mot D1.
