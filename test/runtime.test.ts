import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runExample, runInDom } from "./helpers.ts";

test("Counter: ボタンで数が増減する", async () => {
  const app = await runExample("Counter");
  assert.match(app.text(), /カウンター 0/);
  await app.click("button", 1); // +
  await app.click("button", 1);
  assert.match(app.text(), /カウンター 2/);
  await app.click("button", 0); // -
  assert.match(app.text(), /カウンター 1/);
  await app.click("button", 2); // リセット
  assert.match(app.text(), /カウンター 0/);
  // 0 のときは - ボタンが押せない
  assert.equal((app.document.querySelectorAll("button")[0] as HTMLButtonElement).disabled, true);
});

test("Todo: 追加・完了・絞り込み・削除ができる", async () => {
  const app = await runExample("Todo");
  assert.match(app.text(), /牛乳を買う/);
  assert.match(app.text(), /すべて 2/);
  const bar = app.document.querySelector(".Todo__progress-bar") as HTMLElement;
  assert.equal(bar.style.getPropertyValue("--done"), "0%");

  // 空のまま追加するとエラーが出る
  await app.submit("form");
  assert.match(app.text(), /タスク名を入力してください/);

  await app.input("input:not([type=checkbox])", "  メールを返す ");
  assert.doesNotMatch(app.text(), /タスク名を入力してください/);
  await app.submit("form");
  assert.match(app.text(), /すべて 3/);
  assert.equal((app.document.querySelector("input:not([type=checkbox])") as HTMLInputElement).value, "");
  assert.equal(app.document.querySelectorAll("li")[0].textContent!.includes("メールを返す"), true);

  // 1 件目を完了にする
  const box = app.document.querySelector("input[type=checkbox]") as HTMLInputElement;
  box.checked = true;
  box.dispatchEvent(new app.window.Event("change", { bubbles: true }));
  await app.frame();
  assert.match(app.text(), /完了 1/);
  assert.equal(bar.style.getPropertyValue("--done"), "33%");

  // 「完了」で絞り込む
  const chips = [...app.document.querySelectorAll("button")].filter((b) => b.textContent!.startsWith("完了 "));
  chips[0].click();
  await app.frame();
  assert.equal(app.document.querySelectorAll("li").length, 1);

  // 完了済みを削除すると、表示するものがなくなる
  const clear = [...app.document.querySelectorAll("button")].find((b) => b.textContent!.includes("完了済みを削除"))!;
  clear.click();
  await app.frame();
  assert.match(app.text(), /表示するタスクはありません/);
  assert.match(app.text(), /すべて 2/);
});

test("Gallery: 写真を押すと大きく表示し、お気に入りにできる", async () => {
  const app = await runExample("Gallery");
  assert.equal(app.document.querySelectorAll("img").length, 9);
  await app.click("figure", 2);
  assert.equal(app.document.querySelectorAll("img").length, 10);
  assert.match(app.text(), /湖/);
  const fav = app.document.querySelector("button[title=お気に入り]") as HTMLButtonElement;
  fav.click();
  await app.frame();
  assert.match(app.text(), /★/);
  const close = app.document.querySelector("button[title=閉じる]") as HTMLButtonElement;
  close.click();
  await app.frame();
  assert.equal(app.document.querySelectorAll("img").length, 9);
  // 閉じたあとも一覧のバッジは残る
  assert.match(app.text(), /★/);
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("Gallery: 開いた写真は URL に入り、Esc キーで閉じる", async () => {
  const app = await runExample("Gallery");
  await app.click("figure", 2);
  await wait(10);
  await app.frame();
  assert.equal(app.window.location.search, "?photo=46");
  assert.equal(app.document.querySelectorAll("img").length, 10);
  app.document.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Escape" }));
  await wait(10);
  await app.frame();
  assert.equal(app.window.location.search, "");
  assert.equal(app.document.querySelectorAll("img").length, 9);
});

test("Stopwatch: タイマーで進み、ラップのベストを保存し、テーマを使う", async () => {
  const app = await runExample("Stopwatch");
  assert.match(app.text(), /00:00\.00/);
  const button = (label: string) => [...app.document.querySelectorAll("button")].find((b) => b.textContent === label)!;
  button("開始").click();
  await wait(150);
  await app.frame();
  assert.doesNotMatch(app.text(), /^00:00\.00/);
  button("ラップ").click();
  await wait(10);
  await app.frame();
  assert.match(app.text(), /ラップ 1/);
  assert.match(app.text(), /ベストラップ/);
  assert.ok(Number(app.window.localStorage.getItem("stopwatch.best")) > 0);
  // スペースキーで止まる
  app.document.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: " " }));
  await app.frame();
  assert.ok(button("開始"));
  const css = [...app.document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join("\n");
  assert.match(css, /--primary: ?#22c55e/);
  assert.ok(app.document.querySelector(".Stopwatch__clock.nene-Stopwatch"));
  // Button 部品（nene-lang-ui）の中の要素には Button の印が付き、Stopwatch の印は付かない
  const btn = app.document.querySelector(".Ui-Button__button")!;
  assert.ok(btn.classList.contains("nene-Ui-Button"));
  assert.ok(!btn.classList.contains("nene-Stopwatch"));
});

test("collapse: 狭い画面では Row を縦に、Grid を 1 列にする CSS を出す", async () => {
  const app = await runInDom({
    Main: `module Main (main) where

main :: Program Int Int
main = App.app { init = 0, update = always identity, view = always page }

page :: Html Int
page =
  <Column>
    <Row gap={S} collapse={M}><p>a</p><p>b</p></Row>
    <Grid columns={3} collapse={S}><p>c</p></Grid>
  </Column>
`,
  });
  const css = [...app.document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join("\n");
  assert.match(css, /@media \(max-width: 767\.98px\)[^}]*flex-direction: column/);
  assert.match(css, /@media \(max-width: 479\.98px\)[^}]*grid-template-columns: minmax\(0(px)?, ?1fr\)/);
});

test("標準ライブラリ: List・String・Result の関数", async () => {
  const app = await runInDom({
    Main: `module Main (main) where

view :: () -> Html ()
view _ = <p>{text}</p>
  where
    text = String.join " " [evens, padded, replaced, best, parsed]
    evens = show (length (List.filterMap half [1, 2, 3, 4]))
    half n
      | mod n 2 == 0 = Just n
      | otherwise    = Nothing
    padded = String.padLeft 3 "0" "7"
    replaced = String.replace "-" "/" "2026-10-26"
    best = show (Maybe.withDefault 0 (List.maximum [3, 9, 4]))
    parsed = Result.withDefault "?" (Result.map String.toUpper (Ok "ok"))

main :: Program () ()
main = App.app { init = (), update = always identity, view }
`,
  });
  assert.equal(app.text(), "2 007 2026/10/26 9 OK");
});

test("Todo: タスクはブラウザに保存され、次に開いたときに読み込まれる", async () => {
  const saved = JSON.stringify([{ id: 7, title: "保存したタスク", priority: "High", done: true }]);
  const app = await runExample("Todo", { setup: (w) => w.localStorage.setItem("todos", saved) });
  await app.frame();
  assert.match(app.text(), /保存したタスク/);
  assert.doesNotMatch(app.text(), /牛乳を買う/);
  await app.click("input[type=checkbox]");
  assert.equal(JSON.parse(app.window.localStorage.getItem("todos")!)[0].done, false);
});

test("Env.get で .env の NENE_ で始まる値を読める", async () => {
  const app = await runInDom(
    {
      Main: `module Main (main) where

view :: () -> Html ()
view _ = <p>{api} {missing}</p>
  where
    api     = Maybe.withDefault "なし" (Env.get "API_URL")
    missing = Maybe.withDefault "なし" (Env.get "SECRET")

main :: Program () ()
main = App.app { init = (), update = always identity, view }
`,
    },
    "Main",
    { env: { NENE_API_URL: "https://api.example.com", SECRET: "見えない" } },
  );
  assert.equal(app.text(), "https://api.example.com なし");
});
