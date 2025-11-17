import Script from "next/script";
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
  <details style={{ position:"relative" }}>
    <summary aria-label="menu" style={{ listStyle:"none", cursor:"pointer", border:"1px solid var(--border)", borderRadius:8, padding:"6px 10px" }}>☰</summary>
    <div style={{ position:"absolute", right:0, top:"100%", background:"var(--panel)", border:"1px solid var(--border)", borderRadius:8, padding:8, marginTop:6, minWidth:190 }}>
      <div style={{ padding:"4px 0" }}><Link href="/">ホーム</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/builder">社内ビルダー</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/user-builder">ユーザー用ビルダー</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/fill">入力フォーム</Link></div>
      <div style={{ padding:"4px 0" }}><Link href="/preview">プレビュー</Link></div>
    </div>
              <div style={{padding:"4px 0"}}><a href="/help">ヘルプ</a></div></details>
</nav>
          </div>
        <script dangerouslySetInnerHTML={{__html: `(function(){try{
  if (window.__menuCloser) return; window.__menuCloser = true;
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var d = document.querySelector('header details[open]');
    if (d) d.removeAttribute('open');
  }, true);
}catch(e){}})()`}} /></header>
<Script id="nav-close" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: "document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a"):null;if(a){var d=a.closest&&a.closest("header details");if(d)d.removeAttribute("open");}});" }} />

      var d = a.closest && a.closest('header details');
      if (d) d.removeAttribute('open');
    }
  });
</script>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}




