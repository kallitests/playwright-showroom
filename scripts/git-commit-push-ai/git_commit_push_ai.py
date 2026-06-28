#!/usr/bin/env python3
"""
git_commit_push_ai.py

SCRIPT D'ADMINISTRATION GIT — COMMIT & PUSH SÉCURISÉ + MESSAGE IA
====================================================================

Variante IA de git_commit_push.py : au lieu de demander le message de
commit à la main, un petit modèle Claude (via LangChain) lit le diff
stagé et propose un message au format Conventional Commits. Tu peux
l'accepter, le modifier, ou en redemander un autre.

Automatise le cycle complet :
    git add .  →  message de commit généré par IA  →  git commit  →  git push

Checks inclus (dans l'ordre d'exécution) :
    ✔ Vérifie que git est installé
    ✔ Vérifie que le dossier courant est bien un dépôt Git
    ✔ Vérifie que la remote 'origin' est configurée
    ✔ Vérifie que la branche courante est connue (protection anti-HEAD détaché)
    ✔ Alerte si la branche est 'main' ou 'master' (demande confirmation)
    ✔ Affiche les fichiers modifiés / non suivis avant l'ajout
    ✔ Alerte si aucune modification n'est détectée (rien à committer)
    ✔ Alerte si des fichiers sensibles (.env, secrets, clés) sont sur le point d'être commités
    ✔ Génère un message de commit via Claude (LangChain) à partir du diff stagé
    ✔ Permet d'accepter / éditer / régénérer ce message avant de continuer
    ✔ Affiche un récapitulatif complet avant d'exécuter quoi que ce soit
    ✔ Demande confirmation finale avant le push
    ✔ Gère les erreurs SSH / token / réseau et affiche un diagnostic clair
    ✔ Connexion SSH persistante + reconnaissance des comptes collaborateurs

Deux fournisseurs IA disponibles pour générer le message de commit :

    OLLAMA (par défaut, pour les TESTS) — 100% local, 0 token facturé :
        1. Installer Ollama      → https://ollama.com
        2. Télécharger un modèle → ollama pull llama3.2
        3. Lancer le serveur     → ollama serve
        4. pip install langchain-ollama langchain-core

    ANTHROPIC / CLAUDE (pour la PROD plus tard) — qualité supérieure, payant :
        export ANTHROPIC_API_KEY="sk-ant-..."
        pip install langchain-anthropic langchain-core

Sans aucun des deux configuré, le script bascule automatiquement sur la
saisie manuelle du message (aucun blocage).

Usage :
    python git_commit_push_ai.py                          # Ollama par défaut
    python git_commit_push_ai.py --llm-provider anthropic  # Claude (prod)
    python git_commit_push_ai.py --no-ai                   # saisie manuelle forcée
    python git_commit_push_ai.py --path /chemin/vers/ton/repo
"""

import os
import re
import sys
import argparse
import subprocess
from pathlib import Path

# ── Import LangChain en mode optionnel (multi-fournisseurs) ──────────────────
# Le script doit rester utilisable même si un paquet manque ou si un serveur
# IA est injoignable : dans tous les cas, on bascule sur la saisie manuelle
# du message de commit, sans jamais bloquer le workflow.
try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from langchain_ollama import ChatOllama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

try:
    from langchain_core.messages import SystemMessage, HumanMessage
    LANGCHAIN_CORE_AVAILABLE = True
except ImportError:
    LANGCHAIN_CORE_AVAILABLE = False

# ── Fournisseurs IA disponibles ───────────────────────────────────────────────
#
# OLLAMA (par défaut ici, pour les TESTS) :
#   - 100% local, 0 token facturé, aucune clé API.
#   - Installation : https://ollama.com  →  `ollama pull llama3.2`  →  `ollama serve`
#   - Le modèle tourne sur ta machine ; le diff ne sort jamais de ton poste.
#
# ANTHROPIC / CLAUDE (gardé pour la MISE EN PROD plus tard) :
#   - export ANTHROPIC_API_KEY="sk-ant-..."
#   - meilleure qualité de message, mais facturé au token.
#
# Autres options gratuites / locales à 0 token, si tu veux varier les tests :
#   - LM Studio        : interface desktop, expose une API OpenAI-compatible
#                         en local → https://lmstudio.ai
#   - llama.cpp server : `llama-server` en CLI, API OpenAI-compatible, très léger
#                         → https://github.com/ggml-org/llama.cpp
#   - GPT4All          : appli desktop tout-en-un, modèles quantifiés, API locale
#                         → https://gpt4all.io
#   - Jan              : alternative desktop à ChatGPT, 100% locale, API locale
#                         → https://jan.ai
#   - text-generation-webui (oobabooga) : interface web locale, API OpenAI-compatible
#                         → https://github.com/oobabooga/text-generation-webui
#   Tous ces outils exposent une API compatible OpenAI : pour les brancher ici,
#   il suffirait d'ajouter un bloc 'elif provider == "lmstudio"' utilisant
#   ChatOpenAI(base_url=..., api_key="not-needed") de langchain_openai —
#   même squelette que pour Ollama ci-dessous.

AI_PROVIDER_DEFAULT = "ollama"   # "ollama" (tests, gratuit) ou "anthropic" (prod)

# Modèle Claude utilisé en prod. Haiku est volontairement choisi : tâche
# courte et peu ambiguë, pas besoin d'un modèle plus gros pour résumer
# un diff en une ligne.
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"

# Modèle Ollama utilisé en local pour les tests. Petit modèle généraliste,
# rapide même sur un CPU modeste. Change-le si tu as déjà autre chose
# de pull (ex: "qwen2.5:3b", "phi3", "mistral").
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# Taille max du diff envoyé au modèle (en caractères). Au-delà, on tronque
# et on prévient le modèle — l'objectif est un prompt court, pas un résumé
# parfait de gros refactors. Pour ça, le message reste éditable à la main.
AI_MAX_DIFF_CHARS = 6000


# ─────────────────────────────────────────────────────────────────────────────
# Constantes de configuration
# ─────────────────────────────────────────────────────────────────────────────

# Branches qui méritent une confirmation explicite avant tout push
PROTECTED_BRANCHES = {"main", "master", "production", "prod", "release"}

# Patterns de fichiers considérés comme sensibles
SENSITIVE_PATTERNS = [
    r"\.env(\..+)?$",          # .env, .env.local, .env.production …
    r"\.pem$",                  # certificats privés
    r"\.key$",                  # clés privées
    r"secrets?\.(json|ya?ml|toml)$",
    r"credentials?\.(json|ya?ml)$",
    r"id_rsa",                  # clés SSH privées
    r"id_ed25519$",
    r"\.p12$",                  # keystores
    r"\.pfx$",
    r"config\.ya?ml$",          # fichiers de config potentiellement sensibles
    r"database\.ya?ml$",
]

# Longueur minimale acceptable pour un message de commit
MIN_COMMIT_MSG_LENGTH = 10

# Comptes GitHub légitimes pour ce dépôt : khafidmedheb est collaborateur
# du projet hébergé sous khafid1506. Si le push échoue mais que l'identité
# SSH authentifiée est l'un de ces deux comptes, ce n'est pas une vraie
# erreur d'accès — il ne faut pas faire échouer le script pour ça.
ALLOWED_GITHUB_USERS = {"khafid1506", "khafidmedheb"}

# Hôte SSH cible pour la connexion persistante (évite de ré-authentifier
# à chaque commande git du script)
SSH_PERSISTENT_HOST = "github.com"

# Couleurs ANSI pour le terminal
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    RED    = "\033[91m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    WHITE  = "\033[97m"
    DIM    = "\033[2m"


# ─────────────────────────────────────────────────────────────────────────────
# Utilitaires d'affichage
# ─────────────────────────────────────────────────────────────────────────────

def header(title: str) -> None:
    """Affiche un séparateur de section lisible."""
    bar = "─" * 60
    print(f"\n{C.CYAN}{bar}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}  {title}{C.RESET}")
    print(f"{C.CYAN}{bar}{C.RESET}")


def ok(msg: str) -> None:
    print(f"{C.GREEN}  ✔  {msg}{C.RESET}")


def warn(msg: str) -> None:
    print(f"{C.YELLOW}  ⚠  {msg}{C.RESET}")


def error(msg: str) -> None:
    print(f"{C.RED}  ✖  {msg}{C.RESET}")


def info(msg: str) -> None:
    print(f"{C.CYAN}  ℹ  {msg}{C.RESET}")


def abort(msg: str) -> None:
    """Affiche une erreur fatale et quitte le script."""
    error(msg)
    print(f"\n{C.RED}{C.BOLD}  Abandon.{C.RESET}\n")
    sys.exit(1)


def confirm(prompt: str, default_yes: bool = False) -> bool:
    """
    Demande une confirmation y/n à l'utilisateur.
    default_yes=True → Entrée seule compte comme 'oui'.
    """
    hint = "[O/n]" if default_yes else "[o/N]"
    answer = input(f"\n{C.BOLD}  {prompt} {hint} : {C.RESET}").strip().lower()
    if answer == "":
        return default_yes
    return answer in ("o", "y", "oui", "yes")


# ─────────────────────────────────────────────────────────────────────────────
# Exécution de commandes shell
# ─────────────────────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: str = None, capture: bool = True,
        check: bool = False) -> subprocess.CompletedProcess:
    """
    Exécute une commande shell.

    Paramètres :
        cmd     -> liste des arguments, ex. ["git", "status", "--short"]
        cwd     -> répertoire de travail (None = répertoire courant)
        capture -> si True, récupère stdout/stderr au lieu de les afficher
        check   -> si True, lève une exception si le code de retour ≠ 0

    Retourne :
        L'objet CompletedProcess avec .returncode, .stdout, .stderr
    """
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture,
        text=True,
        check=check,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Checks préliminaires
# ─────────────────────────────────────────────────────────────────────────────

def check_git_installed() -> None:
    """Vérifie que la commande 'git' est disponible sur le système."""
    result = run(["git", "--version"])
    if result.returncode != 0:
        abort("Git n'est pas installé ou n'est pas dans le PATH.")
    ok(f"Git détecté : {result.stdout.strip()}")


def check_is_git_repo(repo_path: str) -> None:
    """
    Vérifie que repo_path (ou le dossier courant) est bien à l'intérieur
    d'un dépôt Git.  'git rev-parse --git-dir' échoue si ce n'est pas le cas.
    """
    result = run(["git", "rev-parse", "--git-dir"], cwd=repo_path)
    if result.returncode != 0:
        abort(
            f"'{repo_path}' n'est pas un dépôt Git.\n"
            "  Lancez d'abord : git init"
        )
    ok(f"Dépôt Git valide : {repo_path}")


def check_remote(repo_path: str) -> str:
    """
    Vérifie qu'une remote 'origin' est configurée et retourne son URL.
    Sans remote, git push ne sait pas où envoyer les commits.
    """
    result = run(["git", "remote", "get-url", "origin"], cwd=repo_path)
    if result.returncode != 0:
        abort(
            "Aucune remote 'origin' configurée.\n"
            "  Exemple : git remote add origin git@github.com:user/repo.git"
        )
    url = result.stdout.strip()
    ok(f"Remote 'origin' : {url}")
    return url


def check_branch(repo_path: str) -> str:
    """
    Récupère la branche courante.
    Alerte si on est en mode HEAD détaché (dangereux pour les pushs).
    """
    result = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_path)
    if result.returncode != 0:
        abort("Impossible de déterminer la branche courante.")

    branch = result.stdout.strip()

    if branch == "HEAD":
        # Mode HEAD détaché : les commits ne sont rattachés à aucune branche.
        # Un push dans cet état est souvent une erreur.
        abort(
            "Vous êtes en mode HEAD détaché (detached HEAD).\n"
            "  Créez ou basculez sur une branche avant de committer :\n"
            "  git checkout -b ma-branche"
        )

    ok(f"Branche courante : {C.BOLD}{branch}{C.RESET}")
    return branch


def check_protected_branch(branch: str) -> None:
    """
    Affiche un avertissement explicite si la branche est protégée
    (main, master, production…) et demande confirmation.
    Pousse sur main directement est souvent une mauvaise pratique.
    """
    if branch in PROTECTED_BRANCHES:
        warn(
            f"Vous êtes sur la branche protégée '{C.BOLD}{branch}{C.RESET}{C.YELLOW}'.\n"
            f"  Pousser directement sur '{branch}' est risqué en équipe.\n"
            "  Préférez une branche de feature + Pull Request."
        )
        if not confirm(f"Continuer quand même sur '{branch}' ?", default_yes=False):
            abort("Push annulé par l'utilisateur.")


# ─────────────────────────────────────────────────────────────────────────────
# Connexion SSH persistante + identité GitHub
# ─────────────────────────────────────────────────────────────────────────────

def _control_socket_path() -> Path:
    """Chemin du socket de contrôle SSH utilisé pour github.com."""
    return Path.home() / ".ssh" / "sockets" / f"git@{SSH_PERSISTENT_HOST}-22"


def clear_stale_ssh_socket() -> None:
    """
    Supprime le socket de contrôle SSH s'il existe mais ne répond plus.

    Un socket 'mort' (process SSH précédent tué, PC mis en veille, etc.)
    reste sur le disque et provoque exactement le symptôme rencontré :
        mux_client_request_session: read from master failed: Connection reset by peer
        ControlSocket ... already exists, disabling multiplexing
    SSH refuse de réutiliser un socket existant même s'il est mort, et le
    push échoue à cause de la connexion, pas à cause des droits.

    'ssh -O check' interroge le socket : exit 0 = vivant, autre = mort.
    """
    socket_path = _control_socket_path()
    if not socket_path.exists():
        return

    check = run(
        ["ssh", "-O", "check", "-o", f"ControlPath={socket_path}", f"git@{SSH_PERSISTENT_HOST}"]
    )
    if check.returncode != 0:
        warn(f"Socket SSH périmé détecté ({socket_path.name}) — nettoyage…")
        try:
            socket_path.unlink()
            ok("Socket périmé supprimé. La prochaine connexion repartira de zéro.")
        except OSError as e:
            warn(f"Impossible de supprimer le socket périmé : {e}")
    else:
        ok("Socket SSH existant et fonctionnel — réutilisation.")


def ensure_persistent_ssh_config() -> None:
    """
    Garantit qu'une entrée 'ControlMaster/ControlPersist' existe dans
    ~/.ssh/config pour github.com.

    Sans ça, chaque commande git (fetch/push/ssh -T) ouvre une NOUVELLE
    session SSH et peut redemander une authentification ou retomber sur
    une clé différente. Avec ControlPersist, la première connexion reste
    ouverte et toutes les commandes suivantes la réutilisent — d'où une
    expérience "connectée une fois pour toutes" pendant la durée du script
    (et 10 minutes après, le temps d'enchaîner plusieurs opérations).

    Idempotent : n'ajoute le bloc que s'il est absent.
    """
    ssh_dir = Path.home() / ".ssh"
    config_path = ssh_dir / "config"
    sockets_dir = ssh_dir / "sockets"

    ssh_dir.mkdir(mode=0o700, exist_ok=True)
    sockets_dir.mkdir(mode=0o700, exist_ok=True)

    # Toujours vérifier/nettoyer le socket existant, même si le bloc de
    # config est déjà présent — c'est la cause la plus fréquente d'échec.
    clear_stale_ssh_socket()

    existing = config_path.read_text() if config_path.exists() else ""

    if f"Host {SSH_PERSISTENT_HOST}" in existing and "ControlPersist" in existing:
        ok("Connexion SSH persistante déjà configurée pour github.com.")
        return

    block = (
        f"\n# --- Ajouté automatiquement par git_commit_push.py ---\n"
        f"Host {SSH_PERSISTENT_HOST}\n"
        f"    HostName {SSH_PERSISTENT_HOST}\n"
        f"    User git\n"
        f"    ControlMaster auto\n"
        f"    ControlPath ~/.ssh/sockets/%r@%h-%p\n"
        f"    ControlPersist 600\n"
        f"    IdentitiesOnly no\n"
        f"# --- Fin du bloc ajouté automatiquement ---\n"
    )

    with open(config_path, "a") as f:
        f.write(block)
    config_path.chmod(0o600)

    ok("Connexion SSH persistante configurée dans ~/.ssh/config (ControlPersist 600s).")
    info("Les pushs suivants réutiliseront la même session SSH pendant 10 minutes.")


def check_github_ssh_identity() -> str | None:
    """
    Teste 'ssh -T git@github.com' pour savoir QUEL compte GitHub répond
    réellement à l'authentification SSH active.

    GitHub répond toujours par un code de sortie 1 sur ce test (c'est normal,
    pas une erreur), avec un message du type :
        "Hi khafidmedheb! You've successfully authenticated, but GitHub
         does not provide shell access."

    Retourne le nom d'utilisateur détecté, ou None si indéterminable.
    """
    result = run(["ssh", "-T", "-o", "BatchMode=yes", f"git@{SSH_PERSISTENT_HOST}"])
    combined = f"{result.stdout}\n{result.stderr}"

    match = re.search(r"Hi (\S+?)!", combined)
    if not match:
        warn("Impossible de déterminer l'identité SSH active (ssh -T sans réponse exploitable).")
        return None

    username = match.group(1)

    if username in ALLOWED_GITHUB_USERS:
        ok(f"Identité SSH active : {C.BOLD}{username}{C.RESET} (compte autorisé sur ce dépôt).")
    else:
        warn(
            f"Identité SSH active : {username} — ce compte n'est PAS dans la liste\n"
            f"  des comptes autorisés ({', '.join(ALLOWED_GITHUB_USERS)}).\n"
            "  Le push risque d'être refusé si ce compte n'est pas collaborateur."
        )

    return username


# ─────────────────────────────────────────────────────────────────────────────
# Analyse des fichiers modifiés
# ─────────────────────────────────────────────────────────────────────────────

def get_status(repo_path: str) -> list[tuple[str, str]]:
    """
    Retourne la liste des fichiers modifiés sous forme de tuples (code, chemin).
    'git status --porcelain' produit une sortie stable et scriptable :
       M  fichier.py   -> modifié
       ??  nouveau.txt  -> non suivi (untracked)
       D  supprimé.go  -> supprimé
       etc.
    """
    result = run(["git", "status", "--porcelain"], cwd=repo_path)
    lines = [l for l in result.stdout.splitlines() if l.strip()]
    parsed = []
    for line in lines:
        # Les deux premiers caractères = code de statut, le reste = chemin
        code = line[:2].strip()
        path = line[3:].strip()
        parsed.append((code, path))
    return parsed


def display_status(files: list[tuple[str, str]]) -> None:
    """Affiche la liste des fichiers avec une couleur selon leur statut."""
    code_labels = {
        "M":  (C.YELLOW, "modifié "),
        "MM": (C.YELLOW, "modifié "),
        "A":  (C.GREEN,  "ajouté  "),
        "D":  (C.RED,    "supprimé"),
        "R":  (C.CYAN,   "renommé "),
        "C":  (C.CYAN,   "copié   "),
        "??": (C.DIM,    "nouveau "),
        "UU": (C.RED,    "conflit "),
    }
    for code, path in files:
        color, label = code_labels.get(code, (C.WHITE, code.ljust(8)))
        print(f"    {color}{label}{C.RESET}  {path}")


def check_no_changes(files: list[tuple[str, str]]) -> None:
    """
    Arrête le script si aucune modification n'est détectée.
    Évite de créer un commit vide, ce qui polluerait l'historique.
    """
    if not files:
        abort(
            "Aucune modification détectée.\n"
            "  L'arbre de travail est propre — rien à committer."
        )


def check_merge_conflicts(files: list[tuple[str, str]]) -> None:
    """
    Détecte les fichiers en conflit de merge non résolus (code 'UU', 'AA'…).
    Un commit avec des marqueurs de conflit (<<<<<<<) est toujours une erreur.
    """
    conflict_codes = {"UU", "AA", "DD", "AU", "UA", "DU", "UD"}
    conflicts = [(c, p) for c, p in files if c in conflict_codes]
    if conflicts:
        error("Conflits de merge non résolus :")
        for code, path in conflicts:
            print(f"    {C.RED}{code}  {path}{C.RESET}")
        abort(
            "Résolvez les conflits avant de committer.\n"
            "  Utilisez : git mergetool  ou éditez les fichiers manuellement,\n"
            "  puis : git add <fichier>"
        )


def check_sensitive_files(files: list[tuple[str, str]]) -> None:
    """
    Détecte les fichiers potentiellement sensibles sur le point d'être commités
    (.env, clés SSH, secrets…).  Propose d'abandonner ou de continuer.
    Ne bloque pas définitivement — l'utilisateur peut choisir de continuer
    s'il sait ce qu'il fait (ex: .env.example sans vraies valeurs).
    """
    flagged = []
    for _, path in files:
        filename = Path(path).name
        for pattern in SENSITIVE_PATTERNS:
            if re.search(pattern, filename, re.IGNORECASE):
                flagged.append(path)
                break  # un seul match suffit par fichier

    if flagged:
        warn("Fichiers potentiellement sensibles détectés :")
        for path in flagged:
            print(f"    {C.YELLOW}⚠  {path}{C.RESET}")
        print(
            f"\n  {C.DIM}Ces fichiers contiennent peut-être des mots de passe,\n"
            f"  clés API ou secrets. Vérifiez qu'ils appartiennent bien au\n"
            f"  commit et ne figurent pas dans .gitignore.{C.RESET}"
        )
        if not confirm("Inclure quand même ces fichiers ?", default_yes=False):
            abort(
                "Push annulé.\n"
                "  Ajoutez les fichiers sensibles à .gitignore, puis relancez."
            )


# ─────────────────────────────────────────────────────────────────────────────
# Message de commit — génération IA (LangChain + Claude)
# ─────────────────────────────────────────────────────────────────────────────

# Prompt système volontairement court : une seule consigne par ligne, pas de
# justification, pas d'exemple superflu. Moins de tokens en entrée à chaque
# appel, et un message qui ne dérive pas vers un roman.
AI_SYSTEM_PROMPT = (
    "Tu écris des messages de commit Git au format Conventional Commits.\n"
    "Une seule ligne. Maximum 72 caractères. En anglais.\n"
    "Format : <type>(<scope optionnel>): <description au présent>\n"
    "Types valides : feat, fix, docs, refactor, chore, test, style, perf.\n"
    "Pas de point final. Pas de tiret cadratin. Pas de guillemets.\n"
    "Réponds uniquement avec le message, rien d'autre."
)


def get_staged_diff(repo_path: str) -> str:
    """
    Récupère le diff stagé (ce qui sera réellement commité), tronqué à
    AI_MAX_DIFF_CHARS pour garder le prompt court. '--stat' apporte un
    résumé fichier par fichier en plus du diff complet, utile au modèle
    même si le diff brut est coupé en cours de route.
    """
    stat = run(["git", "diff", "--staged", "--stat"], cwd=repo_path, capture=True)
    diff = run(["git", "diff", "--staged"], cwd=repo_path, capture=True)

    full_diff = diff.stdout or ""
    truncated = len(full_diff) > AI_MAX_DIFF_CHARS
    if truncated:
        full_diff = full_diff[:AI_MAX_DIFF_CHARS]

    payload = f"Résumé des fichiers modifiés :\n{stat.stdout.strip()}\n\nDiff :\n{full_diff}"
    if truncated:
        payload += "\n\n[diff tronqué — base-toi surtout sur le résumé des fichiers]"

    return payload


def generate_ai_commit_message(repo_path: str, provider: str) -> str | None:
    """
    Demande à un LLM (via LangChain) un message de commit basé sur le diff
    stagé. Retourne None si l'IA n'est pas disponible / mal configurée ou
    si l'appel échoue — le script doit toujours pouvoir continuer en mode
    manuel dans ce cas.

    provider : "ollama" (local, gratuit, pour les tests) ou
               "anthropic" (Claude, API payante, pour la prod)
    """
    if not LANGCHAIN_CORE_AVAILABLE:
        warn("langchain-core non installé — message IA indisponible.")
        info("Installez-le avec : pip install langchain-core")
        return None

    diff_payload = get_staged_diff(repo_path)
    if not diff_payload.strip():
        return None

    llm = None

    if provider == "ollama":
        if not OLLAMA_AVAILABLE:
            warn("langchain-ollama non installé — message IA indisponible.")
            info("Installez-le avec : pip install langchain-ollama")
            return None
        try:
            llm = ChatOllama(
                model=OLLAMA_MODEL,
                base_url=OLLAMA_BASE_URL,
                temperature=0,
                num_predict=60,   # équivalent de max_tokens côté Ollama
            )
        except Exception as e:
            warn(f"Impossible d'initialiser Ollama ({OLLAMA_MODEL}) : {e}")
            info(
                f"Vérifiez qu'Ollama tourne (`ollama serve`) et que le modèle\n"
                f"  est bien téléchargé (`ollama pull {OLLAMA_MODEL}`)."
            )
            return None

    elif provider == "anthropic":
        if not ANTHROPIC_AVAILABLE:
            warn("langchain-anthropic non installé — message IA indisponible.")
            info("Installez-le avec : pip install langchain-anthropic")
            return None
        if not os.environ.get("ANTHROPIC_API_KEY"):
            warn("ANTHROPIC_API_KEY non défini — message IA indisponible.")
            return None
        try:
            llm = ChatAnthropic(model=ANTHROPIC_MODEL, max_tokens=60, temperature=0)
        except Exception as e:
            warn(f"Impossible d'initialiser Claude ({ANTHROPIC_MODEL}) : {e}")
            return None

    else:
        warn(f"Fournisseur IA inconnu : '{provider}'.")
        return None

    try:
        response = llm.invoke([
            SystemMessage(content=AI_SYSTEM_PROMPT),
            HumanMessage(content=diff_payload),
        ])
        message = response.content.strip().strip('"')
        return message if message else None
    except Exception as e:
        warn(f"Échec de la génération IA du message de commit ({provider}) : {e}")
        if provider == "ollama":
            info("Vérifiez qu'Ollama est lancé : `ollama serve` (dans un autre terminal).")
        return None


def ask_commit_message_ai(repo_path: str, use_ai: bool = True, provider: str = AI_PROVIDER_DEFAULT) -> str:
    """
    Propose un message de commit généré par IA à partir du diff stagé.
    L'utilisateur peut :
        [Entrée]  accepter le message proposé
        r         régénérer un nouveau message
        n'importe quel autre texte → utilisé tel quel comme message

    Si l'IA est indisponible ou désactivée (--no-ai), bascule directement
    sur la saisie manuelle classique (ask_commit_message).
    """
    header("Message de commit")

    if not use_ai:
        info("Mode IA désactivé (--no-ai) — saisie manuelle.")
        return ask_commit_message()

    info(f"Génération du message de commit par IA (fournisseur : {provider})…")
    suggestion = generate_ai_commit_message(repo_path, provider)

    if suggestion is None:
        warn("Bascule sur la saisie manuelle.")
        return ask_commit_message()

    while True:
        print(f"\n  {C.BOLD}Message proposé :{C.RESET} {C.GREEN}{suggestion}{C.RESET}")
        answer = input(
            f"\n  {C.DIM}[Entrée] accepter · 'r' régénérer · "
            f"ou tapez votre propre message{C.RESET}\n  > "
        ).strip()

        if answer == "":
            ok(f"Message validé : \"{suggestion}\"")
            return suggestion

        if answer.lower() == "r":
            info("Nouvelle génération…")
            new_suggestion = generate_ai_commit_message(repo_path, provider)
            if new_suggestion is None:
                warn("Nouvelle génération impossible — bascule sur la saisie manuelle.")
                return ask_commit_message()
            suggestion = new_suggestion
            continue

        if len(answer) < MIN_COMMIT_MSG_LENGTH:
            warn(
                f"Message trop court ({len(answer)} caractères).\n"
                f"  Minimum requis : {MIN_COMMIT_MSG_LENGTH} caractères."
            )
            continue

        ok(f"Message validé : \"{answer}\"")
        return answer


def ask_commit_message() -> str:
    """
    Invite l'utilisateur à saisir un message de commit.
    Valide :
        - message non vide
        - longueur minimale (MIN_COMMIT_MSG_LENGTH caractères)
        - pas uniquement des espaces / caractères spéciaux

    Affiche des conseils de style Conventional Commits si l'utilisateur
    semble écrire un message générique.
    """
    header("Message de commit")

    print(
        f"  {C.DIM}Conseils — Conventional Commits :\n"
        f"    feat: ajoute une nouvelle fonctionnalité\n"
        f"    fix:  corrige un bug\n"
        f"    docs: modifie la documentation\n"
        f"    refactor: restructuration sans changement de comportement\n"
        f"    chore: tâche de maintenance (deps, CI…){C.RESET}\n"
    )

    generic_messages = {
        "update", "fix", "commit", "changes", "wip",
        "test", "modif", "modifs", "maj", "misc",
    }

    while True:
        msg = input(f"  {C.BOLD}Message de commit : {C.RESET}").strip()

        if not msg:
            warn("Le message de commit ne peut pas être vide.")
            continue

        if len(msg) < MIN_COMMIT_MSG_LENGTH:
            warn(
                f"Message trop court ({len(msg)} caractères).\n"
                f"  Minimum requis : {MIN_COMMIT_MSG_LENGTH} caractères.\n"
                f"  Soyez descriptif — ce message vivra dans l'historique Git."
            )
            continue

        # Alerte sur les messages trop génériques
        first_word = msg.split()[0].rstrip(":").lower()
        if first_word in generic_messages and len(msg.split()) <= 2:
            warn(
                f"Le message '{msg}' est très générique.\n"
                "  Un bon message répond à : 'Ce commit fait quoi exactement ?'\n"
                "  Exemple : 'fix: corrige le crash au démarrage sur Windows'"
            )
            if not confirm("Garder ce message quand même ?", default_yes=False):
                continue

        ok(f"Message validé : \"{msg}\"")
        return msg


# ─────────────────────────────────────────────────────────────────────────────
# Récapitulatif et confirmation finale
# ─────────────────────────────────────────────────────────────────────────────

def show_summary(branch: str, remote_url: str,
                 files: list[tuple[str, str]], commit_msg: str) -> None:
    """
    Affiche un récapitulatif complet de ce qui va être exécuté.
    L'utilisateur voit exactement ce qui va se passer AVANT que cela se passe.
    """
    header("Récapitulatif — ce qui va être exécuté")

    print(f"  {C.BOLD}Remote  :{C.RESET} {remote_url}")
    print(f"  {C.BOLD}Branche :{C.RESET} {branch}")
    print(f"  {C.BOLD}Commit  :{C.RESET} \"{commit_msg}\"")
    print(f"\n  {C.BOLD}Fichiers inclus ({len(files)}) :{C.RESET}")
    display_status(files)

    print(f"\n  {C.BOLD}Commandes restantes :{C.RESET}")
    print(f"  {C.DIM}$ git add .          (déjà fait){C.RESET}")
    print(f"  {C.DIM}$ git commit -m \"{commit_msg}\"{C.RESET}")
    print(f"  {C.DIM}$ git push origin {branch}{C.RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# Exécution Git
# ─────────────────────────────────────────────────────────────────────────────

def git_add(repo_path: str) -> None:
    """
    Exécute 'git add .' pour stager tous les fichiers modifiés.
    """
    header("git add .")
    result = run(["git", "add", "."], cwd=repo_path, capture=False)
    if result.returncode != 0:
        abort("Échec de 'git add .'.")
    ok("Tous les fichiers ont été stagés.")


def git_commit(repo_path: str, commit_msg: str) -> None:
    """
    Exécute 'git commit -m <message>'.
    Affiche le hash court du commit créé pour traçabilité.
    """
    header("git commit")
    result = run(
        ["git", "commit", "-m", commit_msg],
        cwd=repo_path,
        capture=True,
    )
    if result.returncode != 0:
        error("Échec de 'git commit'.")
        print(result.stderr.strip())
        abort("Vérifiez la configuration git (user.name, user.email).")

    # Affiche la sortie de git commit (contient le hash du commit)
    print(f"  {result.stdout.strip()}")
    ok("Commit créé avec succès.")


def git_push(repo_path: str, branch: str) -> None:
    """
    Exécute 'git push origin <branche>'.

    Gestion des erreurs courantes :
        - Branche non existante sur le remote → propose --set-upstream
        - Rejet (remote ahead)               → propose git pull
        - Erreur d'authentification SSH/HTTPS → diagnostic ciblé
        - Timeout réseau                      → message clair
    """
    header("git push")
    info(f"Push vers origin/{branch} en cours…")

    result = run(
        ["git", "push", "origin", branch],
        cwd=repo_path,
        capture=True,
    )

    stdout = result.stdout.strip()
    stderr = result.stderr.strip()
    combined = stdout + "\n" + stderr

    if result.returncode == 0:
        if stdout:
            print(f"  {stdout}")
        if stderr:
            print(f"  {C.DIM}{stderr}{C.RESET}")
        ok("Push réussi !")
        return

    # ── Diagnostic d'erreurs connus ──────────────────────────────────── #

    error("Échec du push. Analyse de l'erreur…\n")

    if "set-upstream" in combined or "no upstream branch" in combined:
        warn(
            "La branche n'existe pas encore sur le remote.\n"
            f"  Lancez : git push --set-upstream origin {branch}"
        )
        if confirm("Exécuter git push --set-upstream maintenant ?", default_yes=True):
            r2 = run(
                ["git", "push", "--set-upstream", "origin", branch],
                cwd=repo_path,
                capture=False,
            )
            if r2.returncode == 0:
                ok("Push avec upstream réussi !")
                return
            else:
                abort("Échec du push --set-upstream.")
        else:
            abort("Push annulé.")

    elif "rejected" in combined or "non-fast-forward" in combined:
        warn(
            "Le remote contient des commits que vous n'avez pas localement.\n"
            "  Le push a été rejeté pour éviter d'écraser le travail des autres.\n"
            "  Solution : récupérez d'abord les changements distants :\n"
            f"    git pull origin {branch}\n"
            "  Puis relancez ce script."
        )
        abort("Push rejeté — faites un git pull d'abord.")

    elif "denied" in combined or "Permission" in combined:
        # GitHub formate ce refus ainsi : "ERROR: Permission to user/repo.git denied to wronguser."
        denied_match = re.search(r"denied to (\S+?)\.", combined)
        denied_user = denied_match.group(1) if denied_match else None

        if denied_user and denied_user in ALLOWED_GITHUB_USERS:
            # Ce compte EST légitime sur ce dépôt (collaborateur connu).
            # Le refus peut venir d'un socket SSH périmé (cause fréquente,
            # cf. "Connection reset by peer" / "already exists, disabling
            # multiplexing") plutôt que d'un vrai problème de droits.
            # On nettoie le socket et on retente une fois avant d'abandonner.
            warn(
                f"Push refusé pour '{denied_user}', mais ce compte est un\n"
                f"  collaborateur connu de ce dépôt ({', '.join(ALLOWED_GITHUB_USERS)}).\n"
                "  Nettoyage du socket SSH et nouvelle tentative…"
            )
            clear_stale_ssh_socket()
            ensure_persistent_ssh_config()
            r2 = run(["git", "push", "origin", branch], cwd=repo_path, capture=True)
            if r2.returncode == 0:
                ok(f"Push réussi au deuxième essai (compte : {denied_user}).")
                return
            error(f"Toujours refusé après nouvelle tentative.\n  {r2.stderr.strip()}")
            abort(
                f"'{denied_user}' est censé être collaborateur mais le push échoue quand même.\n"
                f"  Ce n'est plus un problème de connexion SSH à ce stade — vérifiez côté GitHub :\n"
                f"    1. https://github.com/khafid1506/CV-ATS-Optimizer/settings/access\n"
                f"       → '{denied_user}' doit apparaître avec un accès Write (pas Pending)\n"
                f"    2. https://github.com/khafid1506/CV-ATS-Optimizer/invitations\n"
                f"       → si une invitation traîne, le compte '{denied_user}' doit l'accepter"
            )
        else:
            warn(
                "Erreur d'authentification / permissions refusées.\n"
                "  Causes possibles :\n"
                "    1. Mauvais compte SSH actif → lancez github_auth_setup.py option 3\n"
                "    2. Token PAT expiré         → générez-en un nouveau sur GitHub\n"
                "    3. Vous n'êtes pas collaborateur de ce dépôt\n"
                f"  Sortie Git : {stderr}"
            )
            abort("Accès refusé.")

    elif "Could not resolve host" in combined or "timeout" in combined.lower():
        warn(
            "Problème réseau — impossible de joindre GitHub.\n"
            "  Vérifiez votre connexion internet et réessayez."
        )
        abort("Erreur réseau.")

    else:
        # Erreur inconnue : on affiche la sortie brute pour diagnostiquer
        error("Erreur non reconnue :")
        print(f"  {C.RED}{stderr or stdout}{C.RESET}")
        abort("Push échoué.")


# ─────────────────────────────────────────────────────────────────────────────
# Vérification post-push
# ─────────────────────────────────────────────────────────────────────────────

def post_push_info(repo_path: str, branch: str, remote_url: str) -> None:
    """
    Affiche des informations utiles après un push réussi :
        - Hash du dernier commit
        - Lien direct vers le commit sur GitHub (si remote GitHub détecté)
    """
    header("Résumé post-push")

    # Récupère le hash court du commit qui vient d'être poussé
    result = run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=repo_path,
        capture=True,
    )
    commit_hash = result.stdout.strip() if result.returncode == 0 else "???"

    ok(f"Dernier commit poussé : {C.BOLD}{commit_hash}{C.RESET}")
    info(f"Branche : {branch}")

    # Construit le lien GitHub si l'URL de remote est reconnue
    github_match = re.search(r"github\.com[:/](.+?)(?:\.git)?$", remote_url)
    if github_match:
        repo_slug = github_match.group(1)
        commit_url  = f"https://github.com/{repo_slug}/commit/{commit_hash}"
        branch_url  = f"https://github.com/{repo_slug}/tree/{branch}"
        info(f"Voir le commit  : {commit_url}")
        info(f"Voir la branche : {branch_url}")

    print()


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée principal
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    """
    Analyse les arguments de la ligne de commande.
    --path permet de cibler un dépôt différent du dossier courant.
    """
    parser = argparse.ArgumentParser(
        description="Commit & push Git sécurisé avec checks et alertes."
    )
    parser.add_argument(
        "--path",
        default=os.getcwd(),
        help="Chemin vers le dépôt Git (défaut : dossier courant)",
    )
    parser.add_argument(
        "--no-ai",
        action="store_true",
        default=False,
        help="Désactive la génération IA du message de commit (saisie manuelle)",
    )
    parser.add_argument(
        "--llm-provider",
        choices=["ollama", "anthropic"],
        default=os.environ.get("LLM_PROVIDER", AI_PROVIDER_DEFAULT),
        help=(
            "Fournisseur IA pour le message de commit : "
            "'ollama' (local, gratuit, défaut — pour les tests) ou "
            "'anthropic' (Claude, nécessite ANTHROPIC_API_KEY — pour la prod). "
            "Peut aussi être réglé via la variable d'environnement LLM_PROVIDER."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_path = str(Path(args.path).resolve())

    print(f"\n{C.BOLD}{C.CYAN}{'═' * 60}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}   GIT COMMIT & PUSH — Script d'administration{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}{'═' * 60}{C.RESET}")
    print(f"  Dépôt : {repo_path}")
    if not args.no_ai:
        provider_label = "Ollama (local, gratuit)" if args.llm_provider == "ollama" else "Claude / Anthropic (API)"
        print(f"  IA    : {provider_label}\n")
    else:
        print(f"  IA    : désactivée (--no-ai)\n")

    # ── Phase 1 : Checks préliminaires ───────────────────────────────── #
    header("Vérifications préliminaires")

    check_git_installed()
    check_is_git_repo(repo_path)
    remote_url = check_remote(repo_path)
    branch     = check_branch(repo_path)
    check_protected_branch(branch)

    # Connexion SSH persistante + vérification de l'identité GitHub active
    # (uniquement pertinent pour une remote SSH, pas HTTPS)
    if remote_url.startswith("git@") or "ssh://" in remote_url:
        ensure_persistent_ssh_config()
        check_github_ssh_identity()

    # ── Phase 2 : Analyse des modifications ──────────────────────────── #
    header("Fichiers modifiés")

    files = get_status(repo_path)
    check_no_changes(files)
    check_merge_conflicts(files)

    print(f"  {len(files)} fichier(s) détecté(s) :\n")
    display_status(files)

    check_sensitive_files(files)

    # ── Phase 3 : Staging (nécessaire pour que l'IA lise le diff réel) ─── #
    git_add(repo_path)

    # ── Phase 4 : Message de commit (IA, avec fallback manuel) ─────────── #
    commit_msg = ask_commit_message_ai(repo_path, use_ai=not args.no_ai, provider=args.llm_provider)

    # ── Phase 5 : Récapitulatif et confirmation ─────────────────────────── #
    show_summary(branch, remote_url, files, commit_msg)

    if not confirm(
        f"\n  Tout semble correct. Lancer commit → push ?",
        default_yes=True
    ):
        abort("Opération annulée par l'utilisateur.")

    # ── Phase 6 : Exécution ─────────────────────────────────────────────── #
    git_commit(repo_path, commit_msg)
    git_push(repo_path, branch)

    # ── Phase 7 : Résumé final ────────────────────────────────────────── #
    post_push_info(repo_path, branch, remote_url)

    print(f"{C.GREEN}{C.BOLD}  ✔  Tout s'est bien passé !{C.RESET}\n")


if __name__ == "__main__":
    main()
