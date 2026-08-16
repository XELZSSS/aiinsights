export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const numOr = (v: unknown, fallback = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return fallback;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v: unknown): string => (typeof v === "string" ? v : "");

export const strOr = (v: unknown): string | null | undefined => {
  if (v == null) return v;
  return typeof v === "string" ? v : undefined;
};

export const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

export const obj = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;

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

const OPEN_LICENSES = new Set([
  "apache-2.0",
  "mit",
  "bsd",
  "bsd-2-clause",
  "bsd-3-clause",
  "isc",
  "cc",
  "cc0-1.0",
  "cc-by-4.0",
  "cc-by-sa-4.0",
  "bigscience-openrail-m",
  "bigscience-bloom-rail-1.0",
  "openrail",
  "creativeml-openrail-m",
  "openrail++",
  "bigcode-openrail-m",
  "llama3.1",
  "llama3",
  "llama2",
  "gemma",
  "gemma2",
  "gemma-2.0",
  "qwen",
  "falcon",
  "mpt",
  "deepseek",
  "yi",
  "gpl",
  "gpl-2.0",
  "gpl-3.0",
  "agpl-3.0",
  "lgpl",
  "lgpl-2.1",
  "lgpl-3.0",
  "mpl-2.0",
  "epl-2.0",
  "osl-3.0",
  "unlicense",
  "zlib",
  "mulanpsl-1.0",
  "mulanpsl-2.0",
  "nvidia-open-model-license",
  "sil-openrail-1.0",
]);

const LICENSE_PREFIX = "license:";

export function getOpenLicense(tags: string[]): string | null {
  for (const tag of tags) {
    if (!tag.startsWith(LICENSE_PREFIX)) continue;
    const id = tag.slice(LICENSE_PREFIX.length);
    if (OPEN_LICENSES.has(id)) return id;
  }
  return null;
}

export function dfsCollect<T>(root: unknown, predicate: (node: unknown) => T | null): T[] {
  const results: T[] = [];
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    const result = predicate(current);
    if (result !== null) results.push(result);
    for (const v of Array.isArray(current) ? current : Object.values(current)) {
      if (typeof v === "object" && v !== null) stack.push(v);
    }
  }
  return results;
}

export function findNextData<T>(root: unknown, key: string): T[] | null {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    const r = (current as Record<string, unknown>)[key];
    if (Array.isArray(r)) return r as T[];
    for (const v of Array.isArray(current) ? current : Object.values(current)) {
      if (typeof v === "object" && v !== null) stack.push(v);
    }
  }
  return null;
}

const SCRIPT_PUSH_RE = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;

export function parseRscScriptArray<T>(html: string, key: string): T[] {
  let match: RegExpExecArray | null;
  SCRIPT_PUSH_RE.lastIndex = 0;
  while ((match = SCRIPT_PUSH_RE.exec(html)) !== null) {
    const raw = match[1];
    if (!raw || !raw.includes(key)) continue;
    const body = unescape(raw);
    const marker = `"${key}":[`;
    const idx = body.indexOf(marker);
    if (idx < 0) continue;
    const start = idx + marker.length - 1;
    const end = findArrayEnd(body, start);
    if (end <= start) continue;
    try {
      const arr = JSON.parse(body.slice(start, end + 1)) as T[];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      continue;
    }
  }
  return [];
}

function findArrayEnd(s: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  "0": "\0",
};

function unescape(s: string): string {
  let out = "";
  let i = 0;
  const len = s.length;
  while (i < len) {
    const ch = s[i];
    if (ch !== "\\" || i + 1 >= len) {
      out += ch;
      i++;
      continue;
    }
    if (s[i + 1] === "u") {
      const hex = s.slice(i + 2, i + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        const code = parseInt(hex, 16);
        const lowHex = s.slice(i + 6, i + 12);
        if (code >= 0xd800 && code <= 0xdbff && /^\\u[0-9a-fA-F]{4}$/.test(lowHex)) {
          const low = parseInt(lowHex.slice(2), 16);
          if (low >= 0xdc00 && low <= 0xdfff) {
            out += String.fromCodePoint(((code - 0xd800) << 10) + (low - 0xdc00) + 0x10000);
            i += 12;
            continue;
          }
        }
        out += String.fromCharCode(code);
        i += 6;
        continue;
      }
      out += "u";
      i += 2;
      continue;
    }
    const esc = s[i + 1] ?? "";
    out += SIMPLE_ESCAPES[esc] ?? esc;
    i += 2;
  }
  return out;
}

function isMarkerBoundary(line: string, marker: string): boolean {
  const quoted = `"${marker}"`;
  let i = line.indexOf(quoted);
  while (i !== -1) {
    const after = line[i + quoted.length];
    if (after === ":" || after === "[" || after === '"') return true;
    i = line.indexOf(quoted, i + 1);
  }
  return false;
}

const STREAM_LINE_RE = /^([^":]*):(.*)$/;

export function parseRscPayload<T>(body: string, marker: string, extract: (data: unknown) => T[] | null): T[] {
  for (const line of body.split(/\r?\n/)) {
    if (!isMarkerBoundary(line, marker)) continue;
    const candidates: string[] = [];
    const prefixed = STREAM_LINE_RE.exec(line);
    if (prefixed) candidates.push(prefixed[2] ?? "");
    candidates.push(line);
    for (const raw of candidates) {
      if (!raw) continue;
      let tree: unknown;
      try {
        tree = JSON.parse(raw);
      } catch {
        continue;
      }
      const result = extract(tree);
      if (result && result.length > 0) return result;
    }
  }
  throw new Error(`RSC marker "${marker}" not found or payload empty. body length=${body.length}`);
}