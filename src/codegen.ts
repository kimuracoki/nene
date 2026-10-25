// 型検査済みの構文木から JavaScript を出力する
//
// 値の表現:
//   Int / Float / String … JS の数値・文字列
//   Bool … true / false、() … null
//   コンストラクタ … { $: "Just", a: [x] }（引数なしは { $: "Nothing" }）
//   リスト・タプル … 配列、レコード … オブジェクト
//   引数なしの束縛 … 最初に使われたときに一度だけ計算するサンク

import type { CheckResult } from "./checker.ts";
import { fieldKey, jsName } from "./checker.ts";
import type { Binding, CtorRef, Equation, Expr, JsxChild, JsxNode, Module, Pat } from "./syntax.ts";

export function generateModule(mod: Module, checked: CheckResult): string {
  const g = new Gen();
  const lines: string[] = [];
  for (const d of checked.defaults) {
    const fields = d.fields.map((f) => `${fieldKey(f.name)}: ${g.expr(f.expr)}`).join(", ");
    lines.push(`$rt.defaults[${JSON.stringify(d.key)}] = { ${fields} };`);
  }
  const exported: string[] = [];
  for (const f of mod.foreigns) {
    const js = checked.iface.values.get(f.name)?.ref.js ?? f.name;
    lines.push(`const ${js} = (${f.code});`);
    exported.push(js);
  }
  for (const b of mod.body.bindings) {
    lines.push(g.binding(b));
    exported.push(b.js!);
  }
  lines.push(`return { ${exported.join(", ")} };`);
  return `const ${checked.iface.js} = (() => {\n${indent(lines.join("\n\n"))}\n})();`;
}

function indent(s: string, n = 1): string {
  const pad = "  ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

class Gen {
  binding(b: Binding): string {
    const arity = b.equations[0].params.length;
    const params = Array.from({ length: arity }, (_, i) => `$a${i}`);
    const body = this.equations(b, params);
    if (arity === 0) return `const ${b.js} = $rt.lazy(() => {\n${indent(body)}\n});`;
    const [first, ...rest] = params;
    const head = rest.length ? `return ${rest.map((p) => `(${p}) => `).join("")}{\n${indent(body)}\n};` : body;
    return `function ${b.js}(${first}) {\n${indent(head)}\n}`;
  }

  equations(b: Binding, params: string[]): string {
    const out: string[] = [];
    for (const eq of b.equations) {
      const { code, total } = this.equation(eq, params);
      out.push(code);
      if (total) return out.join("\n"); // 以降の等式には到達しない
    }
    out.push(`throw $rt.fail(${JSON.stringify(b.name)});`);
    return out.join("\n");
  }

  // total は、この等式がどんな引数にも必ず値を返すか
  equation(eq: Equation, params: string[]): { code: string; total: boolean } {
    const tests: string[] = [];
    const binds: string[] = [];
    eq.params.forEach((p, i) => this.pattern(p, params[i], tests, binds));
    const body: string[] = [...binds];
    let returns = eq.rhs.k === "plain";
    for (const w of eq.where.bindings) body.push(this.binding(w));
    if (eq.rhs.k === "plain") {
      body.push(`return ${this.expr(eq.rhs.body)};`);
    } else {
      for (const g of eq.rhs.guards) {
        const c = g.cond;
        const always = (c.k === "var" && c.name === "otherwise" && !c.module) || (c.k === "con" && c.name === "True");
        if (always) {
          body.push(`return ${this.expr(g.body)};`);
          returns = true;
          break;
        }
        body.push(`if (${this.expr(c)}) return ${this.expr(g.body)};`);
      }
    }
    const inner = body.join("\n");
    if (tests.length === 0) {
      if (returns) return { code: inner, total: true };
      return { code: `{\n${indent(inner)}\n}`, total: false };
    }
    return { code: `if (${tests.join(" && ")}) {\n${indent(inner)}\n}`, total: false };
  }

  pattern(p: Pat, path: string, tests: string[], binds: string[]) {
    switch (p.k) {
      case "pvar":
        binds.push(`const ${jsName(p.name)} = ${path};`);
        return;
      case "pwild":
      case "punit":
        return;
      case "plit":
        tests.push(`${path} === ${JSON.stringify(p.value)}`);
        return;
      case "pcon": {
        const ref = p.ref!;
        if (ref.typeName === "Bool") {
          tests.push(ref.name === "True" ? `${path} === true` : `${path} === false`);
          return;
        }
        if (ref.siblings.length > 1) tests.push(`${path}.$ === ${JSON.stringify(ref.name)}`);
        p.args.forEach((a, i) => this.pattern(a, `${path}.a[${i}]`, tests, binds));
        return;
      }
      case "plist":
        tests.push(`${path}.length === ${p.items.length}`);
        p.items.forEach((a, i) => this.pattern(a, `${path}[${i}]`, tests, binds));
        return;
      case "pcons":
        tests.push(`${path}.length > 0`);
        this.pattern(p.head, `${path}[0]`, tests, binds);
        this.pattern(p.tail, `${path}.slice(1)`, tests, binds);
        return;
      case "ptuple":
        p.items.forEach((a, i) => this.pattern(a, `${path}[${i}]`, tests, binds));
        return;
      case "precord":
        for (const f of p.fields) this.pattern(f.pat, `${path}.${fieldKey(f.name)}`, tests, binds);
        return;
    }
  }

  expr(e: Expr): string {
    switch (e.k) {
      case "var": {
        const ref = e.ref!;
        return ref.thunk ? `${ref.js}()` : ref.js;
      }
      case "con":
        return ctorValue(e.ref!, []);
      case "lit":
        return typeof e.value === "number" && e.value < 0 ? `(${e.value})` : JSON.stringify(e.value);
      case "app":
        return this.app(e);
      case "binop":
        return binop(e.op, this.expr(e.left), this.expr(e.right));
      case "neg":
        return `(-${this.expr(e.expr)})`;
      case "section": {
        if (e.left) return `(($l) => ($x) => ${binop(e.op, "$l", "$x")})(${this.expr(e.left)})`;
        if (e.right) return `(($r) => ($x) => ${binop(e.op, "$x", "$r")})(${this.expr(e.right)})`;
        return `(($x) => ($y) => ${binop(e.op, "$x", "$y")})`;
      }
      case "getter":
        return `(($r) => $r.${fieldKey(e.field)})`;
      case "field":
        return `${this.expr(e.target)}.${fieldKey(e.field)}`;
      case "list":
      case "tuple":
        return `[${e.items.map((i) => this.expr(i)).join(", ")}]`;
      case "unit":
        return "null";
      case "record":
        return this.object(e.fields.map((f) => [f.name, this.expr(f.value)]), null);
      case "update":
        return this.object(e.fields.map((f) => [f.name, this.expr(f.value)]), this.expr(e.target));
      case "jsx":
        return this.jsx(e.node);
    }
  }

  object(fields: [string, string][], spread: string | null): string {
    const parts = fields.map(([k, v]) => `${fieldKey(k)}: ${v}`);
    if (spread) parts.unshift(`...${spread}`);
    return parts.length ? `{ ${parts.join(", ")} }` : "{}";
  }

  app(e: Extract<Expr, { k: "app" }>): string {
    if (e.named) {
      const rec = e.args[0] as Extract<Expr, { k: "record" }>;
      return this.object(rec.fields.map((f) => [f.name, this.expr(f.value)]), e.named.defaultsJs);
    }
    const args = e.args.map((a) => this.expr(a));
    if (e.fn.k === "con" && e.fn.ref && args.length === e.fn.ref.arity) {
      return ctorValue(e.fn.ref, args);
    }
    const fn = this.expr(e.fn);
    const callee = /^[\w$.]+$/.test(fn) ? fn : `(${fn})`;
    return `${callee}${args.map((a) => `(${a})`).join("")}`;
  }

  jsx(node: JsxNode): string {
    const children = (cs: JsxChild[]) => `[${cs.map((c) => this.child(c)).join(", ")}]`;
    if (node.k === "fragment") return `$rt.frag(${children(node.children)})`;
    const res = node.res!;
    if (res.kind === "html") {
      const attrs = this.object(node.attrs.map((a) => [a.name, this.expr(a.value)]), null);
      return `$rt.h(${JSON.stringify(node.tag)}, ${attrs}, ${children(node.children ?? [])})`;
    }
    const props = this.object(node.attrs.map((a) => [a.name, this.expr(a.value)]), res.defaultsJs);
    const call = `${res.js}(${props})`;
    return res.children ? `${call}(${children(node.children ?? [])})` : call;
  }

  child(c: JsxChild): string {
    switch (c.k) {
      case "text":
        return JSON.stringify(c.text);
      case "expr":
        return this.expr(c.expr);
      case "node":
        return this.jsx(c.node);
    }
  }
}

function ctorValue(ref: CtorRef, args: string[]): string {
  if (ref.typeName === "Bool") return ref.name === "True" ? "true" : "false";
  const tag = JSON.stringify(ref.name);
  if (ref.arity === 0) return `{ $: ${tag} }`;
  if (args.length === ref.arity) return `{ $: ${tag}, a: [${args.join(", ")}] }`;
  const ps = Array.from({ length: ref.arity }, (_, i) => `$c${i}`);
  return `(${ps.map((p) => `(${p}) => `).join("")}({ $: ${tag}, a: [${ps.join(", ")}] }))`;
}

function binop(op: string, l: string, r: string): string {
  switch (op) {
    case "+":
    case "-":
    case "*":
    case "/":
    case "<":
    case "<=":
    case ">":
    case ">=":
    case "&&":
    case "||":
      return `(${l} ${op} ${r})`;
    case "//":
      return `$rt.idiv(${l}, ${r})`;
    case "++":
      return `$rt.append(${l}, ${r})`;
    case ":":
      return `[${l}, ...${r}]`;
    case "==":
      return `$rt.eq(${l}, ${r})`;
    case "/=":
      return `!$rt.eq(${l}, ${r})`;
    case ".":
      return `$rt.compose(${l}, ${r})`;
  }
  throw new Error(`unknown operator ${op}`);
}
