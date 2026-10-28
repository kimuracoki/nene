// 名前解決と型検査。コード生成に必要な情報を構文木に書き込む

import {
  CompileError,
  type AliasDecl,
  type Binding,
  type Block,
  type Equation,
  type Expr,
  type JsxChild,
  type JsxNode,
  type Module,
  type Pat,
  type Pos,
  type TypeExpr,
  type TypeSig,
  type ValueRef,
  type CtorRef,
} from "./syntax.ts";
import {
  TypeError_,
  con,
  flattenRecord,
  freshVar,
  fun,
  funN,
  generalize,
  instantiate,
  instantiateWith,
  mono,
  prune,
  show,
  showPair,
  tBool,
  tFloat,
  tHtml,
  tInt,
  tList,
  tString,
  tClass,
  tTuple,
  tUnit,
  unify,
  FieldDefs,
  type AliasTag,
  type Scheme,
  type TRec,
  type Type,
  type TVar,
} from "./types.ts";
import { checkExhaustive } from "./exhaust.ts";
import { scopeStyle, varName, type ScopedStyle } from "./css.ts";

// ---- モジュールの外から見える情報 ----

export interface ValueInfo {
  scheme: Scheme;
  ref: ValueRef;
  def?: Location; // 定義の場所（エディタの「定義へ移動」用）
  param?: boolean; // パターンで束縛した引数
}

export interface Location {
  file: string;
  pos: Pos;
}

// エディタの色分け用。名前の種類
export type SemType = "namespace" | "type" | "class" | "enumMember" | "function" | "variable" | "parameter" | "property" | "macro";

export interface SemToken {
  pos: Pos;
  length: number;
  type: SemType | (() => SemType);
}

// エディタの補完用。タグとして使える部品
export interface TagCandidate {
  name: string;
  detail: string;
  fields: { name: string; required: boolean; type: string }[];
  children: boolean;
}

export interface CompletionInfo {
  values: { name: string; detail: string }[]; // 修飾なしで使える名前
  quals: Map<string, { name: string; detail: string }[]>; // List. などの後に使える名前
  tags: TagCandidate[];
}

// エディタのホバー表示用。名前が出てくる場所と、その型
export interface HoverInfo {
  pos: Pos;
  length: number;
  name: string;
  type: () => string;
  typeOf?: () => Type;
  label?: () => string; // 「名前 :: 型」の代わりに出す説明（型やモジュールの名前など）
  def?: Location | (() => Location | undefined); // 型が決まってから分かるものは関数にする
}

export interface CtorInfo {
  ref: CtorRef;
  scheme: Scheme; // 引数 -> ... -> 型
  def?: Location;
}

export interface TypeInfo {
  name: string; // 一意な名前
  display: string;
  arity: number;
  kind: "data" | "alias" | "opaque";
  ctors: string[];
  expand?: (args: Type[]) => Type; // 型の別名を展開する
  defaults?: Set<string>;
  defaultsKey?: string;
  def?: Location;
  params?: string[]; // 宣言での型変数の名前（ホバー用）
}

export interface ModuleIface {
  name: string;
  file: string;
  pos: Pos; // module 宣言の場所
  js: string;
  values: Map<string, ValueInfo>;
  ctors: Map<string, CtorInfo>;
  types: Map<string, TypeInfo>;
}

// 依存される順に並べる（App は Cmd と Sub を使う）
export const STD_QUALIFIED = [
  "Cmd", "Sub", "List", "Maybe", "Result", "String", "Dict", "Json", "Http", "Random", "Time", "Window", "Keyboard", "Dom", "Nav", "Storage", "Env", "App", "Test",
];
export const RESERVED_MODULES = ["Prelude", "Layout", ...STD_QUALIFIED];

export const HTML_ELEMENTS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "strong", "em", "small", "mark", "code", "pre", "blockquote",
  "abbr", "time", "sub", "sup", "br", "hr", "a", "ul", "ol", "li", "dl", "dt", "dd", "div", "section", "header",
  "footer", "main", "nav", "article", "aside", "address", "figure", "figcaption", "img", "picture", "source",
  "video", "audio", "button", "input", "label", "form", "fieldset", "legend", "textarea", "select", "option",
  "optgroup", "progress", "meter", "output", "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr",
  "th", "td", "details", "summary", "dialog",
]);

const STRING_ATTRS = [
  "key", "id", "title", "role", "lang", "dir", "src", "srcset", "sizes", "alt", "href", "target", "rel", "type",
  "value", "name", "placeholder", "for", "form", "list", "min", "max", "step", "pattern", "accept", "autocomplete",
  "width", "height", "loading", "poster", "datetime", "headers", "scope", "popovertarget", "popovertargetaction",
];
const INT_ATTRS = ["tabindex", "rows", "cols", "colspan", "rowspan", "maxlength", "minlength", "span", "start"];
const BOOL_ATTRS = [
  "disabled", "checked", "selected", "readonly", "required", "multiple", "hidden", "autofocus", "open", "controls",
  "autoplay", "loop", "muted", "playsinline", "reversed", "novalidate", "popover",
];
const MSG_EVENTS = ["onClick", "onDoubleClick", "onSubmit", "onFocus", "onBlur", "onMouseEnter", "onMouseLeave"];
const STRING_EVENTS = ["onInput", "onChange"];
const BOOL_EVENTS = ["onCheck"];

// 型ごとの属性（リファレンスの html.md を作るのに使う）
export const HTML_ATTR_GROUPS = [
  { type: "Class", names: ["class"] },
  { type: "{ 名前 :: String, … }", names: ["vars"] },
  { type: "String", names: STRING_ATTRS },
  { type: "Int", names: INT_ATTRS },
  { type: "Bool", names: BOOL_ATTRS },
  { type: "msg", names: MSG_EVENTS },
  { type: "String -> msg", names: STRING_EVENTS },
  { type: "Bool -> msg", names: BOOL_EVENTS },
];

// エディタの補完用（aria-* と data-* は自由に書ける）
export const HTML_ATTRS = [
  "class", "vars", ...STRING_ATTRS, ...INT_ATTRS, ...BOOL_ATTRS, ...MSG_EVENTS, ...STRING_EVENTS, ...BOOL_EVENTS,
  "aria-label", "data-",
];

function htmlAttrType(name: string, msg: Type): Type | null {
  if (name === "class") return tClass;
  if (STRING_ATTRS.includes(name) || /^(aria|data)-[a-z][a-z0-9-]*$/.test(name)) return tString;
  if (INT_ATTRS.includes(name)) return tInt;
  if (BOOL_ATTRS.includes(name)) return tBool;
  if (MSG_EVENTS.includes(name)) return msg;
  if (STRING_EVENTS.includes(name)) return fun(tString, msg);
  if (BOOL_EVENTS.includes(name)) return fun(tBool, msg);
  return null;
}

const JS_RESERVED = new Set(
  (
    "break case catch class const continue debugger default delete do else enum export extends false finally for " +
    "function if import in instanceof new null return super switch this throw true try typeof var void while with " +
    "yield let static implements interface package private protected public await arguments eval undefined NaN Infinity"
  ).split(" "),
);

export function jsName(name: string): string {
  const n = name.replace(/'/g, "$q");
  return JS_RESERVED.has(n) ? `${n}$` : n;
}

export function fieldKey(name: string): string {
  return name.replace(/'/g, "$q");
}

export function moduleJs(name: string): string {
  return `$M_${name.replace(/\./g, "_")}`;
}

export function uniqueTypeName(module: string, name: string): string {
  return module === "Prelude" ? name : `${module}.${name}`;
}

const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1);

// data 型の名前（一意な名前）から、そのコンストラクタ。JSON の変換で使う
const DATA_CTORS = new Map<string, { name: string; arity: number }[]>();

// ---- 型検査器 ----

interface Env {
  types: Map<string, TypeInfo>;
  ctors: Map<string, CtorInfo>;
  values: Map<string, ValueInfo>; // import したものと Prelude
  quals: Map<string, ModuleIface>; // 修飾名で使うモジュール
  tagModules: Map<string, { iface: ModuleIface; main: string }>;
}

export interface CheckOptions {
  deps: Map<string, ModuleIface>;
  builtin: boolean; // 標準ライブラリ（foreign の制限をかけない）
  entry: boolean; // main を持つべきモジュールか
  holes?: boolean; // まだ書いていない所（_）を許すか（開発サーバーとエディタ）。許さないときはエラーにする
}

// まだ書いていない所（_）と、そこに入る型
export interface Hole {
  pos: Pos;
  type: string;
}

export interface CheckResult {
  iface: ModuleIface;
  defaults: { key: string; fields: { name: string; expr: Expr }[] }[];
  hovers: HoverInfo[];
  tokens: SemToken[];
  completion: CompletionInfo;
  style: ScopedStyle | null;
  holes: Hole[];
}

export function checkModule(mod: Module, file: string, opts: CheckOptions): CheckResult {
  return new Checker(mod, file, opts).run();
}

class Checker {
  mod: Module;
  file: string;
  opts: CheckOptions;
  env: Env;
  level = 0;
  scopes: Map<string, ValueInfo>[] = [];
  top = new Map<string, ValueInfo>();
  deferred: (() => void)[] = [];
  skolemCount = 0;
  sigVarNames = new Map<TVar, string>();
  defaults: CheckResult["defaults"] = [];
  hovers: HoverInfo[] = [];
  errors: CompileError[] = [];
  tokens: SemToken[] = [];
  style: ScopedStyle | null = null;
  jsonUses: { expr: Extract<Expr, { k: "var" }>; types: Type[] }[] = [];
  holes: Extract<Expr, { k: "hole" }>[] = [];

  constructor(mod: Module, file: string, opts: CheckOptions) {
    this.mod = mod;
    this.file = file;
    this.opts = opts;
    this.env = { types: new Map(), ctors: new Map(), values: new Map(), quals: new Map(), tagModules: new Map() };
  }

  error(message: string, pos: Pos | null): CompileError {
    return new CompileError(message, pos, this.file);
  }

  // 型の不一致を、場所と説明つきのエラーにする
  unifyAt(a: Type, b: Type, pos: Pos, context?: string) {
    try {
      unify(a, b);
    } catch (e) {
      if (e instanceof TypeError_) {
        throw this.error(context ? `${context}: ${e.message}` : e.message, pos);
      }
      throw e;
    }
  }

  // ---- 準備 ----

  run(): CheckResult {
    this.setupEnv();
    this.declareTypes();
    this.declareForeigns();
    this.declareStyle();
    this.inferBlock(this.mod.body, this.top, true);
    this.recover(() => this.checkDefaults());
    if (this.opts.entry) this.recover(() => this.checkMain());
    for (const use of this.jsonUses) {
      this.recover(() => {
        use.expr.json = use.types.map((t) => this.jsonDescriptor(t, use.expr.pos));
      });
    }
    const holes = this.holes.map((h) => ({ pos: h.pos, type: show(h.type!) }));
    if (!this.opts.holes) {
      for (const h of holes) {
        this.errors.push(this.error(`まだ書いていない所（_）が残っています。ここには ${h.type} 型の値を書いてください（_ を置いたまま動かせるのは nene dev だけです）`, h.pos));
      }
    }
    if (this.errors.length > 0) {
      throw CompileError.of(this.errors.sort((a, b) => (a.pos?.line ?? 0) - (b.pos?.line ?? 0)));
    }
    const result: CheckResult = {
      iface: this.buildIface(),
      defaults: this.defaults,
      hovers: this.hovers,
      tokens: this.tokens,
      completion: this.completionInfo(),
      style: this.style,
      holes,
    };
    // ほかのモジュールが型の別名を展開しても、このモジュールの結果に書き足さない
    this.hovers = [];
    this.tokens = [];
    return result;
  }

  tok(pos: Pos, length: number, type: SemToken["type"]) {
    this.tokens.push({ pos, length, type });
  }

  // M.name の形なら、モジュール名と名前を分けて記録する
  qualTok(pos: Pos, module: string | null, name: string, type: SemToken["type"]) {
    if (module) {
      this.tok(pos, module.length, "namespace");
      this.tok({ line: pos.line, col: pos.col + module.length + 1 }, name.length, type);
    } else {
      this.tok(pos, name.length, type);
    }
  }

  // 型の名前のホバー
  typeHover(pos: Pos, name: string, info: TypeInfo) {
    const label = () => {
      const head = [info.display, ...(info.params ?? [])].join(" ");
      if (info.kind === "data") return `data ${head} = ${info.ctors.join(" | ")}`;
      if (info.kind === "opaque") return `type ${head}`;
      // 型変数は宣言での名前で表示する
      const params = (info.params ?? []).map((p): Type => ({ k: "con", name: `$param.${p}`, display: p, args: [] }));
      return `type ${head} = ${show(info.expand!(params))}`;
    };
    this.hovers.push({ pos, length: name.length, name, type: label, label, def: info.def });
  }

  ctorHover(pos: Pos, name: string, c: CtorInfo, t: () => Type) {
    this.hovers.push({ pos, length: name.length, name, type: () => show(t()), def: c.def });
  }

  // フィールドのホバー。rec は単一化のあとで宣言の場所が伝わってくるレコード
  fieldHover(pos: Pos, name: string, rec: TRec, t: Type) {
    const def = () => flattenRecord(rec).fieldDef(name);
    this.hovers.push({ pos, length: name.length, name, type: () => show(t), typeOf: () => t, def });
  }

  moduleHover(pos: Pos, name: string, iface: ModuleIface) {
    const label = () => `module ${iface.name}`;
    this.hovers.push({ pos, length: name.length, name, type: label, label, def: { file: iface.file, pos: iface.pos } });
  }

  // エラーを記録して先へ進む。状態は呼ぶ前に戻す
  recover(f: () => void): boolean {
    const scopes = this.scopes.length;
    const level = this.level;
    const deferred = this.deferred.length;
    try {
      f();
      return true;
    } catch (e) {
      if (!(e instanceof CompileError)) throw e;
      this.errors.push(...e.all);
      this.scopes.length = scopes;
      this.level = level;
      this.deferred.length = deferred;
      return false;
    }
  }

  setupEnv() {
    const { deps } = this.opts;
    const prelude = deps.get("Prelude");
    if (this.mod.name !== "Prelude") {
      if (!prelude) throw new Error("Prelude がありません");
      this.importAll(prelude, null);
      for (const q of STD_QUALIFIED) {
        const iface = deps.get(q);
        if (iface && q !== this.mod.name) this.env.quals.set(q, iface);
      }
    } else {
      for (const name of ["Int", "Float", "String", "Html", "Class", "Cmd", "Sub", "Program", "Test"]) {
        const arity = name === "Html" || name === "Cmd" || name === "Sub" ? 1 : name === "Program" ? 2 : 0;
        this.env.types.set(name, { name, display: name, arity, kind: "opaque", ctors: [] });
      }
    }
    for (const imp of this.mod.imports) {
      if (RESERVED_MODULES.includes(imp.module) && imp.module !== "Prelude") {
        throw this.error(`${imp.module} は標準モジュールなので import せずに ${imp.module}.名前 の形で使います`, imp.pos);
      }
      const iface = deps.get(imp.module);
      if (!iface) throw this.error(`モジュール ${imp.module} が見つかりません`, imp.pos);
      this.moduleHover(imp.modulePos, imp.module, iface);
      const last = imp.module.split(".").pop()!;
      const tag = imp.alias ?? last;
      this.env.tagModules.set(tag, { iface, main: lowerFirst(last) });
      if (imp.qualified) {
        this.env.quals.set(imp.alias ?? imp.module, iface);
      } else {
        if (imp.alias) this.env.quals.set(imp.alias, iface);
        this.importAll(iface, imp.items);
      }
    }
  }

  importAll(iface: ModuleIface, items: Module["exports"]) {
    if (!items) {
      for (const [k, v] of iface.types) this.env.types.set(k, v);
      for (const [k, v] of iface.ctors) this.env.ctors.set(k, v);
      for (const [k, v] of iface.values) this.env.values.set(k, qualify(iface, v));
      return;
    }
    for (const item of items) {
      if (item.k === "value") {
        const v = iface.values.get(item.name);
        if (!v) throw this.error(`${iface.name} は ${item.name} を export していません`, item.pos);
        this.env.values.set(item.name, qualify(iface, v));
        this.hovers.push({ pos: item.pos, length: item.name.length, name: item.name, type: () => showScheme(v.scheme), def: v.def });
      } else {
        const t = iface.types.get(item.name);
        if (!t) throw this.error(`${iface.name} は型 ${item.name} を export していません`, item.pos);
        this.env.types.set(item.name, t);
        this.typeHover(item.pos, item.name, t);
        if (item.all) {
          for (const c of t.ctors) {
            const ci = iface.ctors.get(c);
            if (!ci) throw this.error(`${iface.name} は ${item.name} のコンストラクタを export していません`, item.pos);
            this.env.ctors.set(c, ci);
          }
        }
      }
    }
  }

  // ---- 型宣言 ----

  declareTypes() {
    const own = new Set<string>();
    const claim = (name: string, pos: Pos) => {
      if (own.has(name)) throw this.error(`型 ${name} はすでに定義されています`, pos);
      own.add(name);
    };
    for (const d of this.mod.datas) {
      claim(d.name, d.pos);
      const name = uniqueTypeName(this.mod.name, d.name);
      const info: TypeInfo = {
        name,
        display: d.name,
        arity: d.params.length,
        kind: "data",
        ctors: d.ctors.map((c) => c.name),
        def: { file: this.file, pos: d.namePos },
        params: d.params,
      };
      this.env.types.set(d.name, info);
      this.typeHover(d.namePos, d.name, info);
    }
    for (const a of this.mod.aliases) {
      claim(a.name, a.pos);
      this.declareAlias(a);
    }
    const ownCtors = new Set<string>();
    for (const d of this.mod.datas) {
      const info = this.env.types.get(d.name)!;
      const params = new Map<string, Type>();
      const vars: TVar[] = [];
      for (const p of d.params) {
        const v = freshVar(1);
        vars.push(v);
        params.set(p, v);
      }
      const result = con(info.name, vars, d.name);
      const siblings = d.ctors.map((c) => ({ name: c.name, arity: c.args.length }));
      DATA_CTORS.set(info.name, siblings);
      for (const c of d.ctors) {
        if (ownCtors.has(c.name)) throw this.error(`コンストラクタ ${c.name} はすでに定義されています`, c.pos);
        ownCtors.add(c.name);
        const args = c.args.map((a) => this.typeFromExpr(a, params, false));
        const scheme: Scheme = { vars, type: funN(args, result) };
        const ci: CtorInfo = {
          scheme,
          ref: { name: c.name, typeName: info.name, arity: c.args.length, js: "", siblings },
          def: { file: this.file, pos: c.pos },
        };
        this.env.ctors.set(c.name, ci);
        this.ctorHover(c.pos, c.name, ci, () => scheme.type);
      }
    }
  }

  declareAlias(a: AliasDecl) {
    const env = this.env;
    let defaults: Set<string> | undefined;
    const key = `${this.mod.name}.${a.name}`;
    if (a.body.k === "trecord") {
      const withDefault = a.body.fields.filter((f) => f.default);
      if (withDefault.length > 0) defaults = new Set(withDefault.map((f) => f.name));
    } else if (hasDefaults(a.body)) {
      throw this.error("デフォルト値はレコード型のフィールドにだけ書けます", a.pos);
    }
    let depth = 0;
    const info: TypeInfo = {
      name: key,
      display: a.name,
      arity: a.params.length,
      kind: "alias",
      ctors: [],
      defaults,
      defaultsKey: defaults ? key : undefined,
      def: { file: this.file, pos: a.namePos },
      params: a.params,
      expand: (args) => {
        if (depth > 50) throw this.error(`型の別名 ${a.name} が自分自身を参照しています`, a.pos);
        depth++;
        try {
          const params = new Map<string, Type>();
          a.params.forEach((p, i) => params.set(p, args[i]));
          const t = this.typeFromExprIn(env, a.body, params, false);
          if (t.k === "rec" && defaults) {
            t.alias = { name: a.name, defaultsJs: `$rt.defaults[${JSON.stringify(key)}]`, defaults } satisfies AliasTag;
          }
          return t;
        } finally {
          depth--;
        }
      },
    };
    this.env.types.set(a.name, info);
    this.typeHover(a.namePos, a.name, info);
  }

  // ---- 型の構文 → 型 ----

  typeFromExpr(te: TypeExpr, vars: Map<string, Type>, allowNew: boolean): Type {
    return this.typeFromExprIn(this.env, te, vars, allowNew);
  }

  typeFromExprIn(env: Env, te: TypeExpr, vars: Map<string, Type>, allowNew: boolean): Type {
    const go = (t: TypeExpr): Type => {
      switch (t.k) {
        case "tvar": {
          let v = vars.get(t.name);
          if (!v) {
            if (!allowNew) throw this.error(`型変数 ${t.name} が宣言されていません`, t.pos);
            v = freshVar(this.level + 1);
            vars.set(t.name, v);
          }
          return v;
        }
        case "tunit":
          return tUnit;
        case "tlist":
          return tList(go(t.elem));
        case "ttuple":
          return tTuple(t.items.map(go));
        case "tfun":
          return fun(go(t.from), go(t.to));
        case "trecord": {
          const fields = new Map<string, Type>();
          const defs = new Map<string, Location>();
          for (const f of t.fields) {
            fields.set(f.name, go(f.type));
            defs.set(f.name, { file: this.file, pos: f.pos });
          }
          return { k: "rec", fields, rest: null, fieldDefs: new FieldDefs(defs) };
        }
        case "tcon": {
          if (env === this.env) this.qualTok(t.pos, t.module, t.name, "type");
          let info: TypeInfo | undefined;
          if (t.module) {
            const iface = env.quals.get(t.module);
            if (!iface) throw this.error(`モジュール ${t.module} が見つかりません`, t.pos);
            info = iface.types.get(t.name);
          } else {
            info = env.types.get(t.name);
          }
          if (!info) throw this.error(`型 ${t.name} が見つかりません`, t.pos);
          if (env === this.env) this.typeHover(t.pos, t.module ? `${t.module}.${t.name}` : t.name, info);
          if (info.arity !== t.args.length) {
            throw this.error(`型 ${t.name} には ${info.arity} 個の引数が必要です（${t.args.length} 個あります）`, t.pos);
          }
          const args = t.args.map(go);
          if (info.kind === "alias") return info.expand!(args);
          return con(info.name, args, info.display);
        }
      }
    };
    return go(te);
  }

  // 型注釈を型スキームにする
  sigScheme(sig: TypeSig): Scheme {
    this.tok(sig.pos, sig.name.length, () => (sig.type.k === "tfun" ? "function" : "variable"));
    const vars = new Map<string, Type>();
    this.level++;
    const type = this.typeFromExpr(sig.type, vars, true);
    this.level--;
    for (const [name, v] of vars) if (v.k === "var") this.sigVarNames.set(v, name);
    const json: TVar[] = [];
    for (const c of sig.constraints) {
      const v = vars.get(c.tvar);
      if (!v || v.k !== "var") throw this.error(`型変数 ${c.tvar} が型の中にありません`, sig.pos);
      if (c.cls === "Json" && this.opts.builtin) {
        v.classes.add(c.cls);
        json.push(v);
        continue;
      }
      if (c.cls === "Json") {
        throw this.error("Json は型注釈に書けません。JSON にする値の型は、具体的な型（[Todo] など）にしてください", sig.pos);
      }
      if (!["Num", "Ord", "Show", "Append"].includes(c.cls)) {
        throw this.error(`型クラス ${c.cls} はありません（Num・Ord・Show・Append だけが使えます）`, sig.pos);
      }
      v.classes.add(c.cls);
    }
    const scheme = generalize(type, this.level);
    if (json.length > 0) scheme.json = json;
    return scheme;
  }

  // 型注釈を、具体化できない型（スコーレム）で置き換えた型
  skolemize(s: Scheme): Type {
    const map = new Map<TVar, Type>();
    for (const v of s.vars) {
      const name = `skolem${++this.skolemCount}`;
      const display = this.sigVarNames.get(v) ?? name;
      map.set(v, { k: "con", name, display, args: [], skolem: { classes: new Set(v.classes) } });
    }
    const t = instantiate({ vars: [], type: s.type }, this.level);
    return substituteVars(t, map);
  }

  // ---- foreign ----

  declareForeigns() {
    for (const f of this.mod.foreigns) {
      if (this.top.has(f.name)) throw this.error(`${f.name} はすでに定義されています`, f.pos);
      const scheme = this.sigScheme(f.sig);
      if (!this.opts.builtin) {
        let t = prune(scheme.type);
        while (t.k === "fun") t = prune(t.to);
        if (!(t.k === "con" && t.name === "Cmd")) {
          throw this.error("foreign import の結果の型は Cmd msg にしてください", f.pos);
        }
      }
      const def = { file: this.file, pos: f.sig.pos };
      this.top.set(f.name, { scheme, ref: { js: jsName(f.name), thunk: false, json: scheme.json }, def });
      this.hovers.push({ pos: f.sig.pos, length: f.name.length, name: f.name, type: () => showScheme(scheme), def });
    }
  }

  // ---- style ブロック ----

  // style ブロックのクラスを、css というレコードとして使えるようにする（css.card など）
  declareStyle() {
    const block = this.mod.style;
    if (!block) return;
    const clash = this.mod.body.bindings.find((b) => b.name === "css");
    if (clash) throw this.error("css は style ブロックのクラスを表す名前なので、別の名前にしてください", clash.pos);
    this.style = scopeStyle(block, this.mod.name, this.file);
    const fields = new Map<string, Type>([...this.style.classes.keys()].map((k) => [k, tClass]));
    this.top.set("css", {
      scheme: mono({ k: "rec", fields, rest: null }),
      ref: { js: "css", thunk: false },
      def: { file: this.file, pos: block.pos },
    });
  }

  // ---- デフォルト値 ----

  checkDefaults() {
    for (const a of this.mod.aliases) {
      if (a.body.k !== "trecord") continue;
      const fields = a.body.fields.filter((f) => f.default);
      if (fields.length === 0) continue;
      const info = this.env.types.get(a.name)!;
      const params = a.params.map(() => freshVar(this.level + 1));
      const rec = info.expand!(params) as TRec;
      for (const f of fields) {
        const expr = f.default!;
        if (!isConstant(expr)) {
          throw this.error("デフォルト値には、定数（リテラルやコンストラクタ）とトップレベルの名前だけを書けます", expr.pos);
        }
        const t = this.infer(expr);
        this.unifyAt(t, rec.fields.get(f.name)!, expr.pos, `${f.name} のデフォルト値`);
      }
      this.defaults.push({ key: info.defaultsKey!, fields: fields.map((f) => ({ name: f.name, expr: f.default! })) });
    }
  }

  // ---- 名前の参照 ----

  lookupLocal(name: string): ValueInfo | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const v = this.scopes[i].get(name);
      if (v) return v;
    }
    return this.top.get(name);
  }

  lookupValue(name: string, module: string | null, pos: Pos): ValueInfo {
    if (module) {
      const iface = this.env.quals.get(module);
      if (!iface) throw this.error(`モジュール ${module} が見つかりません（import していますか？）`, pos);
      const v = iface.values.get(name);
      if (!v) throw this.error(`${module} に ${name} はありません`, pos);
      return qualify(iface, v);
    }
    const v = this.lookupLocal(name) ?? this.env.values.get(name);
    if (!v) throw this.error(`${name} が見つかりません`, pos);
    return v;
  }

  lookupCtor(name: string, module: string | null, pos: Pos): CtorInfo | null {
    if (module) {
      const iface = this.env.quals.get(module);
      if (!iface) throw this.error(`モジュール ${module} が見つかりません（import していますか？）`, pos);
      return iface.ctors.get(name) ?? null;
    }
    return this.env.ctors.get(name) ?? null;
  }

  lookupType(name: string, module: string | null): TypeInfo | undefined {
    if (module) return this.env.quals.get(module)?.types.get(name);
    return this.env.types.get(name);
  }

  // ---- 束縛のまとまり ----

  // top が true ならトップレベル（遅延評価の値も、モジュールの外から見える）
  inferBlock(block: Block, scope: Map<string, ValueInfo>, top: boolean) {
    const bindings = block.bindings;
    for (const b of bindings) {
      if (scope.has(b.name)) throw this.error(`${b.name} はすでに定義されています`, b.pos);
      if (!top && this.scopes.length > 0 && this.scopes[this.scopes.length - 1].has(b.name)) {
        throw this.error(`${b.name} は引数と同じ名前です。別の名前にしてください`, b.pos);
      }
      b.js = jsName(b.name);
      const thunk = b.equations[0].params.length === 0;
      const scheme = b.sig ? this.sigScheme(b.sig) : mono(freshVar(this.level + 1));
      const info: ValueInfo = { scheme, ref: { js: b.js, thunk }, def: { file: this.file, pos: b.pos } };
      scope.set(b.name, info);
      const kind = (): SemType => (b.equations[0].params.length > 0 || prune(info.scheme.type).k === "fun" ? "function" : "variable");
      if (b.sig) this.hovers.push({ pos: b.sig.pos, length: b.name.length, name: b.name, type: () => showScheme(info.scheme), def: info.def });
      for (const eq of b.equations) {
        this.hovers.push({ pos: eq.pos, length: b.name.length, name: b.name, type: () => showScheme(info.scheme), def: info.def });
        this.tok(eq.pos, b.name.length, kind);
      }
    }
    if (!top) this.scopes.push(scope);
    const sccs = stronglyConnected(bindings);
    for (const group of sccs) {
      if (!top) {
        this.inferGroup(group, scope);
        continue;
      }
      // トップレベルでは、定義ごとにエラーを集めて先へ進む
      const ok = this.recover(() => this.inferGroup(group, scope));
      if (!ok) {
        // エラーになった定義は、どんな型にもなれるものとして扱い、エラーの連鎖を防ぐ
        for (const b of group) {
          if (!b.sig) scope.get(b.name)!.scheme = generalize(freshVar(this.level + 1), this.level);
        }
      }
    }
  }

  inferGroup(group: Binding[], scope: Map<string, ValueInfo>) {
    this.level++;
    const monos = new Map<Binding, Type>();
    for (const b of group) {
      if (!b.sig) monos.set(b, scope.get(b.name)!.scheme.type);
    }
    const deferredBefore = this.deferred.length;
    for (const b of group) {
      const expected = b.sig ? this.skolemize(scope.get(b.name)!.scheme) : monos.get(b)!;
      this.inferBinding(b, expected);
    }
    // 子要素の型の確定を待っていたものを片づける
    const pending = this.deferred.splice(deferredBefore);
    for (const f of pending) f();
    this.level--;
    for (const [b, t] of monos) {
      scope.get(b.name)!.scheme = generalize(t, this.level);
    }
    for (const b of group) this.checkExhaustive(b);
  }

  inferBinding(b: Binding, expected: Type) {
    for (const eq of b.equations) this.inferEquation(b, eq, expected);
  }

  inferEquation(b: Binding, eq: Equation, expected: Type) {
    const params = eq.params.map(() => freshVar(this.level) as Type);
    const result = freshVar(this.level);
    this.unifyAt(funN(params, result), expected, eq.pos, `${b.name} の型`);
    const scope = new Map<string, ValueInfo>();
    eq.params.forEach((p, i) => this.inferPat(p, params[i], scope));
    this.scopes.push(scope);
    const whereScope = new Map<string, ValueInfo>();
    this.inferBlock(eq.where, whereScope, false);
    if (eq.rhs.k === "plain") {
      this.unifyAt(this.infer(eq.rhs.body), result, eq.rhs.body.pos, `${b.name} の結果の型`);
    } else {
      for (const g of eq.rhs.guards) {
        this.unifyAt(this.infer(g.cond), tBool, g.cond.pos, "ガードの条件は Bool");
        this.unifyAt(this.infer(g.body), result, g.body.pos, `${b.name} の結果の型`);
      }
    }
    this.scopes.pop(); // where
    this.scopes.pop(); // 引数
  }

  checkExhaustive(b: Binding) {
    const rows = b.equations
      .filter((eq) => eq.rhs.k === "plain" || guardsComplete(eq.rhs.guards))
      .map((eq) => eq.params);
    const arity = b.equations[0].params.length;
    const missing = checkExhaustive(rows, arity);
    if (missing) {
      const example = arity === 0 ? "" : `（例: ${b.name} ${missing.join(" ")}）`;
      const guardHint = b.equations.some((eq) => eq.rhs.k === "guards" && !guardsComplete(eq.rhs.guards))
        ? "。ガードは最後を otherwise にしてください"
        : "";
      throw this.error(`${b.name} のパターンがすべての場合を覆っていません${example}${guardHint}`, b.pos);
    }
  }

  checkMain() {
    const main = this.top.get("main");
    if (!main) throw this.error("入口のモジュールには main が必要です", this.mod.pos);
    const t = prune(instantiate(main.scheme, this.level));
    if (!(t.k === "con" && t.name === "Program")) {
      throw this.error(`main の型は Program model msg にしてください（${show(t)} になっています）`, this.mod.pos);
    }
  }

  // ---- パターン ----

  inferPat(p: Pat, t: Type, scope: Map<string, ValueInfo>) {
    const bind = (name: string, pos: Pos, type: Type) => {
      if (scope.has(name)) throw this.error(`${name} が 1 つのパターンに 2 回出てきます`, pos);
      const def = { file: this.file, pos };
      scope.set(name, { scheme: mono(type), ref: { js: jsName(name), thunk: false }, def, param: true });
      this.hovers.push({ pos, length: name.length, name, type: () => show(type), typeOf: () => type, def });
      this.tok(pos, name.length, "parameter");
    };
    switch (p.k) {
      case "pvar":
        bind(p.name, p.pos, t);
        return;
      case "pwild":
        return;
      case "plit":
        this.unifyAt(t, p.type === "String" ? tString : p.type === "Float" ? tFloat : freshVar(this.level, ["Num"]), p.pos);
        return;
      case "punit":
        this.unifyAt(t, tUnit, p.pos);
        return;
      case "pcon": {
        const c = this.lookupCtor(p.name, p.module, p.pos);
        if (!c) throw this.error(`コンストラクタ ${p.name} が見つかりません`, p.pos);
        if (c.ref.arity !== p.args.length) {
          throw this.error(`${p.name} には ${c.ref.arity} 個の引数が必要です（${p.args.length} 個あります）`, p.pos);
        }
        p.ref = c.ref;
        this.qualTok(p.pos, p.module, p.name, "enumMember");
        let ct = instantiate(c.scheme, this.level);
        this.ctorHover(p.pos, p.module ? `${p.module}.${p.name}` : p.name, c, () => t);
        const argTypes: Type[] = [];
        for (let i = 0; i < p.args.length; i++) {
          const f = prune(ct);
          if (f.k !== "fun") throw new Error("unreachable");
          argTypes.push(f.from);
          ct = f.to;
        }
        this.unifyAt(t, ct, p.pos, `パターン ${p.name}`);
        p.args.forEach((a, i) => this.inferPat(a, argTypes[i], scope));
        return;
      }
      case "plist": {
        const elem = freshVar(this.level);
        this.unifyAt(t, tList(elem), p.pos);
        p.items.forEach((i) => this.inferPat(i, elem, scope));
        return;
      }
      case "pcons": {
        const elem = freshVar(this.level);
        this.unifyAt(t, tList(elem), p.pos);
        this.inferPat(p.head, elem, scope);
        this.inferPat(p.tail, tList(elem), scope);
        return;
      }
      case "ptuple": {
        const items = p.items.map(() => freshVar(this.level) as Type);
        this.unifyAt(t, tTuple(items), p.pos);
        p.items.forEach((i, idx) => this.inferPat(i, items[idx], scope));
        return;
      }
      case "precord": {
        const fields = new Map<string, Type>();
        for (const f of p.fields) fields.set(f.name, freshVar(this.level));
        const rec: TRec = { k: "rec", fields, rest: freshVar(this.level) };
        this.unifyAt(t, rec, p.pos);
        // { name } の省略形では、フィールド名がそのまま変数になるので、変数のホバーを優先する
        for (const f of p.fields) if (!(f.pat.k === "pvar" && f.pat.pos === f.pos)) this.fieldHover(f.pos, f.name, rec, fields.get(f.name)!);
        for (const f of p.fields) this.inferPat(f.pat, fields.get(f.name)!, scope);
        return;
      }
    }
  }

  // ---- 式 ----

  infer(e: Expr): Type {
    switch (e.k) {
      case "var": {
        const v = this.lookupValue(e.name, e.module, e.pos);
        e.ref = v.ref;
        const { type: t, map } = instantiateWith(v.scheme, this.level);
        if (v.ref.json) this.jsonUses.push({ expr: e, types: v.ref.json.map((x) => map.get(x) ?? x) });
        const name = e.module ? `${e.module}.${e.name}` : e.name;
        this.hovers.push({ pos: e.pos, length: name.length, name, type: () => show(t), typeOf: () => t, def: v.def });
        const kind = (): SemType => (v.param ? "parameter" : prune(t).k === "fun" ? "function" : "variable");
        this.qualTok(e.pos, e.module, e.name, kind);
        return t;
      }
      case "con": {
        const c = this.lookupCtor(e.name, e.module, e.pos);
        if (!c) {
          const t = this.lookupType(e.name, e.module);
          if (t && t.kind === "alias") {
            throw this.error(`型 ${e.name} は ${e.name} { ... } の形で使います`, e.pos);
          }
          throw this.error(`コンストラクタ ${e.name} が見つかりません`, e.pos);
        }
        e.ref = c.ref;
        this.qualTok(e.pos, e.module, e.name, "enumMember");
        const t = instantiate(c.scheme, this.level);
        this.ctorHover(e.pos, e.module ? `${e.module}.${e.name}` : e.name, c, () => t);
        return t;
      }
      case "lit":
        if (e.type === "String") return tString;
        if (e.type === "Float") return tFloat;
        return freshVar(this.level, ["Num"]);
      case "app":
        return this.inferApp(e);
      case "binop":
        return this.inferBinop(e);
      case "neg": {
        const t = this.infer(e.expr);
        this.unifyAt(t, freshVar(this.level, ["Num"]), e.pos, "マイナス");
        return t;
      }
      case "section": {
        const opT = this.opType(e.op);
        const f = prune(opT) as { k: "fun"; from: Type; to: Type };
        const g = prune(f.to) as { k: "fun"; from: Type; to: Type };
        if (e.left) {
          this.unifyAt(this.infer(e.left), f.from, e.left.pos, `${e.op} の左側`);
          return fun(g.from, g.to);
        }
        if (e.right) {
          this.unifyAt(this.infer(e.right), g.from, e.right.pos, `${e.op} の右側`);
          return fun(f.from, g.to);
        }
        return opT;
      }
      case "getter": {
        this.tok({ line: e.pos.line, col: e.pos.col + 2 }, e.field.length, "property");
        const a = freshVar(this.level);
        const rec: TRec = { k: "rec", fields: new Map([[e.field, a]]), rest: freshVar(this.level) };
        this.fieldHover({ line: e.pos.line, col: e.pos.col + 2 }, e.field, rec, a);
        return fun(rec, a);
      }
      case "field": {
        this.tok({ line: e.pos.line, col: e.pos.col + 1 }, e.field.length, "property");
        const t = this.infer(e.target);
        const a = freshVar(this.level);
        const p = prune(t);
        const rec: TRec = { k: "rec", fields: new Map([[e.field, a]]), rest: freshVar(this.level) };
        this.unifyAt(t, rec, e.pos, `フィールド ${e.field}`);
        this.fieldHover({ line: e.pos.line, col: e.pos.col + 1 }, e.field, rec, a);
        return a;
      }
      case "list": {
        const elem = freshVar(this.level);
        e.items.forEach((i, idx) => this.unifyAt(this.infer(i), elem, i.pos, `リストの ${idx + 1} 番目の要素`));
        return tList(elem);
      }
      case "tuple":
        return tTuple(e.items.map((i) => this.infer(i)));
      case "unit":
        return tUnit;
      case "record": {
        const fields = new Map<string, Type>();
        for (const f of e.fields) this.tok(f.pos, f.name.length, "property");
        for (const f of e.fields) fields.set(f.name, this.infer(f.value));
        const rec: TRec = { k: "rec", fields, rest: null };
        for (const f of e.fields) this.fieldHover(f.pos, f.name, rec, fields.get(f.name)!);
        return rec;
      }
      case "update": {
        for (const f of e.fields) this.tok(f.pos, f.name.length, "property");
        const t = this.infer(e.target);
        const fields = new Map<string, Type>();
        for (const f of e.fields) fields.set(f.name, this.infer(f.value));
        const rec: TRec = { k: "rec", fields, rest: freshVar(this.level) };
        this.unifyAt(t, rec, e.pos, "レコードの更新");
        for (const f of e.fields) this.fieldHover(f.pos, f.name, rec, fields.get(f.name)!);
        return t;
      }
      case "jsx":
        return this.inferJsx(e.node);
      case "hole": {
        // どんな型の値の代わりにもなる。入る型は、まわりから決まったものを最後に報告する
        const t = freshVar(this.level);
        e.type = t;
        this.holes.push(e);
        this.hovers.push({ pos: e.pos, length: 1, name: "_", type: () => show(t), typeOf: () => t });
        return t;
      }
    }
  }

  inferApp(e: Extract<Expr, { k: "app" }>): Type {
    // 型の名前 { ... } でレコードを作る
    if (e.fn.k === "con" && e.args.length === 1 && e.args[0].k === "record" && !this.lookupCtor(e.fn.name, e.fn.module, e.fn.pos)) {
      return this.inferNamedRecord(e, e.fn, e.args[0]);
    }
    let ft = this.infer(e.fn);
    const fnName = e.fn.k === "var" || e.fn.k === "con" ? e.fn.name : "関数";
    e.args.forEach((arg, i) => {
      const f0 = prune(ft);
      const at = arg.k === "record" && f0.k === "fun" ? this.inferRecordArg(arg, f0.from, fnName) : this.infer(arg);
      const r = freshVar(this.level);
      const f = prune(ft);
      if (f.k !== "fun" && f.k !== "var") {
        throw this.error(`${fnName} に渡す引数が多すぎます（${show(ft)} は関数ではありません）`, arg.pos);
      }
      if (f.k === "fun") {
        this.unifyAt(at, f.from, arg.pos, `${fnName} の ${i + 1} 番目の引数`);
        ft = f.to;
      } else {
        this.unifyAt(ft, fun(at, r), arg.pos, `${fnName} の ${i + 1} 番目の引数`);
        ft = r;
      }
    });
    return ft;
  }

  // デフォルト値つきのレコード型を取る関数に、レコードを直接渡したときは、デフォルト値を補う
  inferRecordArg(rec: Extract<Expr, { k: "record" }>, param: Type, fnName: string): Type {
    const p = prune(param);
    const known = p.k === "rec" ? flattenRecord(p) : null;
    if (!known || !known.alias || known.rest !== null) return this.infer(rec);
    const fields = new Map<string, Type>();
    for (const f of rec.fields) {
      const ft = known.fields.get(f.name);
      if (!ft) {
        const names = [...known.fields.keys()].join(", ");
        throw this.error(`${fnName} に渡すレコードにフィールド ${f.name} はありません（使えるもの: ${names}）`, f.pos);
      }
      this.unifyAt(this.infer(f.value), ft, f.value.pos, `フィールド ${f.name}`);
      fields.set(f.name, ft);
    }
    for (const [name, t] of known.fields) {
      if (fields.has(name)) continue;
      if (!known.alias.defaults.has(name)) throw this.error(`${fnName} に渡すレコードにフィールド ${name} がありません`, rec.pos);
      fields.set(name, t);
    }
    rec.defaultsJs = known.alias.defaultsJs;
    const t: TRec = { k: "rec", fields, rest: null };
    for (const f of rec.fields) this.fieldHover(f.pos, f.name, t, fields.get(f.name)!);
    return t;
  }

  inferNamedRecord(e: Extract<Expr, { k: "app" }>, fn: Extract<Expr, { k: "con" }>, rec: Extract<Expr, { k: "record" }>): Type {
    const info = this.lookupType(fn.name, fn.module);
    if (!info) throw this.error(`コンストラクタ ${fn.name} が見つかりません`, fn.pos);
    if (info.kind !== "alias") throw this.error(`${fn.name} はレコード型の名前ではありません`, fn.pos);
    this.typeHover(fn.pos, fn.module ? `${fn.module}.${fn.name}` : fn.name, info);
    const t = info.expand!(Array.from({ length: info.arity }, () => freshVar(this.level)));
    if (t.k !== "rec") throw this.error(`${fn.name} はレコード型ではありません`, fn.pos);
    const given = new Set<string>();
    for (const f of rec.fields) {
      const ft = t.fields.get(f.name);
      if (!ft) throw this.error(`${fn.name} にフィールド ${f.name} はありません`, f.pos);
      this.unifyAt(this.infer(f.value), ft, f.value.pos, `フィールド ${f.name}`);
      this.fieldHover(f.pos, f.name, t, ft);
      given.add(f.name);
    }
    for (const name of t.fields.keys()) {
      if (!given.has(name) && !info.defaults?.has(name)) {
        throw this.error(`${fn.name} のフィールド ${name} がありません`, rec.pos);
      }
    }
    e.named = { kind: "alias", defaultsJs: info.defaults ? `$rt.defaults[${JSON.stringify(info.defaultsKey)}]` : null };
    return t;
  }


  opType(op: string): Type {
    const v = (classes: string[] = []) => freshVar(this.level, classes);
    switch (op) {
      case "+":
      case "-":
      case "*": {
        const a = v(["Num"]);
        return funN([a, a], a);
      }
      case "/":
        return funN([tFloat, tFloat], tFloat);
      case "//":
        return funN([tInt, tInt], tInt);
      case "++": {
        const a = v(["Append"]);
        return funN([a, a], a);
      }
      case ":": {
        const a = v();
        return funN([a, tList(a)], tList(a));
      }
      case "==":
      case "/=": {
        const a = v();
        return funN([a, a], tBool);
      }
      case "<":
      case "<=":
      case ">":
      case ">=": {
        const a = v(["Ord"]);
        return funN([a, a], tBool);
      }
      case "&&":
      case "||":
        return funN([tBool, tBool], tBool);
      case ".": {
        const a = v();
        const b = v();
        const c = v();
        return funN([fun(b, c), fun(a, b)], fun(a, c));
      }
    }
    throw new Error(`unknown operator ${op}`);
  }

  inferBinop(e: Extract<Expr, { k: "binop" }>): Type {
    const t = prune(this.opType(e.op)) as { k: "fun"; from: Type; to: Type };
    const rest = prune(t.to) as { k: "fun"; from: Type; to: Type };
    const lt = this.infer(e.left);
    const rt = this.infer(e.right);
    this.unifyAt(lt, t.from, e.left.pos, `${e.op} の左側`);
    try {
      unify(rt, rest.from);
    } catch (err) {
      if (!(err instanceof TypeError_)) throw err;
      // 型の決まっていない数（1 など）は「数値」と見せる
      const [a, b] = showPair(prune(lt), prune(rt)).map((s, i) => (isNumVar([lt, rt][i]) ? "数値" : s));
      throw this.error(`${e.op} の左右の型が合いません: 左は ${a}、右は ${b}`, e.right.pos);
    }
    return rest.to;
  }

  // ---- JSX ----

  inferJsx(node: JsxNode): Type {
    const msg = freshVar(this.level);
    if (node.k === "fragment") {
      this.checkChildren(node.children, msg);
      return tHtml(msg);
    }
    if (/^[a-z]/.test(node.tag)) {
      if (!HTML_ELEMENTS.has(node.tag)) throw this.error(`HTML 要素 <${node.tag}> は使えません`, node.pos);
      this.tagTokens(node, "macro");
      for (const a of node.attrs) {
        if (a.name === "vars") {
          this.checkVars(a.value);
          continue;
        }
        const expected = htmlAttrType(a.name, msg);
        if (!expected) throw this.error(`<${node.tag}> に属性 ${a.name} は使えません`, a.pos);
        this.unifyAt(this.infer(a.value), expected, a.value.pos, `属性 ${a.name}`);
      }
      if (node.children) this.checkChildren(node.children, msg);
      node.res = { kind: "html" };
      return tHtml(msg);
    }
    return this.inferComponent(node, msg);
  }

  // vars={…} の値は、フィールドがすべて文字列のレコード。各フィールドは style ブロックの var(--…) と対応する
  checkVars(value: Expr): Type {
    const t = this.infer(value);
    const p = prune(t);
    const rec = p.k === "rec" ? flattenRecord(p) : null;
    if (!rec || rec.rest !== null) {
      throw this.error("vars には { barWidth = \"40%\" } のようなレコードを渡してください", value.pos);
    }
    for (const [field, ft] of rec.fields) {
      this.unifyAt(ft, tString, value.pos, `vars の ${field}（値は単位まで含めた文字列）`);
      const name = varName(field);
      if (!this.style?.vars.has(name)) {
        throw this.error(`vars の ${field} は --${name} になりますが、このファイルの style ブロックで var(--${name}) が使われていません`, value.pos);
      }
    }
    return t;
  }

  tagTokens(node: Extract<JsxNode, { k: "element" }>, type: SemType) {
    this.tok({ line: node.pos.line, col: node.pos.col + 1 }, node.tag.length, type);
    if (node.closePos) this.tok({ line: node.closePos.line, col: node.closePos.col + 2 }, node.tag.length, type);
    for (const a of node.attrs) this.tok(a.pos, a.name.length, "property");
  }

  resolveTag(tag: string, pos: Pos): { info: ValueInfo; js: string } {
    const name = lowerFirst(tag);
    const local = this.lookupLocal(name);
    if (local) return { info: local, js: local.ref.js };
    const mod = this.env.tagModules.get(tag);
    if (mod) {
      const v = mod.iface.values.get(mod.main);
      if (!v) throw this.error(`モジュール ${mod.iface.name} に主部品 ${mod.main} がありません（export していますか？）`, pos);
      return { info: v, js: `${mod.iface.js}.${v.ref.js}` };
    }
    const layout = this.opts.deps.get("Layout");
    const lv = layout?.values.get(name);
    if (lv && layout) return { info: lv, js: `${layout.js}.${lv.ref.js}` };
    throw this.error(`部品 <${tag}> が見つかりません（${name} を定義するか、モジュール ${tag} を import してください）`, pos);
  }

  inferComponent(node: Extract<JsxNode, { k: "element" }>, msg: Type): Type {
    const { info, js } = this.resolveTag(node.tag, node.pos);
    if (info.ref.thunk) throw this.error(`<${node.tag}> は関数ではありません`, node.pos);
    const ft = prune(instantiate(info.scheme, this.level));
    const tagText = `<${node.tag}>`;
    const tagPos = { line: node.pos.line, col: node.pos.col + 1 };
    this.hovers.push({ pos: tagPos, length: node.tag.length, name: node.tag, type: () => show(ft), def: info.def });
    if (node.closePos) {
      const closePos = { line: node.closePos.line, col: node.closePos.col + 2 };
      this.hovers.push({ pos: closePos, length: node.tag.length, name: node.tag, type: () => show(ft), def: info.def });
    }
    this.tagTokens(node, "class");

    let propsType: Type;
    let resultType: Type;
    if (ft.k === "fun") {
      propsType = ft.from;
      resultType = ft.to;
    } else {
      propsType = freshVar(this.level);
      resultType = freshVar(this.level);
      this.unifyAt(ft, fun(propsType, resultType), node.pos, tagText);
    }

    // 属性からレコードを作る
    const props = prune(propsType);
    const known = props.k === "rec" ? flattenRecord(props) : null;
    const defaults = known?.alias?.defaults ?? new Set<string>();
    const fields = new Map<string, Type>();
    for (const a of node.attrs) {
      const at = this.infer(a.value);
      if (known && known.rest === null) {
        const ft2 = known.fields.get(a.name);
        if (!ft2) {
          const names = [...known.fields.keys()].join(", ");
          throw this.error(`${tagText} に属性 ${a.name} はありません（使えるもの: ${names || "なし"}）`, a.pos);
        }
        this.unifyAt(at, ft2, a.value.pos, `${tagText} の属性 ${a.name}`);
      }
      fields.set(a.name, at);
    }
    if (known && known.rest === null) {
      for (const [name, t] of known.fields) {
        if (fields.has(name)) continue;
        if (!defaults.has(name)) throw this.error(`${tagText} には属性 ${name} が必要です`, node.pos);
        fields.set(name, t);
      }
    }
    const attrsRec: TRec = { k: "rec", fields, rest: null };
    this.unifyAt(attrsRec, propsType, node.pos, `${tagText} の属性`);
    for (const a of node.attrs) this.fieldHover(a.pos, a.name, attrsRec, fields.get(a.name)!);

    // 子要素を取るかどうかは型で決まる
    const r = prune(resultType);
    let takesChildren: boolean;
    if (r.k === "fun") {
      takesChildren = true;
      this.unifyAt(r.from, tList(tHtml(msg)), node.pos, `${tagText} の子要素`);
      this.unifyAt(r.to, tHtml(msg), node.pos, tagText);
    } else if (r.k === "var" && node.children && node.children.length > 0) {
      takesChildren = true;
      this.unifyAt(r, fun(tList(tHtml(msg)), tHtml(msg)), node.pos, tagText);
    } else {
      takesChildren = false;
      this.unifyAt(r, tHtml(msg), node.pos, `${tagText} は Html を返す関数ではありません`);
      if (node.children && node.children.length > 0) {
        throw this.error(`${tagText} は子要素を取りません。<${node.tag} ... /> と書いてください`, node.pos);
      }
    }
    if (node.children) this.checkChildren(node.children, msg);
    node.res = { kind: "component", js, children: takesChildren, defaultsJs: known?.alias?.defaultsJs ?? null };
    return tHtml(msg);
  }

  checkChildren(children: JsxChild[], msg: Type) {
    for (const c of children) {
      if (c.k === "text") continue;
      if (c.k === "node") {
        this.unifyAt(this.inferJsx(c.node), tHtml(msg), c.pos);
        continue;
      }
      const t = this.infer(c.expr);
      const pos = c.pos;
      const resolve = (final: boolean): boolean => {
        const p = prune(t);
        if (p.k === "con" && p.name === "Html") {
          this.unifyAt(p.args[0], msg, pos, "子要素");
        } else if (p.k === "con" && p.name === "List") {
          this.unifyAt(p.args[0], tHtml(msg), pos, "子要素のリスト");
        } else if (p.k === "con" && p.name === "String") {
          // そのままテキストになる
        } else if (p.k === "var") {
          if (!final) return false;
          // 型が決まらない子要素（where の部品の引数のフィールドなど）は、使う側で決まる
          p.classes.add("Child");
        } else {
          throw this.error(`子要素 {} には Html・[Html]・String だけを書けます（${show(p)} です。数値なら show を使ってください）`, pos);
        }
        return true;
      };
      if (!resolve(false)) this.deferred.push(() => void resolve(true));
    }
  }

  // ---- JSON ----

  // 決まった型から、ランタイムが JSON との変換に使う記述（JS の式）を作る
  jsonDescriptor(type: Type, pos: Pos): string {
    const fail = (t: Type, why: string) =>
      this.error(`${show(type)} は JSON にできません（${show(t)} ${why}）`, pos);
    const go = (t: Type): string => {
      t = prune(t);
      switch (t.k) {
        case "var":
          if (t.classes.has("Num")) return "$rt.json.int";
          // Nothing や [] の中身のように、値が入りようのない型。全体が決まらないときはエラーにする
          if (t === prune(type)) throw this.error("JSON にする値の型が決まりません。型注釈を書いてください", pos);
          return "$rt.json.never";
        case "fun":
          throw fail(t, "は関数です");
        case "rec": {
          const { fields } = flattenRecord(t);
          const parts = [...fields].map(([k, v]) => `${JSON.stringify(k)}: ${go(v)}`);
          return `$rt.json.record({ ${parts.join(", ")} })`;
        }
        case "con": {
          if (t.skolem) throw fail(t, "は型変数です");
          switch (t.name) {
            case "Int":
              return "$rt.json.int";
            case "Float":
              return "$rt.json.float";
            case "String":
              return "$rt.json.string";
            case "Bool":
              return "$rt.json.bool";
            case "()":
              return "$rt.json.unit";
            case "List":
              return `$rt.json.list(${go(t.args[0])})`;
            case "Maybe":
              return `$rt.json.maybe(${go(t.args[0])})`;
            case "Dict.Dict":
              this.unifyAt(t.args[0], tString, pos, "JSON にする Dict のキーは String");
              return `$rt.json.dict(${go(t.args[1])})`;
          }
          if (t.name.startsWith("Tuple")) return `$rt.json.tuple([${t.args.map((a) => go(a)).join(", ")}])`;
          const ctors = DATA_CTORS.get(t.name);
          if (ctors && ctors.every((c) => c.arity === 0)) {
            return `$rt.json.enumeration(${JSON.stringify(ctors.map((c) => c.name))})`;
          }
          if (ctors) throw fail(t, "のコンストラクタが引数を持っています。JSON にできる data 型は、引数のないコンストラクタだけのものです");
          throw fail(t, "は JSON にできない型です");
        }
      }
    };
    return go(type);
  }

  // ---- 補完の候補 ----

  completionInfo(): CompletionInfo {
    const values = new Map<string, string>();
    for (const [name, v] of this.env.values) values.set(name, showScheme(v.scheme));
    for (const [name, v] of this.top) values.set(name, showScheme(v.scheme));
    for (const name of this.env.ctors.keys()) values.set(name, showScheme(this.env.ctors.get(name)!.scheme));
    const quals = new Map<string, { name: string; detail: string }[]>();
    for (const [alias, iface] of this.env.quals) {
      quals.set(alias, [
        ...[...iface.values].map(([name, v]) => ({ name, detail: showScheme(v.scheme) })),
        ...[...iface.ctors].map(([name, c]) => ({ name, detail: showScheme(c.scheme) })),
      ]);
    }
    const tags: TagCandidate[] = [];
    const addTag = (name: string, v: ValueInfo) => {
      const c = tagCandidate(name, v);
      if (c && !tags.some((t) => t.name === name)) tags.push(c);
    };
    for (const [name, v] of this.top) addTag(name[0].toUpperCase() + name.slice(1), v);
    for (const [tag, m] of this.env.tagModules) {
      const v = m.iface.values.get(m.main);
      if (v) addTag(tag, v);
    }
    const layout = this.opts.deps.get("Layout");
    if (layout) for (const [name, v] of layout.values) addTag(name[0].toUpperCase() + name.slice(1), v);
    return { values: [...values].map(([name, detail]) => ({ name, detail })), quals, tags };
  }

  // ---- モジュールの外から見える情報 ----

  buildIface(): ModuleIface {
    const js = moduleJs(this.mod.name);
    const iface: ModuleIface = { name: this.mod.name, file: this.file, pos: this.mod.pos, js, values: new Map(), ctors: new Map(), types: new Map() };
    const ownTypes = new Set([...this.mod.datas.map((d) => d.name), ...this.mod.aliases.map((a) => a.name)]);
    if (this.mod.name === "Prelude") {
      for (const [name, t] of this.env.types) if (t.kind === "opaque") ownTypes.add(name);
    }
    const exportType = (name: string, all: boolean, pos: Pos | null) => {
      const t = this.env.types.get(name);
      if (!t || !ownTypes.has(name)) throw this.error(`型 ${name} はこのモジュールで定義されていません`, pos);
      iface.types.set(name, t);
      if (all) for (const c of t.ctors) iface.ctors.set(c, this.env.ctors.get(c)!);
      if (pos) this.typeHover(pos, name, t);
    };
    const exportValue = (name: string, pos: Pos | null) => {
      const v = this.top.get(name);
      if (!v) throw this.error(`${name} はこのモジュールで定義されていません`, pos);
      iface.values.set(name, v);
      if (pos) this.hovers.push({ pos, length: name.length, name, type: () => showScheme(v.scheme), def: v.def });
    };
    if (this.mod.exports) {
      for (const item of this.mod.exports) {
        if (item.k === "value") exportValue(item.name, item.pos);
        else exportType(item.name, item.all, item.pos);
      }
    } else {
      for (const name of ownTypes) exportType(name, true, null);
      for (const name of this.top.keys()) if (name !== "css" || !this.style) exportValue(name, null);
    }
    return iface;
  }
}

// ---- 補助 ----

function showScheme(s: Scheme): string {
  return show(s.type);
}

// 部品として使える関数なら、タグの補完候補にする
export function tagCandidate(name: string, v: ValueInfo): TagCandidate | null {
  const t = prune(v.scheme.type);
  if (t.k !== "fun") return null;
  const props = prune(t.from);
  if (props.k !== "rec") return null;
  const r = prune(t.to);
  const children = r.k === "fun";
  const result = children ? prune((r as { to: Type }).to) : r;
  if (!(result.k === "con" && result.name === "Html")) return null;
  const { fields, alias } = flattenRecord(props);
  return {
    name,
    detail: show(t),
    fields: [...fields].map(([f, ft]) => ({ name: f, required: !alias?.defaults.has(f), type: show(ft) })),
    children,
  };
}

// 別のモジュールの値を、JS ではモジュールのオブジェクト経由で参照する
function qualify(iface: ModuleIface, v: ValueInfo): ValueInfo {
  return { scheme: v.scheme, ref: { js: `${iface.js}.${v.ref.js}`, thunk: v.ref.thunk, json: v.ref.json }, def: v.def };
}

function isNumVar(t: Type): boolean {
  const p = prune(t);
  return p.k === "var" && p.classes.has("Num");
}

function hasDefaults(t: TypeExpr): boolean {
  return t.k === "trecord" && t.fields.some((f) => f.default);
}

function guardsComplete(guards: { cond: Expr }[]): boolean {
  const last = guards[guards.length - 1].cond;
  return (last.k === "var" && last.name === "otherwise" && !last.module) || (last.k === "con" && last.name === "True");
}

// デフォルト値に書ける式。トップレベルで検査するので、名前はすべてトップレベルか import したもの
function isConstant(e: Expr): boolean {
  switch (e.k) {
    case "lit":
    case "con":
    case "var":
      return true;
    case "neg":
      return e.expr.k === "lit";
    case "app":
      return (e.fn.k === "con" || e.fn.k === "var") && e.args.every(isConstant);
    case "record":
      return e.fields.every((f) => isConstant(f.value));
    case "list":
    case "tuple":
      return e.items.every(isConstant);
    default:
      return false;
  }
}

function substituteVars(t: Type, map: Map<TVar, Type>): Type {
  t = prune(t);
  switch (t.k) {
    case "var":
      return map.get(t) ?? t;
    case "con":
      return t.args.length ? { ...t, args: t.args.map((a) => substituteVars(a, map)) } : t;
    case "fun":
      return fun(substituteVars(t.from, map), substituteVars(t.to, map));
    case "rec":
      return {
        k: "rec",
        fields: new Map([...t.fields].map(([k, v]) => [k, substituteVars(v, map)])),
        rest: t.rest ? substituteVars(t.rest, map) : null,
        alias: t.alias,
        fieldDefs: (t.fieldDefs ??= new FieldDefs()), // 写しとも宣言の場所を共有する
      };
  }
}

// 束縛どうしの依存関係から、互いに参照しあうまとまりを、依存される側から順に返す
function stronglyConnected(bindings: Binding[]): Binding[][] {
  const byName = new Map(bindings.map((b) => [b.name, b]));
  const deps = new Map<Binding, Binding[]>();
  for (const b of bindings) {
    const names = new Set<string>();
    for (const eq of b.equations) collectEquation(eq, names);
    deps.set(
      b,
      [...names].map((n) => byName.get(n)).filter((x): x is Binding => !!x && !x.sig),
    );
  }
  const index = new Map<Binding, number>();
  const low = new Map<Binding, number>();
  const stack: Binding[] = [];
  const onStack = new Set<Binding>();
  const result: Binding[][] = [];
  let i = 0;
  const visit = (b: Binding) => {
    index.set(b, i);
    low.set(b, i);
    i++;
    stack.push(b);
    onStack.add(b);
    for (const d of deps.get(b)!) {
      if (!index.has(d)) {
        visit(d);
        low.set(b, Math.min(low.get(b)!, low.get(d)!));
      } else if (onStack.has(d)) {
        low.set(b, Math.min(low.get(b)!, index.get(d)!));
      }
    }
    if (low.get(b) === index.get(b)) {
      const group: Binding[] = [];
      let x: Binding;
      do {
        x = stack.pop()!;
        onStack.delete(x);
        group.push(x);
      } while (x !== b);
      result.push(group);
    }
  };
  for (const b of bindings) if (!index.has(b)) visit(b);
  return result;
}

function collectEquation(eq: Equation, names: Set<string>) {
  if (eq.rhs.k === "plain") collectExpr(eq.rhs.body, names);
  else for (const g of eq.rhs.guards) {
    collectExpr(g.cond, names);
    collectExpr(g.body, names);
  }
  for (const b of eq.where.bindings) for (const e of b.equations) collectEquation(e, names);
}

function collectExpr(e: Expr, names: Set<string>) {
  switch (e.k) {
    case "var":
      if (!e.module) names.add(e.name);
      return;
    case "app":
      collectExpr(e.fn, names);
      e.args.forEach((a) => collectExpr(a, names));
      return;
    case "binop":
      collectExpr(e.left, names);
      collectExpr(e.right, names);
      return;
    case "neg":
      collectExpr(e.expr, names);
      return;
    case "section":
      if (e.left) collectExpr(e.left, names);
      if (e.right) collectExpr(e.right, names);
      return;
    case "field":
      collectExpr(e.target, names);
      return;
    case "list":
    case "tuple":
      e.items.forEach((i) => collectExpr(i, names));
      return;
    case "record":
      e.fields.forEach((f) => collectExpr(f.value, names));
      return;
    case "update":
      collectExpr(e.target, names);
      e.fields.forEach((f) => collectExpr(f.value, names));
      return;
    case "jsx":
      collectJsx(e.node, names);
      return;
    default:
      return;
  }
}

function collectJsx(node: JsxNode, names: Set<string>) {
  if (node.k === "element") {
    if (/^[A-Z]/.test(node.tag)) names.add(lowerFirst(node.tag));
    node.attrs.forEach((a) => collectExpr(a.value, names));
  }
  for (const c of node.children ?? []) {
    if (c.k === "expr") collectExpr(c.expr, names);
    else if (c.k === "node") collectJsx(c.node, names);
  }
}
