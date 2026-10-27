import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

// 3 つは同じ版で出す（scripts/release.mjs）。create-nene-lang は同じ版の nene-lang を使う
test("nene-lang・nene-lang-ui・create-nene-lang の版がそろっている", () => {
  const lang = read("package.json");
  const ui = read("ui/package.json");
  const create = read("create-nene-lang/package.json");
  assert.equal(ui.version, lang.version);
  assert.equal(create.version, lang.version);
  assert.equal(create.dependencies["nene-lang"], lang.version);
});
