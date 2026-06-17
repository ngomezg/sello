import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { handle, token? }
// Sin token -> crea tarjeta invitado. Con token -> devuelve estado actual.
export async function POST(req) {
  try {
    const { handle, token } = await req.json();

    if (token) {
      const { data, error } = await supabaseAdmin.rpc("estado_tarjeta", { p_token: token });
      if (error) throw error;
      return NextResponse.json(data ?? { error: "tarjeta no encontrada" });
    }

    const { data, error } = await supabaseAdmin.rpc("crear_tarjeta_invitado", { p_handle: handle });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
