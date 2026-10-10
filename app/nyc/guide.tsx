"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dayHours, newYorkNow, openStatus, weekdayNames } from "../vinyl/stores";
import { nearestStations, planSubway, routeColors, transitLinks, walkMinutes, type Journey, type LatLon } from "../vinyl/subway";
import { sneakerTypes, type SneakerType } from "../sneakers/stores";
import { categories, guideStores, type Category, type GuideStore } from "./stores";

type Filter = "alla" | SneakerType | "oppet";
type Layer = { addTo(m: LeafletMap): Layer; bindPopup(html: string, options?: object): Layer; on(event: string, fn: () => void): Layer };
type LayerGroup = Layer & { clearLayers(): void; addLayer(l: Layer): void };
type LeafletMap = { remove(): void; setView(c: [number, number], z: number, o?: object): void; fitBounds(b: [number, number][], o?: object): void };
type Leaflet = {
  map(el: HTMLElement, o?: object): LeafletMap;
  tileLayer(url: string, o: object): Layer;
  marker(c: [number, number], o: object): Layer;
  divIcon(o: object): unknown;
  polyline(c: [number, number][], o: object): Layer;
  layerGroup(): LayerGroup;
};
declare global { interface Window { L?: Leaflet } }

const NYC: [number, number] = [40.7128, -73.965];

function loadLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet saknas")));
    script.onerror = () => reject(new Error("Kartan kunde inte laddas"));
    document.head.appendChild(script);
  });
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function Bullet({ route }: { route: string }) {
  const color = routeColors[route] || { bg: "#555", fg: "#fff" };
  return <span className="vinyl-bullet" style={{ background: color.bg, color: color.fg }} aria-label={`Linje ${route}`}>{route}</span>;
}

function TypeBullet({ type }: { type: SneakerType }) {
  const t = sneakerTypes[type];
  return <span className="vinyl-bullet" style={{ background: t.bg, color: t.fg }} aria-hidden="true">{t.short}</span>;
}

function JourneySteps({ journey }: { journey: Journey }) {
  return (
    <ol className="vinyl-steps">
      {journey.steps.map((step, i) => (
        <li key={i}>
          {step.kind === "walk" && <><span className="vinyl-step-icon">⟶</span><span>Gå {step.minutes} min till <b>{step.to}</b></span></>}
          {step.kind === "ride" && <><span className="vinyl-step-icon">{step.routes.map((r) => <Bullet key={r} route={r} />)}</span><span>Åk från <b>{step.from.name}</b> till <b>{step.to.name}</b> · ca {step.minutes} min</span></>}
          {step.kind === "transfer" && <><span className="vinyl-step-icon">⇄</span><span>Byt tåg vid <b>{step.at.name}</b></span></>}
          {step.kind === "ferry" && <><span className="vinyl-step-icon"><span className="vinyl-pill">FÄRJA</span></span><span>Ta <b>{step.label}</b> från {step.from.name} till <b>{step.to.name}</b> · ca {step.minutes} min inkl. väntan</span></>}
          {step.kind === "bus" && <><span className="vinyl-step-icon"><span className="vinyl-pill">{step.label}</span></span><span>Ta buss <b>{step.label}</b> från {step.from.name} till <b>{step.to.name}</b> · ca {step.minutes} min</span></>}
        </li>
      ))}
    </ol>
  );
}

const journeyMode = (s: GuideStore, j: Journey) => (j.walkOnly ? "till fots" : s.gateway ? "med subway, färja och buss" : "med subway");
/** Vinyl stores share one MTA red; sneaker stores take the colour of their first type. */
const pinColor = (s: GuideStore) => (s.cat === "vinyl" ? categories.vinyl : sneakerTypes[s.types[0]]);

function popupHtml(s: GuideStore, now: { day: number; minutes: number }, journey?: Journey) {
  const status = openStatus(s, now);
  const rows = [1, 2, 3, 4, 5, 6, 0].map((d) => `<tr${d === now.day ? ' class="today"' : ""}><th>${weekdayNames[d]}</th><td>${dayHours(s, d)}</td></tr>`).join("");
  const stock = [s.cat === "vinyl" ? categories.vinyl.tag : "", s.culture, s.types.map((t) => sneakerTypes[t].label).join(" & ")].filter(Boolean).join(" · ");
  const trip = journey ? ` · ca ${journey.minutes} min ${journeyMode(s, journey)}` : "";
  return `<div class="vinyl-pop"><div class="vinyl-pop-head"><small>${esc(s.area)} · ${esc(s.borough)}</small><b>${esc(s.name)}</b><em${status.open ? ' class="open"' : ""}>${esc(status.label)}</em></div>`
    + `<div class="vinyl-pop-body"><p class="vinyl-pop-genre">${esc(s.focus)}</p><p class="vinyl-pop-stock">${esc(stock.toUpperCase())}</p><p>${esc(s.description)}</p>`
    + `<table aria-label="Öppettider"><tbody>${rows}</tbody></table>`
    + `<button type="button" data-sneaker-store="${s.id}">Ta dig dit${esc(trip)} →</button></div></div>`;
}

export default function NycGuide({ initialCategory = "alla" }: { initialCategory?: Category | "alla" }) {
  const [category, setCategory] = useState<Category | "alla">(initialCategory);
  const [filter, setFilter] = useState<Filter>("alla");
  const [selected, setSelected] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLon | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [now, setNow] = useState(() => newYorkNow());
  const [mapError, setMapError] = useState("");
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ L: Leaflet; map: LeafletMap; layer: LayerGroup } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(newYorkNow()), 60000); return () => clearInterval(t); }, []);

  const journeys = useMemo(() => {
    if (!position) return {} as Record<string, Journey>;
    return Object.fromEntries(guideStores.map((s) => [s.id, planSubway(position, s, s.name, s.gateway)]));
  }, [position]);

  const stores = useMemo(() => {
    const list = guideStores.filter((s) => (category === "alla" || s.cat === category) &&
      (filter === "alla" ? true : filter === "oppet" ? openStatus(s, now).open : s.types.includes(filter)));
    return position ? [...list].sort((a, b) => journeys[a.id].minutes - journeys[b.id].minutes) : list;
  }, [category, filter, now, position, journeys]);

  const locate = () => {
    if (!navigator.geolocation) { setLocationError("Din webbläsare kan inte dela position."); return; }
    setLocating(true); setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocating(false); },
      () => { setLocationError("Kunde inte hämta din position. Tillåt platsåtkomst och försök igen."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { zoomControl: true, scrollWheelZoom: false });
      map.setView(NYC, 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      const layer = L.layerGroup();
      layer.addTo(map);
      mapRef.current = { L, map, layer };
      setMapReady(true);
    }).catch((e: Error) => setMapError(e.message));
    return () => { cancelled = true; mapRef.current?.map.remove(); mapRef.current = null; };
  }, []);

  // Redraw markers and the selected journey.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    const { L, map, layer } = ctx;
    layer.clearLayers();
    const bounds: [number, number][] = [];
    stores.forEach((s, i) => {
      const open = openStatus(s, now).open;
      const icon = L.divIcon({ className: "", html: `<div class="vinyl-pin sneaker-pin${s.id === selected ? " active" : ""}${open ? "" : " closed"}" style="--c:${pinColor(s).bg};--fg:${pinColor(s).fg}">${i + 1}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
      layer.addLayer(L.marker([s.lat, s.lon], { icon, title: s.name }).bindPopup(popupHtml(s, now, journeys[s.id]), { maxWidth: 300, autoPanPadding: [20, 20] }));
      bounds.push([s.lat, s.lon]);
    });
    if (position) {
      layer.addLayer(L.marker([position.lat, position.lon], { icon: L.divIcon({ className: "", html: '<div class="vinyl-me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), title: "Du är här" }));
      bounds.push([position.lat, position.lon]);
    }
    const store = guideStores.find((s) => s.id === selected);
    const journey = store && journeys[store.id];
    if (store && position && journey) {
      const pts: [number, number][] = [[position.lat, position.lon]];
      journey.steps.forEach((step) => { if (step.kind === "ride" || step.kind === "ferry" || step.kind === "bus") pts.push([step.from.lat, step.from.lon], [step.to.lat, step.to.lon]); });
      pts.push([store.lat, store.lon]);
      layer.addLayer(L.polyline(pts, { color: "#0b0b0b", weight: 4, dashArray: journey.walkOnly ? "2 8" : undefined, opacity: 0.85 }));
      map.fitBounds(pts, { padding: [50, 50], maxZoom: 15, animate: false });
    } else if (store) {
      map.setView([store.lat, store.lon], 15, { animate: false });
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
    }
  }, [stores, selected, position, journeys, now, mapReady]);

  // The popup's button lives in Leaflet's DOM, so listen for it at document level.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const id = (event.target as HTMLElement).closest<HTMLElement>("[data-sneaker-store]")?.dataset.sneakerStore;
      if (!id) return;
      setSelected(id);
      setTimeout(() => document.getElementById(`store-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const openCount = guideStores.filter((s) => openStatus(s, now).open).length;

  return (
    <main className="vinyl sneakers">
      <header className="header">
        <Link className="wordmark" href="/">roamwise<span>®</span></Link>
        <nav><a href="#butiker">BUTIKER</a><a href="#karta">KARTA</a><Link href="/">STADSGUIDE</Link></nav>
      </header>

      <section className="vinyl-hero">
        <div>
          <p className="overline"><span className="sneaker-mta">MTA</span> NEW YORK<span className="sneaker-legend-item"><span className="vinyl-bullet" style={{ background: categories.vinyl.bg, color: categories.vinyl.fg }} aria-hidden="true">V</span>VINYL</span>{(Object.keys(sneakerTypes) as SneakerType[]).map((t) => <span key={t} className="sneaker-legend-item"><TypeBullet type={t} />{sneakerTypes[t].label.toUpperCase()}</span>)}</p>
          <h1>vinyl &amp; sneakers<br /><i>på linjen.</i></h1>
        </div>
        <div className="vinyl-hero-side">
          <p>House på vinyl och sneakers i en guide: skivbutiker i alla fem boroughs, sneakerbutiker med nytt, resell och begagnat – plus andrahandsbutiker för streetwear. Med öppettider, karta och subway-väg dit från där du står.</p>
          <div className="vinyl-stats">
            <span><b>{guideStores.length}</b>BUTIKER</span>
            <span><b>{openCount}</b>ÖPPNA NU</span>
            <span><b>{String(Math.floor(now.minutes / 60)).padStart(2, "0")}:{String(now.minutes % 60).padStart(2, "0")}</b>NEW YORK-TID</span>
          </div>
        </div>
      </section>

      <section className="vinyl-toolbar" aria-label="Filter">
        <div className="vinyl-filters nyc-cats" role="group" aria-label="Kategori">
          {([["alla", "ALLT"], ["vinyl", "VINYL"], ["sneakers", "SNEAKERS & STREETWEAR"]] as [Category | "alla", string][]).map(([key, label]) => (
            <button key={key} className={category === key ? "chosen" : ""} aria-pressed={category === key} onClick={() => setCategory(key)}>{key !== "alla" && <i className="nyc-dot" style={{ background: categories[key].bg }} />}{label}</button>
          ))}
        </div>
        <div className="vinyl-filters" role="group" aria-label="Visa">
          {([["alla", "ALLA"], ...(Object.keys(sneakerTypes) as SneakerType[]).map((t) => [t, sneakerTypes[t].label.toUpperCase()]), ["oppet", "ÖPPET NU"]] as [Filter, string][]).map(([key, label]) => (
            <button key={key} className={filter === key ? "chosen" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key in sneakerTypes && <TypeBullet type={key as SneakerType} />}{label}</button>
          ))}
        </div>
        <button className="vinyl-locate" onClick={locate} disabled={locating}>{locating ? "HÄMTAR POSITION…" : position ? "UPPDATERA MIN POSITION" : "SUBWAY FRÅN MIN POSITION"}</button>
      </section>
      {locationError && <p className="vinyl-alert" role="alert">{locationError}</p>}
      {position && <p className="vinyl-note">Sorterat efter restid från din position. Subway-förslagen är uppskattningar med max ett byte – öppna Google Maps eller Apple Kartor för avgångar i realtid och trafikstörningar.</p>}

      <section className="vinyl-layout">
        <div className="vinyl-list" id="butiker">
          {stores.length === 0 && <div className="empty"><h3>Inga butiker matchar</h3><p>Alla butiker är stängda just nu. Testa ett annat filter.</p></div>}
          {stores.map((s, i) => {
            const status = openStatus(s, now);
            const journey = journeys[s.id];
            const links = transitLinks(position, s);
            const closest = nearestStations(s, 1)[0];
            const active = selected === s.id;
            return (
              <article key={s.id} id={`store-${s.id}`} className={`vinyl-card${active ? " active" : ""}`} onClick={() => setSelected(active ? null : s.id)}>
                <div className="vinyl-card-top">
                  <span className="vinyl-num">{i + 1}</span>
                  <div className="vinyl-card-title">
                    <p className="vinyl-meta">{s.area.toUpperCase()} · {s.borough.toUpperCase()}</p>
                    <h2>{s.name}</h2>
                    <p className="vinyl-focus">{s.focus}</p>
                  </div>
                  <span className={`vinyl-status${status.open ? " open" : ""}`}>{status.label}</span>
                </div>
                <div className="vinyl-card-body">
                <div className="vinyl-tags">{s.cat === "vinyl" && <span style={{ background: categories.vinyl.bg, borderColor: categories.vinyl.bg, color: categories.vinyl.fg }}>{categories.vinyl.tag}</span>}{s.culture && <span>{s.culture.toUpperCase()}</span>}{s.types.map((t) => <span key={t} style={{ background: sneakerTypes[t].bg, borderColor: sneakerTypes[t].bg, color: sneakerTypes[t].fg }}>{sneakerTypes[t].label.toUpperCase()}</span>)}{s.hoursNote && <span className="soft">{s.hoursNote.toUpperCase()}</span>}</div>
                <p className="vinyl-desc">{s.description}</p>
                <p className="vinyl-address">{s.address}</p>
                {s.gateway && <p className="vinyl-station">Ingen subway hit: ta <b>Staten Island-färjan</b> från Whitehall Terminal {["1", "R", "W"].map((r) => <Bullet key={r} route={r} />)} och sedan buss <b>S48</b>.</p>}
                {!s.gateway && closest && <p className="vinyl-station">Närmaste station: <b>{closest.name}</b> {closest.routes.map((r) => <Bullet key={r} route={r} />)} · {walkMinutes(closest, s)} min promenad</p>}

                {active && (
                  <div className="vinyl-details" onClick={(e) => e.stopPropagation()}>
                    <table className="vinyl-hours">
                      <caption>ÖPPETTIDER</caption>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                          <tr key={d} className={d === now.day ? "today" : ""}><th>{weekdayNames[d]}</th><td>{dayHours(s, d)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="vinyl-route">
                      <p className="vinyl-route-title">TA DIG DIT</p>
                      {journey ? (
                        <>
                          <p className="vinyl-route-total"><b>ca {journey.minutes} min</b> {journeyMode(s, journey)}</p>
                          <JourneySteps journey={journey} />
                        </>
                      ) : (
                        <button className="vinyl-inline-locate" onClick={locate} disabled={locating}>{locating ? "Hämtar position…" : "Visa subway-väg från min position →"}</button>
                      )}
                      <div className="vinyl-links">
                        <a href={links.google} target="_blank" rel="noreferrer">GOOGLE MAPS (SUBWAY)</a>
                        <a href={links.apple} target="_blank" rel="noreferrer">APPLE KARTOR</a>
                        {s.link && <a href={s.link} target="_blank" rel="noreferrer">BUTIKENS SIDA</a>}
                      </div>
                    </div>
                  </div>
                )}
                {!active && <span className="vinyl-more">{journey ? `${journey.walkOnly ? "Gå" : "Subway"} ca ${journey.minutes} min · ` : ""}Öppettider & vägbeskrivning ↓</span>}
                </div>
              </article>
            );
          })}
          <p className="source-note vinyl-source">Öppettider kontrollerade oktober 2026 via butikernas egna sidor och aktuella listningar. Releasedagar för sneakers kan ge köer och ändrade tider – kolla butikens Instagram innan du åker. Resell = oanvända par som säljs vidare (consignment eller verifierad andrahand). Stationsdata: MTA / data.ny.gov.</p>
        </div>

        <div className="vinyl-map-panel" id="karta">
          <div ref={mapEl} className="vinyl-map" role="region" aria-label="Karta över vinyl- och sneakerbutiker i New York" />
          {mapError && <p className="vinyl-alert">{mapError}</p>}
          <div className="vinyl-legend"><span><i className="vinyl-pin-mini" style={{ background: categories.vinyl.bg, borderColor: categories.vinyl.bg }} /> Vinyl</span>{(Object.keys(sneakerTypes) as SneakerType[]).map((t) => <span key={t}><i className="vinyl-pin-mini" style={{ background: sneakerTypes[t].bg, borderColor: sneakerTypes[t].bg }} /> {sneakerTypes[t].label}</span>)}<span><i className="vinyl-pin-mini closed" /> Stängt nu</span><span><i className="vinyl-me-mini" /> Du</span></div>
        </div>
      </section>
    </main>
  );
}
