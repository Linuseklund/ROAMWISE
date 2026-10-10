import type { WeekHours } from "../vinyl/stores";

// Sneaker stores and second-hand streetwear in New York. Hours were checked
// against the stores' own sites and recent listings in October 2026; release
// days can change them, so the UI links out for confirmation.

export type SneakerType = "nytt" | "resell" | "begagnat" | "streetwear";

/** Each store type borrows an MTA line colour so it reads like a subway bullet. */
export const sneakerTypes: Record<SneakerType, { label: string; short: string; line: string; bg: string; fg: string }> = {
  nytt: { label: "Nytt", short: "N", line: "4/5/6", bg: "#00933C", fg: "#fff" },
  resell: { label: "Resell", short: "R", line: "N/Q/R/W", bg: "#FCCC0A", fg: "#000" },
  begagnat: { label: "Begagnat", short: "B", line: "B/D/F/M", bg: "#FF6319", fg: "#fff" },
  streetwear: { label: "Streetwear 2nd hand", short: "7", line: "7", bg: "#B933AD", fg: "#fff" },
};

export type SneakerStore = {
  id: string;
  name: string;
  address: string;
  area: string;
  borough: "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
  lat: number;
  lon: number;
  /** The first type sets the pin colour on the map. */
  types: SneakerType[];
  focus: string;
  description: string;
  hours: WeekHours;
  hoursNote?: string;
  hoursUnknown?: boolean;
  /** A stop worth making for the area rather than a single shop. */
  culture?: string;
  link?: string;
};

const h = (open: number, close: number): [number, number] => [open * 60, close * 60];
const daily = (open: number, close: number): WeekHours => Array.from({ length: 7 }, () => h(open, close));
const unknown: WeekHours = [null, null, null, null, null, null, null];

export const sneakerStores: SneakerStore[] = [
  {
    id: "kith", name: "Kith Manhattan", address: "337 Lafayette St, New York, NY 10012", area: "NoHo", borough: "Manhattan",
    lat: 40.72605, lon: -73.99436, types: ["nytt"], focus: "Nike · New Balance · Asics · Kith-collabs",
    description: "Ronnie Fiegs flaggskepp i flera våningar med sneakers, streetwear och glassbaren Kith Treats. Här släpps många av Kiths egna samarbeten.",
    hours: [h(11, 20), h(10, 21), h(10, 21), h(10, 21), h(10, 21), h(10, 21), h(10, 21)], link: "https://kith.com/pages/kith-manhattan",
  },
  {
    id: "extrabutter", name: "Extra Butter", address: "125 Orchard St, New York, NY 10002", area: "Lower East Side", borough: "Manhattan",
    lat: 40.71955, lon: -73.98962, types: ["nytt"], focus: "Limiterade releaser · collabs",
    description: "Lower East Side-institution med filmtema, raffle-releaser och ett brett utbud av limiterade sneakers och kläder.",
    hours: [h(12, 17), h(11, 19), h(11, 19), h(11, 19), h(11, 19), h(11, 19), h(11, 19)], hoursNote: "Kolla tider innan", link: "https://extrabutterny.com",
  },
  {
    id: "concepts", name: "Concepts NYC", address: "225 Hudson St, New York, NY 10013", area: "Hudson Square", borough: "Manhattan",
    lat: 40.72427, lon: -74.00806, types: ["nytt"], focus: "Premium-releaser · egna collabs",
    description: "Bostonbutiken Concepts New York-butik, känd för egna samarbeten med Nike, New Balance och Asics.",
    hours: [h(12, 18), h(11, 19), h(11, 19), h(11, 19), h(11, 19), h(11, 19), h(11, 19)], hoursNote: "Lördagstid ej bekräftad",
    link: "https://cncpts.com/blogs/locations/41379651-concepts-new-york-city",
  },
  {
    id: "stockx", name: "StockX SoHo", address: "237 Lafayette St, New York, NY 10012", area: "SoHo", borough: "Manhattan",
    lat: 40.7226, lon: -73.99668, types: ["resell"], focus: "Verifierad deadstock · inlämning för säljare",
    description: "StockX första permanenta butik i USA, öppnad på nytt i juni 2026: ett 300-tal oanvända par och plagg till marknadspris, plus inlämning om du säljer.",
    hours: daily(11, 19), link: "https://stockx.com/news/stockx-retail-nyc-opening/",
  },
  {
    id: "districtone", name: "District One", address: "114 Stanton St, New York, NY 10002", area: "Lower East Side", borough: "Manhattan",
    lat: 40.72122, lon: -73.98719, types: ["resell", "begagnat"], focus: "Köp, sälj & byt · par från under $100",
    description: "Resellbutik ”för folket” sedan 2021 med både nytt och begagnat – ofta kö runt kvarteret. Köper enstaka par och hela samlingar mot kontanter eller butikskredit.",
    hours: daily(12, 19), link: "https://districtoneny.com",
  },
  {
    id: "flightclub", name: "Flight Club", address: "812 Broadway, New York, NY 10003", area: "Union Square", borough: "Manhattan",
    lat: 40.73261, lon: -73.9909, types: ["resell"], focus: "Grails · Air Jordan · consignment",
    description: "Klassisk consignment-butik med väggar fulla av sällsynta Air Jordans och hypade releaser. Du kan också lämna in egna par för försäljning.",
    hours: daily(11, 20),
  },
  {
    id: "nike", name: "Nike House of Innovation 000", address: "650 Fifth Ave, New York, NY 10019", area: "Midtown", borough: "Manhattan",
    lat: 40.75974, lon: -73.97678, types: ["nytt"], focus: "Nike & Jordan · Nike By You",
    description: "Nikes flaggskepp i sex våningar vid Rockefeller Center, med anpassning via Nike By You och de senaste releaserna.",
    hours: daily(10, 20), hoursNote: "Kolla tider innan",
  },
  {
    id: "atmos", name: "atmos NYC", address: "203 W 125th St, New York, NY 10027", area: "Harlem", borough: "Manhattan",
    lat: 40.80913, lon: -73.94847, types: ["nytt"], focus: "Nike · Jordan · japansk sneakerkultur",
    description: "Tokyokedjans butik på 125th Street, sedan länge en mötesplats för Harlems sneakerscen, med eget märke och exklusiva samarbeten.",
    hours: [h(12, 19), h(11, 20), h(11, 20), h(11, 20), h(11, 20), h(11, 20), h(11, 20)], hoursNote: "Kolla tider innan",
  },
  {
    id: "upnyc", name: "UP NYC", address: "3806 Broadway, New York, NY 10032", area: "Washington Heights", borough: "Manhattan",
    lat: 40.83489, lon: -73.94415, types: ["nytt"], focus: "Jordan · Nike · uptown-releaser",
    description: "Fat Joes sneakerbutik vid 158th Street sedan 2016, känd för Jordan-restocks och releaser för kvarteret.",
    hours: unknown, hoursUnknown: true, hoursNote: "Ring innan",
  },
  {
    id: "rime", name: "Rime", address: "157 Smith St, Brooklyn, NY 11201", area: "Boerum Hill", borough: "Brooklyn",
    lat: 40.68639, lon: -73.99057, types: ["nytt", "begagnat"], focus: "Streetwear & sneakers · tar emot använda par",
    description: "Brooklyns select shop sedan 2007 med streetwear och sneakers. Tar emot både nya och använda par.",
    hours: unknown, hoursUnknown: true, hoursNote: "Ring innan",
  },
  {
    id: "fordham", name: "Fordham Road · Sneaker Plaza", address: "114 E Fordham Rd, Bronx, NY 10468", area: "Fordham", borough: "Bronx",
    lat: 40.86208, lon: -73.8988, types: ["nytt"], culture: "Sneakergatan", focus: "Releaser & storlekar · 60+ butiker längs gatan",
    description: "Fordham Road har enligt områdets företagarförening landets tätaste koncentration av sneakerbutiker – ett 60-tal längs gatan. Sneaker Plaza är en bra start för en promenad mot Grand Concourse.",
    hours: unknown, hoursUnknown: true, hoursNote: "Ring innan",
  },
  {
    id: "2ndchelsea", name: "2nd STREET Chelsea", address: "142 W 26th St, New York, NY 10001", area: "Chelsea", borough: "Manhattan",
    lat: 40.74535, lon: -73.99328, types: ["streetwear", "begagnat"], focus: "Designer & streetwear · japansk andrahandskedja",
    description: "Japanska andrahandsjätten 2nd STREET med streetwear, designerplagg och sneakers – allt inköpt och kontrollerat i butik. Du kan också sälja dina egna plagg här.",
    hours: daily(12, 19), hoursNote: "Kolla tider innan",
  },
  {
    id: "2nddumbo", name: "2nd STREET Dumbo", address: "70 Front St, Brooklyn, NY 11201", area: "Dumbo", borough: "Brooklyn",
    lat: 40.70244, lon: -73.98979, types: ["streetwear", "begagnat"], focus: "Streetwear & arkivplagg · köper in",
    description: "Kedjans första Brooklynbutik, öppnad 2023 under Manhattan Bridge. Streetwear, arkivplagg och begagnade sneakers – och inköp av dina egna.",
    hours: daily(11, 20),
  },
  {
    id: "tokio7", name: "Tokio 7", address: "83 E 7th St, New York, NY 10003", area: "East Village", borough: "Manhattan",
    lat: 40.72736, lon: -73.98604, types: ["streetwear"], focus: "Japansk designer & avantgarde · consignment",
    description: "East Village-consignment sedan 1995 med stark tyngd på japanska och avantgardistiska märken – Comme des Garçons, Yohji och arkivfynd bredvid streetwear.",
    hours: daily(12, 19), hoursNote: "Kolla tider innan",
  },
  {
    id: "throwback", name: "Mr. Throwback", address: "437 E 9th St, New York, NY 10009", area: "East Village", borough: "Manhattan",
    lat: 40.72764, lon: -73.98316, types: ["streetwear"], focus: "80- och 90-tals sportswear · Starter · jerseys",
    description: "Vintage sportswear från 80- och 90-talen: Starter-jackor, NBA-, MLB- och NFL-jerseys, snapbacks och memorabilia. Populär bland både atleter och kändisar.",
    hours: [h(12, 18), h(13, 20), h(13, 20), h(13, 20), h(13, 20), h(13, 20), h(13, 20)], hoursNote: "Kolla tider innan",
  },
  {
    id: "procell", name: "Procell", address: "5 Delancey St, New York, NY 10002", area: "Lower East Side", borough: "Manhattan",
    lat: 40.71994, lon: -73.99358, types: ["streetwear"], focus: "Vintage streetwear · tidig Supreme & skate",
    description: "Brian Procells och Jess Gonsalves butik vid Bowery med noggrant utvald vintage – tidig Supreme, skate- och musikplagg. Arkivet i Brooklyn är inte till salu.",
    hours: unknown, hoursUnknown: true, hoursNote: "Ring innan",
  },
  {
    id: "lukes", name: "Luke's", address: "261 Broome St, New York, NY 10002", area: "Lower East Side", borough: "Manhattan",
    lat: 40.71811, lon: -73.99046, types: ["streetwear"], focus: "High-end aftermarket · streetwear & designer",
    description: "Luke Frachers butik (en av grundarna till Round Two) med topp-streetwear, vintagetröjor och sällsynta designerplagg från de senaste 20 åren.",
    hours: unknown, hoursUnknown: true, hoursNote: "Ring innan",
  },
];
