---
sidebar_position: 3
---

# Windows

Windows 관련 문제와 해결 방법입니다.

## Installation

### How do I install on Windows?

**PowerShell:**
```powershell
irm https://raw.githubusercontent.com/runkids/skillshare/main/install.ps1 | iex
```

**Or download manually:**
1. [releases](https://github.com/runkids/skillshare/releases)로 이동
2. Windows용 `.zip` 다운로드
3. 압축 해제 후 PATH에 추가

---

## Permissions

### Does skillshare need admin privileges?

**아니요.** skillshare는 symlink 대신 NTFS junction을 사용하며, 이는 관리자 권한이 필요하지 않습니다.

NTFS junction은 디렉터리에 대해 symlink처럼 동작하지만 모든 사용자가 사용할 수 있습니다.

---

## File Locations

### Where are config files on Windows?

```
%AppData%\skillshare\config.yaml
%AppData%\skillshare\skills\
%AppData%\skillshare\backups\
```

일반적으로:
```
C:\Users\YourName\AppData\Roaming\skillshare\
```

### Where are target directories?

```
%USERPROFILE%\.claude\skills\
%USERPROFILE%\.cursor\skills\
%USERPROFILE%\.codex\skills\
```

---

## Environment Variables

### How do I set GITHUB_TOKEN on Windows?

**현재 세션에만:**
```powershell
$env:GITHUB_TOKEN = "ghp_your_token"
```

**영구 설정 (사용자 수준):**
```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token", "User")
```

**그런 다음 PowerShell을 재시작하세요.**

### How do I set SKILLSHARE_CONFIG?

```powershell
$env:SKILLSHARE_CONFIG = "C:\path\to\custom\config.yaml"
skillshare status
```

---

## Common Issues

### `junction creation failed`

**Cause:** Target 경로가 이미 파일 또는 호환되지 않는 유형으로 존재합니다.

**Solution:**
```powershell
# 기존 항목을 백업하고 제거
skillshare backup
Remove-Item -Path "$env:USERPROFILE\.claude\skills" -Recurse -Force
skillshare sync
```

### `path too long`

**Cause:** Windows는 기본적으로 260자 경로 제한이 있습니다.

**Solution:** 긴 경로를 활성화하세요.
```powershell
# 관리자 권한으로 실행
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```

그런 다음 재시작하세요.

### `access denied`

**Cause:** 파일 또는 디렉터리가 사용 중이거나 보호되어 있습니다.

**Solutions:**
1. 해당 파일을 사용 중인 프로그램 종료
2. 백신 프로그램이 차단하고 있지 않은지 확인
3. PowerShell을 관리자 권한으로 실행 (거의 필요 없음)

### `symlinks not working`

**Cause:** symlink 대신 junction이 보이는 상황입니다.

**Note:** skillshare는 Windows에서 symlink가 아닌 NTFS junction을 사용합니다. symlink 오류가 보인다면, Windows 버전의 skillshare를 사용하고 있는지 확인하세요.

### `Incorrect function` in Antigravity

Antigravity는 junction을 탐색할 수 없습니다. [Antigravity does not load synced skills](./common-errors.md#antigravity-does-not-load-synced-skills)를 참고하세요.

---

## PowerShell Tips

### Aliases

PowerShell 프로필(`$PROFILE`)에 추가하세요.
```powershell
Set-Alias -Name ss -Value skillshare
function sss { skillshare sync }
function ssp { param($m) skillshare push -m $m }
function ssl { skillshare pull }
```

### Check PowerShell version

skillshare는 PowerShell 5.1+와 PowerShell Core 7+에서 동작합니다.
```powershell
$PSVersionTable.PSVersion
```

---

## WSL Compatibility

Windows Subsystem for Linux를 사용한다면:

### Separate installations

Windows와 WSL을 위한 skillshare 설치를 분리해서 유지하세요.
- Windows: `%AppData%\skillshare\`
- WSL: `~/.config/skillshare/`

### Share via git

동일한 git remote를 사용해 둘 사이를 동기화하세요.
```bash
# Windows
skillshare push -m "From Windows"

# WSL
skillshare pull
```

---

## Getting Help

버그 리포트에 다음을 포함하세요.
- Windows 버전: `winver`
- PowerShell 버전: `$PSVersionTable.PSVersion`
- skillshare 버전: `skillshare --version`
- 전체 오류 메시지

---

## Related

- [Common Errors](./common-errors.md) — 일반적인 오류 해결 방법
- [Configuration](/docs/reference/targets/configuration) — Config 파일 참조
