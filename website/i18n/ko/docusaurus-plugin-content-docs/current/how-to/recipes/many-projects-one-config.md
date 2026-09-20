---
sidebar_position: 8
---

# Recipe: Many Projects, One Config

> 한 번의 sync로 global 설정에서 여러 프로젝트 폴더에 Skill과 MCP 서버를 보내세요.

## 시나리오

여러 프로젝트 폴더에서 작업하며, 각 프로젝트가 자신에게 맞는 일부 Skill과 MCP 서버만 받기를 원합니다. [Project mode](/docs/how-to/recipes/skill-per-project-workflow)는 프로젝트마다 `.skillshare/config.yaml`을 두고 각 폴더 안에서 sync하는 방식으로 이를 처리합니다. 프로젝트 설정을 커밋해서 팀원과 공유해야 한다면 그 방식이 맞는 선택입니다.

프로젝트를 혼자만 사용한다면 프로젝트별 설정을 생략할 수 있습니다. Target은 이름과 경로일 뿐이며, 경로는 프로젝트 내부를 가리킬 수 있습니다. 그러면 모든 것이 global 설정에 모이고, 어느 폴더에서든 `skillshare sync`를 한 번 실행하면 모든 프로젝트가 업데이트됩니다.

## 해결 방법

### Skill: 프로젝트마다 Target 하나

```bash
skillshare target add project01 ~/work/project01/.agents/skills
skillshare target project01 --mode copy
skillshare target project01 --add-include "myskill-*"
skillshare sync
```

- Target 이름은 자유롭게 정할 수 있습니다. Agent 이름일 필요는 없습니다.
- `copy`는 실제 파일을 작성하므로 프로젝트에서 커밋할 수 있습니다. 심볼릭 링크로 충분하다면 기본값인 `merge`를 그대로 두세요.
- `--add-include`는 프로젝트가 필요한 Skill만 받도록 제한합니다. [Filtering skills](/docs/how-to/daily-tasks/filtering-skills)를 참고하세요.

이제 global 설정에는 다음 내용이 들어 있습니다:

```yaml
# ~/.config/skillshare/config.yaml
targets:
  project01:
    skills:
      path: ~/work/project01/.agents/skills
      mode: copy
      include:
        - myskill-*
```

프로젝트를 더 추가하려면 `target add` 명령을 더 실행하거나 이 블록을 복사하세요.

### MCP 서버: `mcp.projects`

MCP 서버는 각 Agent의 자체 설정 파일에 작성되므로, 경로가 아니라 프로젝트 폴더 단위로 나열합니다:

```yaml
# ~/.config/skillshare/config.yaml
mcp:
  servers:
    context7:
      command: npx
      args: ["-y", "@upstash/context7-mcp"]
      targets: [opencode]
  projects:
    ~/work/project01:
      servers:
        context7:            # 다른 곳에서는 로드되고, 여기서만 꺼짐
          disabled: true
          targets: [opencode]
```

```bash
skillshare sync mcp --dry-run   # 모든 파일 미리보기
skillshare sync mcp
```

필드와 제한 사항은 [`mcp`: manage several projects](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)를 참고하세요.

## 검증

- `skillshare sync`가 프로젝트 Target을 보고함. 예: `project01: copied (1 new, ...)`
- `~/work/project01/.agents/skills/`에 `include`와 일치하는 Skill만 들어 있음
- `skillshare sync mcp --dry-run`이 프로젝트 파일마다 한 줄씩 나열함
- `skillshare sync mcp`를 다시 실행하면 모든 항목이 `unchanged`로 보고됨

## 변형

- **커밋 또는 무시**: `copy` 모드에서는 Skillshare가 복사한 내용을 추적하기 위해 Target 폴더에 `.skillshare-manifest.json`도 작성합니다. Skill과 함께 커밋하거나 `.gitignore`에 추가하세요.
- **경로 중복 경고**: 프로젝트 경로가 다른 Target이 이미 사용하는 폴더와 같으면 `sync`가 경로 중복(path overlap) 경고를 출력합니다. 어떤 Target이 같은 폴더를 공유하는지 보려면 `skillshare doctor`를 실행하세요.
- **여러 프로젝트에 같은 서버**: 한 프로젝트 아래에 YAML anchor(`docs: &docs`)로 한 번 정의하고 다른 프로젝트에서 재사용하세요(`docs: *docs`). [`mcp` reference](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)를 참고하세요.
- **공유 프로젝트**: 프로젝트를 clone한 팀원은 여러분의 global 설정을 받지 못합니다. 설정이 저장소와 함께 이동해야 한다면 [project mode](/docs/how-to/recipes/skill-per-project-workflow)를 사용하세요.

## 관련 문서

- [`target` command reference](/docs/reference/commands/target)
- [`mcp` command reference](/docs/reference/commands/mcp)
- [Sharing MCP servers](/docs/how-to/daily-tasks/sharing-mcp)
