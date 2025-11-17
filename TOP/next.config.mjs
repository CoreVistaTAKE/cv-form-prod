import base from "./next.config.base.mjs";
const isProd = process.env.NODE_ENV === "production";
export default {
  ...base,
  async redirects() {
    if (!isProd) return [];
    if (typeof base.redirects === "function") return base.redirects();
    return [];
  }
};
