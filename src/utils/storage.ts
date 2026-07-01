import type {Layout} from '../types';
const KEY='viet-floor-layouts-v1';
export const saveLayout=(l:Layout)=>{const all=getSaved().filter(x=>x.id!==l.id);localStorage.setItem(KEY,JSON.stringify([l,...all].slice(0,20)))};
export const getSaved=():Layout[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
export const exportJson=(l:Layout)=>new Blob([JSON.stringify(l,null,2)],{type:'application/json'});
export const download=(blob:Blob,name:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)};
