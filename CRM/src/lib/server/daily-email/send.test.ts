import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendDailyEmail } from './send';
import type { EmailDailyConfig } from './config';
import type { DailyEmailInput } from './template';
import type { TacheDue } from '$lib/utils/dashboardTemporel';

const ENABLED: EmailDailyConfig = {
	enabled: true,
	apiKey: 're_test',
	to: ['pascal@filmpro.ch', 'antoine@filmpro.ch'],
	from: 'FilmPro CRM <notifications@lamaisoncreativedirection.ch>'
};

const tache = (titre: string, date: string | null = null): TacheDue => ({
	id: titre,
	titre,
	etape_pipeline: null,
	date_relance_prevue: date,
	entreprise: null
});

const INPUT: DailyEmailInput = {
	today: [tache('A')],
	late: [tache('B', '2026-06-24T00:00:00+00:00')],
	todayTotal: 1,
	lateTotal: 1,
	todayIso: '2026-06-26',
	now: new Date('2026-06-26T05:00:00Z')
};

describe('sendDailyEmail - gating (best-effort, jamais de throw)', () => {
	afterEach(() => vi.restoreAllMocks());

	it('skip si enabled=false (aucun fetch)', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const r = await sendDailyEmail(INPUT, { ...ENABLED, enabled: false });
		expect(r.skipped).toBe(true);
		expect(r.ok).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('skip si apiKey manquante', async () => {
		const r = await sendDailyEmail(INPUT, { ...ENABLED, apiKey: undefined });
		expect(r.skipped).toBe(true);
		expect(r.ok).toBe(false);
	});

	it('skip si aucun destinataire', async () => {
		const r = await sendDailyEmail(INPUT, { ...ENABLED, to: [] });
		expect(r.skipped).toBe(true);
	});
});

describe('sendDailyEmail - envoi Resend', () => {
	afterEach(() => vi.restoreAllMocks());

	it('envoie aux 2 fondateurs + retourne resendId', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'daily-1' }) });
		vi.stubGlobal('fetch', fetchMock);

		const r = await sendDailyEmail(INPUT, ENABLED);
		expect(r.ok).toBe(true);
		expect(r.resendId).toBe('daily-1');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, opts] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.resend.com/emails');
		const body = JSON.parse(opts.body);
		expect(body.to).toEqual(['pascal@filmpro.ch', 'antoine@filmpro.ch']);
		expect(body.from).toBe('FilmPro CRM <notifications@lamaisoncreativedirection.ch>');
		expect(body.subject).toContain('Relances du jour');
		expect(opts.headers.Authorization).toBe('Bearer re_test');
	});

	it('HTTP non-2xx -> ok:false + reason, pas de throw', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'bad' });
		vi.stubGlobal('fetch', fetchMock);
		const r = await sendDailyEmail(INPUT, ENABLED);
		expect(r.ok).toBe(false);
		expect(r.reason).toContain('Resend 422');
	});

	it('exception fetch -> ok:false (best-effort)', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
		vi.stubGlobal('fetch', fetchMock);
		const r = await sendDailyEmail(INPUT, ENABLED);
		expect(r.ok).toBe(false);
		expect(r.reason).toContain('network down');
	});
});
