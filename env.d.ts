// Bindings and variables available on `env` from `cloudflare:workers`.
// D1 and R2 bindings are declared in .openai/hosting.json; variables come from
// `.dev.vars` locally or the hosting platform in production (see .env.example).
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ASSETS: Fetcher;
    APP_URL?: string;
    GEOCODER_LANGUAGE?: string;
    NOMINATIM_URL?: string;
    PHOTON_URL?: string;
    OVERPASS_URLS?: string;
    VALHALLA_URL?: string;
    NYC_OPEN_DATA_URL?: string;
  }
}
