#!/usr/bin/env node
// npm create tufa <名前> から呼ばれる。中身は tufa new <名前> と同じ
process.argv.splice(2, 0, "new");
if (process.argv.length === 3) process.argv.push("my-app");
await import("@tufa/tufa/cli");
