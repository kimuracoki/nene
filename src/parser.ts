// 構文解析。レイアウト（インデント）はトップレベルと where ブロックだけで使う

import { Lexer, isDigit, isUpper, isLower, type Token } from "./lexer.ts";
import {
  CompileError,
  type AliasDecl,
  type Binding,
  type Block,
  type DataDecl,
  type Equation,
  type ExportItem,
  type Expr,
  type FieldAssign,
  type ForeignDecl,
  type ImportDecl,
  type JsxAttr,
  type JsxChild,
  type JsxNode,
  type Module,
  type Pat,
  type Pos,
  type Rhs,
  type StyleBlock,
  type TypeExpr,
  type TypeSig,
} from "./syntax.ts";

interface Layout {
  col: number; // この列以下で行頭に来た字句は、宣言の終わりとみなす。-1 はレイアウトを見ない
  start: number; // 宣言の最初の字句の位置（これ自体は終わりとみなさない）
}

const BINOPS: Record<string, { prec: number; assoc: "left" | "right" | "none" }> = {
  ".": { prec: 9, assoc: "right" },
  "*": { prec: 7, assoc: "left" },
  "/": { prec: 7, assoc: "left" },
  "//": { prec: 7, assoc: "left" },
  "+": { prec: 6, assoc: "left" },
  "-": { prec: 6, assoc: "left" },
  "++": { prec: 5, assoc: "right" },
  ":": { prec: 5, assoc: "right" },
  "==": { prec: 4, assoc: "none" },
  "/=": { prec: 4, assoc: "none" },
  "<": { prec: 4, assoc: "none" },
  "<=": { prec: 4, assoc: "none" },
  ">": { prec: 4, assoc: "none" },
  ">=": { prec: 4, assoc: "none" },
  "&&": { prec: 3, assoc: "right" },
  "||": { prec: 2, assoc: "right" },
};

export function parseModule(src: string, file: string): Module {
  return new Parser(src, file).module();
}

export function parseTypeSource(src: string): TypeExpr {
  const p = new Parser(src, "<builtin>");
  const t = p.type();
  p.expectEof();
  return t;
}

class Parser {
  lexer: Lexer;
  offset = 0;
  private buffered: Token | null = null;
  private layouts: Layout[] = [];

  constructor(src: string, file: string) {
    this.lexer = new Lexer(src, file);
  }

  // ---- 字句の読み出し ----

  peekRaw(): Token {
    if (!this.buffered) this.buffered = this.lexer.scan(this.offset);
    return this.buffered;
  }

  peek(): Token {
    const t = this.peekRaw();
    const top = this.layouts[this.layouts.length - 1];
    if (top && top.col >= 0 && t.kind !== "eof" && t.firstOnLine && t.pos.col <= top.col && t.start > top.start) {
      return { ...t, kind: "eof", text: "" };
    }
    return t;
  }

  next(): Token {
    const t = this.peek();
    if (t.kind === "eof") throw this.errorAt(t, this.describeEnd(t));
    this.buffered = null;
    this.offset = t.end;
    return t;
  }

  seek(offset: number) {
    this.offset = offset;
    this.buffered = null;
  }

  describeEnd(t: Token): string {
    return t.start >= this.lexer.src.length ? "ファイルが途中で終わっています" : "インデントが足りません（式の途中で行が左に戻っています）";
  }

  errorAt(t: Token | Pos, message: string): CompileError {
    const pos = "pos" in t ? t.pos : t;
    return new CompileError(message, pos, this.lexer.file);
  }

  is(kind: Token["kind"], text?: string): boolean {
    const t = this.peek();
    return t.kind === kind && (text === undefined || t.text === text);
  }

  isOp(text: string): boolean {
    return this.is("op", text);
  }

  isPunct(text: string): boolean {
    return this.is("punct", text);
  }

  expect(kind: Token["kind"], text?: string, what?: string): Token {
    const t = this.peek();
    if (t.kind !== kind || (text !== undefined && t.text !== text)) {
      const want = what ?? (text ? `「${text}」` : kind);
      const got = t.kind === "eof" ? this.describeEnd(t) : `「${t.text}」がありました`;
      throw this.errorAt(t, `${want}が必要です。${got}`);
    }
    return this.next();
  }

  expectEof() {
    const t = this.peekRaw();
    if (t.kind !== "eof") throw this.errorAt(t, `余分な「${t.text}」があります`);
  }

  withLayout<T>(col: number, start: number, f: () => T): T {
    this.layouts.push({ col, start });
    try {
      return f();
    } finally {
      this.layouts.pop();
    }
  }

  // ---- モジュール ----

  module(): Module {
    const head = this.peekRaw();
    if (!(head.kind === "kw" && head.text === "module")) {
      throw this.errorAt(head, "ファイルは module 宣言で始めてください");
    }
    this.next();
    const nameTok = this.next();
    if (nameTok.kind !== "con" && nameTok.kind !== "qcon") throw this.errorAt(nameTok, "モジュール名が必要です");
    const name = nameTok.module ? `${nameTok.module}.${nameTok.text}` : nameTok.text;
    let exports: ExportItem[] | null = null;
    if (this.isPunct("(")) exports = this.itemList();
    this.expect("kw", "where");

    const mod: Module = {
      name,
      exports,
      imports: [],
      datas: [],
      aliases: [],
      foreigns: [],
      style: null,
      body: { bindings: [] },
      pos: head.pos,
    };
    const decls = this.block(1, true, mod);
    mod.body = decls;
    this.expectEof();
    return mod;
  }

  itemList(): ExportItem[] {
    this.expect("punct", "(");
    const items: ExportItem[] = [];
    if (!this.isPunct(")")) {
      for (;;) {
        const t = this.next();
        if (t.kind === "var") {
          items.push({ k: "value", name: t.text, pos: t.pos });
        } else if (t.kind === "con") {
          let all = false;
          if (this.isPunct("(")) {
            this.next();
            this.expect("op", "..", "「..」");
            this.expect("punct", ")");
            all = true;
          }
          items.push({ k: "type", name: t.text, all, pos: t.pos });
        } else {
          throw this.errorAt(t, "名前が必要です");
        }
        if (!this.isPunct(",")) break;
        this.next();
      }
    }
    this.expect("punct", ")");
    return items;
  }

  // col 列から始まる宣言の並びを読む
  block(col: number, top: boolean, mod: Module | null): Block {
    const sigs = new Map<string, TypeSig>();
    const bindings: Binding[] = [];
    let first = true;
    for (;;) {
      const t = this.peek();
      if (t.kind === "eof") break;
      if (!first && !t.firstOnLine) throw this.errorAt(t, "宣言は新しい行から書いてください");
      if (t.pos.col < col) break;
      if (t.pos.col > col) throw this.errorAt(t, "インデントがそろっていません");
      if (top && mod && this.isStyleStart(t)) {
        if (mod.style) throw this.errorAt(t, "style ブロックは 1 つのファイルに 1 つだけ書けます");
        mod.style = this.styleBlock(t);
        continue;
      }
      first = false;
      this.withLayout(col, t.start, () => this.decl(top, mod, sigs, bindings));
    }
    for (const [name, sig] of sigs) {
      const b = bindings.find((b) => b.name === name);
      if (!b) throw this.errorAt(sig.pos, `${name} の型注釈がありますが、定義がありません`);
      b.sig = sig;
    }
    return { bindings };
  }

  // 1 列目に style だけが書かれた行は、style ブロックの始まり
  isStyleStart(t: Token): boolean {
    if (!(t.kind === "var" && t.text === "style")) return false;
    const src = this.lexer.src;
    let i = t.end;
    while (i < src.length && (src[i] === " " || src[i] === "\t" || src[i] === "\r")) i++;
    return i >= src.length || src[i] === "\n";
  }

  // style の次の行から、1 列目に何かが書かれた行の手前までが CSS
  styleBlock(t: Token): StyleBlock {
    const src = this.lexer.src;
    let i = src.indexOf("\n", t.end);
    if (i < 0) i = src.length;
    const start = i + 1;
    let end = start;
    while (end < src.length) {
      const lineEnd = src.indexOf("\n", end);
      const line = src.slice(end, lineEnd < 0 ? src.length : lineEnd);
      if (line.length > 0 && !/^\s/.test(line)) break;
      end = lineEnd < 0 ? src.length : lineEnd + 1;
    }
    const raw = src.slice(Math.min(start, src.length), end);
    const lines = raw.split("\n");
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length));
    const css = lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join("\n").trimEnd();
    if (!css.trim()) throw this.errorAt(t, "style ブロックの中身がありません");
    this.seek(end);
    return { css, pos: this.lexer.posAt(Math.min(start, src.length)) };
  }

  decl(top: boolean, mod: Module | null, sigs: Map<string, TypeSig>, bindings: Binding[]) {
    const t = this.peek();
    if (t.kind === "kw") {
      if (!top || !mod) throw this.errorAt(t, `where の中に ${t.text} は書けません`);
      if (t.text === "import") {
        if (mod.datas.length || mod.aliases.length || mod.foreigns.length || bindings.length) {
          throw this.errorAt(t, "import はファイルの先頭にまとめて書いてください");
        }
        mod.imports.push(this.importDecl());
      } else if (t.text === "data") mod.datas.push(this.dataDecl());
      else if (t.text === "type") mod.aliases.push(this.aliasDecl());
      else if (t.text === "foreign") mod.foreigns.push(this.foreignDecl());
      else throw this.errorAt(t, `ここに ${t.text} は書けません`);
      this.endOfDecl();
      return;
    }
    if (t.kind !== "var") throw this.errorAt(t, `宣言が必要です。「${t.text}」がありました`);
    if (top && t.text === "class") throw this.errorAt(t, "型クラスは定義できません");
    // 型注釈か等式か
    const save = this.offset;
    this.next();
    if (this.isOp("::")) {
      this.seek(save);
      const sig = this.typeSig();
      if (sigs.has(sig.name)) throw this.errorAt(sig.pos, `${sig.name} の型注釈が 2 つあります`);
      sigs.set(sig.name, sig);
      this.endOfDecl();
      return;
    }
    this.seek(save);
    const name = this.next().text;
    const eq = this.equation(t.pos);
    const last = bindings[bindings.length - 1];
    if (last && last.name === name) {
      if (last.equations[0].params.length !== eq.params.length) {
        throw this.errorAt(eq.pos, `${name} の等式ごとに引数の数が違います`);
      }
      last.equations.push(eq);
    } else {
      if (bindings.some((b) => b.name === name)) {
        throw this.errorAt(t, `${name} はすでに定義されています（同じ関数の等式は続けて書いてください）`);
      }
      bindings.push({ name, equations: [eq], sig: null, pos: t.pos });
    }
    this.endOfDecl();
  }

  endOfDecl() {
    const t = this.peek();
    if (t.kind !== "eof") throw this.errorAt(t, `「${t.text}」は読めません`);
  }

  importDecl(): ImportDecl {
    const kw = this.expect("kw", "import");
    let qualified = false;
    if (this.is("kw", "qualified")) {
      this.next();
      qualified = true;
    }
    const m = this.next();
    if (m.kind !== "con" && m.kind !== "qcon") throw this.errorAt(m, "モジュール名が必要です");
    const module = m.module ? `${m.module}.${m.text}` : m.text;
    let alias: string | null = null;
    if (this.is("kw", "as")) {
      this.next();
      alias = this.expect("con", undefined, "別名").text;
    }
    let items: ExportItem[] | null = null;
    if (this.isPunct("(")) items = this.itemList();
    return { module, modulePos: m.pos, qualified, alias, items, pos: kw.pos };
  }

  dataDecl(): DataDecl {
    const kw = this.expect("kw", "data");
    const nameTok = this.expect("con", undefined, "型の名前");
    const name = nameTok.text;
    const params: string[] = [];
    while (this.is("var")) params.push(this.next().text);
    this.expect("op", "=");
    const ctors: DataDecl["ctors"] = [];
    for (;;) {
      const c = this.expect("con", undefined, "コンストラクタ");
      const args: TypeExpr[] = [];
      while (this.atypeStart()) args.push(this.atype());
      ctors.push({ name: c.text, args, pos: c.pos });
      if (!this.isOp("|")) break;
      this.next();
    }
    return { name, namePos: nameTok.pos, params, ctors, pos: kw.pos };
  }

  aliasDecl(): AliasDecl {
    const kw = this.expect("kw", "type");
    const nameTok = this.expect("con", undefined, "型の名前");
    const name = nameTok.text;
    const params: string[] = [];
    while (this.is("var")) params.push(this.next().text);
    this.expect("op", "=");
    const body = this.type();
    return { name, namePos: nameTok.pos, params, body, pos: kw.pos };
  }

  foreignDecl(): ForeignDecl {
    const kw = this.expect("kw", "foreign");
    this.expect("kw", "import");
    const sig = this.typeSig();
    this.expect("op", "=");
    const code = this.expect("string", undefined, "JavaScript のコード（文字列）");
    return { name: sig.name, sig, code: code.value as string, pos: kw.pos };
  }

  // ---- 型 ----

  typeSig(): TypeSig {
    const nameTok = this.expect("var");
    this.expect("op", "::");
    const constraints = this.tryConstraints();
    const type = this.type();
    return { name: nameTok.text, constraints, type, pos: nameTok.pos };
  }

  tryConstraints(): TypeSig["constraints"] {
    const save = this.offset;
    const result: TypeSig["constraints"] = [];
    const one = (): boolean => {
      if (!this.is("con")) return false;
      const cls = this.next().text;
      if (!this.is("var")) return false;
      result.push({ cls, tvar: this.next().text });
      return true;
    };
    let ok = false;
    if (this.isPunct("(")) {
      this.next();
      ok = one();
      while (ok && this.isPunct(",")) {
        this.next();
        ok = one();
      }
      ok = ok && this.isPunct(")");
      if (ok) this.next();
    } else {
      ok = one();
    }
    if (ok && this.isOp("=>")) {
      this.next();
      return result;
    }
    this.seek(save);
    return [];
  }

  type(): TypeExpr {
    const from = this.btype();
    if (this.isOp("->")) {
      this.next();
      const to = this.type();
      return { k: "tfun", from, to, pos: from.pos };
    }
    return from;
  }

  btype(): TypeExpr {
    const t = this.peek();
    if (t.kind === "con" || t.kind === "qcon") {
      this.next();
      const args: TypeExpr[] = [];
      while (this.atypeStart()) args.push(this.atype());
      return { k: "tcon", name: t.text, module: t.module, args, pos: t.pos };
    }
    return this.atype();
  }

  atypeStart(): boolean {
    const t = this.peek();
    return t.kind === "var" || t.kind === "con" || t.kind === "qcon" || (t.kind === "punct" && "([{".includes(t.text));
  }

  atype(): TypeExpr {
    const t = this.next();
    if (t.kind === "var") return { k: "tvar", name: t.text, pos: t.pos };
    if (t.kind === "con" || t.kind === "qcon") return { k: "tcon", name: t.text, module: t.module, args: [], pos: t.pos };
    if (t.kind === "punct" && t.text === "(") {
      if (this.isPunct(")")) {
        this.next();
        return { k: "tunit", pos: t.pos };
      }
      const first = this.type();
      if (this.isPunct(",")) {
        const items = [first];
        while (this.isPunct(",")) {
          this.next();
          items.push(this.type());
        }
        this.expect("punct", ")");
        return { k: "ttuple", items, pos: t.pos };
      }
      this.expect("punct", ")");
      return first;
    }
    if (t.kind === "punct" && t.text === "[") {
      const elem = this.type();
      this.expect("punct", "]");
      return { k: "tlist", elem, pos: t.pos };
    }
    if (t.kind === "punct" && t.text === "{") {
      const fields: Extract<TypeExpr, { k: "trecord" }>["fields"] = [];
      if (!this.isPunct("}")) {
        for (;;) {
          const f = this.expect("var", undefined, "フィールド名");
          this.expect("op", "::");
          const type = this.type();
          let def: Expr | null = null;
          if (this.isOp("=")) {
            this.next();
            def = this.expr();
          }
          if (fields.some((x) => x.name === f.text)) throw this.errorAt(f, `フィールド ${f.text} が 2 つあります`);
          fields.push({ name: f.text, type, default: def, pos: f.pos });
          if (!this.isPunct(",")) break;
          this.next();
        }
      }
      this.expect("punct", "}");
      return { k: "trecord", fields, pos: t.pos };
    }
    throw this.errorAt(t, `型が必要です。「${t.text}」がありました`);
  }

  // ---- 等式 ----

  equation(pos: Pos): Equation {
    const params: Pat[] = [];
    while (!this.isOp("=") && !this.isOp("|")) {
      const t = this.peek();
      if (t.kind === "eof") throw this.errorAt(t, "「=」が必要です");
      params.push(this.apat());
    }
    const rhs = this.rhs();
    let where: Block = { bindings: [] };
    if (this.is("kw", "where")) {
      const w = this.next();
      const first = this.peek();
      if (first.kind === "eof") throw this.errorAt(w, "where の中身がありません");
      where = this.withLayout(-1, 0, () => this.block(first.pos.col, false, null));
      // where ブロックの後は、元の宣言のレイアウトに戻る
    }
    return { params, rhs, where, pos };
  }

  rhs(): Rhs {
    if (this.isOp("=")) {
      this.next();
      return { k: "plain", body: this.expr() };
    }
    const guards: Extract<Rhs, { k: "guards" }>["guards"] = [];
    while (this.isOp("|")) {
      const bar = this.next();
      const cond = this.expr();
      this.expect("op", "=");
      const body = this.expr();
      guards.push({ cond, body, pos: bar.pos });
    }
    return { k: "guards", guards };
  }

  // ---- パターン ----

  pat(): Pat {
    const t = this.peek();
    let left: Pat;
    if (t.kind === "con" || t.kind === "qcon") {
      this.next();
      const args: Pat[] = [];
      while (this.apatStart()) args.push(this.apat());
      left = { k: "pcon", name: t.text, module: t.module, args, pos: t.pos };
    } else {
      left = this.apat();
    }
    if (this.isOp(":")) {
      this.next();
      const tail = this.pat();
      return { k: "pcons", head: left, tail, pos: left.pos };
    }
    return left;
  }

  apatStart(): boolean {
    const t = this.peek();
    return (
      t.kind === "var" || t.kind === "con" || t.kind === "qcon" || t.kind === "int" || t.kind === "float" ||
      t.kind === "string" || (t.kind === "punct" && "([{".includes(t.text))
    );
  }

  apat(): Pat {
    const t = this.next();
    switch (t.kind) {
      case "var":
        return t.text === "_" ? { k: "pwild", pos: t.pos } : { k: "pvar", name: t.text, pos: t.pos };
      case "con":
      case "qcon":
        return { k: "pcon", name: t.text, module: t.module, args: [], pos: t.pos };
      case "int":
        return { k: "plit", value: t.value as number, type: "Int", pos: t.pos };
      case "float":
        return { k: "plit", value: t.value as number, type: "Float", pos: t.pos };
      case "string":
        return { k: "plit", value: t.value as string, type: "String", pos: t.pos };
      case "op":
        if (t.text === "-" && (this.is("int") || this.is("float"))) {
          const n = this.next();
          return { k: "plit", value: -(n.value as number), type: n.kind === "int" ? "Int" : "Float", pos: t.pos };
        }
        break;
      case "punct":
        if (t.text === "(") {
          if (this.isPunct(")")) {
            this.next();
            return { k: "punit", pos: t.pos };
          }
          const first = this.pat();
          if (this.isPunct(",")) {
            const items = [first];
            while (this.isPunct(",")) {
              this.next();
              items.push(this.pat());
            }
            this.expect("punct", ")");
            return { k: "ptuple", items, pos: t.pos };
          }
          this.expect("punct", ")");
          return first;
        }
        if (t.text === "[") {
          const items: Pat[] = [];
          if (!this.isPunct("]")) {
            items.push(this.pat());
            while (this.isPunct(",")) {
              this.next();
              items.push(this.pat());
            }
          }
          this.expect("punct", "]");
          return { k: "plist", items, pos: t.pos };
        }
        if (t.text === "{") {
          const fields: { name: string; pat: Pat; pos: Pos }[] = [];
          for (;;) {
            const f = this.expect("var", undefined, "フィールド名");
            if (this.isOp("=")) {
              this.next();
              fields.push({ name: f.text, pat: this.pat(), pos: f.pos });
            } else {
              fields.push({ name: f.text, pat: { k: "pvar", name: f.text, pos: f.pos }, pos: f.pos });
            }
            if (!this.isPunct(",")) break;
            this.next();
          }
          this.expect("punct", "}");
          return { k: "precord", fields, pos: t.pos };
        }
        break;
    }
    throw this.errorAt(t, `パターンが必要です。「${t.text}」がありました`);
  }

  // ---- 式 ----

  expr(minPrec = 0): Expr {
    let left = this.operand();
    for (;;) {
      const t = this.peek();
      if (t.kind !== "op") break;
      const info = BINOPS[t.text];
      if (!info || info.prec < minPrec) break;
      this.next();
      const nextMin = info.assoc === "right" ? info.prec : info.prec + 1;
      const right = this.expr(nextMin);
      if (info.assoc === "none") {
        const after = this.peek();
        if (after.kind === "op" && BINOPS[after.text]?.prec === info.prec) {
          throw this.errorAt(after, `${t.text} と ${after.text} は括弧なしで続けて書けません`);
        }
      }
      left = { k: "binop", op: t.text, left, right, pos: t.pos };
    }
    return left;
  }

  operand(): Expr {
    const t = this.peek();
    if (t.kind === "op" && t.text === "-") {
      this.next();
      return { k: "neg", expr: this.expr(7), pos: t.pos };
    }
    if (t.kind === "op" && (t.text === "<" || t.text === "<>")) {
      return this.jsxExpr();
    }
    return this.application();
  }

  application(): Expr {
    const fn = this.atom();
    const args: Expr[] = [];
    while (this.atomStart()) args.push(this.atom());
    if (args.length === 0) return fn;
    return { k: "app", fn, args, pos: fn.pos };
  }

  atomStart(): boolean {
    const t = this.peek();
    switch (t.kind) {
      case "var":
      case "qvar":
      case "con":
      case "qcon":
      case "int":
      case "float":
      case "string":
        return true;
      case "punct":
        return "([{".includes(t.text);
      default:
        return false;
    }
  }

  atom(): Expr {
    let e = this.atomBase();
    while (this.is("field")) {
      const f = this.next();
      e = { k: "field", target: e, field: f.text, pos: f.pos };
    }
    return e;
  }

  atomBase(): Expr {
    const t = this.next();
    switch (t.kind) {
      case "var":
        if (t.text === "_") return { k: "hole", pos: t.pos };
        return { k: "var", name: t.text, module: null, pos: t.pos };
      case "qvar":
        return { k: "var", name: t.text, module: t.module, pos: t.pos };
      case "con":
      case "qcon":
        return { k: "con", name: t.text, module: t.module, pos: t.pos };
      case "int":
        return { k: "lit", value: t.value as number, type: "Int", pos: t.pos };
      case "float":
        return { k: "lit", value: t.value as number, type: "Float", pos: t.pos };
      case "string":
        return { k: "lit", value: t.value as string, type: "String", pos: t.pos };
      case "punct":
        if (t.text === "(") return this.parenExpr(t);
        if (t.text === "[") {
          const items: Expr[] = [];
          if (!this.isPunct("]")) {
            items.push(this.expr());
            while (this.isPunct(",")) {
              this.next();
              items.push(this.expr());
            }
          }
          this.expect("punct", "]");
          return { k: "list", items, pos: t.pos };
        }
        if (t.text === "{") return this.recordExpr(t);
        break;
      case "kw":
        throw this.errorAt(t, `ここに ${t.text} は書けません`);
      case "eof":
        throw this.errorAt(t, this.describeEnd(t));
    }
    throw this.errorAt(t, `式が必要です。「${t.text}」がありました`);
  }

  parenExpr(open: Token): Expr {
    const pos = open.pos;
    if (this.isPunct(")")) {
      this.next();
      return { k: "unit", pos };
    }
    const t = this.peek();
    // (.field)
    if (t.kind === "field") {
      this.next();
      this.expect("punct", ")");
      return { k: "getter", field: t.text, pos };
    }
    if (t.kind === "op" && BINOPS[t.text] && !this.startsJsx(t)) {
      this.next();
      if (this.isPunct(")")) {
        this.next();
        return { k: "section", op: t.text, left: null, right: null, pos };
      }
      const operand = this.expr();
      this.expect("punct", ")");
      if (t.text === "-") return { k: "neg", expr: operand, pos };
      return { k: "section", op: t.text, left: null, right: operand, pos };
    }
    const first = this.expr();
    if (this.isPunct(",")) {
      const items = [first];
      while (this.isPunct(",")) {
        this.next();
        items.push(this.expr());
      }
      this.expect("punct", ")");
      return { k: "tuple", items, pos };
    }
    const after = this.peek();
    if (after.kind === "op" && BINOPS[after.text]) {
      this.next();
      this.expect("punct", ")");
      return { k: "section", op: after.text, left: first, right: null, pos };
    }
    this.expect("punct", ")");
    return first;
  }

  recordExpr(open: Token): Expr {
    const pos = open.pos;
    if (this.isPunct("}")) {
      this.next();
      return { k: "record", fields: [], pos };
    }
    // { target | f = e } か判定する
    const save = this.offset;
    let target: Expr | null = null;
    if (this.is("var")) {
      const v = this.next();
      let e: Expr = { k: "var", name: v.text, module: null, pos: v.pos };
      while (this.is("field")) {
        const f = this.next();
        e = { k: "field", target: e, field: f.text, pos: f.pos };
      }
      if (this.isOp("|")) {
        this.next();
        target = e;
      } else {
        this.seek(save);
      }
    }
    const fields = this.fieldAssigns(target !== null);
    this.expect("punct", "}");
    if (target) return { k: "update", target, fields, pos };
    return { k: "record", fields, pos };
  }

  fieldAssigns(isUpdate: boolean): FieldAssign[] {
    const fields: FieldAssign[] = [];
    for (;;) {
      const f = this.expect("var", undefined, "フィールド名");
      let value: Expr;
      if (this.isOp("=")) {
        this.next();
        value = this.expr();
      } else {
        if (isUpdate) throw this.errorAt(f, `${f.text} = ... の形で書いてください`);
        value = { k: "var", name: f.text, module: null, pos: f.pos };
      }
      if (fields.some((x) => x.name === f.text)) throw this.errorAt(f, `フィールド ${f.text} が 2 つあります`);
      fields.push({ name: f.text, value, pos: f.pos });
      if (!this.isPunct(",")) break;
      this.next();
    }
    return fields;
  }

  // ---- JSX（文字単位で読む） ----

  // ( の直後の < が JSX の始まりか
  startsJsx(t: Token): boolean {
    if (t.text === "<>") return true;
    return t.text === "<" && /[A-Za-z]/.test(this.lexer.src[t.start + 1] ?? "");
  }

  jsxExpr(): Expr {
    const t = this.peek();
    const { node, end } = this.jsxNode(t.start);
    this.seek(end);
    return { k: "jsx", node, pos: t.pos };
  }

  jsxNode(start: number): { node: JsxNode; end: number } {
    const s = this.lexer.src;
    const pos = this.lexer.posAt(start);
    let i = start + 1;
    if (s[i] === ">") {
      const { children, end } = this.jsxChildren(i + 1, null, start);
      return { node: { k: "fragment", children, pos }, end };
    }
    const nameEnd = this.readTagName(i);
    if (nameEnd === i) throw this.lexer.error("タグ名が必要です", i);
    const tag = s.slice(i, nameEnd);
    i = nameEnd;
    const attrs: JsxAttr[] = [];
    for (;;) {
      i = this.skipJsxSpace(i);
      if (s[i] === "/" && s[i + 1] === ">") {
        return { node: { k: "element", tag, attrs, children: null, pos }, end: i + 2 };
      }
      if (s[i] === ">") {
        const { children, end, closeAt } = this.jsxChildren(i + 1, tag, start);
        return { node: { k: "element", tag, attrs, children, pos, closePos: this.lexer.posAt(closeAt) }, end };
      }
      if (i >= s.length) throw this.lexer.error(`<${tag}> が閉じられていません`, start);
      if (!/[A-Za-z]/.test(s[i])) throw this.lexer.error(`属性名が必要です。「${s[i]}」がありました`, i);
      const attrStart = i;
      while (/[A-Za-z0-9-]/.test(s[i] ?? "")) i++;
      const name = s.slice(attrStart, i);
      const attrPos = this.lexer.posAt(attrStart);
      if (attrs.some((a) => a.name === name)) throw this.lexer.error(`属性 ${name} が 2 つあります`, attrStart);
      i = this.skipJsxSpace(i);
      if (s[i] === "=") {
        i = this.skipJsxSpace(i + 1);
        if (s[i] === '"') {
          const { value, end } = this.lexer.readString(i);
          attrs.push({ name, value: { k: "lit", value, type: "String", pos: this.lexer.posAt(i) }, pos: attrPos });
          i = end;
        } else if (s[i] === "{") {
          const { expr, end } = this.embedded(i);
          attrs.push({ name, value: expr, pos: attrPos });
          i = end;
        } else {
          throw this.lexer.error(`属性 ${name} の値は "..." か {...} で書いてください`, i);
        }
      } else {
        attrs.push({ name, value: { k: "con", name: "True", module: null, pos: attrPos }, pos: attrPos });
      }
    }
  }

  readTagName(i: number): number {
    const s = this.lexer.src;
    if (!/[A-Za-z]/.test(s[i] ?? "")) return i;
    while (/[A-Za-z0-9]/.test(s[i] ?? "")) i++;
    return i;
  }

  skipJsxSpace(i: number): number {
    const s = this.lexer.src;
    while (i < s.length && /\s/.test(s[i])) i++;
    return i;
  }

  jsxChildren(start: number, tag: string | null, openAt: number): { children: JsxChild[]; end: number; closeAt: number } {
    const s = this.lexer.src;
    const children: JsxChild[] = [];
    let i = start;
    let textStart = i;
    const flushText = (end: number) => {
      const text = normalizeJsxText(s.slice(textStart, end));
      if (text) children.push({ k: "text", text, pos: this.lexer.posAt(textStart) });
    };
    for (;;) {
      if (i >= s.length) throw this.lexer.error(tag ? `<${tag}> が閉じられていません` : "<> が閉じられていません", openAt);
      const c = s[i];
      if (c === "{") {
        flushText(i);
        const { expr, end } = this.embedded(i);
        children.push({ k: "expr", expr, pos: expr.pos });
        i = end;
        textStart = i;
      } else if (c === "<" && s[i + 1] === "/") {
        flushText(i);
        const nameEnd = this.readTagName(i + 2);
        const closing = s.slice(i + 2, nameEnd);
        if ((tag ?? "") !== closing) {
          const want = tag ? `</${tag}>` : "</>";
          throw this.lexer.error(`${want} が必要です。</${closing}> がありました`, i);
        }
        const j = this.skipJsxSpace(nameEnd);
        if (s[j] !== ">") throw this.lexer.error("「>」が必要です", j);
        return { children, end: j + 1, closeAt: i };
      } else if (c === "<") {
        flushText(i);
        const { node, end } = this.jsxNode(i);
        children.push({ k: "node", node, pos: node.pos });
        i = end;
        textStart = i;
      } else if (c === "}" || c === ">") {
        throw this.lexer.error(`テキストに「${c}」を書くときは {"${c}"} と書いてください`, i);
      } else {
        i++;
      }
    }
  }

  // JSX の中の {式}。中ではレイアウトを見ない
  embedded(open: number): { expr: Expr; end: number } {
    this.seek(open + 1);
    const expr = this.withLayout(-1, 0, () => this.expr());
    const close = this.peek();
    if (!(close.kind === "punct" && close.text === "}")) {
      throw this.errorAt(close, `「}」が必要です。「${close.text}」がありました`);
    }
    checkJsxExpr(expr, this.lexer.file);
    return { expr, end: close.end };
  }
}

// React と同じ規則で空白を整える
export function normalizeJsxText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  lines.forEach((line, idx) => {
    let l = line.replace(/\t/g, " ");
    if (idx > 0) l = l.trimStart();
    if (idx < lines.length - 1) l = l.trimEnd();
    if (l) out.push(l);
  });
  return out.join(" ").replace(/ +/g, " ");
}

// JSX の {} に書けるのは、名前・リテラル・フィールド・1 段の関数適用だけ
function checkJsxExpr(e: Expr, file: string) {
  const simple = (x: Expr): boolean => {
    switch (x.k) {
      case "var":
      case "con":
      case "lit":
      case "hole":
        return true;
      case "neg":
        return x.expr.k === "lit";
      case "field":
        return simple(x.target) && x.target.k !== "lit";
      default:
        return false;
    }
  };
  const ok = simple(e) || (e.k === "app" && (e.fn.k === "var" || e.fn.k === "con") && e.args.every(simple));
  if (!ok) {
    throw new CompileError(
      "JSX の {} には、名前・リテラル・フィールド・1 段の関数適用だけを書けます。where に名前をつけて書いてください",
      e.pos,
      file,
    );
  }
}

export { isDigit, isUpper, isLower };
