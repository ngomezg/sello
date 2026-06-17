import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Apple manda "Authorization: ApplePass <authToken>"; lo validamos.
function authOk(req, authToken) {
  return (req.headers.get("authorization") || "") === `ApplePass ${authToken}`;
}

export async function POST(req, { params }) {
  const { deviceLibraryId, passTypeId, serial } = params;
  const { data: t } = await supabaseAdmin.rpc("tarjeta_por_serial", { p_serial: serial });
  if (!t) return new NextResponse(null, { status: 404 });
  if (!authOk(req, t.auth)) return new NextResponse(null, { status: 401 });

  const body = await req.json().catch(() => ({}));
  await supabaseAdmin.from("apple_registrations").upsert({
    device_library_id: deviceLibraryId, pass_type_id: passTypeId,
    serial, push_token: body.pushToken,
  }, { onConflict: "device_library_id,serial" });
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(req, { params }) {
  const { deviceLibraryId, serial } = params;
  const { data: t } = await supabaseAdmin.rpc("tarjeta_por_serial", { p_serial: serial });
  if (t && !authOk(req, t.auth)) return new NextResponse(null, { status: 401 });
  await supabaseAdmin.from("apple_registrations").delete()
    .eq("device_library_id", deviceLibraryId).eq("serial", serial);
  return new NextResponse(null, { status: 200 });
}
