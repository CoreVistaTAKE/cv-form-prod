"use client";
import { useBuilderStore, PageType } from "@/store/builder";

const labels: Record<PageType,string> = {
  info:"フォーム情報", revise:"修正ページ", reviseList:"修正する回答ページ", basic:"基本情報",
  previous:"前回点検時の状況", section:"セクション", review:"最終確認", complete:"完了"
};

export function PagesSidebar(){
  const { pages, meta, activePageId, setActivePage, addPage, movePage, removePage } = useBuilderStore();

  function onDragStart(e:React.DragEvent, i:number){ e.dataTransfer.setData("text/plain", String(i)); }
  function onDragOver(e:React.DragEvent){ e.preventDefault(); }
  function onDrop(e:React.DragEvent, i:number){
    const from = parseInt(e.dataTransfer.getData("text/plain")||"-1", 10);
    if(!isNaN(from) && from!==i){ movePage(from, i); }
  }

  const sections = pages.filter(p=>p.type==="section");
  const secIndex = (id:string) => {
    const idx = sections.findIndex(s=>s.id===id);
    return idx>=0 ? (idx+1) : undefined;
  };

  function addSection(){ addPage("section"); }
  function addOther(){
    const sel = document.getElementById("add-page-type") as HTMLSelectElement;
    const v = (sel?.value || "info") as PageType;
    addPage(v);
  }

  return (
    <div className="space-y-3">
      <div className="form-title">ページ一覧（ドラッグで並べ替え）</div>
      <div className="space-y-2">
        {pages.map((p, i)=>(
          <div key={p.id}
               className="page-row"
               draggable
               onDragStart={(e)=>onDragStart(e,i)}
               onDragOver={onDragOver}
               onDrop={(e)=>onDrop(e,i)}
               style={{background: p.id===activePageId? "rgba(255,255,255,0.03)" : undefined}}
          >
            <div className="page-top">
              <div className="page-main">
                <div className="handle">↕︎</div>
                <button className="btn-secondary" style={{minWidth:160}} onClick={()=>setActivePage(p.id)}>
                  {p.type==="section" ? `セクション ${secIndex(p.id)}` : (labels[p.type]||p.type)}
                </button>
              </div>
              <div>
                {p.type==="section"
                  ? <button className="btn-red" onClick={()=>removePage(p.id)}>削除</button>
                  : <span className="badge">固定</span>}
              </div>
            </div>
            <div className="page-sub">
              {p.type==="info" ? (meta.title || "（フォームの名称未設定）") : (p.title || "（名称未設定）")}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="form-title mb-2">追加</div>
        <div className="space-y-2">
          <button className="btn" onClick={addSection} style={{width:"100%"}}>＋ セクションを追加</button>
          <div className="flex items-center" style={{gap:8}}>
            <select id="add-page-type" className="input" style={{width:200}}>
              <option value="info">フォーム情報</option>
              <option value="basic">基本情報</option>
              <option value="revise">修正ページ</option>
              <option value="reviseList">修正する回答ページ</option>
              <option value="previous">前回点検時の状況</option>
              <option value="review">最終確認</option>
              <option value="complete">完了</option>
            </select>
            <button className="btn-secondary" onClick={addOther}>その他を追加</button>
          </div>
        </div>
      </div>
    </div>
  );
}