"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";

export type ResponseItem = {
  id:string;
  building:string; company?:string; inspector?:string; groupId?:string;
  dateISO?:string; sheet?:string; // YYYYMMDD
  values?: Record<string,string>;
  createdAt:number;
};

type State = {
  list: ResponseItem[];
  hydrated: boolean;
  initOnce: ()=>void;
  save: ()=>void;
  create: (p: Omit<ResponseItem, 'id'|'createdAt'>)=>ResponseItem;
  update: (id:string, p: Partial<ResponseItem>)=>void;
  getById: (id:string)=>ResponseItem|undefined;
  latestBefore: (building:string, yyyymmdd:string)=>ResponseItem|undefined;
  byBuildingAndInspector: (building:string, inspector?:string)=>ResponseItem[];
};

export const useResponsesStore = create<State>((set,get)=>({
  list:[], hydrated:false,
  initOnce: ()=>{ try{ if(typeof window==="undefined") return; const raw=localStorage.getItem("cv_responses_v049"); if(raw){ set({list:JSON.parse(raw),hydrated:true}); return; } }catch{} set({list:[],hydrated:true}); },
  save: ()=>{ if(typeof window==="undefined") return; localStorage.setItem("cv_responses_v049", JSON.stringify(get().list)); },
  create: (p)=>{ const item = { id:nanoid(), createdAt:Date.now(), ...p }; set(s=>({list:[...s.list, item]})); get().save(); return item; },
  update: (id, p)=>{ set(s=>({list:s.list.map(x=> x.id===id? {...x, ...p} : x)})); get().save(); },
  getById: (id)=> get().list.find(x=>x.id===id),
  latestBefore: (building, ymd)=>{
    const list = get().list
      .filter(x=>x.building===building && x.sheet && x.sheet < ymd)
      .sort((a,b)=> (b.sheet||"").localeCompare(a.sheet||""));
    return list[0];
  },
  byBuildingAndInspector: (building, inspector)=>{
    return get().list
      .filter(x=> x.building===building && (!inspector || (x.inspector||'').includes(inspector)))
      .sort((a,b)=> (b.sheet||'').localeCompare(a.sheet||''));
  }
}));
