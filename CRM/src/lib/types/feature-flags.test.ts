import { describe, it, expect } from 'vitest';
import { readFeatureFlags, DEFAULT_FEATURE_FLAGS } from './feature-flags';

describe('readFeatureFlags - ffCrmListesV2 (Vague 2)', () => {
	it('défaut OFF quand metadata absent/null', () => {
		expect(readFeatureFlags(null).ffCrmListesV2).toBe(false);
		expect(readFeatureFlags(undefined).ffCrmListesV2).toBe(false);
		expect(readFeatureFlags({}).ffCrmListesV2).toBe(false);
		expect(DEFAULT_FEATURE_FLAGS.ffCrmListesV2).toBe(false);
	});

	it('ON uniquement si la claim est strictement === true', () => {
		expect(readFeatureFlags({ ff_crm_listes_v2: true }).ffCrmListesV2).toBe(true);
		// valeurs truthy non-booléennes → false (sécurité JWT, pas d'élévation accidentelle)
		expect(readFeatureFlags({ ff_crm_listes_v2: 'true' }).ffCrmListesV2).toBe(false);
		expect(readFeatureFlags({ ff_crm_listes_v2: 1 }).ffCrmListesV2).toBe(false);
		expect(readFeatureFlags({ ff_crm_listes_v2: false }).ffCrmListesV2).toBe(false);
	});

	it('isolation : activer listes_v2 ne touche pas les autres flags', () => {
		const f = readFeatureFlags({ ff_crm_listes_v2: true });
		expect(f.ffCrmMobileV2).toBe(false);
		expect(f.ffCrmMobileV3).toBe(false);
		expect(f.ffDecoupe).toBe(false);
	});

	it('coexiste avec les autres flags activés', () => {
		const f = readFeatureFlags({ ff_crm_listes_v2: true, ff_crm_mobile_v2: true, ff_decoupe: true });
		expect(f).toEqual({
			ffCrmMobileV2: true,
			ffCrmMobileV3: false,
			ffDecoupe: true,
			ffCrmListesV2: true,
			ffPageBandeau: false,
		});
	});
});

describe('readFeatureFlags - ffPageBandeau (Cohérence UI)', () => {
	it('défaut false (metadata absent ou vide)', () => {
		expect(readFeatureFlags(null).ffPageBandeau).toBe(false);
		expect(readFeatureFlags(undefined).ffPageBandeau).toBe(false);
		expect(readFeatureFlags({}).ffPageBandeau).toBe(false);
		expect(DEFAULT_FEATURE_FLAGS.ffPageBandeau).toBe(false);
	});

	it('true seulement si strictement === true', () => {
		expect(readFeatureFlags({ ff_page_bandeau: true }).ffPageBandeau).toBe(true);
		expect(readFeatureFlags({ ff_page_bandeau: 'true' }).ffPageBandeau).toBe(false);
		expect(readFeatureFlags({ ff_page_bandeau: 1 }).ffPageBandeau).toBe(false);
		expect(readFeatureFlags({ ff_page_bandeau: false }).ffPageBandeau).toBe(false);
	});

	it('isolation : activer le bandeau ne touche pas les autres flags', () => {
		const f = readFeatureFlags({ ff_page_bandeau: true });
		expect(f.ffCrmMobileV2).toBe(false);
		expect(f.ffCrmListesV2).toBe(false);
		expect(f.ffDecoupe).toBe(false);
	});
});
