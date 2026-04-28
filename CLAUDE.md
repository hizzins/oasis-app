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
```

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
