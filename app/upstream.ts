// Server-only configuration for the external services Roamwise depends on.
// Every value can be overridden with an environment variable so that the app
// can move off the free community endpoints without code changes. See .env.example.
import { env } from 'cloudflare:workers';

type Bindings = Record<string, unknown>;

function setting(name: string, fallback: string): string {
  const fromBinding = (env as unknown as Bindings)[name];
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const value = typeof fromBinding === 'string' ? fromBinding : fromProcess;
  const trimmed = (value ?? '').trim();
  return trimmed || fallback;
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/** Public URL of this deployment. Used for absolute metadata and the User-Agent header. */
export const appUrl = () =>
  trimSlash(setting('APP_URL', 'https://roamwise-guide.eklund-linus.chatgpt.site'));

/** Community geocoders and routers require an identifying User-Agent. */
export const userAgent = () => `Roamwise/1.0 (${appUrl()})`;

export const geocoderLanguage = () => setting('GEOCODER_LANGUAGE', 'sv');

/** Nominatim-compatible geocoder (search and reverse). */
export const nominatimUrl = () =>
  trimSlash(setting('NOMINATIM_URL', 'https://nominatim.openstreetmap.org'));

/** Photon-compatible fallback geocoder. */
export const photonUrl = () => trimSlash(setting('PHOTON_URL', 'https://photon.komoot.io'));

/** Overpass API interpreters, tried in order. Comma-separated in the environment. */
export const overpassEndpoints = () =>
  setting(
    'OVERPASS_URLS',
    'https://overpass.private.coffee/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  )
    .split(',')
    .map((url) => trimSlash(url.trim()))
    .filter(Boolean);

/** Valhalla-compatible pedestrian router. */
export const valhallaUrl = () =>
  trimSlash(setting('VALHALLA_URL', 'https://valhalla1.openstreetmap.de'));

/** NYC Open Data restaurant inspection dataset (Socrata JSON endpoint). */
export const nycOpenDataUrl = () =>
  setting('NYC_OPEN_DATA_URL', 'https://data.cityofnewyork.us/resource/43nn-pn8j.json');
