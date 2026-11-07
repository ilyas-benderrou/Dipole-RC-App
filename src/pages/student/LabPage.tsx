import { CheckCircle2, FlaskConical } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { addActiveTime, recordMission } from '../../app/actions';
import { useActiveTime } from '../../app/hooks';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { MissionPanel } from '../../components/sim/MissionPanel';
import { Simulator } from '../../components/sim/Simulator';
import { useSimulation } from '../../components/sim/useSimulation';
import { MISSIONS } from '../../content/missions';
import { MISSION_IDS, type MissionId } from '../../engine/types';

function LabSession({ missionId }: { missionId: MissionId | null }) {
  const { student, updateModel } = useStudent();
  const tutor = useTutor();
  const sim = useSimulation(missionId ? MISSIONS[missionId].config : { E: 6, rIndex: 3, cIndex: 6, plots: ['uC', 'i'] });
  return (
    <Simulator
      sim={sim}
      top={
        missionId ? (
          <MissionPanel
            id={missionId}
            sim={sim}
            context="laboratoire"
            onComplete={(r) => {
              tutor.say('missionSuccess', { reaction: true });
              void recordMission(student.id, updateModel, r.missionId, r.success, r.durationSec, 'lab');
            }}
          />
        ) : undefined
      }
    />
  );
}

/** Laboratoire : la simulation en accès libre, et les 8 missions (section 6). */
export function LabPage() {
  const { student, updateModel } = useStudent();
  const tutor = useTutor();
  const [params, setParams] = useSearchParams();
  const raw = params.get('mission');
  const missionId = raw && (MISSION_IDS as string[]).includes(raw) ? (raw as MissionId) : null;

  useEffect(() => {
    tutor.say('labEnter');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useActiveTime((sec) => void addActiveTime(updateModel, sec, true));

  return (
    <StudentPage title="Laboratoire">
      <div className="space-y-4">
        <div className="glass flex flex-wrap items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setParams({})}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 transition ${!missionId ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white/75 text-ink-soft ring-slate-200 hover:bg-white'}`}
          >
            <FlaskConical size={15} /> Accès libre
          </button>
          <span className="label-caps ml-1 mr-1">Missions</span>
          {MISSION_IDS.map((id) => {
            const done = student.model.missions[id]?.done;
            return (
              <button
                key={id}
                type="button"
                title={MISSIONS[id].consigne}
                onClick={() => setParams({ mission: id })}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-semibold ring-1 transition ${
                  missionId === id ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white/75 text-ink-soft ring-slate-200 hover:bg-white'
                }`}
              >
                {id}
                {done && <CheckCircle2 size={14} className={missionId === id ? 'text-white' : 'text-ok-500'} />}
              </button>
            );
          })}
        </div>
        <LabSession key={missionId ?? 'libre'} missionId={missionId} />
      </div>
    </StudentPage>
  );
}
