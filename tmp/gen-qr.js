"use strict";
const QRCode = require("qrcode");
const url = process.argv[2];
(async ()=>{
  try{
    // 誤読率とサイズは実運用向けに控えめ（M, scale=6, margin=1）
    const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", scale: 6, margin: 1 });
    process.stdout.write(dataUrl); // 例: data:image/png;base64,......
  }catch(e){
    process.stderr.write(String(e));
    process.exit(1);
  }
})();
