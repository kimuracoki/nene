#!/usr/bin/env node
// npm create nene-lang <名前> から呼ばれる。中身は nene new <名前> と同じ
process.argv.splice(2, 0, "new");
if (process.argv.length === 3) process.argv.push("my-app");
await import("nene-lang/cli");
