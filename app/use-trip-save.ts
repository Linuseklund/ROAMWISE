'use client';
import { useEffect, useRef, useState } from 'react';
export function useTripSave(snapshot:Record<string,unknown>, restore:(state:any)=>void) {
  const [status,setStatus]=useState('Läser sparad tur…');
  const [ready,setReady]=useState(false);
  const [error,setError]=useState(false);
  const [restored,setRestored]=useState(false);
  const [retry,setRetry]=useState(0);
  const revision=useRef(0), saved=useRef(''), current=useRef(''), busy=useRef(false), conflict=useRef(false);
  const restoreRef=useRef(restore);restoreRef.current=restore;
  const json=JSON.stringify(snapshot);current.current=json;
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/trip',{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}).then(data=>{
      if(controller.signal.aborted)return;
      revision.current=data.revision;
      if(data.state?.version===1){restoreRef.current(data.state);saved.current=JSON.stringify(data.state);setRestored(true);}
      setReady(true);setStatus(data.state?'Turen är återställd.':'Sparar automatiskt.');
    }).catch(e=>{if(!controller.signal.aborted){setError(true);setStatus(e.message||'Sparad tur kunde inte läsas. Ladda om och försök igen.');}});
    return()=>controller.abort();
  },[]);
  const flushRef=useRef<()=>Promise<void>>(async()=>{});
  flushRef.current=async()=>{
    if(!ready||busy.current||conflict.current||current.current===saved.current)return;
    busy.current=true;setStatus('Sparar…');setError(false);
    try{
      // Serialize updates and save the newest snapshot if the user edits during a request.
      while(current.current!==saved.current){
        const payload=current.current;
        const r=await fetch('/api/trip',{method:'PUT',keepalive:payload.length<50000,headers:{'Content-Type':'application/json'},body:JSON.stringify({state:JSON.parse(payload),revision:revision.current})});
        const data=await r.json();if(!r.ok){conflict.current=r.status===409;throw new Error(data.error);}
        revision.current=data.revision;saved.current=payload;
      }
      setStatus('Turen är sparad.');
    }catch(e){setError(true);setStatus(e instanceof Error?e.message:'Kunde inte spara. Försök igen.');}
    finally{busy.current=false;}
  };
  useEffect(()=>{if(!ready)return;const timer=setTimeout(()=>void flushRef.current(),400);return()=>clearTimeout(timer);},[json,ready,retry]);
  useEffect(()=>{const flush=()=>{if(document.visibilityState==='hidden')void flushRef.current();};document.addEventListener('visibilitychange',flush);return()=>document.removeEventListener('visibilitychange',flush);},[]);
  return {status,error,restored,ready,retry:()=>setRetry(n=>n+1),reloadRequired:!ready||conflict.current};
}
