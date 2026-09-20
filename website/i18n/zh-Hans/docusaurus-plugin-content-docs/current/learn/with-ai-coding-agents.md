---
sidebar_position: 7
---

# AI 辅助开发

> 使用 AI coding agents，借助预建的 project skills 参与 skillshare 的开发。

## 前置条件

- 一个 AI coding agent（Claude Code、Codex 等）
- 已在本机克隆 skillshare 仓库

## 设置

该仓库在 `.skillshare/skills/` 中提供了 project-mode skills。将它们同步到你的 agent：

```bash
skillshare sync -p
```

现在你的 AI agent 已经可以使用针对该代码库的专用 Skill 了。

## 可用 Skill

| Skill | 作用 |
|-------|-------------|
| `implement-feature` | 使用 TDD 工作流，根据 spec 文件或描述实现功能 |
| `update-docs` | 更新网站文档以匹配最近的代码变更，并将每个 flag 与源码交叉验证 |
| `codebase-audit` | 交叉验证 CLI flags、文档、测试与 targets，检查整个代码库的一致性 |
| `cli-e2e-test` | 依据 runbooks，在 devcontainer 中运行隔离的 E2E 测试 |
| `changelog` | 以约定式格式，根据最近的提交生成 CHANGELOG.md 条目 |

## 典型工作流

1. **开始一个功能** — 让你的 agent 使用 `implement-feature` 搭配一份 spec
2. **更新文档** — 代码变更后，调用 `update-docs` 来同步网站文档
3. **审计一致性** — 运行 `codebase-audit` 以捕捉 flag 与文档不一致的地方
4. **运行 E2E 测试** — 使用 `cli-e2e-test` 在沙盒中进行验证
5. **撰写 changelog** — 发布前调用 `changelog`

## 接下来？

- [Dev Containers 设置 →](/docs/learn/with-devcontainer)
- [互动式 Playground →](/docs/learn/with-playground)
- [贡献指南 →](https://github.com/runkids/skillshare/blob/main/CONTRIBUTING.md)
