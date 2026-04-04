// Canton code → LINDAS canton ID
export const CANTON_IDS: Record<string, string> = {
	GE: '25', VD: '22', VS: '23', NE: '24', FR: '10', JU: '26',
};

// Canton code → addressRegion (2 lettres)
export const CANTON_REGIONS: Record<string, string> = {
	'25': 'GE', '22': 'VD', '23': 'VS', '24': 'NE', '10': 'FR', '26': 'JU',
};

// Sanitize keyword for safe SPARQL string interpolation
export function sanitizeSparql(s: string): string {
	return s.replace(/["\\{}()]/g, '').slice(0, 50).trim();
}

export function buildSparqlQuery(cantonId: string, keywords: string[], limit: number): string {
	const safeKeywords = keywords
		.map((kw) => sanitizeSparql(kw.toLowerCase()))
		.filter((kw) => kw.length > 0);

	const keywordFilter = safeKeywords.length > 0
		? safeKeywords.map((kw) =>
			`(CONTAINS(LCASE(?description), "${kw}") || CONTAINS(LCASE(?name), "${kw}"))`
		).join(' || ')
		: '';

	return `
PREFIX schema: <http://schema.org/>
PREFIX admin: <https://schema.ld.admin.ch/>
PREFIX locn: <http://www.w3.org/ns/locn#>

SELECT ?company ?name ?legalName ?description ?url ?uid ?street ?zip ?city ?region
WHERE {
  ?company a admin:ZefixOrganisation ;
           schema:name ?name .

  ?company schema:address ?addr .
  ?addr schema:addressRegion ?region .
  FILTER(?region = "${CANTON_REGIONS[cantonId]}")

  OPTIONAL { ?company schema:legalName ?legalName }
  OPTIONAL { ?company schema:description ?description }
  OPTIONAL { ?company schema:url ?url }
  OPTIONAL {
    ?company schema:identifier ?uidNode .
    FILTER(CONTAINS(STR(?uidNode), "/UID/"))
  }
  OPTIONAL { ?addr schema:streetAddress ?street }
  OPTIONAL { ?addr schema:postalCode ?zip }
  OPTIONAL { ?addr schema:addressLocality ?city }

  BIND(REPLACE(STR(?uidNode), "^.*/UID/", "") AS ?uid)

  ${keywordFilter ? `FILTER(${keywordFilter})` : ''}
}
LIMIT ${limit}
`;
}
