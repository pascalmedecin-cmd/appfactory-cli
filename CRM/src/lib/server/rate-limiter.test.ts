import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRateLimiter } from './rate-limiter';

afterEach(() => {
	vi.useRealTimers();
});

describe('createRateLimiter (M-14)', () => {
	it('autorise jusqu’à `max` requêtes par fenêtre, puis bloque', () => {
		const rl = createRateLimiter({ windowMs: 60_000, max: 3, mapCap: 100, cleanupIntervalMs: 60_000 });
		expect(rl.check('1.2.3.4')).toBe(true);
		expect(rl.check('1.2.3.4')).toBe(true);
		expect(rl.check('1.2.3.4')).toBe(true);
		expect(rl.check('1.2.3.4')).toBe(false);
		rl.dispose();
	});

	it('compteurs indépendants par clé', () => {
		const rl = createRateLimiter({ windowMs: 60_000, max: 1, mapCap: 100 });
		expect(rl.check('a')).toBe(true);
		expect(rl.check('a')).toBe(false);
		expect(rl.check('b')).toBe(true);
		rl.dispose();
	});

	it('fenêtre expirée → compteur réinitialisé', () => {
		vi.useFakeTimers();
		const rl = createRateLimiter({ windowMs: 1_000, max: 1, mapCap: 100 });
		expect(rl.check('x')).toBe(true);
		expect(rl.check('x')).toBe(false);
		vi.advanceTimersByTime(1_500);
		expect(rl.check('x')).toBe(true);
		rl.dispose();
	});

	it('éviction LRU quand la map est pleine : la plus ancienne clé est retirée, pas de fail-closed', () => {
		const rl = createRateLimiter({ windowMs: 60_000, max: 5, mapCap: 2 });
		expect(rl.check('old')).toBe(true); // map: [old]
		expect(rl.check('mid')).toBe(true); // map: [old, mid] -> plein
		// Nouvelle IP inconnue : map pleine → on évince 'old' (la plus ancienne),
		// et la nouvelle IP est acceptée (pas de fail-closed).
		expect(rl.check('new')).toBe(true); // map: [mid, new]
		expect(rl.size).toBe(2);
		// 'old' a été évincée → un nouveau hit la recrée avec un compteur frais.
		expect(rl.check('old')).toBe(true);
		rl.dispose();
	});

	it('dispose() arrête le timer de nettoyage', () => {
		vi.useFakeTimers();
		const clearSpy = vi.spyOn(globalThis, 'clearInterval');
		const rl = createRateLimiter({ windowMs: 1_000, max: 1, mapCap: 10, cleanupIntervalMs: 1_000 });
		rl.dispose();
		expect(clearSpy).toHaveBeenCalled();
		clearSpy.mockRestore();
	});

	it('nettoyage périodique purge les entrées expirées', () => {
		vi.useFakeTimers();
		const rl = createRateLimiter({ windowMs: 1_000, max: 5, mapCap: 100, cleanupIntervalMs: 1_000 });
		rl.check('a');
		rl.check('b');
		expect(rl.size).toBe(2);
		vi.advanceTimersByTime(2_500); // fenêtres expirées + ≥1 tick de cleanup
		expect(rl.size).toBe(0);
		rl.dispose();
	});
});
