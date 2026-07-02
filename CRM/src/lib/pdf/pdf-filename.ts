/**
 * Convention de nommage des PDF téléchargeables de la page Campagnes - SOURCE UNIQUE.
 *
 * Décision Pascal 2026-07-02 : les fichiers doivent être clairs et explicites dans le Finder,
 * donc format « <Type> - <Nom de campagne> - <date du jour>.pdf » avec le nom de campagne
 * VERBATIM (accents et majuscules conservés - plus lisible qu'un slug), ex. :
 *   « Étiquettes - Mailing Commerces - Vernis solaire - 02.07.2026.pdf »
 *   « Prospects - Mailing Commerces - Vernis solaire - 02.07.2026.pdf »
 *
 * Le nom de campagne est nettoyé des seuls caractères interdits par les systèmes de fichiers
 * (macOS/Windows, y compris les caractères de contrôle) + tirets longs normalisés (règle typo
 * FR) ; espaces effondrés ; borné à 80 caractères ; points/espaces de fin retirés (contrainte
 * Windows). Pure, testable.
 */
const FORBIDDEN_CHARS = ['\\\\', '/', ':', '\\*', '\\?', '"', '<', '>', '\\|', '\\x00-\\x1f'];
const FORBIDDEN = new RegExp(`[${FORBIDDEN_CHARS.join('')}]`, 'g');

export function campagnePdfFileName(type: string, campagneNom: string, date: Date): string {
	const nom =
		campagneNom
			.replace(/[—–]/g, '-')
			.replace(FORBIDDEN, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 80)
			.replace(/[\s.]+$/, '') || 'Campagne';
	const jour = date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
	return `${type} - ${nom} - ${jour}.pdf`;
}
