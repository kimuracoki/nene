// Nene の VS Code 拡張。ハイライトは syntaxes/ の文法で、それ以外（型エラー・補完・定義へ移動・
// 名前の変更・整形など）は、プロジェクトに入っている nene の言語サーバー（nene lsp）が受け持つ
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const vscode = require("vscode");
const { LanguageClient } = require("vscode-languageclient/node");

let client = null;

// 1. 設定 nene.server.path  2. ワークスペースの node_modules/.bin/nene  3. PATH の nene
function serverCommand() {
  const configured = vscode.workspace.getConfiguration("nene").get("server.path");
  if (configured) return configured;
  const bin = process.platform === "win32" ? "nene.cmd" : "nene";
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const local = join(folder.uri.fsPath, "node_modules", ".bin", bin);
    if (existsSync(local)) return local;
  }
  return bin;
}

async function start() {
  const command = serverCommand();
  const server = { command, args: ["lsp"], options: { shell: process.platform === "win32" } };
  client = new LanguageClient("nene", "Nene", { run: server, debug: server }, { documentSelector: [{ language: "nene" }] });
  try {
    await client.start();
  } catch {
    client = null;
    vscode.window.showWarningMessage("Nene の言語サーバーを起動できませんでした。プロジェクトで npm install を実行してください（または設定 nene.server.path で場所を指定）");
  }
}

async function stop() {
  if (client) await client.stop().catch(() => {});
  client = null;
}

exports.activate = async (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("nene.restartServer", async () => {
      await stop();
      await start();
    }),
  );
  await start();
};

exports.deactivate = stop;
