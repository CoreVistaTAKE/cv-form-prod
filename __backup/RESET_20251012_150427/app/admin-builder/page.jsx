'use client';
import { useRef, useState, useEffect } from "react";
import JSZip from "jszip";

function base64FromUtf8(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function stripFormPrefix(u) { return u.startsWith("form_") ? u.slice(5) : u; }

export default function AdminBuilder() {
  const [username, setUsername] = useState("form_PJ1");
  const [shortName, setShortName] = useState("PJ1");
  const [importedJson, setImportedJson] = useState(null);
  const [log, setLog] = useState("");
  const fileRef = useRef(null);
  const appendLog = (m) => setLog((p) => (p ? p + "\\n" + m : m));

  useEffect(() => { setShortName(stripFormPrefix(username)); }, [username]);

  function handleConfirmUser() {
    try {
      if (!/^[A-Za-z0-9_]+$/.test(username)) throw new Error("ユーザー名は英数字とアンダースコアのみ。例: form_PJ1");
      const s = stripFormPrefix(username);
      localStorage.setItem("admin.formUser", username);
      localStorage.setItem("admin.shortName", s);
      appendLog(`ユーザー名を確定: ${username}（URL短名: ${s}）`);
    } catch (e) { appendLog("確定エラー: " + (e?.message || String(e))); }
  }

  function handleImportClick() { fileRef.current?.click(); }
  async function handleFileSelected(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const obj = JSON.parse(await file.text()); setImportedJson(obj); appendLog(`インポート完了: ${file.name}`); }
    catch { appendLog("インポート失敗: JSON を確認してください。"); }
    finally { e.target.value = ""; }
  }
  function buildFormBaseJson() {
    if (importedJson) return importedJson;
    return { meta: { version: "1.0", user: username, exportedAt: new Date().toISOString() }, form: { title: "Base Form", fields: [] } };
  }
  async function generateZipBase64(formBaseJson) {
    const zip = new JSZip();
    const formFolder = zip.folder("form");
    formFolder.file("form_base.json", JSON.stringify(formBaseJson, null, 2));
    formFolder.file("schema.json", JSON.stringify({ version: "1.0", fields: [] }, null, 2));
    return await zip.generateAsync({ type: "base64" });
  }
  async function downloadJsonLocal(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  async function handleExport() {
    try {
      if (!/^[A-Za-z0-9_]+$/.test(username)) { appendLog("エクスポート中止: ユーザー名は英数字と_のみ"); return; }
      const formBaseJson = buildFormBaseJson();
      const localFileName = `${username}_form_base.json`;
      await downloadJsonLocal(localFileName, formBaseJson);
      appendLog(`ダウンロード完了: ${localFileName}`);

      const zipBase64 = await generateZipBase64(formBaseJson);
      const jsonBase64 = base64FromUtf8(JSON.stringify(formBaseJson));
      const thirdName = stripFormPrefix(username);

      const payload = {
        username,
        files: [
          { path: "/00_AllApps/user_form/form_base.zip", contentBase64: zipBase64, contentType: "application/zip" },
          { path: `/00_AllApps/user_form/${username}_form_base.json`, contentBase64: jsonBase64, contentType: "application/json" },
          { path: `/01_InternalTest/${username}/${thirdName}_form_base.json`, contentBase64: jsonBase64, contentType: "application/json" }
        ]
      };

      appendLog("OneDrive へ送信中…");
      const res = await fetch("/api/flows/save-files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      appendLog(data && data.ok === true ? 'SaveFilesToOneDrive 応答: {"ok": true}' : `SaveFilesToOneDrive 応答: ${JSON.stringify(data)}`);
    } catch (err) { appendLog(`エクスポート失敗: ${String(err)}`); }
  }

  return (
    <main style={{ maxWidth: 760, margin: "24px auto", fontFamily: "sans-serif" }}>
      <h1>Admin Builder</h1>

      <section style={{ border:"1px solid #ddd", padding:12, marginBottom:16 }}>
        <h2>ページ編集のフォーム設定</h2>
        <div style={{ display:"grid", gap:8 }}>
          <label>フォームユーザー（卸し先）：
            <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="form_PJ1" style={{ marginLeft:8, width:240 }}/>
          </label>
          <label>URL短名（自動）：
            <input value={shortName} readOnly style={{ marginLeft:8, width:140 }}/>
          </label>
          <div><button onClick={handleConfirmUser}>ユーザー名を確定</button></div>
        </div>
      </section>

      <section style={{ border:"1px solid #ddd", padding:12 }}>
        <h2>ユーザー用ベース Import / Export</h2>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={handleImportClick}>ユーザー用ベースをインポート</button>
          <button onClick={handleExport}>ユーザー用ベースをエクスポート</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" style={{ display:"none" }} onChange={handleFileSelected}/>
      </section>

      <pre style={{ background:"#f5f5f5", padding:12, whiteSpace:"pre-wrap", marginTop:16 }}>{log}</pre>
      <p style={{ color:"#666" }}>注意：Base64 は <b>data:</b> プレフィックス無し。URL 文字列に空白・改行・&gt; を含めない。</p>
    </main>
  );
}
