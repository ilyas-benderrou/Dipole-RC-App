/**
 * Textes du tuteur Capi (section 15 bis) : uniquement des textes écrits à l'avance (pas d'IA générative).
 * L'« intelligence » est le choix du message selon la situation et le modèle de l'apprenant.
 * Au moins 4 variantes par situation, tirées sans répétition consécutive ; tutoiement ; une ou deux phrases.
 * Capi encourage, guide et présente les indices, mais ne donne jamais la réponse.
 * Variables : {prenom}, {niveau}, {indice}, {video}, {mission}.
 */
export type TutorSituation =
  | 'welcomeMorning'
  | 'welcomeAfternoon'
  | 'welcomeEvening'
  | 'welcomeStart'
  | 'welcomeAdvanced'
  | 'comeback'
  | 'lessonStart'
  | 'videoEnd'
  | 'labEnter'
  | 'missionSuccess'
  | 'flashCorrect'
  | 'flashWrong'
  | 'exerciseStart'
  | 'thinking'
  | 'success'
  | 'streak3'
  | 'levelUp'
  | 'firstError'
  | 'secondError'
  | 'teacherAlert'
  | 'noCodeError'
  | 'competenceUp'
  | 'bilan'
  | 'finished';

export type TutorMood = 'idle' | 'wave' | 'think' | 'happy' | 'hint' | 'encourage' | 'charge';

export const TUTOR_LINES: Record<TutorSituation, { mood: TutorMood; lines: string[] }> = {
  welcomeMorning: {
    mood: 'wave',
    lines: [
      'Bonjour {prenom} ! Prêt à charger quelques condensateurs ? ⚡',
      'Salut {prenom} ! Un petit tour au labo ce matin ?',
      'Bonjour {prenom} ! Le cerveau est bien chargé le matin, on en profite 😉',
      'Coucou {prenom} ! On commence la journée avec un peu de τ ?',
    ],
  },
  welcomeAfternoon: {
    mood: 'wave',
    lines: [
      'Salut {prenom} ! Prêt à charger quelques condensateurs ? ⚡',
      'Re-bonjour {prenom} ! On reprend là où tu t’étais arrêté ?',
      'Hello {prenom} ! Quelques minutes de dipôle RC, ça te dit ?',
      'Salut {prenom} ! Ton parcours t’attend, on y va doucement.',
    ],
  },
  welcomeEvening: {
    mood: 'wave',
    lines: [
      'Bonsoir {prenom} ! Une petite séance avant de souffler ? 🌙',
      'Bonsoir {prenom} ! Même tard, un condensateur se charge toujours en 5τ 😄',
      'Salut {prenom} ! Un exercice ou deux, puis repos.',
      'Bonsoir {prenom} ! On avance d’une étape ce soir ?',
    ],
  },
  welcomeStart: {
    mood: 'wave',
    lines: [
      'Bienvenue {prenom} ! Je suis Capi. Commence par la vidéo d’introduction 🎬',
      'Salut {prenom}, moi c’est Capi ! On démarre par une courte vidéo ?',
      'Enchanté {prenom} ! Je t’accompagne tout au long du parcours ⚡',
      'Bienvenue dans RC-Lab, {prenom} ! La première étape est juste en dessous.',
    ],
  },
  welcomeAdvanced: {
    mood: 'charge',
    lines: [
      'Tu es au niveau {niveau}, {prenom}. Belle progression !',
      'Niveau {niveau} ! Tes compétences se chargent bien 🔋',
      'Déjà au niveau {niveau}, {prenom} ? On continue sur cette lancée.',
      'Te voilà au niveau {niveau}. Chaque exercice te rapproche du bilan !',
    ],
  },
  comeback: {
    mood: 'wave',
    lines: [
      'Content de te revoir, {prenom} ! On reprend tranquillement.',
      'Te revoilà {prenom} ! Un petit exercice pour te remettre dans le bain ?',
      'Ça faisait longtemps, {prenom} ! Ton parcours t’a attendu 😊',
      'Bon retour {prenom} ! Commence par l’étape « Continuer ».',
    ],
  },
  lessonStart: {
    mood: 'idle',
    lines: [
      'Une vidéo de 30 secondes, puis une question flash. Facile !',
      'Regarde bien : la question flash arrive juste après 👀',
      'Courte vidéo, grosse idée. C’est parti !',
      'Ouvre grand les yeux, la mini-mission t’attend ensuite.',
    ],
  },
  videoEnd: {
    mood: 'happy',
    lines: [
      'Vidéo terminée ! Passons à la question.',
      'Bien regardé ! À toi de jouer maintenant.',
      'Top ! Voyons ce que tu as retenu.',
      'C’est noté. Une petite question pour vérifier ?',
    ],
  },
  labEnter: {
    mood: 'idle',
    lines: [
      'Bienvenue au labo ! Bascule K et regarde les électrons bouger.',
      'Ici, tu peux tout essayer : change R, C, E, et observe τ.',
      'Astuce : active la comparaison pour garder la courbe précédente.',
      'Le labo est à toi ! Que se passe-t-il si tu doubles C ?',
    ],
  },
  missionSuccess: {
    mood: 'happy',
    lines: ['Mission accomplie ! 🎯', 'Bravo, mission réussie !', 'Excellente expérience !', 'Bien joué, tu as fait parler la simulation !'],
  },
  flashCorrect: {
    mood: 'happy',
    lines: ['Exactement ! ✅', 'C’est ça !', 'Bien vu !', 'Juste ! Tu as tout compris.'],
  },
  flashWrong: {
    mood: 'hint',
    lines: [
      'Pas tout à fait. Lis l’indice et réessaie.',
      'Hmm… regarde l’indice, tu vas trouver.',
      'Presque ! Un petit indice pour t’aider.',
      'Revois ce passage si besoin, puis retente ta chance.',
    ],
  },
  exerciseStart: {
    mood: 'idle',
    lines: ['Nouvel exercice ! Prends ton temps.', 'À toi ! Lis bien l’énoncé.', 'Allez, on y va pas à pas.', 'Un exercice tout neuf, avec de nouvelles valeurs.'],
  },
  thinking: {
    mood: 'think',
    lines: [
      'Tu réfléchis ? Prends ton temps, je suis là si besoin.',
      'Hmm… Relis l’énoncé tranquillement.',
      'Pas de stress : une étape à la fois.',
      'Et si on vérifiait ça au labo ?',
    ],
  },
  success: {
    mood: 'happy',
    lines: ['Bravo {prenom} ! 🎉', 'Excellent travail !', 'Super, c’est juste !', 'Bien joué ! Tu progresses.'],
  },
  streak3: {
    mood: 'happy',
    lines: ['3 sur 3 ! Tu es en feu 🔥', 'Trois réussites d’affilée, chapeau !', 'Et de trois ! Rien ne t’arrête.', 'Série de 3 ! Tes compétences se chargent ⚡'],
  },
  levelUp: {
    mood: 'happy',
    lines: [
      '3 sur 3 ! Le niveau {niveau} est débloqué 🎉',
      'Niveau {niveau} débloqué ! Tu l’as bien mérité.',
      'Bravo {prenom}, place au niveau {niveau} !',
      'Nouveau niveau : {niveau} ! Prêt pour le défi ?',
    ],
  },
  firstError: {
    mood: 'hint',
    lines: ['Hmm… regarde : {indice}', 'Petit indice : {indice}', 'Pas grave ! Regarde : {indice}', 'Réfléchis à ceci : {indice}'],
  },
  secondError: {
    mood: 'encourage',
    lines: [
      'Pas de panique : même les étudiants font cette erreur. Regarde cette vidéo d’une minute.',
      'On va régler ça ensemble : une courte vidéo, puis une mission au labo.',
      'Cette erreur revient : une vidéo d’une minute va t’aider 👍',
      'Courage ! Une vidéo, une mission, et ce sera clair.',
    ],
  },
  teacherAlert: {
    mood: 'encourage',
    lines: [
      'Ton professeur va t’aider sur ce point. En attendant, on revient un peu en arrière.',
      'On fait une petite pause sur cette notion : ton professeur est prévenu.',
      'Pas d’inquiétude, ton professeur va t’accompagner. On reprend au niveau précédent.',
      'On consolide les bases ensemble, ton professeur est au courant 👍',
    ],
  },
  noCodeError: {
    mood: 'hint',
    lines: [
      'Ce n’est pas encore ça. Lis l’indice et réessaie.',
      'Pas tout à fait. Vérifie ta méthode avec l’indice.',
      'Essaie encore, l’indice peut t’aider.',
      'Presque ! Reprends calmement.',
    ],
  },
  competenceUp: {
    mood: 'charge',
    lines: ['Ta compétence se charge 🔋', 'Ça monte ! Encore un effort.', 'Ta jauge progresse bien !', 'Une barre de plus sur ta jauge ⚡'],
  },
  bilan: {
    mood: 'happy',
    lines: [
      'Voici ton bilan, {prenom}. Regarde tout ce que tu as accompli !',
      'Ton bilan est prêt. Fier de toi ! 🌟',
      'Bilan du jour : de beaux progrès, {prenom} !',
      'Voilà le chemin parcouru. Bravo pour tes efforts !',
    ],
  },
  finished: {
    mood: 'happy',
    lines: [
      'Niveau difficile validé ! Tu maîtrises le dipôle RC 🏆',
      'Parcours terminé, {prenom} ! Quelle progression !',
      'Tu as tout validé ! Tu peux continuer à t’entraîner quand tu veux.',
      'Champion du condensateur ! 🎉',
    ],
  },
};

export function fillTemplate(line: string, vars: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

/** Choisit une variante différente de la précédente (pas de répétition consécutive). */
export function pickLine(situation: TutorSituation, lastIndex: number | undefined, random: () => number = Math.random): { index: number; text: string } {
  const lines = TUTOR_LINES[situation].lines;
  let index = Math.floor(random() * lines.length);
  if (lines.length > 1 && index === lastIndex) index = (index + 1 + Math.floor(random() * (lines.length - 1))) % lines.length;
  return { index, text: lines[index] };
}
