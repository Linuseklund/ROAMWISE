import { tripDb } from '../../../db/trips';
const COOKIE='__Host-roamwise-trip';
const headers={'Cache-Control':'no-store'};
function preview(request:Request) {return process.env.NODE_ENV==='development'&&new URL(request.url).protocol==='http:';}
function token(request:Request) { return request.headers.get('cookie')?.match(preview(request)?/(?:^|;\s*)roamwise-preview=([a-f0-9]{64})(?:;|$)/:/(?:^|;\s*)__Host-roamwise-trip=([a-f0-9]{64})(?:;|$)/)?.[1]; }
async function owner(key:string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function cookie(key:string,request:Request) { return `${preview(request)?'roamwise-preview':COOKIE}=${key}; Path=/; HttpOnly; ${preview(request)?'':'Secure; '}SameSite=Strict; Max-Age=31536000`; }
function unavailable(error:unknown) { console.error('Trip storage failed',error instanceof Error?error.message:'Unknown storage error'); return Response.json({error:'Din tur kunde inte sparas eller läsas. Dina ändringar finns kvar i den öppna sidan. Försök igen.'},{status:503,headers}); }
export async function GET(request:Request) {
  try {
    const key=token(request)||Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const row=await tripDb().prepare('SELECT state, revision FROM trips WHERE owner = ?').bind(await owner(key)).first();
    return Response.json({state:row?JSON.parse(row.state as string):null,revision:row?.revision||0},{headers:{...headers,'Set-Cookie':cookie(key,request)}});
  } catch(e) { return unavailable(e); }
}
export async function PUT(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Ogiltigt ursprung.'},{status:403,headers});
  const key=token(request);if(!key)return Response.json({error:'Tillåt cookies och ladda om sidan för att spara turen.'},{status:401,headers});
  try {
    const raw=await request.text();if(raw.length>500000)return Response.json({error:'Turen är för stor för att sparas.'},{status:413,headers});
    const {state,revision}=JSON.parse(raw);
    if(state?.version!==1||typeof state.city!=='string'||!Array.isArray(state.routeSource)||!Array.isArray(state.chosenPlaces)||!Number.isInteger(revision)||revision<0) return Response.json({error:'Ogiltig tur.'},{status:400,headers});
    const id=await owner(key),payload=JSON.stringify(state);
    const result=revision===0
      ?await tripDb().prepare('INSERT INTO trips (owner,state,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(owner) DO NOTHING').bind(id,payload,Date.now()).run()
      :await tripDb().prepare('UPDATE trips SET state = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ?').bind(payload,Date.now(),id,revision).run();
    if(!result.meta.changes)return Response.json({error:'Turen ändrades i en annan flik. Ladda om för att fortsätta med den sparade versionen.'},{status:409,headers});
    return Response.json({revision:revision+1},{headers:{...headers,'Set-Cookie':cookie(key,request)}});
  }catch(e){return unavailable(e);}
}
