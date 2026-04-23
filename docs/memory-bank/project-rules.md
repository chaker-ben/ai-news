# Règles projet — AI News

Généré par `/rules` le 2026-04-23
Sources fusionnées :
- Standards globaux : `~/.claude/CLAUDE.md` (AIDD Pro v3.1.0)
- Standards projet : `CLAUDE.md` racine projet
- Conventions détectées : `detected-conventions.md` (audit du 2026-04-23, 30 fichiers)

> Ce fichier est la source de vérité pour tous les agents sur ce projet.
> Chargé via `@docs/memory-bank/project-rules.md`.

---

## 1. Non-négociable (sécurité, i18n, RTL)

Ces règles viennent des standards globaux et ne sont **jamais** contournées.

### Sécurité

- Jamais de secrets en dur — `process.env` + validation Zod (`lib/env.ts`)
- Validation côté serveur obligatoire (Zod sur toutes les entrées API)
- Jamais `dangerouslySetInnerHTML` sans DOMPurify
- Headers de sécurité : CSP, HSTS, X-Frame-Options
- CSRF protection sur les mutations
- Webhooks : signature verification obligatoire (Svix pour Clerk, HMAC pour Airwallex)
- ESLint security plugin activé (`.eslintrc.security.json`)

### i18n / RTL

- Jamais de texte en dur — clés de traduction (`next-intl` web, `i18next` mobile)
- 3 langues minimum : fr, en, ar
- Dates/nombres/devises : `Intl` API exclusivement
- **Web** : propriétés logiques CSS (`margin-inline-start`, pas `margin-left`)
- **Mobile** : `I18nManager.forceRTL` + reload, propriétés logiques RN (`marginStart/End`)
- **Mobile icons** : import depuis `lib/icons.tsx` (proxy RTL), jamais depuis `lucide-react-native`
- Nombres/prix/dates : `writingDirection: 'ltr'` forcé même en contexte RTL
- Font arabe : IBM Plex Sans Arabic obligatoire
- Stratégie Center-First : centrer tout ce qui peut l'être (titres, images, CTAs)

### Données sensibles

- `.env` dans `.gitignore` — jamais commitée
- `.env.example` commitée avec toutes les clés, valeurs vides
- Clés Clerk `pk_live` jamais en dev
- Toute URL externe dans `process.env.VARIABLE_NAME`

### Icônes

- **Jamais d'emojis comme icônes UI** — Lucide React (web) / Lucide React Native via proxy (mobile)
- Style outline cohérent dans tout le projet

---

## 2. Respecté parce que déjà en place dans le codebase

Ces règles viennent de conventions détectées par `/audit`.
L'agent **DOIT** s'y conformer pour ne pas introduire d'incohérence.

### Naming

- **Fichiers** : kebab-case (`bookmark-button.tsx`, `article-i18n.ts`)
- **Composants (exports)** : PascalCase named exports (`BookmarkButton`, `ScoreBadge`)
- **Hooks** : fichier `use-<name>.ts`, export `useXxx()`
- **Types / interfaces** : PascalCase (`LocalizedArticle`, `NavItem`)
- **Prisma models** : PascalCase, tables snake_case via `@@map`, fields camelCase avec `@map`
- **Python (workers)** : snake_case fichiers + fonctions (standard Python)
- **Pages/layouts** : default export (convention Next.js App Router)

### Structure

- **Layering** : type-based (`components/`, `hooks/`, `lib/`, `i18n/`)
- **Components** : flat + sous-dossiers thématiques (`components/articles/`, `components/chat/`)
- **Pas de barrel files** : imports directs vers les fichiers
- **Tests** : centralisés dans `src/__tests__/` en miroir de `src/`
- **Packages monorepo** : `@ai-news/db`, `@ai-news/types`, `@ai-news/ui`, `@ai-news/utils`
- **i18n messages** : `messages/{locale}.json` à la racine de l'app web
- **Design tokens** : `tokens/base.css` à la racine monorepo, CSS custom properties
- **API routes** : `src/app/api/<resource>/route.ts` (REST, Next.js App Router)

### Code

- **Imports** : alias `@/` intra-app, `@ai-news/*` packages — pas d'imports relatifs profonds
- **TypeScript strict** : types explicites aux frontières, inférés en interne
- **Async** : async/await exclusif, pas de `.then()`
- **`'use client'`** : uniquement quand état/effets nécessaires
- **Env validation** : lazy Proxy pattern (`lib/env.ts`) — convention Railway, ne pas changer
- **API client** : `fetchApi<T>()` générique avec Zod parse en sortie (`lib/api.ts`)
- **i18n composants** : `useTranslations()` client, `getTranslations()` server
- **CSS** : Tailwind classes + inline `style={}` pour design tokens custom properties

### Error handling (pattern projet)

- **API routes** : try/catch avec `instanceof z.ZodError` → 400, Prisma errors discriminés, catch-all → `console.error` + 500
- **Composants** : try/catch avec fallback UI (empty state) — catch silencieux accepté pour le rendu
- **API client** : throw Error pour les non-200, catch dans les composants appelants

### Tests (pattern projet)

- **Framework** : Vitest (`vi.mock`, `vi.mocked`)
- **Nommage** : `describe('[Feature] /api/path', () => { it('should ...') })`
- **Structure** : Arrange / Act / Assert (commentaires AAA)
- **Mocking** : `vi.mocked()` pour Clerk auth + Prisma client
- **Coverage** : 80% lignes, 80% fonctions, 75% branches, 80% statements

### Git

- **Conventional Commits** : `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`
- **Branche principale** : `main`

---

## 3. Introduit par AIDD Pro (nouvelle règle)

Ces règles s'appliquent aux **nouveaux fichiers**. Migration progressive de l'existant.

### Tests

- TDD : écrire les tests AVANT l'implémentation (RED → GREEN → REFACTOR)
- Coverage ≥ 80% sur tout nouveau code
- Ajouter des tests E2E Playwright (configuré mais aucun test existant)

### Documentation

- ADRs dans `docs/architecture/` pour les décisions structurantes
- Documenter les choix dans `docs/memory-bank/tech-decisions.md`

### Commits

- Ajouter commitlint à terme pour enforce Conventional Commits automatiquement
- Max 300 lignes par PR

### Error handling (amélioration progressive)

- Réduire les `catch {}` silencieux — ajouter au minimum `console.error` dans les nouveaux fichiers
- Pattern recommandé pour les nouveaux composants : error boundary ou fallback explicite

### Performance

- Core Web Vitals : LCP < 2.5s, FID < 100ms, CLS < 0.1
- Images : WebP/AVIF, lazy loading, Next.js Image component
- Code splitting et lazy loading des routes

---

## 4. Conflits résolus (pour mémoire)

| Conflit | Décision | Raison |
|---|---|---|
| CSS inline `style={}` vs Tailwind-only | **Garder le mélange** (convention projet) | Design tokens via CSS custom properties nécessitent inline style ; migration vers Tailwind config custom properties à terme |
| Tests centralisés `__tests__/` vs colocation | **Garder `__tests__/` centralisé** (convention projet) | 12 fichiers de tests déjà en place, cohérence interne prioritaire |
| Catch silencieux (`catch {}`) dans composants | **Accepté pour UI fallback** — interdire dans API/lib | Différence intentionnelle : crash silencieux OK en rendu, pas en logique métier |
| Pas de commitlint | **Migration progressive** — ne pas bloquer | Conventional Commits déjà respecté manuellement, ajouter l'outil quand c'est prioritaire |

---

## 5. Commandes utiles sur ce projet

```bash
# Pipeline
/implement <feature>      # Respecte sections 2 et 3
/review                   # Check conformité à ce fichier
/audit                    # Re-scanner si le codebase évolue
/rules                    # Régénérer si standards globaux changent

# Dev
pnpm dev:web              # Dashboard Next.js
pnpm dev:workers          # FastAPI workers
pnpm test                 # Vitest
pnpm typecheck            # tsc --noEmit
pnpm build                # Build production

# DB
pnpm db:migrate           # Prisma migrations
pnpm db:seed              # Seed dev data
```

---

## 6. Verdict

```aidd-verdict
status: pass
blockers: 0
major: 0
minor: 4
continue_pipeline: true
summary: Project rules generated — 14 non-negotiable rules, 25 detected conventions preserved, 4 new AIDD Pro rules introduced, 4 soft conflicts resolved (all favoring existing codebase)
```
