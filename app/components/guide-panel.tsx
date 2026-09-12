import { categoryLabel } from '../labels';
import { timeLabel } from '../planner';
import type { Arrival, ScheduledPlace } from '../types';
import { Icon } from './icon';

export type GuidePanelProps = {
  currentStop: ScheduledPlace | undefined;
  /** The stop we are travelling towards: the next one while a visit is in progress. */
  transportStop: ScheduledPlace | undefined;
  arrived: Arrival | null;
  completedCount: number;
  remainingCount: number;
  omittedCount: number;
  endAddress: string;
  guideNow: number;
  scheduleArrival: number;
  legMinutes: number;
  legMode: string;
  navigationUrl: string;
  transitUrl: string;
  locating: boolean;
  hungryLoading: boolean;
  notice: string;
  onComplete: () => void;
  onArrive: () => void;
  onTaxi: () => void;
  onUpdateLocation: () => void;
  onStayLonger: () => void;
  onSkip: () => void;
  onHungry: () => void;
  onAdjust: () => void;
  onBackToPlanning: () => void;
};

/** The live view while walking the day: next stop, timing and quick actions. */
export function GuidePanel(p: GuidePanelProps) {
  const { currentStop, arrived } = p;
  return (
    <section className={currentStop ? 'quick-guide' : 'quick-guide finished'}>
      <div className="guide-label">
        <span>{arrived ? 'DU ÄR HÄR' : currentStop ? 'NÄSTA STOPP' : 'TILL SLUTADRESSEN'}</span>
        <b>
          {p.completedCount} KLARA · {p.remainingCount} KVAR
        </b>
      </div>
      <h3>{currentStop?.title || p.endAddress || 'Slutpunkt'}</h3>
      <p>
        {currentStop
          ? `${categoryLabel(currentStop.category)} · ${currentStop.area}`
          : p.omittedCount
            ? 'Inga fler valfria stopp ryms. Fortsätt till slutadressen.'
            : 'Dagens stopp är klara. Sista sträckan återstår.'}
      </p>
      <div className="guide-leg">
        <span>
          <b>{p.legMinutes} min</b>
          <small>
            {p.legMode === 'transit' ? 'LOKALTRAFIK · UPPSKATTAT' : 'UPPSKATTAD PROMENAD'}
          </small>
        </span>
        <span>
          <b>
            {arrived
              ? timeLabel(currentStop?.departure ?? p.guideNow)
              : currentStop
                ? timeLabel(currentStop.arrival)
                : timeLabel(p.scheduleArrival)}
          </b>
          <small>{arrived ? 'PLANERAD AVGÅNG' : 'BERÄKNAD ANKOMST'}</small>
        </span>
      </div>
      <div className="guide-actions">
        <a href={p.navigationUrl} target="_blank" rel="noreferrer">
          {p.transportStop ? `TILL ${p.transportStop.title.toUpperCase()}` : 'TILL SLUTADRESSEN'}{' '}
          <Icon name="arrow" />
        </a>
        {currentStop && (
          <button onClick={p.onComplete}>
            KLAR — NÄSTA STOPP <Icon name="check" />
          </button>
        )}
      </div>
      <div className="guide-tools">
        {currentStop && !arrived && <button onClick={p.onArrive}>JAG ÄR FRAMME</button>}
        {arrived && (
          <span className="visit-countdown">
            {Math.max(0, arrived.until - p.guideNow)} min kvar av besöket
          </span>
        )}
        <a href={p.transitUrl} target="_blank" rel="noreferrer">
          LOKALTRAFIK
        </a>
        <button onClick={p.onTaxi}>TAXI</button>
        <button onClick={p.onUpdateLocation} disabled={p.locating || !!arrived}>
          {p.locating ? 'HÄMTAR POSITION…' : 'FRÅN MIN POSITION'}
        </button>
        {currentStop && (
          <>
            <button onClick={p.onStayLonger}>+20 MIN HÄR</button>
            <button onClick={p.onSkip}>HOPPA ÖVER</button>
            <button onClick={p.onHungry} disabled={p.hungryLoading}>
              {p.hungryLoading ? 'SÖKER MAT…' : 'JAG ÄR HUNGRIG'}
            </button>
          </>
        )}
        <button onClick={p.onAdjust}>JUSTERA PLANEN</button>
        <button onClick={p.onBackToPlanning}>TILL PLANERING</button>
      </div>
      {p.notice && (
        <p className="guide-notice" role="status">
          {p.notice}
        </p>
      )}
    </section>
  );
}
