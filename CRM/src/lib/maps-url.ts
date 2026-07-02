/**
 * Lien « Ouvrir sur Google Maps » d'un prospect - source UNIQUE (PDF de liste + page publique
 * de validation externe). Le libellé promet Google : l'URL doit tenir la promesse (durcissement
 * audit sécu 02/07 - un `source_url` arbitraire ne doit jamais devenir un lien étiqueté Google).
 * L'import Google écrit `googleMapsUri` ou `placeMapsUrl(placeId)` : tous deux vivent sur ces hôtes.
 */
import { safeHttpUrl } from '$lib/utils/safe-url';

export const GOOGLE_SOURCE = 'google_places';

const MAPS_HOSTS = new Set([
	'www.google.com',
	'google.com',
	'maps.google.com',
	'www.google.ch',
	'maps.app.goo.gl',
	'goo.gl',
]);

/** URL http(s) restreinte aux hôtes Google Maps admis, sinon null. */
export function safeMapsUrl(url: string | null): string | null {
	const safe = safeHttpUrl(url);
	if (!safe) return null;
	try {
		return MAPS_HOSTS.has(new URL(safe).hostname.toLowerCase()) ? safe : null;
	} catch {
		return null;
	}
}

/** Lien Maps d'un prospect : uniquement pour la source Google (les autres n'ont pas de fiche). */
export function prospectMapsUrl(p: { source: string; source_url: string | null }): string | null {
	return p.source === GOOGLE_SOURCE ? safeMapsUrl(p.source_url) : null;
}
