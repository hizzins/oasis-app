"use client";

import { useState, useCallback, useMemo } from "react";
import FileUpload from "@/components/FileUpload";
import Preview from "@/components/Preview";
import { groupByClientContact } from "@/lib/grouping";
import type { InvoiceGroup, ParseResult, WorkOrderRow, ContactInfo } from "@/lib/types";
import { generatePdfBlob } from "@/lib/pdfClient";
import { generateExcelBlob } from "@/lib/excelClient";
import JSZip from "jszip";

type Step = "upload" | "month" | "preview";
type Mode = "basic" | "consolidated";

function rowMonth(row: WorkOrderRow): string {
  const parts = row.date.split(".");
  if (parts.length < 2) return "";
  return `${parts[0].trim()}.${parts[1].trim()}`;
}

// "2026.3" / "2026.03" → 202603 (정렬·범위 비교용 숫자)
function monthValue(month: string): number {
  const parts = month.split(".");
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 100 + parseInt(parts[1], 10);
}

// "2026.3" → "2026년 3월"
function formatMonthLabel(month: string): string {
  const parts = month.split(".");
  if (parts.length < 2) return month;
  return `${parts[0]}년 ${parseInt(parts[1], 10)}월`;
}

// 파일명용: 공백 제거. 시작=종료면 단일월, 아니면 범위.
function formatRangeFilename(start: string, end: string): string {
  if (!start) return "기간";
  if (start === end) return formatMonthLabel(start).replace(/\s/g, "");
  return `${formatMonthLabel(start).replace(/\s/g, "")}-${formatMonthLabel(end).replace(/\s/g, "")}`;
}

// 통합 모드 필터 파싱: "" → 전체, "branch:가산" → 지사, "client:A센터" → 거래처
function parseFilter(filter: string): { type: "all" | "branch" | "client"; value: string } {
  if (!filter) return { type: "all", value: "" };
  const idx = filter.indexOf(":");
  return { type: filter.slice(0, idx) as "branch" | "client", value: filter.slice(idx + 1) };
}

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [mode, setMode] = useState<Mode>("basic");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>(""); // "" = 전체 | "branch:지사명" | "client:거래처명"
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

  // 파싱 결과 적용 + 통합 모드 기본 기간(전체) 세팅
  const applyParseResult = useCallback((result: ParseResult) => {
    setParseResult(result);
    setAllRows(result.rows);
    setContacts(result.contacts);
    const months = [...result.availableMonths].sort((a, b) => monthValue(a) - monthValue(b));
    // 디폴트: 종료=마지막 월, 시작=그 이전 월(없으면 마지막 월과 동일)
    const lastIdx = months.length - 1;
    setEndMonth(months[lastIdx] ?? "");
    setStartMonth(months[lastIdx - 1] ?? months[lastIdx] ?? "");
    setSelectedFilter("");
    setSelectedMonth("");
    setStep("month");
  }, []);

  // 방법 1: 파일 경로로 서버에서 읽기
  const handleFilePathSubmit = useCallback(
    async (filePath: string) => {
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
        applyParseResult(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "파일 처리 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [applyParseResult]
  );

  // 방법 2: 파일 업로드 (드래그앤드롭 / 클릭 선택)
  const handleFileUpload = useCallback(
    async (file: File) => {
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
        applyParseResult(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "파일 업로드 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [applyParseResult]
  );

  // 통합 모드 지사 드롭다운 목록 (allRows에서 derive)
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    for (const row of allRows) {
      if (row.branch) set.add(row.branch.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [allRows]);

  // 통합 모드 거래처 드롭다운 목록 (allRows에서 derive)
  const availableClients = useMemo(() => {
    const set = new Set<string>();
    for (const row of allRows) {
      if (row.client) set.add(row.client.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [allRows]);

  // 통합 모드 기간 드롭다운용 정렬된 월 목록 (숫자 기준)
  const sortedMonths = useMemo(() => {
    if (!parseResult) return [];
    return [...parseResult.availableMonths].sort((a, b) => monthValue(a) - monthValue(b));
  }, [parseResult]);

  // 기본 모드: 단일 월 선택 → 그룹핑 → 미리보기
  const handleMonthSelect = useCallback(
    (month: string) => {
      setSelectedMonth(month);
      const filtered = allRows.filter((row) => rowMonth(row) === month);
      const grouped = groupByClientContact(filtered, contacts);
      setGroups(grouped);
      setStep("preview");
    },
    [allRows, contacts]
  );

  // 통합 모드: 기간(시작~종료) + 대상(전체/지사/거래처) → 그룹핑 → 미리보기
  const handleConsolidatedApply = useCallback(() => {
    if (!startMonth || !endMonth) {
      setError("정산 기간을 선택해주세요.");
      return;
    }
    // 시작이 종료보다 뒤면 자동 교정
    const lo = monthValue(startMonth) <= monthValue(endMonth) ? startMonth : endMonth;
    const hi = monthValue(startMonth) <= monthValue(endMonth) ? endMonth : startMonth;
    const loVal = monthValue(lo);
    const hiVal = monthValue(hi);

    const { type, value } = parseFilter(selectedFilter);

    const filtered = allRows.filter((row) => {
      const m = rowMonth(row);
      if (!m) return false;
      const v = monthValue(m);
      if (v < loVal || v > hiVal) return false;
      if (type === "branch" && row.branch.trim() !== value) return false;
      if (type === "client" && row.client.trim() !== value) return false;
      return true;
    });

    if (filtered.length === 0) {
      setError("선택한 조건에 해당하는 데이터가 없습니다.");
      return;
    }

    setError(null);
    setStartMonth(lo);
    setEndMonth(hi);
    // 거래처 기준 선택 시 지사 행도 거래처로 묶어 한 장으로 (groupBy: "client")
    const grouped = groupByClientContact(filtered, contacts, {
      groupBy: type === "client" ? "client" : "auto",
    });
    setGroups(grouped);
    setStep("preview");
  }, [allRows, contacts, startMonth, endMonth, selectedFilter]);

  // ZIP 파일명 라벨 (모드별)
  const fileLabel = useMemo(() => {
    if (mode === "basic") {
      return selectedMonth ? `${selectedMonth.replace(".", "년")}월` : "견적서";
    }
    const range = formatRangeFilename(startMonth, endMonth);
    const { value } = parseFilter(selectedFilter);
    return value ? `${range}_${value}` : range;
  }, [mode, selectedMonth, startMonth, endMonth, selectedFilter]);

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
        const fileName = `견적서_${fileLabel}.zip`;
        setDownloadUrl(url);
        setDownloadName(fileName);
      } catch {
        setError("ZIP 생성 중 오류가 발생했습니다.");
      }
    } else {
      setError("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    }

    setIsGenerating(false);
  }, [groups, fileLabel, downloadUrl]);

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
        const fileName = `견적서_${fileLabel}_excel.zip`;
        setDownloadUrl(url);
        setDownloadName(fileName);
      } catch {
        setError("ZIP 생성 중 오류가 발생했습니다.");
      }
    } else {
      setError("Excel 생성에 실패했습니다. 다시 시도해주세요.");
    }

    setIsGeneratingExcel(false);
  }, [groups, fileLabel, downloadUrl]);

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setStep("upload");
    setMode("basic");
    setParseResult(null);
    setSelectedMonth("");
    setStartMonth("");
    setEndMonth("");
    setSelectedFilter("");
    setGroups([]);
    setAllRows([]);
    setContacts([]);
    setError(null);
    setDownloadUrl(null);
    setDownloadName("");
  };

  // 미리보기 상단 요약 라벨
  const periodSummary =
    mode === "basic"
      ? `${formatMonthLabel(selectedMonth)} 정산`
      : startMonth === endMonth
        ? `${formatMonthLabel(startMonth)} 통합`
        : `${formatMonthLabel(startMonth)} ~ ${formatMonthLabel(endMonth)} 통합`;
  const { type: filterType, value: filterValue } = parseFilter(selectedFilter);
  const filterSummary =
    mode === "consolidated" && filterType !== "all"
      ? ` · ${filterValue} (${filterType === "branch" ? "지사" : "거래처"})`
      : "";

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
          <div>
            {/* 변환 모드 선택 (라디오) */}
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">변환 모드</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    mode === "basic"
                      ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
                      : "bg-white hover:border-blue-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="mt-1"
                    checked={mode === "basic"}
                    onChange={() => setMode("basic")}
                  />
                  <div>
                    <div className="font-medium">기본</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      월 1개를 선택해 해당 월 견적서를 생성합니다.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    mode === "consolidated"
                      ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
                      : "bg-white hover:border-blue-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="mt-1"
                    checked={mode === "consolidated"}
                    onChange={() => setMode("consolidated")}
                  />
                  <div>
                    <div className="font-medium">통합</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      기간(시작~종료 월)과 대상(지사/거래처)을 선택해 통합 견적서를 생성합니다.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <FileUpload onFilePathSubmit={handleFilePathSubmit} onFileUpload={handleFileUpload} isLoading={isLoading} />
          </div>
        )}

        {step === "month" && parseResult && (
          <div>
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                파일 분석 완료: <strong>{parseResult.totalRows}건</strong>의
                작업 데이터, <strong>{parseResult.availableMonths.length}개월</strong>
                {parseResult.contacts.length > 0 &&
                  `, 거래처 연락처 ${parseResult.contacts.length}건`}
              </p>
            </div>

            {/* 기본 모드: 월 버튼 그리드 (단일 선택) */}
            {mode === "basic" && (
              <>
                <h2 className="text-xl font-bold mb-4">정산 월 선택</h2>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {sortedMonths.map((month) => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(month)}
                      className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-center font-medium"
                    >
                      {month.replace(".", "년 ")}월
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 통합 모드: 기간 드롭다운 + 거래처 드롭다운 */}
            {mode === "consolidated" && (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-bold mb-3">정산 기간 선택</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="border rounded-lg px-4 py-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {sortedMonths.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400">~</span>
                    <select
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="border rounded-lg px-4 py-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {sortedMonths.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-3">대상 선택</h2>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="w-full sm:w-80 border rounded-lg px-4 py-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">전체</option>
                    {availableBranches.length > 0 && (
                      <optgroup label="지사">
                        {availableBranches.map((branch) => (
                          <option key={`branch:${branch}`} value={`branch:${branch}`}>
                            {branch}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="거래처">
                      {availableClients.map((client) => (
                        <option key={`client:${client}`} value={`client:${client}`}>
                          {client}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </section>

                <div className="flex items-center justify-between border-t pt-6">
                  <div className="text-sm text-gray-600">
                    {startMonth === endMonth
                      ? formatMonthLabel(startMonth)
                      : `${formatMonthLabel(startMonth)} ~ ${formatMonthLabel(endMonth)}`}
                    {" · "}
                    {filterType === "all"
                      ? "전체"
                      : `${filterValue} (${filterType === "branch" ? "지사" : "거래처"})`}
                  </div>
                  <button
                    onClick={handleConsolidatedApply}
                    disabled={!startMonth || !endMonth}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    견적서 생성 →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setStep("month")}
                className="text-sm text-blue-600 hover:underline"
              >
                ← {mode === "basic" ? "월 선택으로" : "기간 선택으로"}
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-500">
                {periodSummary}
                {filterSummary}
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
