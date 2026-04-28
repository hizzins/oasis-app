import { NextRequest, NextResponse } from "next/server";
import { parseWorkbookBuffer } from "@/lib/parseServer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = parseWorkbookBuffer(buffer);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Upload parse error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
