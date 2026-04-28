import type { InvoiceGroup } from "./types";

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

// Map work order product types to invoice categories
function categorizeProduct(product: string, printType: string): string {
  const lower = product.toLowerCase();
  if (lower.includes("배너") || lower.includes("현수막")) return "배 너";
  if (lower.includes("스티커")) return "스티커";
  if (lower.includes("시트지") || lower.includes("바닥")) return "시트지";
  if (lower.includes("명함")) return "명 함";
  if (lower.includes("리플렛") || lower.includes("리플릿")) return "인쇄물";
  if (lower.includes("폼보드") || lower.includes("포맥스")) return "폼보드";
  if (lower.includes("봉투")) return "봉 투";
  if (lower.includes("게시판") || lower.includes("현황판")) return "시트지";
  return "인쇄물";
}

export function generateInvoiceHTML(group: InvoiceGroup, companyInfo: {
  name: string;
  representative: string;
  businessNumber: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
}): string {
  const items = group.items.map((item) => ({
    category: categorizeProduct(item.product, item.printType),
    description: item.product,
    size: item.size,
    quantity: item.quantity,
    unit: "EA",
    unitPrice: item.amount,
    amount: item.amount,
  }));

  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td class="category">${item.category}</td>
      <td class="description">${item.description}</td>
      <td class="size">${item.size}</td>
      <td class="qty">${item.quantity}</td>
      <td class="unit">${item.unit}</td>
      <td class="price">${formatNumber(item.unitPrice)}</td>
      <td class="amount">${formatNumber(item.amount)}</td>
    </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 11px;
    color: #222;
    padding: 40px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 20px;
    border: 2px solid #333;
    padding: 8px 20px;
    display: inline-block;
  }

  .company-name {
    font-size: 24px;
    font-weight: 700;
    color: #1a56db;
    text-align: right;
  }

  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 11px;
  }

  .info-table td {
    padding: 4px 8px;
    border: none;
  }

  .info-table .label {
    color: #666;
    width: 70px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-top: 2px solid #333;
    border-bottom: 1px solid #ccc;
    margin-bottom: 10px;
  }

  .summary-row .period {
    font-size: 14px;
    font-weight: 600;
  }

  .summary-row .total {
    font-size: 14px;
    font-weight: 700;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  .items-table th {
    background: #f3f4f6;
    padding: 8px 6px;
    text-align: center;
    font-weight: 600;
    border: 1px solid #d1d5db;
    font-size: 11px;
  }

  .items-table td {
    padding: 6px;
    border: 1px solid #d1d5db;
    text-align: center;
    font-size: 10px;
  }

  .items-table .category { width: 60px; }
  .items-table .description { text-align: left; }
  .items-table .size { width: 80px; }
  .items-table .qty { width: 60px; }
  .items-table .unit { width: 40px; }
  .items-table .price { width: 70px; text-align: right; }
  .items-table .amount { width: 80px; text-align: right; }

  .totals-table {
    width: 300px;
    margin-left: auto;
    border-collapse: collapse;
  }

  .totals-table td {
    padding: 5px 10px;
    border: 1px solid #d1d5db;
  }

  .totals-table .label-cell {
    background: #f3f4f6;
    font-weight: 600;
    text-align: center;
    width: 100px;
  }

  .totals-table .value-cell {
    text-align: right;
    font-weight: 500;
  }

  .totals-table .grand-total .label-cell {
    background: #dbeafe;
    font-weight: 700;
  }

  .totals-table .grand-total .value-cell {
    font-weight: 700;
    font-size: 13px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="title">견 적 서</div>
    <div class="company-name">${companyInfo.name}</div>
  </div>

  <table class="info-table">
    <tr>
      <td class="label">견적일 :</td>
      <td>${formatDate()}</td>
      <td class="label">담당자 :</td>
      <td>${companyInfo.representative}</td>
      <td class="label">사업자번호 :</td>
      <td>${companyInfo.businessNumber}</td>
    </tr>
    <tr>
      <td class="label">수 신 :</td>
      <td><strong>${group.client}</strong> 귀하</td>
      <td class="label">Office :</td>
      <td>${companyInfo.phone} / fax ${companyInfo.fax}</td>
      <td class="label">주소 :</td>
      <td>${companyInfo.address}</td>
    </tr>
    <tr>
      <td class="label">담당자 :</td>
      <td>${group.contact}</td>
      <td class="label">e-mail :</td>
      <td>${companyInfo.email}</td>
      <td></td>
      <td></td>
    </tr>
  </table>

  <div class="summary-row">
    <div class="period">제작건</div>
    <div class="total">총금액(VAT포함) ${formatNumber(group.total)}</div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="category">품 목</th>
        <th class="description">제작내역</th>
        <th class="size">규 격</th>
        <th class="qty">수 량</th>
        <th class="unit">단위</th>
        <th class="price">단 가</th>
        <th class="amount">금 액</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td class="label-cell">소 계</td>
      <td class="value-cell">${formatNumber(group.subtotal)}</td>
    </tr>
    <tr>
      <td class="label-cell">일반관리비</td>
      <td class="value-cell">${group.managementFee > 0 ? formatNumber(group.managementFee) : "-"}</td>
    </tr>
    <tr>
      <td class="label-cell">절 사</td>
      <td class="value-cell">${group.rounding !== 0 ? formatNumber(group.rounding) : "-"}</td>
    </tr>
    <tr>
      <td class="label-cell">공급가액</td>
      <td class="value-cell">${formatNumber(group.supplyAmount)}</td>
    </tr>
    <tr>
      <td class="label-cell">부가세</td>
      <td class="value-cell">${formatNumber(group.vat)}</td>
    </tr>
    <tr class="grand-total">
      <td class="label-cell">합계(VAT포함)</td>
      <td class="value-cell">${formatNumber(group.total)}</td>
    </tr>
  </table>
</body>
</html>`;
}
