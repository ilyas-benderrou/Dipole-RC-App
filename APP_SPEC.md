# RC-LAB — Cahier des charges pour Claude Code

> **Instruction pour Claude Code :** lis ce fichier en entier, puis construis **toute l'application, toutes les phases de la section 17 d'un seul coup, sans t'arrêter pour demander ma validation et sans me poser de questions**. À la fin de chaque phase, vérifie toi-même que `npm run dev` démarre et que `npm test` passe, corrige les erreurs, puis enchaîne sur la phase suivante. Si un point est ambigu, fais le choix le plus raisonnable, note-le dans `DECISIONS.md` et continue. À la toute fin seulement : un résumé court et les commandes pour lancer l'app.
>
> **Projet de référence :** `../Ohmigo` (même master, même professeur) est une application déjà construite sur le même modèle. **Réutilise sa structure et son code** (repository localStorage, modèle de l'apprenant, moteur adaptatif, tableau de bord, composants `Tex`, `VideoPlayer`, `charts`) en les adaptant. Ne modifie rien dans `../Ohmigo`.

---

## 1. Présentation

**RC-Lab** (nom provisoire, configurable dans `src/config/app.ts`) est une application web éducative, intelligente et adaptative, destinée aux apprenants de **2ème année du baccalauréat (PC et SM)** pour maîtriser la leçon **Dipôle RC : charge et décharge d'un condensateur**.

- L'apprenant regarde une vidéo d'introduction, apprend avec cinq leçons animées courtes, **expérimente dans une simulation interactive**, puis résout des exercices de difficulté croissante (facile → moyen → difficile).
- L'application **diagnostique six erreurs fréquentes** (E1 à E6) et répond de façon ciblée : indice → micro-vidéo + mission de simulation → exercice de remédiation → alerte au professeur.
- Le **questionnaire diagnostique** est passé dans l'application. Le **pré-test et le post-test sont passés sur papier en classe** ; le professeur saisit ensuite les copies dans l'application pour l'analyse.
- Le professeur suit chaque apprenant, la classe et les **résultats de l'expérimentation** (groupe expérimental contre groupe témoin) dans un **tableau de bord** avec analyses statistiques.

Slogan : *RC-Lab – Charge, décharge, comprends.*

Projet réalisé dans le cadre du master « Système éducatif intelligent et communicant » (ENS Fès).

---

## 2. Principes pédagogiques (non négociables)

1. **Ne jamais donner la réponse finale** d'un exercice à l'apprenant, même après plusieurs erreurs.
2. **Valeurs aléatoires** à chaque nouvel exercice (jamais deux fois les mêmes valeurs pour un même gabarit et un même apprenant), avec des résultats « propres » (au plus 3 chiffres significatifs).
3. **Aide progressive** : indice d'abord, micro-vidéo et simulation ensuite, professeur en dernier.
4. **Feedback positif et précis** : « Ta méthode est juste ; vérifie la condition initiale » plutôt que « Faux ».
5. Pas de note négative visible, pas de classement entre apprenants.
6. Après 3 échecs sur la même erreur, le professeur est alerté et l'apprenant revient au niveau précédent.
7. **Le contenu pédagogique (indices, vidéos, exercices) est celui de ce fichier**, validé par l'équipe ; pas de texte pédagogique généré librement par une IA. L'« intelligence » du système = **diagnostic + choix de la bonne aide**.
8. **Vocabulaire imposé par le professeur** : on dit toujours « apprenant », jamais « élève » (interface, tuteur, exports, code, README). De même, on écrit « conducteur ohmique » pour le composant et « résistance R » pour la grandeur. Jamais « une résistance » pour le composant.
9. **Notations** : grandeurs variables en minuscules (u_C, u_R, q, i), constantes en majuscules (E, Q₀, I₀). Toutes les formules sont affichées en LaTeX (KaTeX).

---

## 3. Stack technique

Identique à Ohmigo :

- **React 19 + Vite + TypeScript**, **Tailwind CSS**, **React Router** (routage par hash), **KaTeX**.
- **Vitest** : tests obligatoires sur la physique (simulation et générateurs d'exercices), le diagnostic, le moteur adaptatif et les statistiques.
- **Courbes et schémas en SVG** générés par le code.
- **Persistance** : couche abstraite `src/data/repository.ts` ; V1 en `localStorage` avec des données de démonstration (doit marcher sans configuration) ; V2 plus tard en Firebase en changeant seulement l'implémentation.
- **Vidéos** : copier les 12 fichiers de `../Dipole-RC-Videos/out/` (`V0.mp4`, `L1.mp4` … `L5.mp4`, `M1.mp4` … `M6.mp4`) dans `public/videos/`. Ne pas les réencoder.
- Fonctionne sur **Windows** avec `npm install` puis `npm run dev`. Interface en **français**, responsive (PC et téléphone).

---

## 4. Rôles, groupes et écrans

### 4.1 Connexion
- **Apprenant** : prénom + nom + code de classe (ex. `2BAC-PC-A`). Pas de mot de passe en V1.
- **Professeur** : code PIN (V1 : `1234`, configurable).
- Chaque apprenant reçoit automatiquement un **code anonyme** (ex. `A-07`) utilisé dans les exports et les analyses.

### 4.2 Groupes de l'expérimentation
Le professeur affecte chaque apprenant à un groupe :
- **Expérimental** : accès complet (vidéos, simulation, exercices). Ses pré-test et post-test sont aussi passés sur papier, dans les mêmes conditions que le groupe témoin.
- **Témoin** : suit le cours traditionnel en classe et **n'utilise pas l'application**. Le professeur crée ses apprenants dans le tableau de bord (nom, classe, groupe) pour saisir leurs copies de pré-test et de post-test. Après le post-test, il peut leur ouvrir le parcours complet (équité).
- **Diagnostic** : groupe utilisé seulement pour le questionnaire diagnostique (analyse des besoins).

### 4.3 Espace apprenant (groupe expérimental)
1. **Accueil** : progression (niveau atteint, compétences C1–C6 en barres de couleur), bouton « Continuer ».
2. **Questionnaire ouvert** : si le professeur a ouvert le questionnaire diagnostique, une carte « À faire » apparaît en premier (voir section 13).
3. **Vidéo d'introduction V0**, puis une **question de compréhension** (K en position 1 : charge ou décharge ?). Si faux, revoir la scène concernée.
4. **Leçons L1 à L5** (vidéos de 30 s, chacune suivie d'une question flash et d'une mini-mission de simulation).
5. **Laboratoire** : la simulation en accès libre (section 6).
6. **Exercices** par niveau (sections 7 à 10).
7. **Bilan** : niveaux validés, compétences, erreurs corrigées.

### 4.4 Espace professeur (tableau de bord)
Décrit en détail dans la section 14.

---

## 5. Contenu du cours (modèle du domaine)

### 5.1 Compétences

| Code | Compétence | L'apprenant sait… | Leçon |
| --- | --- | --- | --- |
| C1 | Relations du condensateur | utiliser q = C·u_C et i = dq/dt, convertir µF/nF, associer des condensateurs | L1 |
| C2 | Équation différentielle | établir l'équation en u_C ou en q, en charge et en décharge | L2, L4 |
| C3 | Solution et u_C(t) | vérifier une solution, trouver A, B, α avec la condition initiale | L2, L4 |
| C4 | Constante de temps τ | calculer τ = RC, la lire sur une courbe (0,63E, 0,37E, tangente), prévoir l'effet de R et C | L3 |
| C5 | Courant, continuité, décharge | exprimer i(t) avec son signe, savoir que u_C est continue et i discontinue | L2, L4 |
| C6 | Énergie | calculer E_e = ½·C·u_C² | L5 |

### 5.2 Formules de référence (à afficher en LaTeX)
- `q = C\,u_C` ; `i = \dfrac{dq}{dt} = C\,\dfrac{du_C}{dt}` ; `u_R = R\,i`
- Série : `\dfrac{1}{C_e} = \sum \dfrac{1}{C_i}` ; parallèle : `C_e = \sum C_i`
- Charge : `RC\,\dfrac{du_C}{dt} + u_C = E` ; `u_C = E\left(1 - e^{-t/\tau}\right)` ; `i = \dfrac{E}{R}\,e^{-t/\tau}`
- Décharge : `RC\,\dfrac{du_C}{dt} + u_C = 0` ; `u_C = E\,e^{-t/\tau}` ; `i = -\dfrac{E}{R}\,e^{-t/\tau}`
- En q : `RC\,\dfrac{dq}{dt} + q = CE` (charge) ; `RC\,\dfrac{dq}{dt} + q = 0` (décharge)
- `\tau = RC` ; `u_C(\tau) \approx 0{,}63E` (charge) ; `u_C(\tau) \approx 0{,}37E` (décharge) ; fin pratique à `5\tau`
- `E_e = \tfrac12\,C\,u_C^2 = \tfrac12\,\dfrac{q^2}{C}`

### 5.3 Vidéos

| Fichier | Contenu | Où dans l'app |
| --- | --- | --- |
| `V0.mp4` | Introduction (≈ 4 min) | Début du parcours |
| `L1.mp4` | Le condensateur | Leçon C1 |
| `L2.mp4` | La charge | Leçon C2/C3 |
| `L3.mp4` | La constante de temps τ | Leçon C4 |
| `L4.mp4` | La décharge | Leçon C2/C3/C5 |
| `L5.mp4` | L'énergie | Leçon C6 |
| `M1.mp4` … `M6.mp4` | Remédiation des erreurs E1 … E6 | Déclenchées par le diagnostic |

Le lecteur reprend la vidéo là où l'apprenant s'est arrêté et enregistre « vue à X % » pour le tableau de bord.

---

## 6. Simulation interactive (le laboratoire)

La simulation est un composant central, utilisé à trois endroits : le laboratoire libre, les mini-missions après chaque leçon, et la **remédiation** (section 8).

### 6.1 Ce qui est affiché
- **Le schéma commun** (SVG) : générateur E à gauche ; interrupteur K en haut, position (1) reliée au générateur, position (2) reliée à une branche qui contourne le générateur ; au centre, conducteur ohmique R puis condensateur C ; flèches en convention récepteur (i vers le bas, u_R et u_C vers le haut) ; armature A en haut, B en bas.
- **Les électrons animés** : points qui circulent dans les fils à une vitesse proportionnelle à |i| ; ils s'accumulent sur l'armature B pendant la charge et **ne traversent jamais le diélectrique** (dessiné en jaune). Les signes + et − apparaissent sur A et B selon q.
- **La flèche du courant réel** (orange) : dans le sens de la flèche d'orientation quand i > 0, retournée quand i < 0.
- **Les courbes en temps réel** : u_C(t) (bleu) et i(t) (orange), avec option u_R(t), q(t) et E_e(t). Axe des temps gradué en ms ou s selon τ.
- **Les valeurs instantanées** : t, u_C, u_R, i, q, E_e, avec unités.
- **Une jauge d'énergie** ½·C·u_C².

### 6.2 Ce que l'apprenant contrôle
| Contrôle | Plage |
| --- | --- |
| E | 1 à 12 V, pas de 0,5 V |
| R | 100 Ω à 100 kΩ, valeurs normalisées (100, 220, 470 Ω ; 1 ; 2,2 ; 4,7 ; 10 ; 22 ; 47 ; 100 kΩ) |
| C | 1 µF à 1000 µF, valeurs normalisées (1 ; 2,2 ; 4,7 ; 10 ; 22 ; 47 ; 100 ; 220 ; 470 ; 1000 µF) |
| K | position 1 ou 2, à tout instant |
| Temps | lecture, pause, vitesse ×0,25 à ×4, remise à zéro |
| Outils | curseur de lecture (t, u_C, i), tangente à l'origine, repères 0,63E / 0,37E / τ / 5τ, comparaison (garde la courbe précédente en gris) |

Les repères (0,63E, 0,37E, τ, tangente) sont **cachés par défaut** dans les missions où l'apprenant doit les trouver lui-même.

### 6.3 Physique (exacte, sans intégration numérique)
Le temps de simulation est celui du circuit ; la vitesse d'affichage s'adapte pour que 6τ durent environ 8 s à vitesse ×1.

- À chaque basculement de K à l'instant t₀ avec u₀ = u_C(t₀) (**continuité de u_C**) :
  - K en 1 (charge) : `u_C(t) = E + (u_0 - E)\,e^{-(t-t_0)/\tau}`
  - K en 2 (décharge) : `u_C(t) = u_0\,e^{-(t-t_0)/\tau}`
- `i = C\,du_C/dt` calculé analytiquement (discontinu au basculement) ; `u_R = R\,i` ; `q = C\,u_C` ; `E_e = \tfrac12 C u_C^2`.
- Si R ou C change pendant une phase, la phase repart de la valeur actuelle de u_C avec le nouveau τ.
- Tests Vitest : continuité de u_C au basculement ; u_C(τ) = 0,632E en charge depuis 0 ; u_C(τ) = 0,368E en décharge depuis E ; i(0⁺) = E/R puis −E/R ; somme u_R + u_C = E en charge et 0 en décharge.

### 6.4 Missions de simulation
Une mission = une consigne + une action à faire dans la simulation + une vérification automatique.

| Id | Consigne | Vérification | Lien |
| --- | --- | --- | --- |
| S1 | « Charge le condensateur et observe le diélectrique. Les électrons le traversent-ils ? » | L'apprenant lance une charge complète puis répond oui/non | E1, L1 |
| S2 | « Double C. Que devient la charge q pour la même tension ? Et la capacité ? » | Deux réponses numériques | E2, L1 |
| S3 | « Ferme K et relève u_C et i juste après, puis après 5τ. » | 4 valeurs lues au curseur (tolérance 5 %) | E3, L2 |
| S4 | « Trouve τ sur la courbe de charge sans les repères. » | Valeur à ±5 % de τ ; la vérification affiche ensuite les repères | E5, L3 |
| S5 | « Mesure τ pour C, puis pour 2C. Que remarques-tu ? » | Rapport ≈ 2 | E5, L3 |
| S6 | « Bascule K en position 2. Quel est le signe de i ? Pourquoi ? » | Choix du signe + observation de la flèche | E6, L4 |
| S7 | « Écris l'équation qui relie u_R, u_C et E pendant la charge, puis vérifie-la avec le curseur à deux instants. » | Choix de l'équation + deux lectures cohérentes | E4, L2 |
| S8 | « Quelle énergie est stockée en fin de charge ? Vérifie avec la jauge. » | Valeur numérique ±2 % | C6, L5 |

---

## 7. Banque d'exercices (gabarits)

Les exercices viennent des cours fournis par l'équipe (cours *Dipôle RC* 2ème Bac SM de Pr. Ismaili-Alaoui ; *Séance 10 Dipôle RC* d'AlloSchool) et des **examens nationaux du baccalauréat** (2013, 2014, 2016, 2017). Chaque gabarit génère de nouvelles valeurs à chaque fois.

### 7.1 Formats de réponse
| Format | Description |
| --- | --- |
| `NUM` | Valeur numérique + choix de l'unité (ex. µC, mC, C). Tolérance ±2 % sauf mention contraire |
| `QCM` | 4 propositions ; chaque distracteur porte un code d'erreur |
| `EXPR` | Choix d'une expression ou d'une équation parmi 4 (affichées en LaTeX) ; distracteurs codés |
| `COURBE` | Courbe SVG générée avec quadrillage ; l'apprenant clique sur l'axe du temps (ou saisit la valeur lue). Tolérance ±5 % |
| `ÉTAPES` | Exercice en plusieurs questions enchaînées (niveau difficile) ; chaque question est notée et diagnostiquée séparément |

### 7.2 Valeurs utilisées par les générateurs
- E ∈ {5 ; 6 ; 9 ; 10 ; 12} V
- R ∈ {100 ; 220 ; 470 Ω ; 1 ; 2 ; 2,2 ; 4,7 ; 5 ; 10 ; 22 ; 47 ; 100 kΩ}
- C ∈ {1 ; 2 ; 2,2 ; 4,7 ; 10 ; 20 ; 22 ; 47 ; 100 ; 220 ; 470 µF} et {10 ; 20 ; 47 ; 100 nF}
- Combinaisons retenues seulement si τ s'écrit avec au plus 3 chiffres significatifs et tombe entre 1 ms et 10 s.
- Unités affichées comme dans les sujets marocains : µF, nF, kΩ, ms, mA, µC, mJ.

### 7.3 Niveau facile

| Id | Comp. | Énoncé (modèle) | Format | Réponse | Distracteurs → code | Source |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | C1 | « Un condensateur de capacité C est soumis à la tension u_C. Calcule sa charge q. » | NUM | q = C·u_C | C/u_C ou u_C/C → E2 ; puissance de 10 fausse → EX | Cours SM §I.4 |
| F2 | C1 | « Un générateur idéal de courant I₀ charge un condensateur ; la courbe u_C = f(t) est une droite de pente k (affichée). Calcule C. » | NUM | C = I₀/k | k/I₀ → E2 ; puissance de 10 → EX | Cours SM §I.4 ; Bac 2017 NS (1-1) |
| F3 | C1 | Schéma de deux condensateurs C₁, C₂ en série ou en parallèle (tirage). « Calcule la capacité équivalente. » | NUM | Série : C₁C₂/(C₁+C₂) ; parallèle : C₁+C₂ | Règle inversée → EX (association) | Cours SM §IV ; AlloSchool §II |
| F4 | C4 | « R = … et C = …. Calcule τ, puis la durée au bout de laquelle la charge est pratiquement terminée. » | NUM ×2 | τ = RC ; 5τ | Durée = τ → E5 ; ×10³ → EX | Cours SM §II.c ; Bac 2013 NS (2.4) |
| F5 | C1 | QCM conceptuels (banque de 4 items ci-dessous) | QCM | Voir 7.6 | → E1 | Recherche (E1) |
| F6 | C5 | « Juste après la fermeture de K (ou le basculement en 2), puis longtemps après : que valent u_C et i ? » (4 situations tirées au sort) | QCM | Charge : (0 ; E/R) puis (E ; 0). Décharge : (E ; −E/R) puis (0 ; 0) | u_C qui saute, i nul au départ, i non nul à la fin → E3 ; signe → E6 | Cours SM §VII ; AlloSchool ex. 2 (q. 4-5) |

Combinaisons pour F3 (résultats propres) : (1 ; 1), (2 ; 2), (3 ; 6), (4 ; 12), (6 ; 12), (2 ; 6), (12 ; 4) µF.

### 7.4 Niveau moyen

| Id | Comp. | Énoncé (modèle) | Format | Réponse | Distracteurs → code | Source |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | C2 | « Établis l'équation différentielle vérifiée par u_C (ou par q) pendant la charge (ou la décharge). » 4 situations | EXPR | `RC\,du_C/dt + u_C = E` ; `= 0` ; `RC\,dq/dt + q = CE` ; `= 0` | `R\,du_C/dt + u_C = E` (C oublié) ; second membre E au lieu de 0 ou l'inverse ; `RC\,du_C/dt - u_C = E` → E4 | Cours SM §II.a et §III.b ; Bac 2013 NS (1.2) ; Bac 2017 NS (1-3-1) |
| M2 | C3 | « La solution s'écrit u_C = A·e^(−t/τ) + B. À l'aide de la courbe (E lisible), donne A et B. » En décharge : « u_C = A·e^(−αt) ; donne A et α. » | NUM ×2 | Charge : A = −E, B = E. Décharge : A = E (condition initiale), α = 1/τ | A = E en charge ; B = 0 ; α = τ → E4 | Cours SM §II.b ; Bac 2013 NS (2.2) ; AlloSchool ex. 1 |
| M3 | C4 | Courbe de charge ou de décharge générée (E, τ aléatoires). « Détermine τ graphiquement. » | COURBE | t = τ | Lecture à 0,37E en charge (t ≈ 0,46τ), à 0,63E en décharge (t ≈ 0,46τ), à E/2 (t ≈ 0,69τ), ou au plateau (t ≥ 3τ) → E5 | Cours SM §II.c et §III.d ; AlloSchool ex. 1 (q. 4) |
| M4 | C4 | « τ = … (lu ou donné) et R = …. Calcule C. » (ou R à partir de C) | NUM | C = τ/R | R/τ ou τ·R → E2/EX ; puissance de 10 → EX | Bac 2014 NS (1.4) ; AlloSchool ex. 1 (q. 5) |
| M5 | C5 | « Pendant la décharge (ou la charge), donne l'expression de i(t), puis calcule i juste après le basculement. » | EXPR + NUM | Décharge : `i = -\dfrac{E}{R}e^{-t/\tau}`, i(0⁺) = −E/R. Charge : `i = \dfrac{E}{R}e^{-t/\tau}`, i(0⁺) = E/R | Signe + en décharge → E6 ; i(0⁺) = 0 → E3 ; `\dfrac{E}{R}(1-e^{-t/\tau})` → E4 | Cours SM §II.d et §III.e ; Bac 2013 NS (1.3) |
| M6 | C6 | « Calcule l'énergie emmagasinée en fin de charge. » Variante : « Calcule le rapport E_e(τ)/E_e,max. » | NUM | ½·C·E² ; ((e−1)/e)² ≈ 0,40 | Sans le ½ ou sans le carré → EX ; rapport 0,63 → E5 | Cours SM §III ; Bac 2014 NS (1.5) |

### 7.5 Niveau difficile (exercices en étapes, adaptés des examens nationaux)

**D1 — Charge à courant constant puis décharge (Bac 2013 NS, adapté).**
Un générateur de courant I₀ charge un condensateur C (valeurs : C ∈ {0,10 ; 0,20} F, U_max = 2,25 V, R ∈ {5 ; 10 ; 20} Ω). La courbe montre trois parties : (a) droite, (b) palier U_max, (c) décroissance exponentielle à partir de t₁.
1. Associer chaque partie à la position de K (QCM ; erreur → E3).
2. Calculer I₀ à partir de la pente : I₀ = C·k (NUM ; k/C ou C/k → E2).
3. Établir l'équation de la décharge en q (EXPR ; → E4).
4. Sachant `u_C = U_{max}\,e^{-(t-t_1)/\tau}`, donner i(t) et son signe (EXPR ; signe → E6).

**D2 — Deux condensateurs en série (Bac 2016 RS, adapté).**
C₁ (inconnue) et C₂ en série avec R sous E ; courbes de u₂(t) et u_R(t) avec la tangente à l'origine. Valeurs : (C₁ ; C₂) ∈ {(4 ; 2), (6 ; 3), (2 ; 2)} µF, R ∈ {1 ; 3 ; 5} kΩ, E ∈ {6 ; 9 ; 12} V.
1. Montrer que `C_e = \dfrac{C_1 C_2}{C_1 + C_2}` (QCM ; règle inversée → EX).
2. Lire τ sur la tangente, puis calculer C_e = τ/R (COURBE + NUM ; → E5).
3. En régime permanent, donner u₂ et u₁ (NUM ; u₂ = E → E3).
4. En déduire C₁ (NUM ; utilise q₁ = q₂ ; erreur → E2).

**D3 — Courbe ln(u_C) = f(t) (Bac 2017 NS, adapté).**
Décharge d'un condensateur C ∈ {10 ; 20 ; 47} nF dans R ; on donne la droite ln(u_C) = f(t) (ordonnée à l'origine ln U₀, pente −1/τ).
1. Établir l'équation différentielle (EXPR ; → E4).
2. Déduire τ de la pente et U₀ de l'ordonnée à l'origine (NUM ×2 ; τ = pente → E4/E5).
3. Calculer R (NUM).
4. Trouver la date t₁ où l'énergie vaut 37 % de sa valeur initiale : t₁ = τ/2 (NUM ; t₁ = τ → E5).

**D4 — Charge par R₁, décharge par R₂ (AlloSchool, exercice 2, adapté).**
Oscillogramme : charge à travers R₁ (valeurs : R₁ ∈ {20 ; 50 ; 100} Ω), plateau, puis décharge à travers R₂.
1. Lire la tension U du générateur (NUM).
2. Déterminer C avec la tangente de la charge (COURBE + NUM ; → E5).
3. Déterminer R₂ avec la décharge (COURBE + NUM ; → E5).
4. u_C présente-t-elle une discontinuité au basculement ? Et i ? (QCM ; → E3).

**D5 — Deux dipôles RC (AlloSchool, exercice 3, adapté).**
Deux condensateurs C₁ et C₂ chargés chacun à travers R (même R) ; courbes u_C1(t) et u_C2(t).
1. Les deux condensateurs sont-ils chargés à la fin de l'enregistrement ? (QCM ; → E5 si « oui » pour la courbe encore croissante).
2. Déterminer τ₁ et τ₂ (COURBE ×2 ; → E5).
3. Calculer C₁ et C₂ (NUM ×2).
4. Vrai ou faux : « Plus la capacité est grande, plus le condensateur se charge rapidement. » (QCM ; « vrai » → E5).

**D6 — Même durée de charge (Bac 2013 NS, partie 2, adapté).**
Un condensateur C se charge à travers R_a ; un second montage utilise un générateur U₀ et une résistance R₀ inconnue.
1. Établir l'équation différentielle de la charge (EXPR ; → E4).
2. Trouver A et B dans u_C = A·e^(−t/τ) + B avec la courbe (NUM ×2 ; → E4).
3. Donner i(t) et son allure (EXPR ; → E6/E4).
4. Calculer R₀ pour que la charge totale (≈ 5τ) dure autant dans les deux montages (NUM ; durée = τ → E5).

### 7.6 Banque de QCM conceptuels (F5, F6 et remédiation)
| Id | Question | Bonne réponse | Distracteurs → code |
| --- | --- | --- | --- |
| Q-E1a | Pendant la charge, que se passe-t-il entre les armatures ? | Aucune charge ne traverse le diélectrique | Les électrons le traversent de A vers B / de B vers A / seulement au début → E1 |
| Q-E1b | Un condensateur chargé est débranché. Ses armatures portent : | q_A = +q et q_B = −q | 0 et 0 ; +q et 0 ; +2q et 0 → E1 |
| Q-E1c | Longtemps après la fermeture de K, un courant traverse-t-il le condensateur ? | Non, i = 0 | « Oui, i = E/R » ; « oui, très faible et constant » → E1 |
| Q-E1d | D'où viennent les électrons accumulés sur B pendant la charge ? | De l'armature A, par le circuit extérieur | « Ils sont créés par le condensateur » ; « ils traversent l'isolant » → E1 |
| Q-E2a | On double la tension aux bornes d'un condensateur. Sa capacité : | Ne change pas | Double ; est divisée par deux ; quadruple → E2 |
| Q-E2b | De quoi dépend la capacité C ? | De la surface des armatures, de la distance entre elles et de l'isolant | De la tension ; de la charge ; de la durée de charge → E2 |
| Q-E3a | Juste après la fermeture de K (charge depuis 0) : | u_C = 0 et i = E/R | u_C = E et i = 0 ; u_C = 0 et i = 0 ; u_C = E et i = E/R → E3 |
| Q-E3b | Longtemps après la fermeture de K : | u_C = E et i = 0 | u_C = E et i = E/R → E1/E3 ; u_C = 0 et i = 0 ; u_C = E/2 → E3 |

---

## 8. Diagnostic des erreurs (le « cerveau »)

### 8.1 Sources du diagnostic
1. **Réponse finale** : comparer la réponse aux distracteurs calculés pour l'instance (tolérance 2 %) ; chaque QCM/EXPR a ses distracteurs codés.
2. **Étapes** : dans les exercices `ÉTAPES`, chaque question est diagnostiquée séparément.
3. **Courbes** : la lecture est classée selon la zone cliquée (voir M3).
4. Une réponse fausse qui ne correspond à aucun distracteur ne reçoit pas de code : l'apprenant reçoit l'indice général du gabarit et un nouvel essai.

### 8.2 Base des erreurs (`src/content/errors.ts`)

| Code | Erreur | Indice (1re fois) | Micro-vidéo | Mission | Remédiation | Comp. |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | Le courant traverse le condensateur | « Entre les armatures, il y a un isolant. Les charges peuvent-elles le traverser ? Où circule alors le courant ? » | `M1.mp4` | S1 | F5 (Q-E1) | C1 |
| E2 | Capacité confondue avec la charge ou la tension | « La capacité dépend-elle de la tension, ou de la fabrication du condensateur ? Si u_C double, qu'est-ce qui double ? » | `M2.mp4` | S2 | F1, F2, Q-E2 | C1 |
| E3 | Instants initial et final faux | « u_C peut-elle sauter d'un coup ? Au tout début, quelle tension reste-t-il aux bornes du conducteur ohmique ? » | `M3.mp4` | S3 | F6, Q-E3 | C5 |
| E4 | Mise en équation incorrecte | « Reprends les trois étapes : loi d'additivité, u_R = R·i, i = C·du_C/dt. As-tu gardé le C ? Quelle est la condition initiale ? » | `M4.mp4` | S7 | M1, M2 | C2/C3 |
| E5 | τ mal lu ou mal interprété | « En charge, à τ, u_C a fait 63 % du chemin ; en décharge, il en reste 37 %. La charge n'est finie qu'après environ 5τ. » | `M5.mp4` | S4, S5 | M3, F4 | C4 |
| E6 | Signe de i oublié en décharge | « Pendant la décharge, les charges repartent dans l'autre sens. Avec la même orientation, quel est le signe de i ? » | `M6.mp4` | S6 | M5 | C5 |
| EX | Erreur hors des six (calcul, puissance de 10, règle d'association, formule de l'énergie) | « Ta méthode est juste ; vérifie » + selon le sous-type : « les puissances de 10 » / « la règle d'association » / « le ½ et le carré » | — (revoir `L1.mp4` ou `L5.mp4` à la 2e fois) | — | Même gabarit | selon l'exercice |

Les erreurs E1 à E6 sont appuyées sur la recherche (E1 à E4) et sur les sujets d'examen (E5, E6) ; les références sont dans `src/content/references.ts` et affichées dans le tableau de bord (section 14.6).

---

## 9. Modèle de l'apprenant

Pour chaque apprenant, stocker :
- **Maîtrise par compétence** C1 à C6 (score 0–100 ; +15 si réussi, −10 si erreur liée ; borné 0–100).
- **Historique des tentatives** : gabarit, valeurs, réponses par étape, erreurs détectées, temps, indices, vidéos, missions de simulation utilisées.
- **Compteur d'erreurs par code** (E1 à E6, EX).
- **Vidéos** : pourcentage vu par vidéo.
- **Simulation** : missions réussies, temps passé dans le laboratoire.
- Niveau courant, alertes actives, groupe (expérimental / témoin / diagnostic), réponses au questionnaire et copies saisies du pré-test et du post-test.

---

## 10. Règles d'adaptation (`src/config/adaptive.ts`)

| Situation | Action |
| --- | --- |
| 3 exercices réussis d'affilée dans le niveau (dont au moins 2 sans indice) | Passage au niveau suivant |
| 1re erreur codée | Indice lié au code, puis nouvel essai sur le même exercice |
| 2e fois la même erreur | Micro-vidéo de l'erreur, puis mission de simulation liée, puis exercice de remédiation (nouvelles valeurs) |
| 3e fois la même erreur | Alerte professeur + retour au niveau précédent sur la compétence concernée |
| Réussite avec un temps très long (> 4 / 7 / 10 min selon le niveau) | Un exercice de plus avant de passer |
| Erreur corrigée | Réinsérer un exercice de ce type 2 à 3 exercices plus tard (révision espacée) |
| Choix de l'exercice suivant | Gabarit de la compétence la plus faible du niveau dans 75 % des cas, sinon tirage au sort ; jamais le même gabarit deux fois de suite (sauf remédiation) |
| Niveau difficile | Un exercice D réussi = toutes ses étapes justes (au plus 1 indice) |

Toutes les constantes sont modifiables dans `src/config/adaptive.ts`.

---

## 11. Questionnaire diagnostique (contenu exact, `src/content/questionnaire.ts`)

**But :** confirmer la fréquence réelle des erreurs E1 à E6 chez les apprenants de 2ème Bac (analyse des besoins). **Durée :** 20 min. **Non noté.**

Après chaque question, l'apprenant indique sa **certitude** : 0 = je devine · 1 = peu sûr · 2 = assez sûr · 3 = certain (échelle adaptée de l'indice de certitude CRI de Hasan, Bagayoko et Kelley, 1999, *Physics Education* 34(5), dont l'échelle originale va de 0 à 5). Les questions marquées ✍ ont en plus un champ « Explique ta réponse en une phrase ».

Contexte affiché : générateur E, interrupteur K, conducteur ohmique R et condensateur C en série ; le courant i est orienté dans le même sens pendant la charge et la décharge.

| N° | Question | a | b | c | d | Réponse |
| --- | --- | --- | --- | --- | --- | --- |
| Q1 ✍ | Pendant la charge, que se passe-t-il entre les deux armatures ? | Les électrons traversent le diélectrique de B vers A (E1) | … de A vers B (E1) | Aucune charge ne traverse le diélectrique | … seulement au début de la charge (E1) | c |
| Q2 | Un condensateur chargé est débranché. Ses armatures portent : | q_A = 0 et q_B = 0 (E1) | q_A = +q et q_B = −q | q_A = +q et q_B = 0 (E1) | q_A = +2q et q_B = 0 (E1) | b |
| Q3 | On double la tension aux bornes d'un condensateur de 10 µF. Sa capacité : | double (E2) | est divisée par deux (E2) | ne change pas | est multipliée par quatre (E2) | c |
| Q4 | q = 40 µC sous 8 V. Sous 4 V, le condensateur porte : | 20 µC | 40 µC (E2) | 80 µC (E2) | 10 µC (calcul) | a |
| Q5 ✍ | Condensateur déchargé ; on ferme K à t = 0 (E = 6 V ; R = 1 kΩ). Juste après : | u_C = 0 et i = 6 mA | u_C = 6 V et i = 0 (E3) | u_C = 0 et i = 0 (E3) | u_C = 6 V et i = 6 mA (E3) | a |
| Q6 | Même circuit, longtemps après la fermeture de K : | u_C = E et i = 0 | u_C = E et i = E/R (E1/E3) | u_C = 0 et i = 0 (E3) | u_C = E/2 et i = E/(2R) (E3) | a |
| Q7 | Pendant la charge, u_C vérifie : | RC·du_C/dt + u_C = E | R·du_C/dt + u_C = E (E4) | RC·du_C/dt + u_C = 0 (E4) | RC·du_C/dt − u_C = E (E4) | a |
| Q8 | Chargé sous E, le condensateur se décharge dans R à partir de t = 0 : | u_C = E·e^(−t/τ) | u_C = E·(1 − e^(−t/τ)) (E4) | u_C = −E·e^(−t/τ) (E6) | u_C = E·e^(t/τ) (E4) | a |
| Q9 ✍ | Charge sous E = 10 V : on détermine τ à l'instant où u_C vaut : | 3,7 V (E5) | 6,3 V | 5 V (E5) | 10 V (E5) | b |
| Q10 | Pendant la charge, à t = τ, le condensateur est : | complètement chargé (E5) | chargé à 63 % | chargé à 37 % (E5) | chargé à 50 % (E5) | b |
| Q11 ✍ | Pendant la décharge, avec la même orientation que pendant la charge, i est : | positive (E6) | négative | nulle (E3) | constante (E3) | b |
| Q12 | Pendant la décharge, i s'écrit : | (E/R)·e^(−t/τ) (E6) | −(E/R)·e^(−t/τ) | −(E/R)·(1 − e^(−t/τ)) (E4) | (E/R)·(1 − e^(−t/τ)) (E4) | b |

L'ordre des propositions est mélangé pour chaque apprenant (le code reste attaché à la proposition).

**Codage automatique :**
- Réponse fausse avec certitude 2 ou 3 → **conception erronée** (compte pour l'erreur).
- Réponse fausse avec certitude 0 ou 1 → **manque de connaissance**.
- Réponse juste avec certitude 2 ou 3 → **maîtrise** ; avec 0 ou 1 → **réponse devinée**.

---

## 12. Pré-test et post-test (contenu exact, `src/content/tests.ts`)

**Passation : sur papier, en classe**, dans les mêmes conditions pour les deux groupes (même durée, sans aide, calculatrice autorisée). **Durée :** 30 min chacun. **Noté sur 20.** Même structure et même barème ; valeurs et situations différentes. Répartition : C1 = 4 pts ; C2-C3 = 6 pts ; C4 = 5 pts ; C5 = 3 pts ; C6 = 2 pts.

### 12.1 Pré-test

| Q | Énoncé | Format | Réponse attendue | Barème | Code si faux |
| --- | --- | --- | --- | --- | --- |
| 1.1 | C = 4,7 µF ; u_C = 12 V. Calcule q. | NUM | 56,4 µC (5,64×10⁻⁵ C) | 2 | E2 / EX |
| 1.2 | C₁ = 2 µF et C₂ = 6 µF. Capacité équivalente en série, puis en parallèle. | NUM ×2 | 1,5 µF ; 8 µF | 1 + 1 | EX |
| 2.1 | Échelon montant E à t = 0, condensateur déchargé. Établis l'équation différentielle vérifiée par u_C. | Texte libre (correction manuelle) | u_R + u_C = E ; u_R = R·i ; i = C·du_C/dt ⇒ RC·du_C/dt + u_C = E | 1 + 1 + 1 | E4 |
| 2.2 | Vérifie que u_C = E·(1 − e^(−t/τ)) est solution et donne τ en fonction de R et C. | Texte libre (correction manuelle) | du_C/dt = (E/τ)·e^(−t/τ) ; en remplaçant, l'égalité est vraie pour tout t si τ = RC | 2 + 1 | E4 |
| 3.1 | R = 10 kΩ ; C = 100 µF. Calcule τ, puis la durée de charge pratique. | NUM ×2 | 1 s ; 5 s | 2 + 1 | E5 si « 1 s » ; EX |
| 3.2 | Charge sous E = 10 V : u_C = 6,3 V à t = 20 ms. Déduis τ, puis C (R = 2 kΩ). | NUM ×2 | 20 ms ; 10 µF | 1 + 1 | E5 ; E2 / EX |
| 4.1 | Décharge depuis E = 10 V dans R = 2 kΩ, même orientation. Expression de i(t) et signe. | EXPR | −(E/R)·e^(−t/τ) ; négatif | 1 + 1 | E6 ; E4 |
| 4.2 | Calcule i juste après le début de la décharge. | NUM | −5 mA | 1 | E3 si 0 ; E6 si +5 mA |
| 5 | Énergie emmagasinée : C = 10 µF chargé sous E = 10 V. | NUM | 5×10⁻⁴ J (0,5 mJ) | 2 | EX |

### 12.2 Post-test

| Q | Énoncé | Format | Réponse attendue | Barème | Code si faux |
| --- | --- | --- | --- | --- | --- |
| 1.1 | C = 22 µF ; u_C = 5 V. Calcule q. | NUM | 110 µC | 2 | E2 / EX |
| 1.2 | C₁ = 3 µF et C₂ = 6 µF. Série, puis parallèle. | NUM ×2 | 2 µF ; 9 µF | 1 + 1 | EX |
| 2.1 | Décharge dans R, condensateur chargé sous E. Établis l'équation différentielle vérifiée par q. | Texte libre (correction manuelle) | u_R + u_C = 0 ; u_R = R·dq/dt ; u_C = q/C ⇒ RC·dq/dt + q = 0 | 1 + 1 + 1 | E4 |
| 2.2 | Vérifie que u_C = E·e^(−t/τ) est solution et justifie la constante E par la condition initiale. | Texte libre (correction manuelle) | du_C/dt = −(E/τ)·e^(−t/τ) ; l'égalité est vraie si τ = RC ; u_C(0) = E car le condensateur part chargé | 2 + 1 | E4 |
| 3.1 | R = 47 kΩ ; C = 10 µF. Calcule τ, puis la durée de charge pratique. | NUM ×2 | 0,47 s ; 2,35 s | 2 + 1 | E5 ; EX |
| 3.2 | Décharge depuis E = 10 V : u_C = 3,7 V à t = 50 ms. Déduis τ, puis C (R = 5 kΩ). | NUM ×2 | 50 ms ; 10 µF | 1 + 1 | E5 ; E2 / EX |
| 4.1 | Charge sous E = 12 V à travers R = 4 kΩ. Expression de i(t) et signe. | EXPR | (E/R)·e^(−t/τ) ; positif | 1 + 1 | E6 ; E4 |
| 4.2 | Calcule i juste après la fermeture de K. | NUM | 3 mA | 1 | E3 si 0 |
| 5 | Énergie : C = 100 µF sous 20 V. | NUM | 0,02 J | 2 | EX |

Les distracteurs des questions `EXPR` reprennent ceux du gabarit M5 (section 7.4).

---

## 13. Passation et saisie

### 13.1 Questionnaire diagnostique (dans l'application)
- Le professeur **ouvre et ferme** le questionnaire pour une classe, avec une date limite facultative.
- L'apprenant voit une carte « À faire » ; un **minuteur** affiche le temps restant (20 min) ; à la fin du temps, les réponses sont envoyées automatiquement.
- **Aucune aide pendant le questionnaire** : pas d'indice, pas de vidéo, pas de simulation, pas de retour juste/faux, et le tuteur est caché. Le parcours est verrouillé jusqu'à l'envoi.
- Une seule passation par apprenant (le professeur peut autoriser une reprise).
- Codage automatique (section 11).

### 13.2 Pré-test et post-test (sur papier, saisis dans l'application)
- **Version imprimable** : l'application génère une page A4 prête à imprimer pour chaque test (énoncé, cases pour le code apprenant et le groupe, espaces de réponse), et le corrigé avec le barème.
- **Saisie rapide des copies** : écran « Saisir les copies » ; le professeur choisit le test et l'apprenant, puis remplit une grille d'une ligne par question : réponse numérique ou choix (corrigés automatiquement, tolérance 2 %, unité vérifiée), points cochés par critère pour les questions 2.1 et 2.2, et un code d'erreur (E1 à E6, EX) proposé automatiquement quand la réponse correspond à un distracteur, modifiable à la main.
- **Import CSV** possible (colonnes : code apprenant ; test ; question ; réponse ; points ; code d'erreur).
- Un compteur indique les copies saisies et celles qui manquent, par groupe.

## 14. Tableau de bord du professeur

Tous les graphiques sont en SVG, avec le code couleur de la section 15. Les apprenants apparaissent sous leur nom dans la vue classe et sous leur **code anonyme** dans les analyses et les exports.

### 14.1 Vue classe
Liste des apprenants : groupe, niveau, compétences C1–C6 en couleur, dernière activité, questionnaire passé, copies de pré-test et post-test saisies, alerte éventuelle. Filtres par groupe.

### 14.2 Fiche apprenant
Historique des tentatives, erreurs répétées, temps passé, vidéos vues (%), missions de simulation réussies, courbe de progression des compétences, scores au pré-test et au post-test par compétence.

### 14.3 Erreurs fréquentes (parcours)
Graphique en barres : pourcentage d'apprenants ayant commis chaque erreur E1 à E6 dans les exercices ; évolution semaine par semaine.

### 14.4 Analyse du questionnaire diagnostique
- **Par erreur** (E1 à E6) : pourcentage d'apprenants concernés, en barres empilées : conception erronée / manque de connaissance.
- **Par question** : répartition des réponses a/b/c/d, bonne réponse en vert, et certitude moyenne.
- **Matrice certitude** : réponses justes/fausses × certitude haute/basse (maîtrise, réponse devinée, manque de connaissance, conception erronée).
- **Explications écrites** (Q1, Q5, Q9, Q11) : liste filtrable, avec un champ pour que le professeur tague une explication par code d'erreur.
- **Conclusion automatique** : « Erreurs confirmées » = erreurs choisies avec certitude haute par au moins 20 % des apprenants (seuil réglable).

### 14.5 Analyse de l'expérimentation (pré-test / post-test)
Pour chaque groupe (expérimental, témoin) :
- Effectif, moyenne et écart-type au pré-test et au post-test (sur 20), et **par compétence** C1 à C6.
- **Gain** = post − pré, et **gain normalisé** g = (post − pré) / (20 − pré), moyen par groupe.
- **Comparaison des groupes** :
  - au pré-test, test t de Welch pour vérifier que les groupes partent du même niveau ;
  - sur les gains, **test t de Welch** (t, degrés de liberté, p-value) et **taille d'effet d de Cohen** ;
  - interprétation affichée en clair : « La différence est significative (p < 0,05) » ou « n'est pas significative ».
- **Erreurs avant / après** : pour chaque erreur E1 à E6, pourcentage d'apprenants qui la commettent au pré-test et au post-test, par groupe (graphique en barres groupées).
- **Hypothèses du projet**, affichées avec leur résultat :
  - H1 : le groupe expérimental progresse plus que le groupe témoin (gains comparés) ;
  - H2 : les erreurs E1 à E6 diminuent davantage dans le groupe expérimental (erreurs avant/après).
- Graphiques : moyennes pré/post par groupe (barres avec écart-type), gains individuels (nuage de points pré en x, post en y, diagonale y = x).
- Les statistiques sont codées dans `src/data/stats.ts` (moyenne, écart-type, Welch, loi de Student par la fonction bêta incomplète régularisée, d de Cohen) et **testées** avec au moins deux jeux de données dont les résultats sont connus (notés dans les tests).
- Avertissement visible tant que chaque groupe a moins de 10 apprenants : « Effectif faible : interpréter avec prudence. »

### 14.6 Références
Une page « Références » liste les études qui appuient les erreurs E1 à E4, la méthode CRI et les sources des exercices (cours fournis, examens nationaux 2013, 2014, 2016, 2017).

Contenu de `src/content/references.ts` :

| Réf. | Appuie | Référence |
| --- | --- | --- |
| [1] | E1, E3 | Thacker, B. A., Boys, D., & Ganiel, U. (1999). Macroscopic phenomena and microscopic processes: Student understanding of transients in direct current electric circuits. *American Journal of Physics*, 67(S1), S25–S31. https://doi.org/10.1119/1.19076 |
| [2] | E1 | Eylon, B.-S., & Ganiel, U. (1990). Macro-micro relationships: The missing link between electrostatics and electrodynamics in students' reasoning. *International Journal of Science Education*, 12(1), 79–94. https://doi.org/10.1080/0950069900120107 |
| [3] | E1 | Taşkın, T. (2022). Examination of prospective teachers' knowledge about capacitors and electric field lines. *Research in Science & Technological Education*, 40(2), 272–289. |
| [4] | E2 | Guisasola, J., Zubimendi, J. L., Almudí, J. M., & Ceberio, M. (2002). The evolution of the concept of capacitance throughout the development of the electric theory and the understanding of its meaning by university students. *Science & Education*, 11(3), 247–261. https://doi.org/10.1023/A:1015248831346 |
| [5] | E2 | Guisasola, J., Zubimendi, J. L., & Zuza, K. (2010). How much have students learned? Research-based teaching on electrical capacitance. *Physical Review Special Topics – Physics Education Research*, 6(2), 020102. https://doi.org/10.1103/PhysRevSTPER.6.020102 |
| [6] | E3 | Benseghir, A., & Closset, J.-L. (1996). The electrostatics–electrokinetics transition: Historical and educational difficulties. *International Journal of Science Education*, 18(2). https://doi.org/10.1080/0950069960180204 |
| [7] | E4 | Zavala, G., & Martinez-Torteya, C. E. (2019). Students' abilities to solve RC circuits with research-based educational strategies. *ASEE Annual Conference*, Tampa. https://doi.org/10.18260/1-2--33312 |
| [8] | E3 | College Board (2004). *Student Performance Q&A: 2004 AP Physics C: Electricity & Magnetism Free-Response Questions*. |
| [9] | Contexte | Wang, R. (2026). Investigating students' conceptual understanding of RC circuits. GIREP Summer School, UPV/EHU (travail en cours). |
| [10] | Méthode CRI | Hasan, S., Bagayoko, D., & Kelley, E. L. (1999). Misconceptions and the certainty of response index (CRI). *Physics Education*, 34(5), 294–299. |

E5 et E6 viennent des sujets d'examen et de la pratique d'enseignement ; le questionnaire diagnostique sert à les confirmer.

### 14.7 Alertes, actions et export
- **Alertes** : « Yassine bloqué sur E5 (lecture de τ) – 3 échecs ».
- **Actions** : changer le groupe d'un apprenant, débloquer ou changer de niveau, réinitialiser sa progression, laisser un message, ouvrir/fermer le questionnaire, autoriser une reprise, imprimer les tests, saisir les copies.
- **Export CSV** (codes anonymes) : réponses au questionnaire avec certitude et codes ; scores pré/post par question et par compétence ; tentatives d'exercices ; résumé statistique. Séparateur `;` et virgule décimale (Excel en français).
- **Export PDF/impression** de la page d'analyse (pour le mémoire).

---

## 15. Design

**Référence visuelle obligatoire : `design/reference-design.png`.** Ouvre cette image et reproduis son style (pas son contenu : c'est un tableau de bord de football, qui sert seulement de modèle visuel). Le résultat doit être nettement plus soigné qu'Ohmigo.

### 15.1 Style (« glassmorphism » doux)
- **Fond** : dégradé très doux, vert d'eau → bleu-gris → touche de lavande en haut à droite (comme la référence).
- **Cartes** : blanc translucide (opacité 55 à 70 %), flou d'arrière-plan (`backdrop-filter: blur(16px)`), bordure blanche fine semi-transparente, coins très arrondis (20 px), ombre douce et large. Garder un contraste suffisant : texte et courbes toujours parfaitement lisibles, y compris sur téléphone (sur mobile, réduire le flou et augmenter l'opacité).
- **Couleur principale** : bleu-vert (teal) `#0F7C7C` ; texte foncé `#16324F` ; accents : bleu `#1F6FD1` pour u_C, orange `#E67E22` pour i, jaune `#F4D35E` pour le diélectrique, vert pour la réussite, orange doux pour l'erreur.
- **Typographie** : sans-serif moderne (Plus Jakarta Sans ou Inter, en local) ; grands titres (« Tableau de bord » en 40 px), petites étiquettes en majuscules espacées (« POSSESSION » dans la référence → « NIVEAU », « τ MESURÉ », « TEMPS PASSÉ »).
- **Icônes** : petites pastilles carrées arrondies en dégradé (violet, rose, orange, teal) comme sur la référence ; icônes Lucide.

### 15.2 Mise en page
- **Barre latérale gauche** (verticale, translucide) : logo RC-Lab en haut ; puis Accueil, Cours PDF, Leçons, Laboratoire, Exercices, Questionnaire, Bilan. L'élément actif est une pilule teal pleine avec texte blanc. Sur téléphone : barre en bas avec 5 icônes.
- **En-tête** : « Bonjour, <prénom> 👋 » en petit teal, puis le titre de la page en grand ; à droite : recherche, cloche des notifications, avatar.
- **Accueil apprenant** (grille de cartes, comme la référence) :
  - carte « Prochaine étape » (équivalent de « Next game ») : la prochaine activité du parcours avec un bouton « Continuer » ;
  - carte « Ma progression » (équivalent de « Games statistic ») : barre segmentée réussites / indices / erreurs et les compteurs ;
  - carte « Mes compétences » (équivalent de « Standings ») : C1 à C6 en lignes, avec barre de maîtrise et pourcentage ;
  - quatre petites cartes statistiques : niveau actuel, exercices réussis, temps passé, vidéos vues ;
  - **grande bannière en bas à droite** (équivalent de « Setup training ») : fond teal en dégradé, texte blanc (« N'oublie pas — Teste τ au laboratoire »), bouton blanc arrondi, et une **illustration 3D** à droite (condensateur, conducteur ohmique, électrons en sphères brillantes).
- **Parcours par étapes** : une carte « Mon parcours » montre une piste horizontale de pastilles reliées : V0 → L1 → L2 → L3 → L4 → L5 → Facile → Moyen → Difficile → Bilan. Étape faite = pastille teal avec coche ; étape actuelle = pastille qui pulse doucement ; étapes futures = grises avec cadenas.
- **Tableau de bord professeur** : même style, avec les graphiques de la section 14 dans des cartes translucides.

### 15.3 Images
- Réutiliser les images déjà produites pour les vidéos : copier `../Dipole-RC-Videos/public/images/` (photos) et les rendus 3D disponibles dans `public/images/`.
- Illustrations 3D supplémentaires (bannières, écrans vides, bilan) : générer 4 à 6 images avec Nano Banana (clé dans `../Dipole-RC-Videos/.env`), style « rendu 3D doux, pastel, fond transparent ou uni », sujets : condensateur électrolytique, conducteur ohmique à anneaux de couleur, électrons en sphères bleues, petit laboratoire, trophée en forme de symbole de condensateur. Budget maximal : 0,40 $ ; vérifier qu'aucune marque ni logo n'apparaît.
- Images en WebP compressées (moins de 200 Ko chacune).

### 15.4 Animations
- Transitions douces entre les pages (fondu + léger glissement, 200 à 300 ms), cartes qui apparaissent en cascade, barres de progression qui se remplissent.
- Respecter `prefers-reduced-motion`.

---

## 15 bis. Le tuteur « Capi »

Un tuteur animé accompagne l'apprenant. Il **encourage, guide et donne des indices, mais ne résout jamais un exercice** et ne donne jamais la réponse finale.

### Apparence
- Petit personnage original en SVG : un condensateur électrolytique arrondi (cylindre teal) avec de grands yeux, une petite bouche, deux petites pattes-bras ; une étincelle jaune au-dessus de la tête quand il est content. Nom configurable (`src/config/app.ts`), par défaut « Capi ».
- Placé en bas à droite, dans une bulle de dialogue translucide. Bouton pour le réduire en icône et bouton pour couper ses messages.

### Animations (CSS/SVG, légères)
| État | Animation | Quand |
| --- | --- | --- |
| Repos | respire doucement, cligne des yeux | par défaut |
| Salut | fait coucou | à l'arrivée sur l'accueil |
| Réfléchit | yeux vers le haut, petits points « … » | pendant qu'un exercice est en cours depuis plus de 2 min |
| Content | saute, étincelle, confettis légers | exercice réussi, niveau validé |
| Indice | se penche, ampoule | après une erreur codée |
| Encourage | lève le pouce | après une 2e erreur, avant la micro-vidéo |
| Se charge | une jauge sur son corps se remplit (clin d'œil à la charge) | progression de compétence |

### Ce qu'il dit
- **Uniquement des textes écrits à l'avance** dans `src/content/tutor.ts` (pas d'IA générative) : l'« intelligence » est le choix du message selon la situation et le modèle de l'apprenant.
- Au moins **4 variantes par situation**, tirées sans répétition consécutive ; tutoiement ; français simple ; une phrase ou deux ; parfois un emoji.
- Situations : accueil (selon l'heure et la progression), début de leçon, fin de vidéo, entrée au laboratoire, réussite, 3 réussites d'affilée, passage de niveau, 1re erreur (il présente l'indice de la section 8.2 avec sa voix : « Hmm… regarde : … »), 2e erreur (il propose la micro-vidéo et la mission de simulation), retour après une absence, bilan.
- Exemples : « Salut <prénom> ! Prêt à charger quelques condensateurs ? ⚡ » · « 3 sur 3 ! Le niveau moyen est débloqué 🎉 » · « Et si on vérifiait ça au labo ? » · « Pas de panique : même les étudiants font cette erreur. Regarde cette vidéo d'une minute. »
- **Discret** : il parle seulement aux moments importants (au plus un message toutes les 30 s, sauf réaction à une réponse).
- **Caché pendant le questionnaire diagnostique.**

## 16. Ce qu'il ne faut PAS faire

- Pas de réponse donnée à l'apprenant dans les exercices.
- Pas d'aide ni de retour juste/faux pendant le questionnaire diagnostique.
- Pas d'exercice répété avec les mêmes valeurs.
- Pas de texte pédagogique inventé : utiliser celui de ce fichier.
- Pas de « résistance » pour désigner le composant : toujours « conducteur ohmique ».
- Pas de classement entre apprenants, pas de note négative visible.
- Pas de données personnelles inutiles (les apprenants sont mineurs) : prénom, nom, classe, groupe ; codes anonymes dans les analyses et exports.
- Pas de résultat de démonstration présenté comme réel : les données de démo portent un bandeau « Données fictives ».

---

## 17. Plan de construction (phases)

1. **Phase 1 – Socle** : projet Vite + React + TS + Tailwind (à partir de la structure d'Ohmigo), routage, repository localStorage, connexion apprenant/prof, groupes, codes anonymes, copie des vidéos.
2. **Phase 2 – Simulation** : physique exacte (section 6.3) avec tests, schéma SVG animé, courbes, contrôles, outils, missions S1 à S8.
3. **Phase 3 – Parcours apprenant** : V0 + question, leçons L1 à L5 + question flash + mini-mission, laboratoire libre, accueil et bilan.
4. **Phase 4 – Exercices** : générateurs F1 à F6, M1 à M6, D1 à D6 avec valeurs propres et tests ; formats NUM, QCM, EXPR, COURBE, ÉTAPES.
5. **Phase 5 – Diagnostic et adaptation** : distracteurs, base des erreurs, indices, micro-vidéos, missions de remédiation, règles de la section 10, modèle de l'apprenant.
6. **Phase 6 – Instruments** : questionnaire diagnostique dans l'application (minuteur, verrouillage, codage CRI) ; pré-test et post-test en version imprimable, saisie des copies papier et import CSV.
7. **Phase 7 – Tableau de bord** : sections 14.1 à 14.7, statistiques testées, exports.
8. **Phase 8 – Design, tuteur et finitions** : section 15 (reproduire `design/reference-design.png`), tuteur Capi (section 15 bis), images 3D, données de démo (section 18), responsive, vérification complète (`npm run build`, `npm test`), `README.md` avec les commandes.

---

## 18. Données de démonstration

- Classe `2BAC-PC-A` : 16 apprenants fictifs (8 expérimental, 8 témoin), avec pré-test, post-test et historique de parcours pour le groupe expérimental, générés en simulant le vrai moteur adaptatif (graine fixe, déterministe).
- Classe `2BAC-PC-B` : 24 apprenants fictifs du groupe diagnostic, avec des réponses au questionnaire et des certitudes variées.
- Au moins deux apprenants avec une alerte active, et quelques copies « À corriger ».
- Bandeau « Données fictives de démonstration » partout où elles apparaissent, et un bouton « Effacer les données de démo » dans les réglages du professeur.
