# Sprint Courant

> Tâches en cours. Mis a jour par @memory-manager apres chaque session.

## Statut : Commercialisation terminee (2026-03-23)

Les 6 phases de commercialisation sont toutes completees :

- [x] **Phase 1** : Backend Python (collecteurs RSS, Twitter, YouTube, Reddit, ArXiv)
- [x] **Phase 2** : Traitement IA (Claude API summarizer, DeepL translator, scorer, keyword extractor, pipeline)
- [x] **Phase 3** : Dashboard Next.js (articles, analytics, sources, bookmarks, alerts, settings, onboarding)
- [x] **Phase 4** : Notifications multi-canal (WhatsApp UltraMsg, Email Resend, Telegram Bot)
- [x] **Phase 5** : Monetisation (plans free/pro/team/enterprise, Airwallex payments, checkout, billing, invoices)
- [x] **Phase 6** : Multi-utilisateurs (Clerk auth, user preferences, organizations, teams, per-user digest routing)

## Termine cette semaine

- [x] Article detail page + dev/business profile scoring
- [x] Trilingual article processing (FR + EN + AR)
- [x] Process articles with empty summary
- [x] Single Claude call for translate + summarize + score
- [x] Airwallex payment integration (checkout, webhooks, billing management)
- [x] Multi-channel notifications (WhatsApp + Email + Telegram)
- [x] Per-user preferences with timezone-aware digest scheduling
- [x] Organization & team management
- [x] Marketing landing page

## Bloqueurs

- Aucun

## Prochaines priorites

### Deploiement & Infrastructure
- [ ] CI/CD pipeline (GitHub Actions : lint, typecheck, test, build, deploy)
- [ ] Production deployment (Vercel pour web, Railway/Fly.io pour workers)
- [ ] PostgreSQL production (Neon ou RDS)
- [ ] Environment staging setup (variables separees de prod)

### Tests & Qualite
- [ ] Unit tests pour les API routes (Vitest)
- [ ] Unit tests pour les workers Python (pytest)
- [ ] Integration tests pour le pipeline de traitement
- [ ] E2E tests pour le checkout flow (Playwright)
- [ ] Coverage minimum 80% sur le code existant

### Monitoring & Observabilite
- [ ] Sentry integration (web + workers)
- [ ] Logging structure (workers Python)
- [ ] Health check endpoints
- [ ] Alerting sur erreurs critiques (collecte, paiement, notifications)

### SEO & Marketing
- [ ] Meta tags et Open Graph sur toutes les pages
- [ ] Sitemap.xml dynamique
- [ ] robots.txt
- [ ] Structured data (JSON-LD) pour les articles
- [ ] Performance audit (Core Web Vitals)

### Securite
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting sur les API routes
- [ ] Input sanitization audit
- [ ] CSRF protection verification
- [ ] Secrets rotation plan
