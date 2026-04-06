import { describe, it, expect, vi } from 'vitest';
import {
	buildRollbackMap,
	saveRollbackMap,
	loadRollbackMap,
	clearRollbackMap,
	executeUndo,
} from '../../src/engine/rollback';
import { App, TFile, Plugin } from '../__mocks__/obsidian';
import type { RenameEntry } from '../../src/types';

function makeEntry(oldPath: string, newPath: string, status: RenameEntry['status']): RenameEntry {
	return { oldPath, newPath, reason: 'test', status };
}

describe('buildRollbackMap', () => {
	it('maps newPath → oldPath for pending entries', () => {
		const entries = [
			makeEntry('daily/old.md', 'daily/new.md', 'pending'),
			makeEntry('notes/file.md', 'notes/normalized.md', 'pending'),
		];
		const map = buildRollbackMap(entries);
		expect(map['daily/new.md']).toBe('daily/old.md');
		expect(map['notes/normalized.md']).toBe('notes/file.md');
	});

	it('excludes non-pending entries (skipped, failed, collision)', () => {
		const entries = [
			makeEntry('daily/skip.md', 'daily/skip.md', 'skipped'),
			makeEntry('daily/fail.md', 'daily/fail.md', 'failed'),
			makeEntry('daily/col.md', 'daily/target.md', 'collision'),
		];
		const map = buildRollbackMap(entries);
		expect(Object.keys(map)).toHaveLength(0);
	});

	it('returns empty map for empty entries array', () => {
		const map = buildRollbackMap([]);
		expect(map).toEqual({});
	});
});

describe('saveRollbackMap + loadRollbackMap round-trip', () => {
	it('preserves rollback map data across save and load', async () => {
		const plugin = new Plugin();
		let stored: unknown = null;
		vi.spyOn(plugin, 'saveData').mockImplementation(async (data) => { stored = data; });
		vi.spyOn(plugin, 'loadData').mockImplementation(async () => stored);

		const map = { 'notes/new.md': 'notes/old.md', 'daily/2024-01-01.md': 'daily/My Note.md' };
		await saveRollbackMap(plugin, map);

		const loaded = await loadRollbackMap(plugin);
		expect(loaded).toEqual(map);
	});
});

describe('clearRollbackMap', () => {
	it('sets rollbackMap to null after clearing', async () => {
		const plugin = new Plugin();
		let stored: unknown = null;
		vi.spyOn(plugin, 'saveData').mockImplementation(async (data) => { stored = data; });
		vi.spyOn(plugin, 'loadData').mockImplementation(async () => stored);

		const map = { 'notes/new.md': 'notes/old.md' };
		await saveRollbackMap(plugin, map);
		await clearRollbackMap(plugin);

		const loaded = await loadRollbackMap(plugin);
		expect(loaded).toBeNull();
	});
});

describe('executeUndo', () => {
	it('renames files back to original paths', async () => {
		const app = new App();
		const renamedFile = new TFile('daily/new.md');
		app.vault.setFiles([renamedFile]);

		const spy = vi.spyOn(app.fileManager, 'renameFile').mockResolvedValue(undefined);

		const map = { 'daily/new.md': 'daily/old.md' };
		const onProgress = vi.fn();

		const results = await executeUndo(app, map, onProgress);

		expect(spy).toHaveBeenCalledWith(renamedFile, 'daily/old.md');
		expect(results[0]?.entry.status).toBe('renamed');
		expect(results[0]?.entry.newPath).toBe('daily/old.md');
	});

	it('skips files where target path is already occupied', async () => {
		const app = new App();
		const renamedFile = new TFile('daily/new.md');
		const occupantFile = new TFile('daily/old.md');
		app.vault.setFiles([renamedFile, occupantFile]);

		const spy = vi.spyOn(app.fileManager, 'renameFile');

		const map = { 'daily/new.md': 'daily/old.md' };
		const onProgress = vi.fn();

		const results = await executeUndo(app, map, onProgress);

		expect(spy).not.toHaveBeenCalled();
		expect(results[0]?.entry.status).toBe('skipped');
		expect(results[0]?.error).toContain('already occupied');
	});

	it('handles missing source file gracefully with failed status', async () => {
		const app = new App();
		app.vault.setFiles([]);

		const map = { 'daily/missing.md': 'daily/original.md' };
		const onProgress = vi.fn();

		const results = await executeUndo(app, map, onProgress);

		expect(results[0]?.entry.status).toBe('failed');
		expect(results[0]?.error).toContain('File not found');
	});

	it('calls onProgress for each entry', async () => {
		const app = new App();
		const file1 = new TFile('daily/a-new.md');
		const file2 = new TFile('daily/b-new.md');
		app.vault.setFiles([file1, file2]);

		vi.spyOn(app.fileManager, 'renameFile').mockResolvedValue(undefined);

		const map = { 'daily/a-new.md': 'daily/a-old.md', 'daily/b-new.md': 'daily/b-old.md' };
		const onProgress = vi.fn();

		await executeUndo(app, map, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(2);
	});

	it('handles rename errors and returns failed result', async () => {
		const app = new App();
		const file = new TFile('daily/new.md');
		app.vault.setFiles([file]);

		vi.spyOn(app.fileManager, 'renameFile').mockRejectedValue(new Error('Permission denied'));

		const map = { 'daily/new.md': 'daily/old.md' };
		const results = await executeUndo(app, map, vi.fn());

		expect(results[0]?.entry.status).toBe('failed');
		expect(results[0]?.error).toBe('Permission denied');
	});

	it('processes empty map and returns empty results', async () => {
		const app = new App();
		app.vault.setFiles([]);

		const results = await executeUndo(app, {}, vi.fn());
		expect(results).toHaveLength(0);
	});
});
