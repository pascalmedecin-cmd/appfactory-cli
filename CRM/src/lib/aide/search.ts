/**
 * Recherche full-text dans le contenu d'aide (audit 360 M-29 : remplace l'ancien
 * `getElementById(...).textContent.includes(...)` par un index pur, testable, sans DOM).
 *
 * L'index est construit une fois à l'import à partir de `aideContent` : pour chaque section,
 * on concatène le titre, l'accroche et le texte de tous les blocs (paragraphes, listes,
 * étapes, cellules de table, encarts, code, libellés de liens, légendes de diagrammes).
 * La recherche est insensible à la casse et aux accents.
 */

import { aideContent, type AideBlock, type AideLevelKey, type AideSection } from './content';

/** Normalise pour comparaison : minuscules + suppression des diacritiques. */
export function normalizeForSearch(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

/** Texte indexable d'un bloc (concaténation de tous ses champs textuels). */
function blockText(block: AideBlock): string {
	switch (block.type) {
		case 'paragraph':
			return block.text;
		case 'list':
			return block.items.join(' ');
		case 'steps':
			return [block.intro ?? '', ...block.items.map((i) => `${i.text} ${i.link?.label ?? ''}`)].join(' ');
		case 'table':
			return [block.caption ?? '', ...block.head, ...block.rows.flat()].join(' ');
		case 'callout':
			return `${block.title} ${block.text}`;
		case 'code':
			return `${block.caption ?? ''} ${block.code}`;
		case 'diagram':
			return block.caption ?? '';
		case 'link':
			return block.link.label;
	}
}

export type AideSearchEntry = {
	levelKey: AideLevelKey;
	levelLabel: string;
	section: AideSection;
	/** Texte normalisé complet de la section (titre + accroche + blocs). */
	haystack: string;
};

/** Index construit une fois — `aideContent` est statique. */
export const aideSearchIndex: AideSearchEntry[] = aideContent.flatMap((level) =>
	level.sections.map((section) => {
		const raw = [section.title, section.lead, ...section.blocks.map(blockText)].join(' ');
		return {
			levelKey: level.key,
			levelLabel: level.label,
			section,
			haystack: normalizeForSearch(raw)
		};
	})
);

export type AideSearchResult = {
	levelKey: AideLevelKey;
	levelLabel: string;
	sectionId: string;
	sectionTitle: string;
	sectionIcon: string;
	/** true si le terme apparaît dans le titre de la section (pondération d'affichage). */
	titleMatch: boolean;
};

/**
 * Recherche les sections dont le contenu contient la requête.
 * Une requête vide renvoie `[]`. Le tri remonte les correspondances de titre en premier,
 * puis l'ordre naturel de l'arbre.
 */
export function searchAide(query: string): AideSearchResult[] {
	const q = normalizeForSearch(query);
	if (!q) return [];
	const results: AideSearchResult[] = [];
	for (const entry of aideSearchIndex) {
		if (!entry.haystack.includes(q)) continue;
		results.push({
			levelKey: entry.levelKey,
			levelLabel: entry.levelLabel,
			sectionId: entry.section.id,
			sectionTitle: entry.section.title,
			sectionIcon: entry.section.icon,
			titleMatch: normalizeForSearch(entry.section.title).includes(q)
		});
	}
	return results.sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch));
}
