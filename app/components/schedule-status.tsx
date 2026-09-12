import { categoryLabel } from '../labels';
import { timeLabel } from '../planner';
import type { Schedule } from '../types';

export type ScheduleStatusProps = {
  schedule: Schedule;
  missingMeals: string[];
  missingActivities: string[];
  onShowAlternatives: () => void;
};

/** Arrival time, margin and everything the plan could not honour. */
export function ScheduleStatus({
  schedule,
  missingMeals,
  missingActivities,
  onShowAlternatives,
}: ScheduleStatusProps) {
  const ok = schedule.feasible && !missingMeals.length && !missingActivities.length;
  const needsCheck = schedule.route.some(
    (p) => p.openingStatus === 'Öppettider måste kontrolleras',
  );
  return (
    <div className={`schedule-status${ok ? '' : ' time-warning'}`} role="status">
      <div>
        <span>VID SLUTADRESSEN</span>
        <b>{timeLabel(schedule.arrival)}</b>
      </div>
      <div>
        <span>{schedule.margin < 0 ? 'EFTER SLUTTID' : 'MARGINAL'}</span>
        <b>{Math.abs(schedule.margin)} min</b>
      </div>
      <p>
        {schedule.feasible
          ? 'Planen ryms med minst 15 minuters marginal. Restider är uppskattade; kontrollera avgångar när lokaltrafik ingår.'
          : schedule.margin >= 15
            ? 'Ett prioriterat stopp passar inte inom registrerade öppettider eller måltidstider. Byt plats eller ändra besökstiden.'
            : 'Tiden räcker inte med 15 minuters marginal. Korta ett prioriterat stopp, ändra sluttiden eller välj snabbare transport och kontrollera restiden.'}
      </p>
      {missingActivities.length > 0 && (
        <p role="alert">
          Önskemål som saknas i planen: {missingActivities.map(categoryLabel).join(', ')}. Välj en
          plats eller ändra område och tid.
        </p>
      )}
      {missingMeals.length > 0 && (
        <p role="alert">
          Måltider utan ett passande planerat stopp: {missingMeals.join(', ')}. Lägg till
          restauranger, ändra tiderna eller välj bort måltiden.
        </p>
      )}
      {schedule.conflicts.length > 0 && (
        <p role="alert">
          Kan inte läggas in inom registrerade öppettider eller måltidstider:{' '}
          {schedule.conflicts.map((p) => p.title).join(', ')}.
        </p>
      )}
      {needsCheck && (
        <p>
          Öppettider saknas eller kräver manuell kontroll för vissa stopp. Tidsmässigt möjlig
          betyder inte att alla platser är öppna.
        </p>
      )}
      {schedule.omitted.length > 0 && (
        <p>
          {schedule.omitted.length} valfria stopp ryms inte just nu.{' '}
          <button onClick={onShowAlternatives}>VISA ALTERNATIV</button>
        </p>
      )}
    </div>
  );
}
