// .nn の整形。書いた形はなるべく保ち、次のことだけをする（何度かけても同じ結果になる）
//
//   - 行末の空白を消し、行頭のタブを 2 つの空白にする
//   - 3 行以上続く空行を 2 行にする。ファイルの最後は改行 1 つにする
//   - 続けて書いた 1 行の等式（同じ名前のもの）、ガード、レコード型のフィールドの = と :: の位置をそろえる
//
//   update Increment n = n + 1          update Increment n = n + 1
//   update Reset _ = 0          →       update Reset _     = 0
//
// style ブロックの CSS は、行末の空白を消すだけにする。

import { displayWidth } from "./report.ts";

export function format(source: string): string {
  const lines = source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^\t+/, (tabs) => "  ".repeat(tabs.length)).replace(/\s+$/, ""));
  const styleAt = lines.findIndex((l) => l === "style");
  const code = styleAt < 0 ? lines : lines.slice(0, styleAt);
  const rest = styleAt < 0 ? [] : lines.slice(styleAt);
  alignEquations(code);
  alignGuards(code);
  alignFields(code);
  const out = collapseBlankLines([...code, ...rest]);
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out.join("\n") + "\n";
}

function collapseBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  let blanks = 0;
  for (const l of lines) {
    blanks = l === "" ? blanks + 1 : 0;
    if (blanks <= 2) out.push(l);
  }
  return out;
}

// ---- そろえる ----

const MAX_PAD = 24;
const KEYWORDS = new Set(["module", "import", "foreign", "data", "type", "where", "style"]);

const indentOf = (line: string) => line.length - line.trimStart().length;

// 続く行のまとまりごとに、印（= や ::）の手前の幅をそろえる。
// split は、その行がまとまりに入るなら [印の手前, 印から後ろ] を返す
function alignRuns(lines: string[], key: (line: string) => string | null, split: (line: string) => [string, string] | null) {
  let i = 0;
  while (i < lines.length) {
    const k = key(lines[i]);
    if (k === null || split(lines[i]) === null) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < lines.length && key(lines[j]) === k && split(lines[j]) !== null) j++;
    const parts = lines.slice(i, j).map((l) => split(l)!);
    const widths = parts.map(([left]) => displayWidth(left));
    const width = Math.max(...widths);
    // 長さが大きく違うものをそろえると、空白ばかりになるのでそのままにする
    if (j - i > 1 && width - Math.min(...widths) <= MAX_PAD) {
      parts.forEach(([left, right], n) => {
        lines[i + n] = left + " ".repeat(width - displayWidth(left)) + right;
      });
    }
    i = j;
  }
}

// 同じ名前の 1 行の等式: name args = body
function alignEquations(lines: string[]) {
  const head = (line: string) => /^(\s*)([a-z_][\w']*)\s/.exec(line);
  alignRuns(
    lines,
    (line) => {
      const m = head(line);
      return m && !KEYWORDS.has(m[2]) ? `${m[1].length}:${m[2]}` : null;
    },
    (line) => {
      const parts = splitAt(line, "=");
      return parts && parts[1].trim() !== "=" ? parts : null; // 本体が次の行に続く等式はそろえない
    },
  );
}

// ガード: | 条件 = 値
function alignGuards(lines: string[]) {
  alignRuns(
    lines,
    (line) => (line.trimStart().startsWith("| ") ? String(indentOf(line)) : null),
    (line) => splitAt(line, "="),
  );
}

// レコード型のフィールド: { name :: Type = default } と , name :: Type
function alignFields(lines: string[]) {
  const isField = (line: string) => /^\s*[{,]\s*[a-z_][\w']*\s*::/.test(line);
  const key = (line: string) => (isField(line) ? String(indentOf(line)) : null);
  // :: をそろえてから、デフォルト値の = をそろえる（= のない行は、そのまま）
  const after = (line: string) => /^\s*[{,]/.exec(line)![0].length; // 先頭の { や , の次から見る
  alignRuns(lines, key, (line) => splitAt(line, "::", after(line)));
  const withDefault = (line: string) => (key(line) !== null && splitAt(line, "=", after(line)) ? key(line) : null);
  alignRuns(lines, withDefault, (line) => splitAt(line, "=", after(line)));
}

// from から後ろの、括弧と文字列の外にある、前後に空白のある mark で分ける。[mark の手前（末尾の空白を除く）, " mark 以降"]
function splitAt(line: string, mark: string, from = 0): [string, string] | null {
  let depth = 0;
  for (let i = from; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      i++;
      while (i < line.length && line[i] !== '"') i += line[i] === "\\" ? 2 : 1;
      continue;
    }
    if (c === "-" && line[i + 1] === "-") return null; // コメントの中は見ない
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (
      depth === 0 &&
      line.startsWith(mark, i) &&
      line[i - 1] === " " &&
      (line[i + mark.length] === " " || i + mark.length === line.length)
    ) {
      const left = line.slice(0, i).replace(/\s+$/, "");
      if (left.trim() === "") return null;
      return [left, " " + line.slice(i)];
    }
  }
  return null;
}
