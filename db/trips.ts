import { env } from 'cloudflare:workers';
export function tripDb() {
  if (!env.DB) throw new Error('Trip database unavailable');
  return env.DB;
}
