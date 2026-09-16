"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, MessageCircle, Save } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { auth, db } from "@/lib/firebase";
import { importUserHits, parseImportedHits } from "@/lib/cloud-hits";

type Region = "서해" | "남해" | "동해" | "제주";
type UserSettings = { region: Region; preferredTides: string };
const regions: Region[] = ["서해", "남해", "동해", "제주"];
const defaultSettings: UserSettings = { region: "서해", preferredTides: "3,4,5,10,11" };

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser); setAuthReady(true);
    if (!nextUser) return;
    try {
      const snapshot = await getDoc(doc(db, "users", nextUser.uid, "settings", "main"));
      if (snapshot.exists()) setSettings({ ...defaultSettings, ...(snapshot.data() as Partial<UserSettings>) });
    } catch { setMessage("설정을 불러오지 못했습니다."); }
  }), []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); if (!user) return; setSaving(true); setMessage("");
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "main"), settings, { merge: true });
      setMessage("설정을 저장했습니다.");
    } catch { setMessage("설정을 저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  async function shareKakao() {
    const shareData = { title: "FISH LOG", text: "나의 출조 기록을 간편하게 관리하는 피싱로그", url: "https://fishing.eunlab.com/" };
    if (navigator.share) { try { await navigator.share(shareData); return; } catch { return; } }
    try { await navigator.clipboard.writeText(shareData.url); setMessage("피싱로그 주소를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요."); }
    catch { setMessage("공유 링크를 복사하지 못했습니다."); }
  }

  async function logout() { await signOut(auth); window.location.href = "/"; }

  async function importHits() {
    if (!user || importing) return;
    setImporting(true);
    setImportMessage("");
    try {
      const records = parseImportedHits(importText.trim());
      const count = await importUserHits(user, records);
      setImportMessage(`${records.length}건 확인: ${count}건을 클라우드에 가져왔습니다. 중복 ${records.length - count}건은 건너뛰었습니다.`);
      setImportText("");
    } catch (error) {
      setImportMessage(error instanceof SyntaxError ? "복사한 값이 JSON 형식인지 확인해주세요." :
        error instanceof Error && error.message.startsWith("HIT") ? error.message : "가져오기에 실패했습니다. 연결과 데이터 형식을 확인하고 다시 시도해주세요.");
    } finally { setImporting(false); }
  }

  if (!authReady) return <main className="min-h-dvh bg-[#eaf3ff] p-6 text-center text-[#8298b8]">로그인 정보를 확인하는 중입니다.</main>;
  if (!user) return <main className="min-h-dvh bg-[#eaf3ff] p-6 text-center text-[#29456f]">로그인이 필요합니다.</main>;

  return (
    <main className="min-h-dvh bg-[#eaf3ff] text-[#29456f]">
      <div className="mx-auto min-h-dvh max-w-md bg-[#f7fbff] pb-10 shadow-2xl shadow-[#4a8ee8]/15 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#dbe9fa] bg-[#f7fbff]/95 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={() => history.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#52749b] shadow-sm" aria-label="뒤로가기"><ArrowLeft className="size-5" /></button>
          <div><h1 className="text-xl font-extrabold">설정</h1></div>
        </header>

        <div className="space-y-5 px-5 py-5">
          {message && <div className="rounded-xl bg-[#eaf4ff] px-4 py-3 text-sm text-[#52749b]">{message}</div>}

          <form onSubmit={saveSettings} className="space-y-5 rounded-[1.5rem] border border-[#dfeafa] bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#496789]">지역 선택</Label>
              <NativeSelect value={settings.region} onChange={(e) => setSettings({ ...settings, region: e.target.value as Region })} className="w-full">
                {regions.map((region) => <NativeSelectOption key={region} value={region}>{region}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#496789]">선호 물때 (1~15)</Label>
              <Input required inputMode="text" placeholder="예: 1~5 또는 3, 4, 5, 10" value={settings.preferredTides} onChange={(e) => setSettings({ ...settings, preferredTides: e.target.value })} />
              <p className="text-xs leading-5 text-[#8aa0be]">범위는 1~5, 개별 숫자는 쉼표로 구분해주세요. 선호 물때는 날짜에 ★로 표시됩니다.</p>
            </div>
            <Button disabled={saving} type="submit" className="h-12 w-full rounded-xl bg-[#5e9bf2] font-extrabold text-white hover:bg-[#4f8ee8]"><Save className="size-4" />{saving ? "저장 중..." : "설정 저장"}</Button>
          </form>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-5 shadow-sm">
            <p className="text-sm font-extrabold text-[#496789]">공유</p>
            <p className="mt-1 text-xs leading-5 text-[#8aa0be]">친구에게 피싱로그 링크를 공유할 수 있습니다.</p>
            <Button type="button" onClick={shareKakao} className="mt-4 h-12 w-full rounded-xl bg-[#FEE500] font-extrabold text-[#191919] hover:bg-[#f5dc00]"><MessageCircle className="size-5" />카카오톡 공유하기</Button>
          </section>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-5 shadow-sm">
            <p className="text-sm font-extrabold text-[#496789]">예전 HIT 기록 가져오기</p>
            <p className="mt-1 text-xs leading-5 text-[#8aa0be]">주소가 바뀌기 전 브라우저 기록은 자동으로 읽을 수 없습니다. 예전 주소를 사용한 브라우저에서 개발자 도구(F12) → Application → Local Storage → eunneun.github.io → fishing_log_hits의 Value를 복사해 아래에 붙여넣으세요. 예전 사이트가 404여도 저장값은 확인할 수 있습니다.</p>
            <textarea aria-label="기존 HIT JSON 데이터" value={importText} onChange={e => setImportText(e.target.value)} placeholder="fishing_log_hits의 Value를 붙여넣으세요" rows={4} className="mt-3 w-full rounded-xl border border-[#c9def7] p-3 text-xs" />
            {importMessage && <p role="status" className="mt-2 text-xs leading-5 text-[#52749b]">{importMessage}</p>}
            <Button type="button" disabled={importing || !importText.trim()} onClick={importHits} className="mt-3 h-11 w-full rounded-xl bg-[#5e9bf2] font-extrabold text-white">{importing ? "가져오는 중..." : "HIT 가져오기"}</Button>
          </section>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-5 shadow-sm">
            <p className="text-sm font-extrabold text-[#496789]">계정</p>
            <p className="mt-1 truncate text-xs text-[#8298b8]">{user.email ?? "Google 계정"}</p>
            <Button type="button" variant="outline" onClick={logout} className="mt-4 h-11 w-full rounded-xl border-[#c9def7] bg-white text-[#607a9e] hover:bg-[#eef6ff]"><LogOut className="size-4" />로그아웃</Button>
          </section>
        </div>
      </div>
    </main>
  );
}
