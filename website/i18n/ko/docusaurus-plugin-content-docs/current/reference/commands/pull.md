---
sidebar_position: 2
---

# pull

git remote에서 pull하여 모든 target에 동기화합니다.

```bash
skillshare pull              # pull 후 동기화
skillshare pull --dry-run    # 미리보기
skillshare pull --force      # 첫 pull 시 local을 remote로 교체
```

## 언제 사용하나요

- 변경 사항을 push한 다른 머신에서 skill을 동기화할 때
- 다른 사람이 업데이트를 push한 후 최신 skill을 받아올 때
- `init --remote` 이후 새 머신에서 작업을 시작할 때

## 동작 과정

```mermaid
flowchart TD
    CMD["skillshare pull"]
    CHECK["1. Check repository status"]
    PULL["2. Pull from remote"]
    SYNC["3. Sync to all targets"]
    CMD --> CHECK --> PULL --> SYNC
```

## 옵션

| 플래그 | 설명 |
|------|------|
| `--dry-run, -n` | 변경 사항을 적용하지 않고 미리보기 |
| `--force, -f` | 첫 pull 충돌 시 local skill을 remote로 교체 |

## Git Root Scope

`pull`은 `git_root` 설정 필드로 선택된 디렉터리(기본값: `skills` source)에서 동작합니다. scope 표는 [commit — Git Root Scope](./commit.md#git-root-scope)를 참고하세요. `git_root`가 변경되었지만 git repo가 여전히 다른 scope의 디렉터리에 있는 경우, `pull`은 이를 해결하기 위한 정확한 `git init` / `mv` 명령과 함께 "Git root mismatch" 오류를 출력합니다. [Changing the scope after init](/docs/reference/targets/configuration#git-root)를 참고하세요.

pull 이후, `pull`은 해당 scope가 담고 있는 대상을 동기화합니다. `skills`는 `sync`를, `agents`는 `sync agents`를, `root`는 둘 다를, `extras`는 `sync extras`를 실행합니다.

## 사전 준비 사항

source 디렉터리는 remote가 설정된 git repository여야 합니다.

```bash
# 준비 상태 확인:
skillshare status
# 표시: Git: initialized with remote
```

## 로컬 변경 사항 경고

커밋되지 않은 변경 사항이 있으면 `pull`은 실패합니다.

```bash
$ skillshare pull
Local changes detected
  Run: skillshare push
  Or:  cd ~/.config/skillshare/skills && git stash
```

해결 방법:
```bash
# 옵션 1: push하지 않고 먼저 로컬에 커밋
skillshare commit -m "Local changes"
skillshare pull

# 옵션 2: 먼저 변경 사항 push
skillshare push
skillshare pull

# 옵션 3: 변경 사항을 stash
cd ~/.config/skillshare/skills
git stash
skillshare pull
git stash pop
```

## 기존 Skill이 있는 상태에서의 첫 Pull

첫 pull 시(아직 upstream이 없는 경우), local과 remote 양쪽에 이미 skill 디렉터리가 있다면
`pull`은 양쪽을 결합하기 위해 **merge**를 시도합니다. merge가 성공하면 local과 remote의 skill이 모두 보존됩니다.

**merge 충돌**이 발생하면, `pull`은 0이 아닌 종료 코드와 함께 실패합니다.

```bash
$ skillshare pull
Pull failed
  Resolve manually: cd ~/.config/skillshare/skills && git merge --allow-unrelated-histories <remote branch>
  Or force-pull: skillshare pull --force  (replaces local with remote)
```

해결 옵션:

```bash
# 충돌을 수동으로 해결한 후 push
cd ~/.config/skillshare/skills
git add . && git commit
skillshare push

# 또는 local을 버리고 remote를 적용
skillshare pull --force
```

## 예시

```bash
# 표준 pull (가장 일반적)
skillshare pull

# 어떤 일이 일어날지 미리보기
skillshare pull --dry-run

# 첫 pull 충돌 시 local을 remote로 교체
skillshare pull --force
```

## 워크플로우

보조 머신에서의 일반적인 워크플로우:

```bash
# 하루 시작: 최신 skill 가져오기
skillshare pull

# ... AI 도구로 작업 ...

# 하루 마무리: 새 skill이 있다면 공유
skillshare collect claude    # 새 skill을 만들었다면
skillshare push -m "Add new skill"
```

## 참고 항목

- [commit](/docs/reference/commands/commit) — push 없이 로컬 커밋
- [push](/docs/reference/commands/push) — remote에 push
- [sync](/docs/reference/commands/sync) — pull 없이 수동 동기화
- [Cross-Machine Sync](/docs/how-to/sharing/cross-machine-sync) — 전체 설정 가이드
