import { generateIntelligenceReport } from './generate';
import { loadThemeBundle } from './theme-loader';
import { loadSourcesBundle } from './sources-loader';
import { crossCheckBatch } from './cross-check';
import { selectByMix } from './mix-select';
import { orderByFilmproImportance } from './relevance-net';
import { currentWeekRange, extendedWindowStart } from './week-utils';
import type { IntelligenceReport, IntelligenceItem } from './schema';
import type { PreviousItem } from './prompt';
import { sendRecapEmail } from './email-recap';
import { sendBriefEmail } from './email-brief';
import { applySignalsFromReport } from './apply-signals';
import { costTracker, CostTracker, type PersistMeta } from './cost-tracker';
import type { VeilleDeps } from './deps';
import { sanitizeForLog, sanitizeError } from './sanitize';
import { stripCitationsFromReport } from './strip-citations';
import { stripEnumArtifactsFromReport } from './strip-enum-artifacts';
import { dedashReport } from './dedash';
import type { Json } from '$lib/database.types';

type Supabase = VeilleDeps['supabase'];

export interface RunResult {
	ok: boolean;
	weekLabel: string;
	reportId?: string;
	skipped?: boolean;
	error?: string;
}

/** Seuil items en-dessous duquel on déclenche l'alerte « semaine creuse ». */
const SPARSE_WEEK_THRESHOLD = 2;
/** Seuil items en-dessous duquel on logge un warning low-volume (sans bloquer). */
const LOW_VOLUME_THRESHOLD = 8;
/**
 * Plafond items publiés par édition (anti-débordement post-filtrage). Relevé de 10
 * à 12 le 2026-06-23 (commentaire Pascal W25 #3 « ne pas capper artificiellement ») :
 * headroom pour qu'un 11e/12e signal réel et vérifié ne soit pas tronqué. NB : ce cap
 * n'a JAMAIS été la cause des semaines à 3 items (= déficit d'offre web_search, traité
 * par le Lot 3 sourcing), il borne seulement le scénario inverse (plus d'items vérifiés
 * que de places). Aucun effet sur l'anti-hallu, qui tourne en amont.
 */
const PUBLISHED_ITEMS_CAP = 12;
/** Texte placeholder écrit en DB lors du marquage running (évite NOT NULL sur executive_summary). */
const RUNNING_PLACEHOLDER = 'Run en cours, en attente de publication.';

/**
 * Construit l'identifiant naturel d'un run veille à partir du weekLabel et du
 * startedAt ISO. Le format est stable et UPSERT-able dans `cost_audit_runs`.
 * Exemple : weekLabel='2026-W19', startedAt='2026-05-09T08:13:42.000Z' →
 * 'veille-2026-W19-20260509-081342'.
 */
function buildVeilleRunId(weekLabel: string, startedAt: string): string {
	const compact = startedAt.replace(/[-:T.Z]/g, '').slice(0, 14);
	return `veille-${weekLabel}-${compact.slice(0, 8)}-${compact.slice(8, 14)}`;
}

/**
 * Persiste les coûts du run dans `cost_audit_runs`. Best-effort : un échec ici
 * ne casse jamais la publication (logge + continue). Idempotent via runId.
 */
async function persistRunCosts(
	supabase: Supabase,
	weekLabel: string,
	meta: PersistMeta,
	tracker: CostTracker = costTracker
): Promise<void> {
	try {
		const result = await tracker.persist(supabase as never, meta);
		if (!result.ok) {
			console.error(
				`[veille ${weekLabel}] cost_audit_runs persist failed: ${sanitizeForLog(result.error ?? 'unknown')}`
			);
		} else {
			logPhase(weekLabel, 'costs_persisted', {
				runId: meta.runId,
				status: meta.status
			});
		}
	} catch (e) {
		console.error(`[veille ${weekLabel}] cost_audit_runs persist exception: ${sanitizeError(e)}`);
	}
}

function logPhase(weekLabel: string, phase: string, extra?: Record<string, unknown>) {
	const ts = new Date().toISOString();
	let ctx = '';
	if (extra) {
		try {
			ctx = ` ${JSON.stringify(extra)}`;
		} catch (e) {
			// Garde-fou : référence circulaire ou BigInt dans extra ne doit jamais
			// faire échouer le run. Dégrader le log plutôt que crasher le pipeline.
			ctx = ` [stringify_failed: ${e instanceof Error ? e.message : String(e)}]`;
		}
	}
	console.log(`[veille ${weekLabel}] ${ts} phase=${phase}${ctx}`);
}

/**
 * Marque la semaine en cours `status=running` AU DÉMARRAGE, avant tout appel
 * coûteux. Une ligne `running` orpheline en DB = preuve factuelle qu'un run
 * a démarré et n'a pas atteint la phase de publication (timeout Vercel,
 * exception non capturée, kill SIGKILL). Sans cette trace, un échec amont
 * = aucune ligne en base, aucune alerte (incident W18 du 01/05/2026).
 *
 * Idempotent via UNIQUE(week_label) : si la ligne existe déjà (running de
 * tour précédent ou error), elle est écrasée. Si elle est `published`,
 * l'appelant a déjà court-circuité avant d'arriver ici (cf. idempotence run).
 */
async function markRunning(
	supabase: Supabase,
	weekLabel: string,
	startedAt: string
): Promise<void> {
	const { error } = await supabase
		.from('intelligence_reports')
		.upsert(
			{
				week_label: weekLabel,
				generated_at: startedAt,
				compliance_tag: 'Non exploitable',
				executive_summary: RUNNING_PLACEHOLDER,
				items: [],
				impacts_filmpro: [],
				search_terms: [],
				raw_response: null,
				status: 'running',
				error_message: null
			},
			{ onConflict: 'week_label' }
		);
	if (error) {
		// Ne propage PAS : on log mais on continue. Si le markRunning échoue, on
		// veut quand même tenter la génération. La pire perte = la trace running.
		// Sanitize obligatoire : ce log atterrit dans stdout du job GHA public.
		console.error(`[veille ${weekLabel}] markRunning failed: ${sanitizeForLog(error.message)}`);
	} else {
		logPhase(weekLabel, 'running_marked', { startedAt });
	}
}

/**
 * Upsert status=error avec message + envoi de l'email d'alerte échec.
 * Centralise la branche d'erreur historiquement dispersée dans run-generation.
 */
async function markError(
	supabase: Supabase,
	weekLabel: string,
	errorMessage: string,
	rawResponse: unknown,
	costs: Parameters<typeof sendRecapEmail>[0]['data'] extends { costs: infer C } ? C : never,
	emailConfig: VeilleDeps['email']
): Promise<string | undefined> {
	// Défense en profondeur : tronquer + masquer tout pattern API key / Bearer
	// résiduel avant stockage. La table intelligence_reports.error_message est
	// lisible par tout user authentifié (RLS authenticated_full_access). Patterns
	// centralisés dans `./sanitize` (réutilisés sur les chemins stdout aussi
	// depuis S167 Bloc #2 = repo public, logs GHA publics).
	const sanitized = sanitizeForLog(errorMessage);

	const { data: errRow } = await supabase
		.from('intelligence_reports')
		.upsert(
			{
				week_label: weekLabel,
				compliance_tag: 'Non exploitable',
				executive_summary: 'Génération échouée, voir error_message.',
				items: [] as Json,
				impacts_filmpro: [] as Json,
				search_terms: [] as Json,
				raw_response: (rawResponse ?? null) as Json,
				status: 'error',
				error_message: sanitized
			},
			{ onConflict: 'week_label' }
		)
		.select('id')
		.single();

	logPhase(weekLabel, 'error_marked', { errorMessage: sanitized });

	try {
		const result = await sendRecapEmail(
			{
				mode: 'failure',
				data: {
					weekLabel,
					errorMessage: sanitized,
					costs
				}
			},
			emailConfig
		);
		if (!result.ok && !result.skipped) {
			console.warn(`[email-recap] failure alert not sent: ${sanitizeForLog(result.reason ?? '')}`);
		}
	} catch (e) {
		console.error(`[email-recap] unexpected error: ${sanitizeError(e)}`);
	}

	return errRow?.id;
}

/**
 * Anti-doublons activé à partir d'un weekLabel seuil (format YYYY-Www).
 * Avant le seuil : skip pour permettre une « édition zéro » sans contrainte.
 * Si `seuil` est undefined, anti-doublons toujours actif.
 */
function antiDoublonsActive(currentWeek: string, seuil: string | undefined): boolean {
	if (!seuil) return true;
	return currentWeek >= seuil;
}

/**
 * Orchestrateur : calcule la semaine, charge les items des 4 dernières éditions
 * (URL + titre + date) pour anti-doublons intelligent, génère l'édition via Claude
 * 1-phase, valide, insère en DB. Idempotent via contrainte UNIQUE sur week_label
 * (skip si déjà existante et status=published).
 *
 * Toutes les dépendances (supabase, anthropicApiKey, email config, env veille)
 * sont injectées via `deps`. Permet à la fois l'exécution dans un handler
 * SvelteKit (cron Vercel) et dans un script standalone (cron GitHub Actions
 * post Bloc #2 S167).
 */
export async function runWeeklyGeneration(
	now: Date = new Date(),
	deps: VeilleDeps,
	opts: { force?: boolean; noEmail?: boolean } = {}
): Promise<RunResult> {
	const week = currentWeekRange(now);
	// --no-email : neutralise TOUS les envois (récap admin + brief + alerte échec) en
	// désactivant la config email injectée. sendRecapEmail/sendBriefEmail skip proprement
	// sur enabled=false. Pour un backfill silencieux d'une semaine passée (cf. régén W25).
	if (opts.noEmail) {
		deps = {
			...deps,
			email: { ...deps.email, enabled: false },
			brief: { ...deps.brief, enabled: false }
		};
	}
	const { supabase } = deps;
	const startedAt = new Date().toISOString();
	// Audit 360 M-05 : tracker de coûts dédié à CE run (pas le singleton module-level),
	// pour isoler des invocations concurrentes éventuelles dans le même process.
	const tracker = new CostTracker();

	logPhase(week.weekLabel, 'start', { now: startedAt });

	// Idempotence : ne pas regénérer si édition déjà publiée cette semaine.
	// `opts.force` contourne ce garde-fou (rattrapage manuel d'une édition ratée,
	// ex. W25 régénérée après le correctif anti-hallu du 2026-06-22). Sans force, le
	// comportement est inchangé : skip si published. markRunning écrasera ensuite la
	// ligne published en running, donc l'anti-doublons aval ne reverra pas l'ancienne.
	const { data: existing } = await supabase
		.from('intelligence_reports')
		.select('id, status')
		.eq('week_label', week.weekLabel)
		.maybeSingle();

	if (existing && existing.status === 'published' && !opts.force) {
		logPhase(week.weekLabel, 'idempotent_skip', { reportId: existing.id });
		return { ok: true, weekLabel: week.weekLabel, reportId: existing.id, skipped: true };
	}
	if (existing && existing.status === 'published' && opts.force) {
		logPhase(week.weekLabel, 'force_regenerate', { reportId: existing.id });
	}

	// Rattrapage du soir (décision Pascal 2026-06-19, renverse council 06-06) :
	// une semaine en status=error est RETENTÉE (pas skippée). Le run du matin a déjà
	// envoyé l'email d'alerte → aucun masquage de dérive ; le re-paiement est marginal
	// et désormais rare (fix racine débordement + résilience par-item). Seul `published`
	// court-circuite (garde idempotente ci-dessus). Un status=running orphelin (crash
	// dur du runner, aucune alerte partie) est lui aussi retenté en tombant ici.

	// Trace running AVANT tout appel coûteux. Si la suite crash / timeout,
	// la ligne running reste comme preuve factuelle du démarrage. Sans ça,
	// un échec amont = aucune trace en DB (cf. incident W18 01/05/2026).
	await markRunning(supabase, week.weekLabel, startedAt);

	// Wrap try/catch global : toute exception (Anthropic timeout, network,
	// SDK error, etc.) est convertie en upsert status=error + email failure.
	// Plus aucune exception muette qui propagerait sans laisser de trace.
	let gen: Awaited<ReturnType<typeof generateIntelligenceReport>>;
	// Bundle sources : chargé dans le try (après themes) mais déclaré ici car réutilisé
	// par crossCheckBatch après le try (même scope que `gen`).
	let sources: Awaited<ReturnType<typeof loadSourcesBundle>>;
	try {
		// Charge les 4 dernières éditions pour anti-doublons URL+date.
		let previousItems: PreviousItem[] = [];
		if (antiDoublonsActive(week.weekLabel, deps.antiDoublonsFrom)) {
			const { data: previous } = await supabase
				.from('intelligence_reports')
				.select('week_label, items')
				.eq('status', 'published')
				.order('generated_at', { ascending: false })
				.limit(4);

			for (const r of previous ?? []) {
				const items = r.items as Array<{
					title?: string;
					source?: { url?: string; published_at?: string };
				}> | null;
				for (const it of items ?? []) {
					if (!it.title || !it.source?.url || !it.source?.published_at) continue;
					previousItems.push({
						week_label: r.week_label,
						title: it.title,
						url: it.source.url,
						published_at: it.source.published_at
					});
				}
			}
			logPhase(week.weekLabel, 'previous_loaded', {
				editions: previous?.length ?? 0,
				items: previousItems.length
			});
		}

		const days = deps.windowDays;

		// S169 : taxonomie thèmes externalisée en DB (table veille_themes).
		// Chargé une fois ici puis passé à `generateIntelligenceReport` (qui
		// l'injecte dans le system prompt + le JSON schema strict-mode +
		// la validation post-Zod). Fallback hardcoded si la DB est vide.
		const themes = await loadThemeBundle(deps.supabase);
		logPhase(week.weekLabel, 'themes_loaded', {
			source: themes.source,
			count: themes.allowedSlugs.length,
			core: themes.core.length,
			adjacent: themes.adjacent.length
		});

		// Sources veille externalisées en DB (table veille_sources). Chargé une fois ici
		// puis passé à generate (filtre denylist + annotation tier) ET cross-check (régime
		// trust-by-source). Fallback seed (= photo exacte du code) si la DB est vide.
		sources = await loadSourcesBundle(deps.supabase);
		logPhase(week.weekLabel, 'sources_loaded', {
			source: sources.source,
			count: sources.byDomain.size
		});

		logPhase(week.weekLabel, 'generate_start', { windowDays: days });
		gen = await generateIntelligenceReport(
			{
				weekLabel: week.weekLabel,
				dateStart: week.dateStart,
				dateEnd: week.dateEnd,
				windowStart: extendedWindowStart(week, days),
				windowDays: days,
				previousItems
			},
			{ anthropicApiKey: deps.anthropicApiKey, themes, sources, tracker }
		);
		logPhase(week.weekLabel, 'generate_done', {
			success: gen.success,
			items: gen.report?.items.length,
			// Articles écartés à la validation de schéma (par-article) : suivi de
			// dérive du modèle. 0 attendu en régime normal ; une hausse = signal.
			schemaDropped: gen.schemaDropped?.length ?? 0,
			error: gen.error
		});
	} catch (e) {
		// Exception inattendue (réseau, SDK Anthropic, etc.) : convertir en
		// status=error structuré avant de propager le ok:false. Préserve la
		// trace + déclenche l'email d'alerte échec.
		const message = e instanceof Error ? e.message : String(e);
		logPhase(week.weekLabel, 'exception', { message });
		const errId = await markError(
			supabase,
			week.weekLabel,
			`Exception: ${message}`,
			null,
			// Fidélité coût (revue 2026-06-19) : passer le coût RÉEL déjà accumulé
			// avant l'exception (ex. 1er appel génération qui a payé des web_search
			// puis timeout réseau) plutôt qu'un zéro — important sur le crédit dédié
			// plafonné. persistRunCosts utilise déjà le tracker ; on aligne l'email.
			tracker.summary(),
			deps.email
		);
		await persistRunCosts(supabase, week.weekLabel, {
			runId: buildVeilleRunId(week.weekLabel, startedAt),
			feature: 'veille',
			status: 'error',
			startedAt,
			errorMessage: `Exception: ${message}`
		}, tracker);
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: `Exception: ${message}`
		};
	}

	if (!gen.success || !gen.report) {
		const errId = await markError(
			supabase,
			week.weekLabel,
			gen.error ?? 'Erreur inconnue',
			gen.raw,
			gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 },
			deps.email
		);
		await persistRunCosts(supabase, week.weekLabel, {
			runId: buildVeilleRunId(week.weekLabel, startedAt),
			feature: 'veille',
			status: 'error',
			startedAt,
			errorMessage: gen.error ?? 'Erreur inconnue'
		}, tracker);
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: gen.error
		};
	}

	// Pipeline anti-hallucination V2 (2026-05-05) : cross-check verbatim sur le
	// contenu réel des pages source. Items rescapés du filtre URL/date passent
	// dans cross-check Sonnet 4.6 qui valide chiffres + citations + entités.
	//
	// Garantie « zéro hallucination » :
	// - rejectUnfetchable=true : item dont la page n'est pas fetchable → rejet, SAUF
	//   exception trust-by-source (levier sourcing 2026-06-23) : une page authentiquement
	//   morte ('dead_page') d'une source à régime 'trusted' (T1 officiel .ch/.admin.ch, T2/T4/T5)
	//   est CONSERVÉE et marquée content_reverified=false (cf. crossCheckBatch). Un échec de
	//   NOTRE vérificateur ('verifier_failed', apiError) reste rejeté quel que soit le régime.
	//   Le contenu d'un item trust-kept reste ancré à une vraie citation web_search (pas inventé) ;
	//   les titres concernés sont loggés ci-dessous (keptByTrustTitles) pour relecture humaine.
	// - try/catch global : si cross-check échoue COMPLÈTEMENT (Sonnet down,
	//   réseau, etc.) → status=error, on ne publie pas d'items non vérifiés.
	logPhase(week.weekLabel, 'cross_check_start', {
		candidates: gen.report.items.length,
		rejectedPreCheck: gen.rejected?.length ?? 0,
		sanitizedUrls: gen.sanitizedUrlsCount ?? 0
	});

	let publishableItems: IntelligenceItem[] = [];
	try {
		const ccResult = await crossCheckBatch(gen.report.items, {
			anthropicApiKey: deps.anthropicApiKey,
			rejectUnfetchable: true,
			sources,
			tracker
		});
		publishableItems = ccResult.kept;
		logPhase(week.weekLabel, 'cross_check_done', {
			kept: ccResult.kept.length,
			rejected: ccResult.rejected.length,
			apiErrors: ccResult.apiErrorCount,
				keptByTrust: ccResult.keptByTrust,
				keptByTrustTitles: ccResult.kept
					.filter((i) => i.verification?.content_reverified === false)
					.map((i) => i.title.slice(0, 80)),
			fatalDivergences: ccResult.rejected.flatMap((r) =>
				r.verdict.divergences.filter((d) => d.severity === 'fatal').map((d) => ({
					url: r.url,
					quoted: d.quoted.slice(0, 80),
					found: d.found?.slice(0, 80) ?? null
				}))
			)
		});

		// Échec SYSTÉMIQUE de la vérification (audit 360 racine) : TOUS les items ont
		// échoué côté API verifier (crédit dédié épuisé, clé invalide, API down) — la
		// génération coûteuse a RÉUSSI mais on ne peut rien vérifier. On alerte
		// distinctement (cause infra, pas contenu) et on NE publie PAS d'items non
		// vérifiés (garantie zéro-hallu). Distinct de l'ancien échec « cross-check
		// global » : ici la cause est identifiée (kind) et la génération est sauvée
		// pour une relance manuelle quand l'API est rétablie.
		if (ccResult.systemicError) {
			const sysMsg =
				`Vérification anti-hallucination impossible (${ccResult.systemicError.kind}) : ` +
				`${ccResult.systemicError.message}. Génération réussie mais non publiée ` +
				`(garantie zéro-hallucination). Relance manuelle quand l'API est rétablie.`;
			logPhase(week.weekLabel, 'cross_check_systemic', { kind: ccResult.systemicError.kind });
			const errId = await markError(
				supabase,
				week.weekLabel,
				sysMsg,
				gen.raw,
				gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 },
				deps.email
			);
			await persistRunCosts(
				supabase,
				week.weekLabel,
				{
					runId: buildVeilleRunId(week.weekLabel, startedAt),
					feature: 'veille',
					status: 'error',
					startedAt,
					errorMessage: `Cross-check systemic (${ccResult.systemicError.kind})`
				},
				tracker
			);
			return { ok: false, weekLabel: week.weekLabel, reportId: errId, error: sysMsg };
		}
	} catch (e) {
		// Échec global cross-check (Sonnet API down, network total, etc.) :
		// on ne publie PAS d'items non vérifiés. Garantie zéro hallu prime sur
		// le volume. L'humain peut relancer via workflow_dispatch quand l'API
		// est rétablie.
		const message = e instanceof Error ? e.message : String(e);
		logPhase(week.weekLabel, 'cross_check_fatal', { error: sanitizeError(e) });
		const errId = await markError(
			supabase,
			week.weekLabel,
			`Cross-check global failed: ${message}. Aucun item publié pour préserver la garantie zéro hallucination.`,
			gen.raw,
			gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 },
			deps.email
		);
		await persistRunCosts(supabase, week.weekLabel, {
			runId: buildVeilleRunId(week.weekLabel, startedAt),
			feature: 'veille',
			status: 'error',
			startedAt,
			errorMessage: `Cross-check failed: ${message}`
		}, tracker);
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: `Cross-check failed: ${message}`
		};
	}

	// Tri d'importance FilmPro déterministe (Lot 1 AC-5 + commentaires Pascal W25 #4+#5) :
	// ré-ordonne par actionnabilité + ancrage local + maturité (so-what générique dominant),
	// pour que le local actionnable mûr remonte et la nouveauté produit internationale
	// lointaine (a_surveiller + monde + speculatif) redescende. JAMAIS un rejet (on combat
	// la famine) ; le rank synthétique est réassigné 1..N en aval (re-rank ci-dessous).
	const { items: orderedItems, demotedCount, reorderedCount } =
		orderByFilmproImportance(publishableItems);
	if (demotedCount > 0 || reorderedCount > 0) {
		logPhase(week.weekLabel, 'importance_ordered', {
			generic: demotedCount,
			reordered: reorderedCount
		});
	}

	// Sélection geo-aware (2026-06-22) : préserve le mix 2/3 local / 1/3 monde quand
	// il y a plus d'items que le cap, garde TOUT en famine (aucun item perdu vs
	// l'ancien `sort(rank)+slice`), et lève un canari de DÉRIVE (baseline W18-24 =
	// 77 % monde JAMAIS détecté). Voir mix-select.ts + spec AC-3.
	const { selected: cappedItems, mix, drift } = selectByMix(orderedItems, PUBLISHED_ITEMS_CAP);
	logPhase(week.weekLabel, 'mix', { ...mix, localShare: Math.round(mix.localShare * 100) / 100 });
	if (drift) {
		console.warn(
			`[veille ${week.weekLabel}] mix_drift : part locale ${Math.round(mix.localShare * 100)}% ` +
				`(${mix.local}/${mix.total}) sous le plancher — édition trop « monde », à investiguer.`
		);
		logPhase(week.weekLabel, 'mix_drift', { local: mix.local, monde: mix.monde, total: mix.total });
	}

	if (cappedItems.length < LOW_VOLUME_THRESHOLD) {
		console.warn(
			`[veille ${week.weekLabel}] low_volume: ${cappedItems.length} items publiés (cible ${LOW_VOLUME_THRESHOLD}-${PUBLISHED_ITEMS_CAP}). Vérifier qualité couverture web_search.`
		);
		logPhase(week.weekLabel, 'low_volume', {
			published: cappedItems.length,
			threshold: LOW_VOLUME_THRESHOLD
		});
	}

	// Re-rank 1..N continu après filtrage (les rangs LLM peuvent avoir des trous).
	const rerankedItems = cappedItems.map((item, idx) => ({ ...item, rank: idx + 1 }));

	// Insertion / upsert du rapport valide.
	// Strip <cite>...</cite> sur tous les champs textuels avant publish DB :
	// le SDK Anthropic web_search annote certains passages avec ces marqueurs
	// non filtrés, qui pollueraient l'affichage CRM (rendu HTML brut).
	// generated_at SERVEUR-autoritatif (audit 360 racine) : on pose startedAt plutôt
	// que la valeur émise par le modèle (décorative, jamais fiable sur le format).
	// Couplé à la pré-normalisation de report-validate, un generated_at off ne peut
	// plus faire échouer l'édition.
	// Strip <cite> puis dedash déterministe (tirets typographiques -> tiret court) sur
	// TOUT le texte publié (résumé, titres, so-what, deep_dive, source.name, impacts).
	// Invariant typo dur jamais confié au prompt seul (cf. dedash.ts).
	// Strip <cite> -> strip artefacts d'enum dumpés en prose (commentaire Pascal W25 #1 :
	// l'enum d'actionnabilité a fui en queue de `filmpro_relevance` sur les 3 items W25) ->
	// dedash. Chaîne déterministe : un slug snake_case terminal est toujours un artefact,
	// jamais un fait (garantie zéro-hallu intacte). Cf. strip-enum-artifacts.ts.
	const report: IntelligenceReport = dedashReport(
		stripEnumArtifactsFromReport(
			stripCitationsFromReport({
				...gen.report,
				meta: { ...gen.report.meta, generated_at: startedAt },
				items: rerankedItems
			})
		)
	);
	const { data: inserted, error: insertError } = await supabase
		.from('intelligence_reports')
		.upsert(
			{
				week_label: week.weekLabel,
				generated_at: report.meta.generated_at,
				compliance_tag: report.meta.compliance_tag,
				executive_summary: report.meta.executive_summary,
				// Cast Json : les types Zod IntelligenceItem[] et impacts sont structurellement
				// JSON mais TypeScript ne le prouve pas (récursion limitée). V3a M-19 traitera
				// la validation Zod côté lecture pour fermer la boucle.
				items: report.items as unknown as Json,
				impacts_filmpro: report.impacts_filmpro as unknown as Json,
				// search_terms globaux supprimés depuis la refonte /veille : les termes
				// sont désormais portés par chaque item. La colonne DB est conservée
				// pour rétro-compat lecture des anciennes éditions, nouvelles lignes = [].
				search_terms: [] as Json,
				raw_response: (gen.raw ?? null) as Json,
				status: 'published',
				error_message: null
			},
			{ onConflict: 'week_label' }
		)
		.select('id')
		.single();

	if (insertError || !inserted) {
		// La ligne running pré-existe : la convertir en error pour cohérence.
		const errMsg = `Insert DB échoué : ${insertError?.message ?? 'inconnu'}`;
		const errId = await markError(
			supabase,
			week.weekLabel,
			errMsg,
			gen.raw,
			gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 },
			deps.email
		);
		await persistRunCosts(supabase, week.weekLabel, {
			runId: buildVeilleRunId(week.weekLabel, startedAt),
			feature: 'veille',
			status: 'error',
			startedAt,
			errorMessage: errMsg
		}, tracker);
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: errMsg
		};
	}

	logPhase(week.weekLabel, 'published', { reportId: inserted.id, items: report.items.length });

	// Phase C+D : propager les signaux Veille aux leads existants (re-scoring continu
	// + agrégation cross-signaux). Best-effort : un échec ici ne bloque pas l'edition.
	try {
		const applied = await applySignalsFromReport(supabase, inserted.id, report);
		console.log(
			`[veille→prospection] report ${week.weekLabel} : ${applied.insertedSignals} signal(s) lié(s), ${applied.recomputedLeads} lead(s) recalculé(s), ${applied.failedLeads} échec(s).`
		);
	} catch (e) {
		console.error(`[veille→prospection] échec apply-signals (non-bloquant): ${sanitizeError(e)}`);
	}

	// Alerte « semaine creuse » (best-effort, n'influence pas le retour) : édition
	// anormalement maigre (< SPARSE_WEEK_THRESHOLD items). Le récap hebdo « normal »
	// (mode `success`, sans logo, admin seul) N'EST PLUS envoyé : il doublonnait le
	// brief éditorial brandé ci-dessous (décision Pascal 2026-07-10). En régime normal,
	// le brief (antoine@ + pascal@) est le seul email. Restent les deux alertes
	// d'exploitation : semaine creuse (ici) et échec (markReportError, mode `failure`).
	const isSparse = report.items.length < SPARSE_WEEK_THRESHOLD;
	if (isSparse) {
		try {
			const result = await sendRecapEmail(
				{
					mode: 'sparse',
					data: {
						weekLabel: week.weekLabel,
						report,
						costs: gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 }
					}
				},
				deps.email
			);
			if (!result.ok && !result.skipped) {
				console.warn(
					`[email-recap] sparse recap not sent: ${sanitizeForLog(result.reason ?? '')}`
				);
			}
		} catch (e) {
			console.error(`[email-recap] unexpected error: ${sanitizeError(e)}`);
		}
	}

	// Email #2 : brief éditorial brandé (résumé + signaux + liens) -> antoine@ + pascal@.
	// Envoyé UNIQUEMENT s'il y a du contenu (>= 1 item) : on n'expédie jamais un brief
	// vide à un destinataire métier (décision Pascal 2026-06-23). Une semaine vide ne
	// déclenche que l'alerte admin ci-dessus. Best-effort : n'influence pas le retour.
	if (report.items.length >= 1) {
		try {
			const briefResult = await sendBriefEmail(
				{ weekLabel: week.weekLabel, report },
				deps.brief
			);
			if (!briefResult.ok && !briefResult.skipped) {
				console.warn(
					`[email-brief] brief not sent: ${sanitizeForLog(briefResult.reason ?? '')}`
				);
			}
		} catch (e) {
			console.error(`[email-brief] unexpected error: ${sanitizeError(e)}`);
		}
	} else {
		logPhase(week.weekLabel, 'brief_skipped_empty', { items: report.items.length });
	}

	// Persistance coûts API (best-effort, n'influence pas le retour). Status
	// 'partial' si volume sous le seuil low_volume (édition publiée mais maigre),
	// 'success' sinon.
	await persistRunCosts(supabase, week.weekLabel, {
		runId: buildVeilleRunId(week.weekLabel, startedAt),
		feature: 'veille',
		status: report.items.length < LOW_VOLUME_THRESHOLD ? 'partial' : 'success',
		startedAt
	}, tracker);

	return { ok: true, weekLabel: week.weekLabel, reportId: inserted.id };
}
