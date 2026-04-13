# Blocages connus — AppFactory

Référencés depuis CLAUDE.md (tâche 1d). À lever avant le premier déploiement prod.

## 1. Vercel — `SUPABASE_SERVICE_ROLE_KEY` via Git link

**Symptôme** : la variable d'env `SUPABASE_SERVICE_ROLE_KEY` n'est pas injectée automatiquement au build Vercel quand le projet est lié à un repo Git sans configuration explicite.

**Cause** : Vercel ne lit pas les `.env*` locaux. Les secrets doivent être déclarés via CLI (`vercel env add`) ou via le dashboard, par environnement (production, preview, development).

**Action de déblocage** :
1. Récupérer la clé service_role depuis le dashboard Supabase du projet concerné (Settings → API → `service_role` secret).
2. L'injecter via CLI :
   ```bash
   printf '%s' "$SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```
   `printf '%s'` obligatoire (cf. memory `feedback_vercel_env_whitespace` — `echo` ajoute un newline qui casse la clé).
3. Redéployer pour que la var soit injectée au build suivant.

**Garde-fou sécurité** : `service_role` bypass RLS. Ne jamais l'exposer côté client, jamais dans `NEXT_PUBLIC_*`, jamais commit.

## 2. Figma API token

**Symptôme** : synchronisation design tokens et MCP Figma bloqués tant que le token personnel n'est pas configuré.

**Cause** : Figma API requiert un Personal Access Token (PAT) par utilisateur, scope lecture minimum pour les endpoints `/files` et `/styles`.

**Action de déblocage** :
1. Figma → Settings → Security → Personal access tokens → Generate new token (scope : `File content: read`, `Library content: read`).
2. Stocker dans `.env` local : `FIGMA_API_TOKEN=figd_...` (jamais commit, `.gitignore` couvre `.env`).
3. Pour MCP Figma : renseigner la clé dans la config du serveur MCP concerné.
4. Tester : `curl -H "X-Figma-Token: $FIGMA_API_TOKEN" https://api.figma.com/v1/me` → doit retourner l'identité.

**Rotation** : prévoir rotation annuelle, révocation immédiate si fuite suspectée.
