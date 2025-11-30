export default function ManualPage() {
  return (
    <main
      className="container"
      style={{ padding: "20px 20px 40px", lineHeight: 1.7 }}
    >
      <h1 style={{ fontSize: "1.6rem", marginBottom: 10 }}>
        点検者マニュアル（CV‑FormLink）
      </h1>
      <p>
        このページは、現場の<strong>点検者</strong>の方向けのマニュアルです。
        <br />
        表側はシンプルな Web フォームですが、裏側では{" "}
        <strong>AI + Power Automate + Office Script</strong>
        が連携して報告書を自動作成しています。
        点検者は「必要な項目に答える」ことに集中できるよう設計されています。
      </p>

      {/* 1. システム概要 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>1. システム概要</h2>
      <p>
        CV‑FormLink は、建物ごとに用意された Web フォームに点検内容を入力すると、
        <strong>OneDrive 上に Excel 報告書を自動生成</strong>
        する仕組みです。
      </p>
      <ul>
        <li>建物ごとに専用フォームがあり、不要な項目は事前に非表示になっています。</li>
        <li>
          送信された回答は、<strong>AI が関わる自動処理</strong>を経て、
          Excel 雛形に埋め込まれ、最終的な報告書ファイルになります。
        </li>
        <li>
          報告書は建物フォルダ内 <code>reports</code>{" "}
          フォルダに Excel 形式で保存されます。
        </li>
      </ul>
      <p>
        AI は、入力内容に応じた報告書のレイアウトや文章の整形などをサポートしますが、
        <strong>最終確認は必ず人が行う前提</strong>です。
        報告書の内容に違和感があれば、Excel 上で直接修正できます。
      </p>

      {/* 2. 画面構成と重要項目 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        2. フォーム画面の構成と重要項目
      </h2>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>2-1. ページ構成</h3>
      <p>点検フォームは、上から順に次のページで構成されています。</p>
      <ul>
        <li>
          <strong>info ページ</strong>：フォームの説明／注意事項
        </li>
        <li>
          <strong>basic ページ</strong>：
          <strong>点検日・タブ名・会社名・建物名・点検者名・共同報告ID</strong>
          などの基本情報
        </li>
        <li>
          <strong>previous ページ</strong>：前回の報告書（Excel）へのリンク表示
        </li>
        <li>
          <strong>section ページ</strong>：設備ごとの点検入力ページ（複数ページ）
        </li>
        <li>
          <strong>review ページ</strong>：入力内容の最終確認
        </li>
        <li>
          <strong>complete ページ</strong>：送信完了＋報告書作成の進捗表示
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>2-2. 連携している重要項目</h3>
      <p>
        次のラベルは Excel / フローと直接連携しているため、{" "}
        <span style={{ fontWeight: 600 }}>ラベル名は変更しない前提</span>です。
      </p>
      <ul>
        <li>
          <code>点検日</code>
        </li>
        <li>
          <code>ReportSheet（タブ名）</code>
        </li>
        <li>
          <code>会社名</code>
        </li>
        <li>
          <code>建物名</code>
        </li>
        <li>
          <code>点検者名</code>
        </li>
        <li>
          <code>【2名以上の点検】共同報告グループID</code>
        </li>
      </ul>
      <p>
        とくに{" "}
        <strong>点検日 と ReportSheet（タブ名）は報告書のシート名に直結</strong>
        します。
        <br />
        <span style={{ color: "#f97373", fontWeight: 700 }}>※重要：</span>
        点検日を変更すると、タブ名は自動的に
        <code>YYYYMMDD</code> 形式に追従します。 同じ日に 2 回目以降の点検をする場合など、
        <code>YYYYMMDD_2</code> のように
        <strong>末尾に手動で「_2」などを足す</strong>ことができます。
      </p>

      {/* 3. 点検作業の標準フロー */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        3. 点検作業の標準フロー（1日分）
      </h2>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>Step 1：フォームを開く</h3>
      <ul>
        <li>管理者から配布された URL を開く、または QR コードを読み取ります。</li>
        <li>
          開いた画面のタイトルに、
          <strong>対象建物名</strong>が表示されていることを確認してください。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        Step 2：info ページ（説明）を読む
      </h3>
      <ul>
        <li>まずは説明文・注意事項を一度最後まで読みます。</li>
        <li>
          読み終わったら、「<strong>基本情報へ →</strong>」ボタンで次へ進みます。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        Step 3：basic ページ（基本情報の入力）
      </h3>
      <p>
        ここで入力した値は、すべて報告書に反映されます。必ず落ち着いて確認してください。
      </p>
      <ul>
        <li>
          <strong>点検日</strong>：
          <br />
          デフォルトで「今日の日付（JST）」が入ります。 日付を変更すると、タブ名も合わせて更新されます。
        </li>
        <li>
          <strong>ReportSheet（タブ名）</strong>：
          <br />
          原則 <code>YYYYMMDD</code> の 8 桁です。
          <br />
          同じ日に 2 回点検する場合などは、 <code>YYYYMMDD_2</code>{" "}
          のように末尾に
          <strong>「_数字」</strong>を足してください。
        </li>
        <li>
          <strong>会社名・建物名</strong>：
          <br />
          多くの場合、<strong>管理者側で固定値</strong>が設定されています。
          <br />
          表示内容が建物と一致しているかだけ確認し、基本的には書き換えません。
        </li>
        <li>
          <strong>点検者名</strong>：フルネーム推奨です。
        </li>
        <li>
          <strong>【2名以上の点検】共同報告グループID</strong>：
          <br />
          複数名で同じ点検を行う場合に使用します。半角数字のみ、有効桁数は
          <strong>最大 3 桁</strong>です（それ以外は自動的に削られます）。
        </li>
      </ul>
      <p>
        <span style={{ color: "#f97373", fontWeight: 700 }}>※よくあるミス：</span>
        点検日だけ変えてタブ名を変え忘れる、またはタブ名だけ変えて点検日を変え忘れる。
        <br />
        → <strong>「点検日とタブ名が揃っているか」を必ずダブルチェック</strong>
        してください。
      </p>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        Step 4：previous ページ（前回報告書の確認）
      </h3>
      <ul>
        <li>
          前回点検時の報告書（Excel）へのリンクが表示されます。
          <ul>
            <li>リンクを押すと、OneDrive 上の前回報告書が開きます。</li>
            <li>
              「ファイルが見つかりません」や「共有リンクが未設定です」と表示される場合は、
              <strong>まだ reports フォルダに報告書がない</strong>か、
              <strong>共有リンクが設定されていない</strong>状態です。
            </li>
          </ul>
        </li>
        <li>
          正しく前回報告書が開けるかを確認し、問題なければ「次へ」で点検入力に進みます。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        Step 5：section ページ（設備ごとの点検入力）
      </h3>
      <p>セクションごとに、対象設備の点検内容を入力します。</p>
      <ul>
        <li>
          <strong>ラベルの右に「＊」がついている項目は必須</strong>です。 空欄のまま次へ進むことはできません。
        </li>
        <li>
          <strong>プルダウン（選択）項目</strong>：
          <br />
          初期値は「異常がある場合は選択してください」となっています。
          <br />
          異常がない場合は、<strong>選択せず空欄のまま</strong>でも構いません（異常扱いにはなりません）。
        </li>
        <li>
          <strong>数値・テキスト・日時</strong>なども、必要に応じて入力します。
        </li>
      </ul>
      <p>
        <span style={{ color: "#f97373", fontWeight: 700 }}>※重要：</span>
        画面下部の「次へ →」を押したときに、必須項目が埋まっていないとアラートが出ます。
        <br />
        どの項目が不足しているかメッセージを確認し、該当項目を埋めて再度進んでください。
      </p>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        Step 6：review ページ（最終確認）
      </h3>
      <ul>
        <li>セクションごとに、入力済みの項目が一覧表示されます。</li>
        <li>
          修正したい項目があれば、「← 戻る」で該当セクションまで戻り、値を修正してください。
        </li>
        <li>
          問題がなければ、画面下部の
          <strong>「報告書作成 →」ボタン</strong>を押します。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        Step 7：complete ページ（報告書作成の進捗）
      </h3>
      <p>
        報告書は約 <strong>30〜35秒</strong>かけて自動作成されます。
        この間、<strong>AI が回答内容をもとに報告書のたたき台を組み立て</strong>、
        Power Automate / Office Script と連携して Excel ファイルを整えています。
      </p>
      <ul>
        <li>送信中 → AI による報告書たたき台作成 → 最終チェック → 発行中</li>
        <li>進捗バーが 100% になり、「報告書が発行されました」と表示されます。</li>
        <li>
          <strong>リンクが表示された場合</strong>：
          <br />
          「報告書（Excel）を開く」を押すと、今回作成された Excel 報告書が開きます。
        </li>
        <li>
          <strong>リンクが表示されない場合</strong>：
          <br />
          OneDrive の <code>reports</code>{" "}
          フォルダに最新ファイルが作成されている可能性があります。管理者に確認を依頼してください。
        </li>
      </ul>
      <p>
        <span style={{ color: "#f97373", fontWeight: 700 }}>※絶対にやめてほしい操作：</span>
      </p>
      <ul>
        <li>
          「報告書作成 →」を押したあと、
          <strong>ブラウザを閉じる／戻るボタンを連打する／ページを再読み込みする</strong>
        </li>
        <li>
          → 二重送信になったり、報告書が複数作成される原因になります。
          進捗バーが終了するまで、画面のままお待ちください。
        </li>
      </ul>

      {/* 4. 報告書の確認・修正 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        4. 報告書の確認と修正方法
      </h2>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        4-1. 完了画面から直接開く
      </h3>
      <ul>
        <li>完了画面に「報告書（Excel）を開く」が表示されていれば、それをクリックします。</li>
        <li>OneDrive 上で報告書が開くので、そのまま内容を確認してください。</li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        4-2. OneDrive の reports フォルダから開く
      </h3>
      <p>
        完了画面にリンクが出なかった場合や、後から改めて確認したい場合は、管理者に
        <strong>建物フォルダ内の reports フォルダ</strong>を開いてもらいます。
      </p>
      <ul>
        <li>ファイル名は通常、<code>YYMMDD_建物名_入力済報告書.xlsx</code> の形式です。</li>
        <li>
          最終更新日が最新のファイルが、直近の報告書です
          （前回報告書リンクもこれを参照しています）。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>4-3. 修正のしかた</h3>
      <p>修正方法は大きく２通りあります。</p>
      <ol>
        <li>
          <strong>フォームで再入力してもう一度送信する</strong>
          <ul>
            <li>大きな修正・追記がある場合はこちらを推奨します。</li>
            <li>新しい報告書が作成され、過去分は履歴として残すことができます。</li>
          </ul>
        </li>
        <li>
          <strong>報告書（Excel）を直接編集する</strong>
          <ul>
            <li>誤字修正など軽微な修正の場合はこちらも可です。</li>
            <li>修正後は必ず上書き保存されているか確認してください。</li>
          </ul>
        </li>
      </ol>
      <p>
        AI による自動生成はあくまで「たたき台」であり、
        <strong>最終的な判断・修正は人が行う</strong>前提です。内容に違和感があれば、迷わず修正してください。
      </p>

      {/* 5. よくあるミスと注意点 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        5. よくあるミスと注意点
      </h2>
      <ul>
        <li>
          <strong>タブ名の付け方を間違える</strong>
          <br />
          例：
          <code>202501_02</code> のように桁数がずれる／日付と一致しない。
          <br />
          →{" "}
          <span style={{ fontWeight: 600 }}>
            基本形は 8 桁 <code>YYYYMMDD</code>、2 回目以降は末尾に「_2」などを追加
          </span>
          するルールに統一してください。
        </li>
        <li>
          <strong>点検者名を入れ忘れる</strong>
          <br />
          「誰が点検したか」が分からない報告書になります。
          <br />
          → review ページで必ず確認してください。
        </li>
        <li>
          <strong>グループIDに文字を入れてしまう</strong>
          <br />
          半角数字以外は自動で削られ、3 桁を超える数字は切り捨てられます。
          <br />
          →{" "}
          <span style={{ fontWeight: 600 }}>
            グループIDには「001」「101」など 3 桁以内の数字のみ
          </span>
          を入力してください。
        </li>
        <li>
          <strong>ブラウザの戻る・閉じるを多用する</strong>
          <br />
          戻るボタンを連打すると、どのセクションを入力したのか分からなくなり、
          入力漏れの原因になります。
        </li>
      </ul>

      {/* 6. トラブル時の連絡用メモ */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        6. トラブル時に準備しておくと良い情報
      </h2>
      <p>
        「報告書が作成されていない気がする」「リンクが出なかった」などのとき、
        管理者やサポートに連絡する際は、次の情報を伝えると調査がスムーズです。
      </p>
      <ul>
        <li>建物名（例：テストA）</li>
        <li>点検日（例：2025-11-30）</li>
        <li>タブ名（例：20251130、20251130_2 など）</li>
        <li>点検者名</li>
        <li>問題が起きたおおよその時刻</li>
      </ul>
      <p>
        画面に <code>traceId</code> などの文字列が表示されている場合は、その値も控えておくと、
        管理側で Power Automate / AI の処理ログを追いやすくなります。
      </p>

      <p
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: "1px solid #1f2937",
          fontSize: 14,
          color: "#e5e7eb",
        }}
      >
        点検作業、本当にお疲れさまです。<br />
        現場での丁寧な記録が、そのまま報告書の品質と安全な設備運用につながります。
        <br />
        AI が裏側で自動処理を支えていますが、最後に安全を守るのは現場の判断です。
        どうぞ安全にお帰りください。
      </p>
    </main>
  );
}
