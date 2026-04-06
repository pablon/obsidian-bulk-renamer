import { describe, it, expect } from 'vitest';
import { normalizeFilename, stripTrailingDate, extractTrailingDate } from '../../src/core/normalize';

describe('stripTrailingDate', () => {
	it('strips trailing date separated by underscore', () => {
		expect(stripTrailingDate('Resumen_KT_BLUE_2025-10-27')).toBe('Resumen_KT_BLUE');
	});

	it('strips trailing date separated by dash', () => {
		expect(stripTrailingDate('resumen-kt-blue-2025-10-27')).toBe('resumen-kt-blue');
	});

	it('preserves basename when the whole name is a date', () => {
		expect(stripTrailingDate('2025-10-27')).toBe('2025-10-27');
	});
});

describe('extractTrailingDate', () => {
	it('extracts date and returns rest', () => {
		const result = extractTrailingDate('Resumen_KT_BLUE_2025-10-27');
		expect(result.date).toBe('2025-10-27');
		expect(result.rest).toBe('Resumen_KT_BLUE');
	});

	it('returns null date and original rest when no date present', () => {
		const result = extractTrailingDate('my-note');
		expect(result.date).toBeNull();
		expect(result.rest).toBe('my-note');
	});

	it('returns null date and original rest when whole name is a date', () => {
		const result = extractTrailingDate('2025-10-27');
		expect(result.date).toBeNull();
		expect(result.rest).toBe('2025-10-27');
	});
});

describe('normalizeFilename — original script cases', () => {
	it('lowercases uppercase with dashes', () => {
		expect(normalizeFilename('RED-BLUE-seguimiento.md')).toBe('red-blue-seguimiento.md');
	});

	it('handles special chars and spaces around @', () => {
		expect(normalizeFilename('qemu @ macOS.md')).toBe('qemu-macos.md');
	});

	it('converts dots to dashes', () => {
		expect(normalizeFilename('red.es-kickoff.md')).toBe('red-es-kickoff.md');
	});

	it('converts underscores and dots to dashes', () => {
		expect(normalizeFilename('webhook_listener.py.md')).toBe('webhook-listener-py.md');
	});

	it('strips ampersand', () => {
		expect(normalizeFilename('Q&A.md')).toBe('qa.md');
	});

	it('collapses leading and trailing dashes from spaces', () => {
		expect(normalizeFilename('  ---file---.md')).toBe('file.md');
	});

	it('is a no-op for already normalized filename with date prefix', () => {
		expect(normalizeFilename('2025-01-20-already-dated.md')).toBe('2025-01-20-already-dated.md');
	});

	it('strips unicode accents', () => {
		expect(normalizeFilename('Sesión Técnica.md')).toBe('sesion-tecnica.md');
	});

	it('handles mixed case with numbers and underscores', () => {
		expect(normalizeFilename('IN-77_GPU-Stress-Testing.md')).toBe('in-77-gpu-stress-testing.md');
	});

	it('lowercases camelcase acronyms', () => {
		expect(normalizeFilename('Accesos-RedIRIS-red-es-Proyecto.md')).toBe('accesos-rediris-red-es-proyecto.md');
	});
});

describe('normalizeFilename — trailing date stripping', () => {
	it('strips trailing date with underscore separators', () => {
		expect(normalizeFilename('Resumen_KT_BLUE_2025-10-27.md')).toBe('resumen-kt-blue.md');
	});

	it('strips trailing date with dash separator', () => {
		expect(normalizeFilename('resumen-kt-blue-2025-10-27.md')).toBe('resumen-kt-blue.md');
	});

	it('preserves filename that is entirely a date', () => {
		expect(normalizeFilename('2025-10-27.md')).toBe('2025-10-27.md');
	});
});

describe('normalizeFilename — empty result guard', () => {
	it('returns original basename when all chars are stripped (@#$)', () => {
		expect(normalizeFilename('@#$.md')).toBe('@#$.md');
	});

	it('returns original basename for CJK characters (all stripped)', () => {
		expect(normalizeFilename('日本語メモ.md')).toBe('日本語メモ.md');
	});

	it('returns original basename when only dashes remain after pipeline', () => {
		expect(normalizeFilename('----.md')).toBe('----.md');
	});

	it('strips emojis but keeps valid latin chars', () => {
		expect(normalizeFilename('🎉party🎉.md')).toBe('party.md');
	});
});

describe('normalizeFilename — settings flags', () => {
	it('preserves case when lowercase=false (guard returns original)', () => {
		expect(normalizeFilename('RED-BLUE.md', { lowercase: false })).toBe('RED-BLUE.md');
	});

	it('skips accent stripping when stripAccents=false, then é is stripped by stripSpecialChars', () => {
		expect(normalizeFilename('Café.md', { stripAccents: false })).toBe('caf.md');
	});

	it('does not strip trailing date when datePrefix=none', () => {
		expect(normalizeFilename('report-2025-01-01.md', { datePrefix: 'none' })).toBe('report-2025-01-01.md');
	});

	it('strips trailing date when datePrefix=trailing-only', () => {
		expect(normalizeFilename('report-2025-01-01.md', { datePrefix: 'trailing-only' })).toBe('report.md');
	});

	it('accepts input without .md extension', () => {
		expect(normalizeFilename('My File')).toBe('my-file.md');
	});
});

describe('normalizeFilename — edge cases', () => {
	it('handles very long filenames without truncation', () => {
		const longName = 'a'.repeat(250) + '.md';
		const result = normalizeFilename(longName);
		expect(result).toBe('a'.repeat(250) + '.md');
	});

	it('handles empty string input via guard', () => {
		expect(normalizeFilename('.md')).toBe('.md');
	});

	it('handles filename with only spaces and dashes', () => {
		expect(normalizeFilename('   .md')).toBe('   .md');
	});

	it('handles multiple consecutive dots', () => {
		expect(normalizeFilename('a...b.md')).toBe('a-b.md');
	});

	it('handles mixed unicode accents and spaces', () => {
		expect(normalizeFilename('Résumé Técnico.md')).toBe('resume-tecnico.md');
	});
});
