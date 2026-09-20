---
sidebar_position: 7
---

# AI-Assisted Development

> 사전 구축된 Project mode Skill로 AI 코딩 agent를 활용해 skillshare에 기여하세요.

## 사전 요구 사항

- AI 코딩 agent (Claude Code, Codex 등)
- 로컬에 clone된 skillshare 저장소

## 설정

이 저장소는 `.skillshare/skills/`에 Project mode Skill을 함께 제공합니다. Agent에 Sync하세요:

```bash
skillshare sync -p
```
이제 AI agent가 이 코드베이스에서 작업하기 위한 전문화된 Skill에 접근할 수 있습니다.

## 사용 가능한 Skill

| Skill | 하는 일 |
|-------|-------------|
| `implement-feature` | TDD 워크플로를 사용해 spec 파일이나 설명으로부터 기능을 구현합니다 |
| `update-docs` | 모든 플래그를 소스와 교차 검증하며 최근 코드 변경 사항에 맞춰 웹사이트 문서를 업데이트합니다 |
| `codebase-audit` | 코드베이스 전반에서 CLI 플래그, 문서, 테스트, Target의 일관성을 교차 검증합니다 |
| `cli-e2e-test` | Runbook을 기반으로 devcontainer에서 격리된 E2E 테스트를 실행합니다 |
| `changelog` | 최근 커밋으로부터 conventional 형식의 CHANGELOG.md 항목을 생성합니다 |

## 일반적인 워크플로

1. **기능 시작** — agent에게 spec과 함께 `implement-feature`를 사용하도록 요청하세요
2. **문서 업데이트** — 코드 변경 후 `update-docs`를 호출해 웹사이트 문서를 동기화하세요
3. **일관성 감사** — `codebase-audit`를 실행해 플래그/문서 불일치를 잡아내세요
4. **E2E 테스트 실행** — `cli-e2e-test`를 사용해 샌드박스에서 검증하세요
5. **Changelog 작성** — 릴리스 전에 `changelog`를 호출하세요

## 다음 단계는?

- [Dev Container 설정 →](/docs/learn/with-devcontainer)
- [Interactive Playground →](/docs/learn/with-playground)
- [기여 가이드 →](https://github.com/runkids/skillshare/blob/main/CONTRIBUTING.md)
