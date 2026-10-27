import { join } from "node:path";
import { JSDOM } from "jsdom";
import { bundle, compileProgram, type CompileOptions, type ProgramResult } from "../src/compiler.ts";
import { CompileError } from "../src/syntax.ts";

const ROOT = "/virtual";

// ファイル名と中身の組から、メモリ上だけでコンパイルする
export function compile(files: Record<string, string>, entry = "Main", opts: CompileOptions = {}): ProgramResult {
  const overrides = new Map(Object.entries(files).map(([name, src]) => [`${ROOT}/${name.replace(/\./g, "/")}.nn`, src]));
  return compileProgram(`${ROOT}/${entry}.nn`, { ...opts, overrides });
}

// コンパイルエラーのメッセージを返す（成功したら例外）
export function compileError(files: Record<string, string>, entry = "Main"): string {
  try {
    compile(files, entry);
  } catch (e) {
    if (e instanceof CompileError) return e.message;
    throw e;
  }
  throw new Error("コンパイルが成功してしまいました");
}

// すべてのコンパイルエラーのメッセージ
export function compileErrors(files: Record<string, string>, entry = "Main"): string[] {
  try {
    compile(files, entry);
  } catch (e) {
    if (e instanceof CompileError) return e.all.map((x) => x.message);
    throw e;
  }
  throw new Error("コンパイルが成功してしまいました");
}

export function mainModule(body: string): Record<string, string> {
  return { Main: `module Main (main) where\n\n${body}\n` };
}

export interface DomOptions {
  url?: string; // 開いているページの URL
  base?: string; // アプリの置き場所（nene build --base）
  env?: Record<string, string>; // .env の値
  setup?: (window: JSDOM["window"]) => void; // アプリを動かす前に window を整える（fetch を差し替えるなど）
}

export async function runInDom(files: Record<string, string>, entry = "Main", options: DomOptions = {}) {
  return runProgram(compile(files, entry), options);
}

// examples/ のサンプルを、ディスクから読んで動かす（nene-lang-ui などのパッケージも読み込まれる）
export async function runExample(name: string, options: DomOptions = {}) {
  return runProgram(compileProgram(join(import.meta.dirname, "..", "examples", `${name}.nn`)), options);
}

export async function runProgram(program: ProgramResult, options: DomOptions) {
  const js = bundle(program, {
    base: JSON.stringify(options.base ?? "/"),
    env: JSON.stringify(options.env ?? {}),
  });
  const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="app"></div></body></html>`, {
    url: options.url ?? "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.scrollTo = () => {}; // jsdom にはスクロールがない
  options.setup?.(dom.window);
  dom.window.eval(js);
  const document = dom.window.document;
  const frame = () => new Promise((r) => dom.window.requestAnimationFrame(() => r(undefined)));
  return {
    window: dom.window,
    document,
    // テキストノードを空白でつないだもの
    text: () => {
      const walker = document.createTreeWalker(document.getElementById("app")!, dom.window.NodeFilter.SHOW_TEXT);
      const parts: string[] = [];
      while (walker.nextNode()) parts.push(walker.currentNode.nodeValue!.trim());
      return parts.filter(Boolean).join(" ");
    },
    click: async (selector: string, index = 0) => {
      (document.querySelectorAll(selector)[index] as HTMLElement).click();
      await frame();
    },
    input: async (selector: string, value: string) => {
      const el = document.querySelector(selector) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      await frame();
    },
    submit: async (selector: string) => {
      const el = document.querySelector(selector) as HTMLFormElement;
      el.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      await frame();
    },
    frame,
  };
}
