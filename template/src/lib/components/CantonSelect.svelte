<script lang="ts">
	import { CANTONS } from '$lib/schemas';

	let {
		label = 'Canton',
		value = $bindable(''),
		required = false,
		id = `canton-${Math.random().toString(36).slice(2, 8)}`,
	}: {
		label?: string;
		value?: string;
		required?: boolean;
		id?: string;
	} = $props();

	const CANTON_LABELS: Record<string, string> = {
		GE: 'Genève', VD: 'Vaud', VS: 'Valais', FR: 'Fribourg', NE: 'Neuchâtel', JU: 'Jura',
		BE: 'Berne', BS: 'Bâle-Ville', BL: 'Bâle-Campagne', SO: 'Soleure',
		AG: 'Argovie', ZH: 'Zurich', LU: 'Lucerne', ZG: 'Zoug', SZ: 'Schwyz',
		NW: 'Nidwald', OW: 'Obwald', UR: 'Uri', GL: 'Glaris', SH: 'Schaffhouse',
		TG: 'Thurgovie', AR: 'Appenzell RE', AI: 'Appenzell RI', SG: 'Saint-Gall',
		GR: 'Grisons', TI: 'Tessin',
	};

	const ROMANDS = ['GE', 'VD', 'VS', 'FR', 'NE', 'JU'];
	const AUTRES = CANTONS.filter(c => !ROMANDS.includes(c));
</script>

<div class="space-y-1">
	{#if label}
		<label for={id} class="block text-sm font-medium text-text">
			{label}
			{#if required}<span class="text-danger">*</span>{/if}
		</label>
	{/if}
	<select
		{id}
		bind:value
		{required}
		class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
	>
		<option value="">-- Sélectionner --</option>
		<optgroup label="Suisse romande">
			{#each ROMANDS as c}
				<option value={c}>{c} : {CANTON_LABELS[c]}</option>
			{/each}
		</optgroup>
		<optgroup label="Autres cantons">
			{#each AUTRES as c}
				<option value={c}>{c} : {CANTON_LABELS[c]}</option>
			{/each}
		</optgroup>
	</select>
</div>
