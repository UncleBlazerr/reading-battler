# CLAUDE.md

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Character art

A *foundation* (not a template) for heroes/enemies in the shared "sticker pixel-art" style — cohesive look + engine wiring, but every character stays distinct. Variety is mandatory (no re-skins); covers the ladder progression and the bigger/cooler boss every 10th level. Sprites are authored procedurally in `tools/gen-sprites.py` — original CC0 art, never traced. See the `character-art` skill (`.claude/skills/character-art/SKILL.md`).
