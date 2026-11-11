// Short versions of the long tower texts. Upgrade panels list every stat change on their own
// lines, so the sentence above them only needs to say what the upgrade is about.

/** Splits text at the top level (never inside brackets) wherever `re` matches at that spot. */
function splitTop(text, re) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (!depth) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m && m.index === i) {
        out.push(text.slice(from, i + m[0].length));
        from = i + m[0].length;
        i = from - 1;
      }
    }
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}

const SENTENCE = /[.!?] (?=[A-Z0-9"'(])/y;
const CLAUSE = /(?:, and |, but |; |: |, | and (?=[a-z0-9]+ )| – )/y;

/** The sentences of a text, each with its end mark. */
export function sentences(text) {
  return splitTop(String(text ?? '').trim(), SENTENCE).map((s) => s.trim());
}

const tidy = (s) => s.replace(/[\s,;:–]+(?:and|but)?\s*$/, '').replace(/\s+(?:and|but)$/, '');

/**
 * A long description cut down to its lead: the sentences and clauses that fit in `max` letters.
 * Text that is only a little over is left alone, and a cut never leaves just a word or two.
 */
export function shortDesc(text, max = 76) {
  const full = String(text ?? '').trim();
  if (full.length <= max + 10) return full;
  // Every clause of every sentence, in order.
  const parts = [];
  for (const s of sentences(full)) {
    const cl = splitTop(s, CLAUSE);
    cl.forEach((c, i) => parts.push({ text: c, end: i === cl.length - 1 }));
    parts[parts.length - 1].text += ' ';
  }
  let cut = '';
  let n = 0;
  for (; n < parts.length; n++) {
    const next = tidy(cut + parts[n].text);
    if (next.length > max && tidy(cut).length >= 24) break;
    cut += parts[n].text;
    if (next.length > max) { n++; break; }
  }
  const cutWord = (x) => `${x.slice(0, max).replace(/\s+\S*$/, '').replace(/[,;:]$/, '')}…`;
  if (n >= parts.length) return full.length > max + 24 ? cutWord(full) : full;
  const whole = parts[n - 1].end; // stopped at the end of a sentence
  const colon = /: $/.test(cut);
  cut = whole ? cut.trim() : tidy(cut);
  if (cut.length > max + 14) return cutWord(cut);
  if (whole) return cut;
  return colon ? `${cut}.` : `${cut}…`;
}

/** A description as HTML: short, with the full text one click away when it was cut. */
export function descHtml(text, esc = (x) => x, max = 76) {
  const full = String(text ?? '');
  const short = shortDesc(full, max);
  if (short === full.trim()) return esc(full);
  return `<details class="more"><summary>${esc(short)} <i>more</i></summary>${esc(full)}</details>`;
}

/** A tower's blurb in one or two sentences, and the rest of it (may be empty). */
export function splitBlurb(text, max = 120) {
  const all = sentences(text);
  let lead = all.shift() ?? '';
  while (all.length && lead.length + 1 + all[0].length <= max) lead += ` ${all.shift()}`;
  if (lead.length > max + 20) return [shortDesc(lead, max - 10), String(text ?? '')];
  return [lead, all.join(' ')];
}

/** A blurb as HTML: its lead, and the rest behind a "more" click. */
export function blurbHtml(text, esc = (x) => x, max = 120) {
  const [lead, rest] = splitBlurb(text, max);
  if (!rest) return esc(lead);
  const whole = rest.startsWith(lead.slice(0, 20));
  return `<details class="more"><summary>${esc(lead)} <i>more</i></summary>${esc(whole ? rest : `${lead} ${rest}`)}</details>`;
}
