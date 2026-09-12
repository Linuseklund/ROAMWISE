import { categoryDefinitions, type CatalogPlace, type CategoryDefinition } from '../catalog';
import DayControls, { type DayControlsProps } from '../day-controls';
import { categoryGlyphs } from '../labels';
import { Icon } from './icon';
import { JourneyFields, type JourneyFieldsProps } from './journey-fields';

export const TEMPOS = ['Lugnt', 'Normalt', 'Högt'];

export type PlannerFormProps = {
  disabled: boolean;
  journey: JourneyFieldsProps;
  locationError: string;
  timeZone: string;
  onTimeZone: (zone: string) => void;
  locked: boolean;
  hours: number;
  onTripLength: (minutes: number) => void;
  selected: string[];
  categoryPreferences: Record<string, string[]>;
  onOpenCategory: (category: CategoryDefinition) => void;
  day: DayControlsProps;
  chosenPlaces: CatalogPlace[];
  onRemovePlace: (place: CatalogPlace) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  tempo: string;
  onTempo: (tempo: string) => void;
  price: string;
  onPrice: (price: string) => void;
  totalPreferences: number;
  planned: boolean;
  canBuild: boolean;
  onBuild: () => void;
};

/** Step 1 and 2 of the planner: where, when and what. */
export function PlannerForm(p: PlannerFormProps) {
  const timeZones = Array.from(new Set([p.timeZone, ...Intl.supportedValuesOf('timeZone')]));
  return (
    <fieldset className="setup-panel" disabled={p.disabled}>
      <div className="planner-steps" aria-label="Tre steg till färdig rutt">
        <span className="active">
          <b>1</b> Plats & tid
        </span>
        <span>
          <b>2</b> Intressen
        </span>
        <span>
          <b>3</b> Färdig rutt
        </span>
      </div>
      <JourneyFields {...p.journey} />
      {p.locationError && (
        <div className="location-message" role="status">
          {p.locationError}
        </div>
      )}
      <label className="trip-timezone">
        TIDER I STADENS TIDSZON
        <select
          value={p.timeZone}
          onChange={(e) => p.onTimeZone(e.target.value)}
          disabled={p.locked}
        >
          {timeZones.map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </label>
      <div className="trip-shortcuts">
        <span>SNABBVAL</span>
        <div>
          <button onClick={() => p.onTripLength(180)}>3 TIM</button>
          <button onClick={() => p.onTripLength(360)}>6 TIM</button>
          <button onClick={() => p.onTripLength(600)}>HELDAG</button>
        </div>
        <b>
          {Math.floor(p.hours)} tim
          {p.hours % 1 ? ` ${Math.round((p.hours % 1) * 60)} min` : ''}
        </b>
      </div>
      <div className="category-block">
        <div className="field-title">
          <span>2 · VAD VILL DU GÖRA?</span>
          <small>{p.selected.length} valda</small>
        </div>
        <div className="category-grid">
          {categoryDefinitions.map((category) => {
            const preferences = p.categoryPreferences[category.key] || [];
            const chosen = p.selected.includes(category.key);
            const summary = !chosen
              ? 'Välj'
              : preferences.includes('Alla')
                ? 'Alla'
                : preferences.length
                  ? `${preferences.length} val`
                  : 'Välj';
            return (
              <button
                key={category.key}
                onClick={() => p.onOpenCategory(category)}
                className={chosen ? 'chosen' : ''}
                aria-haspopup="dialog"
                aria-label={`${category.label}: ${summary}`}
              >
                <span className="category-glyph">{categoryGlyphs[category.key]}</span>
                <em>{category.label}</em>
                <b>+</b>
              </button>
            );
          })}
        </div>
      </div>
      <DayControls {...p.day} />

      <div className="chosen-summary">
        <b>{p.chosenPlaces.length} platser valda</b>
        <p>
          Öppna en kategori för att välja namngivna platser. Välj Prioriterad för stopp som ska
          behållas, eller Om tiden räcker för flexibla besök. Utan egna val föreslår appen
          närliggande platser.
        </p>
        {p.chosenPlaces.length > 0 && (
          <div>
            {p.chosenPlaces.map((place) => (
              <button
                key={place.id}
                onClick={() => p.onRemovePlace(place)}
                aria-label={`Ta bort ${place.name}`}
              >
                {place.name} ×
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="advanced-toggle"
        onClick={p.onToggleAdvanced}
        aria-expanded={p.advancedOpen}
      >
        <span>
          <Icon name="sliders" /> FLER VAL
        </span>
        <b>{p.advancedOpen ? '−' : '+'}</b>
      </button>
      {p.advancedOpen && (
        <div className="advanced-settings">
          <div className="tempo-control">
            <span>TEMPO</span>
            <div>
              {TEMPOS.map((item) => (
                <button
                  key={item}
                  className={p.tempo === item ? 'active' : ''}
                  onClick={() => p.onTempo(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span>PRISNIVÅ (NÄR UPPGIFT FINNS)</span>
            <select value={p.price} onChange={(e) => p.onPrice(e.target.value)}>
              <option>Alla priser</option>
              <option value="€">Låg</option>
              <option value="€€">Mellan</option>
              <option value="€€€">Hög</option>
            </select>
          </label>
          <p>
            {p.totalPreferences
              ? `${p.totalPreferences} underkategorier valda`
              : 'Alla underkategorier visas'}
          </p>
        </div>
      )}
      <button className="primary simple-primary" onClick={p.onBuild} disabled={!p.canBuild}>
        {p.planned ? (
          <>
            SKAPA MIN RUTT{' '}
            <span>
              {p.chosenPlaces.length
                ? `${p.chosenPlaces.length} valda platser`
                : `${p.selected.length} intressen`}{' '}
              · {Math.round(p.hours)} tim
            </span>
          </>
        ) : (
          'SKAPAR DIN RUTT…'
        )}
        <Icon name="arrow" />
      </button>
    </fieldset>
  );
}
