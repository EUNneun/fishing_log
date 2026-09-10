"use client";

import { useEffect } from "react";

export default function RecordEditBridge() {
  useEffect(() => {
    const prepareCards = () => {
      document.querySelectorAll<HTMLElement>('article[data-log-id]').forEach((card) => {
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", "출조 기록 편집");
        card.classList.add("cursor-pointer");
      });
    };

    const open = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const card = element?.closest<HTMLElement>('article[data-log-id]');
      const id = card?.dataset.logId;
      if (!id) return;
      window.location.href = `/fishing_log/record/?id=${encodeURIComponent(id)}`;
    };

    const click = (event: MouseEvent) => open(event.target);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const element = event.target instanceof Element ? event.target : null;
      if (!element?.closest('article[data-log-id]')) return;
      event.preventDefault(); open(event.target);
    };

    prepareCards();
    const observer = new MutationObserver(prepareCards);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", keydown, true);
    return () => { observer.disconnect(); document.removeEventListener("click", click, true); document.removeEventListener("keydown", keydown, true); };
  }, []);
  return null;
}
