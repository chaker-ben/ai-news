# Tech Decisions

> ADR résumés. Ne jamais supprimer — marquer Superseded si remplacé.

## ADR-001: Architecture Hybride Next.js + Python
**Date** : 2026-03-22 | **Status** : Accepted
**Décision** : Utiliser Next.js pour le dashboard web/mobile et Python pour les workers de collecte/traitement.
**Raison** : Python est l'écosystème dominant pour le scraping, NLP et intégrations d'API IA (feedparser, tweepy, anthropic, playwright). Next.js offre un dashboard moderne avec SSR et une base pour l'app mobile Expo. Les deux communiquent via PostgreSQL partagé et API REST internes.

---

## ADR-002: UltraMsg pour les Notifications WhatsApp
**Date** : 2026-03-22 | **Status** : Accepted
**Décision** : Utiliser UltraMsg comme fournisseur WhatsApp API.
**Raison** : API REST simple, pas besoin de WhatsApp Business API officielle (plus complexe à configurer), coût raisonnable (~$10-30/mois), suffisant pour le volume prévu.

---

## ADR-003: Claude API pour les Résumés
**Date** : 2026-03-22 | **Status** : Accepted
**Décision** : Utiliser Claude API (Anthropic) pour la génération de résumés et l'analyse de pertinence.
**Raison** : Qualité de résumé supérieure, bon support du français, coût maîtrisé (~$5-20/mois pour le volume prévu).

---

## ADR-004: MVP Backend-First
**Date** : 2026-03-22 | **Status** : Accepted
**Décision** : Commencer par le backend Python (collecte + traitement + WhatsApp) avant le dashboard.
**Raison** : La valeur core du produit est la collecte et la notification automatique. Le dashboard est un "nice to have" en Phase 3. Permet de valider le produit rapidement.

---

## ADR-005: Langues UI — FR + EN
**Date** : 2026-03-22 | **Status** : Accepted
**Décision** : Interface en français et anglais uniquement (pas d'arabe/RTL pour ce projet).
**Raison** : Le contenu traité est EN→FR. Les utilisateurs cibles sont francophones et anglophones. Pas de besoin RTL identifié.

---

## ADR-006: Design Dark Tech
**Date** : 2026-03-22 | **Status** : Accepted
**Décision** : Design system dark tech avec electric blue comme couleur primaire.
**Raison** : Cohérent avec le positionnement tech/IA du produit. Confort visuel pour une utilisation quotidienne (dashboard de veille). Tendance 2025-2026.

---

## ADR-007: Airwallex pour les Paiements
**Date** : 2026-03-23 | **Status** : Accepted
**Décision** : Utiliser Airwallex comme processeur de paiement pour les abonnements (plans free/pro/team/enterprise).
**Raison** : Airwallex offre une API moderne pour les paiements internationaux avec support multi-devises, tarifs compétitifs, et un environnement demo/sandbox complet. L'intégration se fait via Payment Intents + webhooks pour la gestion du cycle de vie des abonnements. Permet de gérer checkout, facturation, et annulation sans dépendance à Stripe (indisponible dans certaines régions cibles).

---

## ADR-008: Notifications Multi-Canal (WhatsApp + Email + Telegram)
**Date** : 2026-03-23 | **Status** : Accepted
**Décision** : Supporter trois canaux de notification configurables par utilisateur : WhatsApp (UltraMsg), Email (Resend), et Telegram (Bot API).
**Raison** : Les utilisateurs ont des préférences variées de canal. WhatsApp est dominant au Moyen-Orient/Afrique, Email est universel pour les professionnels, Telegram est populaire dans la communauté tech. Chaque canal est optionnel et configurable dans les préférences utilisateur. L'architecture notifier est un pattern strategy avec une interface commune, facilitant l'ajout de futurs canaux (Slack, Discord, SMS).

---

## ADR-009: Suivi d'Articles par Utilisateur (Per-User Article Tracking)
**Date** : 2026-03-23 | **Status** : Accepted
**Décision** : Les articles sont collectés et traités globalement, mais le suivi (bookmarks, alertes, score minimum, lecture) est per-user via les modèles Bookmark, CustomAlert, et UserPreferences.
**Raison** : Permet de mutualiser le coût de collecte et traitement IA (un seul appel Claude par article) tout en offrant une expérience personnalisée. Les bookmarks et alertes custom sont liés au user via Clerk ID. Le min_score_alert est configurable par utilisateur (défaut 7.0). Les catégories et sources suivies sont également per-user via les tables de jointure UserCategory et UserSource.

---

## ADR-010: Traitement Partagé avec Routage Per-User
**Date** : 2026-03-23 | **Status** : Accepted
**Décision** : Le pipeline de traitement (collecte RSS/Twitter/YouTube/Reddit/ArXiv, traduction DeepL, résumé Claude, scoring) est exécuté globalement par les workers Python. Le routage des notifications vers les utilisateurs est effectué par le scheduler en fonction des préférences de chaque utilisateur.
**Raison** : Architecture cost-efficient : un article n'est traité qu'une seule fois par le pipeline IA (traduction + résumé + score en un seul appel Claude). Le scheduler interroge ensuite les préférences de chaque utilisateur (catégories, sources, score minimum, canaux) pour router les articles pertinents vers les bons canaux. Cela évite de dupliquer les appels API coûteux (Claude, DeepL) par utilisateur.

---

## ADR-011: Digest Dispatcher Timezone-Aware
**Date** : 2026-03-23 | **Status** : Accepted
**Décision** : Le scheduler de digests (quotidien et hebdomadaire) prend en compte le fuseau horaire de chaque utilisateur, stocké dans UserPreferences.timezone (défaut: Europe/Paris).
**Raison** : Les utilisateurs sont répartis sur plusieurs fuseaux horaires (Europe, Moyen-Orient, Amérique du Nord). Un digest envoyé à 08:00 UTC serait reçu à 11:00 à Riyad ou 03:00 à New York. Le champ digest_time (HH:mm) est interprété dans le timezone de l'utilisateur. Le scheduler APScheduler utilise un job qui tourne chaque minute et vérifie quels utilisateurs doivent recevoir leur digest à cet instant dans leur timezone local. Cela garantit que chaque utilisateur reçoit son digest à l'heure configurée dans son fuseau.

---
*Ajouter les nouvelles décisions ci-dessous.*
