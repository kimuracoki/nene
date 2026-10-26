# {{name}}

[Nene](https://www.npmjs.com/package/nene-lang) で書いた Web アプリ。Nene は Haskell 風の文法と JSX を持つ UI 向けの関数型言語で、JavaScript にコンパイルされる。

## コマンド

- `npm run check` … 型検査。`.nn` を編集すると自動で実行され、エラーがあれば伝えられる（`.claude/hooks/check.mjs`）
- `npm run fmt` … 整形（`=` の位置などをそろえる）。書き終えたらかける
- `npm run dev` … 開発サーバー
- `npm run build` … `dist/` に出力

## 書き方の規則

詳しくは `node_modules/nene-lang/docs/spec.md`（仕様）と `docs/guide.md`（入門）。迷ったら読むこと。

- **`if` `case` `let` `in` ラムダは無い。** 等式のパターンマッチ・ガード・`where` で書く。
  ```haskell
  update (Toggle id) model = { model | todos = map toggle model.todos }
    where
      toggle t
        | t.id == id = { t | done = not t.done }
        | otherwise  = t
  ```
- **JSX の `{}` には名前・リテラル・フィールド・1 段の関数適用だけ。** 演算子や入れ子の式は `where` に名前をつけて書く。`<p>{show (n + 1)}</p>` は不可、`<p>{label}</p>` と `where label = show (n + 1)` にする。
- JSX を関数の引数にするときは括弧で囲む: `always (<p />)`。
- 子要素 `{}` に書けるのは `Html msg`・`[Html msg]`・`String`。数値は `show` する。
- **並び方はレイアウトタグで書く:** `<Row>` `<Column>` `<Grid columns={3}>` `<Stack>` `<Scroll>` `<Spacer />`。属性は `gap={S}`（`None` `XS` `S` `M` `L` `XL`）、`align` / `justify`（`Start` `Center` `End` `Stretch`）、`collapse={M}`（狭い画面で縦に並ぶ）。HTML 要素で `display: flex` を書かない。
- **見た目はファイル末尾の `style` ブロック（普通の CSS）に書き、`class={css.名前}` で当てる。** `.item-title` は `css.itemTitle`。複数は `where` で `classes [css.a, css.b]`。`style="..."` は無い。`style` ブロックはそのファイルのタグにだけ効く（`:root` `html` `body` は全体に効く）。
- model の値を CSS に渡すときは `vars={barVars}`、`where barVars = { barWidth = show p ++ "%" }`、CSS では `var(--bar-width)`。
- **部品は「第 1 引数がレコードで `Html msg` を返す関数」。** `<Card title="…">` で呼べる。外のファイルからタグで呼べるのは、ファイル名と同じ名前の関数だけ（`Ui/Card.nn` の `card`）。省略できる属性は型にデフォルト値を書く: `{ onClick :: msg, disabled :: Bool = False }`。
- 標準モジュール（`List` `Maybe` `Result` `String` `Dict` `Json` `Http` `Storage` `Time` `Random` `Nav` `Dom` `Env` `Cmd` `Sub` `App` など）は import せず `List.head` のように修飾して使う。
- 型クラスと演算子は自分で定義できない。`null` は無く `Maybe` を使う。パターンの漏れはエラー。

## 部品（nene-lang-ui）

ボタン・入力欄などは自分で作らず、まず `nene-lang-ui` を使う。一覧と属性は `node_modules/nene-lang-ui/README.md`、使い方の例は各ファイルの先頭のコメント（`node_modules/nene-lang-ui/src/Ui/*.nn`）。

```haskell
import Ui.Button (Variant(..))
import qualified Ui.Icon as Icon
import Ui.Theme (Tone(..))

<Button tone={Danger} startIcon={Just Icon.delete} onClick={Remove}>削除</Button>
```

- 色の種類 `tone` はどの部品も `Primary` `Neutral` `Success` `Warning` `Danger`、大きさ `size` は `S` `M` `L`。
- 部品の見た目は外から `class` で変えられない。色は入口の `style` ブロックで `:root { --primary: …; }` のように CSS 変数を変える。
- 状態の置き場所: アプリが知る必要のある状態は Model。メニュー・吹き出し・アコーディオンの開け閉めのような見た目だけの状態は Model に入れず、`Menu` `Popover` `Accordion` `Tooltip`（ブラウザが開け閉めを持つ）を使う。部品ごとの状態（useState）は Nene にはない。
- where の名前がタグとぶつかると、その名前が部品として使われる（`select = …` と書くと `<Select>` が使えない）。

## アプリの形

```haskell
main :: Program Model Msg
main = App.app { init, update, view, effect, subscriptions, onUrlChange = UrlChanged, onStart = … }
```

- `update :: Msg -> Model -> Model` は状態を変えるだけ。通信・保存・URL の変更は `effect :: Msg -> Model -> Cmd Msg` に書く（`update` のあとの新しい model が渡される）。
- 通信は `Http.get "/api/todos" GotTodos`。`data Msg = GotTodos (Result Http.Error [Todo])` と書けば JSON はその型で読まれる。デコーダーは書かない。
- 画面の振り分けは `onUrlChange` と `Url` のパターンマッチ（`route { path = ["todos", id] } = …`）。リンクは `<a href="/todos">`、コードからは `Nav.pushUrl "/todos"`。
