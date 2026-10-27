import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { startServer } from "./lsp-client.ts";

const root = join(import.meta.dirname, "..");

test("言語サーバー: エラーの表示・型のホバー・定義への移動", async () => {
  const lsp = startServer();
  try {
    const init = await lsp.request("initialize", { capabilities: {} });
    assert.equal(init.result.capabilities.hoverProvider, true);

    const file = join(root, "examples", "Counter.nn");
    const uri = pathToFileURL(file).href;
    const text = readFileSync(file, "utf8");
    const diagnostics = () => lsp.wait((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri);

    let diag = diagnostics();
    lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "nene", version: 1, text } } });
    assert.deepEqual((await diag).params.diagnostics, []);

    // update の型
    const lines = text.split("\n");
    const line = lines.findIndex((l) => l.startsWith("update Increment"));
    const hover = await lsp.request("textDocument/hover", { textDocument: { uri }, position: { line, character: 2 } });
    assert.match(hover.result.contents.value, /update :: Msg -> Int -> Int/);

    // <Button> から Button.nn の定義へ
    const buttonLine = lines.findIndex((l) => l.includes("<Button onClick={Increment}>"));
    const col = lines[buttonLine].indexOf("Button") + 1;
    const def = await lsp.request("textDocument/definition", { textDocument: { uri }, position: { line: buttonLine, character: col } });
    assert.match(def.result.uri, /Button\.nn$/);

    // 型エラーを入れると、その場所にエラーが出る
    diag = diagnostics();
    const broken = text.replace("update Increment n = n + 1", 'update Increment n = n ++ "!"');
    lsp.send({ method: "textDocument/didChange", params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: broken }] } });
    const errors = (await diag).params.diagnostics;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].range.start.line, line);
    assert.match(errors[0].message, /String/);

    // まだ書いていない所（_）は、エラーではなく警告で、入る型を知らせる
    diag = diagnostics();
    const holed = text.replace("<Button onClick={Increment}>", "<Button onClick={_}>");
    lsp.send({ method: "textDocument/didChange", params: { textDocument: { uri, version: 3 }, contentChanges: [{ text: holed }] } });
    const warnings = (await diag).params.diagnostics;
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].severity, 2);
    assert.deepEqual(warnings[0].range.start, { line: buttonLine, character: lines[buttonLine].indexOf("Increment") });
    assert.match(warnings[0].message, /ここには Msg 型の値が入ります/);

    // 正しい内容に戻して、補完と色分けを確かめる
    diag = diagnostics();
    lsp.send({ method: "textDocument/didChange", params: { textDocument: { uri, version: 4 }, contentChanges: [{ text }] } });
    assert.deepEqual((await diag).params.diagnostics, []);

    const complete = async (lineText: string, character?: number) => {
      const l = lines.findIndex((x) => x.includes(lineText));
      const res = await lsp.request("textDocument/completion", {
        textDocument: { uri },
        position: { line: l, character: character ?? lines[l].indexOf(lineText) + lineText.length },
      });
      return res.result as { label: string; textEdit: { newText: string } }[];
    };

    // <But まで打ったところ: 必須の属性と閉じタグまで入る
    const tags = await complete("<But");
    const button = tags.find((t) => t.label === "Button")!;
    assert.equal(button.textEdit.newText, "Button onClick={$1}>$0</Button>");
    assert.ok(tags.some((t) => t.label === "Row"));
    assert.ok(tags.some((t) => t.label === "div"));

    // <Button の属性: まだ書いていないものだけ
    const attrs = await complete("<Button onClick={Increment}", lines.find((x) => x.includes("<Button onClick={Increment}"))!.indexOf("<Button") + 8);
    assert.ok(attrs.some((a) => a.label === "variant"));
    assert.ok(attrs.some((a) => a.label === "disabled"));

    // import するモジュール
    const imports = await complete("import Ui.Button");
    assert.ok(imports.some((m) => m.label === "Gallery"));
    assert.ok(imports.some((m) => m.label === "Ui.TextField")); // nene-lang-ui のモジュール
    assert.ok(!imports.some((m) => m.label === "Counter"));

    // 修飾名
    const appMembers = await complete("App.");
    assert.ok(appMembers.some((m) => m.label === "app"));

    // 色分け: <Column> は部品（class）、<h1> は HTML 要素（macro）
    const tokens = await lsp.request("textDocument/semanticTokens/full", { textDocument: { uri } });
    const data: number[] = tokens.result.data;
    const legend = init.result.capabilities.semanticTokensProvider.legend.tokenTypes;
    const decoded: { line: number; col: number; len: number; type: string }[] = [];
    let ln = 0;
    let cl = 0;
    for (let i = 0; i < data.length; i += 5) {
      ln += data[i];
      cl = data[i] === 0 ? cl + data[i + 1] : data[i + 1];
      decoded.push({ line: ln, col: cl, len: data[i + 2], type: legend[data[i + 3]] });
    }
    const at = (needle: string, offset = 0) => {
      const l = lines.findIndex((x) => x.includes(needle));
      const c = lines[l].indexOf(needle) + offset;
      return decoded.find((d) => d.line === l && d.col === c)?.type;
    };
    assert.equal(at("<Column", 1), "class");
    assert.equal(at("<h1>", 1), "macro");
    assert.equal(at("Increment n"), "enumMember");
    assert.equal(at("    count", 4), "variable");

    await lsp.request("shutdown", {});
  } finally {
    lsp.proc.kill();
  }
});

test("言語サーバー: コンストラクタ・型・フィールド・import・閉じタグから定義へ移動する", async () => {
  const lsp = startServer();
  try {
    await lsp.request("initialize", { capabilities: {} });
    const open = async (name: string) => {
      const file = join(root, "examples", name);
      const uri = pathToFileURL(file).href;
      const text = readFileSync(file, "utf8");
      const diag = lsp.wait((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri);
      lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "nene", version: 1, text } } });
      assert.deepEqual((await diag).params.diagnostics, []);
      return { uri, lines: text.split("\n") };
    };
    // 行 lineText の中の needle（offset 文字目）から飛んだ先を「ファイル名:行の中身:桁」で返す
    const defAt = async (doc: { uri: string; lines: string[] }, lineText: string, needle: string, offset = 0) => {
      const line = doc.lines.findIndex((l) => l.includes(lineText));
      assert.ok(line >= 0, lineText);
      const character = doc.lines[line].indexOf(needle, doc.lines[line].indexOf(lineText)) + offset;
      const res = await lsp.request("textDocument/definition", { textDocument: { uri: doc.uri }, position: { line, character } });
      if (!res.result) return null;
      const file = new URL(res.result.uri).pathname;
      const target = readFileSync(file, "utf8").split("\n")[res.result.range.start.line];
      return `${file.split("/").pop()}:${target.slice(res.result.range.start.character)}`;
    };

    const counter = await open("Counter.nn");
    // コンストラクタ（パターン・式・ほかのモジュール）
    assert.equal(await defAt(counter, "update Increment n", "Increment"), "Counter.nn:Increment | Decrement | Reset");
    assert.equal(await defAt(counter, "variant={Outlined}", "Outlined"), "Button.nn:Outlined | Plain");
    // 型の名前
    assert.equal(await defAt(counter, "update :: Msg", "Model"), "Counter.nn:Model = Int");
    assert.equal(await defAt(counter, "update :: Msg", "Msg"), "Counter.nn:Msg = Increment | Decrement | Reset");
    // JSX の属性から、Props 型のフィールドへ
    assert.match((await defAt(counter, "variant={Outlined}", "variant"))!, /^Button\.nn:variant +:: Variant/);
    // import のモジュール名と、import する名前
    assert.match((await defAt(counter, "import Ui.Button", "Button"))!, /^Button\.nn:module Ui\.Button/);
    assert.match((await defAt(counter, "import Ui.Button", "Variant"))!, /^Button\.nn:Variant = /);
    // 閉じタグ
    assert.match((await defAt(counter, "</Row>", "Row"))!, /^Layout\.nn:row\b/);
    // 型注釈の名前から本体へ
    assert.equal(await defAt(counter, "update :: Msg", "update"), "Counter.nn:update Increment n = n + 1");

    const gallery = await open("Gallery.nn");
    // フィールドの取り出しと更新（型注釈のない where の補助関数でも）
    assert.match((await defAt(gallery, "image.id == id", "favorite"))!, /^Gallery\.nn:favorite +:: Bool/);
    assert.match((await defAt(gallery, "image.id == id", ".id", 1))!, /^Gallery\.nn:id +:: Int/);

    await lsp.request("shutdown", {});
  } finally {
    lsp.proc.kill();
  }
});
