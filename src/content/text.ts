/**
 * Textes pédagogiques avec formules entre dollars : « As-tu gardé le $C$ ? ».
 * Les formules sont rendues par KaTeX dans l'interface, et retirées pour le texte brut (CSV, infobulles).
 */
export type RichPart = { type: 'text'; value: string } | { type: 'math'; value: string };

export function splitMath(text: string): RichPart[] {
  const parts: RichPart[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'math', value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

/** Retire le balisage mathématique (texte brut). */
export function stripMath(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, m: string) =>
    m
      .replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
      .replace(/\\tfrac12/g, '½')
      .replace(/_\{([^}]*)\}/g, '$1')
      .replace(/\^\{([^}]*)\}/g, '^$1')
      .replace(/\\left|\\right/g, '')
      .replace(/\\,|\\;|\\!|\\quad/g, ' ')
      .replace(/\\tau/g, 'τ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\mu/g, 'µ')
      .replace(/\\Omega/g, 'Ω')
      .replace(/\\cdot/g, '·')
      .replace(/\\approx/g, '≈')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/[{}\\]/g, ''),
  );
}
