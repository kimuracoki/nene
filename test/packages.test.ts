import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { compileProgram, listModules } from "../src/compiler.ts";
import { CompileError } from "../src/syntax.ts";

// ファイル名と中身の組から、一時フォルダにプロジェクトを作る
function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "nene-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

const pkg = (name: string, extra: object = {}) => JSON.stringify({ name, nene: { source: "src" }, ...extra });

const main = (imports: string, body: string) => `module Main (main) where

${imports}

main :: Program () ()
main = App.app { init = (), update = always identity, view = always (${body}) }
`;

test("node_modules の Nene パッケージのモジュールを import できる", () => {
  const dir = project({
    "package.json": JSON.stringify({ dependencies: { "nene-kit": "1.0.0" } }),
    "src/Main.nn": main("import Kit.Badge", `<Badge label="new" />`),
    "node_modules/nene-kit/package.json": pkg("nene-kit"),
    "node_modules/nene-kit/src/Kit/Badge.nn": `module Kit.Badge (badge) where

import Kit.Style

badge :: { label :: String } -> Html msg
badge props = <span class={tone}>{props.label}</span>
`,
    "node_modules/nene-kit/src/Kit/Style.nn": `module Kit.Style (tone) where

tone :: Class
tone = classes []
`,
  });
  const result = compileProgram(join(dir, "src/Main.nn"));
  assert.deepEqual(result.modules.map((m) => m.name), ["Kit.Style", "Kit.Badge", "Main"]);
  assert.deepEqual(listModules(join(dir, "src")), ["Kit.Badge", "Kit.Style", "Main"]);
});

test("パッケージの依存にある Nene パッケージもたどる", () => {
  const dir = project({
    "package.json": JSON.stringify({ dependencies: { "nene-a": "1.0.0" } }),
    "src/Main.nn": main("import A.Box", `<Box />`),
    "node_modules/nene-a/package.json": pkg("nene-a", { dependencies: { "nene-b": "1.0.0" } }),
    "node_modules/nene-a/src/A/Box.nn": `module A.Box (box) where

import B.Dot

box :: {} -> Html msg
box _ = <Dot />
`,
    "node_modules/nene-b/package.json": pkg("nene-b"),
    "node_modules/nene-b/src/B/Dot.nn": `module B.Dot (dot) where

dot :: {} -> Html msg
dot _ = <span />
`,
  });
  assert.equal(compileProgram(join(dir, "src/Main.nn")).modules.length, 3);
});

test("同じ名前のモジュールが 2 か所にあるとエラーになる", () => {
  const dir = project({
    "package.json": JSON.stringify({ dependencies: { "nene-kit": "1.0.0" } }),
    "src/Main.nn": main("import Kit.Badge", `<Badge />`),
    "src/Kit/Badge.nn": `module Kit.Badge (badge) where

badge :: {} -> Html msg
badge _ = <span />
`,
    "node_modules/nene-kit/package.json": pkg("nene-kit"),
    "node_modules/nene-kit/src/Kit/Badge.nn": `module Kit.Badge (badge) where

badge :: {} -> Html msg
badge _ = <span />
`,
  });
  assert.throws(() => compileProgram(join(dir, "src/Main.nn")), (e: unknown) => {
    assert.ok(e instanceof CompileError);
    assert.match(e.message, /Kit\.Badge が .* と nene-kit の両方にあります/);
    return true;
  });
});

test("Nene パッケージでない依存は見ない", () => {
  const dir = project({
    "package.json": JSON.stringify({ dependencies: { lodash: "1.0.0" } }),
    "src/Main.nn": main("import Lodash", `<p />`),
    "node_modules/lodash/package.json": JSON.stringify({ name: "lodash" }),
  });
  assert.throws(() => compileProgram(join(dir, "src/Main.nn")), /モジュール Lodash が見つかりません/);
});
