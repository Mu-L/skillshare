---
sidebar_position: 5
---

# Migration

从其他 Skill 管理方式迁移到 skillshare。

## 从手动管理迁移

如果你一直在各个 AI CLI 之间手动复制 Skill：

### 第 1 步：初始化 skillshare

```bash
skillshare init
```

### 第 2 步：收集现有 Skill

```bash
# 从各个 AI CLI 收集
skillshare collect claude
skillshare collect cursor
skillshare collect codex

# 或一次性收集全部
skillshare collect --all
```

### 第 3 步：处理重复项

如果同一个 Skill 存在于多个位置，`collect` 会发出警告，由你选择保留哪一个。

### 第 4 步：Sync

```bash
skillshare sync
```

现在所有 Target 都已符号链接到你唯一的 Source。

---

## 从其他安装工具迁移

如果你使用过 `npx install-skill` 或类似工具：

### 第 1 步：初始化 skillshare

```bash
skillshare init
```

### 第 2 步：备份现有 Skill

```bash
skillshare backup
```

### 第 3 步：收集或重新安装

**方式 A：收集现有内容**（保留当前版本）
```bash
skillshare collect --all
```

**方式 B：从 Source 重新安装**（获取最新版本）
```bash
# 查看元数据
cat ~/.config/skillshare/skills/.metadata.json

# 重新安装
skillshare install anthropics/skills/skills/pdf
```

### 第 4 步：Sync

```bash
skillshare sync
```

---

## 从 Git Submodule 迁移

如果你一直在使用 git submodule：

### 第 1 步：导出 submodule 内容

```bash
# 在你现有的 Skill 仓库中
git submodule foreach 'cp -r $toplevel/$sm_path ~/temp-skills/$name'
```

### 第 2 步：初始化 skillshare

```bash
skillshare init
```

### 第 3 步：导入 Skill

```bash
# 复制到 Source
cp -r ~/temp-skills/* ~/.config/skillshare/skills/

# 或以 tracked repo 形式安装
skillshare install github.com/org/skill-repo --track
```

### 第 4 步：Sync

```bash
skillshare sync
```

---

## 从已提交的项目 Skill 迁移

如果你的仓库已经在 `.claude/skills/`、`.cursor/skills/` 或类似目录中提交了 Skill：

### 第 1 步：初始化 Project mode

```bash
cd my-project
skillshare init -p
```

### 第 2 步：将 Skill 移动到 `.skillshare/skills/`

```bash
# 将现有 Skill 复制到 skillshare 的 Source
cp -r .claude/skills/my-skill .skillshare/skills/
cp -r .claude/skills/api-guide .skillshare/skills/

# 删除原始文件（Sync 会将其重新创建为符号链接）
rm -rf .claude/skills/my-skill .claude/skills/api-guide
```

### 第 3 步：Sync

```bash
skillshare sync
```

现在 `.claude/skills/my-skill` 是指向 `.skillshare/skills/my-skill` 的符号链接 — 其他所有 Target（Cursor、Windsurf 等）也会自动获得相同的 Skill。

### 第 4 步：提交迁移结果

```bash
git add .skillshare/ .claude/skills/ .cursor/skills/
git commit -m "Migrate project skills to skillshare"
```

:::tip 多工具优势
之前：Skill 只能在一种 AI CLI 中使用。之后：相同的 Skill 会自动在每个已配置的 Target 中可用。
:::

---

## 从团队特定方案迁移

如果你的团队有自定义的 Skill 共享方式：

### 第 1 步：识别当前方案

- Skill 存放在哪里？
- 如何共享？
- 如何更新？

### 第 2 步：选择迁移路径

**方式 A：Global mode** — 每台机器上的所有项目都能使用 Skill。

```bash
# 创建团队 Skill 仓库
cp -r /current/team/skills ~/new-team-skills
cd ~/new-team-skills && git init && git add . && git commit -m "Migrate to skillshare"
git push origin main

# 团队成员进行全局安装
skillshare install github.com/org/team-skills --track && skillshare sync
```

**方式 B：Project mode** — Skill 限定于特定仓库，通过 git 共享。

```bash
cd my-project
skillshare init -p

# 将团队 Skill 移入项目的 Source
cp -r /current/team/skills/* .skillshare/skills/

# Sync 并提交
skillshare sync
git add .skillshare/
git commit -m "Add team skills via skillshare"
```

新团队成员只需执行以下命令即可获得一切：
```bash
git clone github.com/org/my-project
cd my-project
skillshare install -p && skillshare sync
```

**方式 C：两者兼具** — 组织级标准使用 Global mode，项目特定的 Skill 逐仓库配置。

```bash
# 组织标准（Global）
skillshare install github.com/org/standards --track && skillshare sync

# 项目特定 Skill（Project mode）
cd my-project
skillshare init -p
skillshare install github.com/org/project-skills -p && skillshare sync
```

:::tip 该如何选择？
- **Global**：编码规范、安全审计 — 每个项目都需要的内容
- **Project**：API 约定、领域规则、部署指南 — 特定于某个仓库的内容
- **两者兼具**：大多数团队随着规模增长最终都会走到这一步
:::

---

## 从 Global 迁移到 Project

如果你在 Global mode 中有属于某个特定项目的 Skill：

### 第 1 步：初始化 Project mode

```bash
cd my-project
skillshare init -p
```

### 第 2 步：从 Global Source 复制 Skill

```bash
# 复制指定 Skill
cp -r ~/.config/skillshare/skills/api-guide .skillshare/skills/
cp -r ~/.config/skillshare/skills/deploy-rules .skillshare/skills/
```

### 第 3 步：从 Global 中移除（可选）

```bash
skillshare uninstall api-guide
skillshare uninstall deploy-rules
skillshare sync   # 清理 Global 符号链接
```

### 第 4 步：Sync 并提交

```bash
skillshare sync   # 自动检测为 Project mode
git add .skillshare/
git commit -m "Move project-specific skills to project mode"
```

之后，这些 Skill 就限定于此仓库，并通过 git 与团队共享 — 不再占用你的 Global 配置。

---

## 保留历史记录

如果你想保留 git 历史：

### 个人 Skill

```bash
# 将现有仓库 clone 到 skillshare 的位置
git clone your-existing-repo ~/.config/skillshare/skills

# 使用现有 Source 初始化 skillshare
skillshare init --source ~/.config/skillshare/skills
```

### 团队仓库

```bash
# 使用 --track 保留 .git
skillshare install github.com/team/skills --track
```

---

## 回滚

如果迁移出现问题：

### 从备份恢复

```bash
skillshare restore claude
skillshare restore cursor
```

### 重新开始

```bash
rm ~/.config/skillshare/config.yaml
skillshare init
```

---

## 检查清单

迁移前：

- [ ] 列出当前所有 Skill 位置
- [ ] 识别重复项
- [ ] 记录任何自定义配置
- [ ] 创建备份

迁移后：

- [ ] 确认所有 Skill 都出现在 `skillshare list` 中
- [ ] 在每个 AI CLI 中测试 Skill
- [ ] 设置 git remote（如需要）
- [ ] 向团队分享新的工作流程

---

## 另请参阅

- [From Existing Skills](/docs/getting-started/from-existing-skills) — 快速迁移路径
- [collect](/docs/reference/commands/collect) — 从 Target 收集
- [Comparison](/docs/understand/philosophy/comparison) — 方案对比
