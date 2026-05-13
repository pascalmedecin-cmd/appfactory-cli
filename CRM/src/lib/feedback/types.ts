// Spec : notes/page-log-2026-05-13/spec.md § 4 + § 5.
// Types partagés client/serveur pour les retours utilisateurs (bugs/suggestions/questions).

export type FeedbackType = 'bug' | 'suggestion' | 'question';
export type FeedbackSeverity = 'bloquant' | 'genant' | 'mineur';
export type FeedbackStatus = 'nouveau' | 'a_actionner' | 'traite' | 'logge';

export interface FeedbackContext {
	url: string;
	viewport: { w: number; h: number };
	userAgent: string;
	recentErrors: Array<{ message: string; stack?: string; at: string }>;
}

export interface FeedbackEntry {
	id: string;
	created_at: string;
	created_by: string | null;
	created_by_email: string;
	type: FeedbackType;
	severity: FeedbackSeverity | null;
	page: string;
	description: string;
	context: FeedbackContext;
	status: FeedbackStatus;
	admin_notes: string | null;
	updated_at: string;
}

export interface FeedbackEntryExport {
	id: string;
	created_at: string;
	created_by_email: string;
	type: FeedbackType;
	severity: FeedbackSeverity | null;
	page: string;
	description: string;
	context: FeedbackContext;
	status: FeedbackStatus;
	admin_notes: string | null;
}
