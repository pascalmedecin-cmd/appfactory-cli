import { describe, it, expect } from 'vitest';
import { _motifArchivage } from './+server';

describe('_motifArchivage', () => {
	it('archive les entreprises CANCELLED', () => {
		expect(_motifArchivage('CANCELLED')).toBe('Radiée du registre du commerce (Zefix)');
	});

	it('archive les entreprises NOT_FOUND', () => {
		expect(_motifArchivage('NOT_FOUND')).toBe('Introuvable dans Zefix');
	});

	it('conserve les entreprises ACTIVE', () => {
		expect(_motifArchivage('ACTIVE')).toBeNull();
	});

	it('conserve sur status inconnu ou null', () => {
		expect(_motifArchivage(null)).toBeNull();
		expect(_motifArchivage('UNKNOWN')).toBeNull();
	});
});
