---
sidebar_position: 4
---

# 여러 AI 도구와 함께 skillshare 사용하기

> 하나의 Source of truth를 사용하는 모든 AI CLI에 Sync합니다.

## 문제 상황

직장에서는 Claude Code, 사이드 프로젝트에서는 Cursor, 실험 목적으로는 Codex를 사용합니다. 각각 자체 Skill 디렉터리를 가지고 있습니다. 이를 수동으로 동기화하는 것은 번거롭고 실수하기 쉽습니다.

## 해결책

skillshare는 단일 Source 디렉터리를 유지하고, 명령어 하나로 모든 Target에 Sync합니다.

## 1단계: 설치 및 초기화

```bash
curl -fsSL https://raw.githubusercontent.com/runkids/skillshare/main/install.sh | sh
skillshare init
```

`init`은 설치된 모든 AI 도구를 자동으로 감지하여 Target으로 추가합니다.

## 2단계: Target 확인

```bash
skillshare target list
```

출력 예시:

```
  claude       ~/.claude/skills (merge)
  cursor       ~/.cursor/skills (merge)
  codex        ~/.codex/skills (merge)
  opencode     ~/.config/opencode/skills (merge)
```

## 3단계: Skill 설치

```bash
skillshare install runkids/my-skills
skillshare install anthropics/courses/prompt-eng
```

## 4단계: 전체 Sync

```bash
skillshare sync
```

명령어 하나로 모든 Skill을 모든 Target에 전달합니다. 각 Target은 단일 Source를 가리키는 심볼릭 링크를 갖게 됩니다.

## 5단계: 확인

```bash
skillshare status
```

모든 Target에 대한 Sync 상태를 보여줍니다 — 어떤 Skill이 Sync되었는지, 누락되었는지, 오래되었는지 표시합니다.

## Target별 모드 제어

도구마다 필요로 하는 방식이 다릅니다. Target별로 Sync 모드를 설정할 수 있습니다:

```bash
# Cursor는 심볼릭 링크를 잘 따라갑니다 (기본값)
skillshare target cursor --mode merge

# 일부 도구는 실제 파일이 필요합니다
skillshare target opencode --mode copy
```

## 다음 단계는?

- [Sync 모드 이해하기 →](/docs/understand/sync-modes)
- [여러 머신 간 Sync →](/docs/how-to/sharing/cross-machine-sync)
- [팀 공유하기 →](/docs/how-to/sharing/organization-sharing)
