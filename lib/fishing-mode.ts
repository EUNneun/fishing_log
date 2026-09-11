export type FishingModeSession = {
  id: string;
  tripId?: string;
  species: string;
  location?: string;
  startedAt: string;
  quickStart: boolean;
};

export type HitRecord = {
  id: string;
  sessionId: string;
  tripId?: string;
  species: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  caughtAt: string;
  rig?: string;
  bait?: string;
  depth?: number | null;
  size?: number | null;
  memo?: string;
};

const SESSION_KEY = "fishing_log_active_mode";
const HITS_KEY = "fishing_log_hits";

export function getFishingSession(): FishingModeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function startFishingSession(input: Omit<FishingModeSession, "id" | "startedAt">) {
  const session: FishingModeSession = {
    ...input,
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("fishing-mode-change"));
  return session;
}

export function stopFishingSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("fishing-mode-change"));
}

export function getHitRecords(): HitRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHitRecord(hit: HitRecord) {
  const hits = getHitRecords();
  hits.unshift(hit);
  localStorage.setItem(HITS_KEY, JSON.stringify(hits));
}

export function getSessionHits(sessionId: string) {
  return getHitRecords().filter((hit) => hit.sessionId === sessionId);
}
