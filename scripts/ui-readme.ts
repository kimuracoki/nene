// nene-lang-ui の README の「部品ごとの使い方」と「アイコン」を、部品のファイルから作り直す
//
//   node scripts/ui-readme.ts
//
// 各部品のファイルの先頭のコメント（使い方の例）と、export している型（属性と既定値）を写す。
// 部品を変えたらこれを実行する（test/ui.test.ts が、README が古くないかを確かめる）。
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ui = join(import.meta.dirname, "..", "ui");
const readmePath = join(ui, "README.md");
const BEGIN = "<!-- ここから下は scripts/ui-readme.ts が部品のファイルから作る。直接は直さない -->";

// README の「部品」の表に並べた順に、部品のモジュール名を返す
function modules(readme: string): string[] {
  return [...readme.matchAll(/^\| `Ui\.(\w+)` \|/gm)].map((m) => m[1]);
}

// 先頭のコメントを、説明の文と例のコードに分ける（「--   」のように字下げした行が例）
function header(source: string): string {
  const lines: string[] = [];
  for (const line of source.split("\n")) {
    if (!line.startsWith("--")) break;
    lines.push(line.replace(/^-- ?/, ""));
  }
  const out: string[] = [];
  let code: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("  ")) {
      (code ??= []).push(line.slice(2));
      continue;
    }
    if (code !== null) {
      out.push("```haskell", ...code, "```");
      code = null;
    }
    // 説明の 1 行ずつを段落にする（Markdown は続いた行を 1 つの文につなげてしまう）
    out.push(line, "");
  }
  if (code !== null) out.push("```haskell", ...code, "```");
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// export している型（大文字の名前）の定義を、ソースのまま取り出す
function types(source: string): string[] {
  const exports = source.match(/^module [\w.]+ \(([^)]*(?:\([^)]*\)[^)]*)*)\) where/m)![1];
  const names = exports.split(",").map((s) => s.trim().replace(/\(\.\.\)$/, "")).filter((s) => /^[A-Z]/.test(s));
  const lines = source.split("\n");
  return names.map((name) => {
    const start = lines.findIndex((l) => new RegExp(`^(type|data) ${name}\\b`).test(l));
    if (start < 0) throw new Error(`${name} の定義が見つかりません`);
    let end = start + 1;
    while (end < lines.length && /^\s/.test(lines[end]) && lines[end].trim() !== "") end++;
    return lines.slice(start, end).join("\n");
  });
}

function icons(source: string): string {
  const rows = [...source.matchAll(/^(\w+)\s*= Icon css\.\w+\s*-- (.+)$/gm)];
  return ["| 名前 | 形 |", "| --- | --- |", ...rows.map(([, name, meaning]) => `| \`Icon.${name}\` | ${meaning.trim()} |`)].join("\n");
}

export function render(readme: string): string {
  const sections = modules(readme).map((name) => {
    const source = readFileSync(join(ui, "src", "Ui", `${name}.nn`), "utf8");
    const parts = [`### ${name}`, header(source)];
    if (name === "Icon") parts.push(icons(source));
    else parts.push("```haskell\n" + types(source).join("\n\n") + "\n```");
    return parts.join("\n\n");
  });
  const theme = types(readFileSync(join(ui, "src", "Ui", "Theme.nn"), "utf8"));
  const head = readme.includes(BEGIN) ? readme.slice(0, readme.indexOf(BEGIN)) : readme.trimEnd() + "\n\n";
  return `${head}${BEGIN}

## 部品ごとの使い方

使い方の例と、属性の型と既定値。\`=\` のあとが既定値で、既定値のない属性は必ず書く。どの部品でも使う型:

\`\`\`haskell
-- Ui.Theme
${theme.join("\n\n")}

-- 標準（Prelude）。部品の大きさには S M L を使う
data Size = None | XS | S | M | L | XL
\`\`\`

${sections.join("\n\n")}
`;
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  writeFileSync(readmePath, render(readFileSync(readmePath, "utf8")));
  console.log("ui/README.md を作り直しました");
}
