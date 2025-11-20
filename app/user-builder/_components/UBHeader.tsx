"use client";

/**
 * 役割：
 *  - 旧レイアウトの中央見出し（"CV-FormLink / ユーザービルダー"）を出していたコンポーネント。
 *  - 現在はグローバルの MainHeader があるため、ここでは何も描画しません。
 *  - 残しておく理由は後方互換（page.tsx 側に <UBHeader /> が残っていても安全に無効化できる）。
 */
export default function UBHeader() {
  return null;
}
