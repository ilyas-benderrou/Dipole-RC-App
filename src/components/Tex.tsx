import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Fragment, useMemo } from 'react';
import { splitMath } from '../content/text';

/** Formule LaTeX rendue avec KaTeX (fonctionne hors ligne : polices incluses dans le build). */
export function Tex({ math, display = false, className = '' }: { math: string; display?: boolean; className?: string }) {
  const html = useMemo(() => katex.renderToString(math, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore' }), [math, display]);
  const Tag = display ? 'div' : 'span';
  return (
    <Tag
      className={`${display ? 'relative w-full overflow-x-auto overflow-y-hidden thin-scroll [&_.katex-display]:my-1' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Texte pédagogique contenant des formules entre dollars : « As-tu gardé le $C$ ? ». */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {splitMath(text).map((p, i) => (p.type === 'math' ? <Tex key={i} math={p.value} /> : <Fragment key={i}>{p.value}</Fragment>))}
    </span>
  );
}
