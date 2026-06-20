import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { handle, token?, ref? }
// Sin token → crea tarjeta nueva y devuelve ref_code del cliente.
// Con token  → devuelve estado actual incluyendo ref_code.
// Con token + ref → además reclama el referido si no se ha hecho antes.
export async function POST(req) {
  try {
    const { handle, token, ref } = await req.json();

    if (token) {
      const { data, error } = await supabaseAdmin.rpc("estado_tarjeta", { p_token: token });
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "tarjeta no encontrada" });

      // Si llega un código de referido y aún no se ha reclamado, lo procesa
      if (ref && ref !== data.ref_code) {
        await supabaseAdmin.rpc("reclamar_referido", {
          p_token: token, p_ref_code: ref,
        });
      }
      return NextResponse.json(data);
    }

    // Sin token: crear tarjeta nueva
    const { data, error } = await supabaseAdmin.rpc("crear_tarjeta_invitado", { p_handle: handle });
    if (error) throw error;

    // Si viene un ref_code en la URL, reclamarlo justo después de crear la tarjeta
    if (ref && data?.token && ref !== data.ref_code) {
      await supabaseAdmin.rpc("reclamar_referido", {
        p_token: data.token, p_ref_code: ref,
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
