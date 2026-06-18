import { NextResponse } from "next/server";
import { supabaseAdmin }  from "@/lib/supabaseAdmin";
import webpush            from "web-push";

// Configura las credenciales VAPID (se generan una sola vez y van a Vercel).
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || "hola@sello.app"}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// POST /api/push — guarda la suscripción de un cliente.
export async function POST(req) {
  try {
    const { subscription, negocio_id, cliente_id } = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ error: "falta endpoint" }, { status: 400 });

    await supabaseAdmin.from("push_subscriptions").upsert({
      negocio_id,
      cliente_id: cliente_id || null,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys.p256dh,
      auth:     subscription.keys.auth,
    }, { onConflict: "endpoint" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/push?negocio_id=X&title=Y&body=Z&secret=S
// Envía un push a todos los suscriptores de un negocio.
// Protegido con un secreto compartido (lo usa n8n en el header).
export async function GET(req) {
  try {
    const { searchParams } = req.nextUrl;
    const secret     = searchParams.get("secret");
    const negocio_id = searchParams.get("negocio_id");
    const title      = searchParams.get("title")  || "SELLO";
    const body       = searchParams.get("body")   || "";
    const url        = searchParams.get("url")    || "/";

    // Verifica el secreto para que nadie ajeno dispare pushes.
    if (secret !== process.env.PUSH_SECRET) {
      return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    }

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("negocio_id", negocio_id);

    if (!subs?.length) return NextResponse.json({ sent: 0 });

    const payload = JSON.stringify({ title, body, url, icon: "/logo-wallet.png" });
    let sent = 0, failed = 0;

    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e) {
        // Si el endpoint ya no es válido (usuario desinscribió), lo borramos.
        if (e.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
        failed++;
      }
    }));

    return NextResponse.json({ sent, failed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
