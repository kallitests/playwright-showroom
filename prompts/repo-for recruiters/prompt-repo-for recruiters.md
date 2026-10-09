Voici un prompt compact, conçu pour être collé dans Claude Code, Cursor ou un agent IA de développement, avec le dossier local `playwright-showroom` comme contexte. L'objectif est de transformer le repo existant en véritable vitrine technique pour un recruteur Senior QA Automation / SDET, sans réécrire inutilement ce qui fonctionne déjà.

# Mission — Upgrade du repo `playwright-showroom`

Agis comme un **Senior SDET / QA Automation Architect expert Playwright, TypeScript, API testing, Playwright CLI, MCP et CI/CD**.

## 1. Audit préalable

Analyse le dossier local `playwright-showroom` et son historique/configuration disponibles. Identifie la stack existante, les tests, les lacunes, les duplications et les améliorations prioritaires. **Réutilise et améliore l'existant ; ne reconstruis pas le projet à zéro.** Ne prétends jamais avoir exécuté un test sans l'avoir réellement fait.

## 2. Objectif produit

Créer un showroom QA professionnel, démontrable en entretien, utilisant exclusivement [SauceDemo](https://www.saucedemo.com/) comme application métier et ses interfaces réellement accessibles.

Démontrer la maîtrise complémentaire de :

- Playwright CLI et TypeScript : UI, API, E2E, smoke, régression.
- Playwright MCP : exploration assistée par navigateur, découverte de scénarios, investigation et génération de tests reproductibles.
- Tests exploratoires structurés, analyses de risques et cas limites.
- CI/CD GitHub Actions, exécution parallèle, traces, screenshots, vidéos et artefacts.
- Reporting HTML Playwright et intégration Azure DevOps Test Plans / résultats, si configurée.
- Alerting Teams/Slack/email via adaptateurs optionnels, sans secrets dans le code.

## 3. Scénarios métier et pain points

Construis une matrice de tests orientée risques, couvrant notamment :

- Authentification : identifiants invalides, utilisateur verrouillé, champs vides, erreurs et déconnexion.
- Catalogue : affichage, tri, navigation, données incohérentes.
- Panier : ajout/retrait, quantités, état persistant, synchronisation UI/API si réellement supportée.
- Checkout : champs invalides, validation, récapitulatif, total, confirmation et parcours interrompus.
- Robustesse : double clic, rafraîchissement, navigation arrière, sessions et états inattendus.
- Régression : parcours critiques et contrôles transverses.
- Exploratoire : heuristiques, risques, anomalies reproductibles et idées de nouveaux tests.

Utilise les comptes de démonstration et contraintes documentés par SauceDemo. Ne suppose pas l'existence d'endpoints API métier non vérifiés. Pour les tests API, inspecte les ressources réellement disponibles ; si SauceDemo ne fournit pas d'API publique adaptée, démontre les tests HTTP sur des ressources observables et/ou crée un contrat API mocké clairement identifié, sans le présenter comme une API réelle du produit.

## 4. Cas de test et architecture

Pour chaque scénario, documente : ID, objectif, risque, préconditions, données, étapes, résultat attendu, priorité, type de test et automatisation associée.

Privilégie des cas de test en langage naturel structuré, **pas de Gherkin par défaut**. N'introduis Cucumber que si sa valeur est justifiée.

Organise les tests par couches et responsabilités : smoke, API, UI, E2E, régression, exploratoire. Utilise fixtures, Page Objects uniquement lorsqu'ils apportent une vraie valeur, composants réutilisables, assertions robustes, sélecteurs accessibles et données isolées. Évite les attentes arbitraires, les tests dépendants de l'ordre d'exécution et les abstractions excessives.

## 5. CLI, MCP et démonstration IA

Fournis des commandes reproductibles pour lancer chaque suite, un test ciblé, les tests en mode headed/debug et le reporting.

Documente l'usage de Playwright MCP pour explorer le site, identifier les risques et investiguer une anomalie, puis convertir les découvertes en tests CLI déterministes. Sépare clairement tests automatisés classiques, assistance MCP et éventuels tests expérimentaux avec IA.

## 6. CI/CD, reporting et qualité

Améliore les workflows GitHub Actions : lint, vérification TypeScript, smoke sur PR, suites ciblées, régression planifiée, matrice de navigateurs si pertinente, publication des rapports et conservation des traces en cas d'échec.

Prévois des intégrations Azure DevOps et alerting activables par variables d'environnement/secrets. En leur absence, le projet doit rester exécutable localement et dans GitHub Actions.

Expose des indicateurs utiles : taux de réussite, durée, flaky tests, couverture des risques/scénarios, défauts détectés et historique des exécutions lorsque les données sont disponibles. Ne confonds pas couverture de tests et couverture de code.

## 7. Livrables et exécution

Produis ou mets à jour :

- `README.md` : installation, architecture, commandes, exemples de résultats et démonstration recruteur.
- `docs/test-strategy.md` : stratégie, pyramide, risques et critères d'entrée/sortie.
- `docs/test-catalog.md` : catalogue des scénarios et matrice de couverture.
- `docs/exploratory-testing.md` : charters, heuristiques, anomalies et restitution.
- `docs/architecture.md` : CLI, MCP, API, CI/CD, reporting et alerting.
- Les tests, fixtures, configuration Playwright et workflows nécessaires.
- `.env.example` sans secrets, et scripts de lancement simples.

## 8. Méthode et critères d'acceptation

Procède par étapes : audit → plan priorisé → implémentation → exécution réelle → correction → documentation finale.

Priorise les améliorations à forte valeur recruteur. Vérifie les URLs, endpoints, dépendances et intégrations avant de les utiliser. Ne détruis aucune fonctionnalité existante. Ne simule jamais un résultat réel.

À la fin, fournis un bilan : changements effectués, fichiers concernés, commandes exécutées, tests passés/échoués/non exécutés, limites connues, configuration externe requise et démonstration de 5 minutes pour un entretien.

Commence par l'audit du repo local, puis implémente les améliorations directement dans ce dossier. Si une décision exige une information inaccessible, explicite l'hypothèse et privilégie la solution la plus simple, vérifiable et maintenable.

## Mon conseil pour maximiser l'impact en entretien

Le showroom doit raconter une histoire : un risque métier → un test ciblé → une détection → un rapport exploitable → une décision de livraison.

Je mettrais en avant ces cinq démonstrations :

1. Smoke tests en moins d'une minute : vérifier rapidement que les fonctions critiques sont opérationnelles.
2. CLI vs MCP : montrer la différence entre un test automatisé reproductible et une exploration assistée par IA.
3. UI + API : illustrer la complémentarité des vérifications, sans inventer d'API SauceDemo.
4. CI/CD : ouvrir une PR et montrer les résultats, traces et artefacts d'échec.
5. Pilotage QA : présenter une matrice risques/scénarios et un reporting compréhensible par le Product Owner.

Le point différenciant : ne pas se contenter d'accumuler des tests. Montre que tu sais choisir les bons tests, réduire le risque de livraison, diagnostiquer les échecs et industrialiser la qualité. C'est ce qui positionne le projet comme une vitrine SDET plutôt qu'un simple tutoriel Playwright.