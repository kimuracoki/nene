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
import { findPackages } from "./packages.ts";
import { parseModule } from "./parser.ts";
import { CompileError, type Module } from "./syntax.ts";

const here = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(here, "lib");
const RUNTIME_DIR = join(here, "..", "runtime");
// ランタイムの本体と、使うアプリにだけ入れる部分（その部分が用意する $rt の名前）
const RUNTIME_CORE = join(RUNTIME_DIR, "runtime.js");
const RUNTIME_PARTS = [{ file: join(RUNTIME_DIR, "http.js"), provides: ["json", "decodeJson", "http"] }];
export const RUNTIME_FILES = [RUNTIME_CORE, ...RUNTIME_PARTS.map((p) => p.file)];
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

// プロジェクトとパッケージにあるモジュール名の一覧（エディタの import の補完用）
export function listModules(root: string): string[] {
  const names = [root, ...findPackages(root).map((p) => p.root)].flatMap(modulesIn);
  return [...new Set(names)].sort();
}

// プロジェクトの .nn ファイル（パッケージのものは含めない）
export function projectFiles(root: string): string[] {
  return modulesIn(root).map((name) => join(root, ...name.split(".")) + ".nn");
}

function modulesIn(root: string): string[] {
  if (!existsSync(root)) return [];
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
  const packages = findPackages(root);
  const exists = (file: string) => opts.overrides?.has(file) || existsSync(file);

  // import したモジュールのファイルを、読み込む側のフォルダとパッケージから探す。2 か所にあればエラー
  const locate = (imp: Module["imports"][number], fromRoot: string, file: string): { file: string; root: string } => {
    const path = join(...imp.module.split(".")) + ".nn";
    const roots = [...new Set([fromRoot, ...packages.map((p) => p.root)])];
    const hits = roots.filter((r) => exists(join(r, path)));
    const place = (r: string) => packages.find((p) => p.root === r)?.name ?? relative(root, join(r, path));
    if (hits.length === 0) {
      throw new CompileError(`モジュール ${imp.module} が見つかりません（${relative(root, join(fromRoot, path))}）`, imp.pos, file);
    }
    if (hits.length > 1) {
      throw new CompileError(`モジュール ${imp.module} が ${hits.map(place).join(" と ")} の両方にあります。どちらかの名前を変えてください`, imp.pos, file);
    }
    return { file: join(hits[0], path), root: hits[0] };
  };

  const visit = (name: string, mod: Module, file: string, modRoot: string) => {
    if (parsed.has(name)) return;
    visiting.add(name);
    for (const imp of mod.imports) {
      if (RESERVED_MODULES.includes(imp.module)) continue; // checker が詳しいエラーを出す
      if (visiting.has(imp.module)) {
        throw new CompileError(`モジュールが循環して import されています（${name} → ${imp.module}）`, imp.pos, file);
      }
      if (parsed.has(imp.module)) continue;
      const dep = locate(imp, modRoot, file);
      const depMod = parseModule(read(dep.file), dep.file);
      if (depMod.name !== imp.module) {
        throw new CompileError(`モジュール名はファイル名と同じ ${imp.module} にしてください`, depMod.pos, dep.file);
      }
      visit(imp.module, depMod, dep.file, dep.root);
    }
    visiting.delete(name);
    parsed.set(name, { mod, file });
    order.push(name);
  };
  if (RESERVED_MODULES.includes(entryName)) {
    throw new CompileError(`${entryName} は標準モジュールの名前なので使えません`, entryMod.pos, entryFile);
  }
  visit(entryName, entryMod, entryFile, root);

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

export interface BundleOptions {
  mount?: string; // 描画先の要素の id
  // ランタイムに渡す設定（JS の式）。Vite からは import.meta.env を渡す
  base?: string;
  env?: string;
  // true なら画面を描かず、最後の式として { rt, program } を返す（静的生成で Node から動かす）
  prerender?: boolean;
}

// ブラウザでそのまま動く 1 つの JavaScript にまとめる。標準ライブラリとランタイムは、使っている部分だけを入れる
export function bundle(result: ProgramResult, options: BundleOptions = {}): string {
  const mount = JSON.stringify(options.mount ?? "app");
  const user = result.modules.map((m) => m.js);
  const lib = usedLibraries(user).map((m) => m.js);
  const parts = RUNTIME_PARTS.filter((p) => [...lib, ...user].some((js) => p.provides.some((name) => js.includes(`$rt.${name}`))));
  return [
    "// nene が生成したコード",
    readFileSync(RUNTIME_CORE, "utf8"),
    ...parts.map((p) => readFileSync(p.file, "utf8")),
    `$rt.configure({ base: ${options.base ?? '"/"'}, env: ${options.env ?? "{}"} });`,
    ...lib,
    ...user,
    options.prerender
      ? `({ rt: $rt, program: ${result.entry.iface.js}.main() });`
      : `$rt.run(${result.entry.iface.js}.main(), document.getElementById(${mount}) ?? document.body);`,
  ].join("\n\n") + "\n";
}

// コードが $M_名前 で参照している標準モジュールを、たどれるだけたどって集める（読み込む順は LIB_ORDER のまま）
function usedLibraries(code: string[]): CompiledModule[] {
  const lib = libraries();
  const byJs = new Map(lib.map((m) => [m.iface.js, m]));
  const used = new Set<CompiledModule>();
  const pending = [...code];
  while (pending.length > 0) {
    for (const [ref] of pending.pop()!.matchAll(/\$M_\w+/g)) {
      const m = byJs.get(ref);
      if (m && !used.has(m)) {
        used.add(m);
        pending.push(m.js);
      }
    }
  }
  return lib.filter((m) => used.has(m));
}
