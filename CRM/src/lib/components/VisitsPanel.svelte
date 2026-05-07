<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toasts } from '$lib/stores/toast';

	type Visit = {
		id: string;
		visited_at: string;
		lat: number;
		lng: number;
		accuracy_m: number | null;
		address_resolved: string | null;
		distance_from_zefix_m: number | null;
		user_id: string | null;
	};

	let {
		leadId = null,
		entrepriseId = null,
	}: { leadId?: string | null; entrepriseId?: string | null } = $props();

	const GEOLOC_TIMEOUT_MS = 15_000;
	const DISTANCE_FLAG_THRESHOLD_M = 100;

	let visits = $state<Visit[]>([]);
	let parentAddressRaw = $state<string | null>(null);
	let loading = $state(true);
	let capturing = $state(false);
	let confirmOpen = $state(false);
	let pendingDelete = $state<Visit | null>(null);

	const ownerQuery = $derived.by(() => {
		if (leadId) return `lead_id=${leadId}`;
		if (entrepriseId) return `entreprise_id=${entrepriseId}`;
		return null;
	});

	const ownerBody = $derived.by(() => {
		if (leadId) return { lead_id: leadId };
		if (entrepriseId) return { entreprise_id: entrepriseId };
		return null;
	});

	onMount(() => {
		void loadVisits();
	});

	async function loadVisits() {
		if (!ownerQuery) return;
		loading = true;
		try {
			const resp = await fetch(`/api/visits?${ownerQuery}`);
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				toasts.error(err.error ?? 'Erreur chargement visites');
				visits = [];
				return;
			}
			const data = await resp.json();
			visits = data.visits ?? [];
			parentAddressRaw = data.parent_address_raw ?? null;
		} catch (err) {
			toasts.error(`Erreur chargement visites : ${String(err)}`);
		} finally {
			loading = false;
		}
	}

	function getCurrentPosition(): Promise<GeolocationPosition> {
		return new Promise((resolve, reject) => {
			if (!('geolocation' in navigator)) {
				reject(new Error('GEOLOC_UNSUPPORTED'));
				return;
			}
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
				timeout: GEOLOC_TIMEOUT_MS,
				maximumAge: 0,
			});
		});
	}

	async function checkIn() {
		if (!ownerBody) return;
		capturing = true;
		try {
			let position: GeolocationPosition;
			try {
				position = await getCurrentPosition();
			} catch (err) {
				const e = err as GeolocationPositionError | Error;
				if ('code' in e && e.code === 1) {
					toasts.error('Géolocalisation refusée. Activez-la dans les réglages du navigateur pour utiliser le check-in.');
				} else if ('code' in e && e.code === 2) {
					toasts.error('Position indisponible. Vérifiez votre connexion ou réessayez en extérieur.');
				} else if ('code' in e && e.code === 3) {
					toasts.error('Délai dépassé pour la géolocalisation. Réessayez.');
				} else {
					toasts.error(`Géolocalisation impossible : ${String(e.message ?? e)}`);
				}
				return;
			}

			const resp = await fetch('/api/visits', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...ownerBody,
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy_m: position.coords.accuracy,
				}),
			});
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				toasts.error(err.error ?? 'Erreur enregistrement visite');
				return;
			}
			const data = await resp.json();
			const newVisit = data.visit as Visit;
			const diag = data.geocode_diag as string | undefined;
			visits = [newVisit, ...visits];

			const distance = newVisit.distance_from_zefix_m;
			if (distance != null && distance > DISTANCE_FLAG_THRESHOLD_M) {
				toasts.success(`Visite confirmée (écart ${Math.round(distance)} m vs adresse)`);
			} else if (distance == null && diag === 'no_address_in_db') {
				toasts.success('Visite confirmée. Adresse de l\'entreprise vide en base, pas de comparaison possible.');
			} else if (distance == null && diag === 'geocoder_no_match') {
				toasts.success('Visite confirmée. Adresse non reconnue par le géocodeur, pas de comparaison.');
			} else {
				toasts.success('Visite confirmée');
			}
		} finally {
			capturing = false;
		}
	}

	function askDelete(visit: Visit) {
		pendingDelete = visit;
		confirmOpen = true;
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		const id = pendingDelete.id;
		try {
			const resp = await fetch(`/api/visits/${id}`, { method: 'DELETE' });
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				toasts.error(err.error ?? 'Erreur suppression');
				return;
			}
			visits = visits.filter((v) => v.id !== id);
			toasts.success('Visite supprimée');
		} finally {
			pendingDelete = null;
			confirmOpen = false;
		}
	}

	function formatDate(iso: string): string {
		try {
			const d = new Date(iso);
			return d.toLocaleString('fr-CH', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
		}
	}

	function distanceVariant(distance: number | null): 'success' | 'warning' | 'muted' {
		if (distance == null) return 'muted';
		return distance <= DISTANCE_FLAG_THRESHOLD_M ? 'success' : 'warning';
	}

	function distanceLabel(distance: number | null): string {
		if (distance == null) return 'Adresse non géocodée';
		if (distance < 1000) return `${Math.round(distance)} m`;
		return `${(distance / 1000).toFixed(1)} km`;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Visites terrain</h4>
		<span class="text-xs text-text-muted">{visits.length} visite{visits.length > 1 ? 's' : ''}</span>
	</div>

	<button
		type="button"
		onclick={checkIn}
		disabled={capturing || !ownerBody}
		class="flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
	>
		<Icon
			name={capturing ? 'progress_activity' : 'pin_drop'}
			size={18}
			class={capturing ? 'animate-spin' : ''}
		/>
		{capturing ? 'Localisation en cours…' : 'Check-in visite'}
	</button>
	<p class="text-[11px] text-text-muted">Géocodage adresses suisses uniquement (swisstopo).</p>

	{#if parentAddressRaw && visits.length > 0}
		<p class="text-xs text-text-muted">
			<span class="font-medium">Adresse de référence :</span> {parentAddressRaw}
		</p>
	{:else if !parentAddressRaw && visits.length > 0 && !loading}
		<p class="text-xs text-warning">
			Adresse de référence absente en base. La distance ne peut pas être calculée tant que la fiche n'est pas enrichie.
		</p>
	{/if}

	{#if loading}
		<p class="text-sm text-text-muted">Chargement de l'historique…</p>
	{:else if visits.length === 0}
		<p class="text-sm text-text-muted">Aucune visite enregistrée pour l'instant.</p>
	{:else}
		<ul class="space-y-2">
			{#each visits as visit (visit.id)}
				<li class="flex items-start justify-between gap-3 p-3 bg-surface-alt border border-border rounded-lg">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="text-sm font-medium text-text-body">{formatDate(visit.visited_at)}</span>
							<Badge
								variant={distanceVariant(visit.distance_from_zefix_m)}
								label={distanceLabel(visit.distance_from_zefix_m)}
							/>
						</div>
						{#if visit.address_resolved}
							<p class="text-xs text-text-muted mt-1 truncate" title={visit.address_resolved}>
								{visit.address_resolved}
							</p>
						{/if}
						<a
							href={`https://www.google.com/maps?q=${visit.lat},${visit.lng}`}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
						>
							<Icon name="map" size={12} />
							{visit.lat.toFixed(5)}, {visit.lng.toFixed(5)}
							{#if visit.accuracy_m != null}
								<span class="text-text-muted">(±{Math.round(visit.accuracy_m)} m)</span>
							{/if}
						</a>
					</div>
					<button
						type="button"
						onclick={() => askDelete(visit)}
						aria-label="Supprimer cette visite"
						class="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-error hover:bg-error/10 transition-colors"
					>
						<Icon name="delete" size={16} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<ConfirmModal
	bind:open={confirmOpen}
	title="Supprimer la visite ?"
	message="Cette visite sera supprimée définitivement."
	confirmLabel="Supprimer"
	variant="danger"
	onConfirm={confirmDelete}
/>
