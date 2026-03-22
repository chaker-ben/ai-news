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
*Ajouter les nouvelles décisions ci-dessous.*
