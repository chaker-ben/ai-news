# Runbook : Migrations Base de Données

> Protocole pour les migrations Prisma en production — zero-downtime, rollback propre.

## Principe : Expand / Contract

Toute migration breaking doit suivre le pattern **Expand → Migrate → Contract** :

```
Expand    → Ajouter la nouvelle structure (rétrocompatible)
Migrate   → Copier/transformer les données existantes
Contract  → Supprimer l'ancienne structure
```

Chaque étape = une PR séparée + un déploiement indépendant.

---

## Types de Migrations

### ✅ Non-breaking (safe — une seule PR)
- Ajouter une table
- Ajouter une colonne nullable
- Ajouter un index
- Ajouter une relation optionnelle

### ⚠️ Breaking (3 étapes requises)
- Renommer une colonne ou table
- Changer le type d'un champ
- Rendre nullable → required
- Supprimer une colonne utilisée par le code

---

## Workflow Standard (Non-Breaking)

```bash
# 1. Modifier le schema Prisma
# 2. Créer la migration
pnpm db:migrate --name "add_user_preferences"

# 3. Vérifier le fichier SQL généré
cat prisma/migrations/XXXX_add_user_preferences/migration.sql

# 4. Tester en staging
DATABASE_URL=$STAGING_DB pnpm db:migrate

# 5. Déployer en prod
DATABASE_URL=$PROD_DB pnpm db:migrate
```

---

## Workflow Renommage de Colonne (3 étapes)

### Étape 1 — Expand
```prisma
model User {
  firstName  String   // ancienne colonne — GARDER
  first_name String?  // nouvelle colonne — AJOUTER nullable
}
```
Déployer le code qui écrit dans LES DEUX colonnes.

### Étape 2 — Migrate les données
```sql
UPDATE "User" SET first_name = "firstName" WHERE first_name IS NULL;
```

### Étape 3 — Contract
```prisma
model User {
  first_name String  // NOT NULL maintenant, ancienne colonne supprimée
}
```

---

## Checklist Avant Migration Production

- [ ] Migration testée en local sur une copie des données de prod
- [ ] Migration testée en staging
- [ ] Durée estimée (si > 1min → maintenance ou batching)
- [ ] Rollback testé
- [ ] Backup base de prod effectué
- [ ] Monitoring activé pendant la migration
- [ ] Équipe prévenue

---

## Procédure de Rollback

```bash
# Annuler la dernière migration
pnpm prisma migrate resolve --rolled-back MIGRATION_NAME

# Restaurer depuis backup (PostgreSQL)
pg_restore --clean --dbname=$PROD_DB backup_YYYY-MM-DD.dump
```

> ⚠️ JAMAIS supprimer un fichier de migration. Marquer comme rolled-back uniquement.

---

## Seeds de Données

```bash
pnpm db:seed        # Seed complet (dev)
pnpm db:seed:ref    # Données de référence (tous environnements)
```

### Règle critique — utiliser `upsert`, jamais `create`
```typescript
await prisma.category.upsert({
  where: { slug: 'electronics' },
  create: { slug: 'electronics', name: 'Electronics' },
  update: { name: 'Electronics' },
})
```

---

## Monitoring Post-Migration

- Vérifier les query times dans les logs
- Vérifier les erreurs 500 dans Sentry
- Valider les données migrées avec une requête de contrôle
- `EXPLAIN ANALYZE` si nouvelle query lente détectée
