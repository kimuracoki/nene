# Tufa 入門

画面を 1 つ作りながら、Tufa の書き方を順に見ていく。細かい規則は [spec.md](spec.md) にある。

## 1. 動かしてみる

```sh
npm create tufa my-app
cd my-app
npm install
npm run dev
```

`http://localhost:5173/` を開くと、カウンターが表示される。`src/Main.tufa` を書き換えて保存すると、すぐに反映される。

## 2. ファイルの形

```haskell
module Main (main) where      -- モジュール名（ファイル名と同じ）と、外に見せる名前

import Ui.Button              -- src/Ui/Button.tufa を使う


type Model = Int              -- アプリの状態

data Msg = Increment | Decrement   -- 起きること


update :: Msg -> Model -> Model    -- 起きたことで状態がどう変わるか
update Increment n = n + 1
update Decrement n = n - 1


view :: Model -> Html Msg          -- 状態をどう見せるか
view n = <p>{show n}</p>


main :: Program Model Msg
main = App.app { init = 0, update, view }
```

アプリは「状態（Model）」「起きること（Msg）」「状態の変わり方（update）」「見せ方（view）」の 4 つでできている。Elm と同じ形で、状態はアプリ全体で 1 つだけ。

## 3. 関数は等式で書く

`if` や `case` はない。場合分けは、等式を並べて書く。

```haskell
priorityLabel :: Priority -> String
priorityLabel High   = "高"
priorityLabel Medium = "中"
priorityLabel Low    = "低"
```

条件で分けるときはガード（`|`）。最後は `otherwise` で受ける。

```haskell
grade :: Int -> String
grade score
  | score >= 80 = "A"
  | score >= 60 = "B"
  | otherwise   = "C"
```

途中の計算には `where` で名前をつける。`let` もない。

```haskell
summary :: [Todo] -> String
summary todos = show done ++ " / " ++ show total
  where
    total = length todos
    done  = length (filter (.done) todos)
```

場合分けに漏れがあると、コンパイルエラーになる。どの場合が漏れているかも教えてくれる。

```
name のパターンがすべての場合を覆っていません（例: name Blue）
```

## 4. データの形

```haskell
-- どれか 1 つ
data Filter = All | Active | Completed

-- 値を持つものもある
data Msg
  = DraftChanged String
  | ToggleTodo Int Bool

-- 名前のついた値の組（レコード）
type Todo =
  { id    :: Int
  , title :: String
  , done  :: Bool
  }
```

レコードの使い方:

```haskell
todo.title                        -- 取り出す
{ todo | done = True }            -- 一部を変えた新しいレコード（元のものは変わらない）
{ id = 1, title = "牛乳", done = False }   -- 作る
```

`null` はない。ないかもしれない値は `Maybe` で表す。

```haskell
data Maybe a = Nothing | Just a

greeting :: Maybe String -> String
greeting (Just name) = "こんにちは、" ++ name
greeting Nothing     = "こんにちは"
```

## 5. 画面はタグで書く

JSX をそのまま式として書ける。並び方は **レイアウトタグ** で書く。見た目（色や文字の大きさ）は 6 章の CSS で書く。

```haskell
view model =
  <Column gap={L}>                    -- 縦に並べる
    <h1>タスク</h1>
    <Row gap={S} align={Center}>      -- 横に並べる
      <input value={model.draft} onInput={DraftChanged} />
      <Spacer />                      -- 残りの空きを埋めて、前後を押し離す
      <button onClick={AddTodo}>追加</button>
    </Row>
  </Column>
```

| タグ | 並べ方 |
| --- | --- |
| `<Row>` | 横 |
| `<Column>` | 縦 |
| `<Grid columns={3}>` | グリッド |
| `<Stack>` | 重ねる（ダイアログなど） |
| `<Scroll>` | スクロールできる領域 |
| `<Spacer />` | 空きを埋める |

狭い画面で縦に並べたいときは `collapse` を足すだけ。

```haskell
<Row gap={M} collapse={M}>    -- 画面幅が 768px より狭いと縦に並ぶ
```

### タグには名前だけを書く

`{}` の中に書けるのは、名前・文字列や数・フィールド・1 段の関数呼び出しだけ。計算や分岐は `where` に書く。

```haskell
-- エラー
<li class={if todo.done then css.done else css.item}>

-- こう書く
<li class={look}>
  ...
  where
    look
      | todo.done = css.done
      | otherwise = css.item
```

こうしておくと、タグを読めば画面の形が分かり、`where` を読めば細かいことが分かる。

### リストを並べる

要素 1 つを描く関数を `map` に渡す。

```haskell
<ul>{map todoItem model.todos}</ul>
```

## 6. 見た目は CSS で書く

見た目は、ファイルの末尾の `style` ブロックに **普通の CSS** で書く。タグには `class={css.名前}` と、名前だけを書く。

```haskell
view n =
  <p class={css.count}>{show n}</p>


style
  .count {
    font-size: 2.5rem;
    font-weight: 700;
  }
  .count:hover { color: var(--primary); }
```

- `style` ブロックの `.count` が、そのファイルの中で `css.count` になる。`.item-title` なら `css.itemTitle`。
- 書いていないクラスを使うと、コンパイルエラーになる（打ち間違いが見つかる）。
- `style` ブロックは、そのファイルで書いたタグにだけ効く。`h2 { … }` のような要素の指定も、ほかのファイルの `h2` には届かない。

条件でクラスを変えるときは、ガードで書く。複数のクラスは `classes` でまとめる。

```haskell
<p class={look}>{show n}</p>
  where
    look
      | n >= 10   = classes [css.count, css.big]
      | otherwise = css.count
```

CSS の当て方はこれだけ。CSS ファイルの読み込みも、CSS-in-JS も、`style="..."` もない。

レイアウトタグの間隔と同じ値は、CSS からも `var(--space-s)` や `var(--space-m)` で使える。

状態に応じた値（進捗バーの幅など）は、`vars` で CSS 変数として渡す。

```haskell
<div class={css.bar} vars={progress} />
  where
    progress = { done = show percent ++ "%" }


style
  .bar { width: var(--done); }
```

フィールド名が CSS 変数の名前になる（`barWidth` なら `--bar-width`）。`style` ブロックで使っていない名前を渡すと、コンパイルエラーになる。

## 7. 部品を作る

部品は「レコードを受け取って `Html` を返す関数」。名前の先頭を大文字にするとタグとして使える。

```haskell
badge :: { label :: String } -> Html msg
badge props = <span class={css.badge}>{props.label}</span>


style
  .badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--primary);
    color: white;
  }

-- 使う側（別のファイルから）
<Badge label="新着" />
```

子要素を受け取る部品は、2 つ目の引数で受け取る。

```haskell
card :: { title :: String } -> [Html msg] -> Html msg
card props children =
  <section>
    <h2>{props.title}</h2>
    {children}
  </section>

<Card title="設定">
  <p>中身</p>
</Card>
```

省略できる属性は、型にデフォルト値を書く。

```haskell
data Variant = Filled | Outlined

type ButtonProps msg =
  { onClick  :: msg
  , disabled :: Bool    = False
  , variant  :: Variant = Filled
  }

button :: ButtonProps msg -> [Html msg] -> Html msg

<Button onClick={Save}>保存</Button>        -- disabled と variant は省略できる
```

### ファイルと部品

- 1 つのファイルに部品はいくつ書いてもよい。
- 外のファイルからタグで使えるのは、**ファイル名と同じ名前の部品だけ**。`Ui/Button.tufa` の `button` が `<Button>` になる。
- `import Ui.Button` と書けば `<Button>` が使える。
- 部品の見た目は、その部品のファイルの `style` ブロックだけで決まる。使う側から `class` で上書きすることはできない。

## 8. 外の世界とやりとりする

`update` は状態を変えるだけ。通信や保存、URL の変更などは `effect` に書く。

```haskell
update :: Msg -> Model -> Model
update Save model = { model | saving = True }
update _ model    = model

effect :: Msg -> Model -> Cmd Msg
effect Save model = Storage.set "draft" model.draft
effect _ _        = Cmd.none

main = App.app { init, update, view, effect }
```

時間やキーボードなど、外から届くものは `subscriptions`。状態に応じて、受け取るものを変えられる。

```haskell
subscriptions :: Model -> Sub Msg
subscriptions { running = True } = Time.every 1000 Tick
subscriptions _                  = Sub.none

main = App.app { init, update, view, subscriptions }
```

使える機能:

| モジュール | できること |
| --- | --- |
| `Time` | 現在時刻、一定間隔のタイマー |
| `Keyboard` | キーが押されたとき |
| `Window` | 画面の大きさ、大きさが変わったとき |
| `Storage` | ブラウザに文字列を保存する |
| `Nav` | URL を変える |

## 9. URL で画面を切り替える

`onUrlChange` を書くと、URL が変わるたびにメッセージが届く。画面の振り分けは、等式で書ける。

```haskell
data Route = Home | Todos | TodoDetail String | NotFound

route :: Url -> Route
route { path = [] }            = Home
route { path = ["todos"] }     = Todos
route { path = ["todos", id] } = TodoDetail id
route _                        = NotFound

update (UrlChanged url) model = { model | page = route url }

main = App.app { init, update, view, onUrlChange = UrlChanged }
```

`<a href="/todos">` を押すと、ページを読み直さずに画面が切り替わる。

## 10. アプリ全体の色やフォント

テーマ専用の仕組みはない。入口のファイル（`src/Main.tufa`）の `style` ブロックに、CSS 変数と `body` の指定を書く。`:root`・`html`・`body` の 3 つだけは、ページ全体に効く。

```css
style
  :root {
    --primary: #e11d48;
    --text: #1f2328;
  }
  @media (prefers-color-scheme: dark) {
    :root { --text: #e6e8eb; }
  }
  body {
    font-family: system-ui, sans-serif;
    color: var(--text);
  }
```

部品の CSS では `var(--primary)` のように変数を使っておけば、色の変更は入口の 1 か所で済む。

## 11. よくあるエラー

| エラー | 直し方 |
| --- | --- |
| `if はありません` | ガード（`\| 条件 = 値`）で書く |
| `case はありません` | 等式を並べて書く。式の途中なら `where` に補助関数を作る |
| `JSX の {} には、名前・リテラル…だけを書けます` | `where` に名前をつけて、タグにはその名前を書く |
| `子要素 {} には Html・[Html]・String だけを書けます` | 数値なら `{show n}` |
| `パターンがすべての場合を覆っていません（例: …）` | 例に出た場合の等式を足すか、最後を `otherwise` や `_` で受ける |
| `<Button> には属性 onClick が必要です` | 必須の属性を書く |
| `レコードにフィールド titel がありません` | `css.titel` の打ち間違い。`style` ブロックのクラス名を確かめる |
| `Maybe は標準モジュールなので import せずに…` | `import` を消して、`Maybe.map` のように書く |

## 12. Elm・React と比べると

| | Elm | React | Tufa |
| --- | --- | --- | --- |
| 画面の書き方 | `div [] [ text "a" ]` | JSX | JSX |
| 並び方 | CSS（または elm-ui） | CSS | レイアウトタグ |
| 見た目 | CSS | CSS（当て方が何通りもある） | CSS。当て方は `class={css.名前}` だけ |
| 場合分け | `case` `if` | `if` `? :` | 等式とガード |
| 状態 | Model 1 つ | 部品ごとの useState | Model 1 つ |
| 副作用 | `update` が `(model, Cmd)` を返す | useEffect | `effect` 関数 |
| 省略できる引数 | なし | props のデフォルト | 型にデフォルト値を書く |
| 実行時エラー | ほぼない | ある | ほぼない（型と網羅性チェック） |
