import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RenameEngine, isCaseOnlyRename } from '../../src/engine/rename-engine';
import { App, TFile, Vault, FileManager } from '../__mocks__/obsidian';
import type { RenameEntry } from '../../src/types';
import { DEFAULT_SETTINGS } from '../../src/types';

function makePendingEntry(oldPath: string, newPath: string): RenameEntry {
	return { oldPath, newPath, reason: 'test', status: 'pending' };
}

describe('isCaseOnlyRename', () => {
	it('returns true for case-only difference', () => {
		expect(isCaseOnlyRename('notes/FILE.md', 'notes/file.md')).toBe(true);
	});

	it('returns false for completely different paths', () => {
		expect(isCaseOnlyRename('notes/file.md', 'notes/other.md')).toBe(false);
	});

	it('returns false for identical paths', () => {
		expect(isCaseOnlyRename('notes/file.md', 'notes/file.md')).toBe(false);
	});

	it('returns true for mixed-case in directory + filename', () => {
		expect(isCaseOnlyRename('Notes/MyNote.md', 'notes/mynote.md')).toBe(true);
	});
});

describe('RenameEngine.preview', () => {
	it('returns correct entries and stats for a vault with unnormalized files', () => {
		const engine = new RenameEngine();
		const app = new App();
		const file = new TFile('daily/My Note.md', 1700000000000);
		app.vault.setFiles([file]);

		const settings = {
			...DEFAULT_SETTINGS,
			datePrefix: 'none' as const,
		};
		const { entries, stats } = engine.preview(app, settings);

		expect(stats.toRename).toBeGreaterThanOrEqual(1);
		const pending = entries.filter(e => e.status === 'pending');
		expect(pending.length).toBeGreaterThanOrEqual(1);
	});

	it('detects collisions and marks entries as collision status', () => {
		const engine = new RenameEngine();
		const app = new App();

		const file1 = new TFile('daily/My Note.md', 1700000000000);
		const file2 = new TFile('daily/my note.md', 1700000000000);
		app.vault.setFiles([file1, file2]);

		const settings = {
			...DEFAULT_SETTINGS,
			datePrefix: 'none' as const,
		};
		const { collisions, entries } = engine.preview(app, settings);

		expect(collisions.length).toBeGreaterThanOrEqual(1);
		const collisionEntries = entries.filter(e => e.status === 'collision');
		expect(collisionEntries.length).toBeGreaterThanOrEqual(2);
	});

	it('returns zero collisions when no files collide', () => {
		const engine = new RenameEngine();
		const app = new App();
		const file = new TFile('daily/unique-file.md', 1700000000000);
		app.vault.setFiles([file]);

		const settings = { ...DEFAULT_SETTINGS, datePrefix: 'none' as const };
		const { collisions } = engine.preview(app, settings);
		expect(collisions).toHaveLength(0);
	});
});

describe('RenameEngine.execute', () => {
	let engine: RenameEngine;
	let app: App;

	beforeEach(() => {
		engine = new RenameEngine();
		app = new App();
	});

	it('calls fileManager.renameFile for each pending entry', async () => {
		const file = new TFile('daily/old.md');
		app.vault.setFiles([file]);

		const spy = vi.spyOn(app.fileManager, 'renameFile');
		const entries = [makePendingEntry('daily/old.md', 'daily/new.md')];
		const onProgress = vi.fn();

		await engine.execute(app, entries, onProgress);

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(file, 'daily/new.md');
	});

	it('skips files not found in vault and returns failed result', async () => {
		app.vault.setFiles([]);

		const entries = [makePendingEntry('missing/file.md', 'missing/renamed.md')];
		const onProgress = vi.fn();

		const results = await engine.execute(app, entries, onProgress);

		expect(results).toHaveLength(1);
		expect(results[0]?.entry.status).toBe('failed');
		expect(results[0]?.error).toContain('File not found');
	});

	it('continues after individual file failure (error resilience)', async () => {
		const file1 = new TFile('daily/file1.md');
		const file2 = new TFile('daily/file2.md');
		app.vault.setFiles([file1, file2]);

		let callCount = 0;
		vi.spyOn(app.fileManager, 'renameFile').mockImplementation(async () => {
			callCount++;
			if (callCount === 1) throw new Error('Rename failed');
		});

		const entries = [
			makePendingEntry('daily/file1.md', 'daily/renamed1.md'),
			makePendingEntry('daily/file2.md', 'daily/renamed2.md'),
		];
		const onProgress = vi.fn();

		const results = await engine.execute(app, entries, onProgress);

		expect(results).toHaveLength(2);
		expect(results[0]?.entry.status).toBe('failed');
		expect(results[1]?.entry.status).toBe('renamed');
	});

	it('handles case-only rename with two-step via .bulk-rename-tmp', async () => {
		const originalFile = new TFile('daily/FILE.md');
		const tmpFile = new TFile('daily/FILE.md.bulk-rename-tmp');
		app.vault.setFiles([originalFile]);

		const renameFileSpy = vi.spyOn(app.fileManager, 'renameFile').mockImplementation(
			async (_file, newPath) => {
				if (newPath === 'daily/FILE.md.bulk-rename-tmp') {
					app.vault.setFiles([tmpFile]);
				} else {
					app.vault.setFiles([new TFile(newPath)]);
				}
			},
		);

		const entries = [makePendingEntry('daily/FILE.md', 'daily/file.md')];
		const onProgress = vi.fn();

		const results = await engine.execute(app, entries, onProgress);

		expect(renameFileSpy).toHaveBeenCalledTimes(2);
		expect(renameFileSpy).toHaveBeenNthCalledWith(1, originalFile, 'daily/FILE.md.bulk-rename-tmp');
		expect(renameFileSpy).toHaveBeenNthCalledWith(2, tmpFile, 'daily/file.md');
		expect(results[0]?.entry.status).toBe('renamed');
	});

	it('calls onProgress for each file', async () => {
		const file1 = new TFile('daily/a.md');
		const file2 = new TFile('daily/b.md');
		app.vault.setFiles([file1, file2]);

		vi.spyOn(app.fileManager, 'renameFile').mockResolvedValue(undefined);

		const entries = [
			makePendingEntry('daily/a.md', 'daily/a-new.md'),
			makePendingEntry('daily/b.md', 'daily/b-new.md'),
		];
		const onProgress = vi.fn();

		await engine.execute(app, entries, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2, 'daily/a.md');
		expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2, 'daily/b.md');
	});

	it('ignores non-pending entries (skipped, failed, collision)', async () => {
		const file = new TFile('daily/file.md');
		app.vault.setFiles([file]);

		const spy = vi.spyOn(app.fileManager, 'renameFile');

		const entries: RenameEntry[] = [
			{ oldPath: 'daily/file.md', newPath: 'daily/file.md', reason: 'excluded', status: 'skipped' },
			{ oldPath: 'daily/col.md', newPath: 'daily/target.md', reason: 'collision', status: 'collision' },
		];
		const onProgress = vi.fn();

		const results = await engine.execute(app, entries, onProgress);

		expect(spy).not.toHaveBeenCalled();
		expect(results).toHaveLength(0);
		expect(onProgress).not.toHaveBeenCalled();
	});

	it('returns renamed status on success', async () => {
		const file = new TFile('daily/old.md');
		app.vault.setFiles([file]);

		vi.spyOn(app.fileManager, 'renameFile').mockResolvedValue(undefined);

		const entries = [makePendingEntry('daily/old.md', 'daily/new.md')];
		const results = await engine.execute(app, entries, vi.fn());

		expect(results[0]?.entry.status).toBe('renamed');
		expect(results[0]?.error).toBeUndefined();
	});
});

describe('RenameEngine.executeWithRateLimit', () => {
	it('calls renameFile for each pending entry with rate limiting settings', async () => {
		const engine = new RenameEngine();
		const app = new App();
		const file1 = new TFile('daily/a.md');
		const file2 = new TFile('daily/b.md');
		app.vault.setFiles([file1, file2]);

		const spy = vi.spyOn(app.fileManager, 'renameFile').mockResolvedValue(undefined);

		const entries = [
			makePendingEntry('daily/a.md', 'daily/a-new.md'),
			makePendingEntry('daily/b.md', 'daily/b-new.md'),
		];
		const settings = { ...DEFAULT_SETTINGS, rateLimitBatch: 10, rateLimitMs: 0 };

		const results = await engine.executeWithRateLimit(app, entries, settings, vi.fn());

		expect(spy).toHaveBeenCalledTimes(2);
		expect(results).toHaveLength(2);
		expect(results.every(r => r.entry.status === 'renamed')).toBe(true);
	});
});
