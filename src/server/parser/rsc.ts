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
