import { describe, it, expect } from 'vitest';
import { narrowComplianceTag } from './signal-lookup';

describe('narrowComplianceTag (audit 360 V3b L-14)', () => {
	it('conserve un tag de l’enum ComplianceTagEnum', () => {
		expect(narrowComplianceTag('OK FilmPro')).toBe('OK FilmPro');
		expect(narrowComplianceTag('Adjacent pertinent')).toBe('Adjacent pertinent');
		expect(narrowComplianceTag('À surveiller')).toBe('À surveiller');
		expect(narrowComplianceTag('Non exploitable')).toBe('Non exploitable');
	});

	it('renvoie null pour un tag inconnu / legacy / casse différente (pas de bonus de scoring sur valeur poubelle)', () => {
		expect(narrowComplianceTag('ok filmpro')).toBeNull();
		expect(narrowComplianceTag('Non-exhaustif')).toBeNull();
		expect(narrowComplianceTag('garbage')).toBeNull();
		expect(narrowComplianceTag('')).toBeNull();
	});

	it('renvoie null pour null / undefined', () => {
		expect(narrowComplianceTag(null)).toBeNull();
		expect(narrowComplianceTag(undefined)).toBeNull();
	});
});
