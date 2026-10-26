// ファイルの構造を、エディタの機能のために取り出す
//
//   - アウトライン（関数・型・コンストラクタ・フィールド・where の中の定義）
//   - 折りたたみ（宣言・where・JSX の要素・import のまとまり・コメント・style ブロック）
//   - 構造に沿った選択（名前 → JSX の要素 → 等式 → 宣言 と広げる）
//
// 型検査が通らない書きかけのファイルでも使えるよう、構文だけを見る。

import { parseModule } from "./parser.ts";
import type { Binding, Module, Pos } from "./syntax.ts";

export interface Range {
  start: { line: number; character: number }; // 0 から数える（LSP と同じ）
  end: { line: number; character: number };
}

export interface OutlineSymbol {
  name: string;
  detail?: string;
  kind: number; // LSP の SymbolKind
  range: Range;
  selectionRange: Range;
  children?: OutlineSymbol[];
}

export const SYMBOL = { module: 2, class: 5, method: 6, field: 8, enum: 10, function: 12, variable: 13, enumMember: 22, struct: 23 };

export interface FoldingRange {
  startLine: number;
  endLine: number;
  kind?: "comment" | "imports" | "region";
}

// 構文が読めなければ null
export function parse(text: string, file: string): Module | null {
  try {
    return parseModule(text, file);
  } catch {
    return null;
  }
}

// ---- アウトライン ----

export function outline(text: string, mod: Module): OutlineSymbol[] {
  const lines = text.split("\n");
  const ends = declEnds(lines, mod);
  const range = (pos: Pos): Range => ({
    start: { line: pos.line - 1, character: pos.col - 1 },
    end: { line: ends(pos.line - 1), character: lines[ends(pos.line - 1)]?.length ?? 0 },
  });
  const name = (pos: Pos, n: string): Range => ({
    start: { line: pos.line - 1, character: pos.col - 1 },
    end: { line: pos.line - 1, character: pos.col - 1 + n.length },
  });

  const symbols: OutlineSymbol[] = [];
  for (const d of mod.datas) {
    symbols.push({
      name: d.name,
      detail: d.params.join(" "),
      kind: SYMBOL.enum,
      range: range(d.pos),
      selectionRange: name(d.namePos, d.name),
      children: d.ctors.map((c) => ({ name: c.name, kind: SYMBOL.enumMember, range: name(c.pos, c.name), selectionRange: name(c.pos, c.name) })),
    });
  }
  for (const a of mod.aliases) {
    const fields = a.body.k === "trecord" ? a.body.fields : [];
    symbols.push({
      name: a.name,
      kind: SYMBOL.struct,
      range: range(a.pos),
      selectionRange: name(a.namePos, a.name),
      children: fields.map((f) => ({ name: f.name, kind: SYMBOL.field, range: name(f.pos, f.name), selectionRange: name(f.pos, f.name) })),
    });
  }
  for (const f of mod.foreigns) {
    symbols.push({ name: f.name, detail: "foreign", kind: SYMBOL.function, range: range(f.pos), selectionRange: name(f.sig.pos, f.name) });
  }
  for (const b of mod.body.bindings) symbols.push(bindingSymbol(b, lines, range(b.sig?.pos ?? b.pos)));
  if (mod.style) {
    const line = mod.style.pos.line - 2; // style と書いた行
    const r: Range = { start: { line, character: 0 }, end: { line: lines.length - 1, character: 0 } };
    symbols.push({ name: "style", kind: SYMBOL.module, range: r, selectionRange: { start: { line, character: 0 }, end: { line, character: 5 } } });
  }
  return symbols.sort((a, b) => a.range.start.line - b.range.start.line);
}

function bindingSymbol(b: Binding, lines: string[], range: Range): OutlineSymbol {
  const sigText = b.sig ? (lines[b.sig.pos.line - 1] ?? "").split("::").slice(1).join("::").trim() : undefined;
  const isFunction = b.equations[0].params.length > 0 || (sigText?.includes("->") ?? false);
  const pos = b.equations[0].pos;
  const children = b.equations.flatMap((eq) => eq.where.bindings).map((w) => {
    const first = w.equations[0].pos;
    const last = w.equations[w.equations.length - 1].pos;
    const start = (w.sig?.pos ?? first).line - 1;
    const r: Range = { start: { line: start, character: 0 }, end: { line: blockEnd(lines, last.line - 1), character: 0 } };
    return bindingSymbol(w, lines, r);
  });
  return {
    name: b.name,
    detail: sigText,
    kind: isFunction ? SYMBOL.function : SYMBOL.variable,
    range,
    selectionRange: { start: { line: pos.line - 1, character: pos.col - 1 }, end: { line: pos.line - 1, character: pos.col - 1 + b.name.length } },
    children: children.length > 0 ? children : undefined,
  };
}

// トップレベルの宣言が終わる行（次の宣言の手前。末尾の空行とコメントは含めない）
function declEnds(lines: string[], mod: Module): (line: number) => number {
  const starts = [
    ...mod.imports.map((d) => d.pos.line - 1),
    ...mod.datas.map((d) => d.pos.line - 1),
    ...mod.aliases.map((d) => d.pos.line - 1),
    ...mod.foreigns.map((d) => d.pos.line - 1),
    ...mod.body.bindings.map((b) => (b.sig?.pos ?? b.pos).line - 1),
    ...mod.body.bindings.flatMap((b) => b.equations.map((e) => e.pos.line - 1)),
    ...(mod.style ? [mod.style.pos.line - 2] : []),
    lines.length,
  ].sort((a, b) => a - b);
  return (line) => {
    let next = starts.find((s) => s > line) ?? lines.length;
    // 同じ名前の等式が続くときは、まとめて 1 つの宣言とみなす
    while (next < lines.length && sameBinding(lines[line], lines[next])) next = starts.find((s) => s > next) ?? lines.length;
    let end = next - 1;
    while (end > line && /^\s*(--.*)?$/.test(lines[end])) end--;
    return end;
  };
}

const KEYWORDS = new Set(["module", "import", "foreign", "data", "type", "style"]);

function sameBinding(a: string, b: string): boolean {
  const name = (l: string) => /^([a-z_][\w']*)\s/.exec(l)?.[1];
  const na = name(a);
  return na !== undefined && !KEYWORDS.has(na) && na === name(b) && !/^\S+\s+::/.test(b);
}

// その行から、字下げがより深い行が続くあいだ（where の中の定義の終わり）
function blockEnd(lines: string[], line: number): number {
  const indent = lines[line].length - lines[line].trimStart().length;
  let end = line;
  for (let i = line + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    if (lines[i].length - lines[i].trimStart().length <= indent) break;
    end = i;
  }
  return end;
}

// ---- JSX の要素の範囲 ----

interface Span {
  start: number; // 文字の位置
  end: number;
}

// JSX の要素（<Tag ...>...</Tag>、<Tag />、<>...</>）の範囲。文字列とコメントは読み飛ばす
export function jsxElements(text: string): Span[] {
  const spans: Span[] = [];
  const stack: number[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      i++;
      while (i < text.length && text[i] !== '"' && text[i] !== "\n") i += text[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === "-" && text[i + 1] === "-") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (c === "\n" && text.startsWith("style\n", i + 1)) break; // style ブロックは CSS
    if (c === "<" && text[i + 1] === "/") {
      const close = text.indexOf(">", i);
      if (close < 0) break;
      const start = stack.pop();
      if (start !== undefined) spans.push({ start, end: close + 1 });
      i = close + 1;
      continue;
    }
    if (c === "<" && /[A-Za-z>]/.test(text[i + 1] ?? "")) {
      const end = tagEnd(text, i);
      if (end < 0) break;
      if (text[end - 1] === "/") spans.push({ start: i, end: end + 1 });
      else stack.push(i);
      i = end + 1;
      continue;
    }
    i++;
  }
  return spans;
}

// 開きタグの > の位置（属性の {…} と "…" の中の > は数えない）
function tagEnd(text: string, from: number): number {
  let depth = 0;
  for (let i = from + 1; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      i = text.indexOf('"', i + 1);
      if (i < 0) return -1;
    } else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return i;
  }
  return -1;
}

// ---- 折りたたみ ----

export function foldingRanges(text: string, mod: Module | null): FoldingRange[] {
  const lines = text.split("\n");
  const out: FoldingRange[] = [];
  const add = (startLine: number, endLine: number, kind?: FoldingRange["kind"]) => {
    if (endLine > startLine) out.push({ startLine, endLine, ...(kind ? { kind } : {}) });
  };
  if (mod) {
    const walk = (symbols: OutlineSymbol[]) => {
      for (const s of symbols) {
        add(s.range.start.line, s.range.end.line);
        if (s.children) walk(s.children);
      }
    };
    walk(outline(text, mod));
    if (mod.imports.length > 1) add(mod.imports[0].pos.line - 1, mod.imports[mod.imports.length - 1].pos.line - 1, "imports");
  }
  const lineOf = offsetToLine(text);
  // JSX の要素は、閉じタグの行を残して畳む（<Row ... /> のような自分で閉じる要素は最後の行まで）
  for (const s of jsxElements(text)) {
    const last = lineOf(s.end - 1);
    add(lineOf(s.start), text[s.end - 2] === "/" ? last : last - 1);
  }
  // 続けて書いた -- のコメント（style ブロックの CSS 変数は除く）
  const codeEnd = lines.indexOf("style");
  for (let i = 0; i < (codeEnd < 0 ? lines.length : codeEnd); i++) {
    if (!/^\s*--/.test(lines[i])) continue;
    let j = i;
    while (j + 1 < lines.length && /^\s*--/.test(lines[j + 1])) j++;
    add(i, j, "comment");
    i = j;
  }
  return out;
}

const offsetToLine = (text: string) => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return (offset: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
};

// ---- 構造に沿った選択 ----

export interface SelectionRange {
  range: Range;
  parent?: SelectionRange;
}

// 名前 → それを囲む JSX の要素（内側から）→ 等式・定義 → トップレベルの宣言
export function selectionRange(text: string, mod: Module | null, line: number, character: number): SelectionRange | null {
  const lines = text.split("\n");
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  const offset = (lineStarts[line] ?? text.length) + character;
  const toPos = (o: number) => {
    let l = lineStarts.length - 1;
    while (lineStarts[l] > o) l--;
    return { line: l, character: o - lineStarts[l] };
  };
  const spans: Span[] = [];

  const word = /[\w'.]*$/.exec(text.slice(0, offset))![0].length;
  const after = /^[\w']*/.exec(text.slice(offset))![0].length;
  if (word + after > 0) spans.push({ start: offset - word, end: offset + after });

  const elements = jsxElements(text)
    .filter((s) => s.start <= offset && offset < s.end)
    .sort((a, b) => b.start - a.start || a.end - b.end);
  spans.push(...elements);

  if (mod) {
    const nested: Range[] = [];
    const walk = (symbols: OutlineSymbol[]) => {
      for (const s of symbols) {
        if (s.range.start.line <= line && line <= s.range.end.line) {
          nested.unshift(s.range);
          if (s.children) walk(s.children);
        }
      }
    };
    walk(outline(text, mod));
    for (const r of nested) {
      spans.push({ start: lineStarts[r.start.line], end: lineStarts[r.end.line] + lines[r.end.line].length });
    }
  }

  // 外側ほど広くなるよう、広がらないものは除く
  const chain: Span[] = [];
  for (const s of spans) {
    const prev = chain[chain.length - 1];
    if (!prev || (s.start <= prev.start && s.end >= prev.end && (s.start < prev.start || s.end > prev.end))) chain.push(s);
  }
  let result: SelectionRange | undefined;
  for (const s of chain.reverse()) result = { range: { start: toPos(s.start), end: toPos(s.end) }, parent: result };
  return result ?? null;
}
