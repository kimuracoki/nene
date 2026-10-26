// コードアクション（エラーの直し方をその場で当てる）
//
//   - 部品 <Button> が見つからない → import Ui.Button を足す
//   - モジュール Icon が見つからない（Icon.close など） → import qualified Ui.Icon as Icon を足す
//   - JSX の {} に式を書いた → where に名前をつけて取り出す（JSX には名前だけを書く）

type Json = Record<string, any>;

interface Diagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  message: string;
}

export interface ActionContext {
  uri: string;
  text: string;
  diagnostics: Diagnostic[];
  modules: string[]; // プロジェクトとパッケージのモジュール名
}

export function codeActions(ctx: ActionContext): Json[] {
  const out: Json[] = [];
  for (const d of ctx.diagnostics) {
    const tag = /部品 <([A-Z]\w*)> が見つかりません/.exec(d.message)?.[1];
    if (tag) {
      for (const m of ctx.modules.filter((name) => name.split(".").pop() === tag)) {
        out.push(fix(ctx, d, `import ${m} を足す`, addImport(ctx.text, `import ${m}`)));
      }
    }
    const alias = /モジュール ([A-Z][\w.]*) が見つかりません（import していますか？）/.exec(d.message)?.[1];
    if (alias) {
      for (const m of ctx.modules.filter((name) => name === alias || name.endsWith(`.${alias}`))) {
        const line = m === alias ? `import qualified ${m}` : `import qualified ${m} as ${alias}`;
        out.push(fix(ctx, d, `${line} を足す`, addImport(ctx.text, line)));
      }
    }
    if (d.message.startsWith("JSX の {} には")) {
      const edits = extractToWhere(ctx.text, d.range.start.line, d.range.start.character);
      if (edits) out.push({ title: "where に名前をつけて取り出す", kind: "refactor.extract", diagnostics: [d], edit: { changes: { [ctx.uri]: edits } } });
    }
  }
  return out;
}

function fix(ctx: ActionContext, d: Diagnostic, title: string, edit: Json): Json {
  return { title, kind: "quickfix", diagnostics: [d], isPreferred: true, edit: { changes: { [ctx.uri]: [edit] } } };
}

// 最後の import の次の行に足す。import がなければ module の行の後に、空行を挟んで足す
function addImport(text: string, line: string): Json {
  const lines = text.split("\n");
  const last = lines.reduce((found, l, i) => (l.startsWith("import ") ? i : found), -1);
  if (last >= 0) return insertAt(last + 1, `${line}\n`);
  const moduleLine = lines.findIndex((l) => l.startsWith("module "));
  return insertAt(moduleLine + 1, `\n${line}\n`);
}

const insertAt = (line: number, newText: string) => ({ range: { start: { line, character: 0 }, end: { line, character: 0 } }, newText });

// ---- where に取り出す ----

const indentOf = (line: string) => line.length - line.trimStart().length;

function extractToWhere(text: string, line: number, character: number): Json[] | null {
  const lines = text.split("\n");
  const offset = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0) + character;
  const open = text.lastIndexOf("{", offset);
  const close = matchingBrace(text, open);
  if (open < 0 || close < 0 || close < offset) return null;
  const expr = text.slice(open + 1, close).trim().replace(/\s*\n\s*/g, " ");
  const name = freshName(text);

  // 式を囲む、いちばん内側の等式を探す（字下げがより浅く、名前で始まる行）
  const head = equationAbove(lines, line);
  if (head < 0) return null;
  const base = indentOf(lines[head]);
  let end = head;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    if (indentOf(lines[i]) <= base) break;
    end = i;
  }
  const where = lines.slice(head + 1, end + 1).findIndex((l) => l.trim() === "where" && indentOf(l) === base + 2);
  const binding = `${" ".repeat(base + 4)}${name} = ${expr}`;
  const insert = where >= 0 ? `\n${binding}` : `\n${" ".repeat(base + 2)}where\n${binding}`;
  const startPos = positionOf(lines, open + 1);
  const endPos = positionOf(lines, close);
  return [
    { range: { start: startPos, end: endPos }, newText: name },
    { range: { start: { line: end, character: lines[end].length }, end: { line: end, character: lines[end].length } }, newText: insert },
  ];
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '"') {
      i = text.indexOf('"', i + 1);
      if (i < 0) return -1;
    } else if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function equationAbove(lines: string[], from: number): number {
  let limit = indentOf(lines[from]);
  for (let i = from; i >= 0; i--) {
    const l = lines[i];
    if (l.trim() === "" || l.trimStart().startsWith("--")) continue;
    const indent = indentOf(l);
    if (indent >= limit && i !== from) continue;
    limit = Math.min(limit, indent);
    if (!/^\s*[a-z_][\w']*/.test(l) || /^\s*where\b/.test(l)) continue;
    const next = lines.slice(i + 1).find((x) => x.trim() !== "") ?? "";
    if (/\s=(\s|$)/.test(l) || next.trimStart().startsWith("|")) return i;
  }
  return -1;
}

function freshName(text: string): string {
  for (let n = 1; ; n++) {
    const name = n === 1 ? "value" : `value${n}`;
    if (!new RegExp(`\\b${name}\\b`).test(text)) return name;
  }
}

function positionOf(lines: string[], offset: number) {
  let line = 0;
  while (line < lines.length && offset > lines[line].length) {
    offset -= lines[line].length + 1;
    line++;
  }
  return { line, character: offset };
}
