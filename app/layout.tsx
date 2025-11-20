// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CV-FormLink",
  description: "建物点検フォーム自動化（CV-FormLink）",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* グローバルなヘッダ/タイル等は使わない（削除済みコンポーネントへの依存を排除） */}
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
