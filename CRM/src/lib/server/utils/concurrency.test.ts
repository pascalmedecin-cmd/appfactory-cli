import { describe, it, expect } from 'vitest';
import { runWithConcurrency } from './concurrency';

describe('runWithConcurrency', () => {
	it('preserves output order matching input', async () => {
		const items = [1, 2, 3, 4, 5];
		const result = await runWithConcurrency(items, 2, async (x) => x * 10);
		expect(result).toEqual([10, 20, 30, 40, 50]);
	});

	it('caps concurrency at the specified limit', async () => {
		let inFlight = 0;
		let maxInFlight = 0;
		const items = Array.from({ length: 100 }, (_, i) => i);
		await runWithConcurrency(items, 4, async (i) => {
			inFlight++;
			if (inFlight > maxInFlight) maxInFlight = inFlight;
			await new Promise((r) => setTimeout(r, 5));
			inFlight--;
			return i;
		});
		expect(maxInFlight).toBeLessThanOrEqual(4);
		expect(maxInFlight).toBeGreaterThan(0);
	});

	it('handles empty items array (no workers spawned)', async () => {
		const result = await runWithConcurrency([], 4, async () => {
			throw new Error('should not be called');
		});
		expect(result).toEqual([]);
	});

	it('throws if concurrency < 1', async () => {
		await expect(runWithConcurrency([1], 0, async (x) => x)).rejects.toThrow(/>= 1/);
		await expect(runWithConcurrency([1], -1, async (x) => x)).rejects.toThrow(/>= 1/);
	});

	it('propagates the first error and stops processing', async () => {
		const items = [1, 2, 3, 4, 5];
		await expect(
			runWithConcurrency(items, 2, async (i) => {
				if (i === 3) throw new Error('boom');
				return i;
			})
		).rejects.toThrow('boom');
	});

	it('reduces worker count when items < concurrency', async () => {
		let started = 0;
		await runWithConcurrency([1, 2], 10, async (x) => {
			started++;
			return x;
		});
		expect(started).toBe(2);
	});
});
