import { categoryImages, categoryLabel } from '../labels';
import { timeLabel } from '../planner';
import type { Place, PlaceId, ScheduledPlace } from '../types';
import { Icon } from './icon';

export type LegInfo = { km: number; minutes: number; mode: string };

export type RouteListProps = {
  route: ScheduledPlace[];
  active: PlaceId;
  onActivate: (id: PlaceId) => void;
  completedIds: PlaceId[];
  pinnedIds: PlaceId[];
  arrivedId?: PlaceId;
  adjusting: boolean;
  routeTime: (index: number) => string;
  legInfo: (index: number) => LegInfo;
  onVisitMinutes: (place: Place, minutes: number) => void;
  onTogglePin: (place: Place) => void;
  onRemove: (place: Place) => void;
  onSwap: (place: Place) => void;
  onOpenAction: (place: Place) => void;
  /** Shown when there is nothing to list. */
  selectedCount: number;
  omittedCount: number;
};

/** The numbered stops of the day, with editing controls when adjusting. */
export function RouteList(p: RouteListProps) {
  if (!p.route.length)
    return (
      <div className="empty">
        <h3>{p.selectedCount ? 'Inga stopp att visa' : 'Välj minst en kategori'}</h3>
        <p>
          {p.omittedCount
            ? 'Prova mer tid, ett snabbare tempo eller välj ett prioriterat stopp under alternativ.'
            : 'Välj stad, adresser och intressen och tryck Skapa min rutt.'}
        </p>
      </div>
    );
  return (
    <>
      {p.route.map((place, index) => {
        const completed = p.completedIds.includes(place.id);
        const leg = p.legInfo(index);
        return (
          <article
            key={place.id}
            className={`place${p.active === place.id ? ' active' : ''}${completed ? ' completed' : ''}`}
            onClick={() => p.onActivate(place.id)}
          >
            <div className="number">{String(index + 1)}</div>
            {/* Third-party decorative thumbnails; no image optimiser binding is guaranteed here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="place-thumb" src={categoryImages[place.category]} alt="" />
            <div className="place-time">
              <b>{p.routeTime(index)}</b>
              <span>{place.minutes} MIN</span>
            </div>
            <div className="place-copy">
              <div className="place-top">
                <span>
                  {categoryLabel(place.category)} · {place.area}
                </span>
                {place.price && (
                  <em>
                    {place.price} · {place.cuisine}
                  </em>
                )}
              </div>
              <h3>
                {place.meal ? place.meal + ' · ' : ''}
                {place.title}
              </h3>
              {place.openingStatus && <p>{place.openingStatus}</p>}
              {!!place.waitMinutes && <p>{place.waitMinutes} min fri tid före besöket</p>}
              <small className="place-window">
                {p.routeTime(index)} – {timeLabel(place.departure)}
              </small>
              <p>{place.description}</p>
              <small>{place.meta}</small>
              {place.openingHours && (
                <p className="opening-hours">
                  Registrerade öppettider: {place.openingHours} · kontrollera avvikelser för valt
                  datum.
                </p>
              )}
              <div className="leg-summary">
                <span>
                  {leg.minutes} {leg.mode}
                </span>
                <span>{place.minutes} min här</span>
              </div>
              {p.adjusting && !completed ? (
                <div className="adjust-controls">
                  <label className="visit-duration">
                    BESÖK (MIN)
                    <input
                      type="number"
                      min="5"
                      max="360"
                      step="5"
                      disabled={p.arrivedId === place.id}
                      value={place.minutes}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const minutes = Number(e.target.value);
                        if (minutes >= 5 && minutes <= 360) p.onVisitMinutes(place, minutes);
                      }}
                    />
                  </label>
                  <button
                    aria-pressed={p.pinnedIds.includes(place.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onTogglePin(place);
                    }}
                  >
                    {p.pinnedIds.includes(place.id) ? '✓ PRIORITERAD' : 'PRIORITERAD'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onRemove(place);
                    }}
                  >
                    TA BORT
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onSwap(place);
                    }}
                  >
                    BYT STOPP
                  </button>
                </div>
              ) : (
                place.action && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onOpenAction(place);
                    }}
                  >
                    {place.action}
                    <Icon name="arrow" />
                  </button>
                )
              )}
            </div>
          </article>
        );
      })}
    </>
  );
}
