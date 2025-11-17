'use client';
import { useEffect, useMemo, useState } from "react";
const VAR_ROOT = "/01_InternalTest";
const VAR_HOST = "https://www.form.visone-ai.jp";
const VAR_SEQ_FINAL = "001";

export default function UserBuilder() {
  const [varUser, setVarUser] = useState("form_PJ1");
  const [shortName, setShortName] = useState("PJ1");
  const [savedName, setSavedName] = useState("");
  const [log, setLog] = useState("");
  const appendLog = (m) => setLog((p)=> (p ? p+"\\n"+m : m));

  useEffect(() => {
    try {
      const u = localStorage.getItem("admin.formUser") || "form_PJ1";
      const s = localStorage.getItem("admin.shortName") || (u.startsWith("form_") ? u.slice(5) : u);
      setVarUser(u); setShortName(s);
    } catch {}
  }, []);

  const siteRel = useMemo(() => {
    const root = "/Documents" + VAR_ROOT;
    const user = root + "/" + varUser;
    const bldg = user + "/" + [varUser, VAR_SEQ_FINAL, savedName || "未設定"].join("_");
    return { root, user, bldg, form: bldg+"/form", reports: bldg+"/reports", template: bldg+"/reports/template", originals: bldg+"/reports/originals", pdf: bldg+"/reports/pdf" };
  }, [varUser, savedName]);

  const formUrl = useMemo(() => {
    if (!savedName) return "";
    const q = new URLSearchParams({ user: varUser, seq: VAR_SEQ_FINAL, bldg: savedName, name: shortName });
    return `${VAR_HOST}/f?${q.toString()}`;
  }, [varUser, savedName, shortName]);

  function validateInputs() {
    if (!/^[A-Za-z0-9_]+$/.test(varUser)) throw new Error("フォームユーザー名が不正（Admin で確定してください）");
    if (!savedName) throw new Error("フォームの保存名（フォルダ名）を入力してください。");
    if (/[\\/:*?"<>|]/.test(savedName)) throw new Error('保存名に使用不可の文字: \\ / : * ? " < > |');
  }

  async function handleCreateAll() {
    try {
      validateInputs();
      const payload = { username: varUser, building: savedName, seq: VAR_SEQ_FINAL, host: "https://www.form.visone-ai.jp" };
      appendLog(`CreateFormFolder 送信: ${JSON.stringify(payload)}`);

      const r = await fetch("/api/flows/create-form-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      const bldgName = [varUser, VAR_SEQ_FINAL, savedName].join("_");
      appendLog(`フォーム一式の場所を準備: ${bldgName}`);
      appendLog(`Flow 応答: ${JSON.stringify(j)}`);
    } catch (e) { appendLog("エラー: " + (e?.message || String(e))); }
  }

  return (
    <main style={{ maxWidth: 760, margin: "24px auto", fontFamily: "sans-serif" }}>
      <h1>User Builder（フォームの設定）</h1>
      <section style={{ border:"1px solid #ddd", padding:12, marginBottom:16 }}>
        <div style={{ display:"grid", gap:8 }}>
          <label>フォームユーザー（卸し先）：
            <input value={varUser} readOnly style={{ marginLeft:8, width:240 }}/>
          </label>
          <label>URL短名（自動）：
            <input value={shortName} readOnly style={{ marginLeft:8, width:140 }}/>
          </label>
          <label>フォームの保存名（フォルダ名・日本語OK）：
            <input value={savedName} onChange={(e)=>setSavedName(e.target.value)} placeholder="テストビルA" style={{ marginLeft:8, width:320 }}/>
          </label>
          <div><button onClick={handleCreateAll}>フォーム一式を新規作成</button></div>
        </div>
      </section>
      <section style={{ border:"1px solid #ddd", padding:12 }}>
        <div>フォームURL（user, seq=001, bldg=保存名, name=短名）</div>
        <input value={formUrl} readOnly style={{ width:"100%" }}/>
      </section>
      <pre style={{ background:"#f5f5f5", padding:12, whiteSpace:"pre-wrap", marginTop:12 }}>{log}</pre>
      <p style={{ color:"#666" }}>注意：URL に空白・改行・&gt; は不可。保存名の禁止文字（\\ / : * ? " &lt; &gt; |）に注意。</p>
    </main>
  );
}
