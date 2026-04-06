// ─────────────────────────────────────────────────────────────────────────────
// Regex Replace: Pure functions for regex-based file rename
// NO Obsidian imports — pure TypeScript module
// ─────────────────────────────────────────────────────────────────────────────

import type { BulkRenameSettings, RenameEntry, PreviewStats } from '../types';
import { shouldSkipFile } from './filters';

/**
 * Apply regex find-replace to a basename.
 * Returns the new basename, or original if no match.
 */
export function applyRegexReplace(
	basename: string,
	pattern: RegExp,
	replacement: string,
): string {
	return basename.replace(pattern, replacement);
}

/**
 * Build a rename map by applying regex find-replace to all file basenames.
 * Respects exclusion settings. Only .md extension is preserved.
 */
export function buildRegexRenameMap(
	files: Array<{ path: string; basename: string }>,
	pattern: RegExp,
	replacement: string,
	settings: BulkRenameSettings,
): { entries: RenameEntry[]; stats: PreviewStats } {
	const entries: RenameEntry[] = [];
	let toRename = 0;
	let alreadyNormalized = 0;
	let skipped = 0;

	for (const file of files) {
		if (shouldSkipFile(file.path, settings.excludedDirs, settings.excludedFilePatterns)) {
			skipped++;
			continue;
		}

		const newBasename = applyRegexReplace(file.basename, pattern, replacement);
		const lastSlash = file.path.lastIndexOf('/');
		const dirPath = lastSlash >= 0 ? file.path.slice(0, lastSlash) : '';
		const newPath = dirPath
			? `${dirPath}/${newBasename}.md`
			: `${newBasename}.md`;

		if (newPath === file.path) {
			alreadyNormalized++;
			continue;
		}

		if (newBasename.length === 0) {
			skipped++;
			entries.push({
				oldPath: file.path,
				newPath: file.path,
				reason: 'empty-result',
				status: 'skipped',
			});
			continue;
		}

		toRename++;
		entries.push({
			oldPath: file.path,
			newPath,
			reason: 'regex-replace',
			status: 'pending',
		});
	}

	return {
		entries,
		stats: { toRename, alreadyNormalized, skipped, collisions: 0 },
	};
}

/**
 * Safely parse a regex pattern string with flags.
 * Returns null if the pattern is invalid.
 */
export function parseRegexPattern(pattern: string, flags: string): RegExp | null {
	try {
		return new RegExp(pattern, flags);
	} catch {
		return null;
	}
}
