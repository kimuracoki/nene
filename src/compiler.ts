// モジュールを依存順に読み込み、型検査して、1 つの JavaScript にまとめる

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkModule,
  RESERVED_MODULES,
  STD_QUALIFIED,
  type CompletionInfo,
  type Hole,
  type HoverInfo,
  type ModuleIface,
  type SemToken,
} from "./checker.ts";
import { generateModule, MARKS } from "./codegen.ts";
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
  holes: Hole[];
}

export interface CompileOptions {
  // エディタで編集中の内容など、ディスクの代わりに使う中身
  overrides?: Map<string, string>;
  // main を要求するか（ビルドでは true、エディタでの検査では false）
  requireMain?: boolean;
  // まだ書いていない所（_）を許すか（開発サーバーとエディタでは true）。許すと、結果の holes に入る
  holes?: boolean;
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

// プロジェクトとパッケージにあるモジュールと、そのファイル（エディタの部品の補完用）
export function listModuleFiles(root: string): { name: string; file: string }[] {
  const out = new Map<string, string>();
  for (const r of [root, ...findPackages(root).map((p) => p.root)]) {
    for (const name of modulesIn(r)) if (!out.has(name)) out.set(name, join(r, ...name.split(".")) + ".nn");
  }
  return [...out].map(([name, file]) => ({ name, file })).sort((a, b) => a.name.localeCompare(b.name));
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

// テストのフォルダ（プロジェクトの test/）なら、隣の src/ を返す
export function testedRoot(root: string): string | null {
  const src = join(dirname(root), "src");
  return basename(root) === "test" && existsSync(src) ? src : null;
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
  // test/ の下のファイルは、テストする src/ のモジュールも import できる
  const tested = testedRoot(root);

  // import したモジュールのファイルを、読み込む側のフォルダとパッケージから探す。2 か所にあればエラー
  const locate = (imp: Module["imports"][number], fromRoot: string, file: string): { file: string; root: string } => {
    const path = join(...imp.module.split(".")) + ".nn";
    const roots = [...new Set([fromRoot, ...(fromRoot === root && tested ? [tested] : []), ...packages.map((p) => p.root)])];
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
    const checked = checkModule(mod, file, { deps, builtin: false, entry: isEntry, holes: opts.holes });
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
  // true なら画面を描かず、最後の式として { rt, tests } を返す（nene test で Node から動かす）
  test?: boolean;
}

// ブラウザでそのまま動く 1 つの JavaScript にまとめる。標準ライブラリとランタイムは、使っている部分だけを入れる
export function bundle(result: ProgramResult, options: BundleOptions = {}): string {
  return bundleParts(result, options)
    .map((p) => p.code)
    .join("\n\n")
    .replace(MARKS, "") + "\n";
}

// bundle と同じものに、.nn の行と列に対応づけるソースマップをつける（開発サーバーで使う）
export function bundleWithMap(result: ProgramResult, options: BundleOptions = {}): { code: string; map: SourceMap } {
  return link(bundleParts(result, options));
}

function bundleParts(result: ProgramResult, options: BundleOptions): Part[] {
  const mount = JSON.stringify(options.mount ?? "app");
  const user = result.modules.map((m) => m.js);
  const used = usedLibraries(user);
  const lib = used.map((m) => m.js);
  const runtime = RUNTIME_PARTS.filter((p) => [...lib, ...user].some((js) => p.provides.some((name) => js.includes(`$rt.${name}`))));
  const code = (c: string): Part => ({ code: c, file: null });
  const holes = result.modules.flatMap((m) => m.holes.map((h) => `${m.name} ${h.pos.line}:${h.pos.col}（${h.type}）`));
  return [
    code("// nene が生成したコード"),
    ...(holes.length > 0 ? [code(`console.warn(${JSON.stringify(`nene: まだ書いていない所（_）があります: ${holes.join("、")}`)});`)] : []),
    code(readFileSync(RUNTIME_CORE, "utf8")),
    ...runtime.map((p) => code(readFileSync(p.file, "utf8"))),
    code(`$rt.configure({ base: ${options.base ?? '"/"'}, env: ${options.env ?? "{}"} });`),
    ...used.map((m) => ({ code: m.js, file: m.file })),
    ...result.modules.map((m) => ({ code: m.js, file: m.file })),
    code(options.test
      ? `({ rt: $rt, tests: ${result.entry.iface.js}.tests() });`
      : options.prerender
      ? `({ rt: $rt, program: ${result.entry.iface.js}.main() });`
      : `$rt.run(${result.entry.iface.js}.main(), document.getElementById(${mount}) ?? document.body);`),
  ];
}

// ---- ソースマップ ----

interface Part {
  code: string;
  file: string | null; // 印の位置が指す .nn（ランタイムなどは null）
}

export interface SourceMap {
  version: 3;
  file: string;
  sourceRoot: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

// 部分をつなぎ、印を取り除きながら、印のあった場所を元の .nn の位置に対応づける
function link(parts: Part[]): { code: string; map: SourceMap } {
  const sources: string[] = [];
  const lines: string[] = [];
  const mappings: string[] = [];
  // VLQ の値は、ひとつ前の区切りからの差で書く（生成側の列だけは行ごとに 0 から）
  let prevSource = 0;
  let prevLine = 0;
  let prevCol = 0;
  parts.forEach((part, i) => {
    if (i > 0) {
      lines.push("");
      mappings.push("");
    }
    const source = part.file === null ? -1 : sources.indexOf(part.file) >= 0 ? sources.indexOf(part.file) : sources.push(part.file) - 1;
    for (const raw of part.code.split("\n")) {
      let out = "";
      let last = 0;
      let prevGen = 0;
      const segments: string[] = [];
      for (const m of raw.matchAll(MARKS)) {
        out += raw.slice(last, m.index);
        last = m.index! + m[0].length;
        if (source < 0) continue;
        const line = Number(m[1]) - 1;
        const col = Number(m[2]) - 1;
        segments.push(vlq(out.length - prevGen) + vlq(source - prevSource) + vlq(line - prevLine) + vlq(col - prevCol));
        prevGen = out.length;
        prevSource = source;
        prevLine = line;
        prevCol = col;
      }
      lines.push(out + raw.slice(last));
      mappings.push(segments.join(","));
    }
  });
  const sourcesContent = sources.map((f) => readFileSync(f, "utf8"));
  return { code: lines.join("\n") + "\n", map: { version: 3, file: "", sourceRoot: "", sources, sourcesContent, names: [], mappings: mappings.join(";") } };
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function vlq(n: number): string {
  let v = n < 0 ? (-n << 1) | 1 : n << 1;
  let out = "";
  do {
    let digit = v & 31;
    v >>>= 5;
    if (v > 0) digit |= 32;
    out += BASE64[digit];
  } while (v > 0);
  return out;
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
