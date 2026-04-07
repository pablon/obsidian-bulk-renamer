# Bulk Renamer & Organizer

[![CI](https://github.com/pablon/obsidian-bulk-renamer/actions/workflows/lint.yml/badge.svg)](https://github.com/pablon/obsidian-bulk-renamer/actions/workflows/lint.yml) [![Release](https://github.com/pablon/obsidian-bulk-renamer/actions/workflows/release.yml/badge.svg)](https://github.com/pablon/obsidian-bulk-renamer/actions/workflows/release.yml) [![License: GNU GPLv3](https://img.shields.io/badge/License-GNU--GPLv3-blue.svg)](LICENSE)

> Tame your Obsidian vault. One modal. Zero broken links.

Smart, safe, and ridiculously powerful filename normalization for Obsidian. Preview every change before it happens, catch collisions before they bite you, and undo with one click — because we all make mistakes at 2 AM.

<!-- TODO: add screenshot -->

**[Install from Community Plugins](https://obsidian.md/plugins)** · [Manual Install](#manual-installation) · [Configuration](#configuration)

---

## ✨ What Makes This Different

Most rename tools go in blind. This one doesn't.

| Feature                     | What It Does                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 🛡️ **Preview everything**   | See every single change in a color-coded table before touching a file                                       |
| 💥 **Collision detection**  | Catches when two files would normalize to the same name — and blocks execution                              |
| ↩️ **One-click undo**       | Messed up? Undo the entire batch. Rollback persists across vault reloads                                    |
| 🔍 **Regex find & replace** | Advanced batch renaming with capture groups, live preview, and all the same safety nets                     |
| 📅 **Smart date prefixes**  | Automatically organizes files by date — trailing dates move to front, no-date files get their creation time |
| 🍎 **macOS case safety**    | Case-only renames go through a two-step dance so APFS doesn't eat your files                                |
| 🔗 **Link-safe**            | Uses `fileManager.renameFile()` — every wikilink, markdown link, and canvas reference stays intact          |
| ⏱️ **Rate limited**         | Built-in throttling prevents Obsidian's indexer from choking on bulk operations                             |

---

## 🎬 Before / After

| Before                                  | After                                   | What Happened                           |
| --------------------------------------- | --------------------------------------- | --------------------------------------- |
| `Angry Ötter & Friends.md`              | `2026-04-06-angry-otter-friends.md`     | Lowercase, accents stripped, date added |
| `Infinite Coffee Meeting_2025-10-27.md` | `2025-10-27-infinite-coffee-meeting.md` | Trailing date moved to prefix           |
| `TODO_World_Domination.md`              | `2026-04-06-todo-world-domination.md`   | Underscores → dashes, date added        |
| `my.super.secret.plan.md`               | `2026-04-06-my-super-secret-plan.md`    | Dots → dashes, date added               |
| `2025-08-14-Operation Pengüin.md`       | `2025-08-14-operation-penguin.md`       | Lowercase, accents removed              |

> Files with trailing dates use that date as prefix. Files without any date use their creation time.

---

## 🚀 Quick Start

1. Open the command palette (`Cmd/Ctrl+P`)
2. Search for **Bulk rename: Open preview**
3. Review the table — green means safe to rename
4. Hit **Execute** → confirm → watch it go
5. Need to undo? `Cmd/Ctrl+P` → **Bulk rename: Undo last rename**

That's it. Your vault is now organized.

---

## 📦 Installation

### Community Plugins (Recommended)

1. **Settings → Community plugins → Browse**
2. Search for **"Bulk Renamer & Organizer"**
3. **Install** → **Enable**

### Manual Installation

1. Grab `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/pablon/obsidian-bulk-renamer/releases)
2. Drop them into `<Vault>/.obsidian/plugins/obsidian-bulk-renamer/`
3. Reload Obsidian and enable in **Settings → Community plugins**

---

## 🔧 Configuration

Everything lives in **Settings → Community plugins → Bulk Renamer & Organizer**.

### Normalization Pipeline

Each step is independently toggleable. They always run in this order:

| Setting                 | Default | What It Does                 |
| ----------------------- | ------- | ---------------------------- |
| **Lowercase**           | ✅      | `README.md` → `readme.md`    |
| **Strip Accents**       | ✅      | `café.md` → `cafe.md`        |
| **Spaces to Dashes**    | ✅      | `my note.md` → `my-note.md`  |
| **Dots to Dashes**      | ✅      | `red.es.md` → `red-es.md`    |
| **Strip Special Chars** | ✅      | Keeps only `a-z`, `0-9`, `-` |
| **Collapse Dashes**     | ✅      | `a---b.md` → `a-b.md`        |

### Date Prefix

| Mode                              | Behavior                                        |
| --------------------------------- | ----------------------------------------------- |
| **Trailing or CTime** _(default)_ | Trailing date → prefix. No date → creation time |
| **Trailing Only**                 | Only adds prefix if a trailing date exists      |
| **None**                          | Never adds a date prefix                        |

### Timestamp Format

| Format                   | Example         | When to Use               |
| ------------------------ | --------------- | ------------------------- |
| `YYYY-MM-DD` _(default)_ | `2025-01-15`    | Clean, readable, ISO 8601 |
| `YYYYMMDD`               | `20250115`      | Compact sorting           |
| `YYMMDD`                 | `250115`        | Short and sweet           |
| `YYYYMMDD-HHMM`          | `20250115-1430` | Needs hour precision      |
| `YYMMDD-HHMMSS`          | `250115-143022` | Full timestamp            |

### Regex Find & Replace

The **Find and replace** tab gives you full regex power with live preview:

| Pattern                   | Replacement           | Effect                                    |
| ------------------------- | --------------------- | ----------------------------------------- |
| `^my-`                    | `our-`                | `my-note.md` → `our-note.md`              |
| `(\d{4})-(\d{2})-(\d{2})` | `$1$2$3`              | `2025-01-15-note.md` → `20250115-note.md` |
| `_`                       | `-` _(with `g` flag)_ | All underscores → dashes                  |

Supports capture groups (`$1`, `$2`), global (`g`), and case-insensitive (`i`) flags. Same safety features apply: collision detection, undo, rate limiting, confirmation dialog.

### Exclusions

| What              | Default                      | Why                           |
| ----------------- | ---------------------------- | ----------------------------- |
| **Directories**   | `.obsidian/`, `attachments/` | Config & binary files         |
| **File patterns** | `AGENTS.md`                  | AI context files              |
| **Templates dir** | `templates/`                 | Normalized but no date prefix |

All three are fully configurable.

### Advanced

| Setting              | Default | What It Does                   |
| -------------------- | ------- | ------------------------------ |
| **Rate Limit Delay** | `100ms` | Pause between batches          |
| **Rate Limit Batch** | `10`    | Files per batch before pausing |

Crank these up if your vault is huge. Leave them alone if it isn't.

---

## 🆚 How It Compares

Here's how Bulk Renamer & Organizer stacks up against other popular rename plugins in the Obsidian community:

| Feature                    | **Bulk Renamer & Organizer**  | **Bulk Rename** | **Vault File Renamer** | **Smart Rename** |
| -------------------------- | :---------------------------: | :-------------: | :--------------------: | :--------------: |
| **Preview before rename**  |     ✅ Table with reasons     |       ❌        |           ❌           |        ❌        |
| **Collision detection**    |      ✅ Blocks execution      |       ❌        |           ❌           |        ❌        |
| **Undo / Rollback**        |   ✅ One-click, persistent    |       ❌        |           ❌           |        ❌        |
| **Regex find & replace**   |     ✅ With live preview      |  ✅ Text-based  |           ❌           |        ❌        |
| **Smart date handling**    |      ✅ Trailing + ctime      |       ❌        |           ❌           |        ❌        |
| **Configurable pipeline**  | ✅ 6 toggles + 5 date formats |       ❌        |           ❌           |        ❌        |
| **macOS case safety**      |      ✅ Two-step rename       |       ❌        |           ❌           |        ❌        |
| **Rate limiting**          |        ✅ Configurable        |       ❌        |           ❌           |        ❌        |
| **Template dir awareness** |       ✅ No date prefix       |       ❌        |           ❌           |        ❌        |
| **Zero external deps**     |      ✅ Pure TypeScript       | ❌ Uses xregexp |           ✅           |        ✅        |

> Each plugin serves a different purpose. Smart Rename excels at single-note renames with link preservation. Vault File Renamer focuses on GitHub-style standardization. Bulk Rename offers regex-based renaming. This plugin combines all of those approaches with safety features on top.

---

## 🛡️ Safety Features

- **Dry-run preview** — every change shown before execution
- **Collision detection** — blocks if files would normalize to the same name
- **Rollback/undo** — one-click restore, persists across reloads
- **Rate limiting** — prevents Obsidian's indexer from choking
- **macOS case safety** — two-step rename via `.bulk-rename-tmp`
- **Confirmation dialog** — explicit approval before any file is touched
- **Error resilience** — one failure doesn't stop the whole batch

---

## 📋 What Gets Renamed

| Included                               | Excluded                 |
| -------------------------------------- | ------------------------ |
| All `.md` files in subdirectories      | Root-level files         |
| Files in `templates/` (no date prefix) | `.obsidian/` directory   |
|                                        | `attachments/` directory |
|                                        | `AGENTS.md` anywhere     |
|                                        | Non-`.md` files          |

---

## ⚠️ Known Limitations

- **Directory names** are not renamed — only filenames
- **Canvas display labels** may need a vault reload to update (Obsidian limitation), but underlying links are always correct

---

## 🤝 Contributing

We'd love your help! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, architecture overview, testing guidelines, and how to submit a PR.

Quick start for devs:

```bash
npm install
npm run dev          # watch mode
npm run build        # production build
npm test             # 190 tests
npm run lint         # eslint (obsidianmd rules)
```

---

## 📄 License

[GNU GPLv3](LICENSE)

---

## 🙏 Credits

Built from the ground up, inspired by the need for a safer, more predictable bulk rename experience in Obsidian.
