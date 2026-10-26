#!/usr/bin/env node
// tufa コマンドの入口。
// 手元のリポジトリ（src/ がある）から動かすときは TypeScript のソースをそのまま使い、
// npm から入れたときはビルド済みの build/ を使う。
import { existsSync } from "node:fs";

const source = new URL("../src/cli.ts", import.meta.url);
const canStripTypes = process.features?.typescript !== undefined && process.features.typescript !== false;
if (existsSync(source) && canStripTypes) {
  await import(source.href);
} else {
  await import(new URL("../build/cli.js", import.meta.url).href);
}
