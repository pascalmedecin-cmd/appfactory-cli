// Bloc 4 : Endpoint auto-exécution prospection depuis un chip Veille structuré.
// Reçoit {chip, item_id, report_id} depuis la UI /veille, route vers l'endpoint
// SIMAP ou Zefix selon chip.kind, propage la traçabilité (source_intelligence_id/term).
// Retourne le résultat d'import + URL de redirection /prospection avec filtres pré-appliqués.

import { json, type RequestEvent } from '@sveltejs/kit';
import { buildRedirect } from '$lib/server/intelligence/chip-redirect';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';
import { chipKindLabel } from '$lib/utils/veilleFormat';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANTON_SET = new Set(['GE', 'VD', 'VS', 'NE', 'FR', 'JU']);
// Phase F : regbl ajouté. search_ch absent volontairement (enrichissement par lead_id,
// pas un import à partir d'une requête → incompatible avec un chip auto-exécutable).
const KIND_SET = new Set(['simap', 'zefix', 'regbl']);

interface FromIntelligencePayload {
	chip: { kind: string; canton: string; query: string; label?: string };
	report_id: string;
	item_rank?: number;
}

export const POST = async ({ request, locals, fetch }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	let body: FromIntelligencePayload;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Payload JSON invalide' }, { status: 400 });
	}

	// Validation chip
	const chip = body?.chip;
	if (!chip || typeof chip !== 'object') {
		return json({ error: 'chip manquant' }, { status: 400 });
	}
	if (!KIND_SET.has(chip.kind)) {
		return json({ error: `kind invalide (attendu: simap|zefix|regbl)` }, { status: 400 });
	}
	// Defense-in-depth (Bloc C, 2026-06-26) : refuser tôt un chip dont la source cible
	// est dormante (RegBL/SIMAP coupées en V5). Sans ce garde, le round-trip interne vers
	// /api/prospection/{simap,regbl} renvoie quand même 403, mais avec un appel réseau
	// gaspillé et un message générique. L'UI ne propose plus le bouton « Lancer » pour
	// ces chips (isChipExecutable) ; ceci ferme le contrat côté serveur. Réversible :
	// réactiver la source dans config.ts rallume l'auto-exécution.
	if (!isProspectionSourceEnabled(chip.kind)) {
		return json(
			{ error: `Source "${chipKindLabel(chip.kind)}" désactivée - copier le terme et rechercher manuellement.` },
			{ status: 403 }
		);
	}
	if (!CANTON_SET.has(chip.canton)) {
		return json({ error: `canton invalide (attendu: GE|VD|VS|NE|FR|JU)` }, { status: 400 });
	}
	const query = typeof chip.query === 'string' ? chip.query.trim() : '';
	if (query.length < 2 || query.length > 120) {
		return json({ error: 'query doit faire 2 à 120 caractères' }, { status: 400 });
	}

	// Validation traçabilité
	const reportId = typeof body.report_id === 'string' && UUID_RE.test(body.report_id) ? body.report_id : null;
	if (!reportId) {
		return json({ error: 'report_id UUID requis' }, { status: 400 });
	}
	const fromTerm = (chip.label ?? query).slice(0, 200);

	// Routage vers endpoint interne SIMAP / Zefix / RegBL via event.fetch (préserve cookies auth).
	if (chip.kind === 'simap') {
		const simapBody = {
			canton: chip.canton,
			search: query,
			daysBack: 90,
			from_intelligence: reportId,
			from_term: fromTerm,
			from_item_rank: body.item_rank ?? null
		};
		const resp = await fetch('/api/prospection/simap', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(simapBody)
		});
		const data = await resp.json();
		if (!resp.ok) {
			return json({ error: data?.error ?? `SIMAP HTTP ${resp.status}` }, { status: resp.status });
		}
		return json({
			kind: 'simap',
			canton: chip.canton,
			query,
			imported: data.imported ?? 0,
			skipped: data.skipped ?? 0,
			message: data.message ?? '',
			redirect: buildRedirect('simap', chip.canton, reportId, fromTerm)
		});
	}

	if (chip.kind === 'regbl') {
		// RegBL : query = libellé textuel (ex : "chantiers Lausanne"). L'endpoint
		// regbl filtre par canton uniquement (pas de recherche full-text). On passe
		// quand même from_term pour la traçabilité dans prospect_leads.
		const regblBody = {
			cantons: [chip.canton],
			limit: 50,
			from_intelligence: reportId,
			from_term: fromTerm,
			from_item_rank: body.item_rank ?? null
		};
		const resp = await fetch('/api/prospection/regbl', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(regblBody)
		});
		const data = await resp.json();
		if (!resp.ok) {
			return json({ error: data?.error ?? `RegBL HTTP ${resp.status}` }, { status: resp.status });
		}
		return json({
			kind: 'regbl',
			canton: chip.canton,
			query,
			imported: data.imported ?? 0,
			skipped: data.skipped ?? 0,
			message: data.message ?? '',
			redirect: buildRedirect('regbl', chip.canton, reportId, fromTerm)
		});
	}

	// Zefix : query = nom d'entreprise.
	const zefixBody = {
		canton: chip.canton,
		name: query,
		activeOnly: true,
		limit: 100,
		from_intelligence: reportId,
		from_term: fromTerm,
		from_item_rank: body.item_rank ?? null
	};
	const resp = await fetch('/api/prospection/zefix', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(zefixBody)
	});
	const data = await resp.json();
	if (!resp.ok) {
		return json({ error: data?.error ?? `Zefix HTTP ${resp.status}` }, { status: resp.status });
	}
	return json({
		kind: 'zefix',
		canton: chip.canton,
		query,
		imported: data.imported ?? 0,
		skipped: data.skipped ?? 0,
		message: data.message ?? '',
		redirect: buildRedirect('zefix', chip.canton, reportId, fromTerm)
	});
};

