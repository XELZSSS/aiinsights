const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200C",
  zwj: "\u200D",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  sbquo: "\u201A",
  bdquo: "\u201E",
  lsaquo: "\u2039",
  rsaquo: "\u203A",
  laquo: "\u00AB",
  raquo: "\u00BB",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  times: "\u00D7",
  divide: "\u00F7",
  minus: "\u2212",
  micro: "\u00B5",
  deg: "\u00B0",
  plusmn: "\u00B1",
  sup2: "\u00B2",
  sup3: "\u00B3",
  frac12: "\u00BD",
  frac14: "\u00BC",
  frac34: "\u00BE",
  bull: "\u2022",
  middot: "\u00B7",
  permil: "\u2030",
  prime: "\u2032",
  Prime: "\u2033",
  oline: "\u203E",
  frasl: "\u2044",
  dagger: "\u2020",
  Dagger: "\u2021",
  sect: "\u00A7",
  para: "\u00B6",
  euro: "\u20AC",
  pound: "\u00A3",
  yen: "\u00A5",
  cent: "\u00A2",
  curren: "\u00A4",
  brvbar: "\u00A6",
  iexcl: "\u00A1",
  iquest: "\u00BF",
  ordf: "\u00AA",
  ordm: "\u00BA",
  eacute: "\u00E9",
  egrave: "\u00E8",
  agrave: "\u00E0",
  ccedilla: "\u00E7",
  ccedil: "\u00E7",
  uuml: "\u00FC",
  ouml: "\u00F6",
  auml: "\u00E4",
};

const ENTITY_RE = /&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([a-zA-Z][a-zA-Z0-9]*))(?![a-zA-Z0-9]);?/g;

export function decodeEntities(s: string): string {
  return s.replace(ENTITY_RE, (m, hex?: string, dec?: string, name?: string) => {
    if (hex) return safeFromCodePoint(parseInt(hex, 16));
    if (dec) return safeFromCodePoint(parseInt(dec, 10));
    return NAMED_ENTITIES[name!] ?? m;
  });
}

function safeFromCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return "";
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

export function stripHtml(s: string): string {
  let out = "";
  let i = 0;
  const len = s.length;
  while (i < len) {
    const lt = s.indexOf("<", i);
    if (lt === -1) {
      out += s.slice(i);
      break;
    }
    let j = lt + 1;
    let quote: string | null = null;
    for (; j < len; j++) {
      const ch = s[j];
      if (quote !== null) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
    }
    if (j >= len) {
      out += s.slice(i, lt + 1);
      i = lt + 1;
      continue;
    }
    out += s.slice(i, lt);
    i = j + 1;
  }
  return out;
}
