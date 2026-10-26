import { test } from "node:test";
import assert from "node:assert/strict";
import { runInDom } from "./helpers.ts";

const app = {
  Main: `module Main (main) where

data Route = Home | About | Photo String | NotFound

data Msg = UrlChanged Url | GoAbout

update :: Msg -> Route -> Route
update (UrlChanged url) _ = route url
update GoAbout r          = r

effect :: Msg -> Route -> Cmd Msg
effect GoAbout _ = Nav.pushUrl "/about"
effect _ _       = Cmd.none

route :: Url -> Route
route { path = [] }                = Home
route { path = ["about"] }         = About
route { path = ["photos", name] }  = Photo name
route _                            = NotFound

view :: Route -> Html Msg
view r =
  <div>
    <a href="/about">about</a>
    <img src="/logo.svg" alt="" />
    <button onClick={GoAbout}>go</button>
    <p>{label r}</p>
  </div>
  where
    label Home        = "HOME"
    label About       = "ABOUT"
    label (Photo n)   = "PHOTO " ++ n
    label NotFound    = "NOTFOUND"

main :: Program Route Msg
main = App.app { init = Home, update, view, effect, onUrlChange = UrlChanged }
`,
};

const settle = async (a: { frame: () => Promise<unknown> }) => {
  await new Promise((r) => setTimeout(r, 0));
  await a.frame();
};

test("URL を直接開くと、その画面になる", async () => {
  const a = await runInDom(app, "Main", { url: "http://localhost/photos/cat%20and%20dog" });
  await settle(a);
  assert.match(a.text(), /PHOTO cat and dog/);
});

test("置き場所（base）の分は、Url.path から取り除かれる", async () => {
  const a = await runInDom(app, "Main", { url: "http://localhost/repo/about", base: "/repo/" });
  await settle(a);
  assert.match(a.text(), /ABOUT/);
});

test("置き場所があるときは、/ で始まるリンクや画像にも付け足される", async () => {
  const a = await runInDom(app, "Main", { url: "http://localhost/repo/", base: "/repo/" });
  await settle(a);
  assert.equal(a.document.querySelector("a")!.getAttribute("href"), "/repo/about");
  assert.equal(a.document.querySelector("img")!.getAttribute("src"), "/repo/logo.svg");
  await a.click("a");
  await settle(a);
  assert.equal(a.window.location.pathname, "/repo/about");
  assert.match(a.text(), /ABOUT/);
});

test("Nav.pushUrl にも置き場所が付き、戻るで元の画面に戻る", async () => {
  const a = await runInDom(app, "Main", { url: "http://localhost/repo/", base: "/repo/" });
  await settle(a);
  await a.click("button");
  await settle(a);
  assert.equal(a.window.location.pathname, "/repo/about");
  assert.match(a.text(), /ABOUT/);
  a.window.history.back();
  await new Promise((r) => setTimeout(r, 20));
  await a.frame();
  assert.match(a.text(), /HOME/);
});

test("画面が移ると一番上へスクロールし、戻ると前の位置に戻る", async () => {
  const scrolls: [number, number][] = [];
  const a = await runInDom(app, "Main", {
    setup: (w) => {
      w.scrollTo = ((x: number, y: number) => {
        scrolls.push([x, y]);
        Object.defineProperty(w, "scrollY", { value: y, configurable: true });
      }) as typeof w.scrollTo;
      Object.defineProperty(w, "scrollY", { value: 300, configurable: true });
    },
  });
  await settle(a);
  await a.click("a");
  await settle(a);
  assert.deepEqual(scrolls.at(-1), [0, 0]);
  a.window.history.back();
  await new Promise((r) => setTimeout(r, 20));
  await a.frame();
  assert.deepEqual(scrolls.at(-1), [0, 300]);
});
