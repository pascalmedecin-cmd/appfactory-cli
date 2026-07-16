/**
 * Déduction du canton à partir du NPA suisse (Run 3 Atelier 209 - import de liste).
 *
 * Les listes importées (scrapes Google Maps) n'ont pas de colonne canton ; on le déduit du
 * code postal. Le CRM ne cible que la Suisse romande (`CANTONS_LEAD` = GE/VD/VS/NE/FR/JU) et
 * le canton n'alimente qu'un BONUS de score (cantonsPrioritaires +2 / secondaires +1). On est
 * donc CONSERVATEUR : on ne renvoie un canton QUE sur les plages franches ; tout NPA ambigu ou
 * hors romandie → `null` (le lead est importé quand même, sans bonus canton - défaut sûr).
 *
 * Limite assumée : l'arc lémanique (~1260-1299) et quelques villages frontaliers FR/VD/BE ne
 * se séparent pas proprement par plages de NPA (le mapping officiel PLZ→canton est per-code, pas
 * per-range). Les rares NPA mal classés à ces frontières ne changent qu'un +1/+2 de score, jamais
 * la marque ni l'import. Table calée sur les villes-ancres (test `npa-canton.test.ts`).
 */
import type { Canton } from '$lib/schemas';

/** Plages [min, max] inclusives → canton. Premier match gagne ; hors table → null. */
const NPA_RANGES: ReadonlyArray<readonly [number, number, Canton]> = [
	[1000, 1199, 'VD'], // Lausanne, Morges, Rolle, Nyon-est
	[1200, 1259, 'GE'], // Genève ville + communes (Carouge, Meyrin, Vernier, Onex…)
	[1260, 1299, 'VD'], // Nyon, Gland, Coppet (Versoix 1290 = GE en réalité, écart mineur assumé)
	[1300, 1499, 'VD'], // Yverdon, Orbe, Cossonay
	[1500, 1599, 'VD'], // Payerne, Moudon, Avenches (quelques villages FR mal classés, mineur)
	[1600, 1799, 'FR'], // Bulle, Châtel-St-Denis, Fribourg (Oron 1610 = VD, écart mineur)
	[1800, 1869, 'VD'], // Vevey, Montreux, Aigle
	[1870, 1899, 'VS'], // Monthey, St-Maurice
	[1900, 1999, 'VS'], // Martigny, Sion, Verbier
	[2000, 2149, 'NE'], // Neuchâtel, Val-de-Travers
	[2300, 2419, 'NE'], // La Chaux-de-Fonds, Le Locle
	[2800, 2999, 'JU'], // Delémont, Porrentruy
	[3900, 3999, 'VS'], // Sierre, Brig, Zermatt, Visp (Valais germanophone)
];

/**
 * Extrait le NPA suisse canonique (4 chiffres) d'une chaîne éventuellement bruitée
 * (« CH-1204 Genève » → « 1204 », « 1204 » → « 1204 »), ou `null`. SOURCE UNIQUE de la forme
 * canonique du NPA à l'import : la MÊME valeur alimente le stockage (`npa`) ET la clé de dédup
 * (localité de repli) → la clé nom+localité est stable au formatage et ronde-trip via la base
 * (sinon un ré-import du même fichier serait vu « nouveau » à l'aperçu mais bloqué à l'insert).
 *
 * Le run de 4 chiffres doit être ISOLÉ (pas accolé à un autre chiffre) : un NPA étranger à 5
 * chiffres (« 39220 » Les Rousses/F, frontière VD) ou une valeur mal placée dans la colonne NPA
 * → `null`, et non un faux NPA suisse tronqué (« 3922 ») qui fabriquerait un mauvais canton.
 */
export function extractNpa4(npa: string | number | null | undefined): string | null {
	return String(npa ?? '').trim().match(/(?<!\d)\d{4}(?!\d)/)?.[0] ?? null;
}

/**
 * NPA (chaîne ou nombre) → canton romand, ou `null` si hors des plages franches (arc lémanique
 * ambigu, hors romandie, format invalide). Ne lève jamais : entrée dégénérée → `null`.
 */
export function npaToCanton(npa: string | number | null | undefined): Canton | null {
	const digits = extractNpa4(npa);
	if (!digits) return null;
	const n = Number(digits);
	for (const [min, max, canton] of NPA_RANGES) {
		if (n >= min && n <= max) return canton;
	}
	return null;
}
