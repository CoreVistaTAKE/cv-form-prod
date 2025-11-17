import Script from "next/script";
export const metadata = { title: "CoreVista Form Builder", description: "No-code multi-page form builder" };
import "./globals.css";
import Link from "next/link";
import pkg from "../package.json";

export default function RootLayout({ children }:{children:React.ReactNode}){
  return (
    <html lang="ja">
      <body>
            <Script id="details-closer" strategy="afterInteractive"
    dangerouslySetInnerHTML={{
      __html: `(function(){
        function closeAll(target){
          var opens = document.querySelectorAll('details[open]');
          for (var i=0;i<opens.length;i++){
            var d = opens[i];
            if (!target || !d.contains(target)) d.removeAttribute('open');
          }
        }
        document.addEventListener('click', function(e){
          var t = e.target;
          // 外クリック
          closeAll(t);
          // a / button / [role=menuitem] / summary クリックでも close
          var el = t instanceof Node ? t.closest('a,button,[role="menuitem"],summary') : null;
          if (el){ closeAll(null); }
        }, true);
      })();`
    }}
  /><header className="header">
          <div className="header-inner">
            <div className="form-title">CoreVista Form Builder v{pkg.version}</div>
            <nav className="nav">
  <details style={{ position:"relative" }}>
    <summary aria-label="menu" style={{ listStyle:"none", cursor:"pointer", border:"1px solid var(--border)", borderRadius:8, padding:"6px 10px" }}>☰</summary>
    <div style={{ position:"absolute", right:0, top:"100%", background:"var(--panel)", border:"1px solid var(--border)", borderRadius:8, padding:8, marginTop:6, minWidth:190 }}>
      <div style={{ padding:"4px 0" }}><Link href="/">ホーム</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/builder">社内ビルダー</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/user-builder">ユーザー用ビルダー</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/fill">入力（ウィザード）</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/preview">プレビュー</Link></div>
    </div>
  </details>
</nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}




