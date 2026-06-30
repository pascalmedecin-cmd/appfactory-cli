import { describe, it, expect } from 'vitest';
import {
	aideContent,
	allChecklistStepIds,
	levelByKey,
	KNOWN_ROUTES,
	type AideBlock
} from './content';

const ALL_DIAGRAM_NAMES = new Set([
	'portail',
	'ecosysteme',
	'cycle-opportunite',
	'veille-hebdo',
	'scoring-prospection',
	'architecture'
]);

function allBlocks(): AideBlock[] {
	return aideContent.flatMap((l) => l.sections.flatMap((s) => s.blocks));
}

describe('aideContent - intégrité de l\'arbre', () => {
	it('expose trois niveaux dans l\'ordre démarrage / fonctions / technique', () => {
		expect(aideContent.map((l) => l.key)).toEqual(['demarrage', 'fonctions', 'technique']);
	});

	it('chaque niveau a au moins une section', () => {
		for (const level of aideContent) expect(level.sections.length).toBeGreaterThan(0);
	});

	it('tous les identifiants de section sont uniques sur tout l\'arbre', () => {
		const ids = aideContent.flatMap((l) => l.sections.map((s) => s.id));
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('chaque section a un titre, une accroche et une icône non vides', () => {
		for (const level of aideContent) {
			for (const sec of level.sections) {
				expect(sec.title.trim()).not.toBe('');
				expect(sec.lead.trim()).not.toBe('');
				expect(sec.icon.trim()).not.toBe('');
				expect(sec.blocks.length).toBeGreaterThan(0);
			}
		}
	});

	it('chaque lien interne pointe vers une route CRM connue', () => {
		const known = new Set<string>(KNOWN_ROUTES);
		for (const block of allBlocks()) {
			if (block.type === 'link' && !block.link.external) {
				expect(known.has(block.link.href)).toBe(true);
			}
			if (block.type === 'steps') {
				for (const step of block.items) {
					if (step.link && !step.link.external) expect(known.has(step.link.href)).toBe(true);
				}
			}
		}
	});

	it('chaque lien externe est en https', () => {
		for (const block of allBlocks()) {
			if (block.type === 'link' && block.link.external) {
				expect(block.link.href).toMatch(/^https:\/\//);
			}
			if (block.type === 'steps') {
				for (const step of block.items) {
					if (step.link?.external) expect(step.link.href).toMatch(/^https:\/\//);
				}
			}
		}
	});

	it('chaque bloc diagramme référence un nom de diagramme connu', () => {
		for (const block of allBlocks()) {
			if (block.type === 'diagram') expect(ALL_DIAGRAM_NAMES.has(block.name)).toBe(true);
		}
	});

	it('chaque table déclare autant de colonnes d\'en-tête que de cellules par ligne', () => {
		for (const block of allBlocks()) {
			if (block.type === 'table') {
				for (const row of block.rows) expect(row.length).toBe(block.head.length);
			}
		}
	});
});

describe('aideContent - couvre les trois niveaux comme spécifié', () => {
	it('niveau 1 : parcours, checklist 7 étapes, carte mentale, ≥ 3 encarts', () => {
		const n1 = levelByKey('demarrage');
		const blocks = n1.sections.flatMap((s) => s.blocks);
		const steps = blocks.find((b) => b.type === 'steps');
		expect(steps?.type).toBe('steps');
		expect(steps && steps.type === 'steps' ? steps.items.length : 0).toBe(7);
		expect(blocks.some((b) => b.type === 'diagram' && b.name === 'ecosysteme')).toBe(true);
		expect(blocks.filter((b) => b.type === 'callout').length).toBeGreaterThanOrEqual(3);
	});

	it('niveau 2 : au moins 9 fiches écran et au moins 3 diagrammes de flux', () => {
		const n2 = levelByKey('fonctions');
		expect(n2.sections.length).toBeGreaterThanOrEqual(9);
		const diagrams = n2.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'diagram');
		expect(diagrams.length).toBeGreaterThanOrEqual(3);
	});

	it('niveau 3 : au moins 8 sections techniques + un runbook avec ≥ 4 procédures', () => {
		const n3 = levelByKey('technique');
		expect(n3.sections.length).toBeGreaterThanOrEqual(8);
		const runbook = n3.sections.find((s) => s.id === 'tech-runbook');
		expect(runbook).toBeDefined();
		const procedures = runbook!.blocks.filter((b) => b.type === 'paragraph');
		expect(procedures.length).toBeGreaterThanOrEqual(4);
	});
});

describe('allChecklistStepIds', () => {
	it('retourne des identifiants uniques et non vides', () => {
		const ids = allChecklistStepIds();
		expect(ids.length).toBeGreaterThan(0);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/);
	});
});

describe('levelByKey', () => {
	it('retourne le niveau demandé', () => {
		expect(levelByKey('technique').key).toBe('technique');
	});
	it('retombe sur le premier niveau pour une clé inconnue ou nulle', () => {
		expect(levelByKey('nope').key).toBe('demarrage');
		expect(levelByKey(null).key).toBe('demarrage');
		expect(levelByKey(undefined).key).toBe('demarrage');
	});
});
