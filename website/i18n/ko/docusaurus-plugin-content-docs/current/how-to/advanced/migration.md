---
sidebar_position: 5
---

# 마이그레이션

다른 skill 관리 방식에서 skillshare로 마이그레이션하세요.

## 수동 관리로부터

AI CLI 사이에서 skill을 수동으로 복사해왔다면:

### 1단계: skillshare 초기화

```bash
skillshare init
```

### 2단계: 기존 skill 수집

```bash
# 각 AI CLI에서 수집
skillshare collect claude
skillshare collect cursor
skillshare collect codex

# 또는 한 번에 모두 수집
skillshare collect --all
```

### 3단계: 중복 처리

같은 skill이 여러 곳에 존재하면 `collect`가 경고합니다. 어느 것을 유지할지 선택하세요.

### 4단계: Sync

```bash
skillshare sync
```

이제 모든 target이 단일 source로 symlink됩니다.

---

## 다른 Install 도구로부터

`npx install-skill`이나 유사한 도구를 사용했다면:

### 1단계: skillshare 초기화

```bash
skillshare init
```

### 2단계: 기존 skill 백업

```bash
skillshare backup
```

### 3단계: 수집 또는 재설치

**옵션 A: 기존 항목 수집** (현재 버전 유지)
```bash
skillshare collect --all
```

**옵션 B: source에서 재설치** (최신 버전 가져오기)
```bash
# 메타데이터 확인
cat ~/.config/skillshare/skills/.metadata.json

# 재설치
skillshare install anthropics/skills/skills/pdf
```

### 4단계: Sync

```bash
skillshare sync
```

---

## Git Submodule로부터

git submodule을 사용해왔다면:

### 1단계: submodule 콘텐츠 내보내기

```bash
# 기존 skill repo에서
git submodule foreach 'cp -r $toplevel/$sm_path ~/temp-skills/$name'
```

### 2단계: skillshare 초기화

```bash
skillshare init
```

### 3단계: skill 가져오기

```bash
# source로 복사
cp -r ~/temp-skills/* ~/.config/skillshare/skills/

# 또는 tracked repo로 install
skillshare install github.com/org/skill-repo --track
```

### 4단계: Sync

```bash
skillshare sync
```

---

## 커밋된 Project Skill로부터

repo에 이미 `.claude/skills/`, `.cursor/skills/` 같은 디렉터리에 skill이 커밋되어 있다면:

### 1단계: Project mode 초기화

```bash
cd my-project
skillshare init -p
```

### 2단계: `.skillshare/skills/`로 skill 이동

```bash
# 기존 skill을 skillshare source로 복사
cp -r .claude/skills/my-skill .skillshare/skills/
cp -r .claude/skills/api-guide .skillshare/skills/

# 원본 제거 (sync가 symlink로 재생성함)
rm -rf .claude/skills/my-skill .claude/skills/api-guide
```

### 3단계: Sync

```bash
skillshare sync
```

이제 `.claude/skills/my-skill`은 `.skillshare/skills/my-skill`에 대한 symlink이며 — 다른 모든 target(Cursor, Windsurf 등)도 자동으로 동일한 skill을 받습니다.

### 4단계: 마이그레이션 커밋

```bash
git add .skillshare/ .claude/skills/ .cursor/skills/
git commit -m "Migrate project skills to skillshare"
```

:::tip 멀티 도구 이점
이전: skill이 하나의 AI CLI에서만 작동했습니다. 이후: 같은 skill이 구성된 모든 target에서 자동으로 사용 가능합니다.
:::

---

## 팀 전용 솔루션으로부터

팀이 커스텀 skill 공유 방식을 사용하고 있다면:

### 1단계: 현재 방식 파악

- skill이 어디에 저장되어 있나요?
- 어떻게 공유되나요?
- 어떻게 업데이트되나요?

### 2단계: 마이그레이션 경로 선택

**옵션 A: Global mode** — 각 머신의 모든 프로젝트에서 skill 사용 가능.

```bash
# 팀 skill repo 생성
cp -r /current/team/skills ~/new-team-skills
cd ~/new-team-skills && git init && git add . && git commit -m "Migrate to skillshare"
git push origin main

# 팀원이 전역으로 install
skillshare install github.com/org/team-skills --track && skillshare sync
```

**옵션 B: Project mode** — skill이 특정 repo에 한정되며, git으로 공유.

```bash
cd my-project
skillshare init -p

# 팀 skill을 project source로 이동
cp -r /current/team/skills/* .skillshare/skills/

# Sync 및 커밋
skillshare sync
git add .skillshare/
git commit -m "Add team skills via skillshare"
```

새 팀원은 다음으로 모든 것을 받습니다.
```bash
git clone github.com/org/my-project
cd my-project
skillshare install -p && skillshare sync
```

**옵션 C: 둘 다** — 조직 전체 표준은 전역으로, 프로젝트별 skill은 repo마다.

```bash
# 조직 표준 (global)
skillshare install github.com/org/standards --track && skillshare sync

# 프로젝트별 skill (project mode)
cd my-project
skillshare init -p
skillshare install github.com/org/project-skills -p && skillshare sync
```

:::tip 무엇을 선택할까요?
- **Global**: 코딩 표준, 보안 감사 — 모든 프로젝트에 필요한 것들
- **Project**: API 규약, 도메인 규칙, 배포 가이드 — 한 repo에 특화된 것들
- **둘 다**: 대부분의 팀이 성장하며 결국 이렇게 됩니다
:::

---

## Global에서 Project로

특정 프로젝트에 속한 skill이 global mode에 있다면:

### 1단계: Project mode 초기화

```bash
cd my-project
skillshare init -p
```

### 2단계: global source에서 skill 복사

```bash
# 특정 skill 복사
cp -r ~/.config/skillshare/skills/api-guide .skillshare/skills/
cp -r ~/.config/skillshare/skills/deploy-rules .skillshare/skills/
```

### 3단계: global에서 제거 (선택 사항)

```bash
skillshare uninstall api-guide
skillshare uninstall deploy-rules
skillshare sync   # global symlink 정리
```

### 4단계: Sync 및 커밋

```bash
skillshare sync   # project mode를 자동 감지
git add .skillshare/
git commit -m "Move project-specific skills to project mode"
```

이후 skill은 이 repo에 한정되어 git을 통해 팀과 공유됩니다 — 더 이상 global 설정을 어지럽히지 않습니다.

---

## History 보존

git history를 유지하고 싶다면:

### 개인 skill의 경우

```bash
# 기존 repo를 skillshare 위치로 clone
git clone your-existing-repo ~/.config/skillshare/skills

# 기존 source로 skillshare 초기화
skillshare init --source ~/.config/skillshare/skills
```

### 팀 repo의 경우

```bash
# .git을 보존하려면 --track 사용
skillshare install github.com/team/skills --track
```

---

## Rollback

마이그레이션이 잘못되었다면:

### 백업에서 복원

```bash
skillshare restore claude
skillshare restore cursor
```

### 새로 시작

```bash
rm ~/.config/skillshare/config.yaml
skillshare init
```

---

## 체크리스트

마이그레이션 전:

- [ ] 현재 모든 skill 위치 나열
- [ ] 중복 항목 파악
- [ ] 커스텀 설정 기록
- [ ] 백업 생성

마이그레이션 후:

- [ ] `skillshare list`에 모든 skill이 표시되는지 확인
- [ ] 각 AI CLI에서 skill 테스트
- [ ] git remote 설정 (원하는 경우)
- [ ] 새 워크플로를 팀과 공유

---

## 참고

- [기존 Skill로부터](/docs/getting-started/from-existing-skills) — 빠른 마이그레이션 경로
- [collect](/docs/reference/commands/collect) — target에서 수집
- [비교](/docs/understand/philosophy/comparison) — 접근 방식 비교
