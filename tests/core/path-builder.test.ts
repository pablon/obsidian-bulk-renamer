import { describe, it, expect } from 'vitest';
import { buildNormalizedPath, computeReason, buildRenameMap } from '../../src/core/path-builder';
import { DEFAULT_SETTINGS } from '../../src/types';
import type { BulkRenameSettings } from '../../src/types';

const CTIME_2025_01_15 = new Date('2025-01-15').getTime();

const settings = (overrides: Partial<BulkRenameSettings> = {}): BulkRenameSettings => ({
	...DEFAULT_SETTINGS,
	...overrides,
});

describe('buildNormalizedPath', () => {
	it('regular file without date gets ctime prefix (trailing-or-ctime)', () => {
		const result = buildNormalizedPath(
			'daily/My Note.md',
			'My Note',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('daily/2025-01-15-my-note.md');
	});

	it('file with trailing date has date moved to prefix', () => {
		const result = buildNormalizedPath(
			'daily/My Note 2025-03-10.md',
			'My Note 2025-03-10',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('daily/2025-03-10-my-note.md');
	});

	it('file with existing date prefix preserves date and normalizes rest', () => {
		const result = buildNormalizedPath(
			'daily/2025-01-15-My Note.md',
			'2025-01-15-My Note',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('daily/2025-01-15-my-note.md');
	});

	it('template file gets normalized but NO date prefix', () => {
		const result = buildNormalizedPath(
			'templates/My Template.md',
			'My Template',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('templates/my-template.md');
	});

	it('datePrefix=none: no date prefix added', () => {
		const result = buildNormalizedPath(
			'daily/My Note.md',
			'My Note',
			CTIME_2025_01_15,
			settings({ datePrefix: 'none' }),
		);
		expect(result).toBe('daily/my-note.md');
	});

	it('datePrefix=trailing-only: uses trailing date when present', () => {
		const result = buildNormalizedPath(
			'daily/My Note 2025-03-10.md',
			'My Note 2025-03-10',
			CTIME_2025_01_15,
			settings({ datePrefix: 'trailing-only' }),
		);
		expect(result).toBe('daily/2025-03-10-my-note.md');
	});

	it('datePrefix=trailing-only: no ctime fallback when trailing date absent', () => {
		const result = buildNormalizedPath(
			'daily/My Note.md',
			'My Note',
			CTIME_2025_01_15,
			settings({ datePrefix: 'trailing-only' }),
		);
		expect(result).toBe('daily/my-note.md');
	});

	it('empty basename guard: empty basename returns original path', () => {
		const result = buildNormalizedPath(
			'daily/.md',
			'',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('daily/.md');
	});

	it('path length guard: path >240 chars returns original', () => {
		const longDir = 'a'.repeat(235);
		const filePath = `${longDir}/note.md`;
		const result = buildNormalizedPath(filePath, 'note', CTIME_2025_01_15, settings());
		expect(result).toBe(filePath);
	});

	it('already normalized file returns the same path', () => {
		const result = buildNormalizedPath(
			'daily/2025-01-15-my-note.md',
			'2025-01-15-my-note',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('daily/2025-01-15-my-note.md');
	});

	it('file with existing date prefix and empty rest produces bare date basename', () => {
		const result = buildNormalizedPath(
			'daily/2025-01-15.md',
			'2025-01-15',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('daily/2025-01-15.md');
	});

	it('template empty basename guard returns original path', () => {
		const result = buildNormalizedPath(
			'templates/.md',
			'',
			CTIME_2025_01_15,
			settings(),
		);
		expect(result).toBe('templates/.md');
	});

	it('timestampFormat=YYYYMMDD: ctime produces compact date prefix', () => {
		const result = buildNormalizedPath(
			'daily/My Note.md',
			'My Note',
			CTIME_2025_01_15,
			settings({ timestampFormat: 'YYYYMMDD' }),
		);
		expect(result).toBe('daily/20250115-my-note.md');
	});

	it('timestampFormat=YYMMDD: ctime produces short date prefix', () => {
		const result = buildNormalizedPath(
			'daily/My Note.md',
			'My Note',
			CTIME_2025_01_15,
			settings({ timestampFormat: 'YYMMDD' }),
		);
		expect(result).toBe('daily/250115-my-note.md');
	});

	it('timestampFormat affects trailing date prefix too', () => {
		const result = buildNormalizedPath(
			'daily/My Note 2025-03-10.md',
			'My Note 2025-03-10',
			CTIME_2025_01_15,
			settings({ timestampFormat: 'YYYYMMDD' }),
		);
		expect(result).toBe('daily/20250310-my-note.md');
	});
});

describe('computeReason', () => {
	it('uppercase in path produces "lowercase" reason', () => {
		const reason = computeReason(
			'daily/My Note.md',
			'daily/2025-01-15-my-note.md',
			'My Note',
			settings(),
		);
		expect(reason).toContain('lowercase');
	});

	it('trailing date produces "trailing-date-moved-to-prefix" reason', () => {
		const reason = computeReason(
			'daily/my-note-2025-03-10.md',
			'daily/2025-03-10-my-note.md',
			'my-note-2025-03-10',
			settings(),
		);
		expect(reason).toContain('trailing-date-moved-to-prefix');
	});

	it('spaces in basename produce "spaces-or-underscores" reason', () => {
		const reason = computeReason(
			'daily/my note.md',
			'daily/2025-01-15-my-note.md',
			'my note',
			settings(),
		);
		expect(reason).toContain('spaces-or-underscores');
	});

	it('no date prefix and no trailing date produces "ctime-prefix-added" reason', () => {
		const reason = computeReason(
			'daily/my-note.md',
			'daily/2025-01-15-my-note.md',
			'my-note',
			settings(),
		);
		expect(reason).toContain('ctime-prefix-added');
	});

	it('datePrefix=none does NOT produce "ctime-prefix-added"', () => {
		const reason = computeReason(
			'daily/my-note.md',
			'daily/my-note.md',
			'my-note',
			settings({ datePrefix: 'none' }),
		);
		expect(reason).not.toContain('ctime-prefix-added');
	});

	it('template file does NOT produce "ctime-prefix-added"', () => {
		const reason = computeReason(
			'templates/My Template.md',
			'templates/my-template.md',
			'My Template',
			settings(),
		);
		expect(reason).not.toContain('ctime-prefix-added');
	});
});

describe('buildRenameMap', () => {
	it('root-level file is counted as skipped', () => {
		const { entries, stats } = buildRenameMap(
			[{ path: 'note.md', basename: 'note', ctime: CTIME_2025_01_15 }],
			settings(),
		);
		expect(stats.skipped).toBe(1);
		expect(stats.toRename).toBe(0);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('excluded');
	});

	it('excluded dir file is counted as skipped', () => {
		const { entries, stats } = buildRenameMap(
			[{ path: '.obsidian/config.md', basename: 'config', ctime: CTIME_2025_01_15 }],
			settings({ excludedDirs: ['.obsidian/', 'attachments/'] }),
		);
		expect(stats.skipped).toBe(1);
		expect(entries[0]?.reason).toBe('excluded');
	});

	it('already normalized file is counted as alreadyNormalized', () => {
		const { stats } = buildRenameMap(
			[{ path: 'daily/2025-01-15-my-note.md', basename: '2025-01-15-my-note', ctime: CTIME_2025_01_15 }],
			settings(),
		);
		expect(stats.alreadyNormalized).toBe(1);
		expect(stats.toRename).toBe(0);
	});

	it('mixed files: correct stats across rename, normalized, and skipped', () => {
		const files = [
			{ path: 'root.md', basename: 'root', ctime: CTIME_2025_01_15 },
			{ path: 'daily/2025-01-15-my-note.md', basename: '2025-01-15-my-note', ctime: CTIME_2025_01_15 },
			{ path: 'daily/My Note.md', basename: 'My Note', ctime: CTIME_2025_01_15 },
		];
		const { stats } = buildRenameMap(files, settings());
		expect(stats.skipped).toBe(1);
		expect(stats.alreadyNormalized).toBe(1);
		expect(stats.toRename).toBe(1);
		expect(stats.collisions).toBe(0);
	});

	it('template file gets normalized entry without date prefix', () => {
		const { entries } = buildRenameMap(
			[{ path: 'templates/My Template.md', basename: 'My Template', ctime: CTIME_2025_01_15 }],
			settings(),
		);
		expect(entries[0]?.newPath).toBe('templates/my-template.md');
		expect(entries[0]?.newPath).not.toMatch(/\d{4}-\d{2}-\d{2}/);
	});

	it('buildRenameMap returns all entries (including skipped)', () => {
		const files = [
			{ path: 'root.md', basename: 'root', ctime: CTIME_2025_01_15 },
			{ path: 'daily/My Note.md', basename: 'My Note', ctime: CTIME_2025_01_15 },
		];
		const { entries } = buildRenameMap(files, settings());
		expect(entries).toHaveLength(2);
	});
});
