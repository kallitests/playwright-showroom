Je commence par l'audit du dossier `playwright-showroom` sur ton ordinateur, puis j'implémenterai les améliorations directement dedans.

**Audit terminé — points clés avant d'implémenter :**

- 🔴 `tests/e2e/checkout-flow.spec.ts` importe `pages/CartPage` qui **n'existe pas** (la classe est dans `CheckoutPage.ts`) → le fichier E2E principal ne peut pas compiler.
- 🔴 Pas de `package-lock.json` → `npm ci` du workflow GitHub Actions échoue systématiquement.
- 🟠 Le test « panier vide après logout » contredit le code source de SauceDemo (le logout ne vide pas le `localStorage`) → probablement faux, je vais le vérifier sur le site réel.
- 🟠 Pas de `.gitignore`, ni lint, ni vérif TypeScript ; `waitForTimeout`, assertions non « web-first », seuils de perf fragiles, tests « API » qui ne sont que de l'interception.
- ⚠️ **Contrainte d'exécution :** ni ton poste (VM Cowork) ni mon environnement cloud ne peuvent joindre `saucedemo.com` (proxy 403). Solution retenue : je compile le **code source officiel de SauceDemo** (`saucelabs/sample-app-web`, GitHub) et j'exécute réellement les tests dessus via `BASE_URL`, la CI GitHub ciblant le site live. J'utilise aussi ton navigateur intégré pour l'exploration live (démo MCP).

Confirmed on the live site: the cart survives logout. Now I'll log in as a different user to check for cross-user leakage.

Now the scenario catalog (single source for coverage metrics and the catalog doc).

Now the helper scripts (local SauceDemo setup, metrics summary, notifications).

Fix ROB-001 to a deterministic, conditional-free assertion via storage:

Now architecture.md.

Le repo `playwright-showroom` est mis à niveau directement dans ton dossier. La suite tourne entièrement au vert : **113 tests passés sur Chromium**, dont 5 qui reproduisent des défauts connus. Rien n'a été commité dans git, tu peux tout relire avec `git status`.

**Limite principale :** ni ton poste ni mon environnement ne pouvaient joindre `saucedemo.com`. Les tests ont donc tourné contre une copie locale de SauceDemo, construite à partir de son code source officiel publié sur GitHub et servie comme le site réel. J'ai quand même vérifié à la main dans ton navigateur les points clés sur le vrai site : catalogue, prix, identifiants des éléments, fuite du panier, erreurs 404. Le premier passage de la CI GitHub confirmera la suite sur le site réel.

**Ce qui bloquait en v1**
- `pages/CartPage.ts` manquait, donc le parcours de commande ne compilait pas et la suite s'arrêtait sans exécuter un seul test.
- Il n'y avait pas de `package-lock.json`, donc l'installation (`npm ci`) échouait toujours en CI.
- Le test « panier vide après logout » était faux. J'ai vérifié sur le site réel : le panier survit à la déconnexion et réapparaît chez l'utilisateur suivant. C'est une vraie anomalie, notée **EXP-001**.

**Ce qui a été fait**
- **Tests :** 113 tests répartis en six couches (smoke, UI, E2E, API/HTTP, régression, exploratoire).
  - Les tests démarrent connectés grâce au cookie de session, sans passer par l'écran de login.
  - Le panier est préparé directement dans le stockage du navigateur, et chaque compte de démo peut être choisi par test.
- **Catalogue :** 99 scénarios avec ID, risque, préconditions, données, étapes, résultat attendu, priorité et automatisation. Chaque titre de test porte son ID, ce qui permet de mesurer la couverture des risques (et non du code).
- **Exploratoire :** 6 anomalies documentées, chacune reproduite par un test marqué « échec attendu ». Ce test deviendra rouge le jour où le défaut sera corrigé.
- **API :** SauceDemo n'a pas d'API métier (`/api/*` répond 404). Les tests HTTP portent donc sur ce qui existe réellement (page, bundle JS, manifest, routage). J'ai ajouté une API de commandes simulée, signalée comme telle partout.
- **Qualité :** ESLint (qui interdit les attentes arbitraires), vérification TypeScript stricte et un rapporteur de métriques (taux de réussite, tests instables, défauts connus, couverture par niveau de risque).
- **CI/CD :**
  - workflow principal : lint, puis smoke, puis Chromium, Firefox et WebKit sur les PR, avec rapport fusionné ;
  - régression nocturne avec alertes Slack, Teams et email ;
  - pipeline Azure DevOps.

  Tout ce qui est externe s'active par variables d'environnement ou secrets ; sans eux, le projet tourne tel quel.
- **Docs :** `README.md` (démo de 5 minutes incluse) et `docs/test-strategy.md`, `test-catalog.md`, `exploratory-testing.md`, `architecture.md`, `mcp-examples.md`, plus `.env.example`. Je les ai écrites en anglais, comme le reste du repo ; je peux les traduire si tu préfères.

**Commandes exécutées et résultats**

| Commande | Résultat |
|---|---|
| Suite v1 avant modification | arrêtée sur l'import manquant, 0 test exécuté (et 7 échecs sur le reste) |
| `npm ci` puis `npm run check` | 0 erreur, 0 avertissement |
| Suite complète (Chromium) | 113 passés, dont 5 défauts connus reproduits |
| Suite répétée 3 fois avec 1 relance | 339 passés, aucun test instable |
| Smoke sur mobile (Pixel 5) | 9 passés |
| Injection de 2 défauts dans l'application (TVA 8 % → 9 %, message du compte verrouillé modifié) | 5 échecs, tous sur les tests ciblés, aucun ailleurs |
| `npm run saucedemo:setup` et `npm run test:local` | fonctionnent depuis un dossier vide |
| `actionlint` sur les workflows | aucune erreur |

**Non exécuté :** Firefox et WebKit (seul Chromium était disponible ici ; ils tournent dans la CI), l'image Docker et le pipeline Azure.

**À faire de ton côté**
1. Copie les 3 fichiers que l'accès distant n'a pas le droit d'écrire : `ci.yml` et `nightly-regression.yml` dans `.github/workflows/` (`ci.yml` remplace l'actuel), et `.mcp.json` à la racine.
2. Si tu veux les alertes, ajoute les secrets GitHub : `SLACK_WEBHOOK_URL`, `TEAMS_WEBHOOK_URL`, `SMTP_*`, `NOTIFY_EMAIL_TO`. Pour Azure Test Plans, ce sont les variables `AZURE_DEVOPS_*`.
3. Commit et push, puis lance la CI sur le site réel.

Pour faciliter ta relecture :
- **Fichiers supprimés :** `tests/api/intercept.spec.ts` et `tests/e2e/sorting.spec.ts`, avec ton autorisation. Leur couverture est reprise dans `tests/api/network.spec.ts` et `tests/ui/catalog.spec.ts`.
- **Fichiers non touchés :** tes dossiers `agents/` et `prompts/repo-for recruiters/`.
- **Faux positifs dans `git status` :** les scripts Python et `ci.yml` apparaissent modifiés alors que je n'y ai pas touché. Je pense que c'est un effet des fins de ligne Windows vu depuis Linux.