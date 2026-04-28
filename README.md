# Oasis

개인사업자의 사무업무 자동화 서비스. 작업전표(엑셀) → 견적서(PDF/Excel) 자동 변환.

## 핵심 기능

- 작업전표 `.xlsx` 업로드 (드래그앤드롭 또는 파일 경로 입력)
- 거래처 / 지사 단위 자동 그룹핑
- 월별 정산 선택
- 미리보기에서 모든 필드 수정 가능 (수량, 단위, 단가, 금액 등)
- **PDF 견적서** 생성 (jsPDF + html2canvas-pro)
- **Excel 견적서** 생성 (ExcelJS, PDF와 동일 디자인 + 수식)
- 거래처별 단건 다운로드 또는 전체 ZIP 일괄 다운로드

## 수량 자동 파싱

수량 컬럼의 다양한 표기법을 자동 파싱해 단가를 계산합니다.

| 입력 | 파싱 결과 |
|---|---|
| `100`, `1,000` | 그대로 |
| `100매`, `100세트`, `100부`, `100개`, `100건`, `100장` | 100 |
| `2천` | 2,000 |
| `1만`, `10만`, `100만` | 10,000 / 100,000 / 1,000,000 |
| `1만2천` | 12,000 |

## Tech Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
- ExcelJS (Excel 생성) · SheetJS (Excel 파싱) · jsPDF + html2canvas-pro (PDF) · JSZip
- Vitest (테스트)
- Vercel (배포)

## 개발

```bash
npm install
npm run dev                     # http://localhost:3000
npm run build                   # 프로덕션 빌드
npm run test                    # 테스트 (vitest, 31건)
npx tsc --noEmit                # 타입 체크
npm run ship "fix: 메시지"      # 테스트→빌드→커밋→푸시→배포 일괄
```

## Ship 자동화

`npm run ship "<커밋 메시지>"` 한 줄로 다음을 순차 실행:

1. `npm run test` (vitest)
2. `npx tsc --noEmit` (타입체크)
3. `npm run build` (프로덕션 빌드)
4. `git add -A && git commit -m "<msg>" && git push`
5. `vercel --prod`

어느 단계든 실패하면 즉시 중단. 변경사항이 없으면 커밋·푸시는 건너뛰고 재배포만 수행.
