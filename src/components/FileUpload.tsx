"use client";

import { useState, useRef, useEffect } from "react";

interface FileUploadProps {
  onFilePathSubmit: (filePath: string) => void;
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFilePathSubmit, onFileUpload, isLoading }: FileUploadProps) {
  const [filePath, setFilePath] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use native DOM events instead of React synthetic events
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = () => {
      setIsDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
        onFileUpload(file);
      }
    };

    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  }, [onFileUpload]);

  return (
    <div className="space-y-6">
      {/* 방법 1: 드래그앤드롭 / 클릭 */}
      <div
        ref={dropRef}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileUpload(file);
          }}
          className="hidden"
          disabled={isLoading}
        />
        <div className="pointer-events-none">
          <div className="text-4xl mb-3">📄</div>
          {isLoading ? (
            <div>
              <div className="animate-spin text-2xl mb-2">⏳</div>
              <p className="text-gray-600">파일 분석 중...</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-800">
                작업전표 엑셀 파일을 드래그하거나 클릭하세요
              </p>
              <p className="text-sm text-gray-500 mt-1">.xlsx, .xls 파일 지원</p>
            </div>
          )}
        </div>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-sm text-gray-400">또는 파일 경로 직접 입력</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* 방법 2: 파일 경로 입력 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="/Users/.../작업전표.xlsx"
          className="flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && filePath.trim()) onFilePathSubmit(filePath.trim());
          }}
          disabled={isLoading}
        />
        <button
          onClick={() => filePath.trim() && onFilePathSubmit(filePath.trim())}
          disabled={isLoading || !filePath.trim()}
          className="border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          경로로 열기
        </button>
      </div>
    </div>
  );
}
