"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { MapPin, Navigation, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { loadHitRecords } from "@/lib/cloud-hits";
import { type HitRecord } from "@/lib/fishing-mode";

type LatLng = [number, number];
type LeafletMap = {
  setView: (center: LatLng, zoom: number) => LeafletMap;
  fitBounds: (bounds: LatLng[], options: { padding: LatLng; maxZoom: number }) => void;
  invalidateSize: () => void;
  remove: () => void;
};
type LeafletMarker = { on: (event: string, handler: () => void) => void; remove: () => void };
type LeafletApi = {
  map: (element: HTMLDivElement, options: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  control: { zoom: (options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void } };
  divIcon: (options: Record<string, unknown>) => unknown;
  marker: (position: LatLng, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => LeafletMarker };
};

declare global {
  interface Window { L?: LeafletApi; }
}

type SelectedPoint = HitRecord | null;
type MappableHit = HitRecord & { latitude: number; longitude: number };

const speciesMarkerIcons: Record<string, string> = {
  "꽃게": "crab.svg",
  "참돔": "seabream.svg",
  "쭈꾸미": "webfoot.svg",
  "갑오징어": "cuttlefish.svg",
  "문어": "octopus.svg",
  "한치": "squid.svg",
  "우럭": "rockfish.svg",
  "가자미": "flounder.svg",
};

function speciesMarkerPath(species: string) {
  return `/species-icons/${speciesMarkerIcons[species] ?? "rockfish.svg"}`;
}

function normalizePoints(hits: HitRecord[]): MappableHit[] {
  return hits.flatMap((hit) => {
    if (hit.latitude == null || hit.longitude == null) return [];
    const latitude = Number(hit.latitude);
    const longitude = Number(hit.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    return [{ ...hit, latitude, longitude }];
  });
}

function drawMarkers(map: LeafletMap, L: LeafletApi, points: MappableHit[], markers: LeafletMarker[], select: (hit: HitRecord) => void) {
  markers.forEach((marker) => marker.remove());
  markers.length = 0;
  if (!points.length) return;
  const bounds: LatLng[] = [];
  const seenPositions = new Map<string, number>();
  points.forEach((hit) => {
    const [lat, lng] = spreadMarkerPosition(hit, seenPositions);
    bounds.push([lat, lng]);
    const markerImage = speciesMarkerPath(hit.species);
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:44px;height:44px;border-radius:50%;background:#f2f8ff;border:3px solid white;box-shadow:0 3px 10px rgba(27,65,105,.28);display:grid;place-items:center;overflow:hidden"><img src="${markerImage}" alt="" style="display:block;width:40px;height:40px;object-fit:contain" /></div>`,
      iconSize: [44, 44], iconAnchor: [22, 22],
    });
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    marker.on("click", () => select(hit));
    markers.push(marker);
  });
  map.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 });
}

function spreadMarkerPosition(hit: MappableHit, seen: Map<string, number>) {
  const key = `${hit.latitude.toFixed(5)},${hit.longitude.toFixed(5)}`;
  const overlapIndex = seen.get(key) ?? 0;
  seen.set(key, overlapIndex + 1);
  if (overlapIndex === 0) return [hit.latitude, hit.longitude] as [number, number];

  const angle = ((overlapIndex - 1) % 6) * (Math.PI / 3);
  const ring = Math.floor((overlapIndex - 1) / 6) + 1;
  const radius = 0.00045 * ring;
  return [
    hit.latitude + Math.cos(angle) * radius,
    hit.longitude + (Math.sin(angle) * radius) / Math.max(Math.cos(hit.latitude * Math.PI / 180), 0.4),
  ] as [number, number];
}

export default function PointsPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const markerInstances = useRef<LeafletMarker[]>([]);
  const pointsRef = useRef<MappableHit[]>([]);
  const [hits,setHits]=useState<HitRecord[]>([]);
  const [selected,setSelected]=useState<SelectedPoint>(null);
  const [mapError,setMapError]=useState("");
  const [dataError,setDataError]=useState("");
  const [loading,setLoading]=useState(true);

  const points = useMemo(() => normalizePoints(hits), [hits]);

  useEffect(() => {
    let active = true;
    let request = 0;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const current = ++request;
      setLoading(true);
      setHits([]);
      void loadHitRecords(user).then(({ hits: loaded, error }) => {
        if (!active || current !== request) return;
        setHits(loaded);
        setDataError(error);
      }).finally(() => { if (active && current === request) setLoading(false); });
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    pointsRef.current = points;
    if (mapInstance.current && window.L) drawMarkers(mapInstance.current, window.L, points, markerInstances.current, setSelected);
  }, [points]);

  useEffect(() => {

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

      drawMarkers(map, L, pointsRef.current, markerInstances.current, setSelected);

      setTimeout(()=>map.invalidateSize(),100);
    };

    const cleanup = () => {
      markerInstances.current = [];
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
    if (window.L) { init(); return cleanup; }

    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load",init,{once:true});
      return () => { existing.removeEventListener("load",init); cleanup(); };
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = init;
    script.onerror = () => setMapError("지도를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
    document.body.appendChild(script);

    return cleanup;
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

      {(mapError || dataError) && <div className="absolute left-4 right-4 top-24 z-[450] rounded-xl bg-white px-4 py-3 text-sm text-red-600 shadow">{mapError || dataError}</div>}

      {!loading && points.length === 0 && !mapError && !dataError && <div className="absolute left-1/2 top-1/2 z-[350] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-6 text-center shadow-lg">
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
    {hit.tripId ? <a href={`/log-detail/?id=${encodeURIComponent(hit.tripId)}`} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3988f2] text-sm font-extrabold text-white"><Navigation className="size-4"/>출조기록 상세보기</a> :
    <div className="mt-4 rounded-xl bg-[#f6f7f9] px-3 py-3 text-center text-xs text-[#8a90a0]">빠른 낚시모드에서 저장된 포인트입니다.</div>}
  </section>;
}
