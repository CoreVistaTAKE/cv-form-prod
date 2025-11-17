/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },     // ← 一時的に Lint で落とさない
  typescript: { ignoreBuildErrors: false }, // 型は通す（必要なら true にできる）
};
module.exports = nextConfig;
