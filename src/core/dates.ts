// ─────────────────────────────────────────────────────────────────────────────
// Pure date extraction and formatting utilities — NO obsidian imports
// ─────────────────────────────────────────────────────────────────────────────
import type { DateInfo, TimestampFormat } from '../types';

/**
 * Extract a trailing YYYY-MM-DD date from the end of a basename.
 * If the entire basename IS a date, returns { hasDate: false, date: null, rest: basename }
 * (bare date is preserved, not extracted as a suffix).
 *
 * @param basename — filename WITHOUT extension (e.g. "Resumen_KT_2025-10-27")
 * @returns DateInfo with date and rest fields
 */
export function extractTrailingDate(basename: string): DateInfo {
	const trailingDateRe = /[-_]?(\d{4}-\d{2}-\d{2})$/;
	const match = basename.match(trailingDateRe);
	if (!match) return { hasDate: false, date: null, rest: basename };

	const stripped = basename.slice(0, basename.length - match[0].length);
	if (stripped.length === 0) return { hasDate: false, date: null, rest: basename };

	return { hasDate: true, date: match[1] ?? null, rest: stripped };
}

/**
 * Strip a trailing date from basename.
 * Returns original if whole name is a date (bare date preserved).
 *
 * @param basename — filename WITHOUT extension
 * @returns basename with trailing date removed, or original if whole name is a date
 */
export function stripTrailingDate(basename: string): string {
	const { rest } = extractTrailingDate(basename);
	return rest;
}

/**
 * Detect whether a basename already has a YYYY-MM-DD prefix.
 * Strict: MM must be 01-12, DD must be 01-31.
 * "2024-Q4-Infra" is NOT a valid date prefix (Q4 is not MM-DD).
 *
 * @param basename — filename with or without .md extension
 * @returns DateInfo with hasDate, date, and rest fields
 */
export function extractDatePrefix(basename: string): DateInfo {
	const name = basename.endsWith('.md') ? basename.slice(0, -3) : basename;
	// Strict: YYYY-MM-DD where MM is 01-12 and DD is 01-31
	const prefixRe = /^(\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))([-_](.*))?$/;
	const match = name.match(prefixRe);
	if (!match) return { hasDate: false, date: null, rest: name };

	const date = match[1] ?? null;
	const rest = match[5] ?? '';
	return { hasDate: true, date, rest };
}

/**
 * Format a JS Date as YYYY-MM-DD.
 *
 * @param date — JS Date object
 * @returns string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function formatTimestamp(date: Date, format: TimestampFormat): string {
	const yyyy = String(date.getFullYear());
	const yy = yyyy.slice(-2);
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');

	switch (format) {
		case 'YYYY-MM-DD':
			return `${yyyy}-${m}-${d}`;
		case 'YYYYMMDD':
			return `${yyyy}${m}${d}`;
		case 'YYMMDD':
			return `${yy}${m}${d}`;
		case 'YYYYMMDD-HHMM':
			return `${yyyy}${m}${d}-${hh}${mm}`;
		case 'YYMMDD-HHMMSS':
			return `${yy}${m}${d}-${hh}${mm}${ss}`;
	}
}
