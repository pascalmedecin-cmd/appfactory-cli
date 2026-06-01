/**
 * Helpers purs pour les 3 actions natives iOS de la fiche terrain (AC-005).
 * Construit les `href` des schemes natifs (`tel:`, maps, `mailto:`) et décide
 * de l'état grisé quand la donnée est absente. Testable hors DOM (Vitest).
 *
 * Règle DESIGN.md § 4.8 : on ne masque jamais le bouton, on le grise (honnête :
 * « pas de numéro » se voit). `null` href = action indisponible (bouton grisé).
 */

/** Vrai si la valeur est exploitable (non null, non vide après trim). */
function present(v: string | null | undefined): v is string {
	return typeof v === 'string' && v.trim() !== '';
}

/**
 * `tel:` — normalise en retirant les espaces/séparateurs d'affichage mais en
 * conservant un éventuel `+` international. Renvoie null si pas de numéro.
 */
export function buildTelHref(phone: string | null | undefined): string | null {
	if (!present(phone)) return null;
	const cleaned = phone.trim().replace(/[^\d+]/g, '');
	// Un `+` n'est valide qu'en tête ; on ne garde que des chiffres derrière.
	const normalized = cleaned.startsWith('+')
		? '+' + cleaned.slice(1).replace(/\+/g, '')
		: cleaned.replace(/\+/g, '');
	return normalized.replace(/\+/g, '').length === 0 ? null : `tel:${normalized}`;
}

/**
 * `mailto:` — renvoie null si pas d'email. Pas de validation stricte de format
 * (l'app mail native gère l'edge), juste présence + encodage minimal.
 */
export function buildMailtoHref(email: string | null | undefined): string | null {
	if (!present(email)) return null;
	return `mailto:${email.trim()}`;
}

/**
 * Itinéraire — Apple Maps via URL universelle (`https://maps.apple.com/?q=`),
 * ouvre l'app Cartes native sur iOS. Renvoie null si pas d'adresse.
 */
export function buildMapsHref(address: string | null | undefined): string | null {
	if (!present(address)) return null;
	return `https://maps.apple.com/?q=${encodeURIComponent(address.trim())}`;
}

export type NativeActionKind = 'call' | 'directions' | 'mail';

export type NativeAction = {
	kind: NativeActionKind;
	/** clé icône (icon-map) */
	icon: string;
	label: string;
	href: string | null;
	/** grisé/non-tapable si la donnée source est absente */
	disabled: boolean;
};

/** Construit les 3 actions natives dans l'ordre Appeler / Itinéraire / Email. */
export function buildNativeActions(input: {
	telephone?: string | null;
	adresse?: string | null;
	email?: string | null;
}): NativeAction[] {
	const tel = buildTelHref(input.telephone);
	const maps = buildMapsHref(input.adresse);
	const mail = buildMailtoHref(input.email);
	return [
		{ kind: 'call', icon: 'call', label: 'Appeler', href: tel, disabled: tel === null },
		{ kind: 'directions', icon: 'directions', label: 'Itinéraire', href: maps, disabled: maps === null },
		{ kind: 'mail', icon: 'mail', label: 'Email', href: mail, disabled: mail === null },
	];
}
