import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateObject } from "@/lib/googleWallet";
import { pushApple } from "@/lib/appleWallet";

// Sellado SEGURO: dueño logueado + tarjeta de SU negocio. Luego actualiza pases.
export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "falta token" }, { status: 400 });

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

    // RLS limita 'tarjetas' al dueño: si la encuentra, es suya.
    const { data: tarjeta } = await supabase
      .from("tarjetas").select("id").eq("token", token).single();
    if (!tarjeta) return NextResponse.json({ error: "tarjeta ajena o inexistente" }, { status: 403 });

    const { data, error } = await supabaseAdmin.rpc("sumar_sello", {
      p_token: token, p_cantidad: 1, p_origen: "qr",
    });
    if (error) throw error;

    // Actualizar los pases Wallet (no debe romper el sellado si falla).
    try {
      const { data: full } = await supabaseAdmin.from("tarjetas")
        .select("id,sellos,apple_serial,negocios(nombre,meta_sellos,color)")
        .eq("token", token).single();
      if (full) {
        await supabaseAdmin.from("tarjetas")
          .update({ pase_actualizado_at: new Date().toISOString() }).eq("id", full.id);
        await updateObject(full, full.negocios); // Google: empuja sellos al pase guardado
        const { data: regs } = await supabaseAdmin.from("apple_registrations")
          .select("push_token").eq("serial", full.apple_serial);
        await pushApple((regs || []).map((r) => r.push_token)); // Apple: dispara refresco
      }
    } catch { /* el sello ya quedó; el pase se recupera en el siguiente refresco */ }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
