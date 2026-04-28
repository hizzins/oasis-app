// "300,000", "300000", "300.5" → true. "별도", "300원", "협의" → false.
export function isPlainNumber(s: string): boolean {
  if (!s) return false;
  return /^[\d,]+(\.\d+)?$/.test(s.trim());
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

// Returns formatted amount or original raw text when it contains non-numeric content.
export function displayAmount(amount: number, amountRaw: string): string {
  if (!amountRaw || isPlainNumber(amountRaw)) {
    return formatNumber(amount);
  }
  return amountRaw;
}

// Korean numeral aware quantity parser.
// Supported:
//   Pure number:           "100", "1,000", "1.5"
//   Number + 단위 suffix:  "100부", "100세트", "100장", "100건", "100매", "100개"
//                          (any non-Korean-numeral suffix works via catch-all)
//   Korean numerals:       "2천" → 2000, "1만" → 10000, "10만" → 100000,
//                          "100만" → 1000000, "5백" → 500, "1만2천" → 12000
//   Korean + suffix:       "2천매" → 2000, "10만부" → 100000
// Unsupported (returns 0): complex compositions like "정매 100, 여분 5매"
const KOREAN_UNITS: Record<string, number> = {
  "조": 1e12,
  "억": 1e8,
  "만": 1e4,
  "천": 1e3,
  "백": 1e2,
  "십": 10,
};

export function parseQuantity(text: string): number {
  if (!text) return 0;
  const s = String(text).replace(/[\s,]/g, "");
  if (!s) return 0;

  // Pure number, e.g. "100", "1.5"
  if (/^[\d.]+$/.test(s)) {
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  // Korean numeral expression — must check BEFORE simple suffix so "10만" → 100000 (not 10)
  const koreanPattern = /^([\d.]*[조억만천백십])+\D*$/;
  if (koreanPattern.test(s)) {
    let total = 0;
    let current = 0;
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/[\d.]/.test(ch)) {
        let numStr = "";
        while (i < s.length && /[\d.]/.test(s[i])) {
          numStr += s[i];
          i++;
        }
        current = parseFloat(numStr) || 0;
      } else if (KOREAN_UNITS[ch] !== undefined) {
        total += (current === 0 ? 1 : current) * KOREAN_UNITS[ch];
        current = 0;
        i++;
      } else {
        // Trailing non-numeral suffix — stop accumulating
        break;
      }
    }
    return total + current;
  }

  // Number with non-Korean suffix only, e.g. "100매", "1000개"
  const simpleMatch = s.match(/^([\d.]+)\D+$/);
  if (simpleMatch) {
    const n = parseFloat(simpleMatch[1]);
    return isFinite(n) ? n : 0;
  }

  return 0;
}
