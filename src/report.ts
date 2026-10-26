// コンパイルエラーを、該当する行と印つきで見せる（コマンドと Vite のエラー表示で使う）
//
//   src/Main.nn:12:5
//
//     11 | view model =
//     12 |   <p>{model.count + 1}</p>
//        |       ^
//
//   JSX の {} には、名前・リテラル・フィールド・1 段の関数適用だけを書けます。

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import type { CompileError } from "./syntax.ts";

export interface ReportOptions {
  cwd?: string; // ファイル名をこのフォルダからの相対パスで出す
  color?: boolean;
  source?: (file: string) => string | undefined; // エディタで編集中の内容など
}

// 該当する行と、その前の 1 行
export function codeFrame(source: string, line: number, col: number, color = false): string {
  const lines = source.split("\n");
  const from = Math.max(1, line - 1);
  const width = String(line).length;
  const paint = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const out: string[] = [];
  for (let n = from; n <= line; n++) {
    out.push(`${paint("2", `${String(n).padStart(width)} |`)} ${lines[n - 1] ?? ""}`);
  }
  // 全角文字は 2 列ぶん進める
  const before = (lines[line - 1] ?? "").slice(0, col - 1);
  const pad = [...before].reduce((w, ch) => w + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1), 0);
  out.push(`${paint("2", `${" ".repeat(width)} |`)} ${" ".repeat(pad)}${paint("31", "^")}`);
  return out.join("\n");
}

// エラーの場所のコード。ファイルが読めなければ undefined
export function errorFrame(err: CompileError, options: ReportOptions = {}): string | undefined {
  if (!err.file || !err.pos) return undefined;
  const source = readSource(err.file, options);
  return source === undefined ? undefined : codeFrame(source, err.pos.line, err.pos.col, options.color);
}

// 端末で表示したときの幅。全角文字は 2 列
export function displayWidth(s: string): number {
  return [...s].reduce((w, ch) => w + (WIDE.test(ch) ? 2 : 1), 0);
}

const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;

export function formatError(err: CompileError, options: ReportOptions = {}): string {
  const { cwd, color = false } = options;
  const paint = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const file = err.file ? (cwd ? relative(cwd, err.file) : err.file) : null;
  const where = file ? `${file}${err.pos ? `:${err.pos.line}:${err.pos.col}` : ""}` : null;
  const parts = [paint("1;31", "エラー") + (where ? ` ${paint("36", where)}` : "")];
  const frame = errorFrame(err, options);
  if (frame) parts.push(indent(frame));
  parts.push(indent(err.message));
  return parts.join("\n\n");
}

function readSource(file: string, options: ReportOptions): string | undefined {
  const given = options.source?.(file);
  if (given !== undefined) return given;
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

const indent = (s: string) =>
  s
    .split("\n")
    .map((l) => (l ? `  ${l}` : l))
    .join("\n");
