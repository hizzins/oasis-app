import type { InvoiceGroup } from "./types";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { formatNumber, isPlainNumber, displayAmount } from "./format";

function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

export function categorizeProduct(product: string): string {
  const lower = product.toLowerCase();
  if (lower.includes("배너") || lower.includes("현수막")) return "배 너";
  if (lower.includes("스티커")) return "스티커";
  if (lower.includes("시트지") || lower.includes("바닥")) return "시트지";
  if (lower.includes("명함")) return "명 함";
  if (lower.includes("리플렛") || lower.includes("리플릿")) return "인쇄물";
  if (lower.includes("폼보드") || lower.includes("포맥스")) return "폼보드";
  if (lower.includes("봉투")) return "봉 투";
  return "인쇄물";
}

function buildInvoiceHTML(group: InvoiceGroup, companyInfo: typeof COMPANY_INFO): string {
  const isBranch = group.groupType === "branch";

  const thStyle = "padding:6px 4px;font-size:9px;white-space:nowrap;text-align:center;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db";
  const tdStyle = "padding:5px 4px;font-size:9px;text-align:center;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db";

  const items = group.items.map((item) => {
    const clientCol = isBranch ? `<td style="${tdStyle}">${item.client}</td>` : "";
    const isNumericAmount = isPlainNumber(item.amountRaw);
    const unitPriceCell = isNumericAmount
      ? formatNumber(item.unitPrice)
      : item.amountRaw;
    const amountCell = displayAmount(item.amount, item.amountRaw);
    return `
    <tr>
      ${clientCol}
      <td style="${tdStyle};white-space:nowrap">${item.contact}</td>
      <td style="${tdStyle}">${item.category || categorizeProduct(item.product)}</td>
      <td style="${tdStyle};text-align:left">${item.product}</td>
      <td style="${tdStyle}">${item.size}</td>
      <td style="${tdStyle}">${item.quantity}</td>
      <td style="${tdStyle}">${item.unit || "EA"}</td>
      <td style="${tdStyle};text-align:right">${unitPriceCell}</td>
      <td style="${tdStyle};text-align:right">${amountCell}</td>
    </tr>`;
  }).join("");

  const clientHeader = isBranch ? `<th style="${thStyle}">거래처</th>` : "";

  return `
    <div style="font-family:'Pretendard',sans-serif;font-size:11px;color:#222;padding:30px;width:800px;background:white">
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:26px;font-weight:800;letter-spacing:18px;border:2px solid #333;padding:6px 16px">견 적 서</div>
        <div style="font-size:22px;font-weight:700;color:#1a56db">${companyInfo.name}</div>
      </div>
      <table style="width:100%;font-size:10px;margin-bottom:12px">
        <tr>
          <td style="color:#666;width:60px">견적일 :</td><td>${formatDate()}</td>
          <td style="color:#666;width:60px">담당자 :</td><td>${companyInfo.representative}</td>
          <td style="color:#666;width:75px">사업자번호 :</td><td>${companyInfo.businessNumber}</td>
        </tr>
        <tr>
          <td style="color:#666">수 신 :</td><td><b>${group.client}</b>${isBranch ? "" : " 귀하"}</td>
          <td style="color:#666">Office :</td><td>${companyInfo.phone} / fax ${companyInfo.fax}</td>
          <td style="color:#666">주소 :</td><td>${companyInfo.address}</td>
        </tr>
        <tr>
          <td style="color:#666">담당자 :</td><td>${isBranch ? group.branchContact : group.contact}</td>
          <td style="color:#666">e-mail :</td><td>${companyInfo.email}</td>
          <td></td><td></td>
        </tr>
      </table>
      <div style="display:flex;justify-content:space-between;border-top:2px solid #333;border-bottom:1px solid #ccc;padding:8px 0;margin-bottom:8px">
        <div style="font-size:13px;font-weight:600">제작건</div>
        <div style="font-size:13px;font-weight:700">총금액(VAT포함) ${formatNumber(group.total)}</div>
      </div>
      <table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:16px;table-layout:auto;border-top:1px solid #d1d5db;border-left:1px solid #d1d5db">
        <thead>
          <tr style="background:#f3f4f6">
            ${clientHeader}
            <th style="${thStyle}">담당자</th>
            <th style="${thStyle}">품 목</th>
            <th style="${thStyle};text-align:left">제작내역</th>
            <th style="${thStyle}">규 격</th>
            <th style="${thStyle}">수 량</th>
            <th style="${thStyle};width:25px">단위</th>
            <th style="${thStyle}">단 가</th>
            <th style="${thStyle}">금 액</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      <table style="width:300px;margin-left:auto;border-collapse:separate;border-spacing:0;font-size:11px;border-top:1px solid #d1d5db;border-left:1px solid #d1d5db">
        <tr><td style="background:#f3f4f6;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:center;font-weight:600;width:100px">소 계</td><td style="border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:right">${formatNumber(group.subtotal)}</td></tr>
        <tr><td style="background:#f3f4f6;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:center;font-weight:600">일반관리비</td><td style="border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:right">${group.managementFee > 0 ? formatNumber(group.managementFee) : "-"}</td></tr>
        <tr><td style="background:#f3f4f6;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:center;font-weight:600">절 사</td><td style="border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:right">${group.rounding !== 0 ? formatNumber(group.rounding) : "-"}</td></tr>
        <tr><td style="background:#f3f4f6;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:center;font-weight:600">공급가액</td><td style="border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:right">${formatNumber(group.supplyAmount)}</td></tr>
        <tr><td style="background:#f3f4f6;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:center;font-weight:600">부가세</td><td style="border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:right">${formatNumber(group.vat)}</td></tr>
        <tr><td style="background:#dbeafe;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:center;font-weight:700">합계(VAT포함)</td><td style="border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 10px;text-align:right;font-weight:700;font-size:13px">${formatNumber(group.total)}</td></tr>
      </table>
    </div>`;
}

const COMPANY_INFO = {
  name: "대청기획",
  representative: "박 서 준",
  businessNumber: "201-18-23464",
  address: "서울시 중구 인현동2가 192-30",
  phone: "02-2264-3355",
  fax: "02-2264-9177",
  email: "dcpub@dcpub.co.kr",
};

export async function generatePdfBlob(group: InvoiceGroup): Promise<Blob> {
  // Create off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = buildInvoiceHTML(group, COMPANY_INFO);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page: slice the image across pages
      let yOffset = 0;
      while (yOffset < pdfHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -yOffset, pdfWidth, pdfHeight);
        yOffset += pageHeight;
      }
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}
