import { APP } from '../config/app';
import { ADAPTIVE } from '../config/adaptive';
import { ERRORS, exReviewVideo } from '../content/errors';
import { TEMPLATES, createInstance, getTemplate } from '../content/exercises';
import { LESSON_MISSION } from '../content/missions';
import { QUESTIONS } from '../content/questionnaire';
import { TESTS } from '../content/tests';
import { VIDEOS } from '../content/videos';
import {
  chooseNextTemplate,
  chooseRemediationTemplate,
  completeExercise,
  newLearnerModel,
  registerError,
  type LearnerModel,
} from '../engine/adaptive';
import { type Rng, mulberry32, pick, randInt } from '../engine/rng';
import { LESSON_IDS, VIDEO_IDS, type ErrorCode, type Group, type Level, type MissionId, type VideoId } from '../engine/types';
import { formatQuantity } from '../physics/units';
import { anonCode } from './ids';
import { applyRaw, emptyCopy, questionnaireOrder } from './instruments';
import type { Alert, Attempt, Certainty, Database, MissionRun, OptionKey, QuestionnaireResponse, StepLog, Student, TestCopy, VideoView } from './types';

/**
 * Données de démonstration (section 18), entièrement fictives et marquées « demo ».
 * - 2BAC-PC-A : 16 apprenants (8 expérimental, 8 témoin) avec pré-test et post-test ; l'historique du groupe
 *   expérimental est obtenu en simulant le vrai moteur adaptatif (graine fixe, déterministe).
 * - 2BAC-PC-B : 24 apprenants du groupe diagnostic avec des réponses au questionnaire et des certitudes variées.
 */
export const DEMO_CLASSES = [
  { code: '2BAC-PC-A', name: '2ème Bac PC – A (expérimentation)' },
  { code: '2BAC-PC-B', name: '2ème Bac PC – B (questionnaire diagnostique)' },
];

export function emptyDatabase(): Database {
  return {
    version: 1,
    classes: DEMO_CLASSES.map((c) => ({ ...c })),
    students: [],
    attempts: [],
    alerts: [],
    messages: [],
    videoViews: [],
    missionRuns: [],
    questionnaireWindows: [],
    questionnaireResponses: [],
    testCopies: [],
    settings: { teacherPin: APP.defaultTeacherPin, confirmThreshold: ADAPTIVE.confirmedErrorThreshold },
    nextAnon: 1,
  };
}

interface Profile {
  first: string;
  last: string;
  exercises: number;
  skill: Record<Level, number>;
  errors: ErrorCode[];
  tail?: { templateId: string; code: ErrorCode }[];
  lastActiveHoursAgo: number;
  /** Leçons terminées (5 = toutes). */
  lessonsDone?: number;
  pre: number;
  post: number;
}

const EXPERIMENTAL: Profile[] = [
  {
    first: 'Yassine',
    last: 'Amrani',
    exercises: 16,
    skill: { facile: 0.9, moyen: 0.75, difficile: 0.5 },
    errors: ['E5', 'EX'],
    tail: [
      { templateId: 'M3', code: 'E5' },
      { templateId: 'M3', code: 'E5' },
      { templateId: 'M3', code: 'E5' },
    ],
    lastActiveHoursAgo: 3,
    pre: 0.4,
    post: 0.72,
  },
  { first: 'Salma', last: 'Benali', exercises: 24, skill: { facile: 0.97, moyen: 0.93, difficile: 0.85 }, errors: ['E4'], lastActiveHoursAgo: 20, pre: 0.55, post: 0.9 },
  { first: 'Adam', last: 'El Idrissi', exercises: 14, skill: { facile: 0.45, moyen: 0.35, difficile: 0.3 }, errors: ['E2', 'E3'], lastActiveHoursAgo: 28, pre: 0.28, post: 0.55 },
  { first: 'Imane', last: 'Tazi', exercises: 18, skill: { facile: 0.88, moyen: 0.62, difficile: 0.45 }, errors: ['E5', 'E1'], lastActiveHoursAgo: 6, pre: 0.42, post: 0.75 },
  {
    first: 'Omar',
    last: 'Chraibi',
    exercises: 12,
    skill: { facile: 0.7, moyen: 0.55, difficile: 0.4 },
    errors: ['E6', 'E3'],
    tail: [
      { templateId: 'M5', code: 'E6' },
      { templateId: 'M5', code: 'E6' },
      { templateId: 'M5', code: 'E6' },
    ],
    lastActiveHoursAgo: 50,
    pre: 0.35,
    post: 0.62,
  },
  { first: 'Hiba', last: 'Alaoui', exercises: 22, skill: { facile: 0.95, moyen: 0.88, difficile: 0.7 }, errors: ['EX', 'E4'], lastActiveHoursAgo: 2, pre: 0.5, post: 0.85 },
  { first: 'Mehdi', last: 'Bennani', exercises: 12, skill: { facile: 0.82, moyen: 0.45, difficile: 0.4 }, errors: ['E4', 'E5'], lastActiveHoursAgo: 75, pre: 0.33, post: 0.6 },
  { first: 'Nour', last: 'Fassi', exercises: 0, skill: { facile: 0.7, moyen: 0.6, difficile: 0.5 }, errors: ['E2'], lastActiveHoursAgo: 1, lessonsDone: 2, pre: 0.38, post: 0.66 },
];

const TEMOIN: { first: string; last: string; pre: number; post: number }[] = [
  { first: 'Rania', last: 'Berrada', pre: 0.42, post: 0.55 },
  { first: 'Karim', last: 'Lahlou', pre: 0.36, post: 0.45 },
  { first: 'Sara', last: 'Ouazzani', pre: 0.5, post: 0.6 },
  { first: 'Hamza', last: 'Kettani', pre: 0.3, post: 0.4 },
  { first: 'Aya', last: 'Sebti', pre: 0.45, post: 0.58 },
  { first: 'Anas', last: 'Bouzid', pre: 0.38, post: 0.42 },
  { first: 'Lina', last: 'Haddad', pre: 0.52, post: 0.66 },
  { first: 'Ilyas', last: 'Mansouri', pre: 0.33, post: 0.45 },
];

const DIAG_FIRST = ['Meryem', 'Ayoub', 'Kenza', 'Zakaria', 'Douae', 'Othmane', 'Chaimae', 'Bilal', 'Fatima Zahra', 'Soufiane', 'Wiam', 'Reda', 'Asmae', 'Taha', 'Nisrine', 'Achraf', 'Hajar', 'Walid', 'Oumaima', 'Ismail', 'Yousra', 'Amine', 'Ikram', 'Hicham'];
const DIAG_LAST = ['Saidi', 'Naciri', 'Tahiri', 'Berrada', 'Ziani', 'Rami', 'Fadili', 'Moutaouakil', 'Bakkali', 'Cherkaoui', 'Daoudi', 'El Fassi', 'Ghazali', 'Hilali', 'Jabri', 'Kadiri', 'Lamrani', 'Mernissi', 'Ouali', 'Qadiri', 'Raji', 'Sbai', 'Tounsi', 'Zerouali'];

/** Explications écrites fictives (Q1, Q5, Q9, Q11) : données d'apprenants simulés, pas du contenu pédagogique. */
const EXPLANATIONS: Record<string, { right: string[]; wrong: string[] }> = {
  Q1: { right: ['Le diélectrique est un isolant, rien ne passe.', 'Les charges restent sur les armatures.'], wrong: ['Les électrons passent d’une plaque à l’autre pour charger.', 'Le courant traverse sinon il ne circulerait pas.', 'Au début ça passe puis ça bloque.'] },
  Q5: { right: ['Le condensateur est vide donc toute la tension est sur R.', 'u_C ne peut pas changer instantanément.'], wrong: ['Le condensateur prend directement la tension du générateur.', 'Au départ rien ne circule encore.'] },
  Q9: { right: ['À τ on a 63 % de E.', '0,63 × 10 = 6,3 V.'], wrong: ['À τ il reste 37 %.', 'C’est la moitié de E.', 'Quand il est chargé.'] },
  Q11: { right: ['Les charges repartent dans l’autre sens.', 'Le courant change de sens pendant la décharge.'], wrong: ['Le courant est toujours positif.', 'Il n’y a plus de générateur donc pas de courant.'] },
};

const HOUR = 3600_000;

function syntheticSteps(rng: Rng, nQuestions: number, error: ErrorCode | null, durationSec: number, questionIds: string[]): StepLog[] {
  const steps: StepLog[] = [];
  const dt = (durationSec * 1000) / (nQuestions + (error ? 1 : 0) + 1);
  let t = 0;
  questionIds.forEach((qid, j) => {
    if (j === 0 && error) {
      t += dt;
      steps.push({ t: Math.round(t), questionId: qid, answer: '—', ok: false, code: error });
    }
    t += dt * (0.7 + rng() * 0.6);
    steps.push({ t: Math.round(t), questionId: qid, answer: '✓', ok: true, code: null });
  });
  return steps;
}

function journeyDone(model: LearnerModel, lessons = 5): LearnerModel {
  const m = structuredClone(model);
  m.journey.introVideo = true;
  m.journey.introQuestion = true;
  LESSON_IDS.forEach((l, j) => {
    if (j < lessons) m.journey.lessons[l] = { video: true, flash: true, mission: true };
  });
  return m;
}

function simulateLearner(p: Profile, index: number, now: number, counter: { n: number }, anon: string) {
  const rng = mulberry32(2026 + index * 131);
  const id = (prefix: string) => `${prefix}_demo${++counter.n}`;
  const studentId = `stu_demo_exp_${index + 1}`;
  let model: LearnerModel = journeyDone(newLearnerModel(), p.lessonsDone ?? 5);
  const attempts: Attempt[] = [];
  const alerts: Alert[] = [];
  const views: VideoView[] = [];
  const missions: MissionRun[] = [];
  const end = now - p.lastActiveHoursAgo * HOUR;
  const start = end - 18 * 24 * HOUR;

  // Parcours vidéo et mini-missions.
  const pathVideos: VideoId[] = ['V0', ...LESSON_IDS.slice(0, p.lessonsDone ?? 5)];
  pathVideos.forEach((v, j) => {
    const percent = 85 + Math.floor(rng() * 16);
    const dur = VIDEOS[v].duration;
    model.videos[v] = { percent, position: dur * (percent / 100), ranges: [[0, (dur * percent) / 100]], duration: dur };
    views.push({ id: id('vid'), studentId, videoId: v, at: new Date(start + j * 40 * 60_000).toISOString(), reason: 'parcours', percent });
  });
  LESSON_IDS.slice(0, p.lessonsDone ?? 5).forEach((l, j) => {
    const mid = LESSON_MISSION[l];
    model.missions[mid] = { done: true, attempts: 1 + Math.floor(rng() * 2) };
    missions.push({ id: id('mis'), studentId, missionId: mid, context: 'lesson', success: true, at: new Date(start + (j + 1) * 45 * 60_000).toISOString(), durationSec: 120 + Math.floor(rng() * 200) });
  });
  if ((p.lessonsDone ?? 5) >= 5 && rng() < 0.7) {
    const extra = pick(rng, ['S2', 'S5', 'S7'] as MissionId[]);
    model.missions[extra] = { done: true, attempts: 1 };
    missions.push({ id: id('mis'), studentId, missionId: extra, context: 'lab', success: true, at: new Date(start + 6 * HOUR).toISOString(), durationSec: 240 });
  }
  model.labTimeSec = 600 + Math.floor(rng() * 1800);

  // Exercices : simulation du vrai moteur adaptatif.
  const total = p.exercises + (p.tail?.length ?? 0);
  let remediationOf: string | null = null;
  let sessionId = id('ses');
  let previousDay = -1;
  for (let i = 0; i < total; i++) {
    const forced = i >= p.exercises ? p.tail![i - p.exercises] : null;
    let templateId: string;
    let review = false;
    if (forced) templateId = forced.templateId;
    else if (remediationOf) templateId = remediationOf;
    else {
      const next = chooseNextTemplate(model, TEMPLATES, rng);
      model = next.model;
      templateId = next.templateId;
      review = next.review;
    }
    const remediation = remediationOf === templateId;
    remediationOf = null;
    const tpl = getTemplate(templateId);
    const seed = randInt(rng, 1, 2 ** 30);
    const inst = createInstance(templateId, seed);
    const startedAt = start + 6 * HOUR + ((end - start - 6 * HOUR) * i) / Math.max(1, total - 1);
    const day = Math.floor(startedAt / (24 * HOUR));
    if (day !== previousDay) {
      sessionId = id('ses');
      previousDay = day;
    }
    const errors: ErrorCode[] = [];
    let hints = 0;
    const videos: VideoId[] = [];
    const usedMissions: MissionId[] = [];
    let outcome: Attempt['outcome'] = 'success';
    const makesError = forced !== null || rng() > p.skill[tpl.level];
    if (makesError) {
      const preferred = tpl.testsErrors.filter((c) => p.errors.includes(c));
      const code = forced?.code ?? (preferred.length && rng() < 0.75 ? pick(rng, preferred) : pick(rng, tpl.testsErrors));
      const r = registerError(model, code, tpl.competences);
      model = r.model;
      errors.push(code);
      if (r.action === 'hint') hints += 1;
      else if (r.action === 'video') {
        const video = code === 'EX' ? exReviewVideo('calcul') : ERRORS[code].video;
        if (video) {
          videos.push(video);
          views.push({ id: id('vid'), studentId, videoId: video, at: new Date(startedAt + 60_000).toISOString(), reason: 'remediation', percent: 100 });
          model.videos[video] = { percent: 100, position: 0, ranges: [[0, VIDEOS[video].duration]], duration: VIDEOS[video].duration };
        }
        const mission = ERRORS[code].missions[0];
        if (mission) {
          usedMissions.push(mission);
          missions.push({ id: id('mis'), studentId, missionId: mission, context: 'remediation', success: true, at: new Date(startedAt + 3 * 60_000).toISOString(), durationSec: 200 });
          model.missions[mission] = { done: true, attempts: (model.missions[mission]?.attempts ?? 0) + 1 };
        }
        outcome = 'remediation';
        remediationOf = chooseRemediationTemplate(code, templateId, rng);
      } else {
        outcome = 'alert';
        alerts.push({ id: id('alr'), studentId, code, count: r.count, templateId, createdAt: new Date(startedAt + 90_000).toISOString(), resolved: false });
      }
    }
    const baseDuration = { facile: 75, moyen: 140, difficile: 260 }[tpl.level];
    const durationSec = Math.round(baseDuration * (0.6 + rng() * 0.9) + (errors.length ? 50 : 0));
    let success = outcome === 'success';
    if (success && tpl.level === 'difficile' && hints > ADAPTIVE.maxHintsForHardSuccess) {
      success = false;
      outcome = 'helped';
    }
    const res = completeExercise(model, { template: tpl, success, usedHelp: hints > 0 || videos.length > 0, durationSec, errors }, rng);
    model = res.model;
    model.seenValues[templateId] = [...(model.seenValues[templateId] ?? []), inst.valueKey];
    model.activeTimeSec += durationSec;
    attempts.push({
      id: id('att'),
      studentId,
      sessionId,
      templateId,
      level: tpl.level,
      seed,
      values: inst.values,
      remediation,
      review,
      steps: syntheticSteps(rng, inst.questions.length, errors[0] ?? null, durationSec, inst.questions.map((q) => q.id)),
      questionsTotal: inst.questions.length,
      questionsOk: outcome === 'success' || outcome === 'helped' ? inst.questions.length : Math.max(0, inst.questions.length - 1),
      errors,
      success,
      outcome,
      hintsUsed: hints,
      videosWatched: videos,
      missionsUsed: usedMissions,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(startedAt + durationSec * 1000).toISOString(),
      durationSec,
      competencesAfter: { ...model.competences },
      levelAfter: model.level,
    });
  }
  // Les alertes anciennes ont déjà été traitées par le professeur ; seule la dernière reste active.
  alerts.slice(0, -1).forEach((a) => {
    a.resolved = true;
    a.resolvedAt = new Date(new Date(a.createdAt).getTime() + 20 * HOUR).toISOString();
  });
  model.activeTimeSec += VIDEO_IDS.reduce((s, v) => s + ((model.videos[v]?.percent ?? 0) / 100) * VIDEOS[v].duration, 0) + model.labTimeSec;
  model.activeTimeSec = Math.round(model.activeTimeSec);

  const student: Student = {
    id: studentId,
    anonCode: anon,
    firstName: p.first,
    lastName: p.last,
    classCode: '2BAC-PC-A',
    group: 'experimental',
    createdBy: 'self',
    accessOpened: false,
    createdAt: new Date(start - 15 * 60_000).toISOString(),
    lastActive: new Date(end).toISOString(),
    model,
    demo: true,
  };
  return { student, attempts, alerts, views, missions };
}

/** Copie papier simulée à partir d'une liste « élément juste ou faux ». */
function buildCopy(rng: Rng, studentId: string, test: 'pre' | 'post', right: Record<string, boolean>, id: string, enteredAt: string, pending: boolean): TestCopy {
  let copy = emptyCopy(studentId, test, id);
  for (const it of TESTS[test].items) {
    const ok = right[it.id];
    if (it.kind === 'criterion') {
      if (!pending) copy.items[it.id] = { raw: ok ? 'ok' : '', points: ok ? it.points : rng() < 0.4 ? Math.floor(it.points / 2) : 0, code: ok ? null : rng() < 0.6 ? (it.usualCode ?? null) : null, codeAuto: false };
      continue;
    }
    let raw: string;
    if (it.kind === 'choice') {
      const wrong = it.options!.filter((o) => o.key !== it.correctKey);
      raw = ok ? it.correctKey! : pick(rng, wrong).key;
    } else if (ok) raw = formatQuantity(it.answer!, it.quantity!);
    else if (it.distractors?.length && rng() < 0.7) raw = formatQuantity(pick(rng, it.distractors).value, it.quantity!);
    else raw = formatQuantity(it.answer! * pick(rng, [1e3, 1e-3, 1.5, 0.5]), it.quantity!);
    copy = applyRaw(copy, it.id, raw);
  }
  return { ...copy, pendingManual: pending, enteredAt, updatedAt: enteredAt };
}

/**
 * Pré-test puis post-test d'un apprenant : chaque élément est juste avec une probabilité liée à son niveau ;
 * au post-test, ce qui était su le reste le plus souvent et une partie de ce qui ne l'était pas est acquis.
 */
function simulateCopies(rng: Rng, studentId: string, pre: number, post: number, ids: [string, string], dates: [string, string], pendingPost: boolean, withPost = true): TestCopy[] {
  const preRight: Record<string, boolean> = {};
  const postRight: Record<string, boolean> = {};
  const learn = Math.max(0, (post - pre) / Math.max(0.05, 1 - pre));
  for (const it of TESTS.pre.items) {
    preRight[it.id] = rng() < Math.max(0.05, Math.min(0.95, pre + (rng() - 0.5) * 0.16));
    postRight[it.id] = preRight[it.id] ? rng() < 0.93 : rng() < learn;
  }
  const out = [buildCopy(rng, studentId, 'pre', preRight, ids[0], dates[0], false)];
  if (withPost) out.push(buildCopy(rng, studentId, 'post', postRight, ids[1], dates[1], pendingPost));
  return out;
}

/** Réponses au questionnaire (groupe diagnostic) : erreurs fréquentes avec des certitudes variées. */
function simulateQuestionnaire(rng: Rng, studentId: string, ability: number, at: number, id: string): QuestionnaireResponse {
  const answers: QuestionnaireResponse['answers'] = {};
  // Difficulté propre à chaque question (les conceptions E1, E3, E5, E6 sont fréquentes).
  const difficulty: Record<string, number> = { Q1: 0.35, Q2: 0.15, Q3: 0.1, Q4: 0.05, Q5: 0.3, Q6: 0.2, Q7: 0.15, Q8: 0.1, Q9: 0.3, Q10: 0.25, Q11: 0.3, Q12: 0.2 };
  for (const q of QUESTIONS) {
    if (rng() < 0.03) continue;
    const right = rng() < Math.max(0.1, ability - difficulty[q.id]);
    let choice: OptionKey;
    if (right) choice = q.correct;
    else {
      const wrong = (['a', 'b', 'c', 'd'] as OptionKey[]).filter((k) => k !== q.correct);
      const coded = wrong.filter((k) => q.options[k].codes.length);
      choice = coded.length && rng() < 0.85 ? pick(rng, coded) : pick(rng, wrong);
    }
    const certainty = (right ? (rng() < 0.7 ? randInt(rng, 2, 3) : randInt(rng, 0, 1)) : rng() < 0.5 ? randInt(rng, 2, 3) : randInt(rng, 0, 1)) as Certainty;
    const ex = EXPLANATIONS[q.id];
    answers[q.id] = { choice, certainty, ...(ex && rng() < 0.75 ? { explanation: pick(rng, right ? ex.right : ex.wrong) } : {}) };
    if (ex && answers[q.id].explanation && !right && rng() < 0.3) answers[q.id].teacherTag = q.options[choice].codes[0] ?? null;
  }
  const startedAt = at;
  const dur = randInt(rng, 9, 19) * 60_000;
  return { id, studentId, startedAt: new Date(startedAt).toISOString(), submittedAt: new Date(startedAt + dur).toISOString(), autoSubmitted: dur > 18.5 * 60_000, order: questionnaireOrder(studentId), answers };
}

export function buildDemoDatabase(now = Date.now()): Database {
  const db = emptyDatabase();
  const counter = { n: 0 };
  let anonN = 1;
  const nextAnon = () => anonCode(anonN++);
  const preDate = now - 20 * 24 * HOUR;
  const postDate = now - 1 * 24 * HOUR;

  // Groupe expérimental (parcours simulé) + copies.
  EXPERIMENTAL.forEach((p, i) => {
    const s = simulateLearner(p, i, now, counter, nextAnon());
    db.students.push(s.student);
    db.attempts.push(...s.attempts);
    db.alerts.push(...s.alerts);
    db.videoViews.push(...s.views);
    db.missionRuns.push(...s.missions);
    const rng = mulberry32(777 + i);
    db.testCopies.push(...simulateCopies(rng, s.student.id, p.pre, p.post, [`cop_demo_pre_e${i}`, `cop_demo_post_e${i}`], [new Date(preDate).toISOString(), new Date(postDate).toISOString()], i === 6));
  });

  // Groupe témoin : créé par le professeur, n'utilise pas l'application.
  TEMOIN.forEach((t, i) => {
    const student: Student = {
      id: `stu_demo_tem_${i + 1}`,
      anonCode: nextAnon(),
      firstName: t.first,
      lastName: t.last,
      classCode: '2BAC-PC-A',
      group: 'temoin' as Group,
      createdBy: 'teacher',
      accessOpened: false,
      createdAt: new Date(preDate - 2 * 24 * HOUR).toISOString(),
      lastActive: null,
      model: newLearnerModel(),
      demo: true,
    };
    db.students.push(student);
    const rng = mulberry32(999 + i);
    db.testCopies.push(...simulateCopies(rng, student.id, t.pre, t.post, [`cop_demo_pre_t${i}`, `cop_demo_post_t${i}`], [new Date(preDate).toISOString(), new Date(postDate).toISOString()], i === 2, i !== 7));
  });

  // Groupe diagnostic : questionnaire passé.
  const qDate = now - 9 * 24 * HOUR;
  DIAG_FIRST.forEach((first, i) => {
    const rng = mulberry32(4242 + i * 17);
    const student: Student = {
      id: `stu_demo_diag_${i + 1}`,
      anonCode: nextAnon(),
      firstName: first,
      lastName: DIAG_LAST[i],
      classCode: '2BAC-PC-B',
      group: 'diagnostic',
      createdBy: 'self',
      accessOpened: false,
      createdAt: new Date(qDate - HOUR).toISOString(),
      lastActive: new Date(qDate + 30 * 60_000).toISOString(),
      model: newLearnerModel(),
      demo: true,
    };
    db.students.push(student);
    db.questionnaireResponses.push(simulateQuestionnaire(rng, student.id, 0.45 + rng() * 0.5, qDate + i * 60_000, `qst_demo_${i + 1}`));
  });
  db.questionnaireWindows.push({ classCode: '2BAC-PC-B', open: false, openedAt: new Date(qDate - 2 * HOUR).toISOString(), closedAt: new Date(qDate + 3 * HOUR).toISOString(), deadline: null });

  const adam = db.students.find((s) => s.firstName === 'Adam');
  if (adam) {
    db.messages.push({
      id: 'msg_demo_1',
      studentId: adam.id,
      text: 'Bravo pour tes efforts ! Revois la mission S3 au laboratoire avant de continuer.',
      createdAt: new Date(now - 26 * HOUR).toISOString(),
      read: false,
    });
  }
  db.nextAnon = anonN;
  return db;
}
