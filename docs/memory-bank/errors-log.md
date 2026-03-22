# Errors Log

> Erreurs connues et solutions. Vérifier ici AVANT de débugger.

## ERR-001: Next.js Hydration Mismatch
**Cause**: Différence server/client (Date, Math.random, window, localStorage)
**Fix**: `useState(false)` + `useEffect(() => setMounted(true), [])`, skeleton until mounted
**Prévention**: Jamais d'API browser dans le rendu initial. `dynamic(import, { ssr: false })`

## ERR-002: Prisma Client Not Generated
**Cause**: Code exécuté avant `prisma generate`
**Fix**: `pnpm db:generate`
**Prévention**: Ajouter `prisma generate` au script `postinstall`

## ERR-003: CORS sur appels API externes
**Cause**: Appel direct depuis le client
**Fix**: Passer par une API route Next.js
**Prévention**: Tous les appels externes via `app/api/`

## ERR-004: [MOBILE] RTL — Propriétés physiques au lieu de logiques
**Cause**: Utiliser `marginLeft/Right`, `paddingLeft/Right` au lieu des propriétés logiques
**Fix**: Remplacer par `marginStart/End`, `paddingStart/End`, `start/end`
**Prévention**: ESLint rule + review systématique. Voir skill `mobile-standards`.

## ERR-005: [MOBILE] Double navigateur de tabs
**Cause**: `router.replace('/(tabs)/...')` depuis un modal crée un 2ème navigateur natif
**Fix**: Utiliser `navigateToTab()` qui fait `dismissAll()` + `navigate()`
**Prévention**: Créer `navigateToTab()` dès le jour 1.

## ERR-006: [MOBILE] Nombres/dates mal formatés en arabe
**Cause**: Affichage direct sans `Intl` API
**Fix**: `Intl.NumberFormat` et `Intl.DateTimeFormat` systématiquement. Téléphones en `writingDirection: 'ltr'`
**Prévention**: TOUJOURS formater via `Intl` API.

---
*Ajouter les nouvelles erreurs ci-dessous avec cause + fix + prévention.*

---

## Erreurs PDF RTL Arabes

### ERR-PDF-001 — Rectangles vides □□□□ (glyphes manquants)
**Cause** : Font par défaut (Helvetica, Arial) sans glyphes arabes.
**Solution** : Toujours utiliser `IBM Plex Sans Arabic` ou `Noto Sans Arabic` chargée via `@import url(...)` dans le HTML du PDF.

### ERR-PDF-002 — Lettres isolées (ز ا ج ن إ au lieu de إنجاز)
**Cause** : Canvas API ou `split('')` sur texte arabe — pas de text shaping.
**Solution** : Utiliser Puppeteer HTML→PDF exclusivement. Ne jamais utiliser `canvas.fillText()` pour de l'arabe.

### ERR-PDF-003 — Montant négatif inversé (5,000- au lieu de -5,000)
**Cause** : Bidi non géré — le `-` se déplace à droite en contexte RTL.
**Solution** : Wrapper systématique `<span dir="ltr" style="unicode-bidi:embed">` sur tous les montants, dates, codes.

### ERR-PDF-004 — Timeout Vercel (fonction > 10s ou mémoire dépassée)
**Cause** : Chromium complet trop lourd (~300MB) pour l'environnement serverless.
**Solution** : Remplacer `puppeteer` par `puppeteer-core` + `@sparticuz/chromium` (~50MB).

### ERR-PDF-005 — Font non chargée (rectangles ou font fallback)
**Cause** : `setContent()` sans attendre le chargement des fonts Google.
**Solution** : Toujours `{ waitUntil: 'networkidle0' }` dans `page.setContent()`.

### ERR-PDF-006 — Chromium introuvable en production
**Cause** : Path de Chromium différent entre local et serveur.
**Solution** : Spécifier `executablePath` explicitement en production via variable d'environnement `CHROMIUM_PATH`.

---

## Erreurs RTL Mobile — Projet Awaan (Production)

### ERR-RTL-001 — Layout LTR après forceRTL
**Cause** : `I18nManager.forceRTL` sans reload, ou couche React manquante.
**Solution** : 2 couches obligatoires — `forceRTL` + reload + `direction` explicite sur chaque `_layout.tsx`.

### ERR-RTL-002 — Mismatch RTL au démarrage
**Cause** : Langue persistée en storage ≠ `I18nManager.isRTL` actuel.
**Solution** : `checkRTLConsistency()` appelé au boot avant tout rendu.

### ERR-RTL-003 — Chevrons/flèches dans le mauvais sens
**Cause** : Import direct depuis `lucide-react-native` — `forceRTL` n'inverse pas les SVG.
**Solution** : Toujours importer depuis `@/lib/icons` (proxy avec swap automatique).

### ERR-RTL-004 — `textAlign: 'right'` casse en LTR
**Cause** : Valeur physique hardcodée.
**Solution** : `textAlign: 'auto'` — React Native infère la direction selon le contenu.

### ERR-RTL-005 — Double-navigateur depuis modal
**Cause** : `router.replace('/(tabs)/')` depuis un modal stack.
**Solution** : `navigateToTab()` centralisé — `dismissAll()` avant `navigate()`.

### ERR-RTL-006 — Animation slide backward en RTL
**Cause** : `slide_from_right` de React Navigation ne s'inverse pas automatiquement.
**Solution connue** : Limitation React Navigation — utiliser animations custom Reanimated.
