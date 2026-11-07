import type { TeacherData } from '../../app/teacher';
import { GROUP_LABELS } from '../../content/competences';
import { QUESTIONS } from '../../content/questionnaire';
import { TESTS, TEST_LABELS } from '../../content/tests';
import { COMPETENCES, MAIN_ERRORS } from '../../engine/types';
import { attemptsCsv, downloadText, toCsv } from '../../data/analytics';
import { analyzeExperiment } from '../../data/experiment';
import { CRI_LABELS, analyzeQuestionnaire, copyCompetenceScores, copyErrors, copyScore, criCategory } from '../../data/instruments';

const stamp = () => new Date().toISOString().slice(0, 10);

/** Réponses au questionnaire avec certitude et codes (codes anonymes). */
export function questionnaireCsv(data: TeacherData): string {
  const byId = new Map(data.students.map((s) => [s.id, s]));
  const header = ['code_apprenant', 'groupe', 'classe', 'question', 'réponse', 'juste', 'certitude', 'catégorie_CRI', 'codes_erreur', 'explication', 'tag_professeur', 'envoyé_le', 'envoi_automatique'];
  const rows: unknown[][] = [];
  for (const r of data.responses.filter((x) => x.submittedAt)) {
    const s = byId.get(r.studentId);
    if (!s) continue;
    for (const q of QUESTIONS) {
      const a = r.answers[q.id];
      const cat = criCategory(q, a);
      rows.push([
        s.anonCode,
        GROUP_LABELS[s.group],
        s.classCode,
        q.id,
        a?.choice ?? '',
        a?.choice ? (a.choice === q.correct ? 1 : 0) : '',
        a?.certainty ?? '',
        cat === 'sans_reponse' ? 'sans réponse' : CRI_LABELS[cat],
        a?.choice ? q.options[a.choice].codes.join(' ') : '',
        a?.explanation ?? '',
        a?.teacherTag ?? '',
        r.submittedAt,
        r.autoSubmitted ? 'oui' : 'non',
      ]);
    }
  }
  return toCsv([header, ...rows]);
}

/** Scores pré/post par question et par compétence. */
export function testsCsv(data: TeacherData): string {
  const byId = new Map(data.students.map((s) => [s.id, s]));
  const itemIds = TESTS.pre.items.map((i) => i.id);
  const header = ['code_apprenant', 'groupe', 'classe', 'test', ...itemIds.map((i) => `q${i}`), ...COMPETENCES, 'total_sur_20', 'erreurs', 'à_corriger', 'source'];
  const rows = data.copies
    .filter((c) => byId.has(c.studentId))
    .sort((a, b) => byId.get(a.studentId)!.anonCode.localeCompare(byId.get(b.studentId)!.anonCode) || a.test.localeCompare(b.test))
    .map((c) => {
      const s = byId.get(c.studentId)!;
      const comp = copyCompetenceScores(c);
      return [
        s.anonCode,
        GROUP_LABELS[s.group],
        s.classCode,
        TEST_LABELS[c.test],
        ...itemIds.map((i) => c.items[i]?.points ?? 0),
        ...COMPETENCES.map((k) => comp[k]),
        copyScore(c),
        copyErrors(c).join(' '),
        c.pendingManual ? 'oui' : 'non',
        c.source,
      ];
    });
  return toCsv([header, ...rows]);
}

/** Résumé statistique (expérimentation + questionnaire). */
export function summaryCsv(data: TeacherData): string {
  const a = analyzeExperiment(data.students, data.copies);
  const q = analyzeQuestionnaire(data.responses, data.settings.confirmThreshold);
  const g = (x: typeof a.exp) => [
    GROUP_LABELS[x.group], x.nPre, x.nPost, x.nPaired, x.meanPre, x.sdPre, x.meanPost, x.sdPost, x.meanGain, x.sdGain, x.meanNormGain,
    ...COMPETENCES.flatMap((c) => [x.byCompetence[c].pre, x.byCompetence[c].post]),
    ...MAIN_ERRORS.flatMap((e) => [x.errorsPre[e], x.errorsPost[e]]),
  ];
  const rows: unknown[][] = [
    ['groupe', 'n_pré', 'n_post', 'n_apparié', 'moyenne_pré', 'écart-type_pré', 'moyenne_post', 'écart-type_post', 'gain_moyen', 'écart-type_gain', 'gain_normalisé_moyen', ...COMPETENCES.flatMap((c) => [`${c}_pré`, `${c}_post`]), ...MAIN_ERRORS.flatMap((e) => [`${e}_pré_%`, `${e}_post_%`])],
    g(a.exp),
    g(a.tem),
    [],
    ['comparaison', 't', 'ddl', 'p', 'd_Cohen'],
    ['pré-test (Welch)', a.preTest.t, a.preTest.df, a.preTest.p, ''],
    ['gains (Welch)', a.gainTest.t, a.gainTest.df, a.gainTest.p, a.gainD],
    ['erreurs en moins (Welch)', a.errorTest.t, a.errorTest.df, a.errorTest.p, ''],
    [],
    ['hypothèse', 'résultat', 'détail'],
    ['H1 : le groupe expérimental progresse plus que le groupe témoin', a.h1.status, a.h1.text],
    ['H2 : les erreurs E1 à E6 diminuent davantage dans le groupe expérimental', a.h2.status, a.h2.text],
    [],
    ['questionnaire : répondants', q.respondents],
    ['erreur', 'concernés_%', 'conception_erronée_%', 'manque_de_connaissance_%', 'confirmée'],
    ...q.byError.map((e) => [e.code, e.total, e.conception, e.manque, q.confirmed.includes(e.code) ? 'oui' : 'non']),
  ];
  if (a.smallSample) rows.push([], ['Effectif faible : interpréter avec prudence.']);
  return toCsv(rows);
}

export function exportAll(data: TeacherData) {
  downloadText(`rclab_questionnaire_${stamp()}.csv`, questionnaireCsv(data));
  window.setTimeout(() => downloadText(`rclab_pre_post_${stamp()}.csv`, testsCsv(data)), 300);
  window.setTimeout(() => downloadText(`rclab_tentatives_${stamp()}.csv`, attemptsCsv(data.students, data.attempts)), 600);
  window.setTimeout(() => downloadText(`rclab_resume_statistique_${stamp()}.csv`, summaryCsv(data)), 900);
}

export const EXPORTS = [
  { id: 'questionnaire', label: 'Réponses au questionnaire (certitude, codes)', run: (d: TeacherData) => downloadText(`rclab_questionnaire_${stamp()}.csv`, questionnaireCsv(d)) },
  { id: 'tests', label: 'Scores pré/post par question et par compétence', run: (d: TeacherData) => downloadText(`rclab_pre_post_${stamp()}.csv`, testsCsv(d)) },
  { id: 'attempts', label: 'Tentatives d’exercices', run: (d: TeacherData) => downloadText(`rclab_tentatives_${stamp()}.csv`, attemptsCsv(d.students, d.attempts)) },
  { id: 'summary', label: 'Résumé statistique', run: (d: TeacherData) => downloadText(`rclab_resume_statistique_${stamp()}.csv`, summaryCsv(d)) },
];

