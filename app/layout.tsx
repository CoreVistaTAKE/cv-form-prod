export const metadata = { title: "CoreVista Form Builder", description: "No-code multi-page form builder" };
import "./globals.css";
import Link from "next/link";
import pkg from "../package.json";

export default function RootLayout({ children }:{children:React.ReactNode}){
  return (
    <html lang="ja">
      <body>
        <header className="header">
          <div className="header-inner">
            <div className="form-title">CoreVista Form Builder v{pkg.version}</div>
            <nav className="nav">
              <Link href="/">ホーム</Link>
              <Link href="/builder">社内ビルダー</Link>
              <Link href="/user-builder">ユーザー用ビルダー</Link>
              <Link href="/fill">入力（ウィザード）</Link>
              <Link href="/preview">プレビュー</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}