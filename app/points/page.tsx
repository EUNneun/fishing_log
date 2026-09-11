"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { getHitRecords, type HitRecord } from "@/lib/fishing-mode";

declare global {
  interface Window { L?: any; }
}

type SelectedPoint = HitRecord | null;

export default function PointsPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [hits,setHits]=useState<HitRecord[]>([]);
  const [selected,setSelected]=useState<SelectedPoint>(null);
  const [mapError,setMapError]=useState("");

  const points = useMemo(() => hits.filter(hit => Number.isFinite(hit.latitude) && Number.isFinite(hit.longitude)), [hits]);

  useEffect(() => {
    setHits(getHitRecords());

    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const init = () => {
      if (!mapRef.current || !window.L || mapInstance.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl:false, attributionControl:true }).setView([36.3,127.8],7);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      L.control.zoom({ position:"topright" }).addTo(map);

      const currentHits = getHitRecords().filter(hit => Number.isFinite(hit.latitude) && Number.isFinite(hit.longitude));
      if (currentHits.length) {
        const bounds:any[] = [];
        currentHits.forEach((hit) => {
          const lat = hit.latitude as number;
          const lng = hit.longitude as number;
          bounds.push([lat,lng]);

          const icon = L.divIcon({
            className: "",
            html: '<div style="width:30px;height:30px;border-radius:50%;background:#18b96b;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.22);display:grid;place-items:center;color:white;font-size:15px;font-weight:900">★</div>',
            iconSize:[30,30],
            iconAnchor:[15,15]
          });

          const marker = L.marker([lat,lng],{icon}).addTo(map);
          marker.on("click",()=>setSelected(hit));
        });
        map.fitBounds(bounds,{padding:[34,34],maxZoom:13});
      }

      setTimeout(()=>map.invalidateSize(),100);
    };

    if (window.L) {
      init();
      return;
    }

    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load",init,{once:true});
      return () => existing.removeEventListener("load",init);
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = init;
    script.onerror = () => setMapError("지도를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
    document.body.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <main className="min-h-dvh bg-[#eef1f8]">
    <div className="relative mx-auto min-h-dvh max-w-[430px] overflow-hidden bg-[#e8f3fb]">
      <div ref={mapRef} className="absolute inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] top-0 z-0" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[400] px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between rounded-2xl bg-white/94 px-4 py-3 shadow-lg backdrop-blur">
          <div><p className="text-[10px] font-bold text-[#8a90a0]">MY HIT POINTS</p><h1 className="text-lg font-black text-[#2f3142]">포인트</h1></div>
          <div className="rounded-full bg-[#eef7f2] px-3 py-1.5 text-xs font-extrabold text-[#18a965]">{points.length} HIT</div>
        </div>
      </header>

      {mapError && <div className="absolute left-4 right-4 top-24 z-[450] rounded-xl bg-white px-4 py-3 text-sm text-red-600 shadow">{mapError}</div>}

      {points.length === 0 && !mapError && <div className="absolute left-1/2 top-1/2 z-[350] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-6 text-center shadow-lg">
        <MapPin className="mx-auto size-8 text-[#74a9e8]"/>
        <p className="mt-3 font-extrabold text-[#394154]">저장된 히트 포인트가 없습니다.</p>
        <p className="mt-1 text-xs leading-5 text-[#8a90a0]">낚시모드에서 HIT를 기록하면 GPS 위치가 이 지도에 쌓입니다.</p>
      </div>}

      {selected && <PointSheet hit={selected} onClose={()=>setSelected(null)} />}
    </div>
  </main>;
}

function PointSheet({hit,onClose}:{hit:HitRecord;onClose:()=>void}) {
  const date = new Date(hit.caughtAt);
  const dateText = date.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"});
  const timeText = date.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  return <section className="absolute inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[500] rounded-[22px] bg-white p-4 shadow-[0_10px_35px_rgba(30,55,85,.22)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-[#8a90a0]">{dateText} · {timeText}</p>
        <h2 className="mt-1 text-xl font-black text-[#2f3142]">{hit.species}</h2>
      </div>
      <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#f3f5f8] text-[#687086]"><X className="size-4"/></button>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {hit.rig && <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#607a9e]">#{hit.rig}</span>}
      {(hit.baits?.length ? hit.baits : hit.bait ? hit.bait.split(",").map(v=>v.trim()).filter(Boolean) : []).map(tag=><span key={tag} className="rounded-full bg-[#e8f3ff] px-2.5 py-1 text-xs font-bold text-[#3988f2]">#{tag}</span>)}
      {hit.depth ? <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#607a9e]">{hit.depth}m</span>:null}
    </div>
    {hit.tripId ? <a href={`/fishing_log/log-detail/?id=${encodeURIComponent(hit.tripId)}`} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3988f2] text-sm font-extrabold text-white"><Navigation className="size-4"/>출조기록 상세보기</a> :
    <div className="mt-4 rounded-xl bg-[#f6f7f9] px-3 py-3 text-center text-xs text-[#8a90a0]">빠른 낚시모드에서 저장된 포인트입니다.</div>}
  </section>;
}
