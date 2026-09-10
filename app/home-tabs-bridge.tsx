"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function HomeTabsBridge() {
  const pathname = usePathname() || "";
  useEffect(() => {
    if (pathname !== "/fishing_log" && pathname !== "/fishing_log/") return;
    const simplify = () => {
      document.querySelectorAll<HTMLElement>('[data-slot="tabs-list"]').forEach((list) => {
        if (list.innerText.includes("캘린더") && list.innerText.includes("기록 목록")) list.style.display = "none";
      });
    };
    simplify();
    const observer = new MutationObserver(simplify);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
