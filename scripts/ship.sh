#!/bin/bash
# Oasis ship: 테스트 → 빌드 → 커밋 → 푸시 → Vercel 배포
# 사용법:
#   bash scripts/ship.sh "fix: 단가 계산 수정"
#   npm run ship "fix: 단가 계산 수정"
#   (메시지 생략 시 'chore: update')
#
# MD 파일 자동 업데이트는 이 스크립트가 하지 않습니다.
# Claude에게 "ship해줘" / "배포해줘"로 요청하면 CLAUDE.md 규칙에 따라
# 변경 코드와 관련된 .md 파일들을 먼저 정리한 뒤 이 스크립트를 호출합니다.

set -euo pipefail

cd "$(dirname "$0")/.."

MSG="${1:-${MSG:-chore: update}}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▶${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

step "테스트 실행 (vitest)"
npm run test

step "타입 체크"
npx tsc --noEmit

step "프로덕션 빌드"
npm run build

if [ -n "$(git status --porcelain)" ]; then
  step "커밋: $MSG"
  git add -A
  git commit -m "$MSG"

  step "GitHub 푸시"
  git push
else
  warn "변경사항 없음 — 커밋·푸시 건너뜀"
fi

step "Vercel 프로덕션 배포"
PROD_URL=$(vercel --prod --yes 2>&1 | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1 || true)

echo ""
echo -e "${GREEN}✅ Ship 완료${NC}"
[ -n "$PROD_URL" ] && echo "   $PROD_URL"
