// Claude Code が .nn ファイルを書き換えたら型検査をして、エラーがあれば Claude に伝える
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path ?? "";
if (!file.endsWith(".nn")) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const nene = join(root, "node_modules", ".bin", "nene");
if (!existsSync(nene)) process.exit(0); // npm install の前

try {
  execFileSync(nene, ["check"], { cwd: root, stdio: ["ignore", "ignore", "pipe"] });
} catch (e) {
  // 終了コード 2 で、標準エラーの内容が Claude に届く
  process.stderr.write(e.stderr ?? String(e));
  process.exit(2);
}
