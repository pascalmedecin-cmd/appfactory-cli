import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { timingSafeEqual } from 'crypto';

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';
const BATCH_LIMIT = 200;
const DELAY_MS = 150;

export function motifArchivage(status: string | null): string | null {
	if (status === 'CANCELLED') return 'Radiée du registre du commerce (Zefix)';
	if (status === 'NOT_FOUND') return 'Introuvable dans Zefix';
	return null;
}

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

function zefixAuthHeader(): string | null {
	const u = env.ZEFIX_USERNAME;
	const p = env.ZEFIX_PASSWORD;
	if (!u || !p) return null;
	return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
}

interface ZefixCompanyResult {
	uid: string;
	name: string;
	status: string;
}

async function fetchZefixStatus(
	uid: string,
	authHeader: string,
): Promise<{ status: string | null; error?: string }> {
	try {
		const resp = await fetch(`${ZEFIX_BASE}/company/uid/${encodeURIComponent(uid)}`, {
			headers: { Authorization: authHeader, Accept: 'application/json' },
		});
		if (resp.status === 404) return { status: 'NOT_FOUND' };
		if (!resp.ok) return { status: null, error: `HTTP ${resp.status}` };
		const data: ZefixCompanyResult[] = await resp.json();
		if (!Array.isArray(data) || data.length === 0) return { status: 'NOT_FOUND' };
		return { status: data[0].status ?? null };
	} catch (err) {
		return { status: null, error: String(err) };
	}
}

export async function GET(event: RequestEvent) {
	const authHeader = event.request.headers.get('authorization');
	if (!verifyCronSecret(authHeader)) {
		return json({ error: 'Non autorisé' }, { status: 401 });
	}

	const zefixAuth = zefixAuthHeader();
	if (!zefixAuth) {
		return json({ error: 'Credentials Zefix non configurés' }, { status: 500 });
	}

	const supabase = createSupabaseServiceClient();

	const { data: entreprises, error: selectErr } = await supabase
		.from('entreprises')
		.select('id, raison_sociale, numero_ide')
		.not('numero_ide', 'is', null)
		.eq('statut_archive', false)
		.order('date_derniere_verification_zefix', { ascending: true, nullsFirst: true })
		.limit(BATCH_LIMIT);

	if (selectErr) {
		return json({ error: `Select: ${selectErr.message}` }, { status: 500 });
	}

	const now = new Date().toISOString();
	let verifiees = 0;
	let archivees = 0;
	const errors: string[] = [];

	for (const e of entreprises ?? []) {
		if (!e.numero_ide) continue;
		const { status, error } = await fetchZefixStatus(e.numero_ide, zefixAuth);
		verifiees++;

		if (error) {
			errors.push(`${e.raison_sociale} (${e.numero_ide}): ${error}`);
			continue;
		}

		const motif = motifArchivage(status);

		if (motif) {
			const { error: updErr } = await supabase
				.from('entreprises')
				.update({
					statut_archive: true,
					archivee_at: now,
					motif_archivage: motif,
					date_derniere_verification_zefix: now,
				})
				.eq('id', e.id);
			if (updErr) {
				errors.push(`${e.raison_sociale} update: ${updErr.message}`);
			} else {
				archivees++;
			}
		} else {
			await supabase
				.from('entreprises')
				.update({ date_derniere_verification_zefix: now })
				.eq('id', e.id);
		}

		await new Promise((r) => setTimeout(r, DELAY_MS));
	}

	if (errors.length > 0) {
		console.error('Cron nettoyage-crm — erreurs:', errors);
	}

	return json({
		message: `${archivees} ${archivees > 1 ? 'entreprises archivées' : 'entreprise archivée'} sur ${verifiees} vérifiée${verifiees > 1 ? 's' : ''}`,
		verifiees,
		archivees,
		errors: errors.length,
	});
}
