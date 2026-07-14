#!/usr/bin/env python3
"""
Maestro — routeur UserPromptSubmit.

But : rendre Maestro "invisible mais omniprésent". Quand un dev tape un prompt
SANS avoir utilisé de commande/agent/skill Maestro, ce hook détecte l'intention
du prompt et injecte une courte suggestion (additionalContext) proposant le bon
point d'entrée Maestro.

Garanties :
- Non-bloquant : exit 0 systématiquement, même en cas d'erreur.
- Silencieux si le prompt utilise déjà Maestro (commande /... ou @m-...) ou si
  aucune intention claire n'est détectée.
- Ne répète jamais la même suggestion deux fois dans la même session.

Contrat Claude Code : entrée JSON sur stdin (champ `prompt`, `session_id`),
sortie JSON {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit",
"additionalContext": "..."}} sur exit 0.
"""
import json
import os
import sys
import unicodedata


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )


# (id, libellé, mots-clés [fr/en, sans accents], points d'entrée Maestro)
INTENTS = [
    ("kickstart", "démarrage d'un nouveau projet",
     ["nouveau projet", "new project", "from scratch", "scaffold", "boilerplate",
      "creer une app", "create app", "demarrer un projet", "initier le projet"],
     "/kickstart · skill m-project-kickstart"),
    ("brownfield", "reprise d'un projet existant",
     ["projet existant", "existing project", "legacy", "brownfield", "onboard",
      "reprendre le projet", "codebase existante", "migrer le projet"],
     "/audit · /map-codebase · skill m-brownfield-onboarding"),
    ("plan", "planification / specs / architecture",
     ["planifier", "architecture", "specs", "spec technique", "prd", "user stories",
      "concevoir", "design system", "db schema", "schema de base de donnees", "roadmap"],
     "/plan · agent @m-architect · skill m-specs-writing"),
    ("implement", "implémentation d'une fonctionnalité",
     ["implementer", "implement", "developper", "ajouter une fonctionnalite",
      "add feature", "build feature", "ecrire le code", "construire la feature"],
     "/implement (ou /run-pipeline) · agent @m-implementer"),
    ("test", "tests / TDD",
     ["tdd", "unit test", "tests unitaires", "ecrire des tests", "couverture de test",
      "code coverage", "test coverage"],
     "/test · agent @m-tester"),
    ("fix", "correction de bug",
     ["bug", "corriger", "erreur", "crash", "ne marche pas", "ne fonctionne pas",
      "plante", "stack trace", "exception"],
     "/fix · /bug-rethink"),
    ("review", "revue de code",
     ["code review", "revue de code", "relire le code", "relecture", "review the code"],
     "/review · agent @m-reviewer"),
    ("security", "sécurité",
     ["securite", "security", "vulnerabilite", "vulnerability", "faille",
      "authentification", "owasp", "injection sql", "secrets en dur"],
     "/security-audit · agent @m-security-auditor · skill m-supply-chain-guard"),
    ("performance", "performance",
     ["performance", "trop lent", "lent", "ralenti", "is slow", "optimiser", "optimize", "latence",
      "temps de chargement", "web vitals", "bottleneck"],
     "agent @m-performance-auditor"),
    ("deploy", "déploiement / mise en production",
     ["deployer", "deploy", "ship it", "release", "mettre en production", "en prod",
      "go live", "livraison"],
     "/deploy-check · /ship"),
    ("commit", "commit",
     ["commit", "commiter", "conventional commit", "message de commit"],
     "/commit"),
    ("deps", "dépendances",
     ["dependance", "dependency", "dependencies", "mettre a jour les paquets",
      "update deps", "bump version", "upgrade package"],
     "/update-deps · /audit-deps · agent @m-dependencies-updater"),
    ("design", "UI / design / maquette",
     ["maquette", "mockup", "figma", "screenshot", "capture d'ecran", "interface ui",
      "responsive", "ameliorer le design", "image to code"],
     "/image-to-code · /auto-correct-design · agent @m-design-reviewer · skill m-ux-standards"),
    ("i18n", "internationalisation / RTL",
     ["i18n", "traduction", "translate", "multilingue", "rtl", "arabe", "arabic",
      "internationalisation", "locale"],
     "agent @m-i18n-checker · skill m-mobile-standards"),
    ("pdf", "génération PDF",
     ["generer un pdf", "facture pdf", "invoice pdf", "rapport pdf", "document pdf",
      "export pdf"],
     "/generate-pdf · skill m-pdf-rtl"),
    ("diagram", "diagramme",
     ["mermaid", "diagramme", "diagram", "flowchart", "organigramme", "schema technique"],
     "/mermaid"),
    ("emoji", "emojis -> icônes SVG",
     ["remplacer les emojis", "supprimer les emojis", "emojis en icones", "fix emojis"],
     "/fix-emojis · skill m-emoji-mapping"),
    ("pipeline", "pipeline complet end-to-end",
     ["pipeline complet", "end to end", "tout le process", "de a a z", "workflow complet"],
     "/run-pipeline (pipeline 6+1)"),
]


# Posture experte injectée par domaine. Concise et actionnable : elle change
# la FAÇON dont Claude traite le prompt (pas seulement une suggestion d'outil).
EXPERT_PROFILES = {
    "security": "raisonne en ingénieur AppSec senior — modèle de menace d'abord (surface d'attaque, OWASP Top 10), authn/authz, validation et assainissement des entrées, gestion des secrets, sûreté des dépendances ; classe les risques par sévérité et propose des correctifs concrets.",
    "performance": "raisonne en ingénieur performance senior — mesure avant d'optimiser (profiling, Core Web Vitals), traque requêtes N+1, taille de bundle, caching et complexité algorithmique ; quantifie le gain attendu et évite l'optimisation prématurée.",
    "plan": "raisonne en architecte logiciel senior — clarifie exigences et contraintes, propose 2-3 options avec leurs compromis, pense scalabilité/maintenabilité/coût, et consigne les décisions (ADR).",
    "implement": "raisonne en ingénieur senior — TDD d'abord, code lisible et couvert par des tests, gestion des cas limites et des erreurs, respect strict des conventions du projet.",
    "test": "raisonne en ingénieur QA senior — couvre cas nominaux, limites et erreurs ; tests déterministes et rapides ; bonne pyramide unit/intégration/E2E.",
    "fix": "raisonne en ingénieur debug senior — reproduis d'abord, isole la cause racine (pas le symptôme), formule une hypothèse vérifiable, corrige, puis ajoute un test de non-régression.",
    "review": "raisonne en relecteur senior — évalue lisibilité, correction, sécurité, performance et tests ; sois précis et actionnable ; distingue bloquant vs amélioration optionnelle.",
    "design": "raisonne en designer produit/UI senior — hiérarchie visuelle, accessibilité (WCAG), design tokens, responsive et cohérence ; jamais d'emoji comme icône.",
    "i18n": "raisonne en expert i18n/l10n — aucune chaîne en dur, gestion du pluriel et des formats, support RTL (arabe), clés complètes pour chaque locale.",
    "deps": "raisonne en expert supply-chain — avant tout ajout : réputation, maintenance, licence et CVE connues ; privilégie les montées de version mineures sûres ; verrouille le lockfile.",
    "deploy": "raisonne en ingénieur DevOps/SRE senior — checklist de release : tests verts, migrations et plan de rollback, observabilité, secrets, feature flags.",
    "brownfield": "raisonne en expert de reprise de code (brownfield) — cartographie d'abord, repère conventions et dette, change par petites étapes sûres et testées.",
    "kickstart": "raisonne en lead d'amorçage de projet — pose l'identité, l'i18n/RTL, le design system et les fondations qualité dès le départ.",
    "pdf": "raisonne en expert mise en page imprimable — structure A4 sans min-height, page-break maîtrisé, support RTL.",
    "diagram": "raisonne en expert modélisation — choisis le bon type de diagramme et garde-le lisible et fidèle au système réel.",
    "commit": "raisonne en mainteneur rigoureux — commits conventionnels, atomiques, au message clair.",
    "pipeline": "raisonne en lead d'ingénierie — enchaîne specs → TDD → implémentation → revue → livraison avec des portes de qualité.",
    "emoji": "raisonne en expert design system — remplace les emojis par des icônes vectorielles cohérentes.",
}


# Sous-domaines : raffinent la posture quand des mots-clés plus précis sont présents.
SUBDOMAINS = {
    "security": [
        (["sql", "nosql", "requete", "query", "orm", "injection"],
         "cible l'injection — requêtes paramétrées, jamais de concaténation, permissions au niveau données."),
        (["xss", "csrf", "cors", "header", "cookie", "navigateur", "frontend", "client", "csp"],
         "cible la sécurité web — XSS (échappement/CSP), CSRF, CORS, cookies httpOnly/SameSite, en-têtes de sécurité."),
        (["api", "endpoint", "jwt", "oauth", "token", "rate limit", "webhook"],
         "cible la sécurité d'API — authz par requête, validation stricte, rate limiting, vérification des webhooks, anti mass-assignment."),
        (["mobile", "expo", "react native", "keychain", "stockage"],
         "cible la sécurité mobile — stockage chiffré (Keychain/Keystore), certificate pinning, aucun secret embarqué."),
        (["mot de passe", "password", "login", "mfa", "2fa", "sso", "session"],
         "cible l'authentification — hachage fort, MFA, sessions sûres, anti-bruteforce."),
        (["donnees personnelles", "pii", "rgpd", "gdpr", "chiffrement", "encryption"],
         "cible la protection des données — chiffrement au repos/en transit, minimisation, conformité RGPD."),
    ],
    "performance": [
        (["requete", "query", "db", "base de donnees", "n+1", "index", "sql"],
         "côté données — élimine les N+1, ajoute les index manquants, pagine, cache les lectures chaudes."),
        (["bundle", "frontend", "render", "rerender", "web vitals", "lcp", "image", "lazy"],
         "côté front — réduis le bundle (code-splitting), optimise les images, limite les re-renders, soigne LCP/CLS/INP."),
        (["api", "backend", "serveur", "latence", "throughput"],
         "côté back — profile les endpoints lents, cache, parallélise les I/O, surveille la latence p95/p99."),
        (["mobile", "demarrage", "memoire", "batterie", "expo"],
         "côté mobile — temps de démarrage, empreinte mémoire, listes virtualisées."),
    ],
    "design": [
        (["accessibilite", "a11y", "wcag", "contraste", "aria", "clavier"],
         "priorité accessibilité — contraste AA, navigation clavier, ARIA correct, focus visible."),
        (["responsive", "mobile", "breakpoint", "adaptatif"],
         "priorité responsive — mobile-first, breakpoints cohérents, cibles tactiles ≥44px."),
        (["token", "theme", "couleur", "typographie", "design system"],
         "priorité design system — tokens (couleurs/espacements/typo), zéro valeur magique."),
    ],
    "test": [
        (["e2e", "end to end", "playwright", "cypress"],
         "cible E2E — parcours critiques, données isolées, sélecteurs stables."),
        (["integration", "api", "db"],
         "cible intégration — vraies frontières (DB/API) avec setup/teardown propre."),
        (["unit", "unitaire", "pure"],
         "cible unitaire — rapide et déterministe, un comportement par test."),
    ],
    "implement": [
        (["api", "endpoint", "route", "backend"],
         "côté API — validation des entrées (schéma), codes d'erreur cohérents, idempotence si pertinent."),
        (["ui", "composant", "component", "frontend", "page"],
         "côté UI — composants accessibles et réutilisables, états loading/error/empty gérés."),
        (["db", "base de donnees", "schema", "migration", "orm"],
         "côté données — migrations versionnées, contraintes en base, transactions."),
    ],
    "plan": [
        (["mvp", "rapide", "prototype"],
         "optimise pour un MVP — périmètre minimal défendable, dette assumée et documentée."),
        (["scalable", "echelle", "scale", "charge", "trafic"],
         "optimise pour l'échelle — points de contention, statelessness, cache, files d'attente."),
    ],
}


# Détection de stack via les dépendances du package.json du projet.
# clé de dépendance -> (nom affiché, conseil spécifique)
STACK_HINTS = {
    "next": ("Next.js", "App Router : Server Components par défaut, 'use client' minimal, Server Actions, caching/revalidation maîtrisés."),
    "expo": ("Expo", "conventions React Native, navigation, stockage sécurisé natif."),
    "react-native": ("React Native", "perfs de listes virtualisées, stockage sécurisé natif."),
    "@prisma/client": ("Prisma", "évite les N+1 (include/select), migrations versionnées, $transaction pour l'atomicité."),
    "prisma": ("Prisma", "évite les N+1 (include/select), migrations versionnées, $transaction pour l'atomicité."),
    "drizzle-orm": ("Drizzle", "requêtes typées, migrations versionnées."),
    "@clerk/nextjs": ("Clerk", "autorisation vérifiée CÔTÉ SERVEUR via auth(), protège routes et Server Actions ; jamais le seul contrôle client."),
    "@clerk/clerk-react": ("Clerk", "autorisation vérifiée côté serveur, pas seulement côté client."),
    "next-auth": ("Auth.js", "vérifie la session côté serveur, protège les routes."),
    "@tanstack/react-query": ("TanStack Query", "clés de cache cohérentes, invalidation ciblée."),
    "tailwindcss": ("Tailwind", "design tokens, pas de valeurs magiques."),
    "zod": ("Zod", "valide les entrées aux frontières (API, formulaires, env)."),
}


def detect_stack(proj, stack_hints):
    """Retourne [(nom, conseil), …] selon les dépendances de package.json. Best-effort."""
    try:
        pkg = os.path.join(proj, "package.json")
        if not os.path.exists(pkg):
            return []
        with open(pkg) as f:
            data = json.load(f)
        deps = {}
        deps.update(data.get("dependencies", {}) or {})
        deps.update(data.get("devDependencies", {}) or {})
        out, seen_names = [], set()
        for key, (name, hint) in stack_hints.items():
            if key in deps and name not in seen_names:
                out.append((name, hint))
                seen_names.add(name)
        return out[:4]
    except Exception:
        return []


def load_config(proj):
    """Charge .claude/maestro.config.json (ou maestro.config.json racine).

    Fichier OPTIONNEL : absent/invalide -> {} (comportement par défaut inchangé).
    """
    for rel in (os.path.join(".claude", "maestro.config.json"), "maestro.config.json"):
        path = os.path.join(proj, rel)
        try:
            if os.path.exists(path):
                with open(path) as f:
                    cfg = json.load(f)
                return cfg if isinstance(cfg, dict) else {}
        except Exception:
            return {}
    return {}


def merged_tables(config):
    """Fusionne les tables intégrées avec la config projet. Best-effort, jamais bloquant.

    La config peut AJOUTER ou SURCHARGER : intents, expert_profiles, subdomains,
    stack_hints. Les défauts intégrés restent la base.
    """
    intents = list(INTENTS)
    subdomains = {k: list(v) for k, v in SUBDOMAINS.items()}
    profiles = dict(EXPERT_PROFILES)
    stack = dict(STACK_HINTS)
    try:
        for it in config.get("intents", []) or []:
            iid = it.get("id")
            kws = it.get("keywords") or []
            if iid and kws:
                intents.append((iid, it.get("label") or iid, list(kws), it.get("suggest", "")))
        for iid, directive in (config.get("expert_profiles", {}) or {}).items():
            if isinstance(directive, str) and directive.strip():
                profiles[iid] = directive
        for iid, entries in (config.get("subdomains", {}) or {}).items():
            lst = subdomains.setdefault(iid, [])
            for e in entries or []:
                kws, directive = e.get("keywords") or [], e.get("directive", "")
                if kws and directive:
                    lst.append((list(kws), directive))
        for key, val in (config.get("stack_hints", {}) or {}).items():
            if isinstance(val, dict):
                name, hint = val.get("name"), val.get("hint")
            elif isinstance(val, (list, tuple)) and len(val) == 2:
                name, hint = val[0], val[1]
            else:
                name = hint = None
            if name and hint:
                stack[key] = (name, hint)
    except Exception:
        pass  # config best-effort : on garde au moins les défauts
    return intents, subdomains, profiles, stack


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    prompt = (data.get("prompt") or "")[:2000]
    if not prompt.strip():
        sys.exit(0)

    # Déjà du Maestro (commande /... ou mention @m-...) -> ne pas déranger
    if prompt.lstrip().startswith("/") or "@m-" in prompt:
        sys.exit(0)

    norm = strip_accents(prompt.lower())

    # Config projet optionnelle (fusionnée par-dessus les défauts intégrés)
    proj = os.environ.get("CLAUDE_PROJECT_DIR", ".")
    config = load_config(proj)
    intents, subdomains, expert_profiles, stack_hints = merged_tables(config)

    best = None
    best_score = 0
    for iid, label, keywords, suggest in intents:
        # mots-clés propres (poids 2) + mots-clés de sous-domaine (poids 1).
        # Les sous-domaines élargissent la détection (ex. « xss »/« n+1 ») sans
        # noyer les signaux forts propres à chaque intention.
        score = 2 * sum(1 for k in keywords if strip_accents(k) in norm)
        score += sum(
            1
            for kws, _ in subdomains.get(iid, [])
            for k in kws
            if strip_accents(k) in norm
        )
        if score > best_score:
            best_score = score
            best = (iid, label, suggest)

    if not best or best_score == 0:
        sys.exit(0)

    iid, label, suggest = best

    # Dé-duplication par session (ne pas re-suggérer la même intention)
    sid = data.get("session_id", "nosession")
    seen_file = os.path.join(proj, ".claude", ".maestro-router-seen")
    key = f"{sid}|{iid}"
    try:
        seen = set()
        if os.path.exists(seen_file):
            with open(seen_file) as f:
                seen = {line.strip() for line in f if line.strip()}
        if key in seen:
            sys.exit(0)
        seen.add(key)
        os.makedirs(os.path.dirname(seen_file), exist_ok=True)
        with open(seen_file, "w") as f:
            f.write("\n".join(list(seen)[-200:]))
    except Exception:
        pass  # dédup best-effort, jamais bloquant

    # ── Mode expert : adopter la posture du domaine détecté ──────────────
    # Priorité : env MAE_EXPERT_MODE > config "expert_mode" > défaut (on).
    env_val = os.environ.get("MAE_EXPERT_MODE", "").strip().lower()
    if env_val in ("0", "off", "false", "no"):
        expert_on = False
    elif env_val in ("1", "on", "true", "yes"):
        expert_on = True
    else:
        expert_on = bool(config.get("expert_mode", True))
    expert_block = ""
    if expert_on:
        profile = expert_profiles.get(iid) or (
            f"adopte la posture d'un expert senior du domaine ({label}), "
            f"donne des recommandations de niveau expert et signale proactivement les pièges courants"
        )

        # Sous-domaine : choisit la précision la plus pertinente (best match)
        sub_text = ""
        best_sub, best_sub_score = None, 0
        for kws, directive in subdomains.get(iid, []):
            sc = sum(1 for k in kws if strip_accents(k) in norm)
            if sc > best_sub_score:
                best_sub_score, best_sub = sc, directive
        if best_sub:
            sub_text = f"Précision : {best_sub} "

        # Stack du projet (lue dans package.json)
        stack_text = ""
        stack = detect_stack(proj, stack_hints)
        if stack:
            names = ", ".join(n for n, _ in stack)
            hints = " ".join(h for _, h in stack)
            stack_text = f"Stack du projet : {names}. Applique leurs conventions et pièges : {hints} "

        expert_block = (
            f"MODE EXPERT — {label}. Pour traiter ce prompt, adopte cette posture et applique-la "
            f"concrètement dans ta réponse : {profile} {sub_text}{stack_text}"
            f"Propose des suggestions de niveau expert et signale proactivement les risques ou "
            f"améliorations pertinents, sans sortir du périmètre demandé ni contredire les "
            f"consignes de sécurité. "
        )

    ctx = (
        f"{expert_block}"
        f"[Maestro] Outils adaptés à cette tâche : {suggest}. "
        f"En UNE phrase courte (langue de l'utilisateur), signale que ces outils Maestro existent "
        f"et propose de les utiliser, puis traite la demande normalement. "
        f"Ne répète pas cette suggestion plus tard dans la session."
    )
    json.dump(
        {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": ctx}},
        sys.stdout,
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
