// 構文木の定義

import type { TVar } from "./types.ts";

export interface Pos {
  line: number;
  col: number;
}

export class CompileError extends Error {
  pos: Pos | null;
  file: string | null;
  // 1 つのファイルで見つかったエラーすべて（自分自身を含む）
  all: CompileError[];
  constructor(message: string, pos: Pos | null, file: string | null = null) {
    super(message);
    this.pos = pos;
    this.file = file;
    this.all = [this];
  }

  static of(errors: CompileError[]): CompileError {
    const first = errors[0];
    first.all = errors;
    return first;
  }

  format(): string {
    const where = this.file ? `${this.file}${this.pos ? `:${this.pos.line}:${this.pos.col}` : ""}` : "";
    return where ? `${where}: ${this.message}` : this.message;
  }
}

// ---- 型の構文 ----

export type TypeExpr =
  | { k: "tvar"; name: string; pos: Pos }
  | { k: "tcon"; name: string; module: string | null; args: TypeExpr[]; pos: Pos }
  | { k: "tfun"; from: TypeExpr; to: TypeExpr; pos: Pos }
  | { k: "tlist"; elem: TypeExpr; pos: Pos }
  | { k: "ttuple"; items: TypeExpr[]; pos: Pos }
  | { k: "tunit"; pos: Pos }
  | { k: "trecord"; fields: RecordFieldType[]; pos: Pos };

export interface RecordFieldType {
  name: string;
  type: TypeExpr;
  default: Expr | null;
  pos: Pos;
}

export interface TypeSig {
  name: string;
  constraints: { cls: string; tvar: string }[];
  type: TypeExpr;
  pos: Pos;
}

// ---- パターン ----

export type Pat =
  | { k: "pvar"; name: string; pos: Pos }
  | { k: "pwild"; pos: Pos }
  | { k: "plit"; value: number | string; type: "Int" | "Float" | "String"; pos: Pos }
  | { k: "pcon"; name: string; module: string | null; args: Pat[]; pos: Pos; ref?: CtorRef }
  | { k: "plist"; items: Pat[]; pos: Pos }
  | { k: "pcons"; head: Pat; tail: Pat; pos: Pos }
  | { k: "ptuple"; items: Pat[]; pos: Pos }
  | { k: "precord"; fields: { name: string; pat: Pat; pos: Pos }[]; pos: Pos }
  | { k: "punit"; pos: Pos };

// ---- 式 ----

export type Expr =
  | { k: "var"; name: string; module: string | null; pos: Pos; ref?: ValueRef; json?: string[] }
  | { k: "con"; name: string; module: string | null; pos: Pos; ref?: CtorRef }
  | { k: "lit"; value: number | string; type: "Int" | "Float" | "String"; pos: Pos }
  | { k: "app"; fn: Expr; args: Expr[]; pos: Pos; named?: NamedRecordRef }
  | { k: "binop"; op: string; left: Expr; right: Expr; pos: Pos }
  | { k: "neg"; expr: Expr; pos: Pos }
  | { k: "section"; op: string; left: Expr | null; right: Expr | null; pos: Pos }
  | { k: "getter"; field: string; pos: Pos }
  | { k: "field"; target: Expr; field: string; pos: Pos }
  | { k: "list"; items: Expr[]; pos: Pos }
  | { k: "tuple"; items: Expr[]; pos: Pos }
  | { k: "unit"; pos: Pos }
  | { k: "record"; fields: FieldAssign[]; pos: Pos; defaultsJs?: string | null }
  | { k: "update"; target: Expr; fields: FieldAssign[]; pos: Pos }
  | { k: "jsx"; node: JsxNode; pos: Pos };

export interface FieldAssign {
  name: string;
  value: Expr;
  pos: Pos;
}

export type JsxNode =
  | {
      k: "element";
      tag: string;
      attrs: JsxAttr[];
      children: JsxChild[] | null; // null は自己終了タグ
      pos: Pos;
      closePos?: Pos; // 閉じタグ </Tag> の < の位置
      res?: TagRes;
    }
  | { k: "fragment"; children: JsxChild[]; pos: Pos };

export interface JsxAttr {
  name: string;
  value: Expr;
  pos: Pos;
}

export type JsxChild =
  | { k: "text"; text: string; pos: Pos }
  | { k: "expr"; expr: Expr; pos: Pos }
  | { k: "node"; node: JsxNode; pos: Pos };

// ---- 宣言 ----

export type Rhs =
  | { k: "plain"; body: Expr }
  | { k: "guards"; guards: { cond: Expr; body: Expr; pos: Pos }[] };

export interface Equation {
  params: Pat[];
  rhs: Rhs;
  where: Block;
  pos: Pos;
}

export interface Binding {
  name: string;
  equations: Equation[];
  sig: TypeSig | null;
  pos: Pos;
  js?: string;
}

export interface Block {
  bindings: Binding[];
}

export interface DataDecl {
  name: string;
  namePos: Pos;
  params: string[];
  ctors: { name: string; args: TypeExpr[]; pos: Pos }[];
  pos: Pos;
}

export interface AliasDecl {
  name: string;
  namePos: Pos;
  params: string[];
  body: TypeExpr;
  pos: Pos;
}

export interface ForeignDecl {
  name: string;
  sig: TypeSig;
  code: string;
  pos: Pos;
}

export interface ImportDecl {
  module: string;
  modulePos: Pos;
  qualified: boolean;
  alias: string | null;
  items: ExportItem[] | null;
  pos: Pos;
}

export type ExportItem =
  | { k: "value"; name: string; pos: Pos }
  | { k: "type"; name: string; all: boolean; pos: Pos };

export interface Module {
  name: string;
  exports: ExportItem[] | null;
  imports: ImportDecl[];
  datas: DataDecl[];
  aliases: AliasDecl[];
  foreigns: ForeignDecl[];
  style: StyleBlock | null;
  body: Block;
  pos: Pos;
}

// ファイル末尾の style ブロック（中身は普通の CSS）
export interface StyleBlock {
  css: string;
  pos: Pos; // CSS の 1 行目の位置
}

// ---- 型検査が書き込む注釈（コード生成で使う） ----

export interface ValueRef {
  js: string; // JS での参照式
  thunk: boolean; // 値（引数なしの束縛）は遅延評価のサンク
  json?: TVar[]; // Json 制約のついた型変数。使う場所で、決まった型の記述を先に渡す
}

export interface CtorRef {
  name: string;
  typeName: string;
  arity: number;
  js: string;
  siblings: { name: string; arity: number }[];
}

export interface NamedRecordRef {
  kind: "alias";
  defaultsJs: string | null;
}

export type TagRes =
  | { kind: "html" }
  | { kind: "component"; js: string; children: boolean; defaultsJs: string | null };
