// Spec : notes/page-log-2026-05-13/spec.md § 6.5 + § 12.
// Helper pur (testable iso) qui transforme une liste d'entrées en Blob JSON
// téléchargeable. Tri date desc, UTF-8 sans BOM, champs explicites.

import type { FeedbackEntry, FeedbackEntryExport } from './types';

export function toExportPayload(entries: ReadonlyArray<FeedbackEntry>): FeedbackEntryExport[] {
	return entries
		.slice()
		.sort((a, b) => b.created_at.localeCompare(a.created_at))
		.map((e) => ({
			id: e.id,
			created_at: e.created_at,
			created_by_email: e.created_by_email,
			type: e.type,
			severity: e.severity,
			page: e.page,
			description: e.description,
			context: e.context,
			status: e.status,
			admin_notes: e.admin_notes,
		}));
}

export function toExportJson(entries: ReadonlyArray<FeedbackEntry>): Blob {
	const payload = toExportPayload(entries);
	const text = JSON.stringify(payload, null, 2);
	return new Blob([text], { type: 'application/json;charset=utf-8' });
}

export function exportFilename(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `feedback-${y}-${m}-${d}.json`;
}
