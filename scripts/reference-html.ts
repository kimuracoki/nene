// リファレンス（docs/reference/ の Markdown）を、GitHub Pages に置く HTML にする
//
//   node scripts/reference-html.ts <出力先>     例: node scripts/reference-html.ts dist/pages/reference
//
// 部品のページには、動く見本（examples/Demo.nn）を埋め込む。左には目次、上には名前の検索を置く。
// Markdown は、scripts/reference.ts と language.md が使う形（見出し・段落・コード・表・箇条書き・リンク）だけを読む。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { DEMO, pages } from "./reference.ts";

const root = join(import.meta.dirname, "..");
const SOURCE = "https://github.com/kimuracoki/nene/blob/main/docs/";

// 見本を埋め込む枠の高さ（中身の大きい部品だけ高くする）
const DEMO_HEIGHTS: Record<string, number> = {
  Calendar: 420, DatePicker: 460, TransferList: 360, Table: 300, Dialog: 320, Drawer: 360, Menu: 280, Popover: 240,
  Autocomplete: 360, MultiAutocomplete: 380, SpeedDial: 300, Select: 300, TextField: 300, Carousel: 300, Snackbar: 200,
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// GitHub が見出しに付ける id と同じ形
function slug(text: string): string {
  return text.replace(/`/g, "").toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, "").replace(/ /g, "-");
}

// docs/reference/ からの場所を、from のページからのリンクにする
const fromRoot = (path: string, from: string) => link(relative(dirname(from), path.split("#")[0]) + (path.includes("#") ? `#${path.split("#")[1]}` : ""), from);

function link(href: string, from: string): string {
  if (/^https?:/.test(href)) return href;
  const [path, hash] = href.split("#");
  const suffix = hash ? `#${hash}` : "";
  if (path === "") return suffix;
  const target = join(dirname(from), path);
  if (target.startsWith("..")) return SOURCE + target.replace(/^\.\.\//, "").replace(/^\.\.$/, "") + suffix; // docs/ の入門や仕様は GitHub へ
  return relative(dirname(from), target).replace(/\.md$/, ".html").replace(/(^|\/)README\.html$/, "$1index.html") + suffix;
}

function inline(text: string, from: string): string {
  const parts = text.split(/(`[^`]*`)/);
  return parts
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return `<code>${escape(part.slice(1, -1))}</code>`;
      return escape(part)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${escape(link(href.replace(/&amp;/g, "&"), from))}">${label}</a>`)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    })
    .join("")
    .replace(/<a href="([^"]*)"><code>/g, '<a href="$1"><code>'); // [`名前`](…) の形
}

// 表の 1 行を、\| を残してセルに分ける
const cells = (line: string) => line.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));

export function render(markdown: string, from: string): { title: string; body: string } {
  const lines = markdown.split("\n");
  const out: string[] = [];
  const seen = new Map<string, number>();
  let title = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const demo = line.match(/^<!-- demo: (\w+) -->$/);
    if (demo) {
      const src = `${relative(dirname(join("reference", from)), "demo.html")}?c=${demo[1]}`;
      out.push(`<figure class="demo"><iframe src="${src}" title="${demo[1]} の動く見本" loading="lazy" style="height: ${DEMO_HEIGHTS[demo[1]] ?? 160}px"></iframe><figcaption>動く見本。押したり打ったりできる（<a href="${src}">別に開く</a>）</figcaption></figure>`);
      i++; // 続く「動く見本を開く」のリンクは、Pages では埋め込みで足りる
      continue;
    }
    if (line.startsWith("<!--") || line.trim() === "") continue;
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      const base = slug(heading[2]);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      if (level === 1) title = heading[2].replace(/`/g, "");
      out.push(`<h${level} id="${escape(id)}">${inline(heading[2], from)}${level > 1 ? ` <a class="anchor" href="#${escape(id)}" aria-label="この見出しへのリンク">#</a>` : ""}</h${level}>`);
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      out.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (line.startsWith("|")) {
      const head = cells(line);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && lines[i].startsWith("|"); i++) rows.push(cells(lines[i]));
      i--;
      const th = head.map((c) => `<th>${inline(c, from)}</th>`).join("");
      const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, from)}</td>`).join("")}</tr>`).join("\n");
      out.push(`<div class="table"><table><thead><tr>${th}</tr></thead><tbody>\n${tr}\n</tbody></table></div>`);
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      for (; i < lines.length && lines[i].startsWith("- "); i++) items.push(`<li>${inline(lines[i].slice(2), from)}</li>`);
      i--;
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    const para: string[] = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !/^(#|```|\||- |<!--)/.test(lines[i + 1])) para.push(lines[++i]);
    out.push(`<p>${inline(para.join(" "), from)}</p>`);
  }
  return { title, body: out.join("\n") };
}

function page(title: string, body: string, from: string, nav: string, index: string): string {
  const home = relative(dirname(from), "README.md").replace(/README\.md$/, "index.html");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title === "Nene リファレンス" ? title : `${escape(title)} — Nene リファレンス`}</title>
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="${home}">Nene リファレンス</a>
  <input class="search" type="search" placeholder="名前で探す（List.map、Button、onClick…）" aria-label="名前で探す" data-home="${home}">
  <a class="github" href="${SOURCE}reference/${from}">GitHub で見る</a>
</header>
<div class="layout">
  <nav class="side">${nav}</nav>
  <main class="content">
${body}
  </main>
</div>
<ul class="results" hidden></ul>
<script>window.NENE_INDEX = ${index};</script>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

// 左の目次（索引のページの「目次」の節と同じ中身を、ページごとの場所に合わせて書く）
function navFor(from: string, sections: { label: string; items: [string, string][] }[]): string {
  return sections
    .map((s) => `<p class="side-title">${escape(s.label)}</p><ul>${s.items.map(([label, path]) => `<li><a href="${fromRoot(path, from)}"${path === from ? ' aria-current="page"' : ""}>${escape(label)}</a></li>`).join("")}</ul>`)
    .join("");
}

export function writeHtml(outDir: string) {
  const all = pages();
  const language = { path: "language.md", text: readFileSync(join(root, "docs", "reference", "language.md"), "utf8") };
  const files = [...all.map((p) => ({ path: p.path, text: p.text })), language];
  const std = all.filter((p) => p.path.startsWith("std/")).map((p) => [p.path.slice(4, -3), p.path] as [string, string]);
  const ui = all.filter((p) => p.path.startsWith("ui/") && p.path !== "ui/Theme.md").map((p) => [p.path.slice(3, -3), p.path] as [string, string]);
  const sections = [
    { label: "はじめに", items: [["索引", "README.md"], ["書き方", "language.md"], ["レイアウトタグ", "layout.md"], ["HTML の要素と属性", "html.md"], ["テーマ", "ui/Theme.md"]] as [string, string][] },
    { label: "標準ライブラリ", items: std },
    { label: "部品", items: ui },
  ];
  const names = all.flatMap((p) => p.names);
  const languageEntries = [...language.text.matchAll(/^### (.+)$/gm)].map((m) => ({ name: m[1], link: `language.md#${slug(m[1])}`, kind: "書き方" }));
  for (const f of files) {
    const { title, body } = render(f.text, f.path);
    const index = JSON.stringify([...languageEntries, ...names].map((n) => [n.name, fromRoot(n.link, f.path), n.kind]));
    const target = join(outDir, f.path.replace(/README\.md$/, "index.html").replace(/\.md$/, ".html"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, page(title, body, f.path, navFor(f.path, sections), index));
  }
}

const CSS = `
:root { color-scheme: light dark; --bg: #ffffff; --text: #1f2328; --muted: #59636e; --line: #d1d9e0; --soft: #f6f8fa; --accent: #1976d2; --code: #f2f4f7; }
@media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --text: #e6edf3; --muted: #9198a1; --line: #30363d; --soft: #151b23; --accent: #90caf9; --code: #1c2128; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.75 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.top { position: sticky; top: 0; z-index: 2; display: flex; gap: 16px; align-items: center; padding: 10px 20px; background: var(--bg); border-bottom: 1px solid var(--line); }
.brand { font-weight: 700; color: var(--text); white-space: nowrap; }
.search { flex: 1; max-width: 480px; padding: 7px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); color: var(--text); font: inherit; }
.github { margin-left: auto; white-space: nowrap; font-size: 14px; }
.layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); max-width: 1280px; margin: 0 auto; }
.side { position: sticky; top: 53px; align-self: start; max-height: calc(100vh - 53px); overflow-y: auto; padding: 16px 12px 48px 20px; border-right: 1px solid var(--line); font-size: 14px; }
.side ul { list-style: none; margin: 0 0 16px; padding: 0; }
.side li a { display: block; padding: 2px 8px; border-radius: 6px; color: var(--text); }
.side li a:hover { background: var(--soft); text-decoration: none; }
.side li a[aria-current] { background: var(--soft); color: var(--accent); font-weight: 600; }
.side-title { margin: 8px 0 4px; padding: 0 8px; color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: .04em; }
.content { min-width: 0; padding: 24px 40px 96px; }
h1 { margin: 0 0 16px; font-size: 32px; line-height: 1.3; }
h2 { margin: 40px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--line); font-size: 22px; }
h3 { margin: 32px 0 8px; font-size: 18px; }
h2, h3 { scroll-margin-top: 64px; }
.anchor { margin-left: 6px; color: var(--muted); opacity: 0; font-weight: 400; }
h2:hover .anchor, h3:hover .anchor { opacity: 1; }
p { margin: 8px 0; }
code { padding: 1px 5px; border-radius: 5px; background: var(--code); font: 13.5px ui-monospace, "SF Mono", Menlo, monospace; }
pre { margin: 12px 0; padding: 14px 16px; overflow-x: auto; border-radius: 8px; background: var(--code); line-height: 1.6; }
pre code { padding: 0; background: none; }
.table { margin: 12px 0; overflow-x: auto; }
table { border-collapse: collapse; font-size: 14px; }
th, td { padding: 7px 12px; border: 1px solid var(--line); text-align: left; vertical-align: top; }
th { background: var(--soft); white-space: nowrap; }
td code { white-space: nowrap; }
ul { padding-left: 1.4em; }
.demo { margin: 16px 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.demo iframe { display: block; width: 100%; border: 0; }
.demo figcaption { padding: 6px 12px; border-top: 1px solid var(--line); background: var(--soft); color: var(--muted); font-size: 13px; }
.results { position: fixed; z-index: 3; top: 48px; left: 50%; translate: -50% 0; width: min(560px, calc(100vw - 32px)); max-height: 60vh; overflow-y: auto; margin: 0; padding: 6px; list-style: none; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); box-shadow: 0 12px 32px rgb(0 0 0 / .2); }
.results a { display: flex; justify-content: space-between; gap: 12px; padding: 6px 10px; border-radius: 6px; color: var(--text); }
.results a:hover, .results a[data-active] { background: var(--soft); text-decoration: none; }
.results small { color: var(--muted); }
@media (max-width: 800px) {
  .layout { grid-template-columns: 1fr; }
  .side { display: none; }
  .content { padding: 20px 16px 64px; }
  .github { display: none; }
}
`;

// 名前の検索。打つと、名前の一部に当たるものを出す。矢印キーで選び、Enter で開く
const SCRIPT = `
const input = document.querySelector(".search");
const list = document.querySelector(".results");
let hits = [];
let active = 0;
const show = () => {
  const q = input.value.trim().toLowerCase();
  if (!q) { list.hidden = true; return; }
  hits = window.NENE_INDEX.filter(([name]) => name.toLowerCase().includes(q))
    .sort((a, b) => a[0].toLowerCase().indexOf(q) - b[0].toLowerCase().indexOf(q) || a[0].length - b[0].length)
    .slice(0, 30);
  active = 0;
  list.replaceChildren(...hits.map(([name, href, kind], i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = href;
    if (i === active) a.dataset.active = "";
    const code = document.createElement("code");
    code.textContent = name;
    const small = document.createElement("small");
    small.textContent = kind;
    a.append(code, small);
    li.append(a);
    return li;
  }));
  list.hidden = hits.length === 0;
};
const mark = () => [...list.querySelectorAll("a")].forEach((a, i) => (i === active ? a.setAttribute("data-active", "") : a.removeAttribute("data-active")));
input.addEventListener("input", show);
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { active = Math.min(active + 1, hits.length - 1); mark(); e.preventDefault(); }
  else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); mark(); e.preventDefault(); }
  else if (e.key === "Enter" && hits[active]) location.href = hits[active][1];
  else if (e.key === "Escape") { input.value = ""; list.hidden = true; }
});
document.addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); } });
document.addEventListener("click", (e) => { if (!list.contains(e.target) && e.target !== input) list.hidden = true; });
`;

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const outDir = process.argv[2];
  if (!outDir) throw new Error("出力先を書いてください: node scripts/reference-html.ts dist/pages/reference");
  writeHtml(outDir);
  console.log(`${outDir} にリファレンスの HTML を書きました`);
}
