import type {Rect} from '../types';
export const area=(r:Rect)=>round(r.width*r.height);
export const round=(n:number,d=2)=>Number(n.toFixed(d));
export const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export const inside=(r:Rect,w:number,d:number)=>r.x>=0&&r.y>=0&&r.x+r.width<=w+1e-6&&r.y+r.height<=d+1e-6;
export const adjacent=(a:Rect,b:Rect,gap=.15)=>Math.abs(a.x+a.width-b.x)<=gap||Math.abs(b.x+b.width-a.x)<=gap||Math.abs(a.y+a.height-b.y)<=gap||Math.abs(b.y+b.height-a.y)<=gap;
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export const uid=(p='id')=>`${p}-${Math.random().toString(36).slice(2,9)}`;
