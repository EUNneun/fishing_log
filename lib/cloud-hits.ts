import type { User } from "firebase/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { clearHitRecords, getHitRecords, HITS_KEY, type HitRecord } from "@/lib/fishing-mode";

const OWNER_KEY = "fishing_log_hits_migrated_owner";
const pendingKey = (uid: string) => `fishing_log_hits_pending_${uid}`;

function readPending(uid: string): HitRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(pendingKey(uid)) || "[]");
    return Array.isArray(parsed) ? parsed as HitRecord[] : [];
  } catch { return []; }
}

function writePending(uid: string, hits: HitRecord[]) {
  if (hits.length) localStorage.setItem(pendingKey(uid), JSON.stringify(hits));
  else localStorage.removeItem(pendingKey(uid));
}

function cloudHitRef(user: User, id: string) {
  return doc(db, "users", user.uid, "hits", id);
}

function isValidHit(hit: HitRecord) {
  return typeof hit.id === "string" && /^hit-[a-zA-Z0-9-]+$/.test(hit.id)
    && typeof hit.species === "string" && typeof hit.caughtAt === "string";
}

function cloudHitData(hit: HitRecord) {
  // Firestore refuses undefined fields; keep the fields used by the HIT screens.
  return Object.fromEntries(Object.entries({
    sessionId: hit.sessionId, tripId: hit.tripId, species: hit.species,
    caughtAt: hit.caughtAt, latitude: hit.latitude, longitude: hit.longitude,
    accuracy: hit.accuracy, rig: hit.rig, bait: hit.bait, baits: hit.baits,
    depth: hit.depth, size: hit.size, memo: hit.memo,
  }).filter(([, value]) => value !== undefined));
}

async function writeCloudHit(user: User, hit: HitRecord) {
  if (!isValidHit(hit)) throw new Error("HIT 기록 형식이 올바르지 않습니다.");
  await setDoc(cloudHitRef(user, hit.id), cloudHitData(hit));
}

// Legacy HIT records had no account owner. Claim them only for the first signed-in
// account on this browser, and leave the original data untouched until every write succeeds.
async function migrateLegacyHits(user: User) {
  const owner = localStorage.getItem(OWNER_KEY);
  if (owner && owner !== user.uid) return;
  const hits = getHitRecords();
  if (!hits.length) return;
  for (const hit of hits) await writeCloudHit(user, hit);
  localStorage.setItem(OWNER_KEY, user.uid);
  clearHitRecords();
}

async function flushPendingHits(user: User) {
  for (const hit of readPending(user.uid)) {
    await writeCloudHit(user, hit);
    writePending(user.uid, readPending(user.uid).filter((item) => item.id !== hit.id));
  }
}

function mergeHits(cloud: HitRecord[], pending: HitRecord[]) {
  return [...new Map([...cloud, ...pending].map((hit) => [hit.id, hit])).values()];
}

export async function loadHitRecords(user: User | null): Promise<{ hits: HitRecord[]; error: string }> {
  if (!user) return { hits: getHitRecords(), error: "" };
  let error = "";
  try { await migrateLegacyHits(user); await flushPendingHits(user); }
  catch { error = "일부 HIT가 브라우저에 임시 저장돼 있습니다. 연결되면 다시 동기화합니다."; }

  const pending = readPending(user.uid);
  try {
    const snap = await getDocs(collection(db, "users", user.uid, "hits"));
    const cloud = snap.docs.map((item) => ({ ...item.data(), id: item.id } as HitRecord));
    return { hits: mergeHits(cloud, mergeHits(pending, error ? localHitsFor(user) : [])), error };
  } catch {
    // Never show a blank map as though remote data were deleted when the read fails.
    return { hits: mergeHits(pending, localHitsFor(user)), error: "클라우드 HIT를 불러오지 못했습니다. 연결을 확인해주세요." };
  }
}

function localHitsFor(user: User) {
  const owner = localStorage.getItem(OWNER_KEY);
  return !owner || owner === user.uid ? getHitRecords() : [];
}

export async function saveUserHit(user: User, hit: HitRecord) {
  const pending = readPending(user.uid);
  writePending(user.uid, [...pending.filter((item) => item.id !== hit.id), hit]);
  await writeCloudHit(user, hit);
  writePending(user.uid, readPending(user.uid).filter((item) => item.id !== hit.id));
}

export function removePendingTripHits(user: User, tripId: string) {
  writePending(user.uid, readPending(user.uid).filter((hit) => hit.tripId !== tripId));
  if (localStorage.getItem(OWNER_KEY) === user.uid) {
    const remaining = getHitRecords().filter((hit) => hit.tripId !== tripId);
    localStorage.setItem(HITS_KEY, JSON.stringify(remaining));
  }
}

export function parseImportedHits(raw: string): HitRecord[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("HIT 데이터는 JSON 배열이어야 합니다.");
  if (parsed.length > 2000) throw new Error("한 번에 최대 2,000건까지 가져올 수 있습니다.");
  const hits = parsed as HitRecord[];
  if (!hits.every(isValidHit)) throw new Error("HIT 데이터 형식이 올바르지 않습니다.");
  return hits;
}

export async function importUserHits(user: User, hits: HitRecord[]) {
  // Import is explicit because old localStorage records have no user ownership.
  const existing = await getDocs(collection(db, "users", user.uid, "hits"));
  const ids = new Set(existing.docs.map((item) => item.id));
  let imported = 0;
  for (const hit of hits) {
    if (ids.has(hit.id)) continue;
    await writeCloudHit(user, hit);
    ids.add(hit.id);
    imported++;
  }
  return imported;
}
