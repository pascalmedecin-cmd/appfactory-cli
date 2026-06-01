<script lang="ts">
	/**
	 * CompteRenduForm — saisie d'une visite terrain (DESIGN.md § 4.10).
	 * Résultat (enum fermé) + note + photos (état d'envoi par photo, AC-011) +
	 * GPS optionnel (AC-015). Écrit dans prospect_visits (POST /api/visits) ;
	 * photos via POST /api/photos (rattachées à l'entreprise). Overlay plein écran.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import {
		RESULTAT_VISITE,
		RESULTAT_VISITE_LABELS,
		type ResultatVisite,
	} from '$lib/types/visit-result';

	type Props = {
		entrepriseId: string;
		raisonSociale: string;
		onClose: () => void;
		onSaved: () => void;
	};
	let { entrepriseId, raisonSociale, onClose, onSaved }: Props = $props();

	type PhotoItem = {
		localId: string;
		previewUrl: string;
		state: 'envoi' | 'envoye' | 'echec';
		file: File;
		serverId?: string;
	};

	let resultat = $state<ResultatVisite | null>(null);
	let note = $state('');
	let photos = $state<PhotoItem[]>([]);
	let withGps = $state(false);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	const MAX_PHOTOS = 10;
	const NOTE_MAX = 2000;

	const noteCount = $derived(note.length);
	const canSave = $derived(resultat !== null && !saving);

	let fileInput: HTMLInputElement;

	const STATE_META: Record<PhotoItem['state'], { icon: string; label: string; cls: string }> = {
		envoi: { icon: 'progress_activity', label: 'Envoi…', cls: 'st-envoi' },
		envoye: { icon: 'check', label: 'Envoyé', cls: 'st-envoye' },
		echec: { icon: 'retry', label: 'Réessayer', cls: 'st-echec' },
	};

	async function uploadPhoto(item: PhotoItem) {
		const fd = new FormData();
		fd.append('file', item.file);
		try {
			const res = await fetch(`/api/photos?entreprise_id=${entrepriseId}`, {
				method: 'POST',
				body: fd,
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok && body.photo) {
				updatePhoto(item.localId, { state: 'envoye', serverId: body.photo.id });
			} else {
				updatePhoto(item.localId, { state: 'echec' });
			}
		} catch {
			updatePhoto(item.localId, { state: 'echec' });
		}
	}

	function updatePhoto(localId: string, patch: Partial<PhotoItem>) {
		photos = photos.map((p) => (p.localId === localId ? { ...p, ...patch } : p));
	}

	function onPickFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		for (const file of files) {
			if (photos.length >= MAX_PHOTOS) break;
			const item: PhotoItem = {
				localId: `${file.name}-${file.size}-${photos.length}-${file.lastModified}`,
				previewUrl: URL.createObjectURL(file),
				state: 'envoi',
				file,
			};
			photos = [...photos, item];
			uploadPhoto(item);
		}
		input.value = '';
	}

	function retry(item: PhotoItem) {
		if (item.state !== 'echec') return;
		updatePhoto(item.localId, { state: 'envoi' });
		uploadPhoto({ ...item, state: 'envoi' });
	}

	function captureGps(): Promise<{ lat: number; lng: number; accuracy_m: number } | null> {
		if (!withGps || typeof navigator === 'undefined' || !navigator.geolocation) {
			return Promise.resolve(null);
		}
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(pos) =>
					resolve({
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
						accuracy_m: Math.round(pos.coords.accuracy),
					}),
				() => resolve(null), // refus/indispo → visite sans coordonnées (AC-015)
				{ enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
			);
		});
	}

	async function save() {
		if (!canSave || resultat === null) return;
		saving = true;
		saveError = null;
		const gps = await captureGps();
		const payload: Record<string, unknown> = { entreprise_id: entrepriseId, resultat };
		if (note.trim()) payload.note = note.trim();
		if (gps) {
			payload.lat = gps.lat;
			payload.lng = gps.lng;
			payload.accuracy_m = gps.accuracy_m;
		}
		try {
			const res = await fetch('/api/visits', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				onSaved();
			} else {
				const body = await res.json().catch(() => ({}));
				saveError = body.error ?? "Échec de l'enregistrement. Réessayez.";
			}
		} catch {
			saveError = 'Réseau indisponible. Votre saisie est conservée, réessayez.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Compte-rendu de visite">
	<header class="ov-header">
		<button type="button" class="ghost" onclick={onClose}>Annuler</button>
		<span class="ov-title">Compte-rendu</span>
		<span class="spacer"></span>
	</header>

	<div class="ov-body">
		<p class="ent text-base text-[var(--color-text-muted)] truncate">{raisonSociale}</p>

		<!-- Résultat (enum fermé, jamais d'« Autre ») -->
		<fieldset class="block">
			<legend class="lbl">Résultat</legend>
			<div class="results">
				{#each RESULTAT_VISITE as r (r)}
					<button
						type="button"
						class="result"
						class:selected={resultat === r}
						aria-pressed={resultat === r}
						onclick={() => (resultat = r)}
					>
						<span class="text-base font-medium">{RESULTAT_VISITE_LABELS[r]}</span>
						{#if resultat === r}
							<Icon name="check" size={20} class="rc" />
						{/if}
					</button>
				{/each}
			</div>
		</fieldset>

		<!-- Note (optionnelle, dictée iOS native) -->
		<div class="block">
			<label class="lbl" for="cr-note">Note <span class="opt">(optionnel)</span></label>
			<textarea
				id="cr-note"
				class="note"
				rows="3"
				maxlength={NOTE_MAX}
				bind:value={note}
				placeholder="Ce que vous retenez de la visite…"
			></textarea>
			{#if noteCount > 1800}
				<p class="count" class:over={noteCount >= NOTE_MAX}>{noteCount} / {NOTE_MAX}</p>
			{/if}
		</div>

		<!-- Photos (capture native + état d'envoi par photo) -->
		<div class="block">
			<span class="lbl">Photos <span class="opt">({photos.length}/{MAX_PHOTOS})</span></span>
			<div class="grid">
				{#each photos as p (p.localId)}
					<button
						type="button"
						class="thumb"
						onclick={() => retry(p)}
						aria-label={p.state === 'echec' ? 'Réessayer l envoi' : 'Photo'}
					>
						<img src={p.previewUrl} alt="" />
						<span class="badge {STATE_META[p.state].cls}">
							<Icon
								name={STATE_META[p.state].icon}
								size={14}
								class={p.state === 'envoi' ? 'spin' : ''}
							/>
							<span class="bl">{STATE_META[p.state].label}</span>
						</span>
					</button>
				{/each}
				{#if photos.length < MAX_PHOTOS}
					<button type="button" class="add" onclick={() => fileInput.click()}>
						<Icon name="camera" size={22} />
						<span class="text-base">Photo</span>
					</button>
				{/if}
			</div>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				capture="environment"
				multiple
				class="hidden-input"
				onchange={onPickFiles}
			/>
		</div>

		<!-- GPS optionnel -->
		<label class="gps">
			<input type="checkbox" bind:checked={withGps} />
			<span class="text-base text-[var(--color-text-body)]">Enregistrer ma position (optionnel)</span>
		</label>

		{#if saveError}
			<p class="err" role="alert">{saveError}</p>
		{/if}
	</div>

	<footer class="ov-footer">
		<button type="button" class="cta" disabled={!canSave} onclick={save}>
			{#if saving}
				<Icon name="progress_activity" size={18} class="spin" />
				<span>Enregistrement…</span>
			{:else}
				<span>Enregistrer la visite</span>
			{/if}
		</button>
	</footer>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		background: var(--color-surface-alt);
	}
	.ov-header {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px var(--mobile-gutter);
		padding-top: calc(10px + env(safe-area-inset-top, 0px));
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.ov-title {
		font-size: 17px;
		font-weight: 700;
		color: var(--color-text);
	}
	.ghost {
		min-height: 44px;
		padding: 0 4px;
		font-size: 16px;
		color: var(--color-primary);
		background: transparent;
	}
	.spacer {
		width: 56px;
	}
	.ov-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: var(--mobile-gutter);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.ent {
		margin: -4px 0 0;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: 8px;
		border: 0;
		padding: 0;
		margin: 0;
	}
	.lbl {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
	}
	.opt {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.results {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.result {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 52px;
		padding: 0 16px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text-body);
		text-align: left;
	}
	.result.selected {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
		color: var(--color-text);
	}
	.result :global(.rc) {
		color: var(--color-primary);
		flex: 0 0 auto;
	}
	.note {
		width: 100%;
		min-height: 88px;
		padding: 12px;
		font-size: 16px;
		font-family: var(--font-sans);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
		resize: vertical;
	}
	.note:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: -1px;
	}
	.count {
		align-self: flex-end;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.count.over {
		color: var(--color-danger);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 8px;
	}
	.thumb,
	.add {
		position: relative;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.add {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		color: var(--color-primary);
		border-style: dashed;
		min-height: 96px;
	}
	.badge {
		position: absolute;
		left: 4px;
		bottom: 4px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
	}
	.st-envoi {
		background: var(--color-warning-light);
		color: var(--color-text-body);
	}
	.st-envoye {
		background: var(--color-success-light);
		color: #05603A;
	}
	.st-echec {
		background: var(--color-danger-light);
		color: #B42318;
	}
	.gps {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
	}
	.gps input {
		width: 22px;
		height: 22px;
		accent-color: var(--color-primary);
	}
	.err {
		font-size: 16px;
		color: #B42318;
		background: var(--color-danger-light);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: 10px 12px;
	}
	.ov-footer {
		flex: 0 0 auto;
		padding: 12px var(--mobile-gutter);
		padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}
	.cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		min-height: var(--mobile-cta-h);
		border-radius: var(--radius-lg);
		background: var(--color-primary);
		color: var(--color-text-inverse);
		font-size: 17px;
		font-weight: 600;
	}
	.cta:active:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.cta:disabled {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	.hidden-input {
		display: none;
	}
	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
