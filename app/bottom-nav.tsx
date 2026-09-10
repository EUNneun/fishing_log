"use client";

import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ClipboardList } from "lucide-react";

const items = [
  { href: "/fishing_log/", label: "홈", icon: CalendarDays, match: (p: string) => p === "/fishing_log" || p === "/fishing_log/" },
  { href: "/fishing_log/logs/", label: "기록", icon: ClipboardList, match: (p: string) => p.includes("/logs") },
  { href: "/fishing_log/report/", label: "리포트", icon: BarChart3, match: (p: string) => p.includes("/report") },
];

export default function BottomNav() {
  const pathname = usePathname() || "";
  if (pathname.includes("/record") || pathname.includes("/settings")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] border-t border-[#e3e7f0] bg-white/95 px-5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur" aria-label="주요 메뉴">
      <div className="grid grid-cols-3">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return <a key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${active ? "text-[#3988f2]" : "text-[#8a90a0]"}`} aria-current={active ? "page" : undefined}><Icon className={`size-5 ${active ? "stroke-[2.5]" : "stroke-2"}`} /><span>{label}</span></a>;
        })}
      </div>
    </nav>
  );
}
