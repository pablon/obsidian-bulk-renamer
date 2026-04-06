// ─────────────────────────────────────────────────────────────────────────────
// Path builder: integration point for normalize, dates, and filters
// Pure functions — NO obsidian imports, accepts plain strings NOT TFile objects
// ─────────────────────────────────────────────────────────────────────────────
import type { BulkRenameSettings, RenameEntry, PreviewStats } from '../types';
import { normalizeFilename } from './normalize';
import { extractTrailingDate, extractDatePrefix, formatTimestamp } from './dates';
import { isInTemplatesDir, shouldSkipFile } from './filters';

/** Maximum allowed path length (chars) before skipping */
const MAX_PATH_LENGTH = 240;

/**
 * Build the normalized full path for a file.
 * Pure function — accepts plain strings, NOT TFile objects.
 *
 * @param filePath - Full path relative to vault root (e.g. "daily/My Note.md")
 * @param basename - Filename without extension (e.g. "My Note")
 * @param ctime - File creation timestamp (ms since epoch)
 * @param settings - Plugin settings controlling normalization behavior
 * @returns New full path, or original filePath if file should be skipped
 */
export function buildNormalizedPath(
	filePath: string,
	basename: string,
	ctime: number,
	settings: BulkRenameSettings,
): string {
	// Extract directory component
	const lastSlash = filePath.lastIndexOf('/');
	const dirPath = lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';

	// Check if file is in templates directory
	const inTemplates = isInTemplatesDir(filePath, settings.templatesDir);

	// Check if basename already has a valid date prefix
	const prefixInfo = extractDatePrefix(basename);

	if (inTemplates) {
		// Templates: normalize basename only, NO date prefix
		const normalized = normalizeFilename(basename, settings);
		// Guard: if normalized is just ".md" (empty basename), return original
		if (normalized === '.md') return filePath;
		const newPath = dirPath ? `${dirPath}/${normalized}` : normalized;
		if (newPath.length > MAX_PATH_LENGTH) return filePath;
		return newPath;
	}

	if (prefixInfo.hasDate) {
		// Already has valid date prefix — normalize the rest, keep the date
		const rest = prefixInfo.rest;
		const normalizedRest = rest.length > 0
			? normalizeFilename(rest + '.md', settings).slice(0, -3)
			: '';
		const newBasename = normalizedRest.length > 0
			? `${prefixInfo.date}-${normalizedRest}.md`
			: `${prefixInfo.date}.md`;
		const newPath = dirPath ? `${dirPath}/${newBasename}` : newBasename;
		if (newPath.length > MAX_PATH_LENGTH) return filePath;
		return newPath;
	}

	// No date prefix — apply full normalization
	const normalizedBase = normalizeFilename(basename, settings);
	// Guard: if normalized is just ".md" (empty basename), return original
	if (normalizedBase === '.md') return filePath;
	const normalizedBaseName = normalizedBase.slice(0, -3); // strip .md

	// Determine date prefix based on settings
	let datePrefix: string | null = null;
	if (settings.datePrefix !== 'none') {
		const trailingInfo = extractTrailingDate(basename);
		if (trailingInfo.date) {
			const [yr, mo, dy] = trailingInfo.date.split('-').map(Number);
			datePrefix = formatTimestamp(
				new Date(yr ?? 0, (mo ?? 1) - 1, dy ?? 1),
				settings.timestampFormat,
			);
		} else if (settings.datePrefix === 'trailing-or-ctime') {
			datePrefix = formatTimestamp(new Date(ctime), settings.timestampFormat);
		}
	}

	const newBasename = datePrefix
		? `${datePrefix}-${normalizedBaseName}.md`
		: `${normalizedBaseName}.md`;
	const newPath = dirPath ? `${dirPath}/${newBasename}` : newBasename;
	if (newPath.length > MAX_PATH_LENGTH) return filePath;
	return newPath;
}

/**
 * Compute human-readable reason(s) for a rename.
 * Called only for files that WILL be renamed (oldPath !== newPath).
 */
export function computeReason(
	oldPath: string,
	newPath: string,
	basename: string,
	settings: BulkRenameSettings,
): string {
	const reasons: string[] = [];
	if (oldPath !== oldPath.toLowerCase()) reasons.push('lowercase');
	if (/[\s_]/.test(basename)) reasons.push('spaces-or-underscores');
	if (/[^\w\s.-]/.test(basename)) reasons.push('special-chars');
	const trailingInfo = extractTrailingDate(basename);
	if (trailingInfo.date) reasons.push('trailing-date-moved-to-prefix');
	if (!extractDatePrefix(basename).hasDate && !trailingInfo.date && !isInTemplatesDir(oldPath, settings.templatesDir) && settings.datePrefix !== 'none') {
		reasons.push('ctime-prefix-added');
	}
	return reasons.length > 0 ? reasons.join(', ') : 'normalized';
}

/**
 * Build a rename map from a list of files.
 * Returns entries for ALL files (including already-normalized and skipped),
 * plus summary statistics.
 *
 * NOTE: Collision detection is NOT performed here — run detectCollisions
 * on the resulting entries after calling this function.
 */
export function buildRenameMap(
	files: Array<{ path: string; basename: string; ctime: number }>,
	settings: BulkRenameSettings,
): { entries: RenameEntry[]; stats: PreviewStats } {
	const entries: RenameEntry[] = [];
	let toRename = 0;
	let alreadyNormalized = 0;
	let skipped = 0;

	for (const file of files) {
		// Check if file should be skipped
		if (shouldSkipFile(file.path, settings.excludedDirs, settings.excludedFilePatterns)) {
			skipped++;
			entries.push({
				oldPath: file.path,
				newPath: file.path,
				reason: 'excluded',
				status: 'skipped',
			});
			continue;
		}

		const newPath = buildNormalizedPath(file.path, file.basename, file.ctime, settings);

		// Check if path builder returned original (guard triggered)
		if (newPath === file.path) {
			// Could be already normalized OR guard triggered (empty/too long)
			// Distinguish: try normalizing just the basename
			const testNorm = normalizeFilename(file.basename, settings);
			if (testNorm === '.md') {
				// Empty basename guard
				skipped++;
				entries.push({
					oldPath: file.path,
					newPath: file.path,
					reason: 'empty-result',
					status: 'skipped',
				});
			} else {
				alreadyNormalized++;
				entries.push({
					oldPath: file.path,
					newPath: file.path,
					reason: 'already-normalized',
					status: 'skipped',
				});
			}
			continue;
		}

		toRename++;
		entries.push({
			oldPath: file.path,
			newPath,
			reason: computeReason(file.path, newPath, file.basename, settings),
			status: 'pending',
		});
	}

	return {
		entries,
		stats: { toRename, alreadyNormalized, skipped, collisions: 0 },
	};
}
