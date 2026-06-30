// Le Centre d'aide n'est JAMAIS prérendu : son niveau « Documentation technique » décrit
// l'infrastructure et ses décisions de sécurité assumées. Le contenu n'a de sens que servi
// derrière l'authentification (hooks.server.ts protège /crm/*). Prérendre la page la figerait
// en HTML statique public et contournerait cette garde. `prerender = false` rend cette
// garantie déterministe (et pas seulement la valeur par défaut de SvelteKit).
export const prerender = false;
