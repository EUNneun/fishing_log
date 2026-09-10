"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, MessageCircle, Save } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";

type UserSettings = { region: "서해" | "남해" | "동해" | "제주"; preferredTides: string };
const defaultSettings: UserSettings = { region: "서해", preferredTides: "3,4,5,10,11" };

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
    if (!nextUser) return;
    try {
      const snapshot = await getDoc(doc(db, "users", nextUser.uid, "settings", "main"));
      if (snapshot.exists()) setSettings({ ...defaultSettings, ...(snapshot.data() as Partial<UserSettings>) });
    } catch { setMessage("설정을 불러오지 못했습니다."); }
  }), []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setMessage("");
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "main"), settings, { merge: true });
      setMessage("설정을 저장했습니다.");
    } catch { setMessage("설정을 저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  async function shareKakao() {
    const shareData = {
      title: "FISH LOG",
      text: "나의 출조 기록을 간편하게 관리하는 피싱로그",
      url: "https://eunneun.github.io/fishing_log/",
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { return; }
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setMessage("피싱로그 주소를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요.");
    } catch { setMessage("공유 링크를 복사하지 못했습니다."); }
  }

  async function logout() {
    await signOut(auth);
    window.location.href = "/fishing_log/";
  }

  if (!authReady) return <main className="min-h-dvh bg-[#eaf3ff] p-6 text-center text-[#8298b8]">로그인 정보를 확인하는 중입니다.</main>;
  if (!user) return <main className="min-h-dvh bg-[#eaf3ff] p-6 text-center text-[#29456f]">로그인이 필요합니다.</main>;

  return (
    <main className="min-h-dvh bg-[#eaf3ff] text-[#29456f]">
      <div className="mx-auto min-h-dvh max-w-md bg-[#f7fbff] pb-10 shadow-2xl shadow-[#4a8ee8]/15 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#dbe9fa] bg-[#f7fbff]/95 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={() => history.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#52749b] shadow-sm" aria-label="뒤로가기"><ArrowLeft className="size-5" /></button>
          <div><h1 className="text-xl font-extrabold">설정</h1><p className="mt-0.5 text-xs text-[#8aa0be]">캘린더와 계정 설정을 관리합니다.</p></div>
        </header>

        <div className="space-y-5 px-5 py-5">
          {message && <div className="rounded-xl bg-[#eaf4ff] px-4 py-3 text-sm text-[#52749b]">{message}</div>}

          <form onSubmit={saveSettings} className="space-y-5 rounded-[1.5rem] border border-[#dfeafa] bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-extrabold text-[#496789]">캘린더 설정</p>
              <p className="mt-1 text-xs leading-5 text-[#8aa0be]">지역은 현재 저장된 값을 그대로 사용하며 이 화면에서는 선택창을 노출하지 않습니다.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#496789]">선호 물때 (1~15)</Label>
              <Input required inputMode="text" placeholder="예: 1~5 또는 3, 4, 5, 10" value={settings.preferredTides} onChange={(e) => setSettings({ ...settings, preferredTides: e.target.value })} />
              <p className="text-xs leading-5 text-[#8aa0be]">범위는 1~5, 개별 숫자는 쉼표로 구분해주세요. 해당 날짜에 ★가 표시됩니다.</p>
            </div>
            <Button disabled={saving} type="submit" className="h-12 w-full rounded-xl bg-[#5e9bf2] font-extrabold text-white hover:bg-[#4f8ee8]"><Save className="size-4" />{saving ? "저장 중..." : "설정 저장"}</Button>
          </form>

          <section className="rounded-[1.5rem] border border-[#dfeafa] bg-white p-5 shadow-sm">
            <p className="text-sm font-extrabold text-[#496789]">공유</p>
            <p className="mt-1 text-xs leading-5 text-[#8aa0be]">친구에게 피싱로그 링크를 공유할 수 있습니다.</p>
            <Button type="button" onClick={shareKakao} className="mt-4 h-12 w-full rounded-xl bg-[#FEE500] font-extrabold text-[#191919] hover:bg-[#f5dc00]"><MessageCircle className="size-5" />카카오톡 공유하기</Button>
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
