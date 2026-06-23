import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import {
	normalizeStoredChips,
	buildDefaultChips,
	type SearchChip
} from '$lib/server/intelligence/chip-normalize';
import type { IntelligenceItem } from '$lib/server/intelligence/schema';
import { readReportItems } from '$lib/server/intelligence/report-items';
import { isAllowedThemeSlug } from '$lib/server/intelligence/theme-slug';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { verifyUrl } from '$lib/server/intelligence/url-verify';
import { sanitizeUrl } from '$lib/server/intelligence/url-sanitize';
import { isDeniedSource } from '$lib/server/intelligence/source-allowlist';
import { listActiveThemes } from '$lib/server/intelligence/themes-repository';
import { stripCitationTags } from '$lib/server/intelligence/strip-citations';
import { dedashItem } from '$lib/server/intelligence/dedash';

/**
 * Agrégat de chips structurés à partir des items, avec rappel du signal source.
 * Source unique pour la section « Termes générés / À lancer dans Prospection »
 * de la page détail. Remplace le champ legacy `report.search_terms` (toujours
 * vide depuis refonte LEAN S111).
 */
export type AggregatedChip = {
	chip: SearchChip;
	item_rank: number;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();

	const { data: report, error: dbErr } = await locals.supabase
		.from('intelligence_reports')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (dbErr || !report) {
		throw error(404, 'Édition introuvable');
	}

	// Auto-mark as read pour l'user qui ouvre le détail
	if (user) {
		await locals.supabase
			.from('intelligence_reads')
			.upsert(
				{ user_id: user.id, report_id: report.id },
				{ onConflict: 'user_id,report_id', ignoreDuplicates: true }
			);
	}

	// Agrégation chips items → liste flat dédupliquée. Chaque chip porte le rang
	// du signal source (utile pour l'auto-exécution prospection + traçabilité).
	// Audit 360 M-19 : items lus via readReportItems (validation Zod au boundary).
	const items = readReportItems(report.items, report.id) as Array<
		IntelligenceItem & { search_terms?: unknown }
	>;
	const aggregatedChips: AggregatedChip[] = [];
	const seen = new Set<string>();
	for (const it of items) {
		const chips = normalizeStoredChips(it.search_terms);
		for (const c of chips) {
			const key = `${c.kind}|${c.canton}|${c.query.toLowerCase()}`;
			if (seen.has(key)) continue;
			seen.add(key);
			aggregatedChips.push({ chip: c, item_rank: it.rank });
		}
	}

	// Thèmes actifs pour le dropdown du modal "Ajouter un item".
	const activeThemes = await listActiveThemes(locals.supabase);

	return { report, aggregatedChips, activeThemes };
};

// Schema validation pour ajout manuel item. Champs minimaux : on génère le
// chip search_terms côté serveur (1 Zefix VD basé sur le titre) pour ne pas
// surcharger l'UX.
const ManualItemSchema = z.object({
	title: z.string().min(10).max(200),
	summary: z.string().min(40).max(1500),
	filmpro_relevance: z.string().min(20).max(1200),
	// Defense-in-depth (audit 360 V3b L-05) : .url() seul accepte javascript:/ftp:/data:
	// — on resserre au schéma http(s). La vraie garde reste sanitizeUrl + verifyUrl ci-dessous.
	url: z.string().url().regex(/^https?:\/\//i, 'URL doit commencer par http:// ou https://').max(2000),
	source_name: z.string().min(2).max(120),
	// Audit 360 M-18 : `.max()` en amont du regex.
	published_at: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
	theme: z.string().min(1).max(64),
	segment: z.enum(['tertiaire', 'residentiel', 'commerces', 'erp', 'partenaires']),
	geo_scope: z.enum(['suisse_romande', 'suisse', 'monde']),
	maturity: z.enum(['emergent', 'etabli', 'speculatif']),
	actionability: z.enum(['action_directe', 'veille_active', 'a_surveiller'])
});

function flattenIssues(issues: z.ZodIssue[]): string {
	return issues.map((i) => `${i.path.join('.') || '_'}: ${i.message}`).join(' | ');
}

export const actions: Actions = {
	addItem: async ({ params, request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const input = {
			title: String(fd.get('title') ?? '').trim(),
			summary: String(fd.get('summary') ?? '').trim(),
			filmpro_relevance: String(fd.get('filmpro_relevance') ?? '').trim(),
			url: String(fd.get('url') ?? '').trim(),
			source_name: String(fd.get('source_name') ?? '').trim(),
			published_at: String(fd.get('published_at') ?? '').trim(),
			theme: String(fd.get('theme') ?? '').trim(),
			segment: String(fd.get('segment') ?? '').trim(),
			geo_scope: String(fd.get('geo_scope') ?? '').trim(),
			maturity: String(fd.get('maturity') ?? 'etabli').trim(),
			actionability: String(fd.get('actionability') ?? 'veille_active').trim()
		};

		const parsed = ManualItemSchema.safeParse(input);
		if (!parsed.success) {
			return fail(400, { error: flattenIssues(parsed.error.issues), values: input });
		}

		// Validation thème : doit être un slug actif en DB (audit 360 M-22 : helper partagé).
		const activeThemes = await listActiveThemes(locals.supabase);
		if (!isAllowedThemeSlug(parsed.data.theme, activeThemes.map((t) => t.slug))) {
			return fail(400, { error: `Thème "${parsed.data.theme}" inconnu ou inactif`, values: input });
		}

		// Pipeline anti-hallucination minimal pour ajout manuel :
		// (1) sanitize URL, (2) verifyUrl bloquant (404, paywall, timeout), (3) denied source.
		// Cross-check verbatim LLM non appliqué (Pascal valide manuellement le contenu).
		const { cleaned: cleanUrl } = sanitizeUrl(parsed.data.url);

		try {
			const hostname = new URL(cleanUrl).hostname.replace(/^www\./, '');
			if (isDeniedSource(hostname)) {
				return fail(400, { error: `Source "${hostname}" en denylist`, values: input });
			}
		} catch {
			return fail(400, { error: 'URL invalide après sanitize', values: input });
		}

		const verify = await verifyUrl(cleanUrl);
		if (!verify.ok) {
			const status = 'status' in verify ? ` (HTTP ${verify.status})` : '';
			return fail(400, {
				error: `URL inaccessible (${verify.reason}${status})`,
				values: input
			});
		}

		// Audit 360 V2b H-09 : optimistic locking sur items JSONB pour éviter
		// les lost updates si 2 admins ajoutent un item en parallèle. Migration
		// 20260510_006 a ajouté `version INTEGER NOT NULL DEFAULT 0`. Algorithme :
		//   1. SELECT items, version
		//   2. UPDATE items=..., version=version+1 WHERE id=$id AND version=$old
		//   3. Si UPDATE retourne 0 lignes → conflit, retry max 3 fois
		const service = createSupabaseServiceClient();
		const MAX_RETRIES = 3;
		let attempt = 0;
		let lastError: string | null = null;
		let createdRank: number | null = null;

		while (attempt < MAX_RETRIES) {
			attempt++;

			// Cast `as never`/`as unknown` : la colonne `version` est ajoutée par
			// migration 20260510_006 ; les types Database générés ne la connaissent
			// pas encore. Tracé pour regen post-merge.
			const { data: report, error: dbErr } = await service
				.from('intelligence_reports')
				.select('id, items, version' as 'id, items')
				.eq('id', params.id)
				.maybeSingle();
			if (dbErr || !report) {
				return fail(404, { error: 'Édition introuvable', values: input });
			}

			const reportRow = report as unknown as { id: string; items: unknown; version?: number };
			const currentItems = (reportRow.items ?? []) as IntelligenceItem[];
			const currentVersion = reportRow.version ?? 0;

			// Audit 360 V2b bug-hunter F1 : cap rank=15 ne suffit pas en présence
			// de plusieurs writers concurrents. `min(maxRank+1, 15)` causerait des
			// collisions de rank quand items.length >= 15 (l'optimistic locking
			// empêche les lost updates de version mais pas les ranks dupliqués
			// dans le JSONB). Garde explicite : refuser l'ajout au-delà de 15.
			if (currentItems.length >= 15) {
				return fail(409, {
					error: 'Édition saturée (15 items max). Cachez un item existant avant d\'en ajouter un nouveau.',
					values: input
				});
			}

			const maxRank = currentItems.reduce((acc, it) => Math.max(acc, it.rank ?? 0), 0);
			const newRank = maxRank + 1;

			// Dedash déterministe (tirets typographiques) appliqué après strip <cite>,
			// cohérent avec le chemin de génération auto (cf. dedash.ts).
			const newItem: IntelligenceItem = dedashItem({
				rank: newRank,
				title: parsed.data.title,
				summary: stripCitationTags(parsed.data.summary),
				filmpro_relevance: stripCitationTags(parsed.data.filmpro_relevance),
				maturity: parsed.data.maturity,
				theme: parsed.data.theme,
				geo_scope: parsed.data.geo_scope,
				source: {
					name: parsed.data.source_name,
					url: cleanUrl,
					published_at: `${parsed.data.published_at}T00:00:00Z`
				},
				deep_dive: null,
				segment: parsed.data.segment,
				actionability: parsed.data.actionability,
				search_terms: buildDefaultChips(parsed.data.title)
			});

			const updatedItems = [...currentItems, newItem].sort((a, b) => a.rank - b.rank);

			const { data: updated, error: updateErr } = await service
				.from('intelligence_reports')
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- les types Supabase générés
				// ne couvrent pas la colonne `items` JSONB ni `version` (drift typegen, [WATCH] V3a regen) ;
				// `as never` + `as any` jusqu'au prochain `supabase gen types` (audit 360 V3b L-20).
				.update({ items: updatedItems as any, version: currentVersion + 1 } as never)
				.eq('id', params.id)
				.eq('version' as 'id', currentVersion as unknown as string)
				.select('id');

			if (updateErr) {
				console.error('[veille addItem]', updateErr.message);
				return fail(500, { error: 'Erreur DB', values: input });
			}

			if (updated && updated.length > 0) {
				createdRank = newRank;
				break;
			}

			lastError = `version conflict (attempt ${attempt}/${MAX_RETRIES})`;
		}

		if (createdRank === null) {
			console.error('[veille addItem] optimistic locking exhausted:', lastError);
			return fail(409, {
				error: 'Conflit de version : un autre utilisateur a modifié cette édition. Rechargez la page.',
				values: input
			});
		}

		return { success: true, message: `Item "${parsed.data.title}" ajouté (rang ${createdRank}).` };
	}
};
