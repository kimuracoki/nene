import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, compileError, mainModule } from "./helpers.ts";

const app = (rest: string) =>
  mainModule(`data Msg = Noop

${rest}

main :: Program Int Msg
main = App.sandbox { init = 0, update = always identity, view = always (<p>ok</p>) }`);

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

test("Style のフィールドとトークンを検査する", () => {
  assert.match(compileError(app(`s = Style { margin = S }`)), /Style にフィールド margin はありません/);
  assert.match(compileError(app(`s = Style { padding = Primary }`)), /Style の padding/);
  compile(app(`s = Style { padding = S, hover = Style { background = Primary } }

t = { s | radius = M }`));
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
    app(`type BadgeProps =
  { label :: String
  , tone  :: Color = Primary
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
main = App.sandbox { init = 0, update = always identity, view = always (<p>ok</p>) }`);
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
