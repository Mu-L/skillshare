---
sidebar_position: 3
---

# Windows

Windows 特有的問題與解決方法。

## 安裝

### 我要如何在 Windows 上安裝？

**PowerShell：**
```powershell
irm https://raw.githubusercontent.com/runkids/skillshare/main/install.ps1 | iex
```

**或手動下載：**
1. 前往 [releases](https://github.com/runkids/skillshare/releases)
2. 下載 Windows 版的 `.zip`
3. 解壓縮並加入 PATH

---

## 權限

### skillshare 需要系統管理員權限嗎？

**不需要。** skillshare 使用 NTFS junction 取代 symlink，不需要系統管理員權限。

NTFS junction 對目錄的作用類似 symlink，但所有使用者都能使用。

---

## 檔案位置

### Windows 上的設定檔在哪裡？

```
%AppData%\skillshare\config.yaml
%AppData%\skillshare\skills\
%AppData%\skillshare\backups\
```

通常是：
```
C:\Users\YourName\AppData\Roaming\skillshare\
```

### Target 目錄在哪裡？

```
%USERPROFILE%\.claude\skills\
%USERPROFILE%\.cursor\skills\
%USERPROFILE%\.codex\skills\
```

---

## 環境變數

### 我要如何在 Windows 上設定 GITHUB_TOKEN？

**僅限目前的 session：**
```powershell
$env:GITHUB_TOKEN = "ghp_your_token"
```

**永久設定（使用者層級）：**
```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token", "User")
```

**接著重新啟動 PowerShell。**

### 我要如何設定 SKILLSHARE_CONFIG？

```powershell
$env:SKILLSHARE_CONFIG = "C:\path\to\custom\config.yaml"
skillshare status
```

---

## 常見問題

### `junction creation failed`

**原因：** Target 路徑已存在為檔案或不相容的類型。

**解決方法：**
```powershell
# 備份並移除既有內容
skillshare backup
Remove-Item -Path "$env:USERPROFILE\.claude\skills" -Recurse -Force
skillshare sync
```

### `path too long`

**原因：** Windows 預設有 260 字元的路徑長度限制。

**解決方法：** 啟用長路徑支援：
```powershell
# 以系統管理員身分執行
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```

接著重新啟動。

### `access denied`

**原因：** 檔案或目錄正在使用中或受到保護。

**解決方法：**
1. 關閉任何正在使用這些檔案的程式
2. 檢查防毒軟體是否封鎖
3. 以系統管理員身分執行 PowerShell（很少需要）

### `symlinks not working`

**原因：** 你看到的是 symlink 而非 junction。

**注意：** skillshare 在 Windows 上使用 NTFS junction，而非 symlink。如果你看到 symlink 相關的錯誤，請確認你使用的是 Windows 版本的 skillshare。

### Antigravity 出現 `Incorrect function`

Antigravity 無法遍歷 junction。請參閱 [Antigravity 無法載入已同步的 Skill](./common-errors.md#antigravity-does-not-load-synced-skills)。

---

## PowerShell 提示

### 別名

加入你的 PowerShell profile（`$PROFILE`）：
```powershell
Set-Alias -Name ss -Value skillshare
function sss { skillshare sync }
function ssp { param($m) skillshare push -m $m }
function ssl { skillshare pull }
```

### 檢查 PowerShell 版本

skillshare 可搭配 PowerShell 5.1+ 與 PowerShell Core 7+ 使用：
```powershell
$PSVersionTable.PSVersion
```

---

## WSL 相容性

如果你使用 Windows Subsystem for Linux：

### 分開安裝

為 Windows 與 WSL 保留各自獨立的 skillshare 安裝：
- Windows：`%AppData%\skillshare\`
- WSL：`~/.config/skillshare/`

### 透過 git 共享

使用同一個 git remote 在兩者之間同步：
```bash
# Windows
skillshare push -m "From Windows"

# WSL
skillshare pull
```

---

## 取得協助

在錯誤回報中附上：
- Windows 版本：`winver`
- PowerShell 版本：`$PSVersionTable.PSVersion`
- skillshare 版本：`skillshare --version`
- 完整錯誤訊息

---

## 相關文件

- [常見錯誤](./common-errors.md) — 一般錯誤的解決方法
- [設定](/docs/reference/targets/configuration) — 設定檔參考
