import type { Metadata } from "next";
import "./globals.css";
import SettingsRouteBridge from "./settings-route-bridge";
import AppNameBridge from "./app-name-bridge";
import RecordEditBridge from "./record-edit-bridge";
import BottomNav from "./bottom-nav";
import HomeTabsBridge from "./home-tabs-bridge";
import VersionChecker from "./version-checker";

export const metadata: Metadata = {
  title: "피싱로그 | 나의 낚시 기록",
  applicationName: "피싱로그",
  description: "장소, 선사, 선비, 어종, 채비, 날씨와 조과를 한곳에 기록합니다.",
  manifest: "/fishing_log/manifest.webmanifest",
  appleWebApp: { capable: true, title: "피싱로그", statusBarStyle: "default" },
  icons: { icon: "/fishing_log/app-icon.svg", shortcut: "/fishing_log/app-icon.svg", apple: "/fishing_log/app-icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased"><VersionChecker /><SettingsRouteBridge /><AppNameBridge /><RecordEditBridge /><HomeTabsBridge />{children}<BottomNav /></body></html>;
}
