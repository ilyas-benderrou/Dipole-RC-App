# RC-Lab – Charge, décharge, comprends.

Application web éducative, intelligente et adaptative pour maîtriser la leçon **Dipôle RC : charge et décharge d’un condensateur** (2ème année du baccalauréat, PC et SM).
Projet réalisé dans le cadre du master « Système éducatif intelligent et communicant » (ENS Fès).

- **Apprenant** : vidéo d’introduction V0 + question de compréhension, cinq leçons animées (vidéo de 30 s, question flash, mini-mission de simulation), laboratoire interactif (simulation exacte, 8 missions), exercices adaptatifs facile → moyen → difficile, bilan. Le tuteur **Capi** encourage et présente les indices, sans jamais donner la réponse.
- **Diagnostic** de six erreurs fréquentes (E1 à E6) : indice → micro-vidéo + mission de simulation → exercice de remédiation → alerte au professeur.
- **Professeur** : vue classe, fiche apprenant, erreurs fréquentes, questionnaire diagnostique (codage CRI), pré-test et post-test papier (versions imprimables, saisie des copies, import CSV), analyse de l’expérimentation (Welch, d de Cohen, gain normalisé), références, exports CSV.

## Lancer l’application (Windows, macOS, Linux)

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
```

```bash
npm run dev
```

Ouvre ensuite l’adresse affichée (par défaut http://localhost:5173). Aucune configuration n’est nécessaire : les données sont stockées dans le navigateur (localStorage) et des **données de démonstration fictives** sont chargées au premier lancement.

### Autres commandes

| Commande | Rôle |
| --- | --- |
| `npm test` | Tests Vitest (physique, générateurs d’exercices, diagnostic, moteur adaptatif, missions, instruments, statistiques, démo) |
| `npm run build` | Vérification TypeScript puis build de production dans `dist/` |
| `npm run preview` | Sert le build de production |

## Comptes de démonstration

| Rôle | Connexion |
| --- | --- |
| Professeur | onglet « Professeur », code PIN **1234** (modifiable dans Réglages) |
| Apprenant (groupe expérimental, parcours avancé) | Salma Benali · classe `2BAC-PC-A` |
| Apprenant (alerte active sur E5) | Yassine Amrani · classe `2BAC-PC-A` |
| Apprenant (encore dans les leçons) | Nour Fassi · classe `2BAC-PC-A` |
| Apprenant (groupe diagnostic) | Meryem Saidi · classe `2BAC-PC-B` |
| Nouvel apprenant | n’importe quel prénom + nom avec le code `2BAC-PC-A` (groupe expérimental par défaut) |

Les comptes de démonstration sont aussi proposés en un clic sur la page de connexion. Un bandeau « Données fictives de démonstration » les signale ; le bouton **Réglages → Effacer les données de démo** les supprime (les vraies données sont conservées).

## Organisation du code

```
src/
  config/        app.ts (nom, tuteur, PIN par défaut) · adaptive.ts (toutes les constantes des règles d’adaptation)
  physics/       rc.ts (physique exacte, sans intégration numérique) · units.ts (unités, préfixes, saisies)
  engine/        adaptive.ts (modèle de l’apprenant, règles de la section 10) · diagnostic.ts · missionChecks.ts · rng.ts
  content/       textes validés par l’équipe : errors.ts, questionnaire.ts, tests.ts, tutor.ts, missions.ts, lessons.ts,
                 qcm.ts, references.ts, videos.ts, competences.ts, exercises/ (gabarits F1–F6, M1–M6, D1–D6)
  data/          repository.ts (interface) · localStorageRepository.ts (V1) · demo.ts · analytics.ts ·
                 instruments.ts (questionnaire CRI, copies, import CSV) · experiment.ts · stats.ts
  components/    AppShell, ui, Tex (KaTeX), VideoPlayer, charts (SVG), figures (SVG), Capi, Journey, sim/ (laboratoire)
  pages/         LoginPage · student/ (accueil, leçons, labo, exercices, questionnaire, bilan, cours) · teacher/
public/
  videos/        V0, L1–L5, M1–M6 (copiés de ../Dipole-RC-Videos/out, non réencodés)
  images/        photos (WebP), vignettes des vidéos ; illustrations 3D facultatives (voir ci-dessous)
  cours/         Cours_Dipole_RC.pdf
```

**Persistance** : toute l’application passe par l’interface `Repository` (`src/data/repository.ts`). Pour passer à Firebase (V2), il suffit d’écrire une autre implémentation de cette interface et de la renvoyer dans `createRepository()`.

## Illustrations 3D (facultatif)

L’application fonctionne sans elles : des illustrations SVG « 3D douce » dessinées par le code sont utilisées automatiquement.
Pour générer les rendus 3D avec Nano Banana (clé `GEMINI_API_KEY` lue dans `../Dipole-RC-Videos/.env`, budget plafonné à 0,40 $, registre `scripts/images-costs.json`) puis les convertir en WebP (< 200 Ko, fond transparent) :

```bash
node scripts/generate-images.mjs
```

```bash
python scripts/process-images.py
```

Vérifie ensuite qu’aucune marque ni aucun logo n’apparaît sur les images de `public/images/`.

## Vocabulaire et principes

On dit toujours « apprenant », « conducteur ohmique » pour le composant et « résistance R » pour la grandeur. Grandeurs variables en minuscules ($u_C$, $u_R$, $q$, $i$), constantes en majuscules ($E$, $Q_0$, $I_0$). Aucune réponse finale n’est donnée à l’apprenant, aucune note négative ni classement n’est affiché, et les analyses et exports utilisent des codes anonymes.

Les choix faits en autonomie sont listés dans [DECISIONS.md](DECISIONS.md).
