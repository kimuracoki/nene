import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { writeHtml } from "../scripts/reference-html.ts";
import { missing, pages } from "../scripts/reference.ts";
import { runExample } from "./helpers.ts";

const docs = join(import.meta.dirname, "..", "docs");
const reference = join(docs, "reference");

test("リファレンス: docs/reference/ が標準ライブラリと部品のファイルと合っている", () => {
  for (const page of pages()) {
    const actual = readFileSync(join(reference, page.path), "utf8");
    assert.equal(actual, page.text + "\n", `docs/reference/${page.path} が古くなっています。node scripts/reference.ts を実行してください`);
  }
});

test("リファレンス: 使う人に見える関数・型・属性・構成子には、どれも説明がある", () => {
  assert.deepEqual(missing(), [], "説明のないものがあります。宣言のすぐ上か行末に -- で説明を書いてください");
});

// GitHub が見出しに付ける id（同じ見出しが続くと -1, -2 を付ける）
function anchors(file: string): Set<string> {
  const seen = new Map<string, number>();
  const out = new Set<string>();
  let fenced = false;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    const m = !fenced && line.match(/^#{1,6} (.+)$/);
    if (!m) continue;
    const base = m[1].replace(/`/g, "").toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, "").replace(/ /g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

test("リファレンス: ページの中のリンクが、どれもあるページと見出しを指している", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".md")) files.push(path);
    }
  };
  walk(reference);
  const broken: string[] = [];
  for (const file of files) {
    for (const [, target] of readFileSync(file, "utf8").matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^https?:/.test(target)) continue;
      const [path, hash] = target.split("#");
      const to = path === "" ? file : resolve(dirname(file), path);
      let ok: boolean;
      try {
        ok = hash === undefined || anchors(to).has(decodeURIComponent(hash));
      } catch {
        ok = false;
      }
      if (!ok) broken.push(`${file.slice(docs.length + 1)} → ${target}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("リファレンス: どの部品にも動く見本（examples/Demo.nn）がある", async () => {
  const components = pages().filter((p) => p.path.startsWith("ui/") && p.path !== "ui/Theme.md").map((p) => p.path.slice(3, -3));
  for (const name of components) {
    const app = await runExample("Demo", { url: `http://localhost/demo.html?c=${name}` });
    await app.frame();
    assert.doesNotMatch(app.text(), /見本がありません/, `${name} の見本を examples/Demo.nn に足してください`);
  }
});

test("リファレンス: Pages 版の HTML の中のリンクが、どれも作ったページと見出しを指している", () => {
  const dir = mkdtempSync(join(tmpdir(), "nene-reference-"));
  writeHtml(dir);
  const files = new Map<string, string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.set(path, readFileSync(path, "utf8"));
    }
  };
  walk(dir);
  const broken: string[] = [];
  for (const [file, html] of files) {
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^https?:/.test(href) || href.includes("demo.html")) continue;
      const [path, hash] = href.split("#");
      const target = path === "" ? file : resolve(dirname(file), path);
      const page = files.get(target);
      if (page === undefined || (hash && !page.includes(`id="${decodeURIComponent(hash)}"`))) broken.push(`${file.slice(dir.length + 1)} → ${href}`);
    }
  }
  assert.ok(files.get(join(dir, "ui", "Button.html"))?.includes('<iframe src="../../demo.html?c=Button"'));
  assert.deepEqual(broken, []);
});
