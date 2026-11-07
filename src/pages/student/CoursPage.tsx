import { Download, ExternalLink } from 'lucide-react';
import { StudentPage } from '../../app/student';
import { Tex } from '../../components/Tex';
import { Card } from '../../components/ui';
import { APP } from '../../config/app';
import { REFERENCE_FORMULAS } from '../../content/competences';

/** Cours PDF fourni par l'équipe + formules de référence (section 5.2). */
export function CoursPage() {
  return (
    <StudentPage title="Cours PDF" allowDuringQuestionnaire={false}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card
          title="Cours : le dipôle RC"
          action={
            <span className="flex gap-3">
              <a href={APP.coursePdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                <ExternalLink size={15} /> Ouvrir
              </a>
              <a href={APP.coursePdf} download className="inline-flex items-center gap-1 hover:underline">
                <Download size={15} /> Télécharger
              </a>
            </span>
          }
        >
          <object data={APP.coursePdf} type="application/pdf" className="h-[70vh] w-full rounded-2xl bg-white/60" aria-label="Cours PDF">
            <p className="p-4 text-sm text-ink-soft">
              Ton navigateur ne peut pas afficher le PDF ici.{' '}
              <a href={APP.coursePdf} className="font-semibold text-teal-700 underline">
                Ouvre le cours dans un nouvel onglet
              </a>
              .
            </p>
          </object>
        </Card>
        <Card title="Formules à retenir" subtitle="Grandeurs variables en minuscules, constantes en majuscules.">
          <ul className="space-y-2">
            {REFERENCE_FORMULAS.map((f) => (
              <li key={f.label} className="glass-inset px-3 py-2">
                <p className="label-caps">{f.label}</p>
                <Tex math={f.tex} display className="text-[0.95rem]" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </StudentPage>
  );
}
