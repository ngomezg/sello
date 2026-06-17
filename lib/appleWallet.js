import { PKPass } from "passkit-generator";
import http2 from "node:http2";
import fs from "node:fs";
import path from "node:path";

const fromB64 = (v) => (v ? Buffer.from(v, "base64") : null);
const WWDR = fromB64(process.env.APPLE_WWDR_B64);
const SIGNER_CERT = fromB64(process.env.APPLE_SIGNER_CERT_B64);
const SIGNER_KEY = fromB64(process.env.APPLE_SIGNER_KEY_B64);
const KEY_PASS = process.env.APPLE_SIGNER_KEY_PASSPHRASE || "";
const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID;
const TEAM_ID = process.env.APPLE_TEAM_ID;
const WEB_URL = process.env.APPLE_WEB_SERVICE_URL;

export function appleReady() {
  return Boolean(WWDR && SIGNER_CERT && SIGNER_KEY && PASS_TYPE_ID && TEAM_ID);
}

// Carga icon.png/logo.png desde /public/wallet (Apple exige al menos icon).
function asset(name) {
  try { return fs.readFileSync(path.join(process.cwd(), "public", "wallet", name)); }
  catch { return null; }
}

// Genera el .pkpass firmado para una tarjeta.
export async function generatePkpass(tarjeta, negocio) {
  if (!appleReady()) throw new Error("Apple Wallet no configurado");
  const meta = negocio?.meta_sellos ?? 10;

  const pass = new PKPass({}, {
    wwdr: WWDR, signerCert: SIGNER_CERT, signerKey: SIGNER_KEY, signerKeyPassphrase: KEY_PASS,
  }, {
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    organizationName: "SELLO",
    description: `Tarjeta de ${negocio?.nombre || "fidelidad"}`,
    serialNumber: tarjeta.apple_serial,
    backgroundColor: "rgb(122,27,46)",
    foregroundColor: "rgb(255,253,248)",
    labelColor: "rgb(230,210,160)",
    webServiceURL: WEB_URL,
    authenticationToken: tarjeta.apple_auth_token,
    barcodes: [{ format: "PKBarcodeFormatQR", message: tarjeta.token, messageEncoding: "iso-8859-1" }],
  });

  pass.type = "storeCard";
  pass.headerFields.push({ key: "sellos", label: "SELLOS", value: `${tarjeta.sellos}/${meta}` });
  pass.primaryFields.push({ key: "negocio", label: "Negocio", value: negocio?.nombre || "" });
  pass.secondaryFields.push({ key: "premio", label: "Premio", value: negocio?.premio || "" });

  const icon = asset("icon.png");
  const logo = asset("logo.png");
  if (icon) { pass.addBuffer("icon.png", icon); pass.addBuffer("icon@2x.png", icon); }
  if (logo) pass.addBuffer("logo.png", logo);

  return pass.getAsBuffer();
}

// Manda push a los dispositivos para que el pase se actualice (cert-based APNs).
export async function pushApple(pushTokens) {
  if (!appleReady() || !pushTokens?.length) return;
  const client = http2.connect("https://api.push.apple.com:443", {
    cert: SIGNER_CERT, key: SIGNER_KEY, passphrase: KEY_PASS,
  });
  await Promise.all(pushTokens.map((tok) => new Promise((resolve) => {
    const req = client.request({ ":method": "POST", ":path": `/3/device/${tok}`, "apns-topic": PASS_TYPE_ID });
    req.on("response", () => {}); req.on("error", () => resolve()); req.on("end", resolve);
    req.end("{}");
  })));
  client.close();
}
