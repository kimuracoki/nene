// モジュールを依存順に読み込み、型検査して、1 つの JavaScript にまとめる

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkModule,
  RESERVED_MODULES,
  STD_QUALIFIED,
  type CompletionInfo,
  type HoverInfo,
  type ModuleIface,
  type SemToken,
} from "./checker.ts";
import { generateModule } from "./codegen.ts";
import { parseModule } from "./parser.ts";
import { CompileError, type Module } from "./syntax.ts";

const here = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(here, "lib");
export const RUNTIME_FILE = join(here, "..", "runtime", "runtime.js");
const LIB_ORDER = ["Prelude", "Layout", ...STD_QUALIFIED];
export const LIB_FILES = LIB_ORDER.map((name) => join(LIB_DIR, `${name}.nn`));

export interface CompiledModule {
  name: string;
  file: string;
  iface: ModuleIface;
  js: string;
  hovers: HoverInfo[];
  tokens: SemToken[];
  completion: CompletionInfo;
}

export interface CompileOptions {
  // エディタで編集中の内容など、ディスクの代わりに使う中身
  overrides?: Map<string, string>;
  // main を要求するか（ビルドでは true、エディタでの検査では false）
  requireMain?: boolean;
}

let libCache: { stamp: number; modules: CompiledModule[] } | null = null;

function libraries(): CompiledModule[] {
  // 標準ライブラリのファイルが変わったときだけ作り直す
  const stamp = Math.max(...LIB_ORDER.map((name) => statSync(join(LIB_DIR, `${name}.nn`)).mtimeMs));
  if (libCache && libCache.stamp === stamp) return libCache.modules;
  const deps = new Map<string, ModuleIface>();
  const out: CompiledModule[] = [];
  for (const name of LIB_ORDER) {
    const file = join(LIB_DIR, `${name}.nn`);
    const mod = parseModule(readFileSync(file, "utf8"), file);
    const checked = checkModule(mod, file, { deps, builtin: true, entry: false });
    deps.set(name, checked.iface);
    out.push({ name, file, js: generateModule(mod, checked), ...checked });
  }
  libCache = { stamp, modules: out };
  return out;
}

// モジュール名から、プロジェクトのルート（Ui/Button.nn なら Ui の親）を求める
export function projectRoot(file: string, moduleName: string): string {
  const depth = moduleName.split(".").length;
  let root = file;
  for (let i = 0; i < depth; i++) root = dirname(root);
  return root;
}

// プロジェクトにあるモジュール名の一覧（エディタの import の補完用）
export function listModules(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") continue;
      if (entry.isDirectory() && /^[A-Z]/.test(entry.name)) walk(join(dir, entry.name), [...prefix, entry.name]);
      else if (entry.isFile() && /^[A-Z]\w*\.nn$/.test(entry.name)) out.push([...prefix, entry.name.slice(0, -".nn".length)].join("."));
    }
  };
  walk(root, []);
  return out.sort();
}

export interface ProgramResult {
  entry: CompiledModule;
  modules: CompiledModule[]; // 標準ライブラリ以外。依存される側が先
  files: string[]; // 読み込んだユーザーのファイル
}

// entryFile とその依存を型検査し、コードを生成する
export function compileProgram(entryFile: string, opts: CompileOptions = {}): ProgramResult {
  const read = (file: string): string => {
    const o = opts.overrides?.get(file);
    if (o !== undefined) return o;
    return readFileSync(file, "utf8");
  };

  const lib = libraries();
  const deps = new Map<string, ModuleIface>(lib.map((m) => [m.name, m.iface]));
  const parsed = new Map<string, { mod: Module; file: string }>();
  const order: string[] = [];
  const visiting = new Set<string>();

  const entrySource = read(entryFile);
  const entryMod = parseModule(entrySource, entryFile);
  const entryName = entryMod.name;
  // Ui.Button なら、Ui/Button.nn の 2 つ上がプロジェクトのルート
  const segments = entryName.split(".");
  const expectedPath = join(...segments) + ".nn";
  if (!entryFile.endsWith(expectedPath) || basename(entryFile) !== `${segments[segments.length - 1]}.nn`) {
    throw new CompileError(`モジュール名とファイルの場所が合いません（${expectedPath} にしてください）`, entryMod.pos, entryFile);
  }
  const root = entryFile.slice(0, entryFile.length - expectedPath.length) || ".";

  const visit = (name: string, mod: Module, file: string) => {
    if (parsed.has(name)) return;
    visiting.add(name);
    for (const imp of mod.imports) {
      if (RESERVED_MODULES.includes(imp.module)) continue; // checker が詳しいエラーを出す
      if (visiting.has(imp.module)) {
        throw new CompileError(`モジュールが循環して import されています（${name} → ${imp.module}）`, imp.pos, file);
      }
      if (parsed.has(imp.module)) continue;
      const depFile = join(root, ...imp.module.split(".")) + ".nn";
      if (!opts.overrides?.has(depFile) && !existsSync(depFile)) {
        throw new CompileError(`モジュール ${imp.module} が見つかりません（${relative(root, depFile)}）`, imp.pos, file);
      }
      const depMod = parseModule(read(depFile), depFile);
      if (depMod.name !== imp.module) {
        throw new CompileError(`モジュール名はファイル名と同じ ${imp.module} にしてください`, depMod.pos, depFile);
      }
      visit(imp.module, depMod, depFile);
    }
    visiting.delete(name);
    parsed.set(name, { mod, file });
    order.push(name);
  };
  if (RESERVED_MODULES.includes(entryName)) {
    throw new CompileError(`${entryName} は標準モジュールの名前なので使えません`, entryMod.pos, entryFile);
  }
  visit(entryName, entryMod, entryFile);

  const modules: CompiledModule[] = [];
  for (const name of order) {
    const { mod, file } = parsed.get(name)!;
    if (RESERVED_MODULES.includes(name)) {
      throw new CompileError(`${name} は標準モジュールの名前なので使えません`, mod.pos, file);
    }
    const isEntry = name === entryName && (opts.requireMain ?? true);
    const checked = checkModule(mod, file, { deps, builtin: false, entry: isEntry });
    deps.set(name, checked.iface);
    modules.push({ name, file, js: generateModule(mod, checked), ...checked });
  }
  return { entry: modules[modules.length - 1], modules, files: modules.map((m) => m.file) };
}

// ブラウザでそのまま動く 1 つの JavaScript にまとめる
export function bundle(result: ProgramResult, mount = "app"): string {
  const runtime = readFileSync(RUNTIME_FILE, "utf8");
  const parts = [
    "// nene が生成したコード",
    runtime,
    ...libraries().map((m) => m.js),
    ...result.modules.map((m) => m.js),
    `$rt.run(${result.entry.iface.js}.main(), document.getElementById(${JSON.stringify(mount)}) ?? document.body);`,
  ];
  return parts.join("\n\n") + "\n";
}

export function htmlPage(title: string, script: string): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${script}"></script>
  </body>
</html>
`;
}
