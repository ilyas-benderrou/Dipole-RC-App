import { ArrowLeft, FileCheck2, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { RichText, Tex } from '../../components/Tex';
import { Button, Card } from '../../components/ui';
import { APP } from '../../config/app';
import { TESTS, TEST_LABELS } from '../../content/tests';
import { TEST_IDS, type TestId } from '../../engine/types';

/** Liste des tests imprimables (section 13.2). */
export function TestsPage() {
  const { data } = useTeacherData();
  return (
    <TeacherPage title="Tests imprimables" data={data}>
      <div className="grid gap-5 md:grid-cols-2">
        {TEST_IDS.map((t) => (
          <Card key={t} title={TESTS[t].title} subtitle="Sur papier, en classe · 30 min · noté sur 20 · calculatrice autorisée">
            <ul className="mb-4 space-y-1 text-sm text-ink-soft">
              {TESTS[t].questions.map((q) => (
                <li key={q.id}>
                  <b className="text-ink">{q.id}</b> · <RichText text={q.statement} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link to={`/prof/tests/${t}`}>
                <Button>
                  <Printer size={16} /> Sujet A4
                </Button>
              </Link>
              <Link to={`/prof/tests/${t}/corrige`}>
                <Button variant="secondary">
                  <FileCheck2 size={16} /> Corrigé et barème
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </TeacherPage>
  );
}

/** Version imprimable A4 : énoncé, cases pour le code apprenant et le groupe, espaces de réponse ; ou corrigé avec barème. */
export function PrintTestPage({ corrige = false }: { corrige?: boolean }) {
  const { test } = useParams();
  const t: TestId = test === 'post' ? 'post' : 'pre';
  const def = TESTS[t];
  return (
    <div className="min-h-screen bg-white/40 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <Link to="/prof/tests" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
          <ArrowLeft size={15} /> Tests imprimables
        </Link>
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Imprimer
        </Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[11pt] leading-relaxed text-black shadow-xl print:shadow-none">
        <header className="mb-5 border-b-2 border-black pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9pt] uppercase tracking-wider">{APP.name} · 2ème Bac PC / SM · Dipôle RC</p>
              <h1 className="text-[16pt] font-bold">
                {TEST_LABELS[t]}
                {corrige ? ' – Corrigé et barème' : ''}
              </h1>
              <p className="text-[9.5pt]">Durée : 30 min · Noté sur 20 · Calculatrice autorisée · Sans document</p>
            </div>
            {!corrige && (
              <div className="grid shrink-0 grid-cols-[auto_8rem] items-center gap-x-2 gap-y-2 text-[10pt]">
                <span>Code apprenant :</span>
                <span className="h-7 border border-black" />
                <span>Groupe :</span>
                <span className="flex gap-3 text-[9pt]">
                  <span>☐ Exp.</span>
                  <span>☐ Témoin</span>
                </span>
                <span>Note :</span>
                <span className="h-7 border border-black text-right text-[9pt] leading-7">/ 20&nbsp;</span>
              </div>
            )}
          </div>
        </header>
        <ol className="space-y-4">
          {def.questions.map((q) => (
            <li key={q.id} className="print-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p>
                  <b>{q.id}.</b> <RichText text={q.statement} />
                </p>
                <span className="shrink-0 text-[9pt]">({q.bareme} pt)</span>
              </div>
              {corrige ? (
                <div className="mt-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-[10pt]">
                  <p>
                    <b>Réponse attendue :</b> <RichText text={q.expected} />
                  </p>
                  <p>
                    <b>Barème :</b> {q.bareme} · <b>Code si faux :</b> {q.codes}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-[9.5pt]">
                    {def.items
                      .filter((i) => i.question === q.id)
                      .map((i) => (
                        <li key={i.id}>
                          {i.id} – {i.label} : <RichText text={i.expected} /> ({i.points} pt{i.points > 1 ? 's' : ''}, {i.competence})
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-1">
                  {q.id === '4.1' && (
                    <p className="mb-1 text-[9.5pt]">
                      Entoure l’expression juste :{' '}
                      {def.items
                        .find((i) => i.id === '4.1a')!
                        .options!.map((o) => (
                          <span key={o.key} className="mr-3 inline-block">
                            {o.key}) <Tex math={o.text} />
                          </span>
                        ))}
                    </p>
                  )}
                  {Array.from({ length: q.lines }, (_, j) => (
                    <div key={j} className="h-7 border-b border-dotted border-gray-400" />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
        <footer className="mt-6 border-t border-gray-300 pt-2 text-[8.5pt] text-gray-600">
          {corrige ? 'Répartition : C1 = 4 pts ; C2-C3 = 6 pts ; C4 = 5 pts ; C5 = 3 pts ; C6 = 2 pts.' : 'Écris le code apprenant donné par ton professeur (pas ton nom).'}
        </footer>
      </article>
    </div>
  );
}
