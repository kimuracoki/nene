// style ブロックの CSS を扱う。クラス名を取り出し、部品ごとにぶつからない名前に書き換える

import { CompileError, type StyleBlock } from "./syntax.ts";

export interface ScopedStyle {
  css: string; // 書き換えたあとの CSS
  classes: Map<string, string>; // Tufa での名前（itemDone）→ 実際のクラス名（Todo__item-done）
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
  const fieldOf = new Map<string, string>(); // クラス名 → Tufa での名前（同じ名前になってしまうものを見つける）
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
  return { css, classes };
}

