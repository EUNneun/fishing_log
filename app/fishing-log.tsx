"use client";

import { useEffect, useMemo, useState } from "react";
import { getHolidayPreset } from "@hyunbinseo/holidays-kr";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { Anchor, CalendarDays, List, LogOut, MapPin, Plus, Settings, ShipWheel, Star, WalletCards, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db, googleProvider } from "@/lib/firebase";
import { getGuestLogs, getGuestSettings, migrateGuestData, saveGuestSettings } from "@/lib/guest-storage";
import { getFishingSession, startFishingSession, stopFishingSession, type FishingModeSession } from "@/lib/fishing-mode";

type Log = {
  id: string;
  tripDate: string;
  location: string;
  boatName: string;
  fee: number;
  species: string;
  rig: string;
  weather: string;
  catchCount: number;
  maxSize: number | null;
  memo: string;
  boatCondition?: number | null;
  captainSkill?: number | null;
  mealRating?: number | null;
};

type CalendarView = "point" | "species" | "catch";

const speciesCharacters = {
  "꽃게": { image: "/fishing_log/species-icons/crab.svg", color: "#368bd0", bg: "#edf7ff" },
  "참돔": { image: "/fishing_log/species-icons/seabream.svg", color: "#dd6680", bg: "#fff0f3" },
  "쭈꾸미": { image: "/fishing_log/species-icons/webfoot.svg", color: "#e3675f", bg: "#fff1ed" },
  "갑오징어": { image: "/fishing_log/species-icons/cuttlefish.svg", color: "#8865c9", bg: "#f4efff" },
  "한치": { image: "/fishing_log/species-icons/squid.svg", color: "#438dc5", bg: "#edf8ff" },
  "우럭": { image: "/fishing_log/species-icons/rockfish.svg", color: "#60789f", bg: "#eef3fa" },
  "가자미": { image: "/fishing_log/species-icons/flounder.svg", color: "#8a765f", bg: "#f7f2ea" },
  "문어": { image: "/fishing_log/species-icons/octopus.svg", color: "#b86d75", bg: "#fff0f2" },
} as const;

type SpeciesName = keyof typeof speciesCharacters;
const regions = ["서해", "남해", "동해", "제주"] as const;
type Region = typeof regions[number];
type UserSettings = { region: Region; preferredTides: string };
const defaultSettings: UserSettings = { region: "서해", preferredTides: "3,4,5,10,11" };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function normalizeTripDate(value: unknown) {
  if (typeof value !== "string") return "";
  const exact = value.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!exact) return value;
  return `${exact[1]}-${exact[2].padStart(2, "0")}-${exact[3].padStart(2, "0")}`;
}

function normalizeLog(log: Log) {
  return { ...log, tripDate: normalizeTripDate(log.tripDate) };
}

function pointLabel(location: string) {
  const clean = location.trim();
  if (!clean) return "포인트";
  const first = clean.split(/\s+/)[0];
  return (first.length <= 4 ? first : clean.replace(/항$/, "")).slice(0, 4);
}

function tideNumber(date: Date, region: Region) {
  const anchor = new Date(2026, 8, 10);
  const diff = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 86400000);
  const base = region === "서해" ? 5 : 7;
  return ((base - 1 + diff) % 15 + 15) % 15 + 1;
}

function tideLabel(tide: number) {
  if (tide === 14) return "조금";
  if (tide === 15) return "무시";
  return `${tide}물`;
}

function parsePreferredTides(value: string) {
  const result = new Set<number>();
  for (const part of value.split(",").map((v) => v.trim()).filter(Boolean)) {
    const range = part.match(/^(\d{1,2})\s*[~-]\s*(\d{1,2})$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let n = Math.min(start, end); n <= Math.max(start, end); n += 1) if (n >= 1 && n <= 15) result.add(n);
    } else {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1 && n <= 15) result.add(n);
    }
  }
  return result;
}

export default function FishingLog() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [fishingSession, setFishingSession] = useState<FishingModeSession | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("species");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [compactHeader, setCompactHeader] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
    if (!nextUser) {
      stopFishingSession();
      setFishingSession(null);
    }
  }), []);

  useEffect(() => {
    const onScroll = () => setCompactHeader(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncFishingMode = () => setFishingSession(getFishingSession());
    syncFishingMode();
    window.addEventListener("fishing-mode-change", syncFishingMode);
    window.addEventListener("storage", syncFishingMode);
    return () => {
      window.removeEventListener("fishing-mode-change", syncFishingMode);
      window.removeEventListener("storage", syncFishingMode);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      const nextLogs = getGuestLogs<Log & { id: string }>().map(normalizeLog).sort((a, b) => b.tripDate.localeCompare(a.tripDate));
      const nextSettings = getGuestSettings(defaultSettings);
      queueMicrotask(() => {
        setLogs(nextLogs);
        setSettings(nextSettings);
        alignCalendarToLatest(nextLogs, setCalendarMonth);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => setLoading(true));
    migrateGuestData(user).then(() => Promise.all([
      getDocs(collection(db, "users", user.uid, "logs")),
      getDoc(doc(db, "users", user.uid, "settings", "main")),
    ])).then(([logSnapshot, settingsSnapshot]) => {
      const nextLogs = logSnapshot.docs.map((item) => normalizeLog({ id: item.id, ...item.data() } as Log)).sort((a, b) => b.tripDate.localeCompare(a.tripDate));
      setLogs(nextLogs);
      alignCalendarToLatest(nextLogs, setCalendarMonth);
      if (settingsSnapshot.exists()) setSettings(settingsSnapshot.data() as UserSettings);
    }).catch((e) => setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const year = String(calendarMonth.getFullYear());
    getHolidayPreset(year).then((preset) => {
      setHolidays((current) => ({ ...current, ...Object.fromEntries(Object.entries(preset).map(([date, names]) => [date, names.join(", ")])) }));
    }).catch(() => undefined);
  }, [calendarMonth]);

  const totalCatch = useMemo(() => logs.reduce((sum, log) => sum + log.catchCount, 0), [logs]);
  const totalFee = useMemo(() => logs.reduce((sum, log) => sum + log.fee, 0), [logs]);
  const bestSpecies = useMemo(() => {
    const counts = logs.reduce<Record<string, number>>((acc, log) => ({ ...acc, [log.species]: (acc[log.species] || 0) + log.catchCount }), {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "–";
  }, [logs]);
  const logsByDate = useMemo(() => logs.reduce<Record<string, Log[]>>((acc, log) => {
    (acc[log.tripDate] ||= []).push(log);
    return acc;
  }, {}), [logs]);
  const selectedLogs = selectedDate ? logsByDate[dateKey(selectedDate)] || [] : [];
  const todayLog = useMemo(() => logs.find((log) => log.tripDate === dateKey(new Date())) || null, [logs]);
  const preferredTides = useMemo(() => parsePreferredTides(settings.preferredTides), [settings.preferredTides]);
  const money = new Intl.NumberFormat("ko-KR");

  async function login() {
    setError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(e instanceof Error ? e.message : "Google 로그인에 실패했습니다."); }
  }

  async function logout() {
    setSettingsOpen(false);
    await signOut(auth);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setError("");
    try {
      if (user) await setDoc(doc(db, "users", user.uid, "settings", "main"), settings);
      else saveGuestSettings(settings);
      setSettingsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "설정을 저장하지 못했습니다.");
    } finally { setSettingsSaving(false); }
  }

  function openRecordPage() {
    const tripDate = selectedDate ? dateKey(selectedDate) : dateKey(new Date());
    window.location.href = `/fishing_log/record/?date=${tripDate}`;
  }

  if (!authReady) return <CenteredMessage title="FISH LOG" description="로그인 정보를 확인하는 중입니다." />;

  return (
    <main className="min-h-dvh bg-[#eaf3ff] text-[#29456f]">
      {compactHeader && <div className="fixed inset-x-0 top-0 z-[65] mx-auto max-w-md border-b border-white/20 bg-[#77adf5]/95 px-4 pb-2 pt-[max(8px,env(safe-area-inset-top))] shadow-md backdrop-blur">
        <div className="flex h-11 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><strong className="text-sm font-black tracking-wide text-white">FISHING LOG</strong>{fishingSession && <span className="inline-flex items-center gap-1 rounded-full bg-[#173d67]/85 px-2 py-1 text-[10px] font-bold text-white"><span className="size-1.5 rounded-full bg-[#ff6262]" />낚시 중</span>}</div>
            <p className="mt-0.5 text-[11px] font-semibold text-white/80">{logs.length}회 · {totalCatch}마리{bestSpecies !== "–" ? ` · ${bestSpecies}` : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!user && <button type="button" onClick={login} className="h-9 rounded-xl bg-white/20 px-3 text-xs font-bold text-white">로그인</button>}
            <button type="button" onClick={() => setSettingsOpen(true)} className="grid size-9 place-items-center rounded-xl bg-white/20 text-white" aria-label="설정"><Settings className="size-4.5" /></button>
          </div>
        </div>
      </div>}
      <div className="mx-auto min-h-dvh max-w-md bg-[#f5f9ff] pb-28 shadow-2xl shadow-[#4a8ee8]/15 md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2rem]">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#79aef7] via-[#9bc8ff] to-[#c6efff] px-5 pb-7 pt-6">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[34px] border-white/20" />
          <div className="relative flex items-center justify-between">
            <div><p className="text-sm font-medium text-white/80">나의 출조 기록</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">FISH LOG</h1></div>
            <div className="flex items-center gap-2">
              {!user && <button type="button" onClick={login} className="flex h-10 min-w-[72px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-white/25 px-4 text-xs font-bold text-white transition hover:bg-white/35">로그인</button>}
              <button type="button" onClick={() => setSettingsOpen(true)} className="flex size-10 items-center justify-center rounded-xl bg-white/25 text-white transition hover:bg-white/35" aria-label="설정"><Settings className="size-5" /></button>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/90 shadow-lg shadow-[#4387df]/20" aria-label={bestSpecies === "–" ? "주력 어종 없음" : `주력 어종 ${bestSpecies}`} title={bestSpecies === "–" ? "주력 어종 없음" : `주력 어종: ${bestSpecies}`}>
                {bestSpecies === "–" ? <Waves className="size-6 text-[#74a9e8]" /> : <SpeciesBadge species={bestSpecies} compact />}
              </div>
            </div>
          </div>
          <section className="relative mt-6 rounded-[1.5rem] bg-white/92 p-5 shadow-xl shadow-[#4387df]/15 backdrop-blur">
            <div className="flex items-end justify-between"><div><p className="text-sm text-[#7b94ba]">지금까지 잡은 물고기</p><p className="mt-1 text-4xl font-black text-[#3988f2]">{totalCatch}<span className="ml-1 text-lg font-bold">마리</span></p></div><Waves className="size-10 text-[#5abef5]/40" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#dbe8fa] pt-4 text-center"><Stat label="출조" value={`${logs.length}회`} /><Stat label="주력 어종" value={bestSpecies} /><Stat label="총 선비" value={totalFee ? `${money.format(Math.round(totalFee / 10000))}만` : "–"} /></div>
          </section>
        </header>

        {!fishingSession && todayLog && <section className="px-5 pt-4">
          <div className="rounded-[1.35rem] border border-[#cfe2fb] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#8aa0be]">오늘 출조가 있습니다</p>
                <p className="mt-1 truncate text-sm font-extrabold text-[#29456f]">{todayLog.species} · {todayLog.location}</p>
                <p className="mt-1 text-xs text-[#8298b8]">낚시모드를 종료했어도 이 출조로 다시 이어갈 수 있어요.</p>
              </div>
              <Button type="button" onClick={() => {
                const session = startFishingSession({ tripId: todayLog.id, species: todayLog.species || "기타", location: todayLog.location, quickStart: false });
                setFishingSession(session);
              }} className="h-11 shrink-0 rounded-xl bg-[#173d67] px-4 text-xs font-extrabold text-white hover:bg-[#123354]">다시 시작</Button>
            </div>
          </div>
        </section>}

        <Tabs defaultValue="calendar" className="px-5 pt-5">
          <TabsList className="mb-5 h-11 w-full rounded-2xl bg-[#e4effc] p-1">
            <TabsTrigger value="calendar" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#3988f2]"><CalendarDays />캘린더</TabsTrigger>
            <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#3988f2]"><List />기록 목록</TabsTrigger>
          </TabsList>
          {error && <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
          <TabsContent value="calendar">
            <div className="mb-3 flex gap-2" aria-label="캘린더 표시 기준">
              <CalendarViewButton active={calendarView === "point"} color="#55b8f5" onClick={() => setCalendarView("point")}>포인트</CalendarViewButton>
              <CalendarViewButton active={calendarView === "species"} color="#31c878" onClick={() => setCalendarView("species")}>어종</CalendarViewButton>
              <CalendarViewButton active={calendarView === "catch"} color="#ff6068" onClick={() => setCalendarView("catch")}>조과</CalendarViewButton>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-[#dfebfa] bg-white p-2 shadow-sm">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => {
                if (!date) return;
                const key = dateKey(date);
                if ((logsByDate[key] || []).length === 0) {
                  window.location.href = `/fishing_log/record/?date=${key}`;
                  return;
                }
                setSelectedDate(date);
              }} month={calendarMonth} onMonthChange={(month) => { setCalendarMonth(month); setSelectedDate(undefined); }} showOutsideDays={false} className="w-full bg-white p-2 [--cell-size:3.15rem]" classNames={{ month: "w-full", month_grid: "w-full", caption_label: "text-base font-extrabold text-[#29456f]", weekday: "flex-1 text-xs font-semibold text-[#8aa0be]", day: "group/day relative h-[4.5rem] w-full p-0 text-center" }} formatters={{ formatCaption: (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`, formatWeekdayName: (date) => ["일", "월", "화", "수", "목", "금", "토"][date.getDay()] }} components={{ DayButton: (props) => {
                const dayLogs = logsByDate[dateKey(props.day.date)] || [];
                const firstLog = dayLogs[0];
                const catchTotal = dayLogs.reduce((sum, log) => sum + Number(log.catchCount || 0), 0);
                const day = props.day.date.getDay();
                const holiday = holidays[dateKey(props.day.date)];
                const tide = tideNumber(props.day.date, settings.region);
                const preferred = preferredTides.has(tide);
                const dateColor = holiday || day === 0 ? "text-[#e45f72]" : day === 6 ? "text-[#438fd7]" : "text-[#536f93]";
                return <CalendarDayButton {...props} className="min-w-0 gap-0.5 rounded-xl px-0.5 py-1 hover:bg-[#eef6ff] data-[selected-single=true]:bg-[#dceeff] data-[selected-single=true]:text-[#29456f]" title={holiday || undefined}>
                  {!firstLog && <span className={`text-xs font-semibold ${dateColor}`}>{props.day.date.getDate()}</span>}
                  {firstLog ? <CalendarMarker view={calendarView} log={firstLog} catchTotal={catchTotal} /> : <span className="h-7" />}
                  <span className={preferred ? "rounded-full bg-[#fff1b8] px-1 text-[9px] font-extrabold text-[#b17800]" : "text-[9px] text-[#9aacc3]"}>{preferred ? "★ " : ""}{tideLabel(tide)}</span>
                </CalendarDayButton>;
              } }} />
            </div>
            <div className="mt-4">
              {selectedDate ? <><div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-[#29456f]">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 기록</h2><span className="text-sm text-[#8298b8]">{selectedLogs.length}건</span></div>{selectedLogs.length ? <LogCards logs={selectedLogs} money={money} /> : <div className="rounded-2xl border border-dashed border-[#bdd6f4] bg-white p-6 text-center text-sm text-[#8298b8]">이날은 아직 출조 기록이 없어요.</div>}</> : <div className="rounded-2xl bg-[#eaf4ff] px-4 py-3 text-center text-sm text-[#6e8caf]">표시가 있는 날짜를 누르면 출조 기록을 볼 수 있어요.</div>}
            </div>
            <p className="mt-3 text-center text-xs text-[#8aa0be]">빈 날짜를 누르면 바로 기록 · ★ 선호 물때 · {settings.region} 기준</p>
          </TabsContent>
          <TabsContent value="list">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-[#29456f]">최근 출조</h2><span className="text-sm text-[#8298b8]">총 {logs.length}건</span></div>
            {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#8298b8] shadow-sm">기록을 불러오는 중...</div> : logs.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-[#a7c9f5] bg-white px-6 py-10 text-center shadow-sm"><Anchor className="mx-auto size-9 text-[#4c98ef]" /><p className="mt-4 font-bold text-[#29456f]">첫 출조를 기록해보세요</p><p className="mt-1 text-sm text-[#8298b8]">기억보다 기록이 오래갑니다.</p></div> : <LogCards logs={logs} money={money} />}
          </TabsContent>
        </Tabs>

        {fishingSession ? (
          <>
            <div className={`${compactHeader ? "hidden" : "fixed"} left-1/2 top-3 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#173d67] px-4 py-2 text-xs font-bold text-white shadow-lg`}>
              <span className="size-2 animate-pulse rounded-full bg-[#ff6464]" />
              낚시 중 · {fishingSession.species}
              <button type="button" onClick={() => { if (confirm("낚시모드를 종료할까요?")) { stopFishingSession(); setFishingSession(null); } }} className="ml-1 text-white/70">종료</button>
            </div>
            <Button type="button" onClick={() => { window.location.href = "/fishing_log/hit/"; }} aria-label="히트 기록" className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] size-[4.5rem] rounded-full bg-[#ff6262] p-0 text-white shadow-xl shadow-[#ff6262]/30 hover:bg-[#f25555]">
              <span className="text-sm font-black">HIT</span>
            </Button>
          </>
        ) : (
          <Button type="button" onClick={openRecordPage} aria-label="출조 기록하기" className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] size-[4.5rem] rounded-full bg-gradient-to-r from-[#5e9bf2] to-[#61c5f3] p-0 text-white shadow-xl shadow-[#4d94e8]/30 hover:from-[#4f8ee8] hover:to-[#4db7ea]">
            <Plus className="size-8" />
          </Button>
        )}

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="rounded-[1.5rem] border-[#dbe9fa] bg-[#f7fbff] text-[#29456f]">
            <DialogHeader className="text-left"><DialogTitle>설정</DialogTitle><DialogDescription className="text-[#8298b8]">캘린더와 계정 설정을 관리합니다.</DialogDescription></DialogHeader>
            <form onSubmit={saveSettings} className="mt-2 space-y-5">
              <Field label="지역"><NativeSelect value={settings.region} onChange={(e) => setSettings({ ...settings, region: e.target.value as Region })} className="w-full">{regions.map((region) => <NativeSelectOption key={region} value={region}>{region}</NativeSelectOption>)}</NativeSelect></Field>
              <Field label="선호 물때 (1~15)"><Input required inputMode="text" placeholder="예: 1~5 또는 3, 4, 5, 10" value={settings.preferredTides} onChange={(e) => setSettings({ ...settings, preferredTides: e.target.value })} /><p className="text-xs leading-5 text-[#8aa0be]">범위는 1~5, 개별 숫자는 쉼표로 구분해주세요. 해당 날짜에 ★가 표시됩니다.</p></Field>
              <Button disabled={settingsSaving} type="submit" className="h-12 w-full rounded-xl bg-[#5e9bf2] font-extrabold text-white hover:bg-[#4f8ee8]">{settingsSaving ? "저장 중..." : "설정 저장"}</Button>
            </form>
            <div className="mt-1 border-t border-[#dbe8fa] pt-4"><p className="text-sm font-bold text-[#496789]">계정</p>{user ? <><p className="mt-1 truncate text-xs text-[#8298b8]">{user.email ?? "Google 계정"}</p><Button type="button" variant="outline" onClick={logout} className="mt-3 h-11 w-full rounded-xl border-[#c9def7] bg-white text-[#607a9e] hover:bg-[#eef6ff]"><LogOut className="size-4" />로그아웃</Button></> : <><p className="mt-1 text-xs leading-5 text-[#8298b8]">현재 기록은 이 기기에 저장됩니다. 로그인하면 계정으로 자동 이동됩니다.</p><Button type="button" onClick={login} className="mt-3 h-11 w-full rounded-xl bg-[#5e9bf2] font-bold text-white">Google로 로그인</Button></>}</div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return <main className="flex min-h-dvh items-center justify-center bg-[#eaf3ff] p-6"><div className="text-center"><p className="text-2xl font-black text-[#3988f2]">{title}</p><p className="mt-2 text-sm text-[#8298b8]">{description}</p></div></main>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-[#8aa0be]">{label}</p><p className="mt-1 truncate font-bold text-[#29456f]">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-sm text-[#496789]">{label}</Label>{children}</div>; }

function alignCalendarToLatest(logs: Log[], setMonth: (date: Date) => void) {
  const current = new Date();
  const currentMonthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  if (!logs.length || logs.some((log) => log.tripDate.startsWith(currentMonthKey))) return;
  const latest = logs[0].tripDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(latest)) return;
  const [year, month] = latest.split("-").map(Number);
  setMonth(new Date(year, month - 1, 1));
}

function CalendarViewButton({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${active ? "bg-[#dfe5ee] text-[#34445b] shadow-inner" : "bg-white text-[#71849d] shadow-sm"}`}><span className="size-3 rounded-[4px]" style={{ backgroundColor: color }} />{children}</button>;
}

function CalendarMarker({ view, log, catchTotal }: { view: CalendarView; log: Log; catchTotal: number }) {
  if (view === "point") {
    return <span className="flex h-10 max-w-full items-center gap-0.5 rounded-full bg-[#e8f4ff] px-2 text-[10px] font-black text-[#318dd0] opacity-100 shadow-sm"><span className="max-w-[2.3rem] truncate">{pointLabel(log.location)}</span>{catchTotal > 0 && <small className="text-[8px] font-bold text-[#7395b5]">+{catchTotal}</small>}</span>;
  }
  if (view === "catch") {
    return <span className="grid size-10 place-items-center rounded-full bg-[#ff6068] text-xs font-black text-white opacity-100 shadow-sm">{catchTotal}</span>;
  }
  return <span className="relative flex h-10 items-center justify-center opacity-100"><SpeciesBadge species={log.species} compact calendar />{catchTotal > 0 && <small className="absolute -bottom-0.5 -right-2 rounded-full bg-white/95 px-1 text-[8px] font-black text-[#697f9b] shadow-sm">+{catchTotal}</small>}</span>;
}

function RatingSummary({ label, value }: { label: string; value?: number | null }) {
  if (!value) return null;
  return <div className="flex items-center justify-between gap-2"><span>{label}</span><span className="flex items-center gap-0.5" aria-label={`${label} ${value}점`}>{[1, 2, 3, 4, 5].map((score) => <Star key={score} className={`size-3.5 ${score <= value ? "text-[#f5b83d]" : "text-[#d7e2ef]"}`} fill={score <= value ? "currentColor" : "none"} />)}</span></div>;
}

function SpeciesBadge({ species, compact = false, showName = false, calendar = false }: { species: string; compact?: boolean; showName?: boolean; calendar?: boolean }) {
  const character = speciesCharacters[species as SpeciesName] || speciesCharacters["우럭"];
  const compactSize = calendar ? "size-10" : "size-6";
  return <span className={`inline-flex items-center justify-center overflow-hidden font-bold ${compact ? `${compactSize} rounded-full ring-2 ring-white` : "gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs"}`} style={{ color: character.color, backgroundColor: character.bg }} title={species}><span aria-hidden className={compact ? `${compactSize} shrink-0` : "size-7 shrink-0"} style={{ backgroundImage: `url('${character.image}')`, backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "contain" }} />{showName && <span>{species}</span>}</span>;
}

function LogCards({ logs, money }: { logs: Log[]; money: Intl.NumberFormat }) {
  return <div className="space-y-3">{logs.map((log) => {
    const hasRatings = Boolean(log.boatCondition || log.captainSkill || log.mealRating);
    return <article key={log.id} className="rounded-[1.35rem] border border-[#e2edfb] bg-white p-4 shadow-sm shadow-[#5594df]/5">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs text-[#8298b8]"><CalendarDays className="size-3.5" />{log.tripDate}</div><h3 className="mt-2 flex items-center gap-2 text-lg font-bold text-[#29456f]"><SpeciesBadge species={log.species} />{log.species} <span className="text-[#3988f2]">{log.catchCount}마리</span></h3></div>{log.maxSize && <span className="rounded-full bg-[#e8f3ff] px-3 py-1 text-sm font-bold text-[#3988f2]">최대 {log.maxSize}cm</span>}</div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#607a9e]"><span className="flex items-center gap-2"><MapPin className="size-4 text-[#74a9e8]" />{log.location}</span><span className="flex items-center gap-2"><ShipWheel className="size-4 text-[#74a9e8]" />{log.boatName}</span><span className="flex items-center gap-2"><WalletCards className="size-4 text-[#74a9e8]" />{money.format(log.fee)}원</span><span className="flex items-center gap-2"><Waves className="size-4 text-[#74a9e8]" />{log.weather}{log.rig ? ` · ${log.rig}` : ""}</span></div>
      {hasRatings && <div className="mt-3 rounded-xl bg-[#f6faff] px-3 py-2.5 text-xs text-[#6f87a5]"><p className="mb-2 font-bold text-[#496789]">선사 컨디션</p><div className="space-y-1.5"><RatingSummary label="배 컨디션" value={log.boatCondition} /><RatingSummary label="선장님 조타 실력" value={log.captainSkill} /><RatingSummary label="간식/식사" value={log.mealRating} /></div></div>}
      {log.memo && <p className="mt-3 border-t border-[#e6effb] pt-3 text-sm leading-6 text-[#7c91ad]">{log.memo}</p>}
    </article>;
  })}</div>;
}
