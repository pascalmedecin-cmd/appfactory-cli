<script lang="ts">
	/**
	 * ActivityFeed (Dashboard temporel, Vague 3.3) : fil vertical « ce qui s'est passé ».
	 * Source = la table `activites` (données réelles, ADR-0005 : pas de faux feed inventé).
	 * Pastille colorée par type d'interaction. État vide chaleureux, jamais une zone muette.
	 */
	import { formatRelativeDate } from '$lib/utils/dateFormat';

	type Activite = {
		id: string;
		type_activite: string | null;
		resume_contenu: string | null;
		date_heure: string | null;
		contact_id: string | null;
	};

	let { activites }: { activites: Activite[] } = $props();

	type FeedTone = 'call' | 'mail' | 'meet' | 'note' | 'neutral';

	function toneForType(type: string | null): FeedTone {
		switch (type) {
			case 'appel':
				return 'call';
			case 'email':
				return 'mail';
			case 'reunion':
				return 'meet';
			case 'note':
				return 'note';
			default:
				return 'neutral';
		}
	}

	function labelForType(type: string | null): string {
		switch (type) {
			case 'appel':
				return 'Appel';
			case 'email':
				return 'Email';
			case 'reunion':
				return 'Réunion';
			case 'note':
				return 'Note';
			default:
				return 'Activité';
		}
	}
</script>

<article class="panel">
	<div class="panel-h">
		<span class="hdot"></span>
		<h3>Ce qui s'est passé</h3>
		<span class="pcount">{activites.length > 0 ? 'Récent' : ''}</span>
	</div>

	{#if activites.length === 0}
		<div class="warm">
			<div class="wt">Rien de récent</div>
			<div class="ws">Les appels, emails et notes que vous enregistrerez apparaîtront ici.</div>
		</div>
	{:else}
		<div class="feed">
			<div class="feed-line">
				{#each activites as a (a.id)}
					<div class="fi {toneForType(a.type_activite)}">
						<div class="fi-t">
							<b>{labelForType(a.type_activite)}</b>
							{#if a.resume_contenu?.trim()}<span> · {a.resume_contenu}</span>{/if}
						</div>
						<div class="fi-d">{formatRelativeDate(a.date_heure)}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</article>

<style>
	.panel {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.panel-h {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 18px 12px;
	}
	.panel-h h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.01em;
	}
	.panel-h .pcount {
		margin-left: auto;
		font-size: 12px;
		font-weight: 700;
		color: var(--color-text-muted);
	}
	.panel-h .hdot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--color-prosp-convert);
	}

	.feed {
		padding: 4px 18px 16px;
		position: relative;
	}
	.feed-line {
		position: relative;
		padding-left: 26px;
	}
	.feed-line::before {
		content: '';
		position: absolute;
		left: 9px;
		top: 6px;
		bottom: 6px;
		width: 2px;
		background: var(--color-border);
	}
	.fi {
		position: relative;
		padding: 8px 0;
	}
	.fi::before {
		content: '';
		position: absolute;
		left: -21px;
		top: 11px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-surface);
		box-shadow: 0 0 0 2px var(--color-text-muted);
	}
	.fi.call::before {
		box-shadow: 0 0 0 2px var(--color-primary);
	}
	.fi.mail::before {
		box-shadow: 0 0 0 2px var(--color-prosp-convert);
	}
	.fi.meet::before {
		box-shadow: 0 0 0 2px var(--color-prosp-place);
	}
	.fi.note::before {
		box-shadow: 0 0 0 2px var(--color-prosp-qualify);
	}
	.fi-t {
		font-size: 13px;
		color: var(--color-text-body);
	}
	.fi-t b {
		color: var(--color-text);
		font-weight: 600;
	}
	.fi-d {
		font-size: 11.5px;
		color: var(--color-text-muted);
		margin-top: 1px;
	}

	.warm {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin: 4px 18px 16px;
		padding: 14px 16px;
		border-radius: var(--radius-lg);
		background: var(--color-surface-alt);
	}
	.warm .wt {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}
	.warm .ws {
		font-size: 12px;
		color: var(--color-text-muted);
	}
</style>
