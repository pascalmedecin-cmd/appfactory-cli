<script lang="ts" generics="T extends { id: string; raison_sociale: string; secteur_activite: string | null; canton: string | null; adresse_siege: string | null; site_web: string | null; statut_qualification: string | null }">
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { logoUrlForSite, contactCountForEntreprise, type ContactForEntrepriseLite } from '$lib/utils/entreprisesFormat';

	type Props = {
		entreprises: T[];
		contacts: ReadonlyArray<ContactForEntrepriseLite>;
		onSelect: (entreprise: T) => void;
		emptyMessage?: string;
	};

	let { entreprises, contacts, onSelect, emptyMessage = 'Aucune entreprise.' }: Props = $props();

	function statutBadgeVariant(statut: string | null): 'default' | 'info' | 'success' | 'warning' | 'muted' {
		switch (statut) {
			case 'qualifie':
				return 'success';
			case 'en_cours':
				return 'info';
			case 'nouveau':
				return 'warning';
			default:
				return 'muted';
		}
	}

	function statutLabel(statut: string | null): string {
		switch (statut) {
			case 'qualifie':
				return 'Qualifiée';
			case 'en_cours':
				return 'En cours';
			case 'nouveau':
				return 'Nouveau';
			default:
				return 'À qualifier';
		}
	}

	function siteHostname(site: string | null): string | null {
		if (!site) return null;
		try {
			return new URL(site).hostname.replace(/^www\./, '');
		} catch {
			return site.replace(/^https?:\/\//, '').replace(/\/$/, '');
		}
	}
</script>

{#if entreprises.length === 0}
	<div class="empty">
		<p>{emptyMessage}</p>
	</div>
{:else}
	<div class="cards-grid">
		{#each entreprises as entreprise (entreprise.id)}
			{@const logo = logoUrlForSite(entreprise.site_web)}
			{@const cc = contactCountForEntreprise(entreprise.id, contacts)}
			{@const host = siteHostname(entreprise.site_web)}
			<button
				type="button"
				class="card-visite"
				onclick={() => onSelect(entreprise)}
				aria-label={`${entreprise.raison_sociale}, ${entreprise.secteur_activite ?? 'secteur non renseigné'}, ${cc} contact${cc > 1 ? 's' : ''}, statut ${statutLabel(entreprise.statut_qualification)}`}
			>
				<div class="card-visite-head">
					{#if logo}
						<img
							class="card-visite-logo card-visite-logo--img"
							src={logo}
							alt=""
							onerror={(e) => {
								(e.currentTarget as HTMLElement).style.display = 'none';
								(e.currentTarget.nextElementSibling as HTMLElement).style.display = 'grid';
							}}
						/>
						<span class="card-visite-logo card-visite-logo--placeholder">
							{entreprise.raison_sociale[0]?.toUpperCase() ?? '?'}
						</span>
					{:else}
						<span class="card-visite-logo card-visite-logo--placeholder">
							{entreprise.raison_sociale[0]?.toUpperCase() ?? '?'}
						</span>
					{/if}
					<div class="card-visite-meta">
						<p class="card-visite-name">{entreprise.raison_sociale}</p>
						{#if entreprise.secteur_activite}
							<div class="card-visite-secteur">{entreprise.secteur_activite}</div>
						{/if}
						<div class="card-visite-status">
							<Badge label={statutLabel(entreprise.statut_qualification)} variant={statutBadgeVariant(entreprise.statut_qualification)} />
						</div>
					</div>
				</div>

				<div class="card-visite-rows">
					<div class="card-visite-row">
						<Icon name="location_on" size={16} />
						<span>
							{#if entreprise.canton || entreprise.adresse_siege}
								{entreprise.canton ?? ''}{entreprise.canton && entreprise.adresse_siege ? ' · ' : ''}{entreprise.adresse_siege ?? ''}
							{:else}
								Adresse non renseignée
							{/if}
						</span>
					</div>
					<div class="card-visite-row">
						<Icon name="language" size={16} />
						<span>{host ?? 'Site non renseigné'}</span>
					</div>
					<div class="card-visite-row">
						<Icon name="people" size={16} />
						<span>{cc} contact{cc > 1 ? 's' : ''}</span>
					</div>
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 24px;
	}
	.empty {
		padding: 64px 32px;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.5;
	}
	.card-visite {
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow:
			0 1px 0 rgba(17, 24, 39, 0.02),
			0 0 0 1px rgba(17, 24, 39, 0.04),
			0 8px 20px -12px rgba(17, 24, 39, 0.1);
		padding: 24px;
		cursor: pointer;
		transition:
			transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
		text-align: left;
		border: none;
		font-family: inherit;
		width: 100%;
		display: grid;
		gap: 24px;
	}
	.card-visite:hover {
		transform: translateY(-2px);
		box-shadow:
			0 1px 0 rgba(17, 24, 39, 0.02),
			0 0 0 1px rgba(47, 90, 158, 0.16),
			0 16px 28px -16px rgba(17, 24, 39, 0.14);
	}
	.card-visite:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.card-visite-head {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}
	.card-visite-logo {
		width: 56px;
		height: 56px;
		border-radius: 10px;
		flex-shrink: 0;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}
	.card-visite-logo--img {
		object-fit: contain;
		background: white;
	}
	.card-visite-logo--placeholder {
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 20px;
	}
	.card-visite-meta {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.card-visite-name {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
		line-height: 1.25;
	}
	.card-visite-secteur {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
	.card-visite-rows {
		display: grid;
		gap: 8px;
		padding-top: 16px;
		border-top: 1px solid rgba(17, 24, 39, 0.05);
	}
	.card-visite-row {
		display: grid;
		grid-template-columns: 16px 1fr;
		align-items: center;
		gap: 12px;
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
	.card-visite-row :global(svg) {
		color: var(--color-text-muted);
		opacity: 0.7;
	}
	.card-visite-row span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.card-visite,
		.card-visite:hover {
			transform: none;
			transition: none;
		}
	}
</style>
