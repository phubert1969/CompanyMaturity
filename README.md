# Diagnostic de maturité IA

Ce projet est un outil de diagnostic de maturité IA destiné à évaluer la posture d’une entreprise sur plusieurs axes (données, organisation, compétences, usage de l’IA, etc.).

Le système repose sur l'architecture suivante :

- un backend Python qui sert les pages HTML et les API,
- un classeur Excel qui contient la grille de questions et le référentiel de maturité,
- des scripts JavaScript qui rendent les rapports et les plans d’action,
- des pages statiques HTML qui composent l’interface utilisateur.

Le questionnaire commence par un profil du répondant, composé de questions sur le motif de l’évaluation, la taille de l’entreprise, le secteur d’activité, le niveau hiérarchique et le métier / département. La question de localisation n’a pas été conservée car elle n’apporte pas de valeur ajoutée pour le diagnostic.

## 1. Vue d’ensemble de l’architecture

### Backend

Le point d’entrée principal est [serve.py](serve.py) qui gère :
- l’authentification utilisateur,
- la création / connexion des comptes,
- la récupération des rapports enregistrés,
- la sauvegarde des fichiers HTML et JSON exportés,
- la lecture du référentiel métier depuis le fichier Excel.

Le backend nous donne deux types de services :
- des routes statiques pour servir les pages du site,
- des routes API pour les échanges JSON entre le navigateur et le serveur.

### Référentiel métier

Le cœur métier est dans le module [maturity_config.py](maturity_config.py) qui :
- ouvre le classeur Excel [Data/Matrice_Roadmap_Maturite_IA_V3.xlsm](Data/Matrice_Roadmap_Maturite_IA_V3.xlsm),
- extrait les questions, les options de score et les niveaux de maturité,
- transforme les réponses d’un questionnaire en rapport enrichi,
- calcule les moyennes par axe, par stade et la maturité générale,
- produit les forces, les points de vigilance et les plans d’action.

### Frontend

Les fichiers JavaScript dans [js](js) rendent les pages en fonction des données du rapport.

Les composants principaux sont :
- [js/formulaire-ia.js](js/formulaire-ia.js) : questionnaire et soumission,
- [js/resultats-ia.js](js/resultats-ia.js) : génération du rapport complet,
- [js/forces-vigilances.js](js/forces-vigilances.js) : forces et points de vigilance,
- [js/plan-court-terme.js](js/plan-court-terme.js) : plan d’action court terme,
- [js/plan-moyen-terme.js](js/plan-moyen-terme.js) : plan d’action moyen terme,
- [js/analyse-detaillee.js](js/analyse-detaillee.js) : analyse détaillée par axe,
- [js/scores-axes.js](js/scores-axes.js) : affichage des scores par axe.

## 2. Flux de données principal

1. L’utilisateur ouvre le questionnaire depuis la page [maturityIA.html](maturityIA.html).
2. Le navigateur demande les questions depuis le référentiel Excel ou à partir d’un fichier de configuration généré côté backend.
3. L’utilisateur répond au questionnaire.
   - Le profil de réponse est enrichi avec le niveau hiérarchique et le métier / département du répondant.
4. Les réponses sont envoyées au serveur via une API JSON.
5. Le backend envoie les réponses à `enrich_report()` dans [maturity_config.py](maturity_config.py).
6. Cette fonction calcule :
   - la moyenne globale,
   - la moyenne par axe,
   - la moyenne par stade,
   - le niveau de maturité,
   - les questions les plus fortes,
   - les questions les plus faibles,
   - les actions d’amélioration à court et moyen terme.
7. Le rapport enrichi est renvoyé au frontend, qui l’affiche de façon synthétique et détaillée.
8. L’utilisateur peut exporter le rapport en HTML ou JSON.

## 3. Algorithme de calcul des forces et des points de vigilance

La logique est centralisée dans `enrich_report()`.

### Étape 1 : normalisation des réponses
Chaque réponse du questionnaire est transformée en objet contenant :
- l’identifiant de la question,
- l’axe concerné,
- le stade associé,
- le score numérique,
- le libellé du niveau choisi,
- l’analyse de diagnostic associée.

### Étape 2 : calcul des moyennes
Le script calcule ensuite :
- `axes` : moyenne par axe,
- `stages` : moyenne par stade,
- `overall` : moyenne globale.

La moyenne est simplement :

$$
\text{moyenne} = \frac{\sum \text{scores}}{\text{nombre de questions}}
$$

### Étape 3 : sélection des forces et vigilances
Le système regroupe une réponse par couple axe/stade, puis classe ces réponses selon deux critères : le score, puis le rang du stade. Ce rang suit l’ordre des stades défini par le classeur Excel ; les noms des stades ne sont donc pas convertis en nombres.

- Pour les `strengths`, le score est trié du plus élevé au plus faible. À score égal, le stade le plus avancé est prioritaire.
- Pour les `watchPoints`, le score est trié du plus faible au plus élevé. À score égal, le stade le plus précoce est prioritaire.
- Les trois premières réponses de chaque classement sont retenues.
- Si deux réponses ont le même score et le même stade, l’ordre des axes établi par le classeur est conservé.

Les forces sont affichées avec leur diagnostic `acquired`, tandis que les vigilances utilisent le diagnostic `blocker`. Le tri sert donc à sélectionner les réponses pertinentes ; le texte associé provient du référentiel métier.

### Étape 4 : diagnostic textuel
Chaque question est associée à plusieurs libellés d’analyse à partir du classeur Excel :
- `acquired` : ce qui est déjà acquis,
- `blocker` : ce qui bloque la progression,
- `capability` : capacité à développer,
- `action` : action recommandée,
- `outcome` : résultat attendu.

Cela permet d’afficher des recommandations qui ne se limitent pas à un score brut, mais à une explication qualitative.

## 4. Algorithme du plan d’action à court terme

Le plan court terme est construit à partir des questions les plus critiques.

Le principe est :
- sélectionner les questions les plus faibles,
- prendre leur analyse de type `action`,
- les afficher dans une liste ordonnée et facile à lire.

Le but est de donner une première vague d’actions immédiates avant de passer à une transformation plus structurée.

## 5. Algorithme du plan d’action à moyen terme

Le plan moyen terme suit une logique de progression par palier.

Pour chaque axe :
1. on trie les questions par score croissant,
2. on sélectionne les deux plus faibles,
3. si une question fait partie des trois vigilances globales, ou si son score est zéro, sa cible augmente d’un point (sans dépasser 5) ; sinon sa cible reste son score actuel,
4. on reprend la recommandation du niveau précédant cette cible pour construire l’action.

En clair, les points les plus critiques sont orientés vers le palier suivant, tandis que les autres actions consolident le niveau actuel à partir des recommandations du palier précédent.

Cela évite d’avoir un plan trop agressif ou irréaliste pour une organisation qui vient juste de lancer sa démarche.

## 6. Rôle de l’Excel

Le classeur Excel est la source de vérité du modèle de maturité.

Il contient :
- les 15 questions,
- les 5 axes de maturité,
- les 3 stades de progression,
- les analyses de chaque niveau de score,
- les recommandations liées à chaque question.

La correspondance des scores globaux est : 0 « Inexistant », 1 « En friche », 2 « En exploration », 3 « En chantier », 4 « En exploitation » et 5 « En pilotage ». La moyenne est arrondie à l’entier le plus proche ; lorsqu’elle atteint exactement un demi-point, elle est affectée au niveau supérieur.

Le code Python lit le fichier .xlsm avec `zipfile` et parse les XML internes du document Office.

C’est une architecture robuste car elle permet :
- de modifier le référentiel sans toucher au code Python,
- d’ajouter ou reconfigurer des questions dans le fichier Excel,
- de conserver une logique métier centralisée dans un document qu’un métier peut comprendre.

## 7. Rôle des fichiers JavaScript

Les scripts frontend servent surtout à :
- composer les sections HTML du rapport,
- tracer le radar des axes,
- afficher les barres de moyenne par stade,
- formater les données en cartes lisibles,
- rendre les plans d’action et les analyses détaillées.

Il s’agit d’une logique de rendu, tandis que les calculs métier restent du côté backend (dans [maturity_config.py](maturity_config.py)).

## 8. Lancement du projet

Depuis la racine du projet :

```bash
python serve.py
```

Ensuite, ouvrez le site dans le navigateur :

```text
http://127.0.0.1:8765
```

## 9. Points d’attention

- Les rapports sont sauvegardés dans le dossier [Rapports](Rapports).
- Les comptes utilisateur sont stockés dans le dossier `.private`.
- Le fichier [Data/Matrice_Roadmap_Maturite_IA_V3.xlsm](Data/Matrice_Roadmap_Maturite_IA_V3.xlsm) est le référentiel fonctionnel du projet.
- Les fichiers JavaScript sont des composants de rendu ; les décisions métier sensibles sont calculées côté Python.

## 10. Conclusion

Le projet illustre un schéma classique :

- données source dans un fichier métier Excel,
- logique métier calculée côté serveur,
- interface utilisateur statique et légère en frontend,
- génération de rapports lisibles et actionnables.

L’architecture est volontairement simple pour rester maintenable, explicite et facilement évolutive.
