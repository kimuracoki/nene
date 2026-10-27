import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { SourceMap } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundle, bundleWithMap, compileProgram } from "../src/compiler.ts";

const MAIN = `module Main (main) where

view :: Int -> Html ()
view n =
  <p>{label}</p>
  where
    label = greet "ねね"

greet :: String -> String
greet name = "こんにちは、" ++ name

main :: Program Int ()
main = App.app { init = 0, update = always identity, view }
`;

// 生成したコードの中の needle の位置（0 から数えた行と列）
function at(code: string, needle: string) {
  const before = code.slice(0, code.indexOf(needle)).split("\n");
  return { line: before.length - 1, col: before[before.length - 1].length };
}

test("ソースマップは、生成したコードの位置を .nn の行と列に対応づける", () => {
  const dir = mkdtempSync(join(tmpdir(), "nene-map-"));
  mkdirSync(join(dir, "src"));
  const file = join(dir, "src", "Main.nn");
  writeFileSync(file, MAIN);
  const result = compileProgram(file);
  const { code, map } = bundleWithMap(result);

  // 印を取り除いたコードは、ソースマップなしのものと同じ
  assert.equal(code, bundle(result));
  assert.ok(!code.includes("\u0001"));
  assert.ok(map.sources.includes(file));

  const sm = new SourceMap(map);
  const lit = at(code, '"こんにちは、"');
  const entry = sm.findEntry(lit.line, lit.col) as { originalSource: string; originalLine: number; originalColumn: number };
  assert.equal(entry.originalSource, file);
  // greet name = "こんにちは、" ++ name の文字列は 10 行目の 14 文字目
  assert.equal(entry.originalLine, 9);
  assert.equal(entry.originalColumn, 13);
});
