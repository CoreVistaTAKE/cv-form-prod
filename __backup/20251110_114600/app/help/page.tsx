export const metadata = { title: "ヘルプ | CoreVista Form Builder" };

export default function HelpPage() {
  return (
    <main className="container" style={{maxWidth: 880, margin: "0 auto", padding: 16}}>
      <h1 style={{marginBottom: 8}}>ヘルプ</h1>
      <p style={{marginTop: 0}}>はじめてでも迷わないよう、必須の手順だけに絞って説明します。</p>

      <h2>できること</h2>
      <ul>
        <li>質問の取捨選択（ユーザービルダー）</li>
        <li>建物フォルダの作成（Flow 連携）</li>
        <li>プレビュー → <strong>完成フォームを更新</strong></li>
        <li>入力フォームから回答送信（建物ごとの URL / QR）</li>
      </ul>

      <h2>3ステップ</h2>
      <ol>
        <li><strong>ユーザービルダー</strong>で必要な質問だけにする</li>
        <li><strong>建物フォルダ作成</strong>（Flow へ送信）</li>
        <li><strong>プレビュー</strong>で確認 → 下の<strong>完成フォームを更新</strong></li>
      </ol>

      <h2>よくある質問</h2>
      <details>
        <summary>「使わない」項目は空欄になるが、異常扱いしない？</summary>
        <div><p>はい、<strong>異常扱いしません</strong>。レポートでは該当枠を非表示にします（ApplyMapF の運用どおり）。</p></div>
      </details>
      <details>
        <summary>フォームを更新すると前のフォームは？</summary>
        <div><p>同じ建物フォルダに<strong>上書き更新</strong>されます。マッピングの再設定は不要です。</p></div>
      </details>

      <h2>トラブル対処（Windows）</h2>
      <ul>
        <li><strong>EPERM (.next\trace)</strong>：dev を停止 → 変更 → 再起動の順に。</li>
      </ul>

      <p style={{marginTop: 24}}><a href="/">← ホームへ戻る</a></p>
    </main>
  );
}