// ─────────────────────────────────────────────────────────────────────────────
// Collision Detection: Detect when multiple files would normalize to the same path
// NO Obsidian imports — pure collision detection logic
// ─────────────────────────────────────────────────────────────────────────────

import type { RenameEntry, CollisionGroup } from '../types';

/**
 * Detect if any two files would normalize to the same target path.
 * Groups entries by newPath and returns groups where multiple sources collide.
 *
 * @param entries Array of rename operations
 * @returns Array of collision groups (empty if no collisions)
 *
 * @example
 * const entries = [
 *   { oldPath: 'file-1.md', newPath: 'target.md', ... },
 *   { oldPath: 'file-2.md', newPath: 'target.md', ... },
 * ];
 * const collisions = detectCollisions(entries);
 * // Returns: [{ target: 'target.md', sources: ['file-1.md', 'file-2.md'] }]
 */
export function detectCollisions(entries: RenameEntry[]): CollisionGroup[] {
	const targetCount: Record<string, string[]> = {};

	// Group entries by their target newPath
	for (const { newPath, oldPath } of entries) {
		if (!targetCount[newPath]) {
			targetCount[newPath] = [];
		}
		targetCount[newPath].push(oldPath);
	}

	// Return only groups where multiple sources collide at the same target
	return Object.entries(targetCount)
		.filter(([, sources]) => sources.length > 1)
		.map(([target, sources]) => ({ target, sources }));
}
