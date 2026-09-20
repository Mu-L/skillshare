---
sidebar_position: 8
---

# Recipe: Many Projects, One Config

> Send skills and MCP servers into several project folders from the global config, with one sync.

## Scenario

You work in many project folders and want each to get its own subset of skills and MCP servers. [Project mode](/docs/how-to/recipes/skill-per-project-workflow) does this with a `.skillshare/config.yaml` in every project, and you sync from inside each folder. That is the right choice when the project's setup should be committed and shared with teammates.

If the projects are yours alone, you can skip the per-project config. A target is just a name and a path, and the path can point inside a project. Everything then lives in the global config, and one `skillshare sync` from any folder updates every project.

## Solution

### Skills: a target per project

```bash
skillshare target add project01 ~/work/project01/.agents/skills
skillshare target project01 --mode copy
skillshare target project01 --add-include "myskill-*"
skillshare sync
```

- The target name is yours to choose. It does not have to be an Agent's name.
- `copy` writes real files, so the project can commit them. Leave the default `merge` if symlinks are fine.
- `--add-include` limits the project to the skills it needs. See [Filtering skills](/docs/how-to/daily-tasks/filtering-skills).

The global config now holds:

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

Add more projects with more `target add` commands, or by copying the block.

### MCP servers: `mcp.projects`

MCP servers are written into each Agent's own config file, so they are listed by project folder instead of by path:

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
        context7:            # loaded everywhere else, off here
          disabled: true
          targets: [opencode]
```

```bash
skillshare sync mcp --dry-run   # preview every file
skillshare sync mcp
```

See [`mcp`: manage several projects](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config) for the fields and limits.

## Verification

- `skillshare sync` reports the project target, for example `project01: copied (1 new, ...)`
- `~/work/project01/.agents/skills/` contains only the skills matched by `include`
- `skillshare sync mcp --dry-run` lists one line per project file
- A second `skillshare sync mcp` reports every entry as `unchanged`

## Variations

- **Commit or ignore**: in `copy` mode Skillshare also writes `.skillshare-manifest.json` into the target folder to track what it copied. Commit it with the skills, or add it to `.gitignore`.
- **Path overlap warning**: if a project path is the same folder another target already uses, `sync` prints a path overlap warning. Run `skillshare doctor` to see which targets share it.
- **Same server in several projects**: define it once under one project with a YAML anchor (`docs: &docs`) and reuse it in the others (`docs: *docs`). See the [`mcp` reference](/docs/reference/commands/mcp#manage-several-projects-from-the-global-config).
- **Shared projects**: teammates who clone the project do not get your global config. When the setup must travel with the repo, use [project mode](/docs/how-to/recipes/skill-per-project-workflow).

## Related

- [`target` command reference](/docs/reference/commands/target)
- [`mcp` command reference](/docs/reference/commands/mcp)
- [Sharing MCP servers](/docs/how-to/daily-tasks/sharing-mcp)
