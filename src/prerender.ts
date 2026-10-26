// 静的生成。ビルドのあとで、アプリを Node の中で動かして、ページごとの HTML を作る
//
// "/" から始めて、描いた画面の中のリンク（<a href="/...">）をたどり、たどれたページをすべて作る。
// /about は dist/about/index.html になる。データから作られるページ（/photos/123 など）のように、
// リンクでたどれない URL は、これまでどおりブラウザで組み立てる（404.html は中身の空の枠）。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { bundle, compileProgram } from "./compiler.ts";

export interface PrerenderOptions {
  outDir: string;
  entry: string; // 入口の .nn
  base: string; // 置き場所（/ や /repo/）
  env: Record<string, string>; // .env の NENE_ で始まる値
  mount?: string; // 描画先の要素の id
}

interface Runtime {
  prerender: (program: unknown, path: string) => { html: string; css: string };
}

const MAX_PAGES = 1000;

// 作ったページの URL（アプリの中のパス）を返す
export function prerenderSite(options: PrerenderOptions): string[] {
  const { outDir, base } = options;
  const mount = options.mount ?? "app";
  const shell = readFileSync(join(outDir, "index.html"), "utf8");
  const placeholder = `<div id="${mount}"></div>`;
  if (!shell.includes(placeholder)) return [];

  const code = bundle(compileProgram(options.entry), {
    mount,
    base: JSON.stringify(base),
    env: JSON.stringify(options.env),
    prerender: true,
  });
  const { rt, program } = runInNewContext(code, { URL, console }) as { rt: Runtime; program: { onUrlChange?: unknown } };

  const pages: string[] = [];
  const queue = ["/"];
  const seen = new Set(queue);
  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const path = queue.shift()!;
    const { html, css } = rt.prerender(program, path);
    const page = shell
      .replace(placeholder, `<div id="${mount}">${html}</div>`)
      .replace("</head>", `  <style data-nene-prerender>${css}</style>\n  </head>`);
    const file = join(outDir, ...path.split("/").filter(Boolean).map(decodeURIComponent), "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page);
    pages.push(path);
    // URL で画面を切り替えないアプリは、どのリンクも同じ画面なので "/" だけを作る
    if (!program.onUrlChange) break;
    for (const next of links(html, base)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return pages;
}

// HTML の中の、アプリの中へのリンクのパス（置き場所を除き、? と # の後ろも除く）
function links(html: string, base: string): string[] {
  const out: string[] = [];
  for (const [, raw] of html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    const href = raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    if (!href.startsWith(base) || href.startsWith("//")) continue;
    const path = "/" + href.slice(base.length).split(/[?#]/)[0];
    out.push(path.length > 1 ? path.replace(/\/+$/, "") : path);
  }
  return out;
}
