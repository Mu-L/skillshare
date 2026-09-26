---
sidebar_position: 11
---

# 1 つの AGENTS.md をツール間で共有する

AI ツールはそれぞれ、自身のファイルから常に従う指示を読み込みます。Claude Code は `CLAUDE.md`、
Gemini CLI は `GEMINI.md`、Codex やほとんどのツールは `AGENTS.md` を、それぞれ自身のフォルダーから
読み込みます。Web ダッシュボード（`skillshare ui`）はこれらのファイルを表示・編集でき、複数のツールに
1 つの共有 `AGENTS.md` を渡すこともできます。

これはダッシュボードの機能で、専用の CLI コマンドはありません。共有 `AGENTS.md` は
[Extras](../../reference/commands/extras.md#single-file-extras) として保存されるため、
`skillshare sync extras` でも配置が維持されます。

## Target が読むファイルを確認する {#see-what-a-target-reads}

**ターゲット** から Target を開きます。そのページには、その Target が読むファイル名のタブがあります。
claude なら **CLAUDE.md**、gemini なら **GEMINI.md**、codex なら **AGENTS.md** です。
タブには次の内容が表示されます。

- **読み込み順**: ツールが読み込むファイルを読み込む順に番号付きで並べ、`loaded`、`skipped`、
  `missing` のいずれかを示します。claude の場合は `~/.claude/rules/` 内の Markdown ファイルと、
  claude がユーザーレベルの `AGENTS.md` を読まないことを示す `AGENTS.md` の行も含まれます。
- ファイルのエディタ。**保存** は現在のファイルを先にバックアップし、ファイルがまだなければ作成します。
- 警告。`@` で始まる行は import で、展開するのは一部のツールだけです。他のツールはそれをただの
  テキストとして読みます。Windsurf はグローバルな rules ファイルの先頭 6,000 文字しか読み込みません。
- **共有 AGENTS.md**（global モード）: この Target が使う共有ファイルと、それを選ぶためのリンク。

ファイルが共有 `AGENTS.md` へのリンクの場合、エディタは読み取り専用になります。編集するとその共有
ファイルを使うすべての Target が変わるため、そのファイル専用のページで編集してください。dotfiles への
リンクなど、自分で作ったリンクは編集でき、保存するとリンク先のファイルに書き込まれます。

skillshare が把握しているファイルは次のとおりです。

| Target | ユーザーレベルのファイル | プロジェクトのファイル | `@` import に従う |
|--------|-----------------|--------------|---------------------|
| amp | `~/.config/amp/AGENTS.md` | `AGENTS.md` | いいえ |
| antigravity | `~/.gemini/GEMINI.md`（gemini と同じファイル） | `AGENTS.md` | いいえ |
| claude | `~/.claude/CLAUDE.md` と `~/.claude/rules/` | `CLAUDE.md`（`CLAUDE.md` がなければ `AGENTS.md`）と `.claude/rules/` | はい |
| codex | `~/.codex/AGENTS.md` | `AGENTS.md` | いいえ |
| cursor | なし: ユーザールールは Cursor の設定内に保存される | `AGENTS.md` | いいえ |
| gemini | `~/.gemini/GEMINI.md` | `GEMINI.md` | いいえ |
| goose | `~/.config/goose/.goosehints` | `AGENTS.md` | いいえ |
| kiro | `~/.kiro/steering/AGENTS.md` | `AGENTS.md` | いいえ |
| opencode | `~/.config/opencode/AGENTS.md` | `AGENTS.md` | いいえ |
| roo | `~/.roo/rules/AGENTS.md` | `AGENTS.md` | いいえ |
| windsurf | `~/.codeium/windsurf/memories/global_rules.md`（先頭 6,000 文字） | `AGENTS.md` | いいえ |

Claude や Codex の[別のアカウント](../../reference/targets/configuration.md#agent-config-dir)は、
自身の Config ディレクトリ内の同じファイル（例: `~/.claude-work/CLAUDE.md`）を読みます。その他の
Target については、[どのファイルを読むかを skillshare に教えます](#tools-skillshare-doesnt-know)。

## CLAUDE.md を AGENTS.md に変換する {#convert-claudemd-to-agentsmd}

Target のタブで **変換…** をクリックすると、その内容を他のツールでも読めるようにできます。このボタンは、
ファイルに移動する内容があり、まだ `AGENTS.md` ではない場合に表示されます。ダイアログは何かを書き込む前に
すべての変更をプレビューし、変更または削除するファイルはそれぞれ先にバックアップされます。

| 方法 | 結果 | 使える場面 |
|--------|--------|-----------|
| **AGENTS.md に移動し、CLAUDE.md からインポート**（推奨） | 内容は `AGENTS.md` に移動します。`CLAUDE.md` には `@AGENTS.md` の行と、claude だけが解釈できる行だけが残ります | `@` import に従うツール（claude） |
| **CLAUDE.md を AGENTS.md に名前変更** | `CLAUDE.md` は削除され、claude は代わりに `AGENTS.md` を読みます | プロジェクトのみ。自身のファイルがないときに `AGENTS.md` を読むツールが対象です。`CLAUDE.local.md` がある間や、`CLAUDE.md` が共有 `AGENTS.md` を使っている間は拒否されます（次の sync で `CLAUDE.md` が再作成されるため） |
| **AGENTS.md にコピー** | 両方のファイルが残り別々に編集されるため、内容がずれていきます | 常に |

ファイル名は Target に合わせて変わります。gemini の場合、ダイアログは **AGENTS.md にコピー** だけを
提示します。1 つ目の方法では、**N 行の @import を CLAUDE.md に残す** がデフォルトでオンになっています。
他のツールはこれらの行をただのテキストとして読んでしまうためです。

ユーザーレベルでは、`~/.claude` 内の `AGENTS.md` を読む他のツールはありません。そのため global モードでは、
1 つ目の方法に **他のターゲットも使える共有 AGENTS.md にする** も表示され、デフォルトでオンになっています。

- **新しく作成…**: 新しい共有 `AGENTS.md` に名前を付けます。内容はそこに移動し、`CLAUDE.md` がそれを
  import します。
- 既存の共有ファイル: 内容はそのファイルの末尾に追加され、`CLAUDE.md` がそれを import するようになります。

共有をオフにすると、内容は `~/.claude/AGENTS.md` に移動し、`CLAUDE.md` に `@AGENTS.md` の行が入ります。

## global モードで 1 つの AGENTS.md を共有する {#share-one-agentsmd-in-global-mode}

**Extras** に移動し、**AGENTS.md** タブを開きます。**新しい共有 AGENTS.md** では、名前（英字、数字、
`-` と `_`）と開始元を指定します。

- **空のファイル**: ダイアログ内で最初の内容を書きます。
- **claude のファイルを移動**（または、ファイルがあり、まだ共有ファイルを使っていない他の Target）:
  Target の現在のファイルが共有ファイルに移動し、以後その Target は共有ファイルを使います。元のファイルは
  先にバックアップされます。

各共有ファイルは `<extras source>/<name>/AGENTS.md`（デフォルトでは
`~/.config/skillshare/extras/<name>/AGENTS.md`）に保存されます。

Target が共有ファイルをどう使うかは、`@` import に従うかどうかで決まります。

- **import する Target**（claude と、`@import` に対応すると設定したツール）は自身の内容を保持し、複数の
  共有ファイルを同時に使えます。skillshare はファイル先頭の管理ブロック内に、共有ファイルごとに 1 行を追加し、
  ブロックの外側は一切変更しません。Claude にはユーザーレベルの `AGENTS.md` がないため、このブロックが
  共有ファイルを読む手段になります。

  ```markdown title="~/.claude/CLAUDE.md"
  <!-- skillshare:instructions:begin -->
  @/Users/you/.config/skillshare/extras/personal/AGENTS.md
  <!-- skillshare:instructions:end -->

  Claude 専用の自分の指示はここに残ります。
  ```

- **その他の Target**（codex、gemini など）は 1 つの共有ファイルを使います。そのファイルはバックアップされ、
  共有ファイルへのリンク（シンボリックリンク）に置き換えられます。

タブの左側には共有ファイルが一覧されます。**すべてのターゲット**、それを使う Target の数付きの各共有ファイル、
そして **自身のファイル** です。どれかをクリックすると、該当する Target だけが表示されます。共有ファイルの
横の矢印はそのページを開きます。共有ファイルを選択していると、ヘッダーに **ターゲットを追加** と
**AGENTS.md を編集** も表示されます。

右側の各行には、Target、書き込み先のファイル、**使用中** の選択欄が表示されます。import する Target の
選択欄では複数の共有ファイルを選べ、その他の Target では 1 つ、または **自身のファイル** を選べます。
複数の Target をまとめて変更するには、行にチェックを入れて **変更先…** を使います。**自身のファイル** に
戻すときは、Target を[復元](#restore-and-delete)するため、必ず先に確認を求められます。

- antigravity は gemini と同じ `~/.gemini/GEMINI.md` を読みます。両方が Target の場合、antigravity の
  行は gemini に従い、単独では変更できません。
- cursor は表示されません。ユーザールールはファイルではなく Cursor の設定に保存されます。

## 1 つの共有ファイルを管理する {#manage-one-shared-file}

共有ファイルのページには、それを使う Target が、各 Target の書き込み先のファイル、モード（`import` または
`symlink`）、ステータスとともに一覧されます。

| ステータス | 意味 |
|--------|---------|
| `synced` | リンクまたは import 行が配置されている |
| `modified` | リンクが内容の異なる通常のファイルに置き換えられている（[後述](#when-a-linked-file-is-edited)） |
| `drift` | Target のファイルは存在するが、共有ファイルにリンクされていないか、import 行がなくなっている |
| `not synced` | Target のファイルがまだ存在しない |
| `no source` | 共有ファイル自体が見つからない |

このページでは次の操作ができます。

- **ターゲットを追加**: Target をもう 1 つつなぎます。一覧には、まだこのファイルを使っていない import する
  Target と、まだどの共有ファイルも使っていないその他の Target が表示されます。
- **AGENTS.md を編集**: このファイルを使うすべての Target が変更を読み込みます。以前のバージョンは
  バックアップされます。
- **同期**: このファイルのリンクと import 行を再配置します。
- 個別の Target を **復元** するか、**共有 AGENTS.md を削除** します。

### 復元と削除 {#restore-and-delete}

**復元** は確認を求めてから、Target を共有ファイルをつなぐ前の状態に戻します。元あったファイルや
シンボリックリンクが戻され、元々なかった場合はファイルが削除されます。import する Target では、skillshare の
import 行だけが削除されます。ブロックのためだけに skillshare が作成した `CLAUDE.md` は、空になった時点で
削除されます。共有ファイル自体は残ります。Target がまだ `modified` の場合、復元は先に編集済みのファイルを
[drift バックアップ](#backups)として保存します。

**共有 AGENTS.md を削除** は Config からそれを削除し、それを使っていたすべての Target を復元します。
ファイル自体は extras フォルダーに残ります。

## リンクされたファイルが編集された場合 {#when-a-linked-file-is-edited}

あなたやツールが Target のファイルを直接編集し、リンクが内容の異なる通常のファイルに置き換えられると、
ステータスは `modified` になります。共有ファイルのページか、**AGENTS.md** タブの行メニューから、どちらを
残すかを選びます。

- **取り込む**: 編集内容が共有ファイルに反映され、それを使うすべての Target に届きます。現在の共有ファイルは
  先にバックアップされます。
- **再適用**: 編集されたファイルを [drift バックアップ](#backups)として保存し、リンクを戻します。

どちらの場合も、後で **復元** すると、Target は編集後の状態ではなく、共有ファイルを使う前の状態に戻ります。

`skillshare sync extras` と **同期** も、確認なしで `modified` のファイルをリンクに置き換えます。編集内容は
先に drift バックアップとして保存されるので、共有ファイルに反映させたい場合は sync の前に **取り込む** を
選んでください。

## skillshare が把握していないツール {#tools-skillshare-doesnt-know}

[カスタム Target](../../reference/targets/adding-custom-targets.md) のように、既知のファイルがない Target
では、タブに **このツールが読むファイル** の入力欄が表示されます。

- global モードでは、フルパスか `~/` で始まるパスを入力します。
- プロジェクトでは、プロジェクトルートからの相対パスを入力します。

ツールが `@` 行に従う場合は、**このツールは @import に対応** にチェックを入れます。claude と同じように、
複数の共有ファイルを同時に使えるようになります。この設定は Target の
[`instructions`](../../reference/targets/configuration.md#target-instructions) として保存されます。ツールを追加するときに **ターゲットを追加** → **カスタムターゲット** で入力しておくこともできます。

後で更新するには、読み込み順の下にある **変更** または **設定を削除** を使います。設定を削除しても
ファイルは削除されません。Target が共有ファイルを使っている間、skillshare は場所の変更や削除を拒否します。
先に自身のファイルに戻してください。

## プロジェクト {#projects}

プロジェクト内で `skillshare ui -p` を実行します。プロジェクトでは、すべての Target がリポジトリで管理される
1 つの `./AGENTS.md` を読むため、共有や sync の必要はありません。**Extras** の **AGENTS.md** タブで
そのファイルを作成・編集でき、各 Target がそれを読み込めるかが表示されます。

| 読み込み方法 | 意味 |
|-------------------|---------|
| 直接読み込む | ツールのプロジェクトのファイルが `AGENTS.md` |
| CLAUDE.md がないため AGENTS.md を読み込む | claude が `AGENTS.md` にフォールバックする |
| CLAUDE.md がインポート | ツール自身のファイルに `@AGENTS.md` の行がある |
| GEMINI.md がリンク | ツール自身のファイルが `AGENTS.md` へのシンボリックリンク |
| CLAUDE.md があるため、claude は AGENTS.md を読み込みません | ツール自身のファイルが `AGENTS.md` を隠している |
| デフォルトでは GEMINI.md だけを読み込む | ツールは自身のファイルを読むが、そのファイルが存在しない |

自身のファイルしか読まないツールには、ワンクリックの修正が用意されています。**@AGENTS.md を追加** は
`CLAUDE.md` の先頭に import 行を追加し（先にバックアップします）、**GEMINI.md を追加** は `AGENTS.md` への
リンクとして `GEMINI.md` を作成します。

プロジェクトの `AGENTS.md` は 1 つなので、グループに分けられません。個人用と仕事用の指示を分けるには、
global モードで共有ファイルを使ってください。

Target のタブはプロジェクトでも使えます。その場合、読み込み順にはプロジェクトのファイルが表示され、
**変換…** では claude 向けに **名前変更** も選べます。

## バックアップ {#backups}

skillshare は、ファイルを置き換える、削除する、またはあなたが書いた内容を変更する前に、そのファイルを
バックアップします。自身の import 行の追加や削除にはバックアップは不要です。各ファイルの最新 10 バージョンが
skillshare の state ディレクトリ（macOS と Linux では `~/.local/state/skillshare/extras/backups/`、
`$XDG_STATE_HOME` が設定されている場合は `$XDG_STATE_HOME/skillshare/extras/backups/`）に保存されます。

復元には、最新のバックアップではなく、共有ファイルをつないだ時点にあったものが使われます。同期、再適用、復元で
置き換えられた編集内容は、別の `drift/` フォルダー（`extras/backups/<id>/drift/`、`<id>` は Target の
ファイルのパスから導出）に保存されます。復元でこれらが戻されることはありません。必要な場合は手動で
コピーしてください。

共有ファイルの背後にある設定と、共有ファイルも扱う CLI コマンドについては、
[単一ファイルの Extras](../../reference/commands/extras.md#single-file-extras) を参照してください。
