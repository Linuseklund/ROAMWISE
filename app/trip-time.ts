export function localClock(zone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const get = (type: string) => parts.find(p=>p.type===type)?.value || '';
  return { date:`${get('year')}-${get('month')}-${get('day')}`, minutes:Number(get('hour'))*60+Number(get('minute')) };
}
export function minuteOnTrip(date: string, zone: string, now = new Date()) {
  const local = localClock(zone,now);
  return (Date.parse(`${local.date}T00:00:00Z`)-Date.parse(`${date}T00:00:00Z`))/86400000*1440+local.minutes;
}
export function cityZone(city: string) {
  const zones:Record<string,string>={'new york':'America/New_York','new york city':'America/New_York',nyc:'America/New_York',barcelona:'Europe/Madrid',stockholm:'Europe/Stockholm',paris:'Europe/Paris',london:'Europe/London',tokyo:'Asia/Tokyo'};
  return zones[city.toLowerCase().trim()];
}
