import { describe, it, expect } from 'vitest';

describe('Vitest infrastructure', () => {
	it('should run tests correctly', () => {
		expect(1 + 1).toBe(2);
	});

	it('should support TypeScript', () => {
		const add = (a: number, b: number): number => a + b;
		expect(add(3, 4)).toBe(7);
	});
});
