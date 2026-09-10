"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const OPEN_CHAT_URL = "https://open.kakao.com/o/sbFiV0Mi";
const SPECIES = ["꽃게", "참돔", "쭈꾸미", "갑오징어", "한치", "우럭"];

export default function SpeciesRequestBridge() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (pathname !== "/fishing_log" && pathname !== "/fishing_log/") return;

    const addRequestLink = () => {
      const containers = Array.from(document.querySelectorAll<HTMLElement>("div"));
      const container = containers.find((element) => {
        if (element.dataset.speciesRequestReady === "1") return false;
        const text = element.innerText;
        return element.classList.contains("flex-wrap") && SPECIES.every((name) => text.includes(name));
      });
      if (!container) return;

      container.dataset.speciesRequestReady = "1";
      const link = document.createElement("a");
      link.href = OPEN_CHAT_URL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "카카오톡 오픈채팅으로 어종 추가 요청");
      link.className = "inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed border-[#9fc8f5] bg-white px-3 py-1 text-xs font-bold text-[#5f89bb] transition active:scale-95";
      link.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg><span>어종 추가 요청</span>';
      container.appendChild(link);
    };

    addRequestLink();
    const observer = new MutationObserver(addRequestLink);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
