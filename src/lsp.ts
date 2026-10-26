#!/usr/bin/env node
// Nene の言語サーバー（Language Server Protocol、標準入出力で通信する）
//
// できること:
//   - 保存前の内容も含めて型検査し、エラーを表示する（diagnostics）
//   - 名前やタグにカーソルを置くと型を表示する（hover）
//   - 定義へ移動する（definition）
//   - 補完（タグと必須の属性・閉じタグ、属性、import するモジュール、フィールド、名前）
//   - 色分け（部品と HTML 要素、コンストラクタ、フィールド、引数などを区別する semantic tokens）

import { fileURLToPath, pathToFileURL } from "node:url";
import { compileProgram, listModules, projectRoot, type CompiledModule, type ProgramResult } from "./compiler.ts";
import { HTML_ATTRS, HTML_ELEMENTS, type HoverInfo, type SemType, type TagCandidate } from "./checker.ts";
import { CompileError, type Pos } from "./syntax.ts";
import { flattenRecord, prune } from "./types.ts";

type Json = Record<string, any>;

const docs = new Map<string, string>(); // uri → 編集中の内容
const results = new Map<string, { result: ProgramResult; text: string }>(); // uri → 最後に成功した検査結果と、そのときの内容
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
      process.stderr.write(`nene lsp: ${e instanceof Error ? e.stack : e}\n`);
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

function compiledModule(uri: string): CompiledModule | null {
  const cached = results.get(uri);
  if (!cached) return null;
  const file = fileURLToPath(uri);
  return cached.result.modules.find((m) => m.file === file) ?? null;
}

function hoverAt(uri: string, line: number, character: number): HoverInfo | null {
  const mod = compiledModule(uri);
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
    results.set(uri, { result: compileProgram(file, { overrides, requireMain: false }), text: docs.get(uri) ?? "" });
    if (supportsRefresh) send({ id: `refresh-${Date.now()}`, method: "workspace/semanticTokens/refresh" });
  } catch (e) {
    if (!(e instanceof CompileError)) {
      process.stderr.write(`nene lsp: ${e instanceof Error ? e.stack : e}\n`);
      return;
    }
    diagnostics = e.all.map((err) => {
      const here = !err.file || err.file === file;
      const range = here && err.pos ? toRange(err.pos, 1) : toRange({ line: 1, col: 1 }, 0);
      const message = here ? err.message : err.format();
      return { range, severity: 1, source: "nene", message };
    });
  }
  notify("textDocument/publishDiagnostics", { uri, diagnostics });
}

function schedule(uri: string) {
  clearTimeout(timers.get(uri));
  timers.set(uri, setTimeout(() => validate(uri), 150));
}

// ---- 色分け ----

const TOKEN_TYPES: SemType[] = ["namespace", "type", "class", "enumMember", "function", "variable", "parameter", "property", "macro"];

function semanticTokens(uri: string): number[] {
  const cached = results.get(uri);
  const mod = compiledModule(uri);
  // 編集中で検査が通っていないときは、古い位置で色をつけないよう空にする（syntax ファイルの色になる）
  if (!cached || !mod || cached.text !== docs.get(uri)) return [];
  const seen = new Set<string>();
  const tokens = mod.tokens
    .map((t) => ({ line: t.pos.line - 1, col: t.pos.col - 1, length: t.length, type: typeof t.type === "function" ? t.type() : t.type }))
    .filter((t) => {
      const key = `${t.line}:${t.col}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line - b.line || a.col - b.col);
  const data: number[] = [];
  let prevLine = 0;
  let prevCol = 0;
  for (const t of tokens) {
    const dLine = t.line - prevLine;
    const dCol = dLine === 0 ? t.col - prevCol : t.col;
    data.push(dLine, dCol, t.length, TOKEN_TYPES.indexOf(t.type), 0);
    prevLine = t.line;
    prevCol = t.col;
  }
  return data;
}

// ---- 補完 ----

const KIND = { function: 3, field: 5, variable: 6, module: 9, property: 10, enumMember: 20, class: 7, keyword: 14 };

function completion(uri: string, line: number, character: number): Json[] {
  const text = docs.get(uri) ?? "";
  const lines = text.split("\n");
  const before = (lines[line] ?? "").slice(0, character);
  const offset = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0) + character;
  const textBefore = text.slice(0, offset);
  const mod = compiledModule(uri);
  const edit = (prefix: string, newText: string) => ({
    range: { start: { line, character: character - prefix.length }, end: { line, character } },
    newText,
  });

  // import するモジュール
  const imp = /^import\s+(?:qualified\s+)?([\w.]*)$/.exec(before);
  if (imp) {
    const name = /^module\s+([\w.]+)/m.exec(text)?.[1];
    if (!name) return [];
    const root = projectRoot(fileURLToPath(uri), name);
    return listModules(root)
      .filter((m) => m !== name)
      .map((m) => ({ label: m, kind: KIND.module, textEdit: edit(imp[1], m) }));
  }

  // <Tag の属性
  const lt = textBefore.lastIndexOf("<");
  const inTag = lt >= 0 ? /^<([A-Za-z][A-Za-z0-9]*)(?:\s[^<>]*)?\s([A-Za-z]*)$/.exec(textBefore.slice(lt)) : null;
  if (inTag && !/[{"][^}"]*$/.test(textBefore.slice(lt))) {
    const [, tag, prefix] = inTag;
    const present = new Set([...textBefore.slice(lt).matchAll(/\s([A-Za-z][\w-]*)=/g)].map((m) => m[1]));
    if (/^[a-z]/.test(tag)) {
      return HTML_ATTRS.filter((a) => !present.has(a)).map((a) => ({
        label: a,
        kind: KIND.property,
        insertTextFormat: 2,
        textEdit: edit(prefix, `${a}={$1}`),
      }));
    }
    const cand = mod?.completion.tags.find((t) => t.name === tag);
    return (cand?.fields ?? [])
      .filter((f) => !present.has(f.name))
      .map((f) => ({
        label: f.name,
        detail: f.type + (f.required ? "（必須）" : ""),
        kind: KIND.property,
        sortText: (f.required ? "0" : "1") + f.name,
        insertTextFormat: 2,
        textEdit: edit(prefix, `${f.name}={$1}`),
      }));
  }

  // <Tag
  const open = /<([A-Za-z][A-Za-z0-9]*)?$/.exec(before);
  if (open) {
    const prefix = open[1] ?? "";
    const tags = (mod?.completion.tags ?? []).map((t) => ({
      label: t.name,
      detail: t.detail,
      kind: KIND.class,
      insertTextFormat: 2,
      textEdit: edit(prefix, tagSnippet(t)),
    }));
    const html = [...HTML_ELEMENTS].map((el) => ({
      label: el,
      kind: KIND.keyword,
      insertTextFormat: 2,
      textEdit: edit(prefix, el === "img" || el === "input" ? `${el} $0/>` : `${el}>$0</${el}>`),
    }));
    return [...tags, ...html];
  }

  // List. のような修飾名
  const qual = /([A-Z][\w]*(?:\.[A-Z][\w]*)*)\.([a-zA-Z_][\w']*)?$/.exec(before);
  if (qual) {
    const members = mod?.completion.quals.get(qual[1]) ?? [];
    return members.map((m) => ({ label: m.name, detail: m.detail, kind: KIND.function, textEdit: edit(qual[2] ?? "", m.name) }));
  }

  // record. のフィールド
  const field = /([a-z_][\w']*)\.([a-z_][\w']*)?$/.exec(before);
  if (field && mod) {
    const [, name, prefix = ""] = field;
    const col = character - prefix.length - 1 - name.length;
    const h = mod.hovers.find((x) => x.pos.line - 1 === line && x.pos.col - 1 === col && x.name === name && x.typeOf);
    const t = h?.typeOf ? prune(h.typeOf()) : null;
    if (!t || t.k !== "rec") return [];
    return [...flattenRecord(t).fields.keys()].map((f) => ({ label: f, kind: KIND.field, textEdit: edit(prefix, f) }));
  }

  // 名前
  const word = /([a-zA-Z_][\w']*)$/.exec(before)?.[1] ?? "";
  return (mod?.completion.values ?? []).map((v) => ({
    label: v.name,
    detail: v.detail,
    kind: /^[A-Z]/.test(v.name) ? KIND.enumMember : v.detail.includes("->") ? KIND.function : KIND.variable,
    textEdit: edit(word, v.name),
  }));
}

// <Button と打ったときに入れる中身。必須の属性と、閉じタグまで入れる
function tagSnippet(t: TagCandidate): string {
  let n = 0;
  const attrs = t.fields.filter((f) => f.required).map((f) => ` ${f.name}={$${++n}}`).join("");
  return t.children ? `${t.name}${attrs}>$0</${t.name}>` : `${t.name}${attrs} />$0`;
}

// ---- メッセージの処理 ----

let supportsRefresh = false;

function handle(msg: Json) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      supportsRefresh = !!params?.capabilities?.workspace?.semanticTokens?.refreshSupport;
      respond(id, {
        capabilities: {
          textDocumentSync: 1,
          hoverProvider: true,
          definitionProvider: true,
          completionProvider: { triggerCharacters: ["<", ".", " "] },
          semanticTokensProvider: { legend: { tokenTypes: TOKEN_TYPES, tokenModifiers: [] }, full: true },
        },
        serverInfo: { name: "nene", version: "0.1.0" },
      });
      return;
    case "textDocument/completion":
      respond(id, completion(params.textDocument.uri, params.position.line, params.position.character));
      return;
    case "textDocument/semanticTokens/full":
      respond(id, { data: semanticTokens(params.textDocument.uri) });
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
          contents: { kind: "markdown", value: "```haskell\n" + (h.label ? h.label() : `${h.name} :: ${h.type()}`) + "\n```" },
          range: toRange(h.pos, h.length),
        },
      );
      return;
    }
    case "textDocument/definition": {
      const h = hoverAt(params.textDocument.uri, params.position.line, params.position.character);
      const def = typeof h?.def === "function" ? h.def() : h?.def;
      respond(id, def ? { uri: pathToFileURL(def.file).href, range: toRange(def.pos, 0) } : null);
      return;
    }
    default:
      // クライアントへの要求（refresh）への返事は無視する
      if (id !== undefined && method !== undefined) send({ id, error: { code: -32601, message: `未対応のメソッド: ${method}` } });
  }
}
