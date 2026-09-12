import { reservePlaces } from '../../midtown-backup';
export async function GET(request:Request) {
  const p=new URL(request.url).searchParams;
  const q=(p.get('q')||'').trim().slice(0,240);
  const lat=Number(p.get('lat')),lon=Number(p.get('lon'));
  const reverse=p.has('lat')&&p.has('lon')&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
  if(!q&&!reverse)return Response.json({error:'Ange en adress.'},{status:400});
  const normalized=q.toLowerCase().replace(/[,]+/g,',').replace(/(?:,\s*(?:new york(?: city)?|brooklyn|manhattan|harlem|usa))+$/,'').trim();
  const nyc=/new york|brooklyn|manhattan|harlem/i.test(q);
  const known=nyc?reservePlaces.find(p=>[p.name.toLowerCase(),p.name.split(' · ')[0].toLowerCase(),p.address.toLowerCase(),p.id==='reserve-red-rooster'?'red rooster':''].filter(Boolean).includes(normalized)):undefined;
  if(!reverse&&known)return Response.json([{lat:String(known.lat),lon:String(known.lon),display_name:known.name+', '+known.address,place:known,warning:'Sparad plats: '+known.name+'. Kartpositionen är ungefärlig; kontrollera entrén.'}],{headers:{'Cache-Control':'public, max-age=600'}});
  if(!reverse&&nyc&&normalized==='williamsburg')return Response.json([{lat:'40.7178',lon:'-73.958',display_name:'Williamsburg · Bedford Avenue',warning:'Williamsburg är ett område. Startpunkten är ungefärlig vid Bedford Avenue; välj din adress för en exakt start.'}]);
  const params=reverse?new URLSearchParams({format:'jsonv2',lat:String(lat),lon:String(lon)}):new URLSearchParams({format:'json',limit:'1',q});
  try {
    const r=await fetch('https://nominatim.openstreetmap.org/'+(reverse?'reverse':'search')+'?'+params,{headers:{'User-Agent':'Roamwise/1.0 (https://roamwise-guide.eklund-linus.chatgpt.site)','Accept-Language':'sv'},signal:AbortSignal.timeout(7000)});
    if(!r.ok)throw new Error('Unavailable');
    const result=await r.json();if(!reverse&&(!Array.isArray(result)||!result.length))throw new Error('No match');
    return Response.json(result,{headers:{'Cache-Control':'public, max-age=600'}});
  }catch{
    if(!reverse)try{
      const r=await fetch('https://photon.komoot.io/api/?'+new URLSearchParams({q,limit:'1'}),{signal:AbortSignal.timeout(5000)});
      if(!r.ok)throw new Error('Unavailable');
      const data=await r.json();
      const items=(data.features||[]).filter((f:any)=>f.geometry?.type==='Point'&&Number.isFinite(f.geometry.coordinates[0])&&Number.isFinite(f.geometry.coordinates[1])).map((f:any)=>({lat:String(f.geometry.coordinates[1]),lon:String(f.geometry.coordinates[0]),display_name:[f.properties.name,f.properties.street,f.properties.city,f.properties.country].filter(Boolean).join(', ')}));
      if(items.length)return Response.json(items,{headers:{'Cache-Control':'public, max-age=600'}});
    }catch{}
    // Exact landmark/neighborhood names only; never guess a street address.
    const name=q.toLowerCase().replace(/(?:,\s*new york(?: city)?)+$/,'').trim();
    const landmarks:Record<string,{lat:number;lon:number;label:string}>={
      'times square':{lat:40.758,lon:-73.9855,label:'Times Square · ungefärlig punkt på torget'},
      'lower east side':{lat:40.7186,lon:-73.988,label:'Lower East Side · ungefärlig områdespunkt vid Delancey/Essex'}
    };
    if(!reverse&&/new york/i.test(q)&&landmarks[name]){
      const point=landmarks[name];return Response.json([{lat:String(point.lat),lon:String(point.lon),display_name:point.label,warning:'Adressökningen svarar inte. '+point.label+'. Välj en exakt entré på kartan om det behövs.'}],{headers:{'Cache-Control':'no-store'}});
    }
    return Response.json({error:'Adressökningen är tillfälligt otillgänglig. Behåll adressen och försök igen, eller välj platsen på kartan.'},{status:502});
  }
}
