"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFishingSession, saveHitRecord } from "@/lib/fishing-mode";

export default function HitPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getFishingSession>>(null);
  const [rig, setRig] = useState("");
  const [bait, setBait] = useState("");
  const [depth, setDepth] = useState("");
  const [size, setSize] = useState("");
  const [memo, setMemo] = useState("");
  const [location, setLocation] = useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
  const [gps, setGps] = useState("GPS 확인 중");

  useEffect(() => {
    const active = getFishingSession();
    setSession(active);
    if (!active) return;
    if (!navigator.geolocation) { setGps("GPS 미지원"); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setLocation({latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy}); setGps(`현재 위치 · 정확도 약 ${Math.round(p.coords.accuracy)}m`); },
      () => setGps("위치 권한을 허용하면 포인트가 저장됩니다."),
      { enableHighAccuracy:true, timeout:10000 }
    );
  }, []);

  if (!session) return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] p-5"><p className="mt-20 text-center text-[#6f89aa]">진행 중인 낚시모드가 없습니다.</p><Button onClick={()=>router.push("/")} className="mt-4 w-full">홈으로</Button></main>;

  const save = () => {
    saveHitRecord({
      id:`hit-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      sessionId:session.id, tripId:session.tripId, species:session.species,
      caughtAt:new Date().toISOString(), rig, bait,
      depth:depth ? Number(depth) : null, size:size ? Number(size) : null, memo,
      ...(location ?? {})
    });
    router.push("/");
  };

  return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] px-4 pb-10">
    <header className="flex items-center gap-3 py-5"><button onClick={()=>router.back()} className="flex size-11 items-center justify-center rounded-full bg-white shadow"><ArrowLeft className="text-[#5279a5]"/></button><div><h1 className="text-2xl font-black text-[#234a78]">히트 기록</h1><p className="text-sm text-[#8ca5c4]">{session.species} · 어종 자동 연결</p></div></header>
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-[#f3f8ff] p-4"><p className="font-black text-[#234a78]">{session.species}</p><p className="mt-1 text-xs text-[#8298b8]">{session.location || "빠른 낚시모드"}</p></div>
      <label className="mt-5 block text-sm font-bold text-[#496789]">채비</label><input value={rig} onChange={e=>setRig(e.target.value)} placeholder="예: 가지채비" className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/>
      <label className="mt-4 block text-sm font-bold text-[#496789]">에기 / 미끼</label><input value={bait} onChange={e=>setBait(e.target.value)} placeholder="예: 2.5호 수박" className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold text-[#496789]">수심 (m)</label><input inputMode="decimal" value={depth} onChange={e=>setDepth(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/></div><div><label className="block text-sm font-bold text-[#496789]">크기 (cm)</label><input inputMode="decimal" value={size} onChange={e=>setSize(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/></div></div>
      <label className="mt-4 block text-sm font-bold text-[#496789]">메모</label><input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="선택 입력" className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/>
      <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#eef7ff] px-3 py-3 text-xs text-[#5f83ad]"><MapPin className="size-4"/>{gps}</div>
      <Button onClick={save} className="mt-5 h-13 w-full rounded-xl bg-[#2f80ed] text-base font-black text-white">히트 저장</Button>
    </section>
  </main>;
}
