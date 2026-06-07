// Spec : notes/page-log-2026-05-13/spec.md § 6 capture contexte auto.
// Singleton léger qui collecte les 3 dernières erreurs JS dans une fenêtre glissante
// de 60 secondes. Utilisé par le form pour pré-remplir context.recentErrors. Aucun
// preventDefault sur le listener (laisse les erreurs se propager normalement).

import { browser } from '$app/environment';
import type { FeedbackContext } from './types';

export const ERROR_CAPTURE_MAX = 3;
export const ERROR_CAPTURE_WINDOW_MS = 60_000;

type CapturedError = FeedbackContext['recentErrors'][number];

let buffer: CapturedError[] = [];
let installed = false;

function purgeOld(now: number): void {
	const cutoff = now - ERROR_CAPTURE_WINDOW_MS;
	buffer = buffer.filter((e) => Date.parse(e.at) >= cutoff);
}

function pushError(item: CapturedError): void {
	const now = Date.now();
	purgeOld(now);
	buffer.push(item);
	if (buffer.length > ERROR_CAPTURE_MAX) {
		buffer = buffer.slice(buffer.length - ERROR_CAPTURE_MAX);
	}
}

export const errorCapture = {
	install(): void {
		if (!browser || installed) return;
		installed = true;
		window.addEventListener('error', (ev) => {
			pushError({
				message: String(ev.message ?? 'unknown error'),
				stack: ev.error?.stack ? String(ev.error.stack).slice(0, 2000) : undefined,
				at: new Date().toISOString(),
			});
		});
		window.addEventListener('unhandledrejection', (ev) => {
			const reason = (ev as PromiseRejectionEvent).reason;
			pushError({
				message: `unhandledrejection: ${reason?.message ?? String(reason).slice(0, 200)}`,
				stack: reason?.stack ? String(reason.stack).slice(0, 2000) : undefined,
				at: new Date().toISOString(),
			});
		});
	},

	add(err: CapturedError): void {
		pushError(err);
	},

	read(): CapturedError[] {
		purgeOld(Date.now());
		return buffer.slice();
	},

	reset(): void {
		buffer = [];
	},
};
