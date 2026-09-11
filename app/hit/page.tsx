"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFishingSession, getLastSessionHit, getSessionHits, saveHitRecord } from "@/lib/fishing-mode";
import { getFishingOptions } from "@/lib/fishing-data";

export default function HitPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getFishingSession>>(null);
  const [rig, setRig] = useState("");
  const [baits, setBaits] = useState<string[]>([]);
  const [depth, setDepth] = useState("");
  const [size, setSize] = useState("");
  const [memo, setMemo] = useState("");
  const [location, setLocation] = useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
  const [gps, setGps] = useState("GPS 확인 중");
  const [hitCount, setHitCount] = useState(0);

  useEffect(() => {
    const active = getFishingSession();
    setSession(active);
    if (!active) return;
    const previous = getLastSessionHit(active.id);
    setHitCount(getSessionHits(active.id).length);
    if (previous) {
      setRig(previous.rig ?? "");
      setBaits(previous.baits ?? (previous.bait ? [previous.bait] : []));
      setDepth(previous.depth == null ? "" : String(previous.depth));
    }
    if (!navigator.geolocation) { setGps("GPS 미지원"); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setLocation({latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy}); setGps(`현재 위치 · 정확도 약 ${Math.round(p.coords.accuracy)}m`); },
      () => setGps("위치 권한을 허용하면 포인트가 저장됩니다."),
      { enableHighAccuracy:true, timeout:10000 }
    );
  }, []);

  if (!session) return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] p-5"><p className="mt-20 text-center text-[#6f89aa]">진행 중인 낚시모드가 없습니다.</p><Button onClick={()=>router.push("/")} className="mt-4 w-full">홈으로</Button></main>;

  const options = getFishingOptions(session?.species ?? "");
  const rigOptions = Array.from(new Set([...options.rigs, ...(rig && !options.rigs.includes(rig) ? [rig] : []), "기타"]));
  const baitOptions = Array.from(new Set([...options.baits, ...baits]));
  const toggleBait = (value: string) => setBaits(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);

  const save = () => {
    saveHitRecord({
      id:`hit-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      sessionId:session.id, tripId:session.tripId, species:session.species,
      caughtAt:new Date().toISOString(), rig, baits, bait:baits.join(", "),
      depth:depth ? Number(depth) : null, size:size ? Number(size) : null, memo,
      ...(location ?? {})
    });
    router.push("/");
  };

  return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] px-4 pb-10">
    <header className="flex items-center gap-3 py-5"><button onClick={()=>router.back()} className="flex size-11 items-center justify-center rounded-full bg-white shadow"><ArrowLeft className="text-[#5279a5]"/></button><div><h1 className="text-2xl font-black text-[#234a78]">히트 기록</h1><p className="text-sm text-[#8ca5c4]">{session.species} · 어종 자동 연결</p></div></header>
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-[#f3f8ff] p-4"><div className="flex items-center justify-between"><p className="font-black text-[#234a78]">{session.species}</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#3988f2]">오늘 {hitCount} HIT</span></div><p className="mt-1 text-xs text-[#8298b8]">{session.location || "빠른 낚시모드"}</p>{hitCount > 0 && <p className="mt-2 text-xs font-semibold text-[#5f83ad]">직전 히트의 채비·미끼·수심을 불러왔습니다.</p>}</div>
      <label className="mt-5 block text-sm font-bold text-[#496789]">채비</label><select value={rig} onChange={e=>setRig(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] bg-white px-3"><option value="">선택</option>{rigOptions.map(v=><option key={v} value={v}>{v}</option>)}</select>
      <label className="mt-4 block text-sm font-bold text-[#496789]">에기 / 미끼 <span className="font-normal text-[#8ca5c4]">· 복수 선택</span></label>
      <div className="mt-2 flex flex-wrap gap-2">{baitOptions.map(v=><button type="button" key={v} onClick={()=>toggleBait(v)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${baits.includes(v) ? "border-[#5e9bf2] bg-[#e8f3ff] text-[#3988f2]" : "border-[#d5e3f4] bg-white text-[#6f87a5]"}`}>#{v}</button>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold text-[#496789]">수심 (m)</label><input inputMode="decimal" value={depth} onChange={e=>setDepth(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/></div><div><label className="block text-sm font-bold text-[#496789]">크기 (cm)</label><input inputMode="decimal" value={size} onChange={e=>setSize(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/></div></div>
      <label className="mt-4 block text-sm font-bold text-[#496789]">메모</label><input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="선택 입력" className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/>
      <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#eef7ff] px-3 py-3 text-xs text-[#5f83ad]"><MapPin className="size-4"/>{gps}</div>
      <Button onClick={save} className="mt-5 h-13 w-full rounded-xl bg-[#2f80ed] text-base font-black text-white">히트 저장</Button>
    </section>
  </main>;
}
