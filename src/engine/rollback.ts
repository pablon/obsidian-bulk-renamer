// ─────────────────────────────────────────────────────────────────────────────
// Rollback: Build, persist, and execute undo of rename operations
// ─────────────────────────────────────────────────────────────────────────────
import type { App, Plugin } from 'obsidian';
import type { RenameEntry, RenameResult, RollbackMap, PluginData } from '../types';

/** Build a rollback map from rename entries (newPath → oldPath) */
export function buildRollbackMap(entries: RenameEntry[]): RollbackMap {
	const map: RollbackMap = {};
	for (const entry of entries) {
		if (entry.status === 'pending') {
			map[entry.newPath] = entry.oldPath;
		}
	}
	return map;
}

/** Save rollback map to plugin data (persists across reloads) */
export async function saveRollbackMap(plugin: Plugin, map: RollbackMap): Promise<void> {
	const data = ((await plugin.loadData()) as PluginData | null) ?? ({} as PluginData);
	await plugin.saveData({ ...data, rollbackMap: map });
}

/** Load rollback map from plugin data */
export async function loadRollbackMap(plugin: Plugin): Promise<RollbackMap | null> {
	const data = (await plugin.loadData()) as PluginData | null;
	return data?.rollbackMap ?? null;
}

/** Clear rollback map from plugin data */
export async function clearRollbackMap(plugin: Plugin): Promise<void> {
	const data = ((await plugin.loadData()) as PluginData | null) ?? ({} as PluginData);
	await plugin.saveData({ ...data, rollbackMap: null });
}

/** Execute undo: rename files back to their original paths */
export async function executeUndo(
	app: App,
	map: RollbackMap,
	onProgress: (current: number, total: number, filePath: string) => void,
): Promise<RenameResult[]> {
	const entries = Object.entries(map);
	const results: RenameResult[] = [];

	for (let i = 0; i < entries.length; i++) {
		const pair = entries[i];
		if (!pair) continue;
		const [newPath, oldPath] = pair;

		onProgress(i + 1, entries.length, newPath);

		// Check if target (oldPath) is already occupied by another file
		const targetFile = app.vault.getAbstractFileByPath(oldPath);
		if (targetFile) {
			results.push({
				entry: {
					oldPath: newPath,
					newPath: oldPath,
					reason: 'undo',
					status: 'skipped',
				},
				error: `Target path already occupied: ${oldPath}`,
			});
			continue;
		}

		const file = app.vault.getAbstractFileByPath(newPath);
		if (!file) {
			results.push({
				entry: {
					oldPath: newPath,
					newPath: oldPath,
					reason: 'undo',
					status: 'failed',
				},
				error: `File not found: ${newPath}`,
			});
			continue;
		}

		try {
			await app.fileManager.renameFile(file, oldPath);
			results.push({
				entry: {
					oldPath: newPath,
					newPath: oldPath,
					reason: 'undo',
					status: 'renamed',
				},
			});
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			results.push({
				entry: {
					oldPath: newPath,
					newPath: oldPath,
					reason: 'undo',
					status: 'failed',
				},
				error,
			});
		}
	}

	return results;
}
