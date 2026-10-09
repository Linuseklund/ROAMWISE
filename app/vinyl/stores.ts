import type { Gateway } from "./subway";

// House/dance-focused record stores in New York. Hours were checked against the
// stores' own sites, Instagram and recent listings in October 2026 – they change,
// so the UI always links to the store for confirmation.

export type Stock = "nytt" | "begagnat";
/** Opening hours per weekday, index 0 = Sunday. [open, close] in minutes after midnight, null = closed. */
export type WeekHours = ([number, number] | null)[];

export type VinylStore = {
  id: string;
  name: string;
  address: string;
  area: string;
  borough: "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
  lat: number;
  lon: number;
  stock: Stock[];
  focus: string;
  description: string;
  hours: WeekHours;
  hoursNote?: string;
  /** No reliable opening hours found; the UI says so instead of showing open/closed. */
  hoursUnknown?: boolean;
  /** Not a house shop but worth a visit, e.g. "Kulturstopp · latin". */
  culture?: string;
  /** Fixed last leg where the subway doesn't go, e.g. the Staten Island Ferry. */
  gateway?: Gateway;
  /** Store's own site or Instagram, when verified. */
  link?: string;
};

const whitehall = { name: "Whitehall Terminal (Staten Island Ferry)", routes: [], lat: 40.70096, lon: -74.01306 };
const stGeorge = { name: "St. George Terminal", routes: [], lat: 40.6442, lon: -74.07285 };
const forestBarrett = { name: "Forest Av / Barrett Av", routes: [], lat: 40.62558, lon: -74.13612 };

const h = (open: number, close: number): [number, number] => [open * 60, close * 60];
const daily = (open: number, close: number): WeekHours => Array.from({ length: 7 }, () => h(open, close));

export const vinylStores: VinylStore[] = [
  {
    id: "a1", name: "A-1 Record Shop", address: "439 E 6th St, New York, NY 10009", area: "East Village", borough: "Manhattan",
    lat: 40.72584, lon: -73.98442, stock: ["begagnat"], focus: "House · disco · boogie · techno",
    description: "Legendarisk DJ-butik sedan 1996. Trånga gångar och tusentals begagnade 12\"-singlar – här hittar du New York-house från 80- och 90-talet.",
    hours: daily(12, 20),
  },
  {
    id: "m45", name: "Manhattan 45", address: "220 E 10th St, New York, NY 10003", area: "East Village", borough: "Manhattan",
    lat: 40.72913, lon: -73.98579, stock: ["nytt"], focus: "Deep house · UK garage · techno",
    description: "Bara ny, oöppnad vinyl och 100 % elektronisk dansmusik, sorterad efter subgenre. Bra ställe för veckans nya releaser.",
    hours: [null, null, h(13, 20), h(13, 20), h(13, 20), h(13, 20), h(13, 20)], link: "https://www.manhattan45.com",
  },
  {
    id: "ergot", name: "Ergot Records", address: "32 E 2nd St, New York, NY 10003", area: "East Village", borough: "Manhattan",
    lat: 40.72515, lon: -73.99060, stock: ["nytt", "begagnat"], focus: "House · techno · ambient · leftfield",
    description: "Liten, noggrant kurerad butik med eget label. Framåtblickande klubbmusik från oberoende label, plus utvalda begagnade fynd.",
    hours: [h(12, 18), h(11, 19), h(11, 19), h(11, 19), h(11, 19), h(12, 20), h(12, 20)], link: "https://www.instagram.com/ergotrecords/",
  },
  {
    id: "superior", name: "Superior Elevation", address: "616 Grand St, Brooklyn, NY 11211", area: "Williamsburg", borough: "Brooklyn",
    lat: 40.71111, lon: -73.94752, stock: ["begagnat", "nytt"], focus: "House · disco · soul · rare 12\"",
    description: "Drivs av DJ:n Tom Noble, house- och discopurist. Djupa begagnade backar, nya återutgåvor och regelbundna DJ-kvällar i butiken.",
    hours: daily(12, 20), link: "https://www.superiorelevation.com",
  },
  {
    id: "razor", name: "Razor-N-Tape", address: "110 Meserole Ave, Brooklyn, NY 11222", area: "Greenpoint", borough: "Brooklyn",
    lat: 40.72708, lon: -73.95231, stock: ["nytt", "begagnat"], focus: "Disco-edits · house · boogie",
    description: "Butiken till det hyllade house- och disco-labelet. Hela Razor-N-Tape-katalogen, nytt och begagnat från andra label, och DJ-bås med hi-fi.",
    hours: [h(13, 18), null, null, null, null, h(13, 20), h(12, 20)], hoursNote: "Bara helger", link: "https://www.instagram.com/razorntape/",
  },
  {
    id: "humanhead", name: "Human Head Records", address: "289 Meserole St, Brooklyn, NY 11206", area: "Bushwick", borough: "Brooklyn",
    lat: 40.70896, lon: -73.93633, stock: ["begagnat"], focus: "NYC-house från 80/90-talet · disco",
    description: "Mest soul, jazz och latin på ytan men med en djup och underskattad samling begagnade house- och disco-12\"-singlar.",
    hours: daily(12, 20), link: "https://humanheadnyc.com",
  },
  {
    id: "finer", name: "Finer Sounds", address: "252 Schermerhorn St (Ace Hotel), Brooklyn, NY 11217", area: "Boerum Hill", borough: "Brooklyn",
    lat: 40.68785, lon: -73.98378, stock: ["nytt"], focus: "House · techno · disco · ambient",
    description: "Ny butik i Ace Hotel Brooklyn sedan 2025. Brett urval av ny elektronisk vinyl och DJ-kvällar i hotellobbyn.",
    hours: daily(11, 18),
  },
  {
    id: "exchange", name: "Brooklyn Record Exchange", address: "87 Guernsey St, Brooklyn, NY 11222", area: "Greenpoint", borough: "Brooklyn",
    lat: 40.72420, lon: -73.95335, stock: ["begagnat", "nytt"], focus: "Blandat · dans-12\" fylls på ofta",
    description: "Från teamet bakom Co-Op 87 och Mexican Summer. Främst begagnat, med en dansmusikback som fylls på regelbundet.",
    hours: [h(12, 20), null, h(12, 20), h(12, 20), h(12, 20), h(12, 20), h(12, 20)],
  },
  {
    id: "academy", name: "Academy Record Annex", address: "242 Banker St, Brooklyn, NY 11222", area: "Greenpoint", borough: "Brooklyn",
    lat: 40.72626, lon: -73.95640, stock: ["begagnat"], focus: "Allt · stor elektronisk avdelning",
    description: "En av stadens största skivbutiker. Elektroniska backar med klubbskivor, importer och sällsynt dansmusik – planera in tid.",
    hours: daily(11, 19), link: "https://academy-records.com",
  },
  {
    id: "thing", name: "The Thing", address: "1001 Manhattan Ave, Brooklyn, NY 11222", area: "Greenpoint", borough: "Brooklyn",
    lat: 40.73326, lon: -73.95504, stock: ["begagnat"], focus: "Osorterat · billiga backar",
    description: "Kaotisk second hand-källare med tusentals osorterade skivor till lågpris. För dig som vill gräva – house-klassiker dyker upp.",
    hours: [h(10.5, 19), null, null, h(10.5, 19), h(10.5, 19), h(10.5, 19), h(10.5, 19)],
  },
  {
    id: "woodward", name: "690 Woodward Garage", address: "690 Woodward Ave (hörnet Palmetto St), Queens, NY 11385", area: "Ridgewood", borough: "Queens",
    lat: 40.70479, lon: -73.90587, stock: ["begagnat", "nytt"], focus: "House · techno · importer · diggerfynd",
    description: "Liten butik i ett garage med vintage Klipsch-högtalare. DJ-vänliga priser, elektroniska importer och egna vinylkvällar ute på stan.",
    hours: [h(12, 20), null, null, h(12, 20), h(12, 20), h(12, 20), h(12, 20)], hoursNote: "Kolla tider innan", link: "https://www.instagram.com/690_woodward_garage/",
  },
  {
    id: "pancakes", name: "Pancakes Records", address: "20-77 Steinway St, Queens, NY 11105", area: "Astoria", borough: "Queens",
    lat: 40.77476, lon: -73.90352, stock: ["nytt", "begagnat"], focus: "Blandat · DJ-kvällar i butiken",
    description: "Astorias skivbutik sedan 2023 med ny och begagnad vinyl, lyssningsstation och DJ-set i butiken. Inte renodlat house men värt ett stopp i Queens.",
    hours: [h(12, 18), h(12, 20), null, h(12, 20), h(12, 20), h(12, 20), h(12, 20)],
  },
  {
    id: "deepcuts", name: "Deep Cuts Record Store", address: "57-03 Catalpa Ave, Queens, NY 11385", area: "Ridgewood", borough: "Queens",
    lat: 40.70096, lon: -73.90414, stock: ["begagnat", "nytt"], focus: "Blandat · dans och underground",
    description: "Ridgewoods kvartersbutik för vinyl sedan 2012 – köp, sälj och byt. Brett utbud från jazz och hiphop till experimentellt; ägaren låter dig lyssna innan du köper.",
    hours: [h(12, 19), null, null, h(12, 19), h(12, 19), h(12, 19), h(12, 19)], hoursNote: "Kolla tider innan",
  },
  {
    id: "amadeo", name: "Casa Amadeo", address: "786 Prospect Ave, Bronx, NY 10455", area: "Longwood", borough: "Bronx",
    lat: 40.81873, lon: -73.9019, stock: [], culture: "Kulturstopp · latin", focus: "Salsa · bolero · puertoricansk musik",
    description: "Stadens äldsta latinska skivbutik som drivits utan avbrott, i ett kulturminnesmärkt hus i Longwood. Mest CD och instrument men också vinyl. Inte house – men en bit av Bronx dansmusikhistoria.",
    hours: [null, null, null, null, null, null, null], hoursUnknown: true, hoursNote: "Ring innan",
  },
  {
    id: "majors", name: "Majors Records & Video", address: "12 Barrett Ave, Staten Island, NY 10302", area: "Westerleigh", borough: "Staten Island",
    lat: 40.62524, lon: -74.13627, stock: ["begagnat", "nytt"], focus: "Blandat · begagnad vinyl, CD och film",
    description: "Staten Islands enda riktiga skivbutik, familjeägd sedan 1971. Främst begagnat i alla genrer – inte house-specialiserad, men backarna med 12\"-singlar kan ge fynd. Kombinera med färjan för utsikten.",
    hours: [null, h(9, 18), h(9, 18), h(9, 18), h(9, 18), h(9, 18), h(8, 18)], hoursNote: "Kolla tider innan",
    gateway: {
      ...whitehall,
      steps: [
        { kind: "ferry", label: "Staten Island-färjan (gratis)", from: whitehall, to: stGeorge, minutes: 35 },
        { kind: "bus", label: "S48", from: stGeorge, to: forestBarrett, minutes: 20 },
        { kind: "walk", to: "Majors Records & Video", minutes: 2 },
      ],
    },
  },
];

export const weekdayNames = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const hoursLabel = (span: [number, number] | null) => (span ? `${clock(span[0])}–${clock(span[1])}` : "Stängt");
export const dayHours = (store: VinylStore, day: number) => (store.hoursUnknown ? "Okänt" : hoursLabel(store.hours[day]));

/** Current weekday (0 = Sunday) and minute of day in New York. */
export function newYorkNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenStatus = { open: boolean; label: string };

export function openStatus(store: VinylStore, now = newYorkNow()): OpenStatus {
  if (store.hoursUnknown) return { open: false, label: "Öppettider okända" };
  const today = store.hours[now.day];
  if (today && now.minutes >= today[0] && now.minutes < today[1]) {
    const left = today[1] - now.minutes;
    return { open: true, label: left <= 60 ? `Öppet · stänger om ${left} min` : `Öppet till ${clock(today[1])}` };
  }
  if (today && now.minutes < today[0]) return { open: false, label: `Stängt · öppnar ${clock(today[0])}` };
  for (let i = 1; i <= 7; i++) {
    const day = (now.day + i) % 7;
    const span = store.hours[day];
    if (span) return { open: false, label: `Stängt · öppnar ${i === 1 ? "i morgon" : weekdayNames[day].toLowerCase()} ${clock(span[0])}` };
  }
  return { open: false, label: "Stängt" };
}
