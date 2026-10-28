// リファレンス（docs/reference/）を、標準ライブラリと部品のファイルのコメントから作り直す
//
//   node scripts/reference.ts           作り直す
//   node scripts/reference.ts --check   説明の抜けを一覧にする（作り直さない）
//
// 書き方の決まり（.nn のファイル）:
//   - 宣言のすぐ上（空行を挟まない）の -- が、その宣言の説明。「--   」と字下げした行は例のコードになる
//   - レコードの型のフィールドと、data 型の構成子は、行末の -- が説明
//   - 空行で区切った -- だけの行は、ページの中の見出し（Prelude の「基本」「リスト」など）
// test/reference.test.ts が、docs/reference/ が古くないかと、説明の抜けがないかを確かめる。
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { HTML_ATTR_GROUPS, HTML_ELEMENTS, STD_QUALIFIED } from "../src/checker.ts";

const root = join(import.meta.dirname, "..");
const out = join(root, "docs", "reference");
const GENERATED = "<!-- scripts/reference.ts が作る。直接は直さない -->";
const STD = ["Prelude", ...STD_QUALIFIED];
const SOURCE = "https://github.com/kimuracoki/nene/blob/main/";
export const DEMO = "https://kimuracoki.github.io/nene/demo.html";

// ---- .nn を読む ----

interface Field {
  name: string;
  type: string;
  default: string | null;
  doc: string;
}

interface Decl {
  kind: "value" | "type" | "data";
  name: string;
  code: string; // 型注釈、または型の定義
  doc: string[];
  fields: Field[]; // type のレコードのフィールド、data の構成子
  section: string | null;
}

export interface NnFile {
  module: string;
  header: string[];
  exports: string[] | null; // null ならすべて
  abstract: string[]; // 構成子を見せずに export した data 型（Dict など）
  decls: Decl[];
}

export function readNn(source: string): NnFile {
  const lines = source.split("\n");
  const moduleLine = lines.findIndex((l) => l.startsWith("module "));
  const header = lines.slice(0, moduleLine).filter((l) => l.startsWith("--")).map(uncomment);
  const head = source.slice(source.indexOf("module ")).match(/^module ([\w.]+)\s*(\(([\s\S]*?)\))?\s*where/)!;
  const items = head[3] === undefined ? null : head[3].split(",").map((s) => s.trim()).filter(Boolean);
  const exports = items === null ? null : items.map((s) => s.replace(/\(\.\.\)$/, ""));
  const decls: Decl[] = [];
  let section: string | null = null;
  let comment: string[] = [];
  for (let i = moduleLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "style") break;
    if (line.startsWith("--")) {
      comment.push(uncomment(line));
      continue;
    }
    if (line.trim() === "") {
      // 空行の前で終わるコメントは、ページの中の見出し
      if (comment.length > 0) section = comment.join(" ").replace(/（.*?）/g, "").trim();
      comment = [];
      continue;
    }
    const value = line.match(/^(?:foreign import )?([a-z]\w*'*) ::(.*)$/);
    const type = line.match(/^(type|data) ([A-Z]\w*)/);
    if (value) {
      const code = `${value[1]} ::${value[2].replace(/\s*=\s*".*$/, "")}`;
      decls.push({ kind: "value", name: value[1], code, doc: comment, fields: [], section });
    } else if (type) {
      let end = i + 1;
      while (end < lines.length && /^\s/.test(lines[end]) && lines[end].trim() !== "") end++;
      const block = lines.slice(i, end);
      const kind = type[1] as "type" | "data";
      decls.push({ kind, name: type[2], code: block.map(stripComment).join("\n"), doc: comment, fields: kind === "type" ? fieldsOf(block) : ctorsOf(block), section });
      i = end - 1;
    }
    comment = [];
  }
  for (const d of decls) {
    if (d.kind === "data" && items !== null && items.includes(d.name)) {
      d.code = d.code.split("\n")[0].replace(/\s*=.*$/, ""); // 中身は見せない
      d.fields = [];
    }
  }
  const abstract = decls.filter((d) => d.kind === "data" && items?.includes(d.name)).map((d) => d.name);
  return { module: head[1], header, exports, abstract, decls };
}

const uncomment = (line: string) => line.replace(/^-- ?/, "");
const stripComment = (line: string) => line.replace(/\s+--\s.*$/, "").trimEnd();

function fieldsOf(block: string[]): Field[] {
  const out: Field[] = [];
  for (const line of block) {
    const m = line.match(/^\s*[{,]\s*(\w+)\s*::\s*(.+?)\s*(?:--\s*(.*))?$/);
    if (!m) continue;
    const [type, def] = splitDefault(m[2]);
    out.push({ name: m[1], type, default: def, doc: m[3] ?? "" });
  }
  return out;
}

// 「Bool = False」を型と既定値に分ける（型の中には = が出てこない）
function splitDefault(text: string): [string, string | null] {
  const i = text.indexOf(" = ");
  return i < 0 ? [text.trim(), null] : [text.slice(0, i).trim(), text.slice(i + 3).trim()];
}

function ctorsOf(block: string[]): Field[] {
  const text = block.map((l) => l.replace(/\s+--\s(.*)$/, " \u0000$1\u0000")).join(" ");
  const body = text.slice(text.indexOf("=") + 1);
  return body.split("|").map((part) => {
    const doc = part.match(/\u0000(.*?)\u0000/)?.[1] ?? "";
    const clean = part.replace(/\u0000.*?\u0000/g, "").trim();
    const [name, ...args] = clean.split(/\s+/);
    return { name, type: args.join(" "), default: null, doc };
  });
}

const isPublic = (file: NnFile, name: string) => file.exports === null || file.exports.includes(name);

// ---- Markdown ----

// コメントの行を、説明の段落と例のコードに分ける（「  」で始まる行が例）
function prose(lines: string[]): string {
  const parts: string[] = [];
  let code: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("  ")) {
      (code ??= []).push(line.slice(2));
      continue;
    }
    if (code !== null) {
      parts.push("```haskell\n" + code.join("\n") + "\n```");
      code = null;
    }
    // 文の中のタグ（<Row> など）は、HTML として読まれないようにコードにする
    if (line.trim() !== "") parts.push(line.replace(/<\/?[A-Za-z][^<>]*>/g, (tag) => `\`${tag}\``));
  }
  if (code !== null) parts.push("```haskell\n" + code.join("\n") + "\n```");
  return parts.join("\n\n");
}

const cell = (text: string) => text.replace(/\|/g, "\\|");
// GitHub が見出しに付ける id と同じ形（記号を除き、空白を - にする）
const anchor = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, "").replace(/ /g, "-");

// 既定値が標準ライブラリの中の名前のときは、意味で書く
const DEFAULT_LABELS: Record<string, string> = {
  noEffect: "（何もしない）",
  noSubscriptions: "（何も受け取らない）",
  noRouting: "（URL を扱わない）",
  noClass: "（なし）",
};

function fieldTable(fields: Field[], withDefault: boolean): string {
  const head = withDefault ? "| 名前 | 型 | 既定値 | 説明 |\n| --- | --- | --- | --- |" : "| 名前 | 型 | 説明 |\n| --- | --- | --- |";
  const rows = fields.map((f) => {
    const def = f.default === null ? "必須" : (DEFAULT_LABELS[f.default] ?? `\`${cell(f.default)}\``);
    return withDefault ? `| \`${f.name}\` | \`${cell(f.type)}\` | ${def} | ${cell(f.doc)} |` : `| \`${f.name}\` | \`${cell(f.type)}\` | ${cell(f.doc)} |`;
  });
  return [head, ...rows].join("\n");
}

// 型の名前から、その型を説明しているページ（docs/reference/ からの場所）
let homes: Map<string, string> | null = null;
function typeHomes(): Map<string, string> {
  if (homes) return homes;
  homes = new Map([["Maybe", "std/Maybe.md"], ["Result", "std/Result.md"]]);
  for (const m of [...STD, "Layout"]) {
    const file = readNn(readFileSync(join(root, "src", "lib", `${m}.nn`), "utf8"));
    for (const d of file.decls) if (d.kind !== "value" && isPublic(file, d.name) && !homes.has(d.name)) homes.set(m === "Prelude" ? d.name : `${m}.${d.name}`, `std/${m}.md#${anchor(d.name)}`);
  }
  for (const m of [...uiNames(), "Theme"]) {
    const file = readNn(readFileSync(join(root, "ui", "src", "Ui", `${m}.nn`), "utf8"));
    for (const d of file.decls) {
      if (d.kind === "value" || !isPublic(file, d.name) || d.name.endsWith("Props")) continue;
      homes.set(d.name, `ui/${m}.md#${anchor(d.name)}`);
      homes.set(`${m}.${d.name}`, `ui/${m}.md#${anchor(d.name)}`);
    }
  }
  return homes;
}

// 表に出てくる型のうち、説明のページがあるものへのリンク
function typeLinks(types: string[], from: string): string {
  const names = new Set<string>();
  for (const t of types) for (const [name] of t.matchAll(/[A-Z][\w]*(?:\.[A-Z]\w*)?/g)) if (typeHomes().has(name)) names.add(name);
  if (names.size === 0) return "";
  const links = [...names].map((n) => {
    const target = typeHomes().get(n)!;
    const [path, hash] = target.split("#");
    const rel = path === from ? "" : relative(dirname(from), path);
    return `[${n}](${rel}${hash ? `#${hash}` : ""})`;
  });
  return `型: ${links.join(" · ")}`;
}

function ctorTable(fields: Field[]): string {
  return ["| 構成子 | 意味 |", "| --- | --- |", ...fields.map((f) => `| \`${cell([f.name, f.type].filter(Boolean).join(" "))}\` | ${cell(f.doc)} |`)].join("\n");
}

function declSection(d: Decl, prefix: string, from: string): string {
  const title = `### ${d.name}`;
  // フィールドの表があるレコードは、型の頭だけを書く（既定値などは表に出す）
  const head = d.kind === "type" && d.fields.length > 0 ? d.code.split("\n")[0].replace(/\s*=.*$/, "") : d.code;
  const code = "```haskell\n" + (d.kind === "value" ? `${prefix}${d.code}` : head) + "\n```";
  const parts = [title, code, prose(d.doc)];
  if (d.kind === "type" && d.fields.length > 0) parts.push(fieldTable(d.fields, d.fields.some((f) => f.default !== null)), typeLinks(d.fields.map((f) => f.type), from));
  if (d.kind === "data" && d.fields.some((f) => f.doc)) parts.push(ctorTable(d.fields));
  return parts.filter(Boolean).join("\n\n");
}

// ---- ページ ----

interface Page {
  path: string; // docs/reference/ からの場所
  text: string;
  names: { name: string; link: string; kind: string }[]; // 索引に載せる名前
}

function stdPage(name: string): Page {
  const file = readNn(readFileSync(join(root, "src", "lib", `${name}.nn`), "utf8"));
  const decls = file.decls.filter((d) => isPublic(file, d.name) && !INTERNAL.includes(`${name}.${d.name}`));
  const qualified = name !== "Prelude";
  const usage = qualified
    ? `import は書かずに、\`${name}.${decls.find((d) => d.kind === "value")?.name ?? "名前"}\` のように修飾して使う。`
    : "import は書かずに、そのまま使える。";
  const sections: string[] = [];
  let current: string | null | undefined;
  for (const d of decls) {
    if (d.section !== current && d.section) sections.push(`## ${d.section}`);
    current = d.section;
    sections.push(declSection(d, "", `std/${name}.md`));
  }
  const toc = decls.map((d) => `[${d.name}](#${anchor(d.name)})`).join(" · ");
  const text = [GENERATED, `# ${name}`, prose(file.header), usage, toc, ...sections, `ソース: [src/lib/${name}.nn](${SOURCE}src/lib/${name}.nn)`].filter(Boolean).join("\n\n");
  const label = (d: Decl) => (qualified && d.kind === "value" ? `${name}.${d.name}` : d.name);
  return { path: `std/${name}.md`, text, names: decls.map((d) => ({ name: label(d), link: `std/${name}.md#${anchor(d.name)}`, kind: d.kind === "value" ? `関数（${name}）` : `型（${name}）` })) };
}

// 標準ライブラリの中だけで使う名前（export はしているが、使う人には見せない）
const INTERNAL: string[] = [];

function uiPage(name: string): Page {
  const path = join(root, "ui", "src", "Ui", `${name}.nn`);
  const file = readNn(readFileSync(path, "utf8"));
  const fn = name[0].toLowerCase() + name.slice(1);
  const main = file.decls.find((d) => d.kind === "value" && d.name === fn);
  const props = file.decls.find((d) => d.kind === "type" && d.name.endsWith("Props") && isPublic(file, d.name) && d.name.startsWith(name));
  const others = file.decls.filter((d) => d.kind !== "value" && d !== props && isPublic(file, d.name));
  const values = file.decls.filter((d) => d.kind === "value" && d !== main && isPublic(file, d.name));
  const takesChildren = main ? /\[Html msg\] -> Html msg$/.test(main.code) : false;
  const parts = [
    GENERATED,
    `# ${name}`,
    `\`import Ui.${name}\` · タグ \`<${name}${takesChildren ? `>…</${name}>` : " />"}\``,
    prose(file.header),
  ];
  // 動く見本（examples/Demo.nn）。Pages 版ではこの印の所に埋め込む
  parts.push(`<!-- demo: ${name} -->\n[動く見本を開く](${DEMO}?c=${name})`);
  if (main) parts.push("```haskell\n" + main.code + "\n```");
  const here = `ui/${name}.md`;
  if (props) parts.push("## 属性", fieldTable(props.fields, true), typeLinks(props.fields.map((f) => f.type), here), takesChildren ? "子要素を受け取る（タグの間に書いたものが中身になる）。" : "子要素は受け取らない。");
  for (const d of others) parts.push(declSection(d, "", here).replace(/^### /, "## "));
  if (values.length > 0) {
    parts.push(`## 値`, `\`import qualified Ui.${name} as ${name}\` として、\`${name}.${values[0].name}\` のように使う。`);
    parts.push(["| 名前 | 説明 |", "| --- | --- |", ...values.map((v) => `| \`${name}.${v.name}\` | ${cell(v.doc.join(" "))} |`)].join("\n"));
  }
  parts.push(`ソース: [ui/src/Ui/${name}.nn](${SOURCE}ui/src/Ui/${name}.nn)`);
  const names = [{ name: `<${name}>`, link: `ui/${name}.md`, kind: "部品" }, ...others.map((d) => ({ name: d.name, link: `ui/${name}.md#${anchor(d.name)}`, kind: `型（Ui.${name}）` }))];
  return { path: `ui/${name}.md`, text: parts.filter(Boolean).join("\n\n"), names };
}

function uiNames(): string[] {
  return readdirSync(join(root, "ui", "src", "Ui"))
    .filter((f) => f.endsWith(".nn"))
    .map((f) => f.slice(0, -3))
    .filter((n) => n !== "Theme")
    .sort();
}

// テーマ（Ui.Theme）。色の種類と、部品が使う CSS 変数
function themePage(): Page {
  const source = readFileSync(join(root, "ui", "src", "Ui", "Theme.nn"), "utf8");
  const file = readNn(source);
  const rows = [...source.matchAll(/^    (--[\w-]+): (.*?);\s*(?:\/\* (.*?) \*\/)?$/gm)].map(([, name, value, doc]) => `| \`${name}\` | \`${cell(value)}\` | ${cell(doc ?? "")} |`);
  const parts = [GENERATED, "# テーマ", "`import Ui.Theme (Tone(..))`", prose(file.header)];
  for (const d of file.decls.filter((d) => isPublic(file, d.name))) parts.push(declSection(d, "", "ui/Theme.md").replace(/^### /, "## "));
  parts.push("## CSS 変数", "アプリの入口のファイルの `style` で `:root` に書くと、すべての部品が変わる。`light-dark(ライト, ダーク)` は、画面の明るさの設定で選ばれる。", ["| 変数 | 既定値 | 意味 |", "| --- | --- | --- |", ...rows].join("\n"));
  parts.push(`ソース: [ui/src/Ui/Theme.nn](${SOURCE}ui/src/Ui/Theme.nn)`);
  const names = [{ name: "Tone", link: "ui/Theme.md#tone", kind: "型（Ui.Theme）" }, { name: "toneVars", link: "ui/Theme.md#tonevars", kind: "関数（Ui.Theme）" }, { name: "CSS 変数（テーマ）", link: "ui/Theme.md#css-変数", kind: "テーマ" }];
  return { path: "ui/Theme.md", text: parts.filter(Boolean).join("\n\n"), names };
}

function layoutPage(): Page {
  const file = readNn(readFileSync(join(root, "src", "lib", "Layout.nn"), "utf8"));
  const tags = file.decls.filter((d) => d.kind === "value" && d.name !== "noClass");
  const parts = [GENERATED, "# レイアウトタグ", prose(file.header), "並び方は、このタグだけで書く。HTML の要素は並び方を持たない（ブロック要素として縦に積まれる）。"];
  for (const tag of tags) {
    const tagName = tag.name[0].toUpperCase() + tag.name.slice(1);
    const props = file.decls.find((d) => d.kind === "type" && d.name === `${tagName}Props`);
    parts.push(`## ${tagName}`, `タグ \`<${tagName}${/\[Html msg\]/.test(tag.code) ? `>…</${tagName}>` : " />"}\``, prose(tag.doc));
    if (props && props.fields.length > 0) parts.push(fieldTable(props.fields, true), typeLinks(props.fields.map((f) => f.type), "layout.md"));
  }
  const prelude = readNn(readFileSync(join(root, "src", "lib", "Prelude.nn"), "utf8"));
  parts.push("## 属性に使う型");
  for (const name of ["Size", "Align", "Direction"]) parts.push(declSection(prelude.decls.find((d) => d.name === name)!, "", "layout.md"));
  const names = tags.map((t) => {
    const tagName = t.name[0].toUpperCase() + t.name.slice(1);
    return { name: `<${tagName}>`, link: `layout.md#${anchor(tagName)}`, kind: "レイアウトタグ" };
  });
  return { path: "layout.md", text: parts.filter(Boolean).join("\n\n"), names };
}

function htmlPage(): Page {
  const elements = [...HTML_ELEMENTS];
  const parts = [
    GENERATED,
    "# HTML の要素と属性",
    "タグの名前が小文字なら HTML の要素になる。HTML の要素は意味のために使い（見出し・リスト・ボタン・入力）、並び方は[レイアウトタグ](layout.md)で書く。ここにない要素と属性はコンパイルエラーになる。",
    "## 要素",
    ["| 要素 | 意味 |", "| --- | --- |", ...elements.map((e) => `| \`<${e}>\` | ${HTML_ELEMENT_DOCS[e] ?? ""} |`)].join("\n"),
    "## 属性",
    "`aria-*` と `data-*`（小文字とハイフン）は、どれも `String` で自由に書ける。`Bool` の属性は、値を書かずに `hidden` とだけ書くと `True` になる。",
  ];
  const rows: string[] = [];
  for (const group of HTML_ATTR_GROUPS) for (const name of group.names) rows.push(`| \`${name}\` | \`${cell(group.type)}\` | ${HTML_ATTR_DOCS[name] ?? ""} |`);
  parts.push(["| 属性 | 型 | 意味 |", "| --- | --- | --- |", ...rows].join("\n"));
  const names = [
    ...elements.map((e) => ({ name: `<${e}>`, link: "html.md#要素", kind: "HTML の要素" })),
    ...HTML_ATTR_GROUPS.flatMap((g) => g.names.map((n) => ({ name: n, link: "html.md#属性", kind: "HTML の属性" }))),
  ];
  return { path: "html.md", text: parts.join("\n\n"), names };
}

// language.md（手で書く）の「### 名前」を索引に載せる
function languageNames(): Page["names"] {
  const text = readFileSync(join(out, "language.md"), "utf8");
  return [...text.matchAll(/^### (.+)$/gm)].map((m) => ({ name: m[1], link: `language.md#${anchor(m[1])}`, kind: "書き方" }));
}

function indexPage(pages: Page[]): Page {
  const all = [...languageNames(), ...pages.flatMap((p) => p.names)];
  const key = (n: string) => n.replace(/^</, "").replace(/>$/, "").toLowerCase();
  all.sort((a, b) => key(a.name).localeCompare(key(b.name), "ja"));
  const std = STD.map((m) => `[${m}](std/${m}.md)`).join(" · ");
  const ui = uiNames().map((m) => `[${m}](ui/${m}.md)`).join(" · ");
  const text = [
    GENERATED,
    "# Nene リファレンス",
    "Nene の書き方・標準ライブラリ・部品を、名前から引ける辞書。順に読むなら[入門](../guide.md)、規則を正確に知るなら[言語仕様](../spec.md)。[Pages 版](https://kimuracoki.github.io/nene/reference/)では名前で検索でき、部品のページで動く見本を触れる。",
    "## 目次",
    `- [書き方](language.md) … 関数・パターン・ガード・where・レコード・JSX・style など\n- [レイアウトタグ](layout.md) … Row・Column・Grid・Stack・Scroll・Spacer\n- [HTML の要素と属性](html.md)\n- 標準ライブラリ: ${std}\n- 部品（nene-lang-ui）: ${ui}\n- [テーマ](ui/Theme.md) … 色の種類（Tone）と、色・形・影・文字の CSS 変数`,
    "## 索引",
    ["| 名前 | 種類 |", "| --- | --- |", ...all.map((n) => `| [\`${cell(n.name)}\`](${n.link}) | ${n.kind} |`)].join("\n"),
  ].join("\n\n");
  return { path: "README.md", text, names: [] };
}

export function pages(): Page[] {
  const generated = [layoutPage(), htmlPage(), ...STD.map(stdPage), themePage(), ...uiNames().map(uiPage)];
  return [indexPage(generated), ...generated];
}

// 説明の抜け（使う人に見える名前・属性・構成子で、説明のないもの）
export function missing(): string[] {
  const out: string[] = [];
  const check = (where: string, file: NnFile, skip: (d: Decl) => boolean) => {
    for (const d of file.decls) {
      if (!isPublic(file, d.name) || skip(d)) continue;
      const fieldsOnly = d.kind === "type" && d.fields.length > 0;
      if (d.doc.length === 0 && !fieldsOnly && !(d.kind === "data" && d.fields.every((f) => f.doc))) out.push(`${where} ${d.name}`);
      if (d.kind === "type") for (const f of d.fields) if (!f.doc) out.push(`${where} ${d.name}.${f.name}`);
      if (d.kind === "data" && d.fields.length > 1 && d.doc.length === 0) for (const f of d.fields) if (!f.doc) out.push(`${where} ${d.name}(${f.name})`);
    }
  };
  for (const m of [...STD, "Layout"]) {
    const file = readNn(readFileSync(join(root, "src", "lib", `${m}.nn`), "utf8"));
    check(`src/lib/${m}.nn`, file, (d) => INTERNAL.includes(`${m}.${d.name}`) || (m === "Layout" && (d.name === "noClass" || d.kind === "type")));
  }
  for (const m of uiNames()) {
    const file = readNn(readFileSync(join(root, "ui", "src", "Ui", `${m}.nn`), "utf8"));
    const fn = m[0].toLowerCase() + m.slice(1);
    check(`ui/src/Ui/${m}.nn`, file, (d) => d.name === fn || (m === "Icon" && d.kind === "value" && d.doc.length > 0));
  }
  for (const g of HTML_ATTR_GROUPS) for (const n of g.names) if (!HTML_ATTR_DOCS[n]) out.push(`HTML の属性 ${n}`);
  for (const e of HTML_ELEMENTS) if (!HTML_ELEMENT_DOCS[e]) out.push(`HTML の要素 ${e}`);
  return out;
}

// ---- HTML の要素と属性の説明（コンパイラの一覧に合わせる） ----

const HTML_ELEMENT_DOCS: Record<string, string> = {
  "h1": "見出し（いちばん大きい）",
  "h2": "見出し",
  "h3": "見出し",
  "h4": "見出し",
  "h5": "見出し",
  "h6": "見出し（いちばん小さい）",
  "p": "段落",
  "span": "文の一部（意味を持たない）",
  "strong": "強調（重要）",
  "em": "強調（語気）",
  "small": "注記・細目",
  "mark": "目印（検索で当たった所など）",
  "code": "コードの断片",
  "pre": "整形済みの文（空白と改行をそのまま出す）",
  "blockquote": "引用のまとまり",
  "abbr": "略語（title に正式名）",
  "time": "日付・時刻（datetime に機械が読める形）",
  "sub": "下付き文字",
  "sup": "上付き文字",
  "br": "改行",
  "hr": "話題の区切り（横線）",
  "a": "リンク。同じサイトの href は、ページを読み直さずに URL を変える",
  "ul": "順序のないリスト",
  "ol": "順序のあるリスト",
  "li": "リストの項目",
  "dl": "説明のリスト",
  "dt": "説明のリストの用語",
  "dd": "説明のリストの説明",
  "div": "まとまり（意味を持たない）",
  "section": "章・節",
  "header": "ページや節の頭",
  "footer": "ページや節の終わり",
  "main": "ページの主な中身（1 つだけ）",
  "nav": "ナビゲーション",
  "article": "独立した記事",
  "aside": "本文の脇の補足",
  "address": "連絡先",
  "figure": "図（画像・表・コード）と説明のまとまり",
  "figcaption": "図の説明",
  "img": "画像",
  "picture": "画面に合わせて画像を切り替える",
  "source": "picture・video・audio の候補",
  "video": "動画",
  "audio": "音声",
  "button": "ボタン",
  "input": "入力欄（type で種類を選ぶ）",
  "label": "入力欄の名前",
  "form": "フォーム。onSubmit は送信を止めてからメッセージを送る",
  "fieldset": "入力欄のまとまり",
  "legend": "fieldset の見出し",
  "textarea": "複数行の入力欄",
  "select": "選択肢から選ぶ欄",
  "option": "select の選択肢",
  "optgroup": "選択肢のまとまり",
  "progress": "進み具合",
  "meter": "範囲の中の量",
  "output": "計算の結果",
  "table": "表",
  "caption": "表の題",
  "colgroup": "列のまとまり",
  "col": "列",
  "thead": "表の見出しの行",
  "tbody": "表の本体",
  "tfoot": "表の終わりの行",
  "tr": "表の行",
  "th": "見出しのセル",
  "td": "セル",
  "details": "開け閉めできるまとまり（open で開く）",
  "summary": "details の見出し（押すと開け閉め）",
  "dialog": "ダイアログ（open で開く）",
};
const HTML_ATTR_DOCS: Record<string, string> = {
  "class": "style ブロックのクラス（css.名前、classes […]）",
  "vars": "CSS 変数として渡す値。フィールド名が変数名になる（barWidth → --bar-width）。style で使っていない名前はエラー",
  "key": "リストの要素を見分ける名前。並べ替えても、同じ key の要素は作り直さない",
  "id": "ページの中で 1 つだけの名前",
  "title": "マウスを載せたときに出る説明",
  "role": "支援技術に伝える役割（ARIA）",
  "lang": "中身の言語（\"ja\"、\"en\"）",
  "dir": "文字の向き（\"ltr\"、\"rtl\"）",
  "src": "画像・動画などの URL。/ で始まると、アプリの置き場所（--base）が付く",
  "srcset": "画面に合わせて選ぶ画像の候補",
  "sizes": "srcset から選ぶときの表示の幅",
  "alt": "画像の代わりの文（読み上げ・表示できないとき）",
  "href": "リンク先。/ で始まると、アプリの置き場所（--base）が付く",
  "target": "リンクを開く場所（\"_blank\" で新しいタブ）",
  "rel": "リンク先との関係（\"noopener\" など）",
  "type": "input・button の種類（\"text\"、\"checkbox\"、\"submit\" など）",
  "value": "入力欄の値。描くたびに Model の値に合わせる",
  "name": "フォームの部品の名前（ラジオボタンを 1 組にする）",
  "placeholder": "空のときに出す例",
  "for": "label が指す入力欄の id",
  "form": "属するフォームの id",
  "list": "候補（datalist）の id",
  "min": "入力できる最小値",
  "max": "入力できる最大値",
  "step": "数の刻み",
  "pattern": "入力の形（正規表現）",
  "accept": "選べるファイルの種類（\"image/*\" など）",
  "autocomplete": "ブラウザの自動入力の種類（\"email\"、\"off\" など）",
  "width": "幅（画像・動画）",
  "height": "高さ（画像・動画）",
  "loading": "画像を読み込む時（\"lazy\" で見えるまで待つ）",
  "poster": "動画の再生前に出す画像。/ で始まると、置き場所が付く",
  "datetime": "time の機械が読める日時",
  "headers": "セルに対応する見出しの id",
  "scope": "見出しのセルが指す範囲（\"col\"、\"row\"）",
  "popovertarget": "押すと開け閉めする popover の要素の id",
  "popovertargetaction": "popovertarget の動き（\"show\"、\"hide\"、\"toggle\"）",
  "tabindex": "Tab で移る順番（-1 で移らない、0 で並び順）",
  "rows": "textarea の行数",
  "cols": "textarea の 1 行の文字数",
  "colspan": "セルが横に広がる数",
  "rowspan": "セルが縦に広がる数",
  "maxlength": "入力できる最大の文字数",
  "minlength": "入力に要る最小の文字数",
  "span": "col が受け持つ列の数",
  "start": "ol の最初の番号",
  "disabled": "押せない・入力できない",
  "checked": "チェックしてあるか。描くたびに Model の値に合わせる",
  "selected": "option が選ばれているか",
  "readonly": "読むだけで変えられない",
  "required": "入力が必須",
  "multiple": "いくつも選べる",
  "hidden": "見せない",
  "autofocus": "開いたときにフォーカスする",
  "open": "details・dialog を開いているか。開け閉めしたあとも、Model の値が変わるまで保つ",
  "controls": "動画・音声の操作ボタンを出す",
  "autoplay": "自動で再生する",
  "loop": "繰り返し再生する",
  "muted": "音を消す",
  "playsinline": "スマートフォンで全画面にせずに再生する",
  "reversed": "ol の番号を逆に数える",
  "novalidate": "フォームを送るときに入力を確かめない",
  "popover": "popover にする（popovertarget のボタンで開け閉めし、外を押すか Esc で閉じる）",
  "onClick": "押したときに届くメッセージ",
  "onDoubleClick": "2 回続けて押したときに届くメッセージ",
  "onSubmit": "フォームを送ったときに届くメッセージ（ページの読み直しは止める）",
  "onFocus": "フォーカスが来たときに届くメッセージ",
  "onBlur": "フォーカスが外れたときに届くメッセージ",
  "onMouseEnter": "マウスが入ったときに届くメッセージ",
  "onMouseLeave": "マウスが出たときに届くメッセージ",
  "onInput": "打つたびに、打った後の値を受け取る",
  "onChange": "値が決まったときに、その値を受け取る（select で選んだとき）",
  "onCheck": "チェックが変わったときに、チェックしてあるかを受け取る",
};

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  if (process.argv.includes("--check")) {
    const list = missing();
    console.log(list.length === 0 ? "説明の抜けはありません" : `説明の抜け（${list.length}）:\n${list.join("\n")}`);
  } else {
    for (const dir of ["std", "ui"]) if (existsSync(join(out, dir))) rmSync(join(out, dir), { recursive: true });
    for (const page of pages()) {
      mkdirSync(join(out, page.path, ".."), { recursive: true });
      writeFileSync(join(out, page.path), page.text + "\n");
    }
    console.log("docs/reference/ を作り直しました");
  }
}
