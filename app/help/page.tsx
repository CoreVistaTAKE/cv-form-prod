export default function HelpPage() {
  return (
    <main
      className="container"
      style={{ padding: "20px 20px 40px", lineHeight: 1.7 }}
    >
      <h1 style={{ fontSize: "1.6rem", marginBottom: 10 }}>
        ヘルプ（全体像と役割別ガイド）
      </h1>
      <p>
        このページは、CV‑FormLink の{" "}
        <strong>「全体の流れ」と「役割ごとの使い方」</strong>
        をまとめたヘルプです。
        <br />
        取引先管理者・点検者それぞれの視点から、「どの画面で何をすればいいのか」をざっくり把握できます。
      </p>

      {/* 1. システムの目的 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        1. このシステムの目的
      </h2>
      <ul>
        <li>建物・設備点検の記録を Web フォームで統一し、抜け漏れを防ぐ。</li>
        <li>建物ごとに不要な項目を隠し、「必要な質問だけ」に集中できるようにする。</li>
        <li>点検結果から Excel 報告書を自動生成し、報告書作成の手作業を削減する。</li>
        <li>
          裏側で<strong>AI が報告書生成やチェックの一部をサポート</strong>し、
          人は入力と確認に専念できるようにする。
        </li>
      </ul>

      {/* 2. 役割と画面の対応 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        2. 役割と画面の対応関係
      </h2>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        2-1. 主な役割（ロール）
      </h3>
      <ul>
        <li>
          <strong>取引先管理者</strong>
          <br />
          フォームの対象外設定、建物フォルダの作成、フォーム URL / QR の配布を行います。
        </li>
        <li>
          <strong>点検者（ビル管理会社スタッフ）</strong>
          <br />
          発行されたフォームに回答し、点検作業の記録を残します。
        </li>
        <li>
          <strong>報告書確認者（安全衛生・設備担当など）</strong>
          <br />
          作成された Excel 報告書の内容を確認します。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        2-2. 各画面のざっくりした役割
      </h3>
      <ul>
        <li>
          <strong>/fill（入力フォーム）</strong>
          <br />
          点検者が実際に使用するメイン画面です。
          <br />
          建物ごとの URL / QR を開くと、その建物専用のフォームが表示されます。
        </li>
        <li>
          <strong>/user-builder（ユーザービルダー）</strong>
          <br />
          取引先管理者向け。
          <br />
          建物ごとのフォーム読込／対象外設定／建物フォルダ作成＋URL・QR 発行を行います。
        </li>
        <li>
          <strong>/preview（プレビュー）</strong>
          <br />
          ビルダーで設定した結果がフォームにどう反映されるか、見た目を確認するための画面です。
        </li>
        <li>
          <strong>/builder（社内ビルダー）</strong>
          <br />
          システム開発・保守専用です。取引先管理者・点検者は通常アクセスしません。
        </li>
        <li>
          <strong>/manual（マニュアル）</strong>
          <br />
          点検者向けの詳細マニュアル（作業手順・注意点）です。
        </li>
        <li>
          <strong>/help（この画面）</strong>
          <br />
          システムの全体像と、役割ごとの使い方をまとめたガイドです。
        </li>
      </ul>

      {/* 3. 点検者向け：最短ガイド */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        3. 点検者向け：最短 3 ステップガイド
      </h2>
      <p>
        詳細は <strong>「マニュアル」</strong> ページに記載があります。ここでは最短の流れだけまとめます。
      </p>
      <ol>
        <li>
          <strong>フォーム URL / QR を開く</strong>
          <ul>
            <li>管理者から共有されたリンク・QR からアクセスします。</li>
            <li>画面のタイトルに対象建物名が表示されているか確認します。</li>
          </ul>
        </li>
        <li>
          <strong>上から順にページを進め、必須項目（＊）をすべて入力する</strong>
          <ul>
            <li>
              basic ページで <code>点検日</code>,{" "}
              <code>ReportSheet（タブ名）</code>,{" "}
              <code>点検者名</code> を必ず確認してください。
            </li>
            <li>
              セクションページでは、「＊」付き項目はすべて入力します。 プルダウン項目は、
              異常がある場合のみ選択します。
            </li>
          </ul>
        </li>
        <li>
          <strong>最終確認 → 報告書作成 → 完了画面のリンクを確認</strong>
          <ul>
            <li>review ページで内容を確認し、「報告書作成 →」を押します。</li>
            <li>
              完了画面で 30〜35秒ほど待つと、AI が関わる自動処理が終わり、
              報告書リンクが表示されます。
            </li>
          </ul>
        </li>
      </ol>
      <p>
        <span style={{ color: "#f97373", fontWeight: 700 }}>※注意：</span>
        「報告書作成 →」を押したあとにブラウザを閉じたり、戻るボタンを連打しないでください。
      </p>

      {/* 4. 管理者向け：建物ごとの準備 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        4. 管理者向け：建物ごとの準備と運用
      </h2>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        4-1. 建物用フォームの読込と対象外設定
      </h3>
      <p>
        <strong>/user-builder</strong> 画面から、建物用フォームを読み込んで調整します。
      </p>
      <ol>
        <li>「建物用フォームを読み込む」で対象の建物フォルダを選択し、「読込」を押します。</li>
        <li>
          読み込んだフォームの構成が、左側のセクション一覧として表示されます。
        </li>
        <li>
          「対象外(非適用)設定」で、<strong>表示しないセクションや項目</strong>
          をオン／オフで切り替えます。
          <ul>
            <li>緑＝表示中、赤＝非表示（対象外）です。</li>
            <li>
              「対象外」にした項目は、フォーム上では非表示になり、報告書でも枠ごと削除されます。
            </li>
          </ul>
        </li>
      </ol>
      <p>
        <span style={{ color: "#f97373", fontWeight: 700 }}>※よくあるミス：</span>
        本来必要な項目まで対象外にしてしまうと、報告書上に欄が出ません。
        テスト用の建物で一度プレビュー・試験入力しておくと安全です。
      </p>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        4-2. 建物フォルダ作成 + フォーム URL / QR の発行
      </h3>
      <p>
        ユーザービルダー下部の「建物フォルダ作成とURL発行」で、建物ごとのフォルダとフォーム URL /
        QR を生成します。
      </p>
      <ol>
        <li>
          <strong>建物名</strong>を入力（例：テストA）。正式名称で統一してください。
        </li>
        <li>
          「<strong>建物フォルダ作成 + URL発行</strong>」ボタンを押します。
        </li>
        <li>
          <strong>AI を含むバックエンド処理 + Power Automate フロー</strong>が起動し、OneDrive 上に
          <strong>建物フォルダ + 雛形フォーム</strong>を作成します。
        </li>
        <li>
          下部のステータス枠にて、
          <strong>進捗バー・フォームURL・QRコード</strong>が表示されます。
        </li>
      </ol>
      <p>
        <span style={{ color: "#93c5fd", fontWeight: 700 }}>運用ポイント：</span>
      </p>
      <ul>
        <li>表示されたフォーム URL を点検者に配布します（メール・チャット・紙に印刷したQRなど）。</li>
        <li>
          QR コード画像は必要に応じて保存し、現場の掲示板などに貼り出すこともできます。
        </li>
      </ul>

      <h3 style={{ marginTop: 16, fontSize: "1.1rem" }}>
        4-3. フォーム内容を変更したいとき
      </h3>
      <ul>
        <li>
          対象外(非適用)設定で項目を追加／削除した場合は、テスト用にフォームを開いて動作確認してください。
        </li>
        <li>
          既存建物の項目構成を大きく変える場合は、{" "}
          <strong>報告書 Excel のレイアウトとの整合性</strong>
          に注意が必要です（必要に応じてシステム担当と相談してください）。
        </li>
      </ul>

      {/* 5. 報告書の保管ルールとおすすめ運用 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        5. 報告書ファイルの保管とおすすめ運用
      </h2>
      <p>報告書の正式な保管場所については、次のような運用をおすすめします。</p>
      <ol>
        <li>
          <strong>OneDrive /reports フォルダを「正式版」とする</strong>
          <ul>
            <li>
              02_Cliants/FirstService 配下の
              <code>{"<user>_<seq>_<bldg>/reports"}</code> を公式の保管場所とします。
            </li>
            <li>
              管理者はこのフォルダを基準に、最新の報告書を参照するようにします。
            </li>
          </ul>
        </li>
        <li>
          <strong>共有リンクで点検者・確認者へ配布</strong>
          <ul>
            <li>フローで匿名閲覧リンク（view）を発行し、完了画面に表示します。</li>
            <li>
              必要に応じて、報告書の URL をメールや Teams のチャネルに貼り付けても構いません。
            </li>
          </ul>
        </li>
        <li>
          <strong>自社のファイルサーバへコピーする場合</strong>
          <ul>
            <li>必要に応じて、正式版を社内の別ストレージへ定期コピーする運用も検討できます。</li>
            <li>その場合でも、「元データは OneDrive の reports」と決めておくと整理しやすくなります。</li>
          </ul>
        </li>
      </ol>

      {/* 6. トラブルシューティング（管理者向け） */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        6. トラブルシューティング（管理者向け）
      </h2>
      <ul>
        <li>
          <strong>Q. 完了画面に報告書リンクが表示されない</strong>
          <br />
          <span style={{ color: "#f97373", fontWeight: 700 }}>まず確認：</span>
          <ol>
            <li>該当建物フォルダの <code>reports</code> を開き、最新の日付のファイルがあるか確認。</li>
            <li>
              ファイルがあるがリンクが出ない → フロー内の「共有リンク作成」が失敗している可能性があります。
            </li>
            <li>
              ファイル自体がない → AI を含む自動処理／Power Automate が途中で失敗している可能性があります（実行履歴を確認）。
            </li>
          </ol>
        </li>
        <li style={{ marginTop: 12 }}>
          <strong>Q. 前回報告書リンクが「見つかりません」と出る</strong>
          <ul>
            <li>その建物の reports フォルダにまだ報告書ファイルがないか、ファイル名変更などで参照できていない状態です。</li>
            <li>過去分を OneDrive 上で整備することで解消できるケースがあります。</li>
          </ul>
        </li>
        <li style={{ marginTop: 12 }}>
          <strong>Q. 同じ日に 2 本以上の報告書ができてしまった</strong>
          <ul>
            <li>送信ボタンを複数回押してしまった場合などに発生します。</li>
            <li>
              実運用としては、{" "}
              <strong>最後に正しく作成されたものを有効とし、それ以外をアーカイブ</strong>
              する運用がおすすめです。
            </li>
          </ul>
        </li>
      </ul>

      {/* 7. サポートに渡すとよい情報 */}
      <h2 style={{ marginTop: 24, fontSize: "1.3rem" }}>
        7. システム担当・サポートに連絡するときに伝える情報
      </h2>
      <p>システム担当や外部サポートに調査を依頼する場合、次の情報があると非常に助かります。</p>
      <ul>
        <li>問題が起きた建物名（例：テストA）</li>
        <li>点検日（例：2025-11-30）</li>
        <li>タブ名（例：20251130、20251130_2）</li>
        <li>点検者名</li>
        <li>どの画面で／どのボタンを押したときに問題が起きたか</li>
        <li>
          画面やメールに <code>traceId</code> / <code>statusPath</code>{" "}
          などが表示されている場合は、その文字列
        </li>
      </ul>

      <p
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: "1px solid #1f2937",
          fontSize: 14,
          color: "#e5e7eb",
        }}
      >
        このヘルプでカバーしきれていないケースや、運用ルールの相談が必要な場合は、<br />
        「どの建物で・いつ・どのような操作をしたか」を整理してからお問い合わせいただくとスムーズです。
        <br />
        裏側では AI が自動処理を支えていますが、最終的な運用判断は現場と管理者の役割です。
      </p>
    </main>
  );
}
