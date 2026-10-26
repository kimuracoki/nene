// style ブロックの CSS を扱う。クラス名を取り出し、部品ごとにぶつからない名前に書き換える

import { CompileError, type StyleBlock } from "./syntax.ts";

export interface ScopedStyle {
  css: string; // 書き換えたあとの CSS
  classes: Map<string, string>; // Nene での名前（itemDone）→ 実際のクラス名（Todo__item-done）
  scope: string; // このファイルで書いたタグに付ける印のクラス（nene-Todo）
  vars: Set<string>; // var(--bar-width) のように使われている CSS 変数の名前（bar-width）
}

// barWidth → bar-width（vars のフィールド名から CSS 変数の名前へ）
export function varName(field: string): string {
  return field.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

// item-done → itemDone
export function classField(name: string): string {
  const camel = name.replace(/-+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/-/g, "");
  return camel[0].toLowerCase() + camel.slice(1);
}

// コメント・文字列・url(...) を除いた部分だけで、.クラス名 を置き換える
function mapClasses(css: string, f: (name: string) => string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const j = end < 0 ? css.length : end + 2;
      out += css.slice(i, j);
      i = j;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
    } else if (/^url\(/i.test(css.slice(i, i + 4))) {
      const end = css.indexOf(")", i);
      const j = end < 0 ? css.length : end + 1;
      out += css.slice(i, j);
      i = j;
    } else if (c === "." && /[_a-zA-Z-]/.test(css[i + 1] ?? "") && !/[0-9]/.test(css[i - 1] ?? "")) {
      const m = /^-?[_a-zA-Z][\w-]*/.exec(css.slice(i + 1));
      if (m) {
        out += "." + f(m[0]);
        i += 1 + m[0].length;
      } else {
        out += c;
        i++;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function scopeStyle(block: StyleBlock, moduleName: string, file: string): ScopedStyle {
  const prefix = moduleName.replace(/\./g, "-");
  const classes = new Map<string, string>();
  const fieldOf = new Map<string, string>(); // クラス名 → Nene での名前（同じ名前になってしまうものを見つける）
  let depth = 0;
  for (const ch of block.css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) throw new CompileError("style ブロックの { と } の数が合いません", block.pos, file);
  const css = mapClasses(block.css, (name) => {
    const field = classField(name);
    const prev = fieldOf.get(field);
    if (prev !== undefined && prev !== name) {
      throw new CompileError(`クラス .${prev} と .${name} が、どちらも css.${field} になってしまいます。どちらかの名前を変えてください`, block.pos, file);
    }
    fieldOf.set(field, name);
    const scoped = `${prefix}__${name}`;
    classes.set(field, scoped);
    return scoped;
  });
  const scope = `nene-${prefix}`;
  const vars = new Set([...block.css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/var\(\s*--([\w-]+)/g)].map((m) => m[1]));
  return { css: scopeSelectors(css, scope), classes, scope, vars };
}

// ---- セレクタを、このファイルのタグにだけ当たるように書き換える ----
//
//   h2 { }            → h2.nene-Card { }
//   .list > li:hover  → .Card__list > li.nene-Card:hover
//   .title::before    → .Card__title.nene-Card::before
//   body, :root, html → そのまま（ページ全体を表すので）

// 文字列とコメントを読み飛ばして、次の位置を返す（どちらでもなければ -1）
function skipQuoted(css: string, i: number): number {
  const c = css[i];
  if (c === "/" && css[i + 1] === "*") {
    const end = css.indexOf("*/", i + 2);
    return end < 0 ? css.length : end + 2;
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
    return j + 1;
  }
  return -1;
}

export function scopeSelectors(css: string, scope: string): string {
  let i = 0;

  // { の手前（または ; か } の手前）までを読む
  const prelude = (): string => {
    const start = i;
    let depth = 0;
    while (i < css.length) {
      const skip = skipQuoted(css, i);
      if (skip >= 0) {
        i = skip;
        continue;
      }
      const c = css[i];
      if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (depth === 0 && (c === "{" || c === ";" || c === "}")) break;
      i++;
    }
    return css.slice(start, i);
  };

  // 対応する } までの中身をそのまま読む（i は } の次に進む）
  const rawBlock = (): string => {
    const start = i;
    let depth = 1;
    while (i < css.length) {
      const skip = skipQuoted(css, i);
      if (skip >= 0) {
        i = skip;
        continue;
      }
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) break;
      i++;
    }
    const inner = css.slice(start, i);
    i++;
    return inner;
  };

  // 空白とコメントは、そのまま写して読み飛ばす（セレクタの一部とみなさない）
  const trivia = (): string => {
    const start = i;
    for (;;) {
      if (/\s/.test(css[i] ?? "")) i++;
      else if (css[i] === "/" && css[i + 1] === "*") i = skipQuoted(css, i);
      else return css.slice(start, i);
    }
  };

  const rules = (): string => {
    let out = "";
    while (i < css.length && css[i] !== "}") {
      out += trivia();
      if (i >= css.length || css[i] === "}") break;
      const head = prelude();
      const c = css[i];
      if (c !== "{") {
        out += head + (c === ";" ? ";" : "");
        if (c === ";") i++;
        continue;
      }
      i++;
      const at = head.trim();
      if (/^@(media|supports|container|layer|document)\b/i.test(at)) {
        const inner = rules();
        i++;
        out += `${head}{${inner}}`;
      } else if (at.startsWith("@")) {
        out += `${head}{${rawBlock()}}`; // @keyframes や @font-face の中は書き換えない
      } else {
        out += `${scopeSelectorList(head, scope)}{${rawBlock()}}`;
      }
    }
    return out;
  };

  return rules();
}

// トップレベルの区切り文字で分ける（括弧の中は分けない）
function splitTop(text: string, isSep: (c: string) => boolean): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && isSep(c)) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

const DOCUMENT_LEVEL = /^(:root|html|body)(?![\w-])/i;
const PSEUDO_ELEMENT = /::|:(before|after|first-line|first-letter)(?![\w-])/i;

function scopeSelectorList(head: string, scope: string): string {
  const lead = head.match(/^\s*/)![0];
  const trail = head.match(/\s*$/)![0];
  const list = splitTop(head.trim(), (c) => c === ",");
  return lead + list.map((sel) => scopeSelector(sel, scope)).join(",") + trail;
}

function scopeSelector(sel: string, scope: string): string {
  const lead = sel.match(/^\s*/)![0];
  const body = sel.trim();
  const compounds = splitTop(body, (c) => c === " " || c === ">" || c === "+" || c === "~")
    .map((p) => p.trim())
    .filter((p) => p);
  if (compounds.every((p) => DOCUMENT_LEVEL.test(p))) return sel;
  // 最後の複合セレクタ（実際に当たる要素）に印を付ける。疑似要素があればその手前に
  let cut = body.length;
  let depth = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    const c = body[i];
    if (c === ")" || c === "]") depth++;
    else if (c === "(" || c === "[") depth--;
    else if (depth === 0 && (c === " " || c === ">" || c === "+" || c === "~")) {
      cut = i + 1;
      break;
    }
    if (i === 0) cut = 0;
  }
  const before = body.slice(0, cut);
  const last = body.slice(cut);
  const m = PSEUDO_ELEMENT.exec(last);
  const at = m ? m.index : last.length;
  return `${lead}${before}${last.slice(0, at)}.${scope}${last.slice(at)}`;
}

