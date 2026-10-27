// Vite プラグイン
//
//   // vite.config.ts
//   import nene from "nene-lang/vite";
//   export default { plugins: [nene()] };
//
//   <!-- index.html -->
//   <div id="app"></div>
//   <script type="module" src="/src/Main.nn"></script>
//
// 入口の .nn を、依存する .nn ごと 1 つの JavaScript にして返す。
// どれかの .nn を保存すると、ブラウザが再読み込みされる。ソースマップつきなので、開発者ツールでは .nn の行で止められる。

import type { Plugin } from "vite";
import { LIB_FILES, RUNTIME_FILES, bundleWithMap, compileProgram } from "./compiler.ts";
import { errorFrame } from "./report.ts";
import { CompileError } from "./syntax.ts";

export interface NeneOptions {
  // 描画先の要素の id（既定は "app"）
  mount?: string;
}

export default function nene(options: NeneOptions = {}): Plugin {
  return {
    name: "nene",
    // .env の NENE_ で始まる値を、Env.get で読めるようにする
    config: () => ({ envPrefix: "NENE_" }),
    load(id) {
      const file = id.split("?")[0];
      if (!file.endsWith(".nn")) return null;
      try {
        const result = compileProgram(file);
        for (const f of [...result.files, ...LIB_FILES, ...RUNTIME_FILES]) this.addWatchFile(f);
        // ソースマップで、ブラウザの開発者ツールに .nn の行が出る（止める場所も .nn に置ける）
        return bundleWithMap(result, { mount: options.mount, base: "import.meta.env.BASE_URL", env: "import.meta.env" });
      } catch (e) {
        if (e instanceof CompileError) throw overlayError(e, file);
        throw e;
      }
    },
    configureServer(server) {
      // 開発サーバーは未知の拡張子をそのまま返すので、.nn は自分で JavaScript に変換して返す
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.split("?")[0].endsWith(".nn")) return next();
        try {
          const result = await server.transformRequest(url);
          if (!result) return next();
          res.setHeader("Content-Type", "text/javascript; charset=utf-8");
          const map = result.map && "mappings" in result.map ? `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(result.map)).toString("base64")}\n` : "";
          res.end(result.code + map);
        } catch (e) {
          next(e);
        }
      });
    },
    handleHotUpdate(ctx) {
      // .nn はモジュール単位の差し替えをしないので、ページごと読み直す。
      // 入口の .nn は依存する .nn ごと 1 つにまとめているので、変換済みのものをすべて捨てる
      if (ctx.file.endsWith(".nn")) {
        const graph = ctx.server.moduleGraph;
        for (const mod of graph.idToModuleMap.values()) {
          if (mod.id?.split("?")[0].endsWith(".nn")) graph.invalidateModule(mod);
        }
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

// Vite のエラー表示（オーバーレイ）に、場所と該当する行つきで出す
function overlayError(e: CompileError, entry: string): Error {
  const rest = e.all.slice(1).map((x) => x.format());
  const err = new Error([e.message, ...rest].join("\n\n")) as Error & { loc?: object; id?: string; frame?: string };
  err.id = e.file ?? entry;
  err.stack = ""; // コンパイラ内部の呼び出し履歴は、使う人には関係ないので出さない
  if (e.pos) err.loc = { file: e.file ?? entry, line: e.pos.line, column: e.pos.col - 1 };
  err.frame = errorFrame(e);
  return err;
}
