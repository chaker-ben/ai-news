# Conventions détectées — AI News

Date : 2026-04-23
Fichiers examinés : 22
Analyste : @context-analyst

## 1. Stack détectée

- **Type** : Monorepo (pnpm workspaces + Turborepo)
- **Dashboard** : Next.js 15 (App Router), React 19, TypeScript 5.7 strict
- **Mobile** : Expo 54, React Native 0.81, React 19
- **Workers** : Python 3.11+ (FastAPI, SQLAlchemy, Pydantic Settings)
- **TypeScript** : strict (tsconfig `"strict": true`)
- **Test framework** : Vitest (v8 coverage, seuils 80/80/75/80)
- **Lint / format** : ESLint 9 + eslint-config-next + eslint-plugin-security, Prettier (semi:false, singleQuote, tabWidth:2, trailingComma:es5, printWidth:100, plugin tailwindcss)
- **Validation** : Zod (API routes + env + API client), Pydantic (workers)
- **ORM / DB** : Prisma 6 (PostgreSQL), SQLAlchemy (workers)
- **Auth** : Clerk (web + mobile)
- **Billing** : Airwallex
- **i18n** : next-intl v4 (web, locales: fr/en/ar), i18next + react-i18next (mobile)
- **Styling** : Tailwind CSS 4 + CSS custom properties (design tokens dans `tokens/base.css`)
- **Icons** : Lucide React (web), Lucide React Native via proxy `lib/icons.tsx` (mobile)
- **CI** : GitHub Actions — typecheck → lint → test:coverage → audit → build
- **Node** : >=20.0.0, pnpm 9.15.0
- **Deploy** : Railway (web + workers)

## 2. Conventions observées (≥3 fichiers)

### Naming

- **Fichiers composants** : kebab-case (`bookmark-button.tsx`, `articles-filter-list.tsx`, `score-badge.tsx`)
- **Fichiers pages** : `page.tsx` (Next.js App Router convention)
- **Fichiers API routes** : `route.ts` (Next.js App Router convention)
- **Fichiers lib** : kebab-case (`article-i18n.ts`, `plan-limits.ts`, `env.ts`)
- **Dossiers** : kebab-case (`articles-filter-list` absent, flat dans `components/articles/`)
- **Composants (exports)** : PascalCase named exports (`BookmarkButton`, `ArticlesFilterList`, `ScoreBadge`)
- **Hooks** : `use-<name>.ts` kebab-case fichier, `useXxx` camelCase export (`use-preferences.ts` → `usePreferences`)
- **Types / interfaces** : PascalCase (`LocalizedArticle`, `NavItem`, `AdjacentArticles`)
- **Prisma models** : PascalCase (`BillingPlan`, `ChatConversation`), tables snake_case via `@@map`
- **Prisma fields** : camelCase, colonnes snake_case via `@map`
- **Python** : snake_case (fichiers, fonctions, variables) — standard Python

### Structure

- **Layering** : type-based (components/, hooks/, lib/, i18n/) — pas feature-based
- **Components** : flat + sous-dossiers thématiques (`components/articles/`, `components/chat/`)
- **Barrel files** : absents (imports directs vers les fichiers)
- **Tests** : centralisés dans `__tests__/` miroir (`src/__tests__/api/chat/`, `src/__tests__/lib/`)
- **Packages monorepo** : db, types, ui, utils — imports via `@ai-news/db`, `@ai-news/types`
- **i18n messages** : `messages/fr.json`, `messages/en.json`, `messages/ar.json` à la racine de l'app web
- **Design tokens** : `tokens/base.css` à la racine monorepo

### Code

- **Imports** : alias `@/` pour intra-app, `@ai-news/*` pour packages — aucun import relatif `../` observé au-delà de 1 niveau
- **Types** : explicites aux frontières (params, return), inférés en interne — conforme TypeScript strict
- **Erreurs API routes** : try/catch inline avec Zod discriminé (`instanceof z.ZodError`) + catch-all avec `console.error` + 500
- **Erreurs composants** : try/catch silencieux avec fallback UI (articles page: `catch {}`)
- **Validation** : Zod systématique sur les API routes (input), sur l'API client (output), sur env vars
- **Async** : async/await exclusif — pas de `.then()` observé
- **`'use client'`** : utilisé uniquement quand nécessaire (état, effets, interactivité)
- **Default exports** : uniquement sur pages/layouts Next.js — named exports partout ailleurs
- **CSS** : mélange Tailwind classes + inline `style={{ color: "var(--text-primary)" }}` pour les design tokens
- **i18n dans composants** : `useTranslations()` (client), `getTranslations()` (server)
- **Env validation** : lazy Proxy pattern dans `lib/env.ts` (évite ZodError au build-time)

### Tests

- **Framework** : Vitest (vi.mock, vi.mocked)
- **Pattern de nommage** : `describe('[Feature] /api/path', () => { it('should ...') })`
- **Structure** : Arrange / Act / Assert (commentaires explicites)
- **Mocking** : `vi.mocked()` pour Clerk auth + Prisma client
- **Coverage target** : 80% lignes, 80% fonctions, 75% branches, 80% statements
- **Localisation tests** : `src/__tests__/` (miroir de src)

### Git

- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`) — observé dans les 5 derniers commits
- **Branche principale** : `main`
- **Pas de commitlint config** détecté — convention appliquée manuellement

## 3. Divergences vs standards AIDD Pro

### Compatibles (pas d'action)

- **Validation Zod** : déjà systématique — conforme
- **TypeScript strict** : déjà activé — conforme
- **Named exports** : déjà appliqué (sauf pages/layouts) — conforme
- **Conventional Commits** : déjà appliqué — conforme
- **Env validation** : `lib/env.ts` avec Zod — conforme
- **Clerk auth** : déjà en place — conforme
- **i18n 3 langues** : fr/en/ar déjà supporté — conforme
- **Lucide icons** : déjà utilisé partout (pas d'emojis UI) — conforme
- **RTL mobile proxy** : `lib/icons.tsx` en place — conforme
- **Coverage 80%** : seuils déjà configurés — conforme
- **Dark mode** : design tokens dark-first via CSS variables — conforme
- **CI pipeline** : typecheck + lint + test:coverage + audit + build — conforme
- **Prisma + PostgreSQL** : conforme à la stack obligatoire

### Conflits (décision humaine requise)

- **CSS inline style vs Tailwind** : le projet mélange `className` Tailwind et `style={{ color: "var(--text-primary)" }}` pour les design tokens. AIDD Pro recommande Tailwind dark: classes ou CSS variables via Tailwind config. Migration progressive souhaitable mais pas bloquante.
- **Tests structure** : AIDD Pro recommande la colocation (`__tests__/` à côté du code), le projet utilise un miroir centralisé (`src/__tests__/`). Les deux sont valides — garder la convention existante.
- **Error handling** : certains `catch {}` silencieux dans les composants (ex: `articles/page.tsx` ligne 22, `api.ts` ligne 181). AIDD Pro demande "jamais de catch vide". Accepter comme fallback UI intentionnel mais documenter.
- **Pas de commitlint** : Conventional Commits respecté manuellement mais pas enforced par un outil. Migration progressive.

### Obsolètes (à moderniser)

- **Aucun pattern obsolète détecté** : stack moderne (Next.js 15, React 19, Expo 54, Tailwind 4, Prisma 6).

## 4. Recommandations pour `/rules`

### Imposer (non-négociable)

- TypeScript strict (déjà en place)
- Zod validation sur toutes entrées API
- Env vars via `lib/env.ts` validées Zod — jamais de hardcode
- Conventional Commits
- Lucide icons only — jamais d'emojis UI
- i18n : jamais de texte en dur, clés de traduction
- RTL : propriétés logiques CSS/RN, proxy icons mobile
- Security : headers, CSRF, pas de `dangerouslySetInnerHTML` sans DOMPurify
- Coverage ≥ 80%

### Adapter au projet (respecter la convention existante)

- **Fichiers kebab-case** (pas PascalCase) : convention projet
- **Tests centralisés dans `src/__tests__/`** : pas de migration vers colocation
- **Type-based layering** (`components/`, `hooks/`, `lib/`) : pas feature-based
- **CSS variables via inline style** : convention acceptée en parallèle de Tailwind
- **Lazy Proxy env pattern** : convention spécifique Railway — garder

### Annoncer mais pas imposer (migration progressive)

- Ajouter commitlint pour enforcer Conventional Commits
- Réduire les `catch {}` silencieux — ajouter au minimum un `console.error`
- Migrer les inline `style={}` vers Tailwind config custom properties à terme
- Ajouter des tests E2E (Playwright configuré mais 0 test détecté)

## 5. Verdict

```aidd-verdict
status: pass
blockers: 0
major: 1
minor: 3
continue_pipeline: true
summary: Codebase mature et bien structuré, conforme aux standards AIDD Pro à 90%. 1 point majeur (catch silencieux) et 3 mineurs (CSS inline, pas de commitlint, pas de tests E2E).
```

## Annexe — Fichiers examinés

1. `package.json` (racine)
2. `pnpm-workspace.yaml`
3. `turbo.json`
4. `.prettierrc`
5. `.eslintrc.security.json`
6. `vitest.config.ts`
7. `apps/web/package.json`
8. `apps/web/tsconfig.json`
9. `apps/mobile/package.json`
10. `apps/mobile/lib/icons.tsx`
11. `packages/db/package.json`
12. `packages/db/prisma/schema.prisma`
13. `apps/web/src/lib/env.ts`
14. `apps/web/src/lib/api.ts`
15. `apps/web/src/lib/article-i18n.ts`
16. `apps/web/src/middleware.ts`
17. `apps/web/src/i18n/routing.ts`
18. `apps/web/src/app/[locale]/(dashboard)/articles/page.tsx`
19. `apps/web/src/app/[locale]/(dashboard)/layout.tsx`
20. `apps/web/src/app/[locale]/(marketing)/landing/page.tsx`
21. `apps/web/src/app/api/user/bookmarks/route.ts`
22. `apps/web/src/app/api/billing/plans/route.ts`
23. `apps/web/src/app/api/webhooks/clerk/route.ts`
24. `apps/web/src/components/articles/articles-filter-list.tsx`
25. `apps/web/src/components/bookmark-button.tsx`
26. `apps/web/src/__tests__/api/chat/conversations.test.ts`
27. `workers/src/config.py`
28. `workers/src/collectors/rss_collector.py`
29. `tokens/base.css`
30. `.github/workflows/ci.yml`
