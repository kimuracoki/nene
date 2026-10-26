#!/usr/bin/env node
// nene コマンド。dev・build・preview は内部で Vite を使い、vite.config があればその設定も読み込む

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileProgram } from "./compiler.ts";
import { prerenderSite } from "./prerender.ts";
import { displayWidth, formatError } from "./report.ts";
import { CompileError } from "./syntax.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const version: string = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version;
const color = process.stderr.isTTY && !process.env.NO_COLOR;
const paint = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);

interface Command {
  usage: string;
  summary: string;
  run: (args: string[]) => Promise<void> | void;
}

const commands: Record<string, Command> = {
  new: {
    usage: "new <名前>",
    summary: "新しいプロジェクトを作る",
    run: (args) => createProject(args[0] ?? usage()),
  },
  dev: {
    usage: "dev [--port 5173]",
    summary: "開発サーバーを起動する（保存すると自動で再読み込み）",
    run: async (args) => {
      const { createServer } = await import("vite");
      const root = projectDir();
      const server = await createServer({ ...(await viteOptions(root)), server: { port: port(args, 5173) } });
      await server.listen();
      server.printUrls();
    },
  },
  build: {
    usage: "build [--base /repo/] [--out dist]",
    summary: "公開用のファイルを出力する",
    run: async (args) => {
      const { build, loadEnv } = await import("vite");
      const root = projectDir();
      const [entry] = entries(root);
      checkAll(entries(root));
      const outDir = resolve(root, option(args, "--out") ?? "dist");
      const base = normalizeBase(option(args, "--base") ?? "/");
      await build({ ...(await viteOptions(root)), base, build: { outDir, emptyOutDir: true } });
      writeFallbacks(outDir, base);
      const pages = prerenderSite({ outDir, entry, base, env: loadEnv("production", root, "NENE_") });
      const where = relative(process.cwd(), outDir) || ".";
      console.log(`\n${paint("32", "✓")} ${where}/ に出力しました（置き場所: ${base}、HTML にしたページ: ${pages.length}）`);
    },
  },
  preview: {
    usage: "preview [--port 4173]",
    summary: "build で出力したものを、公開したときと同じように手元で動かす",
    run: async (args) => {
      const { preview } = await import("vite");
      const root = projectDir();
      const outDir = resolve(root, option(args, "--out") ?? "dist");
      if (!existsSync(join(outDir, "index.html"))) fail("まだ出力がありません。先に nene build を実行してください");
      const options = { ...(await viteOptions(root)), base: builtBase(outDir), build: { outDir } };
      const server = await preview({ ...options, preview: { port: port(args, 4173) } });
      server.printUrls();
    },
  },
  check: {
    usage: "check [File]",
    summary: "型検査だけを行う（省略すると index.html の入口から）",
    run: (args) => {
      if (args[0]) checkAll([resolve(args[0])], false);
      else checkAll(entries(projectDir()));
      console.log(`${paint("32", "✓")} エラーはありません`);
    },
  },
  lsp: {
    usage: "lsp",
    summary: "言語サーバーを起動する（エディタから使う）",
    run: async () => {
      await import("./lsp.ts");
    },
  },
};

function usage(): never {
  const width = Math.max(...Object.values(commands).map((c) => displayWidth(c.usage)));
  const lines = Object.values(commands).map((c) => `  nene ${c.usage}${" ".repeat(width - displayWidth(c.usage))}  ${c.summary}`);
  console.error(`Nene ${version}\n\n使い方:\n${lines.join("\n")}`);
  process.exit(2);
}

function fail(message: string): never {
  console.error(`${paint("1;31", "エラー")} ${message}`);
  process.exit(1);
}

// ---- 引数 ----

function option(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? usage()) : null;
}

function port(args: string[], fallback: number): number {
  const p = Number(option(args, "--port") ?? fallback);
  if (!Number.isInteger(p) || p <= 0) fail("--port には数を書いてください");
  return p;
}

// 置き場所は / で始まり / で終わる形にそろえる（repo → /repo/）
function normalizeBase(base: string): string {
  const inner = base.replace(/^\/+|\/+$/g, "");
  return inner ? `/${inner}/` : "/";
}

// ---- プロジェクト ----

function projectDir(): string {
  const root = process.cwd();
  if (!existsSync(join(root, "index.html"))) {
    fail("index.html が見つかりません。プロジェクトのフォルダで実行してください（新しく作るときは nene new <名前>）");
  }
  return root;
}

// index.html の <script src="/src/Main.nn"> から入口のファイルを探す
function entries(root: string): string[] {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+\.nn)"/g)].map((m) => m[1]);
  if (srcs.length === 0) fail("index.html に .nn を読み込む <script> がありません");
  return srcs.map((src) => join(root, src.replace(/^\//, "")));
}

// 型検査をして、エラーがあれば該当する行つきで出して終わる
function checkAll(files: string[], requireMain = true) {
  const errors: CompileError[] = [];
  for (const file of files) {
    try {
      compileProgram(file, { requireMain });
    } catch (e) {
      if (!(e instanceof CompileError)) throw e;
      errors.push(...e.all);
    }
  }
  if (errors.length === 0) return;
  for (const err of errors) console.error(formatError(err, { cwd: process.cwd(), color }) + "\n");
  console.error(paint("31", `${errors.length} 個のエラーがあります`));
  process.exit(1);
}

async function viteOptions(root: string) {
  const { default: nene } = await import("./vite.ts");
  return { root, plugins: [nene()], logLevel: "info" as const };
}

// HTML にしていない URL を直接開いたときも、アプリが表示されるようにする（中身の空の枠を返す）。
// 404.html は GitHub Pages など、_redirects は Netlify や Cloudflare Pages が読む。静的生成より先に写す
function writeFallbacks(outDir: string, base: string) {
  copyFileSync(join(outDir, "index.html"), join(outDir, "404.html"));
  writeFileSync(join(outDir, "_redirects"), `${base}* ${base}404.html 200\n`);
}

// build で出力した index.html から、置き場所を読み取る（<script src="/repo/assets/...">）
function builtBase(outDir: string): string {
  const html = readFileSync(join(outDir, "index.html"), "utf8");
  return html.match(/<script[^>]*src="([^"]*\/)assets\//)?.[1] ?? "/";
}

// ---- nene new ----

function createProject(name: string) {
  const dir = resolve(name);
  if (existsSync(dir) && readdirSync(dir).length > 0) fail(`${name} はすでにあり、空ではありません`);
  // npm から入れたものではなく手元のリポジトリから動かしているときは、そのリポジトリを依存先にする
  const real = realpathSync(packageRoot);
  const local = !real.split(/[\\/]/).includes("node_modules");
  const dependency = local ? `file:${real}` : `^${version}`;
  const uiDependency = local ? `file:${join(real, "ui")}` : `^${version}`; // nene-lang-ui は nene-lang と同じ版で出す
  copyTemplate(join(packageRoot, "template"), dir, { name: basename(dir), dependency, uiDependency });
  if (local) console.log(paint("2", `（手元の ${real} を使うプロジェクトとして作ります）\n`));
  console.log(`${paint("32", "✓")} ${name} を作りました

  cd ${relative(process.cwd(), dir) || "."}
  npm install
  npm run dev
`);
}

// テンプレートを写す。文字のファイルは {{name}} などを置き換え、gitignore は .gitignore にする
// （npm はパッケージに .gitignore を含めないため、テンプレートでは名前を変えてある）
function copyTemplate(from: string, to: string, vars: Record<string, string>) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dest = join(to, entry === "gitignore" ? ".gitignore" : entry);
    if (statSync(src).isDirectory()) {
      copyTemplate(src, dest, vars);
    } else if (/\.(nn|md|json|html|svg|txt)$/.test(entry) || entry === "gitignore") {
      writeFileSync(dest, readFileSync(src, "utf8").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ""));
    } else {
      copyFileSync(src, dest);
    }
  }
}

// ---- 入口 ----

const [name, ...args] = process.argv.slice(2);
if (name === "--version" || name === "-v") {
  console.log(version);
} else if (name && Object.hasOwn(commands, name)) {
  await commands[name].run(args);
} else {
  usage();
}
