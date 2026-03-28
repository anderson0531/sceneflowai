/**
 * Attempt to parse JSON from LLM output, repairing common issues.
 */
function repairStringValues(json: string): string {
    const out: string[] = [];
    let i = 0;
    let inString = false;
    let escaped = false;

    while (i < json.length) {
        const ch = json[i];

        if (escaped) {
            out.push(ch);
            escaped = false;
            i++;
            continue;
        }

        if (ch === '\\' && inString) {
            out.push(ch);
            escaped = true;
            i++;
            continue;
        }

        if (ch === '"') {
            if (!inString) {
                inString = true;
                out.push(ch);
                i++;
                continue;
            }
            const after = json.slice(i + 1).trimStart();
            if (
                after.length === 0 ||
                after[0] === ':' ||
                after[0] === ',' ||
                after[0] === '}' ||
                after[0] === ']'
            ) {
                inString = false;
                out.push(ch);
                i++;
                continue;
            }
            out.push('\\"');
            i++;
            continue;
        }

        if (inString) {
            if (ch === '\n') { out.push('\\n'); i++; continue; }
            if (ch === '\r') { out.push('\\r'); i++; continue; }
            if (ch === '\t') { out.push('\\t'); i++; continue; }
            const code = ch.charCodeAt(0);
            if (code < 0x20) {
                out.push('\\u' + code.toString(16).padStart(4, '0'));
                i++;
                continue;
            }
        }
        out.push(ch);
        i++;
    }
    return out.join('');
}

export function safeParseJSON(raw: string): any {
  try { return JSON.parse(raw); } catch { /* continue */ }

  let text = raw.trim();

  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  text = text.replace(/\/\/[^\n]*/g, '');
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  text = text.replace(/(?<=[[{,\s])'/g, '"').replace(/'(?=\s*[:,\]\}])/g, '"');
  text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  text = text.replace(/,\s*([}\]])/g, '$1');

  try { return JSON.parse(text); } catch { /* continue */ }

  text = repairStringValues(text);
  text = text.replace(/,\s*([}\]])/g, '$1');

  try { return JSON.parse(text); } catch { /* continue */ }

  console.warn('[safeParseJSON] Attempting truncation recovery...');
  text = text.replace(/,\s*"[^"]*"?\s*:\s*"[^"]*$/, '');
  text = text.replace(/,\s*"[^"]*"?\s*:\s*\[?\s*$/, '');
  text = text.replace(/,\s*"[^"]*$/, '');
  text = text.replace(/,\s*$/, '');

  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets - closeBrackets; i++) text += ']';
  for (let i = 0; i < openBraces - closeBraces; i++) text += '}';
  text = text.replace(/,\s*([}\]])/g, '$1');

  try {
    const result = JSON.parse(text);
    console.warn('[safeParseJSON] Truncation recovery succeeded (data may be partial)');
    return result;
  } catch { /* continue */ }

  console.warn('[safeParseJSON] Attempting progressive trim...');
  let trimmed = text;
  for (let attempt = 0; attempt < 40; attempt++) {
    const lastComma = trimmed.lastIndexOf(',');
    if (lastComma === -1) break;
    trimmed = trimmed.slice(0, lastComma).trimEnd();
    const ob = (trimmed.match(/{/g) || []).length;
    const cb = (trimmed.match(/}/g) || []).length;
    const oB = (trimmed.match(/\[/g) || []).length;
    const cB = (trimmed.match(/\]/g) || []).length;
    let candidate = trimmed;
    for (let i = 0; i < oB - cB; i++) candidate += ']';
    for (let i = 0; i < ob - cb; i++) candidate += '}';
    candidate = candidate.replace(/,\s*([}\]])/g, '$1');
    try {
      const result = JSON.parse(candidate);
      console.warn(`[safeParseJSON] Progressive trim succeeded after ${attempt + 1} trims (data is partial)`);
      return result;
    } catch { /* keep trimming */ }
  }

  console.error('[safeParseJSON] All repair attempts failed. Last 200 chars:', text.slice(-200));
  console.error('[safeParseJSON] First 500 chars:', text.slice(0, 500));
  throw new Error(`Invalid JSON from LLM — all repair strategies exhausted`);
}
