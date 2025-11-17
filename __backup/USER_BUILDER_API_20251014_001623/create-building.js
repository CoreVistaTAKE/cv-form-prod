// pages/api/builder/create-building.js
// 目的：ユーザービルダーの「新しい建物を登録」ボタンから叩くサーバー側統合API
// - 空値/禁止文字ガード
// - BaseSystem 生成は禁止
// - GetNextSeq → CreateFormFolder（payload.* 固定キー）→ FORM_URL.txt / QR.jpg を SaveFiles にアップ
// - 孤児フォルダ（/_001_ 等）再発防止：必ず varUser/varBldg/varSeq/varHost を埋めて送信

import Jimp from "jimp";
import QRCode from "qrcode";

const SAVE = process.env.FLOW_URL_SAVEFILES;
const SEQ  = process.env.FLOW_URL_GETNEXTSEQ;
const CF   = process.env.FLOW_URL_CREATEFORMFOLDER;

const BAD_CHARS = /[\\/:*?"<>|]/;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method Not Allowed" });

    // 1) 入力取得・既定
    const username = String(req.body?.username || "").trim();
    const bldgRaw  = String(req.body?.bldg || "").trim();
    const host     = String(req.body?.host || "https://www.form.visone-ai.jp").trim();

    // 2) バリデーション（空値/禁止文字/予約名）
    if (!username || !/^form_[A-Za-z0-9_]+$/.test(username)) {
      return res.status(400).json({ ok: false, error: "username must start with 'form_' and be alnum+underscore." });
    }
    if (!bldgRaw || BAD_CHARS.test(bldgRaw)) {
      return res.status(400).json({ ok: false, error: "bldg contains invalid chars or empty." });
    }
    if (bldgRaw === "BaseSystem") {
      return res.status(400).json({ ok: false, error: "bldg 'BaseSystem' is reserved. Do not create again." });
    }

    // 3) 連番の採番（GetNextSeq）
    const seqRes = await fetch(SEQ, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const seqData = await seqRes.json();
    const seq = String(seqData?.next || "").padStart(3, "0");
    if (!/^\d{3}$/.test(seq)) return res.status(502).json({ ok: false, error: "GetNextSeq failed.", seqRaw: seqData });

    // 4) CreateFormFolder（payload.* 固定キーで送信）
    const payloadCF = {
      payload: {
        varUser: username,
        varBldg: bldgRaw,
        varSeq:  seq,
        varHost: host,
        // 互換キー（フロー内の参照揺らぎに対応）
        user: username, bldg: bldgRaw, seq, host, username, building: bldgRaw
      }
    };
    const cfRes = await fetch(CF, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payloadCF)
    });
    const cfData = await cfRes.json();
    if (!cfRes.ok || cfData?.ok !== true) {
      return res.status(502).json({ ok: false, error: "CreateFormFolder failed.", detail: cfData });
    }

    const bldgFolderName = `${username}_${seq}_${bldgRaw}`;
    const siteRel = `/01_InternalTest/${username}/${bldgFolderName}`; // /Documents はフロー側で付与

    // 5) FORM_URL と QR.jpg を作成
    const shortName = username.startsWith("form_") ? username.slice(5) : username;
    const q = new URLSearchParams({
      user: username,
      seq:  seq,
      bldg: bldgRaw,
      name: shortName
    }).toString();
    const FORM_URL = `${host}/f?${q}`;

    // FORM_URL.txt（UTF-8 → Base64）
    const textB64 = Buffer.from(FORM_URL, "utf8").toString("base64");

    // QR（PNG → JPEG Base64）
    const pngDataUrl = await QRCode.toDataURL(FORM_URL, { errorCorrectionLevel: "M", scale: 6, margin: 1 });
    const pngB64 = pngDataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const img = await Jimp.read(Buffer.from(pngB64, "base64"));
    const jpgBuf = await img.quality(90).getBufferAsync(Jimp.MIME_JPEG);
    const jpgB64 = Buffer.from(jpgBuf).toString("base64");

    // 6) SaveFilesToOneDrive（form/配下へ2点保存）
    const bodySave = {
      username,
      files: [
        { path: `${siteRel}/form/FORM_URL.txt`, contentBase64: textB64, contentType: "text/plain" },
        { path: `${siteRel}/form/QR.jpg`,       contentBase64: jpgB64,  contentType: "image/jpeg" }
      ]
    };
    const saveRes = await fetch(SAVE, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(bodySave)
    });
    const saveData = await saveRes.json();
    if (!saveRes.ok || saveData?.ok !== true) {
      return res.status(502).json({ ok: false, error: "SaveFilesToOneDrive failed.", detail: saveData });
    }

    // 7) 正常終了
    return res.status(200).json({
      ok: true,
      seq,
      bldgFolderName,
      paths: {
        form:    `${siteRel}/form`,
        reports: `${siteRel}/reports`
      },
      formUrl: FORM_URL
    });

  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
