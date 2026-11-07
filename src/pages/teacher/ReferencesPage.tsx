import { TeacherPage, useTeacherData } from '../../app/teacher';
import { Badge, Card } from '../../components/ui';
import { CRI_NOTE } from '../../content/questionnaire';
import { EXERCISE_SOURCES, REFERENCES, REFERENCES_NOTE } from '../../content/references';

/** Références (section 14.6). */
export function ReferencesPage() {
  const { data } = useTeacherData();
  return (
    <TeacherPage title="Références" data={data}>
      <div className="space-y-5">
        <Card title="Études qui appuient les erreurs E1 à E4 et la méthode CRI">
          <ol className="space-y-3">
            {REFERENCES.map((r) => (
              <li key={r.id} className="flex gap-3 text-sm">
                <span className="w-8 shrink-0 font-semibold text-teal-700">[{r.id}]</span>
                <div className="min-w-0">
                  <Badge tone="teal" className="mb-1">
                    {r.supports}
                  </Badge>
                  <p className="text-ink">{r.text}</p>
                  {r.doi && (
                    <a href={r.doi} target="_blank" rel="noreferrer" className="break-all text-xs font-semibold text-teal-700 hover:underline">
                      {r.doi}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink-soft">{REFERENCES_NOTE}</p>
          <p className="mt-1 text-xs text-muted">{CRI_NOTE}</p>
        </Card>
        <Card title="Sources des exercices">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {EXERCISE_SOURCES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      </div>
    </TeacherPage>
  );
}
