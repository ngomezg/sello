import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  const { deviceLibraryId } = params;
  const since = req.nextUrl.searchParams.get("passesUpdatedSince");

  const { data: regs } = await supabaseAdmin.from("apple_registrations")
    .select("serial").eq("device_library_id", deviceLibraryId);
  if (!regs?.length) return new NextResponse(null, { status: 204 });

  const serials = regs.map((r) => r.serial);
  let q = supabaseAdmin.from("tarjetas")
    .select("apple_serial,pase_actualizado_at").in("apple_serial", serials);
  if (since) q = q.gt("pase_actualizado_at", new Date(Number(since) * 1000).toISOString());

  const { data: cards } = await q;
  const updated = (cards || []).map((c) => c.apple_serial);
  if (!updated.length) return new NextResponse(null, { status: 204 });

  return NextResponse.json({
    lastUpdated: Math.floor(Date.now() / 1000).toString(),
    serialNumbers: updated,
  });
}
