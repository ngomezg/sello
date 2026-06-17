import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";

// Lee credenciales de la cuenta de servicio de Google Cloud.
const ISSUER = process.env.GOOGLE_WALLET_ISSUER_ID;
const SA_EMAIL = process.env.GOOGLE_WALLET_SA_EMAIL;
// La key viene con \n escapados desde el .env; los volvemos saltos reales.
const SA_KEY = (process.env.GOOGLE_WALLET_SA_KEY || "").replace(/\\n/g, "\n");
const CLASS = "sello_loyalty_v1";

export function googleReady() {
  return Boolean(ISSUER && SA_EMAIL && SA_KEY);
}

const classId = () => `${ISSUER}.${CLASS}`;
const objectId = (tarjetaId) => `${ISSUER}.obj_${tarjetaId.replace(/-/g, "")}`;

function authClient() {
  return new GoogleAuth({
    credentials: { client_email: SA_EMAIL, private_key: SA_KEY },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  }).getClient();
}

// Crea la "clase" (plantilla del programa) una sola vez. Idempotente.
async function ensureClass(negocio) {
  const client = await authClient();
  const base = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";
  try {
    await client.request({ url: `${base}/${classId()}` });
    return; // ya existe
  } catch { /* no existe, la creamos */ }
  await client.request({
    url: base, method: "POST",
    data: {
      id: classId(),
      issuerName: "SELLO",
      programName: negocio?.nombre || "Tarjeta de sellos",
      reviewStatus: "UNDER_REVIEW",
      hexBackgroundColor: negocio?.color || "#7A1B2E",
    },
  });
}

function objectPayload(tarjeta, negocio) {
  const meta = negocio?.meta_sellos ?? 10;
  return {
    id: objectId(tarjeta.id),
    classId: classId(),
    state: "ACTIVE",
    accountName: negocio?.nombre || "Cliente",
    loyaltyPoints: { label: "Sellos", balance: { string: `${tarjeta.sellos}/${meta}` } },
    barcode: { type: "QR_CODE", value: tarjeta.token },
  };
}

// Genera el botón/URL oficial "Add to Google Wallet".
export async function buildSaveUrl(tarjeta, negocio) {
  await ensureClass(negocio);
  const claims = {
    iss: SA_EMAIL,
    aud: "google",
    typ: "savetowallet",
    payload: { loyaltyObjects: [objectPayload(tarjeta, negocio)] },
  };
  const token = jwt.sign(claims, SA_KEY, { algorithm: "RS256" });
  return { saveUrl: `https://pay.google.com/gp/v/save/${token}`, objectId: objectId(tarjeta.id) };
}

// Empuja el nuevo número de sellos al pase ya guardado por el cliente.
export async function updateObject(tarjeta, negocio) {
  if (!googleReady()) return;
  try {
    const client = await authClient();
    const meta = negocio?.meta_sellos ?? 10;
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId(tarjeta.id)}`,
      method: "PATCH",
      data: { loyaltyPoints: { label: "Sellos", balance: { string: `${tarjeta.sellos}/${meta}` } } },
    });
  } catch { /* si el cliente aún no guardó el pase, no hay objeto que actualizar */ }
}
