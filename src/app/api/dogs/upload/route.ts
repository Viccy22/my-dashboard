import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  if (!filename || !request.body) {
    return NextResponse.json({ error: "Missing filename or body" }, { status: 400 });
  }
  const blob = await put(`dogs/${Date.now()}_${filename}`, request.body, {
    access: "public",
    contentType: request.headers.get("content-type") ?? "application/octet-stream",
  });
  return NextResponse.json({ url: blob.url, name: filename });
}
