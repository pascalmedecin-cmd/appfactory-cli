import { describe, it, expect } from 'vitest';
import { motifArchivage } from './+server';

describe('motifArchivage', () => {
	it('archive les entreprises CANCELLED', () => {
		expect(motifArchivage('CANCELLED')).toBe('Radiée du registre du commerce (Zefix)');
	});

	it('archive les entreprises NOT_FOUND', () => {
		expect(motifArchivage('NOT_FOUND')).toBe('Introuvable dans Zefix');
	});

	it('conserve les entreprises ACTIVE', () => {
		expect(motifArchivage('ACTIVE')).toBeNull();
	});

	it('conserve sur status inconnu ou null', () => {
		expect(motifArchivage(null)).toBeNull();
		expect(motifArchivage('UNKNOWN')).toBeNull();
	});
});
