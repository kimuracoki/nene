// サンプルを Vite で動かす設定（npm run dev）
import { resolve } from "node:path";
import { defineConfig } from "vite";
import lambdaJsx from "./src/vite.ts";

export default defineConfig({
  root: "examples",
  plugins: [lambdaJsx()],
  build: {
    outDir: "../dist/vite",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "examples/index.html"),
        counter: resolve(import.meta.dirname, "examples/counter.html"),
        gallery: resolve(import.meta.dirname, "examples/gallery.html"),
      },
    },
  },
});
