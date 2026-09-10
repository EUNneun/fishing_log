"use client";

import { useEffect } from "react";

const STORAGE_KEY = "fishing-log-app-version";
const VERSION_URL = "/fishing_log/version.json";
const CHECK_INTERVAL_MS = 60_000;

export default function VersionChecker() {
  useEffect(() => {
    let lastCheckedAt = 0;
    let disposed = false;

    async function checkVersion(force = false) {
      const now = Date.now();
      if (!force && now - lastCheckedAt < CHECK_INTERVAL_MS) return;
      lastCheckedAt = now;

      try {
        const response = await fetch(`${VERSION_URL}?t=${now}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;

        const data = (await response.json()) as { version?: string };
        const remoteVersion = data.version?.trim();
        if (!remoteVersion || disposed) return;

        const localVersion = window.localStorage.getItem(STORAGE_KEY);
        if (!localVersion) {
          window.localStorage.setItem(STORAGE_KEY, remoteVersion);
          return;
        }

        if (localVersion !== remoteVersion) {
          window.localStorage.setItem(STORAGE_KEY, remoteVersion);
          const url = new URL(window.location.href);
          url.searchParams.set("appv", remoteVersion);
          window.location.replace(url.toString());
        }
      } catch {
        // 네트워크가 불안정하거나 오프라인이면 현재 버전을 그대로 사용합니다.
      }
    }

    const handleVisible = () => {
      if (document.visibilityState === "visible") void checkVersion(true);
    };

    const handlePageShow = () => void checkVersion(true);

    void checkVersion(true);
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
