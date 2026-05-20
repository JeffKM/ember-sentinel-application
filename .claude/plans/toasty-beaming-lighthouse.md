# 플랜: ~/.agents/skills/ 스킬을 Claude Code에 등록

## Context

`~/.agents/skills/`에 7개의 Vercel Labs 스킬이 설치되어 있지만, Claude Code는 `~/.claude/skills/` 디렉토리만 자동 스캔하므로 해당 스킬들이 인식되지 않는 상태. 심볼릭 링크를 통해 양쪽을 연결하면 `npx skills update`로 스킬을 업데이트할 때 Claude Code에서도 자동 반영됨.

## 등록 대상 스킬 (7개)

| 스킬                          | 설명                                   |
| ----------------------------- | -------------------------------------- |
| `deploy-to-vercel`            | Vercel 배포 (git push / CLI / no-auth) |
| `find-skills`                 | skills.sh 에서 새 스킬 탐색·설치       |
| `vercel-cli-with-tokens`      | 토큰 기반 Vercel CLI 배포              |
| `vercel-composition-patterns` | React 컴포넌트 컴포지션 패턴           |
| `vercel-react-best-practices` | React/Next.js 성능 최적화 (64개 규칙)  |
| `vercel-react-native-skills`  | React Native/Expo 베스트 프랙티스      |
| `web-design-guidelines`       | 웹 UI 가이드라인 리뷰                  |

## 구현 방법: 심볼릭 링크

복사 대신 symlink를 사용해 `npx skills update` 시 Claude Code에도 자동 반영.

```bash
# ~/.claude/skills/ 디렉토리가 없다면 생성
mkdir -p ~/.claude/skills

# 7개 스킬 심볼릭 링크 생성
ln -sf ~/.agents/skills/deploy-to-vercel          ~/.claude/skills/deploy-to-vercel
ln -sf ~/.agents/skills/find-skills               ~/.claude/skills/find-skills
ln -sf ~/.agents/skills/vercel-cli-with-tokens    ~/.claude/skills/vercel-cli-with-tokens
ln -sf ~/.agents/skills/vercel-composition-patterns ~/.claude/skills/vercel-composition-patterns
ln -sf ~/.agents/skills/vercel-react-best-practices ~/.claude/skills/vercel-react-best-practices
ln -sf ~/.agents/skills/vercel-react-native-skills ~/.claude/skills/vercel-react-native-skills
ln -sf ~/.agents/skills/web-design-guidelines     ~/.claude/skills/web-design-guidelines
```

## 수정 파일

- `~/.claude/skills/` — symlink 7개 추가 (신규)
- `~/.claude/CLAUDE.md` — 스킬 활용 안내 메모 추가 (선택)

## 검증 방법

1. `ls -la ~/.claude/skills/` — 링크 7개 확인
2. Claude Code 재시작 후 "vercel에 배포해줘" 또는 "react 코드 리뷰해줘" 입력
3. 시스템 리마인더의 available skills 목록에 7개 스킬이 표시되는지 확인
