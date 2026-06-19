import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureTable } from "@/lib/db";

const USER_ID = "default";

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT data FROM user_data WHERE id = ${USER_ID}`;
    const data = rows[0]?.data ?? {};
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/data error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const sql = getDb();
    const { data } = await request.json();
    await sql`
      INSERT INTO user_data (id, data, updated_at)
      VALUES (${USER_ID}, ${JSON.stringify(data)}, NOW())
      ON CONFLICT (id) DO UPDATE
        SET data = ${JSON.stringify(data)}, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/data error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
