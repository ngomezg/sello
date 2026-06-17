import { NextResponse } from "next/server";
export async function POST(req) {
  try { await req.json(); } catch {}
  return new NextResponse(null, { status: 200 });
}
