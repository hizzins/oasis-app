import ExcelJS from "exceljs";
import type { InvoiceGroup } from "./types";
import { categorizeProduct } from "./pdfClient";
import { isPlainNumber } from "./format";

const COMPANY_INFO = {
  name: "대청기획",
  representative: "박 서 준",
  businessNumber: "201-18-23464",
  address: "서울시 중구 인현동2가 192-30",
  phone: "02-2264-3355",
  fax: "02-2264-9177",
  email: "dcpub@dcpub.co.kr",
};

const FONT = "맑은 고딕";
const BASE_SIZE = 13;

const COLOR = {
  headerGray: "FFE8E8E8",
  totalGray: "FFD9D9D9",
  brandBlue: "FF1A56DB",
  borderGray: "FF999999",
  borderBlack: "FF000000",
  labelGray: "FF666666",
  refGray: "FF888888",
};

function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const b = { style: "thin" as const, color: { argb: COLOR.borderGray } };
  return { top: b, bottom: b, left: b, right: b };
}

function setLabel(ws: ExcelJS.Worksheet, addr: string, value: string) {
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.font = { name: FONT, size: BASE_SIZE, color: { argb: COLOR.labelGray } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

function setValue(
  ws: ExcelJS.Worksheet,
  addr: string,
  value: string,
  opts?: { wrap?: boolean }
) {
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.font = { name: FONT, size: BASE_SIZE };
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: opts?.wrap };
}

function mergeBorder(cell: ExcelJS.Cell, override: Partial<ExcelJS.Borders>) {
  cell.border = { ...(cell.border || {}), ...override };
}

const FORM_COLS = 7; // A=1 .. G=7

export async function buildInvoiceWorkbook(group: InvoiceGroup): Promise<ExcelJS.Workbook> {
  const isBranch = group.groupType === "branch";

  const wb = new ExcelJS.Workbook();
  wb.creator = COMPANY_INFO.name;
  wb.created = new Date();

  const sheetName = (group.client || "견적서")
    .substring(0, 28)
    .replace(/[\\/:*?[\]]/g, "_");
  const ws = wb.addWorksheet(sheetName || "견적서", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    properties: { defaultRowHeight: 22 },
  });

  // Column widths — A-G form area, H-J gap, K-L reference
  ws.columns = [
    { width: 14 }, // A
    { width: 37 }, // B
    { width: 18 }, // C
    { width: 14 }, // D
    { width: 8 },  // E  (+3, 한글 2자)
    { width: 17 }, // F
    { width: 16 }, // G
    { width: 4 },  // H gap
    { width: 4 },  // I gap
    { width: 4 },  // J gap
    { width: 18 }, // K 거래처
    { width: 14 }, // L 담당자
  ];

  // ── Row 1: Title (A:C boxed) + Company name (E:G blue right)
  ws.getRow(1).height = 44;
  ws.mergeCells("A1:C1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "견 적 서";
  titleCell.font = { name: FONT, bold: true, size: 26 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.border = {
    top: { style: "medium", color: { argb: COLOR.borderBlack } },
    bottom: { style: "medium", color: { argb: COLOR.borderBlack } },
    left: { style: "medium", color: { argb: COLOR.borderBlack } },
    right: { style: "medium", color: { argb: COLOR.borderBlack } },
  };

  ws.mergeCells("E1:G1");
  const companyCell = ws.getCell("E1");
  companyCell.value = COMPANY_INFO.name;
  companyCell.font = { name: FONT, bold: true, size: 22, color: { argb: COLOR.brandBlue } };
  companyCell.alignment = { horizontal: "right", vertical: "middle" };

  // Row 2: spacer
  ws.getRow(2).height = 8;

  // ── Row 3: 견적일 / 담당자(우리, C:D merged inline) / 사업자번호(E:G merged inline)
  ws.getRow(3).height = 24;
  setLabel(ws, "A3", "견적일");
  setValue(ws, "B3", formatDate());
  ws.mergeCells("C3:D3");
  setValue(ws, "C3", `담당자 : ${COMPANY_INFO.representative}`);
  ws.mergeCells("E3:G3");
  setValue(ws, "E3", `사업자번호 : ${COMPANY_INFO.businessNumber}`);

  // ── Row 4: 수신 / Office(C:D merged, 2-line wrap) / 주소 (E:G merged, no label)
  ws.getRow(4).height = 38;
  setLabel(ws, "A4", "수 신");
  setValue(ws, "B4", isBranch ? group.client : `${group.client} 귀하`);
  ws.mergeCells("C4:D4");
  setValue(ws, "C4", `Office : ${COMPANY_INFO.phone}\nfax ${COMPANY_INFO.fax}`, { wrap: true });
  ws.mergeCells("E4:G4");
  setValue(ws, "E4", COMPANY_INFO.address);

  // ── Row 5: 담당자(상대) / e-mail(merged inline)
  ws.getRow(5).height = 24;
  setLabel(ws, "A5", "담당자");
  setValue(ws, "B5", isBranch ? group.branchContact : group.contact);
  ws.mergeCells("C5:D5");
  setValue(ws, "C5", `e-mail : ${COMPANY_INFO.email}`);

  // Header info: bottom thin border between rows for visual separation
  for (let r = 3; r <= 5; r++) {
    for (let c = 1; c <= FORM_COLS; c++) {
      mergeBorder(ws.getCell(r, c), {
        bottom: { style: "thin", color: { argb: COLOR.borderGray } },
      });
    }
  }

  // Row 6: spacer
  ws.getRow(6).height = 8;

  // ── Row 7: section divider — 제작건 (gray) | 총금액(VAT포함) ###
  const dividerRow = 7;
  ws.getRow(dividerRow).height = 30;
  ws.mergeCells("A7:D7");
  const sectionCell = ws.getCell("A7");
  sectionCell.value = "제작건";
  sectionCell.font = { name: FONT, bold: true, size: 14 };
  sectionCell.alignment = { horizontal: "center", vertical: "middle" };
  sectionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerGray } };

  ws.mergeCells("E7:F7");
  const totalLabel = ws.getCell("E7");
  totalLabel.value = "총금액(VAT포함)";
  totalLabel.font = { name: FONT, bold: true, size: BASE_SIZE };
  totalLabel.alignment = { horizontal: "center", vertical: "middle" };
  totalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerGray } };

  const totalValue = ws.getCell("G7");
  totalValue.value = group.total;
  totalValue.numFmt = "#,##0";
  totalValue.font = { name: FONT, bold: true, size: 14 };
  totalValue.alignment = { horizontal: "right", vertical: "middle" };

  // Borders on divider row
  for (let c = 1; c <= FORM_COLS; c++) {
    ws.getCell(dividerRow, c).border = {
      top: { style: "medium", color: { argb: COLOR.borderBlack } },
      bottom: { style: "thin", color: { argb: COLOR.borderGray } },
      left: { style: "thin", color: { argb: COLOR.borderGray } },
      right: { style: "thin", color: { argb: COLOR.borderGray } },
    };
  }

  // Row 8: spacer (gap between section divider and item table)
  ws.getRow(8).height = 8;

  // ── Row 9: item table header (gray fill)
  const headerRow = 9;
  ws.getRow(headerRow).height = 28;
  const headers = ["품 목", "제작내역", "규 격", "수 량", "단위", "단 가", "금 액"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { name: FONT, bold: true, size: BASE_SIZE };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerGray } };
    cell.border = thinBorder();
  });

  // K8, L8 — reference column headers (outside form, lighter)
  const kHeader = ws.getCell("K8");
  kHeader.value = "거래처";
  kHeader.font = { name: FONT, bold: true, size: 11, color: { argb: COLOR.refGray } };
  kHeader.alignment = { horizontal: "center", vertical: "middle" };
  const lHeader = ws.getCell("L8");
  lHeader.value = "담당자";
  lHeader.font = { name: FONT, bold: true, size: 11, color: { argb: COLOR.refGray } };
  lHeader.alignment = { horizontal: "center", vertical: "middle" };

  // ── Item rows
  const itemsStart = headerRow + 1;
  group.items.forEach((item, i) => {
    const r = itemsStart + i;
    ws.getRow(r).height = 22;

    // 순수 숫자 수량일 때만 셀에 number 저장 + 수식 사용. 그 외엔 원문 텍스트 보존.
    const qtyText = String(item.quantity ?? "");
    const isPureQty = isPlainNumber(qtyText);
    const qtyNum = isPureQty ? parseFloat(qtyText.replace(/,/g, "")) : 0;
    const useNumQty = isPureQty && qtyNum > 0;
    const isNumericAmount = isPlainNumber(item.amountRaw);

    type CellSpec = {
      value: ExcelJS.CellValue;
      align: "left" | "center" | "right";
      numFmt?: string;
    };
    // 단가 cell: 수식 (수량/금액 둘 다 숫자일 때) → 정적 단가 (수량만 숫자) → 한글 그대로 (금액 한글)
    let unitPriceCell: ExcelJS.CellValue;
    let unitPriceFmt: string | undefined = "#,##0";
    if (!isNumericAmount) {
      unitPriceCell = item.amountRaw;
      unitPriceFmt = undefined;
    } else if (useNumQty) {
      unitPriceCell = { formula: `G${r}/D${r}`, result: item.unitPrice };
    } else {
      unitPriceCell = item.unitPrice;
    }

    const amountCell: ExcelJS.CellValue = isNumericAmount ? item.amount : item.amountRaw;
    const amountFmt = isNumericAmount ? "#,##0" : undefined;

    const cells: CellSpec[] = [
      { value: item.category || categorizeProduct(item.product), align: "center" },
      { value: item.product, align: "left" },
      { value: item.size, align: "center" },
      {
        value: useNumQty ? qtyNum : qtyText,
        align: "center",
        numFmt: useNumQty ? "#,##0" : undefined,
      },
      { value: item.unit || "EA", align: "center" },
      { value: unitPriceCell, align: "right", numFmt: unitPriceFmt },
      { value: amountCell, align: "right", numFmt: amountFmt },
    ];
    cells.forEach((c, idx) => {
      const cell = ws.getCell(r, idx + 1);
      cell.value = c.value;
      cell.font = { name: FONT, size: BASE_SIZE };
      cell.alignment = { horizontal: c.align, vertical: "middle" };
      if (c.numFmt) cell.numFmt = c.numFmt;
      cell.border = thinBorder();
    });

    // K, L outside form — reference data
    const kCell = ws.getCell(r, 11);
    kCell.value = isBranch ? item.client : group.client;
    kCell.font = { name: FONT, size: 11, color: { argb: COLOR.refGray } };
    kCell.alignment = { horizontal: "left", vertical: "middle" };

    const lCell = ws.getCell(r, 12);
    lCell.value = item.contact;
    lCell.font = { name: FONT, size: 11, color: { argb: COLOR.refGray } };
    lCell.alignment = { horizontal: "left", vertical: "middle" };
  });

  // ── Summary block (bottom right, F=label, G=value)
  const summaryStart = itemsStart + group.items.length + 1;
  const summaryRows: Array<[string, number | string, boolean]> = [
    ["소 계", group.subtotal, false],
    ["일반관리비", group.managementFee || "-", false],
    ["절 사", group.rounding || "-", false],
    ["공급가액", group.supplyAmount, false],
    ["부가세", group.vat, false],
    ["합계(VAT포함)", group.total, true],
  ];
  summaryRows.forEach(([label, value, isTotal], i) => {
    const r = summaryStart + i;
    ws.getRow(r).height = isTotal ? 28 : 24;

    const labelCell = ws.getCell(r, FORM_COLS - 1); // F
    labelCell.value = label;
    labelCell.font = { name: FONT, bold: true, size: BASE_SIZE };
    labelCell.alignment = { horizontal: "center", vertical: "middle" };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isTotal ? COLOR.totalGray : COLOR.headerGray },
    };
    labelCell.border = thinBorder();

    const valueCell = ws.getCell(r, FORM_COLS); // G
    valueCell.value = value;
    if (typeof value === "number") valueCell.numFmt = "#,##0";
    valueCell.font = { name: FONT, bold: isTotal, size: isTotal ? 15 : BASE_SIZE };
    valueCell.alignment = { horizontal: "right", vertical: "middle" };
    if (isTotal) {
      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR.totalGray },
      };
    }
    valueCell.border = thinBorder();
  });

  // ── Outer medium-black frame around the form (rows 3..lastRow, cols 1..7)
  const lastRow = summaryStart + summaryRows.length - 1;
  for (let r = 3; r <= lastRow; r++) {
    mergeBorder(ws.getCell(r, 1), {
      left: { style: "medium", color: { argb: COLOR.borderBlack } },
    });
    mergeBorder(ws.getCell(r, FORM_COLS), {
      right: { style: "medium", color: { argb: COLOR.borderBlack } },
    });
  }
  for (let c = 1; c <= FORM_COLS; c++) {
    mergeBorder(ws.getCell(3, c), {
      top: { style: "medium", color: { argb: COLOR.borderBlack } },
    });
    mergeBorder(ws.getCell(lastRow, c), {
      bottom: { style: "medium", color: { argb: COLOR.borderBlack } },
    });
  }

  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;

  return wb;
}

export async function generateExcelBlob(group: InvoiceGroup): Promise<Blob> {
  const wb = await buildInvoiceWorkbook(group);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
