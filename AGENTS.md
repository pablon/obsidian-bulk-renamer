# Bulk Renamer & Organizer | Obsidian Plugin | TypeScript + esbuild

## Commands

```bash
npm install          # Install deps
npm run dev          # Watch mode (esbuild)
npm run build        # tsc -noEmit -skipLibCheck && esbuild production → main.js
npm run lint         # eslint . (includes obsidianmd plugin rules)
npm test             # vitest run (190 tests)
npm run test:watch   # vitest watch
npm run test:coverage # vitest --coverage (>=95% on src/core/)
```

## Architecture

```
src/
  main.ts              # Plugin lifecycle ONLY (94 lines) — onload, commands, wiring
  types.ts             # ALL shared types, interfaces, DEFAULT_SETTINGS
  settings.ts          # PluginSettingTab + renderSettings() reusable helper
  core/                # PURE functions — ZERO obsidian imports
    normalize.ts       # Normalization pipeline (configurable, fixed order)
    dates.ts           # extractTrailingDate, extractDatePrefix, formatTimestamp
    filters.ts         # shouldSkipFile, isInTemplatesDir
    path-builder.ts    # buildNormalizedPath, buildRenameMap, computeReason
    collisions.ts      # detectCollisions
    regex-replace.ts   # applyRegexReplace, buildRegexRenameMap, parseRegexPattern
  engine/              # Execution layer — uses obsidian API
    rename-engine.ts   # RenameEngine: preview(), execute(), executeWithRateLimit()
    rollback.ts        # buildRollbackMap, saveRollbackMap, loadRollbackMap, executeUndo
  ui/                  # Modal + tabs — uses obsidian API
    bulk-rename-modal.ts  # BulkRenameModal: 4 tabs (Preview, Execute, Find-replace, Settings)
    tabs.ts            # createTabBar, createTabContent helpers
    preview-tab.ts     # Rename preview table with stats, pagination (200 limit)
    execute-tab.ts     # Confirmation dialog → progress bar → results
    regex-tab.ts       # Regex find-replace with live preview
    confirm-dialog.ts  # ConfirmDialog: returns Promise<boolean>
tests/
  __mocks__/obsidian.ts  # Full obsidian API mock (TFile, App, Vault, Modal, Setting, etc.)
  core/                  # Unit tests for src/core/ (TDD, pure functions)
  engine/                # Unit tests for rename engine + rollback
  integration/           # End-to-end pipeline tests
```

## Critical Rules

- **`src/core/` must NEVER import from `obsidian`** — pure functions only, testable without mocks
- **`src/main.ts` must stay minimal** — lifecycle + command registration + wiring; no business logic
- **NEVER use `vault.rename()`** — always `fileManager.renameFile()` (updates all links)
- **NEVER hardcode `.obsidian/`** — use `app.vault.configDir` (lint rule: `obsidianmd/hardcoded-config-path`)
- **Command names must NOT include plugin name** — lint rule: `obsidianmd/no-plugin-name-in-command-name`
- **All UI text in sentence case** — lint rule: `obsidianmd/ui/sentence-case`
- **No `innerHTML`** — lint rule: `@microsoft/sdl/no-inner-html`; use `createEl()` DOM methods
- **No `as any` or `@ts-ignore`** — strict TypeScript
- **Collision detection BLOCKS execution** — no bypass allowed
- **Rollback map saved BEFORE first rename** — via `plugin.saveData()`
- **Two-step rename for case-only changes** — macOS APFS safety via `.bulk-rename-tmp`
- **Rate limiting is mandatory** — `sleep(rateLimitMs)` every `rateLimitBatch` renames

## Plugin Identity (NEVER change after release)

- Plugin ID: `obsidian-bulk-rename` (manifest.json `id`)
- Command IDs: `open-bulk-rename`, `undo-bulk-rename`
- CSS class prefix: `bulk-rename-*`
- `isDesktopOnly: true`, `minAppVersion: "1.4.0"`

## Testing

- vitest with `obsidian` mocked via `resolve.alias` in `vitest.config.ts`
- `tests/` is outside `tsconfig.json` `include` — esbuild ignores it
- `tests/` and `vitest.config.ts` are in eslint `globalIgnores`
- Coverage threshold: 95% lines/functions/statements, 90% branches on `src/core/`
- Mock `TFile` constructor: `new TFile(path, ctime?)` for deterministic date tests

## Persisted Data Shape

```typescript
interface PluginData {
  settings: BulkRenameSettings;   // user config
  rollbackMap: RollbackMap | null; // newPath→oldPath for undo
}
```

Accessed via `plugin.loadData()` / `plugin.saveData()`. Settings nested under `.settings` key.

## Normalization Pipeline (fixed order, each step toggleable)

1. Strip trailing date (YYYY-MM-DD) → 2. Lowercase → 3. NFD + strip diacritics → 4. Spaces/underscores→dashes → 5. Dots→dashes → 6. Strip non-[a-z0-9-] → 7. Collapse dashes → 8. Strip edge dashes → **Guard**: empty result returns original → 9. Prepend date prefix → 10. Append `.md`

## Releases

- Fully automated via [semantic-release](https://semantic-release.gitbook.io/).
- Every push to `master` with conventional commits triggers automatic release.
- `feat:` → minor bump | `fix:` → patch bump | `BREAKING CHANGE:` → major bump.
- `chore:`, `docs:`, `test:` → no release.
- Workflow: `.github/workflows/release.yml` — bumps versions, creates GitHub release, updates CHANGELOG.

## CI/CD

```bash
# Automated release (triggered by push to master with conventional commits)
# feat: → minor bump | fix: → patch bump | BREAKING CHANGE: → major bump
# chore:/docs:/test: → no release

# Manual dry-run (verify semantic-release config without creating a release)
GITHUB_TOKEN=fake npx semantic-release --dry-run --no-ci

# Renovate runs every Monday 8am UTC (self-hosted, requires RENOVATE_TOKEN secret)
# Only creates PRs for critical/security npm updates
```

**Release flow**: push to `master` → lint → test → build → semantic-release → CHANGELOG.md + version bump + GitHub release
**Renovate**: `.github/workflows/renovate.yml` + `renovate.json` — npm-only, security-only, no automerge

## CSS

- `styles.css` uses ONLY Obsidian CSS variables (`var(--background-primary)`, etc.) — never hardcoded colors
- All classes prefixed `bulk-rename-` — see `styles.css` for full reference

## Agent Do/Don't

**Do**: Use `createEl()` for DOM, `--signoff` on commits, keep files under 200 lines, run `npm run lint && npm test && npm run build` before committing.

**Don't**: Import `obsidian` in `src/core/`, use `innerHTML`, add network calls, commit `main.js`/`node_modules`/`coverage/`, delete failing tests.
