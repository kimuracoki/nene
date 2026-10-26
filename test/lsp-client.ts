import { spawn } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

// 言語サーバーを起動し、メッセージを送受信する小さなクライアント
export function startServer() {
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

