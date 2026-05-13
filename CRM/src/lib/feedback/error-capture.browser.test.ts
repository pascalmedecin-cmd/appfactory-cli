// Spec : notes/page-log-2026-05-13/spec.md § 6 capture contexte auto.
// Test happy path `errorCapture.install()` côté browser. Fichier séparé pour mocker
// `$app/environment` avec `browser=true` sans polluer le test pure-logique
// (`feedback.test.ts` mock browser=false). Coverage L audit S185.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// IMPORTANT : mock à appliquer AVANT l'import du module testé.
vi.mock('$app/environment', () => ({ browser: true, dev: true, building: false }));

// Minimal window stub pour Node : capture les listeners et permet de les invoquer.
type Listener = (ev: unknown) => void;
const listeners: Record<string, Listener[]> = {};
(globalThis as { window?: unknown }).window = {
	addEventListener: (event: string, cb: Listener) => {
		(listeners[event] ||= []).push(cb);
	},
};

describe('errorCapture.install() (browser=true, audit S185 coverage)', () => {
	beforeEach(async () => {
		// Reset des listeners + module state entre tests (re-import via vi.resetModules).
		for (const k of Object.keys(listeners)) listeners[k] = [];
		vi.resetModules();
	});

	it('install attache un listener `error` et capture window.onerror', async () => {
		const mod = await import('./error-capture');
		mod.errorCapture.install();

		expect(listeners.error).toHaveLength(1);
		expect(listeners.unhandledrejection).toHaveLength(1);

		// Déclenche un évènement `error` simulé.
		listeners.error[0]({
			message: 'TypeError: foo is not a function',
			error: { stack: 'at <anonymous>:1:1' },
		});

		const out = mod.errorCapture.read();
		expect(out).toHaveLength(1);
		expect(out[0].message).toBe('TypeError: foo is not a function');
		expect(out[0].stack).toContain('<anonymous>');
		expect(typeof out[0].at).toBe('string');
	});

	it('install capture unhandledrejection avec reason.message', async () => {
		const mod = await import('./error-capture');
		mod.errorCapture.install();

		listeners.unhandledrejection[0]({
			reason: { message: 'fetch failed', stack: 'at fetch:42:1' },
		});

		const out = mod.errorCapture.read();
		expect(out).toHaveLength(1);
		expect(out[0].message).toBe('unhandledrejection: fetch failed');
		expect(out[0].stack).toContain('fetch:42:1');
	});

	it('install est idempotent : double-appel n\'attache pas 2x', async () => {
		const mod = await import('./error-capture');
		mod.errorCapture.install();
		mod.errorCapture.install();
		expect(listeners.error).toHaveLength(1);
		expect(listeners.unhandledrejection).toHaveLength(1);
	});
});
