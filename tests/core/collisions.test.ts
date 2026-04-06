import { describe, it, expect } from 'vitest';
import { detectCollisions } from '../../src/core/collisions';
import type { RenameEntry } from '../../src/types';

describe('detectCollisions', () => {
	it('should return empty array for empty input', () => {
		const result = detectCollisions([]);
		expect(result).toEqual([]);
	});

	it('should return empty array for single entry (cannot collide with itself)', () => {
		const entries: RenameEntry[] = [
			{
				oldPath: 'single-file.md',
				newPath: 'normalized.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toEqual([]);
	});

	it('should return empty array when entries have different targets', () => {
		const entries: RenameEntry[] = [
			{
				oldPath: 'file-1.md',
				newPath: 'normalized-1.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-2.md',
				newPath: 'normalized-2.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toEqual([]);
	});

	it('should detect collision when two entries target the same path', () => {
		const entries: RenameEntry[] = [
			{
				oldPath: 'File-1.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-2.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			target: 'target.md',
			sources: ['File-1.md', 'file-2.md'],
		});
	});

	it('should detect collision when three entries target the same path', () => {
		const entries: RenameEntry[] = [
			{
				oldPath: 'File-1.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-2.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'FILE-3.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			target: 'target.md',
			sources: ['File-1.md', 'file-2.md', 'FILE-3.md'],
		});
	});

	it('should detect multiple independent collision groups', () => {
		const entries: RenameEntry[] = [
			// Group 1: target.md
			{
				oldPath: 'file-1.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-2.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			// Group 2: other-target.md
			{
				oldPath: 'file-3.md',
				newPath: 'other-target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-4.md',
				newPath: 'other-target.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toHaveLength(2);
		expect(result).toContainEqual({
			target: 'target.md',
			sources: ['file-1.md', 'file-2.md'],
		});
		expect(result).toContainEqual({
			target: 'other-target.md',
			sources: ['file-3.md', 'file-4.md'],
		});
	});

	it('should return only colliding groups and ignore non-colliding entries', () => {
		const entries: RenameEntry[] = [
			// Collision group
			{
				oldPath: 'file-1.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-2.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			// Non-colliding entries
			{
				oldPath: 'file-3.md',
				newPath: 'unique-1.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'file-4.md',
				newPath: 'unique-2.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			target: 'target.md',
			sources: ['file-1.md', 'file-2.md'],
		});
	});

	it('should preserve oldPath order as entries are processed', () => {
		const entries: RenameEntry[] = [
			{
				oldPath: 'zebra.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'apple.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
			{
				oldPath: 'mango.md',
				newPath: 'target.md',
				reason: 'testing',
				status: 'pending',
			},
		];
		const result = detectCollisions(entries);
		expect(result).toHaveLength(1);
		expect(result[0].sources).toEqual(['zebra.md', 'apple.md', 'mango.md']);
	});
});
