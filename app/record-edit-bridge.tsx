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
        card.classList.add("relative");

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.logEditButton = "1";
        button.dataset.logId = match.id;
        button.setAttribute("aria-label", `${match.tripDate} 출조 기록 편집`);
        button.className = "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e6f7] bg-white text-[#6d89aa] shadow-sm transition hover:bg-[#eef6ff] active:scale-95";
        button.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        card.appendChild(button);
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

    const click = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const button = element?.closest<HTMLButtonElement>('button[data-log-edit-button="1"]');
      const id = button?.dataset.logId;
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.href = `/fishing_log/record/?id=${encodeURIComponent(id)}`;
    };

    document.addEventListener("click", click, true);
    return () => {
      unsubscribe();
      observer?.disconnect();
      document.removeEventListener("click", click, true);
    };
  }, []);

  return null;
}
