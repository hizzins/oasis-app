import { describe, it, expect } from "vitest";
import { groupByClientContact, recalculateGroup } from "../lib/grouping";
import type { WorkOrderRow } from "../lib/types";

function makeRow(overrides: Partial<WorkOrderRow> = {}): WorkOrderRow {
  return {
    date: "24.6.1",
    client: "테스트센터",
    contact: "김철수 팀장님",
    size: "A4",
    product: "스티커",
    category: "",
    quantity: "100개",
    printType: "",
    printer: "",
    binder: "",
    outputRoom: "",
    colorPlates: "",
    paper: "",
    sheets: "",
    exactExtras: "",
    coating: "",
    postProcess: "",
    delivery: "",
    invoiceStatus: "",
    paymentStatus: "",
    amount: 50000,
    amountRaw: "50000",
    unitPrice: 500,
    unit: "EA",
    cost: 20000,
    branch: "",
    branchContact: "",
    ...overrides,
  };
}

describe("groupByClientContact", () => {
  it("같은 거래처+담당자는 하나의 그룹으로", () => {
    const rows = [
      makeRow({ amount: 30000 }),
      makeRow({ amount: 20000, product: "배너" }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(2);
  });

  it("같은 거래처, 다른 담당자는 별도 그룹", () => {
    const rows = [
      makeRow({ contact: "김철수 팀장님", amount: 30000 }),
      makeRow({ contact: "이영희 부장님", amount: 20000 }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups.length).toBe(2);
  });

  it("다른 거래처는 별도 그룹", () => {
    const rows = [
      makeRow({ client: "A센터", amount: 30000 }),
      makeRow({ client: "B센터", amount: 20000 }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups.length).toBe(2);
  });

  it("담당자가 빈 문자열이면 '기타' 그룹", () => {
    const rows = [makeRow({ contact: "", amount: 10000 })];
    const groups = groupByClientContact(rows, []);
    expect(groups[0].contact).toBe("기타");
  });

  it("공백 trim 처리", () => {
    const rows = [
      makeRow({ client: " 테스트센터 ", contact: " 김철수 팀장님 ", amount: 10000 }),
      makeRow({ client: "테스트센터", contact: "김철수 팀장님", amount: 20000 }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(2);
  });

  it("거래처명 한국어 정렬", () => {
    const rows = [
      makeRow({ client: "하남센터", amount: 10000 }),
      makeRow({ client: "가산센터", amount: 20000 }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups[0].client).toBe("가산센터");
    expect(groups[1].client).toBe("하남센터");
  });
});

describe("금액 계산", () => {
  it("소계 = 항목 금액의 합", () => {
    const rows = [
      makeRow({ amount: 30000 }),
      makeRow({ amount: 20000, product: "배너" }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups[0].subtotal).toBe(50000);
  });

  it("VAT = 공급가액 * 10% (소수점 버림)", () => {
    const rows = [makeRow({ amount: 33333 })];
    const groups = groupByClientContact(rows, []);
    expect(groups[0].vat).toBe(3333); // floor(33333 * 0.1)
  });

  it("합계 = 공급가액 + VAT", () => {
    const rows = [makeRow({ amount: 100000 })];
    const groups = groupByClientContact(rows, []);
    expect(groups[0].supplyAmount).toBe(100000);
    expect(groups[0].vat).toBe(10000);
    expect(groups[0].total).toBe(110000);
  });

  it("recalculateGroup: 일반관리비 포함 재계산", () => {
    const rows = [makeRow({ amount: 100000 })];
    const groups = groupByClientContact(rows, []);
    const updated = recalculateGroup({ ...groups[0], managementFee: 5000 });
    expect(updated.supplyAmount).toBe(105000);
    expect(updated.vat).toBe(10500);
    expect(updated.total).toBe(115500);
  });

  it("금액 0인 항목 처리", () => {
    const rows = [
      makeRow({ amount: 50000 }),
      makeRow({ amount: 0, product: "서비스" }),
    ];
    const groups = groupByClientContact(rows, []);
    expect(groups[0].subtotal).toBe(50000);
    expect(groups[0].items.length).toBe(2);
  });
});
