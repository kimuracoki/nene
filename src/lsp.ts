#!/usr/bin/env node
// Nene の言語サーバー（Language Server Protocol、標準入出力で通信する）
//
// できること:
//   - 保存前の内容も含めて型検査し、エラーを表示する（diagnostics）
//   - 名前やタグにカーソルを置くと型を表示する（hover）
//   - 定義へ移動する（definition）、参照一覧（references）、名前の一括変更（rename）
//   - 補完（タグと必須の属性・閉じタグ、属性、import するモジュール、フィールド、名前）
//   - 関数の引数のヒント（signatureHelp）
//   - 色分け（部品と HTML 要素、コンストラクタ、フィールド、引数などを区別する semantic tokens）
//   - アウトライン（documentSymbol）、プロジェクト全体のシンボル検索（workspace/symbol）
//   - 折りたたみ（foldingRange）、構造に沿った選択（selectionRange）
//   - 整形（formatting。nene fmt と同じ）
//   - コードアクション（部品の import を足す、JSX の {} の式を where に取り出す）

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { codeActions } from "./actions.ts";
import { compileProgram, listModules, projectFiles, projectRoot, type CompiledModule, type ProgramResult } from "./compiler.ts";
import { format } from "./format.ts";
import { foldingRanges, outline, parse, selectionRange, type OutlineSymbol } from "./outline.ts";
import { definitionOf, referencesOf, renameProblem, replacementFor, type Occurrence } from "./references.ts";
import { HTML_ATTRS, HTML_ELEMENTS, type HoverInfo, type SemType, type TagCandidate } from "./checker.ts";
import { CompileError, type Pos } from "./syntax.ts";
import { flattenRecord, prune } from "./types.ts";

type Json = Record<string, any>;

const VERSION: string = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

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

// ---- プロジェクト全体 ----

function textOf(uri: string): string {
  const open = docs.get(uri);
  if (open !== undefined) return open;
  try {
    return readFileSync(fileURLToPath(uri), "utf8");
  } catch {
    return "";
  }
}

// このファイルのプロジェクトのフォルダ（src/ など。モジュール名から求める）
function rootOf(uri: string): string | null {
  const name = /^module\s+([\w.]+)/m.exec(textOf(uri))?.[1];
  return name ? projectRoot(fileURLToPath(uri), name) : null;
}

// プロジェクトのすべてのモジュールを、編集中の内容で型検査したもの。型検査の通らないモジュールは除く
function projectModules(uri: string): CompiledModule[] {
  const root = rootOf(uri);
  if (!root) return compiledModule(uri) ? [compiledModule(uri)!] : [];
  const overrides = new Map<string, string>();
  for (const [u, text] of docs) overrides.set(fileURLToPath(u), text);
  const seen = new Map<string, CompiledModule>();
  for (const file of projectFiles(root)) {
    if (seen.has(file)) continue;
    try {
      for (const m of compileProgram(file, { overrides, requireMain: false }).modules) seen.set(m.file, m);
    } catch {
      // エラーのあるモジュールは、参照を数えられない
    }
  }
  return [...seen.values()];
}

const inside = (file: string, root: string) => file.startsWith(root.endsWith("/") ? root : root + "/");

function locationOf(o: Occurrence) {
  return { uri: pathToFileURL(o.file).href, range: toRange(o.pos, o.length) };
}

function references(uri: string, line: number, character: number): Json[] {
  const h = hoverAt(uri, line, character);
  const def = h && definitionOf(h);
  if (!def) return [];
  return referencesOf(def, projectModules(uri)).map(locationOf);
}

// 名前を変えられるかを確かめ、変える名前の範囲を返す。変えられないときは理由
function renameTarget(uri: string, line: number, character: number): { def: ReturnType<typeof definitionOf>; occurrence: Occurrence } | string {
  const h = hoverAt(uri, line, character);
  const def = h && definitionOf(h);
  if (!h || !def || h.label?.().startsWith("module ")) return "ここには変えられる名前がありません";
  const root = rootOf(uri);
  if (!root || !inside(def.file, root)) return "標準ライブラリやパッケージの名前は変えられません";
  const name = h.name.slice(h.name.lastIndexOf(".") + 1);
  const file = def.file.split("/").pop()!.replace(/\.nn$/, "");
  if (name.toLowerCase() === file.toLowerCase()) return `${name} はファイルと同じ名前の主部品なので、ファイル名と一緒に変えてください`;
  const col = h.pos.col + (h.name.length - name.length);
  return { def, occurrence: { file: fileURLToPath(uri), pos: { line: h.pos.line, col }, length: name.length, text: name } };
}

function rename(uri: string, line: number, character: number, newName: string): Json {
  const target = renameTarget(uri, line, character);
  if (typeof target === "string") throw new LspError(target);
  const refs = referencesOf(target.def!, projectModules(uri));
  // 定義に書いてある名前で、新しい名前の種類を確かめる
  const original = refs.find((r) => r.file === target.def!.file && r.pos.line === target.def!.pos.line)?.text ?? target.occurrence.text;
  const problem = renameProblem(original, newName);
  if (problem) throw new LspError(problem);
  const changes: Record<string, Json[]> = {};
  for (const r of refs) {
    const u = pathToFileURL(r.file).href;
    // 型検査のあとで書き換わっていたら、その場所は変えない
    const lineText = textOf(u).split("\n")[r.pos.line - 1] ?? "";
    if (lineText.slice(r.pos.col - 1, r.pos.col - 1 + r.length) !== r.text) continue;
    (changes[u] ??= []).push({ range: toRange(r.pos, r.length), newText: replacementFor(r.text, newName) });
  }
  return { changes };
}

class LspError extends Error {}

// ---- シンボル ----

function workspaceSymbols(query: string): Json[] {
  const anyUri = [...docs.keys()][0];
  const root = anyUri ? rootOf(anyUri) : null;
  if (!root) return [];
  const q = query.toLowerCase();
  const out: Json[] = [];
  for (const file of projectFiles(root)) {
    const uri = pathToFileURL(file).href;
    const text = textOf(uri);
    const mod = parse(text, file);
    if (!mod) continue;
    const walk = (symbols: OutlineSymbol[], container?: string) => {
      for (const sym of symbols) {
        if (sym.name.toLowerCase().includes(q)) out.push({ name: sym.name, kind: sym.kind, containerName: container ?? mod.name, location: { uri, range: sym.selectionRange } });
        if (sym.children) walk(sym.children, sym.name);
      }
    };
    walk(outline(text, mod));
  }
  return out.slice(0, 500);
}

// ---- 引数のヒント ----

// カーソルの前にある関数適用（f a b ...）の、関数の型と、いま何番目の引数を書いているか
function signatureHelp(uri: string, line: number, character: number): Json | null {
  const mod = compiledModule(uri);
  if (!mod) return null;
  const before = (textOf(uri).split("\n")[line] ?? "").slice(0, character);
  // 開いた括弧や = のあとから、カーソルまでを見る
  let depth = 0;
  let start = before.length;
  for (let i = before.length - 1; i >= 0; i--) {
    const c = before[i];
    if (c === ")" || c === "]" || c === "}") depth++;
    else if (c === "(" || c === "[" || c === "{") {
      if (depth === 0) break;
      depth--;
    } else if (depth === 0 && (c === "=" || c === "," || c === "|" || c === "$")) break;
    start = i;
  }
  const expr = before.slice(start);
  const m = /^\s*([A-Z][\w]*(?:\.[A-Z][\w]*)*\.)?([a-z_][\w']*)\s/.exec(expr);
  if (!m) return null;
  const name = (m[1] ?? "") + m[2];
  const detail = m[1]
    ? mod.completion.quals.get(m[1].slice(0, -1))?.find((q) => q.name === m[2])?.detail
    : mod.completion.values.find((v) => v.name === name)?.detail;
  if (!detail || !detail.includes("->")) return null;
  const params = splitArrows(detail);
  params.pop(); // 結果の型
  // 書き終えた引数の数（括弧の中をまとめた単語の数）
  const args = expr.slice(m[0].length).replace(/\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\}|"[^"]*"/g, "x").trim();
  const written = args === "" ? 0 : args.split(/\s+/).length - (before.endsWith(" ") ? 0 : 1);
  const label = `${name} :: ${detail}`;
  let offset = label.indexOf("::") + 3;
  const parameters = params.map((p) => {
    const at = label.indexOf(p, offset);
    offset = at + p.length;
    return { label: [at, at + p.length] };
  });
  return { signatures: [{ label, parameters }], activeSignature: 0, activeParameter: Math.min(written, Math.max(0, params.length - 1)) };
}

// a -> (b -> c) -> d を [a, (b -> c), d] に分ける
function splitArrows(type: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < type.length; i++) {
    const c = type[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && type.startsWith(" -> ", i)) {
      out.push(type.slice(start, i).trim());
      start = i + 4;
      i += 3;
    }
  }
  out.push(type.slice(start).trim());
  return out;
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
          referencesProvider: true,
          renameProvider: { prepareProvider: true },
          documentSymbolProvider: true,
          workspaceSymbolProvider: true,
          foldingRangeProvider: true,
          selectionRangeProvider: true,
          documentFormattingProvider: true,
          codeActionProvider: { codeActionKinds: ["quickfix", "refactor.extract"] },
          signatureHelpProvider: { triggerCharacters: [" "], retriggerCharacters: [" "] },
        },
        serverInfo: { name: "nene", version: VERSION },
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
    case "textDocument/references":
      respond(id, references(params.textDocument.uri, params.position.line, params.position.character));
      return;
    case "textDocument/prepareRename": {
      const target = renameTarget(params.textDocument.uri, params.position.line, params.position.character);
      if (typeof target === "string") send({ id, error: { code: -32803, message: target } });
      else respond(id, { range: toRange(target.occurrence.pos, target.occurrence.length), placeholder: target.occurrence.text });
      return;
    }
    case "textDocument/rename":
      try {
        respond(id, rename(params.textDocument.uri, params.position.line, params.position.character, params.newName));
      } catch (e) {
        if (!(e instanceof LspError)) throw e;
        send({ id, error: { code: -32803, message: e.message } });
      }
      return;
    case "textDocument/documentSymbol": {
      const uri = params.textDocument.uri;
      const mod = parse(textOf(uri), fileURLToPath(uri));
      respond(id, mod ? outline(textOf(uri), mod) : []);
      return;
    }
    case "workspace/symbol":
      respond(id, workspaceSymbols(params.query ?? ""));
      return;
    case "textDocument/foldingRange": {
      const uri = params.textDocument.uri;
      respond(id, foldingRanges(textOf(uri), parse(textOf(uri), fileURLToPath(uri))));
      return;
    }
    case "textDocument/selectionRange": {
      const uri = params.textDocument.uri;
      const mod = parse(textOf(uri), fileURLToPath(uri));
      respond(id, params.positions.map((p: Json) => selectionRange(textOf(uri), mod, p.line, p.character) ?? { range: { start: p, end: p } }));
      return;
    }
    case "textDocument/formatting": {
      const text = textOf(params.textDocument.uri);
      const formatted = format(text);
      const lines = text.split("\n");
      const whole = { start: { line: 0, character: 0 }, end: { line: lines.length, character: 0 } };
      respond(id, formatted === text ? [] : [{ range: whole, newText: formatted }]);
      return;
    }
    case "textDocument/codeAction": {
      const uri = params.textDocument.uri;
      const root = rootOf(uri);
      respond(id, codeActions({ uri, text: textOf(uri), diagnostics: params.context.diagnostics, modules: root ? listModules(root) : [] }));
      return;
    }
    case "textDocument/signatureHelp":
      respond(id, signatureHelp(params.textDocument.uri, params.position.line, params.position.character));
      return;
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
