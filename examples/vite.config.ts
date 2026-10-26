// 複数のページ（サンプルごとの .html）をまとめてビルドするための設定。
// 1 ページだけのアプリなら、この設定ファイルはいらない。
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        ["index", "counter", "gallery", "stopwatch"].map((name) => [name, resolve(import.meta.dirname, `${name}.html`)]),
      ),
    },
  },
});
