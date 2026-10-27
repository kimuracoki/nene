// nene-lang・nene-lang-ui・create-nene-lang を、いつも同じ版で出す
//
//   npm run release         公開済みの版なら 1 つ上げて（0.1.3 → 0.1.4）コミット・push し、
//                           nene-lang → nene-lang-ui → create-nene-lang の順に公開する
//   npm run bump -- 0.2.0   版を指定して上げるときだけ使う
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
    execFileSync("npm", ["view", `${name}@${version}`, "version", "--prefer-online"], { stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

// 公開した直後は npm の配信に届いていないことがある。次のパッケージ（これに依存するもの）を出す前に、
// 取得できるようになるまで待つ。待たないと、npm create が「その版は見つからない」で失敗する
function waitUntilPublished(name, version) {
  const LIMIT_SECONDS = 300;
  process.stdout.write(`${name}@${version} が npm から取得できるようになるのを待っています`);
  for (let waited = 0; waited < LIMIT_SECONDS; waited += 5) {
    if (published(name, version)) {
      console.log(" … OK");
      return;
    }
    process.stdout.write(".");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
  throw new Error(`${LIMIT_SECONDS} 秒待っても ${name}@${version} が取得できません。しばらくしてから npm run release をもう一度実行してください（公開済みのものは飛ばします）`);
}

function release() {
  const versions = new Set(PACKAGES.map((dir) => read(dir).version));
  if (versions.size !== 1) throw new Error(`版がそろっていません（${[...versions].join("、")}）。npm run bump -- <版> でそろえてください`);
  // 3 つとも公開済みなら、次の版にしてから出す（途中で失敗したときは、版を変えずに残りを出す）
  if (PACKAGES.every((dir) => published(read(dir).name, read(dir).version))) {
    const [major, minor, patch] = [...versions][0].split(".").map(Number);
    const next = `${major}.${minor}.${patch + 1}`;
    bump(next);
    const files = PACKAGES.map((dir) => join(dir, "package.json"));
    execFileSync("git", ["commit", "-m", next, "--", ...files], { cwd: root, stdio: "inherit" });
    execFileSync("git", ["push"], { cwd: root, stdio: "inherit" });
  }
  for (const dir of PACKAGES) {
    const { name, version } = read(dir);
    if (published(name, version)) {
      console.log(`${name}@${version} は公開済み`);
      continue;
    }
    console.log(`\n${name}@${version} を公開します`);
    execFileSync("npm", ["publish", "--auth-type=web"], { cwd: join(root, dir), stdio: "inherit" });
    waitUntilPublished(name, version);
  }
}

const [command, arg] = process.argv.slice(2);
if (command === "bump") bump(arg);
else if (command === "release") release();
else throw new Error("使い方: node scripts/release.mjs bump <版> | release");
