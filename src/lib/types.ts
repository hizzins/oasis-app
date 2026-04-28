export interface WorkOrderRow {
  date: string;
  client: string;
  contact: string;
  size: string;
  product: string;
  category: string;
  quantity: string;
  printType: string;
  printer: string;
  binder: string;
  outputRoom: string;
  colorPlates: string;
  paper: string;
  sheets: string;
  exactExtras: string;
  coating: string;
  postProcess: string;
  delivery: string;
  invoiceStatus: string;
  paymentStatus: string;
  amount: number;
  amountRaw: string;
  unitPrice: number;
  unit: string;
  cost: number;
  branch: string;
  branchContact: string;
}

export interface ContactInfo {
  company: string;
  name: string;
  title: string;
  phone: string;
  address: string;
  email: string;
}

export interface InvoiceGroup {
  client: string;
  contact: string;
  branch: string;
  branchContact: string;
  groupType: "client" | "branch";
  items: WorkOrderRow[];
  subtotal: number;
  managementFee: number;
  rounding: number;
  supplyAmount: number;
  vat: number;
  total: number;
  contactInfo?: ContactInfo;
}

export interface ParseResult {
  rows: WorkOrderRow[];
  contacts: ContactInfo[];
  availableMonths: string[];
  totalRows: number;
  headers: string[];
}
