import { NormalizationSettings } from '../types';

/**
 * Extract a trailing YYYY-MM-DD date from the end of a basename.
 * Returns the date found and the remainder. If the entire basename IS a date,
 * it's returned as-is in `rest` (not extracted) so it stays as a prefix.
 *
 * @param basename — filename WITHOUT extension (e.g. "Resumen_KT_2025-10-27")
 * @returns {{ date: string | null, rest: string }}
 */
export function extractTrailingDate(basename: string): { date: string | null; rest: string } {
	const trailingDateRe = /[-_]?(\d{4}-\d{2}-\d{2})$/;
	const match = basename.match(trailingDateRe);
	if (!match) return { date: null, rest: basename };

	const stripped = basename.slice(0, basename.length - match[0].length);
	if (stripped.length === 0) return { date: null, rest: basename };

	return { date: match[1] ?? null, rest: stripped };
}

/**
 * Strip a trailing date pattern (YYYY-MM-DD) from the end of a basename.
 * Only strips if removal leaves non-empty text — a bare date like "2025-10-27"
 * is kept intact (it IS the filename, not a suffix).
 *
 * @param basename — filename WITHOUT extension (e.g. "Resumen_KT_2025-10-27")
 * @returns basename with trailing date removed, or original if whole name is a date
 */
export function stripTrailingDate(basename: string): string {
	const { rest } = extractTrailingDate(basename);
	return rest;
}

/**
 * Normalize a filename basename through the full transformation pipeline.
 * Pipeline order is FIXED. Each step is toggled by its corresponding
 * NormalizationSettings flag; undefined values default to true (step enabled).
 *
 * Pipeline steps:
 *  1. Strip .md extension if present
 *  2. Strip trailing date (YYYY-MM-DD) — skipped if datePrefix === 'none'
 *  3. Lowercase — skipped if lowercase === false
 *  4. NFD unicode decomposition + strip combining marks — skipped if stripAccents === false
 *  5. Replace spaces and underscores with dashes — skipped if spacesToDashes === false
 *  6. Replace dots with dashes — skipped if dotsToHyphens === false
 *  7. Remove chars not in [a-z0-9-] — skipped if stripSpecialChars === false
 *  8. Collapse consecutive dashes — skipped if collapseDashes === false
 *  9. Strip leading/trailing dashes
 * 10. GUARD: if result is empty, return original basename (without .md) + ".md"
 * 11. Append .md
 *
 * @param basename — filename WITH or WITHOUT .md extension
 * @param settings — optional settings controlling which steps run (all default to enabled)
 * @returns normalized filename WITH .md extension
 */
export function normalizeFilename(basename: string, settings?: Partial<NormalizationSettings>): string {
	// Save original (without extension) for the empty-result guard
	const originalBase = basename.endsWith('.md') ? basename.slice(0, -3) : basename;

	// 1. Strip .md extension if present
	let name = originalBase;

	// 2. Strip trailing date — only if datePrefix !== 'none'
	if (settings?.datePrefix !== 'none') {
		name = stripTrailingDate(name);
	}

	// 3. Lowercase — only if lowercase !== false
	if (settings?.lowercase !== false) {
		name = name.toLowerCase();
	}

	// 4. NFD unicode decomposition + strip combining diacritical marks — only if stripAccents !== false
	if (settings?.stripAccents !== false) {
		name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	// 5. Replace spaces and underscores with dashes — only if spacesToDashes !== false
	if (settings?.spacesToDashes !== false) {
		name = name.replace(/[\s_]+/g, '-');
	}

	// 6. Replace dots with dashes — only if dotsToHyphens !== false
	if (settings?.dotsToHyphens !== false) {
		name = name.replace(/\./g, '-');
	}

	// 7. Remove all chars not in [a-z0-9-] — only if stripSpecialChars !== false
	if (settings?.stripSpecialChars !== false) {
		name = name.replace(/[^a-z0-9-]/g, '');
	}

	// 8. Collapse consecutive dashes to a single dash — only if collapseDashes !== false
	if (settings?.collapseDashes !== false) {
		name = name.replace(/-{2,}/g, '-');
	}

	// 9. Strip leading and trailing dashes
	name = name.replace(/^-+|-+$/g, '');

	// 10. GUARD: if result is empty, return original basename (without .md) + ".md"
	if (name.length === 0) {
		return originalBase + '.md';
	}

	// 11. Append .md
	return name + '.md';
}
