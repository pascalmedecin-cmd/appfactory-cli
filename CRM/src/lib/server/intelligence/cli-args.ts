/**
 * Parser argv pour le runner standalone `scripts/run-veille.ts`.
 * Module pur (aucun side-effect, aucun import $env) pour être testable
 * en isolation et compatible Node + tsx + vitest.
 */
export interface CliOptions {
	weekLabel?: string;
	/** Force la régénération même si l'édition de la semaine est déjà `published`
	 *  (contourne l'idempotent_skip). Pour rattraper une édition ratée. */
	force?: boolean;
	/** Supprime TOUT envoi d'email (récap admin + brief + alerte échec). Pour un
	 *  rattrapage/backfill silencieux d'une semaine passée sans notifier les
	 *  destinataires métier. */
	noEmail?: boolean;
}

export class HelpRequestedError extends Error {
	constructor() {
		super('HELP_REQUESTED');
		this.name = 'HelpRequestedError';
	}
}

/**
 * Parse un argv array (typiquement `process.argv.slice(2)`). Strict : tout
 * argument inconnu lève une erreur. `--help` / `-h` lève `HelpRequestedError`
 * que l'appelant capture pour afficher l'usage et exit 0.
 */
export function parseArgv(argv: string[]): CliOptions {
	const opts: CliOptions = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--week') {
			const value = argv[i + 1];
			if (!value) {
				throw new Error('--week nécessite une valeur (ex: --week 2026-W18)');
			}
			if (!/^\d{4}-W\d{2}$/.test(value)) {
				throw new Error(`--week format invalide : "${value}". Attendu : YYYY-Www (ex: 2026-W18)`);
			}
			opts.weekLabel = value;
			i++;
			continue;
		}
		if (arg === '--force') {
			opts.force = true;
			continue;
		}
		if (arg === '--no-email') {
			opts.noEmail = true;
			continue;
		}
		if (arg === '--help' || arg === '-h') {
			throw new HelpRequestedError();
		}
		throw new Error(`Argument inconnu : "${arg}"`);
	}
	return opts;
}
