"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Pencil, Ruler, Trash2, Waves } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { deleteGuestLog, getGuestLog } from "@/lib/guest-storage";
import { deleteTripHits, getFishingSession, getTripHits, stopFishingSession, type HitRecord } from "@/lib/fishing-mode";

type Trip = {
  id: string;
  tripDate: string;
  location: string;
  boatName: string;
  fee: number;
  species: string;
  rig?: string;
  weather?: string;
  catchCount: number;
  maxSize?: number | null;
  memo?: string;
  tideLabel?: string;
};

export default function LogDetailPage() {
  const [user,setUser]=useState<User|null>(null);
  const [trip,setTrip]=useState<Trip|null>(null);
  const [hits,setHits]=useState<HitRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [deleting,setDeleting]=useState(false);

  useEffect(() => onAuthStateChanged(auth, async next => {
    setUser(next);
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setLoading(false); return; }
    try {
      if (next) {
        const snap = await getDoc(doc(db,"users",next.uid,"logs",id));
        if (snap.exists()) setTrip({id:snap.id,...snap.data()} as Trip);
      } else {
        setTrip(getGuestLog<Trip>(id));
      }
      setHits(getTripHits(id).sort((a,b)=>a.caughtAt.localeCompare(b.caughtAt)));
    } finally {
      setLoading(false);
    }
  }), []);


  async function deleteTrip() {
    if (!trip || deleting) return;
    const hitCount = hits.length;
    const message = hitCount > 0
      ? `이 출조기록과 연결된 HIT ${hitCount}건도 함께 삭제됩니다. 삭제할까요?`
      : "이 출조기록을 삭제할까요?";
    if (!confirm(message)) return;
    setDeleting(true);
    try {
      if (user) await deleteDoc(doc(db,"users",user.uid,"logs",trip.id));
      else deleteGuestLog(trip.id);

      deleteTripHits(trip.id);
      const active = getFishingSession();
      if (active?.tripId === trip.id) stopFishingSession();

      window.location.href = "/fishing_log/logs/";
    } catch {
      alert("출조기록을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
    }
  }

  if (loading) return <Shell><p className="pt-24 text-center text-sm text-[#8a90a0]">기록을 불러오는 중...</p></Shell>;
  if (!trip) return <Shell><p className="pt-24 text-center text-sm text-[#8a90a0]">출조기록을 찾지 못했습니다.</p></Shell>;

  return <Shell>
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e5e8ef] bg-[#f7f8fc]/95 px-4 py-4 backdrop-blur">
      <button type="button" onClick={()=>history.back()} className="grid size-10 place-items-center rounded-full bg-white text-[#607a9e] shadow-sm"><ArrowLeft className="size-5"/></button>
      <div><p className="text-xs font-semibold text-[#8a90a0]">TRIP DETAIL</p><h1 className="text-xl font-extrabold text-[#2f3142]">출조 상세</h1></div>
    </header>

    <section className="space-y-4 px-4 pb-28 pt-4">
      <div className="rounded-[22px] border border-[#e3e7f0] bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs text-[#8a90a0]">{trip.tripDate}</p><h2 className="mt-1 text-2xl font-black text-[#2f3142]">{trip.species} <span className="text-[#3988f2]">{trip.catchCount}마리</span></h2></div>
          {trip.tideLabel && <span className="rounded-full bg-[#eef4fc] px-3 py-1.5 text-xs font-bold text-[#607a9e]">{trip.tideLabel}</span>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#687086]">
          <span className="flex items-center gap-2"><MapPin className="size-4 text-[#74a9e8]"/>{trip.location}</span>
          <span className="flex items-center gap-2"><Waves className="size-4 text-[#74a9e8]"/>{trip.weather || "날씨 미기록"}</span>
          <span>{trip.boatName || "선사 미기록"}</span>
          <span>{trip.rig || "채비 미기록"}</span>
        </div>
        {trip.memo && <p className="mt-4 border-t border-[#eef0f5] pt-4 text-sm leading-6 text-[#7e8495]">{trip.memo}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#eef0f5] pt-4">
          <a href={`/fishing_log/record/?id=${encodeURIComponent(trip.id)}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f1] bg-white text-sm font-extrabold text-[#607a9e]">
            <Pencil className="size-4"/>수정
          </a>
          <button type="button" disabled={deleting} onClick={deleteTrip} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#ffd6da] bg-[#fff5f6] text-sm font-extrabold text-[#dc5965] disabled:opacity-50">
            <Trash2 className="size-4"/>{deleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#e3e7f0] bg-white p-5">
        <div className="flex items-end justify-between">
          <div><p className="text-xs font-semibold text-[#8a90a0]">HIT HISTORY</p><h2 className="mt-1 text-lg font-extrabold text-[#2f3142]">히트 기록</h2></div>
          <strong className="text-sm text-[#3988f2]">{hits.length}건</strong>
        </div>
        {hits.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[#dce3ed] bg-[#fafbfd] px-4 py-8 text-center text-sm text-[#8a90a0]">이 출조에는 아직 HIT 기록이 없습니다.</div> :
        <div className="mt-4 space-y-3">{hits.map((hit,index)=><HitCard key={hit.id} hit={hit} index={index+1}/>)}</div>}
      </div>
    </section>
  </Shell>;
}

function HitCard({hit,index}:{hit:HitRecord;index:number}) {
  const time = new Date(hit.caughtAt).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  const tags = hit.baits?.length ? hit.baits : hit.bait ? hit.bait.split(",").map(v=>v.trim()).filter(Boolean) : [];
  return <article className="rounded-2xl bg-[#f7f9fc] p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#3988f2] text-xs font-black text-white">{index}</span><strong className="text-sm text-[#394154]">{time}</strong></div>
      {hit.size ? <span className="flex items-center gap-1 text-xs font-bold text-[#607a9e]"><Ruler className="size-3.5"/>{hit.size}cm</span>:null}
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {hit.rig && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#607a9e]">#{hit.rig}</span>}
      {tags.map(tag=><span key={tag} className="rounded-full bg-[#e8f3ff] px-2.5 py-1 text-xs font-bold text-[#3988f2]">#{tag}</span>)}
      {hit.depth ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#607a9e]">수심 {hit.depth}m</span>:null}
    </div>
    {hit.memo && <p className="mt-3 text-sm leading-5 text-[#7e8495]">{hit.memo}</p>}
  </article>;
}

function Shell({children}:{children:React.ReactNode}) {
  return <main className="min-h-dvh bg-[#eef1f8]"><div className="mx-auto min-h-dvh max-w-[430px] bg-[#f7f8fc] text-[#2f3142]">{children}</div></main>;
}
