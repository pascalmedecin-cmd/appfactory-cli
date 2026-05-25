export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted';
export type DominantBand = 'coeur' | 'bonus' | 'eviter' | 'neutral';
export type ActionVariant = 'primary' | 'neutral' | 'danger';
export type ScorePillLabel = 'chaud' | 'tiède' | 'froid' | 'unscored';

export interface MobileEntityCardAction {
	icon: string;
	label: string;
	href?: string;
	onClick?: () => void;
	variant?: ActionVariant;
}

export interface MobileEntityCardBadge {
	label: string;
	variant: BadgeVariant;
}

const VALID_DOMINANTS: ReadonlySet<DominantBand> = new Set([
	'coeur',
	'bonus',
	'eviter',
	'neutral',
]);

type ScorePillModifier = 'chaud' | 'tiede' | 'froid' | 'unscored';

export function scorePillModifier(label: ScorePillLabel): ScorePillModifier {
	return label === 'tiède' ? 'tiede' : label;
}

export function scorePillClass(label: ScorePillLabel): string {
	return `signal-score-pill signal-score-pill--${scorePillModifier(label)}`;
}

export function scorePillTitle(value: number): string {
	return `Score ${value}`;
}

export function actionVariant(variant?: ActionVariant): ActionVariant {
	return variant ?? 'neutral';
}

export function shouldInvokeOnClick(action: Partial<MobileEntityCardAction>): boolean {
	return !action.href;
}

export function isValidDominant(value: unknown): value is DominantBand {
	return typeof value === 'string' && VALID_DOMINANTS.has(value as DominantBand);
}
