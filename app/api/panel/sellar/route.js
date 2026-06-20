import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateObject } from "@/lib/googleWallet";
import { pushApple } from "@/lib/appleWallet";

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
    if (!tarjeta)
      return NextResponse.json({ error: "tarjeta ajena o inexistente" }, { status: 403 });

    // Suma el sello. La función devuelve premio_desbloqueado: true
    // cuando el cliente completó la tarjeta — lo usamos para el mensaje del push.
    const { data, error } = await supabaseAdmin.rpc("sumar_sello", {
      p_token: token, p_cantidad: 1, p_origen: "qr",
    });
    if (error) throw error;

    const premioDesbloqueado = data?.premio_desbloqueado === true;

    // Actualiza los pases Wallet con el nuevo contador y dispara el push nativo.
    // No debe romper el sellado si falla — por eso va en try/catch aparte.
    try {
      const { data: full } = await supabaseAdmin
        .from("tarjetas")
        .select("id,sellos,apple_serial,negocios(nombre,meta_sellos,color,logo_emoji,premio)")
        .eq("token", token).single();

      if (full) {
        await supabaseAdmin.from("tarjetas")
          .update({ pase_actualizado_at: new Date().toISOString() }).eq("id", full.id);

        // Google Wallet: actualiza el pase Y envía push nativo al celular del cliente.
        await updateObject(full, full.negocios, premioDesbloqueado);

        // Apple Wallet: dispara refresco (push propio de Apple cuando esté activo).
        const { data: regs } = await supabaseAdmin
          .from("apple_registrations")
          .select("push_token").eq("serial", full.apple_serial);
        await pushApple((regs || []).map((r) => r.push_token));
      }
    } catch { /* el sello ya quedó; el pase se recupera en el siguiente refresco */ }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
