import "./globals.css";
import type { Metadata } from "next";
import MainHeader from "./_components/MainHeader";

export const metadata: Metadata = {
  title: "CV-FormLink",
  description: "建物点検フォーム自動化 / CV-FormLink",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <MainHeader />
        <main className="container" style={{ paddingTop: 12 }}>{children}</main>
      </body>
    </html>
  );
}
