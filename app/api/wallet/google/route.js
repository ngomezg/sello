import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { googleReady, buildSaveUrl } from "@/lib/googleWallet";

export async function GET(req) {
  try {
    if (!googleReady()) return NextResponse.json({ error: "Google Wallet no configurado" }, { status: 501 });
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "falta token" }, { status: 400 });

    const { data } = await supabaseAdmin.from("tarjetas")
      .select("id,sellos,token,negocios(nombre,meta_sellos,color)")
      .eq("token", token).single();
    if (!data) return NextResponse.json({ error: "tarjeta no encontrada" }, { status: 404 });

    const { saveUrl, objectId } = await buildSaveUrl(data, data.negocios);
    // Guarda el object id para futuras actualizaciones
    await supabaseAdmin.from("tarjetas").update({ google_object_id: objectId }).eq("id", data.id);
    return NextResponse.json({ saveUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
