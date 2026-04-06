// ─────────────────────────────────────────────────────────────────────────────
// File filtering / skip logic — pure functions, NO obsidian imports
// All functions accept plain path strings for testability
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine if a file should be skipped entirely.
 * Pure function — accepts path strings, NOT TFile objects.
 *
 * Skipped when:
 * - Root-level file (no directory in path — no "/" character)
 * - Path starts with any of the excludedDirs
 * - Filename matches any of the excludedFilePatterns (case-insensitive exact match)
 */
export function shouldSkipFile(
	filePath: string,
	excludedDirs: string[],
	excludedFilePatterns: string[],
): boolean {
	// Root-level: no slash means no directory component
	if (!filePath.includes('/')) return true;

	for (const dir of excludedDirs) {
		if (filePath.startsWith(dir)) return true;
	}

	const filename = filePath.split('/').pop() ?? '';
	for (const pattern of excludedFilePatterns) {
		if (filename.toLowerCase() === pattern.toLowerCase()) return true;
	}

	return false;
}

/**
 * Check whether a file is inside the templates directory.
 * Pure function — accepts path strings.
 */
export function isInTemplatesDir(filePath: string, templatesDir: string): boolean {
	return filePath.startsWith(templatesDir);
}

/**
 * Check whether a file is already normalized (old path === new path).
 */
export function isAlreadyNormalized(oldPath: string, newPath: string): boolean {
	return oldPath === newPath;
}


