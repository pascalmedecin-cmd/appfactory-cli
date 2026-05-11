import { describe, it, expect } from 'vitest';
import {
	detectImageType,
	validatePhotoUpload,
	MAX_PHOTO_BYTES,
	ALLOWED_MIME
} from './image-validate';

// Audit 360 V2c H-19 : régression magic bytes / anti MIME spoofing pour les uploads photo.

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const WEBP = new Uint8Array([
	0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
]);
const HEIC = new Uint8Array([
	0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63
]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x00, 0x00]); // %PDF-1.4

describe('detectImageType (H-19)', () => {
	it('reconnaît un PNG par ses magic bytes', () => {
		expect(detectImageType(PNG)).toBe('png');
	});
	it('reconnaît un JPEG par ses magic bytes', () => {
		expect(detectImageType(JPEG)).toBe('jpeg');
	});
	it('reconnaît un WEBP par ses magic bytes', () => {
		expect(detectImageType(WEBP)).toBe('webp');
	});
	it('reconnaît un HEIC (ftyp box heic)', () => {
		expect(detectImageType(HEIC)).toBe('heic');
	});
	it('rejette un PDF (signature %PDF) → null', () => {
		expect(detectImageType(PDF)).toBeNull();
	});
	it('rejette un buffer vide → null', () => {
		expect(detectImageType(new Uint8Array([]))).toBeNull();
	});
	it('rejette un buffer trop court (< 12 octets) → null', () => {
		expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
	});
	it('rejette du texte arbitraire → null', () => {
		expect(detectImageType(new TextEncoder().encode('not an image at all!'))).toBeNull();
	});
});

describe('validatePhotoUpload (H-19)', () => {
	it('accepte un PNG déclaré image/png sous la limite de taille', () => {
		const r = validatePhotoUpload({ type: 'image/png', size: 1024, headerBytes: PNG });
		expect(r.ok).toBe(true);
		expect(r.ok && r.detected).toBe('png');
		expect(r.ok && r.ext).toBe('png');
		expect(r.ok && r.mime).toBe('image/png');
	});

	it('accepte un JPEG déclaré image/jpeg → extension jpg', () => {
		const r = validatePhotoUpload({ type: 'image/jpeg', size: 2048, headerBytes: JPEG });
		expect(r.ok && r.ext).toBe('jpg');
	});

	it('rejette un type MIME non whitelisté (image/gif) → 400', () => {
		const r = validatePhotoUpload({ type: 'image/gif', size: 100, headerBytes: PNG });
		expect(r.ok).toBe(false);
		expect(!r.ok && r.status).toBe(400);
		expect(!r.ok && r.error).toMatch(/non supporté/i);
	});

	it('rejette un fichier > 5 Mo → 413', () => {
		const r = validatePhotoUpload({
			type: 'image/jpeg',
			size: MAX_PHOTO_BYTES + 1,
			headerBytes: JPEG
		});
		expect(r.ok).toBe(false);
		expect(!r.ok && r.status).toBe(413);
		expect(!r.ok && r.error).toMatch(/trop lourd/i);
	});

	it('rejette un PDF déguisé en image/jpeg (magic bytes invalides) → 400', () => {
		const r = validatePhotoUpload({ type: 'image/jpeg', size: 500, headerBytes: PDF });
		expect(r.ok).toBe(false);
		expect(!r.ok && r.status).toBe(400);
		expect(!r.ok && r.error).toMatch(/n'est pas une image valide/i);
	});

	it("rejette une incohérence type/contenu (PNG déclaré image/jpeg) → 400", () => {
		const r = validatePhotoUpload({ type: 'image/jpeg', size: 500, headerBytes: PNG });
		expect(r.ok).toBe(false);
		expect(!r.ok && r.status).toBe(400);
		expect(!r.ok && r.error).toMatch(/incohérence/i);
	});

	it('limite de taille = 5 Mo exactement', () => {
		expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024);
	});

	it('whitelist MIME = jpeg/png/webp/heic', () => {
		expect(ALLOWED_MIME).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
	});
});
