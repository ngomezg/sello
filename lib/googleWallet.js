import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";

const ISSUER   = process.env.GOOGLE_WALLET_ISSUER_ID;
const SA_EMAIL = process.env.GOOGLE_WALLET_SA_EMAIL;
const SA_KEY   = (process.env.GOOGLE_WALLET_SA_KEY || "").replace(/\\n/g, "\n");
const CLASS    = "sello_loyalty_v2"; // v2 para que se cree de nuevo con logo

export function googleReady() {
  return Boolean(ISSUER && SA_EMAIL && SA_KEY);
}

const classId  = () => `${ISSUER}.${CLASS}`;
const objectId = (id) => `${ISSUER}.obj_${id.replace(/-/g, "")}`;

function authClient() {
  return new GoogleAuth({
    credentials: { client_email: SA_EMAIL, private_key: SA_KEY },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  }).getClient();
}

function classData(negocio) {
  // URL pública del logo: sirve el archivo que vive en /public/logo-wallet.png
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sello-tau.vercel.app";
  return {
    id: classId(),
    issuerName: "SELLO",
    programName: negocio?.nombre || "Tarjeta de sellos",
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: negocio?.color || "#7A1B2E",
    // Logo obligatorio: "S" dorada sobre fondo oxblood (512×512 PNG)
    programLogo: {
      sourceUri: { uri: `${appUrl}/logo-wallet.png` },
      contentDescription: {
        defaultValue: { language: "es", value: "SELLO" }
      }
    }
  };
}

// Crea la clase si no existe; si existe la actualiza con el logo.
async function ensureClass(negocio) {
  const client = await authClient();
  const base   = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";
  try {
    await client.request({ url: `${base}/${classId()}` });
    // Ya existe → la actualizamos para que tenga el logo
    await client.request({ url: `${base}/${classId()}`, method: "PUT", data: classData(negocio) });
  } catch {
    // No existe → la creamos
    await client.request({ url: base, method: "POST", data: classData(negocio) });
  }
}

function objectPayload(tarjeta, negocio) {
  const meta = negocio?.meta_sellos ?? 10;
  return {
    id: classId() === undefined ? null : objectId(tarjeta.id),
    id: objectId(tarjeta.id),
    classId: classId(),
    state: "ACTIVE",
    accountName: negocio?.nombre || "Cliente",
    loyaltyPoints: { label: "Sellos", balance: { string: `${tarjeta.sellos}/${meta}` } },
    barcode: { type: "QR_CODE", value: tarjeta.token },
  };
}

export async function buildSaveUrl(tarjeta, negocio) {
  await ensureClass(negocio);
  const claims = {
    iss: SA_EMAIL, aud: "google", typ: "savetowallet",
    payload: { loyaltyObjects: [objectPayload(tarjeta, negocio)] },
  };
  const token = jwt.sign(claims, SA_KEY, { algorithm: "RS256" });
  return { saveUrl: `https://pay.google.com/gp/v/save/${token}`, objectId: objectId(tarjeta.id) };
}

export async function updateObject(tarjeta, negocio) {
  if (!googleReady()) return;
  try {
    const client = await authClient();
    const meta   = negocio?.meta_sellos ?? 10;
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId(tarjeta.id)}`,
      method: "PATCH",
      data: { loyaltyPoints: { label: "Sellos", balance: { string: `${tarjeta.sellos}/${meta}` } } },
    });
  } catch { /* el cliente aún no guardó el pase */ }
}
