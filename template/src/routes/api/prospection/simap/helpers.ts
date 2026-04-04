export interface Translation {
	de?: string;
	fr?: string;
	it?: string;
	en?: string;
}

export function translate(t: Translation | string | null | undefined): string {
	if (!t) return '';
	if (typeof t === 'string') return t;
	return t.fr || t.de || t.en || t.it || '';
}

export const CANTON_MAP: Record<string, string> = {
	GE: 'GE', VD: 'VD', VS: 'VS', NE: 'NE', FR: 'FR', JU: 'JU',
};

export function cantonToLead(canton: string | null | undefined): string {
	if (!canton) return 'Autre';
	return CANTON_MAP[canton] ?? 'Autre';
}
