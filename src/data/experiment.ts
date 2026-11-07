import { ADAPTIVE } from '../config/adaptive';
import { COMPETENCES, MAIN_ERRORS, type Competence, type MainError } from '../engine/types';
import { competenceMax, copyCompetenceScores, copyErrors, copyScore } from './instruments';
import { cohenD, mean, normalizedGain, sd, welch, type WelchResult } from './stats';
import type { Student, TestCopy } from './types';

export type ExpGroup = 'experimental' | 'temoin';

export interface GroupStats {
  group: ExpGroup;
  nPre: number;
  nPost: number;
  nPaired: number;
  pre: number[];
  post: number[];
  gains: number[];
  normGains: number[];
  meanPre: number;
  sdPre: number;
  meanPost: number;
  sdPost: number;
  meanGain: number;
  sdGain: number;
  meanNormGain: number;
  byCompetence: Record<Competence, { pre: number; post: number; max: number }>;
  errorsPre: Record<MainError, number>;
  errorsPost: Record<MainError, number>;
  /** Par apprenant : nombre d'erreurs E1–E6 distinctes au pré-test moins au post-test. */
  errorReduction: number[];
  points: { label: string; pre: number; post: number }[];
}

export interface ExperimentAnalysis {
  exp: GroupStats;
  tem: GroupStats;
  preTest: WelchResult;
  gainTest: WelchResult;
  gainD: number;
  errorTest: WelchResult;
  smallSample: boolean;
  /** Copies « À corriger » (2.1 et 2.2 non corrigées) : exclues tant qu'elles ne sont pas corrigées. */
  excludedPending: number;
  h1: { status: 'confirmée' | 'tendance' | 'non confirmée' | 'insuffisant'; text: string };
  h2: { status: 'confirmée' | 'tendance' | 'non confirmée' | 'insuffisant'; text: string };
}

function groupStats(group: ExpGroup, students: Student[], copies: TestCopy[]): GroupStats {
  const ids = students.filter((s) => s.group === group);
  const pre = new Map<string, TestCopy>();
  const post = new Map<string, TestCopy>();
  for (const c of copies) {
    if (!ids.some((s) => s.id === c.studentId)) continue;
    (c.test === 'pre' ? pre : post).set(c.studentId, c);
  }
  const preScores = [...pre.values()].map(copyScore);
  const postScores = [...post.values()].map(copyScore);
  const paired = ids.filter((s) => pre.has(s.id) && post.has(s.id));
  const gains = paired.map((s) => copyScore(post.get(s.id)!) - copyScore(pre.get(s.id)!));
  const normGains = paired.map((s) => normalizedGain(copyScore(pre.get(s.id)!), copyScore(post.get(s.id)!))).filter(Number.isFinite);
  const maxPre = competenceMax('pre');
  const byCompetence = Object.fromEntries(
    COMPETENCES.map((c) => [
      c,
      {
        pre: mean([...pre.values()].map((x) => copyCompetenceScores(x)[c])),
        post: mean([...post.values()].map((x) => copyCompetenceScores(x)[c])),
        max: maxPre[c],
      },
    ]),
  ) as GroupStats['byCompetence'];
  const errPct = (m: Map<string, TestCopy>) =>
    Object.fromEntries(MAIN_ERRORS.map((e) => [e, m.size ? Math.round(([...m.values()].filter((c) => copyErrors(c).includes(e)).length / m.size) * 100) : 0])) as Record<MainError, number>;
  return {
    group,
    nPre: pre.size,
    nPost: post.size,
    nPaired: paired.length,
    pre: preScores,
    post: postScores,
    gains,
    normGains,
    meanPre: mean(preScores),
    sdPre: sd(preScores),
    meanPost: mean(postScores),
    sdPost: sd(postScores),
    meanGain: mean(gains),
    sdGain: sd(gains),
    meanNormGain: mean(normGains),
    byCompetence,
    errorsPre: errPct(pre),
    errorsPost: errPct(post),
    errorReduction: paired.map((s) => copyErrors(pre.get(s.id)!).length - copyErrors(post.get(s.id)!).length),
    points: paired.map((s) => ({ label: s.anonCode, pre: copyScore(pre.get(s.id)!), post: copyScore(post.get(s.id)!) })),
  };
}

function verdict(diffPositive: boolean, p: number, enough: boolean) {
  if (!enough || !Number.isFinite(p)) return 'insuffisant' as const;
  if (diffPositive && p < 0.05) return 'confirmée' as const;
  if (diffPositive) return 'tendance' as const;
  return 'non confirmée' as const;
}

/** Analyse de l'expérimentation : groupe expérimental contre groupe témoin (section 14.5). */
export function analyzeExperiment(students: Student[], allCopies: TestCopy[]): ExperimentAnalysis {
  const copies = allCopies.filter((c) => !c.pendingManual);
  const exp = groupStats('experimental', students, copies);
  const tem = groupStats('temoin', students, copies);
  const preTest = welch(exp.pre, tem.pre);
  const gainTest = welch(exp.gains, tem.gains);
  const errorTest = welch(exp.errorReduction, tem.errorReduction);
  const enough = exp.nPaired >= 2 && tem.nPaired >= 2;
  const h1s = verdict(exp.meanGain > tem.meanGain, gainTest.p, enough);
  const meanRedExp = mean(exp.errorReduction);
  const meanRedTem = mean(tem.errorReduction);
  const h2s = verdict(meanRedExp > meanRedTem, errorTest.p, enough);
  const pTxt = (p: number) => (p < 0.001 ? '< 0,001' : p.toFixed(3).replace('.', ','));
  return {
    exp,
    tem,
    preTest,
    gainTest,
    gainD: cohenD(exp.gains, tem.gains),
    errorTest,
    smallSample: exp.nPaired < ADAPTIVE.smallSampleWarning || tem.nPaired < ADAPTIVE.smallSampleWarning,
    excludedPending: allCopies.filter((c) => c.pendingManual && students.some((s) => s.id === c.studentId && (s.group === 'experimental' || s.group === 'temoin'))).length,
    h1: {
      status: h1s,
      text:
        h1s === 'insuffisant'
          ? 'Il faut au moins deux apprenants par groupe avec les deux copies.'
          : `Gain moyen : ${exp.meanGain.toFixed(2).replace('.', ',')} (expérimental) contre ${tem.meanGain.toFixed(2).replace('.', ',')} (témoin) ; p = ${pTxt(gainTest.p)}.`,
    },
    h2: {
      status: h2s,
      text:
        h2s === 'insuffisant'
          ? 'Il faut au moins deux apprenants par groupe avec les deux copies.'
          : `Erreurs E1–E6 en moins par apprenant : ${meanRedExp.toFixed(2).replace('.', ',')} (expérimental) contre ${meanRedTem.toFixed(2).replace('.', ',')} (témoin) ; p = ${pTxt(errorTest.p)}.`,
    },
  };
}
