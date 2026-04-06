import { describe, it, expect } from 'vitest';
import { applyRegexReplace, buildRegexRenameMap, parseRegexPattern } from '../../src/core/regex-replace';
import { DEFAULT_SETTINGS } from '../../src/types';
import type { BulkRenameSettings } from '../../src/types';

const s = (overrides: Partial<BulkRenameSettings> = {}): BulkRenameSettings => ({
	...DEFAULT_SETTINGS,
	...overrides,
});

describe('applyRegexReplace', () => {
	it('replaces simple string match', () => {
		expect(applyRegexReplace('my-note', /note/, 'document')).toBe('my-document');
	});

	it('replaces with global flag', () => {
		expect(applyRegexReplace('a-b-a', /a/g, 'x')).toBe('x-b-x');
	});

	it('supports capture groups in replacement', () => {
		expect(applyRegexReplace('2025-01-15-meeting', /^(\d{4})-(\d{2})-(\d{2})/, '$1$2$3')).toBe('20250115-meeting');
	});

	it('returns original when no match', () => {
		expect(applyRegexReplace('my-note', /xyz/, 'abc')).toBe('my-note');
	});

	it('handles case-insensitive flag', () => {
		expect(applyRegexReplace('MyNote', /mynote/i, 'replaced')).toBe('replaced');
	});
});

describe('buildRegexRenameMap', () => {
	const files = [
		{ path: 'daily/my-note.md', basename: 'my-note' },
		{ path: 'daily/my-doc.md', basename: 'my-doc' },
		{ path: 'daily/other.md', basename: 'other' },
		{ path: 'root.md', basename: 'root' },
	];

	it('renames matching files, skips non-matching', () => {
		const { entries, stats } = buildRegexRenameMap(
			files, /^my-/, 'our-', s(),
		);
		expect(stats.toRename).toBe(2);
		expect(entries[0]?.newPath).toBe('daily/our-note.md');
		expect(entries[1]?.newPath).toBe('daily/our-doc.md');
	});

	it('skips excluded files (root-level)', () => {
		const { stats } = buildRegexRenameMap(files, /.*/, 'x', s());
		expect(stats.skipped).toBe(1);
	});

	it('skips files that produce empty basename', () => {
		const { entries, stats } = buildRegexRenameMap(
			[{ path: 'daily/abc.md', basename: 'abc' }],
			/abc/, '', s(),
		);
		expect(stats.skipped).toBe(1);
		expect(entries[0]?.status).toBe('skipped');
		expect(entries[0]?.reason).toBe('empty-result');
	});

	it('counts unchanged files as alreadyNormalized', () => {
		const { stats } = buildRegexRenameMap(
			[{ path: 'daily/other.md', basename: 'other' }],
			/^my-/, 'our-', s(),
		);
		expect(stats.alreadyNormalized).toBe(1);
	});

	it('reason is always "regex-replace" for matches', () => {
		const { entries } = buildRegexRenameMap(
			[{ path: 'daily/my-note.md', basename: 'my-note' }],
			/my/, 'your', s(),
		);
		expect(entries[0]?.reason).toBe('regex-replace');
	});

	it('status is "pending" for matched files', () => {
		const { entries } = buildRegexRenameMap(
			[{ path: 'daily/my-note.md', basename: 'my-note' }],
			/my-note/, 'renamed', s(),
		);
		expect(entries[0]?.status).toBe('pending');
	});

	it('collisions count initializes to 0', () => {
		const { stats } = buildRegexRenameMap(files, /^my-/, 'our-', s());
		expect(stats.collisions).toBe(0);
	});

	it('skips excluded directories', () => {
		const filesWithAttachments = [
			{ path: 'attachments/my-image.md', basename: 'my-image' },
			{ path: 'daily/my-note.md', basename: 'my-note' },
		];
		const { stats } = buildRegexRenameMap(filesWithAttachments, /my/, 'your', s());
		expect(stats.skipped).toBe(1);
		expect(stats.toRename).toBe(1);
	});

	it('preserves .md extension in new path', () => {
		const { entries } = buildRegexRenameMap(
			[{ path: 'daily/note.md', basename: 'note' }],
			/note/, 'renamed', s(),
		);
		expect(entries[0]?.newPath).toBe('daily/renamed.md');
	});

	it('handles global flag replacing all matches', () => {
		const { entries } = buildRegexRenameMap(
			[{ path: 'daily/a-b-a.md', basename: 'a-b-a' }],
			/a/g, 'x', s(),
		);
		expect(entries[0]?.newPath).toBe('daily/x-b-x.md');
	});
});

describe('parseRegexPattern', () => {
	it('returns RegExp for valid pattern', () => {
		const re = parseRegexPattern('\\d+', 'g');
		expect(re).toBeInstanceOf(RegExp);
		expect(re?.flags).toBe('g');
	});

	it('returns null for invalid pattern', () => {
		expect(parseRegexPattern('[unclosed', '')).toBeNull();
	});

	it('supports multiple flags', () => {
		const re = parseRegexPattern('test', 'gi');
		expect(re?.flags).toContain('g');
		expect(re?.flags).toContain('i');
	});
});
