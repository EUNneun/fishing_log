"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { loadHitRecords, saveUserHit } from "@/lib/cloud-hits";
import { Button } from "@/components/ui/button";
import { getFishingSession, saveHitRecord, SESSION_KEY, type FishingModeSession, type HitRecord } from "@/lib/fishing-mode";
import { getFishingOptions } from "@/lib/fishing-data";

function subscribeToSession(callback: () => void) {
  window.addEventListener("fishing-mode-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("fishing-mode-change", callback);
    window.removeEventListener("storage", callback);
  };
}

function getSessionSnapshot() {
  try { return window.localStorage.getItem(SESSION_KEY); }
  catch { return null; }
}

function getServerSessionSnapshot() { return null; }

export default function HitPage() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
  const session = useMemo(() => snapshot ? getFishingSession() : null, [snapshot]);
  const [user, setUser] = useState<User | null>(null);
  const [hits, setHits] = useState<HitRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let request = 0;
    const unsubscribe = onAuthStateChanged(auth, async next => {
      const current = ++request;
      setReady(false);
      const result = await loadHitRecords(next);
      if (current !== request) return;
      setUser(next);
      setHits(result.hits);
      setLoadError(result.error);
      setReady(true);
    });
    return () => { request++; unsubscribe(); };
  }, []);

  if (!session) return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] p-5"><p className="mt-20 text-center text-[#6f89aa]">진행 중인 낚시모드가 없습니다.</p><Button onClick={()=>router.push("/")} className="mt-4 w-full">홈으로</Button></main>;
  if (!ready) return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] p-5"><p className="mt-20 text-center text-[#6f89aa]">히트 기록을 불러오는 중...</p></main>;

  return <HitForm key={`${session.id}-${user?.uid ?? "guest"}`} session={session} user={user} hits={hits} loadError={loadError} />;
}

function HitForm({ session, user, hits, loadError }: { session: FishingModeSession; user: User | null; hits: HitRecord[]; loadError: string }) {
  const router = useRouter();
  const previous = hits.filter(hit => hit.sessionId === session.id).sort((a,b) => b.caughtAt.localeCompare(a.caughtAt))[0];
  const hitCount = hits.filter(hit => hit.sessionId === session.id).length;
  const [rig, setRig] = useState(previous?.rig ?? "");
  const [baits, setBaits] = useState<string[]>(previous?.baits ?? (previous?.bait ? [previous.bait] : []));
  const [depth, setDepth] = useState(previous?.depth == null ? "" : String(previous.depth));
  const [size, setSize] = useState("");
  const [memo, setMemo] = useState("");
  const [location, setLocation] = useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
  const [gps, setGps] = useState(() => navigator.geolocation ? "GPS 확인 중" : "GPS 미지원");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const draftId = useRef<string | null>(null);
  const caughtAt = useRef<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => { setLocation({latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy}); setGps(`현재 위치 · 정확도 약 ${Math.round(p.coords.accuracy)}m`); },
      () => setGps("위치 권한을 허용하면 포인트가 저장됩니다."),
      { enableHighAccuracy:true, timeout:10000 }
    );
  }, []);

  const options = getFishingOptions(session?.species ?? "");
  const rigOptions = Array.from(new Set([...options.rigs, ...(rig && !options.rigs.includes(rig) ? [rig] : []), "기타"]));
  const baitOptions = Array.from(new Set([...options.baits, ...baits]));
  const toggleBait = (value: string) => setBaits(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    draftId.current ??= `hit-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    caughtAt.current ??= new Date().toISOString();
    const hit: HitRecord = {
      id:draftId.current,
      sessionId:session.id, tripId:session.tripId, species:session.species,
      caughtAt:caughtAt.current, rig, baits, bait:baits.join(", "),
      depth:depth ? Number(depth) : null, size:size ? Number(size) : null, memo,
      ...(location ?? {})
    };
    try {
      if (user) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            saveUserHit(user, hit),
            new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("save-timeout")), 10000); }),
          ]);
        } finally { clearTimeout(timeout); }
      }
      else saveHitRecord(hit);
      router.push("/");
    } catch {
      setSaveError("클라우드에 저장하지 못했습니다. 이 브라우저에 임시 보관했으며 연결되면 다시 동기화합니다.");
      setSaving(false);
    }
  };

  return <main className="mx-auto min-h-screen max-w-md bg-[#f6faff] px-4 pb-10">
    <header className="flex items-center gap-3 py-5"><button onClick={()=>router.back()} className="flex size-11 items-center justify-center rounded-full bg-white shadow"><ArrowLeft className="text-[#5279a5]"/></button><div><h1 className="text-2xl font-black text-[#234a78]">히트 기록</h1><p className="text-sm text-[#8ca5c4]">{session.species} · 어종 자동 연결</p></div></header>
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-[#f3f8ff] p-4"><div className="flex items-center justify-between"><p className="font-black text-[#234a78]">{session.species}</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#3988f2]">오늘 {hitCount} HIT</span></div><p className="mt-1 text-xs text-[#8298b8]">{session.location || "빠른 낚시모드"}</p>{hitCount > 0 && <p className="mt-2 text-xs font-semibold text-[#5f83ad]">직전 히트의 채비·미끼·수심을 불러왔습니다.</p>}</div>
      {loadError && <p className="mt-3 text-sm text-[#b56940]">{loadError}</p>}
      <label className="mt-5 block text-sm font-bold text-[#496789]">채비</label><select value={rig} onChange={e=>setRig(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] bg-white px-3"><option value="">선택</option>{rigOptions.map(v=><option key={v} value={v}>{v}</option>)}</select>
      <label className="mt-4 block text-sm font-bold text-[#496789]">에기 / 미끼 <span className="font-normal text-[#8ca5c4]">· 복수 선택</span></label>
      <div className="mt-2 flex flex-wrap gap-2">{baitOptions.map(v=><button type="button" key={v} onClick={()=>toggleBait(v)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${baits.includes(v) ? "border-[#5e9bf2] bg-[#e8f3ff] text-[#3988f2]" : "border-[#d5e3f4] bg-white text-[#6f87a5]"}`}>#{v}</button>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold text-[#496789]">수심 (m)</label><input inputMode="decimal" value={depth} onChange={e=>setDepth(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/></div><div><label className="block text-sm font-bold text-[#496789]">크기 (cm)</label><input inputMode="decimal" value={size} onChange={e=>setSize(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/></div></div>
      <label className="mt-4 block text-sm font-bold text-[#496789]">메모</label><input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="선택 입력" className="mt-2 h-12 w-full rounded-xl border border-[#c9ddf6] px-3"/>
      <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#eef7ff] px-3 py-3 text-xs text-[#5f83ad]"><MapPin className="size-4"/>{gps}</div>
      {saveError && <p className="mt-3 text-sm text-[#b56940]">{saveError}</p>}
      <Button disabled={saving} onClick={save} className="mt-5 h-13 w-full rounded-xl bg-[#2f80ed] text-base font-black text-white">{saving ? "저장 중..." : "히트 저장"}</Button>
    </section>
  </main>;
}
