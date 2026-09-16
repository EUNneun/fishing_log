"use client";

import { useEffect } from "react";

export default function SettingsRouteBridge() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button[aria-label="설정"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.href = "/settings/";
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
