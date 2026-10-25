#!/usr/bin/env node
// lx コマンド
//   lx build <Main.lx> [-o dist]   ブラウザで動く index.html と app.js を出力する
//   lx check <File.lx>             型検査だけを行う
//   lx dev <Main.lx> [--port 5173] 変更を監視して、ブラウザを自動で再読み込みする開発サーバー

import { mkdirSync, writeFileSync, watch } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { basename, dirname, join, resolve } from "node:path";
import { bundle, compileProgram, htmlPage } from "./compiler.ts";
import { CompileError } from "./syntax.ts";

function usage(): never {
  console.error("使い方:\n  lx build <Main.lx> [-o dist]\n  lx check <File.lx>\n  lx dev <Main.lx> [--port 5173]");
  process.exit(2);
}

function option(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? usage()) : null;
}

function report(e: unknown): void {
  if (e instanceof CompileError) console.error(`エラー ${e.format()}`);
  else throw e;
}

const [command, file, ...rest] = process.argv.slice(2);
if (!command || !file) usage();
const entry = resolve(file);

switch (command) {
  case "build": {
    const out = resolve(option(rest, "-o") ?? "dist");
    try {
      const js = bundle(compileProgram(entry));
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, "app.js"), js);
      writeFileSync(join(out, "index.html"), htmlPage(basename(entry, ".lx"), "./app.js"));
      console.log(`${join(out, "index.html")} を出力しました`);
    } catch (e) {
      report(e);
      process.exit(1);
    }
    break;
  }
  case "check": {
    try {
      compileProgram(entry, { requireMain: false });
      console.log("OK");
    } catch (e) {
      report(e);
      process.exit(1);
    }
    break;
  }
  case "dev": {
    const port = Number(option(rest, "--port") ?? 5173);
    const clients = new Set<ServerResponse>();
    const reloadScript = `new EventSource("/__lx_reload").onmessage = () => location.reload();`;
    const errorPage = (message: string) =>
      `document.body.innerHTML = ${JSON.stringify(`<pre style="padding:24px;color:#b42318;font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(message)}</pre>`)};`;
    const server = createServer((req, res) => {
      if (req.url === "/__lx_reload") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        res.write("\n");
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      if (req.url === "/app.js") {
        let js: string;
        try {
          js = bundle(compileProgram(entry));
        } catch (e) {
          if (!(e instanceof CompileError)) throw e;
          console.error(`エラー ${e.format()}`);
          js = errorPage(e.format());
        }
        res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        res.end(`${js}\n${reloadScript}\n`);
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlPage(basename(entry, ".lx"), "/app.js"));
    });
    watch(dirname(entry), { recursive: true }, (_event, name) => {
      if (!name || !name.endsWith(".lx")) return;
      for (const c of clients) c.write("data: reload\n\n");
    });
    server.listen(port, () => console.log(`http://localhost:${port}/ で起動しました（${basename(entry)} を監視中）`));
    break;
  }
  default:
    usage();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}
