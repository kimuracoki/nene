// 参照一覧と名前の一括変更。型検査で記録した「名前を使った場所 → 定義の場所」から、
// 同じ定義を指す場所を、プロジェクトのすべてのモジュールから集める

import type { HoverInfo, Location } from "./checker.ts";
import type { CompiledModule } from "./compiler.ts";
import type { Pos } from "./syntax.ts";

export interface Occurrence {
  file: string;
  pos: Pos; // 書き換える名前の先頭（List.map なら map の位置）
  length: number;
  text: string; // 書いてある名前（List.map なら map、<Button> なら Button）
}

export function definitionOf(h: HoverInfo): Location | undefined {
  return typeof h.def === "function" ? h.def() : h.def;
}

const sameLocation = (a: Location, b: Location) => a.file === b.file && a.pos.line === b.pos.line && a.pos.col === b.pos.col;

// target を定義とする場所すべて（定義そのものも含む）。同じ場所は 1 つにまとめる
export function referencesOf(target: Location, modules: CompiledModule[]): Occurrence[] {
  const out = new Map<string, Occurrence>();
  const add = (o: Occurrence) => out.set(`${o.file}:${o.pos.line}:${o.pos.col}`, o);
  for (const m of modules) {
    for (const h of m.hovers) {
      const def = definitionOf(h);
      if (!def || !sameLocation(def, target)) continue;
      // 修飾名（List.map、Icon.close）は、最後の名前だけを指す
      const text = h.name.slice(h.name.lastIndexOf(".") + 1);
      const col = h.pos.col + (h.name.length - text.length);
      add({ file: m.file, pos: { line: h.pos.line, col }, length: text.length, text });
    }
  }
  const head = out.size > 0 ? [...out.values()][0] : null;
  if (head && !out.has(`${target.file}:${target.pos.line}:${target.pos.col}`)) {
    // 定義の場所が使われた場所として記録されていなければ、足す（data のコンストラクタなど）
    add({ file: target.file, pos: target.pos, length: head.text.length, text: head.text });
  }
  return [...out.values()].sort((a, b) => a.file.localeCompare(b.file) || a.pos.line - b.pos.line || a.pos.col - b.pos.col);
}

const RESERVED = new Set([
  "module", "where", "import", "qualified", "as", "data", "type", "foreign", "style",
  "if", "then", "else", "case", "of", "let", "in", "do", "class", "instance", "css",
]);

// 新しい名前が、元の名前の種類（小文字始まりの値か、大文字始まりの型・コンストラクタか）として正しいか
export function renameProblem(oldName: string, newName: string): string | null {
  const upper = /^[A-Z]/.test(oldName);
  const ok = upper ? /^[A-Z][\w']*$/.test(newName) : /^[a-z_][\w']*$/.test(newName);
  if (!ok) return upper ? "大文字で始まる名前にしてください" : "小文字で始まる名前にしてください";
  if (RESERVED.has(newName)) return `${newName} は予約された名前なので使えません`;
  return null;
}

// 書いてある名前に合わせた新しい名前。部品の関数 button を submitButton にすると、タグ <Button> は <SubmitButton> になる
export function replacementFor(written: string, newName: string): string {
  if (/^[A-Z]/.test(written) && /^[a-z]/.test(newName)) return newName[0].toUpperCase() + newName.slice(1);
  return newName;
}
