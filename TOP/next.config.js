const base = require("./next.config.base.js");
const isProd = process.env.NODE_ENV === "production";
module.exports = {
  ...base,
  async redirects() {
    if (!isProd) return [];
    if (typeof base.redirects === "function") return base.redirects();
    return [];
  }
};
