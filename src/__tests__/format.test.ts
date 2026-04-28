import { describe, it, expect } from "vitest";
import { parseQuantity, isPlainNumber, displayAmount } from "../lib/format";

describe("parseQuantity", () => {
  it("순수 숫자", () => {
    expect(parseQuantity("100")).toBe(100);
    expect(parseQuantity("1,000")).toBe(1000);
    expect(parseQuantity("1.5")).toBe(1.5);
  });

  it("단위 접미사 — 부/세트/장/건/매/개", () => {
    expect(parseQuantity("100부")).toBe(100);
    expect(parseQuantity("100세트")).toBe(100);
    expect(parseQuantity("100장")).toBe(100);
    expect(parseQuantity("100건")).toBe(100);
    expect(parseQuantity("100매")).toBe(100);
    expect(parseQuantity("100개")).toBe(100);
    expect(parseQuantity("1,000건")).toBe(1000);
  });

  it("한글 수사 — 천/만/백/십/억/조", () => {
    expect(parseQuantity("2천")).toBe(2000);
    expect(parseQuantity("1만")).toBe(10000);
    expect(parseQuantity("10만")).toBe(100000);
    expect(parseQuantity("100만")).toBe(1000000);
    expect(parseQuantity("5백")).toBe(500);
    expect(parseQuantity("1만2천")).toBe(12000);
    expect(parseQuantity("5만3천")).toBe(53000);
  });

  it("한글 수사 + 접미사", () => {
    expect(parseQuantity("2천매")).toBe(2000);
    expect(parseQuantity("10만건")).toBe(100000);
    expect(parseQuantity("1만2천부")).toBe(12000);
  });

  it("공백·콤마 무시", () => {
    expect(parseQuantity(" 100 ")).toBe(100);
    expect(parseQuantity("1, 000")).toBe(1000);
  });

  it("못 푸는 복합 표기는 0", () => {
    expect(parseQuantity("정매 100, 여분 5매")).toBe(0);
    expect(parseQuantity("")).toBe(0);
    expect(parseQuantity("매")).toBe(0);
  });
});

describe("isPlainNumber", () => {
  it("순수 숫자 형태만 true", () => {
    expect(isPlainNumber("100")).toBe(true);
    expect(isPlainNumber("1,000")).toBe(true);
    expect(isPlainNumber("100.5")).toBe(true);
    expect(isPlainNumber("100매")).toBe(false);
    expect(isPlainNumber("별도")).toBe(false);
    expect(isPlainNumber("")).toBe(false);
  });
});

describe("displayAmount", () => {
  it("숫자 형태면 포맷팅, 한글이면 원문", () => {
    expect(displayAmount(300000, "300,000")).toBe("300,000");
    expect(displayAmount(0, "별도")).toBe("별도");
    expect(displayAmount(300000, "")).toBe("300,000");
  });
});
