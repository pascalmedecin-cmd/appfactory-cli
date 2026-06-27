export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted';
export type DominantBand = 'coeur' | 'bonus' | 'eviter' | 'neutral';
export type ActionVariant = 'primary' | 'neutral' | 'danger';

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

export function actionVariant(variant?: ActionVariant): ActionVariant {
	return variant ?? 'neutral';
}

export function shouldInvokeOnClick(action: Partial<MobileEntityCardAction>): boolean {
	return !action.href;
}

export function isValidDominant(value: unknown): value is DominantBand {
	return typeof value === 'string' && VALID_DOMINANTS.has(value as DominantBand);
}
