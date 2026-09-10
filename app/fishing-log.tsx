"use client";

import { useEffect, useMemo, useState } from "react";
import { Anchor, CalendarDays, MapPin, Plus, ShipWheel, WalletCards, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Log = { id: number; tripDate: string; location: string; boatName: string; fee: number; species: string; rig: string; weather: string; catchCount: number; maxSize: number | null; memo: string };
const freshForm = () => ({ tripDate: new Date().toISOString().slice(0, 10), location: "", boatName: "", fee: "", species: "", rig: "", weather: "맑음", catchCount: "", maxSize: "", memo: "" });

export default function FishingLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [form, setForm] = useState(freshForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/logs").then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "기록을 불러오지 못했습니다.");
      setLogs(data.logs);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const totalCatch = useMemo(() => logs.reduce((sum, log) => sum + log.catchCount, 0), [logs]);
  const totalFee = useMemo(() => logs.reduce((sum, log) => sum + log.fee, 0), [logs]);
  const bestSpecies = useMemo(() => {
    const counts = logs.reduce<Record<string, number>>((acc, log) => ({ ...acc, [log.species]: (acc[log.species] || 0) + log.catchCount }), {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "–";
  }, [logs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setLogs((current) => [data.log, ...current]); setOpen(false); setForm(freshForm());
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  const set = (key: keyof ReturnType<typeof freshForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });
  const money = new Intl.NumberFormat("ko-KR");

  return (
    <main className="min-h-dvh bg-[#eaf3ff] text-[#29456f]">
      <div className="mx-auto min-h-dvh max-w-md bg-[#f5f9ff] pb-28 shadow-2xl shadow-[#4a8ee8]/15 md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2rem]">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#79aef7] via-[#9bc8ff] to-[#c6efff] px-5 pb-7 pt-6">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[34px] border-white/20" />
          <div className="relative flex items-center justify-between">
            <div><p className="text-sm font-medium text-white/80">나의 출조 기록</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">FISH LOG</h1></div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/90 text-3xl shadow-lg shadow-[#4387df]/20" aria-label="문어">🐙</div>
          </div>
          <section className="relative mt-6 rounded-[1.5rem] bg-white/92 p-5 shadow-xl shadow-[#4387df]/15 backdrop-blur">
            <div className="flex items-end justify-between"><div><p className="text-sm text-[#7b94ba]">지금까지 잡은 물고기</p><p className="mt-1 text-4xl font-black text-[#3988f2]">{totalCatch}<span className="ml-1 text-lg font-bold">마리</span></p></div><Waves className="size-10 text-[#5abef5]/40" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#dbe8fa] pt-4 text-center">
              <Stat label="출조" value={`${logs.length}회`} /><Stat label="주력 어종" value={bestSpecies} /><Stat label="총 선비" value={totalFee ? `${money.format(Math.round(totalFee / 10000))}만` : "–"} />
            </div>
          </section>
        </header>

        <section className="px-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-[#29456f]">최근 출조</h2><span className="text-sm text-[#8298b8]">총 {logs.length}건</span></div>
          {error && <div className="mb-3 rounded-xl bg-red-400/15 px-4 py-3 text-sm text-red-200">{error}</div>}
          {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#8298b8] shadow-sm">기록을 불러오는 중...</div> : logs.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#a7c9f5] bg-white px-6 py-10 text-center shadow-sm"><Anchor className="mx-auto size-9 text-[#4c98ef]" /><p className="mt-4 font-bold text-[#29456f]">첫 출조를 기록해보세요</p><p className="mt-1 text-sm text-[#8298b8]">기억보다 기록이 오래갑니다.</p></div>
          ) : <div className="space-y-3">{logs.map((log) => (
            <article key={log.id} className="rounded-[1.35rem] border border-[#e2edfb] bg-white p-4 shadow-sm shadow-[#5594df]/5">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs text-[#8298b8]"><CalendarDays className="size-3.5" />{log.tripDate}</div><h3 className="mt-2 text-lg font-bold text-[#29456f]">{log.species} <span className="text-[#3988f2]">{log.catchCount}마리</span></h3></div>{log.maxSize && <span className="rounded-full bg-[#e8f3ff] px-3 py-1 text-sm font-bold text-[#3988f2]">최대 {log.maxSize}cm</span>}</div>
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#607a9e]"><span className="flex items-center gap-2"><MapPin className="size-4 text-[#74a9e8]" />{log.location}</span><span className="flex items-center gap-2"><ShipWheel className="size-4 text-[#74a9e8]" />{log.boatName}</span><span className="flex items-center gap-2"><WalletCards className="size-4 text-[#74a9e8]" />{money.format(log.fee)}원</span><span className="flex items-center gap-2"><Waves className="size-4 text-[#74a9e8]" />{log.weather} · {log.rig}</span></div>
              {log.memo && <p className="mt-3 border-t border-[#e6effb] pt-3 text-sm leading-6 text-[#7c91ad]">{log.memo}</p>}
            </article>
          ))}</div>}
        </section>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="fixed bottom-5 left-1/2 z-20 h-14 w-[calc(100%-2.5rem)] max-w-[25rem] -translate-x-1/2 rounded-2xl bg-gradient-to-r from-[#5e9bf2] to-[#61c5f3] text-base font-extrabold text-white shadow-xl shadow-[#4d94e8]/30 hover:from-[#4f8ee8] hover:to-[#4db7ea]"><Plus className="size-5" />출조 기록하기</Button></DialogTrigger>
          <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-t-[2rem] border-[#dbe9fa] bg-[#f7fbff] p-5 text-[#29456f] max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0">
            <DialogHeader className="text-left"><DialogTitle className="text-xl">오늘의 출조 기록</DialogTitle><DialogDescription className="text-[#8298b8]">필수 항목만 입력해도 저장할 수 있어요.</DialogDescription></DialogHeader>
            <form onSubmit={submit} className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-3"><Field label="출조일"><Input type="date" required value={form.tripDate} onChange={set("tripDate")} /></Field><Field label="날씨"><NativeSelect required value={form.weather} onChange={set("weather")} className="w-full"><NativeSelectOption>맑음</NativeSelectOption><NativeSelectOption>흐림</NativeSelectOption><NativeSelectOption>비</NativeSelectOption><NativeSelectOption>바람</NativeSelectOption><NativeSelectOption>눈</NativeSelectOption></NativeSelect></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="장소"><Input required placeholder="예: 오천항" value={form.location} onChange={set("location")} /></Field><Field label="배 이름(선사)"><Input required placeholder="예: 뉴○○호" value={form.boatName} onChange={set("boatName")} /></Field></div>
              <Field label="선비"><Input type="number" min="0" required inputMode="numeric" placeholder="원 단위" value={form.fee} onChange={set("fee")} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="어종"><Input required placeholder="예: 갑오징어" value={form.species} onChange={set("species")} /></Field><Field label="채비"><Input required placeholder="예: 가지채비" value={form.rig} onChange={set("rig")} /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="조과(마릿수)"><Input type="number" min="0" required inputMode="numeric" placeholder="0" value={form.catchCount} onChange={set("catchCount")} /></Field><Field label="최대 크기(cm)"><Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="선택" value={form.maxSize} onChange={set("maxSize")} /></Field></div>
              <Field label="메모 (선택)"><Textarea placeholder="잘 잡힌 시간, 수심, 특이사항 등" value={form.memo} onChange={set("memo")} className="min-h-20" /></Field>
              <Button disabled={saving} type="submit" className="h-12 w-full rounded-xl bg-gradient-to-r from-[#5e9bf2] to-[#61c5f3] font-extrabold text-white hover:from-[#4f8ee8] hover:to-[#4db7ea]">{saving ? "저장 중..." : "기록 저장"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-[#8aa0be]">{label}</p><p className="mt-1 truncate font-bold text-[#29456f]">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-sm text-[#496789]">{label}</Label>{children}</div>; }
