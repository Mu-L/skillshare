---
sidebar_position: 3
---

# Windows

Windows 固有の問題と解決方法です。

## インストール

### Windows にはどうやってインストールしますか？

**PowerShell:**
```powershell
irm https://raw.githubusercontent.com/runkids/skillshare/main/install.ps1 | iex
```

**または手動でダウンロードする:**
1. [リリース](https://github.com/runkids/skillshare/releases) にアクセスする
2. Windows 用の `.zip` をダウンロードする
3. 展開して PATH に追加する

---

## 権限

### skillshare には管理者権限が必要ですか？

**いいえ。** skillshare はシンボリックリンクの代わりに NTFS ジャンクションを使用するため、
管理者権限は不要です。

NTFS ジャンクションはディレクトリに対してシンボリックリンクのように機能しますが、すべてのユーザーが
利用できます。

---

## ファイルの場所

### Windows での Config ファイルはどこにありますか？

```
%AppData%\skillshare\config.yaml
%AppData%\skillshare\skills\
%AppData%\skillshare\backups\
```

通常は次の場所です。
```
C:\Users\YourName\AppData\Roaming\skillshare\
```

### Target ディレクトリはどこにありますか？

```
%USERPROFILE%\.claude\skills\
%USERPROFILE%\.cursor\skills\
%USERPROFILE%\.codex\skills\
```

---

## 環境変数

### Windows で GITHUB_TOKEN を設定するには？

**現在のセッションのみ:**
```powershell
$env:GITHUB_TOKEN = "ghp_your_token"
```

**永続化（ユーザーレベル）:**
```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token", "User")
```

**その後 PowerShell を再起動してください。**

### SKILLSHARE_CONFIG を設定するには？

```powershell
$env:SKILLSHARE_CONFIG = "C:\path\to\custom\config.yaml"
skillshare status
```

---

## よくある問題

### `junction creation failed`

**原因:** Target のパスがすでにファイルまたは互換性のない種類として存在している。

**解決策:**
```powershell
# バックアップして既存のものを削除する
skillshare backup
Remove-Item -Path "$env:USERPROFILE\.claude\skills" -Recurse -Force
skillshare sync
```

### `path too long`

**原因:** Windows はデフォルトで260文字のパス長制限がある。

**解決策:** 長いパスを有効にしてください。
```powershell
# 管理者として実行する
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```

その後再起動してください。

### `access denied`

**原因:** ファイルまたはディレクトリが使用中、または保護されている。

**解決策:**
1. ファイルを使用しているプログラムを閉じる
2. アンチウイルスがブロックしていないか確認する
3. PowerShell を管理者として実行する（ほとんど必要ない）

### `symlinks not working`

**原因:** ジャンクションではなくシンボリックリンクが表示されている。

**注記:** skillshare は Windows ではシンボリックリンクではなく NTFS ジャンクションを使用します。
シンボリックリンクのエラーが表示される場合は、Windows 版の skillshare を使用していることを
確認してください。

### Antigravity での `Incorrect function`

Antigravity はジャンクションをたどれません。
[Antigravity が Sync された Skill を読み込まない](./common-errors.md#antigravity-does-not-load-synced-skills)
を参照してください。

---

## PowerShell のヒント

### エイリアス

PowerShell プロファイル（`$PROFILE`）に追加してください。
```powershell
Set-Alias -Name ss -Value skillshare
function sss { skillshare sync }
function ssp { param($m) skillshare push -m $m }
function ssl { skillshare pull }
```

### PowerShell のバージョンを確認する

skillshare は PowerShell 5.1 以降および PowerShell Core 7 以降で動作します。
```powershell
$PSVersionTable.PSVersion
```

---

## WSL との互換性

Windows Subsystem for Linux を使用している場合:

### インストールを分離する

Windows と WSL 用に別々の skillshare インストールを維持してください。
- Windows: `%AppData%\skillshare\`
- WSL: `~/.config/skillshare/`

### git 経由で共有する

同じ git リモートを使ってそれらの間で Sync してください。
```bash
# Windows
skillshare push -m "From Windows"

# WSL
skillshare pull
```

---

## ヘルプを得る

バグ報告には以下を含めてください。
- Windows のバージョン: `winver`
- PowerShell のバージョン: `$PSVersionTable.PSVersion`
- skillshare のバージョン: `skillshare --version`
- 完全なエラーメッセージ

---

## 関連項目

- [よくあるエラー](./common-errors.md) — 一般的なエラーの解決方法
- [Configuration](/docs/reference/targets/configuration) — Config ファイルリファレンス
