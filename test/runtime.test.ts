import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInDom } from "./helpers.ts";

const examples = join(import.meta.dirname, "..", "examples");
const exampleFiles = (...names: string[]) =>
  Object.fromEntries(names.map((n) => [n, readFileSync(join(examples, `${n}.tufa`), "utf8")]));

test("Counter: ボタンで数が増減する", async () => {
  const app = await runInDom(exampleFiles("Counter", "Button", "Icon"), "Counter");
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
  const app = await runInDom(
    exampleFiles("Todo", "Button", "Icon", "Card", "Chip", "IconButton", "TextField"),
    "Todo",
  );
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
  const app = await runInDom(exampleFiles("Gallery", "Photo", "IconButton", "Icon"), "Gallery");
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
  const app = await runInDom(exampleFiles("Gallery", "Photo", "IconButton", "Icon"), "Gallery");
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
  const app = await runInDom(exampleFiles("Stopwatch", "Button", "Icon"), "Stopwatch");
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
  assert.ok(app.document.querySelector(".Stopwatch__clock.tufa-Stopwatch"));
  // Button 部品の中の要素には Button の印が付き、Stopwatch の印は付かない
  const btn = app.document.querySelector(".Button__button")!;
  assert.ok(btn.classList.contains("tufa-Button"));
  assert.ok(!btn.classList.contains("tufa-Stopwatch"));
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
