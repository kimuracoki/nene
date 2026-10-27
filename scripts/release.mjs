// nene-lang・nene-lang-ui・create-nene-lang を、いつも同じ版で出す
//
//   npm run bump -- 0.1.4   3 つの版（と、互いを指す依存）を 0.1.4 にする
//   npm run release         npm にまだない版を、nene-lang → nene-lang-ui → create-nene-lang の順に公開する
//
// create-nene-lang の版が変わらないと、npm create は前にダウンロードしたもの（古いテンプレート）を使い続ける。
// そのため、テンプレートを変えたときに限らず、毎回 3 つとも出す。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const PACKAGES = [".", "ui", "create-nene-lang"];

const manifest = (dir) => join(root, dir, "package.json");
const read = (dir) => JSON.parse(readFileSync(manifest(dir), "utf8"));
const write = (dir, pkg) => writeFileSync(manifest(dir), JSON.stringify(pkg, null, 2) + "\n");

function bump(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) throw new Error("版を 0.1.4 のように書いてください: npm run bump -- 0.1.4");
  for (const dir of PACKAGES) {
    const pkg = read(dir);
    pkg.version = version;
    if (pkg.peerDependencies?.["nene-lang"]) pkg.peerDependencies["nene-lang"] = `^${version}`;
    if (pkg.dependencies?.["nene-lang"]) pkg.dependencies["nene-lang"] = version; // create-nene-lang は同じ版の nene-lang を使う
    write(dir, pkg);
    console.log(`${pkg.name} → ${version}`);
  }
}

function published(name, version) {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version"], { stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function release() {
  const versions = new Set(PACKAGES.map((dir) => read(dir).version));
  if (versions.size !== 1) throw new Error(`版がそろっていません（${[...versions].join("、")}）。npm run bump -- <版> でそろえてください`);
  for (const dir of PACKAGES) {
    const { name, version } = read(dir);
    if (published(name, version)) {
      console.log(`${name}@${version} は公開済み`);
      continue;
    }
    console.log(`\n${name}@${version} を公開します`);
    execFileSync("npm", ["publish", "--auth-type=web"], { cwd: join(root, dir), stdio: "inherit" });
  }
}

const [command, arg] = process.argv.slice(2);
if (command === "bump") bump(arg);
else if (command === "release") release();
else throw new Error("使い方: node scripts/release.mjs bump <版> | release");
