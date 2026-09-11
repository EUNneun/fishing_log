"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { CalendarDays, MapPin, Plus, ShipWheel, WalletCards, Waves } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getGuestLogs } from "@/lib/guest-storage";

type Log = { id:string; tripDate:string; location:string; boatName:string; fee:number; species:string; rig:string; weather:string; catchCount:number; maxSize:number|null; memo:string };

export default function LogsPage() {
  const [user,setUser]=useState<User|null>(null); const [logs,setLogs]=useState<Log[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>onAuthStateChanged(auth, async next=>{ setUser(next); if(!next){setLogs(getGuestLogs<Log>() .sort((a,b)=>b.tripDate.localeCompare(a.tripDate)));setLoading(false);return;} try{const snap=await getDocs(collection(db,"users",next.uid,"logs"));setLogs(snap.docs.map(d=>({id:d.id,...d.data()} as Log)).sort((a,b)=>b.tripDate.localeCompare(a.tripDate)));}finally{setLoading(false);}}),[]);
  const totalCatch=useMemo(()=>logs.reduce((s,l)=>s+(l.catchCount||0),0),[logs]);
  const money=new Intl.NumberFormat("ko-KR");
  return <Shell>
    <header className="flex h-[76px] items-center justify-between px-[22px] pb-2 pt-[18px]"><div><p className="text-xs font-semibold text-[#8a90a0]">MY FISHING LOG</p><h1 className="mt-1 text-[23px] font-extrabold tracking-[-.7px] text-[#2f3142]">출조 기록</h1></div><div className="rounded-full bg-[#eef4fc] px-3 py-2 text-xs font-semibold text-[#607a9e]">{logs.length}회 · {totalCatch}마리</div></header>
    <section className="px-4 pb-28 pt-2">
      {loading?<Empty text="기록을 불러오는 중..."/>:logs.length===0?<Empty text="첫 출조를 기록해보세요."/>:<div className="space-y-3">{logs.map(log=><article key={log.id} onClick={()=>{window.location.href=`/fishing_log/log-detail/?id=${encodeURIComponent(log.id)}`}} role="button" tabIndex={0} className="cursor-pointer rounded-[20px] border border-[#e3e7f0] bg-white p-4 transition active:scale-[.99]">
        <div className="pr-10"><div className="flex items-center gap-1.5 text-xs text-[#8a90a0]"><CalendarDays className="size-3.5"/>{log.tripDate}</div><div className="mt-2 flex items-baseline gap-2"><h2 className="text-lg font-extrabold text-[#2f3142]">{log.species}</h2><strong className="text-lg text-[#3988f2]">{log.catchCount}마리</strong>{log.maxSize?<span className="text-xs text-[#7e8495]">최대 {log.maxSize}cm</span>:null}</div></div>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] text-[#687086]"><span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-[#74a9e8]"/><span className="truncate">{log.location}</span></span><span className="flex min-w-0 items-center gap-1.5"><ShipWheel className="size-3.5 shrink-0 text-[#74a9e8]"/><span className="truncate">{log.boatName}</span></span><span className="flex items-center gap-1.5"><WalletCards className="size-3.5 text-[#74a9e8]"/>{money.format(log.fee||0)}원</span><span className="flex min-w-0 items-center gap-1.5"><Waves className="size-3.5 shrink-0 text-[#74a9e8]"/><span className="truncate">{log.weather}{log.rig?` · ${log.rig}`:""}</span></span></div>
        {log.memo?<p className="mt-3 border-t border-[#eef0f5] pt-3 text-sm leading-6 text-[#7e8495]">{log.memo}</p>:null}<div className="mt-3 border-t border-[#eef0f5] pt-3 text-right text-xs font-bold text-[#3988f2]">상세 · HIT 기록 보기 ›</div>
      </article>)}</div>}
    </section>
    <a href="/fishing_log/record/" aria-label="출조 기록 추가" className="fixed bottom-24 right-[max(22px,calc((100vw-430px)/2+22px))] z-40 grid size-14 place-items-center rounded-full bg-[#3988f2] text-white shadow-lg shadow-[#3988f2]/25"><Plus className="size-6"/></a>
  </Shell>;
}
function Shell({children}:{children:React.ReactNode}){return <main className="min-h-dvh bg-[#eef1f8] text-[#2f3142]"><div className="mx-auto min-h-dvh max-w-[430px] bg-[#f7f8fc]">{children}</div></main>}
function Empty({text}:{text:string}){return <div className="rounded-[20px] border border-dashed border-[#dfe2eb] bg-white px-5 py-10 text-center text-sm text-[#8a90a0]">{text}</div>}
