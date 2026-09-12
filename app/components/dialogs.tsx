import type { ReactNode } from 'react';
import type { CategoryDefinition } from '../catalog';
import type { MapPickTarget, Place } from '../types';
import { Icon } from './icon';

export function MapPickerDialog({
  target,
  document,
  loading,
  onClose,
}: {
  target: MapPickTarget;
  document: string;
  loading: boolean;
  onClose: () => void;
}) {
  const start = target === 'start';
  return (
    <div className="address-picker-backdrop">
      <section
        className="address-picker"
        role="dialog"
        aria-modal="true"
        aria-label={start ? 'Välj startadress på karta' : 'Välj slutadress på karta'}
      >
        <div className="address-picker-head">
          <div>
            <small>{start ? 'STARTADRESS' : 'SLUTADRESS'}</small>
            <b>Tryck på valfri plats i världen</b>
          </div>
          <button onClick={onClose} aria-label="Stäng kartan">
            <Icon name="close" />
          </button>
        </div>
        <div className="address-picker-map-wrap">
          <iframe
            srcDoc={document}
            title="Välj adress på världskartan"
            className="address-picker-map"
          />
          {loading && (
            <div className="address-picker-loading">
              <span></span>
              <b>LÄSER ADRESS…</b>
            </div>
          )}
        </div>
        <div className="address-picker-foot">
          <span>GLOBAL KARTDATA</span>
          <b>© OpenStreetMap contributors</b>
        </div>
      </section>
    </div>
  );
}

export type CategoryPickerDialogProps = {
  category: CategoryDefinition;
  mealTarget: string | null;
  draft: string[];
  onToggleOption: (option: string) => void;
  onApply: () => void;
  canRemove: boolean;
  onRemove: () => void;
  onClose: () => void;
  /** The catalogue browser, rendered by the page so it keeps its own state and callbacks. */
  browser: ReactNode;
};

export function CategoryPickerDialog(p: CategoryPickerDialogProps) {
  return (
    <div className="category-picker-backdrop" onMouseDown={p.onClose}>
      <section
        className="category-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-picker-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="category-picker-handle" aria-hidden="true"></div>
        <button
          className="category-picker-close"
          onClick={p.onClose}
          aria-label="Stäng kategorivalet"
        >
          <Icon name="close" />
        </button>
        <p className="overline">{p.category.label.toUpperCase()} / UNDERKATEGORIER</p>
        <h2 id="category-picker-title">
          {p.mealTarget ? `Välj restaurang för ${p.mealTarget.toLowerCase()}` : p.category.eyebrow}
        </h2>
        <p className="category-picker-lead">
          Välj inriktningar och sök bland platserna nedan. Lägg till de platser du vill besöka.
        </p>
        <div className="category-choice-grid">
          {p.category.options.map((option) => {
            const on = p.draft.includes(option);
            return (
              <button
                key={option}
                className={on ? 'active' : ''}
                aria-pressed={on}
                onClick={() => p.onToggleOption(option)}
              >
                <span>{option}</span>
                <b>{on ? '✓' : '+'}</b>
              </button>
            );
          })}
        </div>

        {p.browser}
        <p className="catalog-coverage">
          Alla betyder alla matchningar i den valda datakällan. Undertyper kräver att informationen
          finns registrerad. Sök på namn under Alla om en plats saknas.
        </p>

        <div className="category-picker-actions">
          <button className="category-picker-apply" onClick={p.onApply}>
            ANVÄND {p.draft.includes('Alla') ? 'ALLA' : p.draft.length || 1} VAL{' '}
            <Icon name="arrow" />
          </button>
          {p.canRemove && (
            <button className="category-picker-remove" onClick={p.onRemove}>
              TA BORT KATEGORIN
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Modal({
  label,
  className = '',
  onClose,
  children,
}: {
  label: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Stäng">
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function PlaceDialog({
  place,
  city,
  startDate,
  plannedTime,
  onClose,
}: {
  place: Place;
  city: string;
  startDate: string;
  plannedTime: string;
  onClose: () => void;
}) {
  return (
    <Modal label="Platsinformation" onClose={onClose}>
      <p className="overline">ÖPPETTIDER & BOKNING</p>
      <h2>{place.title}</h2>
      <p className="modal-lead">
        Planerat besök: {startDate} kl. {plannedTime}. Kontrollera öppettider och eventuell bokning
        hos verksamheten.
      </p>
      <p>
        {place.openingHours
          ? `Registrerade öppettider: ${place.openingHours}`
          : 'Öppettider saknas i kartinformationen.'}
      </p>
      {place.website && (
        <a className="external-action" href={place.website} target="_blank" rel="noreferrer">
          ÖPPNA VERKSAMHETENS WEBBPLATS ↗
        </a>
      )}
      <a
        className="external-action"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.title}, ${city}`)}`}
        target="_blank"
        rel="noreferrer"
      >
        VISA PLATSEN I GOOGLE MAPS ↗
      </a>
      <small className="demo-note">
        Ingen bokning har gjorts. Roamwise kan inte verifiera lediga bord eller biljetter.
      </small>
    </Modal>
  );
}

export function TaxiDialog({
  title,
  from,
  pickup,
  destination,
  onPickup,
  onDestination,
  onClose,
}: {
  title: string;
  from: string;
  pickup: string;
  destination: string;
  onPickup: (value: string) => void;
  onDestination: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal label="Taxi till nästa stopp" className="taxi-modal" onClose={onClose}>
      <p className="overline">TRANSPORT / TAXI</p>
      <h2>Till {title}.</h2>
      <p className="modal-lead">
        Sträckan är förberedd från {from}. Öppna din taxitjänst för aktuellt pris och bokning.
      </p>
      <div className="booking-fields taxi-fields">
        <label>
          <span>HÄMTAS VID</span>
          <input value={pickup} onChange={(e) => onPickup(e.target.value)} />
        </label>
        <label>
          <span>DESTINATION</span>
          <input value={destination} onChange={(e) => onDestination(e.target.value)} />
        </label>
      </div>
      <a
        className="external-action"
        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}&travelmode=driving`}
        target="_blank"
        rel="noreferrer"
      >
        VISA BILRUTT ↗
      </a>
      <p>
        Ingen taxitjänst är ansluten för bokning. Kopiera upphämtning och destination till den
        taxitjänst du använder.
      </p>
      <small className="demo-note">
        Ingen bil är bokad. Planens gångtider ändras inte när du öppnar en extern transporttjänst.
      </small>
    </Modal>
  );
}

export function RouteMapDialog({
  city,
  stops,
  address,
  endAddress,
  document,
  navigationUrl,
  onClose,
}: {
  city: string;
  stops: number;
  address: string;
  endAddress: string;
  document: string;
  navigationUrl: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop map-backdrop" onMouseDown={onClose}>
      <div
        className="route-map-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ruttkarta"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="route-map-modal-head">
          <span>
            <small>PERSONLIG RUTT / {city.toUpperCase()}</small>
            <b>
              {stops} stopp · {address || 'Start'} → {endAddress || 'Slut'}
            </b>
          </span>
          <button onClick={onClose} aria-label="Stäng kartan">
            <Icon name="close" />
          </button>
        </div>
        <iframe
          srcDoc={document}
          className="route-map-large"
          title={`Stor interaktiv karta för rutten i ${city}`}
        />
        <div className="route-map-modal-foot">
          <p>
            <b>Interaktiv karta.</b> Zooma, dra och klicka på stoppen för information.
          </p>
          <a href={navigationUrl} target="_blank" rel="noreferrer">
            NAVIGERA NÄSTA <Icon name="arrow" />
          </a>
        </div>
      </div>
    </div>
  );
}
