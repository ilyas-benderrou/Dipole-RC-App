import { mulberry32, newSeed } from '../../engine/rng';
import type { Level } from '../../engine/types';
import { DIFFICILE } from './difficile';
import { FACILE } from './facile';
import { MOYEN } from './moyen';
import type { ExerciseInstance, ExerciseTemplate } from './types';
import { valueKeyOf } from './values';

export const TEMPLATES: ExerciseTemplate[] = [...FACILE, ...MOYEN, ...DIFFICILE];

export function getTemplate(id: string): ExerciseTemplate {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Gabarit inconnu : ${id}`);
  return t;
}

export const templatesOfLevel = (level: Level) => TEMPLATES.filter((t) => t.level === level && !t.remediationOnly);

/** Instance déterministe d'un gabarit (même graine → même exercice). */
export function createInstance(templateId: string, seed: number): ExerciseInstance {
  const tpl = getTemplate(templateId);
  const g = tpl.generate(mulberry32(seed));
  return {
    ...g,
    templateId,
    level: tpl.level,
    seed,
    source: tpl.source,
    valueKey: g.valueKey ?? valueKeyOf(g.values),
  };
}

/**
 * Nouvelle instance avec des valeurs jamais vues par cet apprenant pour ce gabarit
 * (si toutes les variantes ont déjà été vues — QCM à 4 items —, on accepte une répétition).
 */
export function createFreshInstance(templateId: string, seen: string[] = [], seedSource: () => number = newSeed): ExerciseInstance {
  let inst = createInstance(templateId, seedSource());
  for (let tries = 0; tries < 60 && seen.includes(inst.valueKey); tries++) inst = createInstance(templateId, seedSource());
  return inst;
}

export type { ExerciseInstance, ExerciseTemplate } from './types';
