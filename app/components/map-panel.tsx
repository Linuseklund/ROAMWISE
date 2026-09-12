import { Icon } from './icon';

export type MapPanelProps = {
  city: string;
  address: string;
  endAddress: string;
  mapDocument: string;
  hasRoute: boolean;
  walking: { loading: boolean; complete: boolean; retry: () => void };
  transportTitle: string;
  canNavigate: boolean;
  transitUrl: string;
  navigationUrl: string;
  onTaxi: () => void;
  onOpenLarge: () => void;
};

/** Sticky map beside the itinerary with walking-path status and transport shortcuts. */
export function MapPanel(p: MapPanelProps) {
  return (
    <aside className="map-panel">
      <div className="map-label-top">
        <span>
          <b>{p.city || 'Din stad'}</b>
          <small>
            {p.address || 'Start'} → {p.endAddress || 'Slut'}
          </small>
        </span>
        <button onClick={p.onOpenLarge}>
          <Icon name="sliders" /> STOR KARTA
        </button>
      </div>
      <div className="walking-status" role="status">
        {!p.hasRoute
          ? 'Ingen aktiv rutt att visa.'
          : p.walking.loading
            ? 'Hämtar gångvägar…'
            : p.walking.complete
              ? 'Gångvägar hämtade · beräknad tid för ditt tempo'
              : 'En eller flera sträckor är uppskattade.'}
        {p.hasRoute && !p.walking.complete && !p.walking.loading && (
          <button onClick={p.walking.retry}>FÖRSÖK HÄMTA GÅNGVÄGAR</button>
        )}
        <a href="https://valhalla.openstreetmap.de" target="_blank" rel="noreferrer">
          Valhalla · © OpenStreetMap
        </a>
      </div>
      <div className="real-map-wrap">
        <iframe
          srcDoc={p.mapDocument}
          className="route-map"
          title={`Interaktiv karta för rutten i ${p.city}`}
        />
        <button className="map-expand" onClick={p.onOpenLarge}>
          ÖPPNA STOR KARTA ↗
        </button>
      </div>
      <div className="map-bottom">
        <span>
          <b>TRANSPORT TILL NÄSTA STOPP</b>
          <small>{p.transportTitle}</small>
        </span>
        {p.canNavigate ? (
          <div className="map-actions">
            <button className="taxi-button" onClick={p.onTaxi}>
              BOKA TAXI
            </button>
            <a className="transit-button" href={p.transitUrl} target="_blank" rel="noreferrer">
              LOKALTRAFIK <Icon name="arrow" />
            </a>
            <a href={p.navigationUrl} target="_blank" rel="noreferrer">
              NAVIGERA NÄSTA <Icon name="arrow" />
            </a>
          </div>
        ) : (
          <p>Navigation blir tillgänglig när det finns en sträcka att följa.</p>
        )}
      </div>
    </aside>
  );
}
