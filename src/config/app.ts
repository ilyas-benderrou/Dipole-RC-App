/**
 * Identité de l'application (nom provisoire, configurable ici sans toucher au reste du code).
 */
export const APP = {
  name: 'RC-Lab',
  slogan: 'Charge, décharge, comprends.',
  /** Nom du tuteur animé (section 15 bis). */
  tutorName: 'Capi',
  /** Projet de master (affiché en pied de page). */
  credits: 'Master « Système éducatif intelligent et communicant » – ENS Fès',
  /** Code PIN du professeur par défaut (modifiable dans les réglages du tableau de bord). */
  defaultTeacherPin: '1234',
  /** Préfixe des codes anonymes des apprenants (A-07). */
  anonPrefix: 'A',
  /** Cours PDF fourni par l'équipe. */
  coursePdf: 'cours/Cours_Dipole_RC.pdf',
} as const;

/** Clés de stockage local (V1). */
export const STORAGE_KEYS = {
  db: 'rclab:db:v1',
  session: 'rclab:session',
  tutor: 'rclab:tutor',
} as const;
