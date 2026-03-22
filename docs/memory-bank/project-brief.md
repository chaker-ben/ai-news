# Project Brief

> Vue d'ensemble du projet. Rarement modifié après initialisation.

## Nom
AI News

## Description
Application de veille intelligente en IA. Agrège automatiquement les actualités IA depuis plusieurs sources (blogs, réseaux sociaux, vidéos, publications), les traduit et résume en français, puis envoie des notifications ciblées via WhatsApp (UltraMsg API). Dashboard web pour la gestion et le suivi.

## Brand DNA

### Purpose
"Le monde serait légèrement pire si ce produit disparaissait parce que les professionnels et passionnés d'IA rateraient des avancées majeures noyées dans le bruit d'information quotidien."

### Values
1. **Signal > Bruit** — On filtre 95% du contenu pour ne livrer que ce qui compte vraiment
2. **Fraîcheur garantie** — L'info arrive dans les 24h, jamais de contenu périmé
3. **Zéro effort** — L'utilisateur ne cherche rien, l'info vient à lui au bon moment
4. **Sources fiables** — Chaque article est tracé, sourcé et vérifié

### Voice
| Dimension | On EST | On N'EST PAS |
|-----------|--------|--------------|
| Ton | Concis, factuel, technique | Sensationnaliste, clickbait |
| Humour | Références tech subtiles | Mèmes ou emojis excessifs |

### Enemy
"Nous combattons la surcharge informationnelle — passer 2h par jour à scroller Twitter/Reddit pour rater quand même les infos importantes."

### Promise
**Avant** : Tu scrolles 10 sources différentes, tu rates des annonces majeures, tu perds du temps.
**Après** : Tu reçois un digest WhatsApp à 8h, tu es à jour en 2 minutes.

### Brand Story
> "Nous existons parce que l'écosystème IA évolue si vite qu'aucun humain ne peut tout suivre. Nous croyons que l'IA devrait servir à suivre l'IA. Donc nous avons créé AI News pour livrer l'essentiel, traduit et résumé, directement sur WhatsApp."

## Objectifs Business
- Automatiser la veille IA quotidienne (0 effort manuel)
- Livrer des résumés en français de qualité professionnelle
- Couvrir toutes les sources majeures (blogs, social, vidéo, papers)
- Alerter en temps réel sur les annonces majeures (score >= 9)

## Utilisateurs Cibles
- **Professionnel IA** : Développeur, data scientist, chef de projet IA — besoin de veille sans y passer du temps
- **Passionné tech** : Curieux d'IA, veut rester informé sans effort
- **Décideur** : CTO, VP Engineering — besoin d'un résumé business des avancées IA

## User Journey

### 8 Étapes
1. **DÉCOUVERTE** → Bouche à oreille, partage d'un digest WhatsApp entre collègues
2. **LANDING** → Page web simple : "Reçois le meilleur de l'IA chaque matin sur WhatsApp"
3. **ONBOARDING** → Entrer son numéro WhatsApp + choisir ses sujets — compris en < 3s
4. **INSCRIPTION** → 1 champ (numéro WhatsApp) + sélection de topics (max 3 clics)
5. **AHA MOMENT** → Premier digest reçu à 8h le lendemain — "c'est exactement ce que je cherchais" (< 24h)
6. **USAGE RÉPÉTÉ** → Chaque matin, ouvrir le digest WhatsApp = rituel de 2 min
7. **PAIEMENT** → Freemium : gratuit = 1 digest/jour, payant = breaking news + hebdo + dashboard
8. **RECOMMANDATION** → Transfert du digest WhatsApp à un collègue (viral naturel)

### Hook Model
- **TRIGGER** : Notification WhatsApp à 8h (externe) → curiosité "quoi de neuf en IA ?" (interne)
- **ACTION** : Ouvrir et lire le digest (2 min)
- **REWARD** : Découvrir une info que personne au bureau ne connaît encore (variable : contenu change chaque jour)
- **INVESTMENT** : Historique d'articles lus, topics personnalisés, scores de pertinence affinés

### Aha Moment
**Premier digest WhatsApp reçu** — l'utilisateur voit 5 articles IA résumés en français, bien formatés, avec scores. Il comprend la valeur en < 30 secondes.

## Identité Visuelle

- **Style** : Dark tech
- **Couleurs** : Voir `tokens/base.css`
  - Primary : Electric blue (#3B82F6 → #60A5FA)
  - Secondary : Cool gray (#1E293B → #334155)
  - Accent : Cyan (#06B6D4)
  - Background : Near-black (#0A0F1C → #0F172A)
  - Surface : Dark slate (#1E293B)
  - Text : White/gray (#F8FAFC → #94A3B8)
  - Success : Green (#10B981)
  - Warning : Amber (#F59E0B)
  - Error : Red (#EF4444)
- **Typographie** : Inter (UI) + JetBrains Mono (code/données)
- **Logo** : À générer — icône de signal/radar + "AI" stylisé

## Stack Technique
- **Dashboard** : Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4, shadcn/ui
- **Workers** : Python 3.11+, FastAPI (API interne), APScheduler
- **Mobile** : React Native / Expo 52
- **Base de données** : PostgreSQL + Prisma (dashboard) + SQLAlchemy (workers)
- **Auth** : Clerk
- **Notifications** : UltraMsg (WhatsApp API)
- **IA** : Claude API (résumés), DeepL (traduction)
- **Langues UI** : Français, Anglais
- **Monorepo** : pnpm workspaces + Turborepo

## Liens
- Repo : À configurer
- Staging : À configurer
- Production : À configurer
