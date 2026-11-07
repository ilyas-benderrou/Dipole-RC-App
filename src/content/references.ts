/** Références scientifiques (section 14.6), affichées dans le tableau de bord. */
export interface Reference {
  id: number;
  supports: string;
  text: string;
  doi?: string;
}

export const REFERENCES: Reference[] = [
  {
    id: 1,
    supports: 'E1, E3',
    text: 'Thacker, B. A., Boys, D., & Ganiel, U. (1999). Macroscopic phenomena and microscopic processes: Student understanding of transients in direct current electric circuits. American Journal of Physics, 67(S1), S25–S31.',
    doi: 'https://doi.org/10.1119/1.19076',
  },
  {
    id: 2,
    supports: 'E1',
    text: 'Eylon, B.-S., & Ganiel, U. (1990). Macro-micro relationships: The missing link between electrostatics and electrodynamics in students’ reasoning. International Journal of Science Education, 12(1), 79–94.',
    doi: 'https://doi.org/10.1080/0950069900120107',
  },
  {
    id: 3,
    supports: 'E1',
    text: 'Taşkın, T. (2022). Examination of prospective teachers’ knowledge about capacitors and electric field lines. Research in Science & Technological Education, 40(2), 272–289.',
  },
  {
    id: 4,
    supports: 'E2',
    text: 'Guisasola, J., Zubimendi, J. L., Almudí, J. M., & Ceberio, M. (2002). The evolution of the concept of capacitance throughout the development of the electric theory and the understanding of its meaning by university students. Science & Education, 11(3), 247–261.',
    doi: 'https://doi.org/10.1023/A:1015248831346',
  },
  {
    id: 5,
    supports: 'E2',
    text: 'Guisasola, J., Zubimendi, J. L., & Zuza, K. (2010). How much have students learned? Research-based teaching on electrical capacitance. Physical Review Special Topics – Physics Education Research, 6(2), 020102.',
    doi: 'https://doi.org/10.1103/PhysRevSTPER.6.020102',
  },
  {
    id: 6,
    supports: 'E3',
    text: 'Benseghir, A., & Closset, J.-L. (1996). The electrostatics–electrokinetics transition: Historical and educational difficulties. International Journal of Science Education, 18(2).',
    doi: 'https://doi.org/10.1080/0950069960180204',
  },
  {
    id: 7,
    supports: 'E4',
    text: 'Zavala, G., & Martinez-Torteya, C. E. (2019). Students’ abilities to solve RC circuits with research-based educational strategies. ASEE Annual Conference, Tampa.',
    doi: 'https://doi.org/10.18260/1-2--33312',
  },
  {
    id: 8,
    supports: 'E3',
    text: 'College Board (2004). Student Performance Q&A: 2004 AP Physics C: Electricity & Magnetism Free-Response Questions.',
  },
  {
    id: 9,
    supports: 'Contexte',
    text: 'Wang, R. (2026). Investigating students’ conceptual understanding of RC circuits. GIREP Summer School, UPV/EHU (travail en cours).',
  },
  {
    id: 10,
    supports: 'Méthode CRI',
    text: 'Hasan, S., Bagayoko, D., & Kelley, E. L. (1999). Misconceptions and the certainty of response index (CRI). Physics Education, 34(5), 294–299.',
  },
];

export const REFERENCES_NOTE =
  'E5 et E6 viennent des sujets d’examen et de la pratique d’enseignement ; le questionnaire diagnostique sert à les confirmer.';

/** Sources des exercices (section 7). */
export const EXERCISE_SOURCES: string[] = [
  'Cours « Dipôle RC » 2ème Bac SM – Pr. Ismaili-Alaoui',
  'Séance 10 « Dipôle RC » – AlloSchool',
  'Examen national du baccalauréat 2013 – session normale',
  'Examen national du baccalauréat 2014 – session normale',
  'Examen national du baccalauréat 2016 – session de rattrapage',
  'Examen national du baccalauréat 2017 – session normale',
];
