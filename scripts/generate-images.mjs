// Génère les illustrations 3D de RC-Lab avec Nano Banana (gemini-2.5-flash-image).
//   node scripts/generate-images.mjs
// La clé est lue dans ../Dipole-RC-Videos/.env (GEMINI_API_KEY) et n'est jamais copiée ici.
// Budget maximal : 0,40 $ (registre : scripts/images-costs.json). Les PNG bruts vont dans scripts/.cache/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = process.env.RCLAB_ENV ?? join(ROOT, '..', 'Dipole-RC-Videos', '.env');
const CACHE = join(ROOT, 'scripts', '.cache');
const LEDGER = join(ROOT, 'scripts', 'images-costs.json');
const MODEL = 'gemini-2.5-flash-image';
const BUDGET_USD = 0.4;
// Tarifs publics (USD par million de jetons) ; une image ≈ 1290 jetons de sortie.
const PRICE = { inputPerM: 0.3, outputPerM: 30 };
const EST_PER_IMAGE = (60 * PRICE.inputPerM + 1290 * PRICE.outputPerM) / 1e6;

const STYLE = 'Soft 3D render, pastel colors, smooth clay-like materials, soft studio lighting, gentle shadows. Absolutely no text, no letters, no numbers, no logo, no brand name, no watermark.';
const IMAGES = [
  {
    file: 'banner-3d',
    ratio: '4:3',
    prompt: 'A dark blue electrolytic capacitor standing upright next to a beige resistor with four color bands (brown, black, red, gold) lying diagonally, several glossy blue spheres representing electrons floating around, on a small round blue platform. Isolated object on a pure plain white background.',
  },
  {
    file: 'hero-lab',
    ratio: '16:9',
    prompt: 'A tiny friendly physics electronics lab on a desk: a breadboard with a blue electrolytic capacitor and a color-banded resistor, a small rounded oscilloscope whose screen shows a smooth rising exponential curve, glossy blue spheres floating. Teal, mint and lavender palette, plain light mint background.',
  },
  {
    file: 'empty-lab',
    ratio: '1:1',
    prompt: 'A small tidy laboratory bench with a blue electrolytic capacitor, a beige color-banded resistor and a few glossy blue spheres resting, calm and cute mood. Isolated on a pure plain white background.',
  },
  {
    file: 'trophy',
    ratio: '1:1',
    prompt: 'A golden trophy whose cup is shaped like the electronic schematic symbol of a capacitor (two thick parallel vertical plates), on a teal pedestal, small glossy blue spheres around it, celebratory. Isolated on a pure plain white background.',
  },
  {
    file: 'capacitor',
    ratio: '1:1',
    prompt: 'A single cute dark blue electrolytic capacitor with a light stripe on one side and two metal legs of different lengths, slightly tilted, with three glossy blue spheres orbiting it. Isolated on a pure plain white background.',
  },
];

function readKey() {
  const env = readFileSync(ENV, 'utf8');
  const m = /^GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m.exec(env);
  if (!m) throw new Error(`GEMINI_API_KEY introuvable dans ${ENV}`);
  return m[1].trim();
}

const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { model: MODEL, budgetUsd: BUDGET_USD, entries: [] };
const spent = () => ledger.entries.reduce((s, e) => s + e.costUsd, 0);

mkdirSync(CACHE, { recursive: true });
const key = readKey();
for (const img of IMAGES) {
  const out = join(CACHE, `${img.file}.png`);
  if (existsSync(out)) {
    console.log(`= ${img.file} (déjà généré)`);
    continue;
  }
  if (spent() + EST_PER_IMAGE > BUDGET_USD) {
    console.error(`⛔ ${img.file} : budget de ${BUDGET_USD} $ atteint (dépensé : ${spent().toFixed(3)} $).`);
    continue;
  }
  process.stdout.write(`→ ${img.file} … `);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${img.prompt} ${STYLE}` }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: img.ratio } },
    }),
  });
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!res.ok || !part) {
    console.error(`échec HTTP ${res.status} : ${JSON.stringify(json.error ?? json).slice(0, 300)}`);
    continue;
  }
  writeFileSync(out, Buffer.from(part.inlineData.data, 'base64'));
  const u = json.usageMetadata ?? {};
  const cost = ((u.promptTokenCount ?? 60) * PRICE.inputPerM + (u.candidatesTokenCount ?? 1290) * PRICE.outputPerM) / 1e6;
  ledger.entries.push({ file: img.file, at: new Date().toISOString(), costUsd: Number(cost.toFixed(5)) });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  console.log(`ok · ${cost.toFixed(4)} $`);
}
console.log(`Total dépensé : ${spent().toFixed(4)} $ / ${BUDGET_USD} $`);
