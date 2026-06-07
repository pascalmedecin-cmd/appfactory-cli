<script lang="ts">
	/**
	 * ContactSuggestionQueue (desktop) — file de validation des contacts terrain
	 * (DESIGN.md § 4.12/4.13, AC-010). Badge compteur + valider / rejeter /
	 * fusionner en 1 clic via POST /api/contact-suggestions/[id]/resolve.
	 * Ferme la boucle « brouillon mobile → validation bureau » (0 doublon).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';

	type ContactLite = { id: string; prenom: string | null; nom: string | null; entreprise_id: string | null };

	type Suggestion = {
		id: string;
		entreprise_id: string;
		prenom: string | null;
		nom: string | null;
		role_fonction: string | null;
		telephone: string | null;
		email: string | null;
		notes: string | null;
		entreprises: { raison_sociale: string } | { raison_sociale: string }[] | null;
	};

	let { contacts = [] }: { contacts?: ContactLite[] } = $props();

	let suggestions = $state<Suggestion[]>([]);
	let count = $state(0);
	let loaded = $state(false);
	let open = $state(false);
	let busyId = $state<string | null>(null);
	let mergeForId = $state<string | null>(null);

	async function load() {
		try {
			const res = await fetch('/api/contact-suggestions?statut=en_attente');
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				suggestions = body.suggestions ?? [];
				count = body.count_en_attente ?? 0;
			}
		} finally {
			loaded = true;
		}
	}

	$effect(() => {
		if (!loaded) load();
	});

	function raison(s: Suggestion): string {
		const e = s.entreprises;
		const r = Array.isArray(e) ? e[0]?.raison_sociale : e?.raison_sociale;
		return r ?? 'Entreprise';
	}

	function displayName(s: Suggestion): string {
		return [s.prenom, s.nom].filter(Boolean).join(' ').trim() || s.telephone || s.email || 'Contact';
	}

	function entrepriseContacts(entrepriseId: string): ContactLite[] {
		return contacts.filter((c) => c.entreprise_id === entrepriseId);
	}

	async function resolve(s: Suggestion, action: 'valide' | 'rejete', merged_contact_id?: string) {
		if (busyId) return;
		busyId = s.id;
		try {
			const res = await fetch(`/api/contact-suggestions/${s.id}/resolve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(merged_contact_id ? { action, merged_contact_id } : { action }),
			});
			if (res.ok) {
				suggestions = suggestions.filter((x) => x.id !== s.id);
				count = Math.max(0, count - 1);
				mergeForId = null;
				const msg =
					action === 'rejete'
						? 'Suggestion rejetée'
						: merged_contact_id
							? 'Contact fusionné'
							: 'Contact validé';
				toasts.success(msg);
			} else if (res.status === 409) {
				suggestions = suggestions.filter((x) => x.id !== s.id);
				count = Math.max(0, count - 1);
				toasts.info('Suggestion déjà résolue');
			} else {
				const body = await res.json().catch(() => ({}));
				toasts.error(body.error ?? 'Échec de la résolution');
			}
		} catch {
			toasts.error('Réseau indisponible');
		} finally {
			busyId = null;
		}
	}
</script>

{#if count > 0}
	<section class="queue">
		<button type="button" class="qhead" onclick={() => (open = !open)} aria-expanded={open}>
			<span class="badge">{count > 99 ? '99+' : count}</span>
			<span class="qtitle">{count === 1 ? '1 contact terrain à valider' : `${count} contacts terrain à valider`}</span>
			<Icon name={open ? 'expand_less' : 'expand_more'} size={18} class="qchevron" />
		</button>

		{#if open}
			<ul class="qlist">
				{#each suggestions as s (s.id)}
					<li class="card">
						<div class="who">
							<span class="name">{displayName(s)}</span>
							{#if s.role_fonction}<span class="role">{s.role_fonction}</span>{/if}
							<span class="sep">·</span>
							<span class="ent">{raison(s)}</span>
						</div>
						<div class="contactline">
							{#if s.telephone}<span>{s.telephone}</span>{/if}
							{#if s.email}<span>{s.email}</span>{/if}
							{#if s.notes}<span class="notes">{s.notes}</span>{/if}
						</div>

						{#if mergeForId === s.id}
							<div class="merge-picker">
								<p class="mp-title">Fusionner avec un contact existant de {raison(s)} :</p>
								{#if entrepriseContacts(s.entreprise_id).length === 0}
									<p class="mp-empty">Aucun contact existant pour cette entreprise.</p>
								{:else}
									<ul class="mp-list">
										{#each entrepriseContacts(s.entreprise_id) as c (c.id)}
											<li>
												<button
													type="button"
													class="mp-item"
													disabled={busyId === s.id}
													onclick={() => resolve(s, 'valide', c.id)}
												>
													{[c.prenom, c.nom].filter(Boolean).join(' ').trim() || 'Contact sans nom'}
												</button>
											</li>
										{/each}
									</ul>
								{/if}
								<button type="button" class="mp-cancel" onclick={() => (mergeForId = null)}>Annuler</button>
							</div>
						{:else}
							<div class="actions">
								<button class="btn valide" disabled={busyId === s.id} onclick={() => resolve(s, 'valide')}>
									Valider
								</button>
								<button class="btn merge" disabled={busyId === s.id} onclick={() => (mergeForId = s.id)}>
									Fusionner
								</button>
								<button class="btn reject" disabled={busyId === s.id} onclick={() => resolve(s, 'rejete')}>
									Rejeter
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.queue {
		margin-bottom: 16px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		overflow: hidden;
	}
	.qhead {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 12px 16px;
		background: var(--color-primary-light);
		text-align: left;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--color-primary);
		color: var(--color-text-inverse);
		font-size: 13px;
		font-weight: 700;
	}
	.qtitle {
		flex: 1 1 auto;
		font-weight: 600;
		color: var(--color-text);
	}
	.qlist {
		list-style: none;
		margin: 0;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.card {
		padding: 12px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.who {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
	}
	.name {
		font-weight: 600;
		color: var(--color-text);
	}
	.role {
		color: var(--color-text-muted);
	}
	.sep {
		color: var(--color-text-muted);
	}
	.ent {
		color: var(--color-text-body);
	}
	.contactline {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 4px;
		color: var(--color-text-muted);
		font-size: 14px;
	}
	.notes {
		font-style: italic;
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	.btn {
		min-height: 36px;
		padding: 0 14px;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 14px;
		border: 1px solid transparent;
	}
	.btn:disabled {
		opacity: 0.5;
	}
	.valide {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}
	.merge {
		background: var(--color-surface);
		border-color: var(--color-border-input);
		color: var(--color-text-body);
	}
	.reject {
		background: var(--color-surface);
		border-color: var(--color-border-input);
		color: var(--color-danger-deep);
	}
	.merge-picker {
		margin-top: 12px;
		padding: 10px;
		border: 1px dashed var(--color-border-input);
		border-radius: var(--radius-md);
		background: var(--color-surface-alt);
	}
	.mp-title {
		font-size: 14px;
		font-weight: 600;
		margin: 0 0 8px;
		color: var(--color-text);
	}
	.mp-empty {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0 0 8px;
	}
	.mp-list {
		list-style: none;
		margin: 0 0 8px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.mp-item {
		width: 100%;
		text-align: left;
		min-height: 36px;
		padding: 0 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-body);
	}
	.mp-item:hover:not(:disabled) {
		border-color: var(--color-primary);
	}
	.mp-cancel {
		font-size: 14px;
		color: var(--color-text-muted);
		background: transparent;
	}
</style>
