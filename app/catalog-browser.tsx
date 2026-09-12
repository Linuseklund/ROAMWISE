"use client";
import { useEffect, useRef, useState } from 'react';
import { proximity, validPoint } from './proximity';
import type { Point } from './planner';
import { boroughs, categoryDefinitions, isNewYork, type CatalogPlace } from './catalog';
type Result = { items: CatalogPlace[]; nextCursor: string | null; total?: number; source: string; sourceUrl: string; note: string; warning?: string };
export default function CatalogBrowser({ city, fixedCategory, fixedOptions, selectedIds, onToggle, origin, routePoints=[], tempo='Normalt', onLocate, selectionLabel }: { selectionLabel?:string; city: string; fixedCategory?: string; fixedOptions?: string[]; selectedIds: string[]; onToggle: (place: CatalogPlace, priority?:boolean) => void; origin:Point|null; routePoints?:Point[]; tempo?:string; onLocate:()=>void }) {
  const [sort,setSort]=useState('name');
  const [priority,setPriority]=useState(true);
  const [category,setCategory] = useState('Restauranger');
  const [options,setOptions] = useState(['Alla']);
  const key = fixedCategory || category;
  const selectedOptions = fixedOptions || options;
  const definition = categoryDefinitions.find(c=>c.key===key)!;
  const [borough,setBorough] = useState(boroughs[0]);
  const [search,setSearch] = useState('');
  const [query,setQuery] = useState('');
  const [data,setData] = useState<Result | null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [dataKey,setDataKey]=useState('');
  const [errorPage,setErrorPage]=useState(false);
  const [retry,setRetry] = useState(0);
  const request = useRef<AbortController | null>(null);
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search),450);return()=>clearTimeout(timer);},[search]);
  const queryKey=JSON.stringify([city,key,selectedOptions,borough,query,sort,origin,routePoints,tempo]);
  const signature=JSON.stringify([queryKey,retry]);
  const stale=!!data&&(dataKey!==queryKey||search!==query);
  const visibleData=stale?null:data;
  useEffect(()=>{
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setError('');setErrorPage(false);setLoading(true);
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({city,category:key,options:selectedOptions.join('|'),borough,q:query,sort,origin:JSON.stringify(origin),route:JSON.stringify(routePoints),tempo});
      fetch(`/api/catalog?${params}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(35000)])}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Sökningen kunde inte laddas.');return body;}).then(body=>{if(!controller.signal.aborted){setData(body);setDataKey(queryKey);}}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error && !/timeout|fetch|abort/i.test(e.message)?e.message:'Sökningen tog för lång tid eller kunde inte ansluta. Dina val är kvar. Försök igen.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },300);
    return()=>{clearTimeout(timer);controller.abort();request.current?.abort();};
  },[signature]);
  async function more() {
    if(!data?.nextCursor||loading||stale)return;
    const controller=new AbortController();request.current=controller;setLoading(true);setError('');setErrorPage(true);
    try {
      const params=new URLSearchParams({city,category:key,options:selectedOptions.join('|'),borough,q:query,cursor:data.nextCursor,sort,origin:JSON.stringify(origin),route:JSON.stringify(routePoints),tempo});
      const r=await fetch(`/api/catalog?${params}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(35000)])});const body=await r.json();if(!r.ok)throw new Error(body.error||'Nästa sida kunde inte laddas.');
      if(!controller.signal.aborted)setData(previous=>previous?{...body,items:[...previous.items,...body.items.filter((p:CatalogPlace)=>!previous.items.some(old=>old.id===p.id))]}:body);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Nästa sida kunde inte laddas.');}finally{if(!controller.signal.aborted)setLoading(false);}
  }
  return <section className="catalog-browser" aria-label={`${definition.label} i ${city}`}>
    <div className="catalog-filters">
      {!fixedCategory && <><label>KATEGORI<select value={category} onChange={e=>{setCategory(e.target.value);setOptions(['Alla']);setSearch('');}}>{categoryDefinitions.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label><label>INRIKTNING<select value={options[0]} onChange={e=>setOptions([e.target.value])}>{definition.options.map(o=><option key={o}>{o}</option>)}</select></label></>}
      {isNewYork(city)&&<label>STADSDEL<select value={borough} onChange={e=>setBorough(e.target.value)}>{boroughs.map(b=><option key={b}>{b}</option>)}</select></label>}
      <label className="catalog-search">SÖK PLATS<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Namn, gata eller postnummer" type="search"/></label>
    </div>
    <div className="catalog-filters catalog-order"><label>SORTERA<select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Katalogordning</option><option value="near" disabled={!origin}>Närmast min start / position</option><option value="route" disabled={!origin}>Nära stopp i min rutt</option><option value="detour" disabled={!origin}>Minsta extra omväg</option></select></label><button onClick={onLocate}>ANVÄND MIN POSITION</button><label>LÄGG TILL SOM<select value={priority?'priority':'optional'} onChange={e=>setPriority(e.target.value==='priority')}><option value="priority">Prioriterad</option><option value="optional">Om tiden räcker</option></select></label></div><p className="catalog-source">Avstånd och extra gångtid är uppskattningar. Omvägen jämförs med stoppordningen och inkluderar inte besökstid.</p>
    <p className="catalog-summary" role="status">{loading?'Söker i katalogen…':error&&!visibleData?'Sökningen kunde inte slutföras.':visibleData?`${visibleData.items.length}${visibleData.total!=null?` av ${visibleData.total}`:''} platser hämtade${visibleData.nextCursor?' · fler finns att hämta':''}`:'Välj vad du vill uppleva.'}</p>

    {visibleData?.warning&&<p className="catalog-source" role="status">{visibleData.warning}</p>}
    {visibleData&&<p className="catalog-source"><a href={visibleData.sourceUrl} target="_blank" rel="noreferrer">{visibleData.source} ↗</a> · {visibleData.note}</p>}
    <div className="catalog-results">{visibleData?.items.map(p=>{
      const chosen=selectedIds.includes(p.id);const position=Number.isFinite(p.lat)&&Number.isFinite(p.lon);
      const nearby=origin&&validPoint(p)?proximity(p,origin,routePoints,tempo):null;
      return <article key={p.id} className={chosen?'catalog-place chosen':'catalog-place'}><div><span className="catalog-kind">{p.details.join(' · ')}</span><h3>{p.name}</h3><p>{p.area} · {p.address}</p>{nearby&&<p className="catalog-proximity">{nearby.km.toFixed(1)} km från start / position · ca +{nearby.detourMinutes} min extra gång</p>}<details><summary>Detaljer & öppettider</summary><p>{p.openingHours?`Registrerade öppettider: ${p.openingHours}`:'Öppettider saknas. Kontrollera hos verksamheten.'}</p>{p.updated&&<p>Registerdatum: {p.updated}</p>}{p.phone&&<p>Telefon: <a href={`tel:${p.phone.replace(/[^+0-9]/g,'')}`}>{p.phone}</a></p>}{p.website&&<a href={p.website} target="_blank" rel="noreferrer">Webbplats ↗</a>}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address}, ${city}`)}`} target="_blank" rel="noreferrer">Visa på karta ↗</a><p>{position?'Besökstid kan justeras i rutten.':'Position saknas i datakällan. Öppna kartan för att hitta adressen.'}</p></details></div><button disabled={!position} aria-pressed={chosen} onClick={()=>onToggle(p,priority)}>{selectionLabel&&position?selectionLabel:chosen?'✓ VALD – TA BORT':position?'+ LÄGG TILL I RUTTEN':'POSITION SAKNAS'}</button></article>;
    })}</div>
    {visibleData&&!visibleData.items.length&&!loading&&<p className="catalog-empty">Inga matchningar i datakällan. Prova Alla eller en annan stadsdel. Underkategorier kan saknas i kartdata även när platsen finns.</p>}
    {error&&<div className="catalog-error" role="alert"><p>{error}</p><button disabled={loading} onClick={()=>errorPage&&!stale?more():setRetry(v=>v+1)}>FÖRSÖK IGEN</button>{sort!=='name'&&<button disabled={loading} onClick={()=>setSort('name')}>VISA KATALOGORDNING</button>}</div>}
    {data?.nextCursor&&!stale&&<button className="catalog-more" onClick={more} disabled={loading}>{loading?'HÄMTAR FLER…':'VISA FLER PLATSER'}</button>}
  </section>;
}
