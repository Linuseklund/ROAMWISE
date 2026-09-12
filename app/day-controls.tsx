'use client';
import { defaultMeals, type MealTimes } from './meals';
import { type MealPreferences, type ActivityPreferences } from './day-preferences';
import { categoryDefinitions } from './catalog';
import { ROUTE_AREA, cityAreas } from './cities';
import type { TransportMode } from './planner';
export type DayControlsProps = {
  city: string;
  meals: MealTimes;
  onMeals: (v: MealTimes) => void;
  preferences: MealPreferences;
  onPreferences: (v: MealPreferences) => void;
  activities: ActivityPreferences;
  onActivities: (v: ActivityPreferences) => void;
  selected: string[];
  onChoose: (meal: string) => void;
  transport: TransportMode;
  onTransport: (v: TransportMode) => void;
  endAddress: string;
  endTime: string;
};
export default function DayControls({
  city,
  meals,
  onMeals,
  preferences,
  onPreferences,
  activities,
  onActivities,
  selected,
  onChoose,
  transport,
  onTransport,
  endAddress,
  endTime,
}: DayControlsProps) {
  // Neighbourhood choices exist only for cities we have configured; others plan along the route.
  const areas = cityAreas(city);
  const hasAreas = areas.length > 1;
  return (
    <section className="day-controls" aria-label="Önskemål under dagen">
      <h3>Din dag, i rätt ordning</h3>
      <label>
        Färdsätt
        <select value={transport} onChange={(e) => onTransport(e.target.value as TransportMode)}>
          <option value="walking">Promenad</option>
          <option value="mixed">Promenad + lokaltrafik</option>
        </select>
      </label>
      {transport === 'mixed' && (
        <p>
          Vid längre sträckor räknar vi med en uppskattad tid för lokaltrafik, inklusive gång och
          väntan. Kontrollera avgången i kartlänken; tidtabell och störningar är inte hämtade.
        </p>
      )}
      {selected.includes('Restauranger') &&
        Object.entries(defaultMeals).map(([meal, time]) => {
          const pref = preferences[meal] || {};
          const update = (v: Partial<typeof pref>) =>
            onPreferences({ ...preferences, [meal]: { ...pref, ...v } });
          return (
            <div className="day-meal" key={meal}>
              <label className="day-check">
                <input
                  type="checkbox"
                  checked={!!meals[meal]}
                  onChange={(e) => {
                    const next = { ...meals };
                    if (e.target.checked) next[meal] = time;
                    else delete next[meal];
                    onMeals(next);
                  }}
                />
                {meal}
              </label>
              {meals[meal] && (
                <details className="day-meal-options">
                  <summary aria-label={'Anpassa ' + meal.toLowerCase()}>
                    <span>
                      {meals[meal]} ·{' '}
                      {pref.atDestination
                        ? 'På slutadressen'
                        : pref.placeName || pref.area || ROUTE_AREA}
                    </span>
                    <small>Anpassa tid & restaurang</small>
                  </summary>
                  <div className="day-meal-fields">
                    <div className="day-grid">
                      <label>
                        Tid
                        <input
                          aria-label={meal + ' tid'}
                          type="time"
                          value={meals[meal]}
                          onInput={(e) => {
                            const v = e.currentTarget.value;
                            if (v) onMeals({ ...meals, [meal]: v });
                          }}
                        />
                      </label>
                      <label>
                        Tidsmarginal
                        <select
                          aria-label={meal + ' tidsmarginal'}
                          value={pref.strict ? 'fixed' : 'flex'}
                          onChange={(e) => update({ strict: e.target.value === 'fixed' })}
                        >
                          <option value="flex">Upp till 90 min senare</option>
                          <option value="fixed">Låst tid</option>
                        </select>
                      </label>
                    </div>
                    {hasAreas && (
                      <label>
                        Område
                        <select
                          aria-label={meal + ' område'}
                          value={pref.area || ROUTE_AREA}
                          onChange={(e) =>
                            update({
                              area: e.target.value,
                              placeId: undefined,
                              placeName: undefined,
                            })
                          }
                        >
                          {areas.map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Matönskemål
                      <select
                        aria-label={meal + ' matönskemål'}
                        value={pref.food || 'Alla'}
                        onChange={(e) =>
                          update({ food: e.target.value, placeId: undefined, placeName: undefined })
                        }
                      >
                        {['Alla', 'Grönt & lätt', 'Vegetariskt', 'Veganskt', 'Kaffe & bageri'].map(
                          (a) => (
                            <option key={a}>{a}</option>
                          ),
                        )}
                      </select>
                    </label>
                    {pref.food === 'Grönt & lätt' && (
                      <p>
                        Vi söker växtbaserade alternativ. Välj den rätt som passar dig från menyn.
                      </p>
                    )}
                    <button type="button" onClick={() => onChoose(meal)}>
                      {pref.placeName
                        ? 'Byt ' + pref.placeName
                        : 'Välj restaurang för ' + meal.toLowerCase()}
                    </button>
                    {pref.placeId && (
                      <button
                        type="button"
                        onClick={() =>
                          update({ placeId: undefined, placeName: undefined, atDestination: false })
                        }
                      >
                        Låt appen föreslå restaurang
                      </button>
                    )}
                    {meal === 'Middag' && (
                      <label className="day-check">
                        <input
                          type="checkbox"
                          checked={!!pref.atDestination}
                          onChange={(e) => {
                            update({
                              atDestination: e.target.checked,
                              strict: e.target.checked || pref.strict,
                            });
                            if (e.target.checked) onMeals({ ...meals, [meal]: endTime });
                          }}
                        />
                        Avsluta med middag på slutadressen
                      </label>
                    )}
                    {pref.atDestination && (
                      <p>
                        Middag på {endAddress} kl. {meals[meal]}. Vi planerar ankomst 15 minuter
                        före. Middagen får fortsätta efter turens sluttid. Ingen bokning görs.
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      {selected
        .filter((c) => c !== 'Restauranger')
        .map((category) => {
          const pref = activities[category] || {};
          return (
            <div className="day-activity" key={category}>
              <h4>{categoryDefinitions.find((c) => c.key === category)?.label}</h4>
              <div className="day-grid">
                <label>
                  När
                  <select
                    aria-label={category + ' när'}
                    value={pref.period || 'När det passar'}
                    onChange={(e) =>
                      onActivities({
                        ...activities,
                        [category]: { ...pref, period: e.target.value },
                      })
                    }
                  >
                    {['När det passar', 'Före lunch', 'Efter lunch'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {hasAreas && (
                  <label>
                    Område
                    <select
                      aria-label={category + ' område'}
                      value={pref.area || ROUTE_AREA}
                      onChange={(e) =>
                        onActivities({
                          ...activities,
                          [category]: { ...pref, area: e.target.value },
                        })
                      }
                    >
                      {areas.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>
          );
        })}
    </section>
  );
}
