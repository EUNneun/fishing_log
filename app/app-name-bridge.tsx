"use client";

import { useEffect } from "react";

export default function AppNameBridge() {
  useEffect(() => {
    const replaceName = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node.nodeValue?.trim() === "FISH LOG" || node.nodeValue?.trim() === "피시로그") {
          node.nodeValue = node.nodeValue.replace(/FISH LOG|피시로그/g, "피싱로그");
        }
        node = walker.nextNode();
      }
    };

    replaceName();
    const observer = new MutationObserver(replaceName);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
