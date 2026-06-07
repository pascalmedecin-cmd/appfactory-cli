// Spec : notes/page-log-2026-05-13/spec.md § 6.4.
// Listes statiques + labels FR + couleurs badge pour le rendu UI.

import type { FeedbackType, FeedbackSeverity, FeedbackStatus } from './types';

export const FEEDBACK_TYPES: ReadonlyArray<FeedbackType> = ['bug', 'suggestion', 'question'] as const;
export const FEEDBACK_SEVERITIES: ReadonlyArray<FeedbackSeverity> = ['bloquant', 'genant', 'mineur'] as const;
export const FEEDBACK_STATUSES: ReadonlyArray<FeedbackStatus> = ['nouveau', 'a_actionner', 'traite', 'logge'] as const;

export const TYPE_LABELS: Record<FeedbackType, string> = {
	bug: 'Bug',
	suggestion: 'Suggestion',
	question: 'Question',
};

export const SEVERITY_LABELS: Record<FeedbackSeverity, string> = {
	bloquant: 'Bloquant',
	genant: 'Gênant',
	mineur: 'Mineur',
};

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
	nouveau: 'Nouveau',
	a_actionner: 'À actionner',
	traite: 'Traité',
	logge: 'Loggé',
};

// Classes Tailwind tokens du design system CRM (cohérent app.css).
export const TYPE_BADGE_CLASSES: Record<FeedbackType, string> = {
	bug: 'bg-danger-light text-danger-deep',
	suggestion: 'bg-info-light text-info-deep',
	question: 'bg-surface-secondary text-text-muted',
};

export const SEVERITY_BADGE_CLASSES: Record<FeedbackSeverity, string> = {
	bloquant: 'bg-danger-light text-danger-deep',
	genant: 'bg-warning-light text-warning-deep',
	mineur: 'bg-surface-secondary text-text-muted',
};

export const STATUS_BADGE_CLASSES: Record<FeedbackStatus, string> = {
	nouveau: 'bg-surface-secondary text-text',
	a_actionner: 'bg-warning-light text-warning-deep',
	traite: 'bg-success-light text-success-deep',
	logge: 'bg-info-light text-info-deep',
};

export const TYPE_ICONS: Record<FeedbackType, string> = {
	bug: 'bug_report',
	suggestion: 'lightbulb',
	question: 'help_outline',
};
