"use client";
import { useBuilderStore, FieldType } from "@/store/builder";

export function PageCanvas(){
  const { pages, activePageId, fields, addFieldToActivePage, copyLastFieldInActivePage, updateField, updatePage, meta, setMeta } = useBuilderStore();
  const page = pages.find(p=>p.id===activePageId) || pages[0];
  if(!page) return <div className="form-text">ページがありません。</div>;
  const myFields = fields.filter(f=>f.pageId===page.id);

  function addField(){
    const sel = (document.getElementById("fld-type") as HTMLSelectElement);
    const v = (sel?.value || "text") as FieldType;
    addFieldToActivePage(v);
  }

  return (
    <div className="space-y-3">
      <div className="form-title">ページ編集</div>
      <div className="grid-2">
        <div>
          <label className="label">タイトル</label>
          <input className="input" value={page.title||""} onChange={(e)=>updatePage(page.id, {title:e.target.value})}/>
        </div>
        <div>
          <label className="label">説明</label>
          <input className="input" value={page.description||""} onChange={(e)=>updatePage(page.id, {description:e.target.value})}/>
        </div>
      </div>

      {page.type==="info" && (
        <div className="card">
          <div className="form-title mb-2">フォーム設定</div>
          <div className="grid-2">
            <div>
              <label className="label">フォームの名称</label>
              <input className="input" value={meta.title} onChange={e=>setMeta({title:e.target.value})}/>
            </div>
            <div>
              <label className="label">建物名（固定）</label>
              <input className="input" value={meta.fixedBuilding||""} onChange={e=>setMeta({fixedBuilding:e.target.value})}/>
            </div>
            <div>
              <label className="label">会社名（固定）</label>
              <input className="input" value={meta.fixedCompany||""} onChange={e=>setMeta({fixedCompany:e.target.value})}/>
            </div>
          </div>

          <div className="mt-3">
            <label className="label">フォームの説明（複数）</label>
            {(meta.descriptions||[]).map((d,i)=>(
              <div key={i} className="flex items-center" style={{gap:8, marginBottom:8}}>
                <textarea className="input" style={{height:80}} value={d} onChange={e=>{
                  const arr=[...(meta.descriptions||[])]; arr[i]=e.target.value; setMeta({descriptions:arr});
                }}/>
                <button className="btn-secondary" onClick={()=>{
                  const arr=[...(meta.descriptions||[])]; arr.splice(i,1); setMeta({descriptions:arr});
                }}>削除</button>
              </div>
            ))}
            {(meta.descriptions?.length||0)<10 && (
              <button className="btn mt-2" onClick={()=>{
                const arr=[...(meta.descriptions||[])]; arr.push(""); setMeta({descriptions:arr});
              }}>＋ 説明を追加</button>
            )}
          </div>

          <div className="mt-3">
            <label className="label">フォームのルール（複数）</label>
            {(meta.rules||[]).map((d,i)=>(
              <div key={i} className="flex items-center" style={{gap:8, marginBottom:8}}>
                <textarea className="input" style={{height:60}} value={d} onChange={e=>{
                  const arr=[...(meta.rules||[])]; arr[i]=e.target.value; setMeta({rules:arr});
                }}/>
                <button className="btn-secondary" onClick={()=>{
                  const arr=[...(meta.rules||[])]; arr.splice(i,1); setMeta({rules:arr});
                }}>削除</button>
              </div>
            ))}
            {(meta.rules?.length||0)<10 && (
              <button className="btn mt-2" onClick={()=>{
                const arr=[...(meta.rules||[])]; arr.push(""); setMeta({rules:arr});
              }}>＋ ルールを追加</button>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between">
          <div className="form-title">部品</div>
          <div className="flex items-center" style={{gap:8}}>
            <select id="fld-type" className="input" style={{width:180}}>
              <option value="text">短文</option>
              <option value="textarea">段落</option>
              <option value="number">数値</option>
              <option value="date">日付</option>
              <option value="time">時刻</option>
              <option value="select">選択</option>
              <option value="radio">ラジオ</option>
              <option value="checkbox">チェックボックス</option>
              <option value="file">ファイル</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 mt-3">
          {myFields.length===0 && <div className="form-text">このページには部品がありません。</div>}
          {myFields.map(f=>(
            <div key={f.id} className="card">
              <div className="flex items-center justify-between">
                <div className="form-text"><strong>{f.label||"(ラベル未設定)"}</strong></div>
                <div className="flex items-center" style={{gap:8}}>
                  <label className="form-text" style={{display:"inline-flex", alignItems:"center", gap:6}}>
                    必須 <input type="checkbox" checked={!!f.required} onChange={e=>updateField(f.id,{required:e.target.checked})}/>
                  </label>
                  <button className="btn-danger" onClick={()=>useBuilderStore.getState().removeField(f.id)}>削除</button>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label className="label">ラベル</label>
                  <input className="input" value={f.label} onChange={(e)=>updateField(f.id,{label:e.target.value})}/>
                </div>
                <div>
                  <label className="label">部品の種類</label>
                  <select className="input" value={f.type} onChange={e=>updateField(f.id,{type:e.target.value as FieldType})}>
                    <option value="text">短文</option>
                    <option value="textarea">段落</option>
                    <option value="number">数値</option>
                    <option value="date">日付</option>
                    <option value="time">時刻</option>
                    <option value="select">選択</option>
                    <option value="radio">ラジオ</option>
                    <option value="checkbox">チェックボックス</option>
                    <option value="file">ファイル</option>
                  </select>
                </div>
                <div style={{gridColumn:"1 / span 2"}}>
                  <label className="label">説明</label>
                  <textarea className="input" style={{height:72}} value={f.description||""} onChange={e=>updateField(f.id,{description:e.target.value})}/>
                </div>
                {(f.type==="select"||f.type==="radio"||f.type==="checkbox") && (
                  <div style={{gridColumn:"1 / span 2"}}>
                    <label className="label">選択肢（改行区切り・最大10）</label>
                    <textarea className="input" style={{height:80}} value={(f.options||[]).join("\n")} onChange={(e)=>updateField(f.id,{options: e.target.value.split(/\r?\n/).filter(Boolean).slice(0,10)})}/>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end mt-3" style={{gap:8}}>
          <button className="btn-secondary" onClick={copyLastFieldInActivePage}>コピーして追加</button>
          <button className="btn" onClick={addField}>＋ 追加</button>
        </div>
      </div>
    </div>
  );
}