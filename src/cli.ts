#!/usr/bin/env node
// tufa コマンド
//
//   tufa new <名前>      新しいプロジェクトを作る
//   tufa dev            開発サーバーを起動する（保存すると自動で再読み込み）
//   tufa build          dist/ に出力する
//   tufa check [File]   型検査だけを行う（省略すると index.html の入口から）
//   tufa lsp            言語サーバーを起動する（エディタから使う）
//
// dev と build は内部で Vite を使う。vite.config があれば、その設定も読み込む。

import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileProgram } from "./compiler.ts";
import { CompileError } from "./syntax.ts";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");

function usage(): never {
  console.error(`使い方:
  tufa new <名前>      新しいプロジェクトを作る
  tufa dev            開発サーバーを起動する
  tufa build          dist/ に出力する
  tufa check [File]   型検査だけを行う
  tufa lsp            言語サーバーを起動する`);
  process.exit(2);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function option(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? usage()) : null;
}

function report(e: unknown): never {
  if (!(e instanceof CompileError)) throw e;
  for (const err of e.all) console.error(`エラー ${err.format()}`);
  process.exit(1);
}

// index.html の <script src="/src/Main.tufa"> から入口のファイルを探す
function entries(root: string): string[] {
  const html = join(root, "index.html");
  if (!existsSync(html)) fail("index.html が見つかりません。プロジェクトのフォルダで実行してください（新しく作るときは tufa new <名前>）");
  const srcs = [...readFileSync(html, "utf8").matchAll(/<script[^>]*src="([^"]+\.tufa)"/g)].map((m) => m[1]);
  if (srcs.length === 0) fail("index.html に .tufa を読み込む <script> がありません");
  return srcs.map((src) => join(root, src.replace(/^\//, "")));
}

async function viteOptions(root: string) {
  const { default: tufa } = await import("./vite.ts");
  return { root, plugins: [tufa()], logLevel: "info" as const };
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "new": {
    const name = args[0] ?? usage();
    const dir = resolve(name);
    if (existsSync(dir) && readdirSync(dir).length > 0) fail(`${name} はすでにあり、空ではありません`);
    const version = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version;
    // npm から入れたものではなく手元のリポジトリから動かしているときは、そのリポジトリを依存先にする
    const real = realpathSync(packageRoot);
    const local = !real.split(/[\\/]/).includes("node_modules");
    const dependency = local ? `file:${real}` : `^${version}`;
    copyTemplate(join(packageRoot, "template"), dir, { name: basename(dir), dependency });
    if (local) console.log(`（手元の ${real} を使うプロジェクトとして作ります）\n`);
    console.log(`${name} を作りました。

  cd ${relative(process.cwd(), dir) || "."}
  npm install
  npm run dev
`);
    break;
  }
  case "dev": {
    const { createServer } = await import("vite");
    const root = process.cwd();
    entries(root);
    const port = Number(option(args, "--port") ?? 5173);
    const server = await createServer({ ...(await viteOptions(root)), server: { port } });
    await server.listen();
    server.printUrls();
    break;
  }
  case "build": {
    const { build } = await import("vite");
    const root = process.cwd();
    for (const entry of entries(root)) {
      try {
        compileProgram(entry);
      } catch (e) {
        report(e);
      }
    }
    await build({ ...(await viteOptions(root)), build: { outDir: option(args, "-o") ?? "dist", emptyOutDir: true } });
    break;
  }
  case "check": {
    const files = args[0] ? [resolve(args[0])] : entries(process.cwd());
    for (const file of files) {
      try {
        compileProgram(file, { requireMain: !args[0] });
      } catch (e) {
        report(e);
      }
    }
    console.log("OK");
    break;
  }
  case "lsp":
    await import("./lsp.ts");
    break;
  default:
    usage();
}

// テンプレートを写す。{{name}} などを置き換え、gitignore は .gitignore にする
// （npm はパッケージに .gitignore を含めないため、テンプレートでは名前を変えてある）
function copyTemplate(from: string, to: string, vars: Record<string, string>) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dest = join(to, entry === "gitignore" ? ".gitignore" : entry);
    if (statSync(src).isDirectory()) {
      copyTemplate(src, dest, vars);
    } else {
      const text = readFileSync(src, "utf8").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
      writeFileSync(dest, text);
    }
  }
}
