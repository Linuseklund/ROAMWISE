import { cities } from '../cities';
import type { MapPickTarget } from '../types';
import { Icon } from './icon';

export type JourneyFieldsProps = {
  city: string;
  onCity: (value: string) => void;
  address: string;
  onAddress: (value: string) => void;
  endAddress: string;
  onEndAddress: (value: string) => void;
  startDate: string;
  onStartDate: (value: string) => void;
  startTime: string;
  onStartTime: (value: string) => void;
  endTime: string;
  onEndTime: (value: string) => void;
  /** True once the guide has started; date and start time are then fixed. */
  locked: boolean;
  locating: boolean;
  onLocate: () => void;
  onPickOnMap: (target: MapPickTarget) => void;
  onSameAsStart: () => void;
  onSubmit: () => void;
};

/** City, addresses, date and times for the day. */
export function JourneyFields(p: JourneyFieldsProps) {
  return (
    <div className="journey-fields" aria-label="Resans tider och adresser">
      <label>
        <span>VILKEN STAD?</span>
        <div>
          <Icon name="search" />
          <input
            autoComplete="off"
            enterKeyHint="done"
            list="cities"
            value={p.city}
            onChange={(e) => p.onCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && p.onSubmit()}
            placeholder="Sök stad i hela världen"
          />
          <datalist id="cities">
            {cities.map((c) => (
              <option key={c.key} value={c.label} />
            ))}
          </datalist>
          <button
            type="button"
            className="locate-button"
            aria-label="Använd min position"
            onClick={(event) => {
              event.preventDefault();
              p.onLocate();
            }}
            disabled={p.locating}
          >
            <Icon name="pin" />
            <span>{p.locating ? 'SÖKER' : 'MIN POSITION'}</span>
          </button>
        </div>
      </label>
      <label className="address-field">
        <span>STARTADRESS</span>
        <div>
          <Icon name="pin" />
          <input
            autoComplete="off"
            enterKeyHint="done"
            value={p.address}
            onChange={(e) => p.onAddress(e.target.value)}
            placeholder="Hotell, station eller adress"
          />
          <button
            type="button"
            className="map-pick-button"
            onClick={(event) => {
              event.preventDefault();
              p.onPickOnMap('start');
            }}
          >
            KARTA
          </button>
        </div>
      </label>
      <label>
        <span>DATUM</span>
        <div>
          <Icon name="calendar" />
          <input
            type="date"
            disabled={p.locked}
            value={p.startDate}
            onInput={(e) => p.onStartDate(e.currentTarget.value)}
          />
        </div>
      </label>
      <label>
        <span>STARTTID</span>
        <div>
          <Icon name="clock" />
          <input
            type="time"
            disabled={p.locked}
            value={p.startTime}
            onInput={(e) => p.onStartTime(e.currentTarget.value)}
          />
        </div>
      </label>
      <label className="address-field">
        <span>
          SLUTADRESS{' '}
          <button type="button" className="same-address" onClick={p.onSameAsStart}>
            SAMMA SOM START
          </button>
        </span>
        <div>
          <Icon name="pin" />
          <input
            autoComplete="off"
            enterKeyHint="done"
            value={p.endAddress}
            onChange={(e) => p.onEndAddress(e.target.value)}
            placeholder="Där rutten ska avslutas"
          />
          <button
            type="button"
            className="map-pick-button"
            onClick={(event) => {
              event.preventDefault();
              p.onPickOnMap('end');
            }}
          >
            KARTA
          </button>
        </div>
      </label>
      <label>
        <span>SLUTTID</span>
        <div>
          <Icon name="clock" />
          <input
            type="time"
            value={p.endTime}
            onInput={(e) => p.onEndTime(e.currentTarget.value)}
          />
        </div>
      </label>
    </div>
  );
}
