const QRCode = require("qrcode");
const url = process.argv[2];
QRCode.toDataURL(url, { errorCorrectionLevel:"M", scale:6, margin:1 })
  .then(s=>process.stdout.write(s))
  .catch(e=>{process.stderr.write(String(e)); process.exit(1);});
