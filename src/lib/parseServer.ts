import * as XLSX from "xlsx";
import { fillDownMergedCells } from "./fillDown";
import { parseQuantity } from "./format";
import type { WorkOrderRow, ContactInfo, ParseResult } from "./types";

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseDateToMonth(dateStr: string): string {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  const parts = str.split(".");
  if (parts.length >= 2) {
    return `${parts[0].trim()}.${parts[1].trim()}`;
  }
  return "";
}

interface ColumnMap {
  [field: string]: number;
}

function findColumn(headers: string[], ...candidates: string[]): number {
  // Whitespace-insensitive: "단 가" matches "단가"
  const normalize = (s: string) => s.replace(/\s+/g, "");
  const normHeaders = headers.map(normalize);
  for (const c of candidates) {
    const nc = normalize(c);
    const idx = normHeaders.findIndex((h) => h === nc);
    if (idx >= 0) return idx;
  }
  for (const c of candidates) {
    const nc = normalize(c);
    const idx = normHeaders.findIndex((h) => h.includes(nc));
    if (idx >= 0) return idx;
  }
  return -1;
}

function col(raw: (string | number | null | undefined)[], idx: number): string {
  if (idx < 0 || idx >= raw.length) return "";
  return String(raw[idx] ?? "");
}

function buildColumnMap(headers: string[]): ColumnMap {
  return {
    date: findColumn(headers, "날짜"),
    client: findColumn(headers, "거래처"),
    contact: findColumn(headers, "담당자"),
    branch: findColumn(headers, "지사"),
    branchContact: findColumn(headers, "지사 담당자", "지사담당자"),
    size: findColumn(headers, "사이즈"),
    product: findColumn(headers, "품명"),
    quantity: findColumn(headers, "수량"),
    printType: findColumn(headers, "구분"),
    printer: findColumn(headers, "인쇄처"),
    binder: findColumn(headers, "제본처/가공처", "제본처"),
    outputRoom: findColumn(headers, "출력실"),
    colorPlates: findColumn(headers, "도수및대수", "도수"),
    paper: findColumn(headers, "용지"),
    sheets: findColumn(headers, "절수"),
    exactExtras: findColumn(headers, "정매및여분", "정매"),
    coating: findColumn(headers, "코팅"),
    postProcess: findColumn(headers, "후가공"),
    delivery: findColumn(headers, "납품"),
    invoiceStatus: findColumn(headers, "계산서"),
    paymentStatus: findColumn(headers, "결제"),
    amount: findColumn(headers, "금액"),
    cost: findColumn(headers, "원가"),
  };
}

function rowToWorkOrder(raw: (string | number | null | undefined)[], cm: ColumnMap): WorkOrderRow {
  const quantity = col(raw, cm.quantity);
  const amountRaw = col(raw, cm.amount).trim();
  const amount = parseAmount(cm.amount >= 0 ? raw[cm.amount] : 0);
  // 단가 = 총금액 / 수량. 한글 수사("2천", "1만2천") 및 단위 접미사("100매") 처리.
  // 못 푸는 복합 표기("정매 100, 여분 5매")는 1로 폴백 → 사용자가 미리보기에서 수동 조정.
  const qtyNum = parseQuantity(quantity);
  const safeQty = qtyNum > 0 ? qtyNum : 1;
  const unitPrice = Math.round(amount / safeQty);
  return {
    date: col(raw, cm.date),
    client: col(raw, cm.client).trim(),
    contact: col(raw, cm.contact).trim(),
    size: col(raw, cm.size),
    product: col(raw, cm.product),
    category: "",
    quantity,
    printType: col(raw, cm.printType),
    printer: col(raw, cm.printer),
    binder: col(raw, cm.binder),
    outputRoom: col(raw, cm.outputRoom),
    colorPlates: col(raw, cm.colorPlates),
    paper: col(raw, cm.paper),
    sheets: col(raw, cm.sheets),
    exactExtras: col(raw, cm.exactExtras),
    coating: col(raw, cm.coating),
    postProcess: col(raw, cm.postProcess),
    delivery: col(raw, cm.delivery),
    invoiceStatus: col(raw, cm.invoiceStatus),
    paymentStatus: col(raw, cm.paymentStatus),
    amount,
    amountRaw,
    unitPrice,
    unit: "EA",
    cost: parseAmount(cm.cost >= 0 ? raw[cm.cost] : 0),
    branch: col(raw, cm.branch).trim(),
    branchContact: col(raw, cm.branchContact).trim(),
  };
}

function parseContacts(sheet: XLSX.WorkSheet): ContactInfo[] {
  const json = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
  });
  const contacts: ContactInfo[] = [];
  let currentCompany = "";
  for (const row of json) {
    const company = String(row[1] ?? "").trim();
    const name = String(row[2] ?? "").trim();
    const title = String(row[3] ?? "").trim();
    const phone = String(row[4] ?? "").trim();
    const address = String(row[6] ?? "").trim();
    const email = String(row[7] ?? "").trim();
    if (company) currentCompany = company;
    if (name || phone || email) {
      contacts.push({ company: currentCompany, name, title, phone, address, email });
    }
  }
  return contacts;
}

export function parseWorkbookBuffer(buffer: Buffer | ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: buffer instanceof ArrayBuffer ? "array" : "buffer",
  });

  const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet1) throw new Error("Sheet1을 찾을 수 없습니다.");

  const rawData = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet1, {
    header: 1,
    defval: "",
  });

  if (rawData.length < 2) throw new Error("데이터가 비어있습니다.");

  const headers = rawData[0].map((h) => String(h ?? ""));
  const REQUIRED = ["거래처", "담당자", "품명", "금액"];
  const normHeaders = headers.map((h) => h.replace(/\s+/g, ""));
  for (const req of REQUIRED) {
    if (!normHeaders.some((h) => h.includes(req))) {
      throw new Error(`필수 컬럼 "${req}"을 찾을 수 없습니다.`);
    }
  }

  const colMap = buildColumnMap(headers);

  const dataRows = rawData.slice(1);
  const extraFillDownColumns = [colMap.branch, colMap.branchContact].filter((i) => i >= 0);
  const filledRows = fillDownMergedCells(dataRows, { extraFillDownColumns });
  const rows = filledRows
    .map((r) => rowToWorkOrder(r, colMap))
    .filter((row) => row.client && row.product);

  let contacts: ContactInfo[] = [];
  if (workbook.SheetNames.length >= 3) {
    const sheet3 = workbook.Sheets[workbook.SheetNames[2]];
    if (sheet3) contacts = parseContacts(sheet3);
  }

  const months = new Set<string>();
  for (const row of rows) {
    const m = parseDateToMonth(row.date);
    if (m) months.add(m);
  }

  return {
    rows,
    contacts,
    availableMonths: Array.from(months).sort(),
    totalRows: rows.length,
    headers,
  };
}
