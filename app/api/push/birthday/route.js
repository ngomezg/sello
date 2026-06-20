import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import webpush from "web-push";

function initVapid() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "hola@sello.app"}`,
    pub,
    priv
  );
  return true;
}

export async function POST(req) {
  try {
    if (!initVapid())
      return NextResponse.json({ error: "Push no configurado aún (faltan variables VAPID)" }, { status: 501 });
    
    const body_json = await req.json();
    const secret     = body_json.secret;
    const negocio_id = body_json.negocio_id;
    const title      = body_json.title || "SELLO";
    const body       = body_json.body  || "";
    const url        = body_json.url   || "/";
    
    if (secret !== process.env.PUSH_SECRET)
      return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    
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
        if (e.statusCode === 410)
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        failed++;
      }
    }));
    
    return NextResponse.json({ sent, failed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
