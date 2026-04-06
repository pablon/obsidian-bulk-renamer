import { describe, it, expect } from 'vitest';
import {
	extractTrailingDate,
	stripTrailingDate,
	extractDatePrefix,
	formatDate,
	formatTimestamp,
} from '../../src/core/dates';

describe('extractTrailingDate', () => {
	it('extracts trailing date from underscore-separated basename', () => {
		const result = extractTrailingDate('Resumen_KT_BLUE_2025-10-27');
		expect(result.date).toBe('2025-10-27');
		expect(result.rest).toBe('Resumen_KT_BLUE');
		expect(result.hasDate).toBe(true);
	});

	it('returns null date when no trailing date present', () => {
		const result = extractTrailingDate('no-date-here');
		expect(result.date).toBeNull();
		expect(result.rest).toBe('no-date-here');
		expect(result.hasDate).toBe(false);
	});

	it('preserves bare date — does not self-extract', () => {
		const result = extractTrailingDate('2025-10-27');
		expect(result.date).toBeNull();
		expect(result.rest).toBe('2025-10-27');
		expect(result.hasDate).toBe(false);
	});

	it('extracts dash-separated trailing date', () => {
		const result = extractTrailingDate('Report-2024-05-29');
		expect(result.date).toBe('2024-05-29');
		expect(result.rest).toBe('Report');
		expect(result.hasDate).toBe(true);
	});

	it('extracts date with underscore separator', () => {
		const result = extractTrailingDate('report_2025-01-01');
		expect(result.date).toBe('2025-01-01');
		expect(result.rest).toBe('report');
		expect(result.hasDate).toBe(true);
	});

	it('extracts only the trailing date when multiple dates present', () => {
		const result = extractTrailingDate('2025-01-01-meeting-2024-12-31');
		expect(result.date).toBe('2024-12-31');
		expect(result.rest).toBe('2025-01-01-meeting');
		expect(result.hasDate).toBe(true);
	});
});

describe('stripTrailingDate', () => {
	it('strips trailing date from basename', () => {
		expect(stripTrailingDate('Resumen_KT_BLUE_2025-10-27')).toBe('Resumen_KT_BLUE');
	});

	it('returns original when no trailing date', () => {
		expect(stripTrailingDate('no-date-here')).toBe('no-date-here');
	});

	it('returns original when entire basename is a date', () => {
		expect(stripTrailingDate('2025-10-27')).toBe('2025-10-27');
	});
});

describe('extractDatePrefix', () => {
	it('detects valid YYYY-MM-DD prefix with rest', () => {
		const result = extractDatePrefix('2025-06-20-meeting-notes.md');
		expect(result.hasDate).toBe(true);
		expect(result.date).toBe('2025-06-20');
		expect(result.rest).toBe('meeting-notes');
	});

	it('returns hasDate false when no date prefix', () => {
		const result = extractDatePrefix('meeting-notes.md');
		expect(result.hasDate).toBe(false);
		expect(result.date).toBeNull();
	});

	it('rejects Q4-style month (not numeric)', () => {
		const result = extractDatePrefix('2024-Q4-Infra.md');
		expect(result.hasDate).toBe(false);
	});

	it('rejects month 13 (invalid)', () => {
		const result = extractDatePrefix('2025-13-45-notes.md');
		expect(result.hasDate).toBe(false);
	});

	it('rejects month 00 (invalid)', () => {
		const result = extractDatePrefix('2025-00-01-notes.md');
		expect(result.hasDate).toBe(false);
	});

	it('rejects day 00 (invalid)', () => {
		const result = extractDatePrefix('2025-01-00-notes.md');
		expect(result.hasDate).toBe(false);
	});

	it('handles date-only basename (empty rest)', () => {
		const result = extractDatePrefix('2025-01-01.md');
		expect(result.hasDate).toBe(true);
		expect(result.date).toBe('2025-01-01');
		expect(result.rest).toBe('');
	});

	it('works without .md extension', () => {
		const result = extractDatePrefix('2025-06-20-report');
		expect(result.hasDate).toBe(true);
		expect(result.date).toBe('2025-06-20');
		expect(result.rest).toBe('report');
	});
});

describe('formatDate', () => {
	it('zero-pads month and day', () => {
		expect(formatDate(new Date(2025, 0, 5))).toBe('2025-01-05');
	});

	it('formats end-of-year date correctly', () => {
		expect(formatDate(new Date(2025, 11, 31))).toBe('2025-12-31');
	});

	it('formats mid-year date correctly', () => {
		expect(formatDate(new Date(2024, 5, 20))).toBe('2024-06-20');
	});
});

describe('formatTimestamp', () => {
	const testDate = new Date(2025, 0, 15, 14, 30, 22);

	it('formats as YYYY-MM-DD', () => {
		expect(formatTimestamp(testDate, 'YYYY-MM-DD')).toBe('2025-01-15');
	});

	it('formats as YYYYMMDD', () => {
		expect(formatTimestamp(testDate, 'YYYYMMDD')).toBe('20250115');
	});

	it('formats as YYMMDD', () => {
		expect(formatTimestamp(testDate, 'YYMMDD')).toBe('250115');
	});

	it('formats as YYYYMMDD-HHMM', () => {
		expect(formatTimestamp(testDate, 'YYYYMMDD-HHMM')).toBe('20250115-1430');
	});

	it('formats as YYMMDD-HHMMSS', () => {
		expect(formatTimestamp(testDate, 'YYMMDD-HHMMSS')).toBe('250115-143022');
	});

	it('zero-pads single-digit values', () => {
		const earlyDate = new Date(2025, 0, 5, 3, 7, 2);
		expect(formatTimestamp(earlyDate, 'YYYYMMDD-HHMM')).toBe('20250105-0307');
		expect(formatTimestamp(earlyDate, 'YYMMDD-HHMMSS')).toBe('250105-030702');
	});
});
