"use client";

import { useState } from "react";
import type { InvoiceGroup } from "@/lib/types";
import { recalculateGroup } from "@/lib/grouping";
import { generatePdfBlob, categorizeProduct } from "@/lib/pdfClient";
import { generateExcelBlob } from "@/lib/excelClient";
import { isPlainNumber, parseQuantity } from "@/lib/format";

interface PreviewProps {
  groups: InvoiceGroup[];
  onGroupsChange: (groups: InvoiceGroup[]) => void;
  onGenerate: () => void;
  onGenerateExcel: () => void;
  isGenerating: boolean;
  isGeneratingExcel: boolean;
  progress: number;
}

type DownloadKind = "pdf" | "excel";

export default function Preview({
  groups,
  onGroupsChange,
  onGenerate,
  onGenerateExcel,
  isGenerating,
  isGeneratingExcel,
  progress,
}: PreviewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<{ index: number; kind: DownloadKind } | null>(null);

  const totalAmount = groups.reduce((sum, g) => sum + g.total, 0);

  const updateItem = (
    groupIndex: number,
    itemIndex: number,
    updates: Partial<InvoiceGroup["items"][number]>
  ) => {
    const newGroups = [...groups];
    const group = { ...newGroups[groupIndex] };
    const items = [...group.items];
    items[itemIndex] = { ...items[itemIndex], ...updates };
    group.items = items;
    newGroups[groupIndex] = recalculateGroup(group);
    onGroupsChange(newGroups);
  };

  const parseQty = (q: string): number => {
    const n = parseQuantity(q);
    return n > 0 ? n : 1;
  };

  const handleAmountChange = (groupIndex: number, itemIndex: number, text: string) => {
    const current = groups[groupIndex].items[itemIndex];
    const cleaned = text.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    const numeric = isPlainNumber(text);
    const newAmount = numeric && isFinite(num) ? Math.round(num) : 0;
    const newUnitPrice = numeric ? Math.round(newAmount / parseQty(current.quantity)) : current.unitPrice;
    updateItem(groupIndex, itemIndex, {
      amount: newAmount,
      amountRaw: text,
      unitPrice: newUnitPrice,
    });
  };

  const handleQuantityChange = (groupIndex: number, itemIndex: number, text: string) => {
    const current = groups[groupIndex].items[itemIndex];
    const safeQty = parseQty(text);
    const newUnitPrice = Math.round(current.amount / safeQty);
    updateItem(groupIndex, itemIndex, { quantity: text, unitPrice: newUnitPrice });
  };

  const handleUnitChange = (groupIndex: number, itemIndex: number, text: string) => {
    updateItem(groupIndex, itemIndex, { unit: text });
  };

  const handleUnitPriceChange = (groupIndex: number, itemIndex: number, text: string) => {
    const current = groups[groupIndex].items[itemIndex];
    const num = parseFloat(text.replace(/,/g, "").trim());
    if (!isFinite(num) || num < 0) return;
    const safeQty = parseQty(current.quantity);
    const newAmount = Math.round(num * safeQty);
    updateItem(groupIndex, itemIndex, {
      unitPrice: Math.round(num),
      amount: newAmount,
      amountRaw: String(newAmount),
    });
  };

  const handleClientChange = (groupIndex: number, itemIndex: number, text: string) => {
    updateItem(groupIndex, itemIndex, { client: text });
  };
  const handleContactChange = (groupIndex: number, itemIndex: number, text: string) => {
    updateItem(groupIndex, itemIndex, { contact: text });
  };
  const handleCategoryChange = (groupIndex: number, itemIndex: number, text: string) => {
    updateItem(groupIndex, itemIndex, { category: text });
  };
  const handleProductChange = (groupIndex: number, itemIndex: number, text: string) => {
    updateItem(groupIndex, itemIndex, { product: text });
  };
  const handleSizeChange = (groupIndex: number, itemIndex: number, text: string) => {
    updateItem(groupIndex, itemIndex, { size: text });
  };

  const handleDeleteItem = (groupIndex: number, itemIndex: number) => {
    const newGroups = [...groups];
    const group = { ...newGroups[groupIndex] };
    const items = [...group.items];
    items.splice(itemIndex, 1);
    if (items.length === 0) {
      newGroups.splice(groupIndex, 1);
    } else {
      group.items = items;
      newGroups[groupIndex] = recalculateGroup(group);
    }
    onGroupsChange(newGroups);
  };

  const handleManagementFeeChange = (groupIndex: number, fee: number) => {
    const newGroups = [...groups];
    const group = { ...newGroups[groupIndex], managementFee: fee };
    newGroups[groupIndex] = recalculateGroup(group);
    onGroupsChange(newGroups);
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleSingleDownload = async (group: InvoiceGroup, index: number) => {
    setDownloadingIndex({ index, kind: "pdf" });
    try {
      const blob = await generatePdfBlob(group);
      const contactPart = group.contact ? `_${group.contact}` : "";
      triggerDownload(blob, `${group.client}${contactPart}.pdf`);
    } catch {
      alert("PDF 생성에 실패했습니다.");
    }
    setDownloadingIndex(null);
  };

  const handleSingleExcelDownload = async (group: InvoiceGroup, index: number) => {
    setDownloadingIndex({ index, kind: "excel" });
    try {
      const blob = await generateExcelBlob(group);
      const contactPart = group.contact ? `_${group.contact}` : "";
      triggerDownload(blob, `${group.client}${contactPart}.xlsx`);
    } catch {
      alert("Excel 생성에 실패했습니다.");
    }
    setDownloadingIndex(null);
  };

  const formatNumber = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">미리보기</h2>
          <p className="text-sm text-gray-500">
            {groups.length}개 거래처, 총 {formatNumber(totalAmount)}원
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            수량 자동 파싱: 단위(부, 세트, 장, 건, 매, 개) · 한글 수사(2천, 10만, 1만5천 등)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onGenerateExcel}
            disabled={isGenerating || isGeneratingExcel || groups.length === 0}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingExcel
              ? `Excel 생성 중... (${progress}/${groups.length})`
              : `전체 Excel 생성 (${groups.length}개)`}
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating || isGeneratingExcel || groups.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? `PDF 생성 중... (${progress}/${groups.length})`
              : `전체 PDF 생성 (${groups.length}개)`}
          </button>
        </div>
      </div>

      {(isGenerating || isGeneratingExcel) && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${isGeneratingExcel ? "bg-emerald-600" : "bg-blue-600"} h-2 rounded-full transition-all`}
              style={{ width: `${(progress / groups.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group, groupIndex) => {
          const groupKey = `${group.groupType}:${group.client}|||${group.contact}`;
          const isExpanded = expandedGroup === groupKey;
          const isBranch = group.groupType === "branch";

          return (
            <div
              key={groupKey}
              className="border rounded-lg overflow-hidden"
            >
              <div
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  setExpandedGroup(isExpanded ? null : groupKey)
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
                  <div>
                    {isBranch && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mr-2">지사</span>
                    )}
                    <span className="font-medium">{group.client}</span>
                    {group.contact && (
                      <span className="text-gray-500 ml-2">
                        ({group.contact})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatNumber(group.total)}원
                    </div>
                    <div className="text-xs text-gray-500">
                      {group.items.length}건, 공급가 {formatNumber(group.supplyAmount)} + VAT{" "}
                      {formatNumber(group.vat)}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSingleExcelDownload(group, groupIndex);
                      }}
                      disabled={downloadingIndex !== null}
                      className="text-sm bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      {downloadingIndex?.index === groupIndex && downloadingIndex.kind === "excel"
                        ? "생성중..."
                        : "📊 Excel"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSingleDownload(group, groupIndex);
                      }}
                      disabled={downloadingIndex !== null}
                      className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      {downloadingIndex?.index === groupIndex && downloadingIndex.kind === "pdf"
                        ? "생성중..."
                        : "📥 PDF"}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b text-xs">
                        {isBranch && <th className="pb-2">거래처</th>}
                        <th className="pb-2">담당자</th>
                        <th className="pb-2">품목</th>
                        <th className="pb-2">제작내역</th>
                        <th className="pb-2">규격</th>
                        <th className="pb-2">수량</th>
                        <th className="pb-2">단위</th>
                        <th className="pb-2 text-right">단가</th>
                        <th className="pb-2 text-right">금액</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, itemIndex) => (
                        <tr
                          key={itemIndex}
                          className="border-b last:border-0 text-xs"
                        >
                          {isBranch && (
                            <td className="py-2">
                              <input
                                type="text"
                                value={item.client}
                                onChange={(e) =>
                                  handleClientChange(groupIndex, itemIndex, e.target.value)
                                }
                                className="w-28 border rounded px-2 py-1"
                              />
                            </td>
                          )}
                          <td className="py-2 whitespace-nowrap">
                            <input
                              type="text"
                              value={item.contact}
                              onChange={(e) =>
                                handleContactChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-28 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.category || categorizeProduct(item.product)}
                              onChange={(e) =>
                                handleCategoryChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-20 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.product}
                              onChange={(e) =>
                                handleProductChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-40 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.size}
                              onChange={(e) =>
                                handleSizeChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-24 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-20 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.unit || "EA"}
                              onChange={(e) =>
                                handleUnitChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-14 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 text-right">
                            {isPlainNumber(item.amountRaw) ? (
                              <input
                                type="text"
                                value={formatNumber(item.unitPrice)}
                                onChange={(e) =>
                                  handleUnitPriceChange(
                                    groupIndex,
                                    itemIndex,
                                    e.target.value.replace(/,/g, "")
                                  )
                                }
                                className="w-28 text-right border rounded px-2 py-1"
                              />
                            ) : (
                              <span className="text-gray-500">{item.amountRaw}</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <input
                              type="text"
                              value={
                                isPlainNumber(item.amountRaw)
                                  ? formatNumber(item.amount)
                                  : item.amountRaw
                              }
                              onChange={(e) =>
                                handleAmountChange(groupIndex, itemIndex, e.target.value)
                              }
                              className="w-28 text-right border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(groupIndex, itemIndex);
                              }}
                              className="text-red-400 hover:text-red-600"
                              title="삭제"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">일반관리비:</span>
                      <input
                        type="text"
                        value={formatNumber(group.managementFee)}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          handleManagementFeeChange(
                            groupIndex,
                            parseInt(val) || 0
                          );
                        }}
                        className="w-24 text-right border rounded px-2 py-1"
                      />
                    </div>
                    <div className="space-y-1 text-right">
                      <div>소계: {formatNumber(group.subtotal)}원</div>
                      <div>공급가액: {formatNumber(group.supplyAmount)}원</div>
                      <div>부가세: {formatNumber(group.vat)}원</div>
                      <div className="font-bold">
                        합계: {formatNumber(group.total)}원
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
