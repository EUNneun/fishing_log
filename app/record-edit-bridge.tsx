"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type LogRef = { id: string; tripDate: string; location: string; species: string; catchCount: number };

export default function RecordEditBridge() {
  useEffect(() => {
    let logs: LogRef[] = [];
    let observer: MutationObserver | null = null;

    const prepareCards = () => {
      document.querySelectorAll<HTMLElement>("article").forEach((card) => {
        if (card.dataset.editReady === "1") return;
        const text = card.innerText;
        const match = logs.find((log) => text.includes(log.tripDate) && text.includes(log.location) && text.includes(log.species) && text.includes(`${log.catchCount}마리`));
        if (!match) return;
        card.dataset.logId = match.id;
        card.dataset.editReady = "1";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `${match.tripDate} 출조 기록 편집`);
        card.classList.add("cursor-pointer", "transition", "hover:border-[#a9cef7]");
      });
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, "users", user.uid, "logs"));
      logs = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<LogRef, "id">) }));
      prepareCards();
      observer = new MutationObserver(prepareCards);
      observer.observe(document.body, { childList: true, subtree: true });
    });

    const open = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const card = element?.closest<HTMLElement>('article[data-log-id]');
      const id = card?.dataset.logId;
      if (id) window.location.href = `/fishing_log/record/?id=${encodeURIComponent(id)}`;
    };
    const click = (event: MouseEvent) => open(event.target);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const element = event.target instanceof Element ? event.target : null;
      if (!element?.closest('article[data-log-id]')) return;
      event.preventDefault(); open(event.target);
    };
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", keydown, true);
    return () => { unsubscribe(); observer?.disconnect(); document.removeEventListener("click", click, true); document.removeEventListener("keydown", keydown, true); };
  }, []);
  return null;
}
