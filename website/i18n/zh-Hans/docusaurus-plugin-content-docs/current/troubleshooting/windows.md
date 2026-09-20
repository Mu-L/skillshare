---
sidebar_position: 3
---

# Windows

Windows 专属的问题与解决方式。

## Installation

### 如何在 Windows 上安装？

**PowerShell：**
```powershell
irm https://raw.githubusercontent.com/runkids/skillshare/main/install.ps1 | iex
```

**或手动下载：**
1. 前往 [releases](https://github.com/runkids/skillshare/releases)
2. 下载 Windows 版的 `.zip`
3. 解压并添加到 PATH

---

## Permissions

### skillshare 需要管理员权限吗？

**不需要。** skillshare 使用 NTFS junction 而不是 symlink，因此不需要管理员权限。

NTFS junction 在目录层面上的行为类似 symlink，但所有用户都能使用。

---

## File Locations

### Windows 上的配置文件在哪里？

```
%AppData%\skillshare\config.yaml
%AppData%\skillshare\skills\
%AppData%\skillshare\backups\
```

通常是：
```
C:\Users\YourName\AppData\Roaming\skillshare\
```

### Target 目录在哪里？

```
%USERPROFILE%\.claude\skills\
%USERPROFILE%\.cursor\skills\
%USERPROFILE%\.codex\skills\
```

---

## Environment Variables

### 如何在 Windows 上设置 GITHUB_TOKEN？

**仅当前会话有效：**
```powershell
$env:GITHUB_TOKEN = "ghp_your_token"
```

**永久生效（用户层级）：**
```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token", "User")
```

**然后重新启动 PowerShell。**

### 如何设置 SKILLSHARE_CONFIG？

```powershell
$env:SKILLSHARE_CONFIG = "C:\path\to\custom\config.yaml"
skillshare status
```

---

## Common Issues

### `junction creation failed`

**原因：** 目标路径已经以文件形式存在，或类型不兼容。

**解决方式：**
```powershell
# 备份并移除既有内容
skillshare backup
Remove-Item -Path "$env:USERPROFILE\.claude\skills" -Recurse -Force
skillshare sync
```

### `path too long`

**原因：** Windows 默认的路径长度限制为 260 个字符。

**解决方式：** 启用长路径支持：
```powershell
# 以管理员身份运行
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```

然后重新启动。

### `access denied`

**原因：** 文件或目录正被占用，或受到保护。

**解决方式：**
1. 关闭所有正在使用这些文件的程序
2. 确认防病毒软件没有拦截
3. 以管理员身份运行 PowerShell（很少需要）

### `symlinks not working`

**原因：** 你看到的是 symlink 而不是 junction。

**说明：** skillshare 在 Windows 上使用的是 NTFS junction，而不是 symlink。如果你看到 symlink 相关的错误，请确认使用的是 Windows 版的 skillshare。

### Antigravity 中出现 `Incorrect function`

Antigravity 无法遍历 junction。参见 [Antigravity does not load synced skills](./common-errors.md#antigravity-does-not-load-synced-skills)。

---

## PowerShell Tips

### 别名

添加到你的 PowerShell profile（`$PROFILE`）：
```powershell
Set-Alias -Name ss -Value skillshare
function sss { skillshare sync }
function ssp { param($m) skillshare push -m $m }
function ssl { skillshare pull }
```

### 检查 PowerShell 版本

skillshare 支持 PowerShell 5.1+ 与 PowerShell Core 7+：
```powershell
$PSVersionTable.PSVersion
```

---

## WSL Compatibility

如果你使用 Windows Subsystem for Linux：

### 各自独立安装

为 Windows 和 WSL 分别保留独立的 skillshare 安装：
- Windows：`%AppData%\skillshare\`
- WSL：`~/.config/skillshare/`

### 通过 git 共享

用同一个 git remote 在两者之间同步：
```bash
# Windows
skillshare push -m "From Windows"

# WSL
skillshare pull
```

---

## Getting Help

提交 bug 报告时请附上：
- Windows 版本：`winver`
- PowerShell 版本：`$PSVersionTable.PSVersion`
- skillshare 版本：`skillshare --version`
- 完整的错误信息

---

## Related

- [Common Errors](./common-errors.md) — 一般错误解决方式
- [Configuration](/docs/reference/targets/configuration) — 配置文件参考
