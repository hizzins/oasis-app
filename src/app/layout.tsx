import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oasis - 작업전표 → 견적서 자동 변환",
  description: "엑셀 작업전표를 업로드하면 거래처별 견적서/계산서를 자동으로 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
