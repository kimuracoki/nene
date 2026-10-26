import { test } from "node:test";
import assert from "node:assert/strict";
import { compileError, mainModule, runInDom } from "./helpers.ts";

const todoApp = (effectLine: string) =>
  mainModule(`
data Status = Open | Closed

type Todo = { id :: Int, title :: String, status :: Status, note :: Maybe String }

type Model = { todos :: [Todo], message :: String }

data Msg = Got (Result Http.Error [Todo]) | Load

update :: Msg -> Model -> Model
update (Got (Ok todos)) model                = { model | todos = todos, message = "ok" }
update (Got (Err (Http.BadStatus n))) model  = { model | message = "status " ++ show n }
update (Got (Err (Http.BadBody why))) model  = { model | message = why }
update (Got (Err Http.NetworkError)) model   = { model | message = "network" }
update Load model                            = model

effect :: Msg -> Model -> Cmd Msg
effect Load _ = ${effectLine}
effect _ _    = Cmd.none

view :: Model -> Html Msg
view model =
  <div>
    <p>{model.message}</p>
    <ul>{map item model.todos}</ul>
    <button onClick={Load}>読む</button>
  </div>
  where
    item todo = <li>{todo.title}{noteOf todo.note}</li>
    noteOf (Just n) = "（" ++ n ++ "）"
    noteOf Nothing  = ""

main :: Program Model Msg
main = App.app { init = { todos = [], message = "" }, update, view, effect }
`);

const dummyMain = `
main :: Program () ()
main = App.app { init = (), update = always identity, view = always (<p />) }
`;

const respond = (status: number, body: string) => (window: any) => {
  window.requests = [];
  window.fetch = async (url: string, init: any) => {
    window.requests.push({ url, ...init });
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
};

const settle = () => new Promise((r) => setTimeout(r, 20));

test("Http.get: 返ってきた JSON が型どおりに値になる", async () => {
  const body = JSON.stringify([
    { id: 1, title: "牛乳", status: "Open", note: "低脂肪" },
    { id: 2, title: "卵", status: "Closed", note: null, extra: true },
  ]);
  const app = await runInDom(todoApp(`Http.get "/todos" Got`), "Main", { setup: respond(200, body) });
  await app.click("button");
  await settle();
  await app.frame();
  assert.match(app.text(), /ok/);
  assert.match(app.text(), /牛乳 （低脂肪）/);
  assert.match(app.text(), /卵/);
  assert.equal((app.window as any).requests[0].method, "GET");
});

test("Http.get: 型と合わない JSON は、どこが違うかを BadBody で知らせる", async () => {
  const body = JSON.stringify([{ id: 1, title: 3, status: "Open" }]);
  const app = await runInDom(todoApp(`Http.get "/todos" Got`), "Main", { setup: respond(200, body) });
  await app.click("button");
  await settle();
  await app.frame();
  assert.match(app.text(), /\[0\]\.title: 文字列を期待しましたが、3 でした/);
});

test("Http.get: data 型の値が名前にないと BadBody になる", async () => {
  const body = JSON.stringify([{ id: 1, title: "a", status: "Done" }]);
  const app = await runInDom(todoApp(`Http.get "/todos" Got`), "Main", { setup: respond(200, body) });
  await app.click("button");
  await settle();
  await app.frame();
  assert.match(app.text(), /"Open"・"Closed" のどれか/);
});

test("Http.get: 200 番台以外は BadStatus になる", async () => {
  const app = await runInDom(todoApp(`Http.get "/todos" Got`), "Main", { setup: respond(404, "") });
  await app.click("button");
  await settle();
  await app.frame();
  assert.match(app.text(), /status 404/);
});

test("Http.post: 送る値は型どおりに JSON になる", async () => {
  const effect = `Http.post "/todos" { id = 3, title = "パン", status = Open, note = Nothing } Got`;
  const app = await runInDom(todoApp(effect), "Main", { setup: respond(200, "[]") });
  await app.click("button");
  await settle();
  const req = (app.window as any).requests[0];
  assert.equal(req.method, "POST");
  assert.deepEqual(JSON.parse(req.body), { id: 3, title: "パン", status: "Open", note: null });
});

test("Json.encode と Json.decode で行き来できる", async () => {
  const app = await runInDom(
    mainModule(`
type Point = { x :: Int, y :: Int }

view :: () -> Html ()
view _ = <p>{text}</p>
  where
    text = Json.encode points ++ " " ++ back
    points = [{ x = 1, y = 2 }]
    back = shown (Json.decode "[{\\"x\\": 5, \\"y\\": 6}]")
    shown :: Result String [Point] -> String
    shown (Ok ps)  = show (sum (map (.x) ps))
    shown (Err e)  = e

main :: Program () ()
main = App.app { init = (), update = always identity, view }
`),
  );
  assert.equal(app.text(), `[{"x":1,"y":2}] 5`);
});

test("Json は型注釈に書けない", () => {
  const err = compileError(mainModule(`
load :: Json a => String -> (Result Http.Error a -> msg) -> Cmd msg
load url toMsg = Http.get url toMsg
${dummyMain}`));
  assert.match(err, /Json は型注釈に書けません/);
});

test("JSON にする型が決まらないとエラーになる", () => {
  const err = compileError(mainModule(`
load toMsg = Http.get "/x" toMsg
${dummyMain}`));
  assert.match(err, /JSON にする値の型が決まりません/);
});

test("関数や、引数を持つコンストラクタは JSON にできない", () => {
  const fn = compileError(mainModule(`
text = Json.encode not
${dummyMain}`));
  assert.match(fn, /JSON にできません.*関数/);
  const ctor = compileError(mainModule(`
data Shape = Circle Float | Square Float

text = Json.encode (Circle 1.0)
${dummyMain}`));
  assert.match(ctor, /引数のないコンストラクタだけ/);
});

test("Dict: キーの順に並び、JSON ではオブジェクトになる", async () => {
  const app = await runInDom(
    mainModule(`
view :: () -> Html ()
view _ = <p>{text}</p>
  where
    scores = Dict.insert "b" 2 (Dict.fromList [("c", 3), ("a", 1), ("c", 4)])
    text = String.join "," (Dict.keys scores) ++ " " ++ Json.encode scores ++ " " ++ found
    found = show (Maybe.withDefault 0 (Dict.get "c" scores))

main :: Program () ()
main = App.app { init = (), update = always identity, view }
`),
  );
  assert.equal(app.text(), `a,b,c {"a":1,"b":2,"c":4} 4`);
});
