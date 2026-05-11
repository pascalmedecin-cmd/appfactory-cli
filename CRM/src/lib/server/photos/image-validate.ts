/**
 * Validation d'upload photo : magic bytes (anti MIME spoofing), MIME whitelist,
 * taille max. Extrait de `routes/api/photos/+server.ts` (audit 360 V2c H-19) pour
 * rendre la défense unit-testable. La seule défense réelle contre un PDF/script
 * déguisé en `image/jpeg` est `detectImageType` : ce module est sa source de vérité.
 */

export const ALLOWED_MIME: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 Mo (cohérent avec compression client)

export type DetectedImageType = 'jpeg' | 'png' | 'webp' | 'heic';

/** Magic bytes : signatures réelles, contre MIME spoofing. */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
	if (bytes.length < 12) return null;
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
	if (
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	)
		return 'png';
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	)
		return 'webp';
	// HEIC : ftyp box at offset 4
	if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
		const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
		if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1') return 'heic';
	}
	return null;
}

export function mimeForDetected(detected: DetectedImageType): string {
	return detected === 'jpeg'
		? 'image/jpeg'
		: detected === 'png'
			? 'image/png'
			: detected === 'webp'
				? 'image/webp'
				: 'image/heic';
}

export function extForDetected(detected: DetectedImageType): (typeof ALLOWED_EXT)[number] {
	return detected === 'jpeg' ? 'jpg' : detected;
}

export type PhotoValidationOk = {
	ok: true;
	detected: DetectedImageType;
	mime: string;
	ext: (typeof ALLOWED_EXT)[number];
};
export type PhotoValidationErr = { ok: false; status: 400 | 413; error: string };

/**
 * Valide un upload photo à partir de son type déclaré, sa taille et ses 16
 * premiers octets. Ordre : MIME whitelist → taille → magic bytes → cohérence
 * type/contenu → extension whitelist (basée sur le type détecté, jamais le nom).
 */
export function validatePhotoUpload(input: {
	type: string;
	size: number;
	headerBytes: Uint8Array;
}): PhotoValidationOk | PhotoValidationErr {
	if (!ALLOWED_MIME.includes(input.type)) {
		return { ok: false, status: 400, error: 'Type fichier non supporté' };
	}
	if (input.size > MAX_PHOTO_BYTES) {
		return { ok: false, status: 413, error: 'Fichier trop lourd (max 5 Mo)' };
	}
	const detected = detectImageType(input.headerBytes);
	if (!detected) {
		return { ok: false, status: 400, error: "Le fichier n'est pas une image valide" };
	}
	if (mimeForDetected(detected) !== input.type) {
		return { ok: false, status: 400, error: 'Incohérence type/contenu fichier' };
	}
	const ext = extForDetected(detected);
	if (!ALLOWED_EXT.includes(ext)) {
		return { ok: false, status: 400, error: 'Extension non autorisée' };
	}
	return { ok: true, detected, mime: input.type, ext };
}
