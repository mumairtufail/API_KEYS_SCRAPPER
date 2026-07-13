import { NextRequest, NextResponse } from "next/server";
import { getSetting, saveSetting, deleteSetting } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  const value = getSetting(key);
  return NextResponse.json({ hasValue: !!value });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { key, value } = body;
  
  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "Invalid key or value parameters" }, { status: 400 });
  }

  saveSetting(key, value);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  deleteSetting(key);
  return NextResponse.json({ success: true });
}
