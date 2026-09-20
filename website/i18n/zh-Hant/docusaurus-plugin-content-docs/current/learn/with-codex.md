---
sidebar_position: 3
---

# 在 Codex 中使用 skillshare

> 從安裝到第一次 sync — 只要 5 分鐘。

## 先決條件

- 已安裝並可正常運作的 [OpenAI Codex CLI](https://github.com/openai/codex)
- macOS、Linux 或 Windows

## 步驟 1：安裝 skillshare

```bash
curl -fsSL https://raw.githubusercontent.com/runkids/skillshare/main/install.sh | sh
```

## 步驟 2：初始化

```bash
skillshare init
```

這會偵測 Codex 的 skill 目錄（`~/.codex/skills/`），並自動將它加入為 target。

## 步驟 3：安裝你的第一個 Skill

```bash
skillshare install runkids/my-skills
```

## 步驟 4：Sync

```bash
skillshare sync
```

Skills 會被 symlink 到 `~/.codex/skills/`。

## 步驟 5：驗證

```bash
ls ~/.codex/skills/
```

你應該會看到已安裝的 skill 以 symlink 的形式出現。

## Codex 專屬注意事項

- **Skill 路徑**：`~/.codex/skills/`（global）或 `.agents/skills/`（project）
- **描述長度限制**：Codex 對 skill 描述有 1024 字元的限制。請將 `SKILL.md` frontmatter 中的 `description` 欄位維持簡潔
- **Project mode**：執行 `skillshare init -p` 以管理 project 層級的 Codex skills

## 接下來呢？

- [管理多個 skills →](/docs/how-to/daily-tasks/organizing-skills)
- [與團隊分享 →](/docs/how-to/sharing/organization-sharing)
- [探索更多 skills →](/docs/reference/commands/search)
