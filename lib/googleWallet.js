import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";

const ISSUER   = process.env.GOOGLE_WALLET_ISSUER_ID;
const SA_EMAIL = process.env.GOOGLE_WALLET_SA_EMAIL;
const SA_KEY   = (process.env.GOOGLE_WALLET_SA_KEY || "").replace(/\\n/g, "\n");
const CLASS    = "sello_loyalty_v2";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sello-tau.vercel.app";
  return {
    id: classId(),
    issuerName: "SELLO",
    programName: negocio?.nombre || "Tarjeta de sellos",
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: negocio?.color || "#7A1B2E",
    programLogo: {
      sourceUri: { uri: `${appUrl}/logo-wallet.png` },
      contentDescription: { defaultValue: { language: "es", value: "SELLO" } }
    }
  };
}

async function ensureClass(negocio) {
  const client = await authClient();
  const base   = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";
  try {
    await client.request({ url: `${base}/${classId()}` });
    await client.request({ url: `${base}/${classId()}`, method: "PUT", data: classData(negocio) });
  } catch {
    await client.request({ url: base, method: "POST", data: classData(negocio) });
  }
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

export async function buildSaveUrl(tarjeta, negocio) {
  await ensureClass(negocio);
  const claims = {
    iss: SA_EMAIL, aud: "google", typ: "savetowallet",
    payload: { loyaltyObjects: [objectPayload(tarjeta, negocio)] },
  };
  const token = jwt.sign(claims, SA_KEY, { algorithm: "RS256" });
  return { saveUrl: `https://pay.google.com/gp/v/save/${token}`, objectId: objectId(tarjeta.id) };
}

// updateObject — llama a este después de cada sello.
// premioDesbloqueado: true cuando el cliente completó la tarjeta.
// Google Wallet entrega el push automáticamente al celular que tenga el pase guardado.
export async function updateObject(tarjeta, negocio, premioDesbloqueado = false) {
  if (!googleReady()) return;
  try {
    const client = await authClient();
    const meta   = negocio?.meta_sellos ?? 10;
    const nombre = negocio?.nombre || "tu negocio";
    const emoji  = negocio?.logo_emoji || "☕";

    // El mensaje que Google Wallet empuja como notificación al celular.
    const mensaje = premioDesbloqueado
      ? {
          header: `🎉 ¡Premio desbloqueado en ${nombre}!`,
          body:   `¡Felicitaciones! Ganaste: ${negocio?.premio || "tu premio"}. Muestra tu QR en caja.`,
          id:     `premio_${tarjeta.id}_${Date.now()}`,
          messageType: "TEXT",
        }
      : {
          header: `${emoji} Nuevo sello en ${nombre}`,
          body:   `Tu tarjeta ahora tiene ${tarjeta.sellos} de ${meta} sellos. ¡Sigue acumulando!`,
          id:     `sello_${tarjeta.id}_${Date.now()}`,
          messageType: "TEXT",
        };

    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId(tarjeta.id)}`,
      method: "PATCH",
      data: {
        // Actualiza el contador visible en la tarjeta
        loyaltyPoints: {
          label: "Sellos",
          balance: { string: premioDesbloqueado ? `0/${meta}` : `${tarjeta.sellos}/${meta}` },
        },
        // Este array dispara el push nativo de Google Wallet al celular del cliente
        messages: [mensaje],
      },
    });
  } catch {
    // El cliente aún no guardó el pase — no es un error crítico
  }
}
