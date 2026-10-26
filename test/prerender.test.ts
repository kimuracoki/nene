import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prerenderSite } from "../src/prerender.ts";

const SHELL = `<!doctype html>
<html>
  <head>
    <title>t</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
`;

// src/Main.nn と、ビルドしたあとの dist/index.html（中身の空の枠）を用意する
function site(main: string) {
  const dir = mkdtempSync(join(tmpdir(), "nene-pre-"));
  mkdirSync(join(dir, "src"));
  mkdirSync(join(dir, "dist"));
  writeFileSync(join(dir, "src", "Main.nn"), main);
  writeFileSync(join(dir, "dist", "index.html"), SHELL);
  return { entry: join(dir, "src", "Main.nn"), outDir: join(dir, "dist") };
}

const ROUTED = `module Main (main) where

data Route = Home | About | Post String | NotFound

data Msg = UrlChanged Url

update :: Msg -> Route -> Route
update (UrlChanged url) _ = route url

route :: Url -> Route
route { path = [] }              = Home
route { path = ["about"] }       = About
route { path = ["posts", slug] } = Post slug
route _                          = NotFound

view :: Route -> Html Msg
view r =
  <main class={css.page}>
    <nav>
      <a href="/">ホーム</a>
      <a href="/about#team">紹介</a>
      <a href="/posts/hello">はじめての投稿</a>
      <a href="https://example.com/">外のサイト</a>
    </nav>
    <h1>{title r}</h1>
  </main>
  where
    title Home     = "ホーム"
    title About    = "紹介"
    title (Post s) = "投稿 " ++ s
    title NotFound = "見つかりません"

main :: Program Route Msg
main = App.app { init = Home, update, view, onUrlChange = UrlChanged }


style
  .page { padding: 16px; }
`;

test("リンクをたどって、ページごとに HTML を作る", () => {
  const s = site(ROUTED);
  const pages = prerenderSite({ ...s, base: "/", env: {} });
  assert.deepEqual(pages, ["/", "/about", "/posts/hello"]);
  const home = readFileSync(join(s.outDir, "index.html"), "utf8");
  assert.match(home, /<div id="app"><main class="Main__page nene-Main">/);
  assert.match(home, /<h1 class="nene-Main">ホーム<\/h1>/);
  assert.match(home, /<style data-nene-prerender>[\s\S]*\.Main__page\.nene-Main/);
  assert.match(readFileSync(join(s.outDir, "about", "index.html"), "utf8"), /<h1[^>]*>紹介<\/h1>/);
  assert.match(readFileSync(join(s.outDir, "posts", "hello", "index.html"), "utf8"), /投稿 hello/);
});

test("置き場所（base）があるときは、リンクにも付けて、その分を除いてたどる", () => {
  const s = site(ROUTED);
  const pages = prerenderSite({ ...s, base: "/repo/", env: {} });
  assert.deepEqual(pages, ["/", "/about", "/posts/hello"]);
  assert.match(readFileSync(join(s.outDir, "index.html"), "utf8"), /href="\/repo\/about#team"/);
});

test("URL で画面を切り替えないアプリは、/ だけを作る", () => {
  const s = site(`module Main (main) where

main :: Program () ()
main = App.app { init = (), update = always identity, view = always (<a href="/x">x</a>) }
`);
  assert.deepEqual(prerenderSite({ ...s, base: "/", env: {} }), ["/"]);
  assert.equal(existsSync(join(s.outDir, "x")), false);
});
