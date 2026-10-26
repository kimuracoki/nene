// Nene のパッケージを探す。パッケージは package.json に次のように書いた npm パッケージで、
// source のフォルダにモジュールを置く（nene-lang-ui なら src/Ui/Button.nn が Ui.Button）
//
//   "nene": { "source": "src" }
//
// プロジェクトの package.json の dependencies と devDependencies から、パッケージの依存までたどる。

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

export interface NenePackage {
  name: string;
  root: string; // モジュールを置いたフォルダ
}

interface PackageJson {
  name?: string;
  nene?: { source?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function findPackages(projectRoot: string): NenePackage[] {
  const manifest = nearestPackageJson(projectRoot);
  if (!manifest) return [];
  const found = new Map<string, NenePackage>(); // 実際の場所 → パッケージ
  const visit = (dir: string, json: PackageJson) => {
    for (const name of [...Object.keys(json.dependencies ?? {}), ...Object.keys(json.devDependencies ?? {})]) {
      const pkgDir = resolvePackage(dir, name);
      if (!pkgDir) continue;
      const real = realpathSync(pkgDir);
      if (found.has(real)) continue;
      const pkg = readJson(join(pkgDir, "package.json"));
      if (!pkg?.nene?.source) continue;
      found.set(real, { name, root: join(real, pkg.nene.source) });
      visit(pkgDir, pkg);
    }
  };
  visit(dirname(manifest), readJson(manifest) ?? {});
  return [...found.values()];
}

function nearestPackageJson(dir: string): string | null {
  for (let d = dir; ; d = dirname(d)) {
    const file = join(d, "package.json");
    if (existsSync(file)) return file;
    if (dirname(d) === d) return null;
  }
}

// Node.js と同じく、node_modules を上のフォルダへ向かって探す
function resolvePackage(from: string, name: string): string | null {
  for (let d = from; ; d = dirname(d)) {
    const dir = join(d, "node_modules", name);
    if (existsSync(join(dir, "package.json"))) return dir;
    if (dirname(d) === d) return null;
  }
}

function readJson(file: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
