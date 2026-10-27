import { test } from "node:test";
import assert from "node:assert/strict";
import { bundle } from "../src/compiler.ts";
import { compile, compileError, runProgram } from "./helpers.ts";

// 入力欄を見た目だけ置いたアプリ。onInput の中身はまだ書いていない
const form = {
  Main: `module Main (main) where

data Msg = Noop

main :: Program Int Msg
main = App.app { init = 0, update = always identity, view = always (<input value="" onInput={_} />) }
`,
};

test("_ はふつうはエラーになり、そこに入る型を示す", () => {
  const message = compileError(form);
  assert.match(message, /まだ書いていない所（_）が残っています/);
  assert.match(message, /String -> Msg/);
});

test("_ を許すと、入る型が結果に入る", () => {
  const program = compile(form, "Main", { holes: true });
  assert.deepEqual(program.entry.holes, [{ pos: { line: 6, col: 94 }, type: "String -> Msg" }]);
  assert.match(bundle(program), /console\.warn\("nene: まだ書いていない所（_）があります: Main 6:94（String -> Msg）"\)/);
});

test("_ が関数のときは、画面は出て、呼ばれたときに場所と型を添えて止まる", async () => {
  const errors: string[] = [];
  const app = await runProgram(compile(form, "Main", { holes: true }), {
    setup: (window) => window.addEventListener("error", (e) => errors.push(e.message)),
  });
  assert.ok(app.document.querySelector("input"));
  await app.input("input", "a");
  assert.deepEqual(errors, ["nene: Main 6:94 の _ はまだ書かれていません（ここには String -> Msg 型の値が入ります）"]);
});

test("_ が関数でなければ、通ったところで止まる", () => {
  const program = compile({ Main: form.Main.replace('value=""', "value={_}") }, "Main", { holes: true });
  assert.deepEqual(program.entry.holes.map((h) => h.type), ["String", "String -> Msg"]);
  assert.throws(() => new Function(bundle(program, { prerender: true }))(), /Main 6:83 の _ はまだ書かれていません（ここには String 型の値が入ります）/);
});
