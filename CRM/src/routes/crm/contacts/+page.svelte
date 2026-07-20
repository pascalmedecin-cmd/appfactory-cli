<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageBand from '$lib/components/PageBand.svelte';
	import { page } from '$app/stores';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { isBandeauActive } from '$lib/pageBandeau';
	import { isCoherenceActive } from '$lib/ui/coherence';
	import { toasts } from '$lib/stores/toast';
	import {
		contactsIndicators,
		contactsCountsByTab,
		filterContactsByTab,
		contactInitials,
		type ContactsTab,
	} from '$lib/utils/contactsFormat';
	import { sourceMetaFor, relativeTimeFr } from '$lib/utils/entreprisesFormat';
	import ContactsIndicators from '$lib/components/contacts/ContactsIndicators.svelte';
	import KpiStrip, { type KpiItem } from '$lib/components/KpiStrip.svelte';
	import SourcePill from '$lib/components/SourcePill.svelte';
	import ContactsTabs from '$lib/components/contacts/ContactsTabs.svelte';
	import ContactSuggestionQueue from '$lib/components/contacts/ContactSuggestionQueue.svelte';
	import MobileEntityCard from '$lib/components/mobile/MobileEntityCard.svelte';
	import type {
		MobileEntityCardAction,
		MobileEntityCardBadge,
	} from '$lib/components/mobile/mobile-entity-card.helpers';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Contact = (typeof data.contacts)[number];
	type Entreprise = { id: string; raison_sociale: string; site_web: string | null };

	// UI state
	let activeTab: ContactsTab = $state('tous');
	let slideOutOpen = $state(false);
	let selectedContact = $state<Contact | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let archiving = $state(false);
	let confirmArchiveOpen = $state(false);
	let archiveFormEl: HTMLFormElement | null = $state(null);

	// Form fields
	let nom = $state('');
	let prenom = $state('');
	let email_professionnel = $state('');
	let telephone = $state('');
	let role_fonction = $state('');
	let entreprise_id = $state('');
	let entreprise_nom = $state('');
	let canton = $state('');
	let segment = $state('');
	let source = $state('');
	let notes_libres = $state('');
	let adresse = $state('');
	let tags = $state('');

	let showSuggestions = $state(false);

	// Audit 360 V2b H-06 : autocomplete async via /api/entreprises/search.
	// Avant : pré-fetch full list dans data.entreprises + filter client. Maintenant :
	// fetch debounced à chaque keystroke (250 ms), max 20 résultats, ilike trigram.
	let filteredSuggestions = $state<Entreprise[]>([]);
	let suggestionsLoading = $state(false);
	let searchSeq = 0;
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	const SEARCH_DEBOUNCE_MS = 250;

	// Clear le timer de debounce au démontage : sinon un setTimeout en vol
	// déclenche un fetch + des writes $state sur un composant démonté.
	$effect(() => {
		return () => {
			if (searchTimer) clearTimeout(searchTimer);
		};
	});

	const indicators = $derived(contactsIndicators(data.contacts));
	const counts = $derived(contactsCountsByTab(data.contacts));
	const filteredContacts = $derived(filterContactsByTab(data.contacts, activeTab));

	// Vague 2 « listes premium » (même flag JWT que les autres pages). OFF → rendu actuel.
	const premium = $derived(data.featureFlags?.ffCrmListesV2 === true);
	// Cohérence UI : bandeau de page in-page (flag ff_page_bandeau). Même source unique que le
	// Header (isBandeauActive) → le titre ne peut jamais être en double ni absent. OFF → rendu
	// actuel strict (branche {:else} identique). Le compteur (ex-sous-titre) migre dans la pastille.
	const bandeau = $derived(isBandeauActive(data.featureFlags, $page.url.pathname));
	// Cohérence UI b/c/d (flag ff_ui_coherence) : class-swap des boutons inline → primitive .ws-btn.
	// OFF ⇒ rendu actuel strict (mêmes handlers/enfants, seule la chaîne de classes bascule).
	const coherence = $derived(isCoherenceActive(data.featureFlags));
	const bandeauCount = $derived(
		data.contacts.length === 0
			? 'Aucun contact'
			: `${data.contacts.length} contact${data.contacts.length > 1 ? 's' : ''}`,
	);
	const kpiItems = $derived<KpiItem[]>([
		{ icon: 'contacts', value: indicators.total, label: indicators.total === 1 ? 'Contact' : 'Contacts', tone: 'primary' },
		{ icon: 'handshake', value: indicators.prescripteurs, label: 'Prescripteurs', tone: 'success' },
		{ icon: 'calendar_today', value: indicators.nouveauxThisMonth, label: 'Nouveaux ce mois', tone: 'convert' },
		{ icon: 'domain', value: indicators.sansEntreprise, label: 'Sans entreprise', tone: 'warn', highlight: indicators.sansEntreprise > 0 },
	]);

	const tabsSpec = $derived([
		{ key: 'tous' as ContactsTab, label: 'Tous', count: counts.tous },
		{ key: 'prescripteurs' as ContactsTab, label: 'Prescripteurs', count: counts.prescripteurs },
		{ key: 'a-qualifier' as ContactsTab, label: 'À qualifier', count: counts['a-qualifier'] },
		{ key: 'sans-entreprise' as ContactsTab, label: 'Sans entreprise', count: counts['sans-entreprise'] },
	]);

	async function searchEntreprises(query: string): Promise<void> {
		const seq = ++searchSeq;
		if (!query || query.trim().length < 2) {
			filteredSuggestions = [];
			suggestionsLoading = false;
			return;
		}
		suggestionsLoading = true;
		try {
			const url = `/api/entreprises/search?q=${encodeURIComponent(query.trim())}`;
			const resp = await fetch(url);
			// Drop la réponse si une nouvelle frappe est arrivée entre-temps.
			if (seq !== searchSeq) return;
			if (!resp.ok) {
				filteredSuggestions = [];
				return;
			}
			const json = (await resp.json()) as { results?: Entreprise[] };
			if (seq !== searchSeq) return;
			filteredSuggestions = json.results ?? [];
		} catch {
			if (seq === searchSeq) filteredSuggestions = [];
		} finally {
			if (seq === searchSeq) suggestionsLoading = false;
		}
	}

	function scheduleSearch(query: string) {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void searchEntreprises(query), SEARCH_DEBOUNCE_MS);
	}

	$effect(() => {
		const total = data.contacts.length;
		$pageSubtitle = total === 0 ? 'Aucun contact' : `${total} contact${total > 1 ? 's' : ''}`;
	});

	function selectEntreprise(e: Entreprise) {
		entreprise_id = e.id;
		entreprise_nom = e.raison_sociale;
		showSuggestions = false;
	}

	function clearEntreprise() {
		entreprise_id = '';
		entreprise_nom = '';
	}

	function entrepriseForContact(contact: Contact): Entreprise | null {
		// Audit 360 V2b H-06 : on lit l'entreprise jointe (`entreprises(id,
		// raison_sociale, site_web)`) directement sur le contact, plus besoin de
		// la liste pré-fetchée.
		const ent = (contact as { entreprises?: Entreprise | null }).entreprises;
		return ent ?? null;
	}

	const columns = [
		{ key: 'nom', label: 'Nom', sortable: true, class: 'w-[12%]' },
		{ key: 'prenom', label: 'Prénom', sortable: true, class: 'w-[10%] hidden md:table-cell' },
		{
			key: 'entreprise',
			label: 'Entreprise',
			sortable: true,
			class: 'w-[15%]',
			render: (r: Contact) => r.entreprises?.raison_sociale ?? '–',
		},
		{ key: 'role_fonction', label: 'Fonction', sortable: true, class: 'w-[12%] hidden lg:table-cell' },
		{ key: 'email_professionnel', label: 'Email', class: 'w-[20%] hidden lg:table-cell' },
		{ key: 'telephone', label: 'Téléphone', class: 'w-[15%] whitespace-nowrap hidden lg:table-cell' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[6%] hidden md:table-cell' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[10%]' },
	];

	// Vague 2 : colonnes de la ligne riche contact (avatar + identité + signaux réels).
	// Pas d'opportunités chargées sur cette page -> pas de pill pipeline (aucune invention).
	// nb de colonnes == nb de <td> du snippet premium (8). Tri sur vrais champs uniquement.
	const premiumColumns = [
		{ key: 'avatar', label: '', srLabel: 'Initiales', class: 'w-14' },
		{ key: 'nom', label: 'Contact', sortable: true, class: 'w-[24%]' },
		{ key: 'entreprise', label: 'Entreprise', class: 'w-[16%] hidden md:table-cell' },
		{ key: 'email_professionnel', label: 'Email', class: 'w-[20%] hidden lg:table-cell' },
		{ key: 'telephone', label: 'Téléphone', class: 'w-[13%] whitespace-nowrap hidden lg:table-cell' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[13%]' },
		{ key: 'source', label: 'Source · activité', srLabel: 'Source et activité', class: 'w-[14%] hidden lg:table-cell' },
		{ key: 'chevron', label: '', srLabel: 'Ouvrir', class: 'w-10' },
	];

	function rowAriaLabelFor(c: Contact): string {
		const fullname = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() || 'Contact sans nom';
		const company = c.entreprises?.raison_sociale ?? 'sans entreprise';
		const statut = c.statut_qualification ?? 'inconnu';
		const presc = c.est_prescripteur ? ', prescripteur' : '';
		return `${fullname}, ${company}, statut ${statut}${presc}`;
	}

	function emptyMessageFor(tab: ContactsTab): string {
		switch (tab) {
			case 'prescripteurs':
				return 'Aucun prescripteur identifié pour le moment.';
			case 'a-qualifier':
				return 'Aucun contact à qualifier — tout est traité.';
			case 'sans-entreprise':
				return 'Tous les contacts sont rattachés à une entreprise.';
			case 'tous':
			default:
				return 'Aucun contact dans ce filtre.';
		}
	}

	function openDetail(contact: Contact) {
		selectedContact = contact;
		slideOutOpen = true;
	}

	function openCreate() {
		editMode = false;
		resetForm();
		modalOpen = true;
	}

	function openEdit() {
		if (!selectedContact) return;
		editMode = true;
		nom = selectedContact.nom ?? '';
		prenom = selectedContact.prenom ?? '';
		email_professionnel = selectedContact.email_professionnel ?? '';
		telephone = selectedContact.telephone ?? '';
		role_fonction = selectedContact.role_fonction ?? '';
		entreprise_id = selectedContact.entreprise_id ?? '';
		entreprise_nom = selectedContact.entreprises?.raison_sociale ?? '';
		canton = selectedContact.canton ?? '';
		segment = selectedContact.segment ?? '';
		source = selectedContact.source ?? '';
		notes_libres = selectedContact.notes_libres ?? '';
		adresse = selectedContact.adresse ?? '';
		tags = selectedContact.tags ?? '';
		slideOutOpen = false;
		modalOpen = true;
	}

	function resetForm() {
		nom = '';
		prenom = '';
		email_professionnel = '';
		telephone = '';
		role_fonction = '';
		entreprise_id = '';
		entreprise_nom = '';
		canton = '';
		segment = '';
		source = '';
		notes_libres = '';
		adresse = '';
		tags = '';
		showSuggestions = false;
	}

	function statutBadgeVariant(statut: string | null): 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'qualifie':
				return 'success';
			case 'en_cours':
				return 'info';
			case 'nouveau':
				return 'warning';
			case 'archive':
				return 'muted';
			default:
				return 'default';
		}
	}

	// Refonte mobile (S190bis) : helpers de mapping pour MobileEntityCard.
	// Affiché uniquement si featureFlags.ffCrmMobileV2 + viewport < 1024px (CSS).
	function contactCardSubtitle(c: Contact): string {
		const company = c.entreprises?.raison_sociale ?? '';
		const fn = c.role_fonction ?? '';
		if (company && fn) return `${company} · ${fn}`;
		return company || fn || (c.canton ? `Canton ${c.canton}` : 'Sans entreprise');
	}

	function contactCardBadges(c: Contact): MobileEntityCardBadge[] {
		const badges: MobileEntityCardBadge[] = [
			{ label: c.statut_qualification ?? 'inconnu', variant: statutBadgeVariant(c.statut_qualification) },
		];
		if (c.est_prescripteur) badges.push({ label: 'Prescripteur', variant: 'default' });
		return badges;
	}

	function contactCardActions(c: Contact): MobileEntityCardAction[] {
		const actions: MobileEntityCardAction[] = [];
		if (c.telephone) {
			actions.push({
				icon: 'phone',
				label: `Appeler ${c.prenom ?? ''} ${c.nom ?? ''}`.trim(),
				href: `tel:${c.telephone}`,
				variant: 'primary',
			});
		}
		if (c.email_professionnel) {
			actions.push({
				icon: 'mail',
				label: `Envoyer un email à ${c.prenom ?? ''} ${c.nom ?? ''}`.trim(),
				href: `mailto:${c.email_professionnel}`,
				variant: 'neutral',
			});
		}
		return actions;
	}
</script>

<div class="ws-page">
	{#if bandeau}
		<PageBand
			icon="contacts"
			eyebrow="Les interlocuteurs"
			title="Contacts"
			desc="Les bonnes personnes chez vos prospects : qui décide, qui rappeler."
			descMobile="Qui décide, qui rappeler."
			count={bandeauCount}
		>
			{#snippet actions()}
				<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
					<Icon name="add" size={18} />
					Ajouter
				</button>
			{/snippet}
		</PageBand>
	{:else}
		<div class="ws-page-actions">
			<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
				<Icon name="add" size={18} />
				Ajouter
			</button>
		</div>
	{/if}

	{#if premium}
		<KpiStrip items={kpiItems} ariaLabel="Indicateurs contacts" />
	{:else}
		<ContactsIndicators values={indicators} />
	{/if}

	<ContactSuggestionQueue contacts={data.contacts} />

	<ContactsTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)} />

	<div
		class="contacts-shell"
		data-mobile-enabled={data.featureFlags?.ffCrmMobileV2 ? 'true' : 'false'}
		role="tabpanel"
		id={`panel-${activeTab}`}
		aria-labelledby={`tab-${activeTab}`}
	>
		{#if data.contacts.length === 0}
			<div class="contacts-empty-wrap">
				<EmptyState
					icon="contacts"
					title="Aucun contact"
					description="Ajoutez votre premier contact pour commencer à construire votre réseau."
					actionLabel="Ajouter un contact"
					onAction={openCreate}
				/>
			</div>
		{:else}
			{#if data.featureFlags?.ffCrmMobileV2}
				<!-- Mobile cards (visible uniquement viewport < 1024px via CSS) -->
				<div class="contacts-mobile-cards">
					{#if filteredContacts.length === 0}
						{#if coherence}
							<EmptyState icon="filter_alt_off" title={emptyMessageFor(activeTab)} />
						{:else}
							<div class="contacts-mobile-empty">
								<Icon name="filter_alt_off" size={28} />
								<p>{emptyMessageFor(activeTab)}</p>
							</div>
						{/if}
					{:else}
						{#each filteredContacts as contact (contact.id)}
							<MobileEntityCard
								title={`${contact.prenom ?? ''} ${contact.nom ?? ''}`.trim() || 'Contact sans nom'}
								subtitle={contactCardSubtitle(contact)}
								badges={contactCardBadges(contact)}
								footerItems={contact.canton
									? [{ icon: 'location_on', text: `Canton ${contact.canton}` }]
									: []}
								actions={contactCardActions(contact)}
								onTap={() => openDetail(contact)}
								ariaLabel={rowAriaLabelFor(contact)}
							/>
						{/each}
					{/if}
				</div>
			{/if}

			<!-- Desktop table (visible >= 1024px ; visible aussi mobile si flag OFF, fallback) -->
			<div class="table-wrap">
				<DataTable
					data={filteredContacts}
					columns={premium ? premiumColumns : columns}
					onRowClick={openDetail}
					searchPlaceholder="Rechercher un contact…"
					stickyLeftCols={2}
					resizable
					storageKey="contacts"
					rowAriaLabel={rowAriaLabelFor}
					emptyMessage={emptyMessageFor(activeTab)}
				>
					{#snippet row(contact, _i)}
						{#if premium}
							{@const ent = contact.entreprises}
							{@const src = sourceMetaFor(contact.source)}
							{@const activite = relativeTimeFr(contact.date_derniere_modification)}
							<td class="px-4 py-3"><span class="crm-avatar">{contactInitials(contact.prenom, contact.nom)}</span></td>
							<td class="px-4 py-3">
								<div class="crm-id">
									<div class="crm-name">{`${contact.prenom ?? ''} ${contact.nom ?? ''}`.trim() || 'Contact sans nom'}</div>
									{#if contact.est_prescripteur}<Badge label="Prescripteur" variant="success" />{/if}
								</div>
								{#if contact.role_fonction}<div class="crm-sec">{contact.role_fonction}</div>{/if}
							</td>
							<td class="px-4 py-3 hidden md:table-cell">
								{#if ent?.raison_sociale}
									<span class="crm-chip"><Icon name="business" size={13} /><span>{ent.raison_sociale}</span></span>
								{:else}
									<span class="crm-muted">Sans entreprise</span>
								{/if}
							</td>
							<td class="px-4 py-3 hidden lg:table-cell">
								{#if contact.email_professionnel}
									<span class="crm-chip"><Icon name="mail" size={13} /><span>{contact.email_professionnel}</span></span>
								{/if}
							</td>
							<td class="px-4 py-3 hidden lg:table-cell">
								{#if contact.telephone}
									<span class="crm-chip"><Icon name="phone" size={13} /><span>{contact.telephone}</span></span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<Badge label={contact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(contact.statut_qualification)} />
							</td>
							<td class="px-4 py-3 hidden lg:table-cell">
								<span class="crm-srcline">
									{#if src}<SourcePill label={src.label} variant={src.variant} />{/if}
									{#if activite}<span class="crm-activity">{activite}</span>{/if}
								</span>
							</td>
							<td class="px-4 py-3 crm-chev-cell"><Icon name="chevron_right" size={18} /></td>
						{:else}
							<td class="px-4 py-3 font-medium text-text">{contact.nom ?? '–'}</td>
							<td class="px-4 py-3 text-text hidden md:table-cell">{contact.prenom ?? '–'}</td>
							<td class="px-4 py-3 text-text">{contact.entreprises?.raison_sociale ?? '–'}</td>
							<td class="px-4 py-3 text-text hidden lg:table-cell">{contact.role_fonction ?? '–'}</td>
							<td class="px-4 py-3 text-text hidden lg:table-cell">{contact.email_professionnel ?? '–'}</td>
							<td class="px-4 py-3 text-text hidden lg:table-cell">{contact.telephone ?? '–'}</td>
							<td class="px-4 py-3 text-text w-20 hidden md:table-cell">{contact.canton ?? '–'}</td>
							<td class="px-4 py-3 w-24">
								<Badge label={contact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(contact.statut_qualification)} />
							</td>
						{/if}
					{/snippet}
				</DataTable>
			</div>
		{/if}
	</div>
</div>

{#if !bandeau}
	<button
		type="button"
		class="ws-fab"
		aria-label="Ajouter un contact"
		onclick={openCreate}
	>
		<Icon name="add" size={20} />
	</button>
{/if}

<!-- SlideOut détail contact -->
<SlideOut bind:open={slideOutOpen} title="{selectedContact?.prenom ?? ''} {selectedContact?.nom ?? ''}">
	{#if selectedContact}
		<div class="space-y-6">
			{#if premium}
				{@const fSrc = sourceMetaFor(selectedContact.source)}
				{@const fActivite = relativeTimeFr(selectedContact.date_derniere_modification)}
				<div class="flex items-center gap-4">
					<span class="crm-avatar crm-avatar--lg">{contactInitials(selectedContact.prenom, selectedContact.nom)}</span>
					<div class="min-w-0">
						<p class="font-semibold text-lg text-text">{`${selectedContact.prenom ?? ''} ${selectedContact.nom ?? ''}`.trim() || 'Contact sans nom'}</p>
						{#if selectedContact.role_fonction}<p class="text-sm text-text-muted">{selectedContact.role_fonction}</p>{/if}
						<div class="flex flex-wrap items-center gap-2 mt-1.5">
							<Badge label={selectedContact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(selectedContact.statut_qualification)} />
							{#if selectedContact.est_prescripteur}<Badge label="Prescripteur" variant="default" />{/if}
							{#if fSrc}<SourcePill label={fSrc.label} variant={fSrc.variant} />{/if}
						</div>
						{#if fActivite}<p class="text-xs text-text-muted mt-2">Dernière activité : {fActivite}</p>{/if}
					</div>
				</div>
			{:else}
				<div class="flex items-center justify-between">
					<Badge label={selectedContact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(selectedContact.statut_qualification)} />
					{#if selectedContact.est_prescripteur}
						<Badge label="Prescripteur" variant="default" />
					{/if}
				</div>
			{/if}

			{#if entrepriseForContact(selectedContact) || selectedContact.entreprises?.raison_sociale}
				{@const ent = entrepriseForContact(selectedContact)}
				<div class="flex items-center gap-3 p-3 bg-surface rounded-lg">
					<span class="flex items-center justify-center w-10 h-10 rounded-md bg-primary-light text-primary font-bold text-sm">
						{selectedContact.entreprises?.raison_sociale?.[0]?.toUpperCase() ?? '?'}
					</span>
					<div>
						<p class="font-medium text-text">{selectedContact.entreprises?.raison_sociale ?? '–'}</p>
						<p class="text-xs text-text-muted">{selectedContact.role_fonction ?? 'Fonction non renseignée'}</p>
					</div>
				</div>
			{/if}

			{#if premium}
				<div class="crm-facts">
					{#if !selectedContact.entreprises?.raison_sociale}
						<div class="crm-fact crm-fact--wide">
							<div class="crm-fact-k">Fonction</div>
							<div class="crm-fact-v">{selectedContact.role_fonction ?? '–'}</div>
						</div>
					{/if}
					<div class="crm-fact">
						<div class="crm-fact-k">Email</div>
						<div class="crm-fact-v">
							{#if selectedContact.email_professionnel}<a href={`mailto:${selectedContact.email_professionnel}`}>{selectedContact.email_professionnel}</a>{:else}–{/if}
						</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Téléphone</div>
						<div class="crm-fact-v">
							{#if selectedContact.telephone}<a href={`tel:${selectedContact.telephone.replace(/\s/g, '')}`}>{selectedContact.telephone}</a>{:else}–{/if}
						</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Canton</div>
						<div class="crm-fact-v">{selectedContact.canton ?? '–'}</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Segment</div>
						<div class="crm-fact-v">{selectedContact.segment ?? '–'}</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Source</div>
						<div class="crm-fact-v">{selectedContact.source ?? '–'}</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Score</div>
						<div class="crm-fact-v">{selectedContact.score_priorite ?? '–'}</div>
					</div>
					{#if selectedContact.adresse}
						<div class="crm-fact crm-fact--wide">
							<div class="crm-fact-k">Adresse</div>
							<div class="crm-fact-v">{selectedContact.adresse}</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					{#if !selectedContact.entreprises?.raison_sociale}
						<div>
							<span class="text-text-muted">Fonction</span>
							<p class="font-medium text-text">{selectedContact.role_fonction ?? '–'}</p>
						</div>
					{/if}
					<div>
						<span class="text-text-muted">Email</span>
						<p class="font-medium text-text">{selectedContact.email_professionnel ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Téléphone</span>
						<p class="font-medium text-text">{selectedContact.telephone ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Canton</span>
						<p class="font-medium text-text">{selectedContact.canton ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Segment</span>
						<p class="font-medium text-text">{selectedContact.segment ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Source</span>
						<p class="font-medium text-text">{selectedContact.source ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Score</span>
						<p class="font-medium text-text">{selectedContact.score_priorite ?? '–'}</p>
					</div>
				</div>

				{#if selectedContact.adresse}
					<div class="text-sm">
						<span class="text-text-muted">Adresse</span>
						<p class="font-medium text-text">{selectedContact.adresse}</p>
					</div>
				{/if}
			{/if}

			{#if selectedContact.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedContact.notes_libres}</p>
				</div>
			{/if}

			{#if selectedContact.tags}
				<div class="text-sm">
					<span class="text-text-muted">Tags</span>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each selectedContact.tags.split(',') as tag}
							<Badge label={tag.trim()} variant="muted" />
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex gap-3 pt-4 border-t border-border">
				<button
					onclick={openEdit}
					class={coherence ? 'ws-btn ws-btn-primary' : 'flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer'}
				>
					<Icon name="edit" size={16} />
					Modifier
				</button>
				<form
					bind:this={archiveFormEl}
					method="POST"
					action="?/delete"
					use:enhance={() => {
						archiving = true;
						return async ({ result, update }) => {
							archiving = false;
							slideOutOpen = false;
							selectedContact = null;
							if (result.type === 'success') toasts.success('Contact archivé');
							else toasts.error("Erreur lors de l'archivage");
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={selectedContact.id} />
					<button
						type="button"
						onclick={() => (confirmArchiveOpen = true)}
						disabled={archiving}
						class={coherence ? 'ws-btn ws-btn-danger-ghost' : 'flex items-center gap-2 h-10 px-4 box-border text-sm font-medium text-danger-deep rounded-lg hover:bg-danger/5 cursor-pointer disabled:opacity-50 transition-colors'}
					>
						<Icon name="archive" size={16} />
						{archiving ? 'Archivage…' : 'Archiver'}
					</button>
				</form>
			</div>
		</div>
	{/if}
</SlideOut>

<ConfirmModal
	bind:open={confirmArchiveOpen}
	title="Archiver ce contact ?"
	message="Cette action est irréversible. Le contact sera définitivement archivé."
	confirmLabel="Archiver"
	variant="danger"
	loading={archiving}
	onConfirm={() => {
		confirmArchiveOpen = false;
		archiveFormEl?.requestSubmit();
	}}
/>

<!-- Modal création/édition -->
<ModalForm
	bind:open={modalOpen}
	title={editMode ? 'Modifier le contact' : 'Nouveau contact'}
	{saving}
>
	<form
		method="POST"
		action={editMode ? '?/update' : '?/create'}
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
				if (result.type === 'success') toasts.success(editMode ? 'Contact modifié' : 'Contact créé');
				else toasts.error("Erreur lors de l'enregistrement");
				await update();
			};
		}}
	>
		{#if editMode && selectedContact}
			<input type="hidden" name="id" value={selectedContact.id} />
		{/if}

		<div class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Nom" bind:value={nom} required />
				<FormField label="Prénom" bind:value={prenom} />
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Email" type="email" bind:value={email_professionnel} />
				<FormField label="Téléphone" type="tel" bind:value={telephone} />
			</div>

			<div class="space-y-1 relative">
				<label for="entreprise_nom" class="block text-sm font-medium text-text">Entreprise</label>
				<div class="flex gap-2">
					<input
						id="entreprise_nom"
						type="text"
						role="combobox"
						aria-expanded={showSuggestions && filteredSuggestions.length > 0}
						aria-controls="entreprise-suggestions"
						aria-autocomplete="list"
						bind:value={entreprise_nom}
						onfocus={() => {
							showSuggestions = true;
							if (entreprise_nom.length >= 2) scheduleSearch(entreprise_nom);
						}}
						oninput={(e) => {
							entreprise_id = '';
							showSuggestions = true;
							scheduleSearch((e.currentTarget as HTMLInputElement).value);
						}}
						placeholder="Tapez pour chercher ou créer…"
						autocomplete="off"
						class="crm-field-control flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
					{#if entreprise_nom}
						<button type="button" onclick={clearEntreprise} class="px-2 text-text-muted hover:text-text cursor-pointer">
							<Icon name="close" size={18} />
						</button>
					{/if}
				</div>
				{#if showSuggestions && filteredSuggestions.length > 0}
					<div class="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
						<div id="entreprise-suggestions" role="listbox" aria-label="Suggestions d'entreprises">
						{#each filteredSuggestions as sug}
							<button
								type="button"
								role="option"
								aria-selected={entreprise_id === sug.id}
								onclick={() => selectEntreprise(sug)}
								class="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface cursor-pointer {entreprise_id === sug.id ? 'bg-primary-light font-medium' : ''}"
							>
								<span class="flex items-center justify-center w-5 h-5 rounded bg-primary-light text-primary text-[10px] font-bold">
									{sug.raison_sociale[0]}
								</span>
								{sug.raison_sociale}
							</button>
						{/each}
						</div>
						{#if entreprise_nom.length >= 2 && !entreprise_id}
							<div class="px-3 py-2 text-xs text-text-muted border-t border-border">
								<Icon name="add" size={12} class="align-middle" />
								« {entreprise_nom} » sera créée automatiquement
							</div>
						{/if}
					</div>
				{/if}
				{#if entreprise_nom && entreprise_nom.length >= 2 && !filteredSuggestions.length && showSuggestions}
					<p class="text-xs text-text-muted mt-1">
						<Icon name="add" size={12} class="align-middle" />
						« {entreprise_nom} » sera créée automatiquement
					</p>
				{/if}
			</div>

			<FormField label="Fonction" bind:value={role_fonction} />
			<FormField label="Adresse" bind:value={adresse} placeholder="Rue, NPA, Ville" />
			<CantonSelect bind:value={canton} />
		</div>

		<input type="hidden" name="nom" value={nom} />
		<input type="hidden" name="prenom" value={prenom} />
		<input type="hidden" name="email_professionnel" value={email_professionnel} />
		<input type="hidden" name="telephone" value={telephone} />
		<input type="hidden" name="role_fonction" value={role_fonction} />
		<input type="hidden" name="entreprise_id" value={entreprise_id} />
		<input type="hidden" name="entreprise_nom" value={entreprise_nom} />
		<input type="hidden" name="canton" value={canton} />
		<input type="hidden" name="segment" value={segment} />
		<input type="hidden" name="source" value={source} />
		<input type="hidden" name="notes_libres" value={notes_libres} />
		<input type="hidden" name="adresse" value={adresse} />
		<input type="hidden" name="tags" value={tags} />

		<div class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				onclick={() => (modalOpen = false)}
				class={coherence ? 'ws-btn ws-btn-tertiary ws-btn-tertiary-muted' : 'h-11 px-4 box-border text-sm text-text-muted hover:text-text rounded-lg cursor-pointer'}
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving}
				class={coherence ? 'ws-btn ws-btn-primary' : 'h-11 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 cursor-pointer'}
			>
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>

<style>
	.contacts-shell {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.contacts-empty-wrap {
		flex: 1;
		padding: 24px 32px 32px;
	}
	.table-wrap {
		flex: 1;
		padding: 24px 32px 32px; /* audit 360 V3b L-22 : sur la grille 8px (était 20/.../40) */
	}
	/* Cohérence UI d1 : gouttière portée par le socle (.crm-page-wrap) ; les zones de contenu remettent la
	   leur à 0. padding-inline seul → bottom 96px (FAB @≤768) + verticaux des paliers préservés. Le sélecteur
	   mobile-cards (0-4-0 avec :global) bat la règle média 0-3-0. OFF ⇒ .coherence-ui absent ⇒ inerte. */
	:global(.coherence-ui) .contacts-empty-wrap {
		padding-inline: 0;
	}
	:global(.coherence-ui) .table-wrap {
		padding-inline: 0;
	}
	:global(.coherence-ui) .contacts-shell[data-mobile-enabled='true'] .contacts-mobile-cards {
		padding-inline: 0;
	}

	@media (max-width: 1024px) {
		.table-wrap {
			padding: 16px 24px 32px;
		}
	}
	@media (max-width: 768px) {
		.table-wrap {
			padding: 12px 16px 96px;
		}
	}

	/* Refonte mobile (S190bis) : cards mobile masquées par défaut. Visible uniquement
	   viewport < 1024px ET flag ffCrmMobileV2 activé. Quand visible, masque la table. */
	.contacts-mobile-cards {
		display: none;
	}
	.contacts-mobile-empty {
		padding: 48px 24px;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 14px;
		display: grid;
		gap: 8px;
		justify-items: center;
	}
	.contacts-mobile-empty :global(svg) {
		color: var(--color-text-muted);
		opacity: 0.5;
	}
	@media (max-width: 1023.98px) {
		.contacts-shell[data-mobile-enabled='true'] .contacts-mobile-cards {
			display: grid;
			grid-template-columns: 1fr;
			gap: 12px;
			padding: 12px 16px 96px;
		}
		.contacts-shell[data-mobile-enabled='true'] .table-wrap {
			display: none;
		}
	}
	@media (min-width: 600px) and (max-width: 1023.98px) {
		.contacts-shell[data-mobile-enabled='true'] .contacts-mobile-cards {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
