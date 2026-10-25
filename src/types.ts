// 型の表現と単一化（行多相レコードと組み込み型クラスを含む）

export type Type = TVar | TCon | TFun | TRec;

export class TVar {
  k = "var" as const;
  id: number;
  level: number;
  ref: Type | null = null;
  classes: Set<string>;
  constructor(id: number, level: number, classes: Set<string> = new Set()) {
    this.id = id;
    this.level = level;
    this.classes = classes;
  }
}

export interface TCon {
  k: "con";
  name: string; // 一意な名前（例: "Int", "List", "Todo.Priority"）
  display: string;
  args: Type[];
  skolem?: { classes: Set<string> }; // 型注釈の型変数（具体的な型にはならない）
}

export interface TFun {
  k: "fun";
  from: Type;
  to: Type;
}

export interface AliasTag {
  name: string;
  defaultsJs: string | null;
  defaults: Set<string>;
}

export interface TRec {
  k: "rec";
  fields: Map<string, Type>;
  rest: Type | null; // null は閉じたレコード。TVar なら残りのフィールドを表す
  alias?: AliasTag; // デフォルト値を補うための印。単一化では無視する
}

export interface Scheme {
  vars: TVar[];
  type: Type;
}

export class TypeError_ extends Error {}

let counter = 0;
export function freshVar(level: number, classes: Iterable<string> = []): TVar {
  return new TVar(++counter, level, new Set(classes));
}

export const con = (name: string, args: Type[] = [], display?: string): TCon => ({
  k: "con",
  name,
  display: display ?? name.split(".").pop()!,
  args,
});
export const fun = (from: Type, to: Type): TFun => ({ k: "fun", from, to });
export const funN = (args: Type[], result: Type): Type => args.reduceRight<Type>((acc, a) => fun(a, acc), result);

export const tInt = con("Int");
export const tFloat = con("Float");
export const tString = con("String");
export const tBool = con("Bool");
export const tUnit = con("()");
export const tStyle = con("Style");
export const tList = (t: Type) => con("List", [t]);
export const tHtml = (t: Type) => con("Html", [t]);
export const tTuple = (items: Type[]) => con(`Tuple${items.length}`, items);

export function prune(t: Type): Type {
  while (t.k === "var" && t.ref) t = t.ref;
  return t;
}

// レコードを、フィールドを全部集めた形にする
export function flattenRecord(t: TRec): { fields: Map<string, Type>; rest: Type | null; alias?: AliasTag } {
  const fields = new Map(t.fields);
  let rest = t.rest ? prune(t.rest) : null;
  while (rest && rest.k === "rec") {
    for (const [k, v] of rest.fields) if (!fields.has(k)) fields.set(k, v);
    rest = rest.rest ? prune(rest.rest) : null;
  }
  return { fields, rest, alias: t.alias };
}

// ---- 型クラス ----

export const CLASSES = ["Num", "Ord", "Show", "Append"] as const;

function satisfies(cls: string, t: Type): boolean {
  t = prune(t);
  if (t.k === "var") return true; // 呼び出し側でクラスを移す
  if (t.k === "con" && t.skolem) return t.skolem.classes.has(cls);
  if (t.k !== "con") return false;
  switch (cls) {
    case "Num":
      return t.name === "Int" || t.name === "Float";
    case "Ord":
      return t.name === "Int" || t.name === "Float" || t.name === "String";
    case "Show":
      return t.name === "Int" || t.name === "Float" || t.name === "Bool";
    case "Append":
      return t.name === "String" || t.name === "List";
    default:
      return false;
  }
}

const CLASS_TEXT: Record<string, string> = {
  Num: "数値（Int か Float）",
  Ord: "大小を比べられる型（Int・Float・String）",
  Show: "show できる型（Int・Float・Bool）",
  Append: "++ で連結できる型（String かリスト）",
};

// ---- 単一化 ----

function occurs(v: TVar, t: Type): boolean {
  t = prune(t);
  if (t === v) return true;
  switch (t.k) {
    case "var":
      return false;
    case "con":
      return t.args.some((a) => occurs(v, a));
    case "fun":
      return occurs(v, t.from) || occurs(v, t.to);
    case "rec":
      return [...t.fields.values()].some((f) => occurs(v, f)) || (t.rest !== null && occurs(v, t.rest));
  }
}

// 束縛する型の中の変数のレベルを下げる（汎化のため）
function adjustLevels(t: Type, level: number) {
  t = prune(t);
  switch (t.k) {
    case "var":
      if (t.level > level) t.level = level;
      return;
    case "con":
      t.args.forEach((a) => adjustLevels(a, level));
      return;
    case "fun":
      adjustLevels(t.from, level);
      adjustLevels(t.to, level);
      return;
    case "rec":
      t.fields.forEach((f) => adjustLevels(f, level));
      if (t.rest) adjustLevels(t.rest, level);
  }
}

function bindVar(v: TVar, t: Type) {
  if (t === v) return;
  if (occurs(v, t)) throw new TypeError_("型が無限に続いてしまいます（自分自身を含む型になります）");
  if (t.k === "var") {
    for (const c of v.classes) t.classes.add(c);
    if (v.level < t.level) t.level = v.level;
  } else {
    for (const c of v.classes) {
      if (!satisfies(c, t)) throw new TypeError_(`${show(t)} は ${CLASS_TEXT[c] ?? c} ではありません`);
    }
    adjustLevels(t, v.level);
  }
  v.ref = t;
}

export function unify(a: Type, b: Type): void {
  a = prune(a);
  b = prune(b);
  if (a === b) return;
  if (a.k === "var") return bindVar(a, b);
  if (b.k === "var") return bindVar(b, a);
  if (a.k === "con" && b.k === "con") {
    if (a.name !== b.name || a.args.length !== b.args.length || (a.skolem && a !== b) || (b.skolem && a !== b)) {
      throw mismatch(a, b);
    }
    a.args.forEach((x, i) => unify(x, b.args[i]));
    return;
  }
  if (a.k === "fun" && b.k === "fun") {
    unify(a.from, b.from);
    unify(a.to, b.to);
    return;
  }
  if (a.k === "rec" && b.k === "rec") return unifyRecords(a, b);
  throw mismatch(a, b);
}

function mismatch(a: Type, b: Type): TypeError_ {
  const [sa, sb] = showPair(a, b);
  return new TypeError_(`型が合いません: ${sa} と ${sb}`);
}

function unifyRecords(a: TRec, b: TRec) {
  const fa = flattenRecord(a);
  const fb = flattenRecord(b);
  for (const [k, t] of fa.fields) {
    const u = fb.fields.get(k);
    if (u) unify(t, u);
  }
  const onlyA = new Map([...fa.fields].filter(([k]) => !fb.fields.has(k)));
  const onlyB = new Map([...fb.fields].filter(([k]) => !fa.fields.has(k)));
  const restA = fa.rest;
  const restB = fb.rest;
  const missing = (fields: Map<string, Type>, rec: TRec) => {
    const names = [...fields.keys()].join(", ");
    return new TypeError_(`レコードにフィールド ${names} がありません（${show(rec)}）`);
  };
  if (onlyA.size > 0 && onlyB.size > 0) {
    if (!restA || restA.k !== "var") throw missing(onlyB, a);
    if (!restB || restB.k !== "var") throw missing(onlyA, b);
    const level = Math.min(restA.level, restB.level);
    const r = freshVar(level);
    bindVar(restA, { k: "rec", fields: onlyB, rest: r });
    bindVar(restB, { k: "rec", fields: onlyA, rest: r });
  } else if (onlyA.size > 0) {
    if (!restB || restB.k !== "var") throw missing(onlyA, b);
    bindVar(restB, { k: "rec", fields: onlyA, rest: restA });
  } else if (onlyB.size > 0) {
    if (!restA || restA.k !== "var") throw missing(onlyB, a);
    bindVar(restA, { k: "rec", fields: onlyB, rest: restB });
  } else if (restA && restB) {
    unify(restA, restB);
  } else if (restA) {
    if (restA.k !== "var") throw new TypeError_("レコードの形が合いません");
    bindVar(restA, { k: "rec", fields: new Map(), rest: null });
  } else if (restB) {
    if (restB.k !== "var") throw new TypeError_("レコードの形が合いません");
    bindVar(restB, { k: "rec", fields: new Map(), rest: null });
  }
}

// ---- 汎化と具体化 ----

export function generalize(t: Type, level: number): Scheme {
  const vars: TVar[] = [];
  const walk = (x: Type) => {
    x = prune(x);
    switch (x.k) {
      case "var":
        if (x.level > level && !vars.includes(x)) vars.push(x);
        return;
      case "con":
        x.args.forEach(walk);
        return;
      case "fun":
        walk(x.from);
        walk(x.to);
        return;
      case "rec":
        x.fields.forEach(walk);
        if (x.rest) walk(x.rest);
    }
  };
  walk(t);
  return { vars, type: t };
}

export function instantiate(s: Scheme, level: number): Type {
  if (s.vars.length === 0) return s.type;
  const map = new Map<TVar, TVar>();
  for (const v of s.vars) map.set(v, freshVar(level, v.classes));
  return substitute(s.type, (v) => map.get(v));
}

export function substitute(t: Type, f: (v: TVar) => Type | undefined): Type {
  t = prune(t);
  switch (t.k) {
    case "var":
      return f(t) ?? t;
    case "con":
      return t.args.length ? { ...t, args: t.args.map((a) => substitute(a, f)) } : t;
    case "fun":
      return fun(substitute(t.from, f), substitute(t.to, f));
    case "rec":
      return {
        k: "rec",
        fields: new Map([...t.fields].map(([k, v]) => [k, substitute(v, f)])),
        rest: t.rest ? substitute(t.rest, f) : null,
        alias: t.alias,
      };
  }
}

export const mono = (t: Type): Scheme => ({ vars: [], type: t });

// ---- 表示 ----

export function show(t: Type): string {
  return new Namer().show(t);
}

export function showPair(a: Type, b: Type): [string, string] {
  const n = new Namer();
  return [n.show(a), n.show(b)];
}

class Namer {
  names = new Map<TVar, string>();

  name(v: TVar): string {
    let n = this.names.get(v);
    if (!n) {
      const i = this.names.size;
      n = String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");
      this.names.set(v, n);
    }
    return n;
  }

  show(t: Type, ctx: "top" | "arg" | "fun" = "top"): string {
    t = prune(t);
    switch (t.k) {
      case "var":
        return this.name(t);
      case "con": {
        if (t.name === "List") return `[${this.show(t.args[0])}]`;
        if (t.name.startsWith("Tuple")) return `(${t.args.map((a) => this.show(a)).join(", ")})`;
        if (t.args.length === 0) return t.display;
        const s = `${t.display} ${t.args.map((a) => this.show(a, "arg")).join(" ")}`;
        return ctx === "arg" ? `(${s})` : s;
      }
      case "fun": {
        const s = `${this.show(t.from, "fun")} -> ${this.show(t.to)}`;
        return ctx === "top" ? s : `(${s})`;
      }
      case "rec": {
        const { fields, rest } = flattenRecord(t);
        const fs = [...fields].map(([k, v]) => `${k} :: ${this.show(v)}`).join(", ");
        if (rest && rest.k === "var") return `{ ${this.name(rest)} | ${fs} }`;
        return fs ? `{ ${fs} }` : "{}";
      }
    }
  }
}
