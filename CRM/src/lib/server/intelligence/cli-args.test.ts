import { describe, it, expect } from 'vitest';
import { parseArgv, HelpRequestedError } from './cli-args';

describe('parseArgv - run-veille standalone', () => {
	it('argv vide → opts vide (semaine en cours par défaut)', () => {
		expect(parseArgv([])).toEqual({});
	});

	it('--week 2026-W18 → opts.weekLabel="2026-W18"', () => {
		expect(parseArgv(['--week', '2026-W18'])).toEqual({ weekLabel: '2026-W18' });
	});

	it('--week sans valeur → throw', () => {
		expect(() => parseArgv(['--week'])).toThrow(/--week nécessite une valeur/);
	});

	it('--week format invalide → throw avec message explicite', () => {
		expect(() => parseArgv(['--week', '2026-18'])).toThrow(/format invalide/);
		expect(() => parseArgv(['--week', '2026-W1'])).toThrow(/format invalide/);
		expect(() => parseArgv(['--week', 'foo'])).toThrow(/format invalide/);
	});

	it('--help → HelpRequestedError', () => {
		expect(() => parseArgv(['--help'])).toThrow(HelpRequestedError);
		expect(() => parseArgv(['-h'])).toThrow(HelpRequestedError);
	});

	it('argument inconnu → throw avec nom du flag', () => {
		expect(() => parseArgv(['--unknown'])).toThrow(/Argument inconnu : "--unknown"/);
		expect(() => parseArgv(['random'])).toThrow(/Argument inconnu : "random"/);
	});

	it('--week consomme bien 2 positions argv (--week + valeur)', () => {
		// Si parseArgv ne consomme pas bien 2 positions, le 3e argv serait considéré "Argument inconnu"
		expect(parseArgv(['--week', '2026-W18'])).toEqual({ weekLabel: '2026-W18' });
		// Mais avec un argv trailing, il doit throw
		expect(() => parseArgv(['--week', '2026-W18', 'extra'])).toThrow(/Argument inconnu : "extra"/);
	});

	it('rejette injection shell potentielle (espaces, ;, |, $)', () => {
		// Validation stricte regex anti-injection : aucun de ces patterns ne match ^\d{4}-W\d{2}$
		expect(() => parseArgv(['--week', '2026-W18; rm -rf /'])).toThrow(/format invalide/);
		expect(() => parseArgv(['--week', '$(whoami)'])).toThrow(/format invalide/);
		expect(() => parseArgv(['--week', '2026-W18 | cat'])).toThrow(/format invalide/);
	});
});
