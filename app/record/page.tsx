"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";

const speciesNames = ["꽃게", "참돔", "쭈꾸미", "갑오징어", "한치", "우럭"] as const;

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const freshForm = () => ({
  tripDate: today(),
  weather: "맑음",
  location: "",
  boatName: "",
  fee: "",
  species: "",
  rig: "",
  catchCount: "",
  maxSize: "",
  memo: "",
  boatCondition: "",
  captainSkill: "",
  mealRating: "",
});

export default function RecordPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [form, setForm] = useState(freshForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const date = params.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setForm((current) => ({ ...current, tripDate: date }));
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  const set = (key: keyof ReturnType<typeof freshForm>) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm({ ...form, [key]: e.target.value });

  const setRating = (key: "boatCondition" | "captainSkill" | "mealRating") => (value: number) =>
    setForm({ ...form, [key]: String(value) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");

    try {
      await addDoc(collection(db, "users", user.uid, "logs"), {
        tripDate: form.tripDate,
        weather: form.weather,
        location: form.location.trim(),
        boatName: form.boatName.trim(),
        fee: Number(form.fee),
        species: form.species,
        rig: form.rig.trim(),
        catchCount: Number(form.catchCount),
        maxSize: form.maxSize ? Number(form.maxSize) : null,
        memo: form.memo.trim(),
        boatCondition: form.boatCondition ? Number(form.boatCondition) : null,
        captainSkill: form.captainSkill ? Number(form.captainSkill) : null,
        mealRating: form.mealRating ? Number(form.mealRating) : null,
        createdAt: serverTimestamp(),
      });
      window.location.href = "/fishing_log/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return <main className="min-h-dvh bg-[#eaf3ff] p-6 text-center text-[#8298b8]">로그인 정보를 확인하는 중입니다.</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#eaf3ff] p-6 text-[#29456f]">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-bold">로그인이 필요합니다.</p>
          <Button type="button" onClick={() => { window.location.href = "/fishing_log/"; }} className="mt-4">
            홈으로 돌아가기
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#eaf3ff] text-[#29456f]">
      <div className="mx-auto min-h-dvh max-w-md bg-[#f7fbff] pb-10 shadow-2xl shadow-[#4a8ee8]/15 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#dbe9fa] bg-[#f7fbff]/95 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={() => history.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#52749b] shadow-sm" aria-label="뒤로가기">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#29456f]">출조 기록</h1>
            <p className="mt-0.5 text-xs text-[#8aa0be]">필수 항목만 입력해도 저장할 수 있어요.</p>
          </div>
        </header>

        <form onSubmit={submit} className="space-y-5 px-5 py-5">
          {error && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}

          <section className="space-y-4 rounded-[1.5rem] border border-[#dfeafa] bg-white p-4 shadow-sm">
            <Field label="출조일">
              <Input
                type="date"
                required
                value={form.tripDate}
                onChange={set("tripDate")}
                className="block w-[94%] max-w-[94%] min-w-0 box-border"
              />
            </Field>

            <Field label="날씨">
              <NativeSelect required value={form.weather} onChange={set("weather")} className="w-full">
                <NativeSelectOption>맑음</NativeSelectOption>
                <NativeSelectOption>흐림</NativeSelectOption>
                <NativeSelectOption>비</NativeSelectOption>
                <NativeSelectOption>바람</NativeSelectOption>
                <NativeSelectOption>눈</NativeSelectOption>
              </NativeSelect>
            </Field>

            <Field label="장소(항구)">
              <Input required placeholder="예: 오천항" value={form.location} onChange={set("location")} />
            </Field>

            <Field label="배 이름(선사)">
              <Input required placeholder="예: 뉴○○호" value={form.boatName} onChange={set("boatName")} />
            </Field>

            <Field label="선비">
              <Input type="number" min="0" required inputMode="numeric" placeholder="원 단위" value={form.fee} onChange={set("fee")} />
            </Field>

            <Field label="어종">
              <NativeSelect required value={form.species} onChange={set("species")} className="w-full">
                <NativeSelectOption value="">선택</NativeSelectOption>
                {speciesNames.map((name) => <NativeSelectOption key={name} value={name}>{name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>

            <Field label="채비 (선택)">
              <Input placeholder="예: 가지채비" value={form.rig} onChange={set("rig")} />
            </Field>

            <Field label="조과(마릿수)">
              <Input type="number" min="0" required inputMode="numeric" placeholder="0" value={form.catchCount} onChange={set("catchCount")} />
            </Field>

            <Field label="최대 크기(cm)">
              <Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="선택" value={form.maxSize} onChange={set("maxSize")} />
            </Field>
          </section>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-extrabold text-[#496789]">선사 컨디션</p>
              <p className="mt-1 text-xs text-[#8aa0be]">선택 평가 · 별 5개 만점</p>
            </div>
            <div className="space-y-4">
              <StarRating label="배 컨디션" value={Number(form.boatCondition) || 0} onChange={setRating("boatCondition")} />
              <StarRating label="선장님 조타 실력" value={Number(form.captainSkill) || 0} onChange={setRating("captainSkill")} />
              <StarRating label="간식/식사" value={Number(form.mealRating) || 0} onChange={setRating("mealRating")} />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-4 shadow-sm">
            <Field label="메모 (선택)">
              <Textarea placeholder="잘 잡힌 시간, 수심, 특이사항 등" value={form.memo} onChange={set("memo")} className="min-h-24" />
            </Field>
          </section>

          <Button disabled={saving} type="submit" className="h-13 w-full rounded-2xl bg-gradient-to-r from-[#5e9bf2] to-[#61c5f3] font-extrabold text-white shadow-lg shadow-[#4d94e8]/20 hover:from-[#4f8ee8] hover:to-[#4db7ea]">
            {saving ? "저장 중..." : "기록 저장"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 w-full max-w-full overflow-hidden space-y-2"><Label className="text-sm text-[#496789]">{label}</Label>{children}</div>;
}

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[#607a9e]">{label}</span>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={`${label} 별점`}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button key={score} type="button" role="radio" aria-checked={value === score} aria-label={`${score}점`} onClick={() => onChange(score)} className={`rounded-md p-0.5 transition ${score <= value ? "text-[#f5b83d]" : "text-[#c8d7e8]"}`}>
            <Star className="size-7" fill={score <= value ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );
}
