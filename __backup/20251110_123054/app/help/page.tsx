export default function HelpPage() {
  return (
    <main className="container" style={{ padding: "20px", lineHeight: 1.7 }}>
      <h1>ヘルプ</h1>
      <p>CoreVista Form Builder の使い方を、初めての方向けにまとめました。</p>

      <h2>作業の流れ</h2>
      <ol>
        <li><strong>ユーザービルダー</strong>で使う質問を取捨選択します。</li>
        <li><strong>建物フォルダ作成</strong>で、対象建物のフォルダとフォームのひな形を作ります。</li>
        <li><strong>プレビュー</strong>で見た目と内容を確認し、問題なければ<strong>完成フォームを更新</strong>を押して確定します。</li>
        <li><strong>入力フォーム</strong>で建物を選ぶと、その建物専用フォームが開きます。</li>
      </ol>

      <h2>よくある疑問</h2>
      <ul>
        <li>「使わない」項目は空欄のままでOK。報告書では枠ごと非表示（異常扱いしません）。</li>
        <li>「完成フォームを更新」は既存の同建物フォームを上書きします。マッピングは維持されます。</li>
        <li>不調時はページ更新、必要なら <code>npm run dev</code> を再実行。</li>
        <li>調査が必要なときは、画面に表示される <code>traceId</code> を控えてください。</li>
      </ul>

      <h2>トラブル時の確認</h2>
      <ul>
        <li>ヘッダーのバージョンが <code>v5.5</code> になっているか。</li>
        <li>ハンバーガーメニューが外クリック／リンククリックで閉じるか。</li>
        <li><code>/preview</code> のボタン表記が上下とも「完成フォームを更新」になっているか。</li>
      </ul>
    </main>
  );
}