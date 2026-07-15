import { json, error } from '@sveltejs/kit';
import { SESSION_MAX_AGE_MS } from '$lib/utils/time-constants';
import { isMarque } from '$lib/marque';
import type { RequestHandler } from './$types';

/**
 * Atelier 209 Run 2 : bascule de la marque active (FilmPro / LED Studio).
 * Pose un cookie httpOnly `marque` par-appareil (decision Pascal Q3). Sous le gate auth
 * du hook (session requise). Le sidemenu appelle POST puis `invalidateAll()` : tous les
 * `load` re-tournent et le chrome + les donnees se re-filtrent, sans reload dur.
 */
export const POST: RequestHandler = async ({ request, cookies, url }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps JSON invalide.');
	}

	const marque = (body as { marque?: unknown } | null)?.marque;
	if (!isMarque(marque)) {
		throw error(400, 'marque invalide (attendu: filmpro | led).');
	}

	cookies.set('marque', marque, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000)
	});

	return json({ marque });
};
