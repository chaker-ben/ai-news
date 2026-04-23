# Regles projet — AI News

Genere par `/rules` le 2026-04-23
Sources fusionnees :
- Standards globaux : `~/.claude/CLAUDE.md` (AIDD Pro v3.1.0)
- Standards projet : `CLAUDE.md` racine AI News
- Conventions detectees : `detected-conventions.md` (audit du 2026-04-23, 29 fichiers)

> Ce fichier est la source de verite pour tous les agents sur ce projet.
> Charge automatiquement via CLAUDE.md projet.

---

## 1. Non-negociable (securite, i18n, RTL)

Ces regles viennent des standards globaux et ne sont **jamais** contournees.

### Securite

- Jamais de secrets en dur — `process.env` + validation Zod (`lib/env.ts`) / Pydantic (`config.py`)
- Validation serveur obligatoire sur toutes les entrees (Zod web, Pydantic workers)
- Headers de securite requis : CSP, HSTS, X-Frame-Options (`next.config.ts`)
- CSRF protection sur les mutations
- Jamais `dangerouslySetInnerHTML` sans DOMPurify
- Webhooks : signature verification obligatoire (Svix pour Clerk, HMAC pour Airwallex)
- ESLint security plugin active (`.eslintrc.security.json`)
- Auth : verifier `auth()` de Clerk sur toutes les routes protegees
- Source : `~/.claude/CLAUDE.md`

### i18n / RTL

- Jamais de texte en dur — cles de traduction (`next-intl` web, `i18next` mobile)
- 3 langues minimum : fr, en, ar
- Dates/nombres/devises : `Intl` API exclusivement
- **Web** : proprietes logiques CSS (`margin-inline-start`, pas `margin-left`)
- **Mobile** : `I18nManager.forceRTL` + reload, proprietes logiques RN (`marginStart/End`)
- **Mobile icons** : import depuis `lib/icons.tsx` (proxy RTL), jamais depuis `lucide-react-native`
- Nombres/prix/dates : `writingDirection: 'ltr'` force meme en contexte RTL
- Font arabe : IBM Plex Sans Arabic obligatoire
- Strategie Center-First : centrer tout ce qui peut l'etre (titres, images, CTAs)
- Source : `~/.claude/CLAUDE.md`

### Donnees sensibles

- `.env` dans `.gitignore` — jamais commitee
- `.env.example` commitee avec toutes les cles, valeurs vides
- Cles Clerk `pk_live` jamais en dev
- Toute URL externe dans `process.env.VARIABLE_NAME`
- Jamais de Co-Authored-By Claude dans les commits (memoire utilisateur)

### Icones

- **Jamais d'emojis comme icones UI** — Lucide React (web) / Lucide React Native via proxy (mobile)
- Style outline coherent dans tout le projet

---

## 2. Respecte parce que deja en place dans le codebase

Ces regles viennent de conventions detectees par `/audit`.
L'agent **DOIT** s'y conformer pour ne pas introduire d'incoherence.

### Naming

- **Fichiers** : kebab-case (`bookmark-button.tsx`, `article-i18n.ts`) — detecte 29/29 fichiers
- **Composants (exports)** : PascalCase named exports (`BookmarkButton`, `StatCard`)
- **Hooks** : fichier `use-<name>.ts`, export `useXxx()`
- **Types / interfaces** : PascalCase (`LocalizedArticle`, `NavItem`)
- **Schemas Zod** : suffixe `Schema` (`articleSchema`, `addBookmarkSchema`) — detecte 5+ fichiers
- **Prisma models** : PascalCase, tables snake_case via `@@map`, fields camelCase avec `@map`
- **Python (workers)** : snake_case fichiers + fonctions, PascalCase classes
- **Pages/layouts** : default export (convention Next.js App Router)

### Structure

- **Monorepo** : `apps/web/`, `apps/mobile/`, `packages/*`, `workers/` — pnpm workspaces + Turborepo
- **Layering** : type-based (`components/`, `hooks/`, `lib/`, `i18n/`)
- **Components** : flat + sous-dossiers thematiques (`components/articles/`, `components/chat/`, `components/ui/`)
- **Pas de barrel files** : imports directs vers les fichiers
- **Tests** : centralises dans `src/__tests__/` en miroir de `src/`
- **Packages** : `@ai-news/db`, `@ai-news/types`, `@ai-news/ui`, `@ai-news/utils`
- **i18n messages** : `messages/{locale}.json` a la racine de apps/web
- **Design tokens** : `tokens/base.css` racine monorepo, CSS custom properties
- **API routes** : `src/app/api/<resource>/route.ts` (REST, Next.js App Router) sans prefix locale
- **Route groups** : `(dashboard)`, `(marketing)`, `(auth)` — layouts distincts par section
- **Workers** : `collectors/`, `processors/`, `notifiers/`, `scheduler/`, `models/`

### Code

- **Imports** : alias `@/` intra-app, `@ai-news/*` packages — pas d'imports relatifs profonds
- **TypeScript strict** : types explicites aux frontieres, inferes en interne — aucun `any`
- **Async** : async/await exclusif, pas de `.then()`
- **`'use client'`** : uniquement quand etat/effets necessaires
- **Server Components par defaut** : pages dashboard, articles
- **`await params`** : pattern Next.js 15 pour acceder aux params
- **Env web** : lazy Proxy pattern (`lib/env.ts`) — convention Railway, ne pas changer
- **Env workers** : Pydantic Settings (`config.py`)
- **API client** : `fetchApi<T>()` generique avec Zod parse en sortie (`lib/api.ts`)
- **i18n composants** : `useTranslations()` client, `getTranslations()` server
- **CSS** : Tailwind classes pour layout/spacing + inline `style={}` pour design tokens
- **Prisma import** : `import { prisma } from "@ai-news/db"`
- **Response format** : `{ data: T }` succes, `{ error: string, details?: T }` erreur
- **Donnees statiques** : `as const`
- **Props composants** : `Readonly<{ ... }>`
- **Dual ORM** : Prisma (web, source de verite schema) + SQLAlchemy (workers, reflete Prisma)
- **Logging web** : `console.error("[API]", error)`
- **Logging workers** : `logging.getLogger(__name__)`, Google-style docstrings
- **Python type hints** : `from __future__ import annotations` systematique

### Error handling (pattern projet)

- **API routes** : try/catch avec `instanceof z.ZodError` -> 400, Prisma P2002 -> 409, catch-all -> `console.error` + 500
- **Composants** : try/catch avec fallback UI (empty state) — catch silencieux accepte pour le rendu
- **API client** : throw Error pour les non-200, catch dans les composants appelants
- **Workers** : try/except avec logging Python standard

### Tests (pattern projet)

- **Framework** : Vitest (web), pytest + pytest-asyncio (workers)
- **Nommage** : `describe('[Feature] /api/path', () => { it('should ...') })`
- **Structure** : Arrange / Act / Assert (commentaires AAA)
- **Mocking** : `vi.mocked()` pour Clerk auth + Prisma client
- **Helper** : `createMockRequest()` reutilisable
- **Couverture** : auth (401), validation (400), happy path (200/201), edge cases
- **Coverage seuils** : 80% lignes, 80% fonctions, 75% branches, 80% statements

### Git

- **Conventional Commits** en anglais (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`)
- **Branche principale** : `main`, branche staging : `staging`
- **Pas de Co-Authored-By Claude** — memoire utilisateur explicite

---

## 3. Introduit par AIDD Pro (nouvelle regle)

Ces regles s'appliquent aux **nouveaux fichiers**. Migration progressive de l'existant.

### Tests

- TDD : ecrire les tests AVANT l'implementation (RED -> GREEN -> REFACTOR)
- Coverage >= 80% sur tout nouveau code
- 14 API routes sans tests — prioriser : billing, webhooks, organizations
- Tests E2E Playwright a configurer (framework present mais 0 test)

### Securite headers

- Configurer CSP, HSTS, X-Frame-Options dans `next.config.ts`
- Non encore en place — a ajouter dans un ticket dedie

### Error handling (amelioration progressive)

- Eliminer les `catch {}` silencieux dans les fichiers touches — minimum `console.error`
- Pattern recommande pour les nouveaux composants : error boundary ou fallback explicite

### Workers Python (migration progressive)

- Migrer `datetime.utcnow()` -> `datetime.now(timezone.utc)` (deprecated Python 3.12+)
- Corriger retours erreur FastAPI : `raise HTTPException(status_code=N, detail="...")` au lieu de tuple
- Ajouter Pydantic response models pour les endpoints FastAPI
- Verifier deps inutilisees : DeepL, Playwright dans requirements.txt

### Documentation

- ADRs dans `docs/architecture/` pour decisions structurantes
- Documenter les choix dans `docs/memory-bank/tech-decisions.md`

### UI (amelioration progressive)

- Skeleton loaders pour les loading states (pas de spinners generiques)
- Decomposer la landing page en sous-composants (2392 lignes actuellement)

### Commits

- Ajouter commitlint a terme pour enforce Conventional Commits automatiquement
- Max 300 lignes par PR (pour les nouvelles PRs)

### Performance

- Core Web Vitals : LCP < 2.5s, FID < 100ms, CLS < 0.1
- Images : WebP/AVIF, lazy loading, Next.js Image component
- Code splitting et lazy loading des routes

---

## 4. Conflits resolus (pour memoire)

| Conflit | Decision | Raison |
|---------|----------|--------|
| TDD obligatoire vs tests ecrits apres | Migration progressive : TDD pour nouvelles features, ajout retroactif priorise par criticite | Evite big-bang risque sur 14 routes non testees |
| Coverage 80% vs 46% actuel | Objectif 80% sur nouveau code uniquement | Principe de migration progressive |
| Max 300 lignes/PR vs landing 2392 lignes | Appliquer aux nouvelles PR, decomposer la landing en ticket separe | Pas de refactor retroactif impose |
| CSS inline + Tailwind (mixte) | **Garder le melange** — Tailwind layout/spacing, inline pour tokens | Convention coherente et justifiee par le theming |
| Tests centralises `__tests__/` vs colocation | **Garder `__tests__/` centralise** | 12 fichiers de tests en place, coherence interne |
| Catch silencieux dans composants | **Accepte pour UI fallback** — interdit dans API/lib | Crash silencieux OK en rendu, pas en logique metier |
| Pas de commitlint | Migration progressive — ne pas bloquer | Conventional Commits deja respecte manuellement |
| datetime.utcnow() dans workers | Migrer au prochain ticket workers | Deprecated Python 3.12+ — correction simple |
| FastAPI tuple error returns | Migrer vers HTTPException au prochain ticket workers | Bug silencieux — FastAPI ignore le 2e element |

---

## 5. Commandes utiles sur ce projet

```bash
# Pipeline
/implement <feature>      # Respecte sections 2 et 3
/review                   # Check conformite a ce fichier
/audit                    # Re-scanner si le codebase evolue
/rules                    # Regenerer si standards globaux changent
/quick <fix>              # Fix mineur sans pipeline complet

# Dev
pnpm dev:web              # Dashboard Next.js
pnpm dev:workers          # FastAPI workers
pnpm test                 # Vitest
pnpm typecheck            # tsc --noEmit
pnpm lint                 # ESLint
pnpm build                # Build production

# DB
pnpm db:generate          # Prisma client
pnpm db:migrate           # Prisma migrations
pnpm db:seed              # Seed dev data
```

---

## 6. Verdict

```aidd-verdict
status: pass
blockers: 0
major: 0
minor: 9 (migrations progressives listees en section 3 et 4)
continue_pipeline: true
summary: Project rules generated — 14 non-negotiable rules, 30 detected conventions preserved, 8 new AIDD Pro rules introduced progressively, 9 conflicts resolved via migration strategy
```
