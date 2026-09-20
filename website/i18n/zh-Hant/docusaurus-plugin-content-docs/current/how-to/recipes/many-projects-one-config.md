---
sidebar_position: 8
---

# Recipe：多個 Projects，一份 Config

> 從 global config 把 skills 與 MCP servers 送進多個 project 資料夾，只需同步一次。

## 情境

你在許多 project 資料夾中工作，並希望每個資料夾都拿到自己需要的那一部分 skills 與 MCP servers。[Project mode](/docs/how-to/recipes/skill-per-project-workflow) 的做法是在每個 project 中放一份 `.skillshare/config.yaml`，並在各個資料夾內執行 sync。當 project 的設定應該被 commit 並與隊友共用時，這是正確的選擇。

如果這些 projects 只有你自己在用，就可以省略各 project 的 config。一個 target 只是一個名稱加一個路徑，而路徑可以指向 project 內部。如此一來所有設定都放在 global config 中，在任何資料夾執行一次 `skillshare sync` 就會更新每個 project。

## 解決方案

### Skills：每個 project 一個 target

```bash
skillshare target add project01 ~/work/project01/.agents/skills
skillshare target project01 --mode copy
skillshare target project01 --add-include "myskill-*"
skillshare sync
```

- Target 名稱由你自訂，不一定要是某個 Agent 的名稱。
- `copy` 會寫入實際檔案，所以 project 可以 commit 它們。若 symlinks 就夠用，保留預設的 `merge` 即可。
- `--add-include` 會把該 project 限制在它需要的 skills。請參閱[篩選 skills](/docs/how-to/daily-tasks/filtering-skills)。

Global config 現在會包含：

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

要加入更多 projects，可以再執行幾次 `target add`，或直接複製這個區塊。

### MCP servers：`mcp.projects`

MCP servers 會寫入各個 Agent 自己的設定檔，所以它們是依 project 資料夾列出，而不是依路徑：

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
        context7:            # 其他地方都會載入，在這裡關閉
          disabled: true
          targets: [opencode]
```

```bash
skillshare sync mcp --dry-run   # 預覽每個檔案
skillshare sync mcp
```

欄位與限制請參閱 [`mcp`：管理多個 projects](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)。

## 驗證

- `skillshare sync` 會回報該 project target，例如 `project01: copied (1 new, ...)`
- `~/work/project01/.agents/skills/` 只包含符合 `include` 的 skills
- `skillshare sync mcp --dry-run` 會為每個 project 檔案列出一行
- 再執行一次 `skillshare sync mcp` 會把每個項目回報為 `unchanged`

## 變化

- **Commit 或忽略**：在 `copy` mode 下，Skillshare 也會在 target 資料夾中寫入 `.skillshare-manifest.json`，用來追蹤它複製了哪些內容。可以把它和 skills 一起 commit，或加入 `.gitignore`。
- **路徑重疊警告**：若 project 路徑與另一個 target 已在使用的資料夾相同，`sync` 會印出路徑重疊警告。執行 `skillshare doctor` 可查看哪些 targets 共用該路徑。
- **多個 projects 使用同一個 server**：在其中一個 project 下用 YAML anchor 定義一次（`docs: &docs`），再於其他 project 中重複使用（`docs: *docs`）。請參閱 [`mcp` 參考](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)。
- **共用的 projects**：clone 該 project 的隊友不會拿到你的 global config。當設定必須跟著 repo 走時，請使用 [project mode](/docs/how-to/recipes/skill-per-project-workflow)。

## 相關

- [`target` 指令參考](/docs/reference/commands/target)
- [`mcp` 指令參考](/docs/reference/commands/mcp)
- [共用 MCP servers](/docs/how-to/daily-tasks/sharing-mcp)
