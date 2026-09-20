---
sidebar_position: 3
---

# Codex で skillshare を使う

> インストールから最初の Sync まで — 5分。

## 前提条件

- [OpenAI Codex CLI](https://github.com/openai/codex) がインストール済みで動作していること
- macOS、Linux、または Windows

## ステップ 1: skillshare をインストールする

```bash
curl -fsSL https://raw.githubusercontent.com/runkids/skillshare/main/install.sh | sh
```

## ステップ 2: 初期化する

```bash
skillshare init
```

これは Codex の Skill ディレクトリ（`~/.codex/skills/`）を検出し、自動的に Target として追加します。

## ステップ 3: 最初の Skill をインストールする

```bash
skillshare install runkids/my-skills
```

## ステップ 4: Sync する

```bash
skillshare sync
```

Skill は `~/.codex/skills/` にシンボリックリンクされます。

## ステップ 5: 確認する

```bash
ls ~/.codex/skills/
```

インストールした Skill がシンボリックリンクされているのが見えるはずです。

## Codex 固有の注意事項

- **Skill のパス**: `~/.codex/skills/`（Global）または `.agents/skills/`（Project）
- **説明文の文字数制限**: Codex は Skill の description に 1024 文字の制限があります。
  `SKILL.md` フロントマターの `description` フィールドは簡潔に保ってください
- **Project mode**: プロジェクトレベルの Codex Skill を管理するには `skillshare init -p` を実行します

## 次のステップ

- [複数の Skill を管理する →](/docs/how-to/daily-tasks/organizing-skills)
- [チームと共有する →](/docs/how-to/sharing/organization-sharing)
- [さらに Skill を探す →](/docs/reference/commands/search)
