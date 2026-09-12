'use client';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { distance, type Point } from './planner';
import { legKey, type WalkingLegs } from './walking';
export function useWalkingPaths(points:Point[],tempo:string,legs:WalkingLegs,setLegs:Dispatch<SetStateAction<WalkingLegs>>) {
  const failed=useRef(new Set<string>());
  const [loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
  const signature=JSON.stringify([points,tempo,Object.keys(legs),retry]);
  useEffect(()=>{
    const zero:WalkingLegs={};points.slice(1).forEach((b,i)=>{const a=points[i],key=legKey(a,b,tempo);if(!legs[key]&&distance(a,b)<.002)zero[key]={minutes:0,km:0,shape:[[a.lat,a.lon],[b.lat,b.lon]]};});
    if(Object.keys(zero).length){setLegs(old=>({...old,...zero}));return;}
    const first=points.slice(1).findIndex((b,i)=>!legs[legKey(points[i],b,tempo)]&&!failed.current.has(legKey(points[i],b,tempo)));
    if(first<0){setLoading(false);return;}
    const batch=points.slice(first,first+12);const duplicate=batch.slice(1).findIndex((b,i)=>distance(batch[i],b)<.002);if(duplicate>=0)batch.splice(duplicate+1);const keys=batch.slice(1).map((b,i)=>legKey(batch[i],b,tempo));
    const controller=new AbortController();setLoading(true);
    const timer=setTimeout(async()=>{
      try{
        const q=new URLSearchParams({points:JSON.stringify(batch),tempo});
        const r=await fetch(`/api/walking?${q}`,{signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error);
        if(!controller.signal.aborted)setLegs(old=>({...old,...data.legs}));
      }catch{if(!controller.signal.aborted){keys.forEach(k=>failed.current.add(k));setRetry(n=>n+1);}}
      finally{if(!controller.signal.aborted)setLoading(false);}
    },1200);
    return()=>{clearTimeout(timer);controller.abort();};
  },[signature]);
  const complete=points.length>1&&points.slice(1).every((b,i)=>!!legs[legKey(points[i],b,tempo)]);
  return {loading,complete,retry:()=>{failed.current.clear();setRetry(n=>n+1);}};
}
