---
sidebar_position: 8
---

# レシピ: 多数の Project を 1 つの Config で

> global config から、1 回の sync で複数の project フォルダーに Skill と MCP サーバーを配布する。

## シナリオ

多数の project フォルダーで作業しており、それぞれに Skill と MCP サーバーの異なるサブセットを持たせたいとします。[Project mode](/docs/how-to/recipes/skill-per-project-workflow) では、各 project に `.skillshare/config.yaml` を置き、それぞれのフォルダー内から sync することでこれを実現します。project のセットアップをコミットしてチームメイトと共有すべき場合は、これが適切な選択です。

project が自分だけのものであれば、project ごとの config は省略できます。Target は名前とパスの組にすぎず、そのパスは project の内側を指すこともできます。こうするとすべてが global config に収まり、どのフォルダーからでも `skillshare sync` を 1 回実行するだけで、すべての project が更新されます。

## 解決策

### Skill: project ごとに 1 つの Target

```bash
skillshare target add project01 ~/work/project01/.agents/skills
skillshare target project01 --mode copy
skillshare target project01 --add-include "myskill-*"
skillshare sync
```

- Target 名は自由に決められます。Agent の名前である必要はありません。
- `copy` は実ファイルを書き込むため、project 側でコミットできます。シンボリックリンクで問題なければ、デフォルトの `merge` のままにしてください。
- `--add-include` は、その project に必要な Skill だけに絞り込みます。[Skill のフィルタリング](/docs/how-to/daily-tasks/filtering-skills)を参照してください。

これで global config は次の内容を持ちます。

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

project を増やすには、`target add` コマンドをさらに実行するか、このブロックをコピーします。

### MCP サーバー: `mcp.projects`

MCP サーバーは各 Agent 自身の config ファイルに書き込まれるため、パスではなく project フォルダーごとに列挙します。

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
        context7:            # 他の場所では読み込まれ、ここではオフ
          disabled: true
          targets: [opencode]
```

```bash
skillshare sync mcp --dry-run   # すべてのファイルをプレビューする
skillshare sync mcp
```

フィールドと制限事項については、[`mcp`: 複数の project を管理する](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)を参照してください。

## 確認

- `skillshare sync` が project の Target を報告する（例: `project01: copied (1 new, ...)`）
- `~/work/project01/.agents/skills/` に `include` に一致した Skill だけが含まれている
- `skillshare sync mcp --dry-run` が project のファイルごとに 1 行ずつ表示する
- 2 回目の `skillshare sync mcp` がすべてのエントリを `unchanged` と報告する

## バリエーション

- **コミットするか無視するか**: `copy` mode では、Skillshare はコピーした内容を追跡するために、Target フォルダーに `.skillshare-manifest.json` も書き込みます。Skill と一緒にコミットするか、`.gitignore` に追加してください。
- **パス重複の警告**: project のパスが、別の Target がすでに使っているフォルダーと同じ場合、`sync` はパス重複の警告を表示します。どの Target が共有しているかは `skillshare doctor` で確認できます。
- **複数の project で同じサーバーを使う**: 1 つの project の下で YAML アンカー（`docs: &docs`）を使って一度だけ定義し、他の project で再利用します（`docs: *docs`）。[`mcp` リファレンス](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config)を参照してください。
- **共有される project**: project をクローンしたチームメイトには、あなたの global config は渡りません。セットアップをリポジトリと一緒に持ち運ぶ必要がある場合は、[project mode](/docs/how-to/recipes/skill-per-project-workflow) を使ってください。

## 関連項目

- [`target` コマンドリファレンス](/docs/reference/commands/target)
- [`mcp` コマンドリファレンス](/docs/reference/commands/mcp)
- [MCP サーバーの共有](/docs/how-to/daily-tasks/sharing-mcp)
