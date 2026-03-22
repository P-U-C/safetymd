/**
 * Minimal YAML frontmatter parser for safety.md files.
 * Handles: key: value, nested objects (2-space indent), arrays (- item).
 * Does NOT handle multi-line strings, anchors, or complex YAML.
 */

type YamlValue = string | number | boolean | null | YamlValue[] | YamlObject;
type YamlObject = { [key: string]: YamlValue };

function parseLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^(\s*)([^:\s][^:]*):\s*(.*)$/);
  if (!match) return null;
  const key = match[2];
  const value = match[3];
  if (key === undefined || value === undefined) return null;
  return { key: key.trim(), value: value.trim() };
}

function parseScalar(val: string): string | number | boolean | null {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~' || val === '') return null;
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

function getIndent(line: string): number {
  return line.match(/^(\s*)/)?.[1]?.length ?? 0;
}

/**
 * Parse YAML content lines into an object.
 */
function parseYamlBody(lines: string[]): YamlObject | null {
  try {
    const root: YamlObject = {};
    let i = 0;

    function parseObject(baseIndent: number): YamlObject {
      const obj: YamlObject = {};
      while (i < lines.length) {
        const line = lines[i];
        if (line === undefined) { i++; continue; }
        if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
        const indent = getIndent(line);
        if (indent < baseIndent) break;
        if (indent > baseIndent) { i++; continue; }

        const parsed = parseLine(line);
        if (!parsed) { i++; continue; }

        i++;
        const { key, value } = parsed;

        if (value === '') {
          const nextLine = lines[i];
          if (nextLine !== undefined && nextLine.trim().startsWith('-')) {
            obj[key] = parseArray(indent + 2);
          } else {
            obj[key] = parseObject(indent + 2);
          }
        } else {
          obj[key] = parseScalar(value);
        }
      }
      return obj;
    }

    function parseArray(baseIndent: number): YamlValue[] {
      const arr: YamlValue[] = [];
      while (i < lines.length) {
        const line = lines[i];
        if (line === undefined) { i++; continue; }
        if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
        const indent = getIndent(line);
        if (indent < baseIndent - 2) break;

        const trimmed = line.trim();
        if (!trimmed.startsWith('-')) break;

        const rest = trimmed.slice(1).trim();
        i++;

        if (rest === '') {
          arr.push(parseObject(indent + 2));
        } else if (rest.includes(':')) {
          const objLines = [' '.repeat(indent + 2) + rest];
          while (i < lines.length) {
            const next = lines[i];
            if (next === undefined || next.trim() === '') break;
            const ni = getIndent(next);
            if (ni <= indent) break;
            if (next.trim().startsWith('-')) break;
            objLines.push(next);
            i++;
          }
          const savedI = i;
          i = 0;
          const subObj = parseYamlBody(objLines) ?? {};
          i = savedI;
          arr.push(subObj);
        } else {
          arr.push(parseScalar(rest));
        }
      }
      return arr;
    }

    i = 0;
    Object.assign(root, parseObject(0));
    return root;
  } catch {
    return null;
  }
}

/**
 * Extract and parse YAML frontmatter from a markdown string.
 * Returns parsed object or null.
 */
export function parseFrontmatter(content: string): YamlObject | null {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return null;

  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (endIdx === -1) return null;

  const yamlLines = lines.slice(1, endIdx);
  return parseYamlBody(yamlLines);
}

export type { YamlObject, YamlValue };
