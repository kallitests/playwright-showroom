#!/usr/bin/env python3
"""
Script pour remplacer un ancien username GitHub par un nouveau
dans l'URL du remote 'origin' de tous les repos git trouvés
dans un dossier parent donné.

Usage:
    python update_github_username.py <dossier_parent> <ancien_username> <nouveau_username> [--host alias]
    python update_github_username.py <ancien_username> <nouveau_username> [--host alias]  (dossier courant)

L'option --host permet de remplacer aussi 'github.com' par un alias SSH
défini dans ~/.ssh/config (utile si tu as plusieurs comptes GitHub avec
des clés différentes, ex: github-khafidmedheb).

Exemples:
    python update_github_username.py "C:\\Users\\moi\\kallitests" khafid1506 kallitests
    python update_github_username.py khafid1506 khafidmedheb --host github-khafidmedheb
"""

import subprocess
import sys
from pathlib import Path


def get_remote_url(repo_path: Path) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(repo_path), "remote", "get-url", "origin"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def set_remote_url(repo_path: Path, new_url: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(repo_path), "remote", "set-url", "origin", new_url],
        capture_output=True, text=True
    )
    return result.returncode == 0


def main():
    raw_args = sys.argv[1:]

    # Extraction de --host <alias> s'il est présent, n'importe où dans les args
    ssh_host_alias = None
    if "--host" in raw_args:
        idx = raw_args.index("--host")
        if idx + 1 >= len(raw_args):
            print("Erreur : --host nécessite une valeur, ex. --host github-khafidmedheb")
            sys.exit(1)
        ssh_host_alias = raw_args[idx + 1]
        del raw_args[idx:idx + 2]

    # Usage avec dossier explicite : upgu <dossier> <ancien> <nouveau> [--host alias]  (3 args restants)
    # Usage depuis le dossier courant : upgu <ancien> <nouveau> [--host alias]          (2 args restants)
    if len(raw_args) == 3:
        parent_dir = Path(raw_args[0]).expanduser().resolve()
        old_user = raw_args[1]
        new_user = raw_args[2]
    elif len(raw_args) == 2:
        parent_dir = Path.cwd()
        old_user = raw_args[0]
        new_user = raw_args[1]
    else:
        print("Usage: python update_github_username.py [dossier_parent] <ancien_username> <nouveau_username> [--host alias]")
        print("Si [dossier_parent] est omis, le dossier courant est utilisé.")
        sys.exit(1)

    if not parent_dir.is_dir():
        print(f"Erreur : le dossier '{parent_dir}' n'existe pas.")
        sys.exit(1)

    # On cherche tous les sous-dossiers contenant un .git
    repos = [p.parent for p in parent_dir.glob("*/.git") if p.is_dir()]

    if not repos:
        print(f"Aucun dépôt git trouvé directement dans '{parent_dir}'.")
        sys.exit(0)

    print(f"{len(repos)} dépôt(s) trouvé(s) dans '{parent_dir}'.\n")

    updated = 0
    skipped = 0

    for repo in sorted(repos):
        url = get_remote_url(repo)
        if url is None:
            print(f"[IGNORÉ] {repo.name} : pas de remote 'origin'")
            skipped += 1
            continue

        # Remplace le username uniquement s'il apparaît juste après github.com/ ou github.com:
        old_marker_https = f"github.com/{old_user}/"
        old_marker_ssh = f"github.com:{old_user}/"

        if old_marker_https in url:
            # --host n'a de sens que pour SSH ; en HTTPS on ignore cette option
            new_url = url.replace(old_marker_https, f"github.com/{new_user}/")
        elif old_marker_ssh in url:
            new_host = ssh_host_alias if ssh_host_alias else "github.com"
            new_url = url.replace(old_marker_ssh, f"{new_host}:{new_user}/")
        else:
            print(f"[IGNORÉ] {repo.name} : username '{old_user}' non trouvé dans l'URL ({url})")
            skipped += 1
            continue

        if set_remote_url(repo, new_url):
            print(f"[OK] {repo.name} : {url}  ->  {new_url}")
            updated += 1
        else:
            print(f"[ERREUR] {repo.name} : échec de la mise à jour")
            skipped += 1

    print(f"\nTerminé. {updated} dépôt(s) mis à jour, {skipped} ignoré(s)/échoué(s).")

    # --- Vérification finale ---
    print("\n--- Vérification finale des remotes ---\n")
    new_host_for_check = ssh_host_alias if ssh_host_alias else "github.com"
    all_ok = True
    for repo in sorted(repos):
        url = get_remote_url(repo)
        if url is None:
            print(f"[?] {repo.name} : pas de remote 'origin'")
            continue

        if f"github.com/{new_user}/" in url or f"{new_host_for_check}:{new_user}/" in url:
            print(f"[OK] {repo.name} : {url}")
        elif f"github.com/{old_user}/" in url or f"github.com:{old_user}/" in url:
            print(f"[A REFAIRE] {repo.name} : {url}  (toujours sous l'ancien username)")
            all_ok = False
        else:
            print(f"[INFO] {repo.name} : {url}  (username différent de l'ancien et du nouveau)")

    if all_ok:
        print("\nTous les dépôts vérifiés sont à jour avec le nouveau username.")
    else:
        print("\nCertains dépôts contiennent encore l'ancien username, vérifie les lignes [A REFAIRE].")


if __name__ == "__main__":
    main()
