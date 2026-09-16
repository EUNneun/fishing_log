"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { loadHitRecords } from "@/lib/cloud-hits";
import type { HitRecord } from "@/lib/fishing-mode";

function hasPoint(hit: HitRecord) {
  if (hit.latitude == null || hit.longitude == null) return false;
  const latitude = Number(hit.latitude);
  const longitude = Number(hit.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export function useTripPoints() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let request = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++request;
      setReady(false);
      setError("");
      try {
        const result = await loadHitRecords(user);
        if (current !== request) return;
        const next: Record<string, number> = {};
        for (const hit of result.hits) {
          if (hit.tripId && hasPoint(hit)) next[hit.tripId] = (next[hit.tripId] ?? 0) + 1;
        }
        setCounts(next);
        setError(result.error);
      } catch {
        if (current !== request) return;
        setError("포인트 정보를 확인할 수 없습니다.");
      } finally {
        if (current === request) setReady(true);
      }
    });
    return () => { request++; unsubscribe(); };
  }, []);

  return { counts, ready, error };
}

export function TripPointLabel({ tripId, counts, ready, error }: {
  tripId: string; counts: Record<string, number>; ready: boolean; error: string;
}) {
  const count = counts[tripId] ?? 0;
  const label = !ready ? "포인트 확인 중" : error && count === 0 ? "포인트 확인 필요" : count ? `HIT 포인트 ${count}개` : "포인트 없음";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${count ? "bg-[#e8f3ff] text-[#3988f2]" : "bg-[#f1f3f7] text-[#8994a5]"}`}>{label}</span>;
}
