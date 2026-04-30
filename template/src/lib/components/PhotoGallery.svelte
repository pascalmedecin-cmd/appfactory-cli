<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toasts } from '$lib/stores/toast';

	type Photo = {
		id: string;
		storage_path: string;
		caption: string | null;
		uploaded_at: string;
		size_bytes: number | null;
		mime_type: string | null;
		url: string | null;
	};

	let {
		leadId = null,
		entrepriseId = null,
	}: { leadId?: string | null; entrepriseId?: string | null } = $props();

	const MAX_PHOTOS = 10;
	const COMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB
	const MAX_DIMENSION = 1920;
	const COMPRESS_QUALITY = 0.85;
	const MAX_BYTES_SERVER = 5 * 1024 * 1024; // Cohérent avec /api/photos

	let photos = $state<Photo[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let lightboxUrl = $state<string | null>(null);
	let inputEl: HTMLInputElement | undefined = $state();
	let confirmOpen = $state(false);
	let pendingDelete = $state<Photo | null>(null);

	const ownerQuery = $derived.by(() => {
		if (leadId) return `lead_id=${leadId}`;
		if (entrepriseId) return `entreprise_id=${entrepriseId}`;
		return null;
	});

	onMount(() => {
		void loadPhotos();
	});

	async function loadPhotos() {
		if (!ownerQuery) return;
		loading = true;
		try {
			const resp = await fetch(`/api/photos?${ownerQuery}`);
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				toasts.error(err.error ?? 'Erreur chargement photos');
				photos = [];
				return;
			}
			const data = await resp.json();
			photos = data.photos ?? [];
		} catch (err) {
			toasts.error(`Erreur chargement photos : ${String(err)}`);
		} finally {
			loading = false;
		}
	}

	async function compressImage(file: File): Promise<File> {
		if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;

		const img = new Image();
		const objectUrl = URL.createObjectURL(file);
		try {
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error('Image invalide'));
				img.src = objectUrl;
			});

			let { width, height } = img;
			if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
				const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
				width = Math.round(width * ratio);
				height = Math.round(height * ratio);
			}

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return file;
			ctx.drawImage(img, 0, 0, width, height);

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((b) => resolve(b), 'image/jpeg', COMPRESS_QUALITY);
			});
			if (!blob) return file;

			return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
				type: 'image/jpeg',
				lastModified: Date.now(),
			});
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !ownerQuery) return;

		if (photos.length >= MAX_PHOTOS) {
			toasts.error(`Limite de ${MAX_PHOTOS} photos atteinte`);
			target.value = '';
			return;
		}

		uploading = true;
		try {
			const compressed = await compressImage(file).catch(() => file);
			if (compressed.size > MAX_BYTES_SERVER) {
				toasts.error('Photo trop lourde après compression (max 5 Mo). Réessaie avec une image plus petite.');
				return;
			}
			const fd = new FormData();
			fd.append('file', compressed);

			const resp = await fetch(`/api/photos?${ownerQuery}`, { method: 'POST', body: fd });
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				toasts.error(err.error ?? 'Upload échoué');
				return;
			}
			const data = await resp.json();
			if (data.photo) {
				photos = [data.photo, ...photos];
				toasts.success('Photo ajoutée');
			}
		} catch (err) {
			toasts.error(`Erreur upload : ${String(err)}`);
		} finally {
			uploading = false;
			target.value = '';
		}
	}

	function askDelete(photo: Photo) {
		pendingDelete = photo;
		confirmOpen = true;
	}

	async function confirmDelete() {
		const photo = pendingDelete;
		confirmOpen = false;
		if (!photo) return;
		pendingDelete = null;
		const previous = photos;
		photos = photos.filter((p) => p.id !== photo.id);
		try {
			const resp = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });
			if (!resp.ok) {
				photos = previous;
				const err = await resp.json().catch(() => ({}));
				toasts.error(err.error ?? 'Suppression échouée');
				return;
			}
			toasts.success('Photo supprimée');
		} catch (err) {
			photos = previous;
			toasts.error(`Erreur suppression : ${String(err)}`);
		}
	}

	function openLightbox(photo: Photo) {
		if (photo.url) lightboxUrl = photo.url;
	}

	function closeLightbox() {
		lightboxUrl = null;
	}

	function triggerInput() {
		inputEl?.click();
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">
			Photos chantier{photos.length > 0 ? ` (${photos.length}/${MAX_PHOTOS})` : ''}
		</h4>
	</div>

	{#if loading}
		<p class="text-xs text-text-muted">Chargement…</p>
	{:else if photos.length === 0}
		<p class="text-xs text-text-muted">Aucune photo. Ajoute une vue façade ou vitrage pour étoffer le dossier.</p>
	{:else}
		<div class="grid grid-cols-3 gap-2">
			{#each photos as photo (photo.id)}
				<div class="relative group aspect-square rounded-md overflow-hidden bg-surface-alt border border-border">
					{#if photo.url}
						<button
							type="button"
							onclick={() => openLightbox(photo)}
							class="block w-full h-full cursor-zoom-in"
							aria-label="Voir photo en plein écran"
						>
							<img src={photo.url} alt={photo.caption ?? 'Photo chantier'} class="w-full h-full object-cover" loading="lazy" />
						</button>
					{:else}
						<div class="flex items-center justify-center w-full h-full text-text-muted text-xs">
							<Icon name="image" size={20} />
						</div>
					{/if}
					<button
						type="button"
						onclick={() => askDelete(photo)}
						class="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-danger transition cursor-pointer"
						aria-label="Supprimer la photo"
					>
						<Icon name="delete" size={14} />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<input
		bind:this={inputEl}
		type="file"
		accept="image/jpeg,image/png,image/webp,image/heic"
		capture="environment"
		onchange={handleFileChange}
		class="hidden"
	/>

	<button
		type="button"
		onclick={triggerInput}
		disabled={uploading || photos.length >= MAX_PHOTOS || !ownerQuery}
		class="w-full min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
	>
		<Icon name="camera" size={18} />
		{uploading ? 'Envoi…' : 'Ajouter photo'}
	</button>
</div>

{#if lightboxUrl}
	<button
		type="button"
		onclick={closeLightbox}
		class="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
		aria-label="Fermer la photo"
	>
		<img src={lightboxUrl} alt="" class="max-w-full max-h-full object-contain" />
	</button>
{/if}

<ConfirmModal
	bind:open={confirmOpen}
	title="Supprimer la photo ?"
	message="Cette action est irréversible. La photo sera retirée du dossier."
	confirmLabel="Supprimer"
	variant="danger"
	onConfirm={confirmDelete}
/>
