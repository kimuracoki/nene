import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { inspect, runTestFile, testFiles } from "../src/testing.ts";
import { CompileError } from "../src/syntax.ts";

// src/ と test/ のあるプロジェクトを作る
function project(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "nene-test-"));
  writeFileSync(join(dir, "package.json"), "{}");
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

const COUNTER = `module Counter (Msg(..), update) where

data Msg = Increment | Decrement

update :: Msg -> Int -> Int
update Increment n = n + 1
update Decrement n = n - 1
`;

test("test/ のファイルから src/ のモジュールを import し、等しいかを比べる", () => {
  const dir = project({
    "src/Counter.nn": COUNTER,
    "test/CounterTest.nn": `module CounterTest (tests) where

import Counter (Msg(..), update)

tests :: [Test]
tests =
  [ Test.equal "増やす" (update Increment 0) 1
  , Test.group "減らす"
      [ Test.equal "1 から" (update Decrement 1) 0
      , Test.equal "まちがい" (update Decrement 0) 1
      ]
  , Test.equal "レコード" { a = Just 1, b = ["x"] } { a = Just 1, b = ["x"] }
  ]
`,
  });
  assert.deepEqual(testFiles(dir), [join(dir, "test", "CounterTest.nn")]);
  const results = runTestFile(join(dir, "test", "CounterTest.nn"));
  assert.deepEqual(
    results.map((r) => [r.name.join(" › "), r.passed]),
    [
      ["増やす", true],
      ["減らす › 1 から", true],
      ["減らす › まちがい", false],
      ["レコード", true],
    ],
  );
  assert.equal(results[2].actual, "-1");
  assert.equal(results[2].expected, "1");
});

test("tests :: [Test] がなければ、そう知らせる", () => {
  const dir = project({ "test/Empty.nn": "module Empty (x) where\n\nx :: Int\nx = 1\n" });
  assert.throws(() => runTestFile(join(dir, "test", "Empty.nn")), (e: unknown) => e instanceof CompileError && /tests :: \[Test\]/.test(e.message));
});

test("値を Nene の書き方で表す", () => {
  assert.equal(inspect({ $: "Just", a: [{ $: "Ok", a: [-1] }] }), "Just (Ok (-1))");
  assert.equal(inspect({ page: { $: "Home" }, items: ["a", true] }), '{ page = Home, items = ["a", True] }');
  assert.equal(inspect(null), "()");
});
