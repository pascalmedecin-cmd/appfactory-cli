import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import type { FeatureFlags } from '$lib/types/feature-flags';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			// Atelier 209 Run 2 : marque active (cloisonnement bi-marque), resolue dans hooks.server.ts
			// depuis le cookie `marque` (par-appareil). Defaut 'filmpro' = non-regression.
			marque: 'filmpro' | 'led';
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			featureFlags: FeatureFlags;
			marqueActive: 'filmpro' | 'led';
		}
	}
}

export {};
