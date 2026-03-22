# 📰 AI News — Spécification du Projet

> Application de veille intelligente en IA avec notifications WhatsApp automatisées

---

## 1. Vue d'ensemble

**Nom du projet** : AI News  
**Objectif** : Agréger automatiquement les dernières actualités en intelligence artificielle depuis plusieurs sources (blogs, réseaux sociaux, vidéos), les traduire et résumer en français, puis envoyer des notifications ciblées via WhatsApp (API UltraMsg).

---

## 2. Fonctionnalités principales

### 2.1 Collecte des sources (Scraping & Aggregation)

| Source | Type | Méthode d'accès |
|---|---|---|
| Blogs IA (Hugging Face, OpenAI, Google AI, etc.) | RSS / Web | RSS Feed / Web Scraping |
| Twitter / X | Réseau social | Twitter API v2 (Bearer Token) |
| TikTok | Vidéo courte | TikTok API ou scraping public |
| YouTube | Vidéo | YouTube Data API v3 |
| Reddit (r/artificial, r/MachineLearning) | Forum | Reddit API (PRAW) |
| LinkedIn | Réseau pro | RSS ou scraping |
| Arxiv / Papers With Code | Publications | Arxiv API |

**Critères de filtrage :**
- Mots-clés : `AI`, `LLM`, `GPT`, `Gemini`, `Claude`, `AGI`, `machine learning`, `deep learning`, etc.
- Fraîcheur : articles publiés dans les dernières 24h
- Score de pertinence minimum configurable

---

### 2.2 Traitement & Résumé

- **Traduction** : Contenu anglais → Français (via DeepL API ou Google Translate API)
- **Résumé automatique** : Utilisation d'un LLM (Claude API / OpenAI) pour générer des résumés concis (3 à 5 phrases)
- **Scoring de priorité** : Chaque article reçoit un score basé sur l'engagement, la source, et la fraîcheur
- **Déduplication** : Détection et suppression des doublons via hash de contenu

**Format de résumé standardisé :**
```
🤖 [TITRE EN FRANÇAIS]
📌 Source : [Nom de la source] | [Date]
📝 Résumé : [3-5 phrases en français]
🔗 Lien : [URL originale]
⭐ Score : [1-10]
```

---

### 2.3 Notifications WhatsApp (UltraMsg API)

**Fournisseur** : [UltraMsg](https://ultramsg.com)  
**Endpoint de base** : `https://api.ultramsg.com/{instance_id}/messages/chat`

#### Configuration UltraMsg

```env
ULTRAMSG_INSTANCE_ID=votre_instance_id
ULTRAMSG_TOKEN=votre_token
WHATSAPP_NUMBER=+21XXXXXXXXX   # Numéro destinataire avec indicatif
```

#### Modes d'envoi

| Mode | Déclenchement | Contenu |
|---|---|---|
| **Digest quotidien** | Chaque jour à 8h00 | Top 5 articles du jour |
| **Breaking news** | Temps réel (score ≥ 9) | Alerte immédiate sur une actu majeure |
| **Résumé hebdomadaire** | Chaque lundi 9h00 | Top 10 de la semaine |

#### Exemple de payload UltraMsg

```json
{
  "token": "{{ULTRAMSG_TOKEN}}",
  "to": "+21XXXXXXXXX",
  "body": "🤖 *AI News — Digest du jour*\n\n1️⃣ *GPT-5 dévoilé par OpenAI*\n📝 OpenAI a annoncé...\n🔗 https://openai.com/...\n\n2️⃣ ..."
}
```

---

## 3. Architecture technique

```
┌─────────────────────────────────────────────────────┐
│                     SCHEDULER                       │
│          (Cron Jobs — toutes les heures)            │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │    COLLECTOR MODULE     │
          │  RSS / APIs / Scraper   │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │   PROCESSING MODULE     │
          │  Traduction + Résumé    │
          │  Déduplication + Score  │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │      DATABASE           │
          │   SQLite / PostgreSQL   │
          │  (articles, statuts)    │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │   NOTIFICATION MODULE   │
          │   UltraMsg WhatsApp API │
          └─────────────────────────┘
```

---

## 4. Stack technologique recommandée

### Backend
- **Langage** : Python 3.11+
- **Framework** : FastAPI (API REST interne)
- **Scheduler** : APScheduler ou Celery + Redis
- **ORM** : SQLAlchemy + Alembic (migrations)
- **Base de données** : PostgreSQL (prod) / SQLite (dev)

### Collecte
- `feedparser` — parsing RSS
- `httpx` / `requests` — appels HTTP
- `playwright` ou `selenium` — scraping JS-rendered pages
- `tweepy` — Twitter API
- `google-api-python-client` — YouTube API

### IA & NLP
- `anthropic` (Claude API) — résumés et analyse
- `deepl` ou `googletrans` — traduction
- `langchain` (optionnel) — orchestration de pipelines IA

### Notifications
- `httpx` — appels UltraMsg API REST

### Dashboard (optionnel)
- **Framework** : Next.js / React ou Streamlit
- Visualisation des articles collectés, historique, configuration des alertes

---

## 5. Structure du projet

```
ai-news/
├── src/
│   ├── collectors/
│   │   ├── rss_collector.py
│   │   ├── twitter_collector.py
│   │   ├── youtube_collector.py
│   │   ├── tiktok_collector.py
│   │   └── reddit_collector.py
│   ├── processors/
│   │   ├── translator.py
│   │   ├── summarizer.py
│   │   ├── deduplicator.py
│   │   └── scorer.py
│   ├── notifiers/
│   │   └── whatsapp.py          # UltraMsg integration
│   ├── models/
│   │   └── article.py           # SQLAlchemy models
│   ├── api/
│   │   └── routes.py            # FastAPI endpoints
│   ├── scheduler/
│   │   └── jobs.py              # Cron job definitions
│   └── config.py                # Configuration centralisée
├── tests/
│   ├── test_collectors.py
│   ├── test_processors.py
│   └── test_notifiers.py
├── dashboard/                   # Frontend optionnel
├── .env.example
├── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## 6. Modèle de données

### Table `articles`

| Colonne | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `source` | VARCHAR | Nom de la source |
| `source_type` | ENUM | blog / twitter / youtube / tiktok / reddit |
| `original_title` | TEXT | Titre original |
| `title_fr` | TEXT | Titre traduit en français |
| `original_content` | TEXT | Contenu original |
| `summary_fr` | TEXT | Résumé en français |
| `url` | TEXT | URL de l'article |
| `published_at` | TIMESTAMP | Date de publication |
| `collected_at` | TIMESTAMP | Date de collecte |
| `score` | FLOAT | Score de pertinence (0–10) |
| `notified` | BOOLEAN | Notification envoyée ? |
| `content_hash` | VARCHAR | Hash pour déduplication |

---

## 7. Configuration et variables d'environnement

```env
# IA & Traitement
ANTHROPIC_API_KEY=sk-ant-...
DEEPL_API_KEY=...

# Sources
TWITTER_BEARER_TOKEN=...
YOUTUBE_API_KEY=...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...

# UltraMsg WhatsApp
ULTRAMSG_INSTANCE_ID=instance12345
ULTRAMSG_TOKEN=your_token_here
WHATSAPP_RECIPIENT=+21XXXXXXXXX

# Base de données
DATABASE_URL=postgresql://user:pass@localhost:5432/ainews

# Scheduler
DIGEST_TIME=08:00          # Heure du digest quotidien
MIN_SCORE_ALERT=9.0        # Score minimum pour alerte immédiate
MAX_ARTICLES_DIGEST=5      # Nombre d'articles dans le digest
```

---

## 8. Endpoints API REST (FastAPI)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/articles` | Lister les articles collectés |
| `GET` | `/articles/{id}` | Détail d'un article |
| `POST` | `/collect/now` | Déclencher une collecte manuelle |
| `POST` | `/notify/digest` | Envoyer le digest manuellement |
| `GET` | `/sources` | Lister les sources configurées |
| `POST` | `/sources` | Ajouter une source |
| `PUT` | `/sources/{id}` | Modifier une source |
| `DELETE` | `/sources/{id}` | Supprimer une source |
| `GET` | `/stats` | Statistiques générales |

---

## 9. Plan de développement (Phases)

### Phase 1 — MVP (2 semaines)
- [x] Collecte RSS des blogs IA majeurs
- [x] Traduction + résumé via Claude API
- [x] Intégration UltraMsg (envoi WhatsApp)
- [x] Digest quotidien automatique (cron)

### Phase 2 — Sources enrichies (2 semaines)
- [ ] Intégration Twitter/X API
- [ ] Intégration YouTube API
- [ ] Intégration Reddit API
- [ ] Système de scoring amélioré

### Phase 3 — Dashboard & Personnalisation (2 semaines)
- [ ] Interface web de gestion (Next.js ou Streamlit)
- [ ] Configuration des alertes via UI
- [ ] Historique et recherche d'articles
- [ ] Statistiques de collecte

### Phase 4 — Avancé (optionnel)
- [ ] TikTok scraping
- [ ] Multi-utilisateurs / multi-numéros WhatsApp
- [ ] Résumés audio (Text-to-Speech → WhatsApp vocal)
- [ ] Clustering thématique des articles

---

## 10. Considérations importantes

### Limites des APIs
- **Twitter/X** : L'API gratuite est très limitée (lecture restreinte). Envisager un abonnement Basic ($100/mois) ou scraping via Nitter.
- **TikTok** : Pas d'API officielle de lecture de contenu public disponible facilement — scraping instable.
- **UltraMsg** : Vérifier les limites de messages par jour selon votre plan.

### Légalité & Éthique
- Respecter les CGU des plateformes scrapées
- Ne pas dépasser les rate limits des APIs
- Ajouter un délai entre les requêtes de scraping
- Citer toujours la source originale dans les notifications

### Coûts estimés (mensuel)
| Service | Coût estimé |
|---|---|
| Claude API (résumés) | ~$5–20 |
| DeepL API | ~$0–25 (gratuit jusqu'à 500k chars) |
| UltraMsg | ~$10–30 selon plan |
| Hébergement (VPS) | ~$5–10 |
| Twitter API Basic | $100 (optionnel) |

---

## 11. Exemple de notification WhatsApp

```
🤖 *AI NEWS — Digest du 22 mars 2026*

━━━━━━━━━━━━━━━━━━

1️⃣ *OpenAI dévoile GPT-5*
📌 Blog OpenAI | 22 mars 2026
📝 OpenAI a officiellement présenté GPT-5, son nouveau modèle de langage. 
   Ce modèle offre des capacités de raisonnement nettement supérieures à 
   son prédécesseur et supporte désormais des contextes de 2 millions de tokens.
🔗 https://openai.com/blog/gpt-5
⭐ 9.8/10

━━━━━━━━━━━━━━━━━━

2️⃣ *Google Gemini Ultra 2 bat tous les benchmarks*
📌 Google AI Blog | 21 mars 2026
📝 Le nouveau modèle de Google établit de nouveaux records sur les tests 
   MMLU et HumanEval, surpassant tous les modèles existants en mathématiques.
🔗 https://ai.google/research/...
⭐ 9.1/10

━━━━━━━━━━━━━━━━━━

_Prochain digest demain à 08h00_ ✅
```

---

*Document généré le 22 mars 2026 — Projet AI News v1.0*
