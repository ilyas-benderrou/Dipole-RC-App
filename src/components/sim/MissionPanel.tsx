import { CheckCircle2, Circle, Lightbulb, Target } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { errorHint } from '../../content/errors';
import { MISSIONS, missionText } from '../../content/missions';
import { checkS2, checkS3, checkS5, checkS7, checkS8, checkTau } from '../../engine/missionChecks';
import type { MissionId } from '../../engine/types';
import { formatQuantity } from '../../physics/units';
import { ChoiceList, QuantityInput, quantityToSI, useQuantity } from '../inputs';
import { RichText, Tex } from '../Tex';
import { Badge, Button, Notice } from '../ui';
import type { Simulation } from './useSimulation';

export interface MissionResult {
  missionId: MissionId;
  success: boolean;
  durationSec: number;
}

function Step({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok-500" /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" />}
      <span className={done ? 'text-ink' : 'text-ink-soft'}>{children}</span>
    </li>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <Notice tone="tip" icon={<Lightbulb size={18} className="text-amber-600" />} title="Indice">
      <RichText text={text} />
    </Notice>
  );
}

function Success({ children }: { children?: ReactNode }) {
  return (
    <Notice tone="ok" icon={<CheckCircle2 size={18} />} title="Mission réussie !">
      {children}
    </Notice>
  );
}

/** Une charge complète depuis un condensateur vide, pendant au moins 5τ, avec la capacité donnée. */
function fullChargeWithC(sim: Simulation, C: number): boolean {
  const ph = sim.timeline.phases;
  return ph.some((p, j) => {
    if (p.k !== 1 || Math.abs(p.C - C) > C * 1e-6 || Math.abs(p.u0) > 0.05 * p.E) return false;
    const end = j + 1 < ph.length ? ph[j + 1].t0 : sim.t;
    return end - p.t0 >= 5 * p.R * p.C - 1e-12;
  });
}

/**
 * Panneau de mission (section 6.4) : la consigne, les étapes à faire dans la simulation et la vérification automatique.
 * La réponse n'est jamais donnée : en cas d'erreur, l'indice de l'erreur liée s'affiche et l'apprenant réessaie.
 */
export function MissionPanel({ id, sim, onComplete, context }: { id: MissionId; sim: Simulation; onComplete?: (r: MissionResult) => void; context?: string }) {
  const m = MISSIONS[id];
  const [startedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  const finish = () => {
    if (done) return;
    setDone(true);
    setHint(null);
    onComplete?.({ missionId: id, success: true, durationSec: Math.round((Date.now() - startedAt) / 1000) });
  };
  const fail = (text: string) => {
    setTries((n) => n + 1);
    setHint(text);
  };

  return (
    <div className="glass p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="pastille pastille-orange h-9 w-9">
          <Target size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label-caps">
            Mission {m.id} {context ? `· ${context}` : ''}
          </p>
          <p className="font-semibold text-ink">{m.title}</p>
        </div>
        {done && <Badge tone="ok">Réussie</Badge>}
        {!done && tries > 0 && <Badge tone="warn">Essai {tries + 1}</Badge>}
      </div>
      <p className="mb-3 rounded-xl bg-white/60 px-3 py-2 text-[0.95rem] font-medium text-ink ring-1 ring-white/80">
        « <RichText text={missionText(m)} /> »
      </p>
      <MissionBody id={id} sim={sim} done={done} onSuccess={finish} onFail={fail} />
      {hint && !done && <div className="mt-3"><Hint text={hint} /></div>}
    </div>
  );
}

interface BodyProps {
  id: MissionId;
  sim: Simulation;
  done: boolean;
  onSuccess: () => void;
  onFail: (hint: string) => void;
}

function MissionBody(props: BodyProps) {
  switch (props.id) {
    case 'S1':
      return <S1 {...props} />;
    case 'S2':
      return <S2 {...props} />;
    case 'S3':
      return <S3 {...props} />;
    case 'S4':
      return <S4 {...props} />;
    case 'S5':
      return <S5 {...props} />;
    case 'S6':
      return <S6 {...props} />;
    case 'S7':
      return <S7 {...props} />;
    case 'S8':
      return <S8 {...props} />;
  }
}

function S1({ sim, done, onSuccess, onFail }: BodyProps) {
  const [answer, setAnswer] = useState<'oui' | 'non' | null>(null);
  const charged = sim.fullChargeDone;
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={charged}>Bascule K en position 1 et laisse la charge aller jusqu’au bout (au moins 5τ).</Step>
        <Step done={done}>Observe les électrons près du diélectrique (en jaune), puis réponds.</Step>
      </ol>
      <ChoiceList
        name="Les électrons traversent-ils le diélectrique ?"
        value={answer}
        onChange={setAnswer}
        disabled={!charged || done}
        columns={2}
        options={[
          { id: 'oui', content: 'Oui, ils le traversent' },
          { id: 'non', content: 'Non, ils ne le traversent pas' },
        ]}
      />
      {done ? (
        <Success />
      ) : (
        <Button disabled={!charged || !answer} onClick={() => (answer === 'non' ? onSuccess() : onFail(errorHint('E1')))}>
          Vérifier
        </Button>
      )}
    </div>
  );
}

function S2({ sim, done, onSuccess, onFail }: BodyProps) {
  const C0 = useMemo(() => sim.timeline.phases[0].C / (sim.doubleC ? 2 : 1), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [q2, setQ2] = useQuantity('charge', 'µC');
  const [c2, setC2] = useQuantity('capacite', 'µF');
  const first = fullChargeWithC(sim, C0);
  const second = fullChargeWithC(sim, 2 * C0);
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={first}>
          Charge complètement le condensateur ({formatQuantity(C0, 'capacite')}) et relève <Tex math="q" />.
        </Step>
        <Step done={second}>
          Coche « ×2 », remets à zéro, puis charge à nouveau sous la même tension <Tex math="E" />.
        </Step>
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-soft">
            Charge avec 2C : <Tex math="q_2 =" />
          </span>
          <QuantityInput quantity="charge" value={q2} onChange={setQ2} disabled={done} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-soft">
            Capacité : <Tex math="C_2 = q_2 / u_C =" />
          </span>
          <QuantityInput quantity="capacite" value={c2} onChange={setC2} disabled={done} />
        </label>
      </div>
      {done ? (
        <Success />
      ) : (
        <Button
          disabled={!first || !second}
          onClick={() => {
            const r = checkS2(quantityToSI(q2), quantityToSI(c2), C0, sim.E);
            if (r.q && r.c) onSuccess();
            else onFail(errorHint('E2'));
          }}
        >
          Vérifier
        </Button>
      )}
    </div>
  );
}

function S3({ sim, done, onSuccess, onFail }: BodyProps) {
  const [uc0, setUc0] = useQuantity('tension', 'V');
  const [i0, setI0] = useQuantity('courant', 'mA');
  const [uc5, setUc5] = useQuantity('tension', 'V');
  const [i5, setI5] = useQuantity('courant', 'mA');
  const started = sim.timeline.phases.some((p) => p.k === 1);
  const [feedback, setFeedback] = useState<Record<string, boolean> | null>(null);
  const field = (label: ReactNode, q: 'tension' | 'courant', v: ReturnType<typeof useQuantity>[0], set: ReturnType<typeof useQuantity>[1], key: string) => (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-ink-soft">{label}</span>
      <QuantityInput quantity={q} value={v} onChange={set} disabled={done} invalid={feedback ? !feedback[key] : false} />
    </label>
  );
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={started}>Ferme K (position 1), laisse la charge se faire, puis mets en pause.</Step>
        <Step done={done}>Avec le curseur, relève les valeurs juste après la fermeture et après 5τ.</Step>
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        {field(<Tex math="u_C(0^+) =" />, 'tension', uc0, setUc0, 'uc0')}
        {field(<Tex math="i(0^+) =" />, 'courant', i0, setI0, 'i0')}
        {field(<Tex math="u_C(5\tau) =" />, 'tension', uc5, setUc5, 'uc5')}
        {field(<Tex math="i(5\tau) =" />, 'courant', i5, setI5, 'i5')}
      </div>
      {done ? (
        <Success />
      ) : (
        <Button
          disabled={!started}
          onClick={() => {
            const r = checkS3({ uc0: quantityToSI(uc0), i0: quantityToSI(i0), uc5: quantityToSI(uc5), i5: quantityToSI(i5) }, sim.E, sim.R);
            setFeedback(r);
            if (Object.values(r).every(Boolean)) onSuccess();
            else onFail(errorHint('E3'));
          }}
        >
          Vérifier mes 4 lectures
        </Button>
      )}
    </div>
  );
}

function S4({ sim, done, onSuccess, onFail }: BodyProps) {
  const [tau, setTau] = useQuantity('temps', 'ms');
  const started = sim.fullChargeDone;
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={started}>Lance une charge complète (K en position 1).</Step>
        <Step done={done}>Repères cachés : utilise le curseur pour trouver τ sur la courbe de u_C.</Step>
      </ol>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink-soft">
          <Tex math="\tau =" />
        </span>
        <QuantityInput quantity="temps" value={tau} onChange={setTau} disabled={done} />
      </label>
      {done ? (
        <Success>Les repères sont maintenant affichés sur la courbe : compare avec ta lecture.</Success>
      ) : (
        <Button
          disabled={!started}
          onClick={() => {
            if (checkTau(quantityToSI(tau), sim.R * sim.C)) {
              sim.setMarkersAllowed(true);
              sim.setTool('markers', true);
              sim.setTool('tangent', true);
              onSuccess();
            } else onFail(errorHint('E5'));
          }}
        >
          Vérifier
        </Button>
      )}
    </div>
  );
}

function S5({ sim, done, onSuccess, onFail }: BodyProps) {
  const tau0 = useMemo(() => sim.R * sim.timeline.phases[0].C / (sim.doubleC ? 2 : 1), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [t1, setT1] = useQuantity('temps', 'ms');
  const [t2, setT2] = useQuantity('temps', 'ms');
  const [remark, setRemark] = useState<'double' | 'same' | 'half' | null>(null);
  const C0 = tau0 / sim.R;
  const first = fullChargeWithC(sim, C0);
  const second = fullChargeWithC(sim, 2 * C0);
  useEffect(() => {
    if (!sim.tools.compare) sim.setTool('compare', true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={first}>Charge le condensateur et mesure τ (l’outil « Comparaison » garde la courbe).</Step>
        <Step done={second}>Remets à zéro, coche « ×2 » (2C) et recommence la mesure.</Step>
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-soft">
            τ avec <Tex math="C" /> :
          </span>
          <QuantityInput quantity="temps" value={t1} onChange={setT1} disabled={done} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-soft">
            τ avec <Tex math="2C" /> :
          </span>
          <QuantityInput quantity="temps" value={t2} onChange={setT2} disabled={done} />
        </label>
      </div>
      <p className="text-sm font-semibold text-ink-soft">Que remarques-tu ?</p>
      <ChoiceList
        name="Que remarques-tu ?"
        value={remark}
        onChange={setRemark}
        disabled={done}
        options={[
          { id: 'same', content: 'τ ne change pas' },
          { id: 'double', content: 'Si C double, τ double' },
          { id: 'half', content: 'Si C double, τ est divisée par deux' },
        ]}
      />
      {done ? (
        <Success />
      ) : (
        <Button
          disabled={!first || !second || !remark}
          onClick={() => {
            const r = checkS5(quantityToSI(t1), quantityToSI(t2), tau0);
            if (r.ok1 && r.ok2 && r.ratioOk && remark === 'double') onSuccess();
            else onFail(errorHint('E5'));
          }}
        >
          Vérifier
        </Button>
      )}
    </div>
  );
}

function S6({ sim, done, onSuccess, onFail }: BodyProps) {
  const [sign, setSign] = useState<'pos' | 'neg' | 'zero' | null>(null);
  const [arrow, setArrow] = useState<'oppose' | 'meme' | null>(null);
  const switched = sim.timeline.phases.some((p, j) => j > 0 && p.k === 2 && p.u0 > 0.5 * p.E);
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={switched}>Le condensateur est chargé. Bascule K en position 2.</Step>
        <Step done={done}>Observe la flèche orange (sens réel du courant) et la courbe de i.</Step>
      </ol>
      <p className="text-sm font-semibold text-ink-soft">
        Pendant la décharge, le signe de <Tex math="i" /> est :
      </p>
      <ChoiceList
        name="Signe de i"
        value={sign}
        onChange={setSign}
        disabled={!switched || done}
        columns={2}
        options={[
          { id: 'pos', content: 'positif' },
          { id: 'neg', content: 'négatif' },
          { id: 'zero', content: 'nul' },
        ]}
      />
      <p className="text-sm font-semibold text-ink-soft">Pourquoi ? La flèche orange du sens réel est :</p>
      <ChoiceList
        name="Sens de la flèche"
        value={arrow}
        onChange={setArrow}
        disabled={!switched || done}
        options={[
          { id: 'meme', content: 'dans le même sens que la flèche d’orientation de i' },
          { id: 'oppose', content: 'dans le sens opposé à la flèche d’orientation de i : les charges repartent dans l’autre sens' },
        ]}
      />
      {done ? (
        <Success />
      ) : (
        <Button
          disabled={!switched || !sign || !arrow}
          onClick={() => {
            if (sign === 'neg' && arrow === 'oppose') onSuccess();
            else onFail(errorHint(sign === 'zero' ? 'E3' : 'E6'));
          }}
        >
          Vérifier
        </Button>
      )}
    </div>
  );
}

const S7_OPTIONS = [
  { id: 'a', tex: 'u_R - u_C = E', ok: false },
  { id: 'b', tex: 'u_R + u_C = E', ok: true },
  { id: 'c', tex: 'u_R + u_C = 0', ok: false },
  { id: 'd', tex: 'u_C - u_R = E', ok: false },
] as const;

function S7({ sim, done, onSuccess, onFail }: BodyProps) {
  const [eq, setEq] = useState<string | null>(null);
  const [eqOk, setEqOk] = useState(false);
  const [readings, setReadings] = useState<{ t: number }[]>([]);
  const [vals, setVals] = useState<{ uR: ReturnType<typeof useQuantity>[0]; uC: ReturnType<typeof useQuantity>[0] }[]>([]);
  const started = sim.timeline.phases.some((p) => p.k === 1);
  const unitV = { label: 'V', factor: 1 };
  const capture = () => {
    if (sim.cursor === null || readings.length >= 2) return;
    setReadings((r) => [...r, { t: sim.cursor! }]);
    setVals((v) => [...v, { uR: { raw: '', unit: unitV }, uC: { raw: '', unit: unitV } }]);
  };
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        <Step done={eqOk}>Choisis l’équation qui relie u_R, u_C et E pendant la charge.</Step>
        <Step done={readings.length === 2}>Lance la charge, place le curseur à deux instants différents et relève-les.</Step>
        <Step done={done}>Écris les valeurs lues et vérifie l’équation.</Step>
      </ol>
      <ChoiceList
        name="Équation de la charge"
        value={eq}
        onChange={(v) => {
          setEq(v);
          setEqOk(false);
        }}
        disabled={eqOk || done}
        columns={2}
        render="tex"
        options={S7_OPTIONS.map((o) => ({ id: o.id, content: <Tex math={o.tex} /> }))}
      />
      {!eqOk && (
        <Button
          size="sm"
          disabled={!eq}
          onClick={() => {
            if (S7_OPTIONS.find((o) => o.id === eq)?.ok) setEqOk(true);
            else onFail(errorHint('E4'));
          }}
        >
          Valider l’équation
        </Button>
      )}
      {eqOk && (
        <div className="space-y-2">
          <Button size="sm" variant="secondary" disabled={!started || sim.cursor === null || readings.length >= 2 || done} onClick={capture}>
            Relever le point du curseur ({readings.length}/2)
          </Button>
          {readings.map((r, j) => (
            <div key={j} className="grid items-end gap-2 rounded-xl bg-white/55 p-2 sm:grid-cols-[auto_1fr_1fr]">
              <span className="text-sm font-semibold text-ink-soft">
                Instant {j + 1} : <Tex math={`t = ${formatQuantity(r.t, 'temps').replace(',', '{,}').replace(' ', '\\,\\text{') + '}'}`} />
              </span>
              <label className="text-sm">
                <Tex math="u_R =" />
                <QuantityInput quantity="tension" value={vals[j].uR} onChange={(v) => setVals((all) => all.map((x, k) => (k === j ? { ...x, uR: v } : x)))} disabled={done} />
              </label>
              <label className="text-sm">
                <Tex math="u_C =" />
                <QuantityInput quantity="tension" value={vals[j].uC} onChange={(v) => setVals((all) => all.map((x, k) => (k === j ? { ...x, uC: v } : x)))} disabled={done} />
              </label>
            </div>
          ))}
          {readings.length > 0 && !done && (
            <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => (setReadings([]), setVals([]))}>
              Recommencer les relevés
            </button>
          )}
        </div>
      )}
      {done ? (
        <Success>
          À chaque instant, <Tex math="u_R + u_C = E" /> : la loi d’additivité est vérifiée.
        </Success>
      ) : (
        eqOk && (
          <Button
            disabled={readings.length < 2}
            onClick={() => {
              const r = checkS7(
                readings.map((x, j) => ({ t: x.t, uR: quantityToSI(vals[j].uR), uC: quantityToSI(vals[j].uC) })),
                sim.timeline,
              );
              if (r.ok) onSuccess();
              else onFail(errorHint('E4'));
            }}
          >
            Vérifier mes lectures
          </Button>
        )
      )}
    </div>
  );
}

function S8({ sim, done, onSuccess, onFail }: BodyProps) {
  const [ee, setEe] = useQuantity('energie', 'mJ');
  const [valueOk, setValueOk] = useState(false);
  const charged = sim.fullChargeDone;
  useEffect(() => {
    if (valueOk && charged && !done) onSuccess();
  }, [valueOk, charged, done, onSuccess]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Données : <Tex math={`E = ${String(sim.E).replace('.', '{,}')}\\,\\text{V}`} /> et <Tex math={`C = ${formatQuantity(sim.C, 'capacite').replace(' ', '\\,\\text{') + '}'}`} />.
      </p>
      <ol className="space-y-1.5">
        <Step done={valueOk}>Calcule l’énergie stockée en fin de charge.</Step>
        <Step done={charged}>Vérifie avec la jauge : lance une charge complète.</Step>
      </ol>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink-soft">
          <Tex math="E_e =" />
        </span>
        <QuantityInput quantity="energie" value={ee} onChange={setEe} disabled={valueOk || done} />
      </label>
      {done ? (
        <Success>La jauge confirme ta valeur.</Success>
      ) : (
        !valueOk && (
          <Button
            onClick={() => {
              const r = checkS8(quantityToSI(ee), sim.C, sim.E);
              if (r.ok) setValueOk(true);
              else onFail(errorHint('EX', r.code ? 'energie' : 'calcul'));
            }}
          >
            Vérifier
          </Button>
        )
      )}
    </div>
  );
}
