# Contributing to Bulk Renamer & Organizer

> Thanks for wanting to help out. Seriously — we appreciate it. 🙏

Whether you're fixing a typo, squashing a bug, or building a feature you've been dreaming about, every contribution matters. Here's how to get started without losing your mind.

---

## 🐛 Found a Bug?

1. Check the [existing issues](https://github.com/pablon/obsidian-bulk-renamer/issues) — someone might have already reported it
2. If not, [open a new issue](https://github.com/pablon/obsidian-bulk-renamer/issues/new) and include:
   - What you expected to happen
   - What actually happened
   - Steps to reproduce (bonus points for a minimal vault that triggers it)
   - Your Obsidian version and OS

---

## 💡 Have a Feature Idea?

We love 'em. Open an issue with the `enhancement` label and describe:
- What problem you're trying to solve
- How you'd expect the feature to work
- Any edge cases you've thought about

No idea is too small. Some of our best features started as "wouldn't it be cool if..."

---

## 🔧 Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20.x or 22.x
- [Obsidian](https://obsidian.md/) (for manual testing)

### Get the Code

```bash
git clone https://github.com/pablon/obsidian-bulk-renamer.git
cd obsidian-bulk-renamer
npm install
```

### Useful Commands

```bash
npm run dev          # Watch mode — rebuilds on every save
npm run build        # Production build (TypeScript check + esbuild)
npm test             # Run all 190 tests
npm run test:watch   # Watch mode for tests
npm run test:coverage # Coverage report (>=95% on src/core/)
npm run lint         # ESLint (includes Obsidian-specific rules)
```

### Testing in Obsidian

1. Run `npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` to your test vault:
   ```bash
   cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/bulk-renamer/
   ```
3. Reload Obsidian (`Cmd/Ctrl+R`) and enable the plugin

Or symlink the whole folder for a smoother dev experience:
```bash
ln -s "$(pwd)" /path/to/your/vault/.obsidian/plugins/bulk-renamer
```

---

## 📐 Architecture at a Glance

```
src/
  main.ts              # Plugin lifecycle ONLY — no business logic
  types.ts             # All shared types and DEFAULT_SETTINGS
  settings.ts          # PluginSettingTab + renderSettings() helper
  core/                # PURE functions — ZERO obsidian imports
  engine/              # Execution layer — uses Obsidian API
  ui/                  # Modal + tabs — uses Obsidian API
tests/
  core/                # TDD unit tests for pure functions
  engine/              # Tests for rename engine + rollback
  integration/         # End-to-end pipeline tests
```

### The Golden Rules

| Rule | Why |
| --- | --- |
| **`src/core/` never imports `obsidian`** | Pure functions are testable without mocks |
| **`src/main.ts` stays minimal** | Lifecycle + wiring only, no business logic |
| **NEVER use `vault.rename()`** | Always `fileManager.renameFile()` — it updates all links |
| **NEVER hardcode `.obsidian/`** | Use `app.vault.configDir` — users can change it |
| **No `as any` or `@ts-ignore`** | Strict TypeScript, no shortcuts |
| **No `innerHTML`** | Use `createEl()` — lint rule enforces this |
| **Collision detection blocks execution** | No bypass, ever |
| **Rollback saved BEFORE first rename** | Via `plugin.saveData()` |

---

## ✅ Testing

We take tests seriously. Here's the deal:

- **190 tests** and counting
- **TDD for `src/core/`** — write the test first, then the code
- **Coverage threshold**: 95% lines/functions/statements, 90% branches on `src/core/`
- **No deleting failing tests** — ever. Fix the code, not the test

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeFilename } from '../../src/core/normalize';

describe('normalizeFilename', () => {
  it('strips accents and lowercases', () => {
    expect(normalizeFilename('Café.md')).toBe('cafe.md');
  });
});
```

Use the mock `TFile` constructor for deterministic dates:
```typescript
const file = new TFile('daily/note.md', new Date('2025-01-15').getTime());
```

---

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). It's not optional — our release process depends on it.

```
type(scope): description

feat(core): add timestamp format configuration
fix(engine): handle case-only renames on macOS
docs(readme): update installation instructions
test(core): add edge cases for empty basenames
chore(deps): bump vitest to 4.1.2
```

| Type | Triggers |
| --- | --- |
| `feat:` | Minor version bump |
| `fix:` | Patch version bump |
| `BREAKING CHANGE:` | Major version bump |
| `chore:`, `docs:`, `test:` | No release |

All commits must be signed off (`git commit --signoff`).

---

## 🚀 Pull Requests

1. **Fork** the repo and create your branch from `master`
2. **Write tests** for any new functionality
3. **Run the full check**: `npm run lint && npm test && npm run build`
4. **Use conventional commits** — every commit matters
5. **Keep it focused** — one feature or fix per PR
6. **Update docs** if you change behavior

We'll review your PR and might ask for changes. That's normal — it's how we keep the codebase clean.

---

## 🔄 Release Process

Releases are fully automated via [semantic-release](https://semantic-release.gitbook.io/):

- Push to `master` → CI runs → semantic-release analyzes commits → creates release
- `CHANGELOG.md` is auto-generated
- GitHub release includes `main.js`, `manifest.json`, `styles.css`

You don't need to do anything. Just write good commit messages.

---

## 🤝 Code of Conduct

Be kind. Be helpful. Don't be a jerk. We're all here because we love Obsidian and want to make it better together.

---

## ❓ Still Have Questions?

Open an issue, start a discussion, or reach out. We're happy to help you get started.

Thanks for contributing! 🎉
