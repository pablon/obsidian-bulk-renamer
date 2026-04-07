// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript interfaces for obsidian-bulk-renamer plugin
// NO imports from 'obsidian' — pure TypeScript types only
// ─────────────────────────────────────────────────────────────────────────────

/** Controls which normalization steps are applied. Pipeline ORDER is fixed. */
export interface NormalizationSettings {
	/** Step 3: Convert filename to lowercase */
	lowercase: boolean;
	/** Step 4: Strip Unicode diacritical marks (é→e, ñ→n, ü→u) */
	stripAccents: boolean;
	/** Step 5: Replace spaces and underscores with dashes */
	spacesToDashes: boolean;
	/** Step 6: Replace dots with dashes */
	dotsToHyphens: boolean;
	/** Step 7: Remove all characters not in [a-z0-9-] */
	stripSpecialChars: boolean;
	/** Step 8: Collapse consecutive dashes to single dash */
	collapseDashes: boolean;
	/**
	 * Date prefix behavior:
	 * - "trailing-or-ctime": Use trailing date if present, else file ctime
	 * - "trailing-only": Use trailing date if present, else no date prefix
	 * - "none": Never add date prefix
	 */
	datePrefix: 'trailing-or-ctime' | 'trailing-only' | 'none';
	/** Format used when rendering date prefixes */
	timestampFormat: TimestampFormat;
}

export type TimestampFormat = 'YYYY-MM-DD' | 'YYYYMMDD' | 'YYMMDD' | 'YYYYMMDD-HHMM' | 'YYMMDD-HHMMSS';

/** Controls which files and directories are excluded from processing */
export interface ExclusionSettings {
	/**
	 * Directories to exclude (relative to vault root, with trailing slash).
	 * Default: [".obsidian/", "attachments/"]
	 * Root-level files are always excluded regardless of this setting.
	 */
	excludedDirs: string[];
	/**
	 * File patterns to exclude (glob-style, matched against filename only).
	 * Default: ["AGENTS.md"]
	 */
	excludedFilePatterns: string[];
	/**
	 * Directory name for templates (relative to vault root, with trailing slash).
	 * Files in this directory get normalization but NO date prefix.
	 * Default: "templates/"
	 */
	templatesDir: string;
}

/** Full plugin settings combining normalization and exclusion config */
export interface BulkRenameSettings extends NormalizationSettings, ExclusionSettings {
	/** Milliseconds to pause between rename batches. Default: 100 */
	rateLimitMs: number;
	/** Number of renames per batch before pausing. Default: 10 */
	rateLimitBatch: number;
}

/** Default settings matching the original script behavior */
export const DEFAULT_SETTINGS: BulkRenameSettings = {
	// Normalization pipeline (all ON by default)
	lowercase: true,
	stripAccents: true,
	spacesToDashes: true,
	dotsToHyphens: true,
	stripSpecialChars: true,
	collapseDashes: true,
	datePrefix: 'trailing-or-ctime',
	timestampFormat: 'YYYY-MM-DD',
	// Exclusions
	excludedDirs: ['attachments/'],
	excludedFilePatterns: ['AGENTS.md'],
	templatesDir: 'templates/',
	// Rate limiting
	rateLimitMs: 100,
	rateLimitBatch: 10,
};

/** Result of extracting a date from a filename */
export interface DateInfo {
	/** Whether a valid date was found */
	hasDate: boolean;
	/** The date string in YYYY-MM-DD format, or null if not found */
	date: string | null;
	/** The remainder of the filename after removing the date */
	rest: string;
}

/** A single file rename operation */
export interface RenameEntry {
	/** Original file path (relative to vault root) */
	oldPath: string;
	/** Target file path after normalization */
	newPath: string;
	/** Human-readable reason(s) for the rename */
	reason: string;
	/** Current status of this rename operation */
	status: 'pending' | 'renamed' | 'skipped' | 'failed' | 'collision';
}

/** Result of executing a single rename operation */
export interface RenameResult {
	entry: RenameEntry;
	/** Error message if the rename failed */
	error?: string;
}

/**
 * Rollback map: maps new paths back to original paths.
 * Stored in plugin data for undo functionality.
 * Shape: { [newPath]: oldPath }
 */
export type RollbackMap = Record<string, string>;

/** A group of files that would collide at the same target path */
export interface CollisionGroup {
	/** The target path that multiple files would normalize to */
	target: string;
	/** The source paths that would collide */
	sources: string[];
}

/** Summary statistics for a preview/dry-run operation */
export interface PreviewStats {
	/** Number of files that will be renamed */
	toRename: number;
	/** Number of files already normalized (no change needed) */
	alreadyNormalized: number;
	/** Number of files skipped (root-level, excluded, empty result, path too long) */
	skipped: number;
	/** Number of collision groups detected */
	collisions: number;
}

/** Persisted plugin data shape (stored via saveData/loadData) */
export interface PluginData {
	settings: BulkRenameSettings;
	rollbackMap: RollbackMap | null;
}
