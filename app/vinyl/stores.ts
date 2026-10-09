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
  borough: "Manhattan" | "Brooklyn";
  lat: number;
  lon: number;
  stock: Stock[];
  focus: string;
  description: string;
  hours: WeekHours;
  hoursNote?: string;
  /** Store's own site or Instagram, when verified. */
  link?: string;
};

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
];

export const weekdayNames = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const hoursLabel = (span: [number, number] | null) => (span ? `${clock(span[0])}–${clock(span[1])}` : "Stängt");

/** Current weekday (0 = Sunday) and minute of day in New York. */
export function newYorkNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenStatus = { open: boolean; label: string };

export function openStatus(store: VinylStore, now = newYorkNow()): OpenStatus {
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
