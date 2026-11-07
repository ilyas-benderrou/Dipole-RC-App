# Décisions prises pendant la construction

Pour chaque point ambigu du cahier des charges, voici le choix retenu et sa raison. Tout est modifiable.

## Technique

1. **Pile identique à Ohmigo** : React 19, React Router 8 (routage par hash, aucune configuration serveur), Vite 8, Tailwind 4, TypeScript 7, Vitest 5, KaTeX. Ajouts : `lucide-react` (icônes) et `@fontsource-variable/plus-jakarta-sans` (police servie localement, sans CDN). `../Ohmigo` n’a pas été modifié.
2. **Repris d’Ohmigo et adaptés** : repository localStorage (interface `Repository`, repli en mémoire), session, modèle de l’apprenant et moteur adaptatif, composant `Tex`/`RichText`, graphiques SVG, structure des données de démonstration. Le lecteur vidéo est réécrit pour les vraies vidéos.
3. **« Vue à X % »** : part réellement lue (union des intervalles lus), et non la position maximale atteinte. Le lecteur reprend à la dernière position. Une vidéo est « vue » à 80 % (`ADAPTIVE.videoWatchedThreshold`).
4. **Scènes de V0** : horodatage calculé à partir des durées du rendu Remotion (titre 1 s + voix + maintien). Après une mauvaise réponse à « K en position 1 : charge ou décharge ? », on rejoue la scène V0-S6 (la charge).

## Parcours

5. **Verrouillage** : V0 + question → L1 → … → L5 (une leçon = vidéo vue + question flash juste + mini-mission réussie) → exercices. Le laboratoire est toujours accessible. Le professeur peut tout débloquer depuis la fiche de l’apprenant.
6. **Questions flash** : reprises des contenus du cahier des charges (banque 7.6 Q-E2a pour L1 ; équation du gabarit M1 pour L2 ; 0,63E de l’indice E5 pour L3 ; i(t) du gabarit M5 pour L4 ; formule de l’énergie pour L5). Une erreur à une question flash affiche l’indice de l’erreur liée mais ne compte pas dans le modèle (pas d’alerte depuis les leçons).
7. **Mini-missions** : L1 → S1, L2 → S3, L3 → S4, L4 → S6, L5 → S8. S2, S5 et S7 servent à la remédiation (E2, E5, E4) et sont libres au laboratoire.
8. **Nouvel apprenant** (première connexion) : groupe expérimental par défaut ; le professeur change le groupe dans la fiche. Un apprenant du groupe témoin voit « parcours fermé » tant que le professeur ne l’a pas ouvert ; un apprenant du groupe diagnostic ne voit que le questionnaire.

## Simulation

9. **État initial** : condensateur déchargé, K en position 2, en pause. Fenêtre affichée de 10τ qui défile ; pause automatique 10τ après le dernier événement (bascule de K ou changement de E, R, C).
10. **Repères de la phase en cours** : en charge, le niveau affiché est u₀ + 63 % du chemin restant (libellé « 0,63E » quand la charge part de 0) ; en décharge, 37 % de u₀.
11. **Comparaison** : quand l’outil est actif, la remise à zéro garde la courbe précédente en gris.
12. **« Double C » (S2, S5)** : les valeurs normalisées de C ne contiennent pas de doubles ; une case « ×2 : deux condensateurs identiques en parallèle » double la capacité.
13. **Vérifications des missions** : S3 accepte ±5 % de l’échelle (E pour u_C, E/R pour i), car u_C(0⁺) et i(5τ) sont proches de zéro ; S4 affiche les repères après une lecture juste ; S5 demande τ pour C et pour 2C (±5 %, rapport ≈ 2) puis la remarque « si C double, τ double » (contenu de L3) ; S6 demande le signe de i et le sens de la flèche orange ; S7 demande l’équation puis deux lectures (u_R, u_C) relevées au curseur à deux instants ; S8 demande la valeur (±2 %) puis une charge complète pour la jauge.

## Exercices

14. **Valeurs propres** : toutes les réponses ont au plus 3 chiffres significatifs (vérifié par les tests sur 250 tirages par gabarit), sauf le rapport ((e − 1)/e)² ≈ 0,40 de M6. τ est retenu seulement s’il a au plus 3 chiffres significatifs et tombe entre 1 ms et 10 s ; F4 exige aussi 5τ propre, D3 exige τ/2 propre.
15. **F3** : les combinaisons imposées sont multipliées par 1 µF, 10 µF, 10 nF ou 100 nF pour varier les valeurs.
16. **D2** : la combinaison (4 ; 2) µF est exclue, car C_e = 4/3 µF n’est pas une valeur propre.
17. **D3** : la liste R de la section 7.2 (≤ 100 kΩ) donnerait τ < 1 ms avec 10 nF ; R est tiré dans {100, 200, 220, 470, 500} kΩ.
18. **D1** : le palier (b) est associé à K en position 1 (générateur saturé, condensateur chargé) ; la question 1 est un QCM d’association des trois parties.
19. **D4** : R₂ = k·R₁ (k = 2 à 5) ; la lecture de τ₂ se fait depuis l’instant du basculement t_s (le réticule affiche t − t_s).
20. **D5** : C₂ ≥ 2 C₁ et l’enregistrement s’arrête à 2,5 τ₂, pour que le condensateur 2 soit encore en charge.
21. **D6, question 4** : avec le même condensateur, « même durée de charge » donnerait R₀ = R_a. La question donne la durée voulue Δt (≈ 5τ) et demande R₀ = Δt / (5C) ; le distracteur « durée = τ » (Δt / C) est codé E5.
22. **Codes des distracteurs** non précisés : M4 « R/τ » → E2 et « τ·R » → EX ; D3 « τ = pente » → E5. Partout, une bonne valeur avec une mauvaise puissance de 10 → EX (« vérifie les puissances de 10 ») ; un distracteur avec une mauvaise puissance de 10 garde le code du distracteur.
23. **Indices généraux des gabarits** (réponse fausse sans code) : formulés à partir des formules de référence (section 5.2) et des indices de la section 8.2. **À valider par l’équipe** (`src/content/exercises/`). Aucun texte n’est généré par une IA à l’exécution.
24. **COURBE** : un clic sur la courbe affiche un réticule avec t et la valeur de la courbe (comme une lecture au papier calque) ; la valeur reste modifiable. Zones fausses codées E5 : 0,40–0,53 τ (lecture à 0,37E en charge ou 0,63E en décharge), 0,62–0,76 τ (E/2), 2,9–8 τ (plateau).

## Diagnostic et adaptation

25. **Même erreur** : un compteur par code pilote indice → vidéo → alerte ; il est remis à zéro quand l’apprenant réussit un exercice qui teste cette erreur sans la commettre, ou après l’alerte.
26. **2e erreur** : l’exercice s’arrête (« remédiation »), puis micro-vidéo, mission liée, et exercice de remédiation avec de nouvelles valeurs (gabarit de la base des erreurs, ou le même s’il en fait partie). Après la vidéo, un lien « Passer la mission » évite tout blocage. EX : revoir L1 (ou L5 pour l’énergie), puis le même gabarit.
27. **3e erreur** : alerte professeur, retour au niveau précédent, compétence de l’erreur prioritaire. L’apprenant voit un message positif (« Ton professeur est prévenu et va t’aider »).
28. **Niveau difficile** : un exercice D compte comme réussi si toutes ses étapes sont justes avec au plus 1 indice ; sinon il est « réussi avec aide » et ne compte pas dans la série.
29. **Exercice quitté en cours** : enregistré comme « abandonné » dans l’historique (pour l’expérimentation), sans modifier le modèle.
30. **Valeurs jamais répétées** : le modèle garde les signatures des valeurs vues par gabarit ; un QCM à 4 items peut se répéter une fois toutes les variantes vues.

## Instruments

31. **Questionnaire** : une question par écran avec navigation libre, enregistrement automatique, minuteur de 20 min depuis le début, envoi automatique, date limite facultative (le questionnaire est fermé après la date). Le tuteur est caché et aucun retour juste/faux n’est donné.
32. **Analyse par erreur** : un apprenant est « concerné » par Ek s’il a choisi au moins une proposition codée Ek ; « conception erronée » si l’un de ces choix a une certitude de 2 ou 3, sinon « manque de connaissance ». Q4 d (erreur de calcul) n’a pas de code ; Q6 b compte pour E1 et E3. Erreur confirmée : part d’apprenants l’ayant choisie avec certitude haute ≥ seuil (20 % par défaut, réglable).
33. **Pré/post-tests** : chaque question est découpée en éléments notés séparément ; 2.1 → C2 (3 pts), 2.2 → C3 (3 pts). Les critères de 2.1 et 2.2 sont cochés à la main ; une copie reste « À corriger » tant qu’elle n’a pas été marquée comme corrigée. Une réponse numérique sans unité est lue en unité SI.
34. **Analyse de l’expérimentation** : les copies « À corriger » sont exclues tant qu’elles ne sont pas corrigées (un message l’indique). Gains calculés sur les apprenants ayant les deux copies. H2 est testée par un test de Welch sur la diminution, par apprenant, du nombre d’erreurs E1–E6 distinctes (pré − post). Verdicts : confirmée (p < 0,05), tendance non significative, non confirmée, données insuffisantes.
35. **Statistiques** : écart-type corrigé (n − 1), d de Cohen avec l’écart-type combiné, gain normalisé de Hake (non défini si pré = 20). Valeurs de référence des tests calculées avec SciPy.

## Design

36. **Référence visuelle** : style « glassmorphism » doux de `design/reference-design.png` (fond dégradé vert d’eau → bleu-gris → lavande, cartes translucides floutées, pilule teal active, pastilles d’icônes en dégradé, grande bannière teal avec illustration).
37. **Illustrations 3D** : la génération avec Nano Banana a été **refusée par le contrôle de permissions de la session** (appel d’API externe en mode autonome) ; je ne l’ai pas contourné. Des illustrations SVG « 3D douce » dessinées par le code les remplacent automatiquement. Les scripts `scripts/generate-images.mjs` (budget 0,40 $, registre des coûts) et `scripts/process-images.py` (WebP < 200 Ko, fond transparent) sont prêts : dès que `public/images/<nom>.webp` existe, il remplace le dessin SVG.
38. **Images réutilisées** : photos de `../Dipole-RC-Videos/public/images/` converties en WebP ; vignettes des leçons extraites des vidéos (ffmpeg).
39. **Tuteur Capi** : 24 situations × 4 variantes (`src/content/tutor.ts`), tirées sans répétition consécutive ; ces textes sont des propositions **à valider par l’équipe**. Boutons pour réduire Capi et couper ses messages (préférences gardées dans le navigateur).
40. **Recherche et notifications** : la loupe cherche dans les pages, leçons et missions ; la cloche montre les messages du professeur et le questionnaire à faire (apprenant), les alertes et les copies à corriger (professeur).

## Données de démonstration

41. 2BAC-PC-A : 8 apprenants expérimentaux (historique obtenu en simulant le vrai moteur, graine fixe ; Yassine, Imane et Omar ont une alerte active ; Nour est encore dans les leçons) et 8 apprenants témoins créés par le professeur. Pré-test et post-test simulés : niveaux de départ comparables, progression plus forte dans le groupe expérimental ; 2 copies « À corriger » et 1 post-test manquant. 2BAC-PC-B : 24 apprenants du groupe diagnostic avec questionnaire passé (questionnaire refermé). Les explications écrites des apprenants fictifs sont des données simulées, pas du contenu pédagogique.
