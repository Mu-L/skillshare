---
sidebar_position: 7
---

# AI 支援開発

> ビルド済みの Project mode Skill を使って、AI コーディング Agent で skillshare にコントリビュートする。

## 前提条件

- AI コーディング Agent（Claude Code、Codex など）
- ローカルに clone された skillshare リポジトリ

## セットアップ

このリポジトリには `.skillshare/skills/` に Project mode の Skill が同梱されています。Agent に
Sync してください。

```bash
skillshare sync -p
```

これで、あなたの AI Agent はこのコードベースで作業するための専用の Skill にアクセスできます。

## 利用可能な Skill

| Skill | 何をするか |
|-------|-------------|
| `implement-feature` | TDD ワークフローを使い、spec ファイルまたは説明から機能を実装する |
| `update-docs` | すべてのフラグを Source と照合しながら、Web サイトのドキュメントを最近のコード変更に合わせて更新する |
| `codebase-audit` | CLI フラグ、ドキュメント、テスト、Target をコードベース全体で相互検証する |
| `cli-e2e-test` | runbook から devcontainer 内で隔離された E2E テストを実行する |
| `changelog` | 最近のコミットから conventional な形式で CHANGELOG.md のエントリを生成する |

## 典型的なワークフロー

1. **機能を始める** — Agent に spec を使って `implement-feature` を使うよう依頼する
2. **ドキュメントを更新する** — コード変更後、`update-docs` を呼び出して Web サイトのドキュメントを Sync する
3. **一貫性を監査する** — フラグ/ドキュメントの不一致を捕捉するために `codebase-audit` を実行する
4. **E2E テストを実行する** — サンドボックスで検証するために `cli-e2e-test` を使う
5. **changelog を書く** — リリース前に `changelog` を呼び出す

## 次のステップ

- [Dev Containers セットアップ →](/docs/learn/with-devcontainer)
- [インタラクティブプレイグラウンド →](/docs/learn/with-playground)
- [コントリビューションガイド →](https://github.com/runkids/skillshare/blob/main/CONTRIBUTING.md)
