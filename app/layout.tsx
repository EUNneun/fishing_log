import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FISH LOG | 나의 낚시 기록",
  applicationName: "피싱로그",
  description: "장소, 선사, 선비, 어종, 채비, 날씨와 조과를 한곳에 기록합니다.",
  manifest: "/fishing_log/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "피싱로그",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
