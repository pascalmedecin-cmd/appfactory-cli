<script lang="ts">
	/**
	 * Chips KPI Entreprises (refonte Vague 2, flag ffCrmListesV2).
	 * Wrapper de domaine : mappe les indicateurs entreprises -> primitive partagée KpiStrip.
	 * Valeurs calculées côté serveur (`+page.server.ts`, requêtes count séparées).
	 */
	import KpiStrip, { type KpiItem } from '$lib/components/KpiStrip.svelte';
	import type { EntreprisesPremiumIndicatorsValues } from '$lib/utils/entreprisesFormat';

	let { values }: { values: EntreprisesPremiumIndicatorsValues } = $props();

	const items = $derived<KpiItem[]>([
		{ icon: 'business', value: values.total, label: values.total === 1 ? 'Entreprise' : 'Entreprises', tone: 'primary' },
		{ icon: 'verified', value: values.qualifiees, label: 'Qualifiées', tone: 'success' },
		{
			icon: 'trending_up',
			value: values.affairesEnCours,
			label: values.affairesEnCours === 1 ? 'Affaire en cours' : 'Affaires en cours',
			tone: 'convert',
		},
		{ icon: 'person_add', value: values.sansContact, label: 'Sans contact', tone: 'warn', highlight: values.sansContact > 0 },
	]);
</script>

<KpiStrip {items} ariaLabel="Indicateurs entreprises" />
