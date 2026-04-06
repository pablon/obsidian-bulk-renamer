// ─────────────────────────────────────────────────────────────────────────────
// Integration tests: full rename pipeline end-to-end
// Tests buildRenameMap → detectCollisions → buildRollbackMap pipeline
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { buildRenameMap, buildNormalizedPath } from '../../src/core/path-builder';
import { detectCollisions } from '../../src/core/collisions';
import { buildRollbackMap } from '../../src/engine/rollback';
import { DEFAULT_SETTINGS } from '../../src/types';
import type { BulkRenameSettings, RenameEntry } from '../../src/types';

const CTIME_2025_01_15 = new Date('2025-01-15').getTime();

const s = (overrides: Partial<BulkRenameSettings> = {}): BulkRenameSettings => ({
	...DEFAULT_SETTINGS,
	...overrides,
});

const f = (path: string, basename: string, ctime = CTIME_2025_01_15) => ({ path, basename, ctime });

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline integration
// ─────────────────────────────────────────────────────────────────────────────
describe('Full pipeline integration', () => {
	it('1. Mixed vault: correct stats across all file types', () => {
		const files = [
			f('root.md', 'root'),
			f('daily/My Note.md', 'My Note'),
			f('daily/2025-01-15-already-normalized.md', '2025-01-15-already-normalized'),
			f('templates/My Template.md', 'My Template'),
			f('.obsidian/config.md', 'config'),
		];
		const { stats } = buildRenameMap(files, s({ excludedDirs: ['.obsidian/', 'attachments/'] }));
		expect(stats.skipped).toBe(2);
		expect(stats.alreadyNormalized).toBe(1);
		expect(stats.toRename).toBe(2);
		expect(stats.collisions).toBe(0);
	});

	it('2. File with trailing date: date moved to prefix', () => {
		const { entries } = buildRenameMap(
			[f('daily/Meeting Notes 2025-03-10.md', 'Meeting Notes 2025-03-10')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('daily/2025-03-10-meeting-notes.md');
		expect(entries[0]?.reason).toContain('trailing-date-moved-to-prefix');
	});

	it('3. File with existing date prefix: prefix preserved, rest normalized', () => {
		const { entries } = buildRenameMap(
			[f('daily/2025-01-15-My Note.md', '2025-01-15-My Note')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('daily/2025-01-15-my-note.md');
		expect(entries[0]?.reason).toContain('lowercase');
	});

	it('4. Template file: normalized but NO date prefix added', () => {
		const { entries } = buildRenameMap(
			[f('templates/My Template.md', 'My Template')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('templates/my-template.md');
		expect(entries[0]?.newPath).not.toMatch(/\d{4}-\d{2}-\d{2}/);
	});

	it('5. Root-level file: skipped with reason "excluded"', () => {
		const { entries, stats } = buildRenameMap(
			[f('root-note.md', 'root-note')],
			s(),
		);
		expect(stats.skipped).toBe(1);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('excluded');
		expect(entries.filter(e => e.status === 'pending')).toHaveLength(0);
	});

	it('6. Excluded directory file: skipped with reason "excluded"', () => {
		const { entries, stats } = buildRenameMap(
			[f('.obsidian/config.md', 'config')],
			s({ excludedDirs: ['.obsidian/', 'attachments/'] }),
		);
		expect(stats.skipped).toBe(1);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('excluded');
	});

	it('7. Already normalized file: counted as alreadyNormalized', () => {
		const { entries, stats } = buildRenameMap(
			[f('daily/2025-01-15-my-note.md', '2025-01-15-my-note')],
			s(),
		);
		expect(stats.alreadyNormalized).toBe(1);
		expect(stats.toRename).toBe(0);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('already-normalized');
	});

	it('8. File with empty basename: skipped with reason "empty-result"', () => {
		const { entries, stats } = buildRenameMap(
			[f('daily/.md', '')],
			s(),
		);
		expect(stats.skipped).toBe(1);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('empty-result');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Collision integration
// ─────────────────────────────────────────────────────────────────────────────
describe('Collision integration', () => {
	it('9. Two files normalizing to the same target: detectCollisions returns collision group', () => {
		const { entries } = buildRenameMap(
			[
				f('daily/My Note.md', 'My Note'),
				f('daily/my note.md', 'my note'),
			],
			s(),
		);
		expect(entries.filter(e => e.status === 'pending')).toHaveLength(2);
		const collisions = detectCollisions(entries);
		expect(collisions).toHaveLength(1);
		expect(collisions[0]?.target).toBe('daily/2025-01-15-my-note.md');
		expect(collisions[0]?.sources).toHaveLength(2);
		expect(collisions[0]?.sources).toEqual(
			expect.arrayContaining(['daily/My Note.md', 'daily/my note.md']),
		);
	});

	it('10. After collision detected: colliding entries marked as collision exclude from rollback', () => {
		const entries: RenameEntry[] = [
			{ oldPath: 'daily/File A.md', newPath: 'daily/2025-01-15-file-a.md', reason: 'normalized', status: 'pending' },
			{ oldPath: 'daily/File B.md', newPath: 'daily/2025-01-15-file-a.md', reason: 'normalized', status: 'pending' },
		];
		const collisions = detectCollisions(entries);
		expect(collisions).toHaveLength(1);

		const collisionSources = new Set(collisions.flatMap(c => c.sources));
		for (const entry of entries) {
			if (collisionSources.has(entry.oldPath)) {
				entry.status = 'collision';
			}
		}

		expect(entries.every(e => e.status === 'collision')).toBe(true);

		const rollbackMap = buildRollbackMap(entries);
		expect(Object.keys(rollbackMap)).toHaveLength(0);
	});

	it('11. No collisions in clean vault: empty collision array', () => {
		const files = [
			f('daily/My Note.md', 'My Note'),
			f('weekly/My Review.md', 'My Review'),
			f('daily/2025-01-15-different-note.md', '2025-01-15-different-note'),
		];
		const { entries } = buildRenameMap(files, s());
		const collisions = detectCollisions(entries);
		expect(collisions).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Rollback integration
// ─────────────────────────────────────────────────────────────────────────────
describe('Rollback integration', () => {
	it('12. buildRollbackMap: correct newPath→oldPath mapping for pending entries', () => {
		const entries: RenameEntry[] = [
			{ oldPath: 'daily/My Note.md', newPath: 'daily/2025-01-15-my-note.md', reason: 'normalized', status: 'pending' },
			{ oldPath: 'weekly/Review.md', newPath: 'weekly/2025-01-15-review.md', reason: 'normalized', status: 'pending' },
		];
		const map = buildRollbackMap(entries);
		expect(map['daily/2025-01-15-my-note.md']).toBe('daily/My Note.md');
		expect(map['weekly/2025-01-15-review.md']).toBe('weekly/Review.md');
		expect(Object.keys(map)).toHaveLength(2);
	});

	it('13. buildRollbackMap excludes non-pending entries (skipped, failed, collision)', () => {
		const entries: RenameEntry[] = [
			{ oldPath: 'daily/My Note.md', newPath: 'daily/2025-01-15-my-note.md', reason: 'normalized', status: 'pending' },
			{ oldPath: 'daily/skip.md', newPath: 'daily/skip.md', reason: 'excluded', status: 'skipped' },
			{ oldPath: 'daily/norm.md', newPath: 'daily/norm.md', reason: 'already-normalized', status: 'skipped' },
			{ oldPath: 'daily/failed.md', newPath: 'daily/2025-01-15-failed.md', reason: 'normalized', status: 'failed' },
			{ oldPath: 'daily/collision.md', newPath: 'daily/2025-01-15-same.md', reason: 'normalized', status: 'collision' },
		];
		const map = buildRollbackMap(entries);
		expect(Object.keys(map)).toHaveLength(1);
		expect(map['daily/2025-01-15-my-note.md']).toBe('daily/My Note.md');
	});

	it('14. Empty entries: buildRollbackMap returns empty map', () => {
		const map = buildRollbackMap([]);
		expect(Object.keys(map)).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases from Metis review
// ─────────────────────────────────────────────────────────────────────────────
describe('Edge cases (Metis review)', () => {
	it('15. Special chars only (@#$): normalizeFilename guard preserves original, date prefix still added', () => {
		// normalizeFilename('@#$', settings) → all chars stripped → empty → GUARD: returns '@#$.md'
		// buildNormalizedPath: normalizedBaseName = '@#$', datePrefix added → pending
		const { entries } = buildRenameMap(
			[f('notes/@#$.md', '@#$')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('notes/2025-01-15-@#$.md');
	});

	it('16. Emoji filename: emoji stripped to valid content, date prefix added', () => {
		// '🎉party🎉' → stripSpecialChars removes emoji → 'party' → valid result
		const { entries } = buildRenameMap(
			[f('notes/🎉party🎉.md', '🎉party🎉')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('notes/2025-01-15-party.md');
	});

	it('17. CJK characters: stripped by special-chars step, guard preserves original, date added', () => {
		// CJK chars are not in [a-z0-9-] → stripped → empty → guard preserves original basename
		const { entries } = buildRenameMap(
			[f('notes/日本語メモ.md', '日本語メモ')],
			s(),
		);
		// Guard preserves original basename, ctime prefix still prepended
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('notes/2025-01-15-日本語メモ.md');
	});

	it('18. Dashes-only filename: collapsed and stripped → guard preserves original, date added', () => {
		// '----' → collapsed to '-' → strip leading/trailing → '' → guard: returns '----.md'
		const { entries } = buildRenameMap(
			[f('notes/----.md', '----')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('notes/2025-01-15-----.md');
	});

	it('19. File with path > 240 chars: path length guard fires, counted as alreadyNormalized', () => {
		// buildNormalizedPath adds date prefix → newPath > 240 chars → returns original path
		// buildRenameMap: newPath === filePath, testNorm ≠ '.md' → 'already-normalized'
		const longDir = 'a'.repeat(235);
		const filePath = `${longDir}/note.md`;
		const { entries, stats } = buildRenameMap(
			[f(filePath, 'note')],
			s(),
		);
		expect(stats.alreadyNormalized).toBe(1);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('already-normalized');
	});

	it('20. Bare date filename (2025-01-01.md): treated as already normalized', () => {
		// extractDatePrefix('2025-01-01') → hasDate=true, rest=''
		// buildNormalizedPath: newBasename = '2025-01-01.md' = file.path → already-normalized
		const { entries, stats } = buildRenameMap(
			[f('daily/2025-01-01.md', '2025-01-01')],
			s(),
		);
		expect(stats.alreadyNormalized).toBe(1);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('already-normalized');
	});

	it('21. Multiple dates in filename: existing prefix preserved, trailing in rest stripped', () => {
		// '2025-01-01-meeting-2024-12-31' → hasDate('2025-01-01'), rest='meeting-2024-12-31'
		// normalizeFilename('meeting-2024-12-31.md') → strips trailing date → 'meeting.md'
		// result: '2025-01-01-meeting.md'
		const { entries } = buildRenameMap(
			[f('daily/2025-01-01-meeting-2024-12-31.md', '2025-01-01-meeting-2024-12-31')],
			s(),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toBe('daily/2025-01-01-meeting.md');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Settings variations
// ─────────────────────────────────────────────────────────────────────────────
describe('Settings variations', () => {
	it('22. datePrefix=none: no date prefix added to any file', () => {
		const files = [
			f('daily/My Note.md', 'My Note'),
			f('notes/Another Note.md', 'Another Note'),
		];
		const { entries } = buildRenameMap(files, s({ datePrefix: 'none' }));
		expect(entries[0]?.newPath).toBe('daily/my-note.md');
		expect(entries[1]?.newPath).toBe('notes/another-note.md');
		for (const entry of entries) {
			if (entry.status === 'pending') {
				expect(entry.newPath).not.toMatch(/^\d{4}-\d{2}-\d{2}/);
			}
		}
	});

	it('23. datePrefix=trailing-only: trailing date used, no ctime fallback when absent', () => {
		const files = [
			f('daily/Meeting 2025-03-10.md', 'Meeting 2025-03-10'),
			f('daily/No Date.md', 'No Date'),
		];
		const { entries } = buildRenameMap(files, s({ datePrefix: 'trailing-only' }));
		expect(entries[0]?.newPath).toBe('daily/2025-03-10-meeting.md');
		expect(entries[1]?.newPath).toBe('daily/no-date.md');
		expect(entries[1]?.newPath).not.toMatch(/\d{4}-\d{2}-\d{2}/);
	});

	it('24. Custom excludedDirs: files in custom directory are skipped', () => {
		const files = [
			f('archive/old-note.md', 'old-note'),
			f('daily/active-note.md', 'active-note'),
		];
		const { entries, stats } = buildRenameMap(
			files,
			s({ excludedDirs: [...DEFAULT_SETTINGS.excludedDirs, 'archive/'] }),
		);
		const archiveEntry = entries.find(e => e.oldPath === 'archive/old-note.md');
		expect(archiveEntry?.status).toBe('skipped');
		expect(archiveEntry?.reason).toBe('excluded');
		expect(stats.skipped).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch coverage: buildNormalizedPath with no-directory paths + disabled steps
// ─────────────────────────────────────────────────────────────────────────────
describe('buildNormalizedPath branch coverage', () => {
	it('25. No-directory path: dirPath empty → basename-only result', () => {
		const result = buildNormalizedPath('my-note.md', 'my-note', CTIME_2025_01_15, s());
		expect(result).toBe('2025-01-15-my-note.md');
	});

	it('26. Template in no-directory path: normalized without dir prefix', () => {
		const result = buildNormalizedPath(
			'templates/My Note.md',
			'My Note',
			CTIME_2025_01_15,
			s({ templatesDir: '' }),
		);
		expect(result).toBe('templates/my-note.md');
	});

	it('27. Existing date prefix in no-directory path: produces basename-only result', () => {
		const result = buildNormalizedPath(
			'2025-01-15-My Note.md',
			'2025-01-15-My Note',
			CTIME_2025_01_15,
			s(),
		);
		expect(result).toBe('2025-01-15-my-note.md');
	});

	it('28. spacesToDashes=false: spaces not converted to dashes', () => {
		const { entries } = buildRenameMap(
			[f('notes/My Note.md', 'My Note')],
			s({ spacesToDashes: false, lowercase: true }),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).not.toContain(' ');
	});

	it('29. dotsToHyphens=false: dots preserved in normalization step', () => {
		const { entries } = buildRenameMap(
			[f('notes/My.Note.md', 'My.Note')],
			s({ dotsToHyphens: false }),
		);
		expect(entries[0]?.status).toBe('pending');
	});

	it('30. collapseDashes=false: consecutive dashes preserved (not collapsed)', () => {
		const { entries } = buildRenameMap(
			[f('notes/My--Note.md', 'My--Note')],
			s({ collapseDashes: false, lowercase: true }),
		);
		expect(entries[0]?.status).toBe('pending');
		expect(entries[0]?.newPath).toContain('--');
	});

	it('31. stripSpecialChars=false: special chars preserved in result', () => {
		const { entries } = buildRenameMap(
			[f('notes/My Note!.md', 'My Note!')],
			s({ stripSpecialChars: false, lowercase: true }),
		);
		expect(entries[0]?.status).toBe('pending');
	});
});
