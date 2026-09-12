import type { Point } from './planner';
export type WalkingLeg = { km:number;minutes:number;shape:[number,number][] };
export type WalkingLegs = Record<string,WalkingLeg>;
export const legKey=(a:Point,b:Point,tempo:string)=>`${a.lat.toFixed(5)},${a.lon.toFixed(5)}>${b.lat.toFixed(5)},${b.lon.toFixed(5)}:${tempo}`;
export function decodeShape(value:string):[number,number][] {
  let index=0,lat=0,lon=0;const points:[number,number][]=[];
  const read=()=>{let result=0,shift=0,byte;do{if(index>=value.length||shift>30)throw new Error('Invalid route shape');byte=value.charCodeAt(index++)-63;if(byte<0||byte>63)throw new Error('Invalid route shape');result|=(byte&31)<<shift;shift+=5;}while(byte>=32);return result&1?~(result>>1):result>>1;};
  while(index<value.length){lat+=read();lon+=read();points.push([lat/1e6,lon/1e6]);}
  return points;
}
