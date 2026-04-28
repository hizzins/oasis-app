import type { WorkOrderRow, InvoiceGroup, ContactInfo } from "./types";

export function groupByClientContact(
  rows: WorkOrderRow[],
  contacts: ContactInfo[]
): InvoiceGroup[] {
  // Split rows: those with branch go to branch grouping, rest to client grouping
  const branchRows: WorkOrderRow[] = [];
  const clientRows: WorkOrderRow[] = [];

  for (const row of rows) {
    if (row.branch) {
      branchRows.push(row);
    } else {
      clientRows.push(row);
    }
  }

  const groups: InvoiceGroup[] = [];

  // Group by branch (지사)
  const branchMap = new Map<string, WorkOrderRow[]>();
  for (const row of branchRows) {
    const branch = row.branch.trim();
    if (!branchMap.has(branch)) {
      branchMap.set(branch, []);
    }
    branchMap.get(branch)!.push(row);
  }

  for (const [branch, items] of branchMap) {
    // Sort items by client name within branch
    items.sort((a, b) => a.client.localeCompare(b.client, "ko"));

    const branchContact =
      items.find((i) => i.branchContact)?.branchContact ||
      items.find((i) => i.contact)?.contact ||
      "";
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const supplyAmount = subtotal;
    const vat = Math.floor(supplyAmount * 0.1);

    groups.push({
      client: branch,
      contact: branchContact,
      branch,
      branchContact,
      groupType: "branch",
      items,
      subtotal,
      managementFee: 0,
      rounding: 0,
      supplyAmount,
      vat,
      total: supplyAmount + vat,
    });
  }

  // Group by client + contact (거래처)
  const clientMap = new Map<string, WorkOrderRow[]>();
  for (const row of clientRows) {
    const client = row.client.trim();
    const contact = row.contact.trim() || "기타";
    const key = `${client}|||${contact}`;
    if (!clientMap.has(key)) {
      clientMap.set(key, []);
    }
    clientMap.get(key)!.push(row);
  }

  for (const [key, items] of clientMap) {
    const [client, contact] = key.split("|||");
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const supplyAmount = subtotal;
    const vat = Math.floor(supplyAmount * 0.1);
    const contactInfo = findContactInfo(client, contact, contacts);

    groups.push({
      client,
      contact,
      branch: "",
      branchContact: "",
      groupType: "client",
      items,
      subtotal,
      managementFee: 0,
      rounding: 0,
      supplyAmount,
      vat,
      total: supplyAmount + vat,
      contactInfo,
    });
  }

  // Sort: branch groups first (sorted by branch name), then client groups (sorted by client name)
  groups.sort((a, b) => {
    if (a.groupType !== b.groupType) {
      return a.groupType === "branch" ? -1 : 1;
    }
    const nameA = a.groupType === "branch" ? a.branch : a.client;
    const nameB = b.groupType === "branch" ? b.branch : b.client;
    const nameCompare = nameA.localeCompare(nameB, "ko");
    if (nameCompare !== 0) return nameCompare;
    return a.contact.localeCompare(b.contact, "ko");
  });

  return groups;
}

function findContactInfo(
  client: string,
  contact: string,
  contacts: ContactInfo[]
): ContactInfo | undefined {
  const companyMatches = contacts.filter((c) => c.company === client);
  if (companyMatches.length === 0) return undefined;

  const contactName = contact.replace(/\s*(님|센터장|팀장|부장|과장|대리|사원|프로|차장|사장|대표|강사|원장)님?$/g, "").trim();

  const nameMatch = companyMatches.find((c) => {
    const dbName = c.name.replace(/\s*(님|센터장|팀장|부장|과장|대리|사원|프로|차장|사장|대표|강사|원장)님?$/g, "").trim();
    return dbName === contactName || c.name.includes(contactName) || contactName.includes(c.name);
  });

  return nameMatch || companyMatches[0];
}

export function recalculateGroup(group: InvoiceGroup): InvoiceGroup {
  const subtotal = group.items.reduce((sum, item) => sum + item.amount, 0);
  const supplyAmount = subtotal + group.managementFee + group.rounding;
  const vat = Math.floor(supplyAmount * 0.1);
  const total = supplyAmount + vat;

  return { ...group, subtotal, supplyAmount, vat, total };
}
