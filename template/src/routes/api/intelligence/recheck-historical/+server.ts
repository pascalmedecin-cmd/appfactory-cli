import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { verifyUrl } from '$lib/server/intelligence/url-verify';
import type { IntelligenceItem } from '$lib/server/intelligence/schema';

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

type HiddenEntry = { rank: number; reason: string; hidden_at: string };

/**
 * One-shot (à déclencher manuellement post-déploiement) : parcourt toutes
 * les éditions en DB, revérifie les URLs des items, et ajoute au tableau
 * `items_hidden` les items dont la source ne répond plus (url_dead_retroactive_check).
 *
 * Idempotent : les items déjà masqués ne sont pas retouchés.
 */
export async function POST({ request }: RequestEvent) {
	if (!verifyCronSecret(request.headers.get('authorization'))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = createSupabaseServiceClient();

	const { data: reports, error: selectErr } = await supabase
		.from('intelligence_reports')
		.select('id, week_label, items, items_hidden')
		.eq('status', 'published');

	if (selectErr || !reports) {
		return json({ error: 'select_failed', detail: selectErr?.message }, { status: 500 });
	}

	const hiddenAt = new Date().toISOString();
	const summary: Array<{ week: string; checked: number; newly_hidden: number }> = [];

	for (const report of reports) {
		const items = (report.items ?? []) as IntelligenceItem[];
		const alreadyHidden = (report.items_hidden ?? []) as HiddenEntry[];
		const alreadyHiddenRanks = new Set(alreadyHidden.map((h) => h.rank));

		const results = await Promise.all(
			items.map(async (it) => {
				if (alreadyHiddenRanks.has(it.rank)) return null;
				const res = await verifyUrl(it.source.url);
				if (!res.ok) {
					return {
						rank: it.rank,
						reason: `url_dead_retroactive_check:${res.reason ?? 'unknown'}`,
						hidden_at: hiddenAt
					} satisfies HiddenEntry;
				}
				return null;
			})
		);

		const newlyHidden = results.filter((r): r is HiddenEntry => r !== null);
		if (newlyHidden.length > 0) {
			const merged = [...alreadyHidden, ...newlyHidden];
			const { error: upErr } = await supabase
				.from('intelligence_reports')
				.update({ items_hidden: merged })
				.eq('id', report.id);
			if (upErr) {
				return json(
					{ error: 'update_failed', report_id: report.id, detail: upErr.message },
					{ status: 500 }
				);
			}
		}

		summary.push({
			week: report.week_label,
			checked: items.length - alreadyHiddenRanks.size,
			newly_hidden: newlyHidden.length
		});
	}

	return json({ ok: true, summary });
}
