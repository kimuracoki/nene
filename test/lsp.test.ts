import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");

// 言語サーバーを起動し、メッセージを送受信する小さなクライアント
function startServer() {
  const proc = spawn(process.execPath, [join(root, "src", "lsp.ts")], { stdio: ["pipe", "pipe", "inherit"] });
  let buf = Buffer.alloc(0);
  const waiters: { match: (m: any) => boolean; resolve: (m: any) => void }[] = [];
  proc.stdout.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const end = buf.indexOf("\r\n\r\n");
      if (end < 0) return;
      const len = Number(/Content-Length: (\d+)/.exec(buf.subarray(0, end).toString())![1]);
      if (buf.length < end + 4 + len) return;
      const msg = JSON.parse(buf.subarray(end + 4, end + 4 + len).toString());
      buf = buf.subarray(end + 4 + len);
      const i = waiters.findIndex((w) => w.match(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
    }
  });
  const send = (msg: object) => {
    const body = JSON.stringify({ jsonrpc: "2.0", ...msg });
    proc.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  };
  const wait = (match: (m: any) => boolean) => new Promise<any>((resolve) => waiters.push({ match, resolve }));
  let nextId = 1;
  const request = (method: string, params: object) => {
    const id = nextId++;
    send({ id, method, params });
    return wait((m) => m.id === id);
  };
  return { proc, send, wait, request };
}

test("言語サーバー: エラーの表示・型のホバー・定義への移動", async () => {
  const lsp = startServer();
  try {
    const init = await lsp.request("initialize", { capabilities: {} });
    assert.equal(init.result.capabilities.hoverProvider, true);

    const file = join(root, "examples", "Counter.lx");
    const uri = pathToFileURL(file).href;
    const text = readFileSync(file, "utf8");
    const diagnostics = () => lsp.wait((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri);

    let diag = diagnostics();
    lsp.send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "lx", version: 1, text } } });
    assert.deepEqual((await diag).params.diagnostics, []);

    // update の型
    const lines = text.split("\n");
    const line = lines.findIndex((l) => l.startsWith("update Increment"));
    const hover = await lsp.request("textDocument/hover", { textDocument: { uri }, position: { line, character: 2 } });
    assert.match(hover.result.contents.value, /update :: Msg -> Int -> Int/);

    // <Button> から Button.lx の定義へ
    const buttonLine = lines.findIndex((l) => l.includes("<Button onClick={Increment}>"));
    const col = lines[buttonLine].indexOf("Button") + 1;
    const def = await lsp.request("textDocument/definition", { textDocument: { uri }, position: { line: buttonLine, character: col } });
    assert.match(def.result.uri, /Button\.lx$/);

    // 型エラーを入れると、その場所にエラーが出る
    diag = diagnostics();
    const broken = text.replace("update Increment n = n + 1", 'update Increment n = n ++ "!"');
    lsp.send({ method: "textDocument/didChange", params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: broken }] } });
    const errors = (await diag).params.diagnostics;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].range.start.line, line);
    assert.match(errors[0].message, /String/);

    await lsp.request("shutdown", {});
  } finally {
    lsp.proc.kill();
  }
});
