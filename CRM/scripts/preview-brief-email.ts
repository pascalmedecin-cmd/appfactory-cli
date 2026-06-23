#!/usr/bin/env node
/**
 * Génère un aperçu HTML du brief éditorial brandé (email #2) avec un contenu
 * réaliste, pour validation visuelle dans le navigateur. Aucun envoi, aucun appel
 * LLM. Sortie : .product-architect/veille/preview-brief-email.html
 *
 *   npx tsx scripts/preview-brief-email.ts && open -a "Google Chrome" \
 *     "file://$(pwd)/.product-architect/veille/preview-brief-email.html?v=$(date +%s)"
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildBriefPayload } from '../src/lib/server/intelligence/email-brief';
import type { IntelligenceReport } from '../src/lib/server/intelligence/schema';

const sample = {
	meta: {
		week_label: '2026-W26',
		generated_at: '2026-06-26T06:27:00Z',
		compliance_tag: 'Non-exhaustif',
		executive_summary:
			"Semaine dominée par un nouvel épisode caniculaire en Suisse romande (degré 3, pointes à 37 degrés) et la pression réglementaire estivale. Pour FilmPro, le moment commercial est favorable : la demande de confort d'été se concentre sur le tertiaire très vitré et les ERP, deux segments où le film solaire se pose sans remplacement de vitrage."
	},
	items: [
		{
			rank: 1,
			title: 'Canicule de degré 3 en Suisse romande, jusqu’à 37 degrés dès jeudi',
			summary:
				'MétéoSuisse annonce une canicule de degré 3 sur la Suisse romande de jeudi à mardi, avec des pointes à 37 degrés et une première nuit tropicale.',
			filmpro_relevance:
				"Pic de demande confort d'été sur le tertiaire et le résidentiel haut de gamme très vitrés. Déclencheur idéal pour relancer les régies et gérances VD/GE avec un argumentaire film solaire posé sans remplacement de vitrage.",
			maturity: 'etabli',
			theme: 'confort_ete',
			geo_scope: 'suisse_romande',
			source: { name: 'RTS', url: 'https://www.rts.ch/meteo/canicule', published_at: '2026-06-24' },
			deep_dive: null,
			segment: 'tertiaire',
			actionability: 'action_directe',
			search_terms: []
		},
		{
			rank: 2,
			title: 'Genève : quatre communes déposent un recours sur les UV le 15 juin',
			summary:
				'Quatre communes genevoises déposent un recours commun concernant la protection contre les UV dans les bâtiments scolaires.',
			filmpro_relevance:
				'Ouverture sur le segment ERP scolaire public à Genève : la protection UV des vitrages devient un sujet de santé publique. Cibler les services de gérance communaux et les régies de bâtiments publics.',
			maturity: 'emergent',
			theme: 'reglementation',
			geo_scope: 'suisse_romande',
			source: { name: 'Tribune de Genève', url: 'https://www.tdg.ch/uv-communes', published_at: '2026-06-15' },
			deep_dive: null,
			segment: 'erp',
			actionability: 'action_directe',
			search_terms: []
		},
		{
			rank: 3,
			title: 'Décret tertiaire français étendu à 13 nouvelles catégories en 2026',
			summary:
				"Le décret tertiaire s'étend en 2026 à 13 nouvelles catégories de bâtiments, renforçant les obligations de sobriété énergétique.",
			filmpro_relevance:
				"Signal miroir pour le tertiaire suisse : l'efficacité énergétique passive (apports solaires maîtrisés) gagne du terrain dans l'argumentaire. À garder en réserve pour les bureaux d'études et facility managers.",
			maturity: 'etabli',
			theme: 'reglementation',
			geo_scope: 'monde',
			source: { name: 'Le Moniteur', url: 'https://www.lemoniteur.fr/decret-tertiaire', published_at: '2026-06-20' },
			deep_dive: null,
			segment: 'tertiaire',
			actionability: 'veille_active',
			search_terms: []
		},
		{
			rank: 4,
			title: 'Saint-Gobain lance un vitrage de contrôle solaire double-argent',
			summary:
				'Saint-Gobain Glass commercialise un nouveau vitrage de contrôle solaire double-argent (TL 50 %, facteur solaire 27 %).',
			filmpro_relevance:
				'Référence concurrente côté vitrage neuf : utile pour positionner le film FilmPro sur la rénovation (gain de confort sans remplacement). Surveiller, pas d’action directe.',
			maturity: 'etabli',
			theme: 'vitrages_haute_performance',
			geo_scope: 'monde',
			source: { name: 'Saint-Gobain', url: 'https://www.saint-gobain-glass.com/cool-lite', published_at: '2026-06-18' },
			deep_dive: null,
			segment: 'partenaires',
			actionability: 'a_surveiller',
			search_terms: []
		}
	],
	impacts_filmpro: [
		{ note: 'Préparer un argumentaire canicule prêt à l’envoi pour les régies VD et GE cette semaine.' },
		{ note: 'Identifier les gérances de bâtiments scolaires publics genevois (segment ERP, recours UV).' }
	],
	search_terms: []
} as unknown as IntelligenceReport;

const { html, subject } = buildBriefPayload({ weekLabel: '2026-W26', report: sample });

const here = dirname(fileURLToPath(import.meta.url));
// Le logo prod (LOGO_URL) n'est pas encore déployé : pour l'APERÇU local, on l'inline
// en data URI depuis static/ pour que Chrome l'affiche. L'email réel garde l'URL hébergée.
const logoPng = readFileSync(join(here, '..', 'static', 'FilmPro_logo_white.png'));
const dataUri = `data:image/png;base64,${logoPng.toString('base64')}`;
const previewHtml = html.replace(
	'https://filmpro-portail.vercel.app/FilmPro_logo_white.png',
	dataUri
);

const out = join(here, '..', '.product-architect', 'veille', 'preview-brief-email.html');
writeFileSync(out, previewHtml, 'utf8');
console.log(`Aperçu écrit : ${out}`);
console.log(`Sujet : ${subject}`);
