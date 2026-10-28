import { test } from "node:test";
import assert from "node:assert/strict";
import { runExample } from "./helpers.ts";

const buttonNamed = (doc: Document, label: string) =>
  [...doc.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

test("Stay: 写真が 1 枚ずつスライドになり、日付から泊数と合計を出す", async () => {
  const app = await runExample("Stay");
  const [photos] = app.document.querySelectorAll("[aria-roledescription=carousel]");
  assert.equal(photos.querySelectorAll("[aria-roledescription=slide]").length, 5);
  assert.match(app.text(), /¥28,000 × 3 泊/);
  assert.match(app.text(), /合計 ¥97,400/);

  // チェックアウトのカレンダーでチェックインより前の日を選ぶと、予約に進めない
  const day19 = [...app.document.querySelectorAll("[id^=check-out] button")].find((b) => b.textContent?.trim() === "19") as HTMLButtonElement;
  day19.click();
  await app.frame();
  assert.match(app.text(), /チェックインより後の日にしてください/);
  assert.equal(buttonNamed(app.document, "予約に進む").disabled, true);
});

test("Admin: 探す・並べ替える・招待する・外して元に戻す", async () => {
  const app = await runExample("Admin");
  const names = () => [...app.document.querySelectorAll("tbody strong")].map((s) => s.textContent);
  assert.equal(names().length, 6);

  await app.input("input[type=search]", "emily");
  assert.deepEqual(names(), ["Emily Clark"]);
  await app.input("input[type=search]", "");

  const remove = app.document.querySelector("[aria-label='木村 光 を外す']") as HTMLButtonElement;
  assert.ok(remove);
  remove.click();
  await app.frame();
  assert.match(app.text(), /メンバーを外しました/);
  assert.ok(!app.document.querySelector("[aria-label='木村 光 を外す']"));
  buttonNamed(app.document, "元に戻す").click();
  await app.frame();
  assert.ok(app.document.querySelector("[aria-label='木村 光 を外す']"));

  // 行を選んで、まとめて外す
  const boxes = () => app.document.querySelectorAll("tbody input[type=checkbox]") as NodeListOf<HTMLInputElement>;
  boxes()[1].click();
  await app.frame();
  boxes()[2].click();
  await app.frame();
  assert.match(app.text(), /2 人を選んでいます/);
  buttonNamed(app.document, "外す").click();
  await app.frame();
  assert.match(app.text(), /2 人を外しました/);
  assert.equal(names()[1], "Emily Clark");
  buttonNamed(app.document, "元に戻す").click();
  await app.frame();

  // 参加日の見出しを押すと逆の順になり、まだ参加していない招待中の人が先に来る
  const joined = [...app.document.querySelectorAll("th")].find((th) => th.textContent?.includes("参加日"))!;
  (joined.querySelector("button") ?? joined).click();
  await app.frame();
  assert.equal(names()[0], "吉田 凛");

  // 名前とメールがないと送れない
  buttonNamed(app.document, "メンバーを招待").click();
  await app.frame();
  buttonNamed(app.document, "招待を送る").click();
  await app.frame();
  assert.match(app.text(), /名前を入れてください/);
});
