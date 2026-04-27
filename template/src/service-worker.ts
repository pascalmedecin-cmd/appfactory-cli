/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `filmpro-crm-cache-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
	);
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		)
	);
	sw.clients.claim();
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	if (url.origin !== sw.location.origin) return;
	if (url.pathname.startsWith('/api/')) return;
	if (event.request.headers.get('accept')?.includes('text/html')) return;

	const isPrecachedAsset = ASSETS.includes(url.pathname);
	const isAppBuildAsset = url.pathname.startsWith('/_app/');

	if (!isPrecachedAsset && !isAppBuildAsset) return;

	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const cached = await cache.match(event.request);
			if (cached) return cached;

			const response = await fetch(event.request);
			if (response.ok) cache.put(event.request, response.clone());
			return response;
		})
	);
});
