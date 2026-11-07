import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Send, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { RichText } from '../../components/Tex';
import { Button, Card, Modal, Notice, Pastille } from '../../components/ui';
import { ADAPTIVE } from '../../config/adaptive';
import { CERTAINTY_LABELS, CRI_NOTE, QUESTIONNAIRE_CONTEXT, QUESTIONS } from '../../content/questionnaire';
import { questionnaireOrder } from '../../data/instruments';
import { newId, repo } from '../../data/repository';
import type { Certainty, OptionKey, QuestionnaireResponse } from '../../data/types';

const DURATION_MS = ADAPTIVE.questionnaireDurationMin * 60_000;

/**
 * Questionnaire diagnostique (section 13.1) : 20 min, aucune aide (pas d'indice, de vidéo, de simulation,
 * ni de retour juste/faux), tuteur caché, envoi automatique à la fin du temps, une seule passation.
 */
export function QuestionnairePage() {
  const { student, questionnaire } = useStudent();
  const tutor = useTutor();
  const [resp, setResp] = useState<QuestionnaireResponse | null>(questionnaire.response);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const respRef = useRef(resp);
  respRef.current = resp;

  const inProgress = !!resp && !resp.submittedAt;

  // Le tuteur est caché pendant le questionnaire.
  useEffect(() => {
    tutor.setHidden(inProgress);
    return () => tutor.setHidden(false);
  }, [inProgress, tutor]);

  const submit = useCallback(
    async (auto: boolean) => {
      const r = respRef.current;
      if (!r || r.submittedAt) return;
      const done = { ...r, submittedAt: new Date().toISOString(), autoSubmitted: auto };
      setResp(done);
      await repo.saveQuestionnaireResponse(done);
      await questionnaire.reload();
    },
    [questionnaire],
  );

  // Minuteur : envoi automatique à la fin du temps.
  useEffect(() => {
    if (!inProgress) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [inProgress]);
  const remaining = resp ? Math.max(0, new Date(resp.startedAt).getTime() + DURATION_MS - now) : DURATION_MS;
  useEffect(() => {
    if (inProgress && remaining <= 0) void submit(true);
  }, [inProgress, remaining, submit]);

  const start = async () => {
    const r: QuestionnaireResponse = { id: newId('qst'), studentId: student.id, startedAt: new Date().toISOString(), submittedAt: null, autoSubmitted: false, order: questionnaireOrder(student.id), answers: {} };
    setResp(r);
    setIndex(0);
    await repo.saveQuestionnaireResponse(r);
  };

  const update = (qid: string, patch: Partial<QuestionnaireResponse['answers'][string]>) => {
    setResp((old) => {
      if (!old || old.submittedAt) return old;
      const prev = old.answers[qid] ?? { choice: null, certainty: null };
      const next = { ...old, answers: { ...old.answers, [qid]: { ...prev, ...patch } } };
      void repo.saveQuestionnaireResponse(next);
      return next;
    });
  };

  const win = questionnaire.window;
  const isOpen = !!win?.open;

  if (resp?.submittedAt) {
    return (
      <StudentPage title="Questionnaire" requires="none" allowDuringQuestionnaire>
        <Card className="mx-auto max-w-xl text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 size={44} className="text-ok-500" />
            <p className="text-lg font-semibold text-ink">Merci ! Tes réponses ont bien été envoyées.</p>
            <p className="text-sm text-ink-soft">{resp.autoSubmitted ? 'Le temps était écoulé : tes réponses ont été envoyées automatiquement.' : 'Ce questionnaire n’est pas noté : il aide ton professeur à mieux t’accompagner.'}</p>
          </div>
        </Card>
      </StudentPage>
    );
  }

  if (!resp) {
    return (
      <StudentPage title="Questionnaire" requires="none" allowDuringQuestionnaire>
        <Card className="mx-auto max-w-2xl">
          <div className="flex items-start gap-4">
            <Pastille color="orange" size={52}>
              <ClipboardList size={24} />
            </Pastille>
            <div className="min-w-0 space-y-3">
              <h2 className="text-xl font-semibold text-ink">Questionnaire diagnostique</h2>
              {!isOpen ? (
                <Notice tone="info">Le questionnaire n’est pas ouvert pour ta classe. Il apparaîtra ici quand ton professeur l’ouvrira.</Notice>
              ) : (
                <>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    <li>12 questions, {ADAPTIVE.questionnaireDurationMin} minutes. Ce questionnaire n’est pas noté.</li>
                    <li>Après chaque question, indique ta certitude : 0 = je devine · 1 = peu sûr · 2 = assez sûr · 3 = certain.</li>
                    <li>Pour certaines questions, explique ta réponse en une phrase.</li>
                    <li>Pas d’aide pendant le questionnaire. À la fin du temps, tes réponses sont envoyées automatiquement.</li>
                  </ul>
                  {win?.deadline && <p className="text-sm text-ink-soft">Date limite : {new Date(win.deadline).toLocaleString('fr-FR')}</p>}
                  <Button size="lg" onClick={() => void start()}>
                    Commencer le questionnaire <ArrowRight size={18} />
                  </Button>
                  <p className="text-xs text-muted">{CRI_NOTE}</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </StudentPage>
    );
  }

  const q = QUESTIONS[index];
  const a = resp.answers[q.id] ?? { choice: null, certainty: null };
  const order = resp.order[q.id] ?? (['a', 'b', 'c', 'd'] as OptionKey[]);
  const answered = QUESTIONS.filter((x) => resp.answers[x.id]?.choice).length;
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <StudentPage title="Questionnaire" requires="none" allowDuringQuestionnaire>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="glass flex flex-wrap items-center gap-3 p-3">
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums ${remaining < 120000 ? 'bg-warn-100 text-warn-700' : 'bg-teal-50 text-teal-700'}`} role="timer" aria-live="off">
            <Timer size={16} /> {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </span>
          <div className="flex flex-1 flex-wrap gap-1" aria-label="Questions">
            {QUESTIONS.map((x, j) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setIndex(j)}
                className={`h-7 w-7 rounded-full text-xs font-bold ${j === index ? 'bg-teal-600 text-white' : resp.answers[x.id]?.choice ? 'bg-teal-100 text-teal-800' : 'bg-white/70 text-muted ring-1 ring-slate-200'}`}
                aria-label={`Question ${j + 1}${resp.answers[x.id]?.choice ? ' (répondue)' : ''}`}
              >
                {j + 1}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            {answered}/{QUESTIONS.length} répondues
          </span>
        </div>

        <Card>
          <p className="mb-3 rounded-xl bg-white/60 px-3 py-2 text-xs text-ink-soft">
            <RichText text={QUESTIONNAIRE_CONTEXT} />
          </p>
          <p className="label-caps">
            Question {index + 1} / {QUESTIONS.length}
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            <RichText text={q.prompt} />
          </p>
          <div className="mt-3 grid gap-2" role="radiogroup" aria-label={q.prompt}>
            {order.map((key, j) => {
              const on = a.choice === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update(q.id, { choice: key })}
                  className={`flex items-start gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm ring-1 transition ${on ? 'bg-teal-50 ring-2 ring-teal-500' : 'bg-white/75 ring-slate-200 hover:bg-white'}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${on ? 'bg-teal-600 text-white' : 'bg-ink/8 text-ink-soft'}`}>{String.fromCharCode(97 + j)}</span>
                  <span className="text-ink">
                    <RichText text={q.options[key].text} />
                  </span>
                </button>
              );
            })}
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-semibold text-ink-soft">Es-tu sûr(e) de ta réponse ?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CERTAINTY_LABELS.map((label, k) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={a.certainty === k}
                  onClick={() => update(q.id, { certainty: k as Certainty })}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold ring-1 transition ${a.certainty === k ? 'bg-ink text-white ring-ink' : 'bg-white/75 text-ink-soft ring-slate-200 hover:bg-white'}`}
                >
                  {k} · {label}
                </button>
              ))}
            </div>
          </fieldset>

          {q.explain && (
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">✍ Explique ta réponse en une phrase</span>
              <textarea className="field min-h-[4.5rem]" value={a.explanation ?? ''} onChange={(e) => update(q.id, { explanation: e.target.value })} maxLength={400} />
            </label>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft size={16} /> Précédente
            </Button>
            {index < QUESTIONS.length - 1 ? (
              <Button onClick={() => setIndex((i) => i + 1)}>
                Suivante <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={() => setConfirm(true)}>
                <Send size={16} /> Envoyer mes réponses
              </Button>
            )}
          </div>
        </Card>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Envoyer tes réponses ?">
        <p className="text-sm text-ink-soft">
          Tu as répondu à {answered} question{answered > 1 ? 's' : ''} sur {QUESTIONS.length}. Une fois envoyées, tes réponses ne pourront plus être modifiées.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Revenir
          </Button>
          <Button
            onClick={() => {
              setConfirm(false);
              void submit(false);
            }}
          >
            Envoyer
          </Button>
        </div>
      </Modal>
    </StudentPage>
  );
}
