import { NextRequest, NextResponse } from "next/server";
import { parseWorkbookBuffer } from "@/lib/parseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filePath = body.filePath as string;

    if (!filePath) {
      return NextResponse.json({ error: "파일 경로가 없습니다." }, { status: 400 });
    }

    const fs = await import("fs");
    const path = await import("path");

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `파일을 찾을 수 없습니다: ${resolvedPath}` },
        { status: 400 }
      );
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const result = parseWorkbookBuffer(fileBuffer);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
