# Mapping Material Symbols → Lucide

Migration livrée S115 (2026-04-26). 207 occurrences, 98 pictos uniques.

Stratégie : wrapper `<Icon name="...">` (`src/lib/components/Icon.svelte`) qui mappe les noms Material vers les composants Lucide via `src/lib/components/icon-map.ts`. L'API string (`icon: 'search'`, `<MultiSelectDropdown icon="checklist">`, etc.) reste inchangée.

## Pourquoi un wrapper et pas un import direct par fichier

- 90+ pictos référencés par string (config.ts navigation, TYPE_ICONS signaux, SCORE_STYLES, props `icon=` des composants partagés ImportModal/MultiSelectDropdown/AlerteModal/EmptyState/ModalForm). Refactorer toutes ces structures en imports de composants = casser l'API + 2× plus de surface.
- Wrapper = 1 seul point de remplacement `<span class="material-symbols-outlined">X</span>` → `<Icon name="X" />`, le reste suit.
- Tree-shaking : import nommé explicite dans `icon-map.ts` (`import { Search, Bell, ... } from 'lucide-svelte'`).

## Tailles

Taille via prop `size` (numérique, en px). Mapping depuis les classes Material `text-[Npx]` :

| Material `text-[Npx]` | Icon `size=` |
|---|---|
| 14px | 14 |
| 16px | 16 |
| 18px | 18 |
| 20px | 20 (md, défaut) |
| 22px | 22 |
| 24px | 24 (lg) |
| 28px | 28 |
| 48px | 48 |

## Mapping (98 pictos)

### Statiques (90)

| Material | Lucide | Notes |
|---|---|---|
| ac_unit | Snowflake | |
| account_tree | ListTree | |
| add | Plus | |
| add_circle | CirclePlus | |
| api | Code | |
| apartment | Building | |
| archive | Archive | |
| arrow_back | ArrowLeft | |
| arrow_forward | ArrowRight | |
| auto_awesome | Sparkles | |
| auto_fix_high | Wand2 | |
| block | Ban | |
| bookmark | Bookmark | |
| bookmark_add | BookmarkPlus | |
| bookmarks | Bookmark | (Lucide n'a pas Bookmarks pluriel) |
| business | Building2 | |
| calendar_today | Calendar | |
| check | Check | |
| check_circle | CircleCheck | |
| checklist | ListChecks | |
| chevron_right | ChevronRight | |
| close | X | |
| cloud_download | CloudDownload | |
| cloud_upload | CloudUpload | |
| contacts | Contact | |
| content_copy | Copy | |
| conversion_path | Workflow | |
| dashboard | LayoutDashboard | |
| database | Database | |
| delete | Trash2 | |
| delete_forever | Trash | |
| description | FileText | |
| dock_to_right | PanelRight | |
| domain_add | Building2 | (Plus icon visuel inclus dans contexte) |
| download | Download | |
| drag_indicator | GripVertical | |
| edit | Pencil | |
| edit_note | FilePen | |
| emoji_events | Trophy | |
| engineering | HardHat | |
| error | CircleAlert | |
| expand_more | ChevronDown | |
| explore | Compass | |
| fact_check | ClipboardCheck | |
| filter_alt_off | FilterX | |
| filter_list | ListFilter | |
| gavel | Gavel | |
| handshake | Handshake | |
| help_outline | CircleHelp | |
| info | Info | |
| language | Languages | |
| layers | Layers | |
| lightbulb | Lightbulb | |
| local_fire_department | Flame | |
| location_on | MapPin | |
| lock | Lock | |
| lock_open | LockOpen | |
| login | LogIn | |
| logout | LogOut | |
| map | Map | |
| menu | Menu | |
| menu_book | BookOpen | |
| monitoring | Activity | |
| notification_important | BellDot | |
| notifications | Bell | |
| notifications_active | BellRing | |
| open_in_new | ExternalLink | |
| people | Users | |
| person_add | UserPlus | |
| phone_forwarded | PhoneForwarded | |
| play_arrow | Play | |
| play_circle | CirclePlay | |
| radar | Radar | |
| remove | Minus | |
| rocket_launch | Rocket | |
| schedule | Clock | |
| search | Search | |
| search_off | SearchX | |
| security | ShieldCheck | |
| shield | Shield | |
| smartphone | Smartphone | |
| source | GitBranch | |
| stop | Square | |
| table_chart | Table | |
| thermostat | Thermometer | |
| thumb_up | ThumbsUp | |
| timer | Timer | |
| verified | BadgeCheck | |
| warning | TriangleAlert | |
| waving_hand | Hand | |

### Dynamiques (8, depuis fonctions JS internes)

| Material | Lucide | Source |
|---|---|---|
| circle | Circle | EnrichBatchModal.statusIcon default |
| construction | Construction | signaux TYPE_ICONS |
| local_shipping | Truck | signaux TYPE_ICONS |
| trending_up | TrendingUp | signaux TYPE_ICONS |
| merge | Merge | signaux TYPE_ICONS |
| task_alt | CircleCheckBig | EnrichBatchModal quotaWarning |
| deselect | SquareMinus | signaux toggle select |
| select_all | SquareCheck | signaux toggle select |
| check_box_outline_blank | Square | signaux row select |

## Vérification

```bash
# 0 occurrence après migration
cd template && grep -rn "material-symbols-outlined" src/  # vide attendu
# Pas de requête vers fonts.googleapis.com/icon en runtime
# DevTools Network sur /prospection → 0 requête Material
```
