export type RouteHeaderProps = {
  city: string;
  address: string;
  endAddress: string;
  startDate: string;
  startTime: string;
  endTime: string;
  routeLive: boolean;
  stops: number;
  km: number;
  travelMinutes: number;
};

export function RouteHeader(p: RouteHeaderProps) {
  const overnight = p.endTime < p.startTime ? ' (+1 dag)' : '';
  return (
    <div className="results-head">
      <div>
        <p className="overline">
          DIN OPTIMERADE RUTT · {p.routeLive ? 'VALDA PLATSER' : 'VÄLJ PLATSER FÖR ATT BÖRJA'}
        </p>
        <h2>{p.city || 'Din stad'}, på ditt sätt.</h2>
        <p>
          {p.address || 'Start'} → {p.endAddress || 'Slut'} · {p.startDate} · {p.startTime}–
          {p.endTime}
          {overnight}
        </p>
      </div>
      <div className="metrics">
        <div>
          <b>{p.stops}</b>
          <span>STOPP</span>
        </div>
        <div>
          <b>{p.stops ? p.km.toFixed(1).replace('.', ',') + ' KM' : '—'}</b>
          <span>TOTALT</span>
        </div>
        <div>
          <b>{p.stops ? p.travelMinutes + ' MIN' : '—'}</b>
          <span>UPPSKATTAD RESTID</span>
        </div>
      </div>
    </div>
  );
}
