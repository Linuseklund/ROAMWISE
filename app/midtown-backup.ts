import { isNewYork, type CatalogPlace } from './catalog';
import { proximity, validPoint } from './proximity';
// Small editorial reserve checked against the linked official pages on 2026-09-08.
// Coordinates locate the building/park area approximately, not a surveyed entrance.
const common = {
  area: 'Manhattan',
  source: 'Kontrollerat reservutbud · officiella webbplatser',
  updated: '2026-09-08',
};
export const midtownBackup: CatalogPlace[] = [
  {
    id: 'reserve-breads-bryant',
    name: 'Breads Bakery · Bryant Park',
    category: 'Restauranger',
    address: 'Heiskell Plaza, 42nd Street / Sixth Avenue',
    lat: 40.7545,
    lon: -73.9841,
    mealTypes: ['Frukost', 'Lunch'],
    cuisine: 'Kaffe & bageri',
    website: 'https://bryantpark.org/shop-eat/breads-bakery',
    visitMinutes: 45,
    details: ['Kaffe & bageri'],
    ...common,
  },
  {
    id: 'reserve-casa-toscana',
    name: 'Casa Toscana · Bryant Park',
    category: 'Restauranger',
    address: 'Bryant Park, vid fontänen i nordvästra hörnet',
    lat: 40.7541,
    lon: -73.9841,
    mealTypes: ['Lunch', 'Middag'],
    cuisine: 'Italienskt',
    openingHours: 'Mo-Su 08:00-22:00',
    website: 'https://bryantpark.org/shop-eat/casa-toscana',
    visitMinutes: 50,
    details: ['Italienskt', 'Medelhav'],
    ...common,
  },
  {
    id: 'reserve-lpq-bryant',
    name: 'Le Pain Quotidien · Bryant Park',
    category: 'Restauranger',
    address: '70 West 40th Street',
    lat: 40.7531,
    lon: -73.9841,
    mealTypes: ['Frukost', 'Lunch', 'Middag'],
    openingHours: 'Mo-Fr 06:00-21:00; Sa-Su 07:00-21:00',
    website: 'https://www.nyctourism.com/restaurants/le-pain-quotidien-bryant-park/',
    visitMinutes: 60,
    details: ['Kaffe & bageri'],
    ...common,
  },
  {
    id: 'reserve-nike-nyc',
    name: 'Nike House of Innovation NYC',
    category: 'Sneakers',
    address: '650 Fifth Avenue',
    lat: 40.759,
    lon: -73.9764,
    openingHours: 'Mo-Su 10:00-20:00',
    website: 'https://www.nike.com/retail/s/nike-nyc-house-of-innovation-000',
    visitMinutes: 45,
    details: ['Skobutiker', 'Sportbutiker'],
    ...common,
  },
  {
    id: 'reserve-moma',
    name: 'Museum of Modern Art · MoMA',
    category: 'Museum',
    address: '11 West 53 Street',
    openingHours: 'Mo-Th 10:30-17:30; Fr 10:30-20:30; Sa-Su 10:30-17:30',
    lat: 40.7614,
    lon: -73.9776,
    website: 'https://www.moma.org/visit/',
    visitMinutes: 90,
    details: ['Konst'],
    ...common,
  },
  {
    id: 'reserve-nypl',
    name: 'New York Public Library · exteriören',
    category: 'Sevärdheter',
    address: 'Fifth Avenue / 42nd Street',
    lat: 40.7532,
    lon: -73.9823,
    website: 'https://www.nypl.org/locations/schwarzman',
    visitMinutes: 20,
    details: ['Arkitektur', 'Besök utomhus; inträde och inomhustider kontrolleras separat'],
    ...common,
  },
].map((p) => ({
  ...p,
  details: [...p.details, 'Ungefärlig kartposition · kontrollera entré och öppettider'],
}));
export const downtownBackup: CatalogPlace[] = [
  {
    id: 'reserve-freemans',
    name: 'Freemans Restaurant',
    category: 'Restauranger',
    address: '2 Freeman Alley, vid Rivington Street',
    lat: 40.7221,
    lon: -73.9927,
    mealTypes: ['Middag'],
    openingHours: 'Su-Mo 17:00-22:00; Tu-Sa 17:00-23:00',
    website: 'https://www.freemansrestaurant.com/',
    visitMinutes: 75,
    details: ['Amerikanskt', 'Kontrollera bordsbokning; ingen bokning ingår'],
    ...common,
  },
  {
    id: 'reserve-buffalo-east',
    name: 'Buffalo Exchange · East Village',
    category: 'Klädbutiker',
    address: '332 East 11th Street',
    lat: 40.7297,
    lon: -73.9848,
    openingHours: 'Mo-Sa 11:00-20:00; Su 11:00-19:00',
    website: 'https://buffaloexchange.com/location/east-village-new-york/',
    visitMinutes: 60,
    details: ['Vintage', 'Secondhand · köp, sälj och byt kläder'],
    ...common,
  },
  {
    id: 'reserve-washington-square',
    name: 'Washington Square Park',
    category: 'Sevärdheter',
    address: 'Washington Square, Greenwich Village',
    lat: 40.7308,
    lon: -73.9973,
    website: 'https://www.washingtonsqpark.org/',
    visitMinutes: 35,
    details: ['Parker', 'Utomhusbesök · fontänen och Washington Square Arch'],
    ...common,
  },
  {
    id: 'reserve-russ-cafe',
    name: 'Russ & Daughters Cafe',
    category: 'Restauranger',
    address: '127 Orchard Street',
    lat: 40.7195,
    lon: -73.9898,
    mealTypes: ['Frukost', 'Lunch'],
    website: 'https://www.russanddaughterscafe.com/',
    visitMinutes: 60,
    details: [
      'Kaffe & bageri',
      'Sittande måltid. Sista sittning må–to 14.30, fr–sö 15.30. Kontrollera kö och helgdagar.',
    ],
    ...common,
  },
].map((p) => ({
  ...p,
  details: [...p.details, 'Ungefärlig kartposition · kontrollera entré och öppettider'],
}));
// Additional reserve entries checked against each official page on 2026-09-09.
export const northBrooklynBackup: CatalogPlace[] = [
  {
    id: 'reserve-butchers-williamsburg',
    name: 'The Butcher’s Daughter · Williamsburg',
    category: 'Restauranger',
    area: 'Brooklyn · Williamsburg',
    address: '271 Metropolitan Avenue',
    lat: 40.7145,
    lon: -73.9603,
    mealTypes: ['Frukost', 'Lunch'],
    openingHours: 'Mo-Su 08:00-20:00',
    website: 'https://thebutchersdaughter.com/location-all/williamsburg',
    visitMinutes: 60,
    details: [
      'Vegetariskt',
      'Grönt & lätt',
      'Växtbaserade rätter och juice; välj måltid från aktuell meny',
    ],
  },
  {
    id: 'reserve-buffalo-williamsburg',
    name: 'Buffalo Exchange · Williamsburg',
    category: 'Klädbutiker',
    area: 'Brooklyn · Williamsburg',
    address: '504 Driggs Avenue',
    lat: 40.7194,
    lon: -73.9559,
    openingHours: 'Mo-Sa 11:00-20:00; Su 11:00-19:00',
    website: 'https://buffaloexchange.com/location/williamsburg-new-york/',
    visitMinutes: 60,
    details: ['Vintage', 'Secondhand'],
  },
  {
    id: 'reserve-red-rooster',
    name: 'Red Rooster Harlem',
    category: 'Restauranger',
    area: 'Manhattan · Harlem',
    address: '310 Lenox Avenue',
    lat: 40.8081,
    lon: -73.9448,
    mealTypes: ['Lunch', 'Middag'],
    openingHours: 'Mo-Th 12:00-21:30; Fr 12:00-22:30; Sa 11:00-22:30; Su 10:00-21:30',
    website: 'https://www.redroosterharlem.com/',
    visitMinutes: 75,
    details: ['Amerikanskt', 'Kontrollera bord och meny; ingen bokning ingår'],
  },
].map((p) => ({
  ...p,
  source: common.source,
  updated: '2026-09-09',
  details: [...p.details, 'Ungefärlig kartposition · kontrollera entré och öppettider'],
}));
export const reservePlaces = [...midtownBackup, ...downtownBackup, ...northBrooklynBackup];
export function backupResults(request: Request) {
  const p = new URL(request.url).searchParams;
  if (!isNewYork(p.get('city') || 'New York')) return null;
  const borough = p.get('borough') || 'Hela New York';
  const category = p.get('category') || 'Restauranger',
    options = (p.get('options') || 'Alla').split('|'),
    q = (p.get('q') || '').trim().toLowerCase();
  let origin = null;
  try {
    const parsed = JSON.parse(p.get('origin') || 'null');
    if (validPoint(parsed)) origin = parsed;
  } catch {
    return null;
  }
  let items = reservePlaces.filter(
    (item) =>
      item.category === category &&
      (borough === 'Hela New York' || item.area.includes(borough)) &&
      (options.includes('Alla') || item.details.some((d) => options.includes(d))) &&
      `${item.name} ${item.address} ${item.area}`.toLowerCase().includes(q),
  );
  if (origin) {
    const point = origin;
    if (p.get('radius') === '3' || p.get('purpose') === 'route')
      items = items.filter(
        (item) => proximity(item as Required<CatalogPlace>, point, [], 'Normalt').km <= 3,
      );
    items.sort(
      (a, b) =>
        proximity(a as Required<CatalogPlace>, point, [], 'Normalt').km -
        proximity(b as Required<CatalogPlace>, point, [], 'Normalt').km,
    );
  }
  if (!items.length || p.get('cursor')) return null;
  return {
    items,
    total: items.length,
    nextCursor: null,
    source: 'Begränsat reservutbud · New York',
    sourceUrl: items[0].website,
    warning: 'Begränsat reservutbud. Den fullständiga platstjänsten kunde inte nås.',
    note: 'Kontrolldatum och officiell webbplats finns på varje plats. Kartpositioner och restider är uppskattningar. Kontrollera öppettider för besöksdagen.',
  };
}
