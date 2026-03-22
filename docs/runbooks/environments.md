# Runbook : Gestion des Environnements

> Configuration et bonnes pratiques pour dev / staging / production.

## Architecture

```
dev       → Local, données fictives, hot reload, logs verbeux
staging   → Identique à prod, données anonymisées, validations client
production → Live, données réelles, monitoring actif
```

---

## Fichiers `.env`

```
.env                  # Valeurs locales — NON commitées (gitignore)
.env.example          # Template commitée — TOUTES les clés, valeurs vides
.env.local            # Override local — NON commitée
.env.test             # Pour les tests — peut être commitée si pas de secrets
```

### Structure `.env.example`

```bash
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Auth — Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_WEBHOOK_SECRET=

# Storage (si applicable)
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_REGION=

# Email (si applicable)
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Feature Flags
NEXT_PUBLIC_FEATURE_FLAG_X=false
```

---

## Validation des Variables — Obligatoire

```typescript
// lib/env.ts — Charger au démarrage de l'app
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
// → Lance une erreur claire au démarrage si une variable manque
```

---

## Clerk par Environnement

| Environnement | Instance Clerk | Clés |
|---|---|---|
| dev | `Development` | `pk_test_xxxx` / `sk_test_xxxx` |
| staging | `Development` | `pk_test_xxxx` / `sk_test_xxxx` |
| production | `Production` | `pk_live_xxxx` / `sk_live_xxxx` |

> ⚠️ Ne jamais utiliser les clés `pk_live` en développement.
> Chaque environnement a son propre endpoint webhook + `CLERK_WEBHOOK_SECRET`.

---

## Base de Données par Environnement

| Env | Hébergement | Données |
|---|---|---|
| dev | Local PostgreSQL (Docker) | Seed de dev |
| staging | Neon branch / RDS staging | Copie anonymisée de prod |
| production | RDS / Neon / PlanetScale | Données réelles |

### Docker Compose pour le dev local

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

---

## Déploiement

### Staging
```bash
# Push sur la branche staging → déploiement automatique
git push origin staging
```

### Production
```bash
git checkout main
git merge --no-ff staging
git push origin main
```

### Variables sur Vercel
```
Project Settings → Environment Variables
→ Sélectionner l'environnement (Production / Preview / Development)
→ Ne JAMAIS mettre les mêmes valeurs en Production et Preview
```

---

## Feature Flags

```typescript
// lib/features.ts
export const features = {
  newCheckout: process.env.NEXT_PUBLIC_FEATURE_NEW_CHECKOUT === 'true',
}

// Utilisation
import { features } from '@/lib/features'
if (features.newCheckout) { /* nouvelle version */ }
```

- `dev` : tout activé pour tester
- `staging` : activé si prêt pour la validation
- `production` : activé seulement après validation client

---

## Checklist Nouveau Projet

- [ ] `.env.example` créé avec toutes les clés
- [ ] `.env` dans `.gitignore`
- [ ] Validation Zod dans `lib/env.ts`
- [ ] Docker Compose pour la DB locale
- [ ] Instance Clerk Development créée
- [ ] Instance Clerk Production créée (clés différentes)
- [ ] Environnement staging configuré sur Vercel/Railway
- [ ] Variables staging configurées (séparées de prod)
- [ ] Monitoring (Sentry) configuré pour staging et prod
