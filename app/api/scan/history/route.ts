import { NextResponse } from "next/server";
import { listScans } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ scans: listScans() });
}
