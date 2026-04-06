# Bulk Renamer & Organizer

Smart filename normalization for Obsidian. Automatically normalize your vault's filenames with powerful preview, collision detection, and one-click undo.

<!-- TODO: add screenshot -->

## What it does

- **Normalizes filenames**: Removes special characters, replaces spaces/dots with dashes, and converts to lowercase.
- **Smart Date Prefixing**: Automatically prepends `YYYY-MM-DD` dates based on trailing dates or file creation time.
- **Updates Internal Links**: Automatically updates wikilinks, markdown links, and canvas references across your entire vault.
- **Safe Execution**: Provides a comprehensive preview before renaming, detects collisions, and supports undoing the last bulk rename.
- **Two-Step Renames**: Safely handles case-only changes (e.g., `FILE.md` → `file.md`) on macOS to prevent data loss.

## Before / After

| Before | After | Reason |
| --- | --- | --- |
| `Angry Ötter & Friends.md` | `2026-04-06-angry-otter-friends.md` | Lowercase, special chars, ctime prefix added |
| `Infinite Coffee Meeting_2025-10-27.md` | `2025-10-27-infinite-coffee-meeting.md` | Trailing date moved to prefix |
| `TODO_World_Domination.md` | `2026-04-06-todo-world-domination.md` | Underscores to dashes, ctime prefix added |
| `my.super.secret.plan.md` | `2026-04-06-my-super-secret-plan.md` | Dots to dashes, ctime prefix added |
| `  ---RANDOM NOTES---.md` | `2026-04-06-random-notes.md` | Collapsed dashes, ctime prefix added |
| `2025-08-14-Operation Pengüin.md` | `2025-08-14-operation-penguin.md` | Lowercase, accents removed |

> Dates shown are examples. Files with trailing dates use that date as prefix. Files without any date use their creation time (`ctime`).

## Installation

### Community Plugins (Recommended)
1. Open Obsidian **Settings → Community plugins**.
2. Click **Browse** and search for "Bulk Renamer & Organizer".
3. Click **Install**, then **Enable**.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/pablon/obsidian-bulk-rename/releases).
2. Create a folder named `obsidian-bulk-rename` in your vault's plugin directory: `<VaultFolder>/.obsidian/plugins/obsidian-bulk-rename/`.
3. Copy the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Usage

1. **Open Preview**: Open the command palette (`Cmd/Ctrl+P`) and search for **Bulk rename: Open bulk rename preview**.
2. **Review Changes**: Review the **Preview** tab. It shows a table of all files to be renamed, their new paths, and the reasons for the change.
3. **Execute**: Switch to the **Execute** tab.
4. **Rename**: Click **Rename N files** and confirm the dialog.
5. **Progress**: Watch the progress bar as the plugin renames files and updates links.
6. **Undo**: If you made a mistake, open the command palette and run **Bulk rename: Undo last bulk rename**.

## Find and replace (Regex)

The **Find and replace** tab lets you rename files using regular expressions — for advanced batch renaming beyond the normalization pipeline.

1. Open the **Find and replace** tab in the bulk rename modal.
2. Enter a **regex pattern** (e.g. `^(\d{4})-(\d{2})-(\d{2})`).
3. Enter a **replacement** string (supports `$1`, `$2` capture group references).
4. Toggle **flags**: Global (`g`) replaces all matches; Case insensitive (`i`) ignores case.
5. Click **Preview changes** to see which files match and what they'll be renamed to.
6. Click **Rename N files** to execute (with confirmation dialog and progress bar).

### Examples

| Pattern | Replacement | Effect |
| --- | --- | --- |
| `^my-` | `our-` | Rename `my-note.md` → `our-note.md` |
| `(\d{4})-(\d{2})-(\d{2})` | `$1$2$3` | Convert `2025-01-15-note.md` → `20250115-note.md` |
| `_` | `-` | Replace all underscores with dashes (with `g` flag) |

> The same safety features apply: collision detection, rollback/undo, rate limiting, and confirmation dialog.

## Configuration

Available in **Settings → Community plugins → Bulk Renamer & Organizer**.

### Normalization Pipeline
| Setting | Default | Description |
| --- | --- | --- |
| **Lowercase** | `true` | Convert all characters to lowercase. |
| **Strip Accents** | `true` | Remove diacritical marks (e.g., `é` → `e`). |
| **Spaces to Dashes** | `true` | Replace spaces and underscores with dashes (`-`). |
| **Dots to Dashes** | `true` | Replace dots with dashes (`-`). |
| **Strip Special Chars** | `true` | Remove all characters except `a-z`, `0-9`, and `-`. |
| **Collapse Dashes** | `true` | Merge multiple consecutive dashes into one. |

### Date Prefix Mode
- **Trailing or CTime (Default)**: Use the date from the end of the filename if present; otherwise, use the file's creation time.
- **Trailing Only**: Only add a prefix if a date is found at the end of the filename.
- **None**: Never add a date prefix.

### Timestamp Format
| Format | Example | Description |
| --- | --- | --- |
| `YYYY-MM-DD` (default) | `2025-01-15` | ISO 8601 date |
| `YYYYMMDD` | `20250115` | Compact date |
| `YYMMDD` | `250115` | Short date |
| `YYYYMMDD-HHMM` | `20250115-1430` | Date with hours and minutes |
| `YYMMDD-HHMMSS` | `250115-143022` | Short date with full time |

> Time components (`HHMM`, `HHMMSS`) use the file's creation time. For files with trailing dates (e.g. `report-2025-01-15.md`), the time defaults to midnight (`0000`).

### Exclusions
- **Excluded Directories**: List of folders to ignore. Defaults to `.obsidian/` and `attachments/`.
- **Excluded File Patterns**: Filenames or patterns to ignore. Defaults to `AGENTS.md`.
- **Templates Directory**: Files in this directory are normalized but **never** receive a date prefix. Defaults to `templates/`.

### Advanced
- **Rate Limit Delay**: Milliseconds to pause between batches. Default: `100ms`.
- **Rate Limit Batch Size**: Number of files to rename before pausing. Default: `10`.

## Normalization Pipeline

The plugin processes filenames in this exact order:
1. Strip trailing date (`YYYY-MM-DD` at the end of the name).
2. Convert to lowercase (if enabled).
3. Normalize Unicode/Strip accents (if enabled).
4. Replace spaces and underscores with dashes (if enabled).
5. Replace dots with dashes (if enabled).
6. Remove non-alphanumeric characters except dashes (if enabled).
7. Collapse consecutive dashes (if enabled).
8. Strip leading and trailing dashes.
9. Prepend date prefix (based on settings).
10. Re-append the `.md` extension.

## Date Prefix Logic

Priority system for determining the date prefix:

| Scenario | Date Source | Result |
| --- | --- | --- |
| Already has `YYYY-MM-DD` prefix | Existing prefix | Kept as-is |
| Has `YYYY-MM-DD` at the **end** | Trailing date | Moved to front |
| No date found anywhere | Creation time (`ctime`) | Added to front |
| File is in **Templates Directory** | None | No date prefix added |

## Safety Features

- **Dry-run Preview**: See every change before it happens.
- **Collision Detection**: Aborts if multiple files would normalize to the same name.
- **Rollback/Undo**: One-click restoration of the previous state.
- **Rate Limiting**: Throttles renames to prevent Obsidian indexing conflicts.
- **macOS Case Safety**: Uses intermediate temporary files for case-only renames.
- **Confirmation Dialog**: Requires explicit user confirmation before execution.

## Scope

### Included
- All `.md` files in subdirectories.

### Excluded
| What | Why |
| --- | --- |
| Root-level files | Meta/config files (e.g., `README.md`) |
| `.obsidian/` | Internal configuration |
| `attachments/` | Binary assets |
| `AGENTS.md` | Functional AI context files |
| Non-`.md` files | Images, PDFs, etc. |

## Known Limitations

- **Directories**: Only filenames are renamed; directory names remain unchanged.
- **Canvas Labels**: Canvas display labels may require a vault reload to update (Obsidian limitation), though the underlying links are updated correctly.

## License

MIT

## Credits

Based on the `obsidian-bulk-rename.js` console script.

## Releases

Releases are fully automated via [semantic-release](https://semantic-release.gitbook.io/):

- Every push to `master` with [conventional commits](https://www.conventionalcommits.org/) triggers an automatic release
- `feat:` commits → minor version bump (`1.0.0` → `1.1.0`)
- `fix:` commits → patch version bump (`1.0.0` → `1.0.1`)
- `BREAKING CHANGE:` → major version bump (`1.0.0` → `2.0.0`)
- `chore:`, `docs:`, `test:` → no release

Each release automatically:
1. Bumps version in `package.json`, `manifest.json`, and `versions.json`
2. Updates `CHANGELOG.md`
3. Creates a GitHub release with `main.js`, `manifest.json`, and `styles.css` as assets
4. Commits all version files back to `master` with `[skip ci]`
