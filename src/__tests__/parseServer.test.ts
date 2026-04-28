import { describe, it, expect } from "vitest";
import { parseWorkbookBuffer } from "../lib/parseServer";
import * as fs from "fs";
import * as path from "path";

const SAMPLE_FILE = "/Users/jenny/Downloads/작업전표_24년부터.xlsx";

describe("parseWorkbookBuffer (실제 파일)", () => {
  const fileExists = fs.existsSync(SAMPLE_FILE);

  it.skipIf(!fileExists)("실제 엑셀 파일 파싱 성공", () => {
    const buffer = fs.readFileSync(SAMPLE_FILE);
    const result = parseWorkbookBuffer(buffer);

    expect(result.totalRows).toBeGreaterThan(4000);
    expect(result.headers).toContain("거래처");
    expect(result.headers).toContain("담당자");
    expect(result.headers).toContain("품명");
    expect(result.headers).toContain("금액");
  });

  it.skipIf(!fileExists)("월 목록 추출", () => {
    const buffer = fs.readFileSync(SAMPLE_FILE);
    const result = parseWorkbookBuffer(buffer);

    expect(result.availableMonths.length).toBeGreaterThan(10);
    expect(result.availableMonths).toContain("24.1");
    expect(result.availableMonths).toContain("24.6");
  });

  it.skipIf(!fileExists)("fill-down 후 거래처가 비어있지 않음", () => {
    const buffer = fs.readFileSync(SAMPLE_FILE);
    const result = parseWorkbookBuffer(buffer);

    const emptyClients = result.rows.filter((r) => !r.client);
    expect(emptyClients.length).toBe(0);
  });

  it.skipIf(!fileExists)("Sheet3 연락처 파싱", () => {
    const buffer = fs.readFileSync(SAMPLE_FILE);
    const result = parseWorkbookBuffer(buffer);

    expect(result.contacts.length).toBeGreaterThan(100);
    expect(result.contacts[0].company).toBeTruthy();
  });

  it.skipIf(!fileExists)("24년 6월 데이터 그룹핑 검증", () => {
    const buffer = fs.readFileSync(SAMPLE_FILE);
    const result = parseWorkbookBuffer(buffer);

    const junRows = result.rows.filter((r) => r.date.startsWith("24.6."));
    expect(junRows.length).toBeGreaterThan(100);

    // All rows should have client and product
    for (const row of junRows) {
      expect(row.client).toBeTruthy();
      expect(row.product).toBeTruthy();
    }
  });

  it.skipIf(!fileExists)("금액은 숫자 타입", () => {
    const buffer = fs.readFileSync(SAMPLE_FILE);
    const result = parseWorkbookBuffer(buffer);

    for (const row of result.rows.slice(0, 100)) {
      expect(typeof row.amount).toBe("number");
      expect(typeof row.cost).toBe("number");
    }
  });
});
