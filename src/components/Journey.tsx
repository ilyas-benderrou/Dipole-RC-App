import { Check, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { journeySteps, type JourneyStepId, type LearnerModel } from '../engine/adaptive';

const LINKS: Record<JourneyStepId, string> = {
  V0: '/apprenant/introduction',
  L1: '/apprenant/lecons/L1',
  L2: '/apprenant/lecons/L2',
  L3: '/apprenant/lecons/L3',
  L4: '/apprenant/lecons/L4',
  L5: '/apprenant/lecons/L5',
  facile: '/apprenant/exercices',
  moyen: '/apprenant/exercices',
  difficile: '/apprenant/exercices',
  bilan: '/apprenant/bilan',
};

/**
 * « Mon parcours » : piste horizontale de pastilles reliées (V0 → L1 … L5 → Facile → Moyen → Difficile → Bilan).
 * Faite = teal avec coche ; actuelle = pulse doucement ; future = grise avec cadenas.
 */
export function Journey({ model }: { model: LearnerModel }) {
  const steps = journeySteps(model);
  return (
    <ol className="thin-scroll flex items-start overflow-x-auto pb-2 pt-1" aria-label="Mon parcours">
      {steps.map((s, j) => {
        const pill =
          s.status === 'done' ? (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-white shadow-[0_8px_16px_-8px_rgba(15,124,124,0.9)]">
              <Check size={20} strokeWidth={3} />
            </span>
          ) : s.status === 'current' ? (
            <span className="pulse-step grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-bold text-teal-700 ring-[3px] ring-teal-500">{j + 1}</span>
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-200/80 text-slate-400 ring-1 ring-white">
              <Lock size={16} />
            </span>
          );
        return (
          <li key={s.id} className="flex shrink-0 items-start">
            <div className="flex w-[4.4rem] flex-col items-center gap-1.5 text-center">
              {s.status === 'locked' ? (
                <span aria-label={`${s.label} (verrouillé)`}>{pill}</span>
              ) : (
                <Link to={LINKS[s.id]} aria-label={`${s.label}${s.status === 'done' ? ' (fait)' : ' (étape actuelle)'}`} className="rounded-full">
                  {pill}
                </Link>
              )}
              <span className={`text-xs font-semibold ${s.status === 'locked' ? 'text-slate-400' : s.status === 'current' ? 'text-teal-700' : 'text-ink'}`}>{s.label}</span>
            </div>
            {j < steps.length - 1 && <span className={`mt-[21px] h-[3px] w-5 shrink-0 rounded-full sm:w-7 ${s.status === 'done' ? 'bg-teal-500' : 'bg-slate-300/70'}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
