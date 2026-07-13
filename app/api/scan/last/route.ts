import { NextResponse } from "next/server";
import { getLastScan } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const scan = getLastScan();
  if (!scan) {
    return NextResponse.json({ error: "No previous scan found" }, { status: 404 });
  }
  return NextResponse.json({ scan });
}
