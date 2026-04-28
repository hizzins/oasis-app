@AGENTS.md

## Project: Oasis

인쇄업 중개 개인사업자의 사무업무 자동화 서비스.
작업전표(엑셀) → 견적서/계산서(PDF) 자동 변환이 핵심.

## Tech Stack

- **Frontend:** Next.js 16 (React 19, TypeScript, Tailwind CSS 4)
- **Excel Parsing:** SheetJS (`xlsx`, server-side via API route)
- **Excel Generation:** ExcelJS (`exceljs`, client-side, with styles + formulas)
- **PDF Generation:** jsPDF + html2canvas-pro (client-side HTML→canvas→PDF)
- **ZIP:** JSZip (bulk download)
- **Testing:** Vitest
- **Deploy:** Vercel

## Commands

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run test         # 테스트 (vitest)
npx tsc --noEmit     # 타입 체크
npm run ship "msg"   # 테스트→빌드→커밋→푸시→Vercel 배포 일괄
```

## Ship workflow

`npm run ship "커밋 메시지"` — `scripts/ship.sh` 실행.

흐름: vitest → tsc → next build → git commit/push → vercel --prod.
실패 시 즉시 중단 (`set -e`). 변경사항 없으면 커밋 단계 건너뛰고 배포만 수행.

**MD 파일 자동 갱신은 스크립트 밖에서 처리** — 사용자가 Claude에게 "ship/배포해줘"라고 요청하면 commit workflow 규칙(아래)에 따라 관련 .md 파일 먼저 정리한 뒤 `npm run ship` 호출.

## Commit workflow

커밋·배포 요청 시 프로젝트 내 모든 md 파일 중 변경된 코드와 관련된 파일이 있으면 내용을 확인하고 최신 코드에 맞게 업데이트한 뒤 같은 커밋에 포함할 것. 관련 md 파일이 없으면 그대로 진행.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Security audit → invoke cso

## gstack

Use /browse from gstack for all web browsing.

Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /qa, /qa-only, /design-review, /retro, /investigate, /document-release,
/codex, /cso, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn.
