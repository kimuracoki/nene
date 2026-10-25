// パターンの網羅性チェック（Maranget の usefulness アルゴリズム）

import type { Pat } from "./syntax.ts";

interface Ctor {
  id: string; // 同じ型の中で一意
  arity: number;
  show: (args: string[]) => string;
}

type NPat = { k: "wild" } | { k: "ctor"; ctor: Ctor; all: Ctor[] | null; args: NPat[] } | { k: "record"; fields: Map<string, NPat> };

const WILD: NPat = { k: "wild" };

const NIL: Ctor = { id: "[]", arity: 0, show: () => "[]" };
const CONS: Ctor = { id: ":", arity: 2, show: ([h, t]) => `(${h} : ${t})` };
const LIST_CTORS = [NIL, CONS];

function paren(s: string): string {
  return s.includes(" ") && !s.startsWith("(") && !s.startsWith("{") && !s.startsWith("[") ? `(${s})` : s;
}

function ctorOf(name: string, arity: number): Ctor {
  return { id: name, arity, show: (args) => (args.length ? `${name} ${args.map(paren).join(" ")}` : name) };
}

function normalize(p: Pat): NPat {
  switch (p.k) {
    case "pvar":
    case "pwild":
      return WILD;
    case "plit": {
      const text = typeof p.value === "string" ? JSON.stringify(p.value) : String(p.value);
      return { k: "ctor", ctor: { id: `lit:${text}`, arity: 0, show: () => text }, all: null, args: [] };
    }
    case "punit":
      return { k: "ctor", ctor: { id: "()", arity: 0, show: () => "()" }, all: null, args: [] };
    case "pcon": {
      const ref = p.ref!;
      const all = ref.siblings.map((s) => ctorOf(s.name, s.arity));
      return { k: "ctor", ctor: all.find((c) => c.id === ref.name)!, all, args: p.args.map(normalize) };
    }
    case "plist": {
      let acc: NPat = { k: "ctor", ctor: NIL, all: LIST_CTORS, args: [] };
      for (let i = p.items.length - 1; i >= 0; i--) {
        acc = { k: "ctor", ctor: CONS, all: LIST_CTORS, args: [normalize(p.items[i]), acc] };
      }
      return acc;
    }
    case "pcons":
      return { k: "ctor", ctor: CONS, all: LIST_CTORS, args: [normalize(p.head), normalize(p.tail)] };
    case "ptuple": {
      const n = p.items.length;
      const ctor: Ctor = { id: `tuple${n}`, arity: n, show: (args) => `(${args.join(", ")})` };
      return { k: "ctor", ctor, all: [ctor], args: p.items.map(normalize) };
    }
    case "precord":
      return { k: "record", fields: new Map(p.fields.map((f) => [f.name, normalize(f.pat)])) };
  }
}

// rows がすべての値を覆っていれば null、そうでなければ覆っていない値の例を返す
export function checkExhaustive(rows: Pat[][], arity: number): string[] | null {
  const matrix = rows.map((r) => r.map(normalize));
  return useful(matrix, arity);
}

function useful(rows: NPat[][], n: number): string[] | null {
  if (n === 0) return rows.length === 0 ? [] : null;
  const heads = rows.map((r) => r[0]);

  // レコードは、その列に出てくるフィールドを並べた 1 つのコンストラクタとして扱う
  const recordFields = new Set<string>();
  for (const h of heads) if (h.k === "record") for (const f of h.fields.keys()) recordFields.add(f);
  if (heads.some((h) => h.k === "record")) {
    const names = [...recordFields].sort();
    const ctor: Ctor = {
      id: "record",
      arity: names.length,
      show: (args) => `{ ${names.map((nm, i) => `${nm} = ${args[i]}`).join(", ")} }`,
    };
    const converted = rows.map((r) => {
      const h = r[0];
      if (h.k !== "record") return r;
      const args = names.map((nm) => h.fields.get(nm) ?? WILD);
      return [{ k: "ctor", ctor, all: [ctor], args } as NPat, ...r.slice(1)];
    });
    return useful(converted, n);
  }

  const present = new Map<string, Ctor>();
  let all: Ctor[] | null = null;
  for (const h of heads) {
    if (h.k === "ctor") {
      present.set(h.ctor.id, h.ctor);
      all = h.all;
    }
  }

  if (all && all.every((c) => present.has(c.id))) {
    for (const c of all) {
      const w = useful(specialize(rows, c), c.arity + n - 1);
      if (w) {
        const args = w.slice(0, c.arity);
        return [c.show(args), ...w.slice(c.arity)];
      }
    }
    return null;
  }

  const def = rows.filter((r) => r[0].k === "wild").map((r) => r.slice(1));
  const w = useful(def, n - 1);
  if (!w) return null;
  if (all && present.size > 0) {
    const missing = all.find((c) => !present.has(c.id))!;
    return [missing.show(Array(missing.arity).fill("_")), ...w];
  }
  return ["_", ...w];
}

function specialize(rows: NPat[][], c: Ctor): NPat[][] {
  const out: NPat[][] = [];
  for (const r of rows) {
    const h = r[0];
    if (h.k === "wild") out.push([...Array(c.arity).fill(WILD), ...r.slice(1)]);
    else if (h.k === "ctor" && h.ctor.id === c.id) out.push([...h.args, ...r.slice(1)]);
  }
  return out;
}
