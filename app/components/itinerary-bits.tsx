import type { Place, ScheduledPlace, UndoRecord } from '../types';
import { Icon } from './icon';

export function RouteActions({
  continuing,
  onStart,
  onAdjust,
}: {
  continuing: boolean;
  onStart: () => void;
  onAdjust: () => void;
}) {
  return (
    <div className="route-actions">
      <button className="start-guide" onClick={onStart}>
        {continuing ? 'FORTSÄTT MIN TUR' : 'STARTA NU'} <Icon name="arrow" />
      </button>
      <button className="adjust-route" onClick={onAdjust}>
        <Icon name="sliders" /> JUSTERA
      </button>
    </div>
  );
}

export function UndoBanner({ undo, onUndo }: { undo: UndoRecord; onUndo: () => void }) {
  return (
    <div className="undo-stop" role="status">
      <span>{undo.place.title} togs bort.</span>
      <button onClick={onUndo}>ÅNGRA</button>
    </div>
  );
}

export function RouteNote({ routeLive, startDate }: { routeLive: boolean; startDate: string }) {
  return (
    <div className="route-note">
      <Icon name="walk" />
      <p>
        <b>
          {routeLive
            ? 'Platser från register eller ett tydligt märkt reservutbud.'
            : 'Din personliga rutt.'}
        </b>{' '}
        Kontrollera öppettider för {startDate || 'valt datum'}. Aktuella program och öppettider är
        inte verifierade. Heldragen linje visar hämtad gångväg. Prickad linje visar en uppskattad
        förbindelse, inte en verifierad gångväg eller linjesträckning.
      </p>
    </div>
  );
}

export function OmittedStops({ stops, onPin }: { stops: Place[]; onPin: (place: Place) => void }) {
  return (
    <div className="omitted-stops">
      <b>OM TIDEN RÄCKER</b>
      {stops.map((p) => (
        <div key={p.id}>
          <span>
            {p.title} · {p.minutes} min
          </span>
          <button onClick={() => onPin(p)}>PRIORITERAD</button>
        </div>
      ))}
    </div>
  );
}

export function TimelineEdge({
  edge,
  time,
  address,
}: {
  edge: 'start' | 'end';
  time: string;
  address: string;
}) {
  return (
    <div className={`timeline-edge ${edge}-edge`}>
      <span></span>
      <div>
        <small>{edge === 'start' ? `START · ${time}` : `SLUT · SENAST ${time}`}</small>
        <b>{address || (edge === 'start' ? 'Startadress' : 'Slutadress')}</b>
      </div>
    </div>
  );
}

export type TipsSectionProps = {
  tips: Place[];
  loading: boolean;
  notice: string;
  onFind: () => void;
  onAdd: (place: Place) => void;
};

/** Suggestions that fit into the largest free gap of the day. */
export function TipsSection(p: TipsSectionProps) {
  return (
    <section className="omitted-stops" aria-label="Tips för ledig tid">
      <h3>Tid över längs turen?</h3>
      <button onClick={p.onFind} disabled={p.loading}>
        {p.loading ? 'SÖKER TIPS…' : 'GE MIG TIPS LÄNGS TUREN'}
      </button>
      <p role="status">{p.notice}</p>
      {p.tips.map((tip) => (
        <div key={tip.id}>
          <span>
            {tip.title} · {tip.minutes} min · {tip.openingHours || 'Kontrollera öppettider'}
          </span>
          <button onClick={() => p.onAdd(tip)}>LÄGG TILL</button>
        </div>
      ))}
    </section>
  );
}

export type { ScheduledPlace };
