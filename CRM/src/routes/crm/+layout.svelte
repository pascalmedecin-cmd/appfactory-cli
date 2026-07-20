<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import FeedbackButton from '$lib/components/FeedbackButton.svelte';
	import { config, CRM_BASE } from '$lib/config';
	import { isBandeauActive } from '$lib/pageBandeau';
	import { isCoherenceActive } from '$lib/ui/coherence';
	import { page } from '$app/state';
	// Audit 360 V2c H-21 : coquille workspace partagée (factorisation CSS cross-pages).
	import '$lib/styles/workspace.css';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);

	const pageTitle = $derived(() => {
		const path = page.url.pathname;
		const all = [...config.navigation.primary, ...config.navigation.secondary];
		// Dashboard (= CRM_BASE) en match exact, sinon startsWith le matcherait sur tout /crm/*.
		const match = all.find(item => item.href === CRM_BASE ? path === CRM_BASE : path.startsWith(item.href));
		return match?.label ?? '';
	});

	// Cohérence UI : le Header masque son titre + sous-titre sur les routes ayant adopté le bandeau
	// in-page (source unique isBandeauActive, partagée avec les pages → titre et bandeau ne peuvent
	// jamais diverger). Calcul serveur-safe via page.url.pathname (pas de flash de titre à l'hydratation).
	const bandeauHere = $derived(isBandeauActive(data.featureFlags, page.url.pathname));

	// Cohérence UI b/c/d : un seul flag par-user (patron ffCrmListesV2). Quand ON, le shell porte
	// `.coherence-ui`, ancre des overrides co-localisés `:global(.coherence-ui)` des briques partagées
	// (Badge/SourcePill/SearchInput…). OFF ⇒ classe absente ⇒ rendu actuel strict.
	const coherenceUi = $derived(isCoherenceActive(data.featureFlags));

	// Fermer le menu mobile sur navigation (filet de sécurité pour les navigations
	// programmatiques : un clic dans la page qui change de route alors que le drawer
	// est ouvert). Le cas principal (clic sur un lien du menu) est géré par onNavigate
	// passé à <Sidebar>, qui ferme aussi quand on reclique sur la page courante.
	// `prevPath` est un simple `let` (pas `$state`) : s'il était réactif, l'écriture
	// `prevPath = currentPath` relancerait l'effet, dont le cleanup annulerait le
	// setTimeout avant qu'il ne se déclenche (le menu ne se fermait jamais).
	let prevPath = page.url.pathname;
	$effect(() => {
		const currentPath = page.url.pathname;
		if (currentPath !== prevPath) {
			prevPath = currentPath;
			const t = setTimeout(() => { mobileMenuOpen = false; }, 150);
			return () => clearTimeout(t);
		}
	});
</script>

<!-- Atelier 209 Run 2 : coquille CRM teintée par la marque active (data-marque). Le wrapper
     est en `display: contents` (zéro impact sur le layout : sidebar/header restent `fixed`
     relatifs au viewport) mais porte l'attribut + les overrides de tokens `--color-primary*`
     qui cascadent par héritage vers tout le chrome et le contenu. FilmPro = valeurs par défaut
     (non-régression stricte) ; LED = bleu nuit + magenta. -->
<div class="crm-shell" class:coherence-ui={coherenceUi} data-marque={data.marqueActive}>
	<!-- Mobile overlay -->
	{#if mobileMenuOpen}
		<button
			class="mobile-overlay"
			onclick={() => mobileMenuOpen = false}
			onkeydown={(e) => e.key === 'Escape' && (mobileMenuOpen = false)}
			tabindex="-1"
			aria-label="Fermer le menu"
		></button>
	{/if}

	<!-- Sidebar unique : desktop = static, mobile = slide-in -->
	<div class="sidebar-wrapper" class:open={mobileMenuOpen}>
		<Sidebar bind:collapsed={sidebarCollapsed} currentPath={page.url.pathname} unreadIntelligence={data.unreadIntelligence} premium={data.featureFlags?.ffCrmListesV2 === true} marque={data.marqueActive} onNavigate={() => mobileMenuOpen = false} />
	</div>

	<Header user={data.user} {sidebarCollapsed} onMenuToggle={() => mobileMenuOpen = !mobileMenuOpen} pageTitle={pageTitle()} hideTitle={bandeauHere} marque={data.marqueActive} />

	<main
		class="pt-(--header-height) min-h-screen bg-surface transition-all duration-200"
		style="padding-left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
	>
		<!-- Cohérence UI d1 : `crm-page-wrap` = socle centralisateur. Sous .coherence-ui, il porte la
		     gouttière horizontale UNIQUE (--page-gutter 32/24/16) + la borne ancrée à gauche
		     (--content-max 1440), et chaque brique remet sa gouttière inline à 0. OFF ⇒ classe inerte
		     (aucune règle .coherence-ui), le socle reste p-4/md:p-6 strict. -->
		<div class="p-4 md:p-6 crm-page-wrap">
			{@render children()}
		</div>
	</main>

	<Toast />

	<FeedbackButton />
</div>

<style>
	/* Coquille de marque : porte data-marque + overrides de tokens, sans créer de boîte
	   (les enfants se disposent comme si le wrapper n'existait pas ; les custom properties
	   héritent quand même à travers display:contents). Zéro impact layout = non-régression. */
	.crm-shell {
		display: contents;
	}

	/* Desktop : sidebar visible en place */
	.sidebar-wrapper {
		display: contents;
	}

	.mobile-overlay {
		display: none;
	}

	/* Mobile : sidebar masquée, slide-in au toggle */
	@media (max-width: 1023px) {
		main {
			padding-left: 0 !important;
		}

		.sidebar-wrapper {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			width: var(--sidebar-width);
			height: 100%;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
		}

		.sidebar-wrapper.open {
			transform: translateX(0);
		}

		/* Le wrapper gère le fixed+transform, la nav sidebar devient statique */
		.sidebar-wrapper :global(.sidebar-root) {
			position: static !important;
			z-index: auto !important;
			width: 100% !important;
		}

		.mobile-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 40;
			cursor: default;
			border: none;
			padding: 0;
		}
	}
</style>
