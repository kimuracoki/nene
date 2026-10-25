#!/usr/bin/env node
// lambda-jsx の言語サーバー（Language Server Protocol、標準入出力で通信する）
//
// できること:
//   - 保存前の内容も含めて型検査し、エラーを表示する（diagnostics）
//   - 名前やタグにカーソルを置くと型を表示する（hover）
//   - 定義へ移動する（definition）

import { fileURLToPath, pathToFileURL } from "node:url";
import { compileProgram, type ProgramResult } from "./compiler.ts";
import type { HoverInfo } from "./checker.ts";
import { CompileError, type Pos } from "./syntax.ts";

type Json = Record<string, any>;

const docs = new Map<string, string>(); // uri → 編集中の内容
const results = new Map<string, ProgramResult>(); // uri → 最後に成功した検査結果
const timers = new Map<string, NodeJS.Timeout>();

// ---- 通信 ----

function send(msg: Json) {
  const body = JSON.stringify({ jsonrpc: "2.0", ...msg });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

const respond = (id: number | string, result: unknown) => send({ id, result });
const notify = (method: string, params: unknown) => send({ method, params });

let buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = buffer.subarray(0, headerEnd).toString("ascii");
    const m = /Content-Length: *(\d+)/i.exec(header);
    if (!m) {
      buffer = buffer.subarray(headerEnd + 4);
      continue;
    }
    const length = Number(m[1]);
    if (buffer.length < headerEnd + 4 + length) return;
    const body = buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString("utf8");
    buffer = buffer.subarray(headerEnd + 4 + length);
    try {
      handle(JSON.parse(body));
    } catch (e) {
      process.stderr.write(`lambda-jsx lsp: ${e instanceof Error ? e.stack : e}\n`);
    }
  }
});

// ---- 位置の変換 ----

const toRange = (pos: Pos, length: number) => ({
  start: { line: pos.line - 1, character: pos.col - 1 },
  end: { line: pos.line - 1, character: pos.col - 1 + length },
});

function contains(h: HoverInfo, line: number, character: number): boolean {
  return h.pos.line - 1 === line && character >= h.pos.col - 1 && character < h.pos.col - 1 + h.length;
}

function hoverAt(uri: string, line: number, character: number): HoverInfo | null {
  const result = results.get(uri);
  if (!result) return null;
  const file = fileURLToPath(uri);
  const mod = result.modules.find((m) => m.file === file);
  if (!mod) return null;
  // 同じ場所に複数あるときは、いちばん短い（内側の）ものを使う
  const hits = mod.hovers.filter((h) => contains(h, line, character)).sort((a, b) => a.length - b.length);
  return hits[0] ?? null;
}

// ---- 検査 ----

function validate(uri: string) {
  const file = fileURLToPath(uri);
  const overrides = new Map<string, string>();
  for (const [u, text] of docs) overrides.set(fileURLToPath(u), text);
  let diagnostics: Json[] = [];
  try {
    results.set(uri, compileProgram(file, { overrides, requireMain: false }));
  } catch (e) {
    if (!(e instanceof CompileError)) {
      process.stderr.write(`lambda-jsx lsp: ${e instanceof Error ? e.stack : e}\n`);
      return;
    }
    const here = !e.file || e.file === file;
    const range = here && e.pos ? toRange(e.pos, 1) : toRange({ line: 1, col: 1 }, 0);
    const message = here ? e.message : `${e.format()}`;
    diagnostics = [{ range, severity: 1, source: "lambda-jsx", message }];
  }
  notify("textDocument/publishDiagnostics", { uri, diagnostics });
}

function schedule(uri: string) {
  clearTimeout(timers.get(uri));
  timers.set(uri, setTimeout(() => validate(uri), 150));
}

// ---- メッセージの処理 ----

function handle(msg: Json) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      respond(id, {
        capabilities: { textDocumentSync: 1, hoverProvider: true, definitionProvider: true },
        serverInfo: { name: "lambda-jsx", version: "0.1.0" },
      });
      return;
    case "shutdown":
      respond(id, null);
      return;
    case "exit":
      process.exit(0);
    case "textDocument/didOpen":
      docs.set(params.textDocument.uri, params.textDocument.text);
      schedule(params.textDocument.uri);
      return;
    case "textDocument/didChange":
      docs.set(params.textDocument.uri, params.contentChanges[params.contentChanges.length - 1].text);
      schedule(params.textDocument.uri);
      return;
    case "textDocument/didSave":
      schedule(params.textDocument.uri);
      return;
    case "textDocument/didClose":
      docs.delete(params.textDocument.uri);
      results.delete(params.textDocument.uri);
      notify("textDocument/publishDiagnostics", { uri: params.textDocument.uri, diagnostics: [] });
      return;
    case "textDocument/hover": {
      const h = hoverAt(params.textDocument.uri, params.position.line, params.position.character);
      respond(
        id,
        h && {
          contents: { kind: "markdown", value: "```haskell\n" + `${h.name} :: ${h.type()}` + "\n```" },
          range: toRange(h.pos, h.length),
        },
      );
      return;
    }
    case "textDocument/definition": {
      const h = hoverAt(params.textDocument.uri, params.position.line, params.position.character);
      respond(id, h?.def ? { uri: pathToFileURL(h.def.file).href, range: toRange(h.def.pos, 0) } : null);
      return;
    }
    default:
      if (id !== undefined) send({ id, error: { code: -32601, message: `未対応のメソッド: ${method}` } });
  }
}
