import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { appleReady, generatePkpass } from "@/lib/appleWallet";

export async function GET(req) {
  try {
    if (!appleReady()) return NextResponse.json({ error: "Apple Wallet no configurado" }, { status: 501 });
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "falta token" }, { status: 400 });

    const { data } = await supabaseAdmin.from("tarjetas")
      .select("id,sellos,token,apple_serial,apple_auth_token,negocios(nombre,meta_sellos,premio)")
      .eq("token", token).single();
    if (!data) return NextResponse.json({ error: "tarjeta no encontrada" }, { status: 404 });

    const buf = await generatePkpass(data, data.negocios);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename=sello.pkpass`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
