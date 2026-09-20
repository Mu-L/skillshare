---
sidebar_position: 3
---

# upgrade

升級 skillshare CLI 執行檔與/或內建的 skillshare skill。

```bash
skillshare upgrade              # 升級 CLI 與 skill
skillshare upgrade --cli        # 僅 CLI
skillshare upgrade --skill      # 僅 skill
```

## 使用時機

- skillshare CLI 有新版本可用
- 內建的 skillshare skill 需要更新
- `doctor` 回報有可用更新之後

![upgrade demo](/img/upgrade-demo.png)

## 執行內容

```mermaid
flowchart TD
    TITLE["skillshare upgrade"]
    CLI["1. 升級 CLI 執行檔"]
    SKILL["2. 升級內建 skill"]
    TITLE --> CLI --> SKILL
```

## 選項

| Flag | 說明 |
|------|-------------|
| `--cli` | 僅升級 CLI |
| `--skill` | 僅升級 skill（若尚未安裝則會提示） |
| `--force, -f` | 略過確認提示 |
| `--dry-run, -n` | 預覽而不做任何變更 |
| `--help, -h` | 顯示說明 |

## Homebrew 使用者

若你是透過 Homebrew 安裝的，`skillshare upgrade` 會自動委派給 `brew upgrade`：

```bash
skillshare upgrade
# → brew update && brew upgrade skillshare
```

你也可以直接使用 Homebrew：

```bash
brew upgrade skillshare
```

## 範例

```bash
# 標準升級（CLI 與 skill 皆升級）
skillshare upgrade

# 預覽會升級的內容
skillshare upgrade --dry-run

# 強制升級，不提示
skillshare upgrade --force

# 僅升級 CLI 執行檔
skillshare upgrade --cli

# 僅升級 skillshare skill
skillshare upgrade --skill
```

## 升級後

若你升級了 skill，執行 `skillshare sync` 以分發它：

```bash
skillshare upgrade --skill
skillshare sync  # 分發到所有 targets
```

## 升級的內容

### CLI 執行檔

`skillshare` 執行檔本身。從 GitHub releases 下載。

若執行檔位於受保護的目錄（例如 `/usr/local/bin`），skillshare 會自動以 `sudo` 重新執行升級 — 不需要手動加上前綴。

### Web UI 資源

升級後，skillshare 會預先下載新版本的 Web UI 前端資源。這些會快取於 `~/.cache/skillshare/ui/<version>/`，並在你執行 `skillshare ui` 時提供服務。

若預先下載失敗（例如網路問題），這些資源會在下一次啟動 `skillshare ui` 時下載。

### skillshare Skill

內建的 `skillshare` skill 會在 AI CLIs 中加入 `/skillshare` 指令。位置在：
```
~/.config/skillshare/skills/skillshare/SKILL.md
```

## 另請參閱

- [update](/docs/reference/commands/update) — 更新其他 skills 與儲存庫
- [status](/docs/reference/commands/status) — 檢查目前版本
- [doctor](/docs/reference/commands/doctor) — 診斷問題
