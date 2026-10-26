// Claude Code が .ts ファイルを書き換えたら tsc を実行して、エラーがあれば Claude に伝える
import { execFileSync } from "node:child_process";
import { join } from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path ?? "";
if (!file.endsWith(".ts")) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
try {
  execFileSync(join(root, "node_modules", ".bin", "tsc"), { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  // 終了コード 2 で、標準エラーの内容が Claude に届く（tsc はエラーを標準出力に出す）
  process.stderr.write(String(e.stdout ?? "") + String(e.stderr ?? ""));
  process.exit(2);
}
