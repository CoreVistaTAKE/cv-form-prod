export const metadata = { title: "ヘルプ | CoreVista Form Builder" };

export default function HelpPage() {
  return (
    <main className="container" style={{maxWidth: 880, margin: "0 auto", padding: 16}}>
      <h1 style={{marginBottom: 8}}>ヘルプ</h1>
      <p style={{marginTop: 0}}>はじめてでも迷わないように、手順とコツをまとめました。</p>

      <h2>このツールでできること</h2>
      <ul>
        <li>チェック項目の取捨選択（ユーザービルダー）</li>
        <li>建物フォルダの作成（Flow連携）</li>
        <li>プレビューで最終確認 &nbsp;→&nbsp;<strong>完成フォームを更新</strong></li>
        <li>入力フォームから回答送信（建物ごとのURL/QR）</li>
      </ul>

      <h2>かんたん3ステップ</h2>
      <ol>
        <li><strong>ユーザービルダー</strong>で必要な質問だけにする</li>
        <li><strong>建物フォルダを作成</strong>（Flowへ連携）</li>
        <li><strong>プレビュー</strong>で確認 → 下部の<strong>完成フォームを更新</strong>を押す</li>
      </ol>

      <h2>よくある質問</h2>
      <details>
        <summary>「使わない」項目の回答は空欄だけど、異常扱いにならない？</summary>
        <div><p>はい、<strong>異常扱いにしません</strong>。レポートでは該当枠を非表示にする運用です（<em>ApplyMapF</em> の論理に準拠）。</p></div>
      </details>
      <details>
        <summary>フォームを作り直したら、前のフォームは？</summary>
        <div><p>同じ建物フォルダに<strong>上書き更新</strong>します。マッピングの修正は不要です。</p></div>
      </details>

      <h2>トラブル対処（Windows）</h2>
      <ul>
        <li><strong>dev が止まらない/更新が反映されない</strong>：いったん dev を停止してから実行してください。</li>
        <li><strong>EPERM で .next\\trace</strong>：dev 停止→更新→起動の順に。Defender が影響する場合は node.exe を許可アプリへ。</li>
      </ul>

      <p style={{marginTop: 24}}><a href="/" aria-label="ホームへ戻る">← ホームへ戻る</a></p>
    </main>
  );
}