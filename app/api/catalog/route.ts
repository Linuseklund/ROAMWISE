import { backupResults } from '../../midtown-backup';
import { proximity, validPoint } from '../../proximity';
import type { Point } from '../../planner';
import { boroughs, categoryDefinitions, foodTerms, isNewYork, optionQueries, matchesSelector, type CatalogPlace } from '../../catalog';
const ROOT = 'https://data.cityofnewyork.us/resource/43nn-pn8j.json';
const NYC_SOURCE = 'https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j';
const PAGE = 100;
const literal = (s: string) => `'${s.replaceAll("'", "''")}'`;
const safeWeb = (url?: string) => url && /^https?:\/\//i.test(url) ? url : undefined;
async function readJSON(url: string, timeoutMs = 45000) {
  const r = await fetch(url, { headers: { 'User-Agent':'Roamwise/1.0 (city guide)', Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs), cf: { cacheTtl: 600, cacheEverything: true } } as RequestInit);
  if (!r.ok) throw new Error('Datakällan svarar inte just nu. Försök igen om en stund.');
  // Bounded response memory; ask for a smaller area rather than silently truncating.
  const reader = r.body?.getReader(); if (!reader) throw new Error('Tomt svar från datakällan.');
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 8_000_000) { await reader.cancel(); throw new Error('Sökningen är för stor. Välj en stadsdel eller en mer detaljerad kategori.'); } chunks.push(value); }
  const text = new TextDecoder(); return JSON.parse(chunks.map(c => text.decode(c, { stream:true })).join('') + text.decode());
}
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if(params.get('reserve')==='1'){const backup=backupResults(request);return backup?Response.json(backup,{headers:{'Cache-Control':'no-store'}}):Response.json({error:'Inget reservutbud matchar dessa val.'},{status:503});}
    const city = (params.get('city') || 'New York').slice(0,120).trim();
    const category = params.get('category') || 'Restauranger';
    const definition = categoryDefinitions.find(c => c.key === category);
    if (!definition) return Response.json({ error:'Okänd kategori.' }, { status:400 });
    const selected = (params.get('options') || 'Alla').split('|').filter(o => definition.options.includes(o));
    const q = (params.get('q') || '').trim().slice(0,100);
    const borough = boroughs.includes(params.get('borough') || '') ? params.get('borough')! : boroughs[0];
    const cursor = params.get('cursor') || '';
    let origin:Point|null=null, route:Point[]=[];
    try { const point=JSON.parse(params.get('origin')||'null');if(validPoint(point))origin=point;const points=JSON.parse(params.get('route')||'[]');if(Array.isArray(points))route=points.filter(validPoint).slice(0,100); } catch { return Response.json({error:'Ogiltig position.'},{status:400}); }
    const sort=origin&&['near','route','detour'].includes(params.get('sort')||'')?params.get('sort')!:'name';
    const routeSearch=params.get('purpose')==='route';
    const radius=routeSearch&&origin?3:params.get('radius')==='3'?3:null;
    const read = (url:string) => readJSON(url, routeSearch ? 5000 : 12000);
    const tempo=params.get('tempo')||'Normalt';
    const score=(p:Point)=>{if(!origin)return 0;const n=proximity(p,origin,route,tempo);return sort==='detour'?n.detourMinutes:sort==='route'?n.nearRoute:n.km;};
    const rank=(a:{id:string;lat?:number;lon?:number},b:{id:string;lat?:number;lon?:number})=>(validPoint(a)?score(a):Infinity)-(validPoint(b)?score(b):Infinity)||a.id.localeCompare(b.id);

    if (isNewYork(city) && category === 'Restauranger') {
      try {
      const where = ['dba is not null'];
      if (borough !== boroughs[0]) where.push(`boro = ${literal(borough)}`);
      if (sort==='name' && cursor && /^\d+$/.test(cursor)) where.push(`camis > ${literal(cursor)}`);
      if (q) {
        const search = literal(`%${q.toUpperCase().replace(/[%_]/g,'')}%`);
        where.push(`(upper(dba) like ${search} OR upper(street) like ${search} OR zipcode like ${search})`);
      }
      if (selected.length && !selected.includes('Alla')) {
        const terms = [...new Set(selected.flatMap(o => foodTerms[o] || []))];
        if (terms.length) where.push(`(${terms.map(term => `upper(cuisine_description) like ${literal('%'+term.toUpperCase()+'%')}`).join(' OR ')})`);
      }
      const query = new URLSearchParams({ '$select':'camis,max(dba) as name,max(boro) as borough,max(building) as building,max(street) as street,max(zipcode) as zipcode,max(cuisine_description) as cuisine,max(latitude) as lat,max(longitude) as lon,max(phone) as phone,max(record_date) as updated', '$group':'camis', '$where':where.join(' AND '), '$order':'camis', '$limit':String(PAGE+1) });
      let sortedIds:string[]|null=null, sortedTotal:number|undefined, sortedNext:string|null=null;
      let orderingFallback=!routeSearch && /^catalog:\d+$/.test(cursor);
      if(orderingFallback)query.set('$where',`${where.join(' AND ')} AND camis > ${literal(cursor.slice(8))}`);
      if(sort!=='name'&&origin&&!orderingFallback){
        try {
        // Fetch only ID and coordinates for ranking all matching entries, then details for one page.
        const compact=new URLSearchParams(query);compact.set('$select','camis,max(latitude) as lat,max(longitude) as lon');compact.set('$limit','50001');
        if(radius){const dy=radius/111,dx=radius/(111*Math.cos(origin.lat*Math.PI/180));compact.set('$where',`${where.join(' AND ')} AND latitude between ${origin.lat-dy} and ${origin.lat+dy} AND longitude between ${origin.lon-dx} and ${origin.lon+dx}`);}
        const all=await read(`${ROOT}?${compact}`);
        if(!Array.isArray(all)||all.length>50000)throw new Error('Välj en stadsdel eller en mer detaljerad mattyp för att sortera sökningen.');
        const ranked=all.map((r:any)=>({id:String(r.camis),lat:Number(r.lat),lon:Number(r.lon)})).filter((p:Point)=>validPoint(p)&&p.lat>40&&p.lat<42&&p.lon>-75&&p.lon<-72&&(!radius||proximity(p,origin!,[],tempo).km<=radius)).sort(rank);
        const offset=/^\d+$/.test(cursor)?Number(cursor):0;sortedTotal=ranked.length;sortedIds=ranked.slice(offset,offset+PAGE).map((r:any)=>r.id);sortedNext=offset+PAGE<ranked.length?String(offset+PAGE):null;
        if(sortedIds.length){query.set('$where',`(${where.join(' AND ')}) AND camis in (${sortedIds.map(literal).join(',')})`);query.set('$limit',String(PAGE));}
        } catch(error) {
          if(routeSearch)throw error;
          // A failed whole-city ranking must not block the ordinary catalogue.
          orderingFallback=true;sortedIds=null;sortedTotal=undefined;sortedNext=null;
          query.set('$where',where.join(' AND '));query.set('$limit',String(PAGE+1));
        }
      }
      const rows = sortedIds?.length===0?[]:await read(`${ROOT}?${query}`);
      if (!Array.isArray(rows)) throw new Error('Restaurangregistret gav inget läsbart svar.');
      const items: CatalogPlace[] = rows.slice(0,PAGE).map((r: Record<string,string>) => {
        const valid = Number(r.lat)>40 && Number(r.lat)<42 && Number(r.lon)<-72 && Number(r.lon)>-75;
        return { id:`nyc-${r.camis}`, name:r.name, area:r.borough, address:[r.building, r.street, r.zipcode].filter(Boolean).join(' '), category, cuisine:r.cuisine, lat:valid?Number(r.lat):undefined, lon:valid?Number(r.lon):undefined, phone:r.phone, details:[r.cuisine || 'Mattyp saknas'], source:'NYC Open Data', updated:r.updated?.slice(0,10) };
      });
      if(sortedIds)items.sort((a,b)=>sortedIds!.indexOf(a.id.slice(4))-sortedIds!.indexOf(b.id.slice(4)));
      return Response.json({ items, total:sortedTotal, warning:orderingFallback?'Sorteringen efter avstånd eller omväg kunde inte hämtas. Visar katalogordning med dina valda filter.':undefined, nextCursor:sortedIds?sortedNext:rows.length>PAGE?(orderingFallback?'catalog:':'')+rows[PAGE-1].camis:null, source:'NYC Open Data · DOHMH', sourceUrl:NYC_SOURCE, note:'Registrerade restauranger i stadens inspektionsdata. En post per verksamhets-ID; alla sidor kan hämtas. Registret garanterar inte öppet vid ditt besök. Pris och öppettider ingår inte.' }, { headers: { 'Cache-Control':'public, max-age=300' } });
      } catch(error) {
        // Nearby suggestions can use OSM when the restaurant register is unavailable.
        // Keep full catalogue searches strict about their source and completeness.
        if(!routeSearch || !origin) throw error;
      }
    }
    const location = isNewYork(city) ? borough === boroughs[0] ? 'New York City, New York, USA' : `${borough}, New York City, New York, USA` : city;
    const geo = radius&&origin ? [{boundingbox:[origin.lat,origin.lat,origin.lon,origin.lon]}] : await readJSON(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,8000);
    if (!geo[0]?.boundingbox) throw new Error('Platsen hittades inte. Kontrollera stadsnamnet.');
    const g = geo[0];
    const area = g.osm_type === 'relation' ? 3600000000+Number(g.osm_id) : g.osm_type === 'way' ? 2400000000+Number(g.osm_id) : null;
    const [south,north,west,east] = g.boundingbox;
    const scope = radius&&origin ? `(around:${radius*1000},${origin.lat},${origin.lon})` : area ? '(area.search)' : `(${south},${west},${north},${east})`;
    const query = `[out:json][timeout:${routeSearch?5:10}];${area ? `area(${area})->.search;` : ''}(${optionQueries(category,selected).map(f=>`nwr${f}["name"]${scope};`).join('')});out center tags${routeSearch?' 120':''};`;
    let data:any;
    const endpoints=['https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
    for(let i=0;i<endpoints.length;i++) {
      try {
        data=await readJSON(`${endpoints[i]}?data=${encodeURIComponent(query)}`,routeSearch?6500:12000);
        if(data.remark && (!routeSearch || !data.elements?.some((p:any)=>p.tags?.name && validPoint({lat:Number(p.lat??p.center?.lat),lon:Number(p.lon??p.center?.lon)})))) throw new Error('Karttjänsten kunde inte slutföra sökningen. Dina val är kvar. Försök igen om en stund.');
        break;
      }catch(error){if(i===endpoints.length-1)throw error;}
    }
    const seen = new Set<string>();
    const items: CatalogPlace[] = (data.elements || []).flatMap((item: any) => {
      const t = item.tags || {}; if (!t.name || t.opening_hours === 'closed') return [];
      const street = [t['addr:street'],t['addr:housenumber'],t['addr:postcode']].filter(Boolean).join(' ');
      const lat=Number(item.lat??item.center?.lat),lon=Number(item.lon??item.center?.lon);
      const key=`${t.name.toLowerCase()}-${lat.toFixed(4)}-${lon.toFixed(4)}`; if (seen.has(key)) return []; seen.add(key);
      const areaLabel = t['addr:suburb'] || t['addr:district'] || (borough !== boroughs[0] && isNewYork(city) ? borough : t['addr:city'] || city);
      if (q && !`${t.name} ${t.brand||''} ${areaLabel} ${street}`.toLowerCase().includes(q.toLowerCase())) return [];
      const types = definition.options.filter(o=>o!=='Alla' && definition.queries[o].some(f=>matchesSelector(t,f)));
      return [{ id:`${item.type}-${item.id}`, name:t.name, area:areaLabel, address:street || 'Gatuadress saknas · position finns på kartan', category, lat:Number.isFinite(lat)?lat:undefined,lon:Number.isFinite(lon)?lon:undefined,website:safeWeb(t.website||t['contact:website']),phone:t.phone||t['contact:phone'],openingHours:t.opening_hours,cuisine:t.cuisine,details:types.length?types:[definition.label],source:'OpenStreetMap' }];
    });
    items.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id):rank);
    const offset = /^\d+$/.test(cursor) ? Math.min(Number(cursor),items.length) : 0;
    return Response.json({ items:items.slice(offset,offset+PAGE), warning:data.remark?'Sökningen avbröts. Visar de platser som hann hämtas.':undefined, total:items.length, nextCursor:offset+PAGE<items.length?String(offset+PAGE):null,source:'© OpenStreetMap contributors',sourceUrl:'https://www.openstreetmap.org/copyright',note:routeSearch?'Ett urval av närliggande platser från OpenStreetMap. Öppettider behöver kontrolleras.':'Alla namngivna kartposter som matchar sökningen, uppdelade i sidor. Kartdata kan sakna verksamheter eller underkategorier. Konserter och utställningsprogram behöver kontrolleras hos arrangören.' }, { headers: { 'Cache-Control':'public, max-age=300' } });
  } catch (error) { const backup=backupResults(request);if(backup)return Response.json(backup,{headers:{'Cache-Control':'no-store'}});return Response.json({ error:error instanceof Error&&!/internal error|timed out|timeout|fetch failed/i.test(error.message)?error.message:'Platstjänsten svarar inte just nu. Prova igen om en stund. Dina val är kvar.' }, { status:502 }); }
}
