import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { startServer } from "./lsp-client.ts";

// 一時フォルダにプロジェクトを作る
function project(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "nene-lsp-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return (name: string) => ({ uri: pathToFileURL(join(dir, name)).href, text: files[name] });
}

const FILES = {
  "package.json": "{}",
  "src/Text.nn": `module Text (greeting) where

greeting :: String -> String
greeting name = "こんにちは、" ++ name
`,
  "src/Card.nn": `module Card (card) where

card :: { title :: String } -> Html msg
card props = <section><Badge text={props.title} /></section>

badge :: { text :: String } -> Html msg
badge props = <strong>{props.text}</strong>
`,
  "src/Main.nn": `module Main (main) where

import Card
import Text

view :: () -> Html ()
view _ =
  <div>
    <Card title={hello} />
    <p>{hello}</p>
  </div>
  where
    hello = greeting "Nene"

main :: Program () ()
main = App.app { init = (), update = always identity, view }
`,
};

async function withServer(run: (lsp: ReturnType<typeof startServer>, file: ReturnType<typeof project>) => Promise<void>) {
  const file = project(FILES);
  const lsp = startServer();
  try {
    await lsp.request("initialize", { capabilities: {} });
    for (const name of ["src/Text.nn", "src/Card.nn", "src/Main.nn"]) {
      const { uri, text } = file(name);
      const diag = lsp.wait((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri);
      lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "nene", version: 1, text } } });
      assert.deepEqual((await diag).params.diagnostics, []);
    }
    await run(lsp, file);
  } finally {
    lsp.proc.kill();
  }
}

// text の中で needle が出てくる位置（LSP の行と文字）
function at(text: string, needle: string, nth = 0) {
  let offset = -1;
  for (let i = 0; i <= nth; i++) offset = text.indexOf(needle, offset + 1);
  const before = text.slice(0, offset).split("\n");
  return { line: before.length - 1, character: before[before.length - 1].length };
}

const where = (loc: { uri: string; range: { start: { line: number } } }) => `${loc.uri.split("/").pop()}:${loc.range.start.line + 1}`;

test("参照一覧: ほかのファイルで使っている場所も含めて出す", async () => {
  await withServer(async (lsp, file) => {
    const main = file("src/Main.nn");
    const res = await lsp.request("textDocument/references", {
      textDocument: { uri: main.uri },
      position: at(main.text, "greeting"),
      context: { includeDeclaration: true },
    });
    assert.deepEqual(res.result.map(where).sort(), ["Main.nn:13", "Text.nn:1", "Text.nn:3", "Text.nn:4"]);
  });
});

test("名前の一括変更: ファイルをまたいで変え、部品の関数を変えるとタグも変わる", async () => {
  await withServer(async (lsp, file) => {
    const main = file("src/Main.nn");
    const res = await lsp.request("textDocument/rename", { textDocument: { uri: main.uri }, position: at(main.text, "greeting"), newName: "welcome" });
    const changes = res.result.changes as Record<string, { newText: string }[]>;
    assert.equal(Object.keys(changes).length, 2);
    assert.ok(Object.values(changes).flat().every((e) => e.newText === "welcome"));

    const card = file("src/Card.nn");
    const tag = await lsp.request("textDocument/rename", { textDocument: { uri: card.uri }, position: at(card.text, "badge props"), newName: "label" });
    const edits = tag.result.changes[card.uri].map((e: { newText: string }) => e.newText).sort();
    assert.deepEqual(edits, ["Label", "label", "label"]);
  });
});

test("名前の一括変更: ファイルと同じ名前の主部品や、種類の違う名前は断る", async () => {
  await withServer(async (lsp, file) => {
    const card = file("src/Card.nn");
    const main = await lsp.request("textDocument/prepareRename", { textDocument: { uri: card.uri }, position: at(card.text, "card props") });
    assert.match(main.error.message, /ファイル名と一緒に変えてください/);
    const text = file("src/Text.nn");
    const bad = await lsp.request("textDocument/rename", { textDocument: { uri: text.uri }, position: at(text.text, "greeting name"), newName: "Greeting" });
    assert.match(bad.error.message, /小文字で始まる名前/);
  });
});

test("アウトライン・シンボル検索・折りたたみ・構造に沿った選択", async () => {
  await withServer(async (lsp, file) => {
    const main = file("src/Main.nn");
    const symbols = await lsp.request("textDocument/documentSymbol", { textDocument: { uri: main.uri } });
    assert.deepEqual(symbols.result.map((s: { name: string }) => s.name), ["view", "main"]);
    assert.deepEqual(symbols.result[0].children.map((s: { name: string }) => s.name), ["hello"]);

    const found = await lsp.request("workspace/symbol", { query: "greet" });
    assert.deepEqual(found.result.map((s: { name: string; containerName: string }) => `${s.containerName}.${s.name}`), ["Text.greeting"]);

    const folds = await lsp.request("textDocument/foldingRange", { textDocument: { uri: main.uri } });
    const div = at(main.text, "<div>").line;
    assert.ok(folds.result.some((f: { startLine: number; endLine: number }) => f.startLine === div && f.endLine === div + 2));

    const sel = await lsp.request("textDocument/selectionRange", { textDocument: { uri: main.uri }, positions: [at(main.text, "hello}")] });
    const chain: string[] = [];
    for (let s = sel.result[0]; s; s = s.parent) chain.push(`${s.range.start.line}:${s.range.start.character}`);
    assert.equal(chain.length, 4); // hello → <p> → <div> → view の宣言（型注釈から where まで）
  });
});

test("整形: = をそろえる", async () => {
  await withServer(async (lsp) => {
    const uri = "file:///tmp/Fmt.nn";
    const text = "module Fmt where\n\nf 1 = 1\nf n = n   \n\n\n\ng = 2\n";
    lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "nene", version: 1, text } } });
    const res = await lsp.request("textDocument/formatting", { textDocument: { uri }, options: { tabSize: 2, insertSpaces: true } });
    assert.equal(res.result[0].newText, "module Fmt where\n\nf 1 = 1\nf n = n\n\n\ng = 2\n");
  });
});

test("コードアクション: import を足す・JSX の式を where に取り出す", async () => {
  await withServer(async (lsp, file) => {
    const main = file("src/Main.nn");
    const missing = { range: { start: at(main.text, "Card title"), end: at(main.text, "Card title") }, message: "部品 <Card> が見つかりません（card を定義するか、モジュール Card を import してください）" };
    const imp = await lsp.request("textDocument/codeAction", { textDocument: { uri: main.uri }, range: missing.range, context: { diagnostics: [missing] } });
    assert.equal(imp.result[0].title, "import Card を足す");

    const uri = "file:///tmp/Extract.nn";
    const text = `module Extract where

view :: Int -> Html msg
view n =
  <p>{show (n + 1)}</p>
`;
    lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "nene", version: 1, text } } });
    const pos = at(text, "show");
    const diag = { range: { start: pos, end: pos }, message: "JSX の {} には、名前・リテラル・フィールド・1 段の関数適用だけを書けます。where に名前をつけて書いてください" };
    const ext = await lsp.request("textDocument/codeAction", { textDocument: { uri }, range: diag.range, context: { diagnostics: [diag] } });
    const edits = ext.result[0].edit.changes[uri];
    assert.deepEqual(edits.map((e: { newText: string }) => e.newText), ["value", "\n  where\n    value = show (n + 1)"]);
  });
});

test("引数のヒント: 関数の型と、いま書いている引数", async () => {
  await withServer(async (lsp, file) => {
    const main = file("src/Main.nn");
    const text = main.text.replace('hello = greeting "Nene"', "hello = String.padLeft 3 ");
    lsp.send({ method: "textDocument/didChange", params: { textDocument: { uri: main.uri, version: 2 }, contentChanges: [{ text }] } });
    await new Promise((r) => setTimeout(r, 400));
    const pos = at(text, "String.padLeft 3 ");
    const res = await lsp.request("textDocument/signatureHelp", { textDocument: { uri: main.uri }, position: { line: pos.line, character: pos.character + "String.padLeft 3 ".length } });
    assert.equal(res.result.signatures[0].label, "String.padLeft :: Int -> String -> String -> String");
    assert.equal(res.result.activeParameter, 1);
  });
});

test("補完: import していない部品も出し、選ぶと import を足す", async () => {
  await withServer(async (lsp, file) => {
    const main = file("src/Main.nn");
    const uri = main.uri.replace("Main.nn", "Other.nn");
    const text = "module Other (v) where\n\nimport Text\n\nv :: Html msg\nv = <p>x</p>\n";
    lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "nene", version: 1, text } } });
    await new Promise((r) => setTimeout(r, 300));
    const res = await lsp.request("textDocument/completion", { textDocument: { uri }, position: { line: 5, character: 5 } });
    const card = res.result.find((c: { label: string }) => c.label === "Card");
    assert.ok(card, "Card が候補にある");
    assert.equal(card.labelDetails.description, "Card");
    assert.equal(card.textEdit.newText, "Card title={$1} />$0");
    assert.deepEqual(card.additionalTextEdits, [{ range: { start: { line: 3, character: 0 }, end: { line: 3, character: 0 } }, newText: "import Card\n" }]);
    // 部品でないモジュール（Text）や、HTML 要素より前に並ぶ
    assert.ok(!res.result.some((c: { label: string }) => c.label === "Text"));
    const p = res.result.find((c: { label: string }) => c.label === "p");
    assert.ok(card.sortText < p.sortText);
  });
});
