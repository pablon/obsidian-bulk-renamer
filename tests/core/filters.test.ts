import { describe, it, expect } from 'vitest';
import { shouldSkipFile, isInTemplatesDir, isAlreadyNormalized } from '../../src/core/filters';

const DEFAULT_EXCLUDED_DIRS = ['attachments/'];
const DEFAULT_EXCLUDED_PATTERNS = ['AGENTS.md'];
// For tests that specifically test .obsidian/ exclusion
const OBSIDIAN_EXCLUDED_DIRS = ['.obsidian/', 'attachments/'];

describe('shouldSkipFile', () => {
	it('skips root-level file with no slash (README.md)', () => {
		expect(shouldSkipFile('README.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('skips root-level file with no slash (scratch.md)', () => {
		expect(shouldSkipFile('scratch.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('skips .obsidian/ directory path', () => {
		expect(shouldSkipFile('.obsidian/config.md', OBSIDIAN_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('skips attachments/ directory path', () => {
		expect(shouldSkipFile('attachments/image.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('does NOT skip daily/ path (not excluded)', () => {
		expect(shouldSkipFile('daily/note.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(false);
	});

	it('skips root-level AGENTS.md (no slash)', () => {
		expect(shouldSkipFile('AGENTS.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('skips daily/AGENTS.md via excludedFilePatterns (exact match)', () => {
		expect(shouldSkipFile('daily/AGENTS.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('skips daily/agents.md via excludedFilePatterns (case-insensitive)', () => {
		expect(shouldSkipFile('daily/agents.md', DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('skips archive/note.md with custom excludedDirs=["archive/"]', () => {
		expect(shouldSkipFile('archive/note.md', ['archive/'], [])).toBe(true);
	});

	it('does NOT skip daily/note.md when only archive/ is excluded', () => {
		expect(shouldSkipFile('daily/note.md', ['archive/'], [])).toBe(false);
	});

	it('skips deeply nested path inside excluded dir', () => {
		expect(shouldSkipFile('.obsidian/plugins/some-plugin/data.json', OBSIDIAN_EXCLUDED_DIRS, DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
	});

	it('does NOT skip file with no excluded dirs or patterns', () => {
		expect(shouldSkipFile('notes/my-note.md', [], [])).toBe(false);
	});
});

describe('isInTemplatesDir', () => {
	it('returns true for file directly in templates/', () => {
		expect(isInTemplatesDir('templates/meeting.md', 'templates/')).toBe(true);
	});

	it('returns true for nested file inside templates/', () => {
		expect(isInTemplatesDir('templates/sub/file.md', 'templates/')).toBe(true);
	});

	it('returns false for file not in templates/', () => {
		expect(isInTemplatesDir('daily/note.md', 'templates/')).toBe(false);
	});

	it('returns true for custom templates dir', () => {
		expect(isInTemplatesDir('my-templates/file.md', 'my-templates/')).toBe(true);
	});

	it('returns false for file that only partially matches templates dir name', () => {
		expect(isInTemplatesDir('templates-old/file.md', 'templates/')).toBe(false);
	});
});

describe('isAlreadyNormalized', () => {
	it('returns true when old path equals new path', () => {
		expect(isAlreadyNormalized('daily/my-note.md', 'daily/my-note.md')).toBe(true);
	});

	it('returns false when paths differ', () => {
		expect(isAlreadyNormalized('daily/My Note.md', 'daily/my-note.md')).toBe(false);
	});
});
