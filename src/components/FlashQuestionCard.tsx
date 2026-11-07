import { CheckCircle2, Lightbulb, Zap } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { errorHint } from '../content/errors';
import type { FlashQuestion } from '../content/lessons';
import type { ErrorCode } from '../engine/types';
import { mulberry32, shuffle } from '../engine/rng';
import { ChoiceList } from './inputs';
import { RichText, Tex } from './Tex';
import { Button, Notice } from './ui';

/**
 * Question flash : en cas d'erreur, l'indice de l'erreur liée s'affiche (jamais la bonne réponse) et l'apprenant réessaie.
 */
export function FlashQuestionCard({
  question,
  seed,
  title = 'Question flash',
  done,
  onCorrect,
  onWrong,
  wrongExtra,
  wrongHint,
}: {
  question: FlashQuestion;
  seed: number;
  title?: string;
  done?: boolean;
  onCorrect: () => void;
  onWrong?: (code: ErrorCode | null) => void;
  wrongExtra?: ReactNode;
  wrongHint?: string;
}) {
  const options = useMemo(() => shuffle(mulberry32(seed), question.options), [question, seed]);
  const [choice, setChoice] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'ok'>(done ? 'ok' : 'idle');
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div className="glass p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="pastille pastille-rose h-9 w-9">
          <Zap size={18} />
        </span>
        <p className="label-caps">{title}</p>
      </div>
      <p className="mb-3 text-[1.02rem] font-semibold text-ink">
        <RichText text={question.prompt} />
      </p>
      <ChoiceList
        name={question.prompt}
        value={choice}
        onChange={(v) => {
          setChoice(v);
          if (status === 'wrong') setStatus('idle');
        }}
        disabled={status === 'ok'}
        render={question.render}
        columns={question.options.length > 2 && question.render !== 'tex' ? 2 : question.options.length === 2 ? 2 : 1}
        options={options.map((o) => ({ id: o.id, content: question.render === 'tex' ? <Tex math={o.text} /> : <RichText text={o.text} /> }))}
      />
      <div className="mt-3 space-y-3">
        {status === 'ok' ? (
          <Notice tone="ok" icon={<CheckCircle2 size={18} />} title="C’est juste !" />
        ) : (
          <Button
            disabled={!choice}
            onClick={() => {
              const o = options.find((x) => x.id === choice);
              if (!o) return;
              if (o.correct) {
                setStatus('ok');
                setHint(null);
                onCorrect();
              } else {
                setStatus('wrong');
                setHint(o.code ? errorHint(o.code, o.code === 'EX' ? 'energie' : null) : (wrongHint ?? 'Revois la vidéo puis réessaie.'));
                onWrong?.(o.code);
              }
            }}
          >
            Vérifier
          </Button>
        )}
        {status === 'wrong' && hint && (
          <Notice tone="tip" icon={<Lightbulb size={18} className="text-amber-600" />} title="Pas tout à fait…">
            <RichText text={hint} />
            {wrongExtra && <div className="mt-2">{wrongExtra}</div>}
          </Notice>
        )}
      </div>
    </div>
  );
}
