"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import Preview from "@/components/Preview";
import { groupByClientContact } from "@/lib/grouping";
import type { InvoiceGroup, ParseResult, WorkOrderRow, ContactInfo } from "@/lib/types";
import { generatePdfBlob } from "@/lib/pdfClient";
import { generateExcelBlob } from "@/lib/excelClient";
import JSZip from "jszip";

type Step = "upload" | "month" | "preview";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [groups, setGroups] = useState<InvoiceGroup[]>([]);
  const [allRows, setAllRows] = useState<WorkOrderRow[]>([]);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("");

  // 방법 1: 파일 경로로 서버에서 읽기
  const handleFilePathSubmit = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "파싱 실패");
      }

      const result: ParseResult = await response.json();
      setParseResult(result);
      setAllRows(result.rows);
      setContacts(result.contacts);
      setStep("month");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "파일 처리 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 방법 2: 파일 업로드 (드래그앤드롭 / 클릭 선택)
  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "파싱 실패");
      }

      const result: ParseResult = await response.json();
      setParseResult(result);
      setAllRows(result.rows);
      setContacts(result.contacts);
      setStep("month");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "파일 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleMonthSelect = useCallback(
    (month: string) => {
      setSelectedMonth(month);
      const filtered = allRows.filter((row) => {
        const parts = row.date.split(".");
        if (parts.length >= 2) {
          const m = `${parts[0].trim()}.${parts[1].trim()}`;
          return m === month;
        }
        return false;
      });
      const grouped = groupByClientContact(filtered, contacts);
      setGroups(grouped);
      setStep("preview");
    },
    [allRows, contacts]
  );

  const handleGenerate = useCallback(async () => {
    if (groups.length === 0) return;

    setIsGenerating(true);
    setProgress(0);
    setDownloadUrl(null);

    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < groups.length; i++) {
      try {
        const blob = await generatePdfBlob(groups[i]);
        const contactPart = groups[i].contact ? `_${groups[i].contact}` : "";
        const fileName = `${groups[i].client}${contactPart}.pdf`;
        zip.file(fileName, blob);
        successCount++;
      } catch {
        // skip failed PDF
      }
      setProgress(i + 1);
    }

    if (successCount > 0) {
      try {
        const content = await zip.generateAsync({ type: "blob" });
        // Clean up previous download URL
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        const url = URL.createObjectURL(content);
        const fileName = `견적서_${selectedMonth.replace(".", "년")}월.zip`;
        setDownloadUrl(url);
        setDownloadName(fileName);
      } catch {
        setError("ZIP 생성 중 오류가 발생했습니다.");
      }
    } else {
      setError("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    }

    setIsGenerating(false);
  }, [groups, selectedMonth]);

  const handleGenerateExcel = useCallback(async () => {
    if (groups.length === 0) return;

    setIsGeneratingExcel(true);
    setProgress(0);
    setDownloadUrl(null);

    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < groups.length; i++) {
      try {
        const blob = await generateExcelBlob(groups[i]);
        const contactPart = groups[i].contact ? `_${groups[i].contact}` : "";
        const fileName = `${groups[i].client}${contactPart}.xlsx`;
        zip.file(fileName, blob);
        successCount++;
      } catch {
        // skip failed Excel
      }
      setProgress(i + 1);
    }

    if (successCount > 0) {
      try {
        const content = await zip.generateAsync({ type: "blob" });
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        const url = URL.createObjectURL(content);
        const fileName = `견적서_${selectedMonth.replace(".", "년")}월_excel.zip`;
        setDownloadUrl(url);
        setDownloadName(fileName);
      } catch {
        setError("ZIP 생성 중 오류가 발생했습니다.");
      }
    } else {
      setError("Excel 생성에 실패했습니다. 다시 시도해주세요.");
    }

    setIsGeneratingExcel(false);
  }, [groups, selectedMonth]);


  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setStep("upload");
    setParseResult(null);
    setSelectedMonth("");
    setGroups([]);
    setAllRows([]);
    setContacts([]);
    setError(null);
    setDownloadUrl(null);
    setDownloadName("");
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Oasis</h1>
            <p className="text-gray-500 mt-1">
              작업전표 → 견적서 자동 변환
            </p>
          </div>
          {step !== "upload" && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              처음으로
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {step === "upload" && (
          <FileUpload onFilePathSubmit={handleFilePathSubmit} onFileUpload={handleFileUpload} isLoading={isLoading} />
        )}

        {step === "month" && parseResult && (
          <div>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                파일 분석 완료: <strong>{parseResult.totalRows}건</strong>의
                작업 데이터, <strong>{parseResult.availableMonths.length}개월</strong>
                {parseResult.contacts.length > 0 &&
                  `, 거래처 연락처 ${parseResult.contacts.length}건`}
              </p>
            </div>

            <h2 className="text-xl font-bold mb-4">정산 월 선택</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {parseResult.availableMonths.map((month) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-center font-medium"
                >
                  {month.replace(".", "년 ")}월
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setStep("month")}
                className="text-sm text-blue-600 hover:underline"
              >
                ← 월 선택으로
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-500">
                {selectedMonth.replace(".", "년 ")}월 정산
              </span>
            </div>
            {downloadUrl && (
              <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 font-medium mb-3">
                  {groups.length}개 파일 생성 완료!
                </p>
                <a
                  href={downloadUrl}
                  download={downloadName}
                  className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 text-lg"
                >
                  📥 {downloadName} 다운로드
                </a>
              </div>
            )}

            <Preview
              groups={groups}
              onGroupsChange={setGroups}
              onGenerate={handleGenerate}
              onGenerateExcel={handleGenerateExcel}
              isGenerating={isGenerating}
              isGeneratingExcel={isGeneratingExcel}
              progress={progress}
            />
          </div>
        )}
      </div>
    </main>
  );
}
