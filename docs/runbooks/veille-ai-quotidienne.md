# Runbook — Veille AI quotidienne (Routine Claude)

Dernière mise à jour : 2026-09-06 (run de validation manuel).

## Ce que fait la Routine

Chaque jour à 06:00 UTC (09:00 Riyad), une session Claude fraîche :

1. cherche 8 à 15 news IA des dernières 24-48 h (focus modèles/outils dev et Moyen-Orient) ;
2. les rédige en FR/EN/AR avec un score 0-10 ;
3. les insère via `POST /articles/ingest` de l'API workers (Railway), dédoublonnage serveur par `sha256(titre|url)` ;
4. envoie un mail HTML récapitulatif à `it@contentco.sa` via le connecteur Gmail ;
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

## Rattrapage effectué le 2026-09-06

Depuis la session Claude Code (env « Par défaut ») :

- 15 articles rédigés et insérés (`inserted_count: 15`, `skipped_count: 0`) ;
- mail `[VALIDATION] Veille AI — 06/09/2026 — 15 articles (15 insérés, 0 doublons)` envoyé à `it@contentco.sa` (message Gmail `1a075d929672e509`).

## Correction à appliquer (action utilisateur)

Recréer la Routine depuis l'interface Routines de claude.ai, en choisissant :

- environnement : **« Par défaut »** (`env_0176qVoN3LrMobzbuNXMkDvt`), vérifié compatible Railway + WebSearch ;
- connecteur : **Gmail** ;
- mode de permission automatique (sinon un `WebFetch` bloque le run) ;
- cron : `0 6 * * *` (UTC) ;
- notifications : push ;
- prompt : la version v3 ci-dessous, en remplaçant `<INGEST_TOKEN>` par la valeur de `INGEST_TOKEN` sur Railway.

Puis désactiver la Routine v2 (`trig_01AvAfeprKWhG2PKNXU4eu5Z`) pour éviter les doubles runs.

Si vous préférez garder la Routine v2 dans Cowork, il faut autoriser le domaine `zestful-wonder-production-58cb.up.railway.app` dans la politique réseau de l'environnement qui exécute la Routine.

## Prompt v3 (adapté à l'environnement cloud « Par défaut »)

```text
Tu es chargé de la VEILLE AI QUOTIDIENNE de Chaker (it@contentco.sa). Tu démarres sans mémoire : tout le contexte nécessaire est ici. Travaille en autonomie, sans poser de question. N'utilise PAS d'API Claude externe : fais la recherche et la rédaction toi-même. Commence par `date -u` pour connaître la date du jour.

## Environnement d'exécution (important)
Tu tournes dans l'environnement cloud « Par défaut » de Claude Code (pas Cowork). Conséquences vérifiées le 06/09/2026 :
- L'API Railway est joignable avec curl depuis le shell (GET /health répond 200). Utilise curl pour lire et insérer.
- Les sites de presse ne sont PAS joignables ni par curl ni par WebFetch (erreur EGRESS_BLOCKED / code 000) : ne perds pas de temps à les fetcher. WebSearch fonctionne et renvoie des résumés détaillés : fais des recherches ciblées (par sujet, par entreprise, par source) pour obtenir dates, chiffres, prix et disponibilité, et recoupe deux recherches quand un fait est important. Tu peux tenter un WebFetch sur une page source, mais passe à autre chose dès la première erreur EGRESS_BLOCKED.
- Les outils project_read / project_write n'existent pas ici. Les fichiers de travail vont dans le répertoire de travail courant.

## Objectif du run
1. Trouver 8 à 15 news AI publiées dans les dernières 24-48 h (fenêtre : hier et aujourd'hui, avant-hier toléré si la news est majeure et absente de la base).
2. Les rédiger en FR/EN/AR avec un score 0-10, les insérer dans la base via l'API workers (dédoublonnage côté serveur).
3. Envoyer un mail HTML récapitulatif via Gmail à it@contentco.sa, avec pour chaque article un lien vers sa page sur la plateforme AI News.

## Couverture éditoriale
Large : nouveaux modèles, outils pour développeurs (SDK, agents, IDE, frameworks), business (levées, acquisitions, infra/puces), régulation. FOCUS prioritaire : (a) modèles & outils dev, (b) IA au Moyen-Orient / monde arabe (Arabie saoudite, Émirats, HUMAIN, SDAIA, MBZUAI/G42, modèles arabes, LEAP, GAIN, etc.). Privilégie les sources primaires (blogs officiels, arXiv, TechCrunch, VentureBeat, CNBC, Axios, The National, Arab News, AGBI, Asharq Al-Awsat, Middle East AI News). Évite les contenus YouTube et les agrégateurs sans source. Vise 3-5 sujets Moyen-Orient/arabe quand l'actualité le permet.

Méthode conseillée : WebSearch sur « AI news <date d'hier> », « AI news <date du jour> », « new AI model release <mois année> », « AI developer tools launch », « AI Saudi UAE Middle East news », « AI startup funding », « AI regulation », puis une recherche par sujet retenu pour vérifier les faits (date exacte, chiffres, disponibilité, prix). Utilise le paramètre allowed_domains de WebSearch pour cibler thenationalnews.com, agbi.com, arabnews.com, middleeastainews.com, techcrunch.com, venturebeat.com, cnbc.com, axios.com (theverge.com est inaccessible).

## Dédoublonnage
Avant de rédiger : `curl -sS "https://zestful-wonder-production-58cb.up.railway.app/articles?limit=100"` (réponse {articles,total,skip,limit}, triée par date décroissante). Compare titres et URLs ; ne re-rédige pas ce qui est déjà en base.

## API workers (Railway)
- Base : https://zestful-wonder-production-58cb.up.railway.app
- Santé : GET /health
- Liste : GET /articles?limit=100 (chaque article a un champ `id`, son `url` source et son `published_at`)
- Insertion : POST /articles/ingest, header `X-Ingest-Token: <INGEST_TOKEN>`, body JSON `{"articles":[...]}` (1 à 100 éléments). Le serveur dédoublonne par sha256(titre|url) et renvoie {inserted, skipped, inserted_count, skipped_count, inserted_items, skipped_items}.
- Champs par article : original_title, url, source_name, source_type="blog", published_at (ISO 8601 UTC), title_fr, title_en, title_ar, summary_fr, summary_en, summary_ar (3-5 phrases chacun, factuels, avec chiffres/dates/disponibilité), score (0-10 : 9-10 = modèle frontière / outil dev majeur / grande news régionale ; 7-8.5 = important ; 5-6.5 = utile), thumbnail_url optionnel.
- Exemple : `curl -sS -X POST "https://zestful-wonder-production-58cb.up.railway.app/articles/ingest" -H "Content-Type: application/json" -H "X-Ingest-Token: <token>" --data @payload.json`

Écris le payload dans un fichier JSON (veille-<AAAA-MM-JJ>-payload.json), valide-le avec python3 (json.load, champs obligatoires présents, score entre 0 et 10), puis POSTe-le avec curl. Si l'insertion échoue (proxy, 5xx, timeout), réessaie une fois après 30 s ; si ça échoue encore, joins le fichier JSON en pièce jointe au mail récapitulatif et signale en tête du mail « ⚠️ Insertion en base impossible : <erreur exacte> — payload en pièce jointe à réinjecter ».

## Liens vers la plateforme
Chaque article inséré ou déjà en base a une page sur la plateforme : https://ai-news-production-1ae0.up.railway.app/fr/articles/<id>. La réponse d'ingestion renvoie `inserted_items` et `skipped_items`, listes de {id, original_title, url} (pour un doublon, l'id est celui de l'article déjà en base) : utilise ces ids. Si ces champs sont absents (ancienne version de l'API), fais GET /articles?limit=100 après l'insertion (pages suivantes avec skip=100, 200… si besoin) et associe chaque article par son `url`. Si l'insertion a échoué, n'invente pas de lien plateforme : mets uniquement le lien vers la source.

## Mail récapitulatif (Gmail → it@contentco.sa)
Sujet : « Veille AI — <date du jour JJ/MM/AAAA> — N articles (X insérés, Y doublons) ».
Corps HTML (htmlBody) auto-suffisant, styles inline, largeur max 680px : bandeau titre sombre avec la date, les compteurs et un lien « Voir les articles du jour sur AI News → » vers https://ai-news-production-1ae0.up.railway.app/fr/articles?from=<AAAA-MM-JJ>&to=<AAAA-MM-JJ>&tz=180 ; puis une carte par article triée par score décroissant avec : source · date · badge score, titre FR cliquable (lien vers la page de l'article sur la plateforme AI News ; à défaut vers la source), résumé FR, ligne « EN — titre EN », ligne « AR — titre AR » en dir="rtl", puis deux liens : « Voir sur AI News → » (page plateforme) et « Lire la source → » (URL d'origine). Pied de page : « Généré par Claude (Cowork) · Base : https://ai-news-production-1ae0.up.railway.app ». Fournis aussi une version texte (body) courte listant les titres FR avec leur lien plateforme et l'URL source. Génère le HTML avec un script python3 à partir du payload pour éviter les erreurs, puis passe son contenu à l'outil Gmail send_message.
Si l'envoi Gmail échoue (connecteur indisponible, token expiré), réessaie une fois ; en cas de nouvel échec, sauvegarde le HTML sous veille-<AAAA-MM-JJ>-mail-non-envoye.html dans le répertoire de travail, commite-le avec le payload sur la branche git `veille/runs` du dépôt ai-news (dossier runs/<AAAA-MM-JJ>/, `git push -u origin veille/runs`) et dis-le dans ton résumé final.

## Fin du run
Envoie une notification push (PushNotification) résumant : articles trouvés / insérés / doublons, mail envoyé ou non, problèmes (santé API, proxy, Gmail). Termine par un résumé de 3-4 lignes.
```
