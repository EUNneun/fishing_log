"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Star } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";
import { createGuestId, getGuestLog, saveGuestLog } from "@/lib/guest-storage";

const speciesNames = ["꽃게", "참돔", "쭈꾸미", "갑오징어", "한치", "우럭", "가자미"] as const;
type Region = "서해" | "남해" | "동해" | "제주";
const regions: Region[] = ["서해", "남해", "동해", "제주"];

type Port = { name: string; region: Region; area: string; aliases?: string[] };
const ports: Port[] = [
  { name: "오천항", region: "서해", area: "충남 보령" }, { name: "무창포항", region: "서해", area: "충남 보령" },
  { name: "대천항", region: "서해", area: "충남 보령" }, { name: "비응항", region: "서해", area: "전북 군산", aliases: ["비응도항"] },
  { name: "군산항", region: "서해", area: "전북 군산" }, { name: "격포항", region: "서해", area: "전북 부안" },
  { name: "홍원항", region: "서해", area: "충남 서천" }, { name: "마검포항", region: "서해", area: "충남 태안" },
  { name: "신진도항", region: "서해", area: "충남 태안" }, { name: "안흥항", region: "서해", area: "충남 태안" },
  { name: "영목항", region: "서해", area: "충남 태안" }, { name: "남당항", region: "서해", area: "충남 홍성" },
  { name: "방포항", region: "서해", area: "충남 태안" }, { name: "탄도항", region: "서해", area: "경기 안산" },
  { name: "궁평항", region: "서해", area: "경기 화성" }, { name: "전곡항", region: "서해", area: "경기 화성" },
  { name: "인천항", region: "서해", area: "인천" }, { name: "연안부두", region: "서해", area: "인천", aliases: ["인천 연안부두"] },
  { name: "영흥도 진두항", region: "서해", area: "인천 옹진" }, { name: "선재도 선재항", region: "서해", area: "인천 옹진" },
  { name: "대부도 방아머리항", region: "서해", area: "경기 안산" }, { name: "제부도항", region: "서해", area: "경기 화성" },
  { name: "평택항", region: "서해", area: "경기 평택" }, { name: "왜목항", region: "서해", area: "충남 당진" },
  { name: "장고항", region: "서해", area: "충남 당진" }, { name: "삼길포항", region: "서해", area: "충남 서산" },
  { name: "구도항", region: "서해", area: "충남 서산" }, { name: "창리항", region: "서해", area: "충남 서산" },
  { name: "백사장항", region: "서해", area: "충남 태안" }, { name: "모항항", region: "서해", area: "충남 태안" },
  { name: "학암포항", region: "서해", area: "충남 태안" }, { name: "만리포항", region: "서해", area: "충남 태안" },
  { name: "천리포항", region: "서해", area: "충남 태안" }, { name: "몽산포항", region: "서해", area: "충남 태안" },
  { name: "안면도 구매항", region: "서해", area: "충남 태안" }, { name: "안면도 황도항", region: "서해", area: "충남 태안" },
  { name: "보령 삽시도항", region: "서해", area: "충남 보령" }, { name: "보령 외연도항", region: "서해", area: "충남 보령" },
  { name: "장항항", region: "서해", area: "충남 서천" }, { name: "마량포구", region: "서해", area: "충남 서천", aliases: ["마량항"] },
  { name: "부안 궁항", region: "서해", area: "전북 부안" }, { name: "위도항", region: "서해", area: "전북 부안" },
  { name: "목포항", region: "서해", area: "전남 목포" }, { name: "진도 서망항", region: "서해", area: "전남 진도" },
  { name: "진도 팽목항", region: "서해", area: "전남 진도", aliases: ["진도항"] }, { name: "영광 계마항", region: "서해", area: "전남 영광" },
  { name: "신안 지도 송도항", region: "서해", area: "전남 신안" }, { name: "신안 압해도 송공항", region: "서해", area: "전남 신안" },

  { name: "여수 국동항", region: "남해", area: "전남 여수", aliases: ["국동항"] }, { name: "돌산항", region: "남해", area: "전남 여수" },
  { name: "여수 소호항", region: "남해", area: "전남 여수" }, { name: "백야항", region: "남해", area: "전남 여수" },
  { name: "녹동항", region: "남해", area: "전남 고흥" }, { name: "나로도항", region: "남해", area: "전남 고흥" },
  { name: "발포항", region: "남해", area: "전남 고흥" }, { name: "완도항", region: "남해", area: "전남 완도" },
  { name: "청산도항", region: "남해", area: "전남 완도" }, { name: "마량항", region: "남해", area: "전남 강진" },
  { name: "회진항", region: "남해", area: "전남 장흥" }, { name: "통영항", region: "남해", area: "경남 통영" },
  { name: "통영 미수항", region: "남해", area: "경남 통영" }, { name: "통영 삼덕항", region: "남해", area: "경남 통영" },
  { name: "통영 욕지도항", region: "남해", area: "경남 통영" }, { name: "삼천포항", region: "남해", area: "경남 사천" },
  { name: "거제 지세포항", region: "남해", area: "경남 거제", aliases: ["지세포항"] }, { name: "장승포항", region: "남해", area: "경남 거제" },
  { name: "거제 구조라항", region: "남해", area: "경남 거제" }, { name: "거제 대포항", region: "남해", area: "경남 거제" },
  { name: "거제 저구항", region: "남해", area: "경남 거제" }, { name: "거제 능포항", region: "남해", area: "경남 거제" },
  { name: "남해 미조항", region: "남해", area: "경남 남해" }, { name: "남해 물건항", region: "남해", area: "경남 남해" },
  { name: "부산 다대포항", region: "남해", area: "부산", aliases: ["다대포항"] }, { name: "부산 남항", region: "남해", area: "부산" },
  { name: "부산 송정항", region: "남해", area: "부산" }, { name: "부산 대변항", region: "남해", area: "부산", aliases: ["대변항"] },
  { name: "창원 진해항", region: "남해", area: "경남 창원" }, { name: "마산항", region: "남해", area: "경남 창원" },

  { name: "포항 구룡포항", region: "동해", area: "경북 포항", aliases: ["구룡포항"] }, { name: "영일만항", region: "동해", area: "경북 포항" },
  { name: "포항 양포항", region: "동해", area: "경북 포항" }, { name: "포항 신항만", region: "동해", area: "경북 포항" },
  { name: "경주 감포항", region: "동해", area: "경북 경주", aliases: ["감포항"] }, { name: "울산 방어진항", region: "동해", area: "울산", aliases: ["방어진항"] },
  { name: "울산 정자항", region: "동해", area: "울산" }, { name: "울산 장생포항", region: "동해", area: "울산" },
  { name: "울진 후포항", region: "동해", area: "경북 울진", aliases: ["후포항"] }, { name: "울진 죽변항", region: "동해", area: "경북 울진", aliases: ["죽변항"] },
  { name: "영덕 강구항", region: "동해", area: "경북 영덕", aliases: ["강구항"] }, { name: "영덕 축산항", region: "동해", area: "경북 영덕", aliases: ["축산항"] },
  { name: "강릉항", region: "동해", area: "강원 강릉" }, { name: "주문진항", region: "동해", area: "강원 강릉" },
  { name: "동해 묵호항", region: "동해", area: "강원 동해", aliases: ["묵호항"] }, { name: "동해항", region: "동해", area: "강원 동해" },
  { name: "삼척항", region: "동해", area: "강원 삼척" }, { name: "임원항", region: "동해", area: "강원 삼척" },
  { name: "장호항", region: "동해", area: "강원 삼척" }, { name: "속초항", region: "동해", area: "강원 속초" },
  { name: "대포항", region: "동해", area: "강원 속초" }, { name: "공현진항", region: "동해", area: "강원 고성" },
  { name: "거진항", region: "동해", area: "강원 고성" }, { name: "아야진항", region: "동해", area: "강원 고성" },

  { name: "제주항", region: "제주", area: "제주 제주시" }, { name: "도두항", region: "제주", area: "제주 제주시" },
  { name: "한림항", region: "제주", area: "제주 제주시" }, { name: "애월항", region: "제주", area: "제주 제주시" },
  { name: "김녕항", region: "제주", area: "제주 제주시" }, { name: "세화항", region: "제주", area: "제주 제주시" },
  { name: "성산항", region: "제주", area: "제주 서귀포" }, { name: "서귀포항", region: "제주", area: "제주 서귀포" },
  { name: "모슬포항", region: "제주", area: "제주 서귀포" }, { name: "화순항", region: "제주", area: "제주 서귀포" },
  { name: "위미항", region: "제주", area: "제주 서귀포" }, { name: "하효항", region: "제주", area: "제주 서귀포" },
];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function tideNumber(dateText: string, region: Region) {
  const date = new Date(`${dateText}T00:00:00`);
  const anchor = new Date(2026, 8, 10);
  const diff = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 86400000);
  const base = region === "서해" ? 5 : 7;
  return ((base - 1 + diff) % 15 + 15) % 15 + 1;
}
function tideLabel(tide: number) { return tide === 14 ? "조금" : tide === 15 ? "무시" : `${tide}물`; }

const freshForm = () => ({
  tripDate: today(), weather: "맑음", location: "", region: "" as Region | "", tide: "", boatName: "", fee: "",
  species: "", rig: "", catchCount: "", maxSize: "", memo: "", boatCondition: "", captainSkill: "", mealRating: "",
});

type FormState = ReturnType<typeof freshForm>;

export default function RecordPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [form, setForm] = useState<FormState>(freshForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [showPorts, setShowPorts] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const date = params.get("date");
    const id = params.get("id");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setForm((current) => ({ ...current, tripDate: date }));
    if (id) setEditId(id);

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser); setAuthReady(true);
      if (!id) return;
      if (!nextUser) {
        const data = getGuestLog<Record<string, unknown> & { id: string }>(id);
        if (!data) { setError("기록을 찾지 못했습니다."); return; }
        const location = String(data.location ?? "");
        const matchedPort = ports.find((p) => p.name === location || p.aliases?.includes(location));
        const region = (data.region as Region | undefined) ?? matchedPort?.region ?? "";
        const tripDate = String(data.tripDate ?? today());
        const tide = region ? String(data.tide ?? tideNumber(tripDate, region)) : "";
        setForm({ tripDate, weather:String(data.weather??"맑음"), location, region, tide, boatName:String(data.boatName??""), fee:String(data.fee??""), species:String(data.species??""), rig:String(data.rig??""), catchCount:String(data.catchCount??""), maxSize:data.maxSize==null?"":String(data.maxSize), memo:String(data.memo??""), boatCondition:data.boatCondition==null?"":String(data.boatCondition), captainSkill:data.captainSkill==null?"":String(data.captainSkill), mealRating:data.mealRating==null?"":String(data.mealRating) });
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "users", nextUser.uid, "logs", id));
        if (!snapshot.exists()) { setError("기록을 찾지 못했습니다."); return; }
        const data = snapshot.data() as Record<string, unknown>;
        const location = String(data.location ?? "");
        const matchedPort = ports.find((p) => p.name === location || p.aliases?.includes(location));
        const region = (data.region as Region | undefined) ?? matchedPort?.region ?? "";
        const tripDate = String(data.tripDate ?? today());
        const tide = region ? String(data.tide ?? tideNumber(tripDate, region)) : "";
        setForm({
          tripDate, weather: String(data.weather ?? "맑음"), location, region, tide,
          boatName: String(data.boatName ?? ""), fee: String(data.fee ?? ""), species: String(data.species ?? ""),
          rig: String(data.rig ?? ""), catchCount: String(data.catchCount ?? ""), maxSize: data.maxSize == null ? "" : String(data.maxSize),
          memo: String(data.memo ?? ""), boatCondition: data.boatCondition == null ? "" : String(data.boatCondition),
          captainSkill: data.captainSkill == null ? "" : String(data.captainSkill), mealRating: data.mealRating == null ? "" : String(data.mealRating),
        });
      } catch (e) { setError(e instanceof Error ? e.message : "기록을 불러오지 못했습니다."); }
    });
  }, []);

  const filteredPorts = useMemo(() => {
    const q = form.location.trim().toLowerCase();
    if (!q) return ports.slice(0, 10);
    return ports.filter((p) => `${p.name} ${p.area} ${(p.aliases ?? []).join(" ")}`.toLowerCase().includes(q)).slice(0, 12);
  }, [form.location]);

  function updateDate(value: string) {
    setForm((current) => ({ ...current, tripDate: value, tide: current.region ? String(tideNumber(value, current.region)) : "" }));
  }
  function updateLocation(value: string) {
    const exact = ports.find((p) => p.name === value || p.aliases?.includes(value));
    setForm((current) => ({ ...current, location: value, region: exact?.region ?? "", tide: exact ? String(tideNumber(current.tripDate, exact.region)) : "" }));
    setShowPorts(true);
  }
  function selectPort(port: Port) {
    setForm((current) => ({ ...current, location: port.name, region: port.region, tide: String(tideNumber(current.tripDate, port.region)) }));
    setShowPorts(false);
  }
  function updateRegion(region: Region | "") {
    setForm((current) => ({ ...current, region, tide: region ? String(tideNumber(current.tripDate, region)) : "" }));
  }
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });
  const setRating = (key: "boatCondition" | "captainSkill" | "mealRating") => (value: number) => setForm({ ...form, [key]: String(value) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.location.trim()) { setError("항구를 입력해주세요."); return; }
    if (!form.region || !form.tide) { setError("검색에 없는 항구라면 지역을 직접 선택해주세요."); return; }
    setSaving(true); setError("");
    const payload = {
      tripDate: form.tripDate, weather: form.weather, location: form.location.trim(), region: form.region,
      tide: Number(form.tide), tideLabel: tideLabel(Number(form.tide)), boatName: form.boatName.trim(), fee: Number(form.fee),
      species: form.species, rig: form.rig.trim(), catchCount: Number(form.catchCount), maxSize: form.maxSize ? Number(form.maxSize) : null,
      memo: form.memo.trim(), boatCondition: form.boatCondition ? Number(form.boatCondition) : null,
      captainSkill: form.captainSkill ? Number(form.captainSkill) : null, mealRating: form.mealRating ? Number(form.mealRating) : null,
      updatedAt: serverTimestamp(),
    };
    try {
      if (user) {
        if (editId) await setDoc(doc(db, "users", user.uid, "logs", editId), payload, { merge: true });
        else await addDoc(collection(db, "users", user.uid, "logs"), { ...payload, createdAt: serverTimestamp() });
      } else {
        const id = editId || createGuestId();
        saveGuestLog({ id, ...payload, createdAt: new Date().toISOString() });
      }
      window.location.href = "/fishing_log/";
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  if (!authReady) return <main className="min-h-dvh bg-[#eaf3ff] p-6 text-center text-[#8298b8]">로그인 정보를 확인하는 중입니다.</main>;
  return (
    <main className="min-h-dvh bg-[#eaf3ff] text-[#29456f]">
      <div className="mx-auto min-h-dvh max-w-md bg-[#f7fbff] pb-10 shadow-2xl shadow-[#4a8ee8]/15 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#dbe9fa] bg-[#f7fbff]/95 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={() => history.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#52749b] shadow-sm" aria-label="뒤로가기"><ArrowLeft className="size-5" /></button>
          <div><h1 className="text-xl font-extrabold text-[#29456f]">{editId ? "출조 기록 편집" : "출조 기록"}</h1><p className="mt-0.5 text-xs text-[#8aa0be]">{editId ? "기존 기록을 수정하고 저장할 수 있어요." : "항구를 선택하면 지역과 물때가 자동으로 입력됩니다."}</p></div>
        </header>

        <form onSubmit={submit} className="space-y-5 px-5 py-5">
          {error && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
          <section className="space-y-4 rounded-[1.5rem] border border-[#dfeafa] bg-white p-4 shadow-sm">
            <Field label="출조일"><Input type="date" required value={form.tripDate} onChange={(e) => updateDate(e.target.value)} className="block w-full max-w-full min-w-0 box-border" /></Field>
            <Field label="날씨"><NativeSelect required value={form.weather} onChange={set("weather")} className="w-full"><NativeSelectOption>맑음</NativeSelectOption><NativeSelectOption>흐림</NativeSelectOption><NativeSelectOption>비</NativeSelectOption><NativeSelectOption>바람</NativeSelectOption><NativeSelectOption>눈</NativeSelectOption></NativeSelect></Field>

            <Field label="장소(항구)">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-4 size-4 text-[#8aa0be]" />
                <Input required autoComplete="off" placeholder="항구명 또는 지역 검색" value={form.location} onFocus={() => setShowPorts(true)} onChange={(e) => updateLocation(e.target.value)} className="pl-9" />
                {showPorts && <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[#dbe9fa] bg-white p-1 shadow-xl">
                  {filteredPorts.length > 0 ? filteredPorts.map((port) => <button key={`${port.region}-${port.area}-${port.name}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectPort(port)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#eef6ff]"><span className="font-semibold text-[#496789]">{port.name}</span><span className="shrink-0 text-xs text-[#8aa0be]">{port.area} · {port.region}</span></button>) : <div className="px-3 py-3 text-sm text-[#8298b8]">검색 결과가 없습니다. 항구명을 그대로 입력하고 아래에서 지역을 선택해주세요.</div>}
                </div>}
              </div>
              <p className="text-xs text-[#8aa0be]">목록에 없는 항구도 직접 입력할 수 있습니다.</p>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="지역"><NativeSelect value={form.region} onChange={(e) => updateRegion(e.target.value as Region | "")} className="w-full"><NativeSelectOption value="">직접 선택</NativeSelectOption>{regions.map((region) => <NativeSelectOption key={region} value={region}>{region}</NativeSelectOption>)}</NativeSelect></Field>
              <Field label="물때"><Input readOnly value={form.tide ? tideLabel(Number(form.tide)) : "지역 선택 시 자동"} className="bg-[#f6faff] text-[#607a9e]" /></Field>
            </div>

            <Field label="배 이름(선사)"><Input required placeholder="예: 뉴○○호" value={form.boatName} onChange={set("boatName")} /></Field>
            <Field label="선비"><Input type="number" min="0" required inputMode="numeric" placeholder="원 단위" value={form.fee} onChange={set("fee")} /></Field>
            <Field label="어종"><NativeSelect required value={form.species} onChange={set("species")} className="w-full"><NativeSelectOption value="">선택</NativeSelectOption>{speciesNames.map((name) => <NativeSelectOption key={name} value={name}>{name}</NativeSelectOption>)}</NativeSelect></Field>
            <Field label="채비 (선택)"><Input placeholder="예: 가지채비" value={form.rig} onChange={set("rig")} /></Field>
            <Field label="조과(마릿수)"><Input type="number" min="0" required inputMode="numeric" placeholder="0" value={form.catchCount} onChange={set("catchCount")} /></Field>
            <Field label="최대 크기(cm)"><Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="선택" value={form.maxSize} onChange={set("maxSize")} /></Field>
          </section>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-4 shadow-sm"><div className="mb-4"><p className="text-sm font-extrabold text-[#496789]">선사 컨디션</p><p className="mt-1 text-xs text-[#8aa0be]">선택 평가 · 별 5개 만점</p></div><div className="space-y-4"><StarRating label="배 컨디션" value={Number(form.boatCondition) || 0} onChange={setRating("boatCondition")} /><StarRating label="선장님 조타 실력" value={Number(form.captainSkill) || 0} onChange={setRating("captainSkill")} /><StarRating label="간식/식사" value={Number(form.mealRating) || 0} onChange={setRating("mealRating")} /></div></section>
          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-4 shadow-sm"><Field label="메모 (선택)"><Textarea placeholder="잘 잡힌 시간, 수심, 특이사항 등" value={form.memo} onChange={set("memo")} className="min-h-24" /></Field></section>
          <Button disabled={saving} type="submit" className="h-13 w-full rounded-2xl bg-gradient-to-r from-[#5e9bf2] to-[#61c5f3] font-extrabold text-white shadow-lg shadow-[#4d94e8]/20 hover:from-[#4f8ee8] hover:to-[#4db7ea]">{saving ? "저장 중..." : editId ? "수정사항 저장" : "기록 저장"}</Button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="min-w-0 w-full max-w-full overflow-visible space-y-2"><Label className="text-sm text-[#496789]">{label}</Label>{children}</div>; }
function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-[#607a9e]">{label}</span><div className="flex items-center gap-1" role="radiogroup" aria-label={`${label} 별점`}>{[1,2,3,4,5].map((score) => <button key={score} type="button" role="radio" aria-checked={value === score} aria-label={`${score}점`} onClick={() => onChange(score)} className={`rounded-md p-0.5 transition ${score <= value ? "text-[#f5b83d]" : "text-[#c8d7e8]"}`}><Star className="size-7" fill={score <= value ? "currentColor" : "none"} /></button>)}</div></div>;
}
