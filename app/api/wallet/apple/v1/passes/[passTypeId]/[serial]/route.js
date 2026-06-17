import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePkpass } from "@/lib/appleWallet";

export async function GET(req, { params }) {
  const { serial } = params;
  const { data: t } = await supabaseAdmin.rpc("tarjeta_por_serial", { p_serial: serial });
  if (!t) return new NextResponse(null, { status: 404 });
  if ((req.headers.get("authorization") || "") !== `ApplePass ${t.auth}`)
    return new NextResponse(null, { status: 401 });

  const { data: full } = await supabaseAdmin.from("tarjetas")
    .select("id,sellos,token,apple_serial,apple_auth_token,negocios(nombre,meta_sellos,premio)")
    .eq("apple_serial", serial).single();

  const buf = await generatePkpass(full, full.negocios);
  return new NextResponse(buf, { headers: { "Content-Type": "application/vnd.apple.pkpass" } });
}
