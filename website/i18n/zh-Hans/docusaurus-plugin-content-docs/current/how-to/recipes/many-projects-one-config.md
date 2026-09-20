---
sidebar_position: 8
---

# Recipe: Many Projects, One Config

> 通过 global 配置，一次 sync 就把 Skill 和 MCP server 发送到多个项目文件夹。

## Scenario

你在许多项目文件夹中工作，并希望每个项目都拿到自己那一部分 Skill 和 MCP server。[Project mode](/docs/how-to/recipes/skill-per-project-workflow) 的做法是在每个项目中放一个 `.skillshare/config.yaml`，然后在各个文件夹内分别 sync。当项目的设置需要提交到仓库并与队友共享时，这是正确的选择。

如果这些项目只属于你一个人，就可以省掉每个项目各自的配置。Target 只是一个名称加一个路径，而这个路径可以指向项目内部。这样所有内容都放在 global 配置中，在任意文件夹运行一次 `skillshare sync` 就能更新每个项目。

## Solution

### Skill：每个项目一个 Target

```bash
skillshare target add project01 ~/work/project01/.agents/skills
skillshare target project01 --mode copy
skillshare target project01 --add-include "myskill-*"
skillshare sync
```

- Target 名称由你自行决定，不必是某个 Agent 的名称。
- `copy` 会写入真实文件，因此项目可以将它们提交。如果 symlink 就够用，保留默认的 `merge` 即可。
- `--add-include` 将项目限制为只包含它需要的 Skill。参见 [Filtering skills](/docs/how-to/daily-tasks/filtering-skills)。

此时 global 配置中包含：

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

要添加更多项目，可以继续运行 `target add` 命令，或直接复制这个配置块。

### MCP server：`mcp.projects`

MCP server 会被写入每个 Agent 自己的配置文件，因此它们按项目文件夹列出，而不是按路径列出：

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
        context7:            # 其他地方都会加载，在这里关闭
          disabled: true
          targets: [opencode]
```

```bash
skillshare sync mcp --dry-run   # 预览每个文件
skillshare sync mcp
```

字段和限制参见 [`mcp`：管理多个项目](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)。

## Verification

- `skillshare sync` 会报告该项目 Target，例如 `project01: copied (1 new, ...)`
- `~/work/project01/.agents/skills/` 中只包含 `include` 匹配到的 Skill
- `skillshare sync mcp --dry-run` 为每个项目文件列出一行
- 再次运行 `skillshare sync mcp` 会将每个条目报告为 `unchanged`

## Variations

- **提交或忽略**：在 `copy` 模式下，Skillshare 还会在 Target 文件夹中写入 `.skillshare-manifest.json`，用于跟踪它复制了哪些内容。可以将它与 Skill 一起提交，或将它加入 `.gitignore`。
- **路径重叠警告**：如果某个项目路径与另一个 Target 已在使用的文件夹相同，`sync` 会打印路径重叠警告。运行 `skillshare doctor` 查看哪些 Target 共用了该路径。
- **多个项目使用同一个 server**：在其中一个项目下用 YAML anchor（`docs: &docs`）定义一次，然后在其他项目中复用（`docs: *docs`）。参见 [`mcp` reference](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)。
- **共享的项目**：clone 该项目的队友不会得到你的 global 配置。当设置必须随仓库一起传递时，请使用 [project mode](/docs/how-to/recipes/skill-per-project-workflow)。

## Related

- [`target` command reference](/docs/reference/commands/target)
- [`mcp` command reference](/docs/reference/commands/mcp)
- [Sharing MCP servers](/docs/how-to/daily-tasks/sharing-mcp)
