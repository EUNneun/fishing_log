import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

export type GuestSettings = { region: "서해" | "남해" | "동해" | "제주"; preferredTides: string };
export type StoredLog = Record<string, unknown> & { id: string; tripDate?: string };

const LOGS_KEY = "fishing_log_guest_logs";
const SETTINGS_KEY = "fishing_log_guest_settings";
const MIGRATED_KEY = "fishing_log_guest_migrated";

export function getGuestLogs<T extends StoredLog = StoredLog>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestLog<T extends StoredLog>(log: T) {
  const logs = getGuestLogs<T>();
  const index = logs.findIndex((item) => item.id === log.id);
  if (index >= 0) logs[index] = log;
  else logs.push(log);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getGuestLog<T extends StoredLog = StoredLog>(id: string): T | null {
  return getGuestLogs<T>().find((item) => item.id === id) ?? null;
}

export function getGuestSettings(defaults: GuestSettings): GuestSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveGuestSettings(settings: GuestSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function createGuestId() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function migrateGuestData(user: User) {
  if (typeof window === "undefined") return { migrated: 0 };
  const marker = localStorage.getItem(MIGRATED_KEY);
  if (marker === user.uid) return { migrated: 0 };

  const guestLogs = getGuestLogs();
  let migrated = 0;
  for (const log of guestLogs) {
    const { id, ...data } = log;
    await setDoc(doc(db, "users", user.uid, "logs", id), { ...data, migratedFromGuest: true, updatedAt: serverTimestamp() }, { merge: true });
    migrated += 1;
  }

  const settingsRaw = localStorage.getItem(SETTINGS_KEY);
  if (settingsRaw) {
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "main"), JSON.parse(settingsRaw), { merge: true });
    } catch {}
  }

  if (migrated > 0) localStorage.removeItem(LOGS_KEY);
  localStorage.setItem(MIGRATED_KEY, user.uid);
  return { migrated };
}

export async function getCloudLogs<T extends StoredLog = StoredLog>(user: User): Promise<T[]> {
  const snapshot = await getDocs(collection(db, "users", user.uid, "logs"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
}
