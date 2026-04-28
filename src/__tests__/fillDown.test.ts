import { describe, it, expect } from "vitest";
import { fillDownMergedCells } from "../lib/fillDown";

describe("fillDownMergedCells", () => {
  it("기본 fill-down: 날짜+거래처+담당자", () => {
    const rows = [
      ["24.1.2", "대치센터", "남궁헌영 센터장님", "A4", "스티커", "100개"],
      ["", "", "", "B5", "배너", "2개"],
    ];
    const result = fillDownMergedCells(rows);
    expect(result[1][0]).toBe("24.1.2");
    expect(result[1][1]).toBe("대치센터");
    expect(result[1][2]).toBe("남궁헌영 센터장님");
  });

  it("같은 거래처 내 담당자 변경 시 새 담당자로 전환", () => {
    const rows = [
      ["24.1.2", "대치센터", "남궁헌영 센터장님", "", "스티커", ""],
      ["", "", "", "", "배너", ""],
      ["", "", "우흥택 팀장님", "", "현수막", ""],
      ["", "", "", "", "명함", ""],
    ];
    const result = fillDownMergedCells(rows);
    expect(result[0][2]).toBe("남궁헌영 센터장님");
    expect(result[1][2]).toBe("남궁헌영 센터장님"); // fill-down
    expect(result[2][2]).toBe("우흥택 팀장님"); // new contact
    expect(result[3][2]).toBe("우흥택 팀장님"); // fill-down from new
  });

  it("거래처 변경 시 담당자 리셋", () => {
    const rows = [
      ["24.1.2", "대치센터", "남궁헌영 센터장님", "", "스티커", ""],
      ["24.1.3", "상무센터", "한민수 팀장님", "", "배너", ""],
      ["", "", "", "", "명함", ""],
    ];
    const result = fillDownMergedCells(rows);
    expect(result[2][1]).toBe("상무센터");
    expect(result[2][2]).toBe("한민수 팀장님");
  });

  it("빈 행은 스킵", () => {
    const rows = [
      ["24.1.2", "대치센터", "담당자", "", "스티커", ""],
      ["", "", "", "", "", ""],
      ["", "", "", "", "배너", ""],
    ];
    const result = fillDownMergedCells(rows);
    expect(result.length).toBe(2); // empty row skipped
  });

  it("빈 배열 입력 시 빈 배열 반환", () => {
    expect(fillDownMergedCells([])).toEqual([]);
  });

  it("첫 행부터 날짜/거래처가 비어있으면 null 유지", () => {
    const rows = [
      ["", "", "", "", "스티커", ""],
    ];
    const result = fillDownMergedCells(rows);
    expect(result[0][0]).toBe(null);
    expect(result[0][1]).toBe(null);
  });
});
