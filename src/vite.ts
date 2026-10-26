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
// どれかの .nn を保存すると、ブラウザが再読み込みされる。

import type { Plugin } from "vite";
import { LIB_FILES, RUNTIME_FILE, bundle, compileProgram } from "./compiler.ts";
import { CompileError } from "./syntax.ts";

export interface NeneOptions {
  // 描画先の要素の id（既定は "app"）
  mount?: string;
}

export default function nene(options: NeneOptions = {}): Plugin {
  return {
    name: "nene",
    load(id) {
      const file = id.split("?")[0];
      if (!file.endsWith(".nn")) return null;
      try {
        const result = compileProgram(file);
        for (const f of [...result.files, ...LIB_FILES, RUNTIME_FILE]) this.addWatchFile(f);
        return { code: bundle(result, options.mount), map: null };
      } catch (e) {
        if (e instanceof CompileError) {
          // Vite のエラー表示（オーバーレイ）に、場所つきで出す
          const rest = e.all.slice(1).map((x) => x.format());
          const message = [e.message, ...rest].join("\n\n");
          const err = new Error(message) as Error & { loc?: object; id?: string; plugin?: string };
          err.id = e.file ?? file;
          err.stack = ""; // コンパイラ内部の呼び出し履歴は、使う人には関係ないので出さない
          if (e.pos) err.loc = { file: e.file ?? file, line: e.pos.line, column: e.pos.col - 1 };
          throw err;
        }
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
          res.end(result.code);
        } catch (e) {
          next(e);
        }
      });
    },
    handleHotUpdate(ctx) {
      // .nn はモジュール単位の差し替えをしないので、ページごと読み直す
      if (ctx.file.endsWith(".nn")) {
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}
