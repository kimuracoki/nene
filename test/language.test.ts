import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, compileError, compileErrors, mainModule } from "./helpers.ts";

const app = (rest: string) =>
  mainModule(`data Msg = Noop

${rest}

main :: Program Int Msg
main = App.app { init = 0, update = always identity, view = always (<p>ok</p>) }`);

test("等式・ガード・where で書いた関数がコンパイルできる", () => {
  compile(
    app(`fact :: Int -> Int
fact 0 = 1
fact n
  | n < 0     = 0
  | otherwise = n * rest
  where
    rest = fact (n - 1)`),
  );
});

test("型注釈がなくても多相な型が推論される", () => {
  compile(
    app(`pair x = (x, x)

both = (pair 1, pair "a")`),
  );
});

test("型が合わないとエラーになる", () => {
  const msg = compileError(app(`bad :: Int
bad = "文字列"`));
  assert.match(msg, /型が合いません: String と Int/);
});

test("網羅していないパターンはエラーになり、漏れている例を示す", () => {
  const msg = compileError(
    app(`data Color3 = Red | Green | Blue

name :: Color3 -> String
name Red   = "赤"
name Green = "緑"`),
  );
  assert.match(msg, /name のパターンがすべての場合を覆っていません（例: name Blue）/);
});

test("リストのパターンの漏れも検出する", () => {
  const msg = compileError(
    app(`firstOr :: [Int] -> Int
firstOr (x : _) = x`),
  );
  assert.match(msg, /例: firstOr \[\]/);
});

test("otherwise で終わらないガードは網羅していないとみなす", () => {
  const msg = compileError(
    app(`sign :: Int -> Int
sign n
  | n > 0 = 1
  | n < 0 = -1`),
  );
  assert.match(msg, /ガードは最後を otherwise にしてください/);
});

test("if・case・let・ラムダは書けず、代わりの書き方を案内する", () => {
  assert.match(compileError(app(`f x = if x then 1 else 2`)), /ガード/);
  assert.match(compileError(app(`f x = case x of`)), /パターンマッチ/);
  assert.match(compileError(app(`f x = let y = x in y`)), /where/);
  assert.match(compileError(app(`f = map (\\x -> x) [1]`)), /ラムダ式はありません/);
});

test("JSX の {} に演算子を書くとエラーになる", () => {
  const msg = compileError(
    app(`v :: Int -> Html Msg
v n = <p>{show (n + 1)}</p>`),
  );
  assert.match(msg, /JSX の \{\} には、名前・リテラル・フィールド・1 段の関数適用だけ/);
});

test("JSX の {} に 1 段の関数適用は書ける", () => {
  compile(
    app(`v :: Int -> Html Msg
v n = <p>{show n}</p>`),
  );
});

test("存在しない HTML 属性はエラーになる", () => {
  const msg = compileError(app(`v :: Html Msg
v = <p clas="x">a</p>`));
  assert.match(msg, /<p> に属性 clas は使えません/);
});

test("イベント属性の型を検査する", () => {
  const msg = compileError(app(`v :: Html Msg
v = <input onInput={Noop} />`));
  assert.match(msg, /属性 onInput/);
});

test("style ブロックのクラスは css.名前 で使え、打ち間違いはエラーになる", () => {
  const view = (cls: string) =>
    app(`v :: Html Msg
v = <p class={look}>a</p>
  where
    look = ${cls}


style
  .item-title { color: red; }
  .done { text-decoration: line-through; }`);
  compile(view("css.itemTitle"));
  compile(view("classes [css.itemTitle, css.done]"));
  assert.match(compileError(view("css.itemTitel")), /フィールド itemTitel/);
});

test("css は style ブロックのための名前なので、自分では定義できない", () => {
  const msg = compileError(
    app(`css = 1


style
  .a { color: red; }`),
  );
  assert.match(msg, /css は style ブロックのクラスを表す名前/);
});

test("style ブロックのクラス名は、モジュールごとに区別される", () => {
  const result = compile({
    ...app(`v :: Html Msg
v = <p class={css.title}>a</p>


style
  .title { color: red; }
  body { margin: 0; }`),
  });
  const js = result.entry.js;
  assert.match(js, /\.Main__title\.tufa-Main \{ color: red; \}/);
  assert.match(js, /body \{ margin: 0; \}/);
  assert.match(js, /title: "Main__title"/);
});

test("style ブロックの中の数値や url() はクラス名とみなさない", () => {
  const js = compile(
    app(`style
  .box { padding: .5em; background: url(a.png); opacity: 0.5; }`),
  ).entry.js;
  assert.match(js, /padding: \.5em; background: url\(a\.png\); opacity: 0\.5;/);
});

test("部品の必須の属性が足りないとエラーになる", () => {
  const msg = compileError(
    app(`v :: Html Msg
v = <Badge />

badge :: { label :: String } -> Html msg
badge p = <span>{p.label}</span>`),
  );
  assert.match(msg, /<Badge> には属性 label が必要です/);
});

test("部品にない属性を渡すとエラーになる", () => {
  const msg = compileError(
    app(`v :: Html Msg
v = <Badge label="a" color={S} />

badge :: { label :: String } -> Html msg
badge p = <span>{p.label}</span>`),
  );
  assert.match(msg, /<Badge> に属性 color はありません/);
});

test("子要素を取らない部品に子要素を渡すとエラーになる", () => {
  const msg = compileError(
    app(`v :: Html Msg
v = <Badge label="a">中身</Badge>

badge :: { label :: String } -> Html msg
badge p = <span>{p.label}</span>`),
  );
  assert.match(msg, /子要素を取りません/);
});

test("Int を子要素にすると show を案内する", () => {
  const msg = compileError(app(`v :: Int -> Html Msg
v n = <p>{n}</p>`));
  assert.match(msg, /show を使ってください/);
});

test("外部からタグで使えるのは主部品だけ", () => {
  const files: Record<string, string> = {
    ...app(`v :: Html Msg
v = <Helper />`),
    Ui: `module Ui (ui, helper) where

ui :: {} -> Html msg
ui _ = <p>ui</p>

helper :: {} -> Html msg
helper _ = <p>helper</p>
`,
  };
  files.Main = files.Main.replace("module Main (main) where", "module Main (main) where\n\nimport Ui");
  assert.match(compileError(files), /部品 <Helper> が見つかりません/);
  files.Main = files.Main.replace("<Helper />", "<Ui />");
  compile(files);
});

test("デフォルト値つきの props は省略できる", () => {
  compile(
    app(`data Tone = Calm | Loud

type BadgeProps =
  { label :: String
  , tone  :: Tone = Calm
  }

badge :: BadgeProps -> Html msg
badge p = <span>{p.label}</span>

v :: Html Msg
v = <Badge label="a" />`),
  );
});

test("標準モジュールは import するとエラーになる", () => {
  const files = mainModule(`import Maybe

main :: Program Int Int
main = App.app { init = 0, update = always identity, view = always (<p>ok</p>) }`);
  assert.match(compileError(files), /Maybe は標準モジュール/);
});

test("main がないとエラーになる", () => {
  assert.match(compileError(mainModule(`x = 1`)), /main が必要です/);
});

test("型注釈より一般的に使おうとするとエラーになる", () => {
  const msg = compileError(app(`f :: a -> a
f x = x + 1`));
  assert.match(msg, /数値/);
});

test("行多相: 必要なフィールドを持つレコードなら何でも渡せる", () => {
  compile(
    app(`title r = r.title

a = title { title = "x", n = 1 }
b = title { title = "y", done = True }`),
  );
});

test("存在しないフィールドを読むとエラーになる", () => {
  const msg = compileError(app(`r = { title = "x" }

t = r.name`));
  assert.match(msg, /フィールド name/);
});

test("1 つのファイルのエラーをまとめて報告し、連鎖したエラーは出さない", () => {
  const errors = compileErrors(
    app(`a :: Int
a = "x"

b = c + 1
  where
    c = True

useA = a + 1
useB = b + 1`),
  );
  assert.equal(errors.length, 2);
  assert.match(errors[0], /String と Int/);
  assert.match(errors[1], /Bool/);
});

test("デフォルト値つきの型を取る関数にレコードを渡すと、省略したフィールドが補われる", () => {
  compile(
    mainModule(`main :: Program Int Int
main = App.app { init = 0, update = always identity, view = always (<p>ok</p>) }`),
  );
  const msg = compileError(
    mainModule(`main :: Program Int Int
main = App.app { init = 0, update = always identity, view = always (<p>ok</p>), colour = 1 }`),
  );
  assert.match(msg, /フィールド colour はありません/);
});

test("style ブロックは、そのファイルのタグにだけ効く（要素セレクタも漏れない）", () => {
  const result = compile({
    Main: `module Main (main) where

import Card

view :: Int -> Html Int
view _ =
  <section>
    <h2>Main の見出し</h2>
    <Card />
  </section>

main :: Program Int Int
main = App.app { init = 0, update = always identity, view }


style
  body { margin: 0; }
  h2 { color: red; }
`,
    Card: `module Card (card) where

card :: {} -> Html msg
card _ = <h2>Card の見出し</h2>


style
  h2::before { content: "★"; }
`,
  });
  const main = result.modules.find((m) => m.name === "Main")!.js;
  const card = result.modules.find((m) => m.name === "Card")!.js;
  // セレクタは、それぞれのファイルの印にだけ当たる
  assert.match(main, /h2\.tufa-Main \{ color: red; \}/);
  assert.match(main, /body \{ margin: 0; \}/);
  assert.match(card, /h2\.tufa-Card::before/);
  // タグにはそのファイルの印が付き、ほかのファイルの部品には付かない
  assert.match(main, /\$rt\.h\("h2", \{\}, \["Main の見出し"\], "tufa-Main"\)/);
  assert.doesNotMatch(main, /\$M_Card\.card\([^)]*\)[^,]*tufa-Main/);
  assert.match(card, /\$rt\.h\("h2", \{\}, \["Card の見出し"\], "tufa-Card"\)/);
});
