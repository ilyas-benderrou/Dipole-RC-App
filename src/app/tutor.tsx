import { MessageCircleOff, MessageCircle, Minus, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { APP, STORAGE_KEYS } from '../config/app';
import { ADAPTIVE } from '../config/adaptive';
import { TUTOR_LINES, fillTemplate, pickLine, type TutorMood, type TutorSituation } from '../content/tutor';
import { Capi } from '../components/Capi';
import { RichText } from '../components/Tex';

interface TutorPrefs {
  muted: boolean;
  minimized: boolean;
  last: Partial<Record<TutorSituation, number>>;
}

function readPrefs(): TutorPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tutor);
    if (raw) return { muted: false, minimized: false, last: {}, ...JSON.parse(raw) };
  } catch {
    // ignoré
  }
  return { muted: false, minimized: false, last: {} };
}

function writePrefs(p: TutorPrefs) {
  try {
    localStorage.setItem(STORAGE_KEYS.tutor, JSON.stringify(p));
  } catch {
    // ignoré
  }
}

export interface SayOptions {
  /** Réaction à une réponse : passe outre la limite d'un message toutes les 30 s. */
  reaction?: boolean;
  vars?: Record<string, string>;
  /** Niveau de la jauge (0–1) pour l'état « se charge ». */
  level?: number;
}

interface TutorValue {
  say(situation: TutorSituation, options?: SayOptions): void;
  setMood(mood: TutorMood): void;
  setHidden(hidden: boolean): void;
  setLevel(level: number): void;
}

const TutorContext = createContext<TutorValue | null>(null);

/**
 * Le tuteur Capi : discret (au plus un message toutes les 30 s, sauf réaction à une réponse),
 * caché pendant le questionnaire diagnostique.
 */
export function TutorProvider({ children, firstName }: { children: ReactNode; firstName: string }) {
  const [prefs, setPrefs] = useState<TutorPrefs>(readPrefs);
  const [message, setMessage] = useState<string | null>(null);
  const [mood, setMoodState] = useState<TutorMood>('idle');
  const [hidden, setHidden] = useState(false);
  const [level, setLevel] = useState(0.2);
  const [confetti, setConfetti] = useState(false);
  const lastAt = useRef(0);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const moodTimer = useRef<number | undefined>(undefined);

  const update = useCallback((p: Partial<TutorPrefs>) => {
    setPrefs((old) => {
      const next = { ...old, ...p };
      writePrefs(next);
      return next;
    });
  }, []);

  const say = useCallback(
    (situation: TutorSituation, options: SayOptions = {}) => {
      const now = Date.now();
      if (!options.reaction && now - lastAt.current < ADAPTIVE.tutorMinIntervalSec * 1000) return;
      lastAt.current = now;
      const { index, text } = pickLine(situation, prefsRef.current.last[situation]);
      update({ last: { ...prefsRef.current.last, [situation]: index } });
      const m = TUTOR_LINES[situation].mood;
      setMoodState(m);
      if (options.level !== undefined) setLevel(options.level);
      if (!prefsRef.current.muted) setMessage(fillTemplate(text, { prenom: firstName, ...options.vars }));
      const celebrate = situation === 'levelUp' || situation === 'streak3' || situation === 'finished' || situation === 'success';
      setConfetti(celebrate);
      window.clearTimeout(moodTimer.current);
      moodTimer.current = window.setTimeout(() => {
        setMoodState('idle');
        setConfetti(false);
      }, 6000);
    },
    [firstName, update],
  );

  useEffect(() => () => window.clearTimeout(moodTimer.current), []);

  const value = useMemo<TutorValue>(
    () => ({
      say,
      setMood: (m) => setMoodState(m),
      setHidden,
      setLevel,
    }),
    [say],
  );

  return (
    <TutorContext.Provider value={value}>
      {children}
      {!hidden && (
        <div className="no-print fixed bottom-24 right-3 z-40 flex items-end gap-2 lg:bottom-6 lg:right-6" aria-live="polite">
          {!prefs.minimized && message && !prefs.muted && (
            <div className="glass glass-strong page-enter relative mb-10 max-w-[17rem] rounded-[18px] rounded-br-md p-3 pr-7 text-sm leading-snug text-ink sm:max-w-xs">
              <p className="label-caps mb-0.5 text-teal-700">{APP.tutorName}</p>
              <RichText text={message} />
              <button type="button" className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-muted hover:bg-white" onClick={() => setMessage(null)} aria-label="Fermer le message">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex flex-col items-center">
            {!prefs.minimized ? (
              <>
                <div className="mb-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => update({ muted: !prefs.muted })}
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-teal-700 shadow ring-1 ring-white hover:bg-white"
                    aria-label={prefs.muted ? `Réactiver les messages de ${APP.tutorName}` : `Couper les messages de ${APP.tutorName}`}
                    title={prefs.muted ? 'Réactiver les messages' : 'Couper les messages'}
                  >
                    {prefs.muted ? <MessageCircleOff size={14} /> : <MessageCircle size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ minimized: true })}
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-teal-700 shadow ring-1 ring-white hover:bg-white"
                    aria-label={`Réduire ${APP.tutorName}`}
                    title="Réduire"
                  >
                    <Minus size={14} />
                  </button>
                </div>
                <div className="drop-shadow-[0_12px_14px_rgba(22,50,79,0.25)]">
                  <Capi mood={mood} level={level} size={70} confetti={confetti} />
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => update({ minimized: false })}
                className="glass glass-strong grid h-14 w-14 place-items-center rounded-full p-1"
                aria-label={`Afficher ${APP.tutorName}`}
                title={APP.tutorName}
              >
                <Capi mood="idle" size={34} level={level} />
              </button>
            )}
          </div>
        </div>
      )}
    </TutorContext.Provider>
  );
}

const NOOP: TutorValue = { say: () => {}, setMood: () => {}, setHidden: () => {}, setLevel: () => {} };

export function useTutor(): TutorValue {
  return useContext(TutorContext) ?? NOOP;
}
