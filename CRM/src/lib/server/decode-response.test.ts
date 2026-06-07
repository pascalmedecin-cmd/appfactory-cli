import { describe, it, expect } from 'vitest';
import { decodeResponseText, parseJsonResilient } from './decode-response';

/**
 * Cause racine du mojibake Zefix (LIVE-M3) : SOGC renvoie du Windows-1252/Latin-1, mais
 * `resp.json()` force UTF-8 -> accents détruits en U+FFFD. Ces tests prouvent que le
 * décodage tolérant restitue les accents (octets legacy) sans casser l'UTF-8 valide.
 * Oracle data-indépendant : pas d'appel réseau, octets construits à la main.
 */

function resOf(bytes: number[]): Response {
	return new Response(new Uint8Array(bytes));
}

describe('decodeResponseText', () => {
	it('UTF-8 valide (accents inclus) : renvoyé inchangé, pas de fallback', async () => {
		const bytes = [...new TextEncoder().encode('Rôtisserie Câblé é à ö')];
		expect(await decodeResponseText(resOf(bytes))).toBe('Rôtisserie Câblé é à ö');
	});

	it('ASCII pur : inchangé', async () => {
		expect(await decodeResponseText(resOf([0x68, 0x69]))).toBe('hi');
	});

	it('Windows-1252/Latin-1 « Rôtisserie » (ô = 0xF4) : accent restitué via fallback', async () => {
		const bytes = [0x52, 0xf4, 0x74, 0x69, 0x73, 0x73, 0x65, 0x72, 0x69, 0x65];
		expect(await decodeResponseText(resOf(bytes))).toBe('Rôtisserie');
	});

	it('cas réel « Sàrl » (à = 0xE0) : restitué (pas de U+FFFD)', async () => {
		const out = await decodeResponseText(resOf([0x53, 0xe0, 0x72, 0x6c]));
		expect(out).toBe('Sàrl');
		expect(out).not.toContain('�');
	});
});

describe('parseJsonResilient', () => {
	it('JSON UTF-8 valide', async () => {
		const bytes = [...new TextEncoder().encode('{"nom":"Café Léa"}')];
		expect(await parseJsonResilient(resOf(bytes))).toEqual({ nom: 'Café Léa' });
	});

	it('JSON Latin-1 (octets accents bruts â=0xE2 é=0xE9) : accents restitués', async () => {
		// {"nom":"Pâté"}
		const bytes = [0x7b, 0x22, 0x6e, 0x6f, 0x6d, 0x22, 0x3a, 0x22, 0x50, 0xe2, 0x74, 0xe9, 0x22, 0x7d];
		expect(await parseJsonResilient(resOf(bytes))).toEqual({ nom: 'Pâté' });
	});
});
