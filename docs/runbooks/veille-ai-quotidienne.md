# Runbook — Veille AI quotidienne (Routine Claude)

Dernière mise à jour : 2026-09-06 (run de validation manuel).

## Ce que fait la Routine

Chaque jour à 06:00 UTC (09:00 Riyad), une session Claude fraîche :

1. cherche 8 à 15 news IA des dernières 24-48 h (focus modèles/outils dev et Moyen-Orient) ;
2. les rédige en FR/EN/AR avec un score 0-10 ;
3. les insère via `POST /articles/ingest` de l'API workers (Railway), dédoublonnage serveur par `sha256(titre|url)` ;
4. déclenche `POST /notify/veille` : un mail récapitulatif par utilisateur de la plateforme, dans sa langue (FR/EN/AR), plus `it@contentco.sa` ;
5. envoie une notification push et un résumé.

Le token d'ingestion est la variable `INGEST_TOKEN` du service workers sur Railway. Il ne doit jamais être commité dans ce dépôt.

## Incident du 2026-09-06 et diagnostic

Le run planifié de 07:57 UTC a échoué sur deux étapes : insertion en base (Railway injoignable) et envoi du mail.

| Constat | Détail |
| --- | --- |
| Environnement des runs | Les sessions de la Routine (v2, `trig_01AvAfeprKWhG2PKNXU4eu5Z`) tournent dans l'environnement Cowork distant (`env_0111…`), pas dans un environnement cloud de l'utilisateur. |
| Réseau Cowork | Ce environnement bloque `*.up.railway.app` (erreur `CONNECT tunnel failed, response 403`). |
| Réseau env cloud « Par défaut » (`env_0176qVoN3LrMobzbuNXMkDvt`) | Railway joignable (`GET /health` → 200, `POST /articles/ingest` OK). Les sites de presse sont bloqués (`EGRESS_BLOCKED`), mais `WebSearch` fonctionne et suffit pour la veille. Gmail fonctionne depuis une session ouverte par l'utilisateur. |
| Permissions | Le run manuel de 08:18 UTC s'est bloqué en attente d'approbation sur un `WebFetch` (statut `REQUIRES_ACTION`). La Routine v2 ne porte pas d'événement `set_permission_mode: auto`, contrairement à la Routine Upwork. |
| Routines créées par API | `create_trigger` ne peut pas attacher de connecteur (Gmail) dans cette organisation : une Routine créée ainsi ne peut pas envoyer de mail. La v3 créée le 06/09 (`trig_01YS2tzTz3JiwjKJFNZrLLjH`) a donc été désactivée. |

## Évolutions du 2026-09-06 (code)

- `POST /articles/ingest` renvoie désormais `inserted_items` et `skipped_items` (`{id, original_title, url}`) pour construire les liens plateforme `https://ai-news-production-1ae0.up.railway.app/<locale>/articles/<id>`.
- `GET /articles` accepte `date_from`, `date_to` (dates locales inclusives `YYYY-MM-DD`), `tz_offset` (décalage UTC du lecteur en minutes, 180 pour Riyad) et `sort=score|date`.
- Page `/articles` de l'app web : filtre par jour (Aujourd'hui, Hier, 7 derniers jours, date libre) porté par l'URL (`?from=&to=&tz=`), résolu côté serveur pour renvoyer toute la journée. Exemple : `/fr/articles?from=2026-09-06&to=2026-09-06&tz=180`.

## Mail par utilisateur, dans sa langue (`POST /notify/veille`)

Depuis le 06/09, le mail récapitulatif n'est plus composé par la Routine : elle appelle `POST /notify/veille` (header `X-Ingest-Token`) avec les ids des articles du jour, et le serveur envoie **un mail par destinataire dans sa langue** (`user_preferences.language` : fr / en / ar, arabe en RTL), avec liens `/<langue>/articles/<id>` vers la plateforme.

- Destinataires : utilisateurs avec `email_notifications` actif (abonnement absent, `active` ou `trialing`), plus `extra_recipients` optionnels (ex. `it@contentco.sa`, non dédoublonnés seulement s'ils ne sont pas déjà utilisateurs).
- Corps : `{"article_ids": [...], "inserted_count": n, "skipped_count": n, "day": "AAAA-MM-JJ", "extra_recipients": [{"email": "...", "language": "fr"}], "dry_run": false}`. `dry_run: true` renvoie la répartition par langue sans envoyer.
- Réponse : `{status, articles, recipients, by_language, sent, failed, missing_article_ids}`. Journalisé dans `notification_logs` (type `email_veille`) et `user_notification_status` (canal `email`).
- Réglage : `WEB_BASE_URL` (défaut `https://ai-news-production-1ae0.up.railway.app`), `RESEND_API_KEY`, `EMAIL_FROM` sur le service workers.
- `POST /notify/email` (HTML libre, un seul destinataire) reste disponible pour des envois ponctuels.

## Rattrapage effectué le 2026-09-06

Depuis la session Claude Code (env « Par défaut ») :

- 15 articles rédigés et insérés (`inserted_count: 15`, `skipped_count: 0`) ;
- mail `[VALIDATION] Veille AI — 06/09/2026 — 15 articles (15 insérés, 0 doublons)` envoyé à `it@contentco.sa` (message Gmail `1a075d929672e509`).

## État des Routines depuis le 2026-09-06

| Routine | État | Environnement | E-mail |
| --- | --- | --- | --- |
| v2 `trig_01AvAfeprKWhG2PKNXU4eu5Z` | **désactivée** (Railway bloqué par le réseau Cowork) | Cowork distant | connecteur Gmail |
| v3 `trig_01YS2tzTz3JiwjKJFNZrLLjH` | **active**, cron `0 6 * * *` UTC | « Par défaut » (`env_0176qVoN3LrMobzbuNXMkDvt`) | `POST /notify/veille` (un mail par utilisateur dans sa langue, Resend côté workers) |

Une Routine créée par API ne peut pas porter le connecteur Gmail dans cette organisation : la v3 envoie donc le mail via l'API workers, qui relaie vers Resend.

**Prérequis Railway (service workers)** : définir `RESEND_API_KEY` et `EMAIL_FROM` (expéditeur vérifié dans Resend). Sans `RESEND_API_KEY`, `/notify/email` répond 503 : la Routine ne peut alors rien persister d'autre (l'environnement « Par défaut » n'a ni connecteur ni dépôt git), elle le signale dans la notification push et liste les articles avec leurs liens plateforme dans son résumé de session. Les articles restent insérés en base et consultables via le filtre « Aujourd'hui ».

**Run de validation v3 du 2026-09-06 (08:58-09:14 UTC, session `cse_01X2FJEk2Tsy8r7HAqjfe9Wu`)** : mode de permission automatique, aucun blocage ; 5 articles insérés (dont G42/Bloomberg, IPO Anthropic/CNBC, data centers Moyen-Orient/Bloomberg) ; e-mail non envoyé (503, `RESEND_API_KEY` absente). Le dédoublonnage par `sha256(titre|url)` laisse passer une même annonce reprise par un autre média (ex. HUMAIN Horizon Ultra via Qualcomm puis Digital Trends) ; le prompt demande désormais un contrôle par sujet.

Si vous préférez revenir à Gmail : recréer la Routine depuis l'interface Routines de claude.ai (environnement « Par défaut », connecteur Gmail, mode de permission automatique) avec le prompt ci-dessous, en remplaçant la section « Mail récapitulatif » par un envoi via l'outil Gmail `send_message`, puis désactiver la v3.

## Prompt v3 (Routine active, environnement « Par défaut », e-mail via /notify/veille)

```text
Tu es chargé de la VEILLE AI QUOTIDIENNE de Chaker (it@contentco.sa). Tu démarres sans mémoire : tout le contexte nécessaire est ici. Travaille en autonomie, sans poser de question. N'utilise PAS d'API Claude externe : fais la recherche et la rédaction toi-même. Commence par `date -u` pour connaître la date du jour.

## Environnement d'exécution (important)
Tu tournes dans l'environnement cloud « Par défaut » de Claude Code (pas Cowork), sans connecteur Gmail et sans dépôt git. Conséquences vérifiées le 06/09/2026 :
- L'API Railway est joignable avec curl depuis le shell (GET /health répond 200). Utilise curl pour lire, insérer et déclencher l'envoi du mail.
- Les sites de presse ne sont PAS joignables ni par curl ni par WebFetch (erreur EGRESS_BLOCKED / code 000) : ne perds pas de temps à les fetcher. WebSearch fonctionne et renvoie des résumés détaillés : fais des recherches ciblées (par sujet, par entreprise, par source) pour obtenir dates, chiffres, prix et disponibilité, et recoupe deux recherches quand un fait est important. Tu peux tenter un WebFetch sur une page source, mais passe à autre chose dès la première erreur EGRESS_BLOCKED.
- Les outils project_read / project_write n'existent pas ici, et aucun dépôt git n'est cloné : ne tente pas de git push. Les fichiers de travail vont dans le répertoire de travail courant et disparaissent à la fin du run ; seuls la base Railway, les mails et ton résumé final persistent.

## Objectif du run
1. Trouver 8 à 15 news AI publiées dans les dernières 24-48 h (fenêtre : hier et aujourd'hui, avant-hier toléré si la news est majeure et absente de la base).
2. Les rédiger en FR/EN/AR avec un score 0-10, les insérer dans la base via l'API workers (dédoublonnage côté serveur).
3. Déclencher l'envoi du mail récapitulatif via POST /notify/veille : le serveur envoie un mail à chaque utilisateur de la plateforme dans sa langue (FR/EN/AR), avec les liens vers les articles sur la plateforme. Tu ne composes aucun HTML toi-même.

## Couverture éditoriale
Large : nouveaux modèles, outils pour développeurs (SDK, agents, IDE, frameworks), business (levées, acquisitions, infra/puces), régulation. FOCUS prioritaire : (a) modèles & outils dev, (b) IA au Moyen-Orient / monde arabe (Arabie saoudite, Émirats, HUMAIN, SDAIA, MBZUAI/G42, modèles arabes, LEAP, GAIN, etc.). Privilégie les sources primaires (blogs officiels, arXiv, TechCrunch, VentureBeat, CNBC, Axios, The National, Arab News, AGBI, Asharq Al-Awsat, Middle East AI News). Évite les contenus YouTube et les agrégateurs sans source. Vise 3-5 sujets Moyen-Orient/arabe quand l'actualité le permet.

Méthode conseillée : WebSearch sur « AI news <date d'hier> », « AI news <date du jour> », « new AI model release <mois année> », « AI developer tools launch », « AI Saudi UAE Middle East news », « AI startup funding », « AI regulation », puis une recherche par sujet retenu pour vérifier les faits (date exacte, chiffres, disponibilité, prix). Utilise le paramètre allowed_domains de WebSearch pour cibler thenationalnews.com, agbi.com, arabnews.com, middleeastainews.com, techcrunch.com, venturebeat.com, cnbc.com, axios.com (theverge.com est inaccessible).

## Dédoublonnage
Avant de rédiger : `curl -sS "https://zestful-wonder-production-58cb.up.railway.app/articles?limit=100&sort=date"` (réponse {articles,total,skip,limit}). Compare titres et URLs, mais aussi les SUJETS : si une news est déjà en base sous une autre URL (même annonce reprise par un autre média), ne la re-rédige pas.

## API workers (Railway)
- Base : https://zestful-wonder-production-58cb.up.railway.app
- Santé : GET /health
- Liste : GET /articles?limit=100&sort=date (chaque article a un champ `id`, son `url` source et son `published_at`)
- Insertion : POST /articles/ingest, header `X-Ingest-Token: <INGEST_TOKEN>`, body JSON `{"articles":[...]}` (1 à 100 éléments). Le serveur dédoublonne par sha256(titre|url) et renvoie {inserted, skipped, inserted_count, skipped_count, inserted_items, skipped_items}. `inserted_items` et `skipped_items` sont des listes de {id, original_title, url} : l'`id` est l'identifiant de l'article sur la plateforme (pour un doublon, l'id de l'article déjà en base).
- Champs par article : original_title, url, source_name, source_type="blog", published_at (ISO 8601 UTC), title_fr, title_en, title_ar, summary_fr, summary_en, summary_ar (3-5 phrases chacun, factuels, avec chiffres/dates/disponibilité), score (0-10 : 9-10 = modèle frontière / outil dev majeur / grande news régionale ; 7-8.5 = important ; 5-6.5 = utile), thumbnail_url optionnel. Les trois langues sont OBLIGATOIRES et de même qualité : chaque utilisateur reçoit le mail dans sa langue.
- Exemple : `curl -sS -X POST "https://zestful-wonder-production-58cb.up.railway.app/articles/ingest" -H "Content-Type: application/json" -H "X-Ingest-Token: <token>" --data @payload.json`
- Mail récapitulatif : POST /notify/veille, même header `X-Ingest-Token`, body JSON `{"article_ids":[...],"inserted_count":N,"skipped_count":M,"day":"AAAA-MM-JJ","extra_recipients":[{"email":"it@contentco.sa","language":"fr"}]}`. Réponse 200 {status, articles, recipients, by_language, sent, failed, missing_article_ids} ; 503 = Resend non configuré ; 404 = aucun id connu.

Écris le payload dans un fichier JSON (veille-<AAAA-MM-JJ>-payload.json), valide-le avec python3 (json.load, champs obligatoires présents, score entre 0 et 10, les trois langues remplies), puis POSTe-le avec curl. Si l'insertion échoue (proxy, 5xx, timeout), réessaie une fois après 30 s ; si ça échoue encore, reproduis le payload JSON complet dans ton résumé final pour réinjection manuelle et n'appelle pas /notify/veille.

## Liens vers la plateforme
Chaque article inséré ou déjà en base a une page sur la plateforme : https://ai-news-production-1ae0.up.railway.app/fr/articles/<id>. Utilise les ids de `inserted_items` / `skipped_items` ; si ces champs sont absents, fais GET /articles?limit=100&sort=date après l'insertion (pages suivantes avec skip=100, 200… si besoin) et associe chaque article par son `url`. Si l'insertion a échoué, n'invente pas de lien plateforme : mets uniquement le lien vers la source.

## Envoi du mail (POST /notify/veille)
Après l'insertion, rassemble les ids de `inserted_items` et de `skipped_items` (les doublons du jour font aussi partie de la veille du jour), écris le corps JSON avec python3 (json.dumps) dans mail.json, puis : `curl -sS -X POST "https://zestful-wonder-production-58cb.up.railway.app/notify/veille" -H "Content-Type: application/json" -H "X-Ingest-Token: <token>" --data @mail.json -w "\n%{http_code}"`. Le serveur rend le mail dans la langue de chaque utilisateur (fr/en/ar, arabe en RTL) avec, pour chaque article, un lien vers sa page https://ai-news-production-1ae0.up.railway.app/<langue>/articles/<id> et un lien vers la source. Note dans ton résumé la répartition `by_language`, les envois réussis et les échecs.
Si l'appel échoue (503, 502, timeout), réessaie une fois après 30 s. En cas de nouvel échec : les articles restent consultables sur la plateforme (https://ai-news-production-1ae0.up.railway.app/fr/articles?from=<AAAA-MM-JJ>&to=<AAAA-MM-JJ>&tz=180), donc ne cherche pas à sauvegarder de HTML ; dis clairement dans la notification push et dans ton résumé final « mail non envoyé : <code HTTP et erreur> », et liste dans le résumé les titres FR avec leur lien plateforme.

## Fin du run
Envoie une notification push (PushNotification) résumant : articles trouvés / insérés / doublons, mails envoyés (nombre de destinataires et répartition par langue) ou échec (code HTTP), problèmes (santé API, proxy, e-mail). Termine par un résumé de 3-4 lignes.
```
