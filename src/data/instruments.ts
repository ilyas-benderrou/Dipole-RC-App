import { ADAPTIVE } from '../config/adaptive';
import { QUESTIONS, type QQuestion } from '../content/questionnaire';
import { TESTS, type TestItem } from '../content/tests';
import { mulberry32, hashSeed, shuffle } from '../engine/rng';
import { COMPETENCES, MAIN_ERRORS, type Competence, type ErrorCode, type MainError, type TestId } from '../engine/types';
import { isClose, isPowerOfTenOff, parseQuantity } from '../physics/units';
import type { CopyItem, OptionKey, QuestionnaireAnswer, QuestionnaireResponse, Student, TestCopy } from './types';

// ---------------------------------------------------------------------------
// Questionnaire diagnostique : codage CRI (section 11)
// ---------------------------------------------------------------------------

export type CriCategory = 'maitrise' | 'devinee' | 'manque' | 'conception' | 'sans_reponse';

export const CRI_LABELS: Record<Exclude<CriCategory, 'sans_reponse'>, string> = {
  maitrise: 'Maîtrise',
  devinee: 'Réponse devinée',
  manque: 'Manque de connaissance',
  conception: 'Conception erronée',
};

/**
 * Fausse + certitude 2 ou 3 → conception erronée ; fausse + 0 ou 1 → manque de connaissance ;
 * juste + 2 ou 3 → maîtrise ; juste + 0 ou 1 → réponse devinée.
 */
export function criCategory(q: QQuestion, a: QuestionnaireAnswer | undefined): CriCategory {
  if (!a || !a.choice) return 'sans_reponse';
  const high = (a.certainty ?? 0) >= 2;
  const right = a.choice === q.correct;
  if (right) return high ? 'maitrise' : 'devinee';
  return high ? 'conception' : 'manque';
}

/** Ordre des propositions mélangé pour chaque apprenant (déterministe ; le code reste attaché à la proposition). */
export function questionnaireOrder(studentId: string): Record<string, OptionKey[]> {
  const rng = mulberry32(hashSeed(`questionnaire:${studentId}`));
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, shuffle(rng, ['a', 'b', 'c', 'd'] as OptionKey[])]));
}

export interface QuestionnaireAnalysis {
  respondents: number;
  /** Par erreur : % d'apprenants concernés, séparés en conception erronée / manque de connaissance. */
  byError: { code: MainError; conception: number; manque: number; total: number; highCertaintyPercent: number }[];
  byQuestion: { id: string; counts: Record<OptionKey | 'none', number>; correct: OptionKey; meanCertainty: number | null; correctPercent: number }[];
  matrix: Record<Exclude<CriCategory, 'sans_reponse'>, number>;
  confirmed: MainError[];
  threshold: number;
}

export function analyzeQuestionnaire(responses: QuestionnaireResponse[], threshold = ADAPTIVE.confirmedErrorThreshold): QuestionnaireAnalysis {
  const done = responses.filter((r) => r.submittedAt);
  const n = done.length;
  const pct = (k: number) => (n ? Math.round((k / n) * 100) : 0);

  const byError = MAIN_ERRORS.map((code) => {
    let conception = 0;
    let manque = 0;
    for (const r of done) {
      const hits = QUESTIONS.filter((q) => {
        const a = r.answers[q.id];
        return a?.choice && a.choice !== q.correct && q.options[a.choice].codes.includes(code);
      });
      if (!hits.length) continue;
      if (hits.some((q) => (r.answers[q.id].certainty ?? 0) >= 2)) conception++;
      else manque++;
    }
    return { code, conception: pct(conception), manque: pct(manque), total: pct(conception + manque), highCertaintyPercent: n ? conception / n : 0 };
  });

  const byQuestion = QUESTIONS.map((q) => {
    const counts: Record<OptionKey | 'none', number> = { a: 0, b: 0, c: 0, d: 0, none: 0 };
    const certs: number[] = [];
    for (const r of done) {
      const a = r.answers[q.id];
      if (a?.choice) counts[a.choice]++;
      else counts.none++;
      if (a?.certainty !== null && a?.certainty !== undefined) certs.push(a.certainty);
    }
    return {
      id: q.id,
      counts,
      correct: q.correct,
      meanCertainty: certs.length ? certs.reduce((s, v) => s + v, 0) / certs.length : null,
      correctPercent: pct(counts[q.correct]),
    };
  });

  const matrix = { maitrise: 0, devinee: 0, manque: 0, conception: 0 };
  for (const r of done) for (const q of QUESTIONS) {
    const c = criCategory(q, r.answers[q.id]);
    if (c !== 'sans_reponse') matrix[c]++;
  }

  return {
    respondents: n,
    byError,
    byQuestion,
    matrix,
    confirmed: byError.filter((e) => n > 0 && e.highCertaintyPercent >= threshold).map((e) => e.code),
    threshold,
  };
}

// ---------------------------------------------------------------------------
// Pré-test / post-test : correction des copies saisies (section 13.2)
// ---------------------------------------------------------------------------

/** Correction automatique d'un élément (NUM : ±2 % et unité vérifiée ; choix : lettre). Les critères restent manuels. */
export function gradeItem(item: TestItem, raw: string): { points: number; code: ErrorCode | null; correct: boolean | null; note?: string } {
  const s = raw.trim();
  if (item.kind === 'criterion') return { points: 0, code: null, correct: null };
  if (!s) return { points: 0, code: null, correct: false };
  if (item.kind === 'choice') {
    const key = s.toLowerCase().charAt(0);
    const opt = item.options?.find((o) => o.key === key || o.text.toLowerCase() === s.toLowerCase());
    if (!opt) return { points: 0, code: null, correct: false, note: 'choix non reconnu' };
    if (opt.key === item.correctKey) return { points: item.points, code: null, correct: true };
    return { points: 0, code: opt.code, correct: false };
  }
  const parsed = parseQuantity(s, item.quantity!);
  if (!parsed) return { points: 0, code: null, correct: false, note: 'valeur non reconnue' };
  const v = parsed.value;
  if (isClose(v, item.answer!, ADAPTIVE.numTolerance)) return { points: item.points, code: null, correct: true };
  for (const d of item.distractors ?? []) {
    if (d.value === 0 ? Math.abs(v) < 1e-15 : isClose(v, d.value, ADAPTIVE.numTolerance)) return { points: 0, code: d.code, correct: false };
  }
  if (isPowerOfTenOff(v, item.answer!)) return { points: 0, code: 'EX', correct: false, note: 'puissance de 10 ou unité' };
  return { points: 0, code: null, correct: false };
}

export function emptyCopy(studentId: string, test: TestId, id: string): TestCopy {
  const items: Record<string, CopyItem> = {};
  for (const it of TESTS[test].items) items[it.id] = { raw: '', points: 0, code: null, codeAuto: true };
  const now = new Date().toISOString();
  return { id, studentId, test, items, pendingManual: true, source: 'saisie', enteredAt: now, updatedAt: now };
}

/** Met à jour un élément à partir de la réponse saisie (points et code proposés automatiquement). */
export function applyRaw(copy: TestCopy, itemId: string, raw: string): TestCopy {
  const item = TESTS[copy.test].items.find((i) => i.id === itemId);
  if (!item) return copy;
  const prev = copy.items[itemId] ?? { raw: '', points: 0, code: null, codeAuto: true };
  if (item.kind === 'criterion') return { ...copy, items: { ...copy.items, [itemId]: { ...prev, raw } } };
  const g = gradeItem(item, raw);
  return { ...copy, items: { ...copy.items, [itemId]: { raw, points: g.points, code: prev.codeAuto ? g.code : prev.code, codeAuto: prev.codeAuto } } };
}

export function copyScore(copy: TestCopy): number {
  return TESTS[copy.test].items.reduce((s, it) => s + Math.min(it.points, Math.max(0, copy.items[it.id]?.points ?? 0)), 0);
}

export function copyCompetenceScores(copy: TestCopy): Record<Competence, number> {
  const out = Object.fromEntries(COMPETENCES.map((c) => [c, 0])) as Record<Competence, number>;
  for (const it of TESTS[copy.test].items) out[it.competence] += Math.min(it.points, Math.max(0, copy.items[it.id]?.points ?? 0));
  return out;
}

export function competenceMax(test: TestId): Record<Competence, number> {
  const out = Object.fromEntries(COMPETENCES.map((c) => [c, 0])) as Record<Competence, number>;
  for (const it of TESTS[test].items) out[it.competence] += it.points;
  return out;
}

/** Erreurs E1–E6 présentes dans une copie. */
export function copyErrors(copy: TestCopy): MainError[] {
  return [...new Set(Object.values(copy.items).map((i) => i.code).filter((c): c is MainError => !!c && c !== 'EX'))];
}

// ---------------------------------------------------------------------------
// Import CSV des copies : code apprenant ; test ; question ; réponse ; points ; code d'erreur
// ---------------------------------------------------------------------------

export interface CsvImportResult {
  copies: TestCopy[];
  imported: number;
  errors: string[];
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const TEST_ALIASES: Record<string, TestId> = { pre: 'pre', 'pré': 'pre', 'pre-test': 'pre', 'pré-test': 'pre', pretest: 'pre', post: 'post', 'post-test': 'post', posttest: 'post' };

export function parseCopiesCsv(text: string, students: Student[], existing: TestCopy[], newCopyId: () => string): CsvImportResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (!lines.length) return { copies: [], imported: 0, errors: ['Fichier vide.'] };
  const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const header = splitCsvLine(lines[0], sep).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => h.includes('code') || h.includes('question'));
  const rows = hasHeader ? lines.slice(1) : lines;
  const byAnon = new Map(students.map((s) => [s.anonCode.toUpperCase(), s]));
  const copies = new Map<string, TestCopy>();
  existing.forEach((c) => copies.set(`${c.studentId}|${c.test}`, structuredClone(c)));
  let imported = 0;
  const touched = new Map<string, Set<string>>();
  rows.forEach((line, idx) => {
    const n = idx + (hasHeader ? 2 : 1);
    const [code, testRaw, question, answer = '', points = '', errCode = ''] = splitCsvLine(line, sep);
    const s = byAnon.get((code ?? '').toUpperCase());
    if (!s) return errors.push(`Ligne ${n} : code apprenant inconnu « ${code} ».`);
    const test = TEST_ALIASES[(testRaw ?? '').toLowerCase()];
    if (!test) return errors.push(`Ligne ${n} : test inconnu « ${testRaw} » (pré ou post).`);
    const item = TESTS[test].items.find((i) => i.id === question);
    if (!item) return errors.push(`Ligne ${n} : question inconnue « ${question} ».`);
    const key = `${s.id}|${test}`;
    let copy = copies.get(key) ?? { ...emptyCopy(s.id, test, newCopyId()), source: 'csv' as const };
    copy = applyRaw(copy, item.id, answer);
    const it = copy.items[item.id];
    if (points.trim() !== '') {
      const p = Number(points.replace(',', '.'));
      if (Number.isFinite(p)) it.points = Math.max(0, Math.min(item.points, p));
    }
    if (errCode.trim()) {
      const c = errCode.trim().toUpperCase();
      if (['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'EX'].includes(c)) {
        it.code = c as ErrorCode;
        it.codeAuto = false;
      }
    }
    copy.updatedAt = new Date().toISOString();
    const seen = touched.get(key) ?? new Set<string>();
    if (item.kind !== 'criterion' || points.trim() !== '') seen.add(item.id);
    touched.set(key, seen);
    // « À corriger » tant qu'un critère de correction manuelle (2.1, 2.2) n'a pas reçu de points.
    copy.pendingManual = TESTS[test].items.some((i) => i.kind === 'criterion' && !seen.has(i.id)) && copy.pendingManual;
    copies.set(key, copy);
    imported++;
  });
  return { copies: [...copies.values()], imported, errors };
}
