import { describe, it, expect } from 'vitest';
import { callModelWithOverflowRetry, type GenerateInput } from './generate';
import { getFallbackBundle } from './theme-loader';
import { getFallbackSourcesBundle } from './sources-loader';
import { CostTracker } from './cost-tracker';

// Tests ciblés de la logique de relance max_tokens (Bloc 1, fix racine débordement
// 2026-06-19). On injecte un client Anthropic FACTICE : callModel fait
// `client.messages.stream(opts).finalMessage()`, donc un faux client suffit à
// piloter stop_reason + capturer le max_tokens demandé à chaque appel. Zéro réseau.

const themes = getFallbackBundle();
const sources = getFallbackSourcesBundle();
const input: GenerateInput = {
	weekLabel: '2026-W25',
	dateStart: '2026-06-15',
	dateEnd: '2026-06-21',
	windowStart: '2026-04-16',
	windowDays: 60,
	previousItems: []
};

function fakeMessage(stop_reason: string, thinkingTokens?: number) {
	return {
		content: [],
		stop_reason,
		usage: {
			input_tokens: 100,
			output_tokens: 200,
			...(thinkingTokens != null
				? { output_tokens_details: { thinking_tokens: thinkingTokens } }
				: {})
		}
	};
}

// Faux client : capture le max_tokens de chaque appel, renvoie les messages dans
// l'ordre (le dernier est répété si on dépasse, mais on n'attend jamais ce cas).
function fakeClient(messages: unknown[], capturedMaxTokens: number[]) {
	let i = 0;
	return {
		messages: {
			stream(opts: { max_tokens: number }) {
				capturedMaxTokens.push(opts.max_tokens);
				const msg = messages[Math.min(i, messages.length - 1)];
				i++;
				return { finalMessage: async () => msg };
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe('callModelWithOverflowRetry (fix racine max_tokens)', () => {
	it('un seul appel à 64K quand le modèle ne déborde pas', async () => {
		const captured: number[] = [];
		const client = fakeClient([fakeMessage('tool_use')], captured);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		expect(msg.stop_reason).toBe('tool_use');
		expect(captured).toEqual([64000]);
		// Un seul appel réel facturé.
		expect(tracker.summary().breakdown).toHaveLength(1);
	});

	it('relance à 128K si le 1er appel à 64K est coupé par max_tokens, puis réussit', async () => {
		const captured: number[] = [];
		const client = fakeClient([fakeMessage('max_tokens', 50000), fakeMessage('tool_use')], captured);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		expect(msg.stop_reason).toBe('tool_use');
		// 64K d'abord, PUIS 128K (plafond Opus 4.8).
		expect(captured).toEqual([64000, 128000]);
		// Les DEUX appels réels sont facturés (le 1er, coûteux en web_search, l'est
		// même s'il a débordé).
		expect(tracker.summary().breakdown).toHaveLength(2);
	});

	it('rend le message tronqué (stop_reason=max_tokens) si ça déborde même à 128K', async () => {
		const captured: number[] = [];
		const client = fakeClient([fakeMessage('max_tokens'), fakeMessage('max_tokens')], captured);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		// L'appelant (generateIntelligenceReport) traduira ce stop_reason en échec
		// explicite « semaine exceptionnellement dense ».
		expect(msg.stop_reason).toBe('max_tokens');
		expect(captured).toEqual([64000, 128000]);
	});

	it('relance AU PLUS une fois (jamais de 3e appel)', async () => {
		const captured: number[] = [];
		const client = fakeClient(
			[fakeMessage('max_tokens'), fakeMessage('max_tokens'), fakeMessage('tool_use')],
			captured
		);
		const tracker = new CostTracker();
		await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		// Exactement 2 appels : pas de boucle infinie de relance.
		expect(captured).toEqual([64000, 128000]);
	});
});
