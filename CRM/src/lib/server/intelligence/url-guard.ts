// Garde SSRF pour fetch sortants sur URL LLM-controlled.
//
// Origine : audit security-auditor 2026-05-05 finding Medium #1.
// L'item retourné par le LLM est validé par Zod (HttpsUrl) mais aucune
// vérification ne bloque les hostnames pointant vers des IPs privées :
// 169.254.169.254 (cloud metadata), 10.0.0.0/8, 172.16.0.0/12,
// 192.168.0.0/16, 127.0.0.0/8 (loopback), [::1], etc.
//
// Couche défense en profondeur (le LLM n'est PAS censé halluciner ce genre
// d'URL mais on ne fait pas confiance à un input externe).

const PRIVATE_IPV4_RANGES: Array<[bigint, bigint]> = [
	// 0.0.0.0/8 - "this network"
	[ipv4ToBigInt('0.0.0.0'), ipv4ToBigInt('0.255.255.255')],
	// 10.0.0.0/8 - private
	[ipv4ToBigInt('10.0.0.0'), ipv4ToBigInt('10.255.255.255')],
	// 100.64.0.0/10 - shared address space (CGNAT)
	[ipv4ToBigInt('100.64.0.0'), ipv4ToBigInt('100.127.255.255')],
	// 127.0.0.0/8 - loopback
	[ipv4ToBigInt('127.0.0.0'), ipv4ToBigInt('127.255.255.255')],
	// 169.254.0.0/16 - link-local + AWS/GCP/Azure metadata
	[ipv4ToBigInt('169.254.0.0'), ipv4ToBigInt('169.254.255.255')],
	// 172.16.0.0/12 - private
	[ipv4ToBigInt('172.16.0.0'), ipv4ToBigInt('172.31.255.255')],
	// 192.168.0.0/16 - private
	[ipv4ToBigInt('192.168.0.0'), ipv4ToBigInt('192.168.255.255')],
	// 224.0.0.0/4 - multicast
	[ipv4ToBigInt('224.0.0.0'), ipv4ToBigInt('239.255.255.255')],
	// 240.0.0.0/4 - reserved
	[ipv4ToBigInt('240.0.0.0'), ipv4ToBigInt('255.255.255.255')]
];

function ipv4ToBigInt(addr: string): bigint {
	const parts = addr.split('.').map(Number);
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
		throw new Error(`Invalid IPv4: ${addr}`);
	}
	return (
		(BigInt(parts[0]) << 24n) +
		(BigInt(parts[1]) << 16n) +
		(BigInt(parts[2]) << 8n) +
		BigInt(parts[3])
	);
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isPrivateIpv4(addr: string): boolean {
	if (!IPV4_RE.test(addr)) return false;
	let n: bigint;
	try {
		n = ipv4ToBigInt(addr);
	} catch {
		return true; // bizarre = sûr de bloquer
	}
	return PRIVATE_IPV4_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

const IPV6_BLOCKED_PREFIXES = [
	'::1', // loopback
	'::', // any
	'fe80:', // link-local
	'fc00:', // unique local
	'fd00:', // unique local
	'ff00:' // multicast
];

function isPrivateIpv6(addr: string): boolean {
	const lower = addr.toLowerCase().replace(/^\[|\]$/g, '');
	return IPV6_BLOCKED_PREFIXES.some((p) => lower === p || lower.startsWith(p));
}

const BLOCKED_HOSTNAMES = new Set([
	'localhost',
	'localhost.localdomain',
	'metadata.google.internal',
	'metadata',
	'instance-data'
]);

/**
 * Retourne true si le hostname extrait de l'URL doit être bloqué (IP privée,
 * loopback, metadata cloud, hostname interne connu).
 *
 * Limites :
 * - Ne fait PAS de DNS lookup (un hostname public résolvant vers une IP privée
 *   passe). Pour un blocage strict, faire `dns.lookup` puis check sur les IPs
 *   résolues. Pour une couche défense en profondeur sur LLM input, le check
 *   syntaxique suffit (le LLM ne va pas hallucine `intranet.corp.local` par
 *   accident, alors qu'il peut citer `127.0.0.1` ou `169.254.169.254` après
 *   avoir lu un blog sur les vulnérabilités cloud).
 */
export function isBlockedHostname(hostname: string): boolean {
	const lower = hostname.toLowerCase();
	if (BLOCKED_HOSTNAMES.has(lower)) return true;
	if (lower.endsWith('.local') || lower.endsWith('.localdomain')) return true;
	if (lower.endsWith('.internal')) return true;
	// IPv4 littéral
	if (IPV4_RE.test(lower)) return isPrivateIpv4(lower);
	// IPv6 littéral (peut être entouré de [])
	if (lower.includes(':') && !lower.includes('.')) return isPrivateIpv6(lower);
	return false;
}

/**
 * Vérifie qu'une URL est sûre à fetcher : protocole http(s) ET hostname public.
 * Retourne true si la requête doit être autorisée, false sinon.
 */
export function isSafeUrlForFetch(rawUrl: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return false;
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
	return !isBlockedHostname(parsed.hostname);
}
