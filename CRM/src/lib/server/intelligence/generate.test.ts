import { describe, it, expect } from 'vitest';
import {
	callModelWithOverflowRetry,
	callModelResumingPauses,
	type GenerateInput
} from './generate';
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

function fakeMessage(stop_reason: string, thinkingTokens?: number, content: unknown[] = []) {
	return {
		content,
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

type CapturedRequest = { max_tokens: number; messages: { role: string; content: unknown }[] };

// Faux client : capture max_tokens + messages de chaque appel, renvoie les messages
// dans l'ordre (le dernier est répété si on dépasse, mais on n'attend jamais ce cas).
function fakeClient(messages: unknown[], captured: CapturedRequest[]) {
	let i = 0;
	return {
		messages: {
			stream(opts: CapturedRequest) {
				captured.push({ max_tokens: opts.max_tokens, messages: opts.messages });
				const msg = messages[Math.min(i, messages.length - 1)];
				i++;
				return { finalMessage: async () => msg };
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

const maxTokensOf = (captured: CapturedRequest[]) => captured.map((c) => c.max_tokens);

describe('callModelWithOverflowRetry (fix racine max_tokens)', () => {
	it('un seul appel à 64K quand le modèle ne déborde pas', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient([fakeMessage('tool_use')], captured);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		expect(msg.stop_reason).toBe('tool_use');
		expect(maxTokensOf(captured)).toEqual([64000]);
		// Un seul appel réel facturé.
		expect(tracker.summary().breakdown).toHaveLength(1);
	});

	it('relance à 128K si le 1er appel à 64K est coupé par max_tokens, puis réussit', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient([fakeMessage('max_tokens', 50000), fakeMessage('tool_use')], captured);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		expect(msg.stop_reason).toBe('tool_use');
		// 64K d'abord, PUIS 128K (plafond Opus 4.8).
		expect(maxTokensOf(captured)).toEqual([64000, 128000]);
		// Les DEUX appels réels sont facturés (le 1er, coûteux en web_search, l'est
		// même s'il a débordé).
		expect(tracker.summary().breakdown).toHaveLength(2);
	});

	it('rend le message tronqué (stop_reason=max_tokens) si ça déborde même à 128K', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient([fakeMessage('max_tokens'), fakeMessage('max_tokens')], captured);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		// L'appelant (generateIntelligenceReport) traduira ce stop_reason en échec
		// explicite « semaine exceptionnellement dense ».
		expect(msg.stop_reason).toBe('max_tokens');
		expect(maxTokensOf(captured)).toEqual([64000, 128000]);
	});

	it('relance AU PLUS une fois (jamais de 3e appel)', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient(
			[fakeMessage('max_tokens'), fakeMessage('max_tokens'), fakeMessage('tool_use')],
			captured
		);
		const tracker = new CostTracker();
		await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		// Exactement 2 appels : pas de boucle infinie de relance.
		expect(maxTokensOf(captured)).toEqual([64000, 128000]);
	});
});

describe('callModelResumingPauses (fix racine pause_turn, échec W27 2026-07-03)', () => {
	const searchBlock = { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search' };
	const resultBlock = { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1' };
	const emitBlock = { type: 'tool_use', id: 'toolu_1', name: 'emit_report', input: {} };

	it('reprend après pause_turn en renvoyant le contenu assistant VERBATIM, sans message user ajouté', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient(
			[
				fakeMessage('pause_turn', undefined, [searchBlock, resultBlock]),
				fakeMessage('tool_use', undefined, [emitBlock])
			],
			captured
		);
		const tracker = new CostTracker();
		const msg = await callModelResumingPauses(
			client,
			input,
			themes,
			sources,
			64000,
			tracker,
			'Claude veille (1-phase)'
		);
		expect(msg.stop_reason).toBe('tool_use');
		expect(captured).toHaveLength(2);
		// 1er appel : uniquement le message user.
		expect(captured[0].messages.map((m) => m.role)).toEqual(['user']);
		// Reprise : user + assistant (contenu du segment pausé, verbatim), RIEN d'autre
		// (doc : « Do NOT add an extra user message like "Continue." »).
		expect(captured[1].messages.map((m) => m.role)).toEqual(['user', 'assistant']);
		expect(captured[1].messages[1].content).toEqual([searchBlock, resultBlock]);
		// Les DEUX appels réels sont facturés.
		expect(tracker.summary().breakdown).toHaveLength(2);
	});

	it('fusionne le contenu de tous les segments (ground truth URLs des recherches pré-pause conservée)', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient(
			[
				fakeMessage('pause_turn', undefined, [searchBlock, resultBlock]),
				fakeMessage('tool_use', undefined, [emitBlock])
			],
			captured
		);
		const msg = await callModelResumingPauses(
			client,
			input,
			themes,
			sources,
			64000,
			new CostTracker(),
			'x'
		);
		// extractSearchResultUrls (aval) doit voir les web_search_tool_result du
		// segment pausé ET l'emit_report du segment final.
		expect(msg.content).toEqual([searchBlock, resultBlock, emitBlock]);
	});

	it('borne dure : au plus 6 reprises, puis rend le message pause_turn tel quel', async () => {
		const captured: CapturedRequest[] = [];
		const paused = fakeMessage('pause_turn', undefined, [searchBlock]);
		const client = fakeClient(Array(20).fill(paused), captured);
		const msg = await callModelResumingPauses(
			client,
			input,
			themes,
			sources,
			64000,
			new CostTracker(),
			'x'
		);
		// 1 appel initial + 6 reprises max = 7 appels, jamais plus.
		expect(captured).toHaveLength(7);
		// L'appelant traduira en échec explicite (emit_report absent).
		expect(msg.stop_reason).toBe('pause_turn');
	});

	it('interplay max_tokens : une pause pendant la relance 128K est reprise aussi', async () => {
		const captured: CapturedRequest[] = [];
		const client = fakeClient(
			[
				fakeMessage('max_tokens'),
				fakeMessage('pause_turn', undefined, [searchBlock, resultBlock]),
				fakeMessage('tool_use', undefined, [emitBlock])
			],
			captured
		);
		const tracker = new CostTracker();
		const msg = await callModelWithOverflowRetry(client, input, themes, sources, tracker);
		expect(msg.stop_reason).toBe('tool_use');
		// 64K (déborde) → 128K (pause) → 128K (reprise, même fenêtre).
		expect(maxTokensOf(captured)).toEqual([64000, 128000, 128000]);
		expect(tracker.summary().breakdown).toHaveLength(3);
	});
});
