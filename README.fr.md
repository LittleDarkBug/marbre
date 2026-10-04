# Marbre

[Read in English](README.md)

Marbre est un éditeur de CV libre et open source. Vous composez la page aussi librement que dans un outil de mise en page, et Marbre montre ce qu'un logiciel de recrutement lira vraiment dans le PDF.

Tout fonctionne dans le navigateur. Pas de compte, pas de serveur : vos CV restent dans le navigateur ou dans un dossier de votre disque, en JSON lisible.

## Ce qu'il fait

- **Liberté de composition.** Zones de texte libres, photos (recadrées, rondes ou arrondies), formes, lignes et flèches, QR code et 1 500 icônes, placés n'importe où. Style de chaque bloc (police, taille, couleurs, fond, bordure, arrondi, alignement, opacité), plusieurs pages, couleur ou image de fond, calques, verrouillage, alignement, sélection multiple et raccourcis clavier.
- **Deux modes d'édition.** En mode structuré, vous écrivez directement sur la page et la mise en page suit : colonnes, sections, entrées, puces. En mode libre, chaque bloc se place au millimètre avec poignées, magnétisme et rotation, et un fil de lecture fixe l'ordre que suivront les logiciels de recrutement.
- **Lentille ATS.** Marbre mesure la page affichée et simule trois lecteurs :
  - **l'ordre du document :** celui que suivent pypdf, xpdf en mode brut et la plupart des analyseurs ;
  - **pdfminer :** un portage TypeScript de l'analyse de mise en page de pdfminer, la bibliothèque d'extraction la plus utilisée ;
  - **la lecture ligne à ligne :** celle de pdfplumber par défaut.

  Les problèmes apparaissent en marge sous forme de marques de correction : colonnes mélangées, date rattachée au mauvais bloc, texte trop petit, contraste faible, page qui déborde.
- **Variantes.** Une variante adapte le CV de base à une offre ou à une langue, et ne garde que ce qui change. La relecture vérifie les mots-clés de chaque offre.
- **Relecture.** Mots à éviter, emojis, espaces insécables françaises, doubles espaces, parenthèses.
- **Gabarits.** Sept gabarits, chacun exporté et vérifié par la suite de tests : Signal, Une colonne, Grille suisse, Éditorial, Technique, Portrait, Affiche.
- **Formats ouverts.** Fichiers `.marbre.json`, import et export JSON Resume.

## Pourquoi faire confiance à la lentille

Le portage de pdfminer est testé contre pdfminer.six lui-même. Les fixtures de `src/ats/fixtures` contiennent les caractères bruts de vrais PDF, avec les blocs de texte que pdfminer.six en a tirés. Le portage doit rendre les mêmes blocs, dans le même ordre.

La mesure faite dans le navigateur a aussi été comparée à pdfminer.six sur des PDF exportés : elle a donné le même ordre de lecture, bloc pour bloc.

Des règles tirées de vrais CV sont intégrées au moteur de rendu :
- **Polices :** uniquement des fichiers statiques, car une police variable est embarquée en Type 3 et colle les mots.
- **Puces :** dessinées plutôt que tapées, pour que chaque puce reste dans un seul bloc de texte.
- **Dates :** placées par défaut après leur titre.
- **Positionnement :** aucun texte positionné en mode structuré, car Chrome peint les éléments positionnés après tout le reste.

## Démarrer

```sh
npm install
npm run dev
```

Ouvrez l'adresse affichée par Vite. Choisissez un gabarit, ou importez un fichier `.marbre.json` ou JSON Resume.

Pour obtenir un PDF, imprimez depuis un navigateur Chromium (Chrome, Edge, Brave) avec « Enregistrer au format PDF », sans marges, graphiques d'arrière-plan activés.

## Ligne de commande

La CLI rend la page avec le même moteur dans Chrome ou Edge sans interface, puis vérifie chaque PDF.

```sh
npm run build
node cli/bin.mjs export mon-cv.marbre.json --all --out pdf
node cli/bin.mjs verify pdf/mon-cv.pdf
node cli/bin.mjs variant mon-cv.marbre.json offre.marbre.json
```

`export --all` produit un PDF par variante. Pour chaque PDF, il contrôle :
- le nombre de pages ;
- l'absence de polices Type 3 ;
- que chaque titre, date et puce commence bien sa ligne dans le texte extrait ;
- le verdict de la lentille ATS.

## Développement

```sh
npm run check   # lint, types, tests unitaires
npm run e2e     # Playwright, bureau et mobile
npm run fonts   # régénère les chargeurs de polices après modification de src/render/fontLibrary.ts
```

Lisez `AGENTS.md` et `DESIGN.md` avant de contribuer. Les commentaires tiennent sur une ligne au plus, une règle de lint y veille.

## Licence

MIT
