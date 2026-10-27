// nene test。プロジェクトの test/ の下のファイルを型検査し、tests :: [Test] を Node の中で実行する
//
//   test/RouteTest.nn
//     ✓ / はホーム
//     ✗ /guide は使い方のページ
//         期待: Guide
//         実際: NotFound

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { bundle, compileProgram } from "./compiler.ts";
import { CompileError } from "./syntax.ts";
import { show } from "./types.ts";

type Value = unknown;

interface TestValue {
  $test: "equal" | "group";
  name: string;
  actual?: Value;
  expected?: Value;
  tests?: TestValue[];
}

export interface TestResult {
  file: string;
  name: string[]; // group の見出しから並べた名前
  passed: boolean;
  actual?: string;
  expected?: string;
}

// プロジェクトの test/ にある .nn
export function testFiles(projectRoot: string): string[] {
  const dir = join(projectRoot, "test");
  if (!existsSync(dir)) return [];
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      if (e.name.startsWith(".")) return [];
      if (e.isDirectory()) return walk(join(d, e.name));
      return e.name.endsWith(".nn") ? [join(d, e.name)] : [];
    });
  return walk(dir).sort();
}

// 1 つのファイルのテストを実行する。型のエラーは CompileError として投げる
export function runTestFile(file: string): TestResult[] {
  const program = compileProgram(file, { requireMain: false });
  const tests = program.entry.iface.values.get("tests");
  if (!tests || show(tests.scheme.type) !== "[Test]") {
    throw new CompileError("テストのファイルは tests :: [Test] を export してください", { line: 1, col: 1 }, file);
  }
  const code = bundle(program, { test: true });
  const { rt, tests: values } = runInNewContext(code, { URL, console }) as { rt: { eq: (a: Value, b: Value) => boolean }; tests: TestValue[] };
  const out: TestResult[] = [];
  const visit = (t: TestValue, path: string[]) => {
    const name = [...path, t.name];
    if (t.$test === "group") {
      for (const child of t.tests ?? []) visit(child, name);
    } else if (rt.eq(t.actual, t.expected)) {
      out.push({ file, name, passed: true });
    } else {
      out.push({ file, name, passed: false, actual: inspect(t.actual), expected: inspect(t.expected) });
    }
  };
  for (const t of values) visit(t, []);
  return out;
}

// 値を Nene の書き方で表す（Just 3、{ count = 1 }、"文字"）。リストと組はどちらも [ ] で表す
export function inspect(v: Value, nested = false): string {
  if (v === null || v === undefined) return "()";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return nested && v < 0 ? `(${v})` : String(v);
  if (typeof v === "function") return "<関数>";
  if (Array.isArray(v)) return `[${v.map((x) => inspect(x)).join(", ")}]`;
  const o = v as Record<string, Value>;
  if (typeof o.$ === "string") {
    const args = (o.a as Value[] | undefined) ?? [];
    const text = [o.$, ...args.map((a) => inspect(a, true))].join(" ");
    return nested && args.length > 0 ? `(${text})` : text;
  }
  if (o.t === "el" || o.t === "text") return "<Html>";
  const fields = Object.entries(o).map(([k, x]) => `${k} = ${inspect(x)}`);
  return fields.length === 0 ? "{}" : `{ ${fields.join(", ")} }`;
}
