import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runExample } from "./helpers.ts";

// nene-lang-ui の部品は examples/Showcase.nn で一通り使っている
const showcase = () => runExample("Showcase");
const buttonNamed = (doc: ParentNode, label: string) =>
  [...doc.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

test("Dialog: 開いて、背景を押すと閉じる", async () => {
  const app = await showcase();
  assert.equal(app.document.querySelector("[role=dialog]:not([popover])"), null);
  buttonNamed(app.document, "開く").click();
  await app.frame();
  assert.ok(app.document.querySelector("[role=dialog]:not([popover])"));
  (app.document.querySelector(".Ui-Dialog__backdrop") as HTMLElement).click();
  await app.frame();
  assert.equal(app.document.querySelector("[role=dialog]:not([popover])"), null);
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
  buttonNamed(app.document, "進める").click();
  await app.frame();
  assert.equal(app.document.querySelector("[aria-valuenow]")!.getAttribute("aria-valuenow"), "40");
});

test("Button: disabled なら押せず、tone は CSS 変数として渡る", async () => {
  const app = await showcase();
  assert.equal(buttonNamed(app.document, "押せない").disabled, true);
  const danger = buttonNamed(app.document, "削除");
  assert.equal(danger.style.getPropertyValue("--tone"), "var(--danger)");
});

test("Menu・Popover: ボタンと開く枠が popovertarget でつながり、項目を押すと閉じてメッセージが届く", async () => {
  const app = await showcase();
  const trigger = app.document.querySelector("[popovertarget=actions]")!;
  const list = app.document.getElementById("actions")!;
  assert.equal(list.hasAttribute("popover"), true);
  assert.equal(trigger.closest("[class*=Ui-Menu]") !== null, true);
  const items = [...list.querySelectorAll("[role=menuitem]")];
  assert.deepEqual(items.map((b) => b.getAttribute("popovertargetaction")), ["hide", "hide", "hide"]);
  (items[0] as HTMLElement).click(); // 進める
  await app.frame();
  assert.equal(app.document.querySelector("[aria-valuenow]")!.getAttribute("aria-valuenow"), "40");
  assert.ok(app.document.getElementById("profile")!.hasAttribute("popover"));
});

test("Accordion: ユーザーが開け閉めした状態は、model が変わっても保たれる", async () => {
  const app = await showcase();
  const details = () => [...app.document.querySelectorAll("details")] as HTMLDetailsElement[];
  assert.deepEqual(details().map((d) => d.open), [true, false, false]); // open を渡したものだけ開いている
  details()[0].open = false;
  details()[1].open = true;
  await app.click("[role=tab]", 1); // model を変えて描き直す
  assert.deepEqual(details().map((d) => d.open), [false, true, false]);
  assert.deepEqual(details().map((d) => d.getAttribute("name")), ["faq", "faq", "faq"]);
});

test("TextField: rows が 2 以上なら複数行の入力欄になる", async () => {
  const app = await showcase();
  await app.input("textarea", "はじめまして");
  const area = app.document.querySelector("textarea") as HTMLTextAreaElement;
  assert.equal(area.rows, 3);
  assert.equal(area.value, "はじめまして");
});

test("RadioGroup・Slider・Rating・ToggleGroup: 選んだ値が model に入る", async () => {
  const app = await showcase();
  const radio = () => app.document.querySelector("input[type=radio][value=phone]") as HTMLInputElement;
  radio().click();
  await app.frame();
  assert.equal(radio().checked, true);
  assert.equal(radio().name, "contact");

  await app.input("input[type=range]", "75");
  const range = app.document.querySelector("input[type=range]") as HTMLInputElement;
  assert.equal(range.value, "75");
  assert.match(range.parentElement!.getAttribute("style") ?? "", /--ratio: 0\.75/);
  assert.equal(app.document.querySelector("output")!.textContent, "75");

  const star = (n: number) => app.document.querySelector(`[role=radio][aria-label="${n}"]`) as HTMLButtonElement;
  star(5).click();
  await app.frame();
  assert.equal(star(5).getAttribute("aria-checked"), "true");
  assert.equal(star(3).getAttribute("aria-checked"), "false");

  buttonNamed(app.document, "グリッド").click();
  await app.frame();
  assert.equal(buttonNamed(app.document, "グリッド").getAttribute("aria-pressed"), "true");
  assert.equal(buttonNamed(app.document, "リスト").getAttribute("aria-pressed"), "false");
});

test("Pagination: 多いページは「…」で省き、押したページが今のページになる", async () => {
  const app = await showcase();
  const pages = () => [...app.document.querySelectorAll("nav[aria-label=ページ送り] li")].map((li) => li.textContent);
  assert.deepEqual(pages(), ["", "1", "2", "3", "4", "5", "…", "10", ""]);
  assert.equal((app.document.querySelector("[aria-label=前のページ]") as HTMLButtonElement).disabled, true);
  buttonNamed(app.document.querySelector("nav[aria-label=ページ送り]")!, "5").click();
  await app.frame();
  assert.deepEqual(pages(), ["", "1", "…", "4", "5", "6", "…", "10", ""]);
  assert.equal(buttonNamed(app.document.querySelector("nav[aria-label=ページ送り]")!, "5").getAttribute("aria-current"), "page");
});

test("Snackbar・Drawer: model で出し入れし、閉じるとメッセージが届く", async () => {
  const app = await showcase();
  assert.equal(app.document.querySelector("[aria-live=polite]"), null);
  buttonNamed(app.document, "保存").click();
  await app.frame();
  assert.match(app.document.querySelector("[aria-live=polite]")!.textContent!, /保存しました/);
  await app.click("[aria-live=polite] [aria-label=閉じる]");
  assert.equal(app.document.querySelector("[aria-live=polite]"), null);

  assert.equal(app.document.querySelector("aside[role=dialog]"), null);
  await app.click("[aria-label=メニュー]");
  assert.ok(app.document.querySelector("aside[role=dialog]"));
  (app.document.querySelector(".Ui-Drawer__backdrop") as HTMLElement).click();
  await app.frame();
  assert.equal(app.document.querySelector("aside[role=dialog]"), null);
});

test("Stepper・Table・ListItem: 手順の進み具合、表のセル、選んでいる行を表す", async () => {
  const app = await showcase();
  const steps = () => [...app.document.querySelectorAll("ol > li")].filter((li) => li.closest("nav") === null);
  assert.equal(steps()[1].getAttribute("aria-current"), "step");
  buttonNamed(app.document, "次の手順").click();
  await app.frame();
  assert.equal(steps()[2].getAttribute("aria-current"), "step");

  const headers = [...app.document.querySelectorAll("th")].map((th) => th.textContent);
  assert.deepEqual(headers, ["", "名前", "役割", "参加日"]);
  assert.equal(app.document.querySelectorAll("tbody tr").length, 3);

  const current = () => [...app.document.querySelectorAll("button[aria-current=true]")].map((b) => b.textContent);
  assert.deepEqual(current(), ["受信トレイ未読 3 件"]);
  await app.click("[role=tab]", 1);
  assert.deepEqual(current(), ["スター付き"]);
});

test("Autocomplete: 打った文字で候補を絞り、矢印キーと Enter・クリックで選べる", async () => {
  const app = await showcase();
  const { document, window } = app;
  const input = () => document.querySelector("#city-input") as HTMLInputElement;
  const options = () => [...document.querySelectorAll("#city [role=option]")].map((o) => o.textContent);
  const key = (k: string) => input().dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  assert.equal(input().getAttribute("aria-expanded"), "false");
  assert.equal(options().length, 11);

  await app.input("#city-input", "京");
  assert.equal(input().getAttribute("aria-expanded"), "true");
  assert.deepEqual(options(), ["東京", "京都"]);

  // 矢印キーで選んでいる候補は aria-activedescendant で表し、フォーカスは欄に残る
  key("ArrowDown");
  key("ArrowDown");
  assert.equal(input().getAttribute("aria-activedescendant"), "city-1");
  key("ArrowDown");
  assert.equal(input().getAttribute("aria-activedescendant"), "city-0");
  key("Enter");
  await app.frame();
  assert.equal(input().value, "東京");
  assert.equal(input().getAttribute("aria-expanded"), "false");
  // 候補と同じ文字が入っているときは、すべての候補を出し、その候補を選んだ印を付ける
  assert.equal(options().length, 11);
  assert.equal(document.querySelector("#city [aria-selected=true]")!.textContent, "東京");

  key("Escape");
  await app.click("[aria-controls=city][aria-haspopup]");
  assert.equal(input().getAttribute("aria-expanded"), "true");
  await app.click("#city [role=option]", 6);
  assert.equal(input().value, "大阪");
  assert.equal(input().getAttribute("aria-expanded"), "false");

  await app.click("[aria-controls=city][aria-label=消す]");
  assert.equal(input().value, "");
  assert.equal(input().getAttribute("aria-expanded"), "true");

  await app.input("#city-input", "ろんどん");
  assert.deepEqual(options(), []);
  assert.match(document.getElementById("city")!.textContent!, /候補がありません/);
});

test("波紋: 押した要素に、押した位置と data-pressed が付く", async () => {
  const app = await showcase();
  const { document, window } = app;
  const button = buttonNamed(document, "保存");
  button.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 5 }));
  assert.equal(button.getAttribute("data-pressed"), "down");
  assert.equal(button.style.getPropertyValue("--press-x"), "10px");
  assert.equal(button.style.getPropertyValue("--press-y"), "5px");
  document.dispatchEvent(new window.MouseEvent("pointerup", { bubbles: true }));
  assert.equal(button.getAttribute("data-pressed"), "up");
});

test("Menu: 矢印キーと Home・End で項目を移る", async () => {
  const app = await showcase();
  const { document, window } = app;
  const menu = document.querySelector("[role=menu]") as HTMLElement;
  const items = [...menu.querySelectorAll("[role=menuitem]")] as HTMLElement[];
  items[0].focus();
  items[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  assert.equal(document.activeElement, items[1]);
  items[1].dispatchEvent(new window.KeyboardEvent("keydown", { key: "End", bubbles: true }));
  assert.equal(document.activeElement, items[items.length - 1]);
  items[items.length - 1].dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  assert.equal(document.activeElement, items[0]);
});

test("README: すべての部品が表にあり、リファレンスのページへつながっている", () => {
  const readme = readFileSync(join(import.meta.dirname, "..", "ui", "README.md"), "utf8");
  const files = readdirSync(join(import.meta.dirname, "..", "ui", "src", "Ui")).map((f) => f.replace(/\.nn$/, "")).filter((n) => n !== "Theme");
  const listed = [...readme.matchAll(/^\| \[`Ui\.(\w+)`\]\(https:\/\/github\.com\/kimuracoki\/nene\/blob\/main\/docs\/reference\/ui\/(\w+)\.md\) \|/gm)];
  assert.deepEqual(listed.map((m) => m[1]).sort(), files.sort());
  for (const m of listed) assert.equal(m[1], m[2]);
});

test("Table: 見出しを押すと並べ替えのメッセージが届き、aria-sort と矢印で向きを表す", async () => {
  const app = await showcase();
  const { document } = app;
  const names = () => [...document.querySelectorAll("tbody tr")].map((tr) => tr.querySelectorAll("td")[1].textContent);
  const sorts = () => [...document.querySelectorAll("th[aria-sort]")].map((th) => th.getAttribute("aria-sort"));
  assert.deepEqual(sorts(), ["ascending", "none", "none"]);
  await app.click("th button", 0);
  assert.deepEqual(sorts(), ["descending", "none", "none"]);
  assert.deepEqual(names(), ["Grace Hopper", "Alan Turing", "Ada Lovelace"]);
  await app.click("th button", 2);
  assert.deepEqual(sorts(), ["none", "none", "ascending"]);
});

test("Calendar: 1 日をその曜日の列から並べ、選んだ日と月の移動がメッセージで届く", async () => {
  const app = await showcase();
  const { document } = app;
  const days = (first = "2026年10月1日") => document.querySelector(`[aria-label='${first}']`)!.parentElement as HTMLElement;
  // 2026 年 10 月 1 日は木曜日（日曜から数えて 5 列目）
  assert.equal(days().style.getPropertyValue("--start"), "5");
  assert.equal(days().children.length, 31);
  buttonNamed(document, "15").click();
  await app.frame();
  assert.equal(document.querySelector("[aria-label='2026年10月15日']")!.getAttribute("aria-pressed"), "true");
  await app.click("[aria-label=次の月]");
  await app.click("[aria-label=次の月]");
  await app.click("[aria-label=次の月]");
  // 2027 年 1 月 1 日は金曜日。年をまたいで進む
  assert.equal(days("2027年1月1日").style.getPropertyValue("--start"), "6");
  assert.ok(document.querySelector("[aria-label='2027年1月31日']"));
  await app.click("[aria-label=前の月]");
  assert.ok(document.querySelector("[aria-label='2026年12月31日']"));
});

test("MultiAutocomplete・Chip: 候補を押すと足し外しでき、チップの × で外せる", async () => {
  const app = await showcase();
  const { document } = app;
  const chips = () => [...document.getElementById("tags-input")!.parentElement!.querySelectorAll("[aria-label=消す]")].map((b) => b.parentElement!.textContent);
  assert.deepEqual(chips(), ["Nene"]);
  await app.input("#tags-input", "ell");
  assert.deepEqual([...document.querySelectorAll("#tags [role=option]")].map((o) => o.textContent), ["Haskell"]);
  await app.click("#tags [role=option]");
  assert.deepEqual(chips(), ["Nene", "Haskell"]);
  // 選んだら、打った文字は消える（Showcase の update がそうしている）
  assert.equal((document.getElementById("tags-input") as HTMLInputElement).value, "");
  (document.getElementById("tags-input")!.parentElement!.querySelector("[aria-label=消す]") as HTMLElement).click();
  await app.frame();
  assert.deepEqual(chips(), ["Haskell"]);
});

test("ButtonGroup・SpeedDial・Button の loading", async () => {
  const app = await showcase();
  const { document } = app;
  assert.equal(document.querySelectorAll("[role=group]").length >= 3, true);
  const dial = document.getElementById("create")!;
  assert.equal(dial.getAttribute("role"), "menu");
  assert.deepEqual([...dial.querySelectorAll("[role=menuitem]")].map((b) => b.textContent), ["メール", "予定", "共有"]);
  buttonNamed(document, "読み込み").click();
  await app.frame();
  const loading = buttonNamed(document, "読み込み");
  assert.equal(loading.getAttribute("aria-busy"), "true");
  assert.equal(loading.disabled, true);
});

test("DatePicker: 押すとカレンダーが開き、日を選ぶと値が届いて閉じる", async () => {
  const app = await showcase();
  const { document } = app;
  const field = document.querySelector("[popovertarget=due]") as HTMLButtonElement;
  assert.match(field.textContent!, /年\/月\/日/);
  const panel = document.getElementById("due")!;
  assert.equal(panel.getAttribute("role"), "dialog");
  const day = panel.querySelector("[aria-label='2026年10月20日']") as HTMLButtonElement;
  // 日のボタンは、押すとカレンダー（popover）を閉じる
  assert.equal(day.getAttribute("popovertarget"), "due");
  assert.equal(day.getAttribute("popovertargetaction"), "hide");
  day.click();
  await app.frame();
  assert.match(field.textContent!, /2026\/10\/20/);
});

test("TransferList: チェックした項目を反対側へ移し、移したらチェックを外す", async () => {
  const app = await showcase();
  const { document } = app;
  const side = (name: string) => [...document.querySelector(`section[aria-label=${name}]`)!.querySelectorAll("label")].map((l) => l.textContent);
  assert.deepEqual(side("チーム"), ["Ada"]);
  const grace = [...document.querySelectorAll("section[aria-label=メンバー] label")].find((l) => l.textContent === "Grace")!;
  (grace.querySelector("input") as HTMLInputElement).click();
  await app.frame();
  await app.click("[aria-label=選んだものを右へ]");
  assert.deepEqual(side("チーム"), ["Ada", "Grace"]);
  assert.equal((document.querySelector("[aria-label=選んだものを右へ]") as HTMLButtonElement).disabled, true);
  await app.click("[aria-label=すべて左へ]");
  assert.deepEqual(side("チーム"), []);
});

test("Table の行選択・MultiAutocomplete の Backspace・Avatar の頭文字", async () => {
  const app = await showcase();
  const { document, window } = app;
  const checks = () => [...document.querySelectorAll("table input[type=checkbox]")] as HTMLInputElement[];
  assert.equal(checks().length, 4);
  checks()[2].click();
  await app.frame();
  assert.equal(document.querySelectorAll("tr[aria-selected=true]").length, 1);
  checks()[0].click();
  await app.frame();
  assert.equal(document.querySelectorAll("tr[aria-selected=true]").length, 3);

  // 空の欄で Backspace を押すと、最後のチップが外れる
  const input = document.getElementById("tags-input") as HTMLInputElement;
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
  await app.frame();
  assert.equal(input.parentElement!.querySelectorAll("[aria-label=消す]").length, 0);

  // 漢字の名前は 1 文字、ローマ字の名前は 2 文字
  await app.input("input[placeholder='木村 太郎']", "木村 光");
  assert.ok([...document.querySelectorAll("[aria-label='木村 光']")].some((a) => a.textContent === "木"));
});
