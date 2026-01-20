import type { Metadata } from "next";
import "./globals.css";
import "antd/dist/reset.css";

export const metadata: Metadata = {
  title: "关务AI+RPA智能申报系统",
  description: "智能化关务申报辅助系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
