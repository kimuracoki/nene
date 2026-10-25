// 字句解析。パーサーから必要な分だけ読み出す（JSX を文字単位で読むために位置を戻せる）

import { CompileError, type Pos } from "./syntax.ts";

export type TokenKind =
  | "var" // 小文字始まりの識別子
  | "con" // 大文字始まりの識別子
  | "qvar" // List.map
  | "qcon" // Ui.Button / Maybe.Just
  | "field" // 空白を挟まない .name
  | "int"
  | "float"
  | "string"
  | "op"
  | "punct" // ( ) [ ] { } ,
  | "kw"
  | "eof";

export interface Token {
  kind: TokenKind;
  text: string; // 識別子・演算子・記号そのもの（qvar / qcon では名前の部分）
  module: string | null; // qvar / qcon の修飾部分
  value: string | number | null;
  start: number;
  end: number;
  pos: Pos;
  firstOnLine: boolean;
}

const KEYWORDS = new Set(["module", "where", "import", "qualified", "as", "data", "type", "foreign"]);

// lambda-jsx にない構文。書かれたら代わりの書き方を案内する
export const REMOVED: Record<string, string> = {
  if: "if はありません。ガード（| 条件 = 値）を使ってください",
  then: "if はありません。ガード（| 条件 = 値）を使ってください",
  else: "if はありません。ガード（| 条件 = 値）を使ってください",
  case: "case はありません。等式のパターンマッチを使ってください（where に補助関数を書けます）",
  of: "case はありません。等式のパターンマッチを使ってください（where に補助関数を書けます）",
  let: "let はありません。where を使ってください",
  in: "let はありません。where を使ってください",
  do: "do 記法はありません",
  class: "型クラスは定義できません",
  instance: "型クラスのインスタンスは定義できません",
};
const SYMBOL_CHARS = "+-*/<>=!&|:.\\^%$#@?~";
const OPERATORS = new Set([
  "+", "-", "*", "/", "//", "++", ":", ".", "==", "/=", "<", "<=", ">", ">=", "&&", "||",
  "=", "|", "->", "=>", "::", "<>", "..",
]);

export function isLower(c: string | undefined): boolean {
  return c !== undefined && ((c >= "a" && c <= "z") || c === "_");
}
export function isUpper(c: string | undefined): boolean {
  return c !== undefined && c >= "A" && c <= "Z";
}
export function isDigit(c: string | undefined): boolean {
  return c !== undefined && c >= "0" && c <= "9";
}
export function isIdentChar(c: string | undefined): boolean {
  return c !== undefined && (isLower(c) || isUpper(c) || isDigit(c) || c === "'");
}

export class Lexer {
  src: string;
  file: string;
  private lineStarts: number[];

  constructor(src: string, file: string) {
    this.src = src;
    this.file = file;
    this.lineStarts = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") this.lineStarts.push(i + 1);
  }

  posAt(offset: number): Pos {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - this.lineStarts[lo] + 1 };
  }

  error(message: string, offset: number): CompileError {
    return new CompileError(message, this.posAt(offset), this.file);
  }

  // 空白とコメントを飛ばす。改行をまたいだかどうかも返す
  skipTrivia(offset: number): { offset: number; newline: boolean } {
    const s = this.src;
    let i = offset;
    let newline = offset === 0;
    for (;;) {
      const c = s[i];
      if (c === "\n") {
        newline = true;
        i++;
      } else if (c === " " || c === "\t" || c === "\r") {
        i++;
      } else if (c === "-" && s[i + 1] === "-") {
        while (i < s.length && s[i] !== "\n") i++;
      } else if (c === "{" && s[i + 1] === "-") {
        let depth = 1;
        const begin = i;
        i += 2;
        while (depth > 0) {
          if (i >= s.length) throw this.error("コメント {- が閉じられていません", begin);
          if (s[i] === "{" && s[i + 1] === "-") {
            depth++;
            i += 2;
          } else if (s[i] === "-" && s[i + 1] === "}") {
            depth--;
            i += 2;
          } else {
            if (s[i] === "\n") newline = true;
            i++;
          }
        }
      } else {
        return { offset: i, newline };
      }
    }
  }

  // offset から次の字句を 1 つ読む
  scan(offset: number): Token {
    const s = this.src;
    const trivia = this.skipTrivia(offset);
    const start = trivia.offset;
    const firstOnLine = trivia.newline || this.isLineStart(start);
    const make = (kind: TokenKind, text: string, end: number, value: string | number | null = null, module: string | null = null): Token => ({
      kind, text, module, value, start, end, pos: this.posAt(start), firstOnLine,
    });

    if (start >= s.length) return make("eof", "", start);
    const c = s[start];

    // フィールド: 直前に空白がなく、直後が小文字の .
    if (c === "." && isLower(s[start + 1]) && start > 0 && !/\s/.test(s[start - 1])) {
      let i = start + 1;
      while (isIdentChar(s[i])) i++;
      return make("field", s.slice(start + 1, i), i);
    }

    if (isLower(c)) {
      let i = start;
      while (isIdentChar(s[i])) i++;
      const text = s.slice(start, i);
      if (text === "_") return make("var", "_", i);
      if (text in REMOVED) throw this.error(REMOVED[text], start);
      return make(KEYWORDS.has(text) ? "kw" : "var", text, i);
    }

    if (isUpper(c)) {
      let i = start;
      while (isIdentChar(s[i])) i++;
      const parts = [s.slice(start, i)];
      // Ui.Button.button のような修飾名
      while (s[i] === "." && (isUpper(s[i + 1]) || isLower(s[i + 1]))) {
        let j = i + 1;
        while (isIdentChar(s[j])) j++;
        const part = s.slice(i + 1, j);
        i = j;
        if (isLower(part[0])) {
          return make("qvar", part, i, null, parts.join("."));
        }
        parts.push(part);
      }
      if (parts.length === 1) return make("con", parts[0], i);
      const name = parts.pop()!;
      return make("qcon", name, i, null, parts.join("."));
    }

    if (isDigit(c)) {
      let i = start;
      while (isDigit(s[i])) i++;
      if (s[i] === "." && isDigit(s[i + 1])) {
        i++;
        while (isDigit(s[i])) i++;
        return make("float", s.slice(start, i), i, Number(s.slice(start, i)));
      }
      return make("int", s.slice(start, i), i, Number(s.slice(start, i)));
    }

    if (c === '"') {
      const { value, end } = this.readString(start);
      return make("string", s.slice(start, end), end, value);
    }

    if ("()[]{},".includes(c)) return make("punct", c, start + 1);

    if (SYMBOL_CHARS.includes(c)) {
      let i = start;
      while (i < s.length && SYMBOL_CHARS.includes(s[i])) i++;
      const text = s.slice(start, i);
      // "<" の直後が "/" ">" のときは JSX 側で読むので、1 文字だけ返す
      if (c === "<" && !OPERATORS.has(text)) return make("op", "<", start + 1);
      if (text.startsWith("\\")) throw this.error("ラムダ式はありません。where に名前をつけた関数を書いてください", start);
      if (text === "$") throw this.error("$ はありません。括弧を使ってください", start);
      if (!OPERATORS.has(text)) throw this.error(`演算子 ${text} はありません`, start);
      return make("op", text, i);
    }

    throw this.error(`読めない文字です: ${JSON.stringify(c)}`, start);
  }

  isLineStart(offset: number): boolean {
    for (let i = offset - 1; i >= 0; i--) {
      const c = this.src[i];
      if (c === "\n") return true;
      if (c !== " " && c !== "\t" && c !== "\r") return false;
    }
    return true;
  }

  readString(start: number): { value: string; end: number } {
    const s = this.src;
    let i = start + 1;
    let out = "";
    for (;;) {
      const c = s[i];
      if (c === undefined || c === "\n") throw this.error("文字列が閉じられていません", start);
      if (c === '"') return { value: out, end: i + 1 };
      if (c === "\\") {
        const e = s[i + 1];
        const map: Record<string, string> = { n: "\n", t: "\t", '"': '"', "\\": "\\" };
        if (!(e in map)) throw this.error(`エスケープ \\${e} は使えません`, i);
        out += map[e];
        i += 2;
      } else {
        out += c;
        i++;
      }
    }
  }
}
