import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { handle, items, total, token? } -> guarda pedido y suma 1 sello.
export async function POST(req) {
  try {
    const { handle, items, total, token } = await req.json();

    const { data: negocio, error: e1 } = await supabaseAdmin
      .from("negocios").select("id").eq("handle", handle).single();
    if (e1) throw e1;

    const { error: e2 } = await supabaseAdmin
      .from("pedidos").insert({ negocio_id: negocio.id, items, total });
    if (e2) throw e2;

    // Un pedido = un sello (si el cliente ya tiene tarjeta)
    let estado = null;
    if (token) {
      const { data } = await supabaseAdmin.rpc("sumar_sello", {
        p_token: token, p_cantidad: 1, p_origen: "pedido",
      });
      estado = data;
    }
    return NextResponse.json({ ok: true, estado });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
