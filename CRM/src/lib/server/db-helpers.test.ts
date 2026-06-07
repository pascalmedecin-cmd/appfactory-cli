import { describe, it, expect } from 'vitest';
import { dbFail, escapeIlike } from './db-helpers';

/**
 * REG-01 cause 2 (message) : dbFail doit discriminer le code Postgres 23503
 * (foreign_key_violation) pour renvoyer un message explicite plutôt que le
 * générique « Erreur lors de l'operation ». Défense en profondeur : couvre tout
 * cas FK résiduel après la migration ON DELETE SET NULL.
 */
describe('dbFail', () => {
	it('retourne null quand il n y a pas d erreur', () => {
		expect(dbFail(null)).toBeNull();
	});

	it('renvoie fail(400, { success:false }) avec un message générique', () => {
		const r = dbFail({ message: 'boom' }) as { status: number; data: { success: boolean; error: string } };
		expect(r.status).toBe(400);
		expect(r.data.success).toBe(false);
		expect(r.data.error).toBe("Erreur lors de l'operation");
	});

	it('renvoie un message explicite sur violation de clé étrangère (23503)', () => {
		const r = dbFail({ message: 'update or delete on table violates foreign key', code: '23503' }) as {
			status: number;
			data: { success: boolean; error: string };
		};
		expect(r.status).toBe(400);
		expect(r.data.success).toBe(false);
		expect(r.data.error).not.toBe("Erreur lors de l'operation");
		expect(r.data.error.toLowerCase()).toContain('référencé');
	});

	it('garde le message générique pour les autres codes Postgres', () => {
		const r = dbFail({ message: 'dup', code: '23505' }) as { data: { error: string } };
		expect(r.data.error).toBe("Erreur lors de l'operation");
	});
});

describe('escapeIlike (régression)', () => {
	it('échappe les wildcards SQL', () => {
		expect(escapeIlike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
	});
});
