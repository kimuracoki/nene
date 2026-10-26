import { test } from "node:test";
import assert from "node:assert/strict";
import { runExample } from "./helpers.ts";

// nene-lang-ui の部品は examples/Showcase.nn で一通り使っている
const showcase = () => runExample("Showcase");
const buttonNamed = (doc: Document, label: string) =>
  [...doc.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

test("Dialog: 開いて、背景を押すと閉じる", async () => {
  const app = await showcase();
  assert.equal(app.document.querySelector("[role=dialog]"), null);
  buttonNamed(app.document, "開く").click();
  await app.frame();
  assert.ok(app.document.querySelector("[role=dialog]"));
  (app.document.querySelector(".Ui-Dialog__backdrop") as HTMLElement).click();
  await app.frame();
  assert.equal(app.document.querySelector("[role=dialog]"), null);
});

test("TextField: error を渡すと赤くなり、説明の代わりにエラーを出す", async () => {
  const app = await showcase();
  await app.input("input[type=email]", "abc");
  const box = app.document.querySelector("input[type=email]")!;
  assert.equal(box.getAttribute("aria-invalid"), "true");
  assert.match(app.text(), /メールアドレスの形になっていません/);
  await app.input("input[type=email]", "a@b");
  assert.doesNotMatch(app.text(), /メールアドレスの形になっていません/);
});

test("Tabs・Switch・Select: 選んだものが model に入る", async () => {
  const app = await showcase();
  await app.click("[role=tab]", 2);
  assert.equal(app.document.querySelectorAll("[role=tab]")[2].getAttribute("aria-selected"), "true");

  const toggle = app.document.querySelector("[role=switch]") as HTMLInputElement;
  assert.equal(toggle.checked, true);
  toggle.click();
  await app.frame();
  assert.equal((app.document.querySelector("[role=switch]") as HTMLInputElement).checked, false);

  const select = app.document.querySelector("select") as HTMLSelectElement;
  select.value = "team";
  select.dispatchEvent(new app.window.Event("change", { bubbles: true }));
  await app.frame();
  assert.equal((app.document.querySelector("option[value=team]") as HTMLOptionElement).selected, true);
});

test("Badge・Avatar・Progress: 数・頭文字・割合を表示する", async () => {
  const app = await showcase();
  const badges = [...app.document.querySelectorAll(".Ui-Badge__badge")].map((b) => b.textContent);
  assert.deepEqual(badges, ["3", "99+"]);
  assert.match(app.text(), /\bAL\b/);
  const bar = app.document.querySelector("[aria-valuenow]")!;
  assert.equal(bar.getAttribute("aria-valuenow"), "30");
  await app.click("button", 1); // 進める
  assert.equal(app.document.querySelector("[aria-valuenow]")!.getAttribute("aria-valuenow"), "40");
});

test("Button: disabled なら押せず、tone は CSS 変数として渡る", async () => {
  const app = await showcase();
  assert.equal(buttonNamed(app.document, "押せない").disabled, true);
  const danger = buttonNamed(app.document, "削除");
  assert.equal(danger.style.getPropertyValue("--tone"), "var(--danger)");
});
