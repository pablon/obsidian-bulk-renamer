// ─────────────────────────────────────────────────────────────────────────────
// RenameEngine: Core execution layer for bulk rename operations
// Uses fileManager.renameFile() to update all links (wikilinks, markdown, canvas)
// ─────────────────────────────────────────────────────────────────────────────
import type { App } from 'obsidian';
import type { BulkRenameSettings, RenameEntry, RenameResult, CollisionGroup, PreviewStats } from '../types';
import { buildRenameMap } from '../core/path-builder';
import { detectCollisions } from '../core/collisions';

/** Sleep helper for rate limiting */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/** Detect if a rename is case-only (same path, different case) */
export function isCaseOnlyRename(oldPath: string, newPath: string): boolean {
	return oldPath.toLowerCase() === newPath.toLowerCase() && oldPath !== newPath;
}

export class RenameEngine {
	/**
	 * Preview all renames without executing them.
	 * Returns entries (pending renames + skipped), stats, and any collisions.
	 */
	preview(
		app: App,
		settings: BulkRenameSettings,
	): { entries: RenameEntry[]; stats: PreviewStats; collisions: CollisionGroup[] } {
		const files = app.vault.getMarkdownFiles().map(f => ({
			path: f.path,
			basename: f.basename,
			ctime: f.stat.ctime,
		}));

		const { entries, stats } = buildRenameMap(files, settings);

		// Only check collisions among pending renames
		const pendingEntries = entries.filter(e => e.status === 'pending');
		const collisions = detectCollisions(pendingEntries);

		stats.collisions = collisions.length;

		// Mark colliding entries
		if (collisions.length > 0) {
			const collidingPaths = new Set(collisions.flatMap(c => c.sources));
			for (const entry of entries) {
				if (collidingPaths.has(entry.oldPath)) {
					entry.status = 'collision';
				}
			}
		}

		return { entries, stats, collisions };
	}

	/**
	 * Execute renames sequentially with error resilience.
	 * MUST be called only after collision check passes.
	 * Uses fileManager.renameFile() to update ALL links (wikilinks, markdown, canvas).
	 */
	async execute(
		app: App,
		entries: RenameEntry[],
		onProgress: (current: number, total: number, filePath: string) => void,
	): Promise<RenameResult[]> {
		const pendingEntries = entries.filter(e => e.status === 'pending');
		const results: RenameResult[] = [];

		for (let i = 0; i < pendingEntries.length; i++) {
			const entry = pendingEntries[i];
			if (!entry) continue;

			onProgress(i + 1, pendingEntries.length, entry.oldPath);

			const file = app.vault.getAbstractFileByPath(entry.oldPath);
			if (!file) {
				results.push({
					entry: { ...entry, status: 'failed' },
					error: `File not found: ${entry.oldPath}`,
				});
				continue;
			}

			try {
				if (isCaseOnlyRename(entry.oldPath, entry.newPath)) {
					// Two-step rename for case-insensitive filesystems (macOS APFS)
					// Use .bulk-rename-tmp suffix (more unique than .tmp)
					const tmpPath = entry.oldPath + '.bulk-rename-tmp';
					await app.fileManager.renameFile(file, tmpPath);
					const tmpFile = app.vault.getAbstractFileByPath(tmpPath);
					if (!tmpFile) throw new Error(`Temp file not found: ${tmpPath}`);
					await app.fileManager.renameFile(tmpFile, entry.newPath);
				} else {
					await app.fileManager.renameFile(file, entry.newPath);
				}
				results.push({ entry: { ...entry, status: 'renamed' } });
			} catch (err) {
				const error = err instanceof Error ? err.message : String(err);
				results.push({ entry: { ...entry, status: 'failed' }, error });
			}
		}

		return results;
	}

	/**
	 * Execute renames with built-in rate limiting.
	 * Pauses every rateLimitBatch renames for rateLimitMs milliseconds
	 * to avoid Obsidian link-update duplication bugs.
	 */
	async executeWithRateLimit(
		app: App,
		entries: RenameEntry[],
		settings: BulkRenameSettings,
		onProgress: (current: number, total: number, filePath: string) => void,
	): Promise<RenameResult[]> {
		const pendingEntries = entries.filter(e => e.status === 'pending');
		const results: RenameResult[] = [];

		for (let i = 0; i < pendingEntries.length; i++) {
			const entry = pendingEntries[i];
			if (!entry) continue;

			// Rate limiting: pause every N renames to avoid Obsidian duplication bugs
			if (i > 0 && i % settings.rateLimitBatch === 0) {
				await sleep(settings.rateLimitMs);
			}

			onProgress(i + 1, pendingEntries.length, entry.oldPath);

			const file = app.vault.getAbstractFileByPath(entry.oldPath);
			if (!file) {
				results.push({
					entry: { ...entry, status: 'failed' },
					error: `File not found: ${entry.oldPath}`,
				});
				continue;
			}

			try {
				if (isCaseOnlyRename(entry.oldPath, entry.newPath)) {
					const tmpPath = entry.oldPath + '.bulk-rename-tmp';
					await app.fileManager.renameFile(file, tmpPath);
					const tmpFile = app.vault.getAbstractFileByPath(tmpPath);
					if (!tmpFile) throw new Error(`Temp file not found: ${tmpPath}`);
					await app.fileManager.renameFile(tmpFile, entry.newPath);
				} else {
					await app.fileManager.renameFile(file, entry.newPath);
				}
				results.push({ entry: { ...entry, status: 'renamed' } });
			} catch (err) {
				const error = err instanceof Error ? err.message : String(err);
				results.push({ entry: { ...entry, status: 'failed' }, error });
			}
		}

		return results;
	}
}
