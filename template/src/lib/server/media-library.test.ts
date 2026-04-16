import { describe, it, expect } from 'vitest';
import { hashContent, detectFormat, qualityScore } from './media-library.js';

describe('media-library utils', () => {
  describe('hashContent', () => {
    it('SHA256 déterministe', () => {
      const buf = Buffer.from('hello');
      expect(hashContent(buf)).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('contenu différent → hash différent', () => {
      expect(hashContent(Buffer.from('a'))).not.toBe(hashContent(Buffer.from('b')));
    });
  });

  describe('detectFormat', () => {
    it('détecte JPEG (FF D8 FF)', () => {
      const buf = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
      expect(detectFormat(buf)).toBe('jpeg');
    });

    it('détecte PNG (89 50 4E 47)', () => {
      const buf = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(20)]);
      expect(detectFormat(buf)).toBe('png');
    });

    it('détecte WebP (RIFF…WEBP)', () => {
      const buf = Buffer.concat([
        Buffer.from('RIFF\0\0\0\0WEBP'),
        Buffer.alloc(20),
      ]);
      expect(detectFormat(buf)).toBe('webp');
    });

    it('renvoie null sur buffer inconnu', () => {
      expect(detectFormat(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]))).toBe(null);
    });

    it('renvoie null sur buffer trop court', () => {
      expect(detectFormat(Buffer.from([0xff]))).toBe(null);
    });
  });

  describe('qualityScore', () => {
    it('image HD 1600×900 jpeg → score élevé', () => {
      const { score, is_placeholder } = qualityScore(1600, 900, 'jpeg', 250);
      expect(score).toBeGreaterThanOrEqual(8);
      expect(is_placeholder).toBe(false);
    });

    it('image ratio 1.91:1 parfait → pas de pénalité ratio', () => {
      const { score } = qualityScore(1200, 628, 'jpeg', 200);
      expect(score).toBe(10);
    });

    it('image trop petite (<600×315) → pénalité', () => {
      const { score } = qualityScore(400, 300, 'jpeg', 50);
      expect(score).toBeLessThan(8);
    });

    it('image minuscule <300×200 → placeholder', () => {
      const { score, is_placeholder } = qualityScore(64, 64, 'png', 5);
      expect(score).toBe(0);
      expect(is_placeholder).toBe(true);
    });

    it('fichier <20Ko → placeholder (favicon suspect)', () => {
      const { is_placeholder } = qualityScore(800, 600, 'png', 15);
      expect(is_placeholder).toBe(true);
    });

    it('ratio déviant (carré 1:1) → pénalité', () => {
      const { score: landscape } = qualityScore(1600, 900, 'jpeg', 200);
      const { score: square } = qualityScore(1024, 1024, 'jpeg', 200);
      expect(square).toBeLessThan(landscape);
    });

    it('PNG volumineux → pénalité', () => {
      const { score: small } = qualityScore(1600, 900, 'png', 500);
      const { score: bloat } = qualityScore(1600, 900, 'png', 5000);
      expect(bloat).toBeLessThan(small);
    });
  });
});
