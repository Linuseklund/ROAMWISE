export type TripSaveBarProps = {
  status: string;
  error: boolean;
  ready: boolean;
  reloadRequired: boolean;
  restored: boolean;
  hasRoute: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onNewTrip: () => void;
};

/** Status line for the privately saved trip, with recovery actions. */
export function TripSaveBar(p: TripSaveBarProps) {
  return (
    <div className="trip-save" role="status">
      <span>{p.status}</span>
      {p.error && (
        <button onClick={() => (p.reloadRequired ? window.location.reload() : p.onRetry())}>
          {p.reloadRequired ? 'LADDA OM SPARAD TUR' : 'FÖRSÖK SPARA IGEN'}
        </button>
      )}
      {p.restored && p.hasRoute && <button onClick={p.onContinue}>FORTSÄTT MIN TUR →</button>}
      <button disabled={!p.ready && !p.error} onClick={p.onNewTrip}>
        NY TUR MED SAMMA PLATSER
      </button>
      <small>Turen sparas privat och återfinns med en cookie i den här webbläsaren.</small>
    </div>
  );
}
