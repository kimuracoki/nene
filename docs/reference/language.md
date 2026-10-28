# 書き方

Nene の書き方を、項目ごとに引けるようにまとめたもの（[Pages 版](https://kimuracoki.github.io/nene/reference/language.html)は名前で検索できる）。規則を正確に知りたいときは、各項目の「仕様」から[言語仕様](../spec.md)の該当する節に飛べる。名前の一覧は[索引](README.md#索引)。

Nene には `if` `case` `let` ラムダ `$` がない。場合分けは等式・パターン・ガードで、途中の計算は `where` で書く（[ないもの](#ないもの)）。

## ファイルとモジュール

### module

ファイルの先頭に書く。モジュール名はファイルの場所と同じにする（`Ui/Button.nn` は `Ui.Button`）。括弧の中に、外から使える名前を並べる。

```haskell
module Ui.Button (ButtonProps, Variant(..), button) where
```

- `Variant(..)` は、型とその構成子をすべて見せる。`Variant` だけなら型だけを見せる（構成子は外から使えない）。
- 括弧を省くと、すべての名前を見せる。
- 仕様: [1. ファイルとモジュール](../spec.md#1-ファイルとモジュール)

### import

ほかのモジュールを使う。

```haskell
import Ui.Button                  -- Ui.Button が見せている名前をすべて使える。<Button> も使える
import Ui.Card (CardKind(..))     -- 名前を選んで使う
import qualified Ui.Icon as Icon  -- Icon.add のように、修飾してだけ使う
```

- 標準モジュール（`List` `String` `Http` など）は import しない。`List.head` のように修飾して使う。import するとエラーになる。
- import したモジュールの主部品（モジュール名と同じ名前の関数）は、タグとして使える（[部品](#部品)）。
- プロジェクトのフォルダと、`node_modules` の Nene パッケージ（`nene-lang-ui` など）から探す。
- 仕様: [1. ファイルとモジュール](../spec.md#1-ファイルとモジュール)

### コメント

```haskell
-- 行の終わりまで
{- 複数行。{- 入れ子にできる -} -}
```

標準ライブラリと部品では、宣言のすぐ上のコメントが、このリファレンスの説明になる。

### レイアウト（字下げ）

字下げを見るのは、トップレベルと `where` の 2 か所だけ。

- トップレベルの宣言は 1 列目から書き、続きの行は字下げする。
- `where` のあとの最初の名前の列が、そのまとまりの列になる。そこより左に戻ると、まとまりが終わる。
- JSX の中は字下げを見ない。
- 仕様: [2.1 レイアウト](../spec.md#21-レイアウト)

## 型

### 組み込みの型

| 型 | 値 |
| --- | --- |
| `Int` | 整数。`42` `-3` |
| `Float` | 小数。`3.14`。`Int` とは混ぜられない（`toFloat` で変える） |
| `String` | 文字。`"ねね"`。エスケープは `\n` `\t` `\"` `\\`。1 文字の型（`Char`）はない |
| `Bool` | `True` `False` |
| `()` | 値が 1 つだけの型。中身のいらない返事などに使う |
| `[a]` | リスト。`[1, 2, 3]` |
| `(a, b)` | 組（タプル）。`("a", 1)` |
| `a -> b` | 関数 |
| `Maybe a` | `Just x` か `Nothing`。ないかもしれない値（[Maybe](std/Maybe.md)） |
| `Result e a` | `Ok x` か `Err e`。失敗するかもしれない値（[Result](std/Result.md)） |
| `Html msg` | 画面。JSX の式の型 |
| `Class` | `style` ブロックのクラス（[css](#css)） |
| `Cmd msg` | 副作用（[effect](#effect)） |
| `Sub msg` | 外から届くイベント（[subscriptions](#subscriptions)） |
| `Program model msg` | アプリ。`main` の型 |

`null` も `undefined` もない。ないかもしれない値は `Maybe` で表す。仕様: [3.1 組み込みの型](../spec.md#31-組み込みの型)

### data

いくつかの形のどれか 1 つ、という型を作る。構成子は大文字で始める。値を持たせられる。

```haskell
data Priority = High | Medium | Low

data Msg
  = DraftChanged String
  | ToggleTodo Int Bool
  | AddTodo
```

使うときは `ToggleTodo 3 True`、場合分けは[パターン](#パターン)で書く。仕様: [3.2 代数的データ型](../spec.md#32-代数的データ型)

### type

型に別の名前を付ける。レコードの形に名前を付けるのに使う。

```haskell
type Todo =
  { id    :: Int
  , title :: String
  , done  :: Bool
  }
```

仕様: [3.3 レコード](../spec.md#33-レコード)

### レコード

名前の付いた値の組。型は形で決まる（同じフィールドを持てば同じ型）。

```haskell
{ id = 1, title = "牛乳", done = False }   -- 作る
{ id, title, done = False }                -- id = id, title = title の略記
```

### フィールドの取り出し

`.` の前後に空白を入れずに書く。

```haskell
todo.title
model.form.email
(.title)            -- フィールドを取り出す関数。map (.title) todos
```

`(.title)` の型は `{ r | title :: a } -> a`。`title` を持つレコードなら何にでも使える。

### レコードの更新

一部のフィールドを変えた、新しいレコードを作る。元のレコードは変わらない。

```haskell
{ todo | done = True }
{ model | form = { model.form | name = s } }   -- 入れ子のレコード
```

### 既定値つきのレコード

`type` のフィールドに `= 値` を書くと、作るときに省ける。部品の属性を省けるのは、この仕組み。

```haskell
type ButtonProps msg =
  { onClick  :: msg
  , disabled :: Bool = False
  }

ButtonProps { onClick = Save }   -- disabled = False が補われる
<Button onClick={Save}>保存</Button>
```

既定値が補われるのは、型の名前を書いて作るとき、タグで部品を呼ぶとき、型注釈で引数の型が決まっている関数にレコードを渡すとき（`App.app { init, update, view }`）。既定値に書けるのは、定数とトップレベルの名前（とその適用）。仕様: [3.4 デフォルト値つきレコード](../spec.md#34-デフォルト値つきレコード)

### 型注釈

```haskell
update :: Msg -> Model -> Model
```

省いてもよい（型は推論される）。ただし、既定値つきの props を受け取る部品には書く（どの型の既定値を使うかを決めるため）。仕様: [3.5 型注釈](../spec.md#35-型注釈)

### 型クラス

決まった 6 つだけがある。自分では作れない。

| クラス | 当てはまる型 | 使うところ |
| --- | --- | --- |
| `Num` | `Int` `Float` | `+` `-` `*`、`negate`、`abs`、`sum` |
| `Ord` | `Int` `Float` `String` | `<` `<=` `>` `>=`、`min` `max`、`sort` |
| `Show` | `Int` `Float` `Bool` | `show` |
| `Append` | `String` `[a]` | `++` |
| `Child` | `Html msg` `[Html msg]` `String` | JSX の子要素 `{…}` |
| `Json` | JSON にできる型（[JSON](#json)） | `Json.encode` `Http.get` など |

`==` と `/=` は関数以外のすべての型で使える。型注釈では `Num a =>` と書く（`Child` と `Json` は書けない）。仕様: [3.6 組み込みの型クラス](../spec.md#36-組み込みの型クラス)

## 関数

### 等式

関数は、引数の形ごとに等式を並べて書く。上から順に試し、最初に合ったものを使う。

```haskell
priorityLabel :: Priority -> String
priorityLabel High   = "高"
priorityLabel Medium = "中"
priorityLabel Low    = "低"
```

同じ関数の等式は続けて書く。仕様: [4.1 等式とパターン](../spec.md#41-等式とパターン)

### パターン

| パターン | 例 | 合うもの |
| --- | --- | --- |
| 変数 | `x` | 何でも（名前を付ける） |
| ワイルドカード | `_` | 何でも（使わない） |
| リテラル | `0` `"ok"` | その値 |
| 構成子 | `Nothing` `(Just x)` `(ToggleTodo id checked)` | その構成子 |
| リスト | `[]` `[x]` `(x : xs)` | 空・1 つ・先頭と残り |
| 組 | `(a, b)` | 組 |
| レコード | `{ path = ["todos", id] }` `{ todos }` | 書いたフィールドが合うレコード（ほかのフィールドは何でもよい） |

### ガード

等式に条件を付ける。上から順に試し、どれも成り立たなければ次の等式を試す。

```haskell
update Decrement n
  | n > 0     = n - 1
  | otherwise = 0
```

最後を `otherwise` にすると「それ以外のとき」になる。仕様: [4.2 ガード](../spec.md#42-ガード)

### where

等式の中で使う名前を、等式の後ろにまとめて書く。どのガードからも見え、`where` の中でも等式・ガード・`where` を使える。使われたときに一度だけ計算する。

```haskell
summary todos = show doneCount ++ " / " ++ show total
  where
    total     = length todos
    doneCount = length (filter (.done) todos)
```

`let` と `case` の代わりに使う。JSX の `{}` に書けない式も、`where` に名前を付けて書く。仕様: [4.3 where](../spec.md#43-where)

### 網羅性

パターンとガードが、引数のすべての値を覆っていないとコンパイルエラーになる。エラーには、漏れている値の例が出る。ガードは最後が `otherwise` のときだけ、すべてを覆うとみなす。仕様: [4.4 網羅性](../spec.md#44-網羅性)

### 関数適用

空白で並べる。括弧で順番を決める。

```haskell
max 3 7
map show (filter even xs)
```

関数適用は、どの演算子よりも先に結び付く（`f x + 1` は `(f x) + 1`）。

### 演算子

優先順位の高い順。自分では作れない。

| 演算子 | 意味 | 例 |
| --- | --- | --- |
| `.` | 関数合成（前後に空白） | `not . (.done)` |
| `*` `/` `//` | 掛け算、`Float` の割り算、`Int` の割り算（切り捨て） | `7 // 2` は `3` |
| `+` `-` | 足し算・引き算 | |
| `++` | 文字・リストをつなげる | `"a" ++ "b"` |
| `:` | リストの先頭に足す | `0 : [1, 2]` |
| `==` `/=` | 等しい・等しくない | |
| `<` `<=` `>` `>=` | 大小 | |
| `&&` | かつ | |
| `\|\|` | または | |

仕様: [6.1 一覧](../spec.md#61-一覧)

### セクション

演算子の片側を埋めた関数。

```haskell
(+ 1)        -- \x -> x + 1 にあたる
(1 +)
(==)         -- 2 つの引数を取る関数
(.title)     -- フィールドを取り出す関数
```

`(- 1)` は負の数 `-1` になる。1 を引く関数は `subtract 1` と書く。

### 負の数

`-3`、`(-3)`。引数にするときは括弧で囲む（`abs (-3)`）。

## 画面

### JSX

画面はタグで書く。JSX は `Html msg` 型の式で、関数の引数にするときは括弧で囲む（`always (<p />)`）。

```haskell
view model =
  <Column gap={L}>
    <h1>タスク</h1>
    <TodoList todos={visible} />
  </Column>
  where
    visible = filter (matches model.filter) model.todos
```

仕様: [5. JSX](../spec.md#5-jsx)

### タグ

| タグ | 意味 |
| --- | --- |
| `<p>` など小文字 | HTML の要素（[HTML の要素と属性](html.md)） |
| `<Row>` など大文字 | 部品（[部品](#部品)）かレイアウトタグ（[レイアウトタグ](layout.md)） |
| `<>…</>` | いくつかの要素をまとめる（何も足さない） |

子要素のないタグは `<Spacer />` のように閉じる。

### 属性

```haskell
<input type="checkbox" checked={todo.done} onCheck={ToggleTodo todo.id} />
<button disabled>送る</button>
```

- `名前="文字"` … 文字
- `名前={式}` … 式（[{} に書ける式](#-に書ける式)）
- `名前` だけ … `名前={True}`

属性には型がある。ない属性や、型の合わない値はコンパイルエラーになる。

### 子要素

- タグの間の文字は、そのまま文字になる。改行をまたぐ空白は取り除き、続いた空白は 1 つにまとめる。
- `{式}` には `Html msg`・`[Html msg]`・`String` を書ける。数は `{show n}` で文字にする。
- 文字の中に `{` `}` `<` `>` を書くときは、`{"<"}` のように文字として埋め込む。

```haskell
<p>{show n} 件</p>
<ul>{map todoItem todos}</ul>
```

### {} に書ける式

タグの `{}` に書けるのは次の形だけ。それ以外は `where` に名前を付けて、その名前を書く。

| 書ける | 例 |
| --- | --- |
| 名前 | `{visible}` `{Close}` |
| リテラル | `{3}` `{"削除"}` |
| フィールドの取り出し | `{todo.title}` |
| 1 段の関数適用（引数は上の形） | `{ToggleTodo todo.id}` `{show n}` |
| まだ書いていない所 | `{_}` |

```haskell
<Chip onClick={Just (SetFilter f)}>    -- エラー
<Chip onClick={select}>                -- where select = Just (SetFilter f)
```

仕様: [5.6 {} に書ける式](../spec.md#56--に書ける式)

### 部品

第 1 引数がレコードで、`Html msg` を返す関数は、名前の先頭を大文字にしたタグで呼べる。レコードのフィールドが属性になる。2 つ目の引数に `[Html msg]` を取る部品は、子要素を受け取る。

```haskell
badge :: { label :: String } -> Html msg
badge props = <span class={css.badge}>{props.label}</span>

card :: { title :: String } -> [Html msg] -> Html msg
card props children = <section><h2>{props.title}</h2>{children}</section>

<Badge label="新着" />
<Card title="設定"><p>中身</p></Card>
```

`where` の中の部品は、外側の名前をそのまま使える。タグの名前は、同じスコープの関数、import したモジュールの主部品、レイアウトタグの順に探す（`where` に `row` を書くと `<Row>` が使えなくなる）。仕様: [5.5 部品](../spec.md#55-部品)

### 主部品

外のファイルからタグで呼べるのは、モジュール名と同じ名前の関数だけ（`Ui/Card.nn` の `card` が `<Card>`）。1 つのファイルに部品はいくつ書いてもよいが、ほかの部品はそのファイルの中でだけタグにできる。

## 見た目

### style

ファイルの最後に `style` とだけ書いた行を置き、その下に普通の CSS を書く。そのファイルで書いたタグにだけ効く（別のファイルの部品の中には届かない）。

```haskell
style
  .card { border-radius: 8px; }
  .card:hover { box-shadow: 0 4px 12px rgb(0 0 0 / .15); }
```

`:root` `html` `body` だけはページ全体に効く。アプリ全体の色や文字は、入口のファイルで `:root` の CSS 変数を変える。仕様: [9. スタイル](../spec.md#9-スタイル)

### css

`style` に書いたクラスは、`css` というレコードのフィールドになる。`.item-title` は `css.itemTitle`。書いていないクラスを使うとコンパイルエラーになる。

```haskell
<h2 class={css.title}>{props.title}</h2>
```

`css` は予約された名前で、自分では定義できない。部品のタグには `class` を書けない（部品の見た目は、その部品のファイルの中だけで決まる）。

### classes

いくつかのクラスを 1 つにまとめる。`where` に書く。

```haskell
look
  | props.selected = classes [css.card, css.selected]
  | otherwise      = css.card
```

### vars

Model から来る値を CSS 変数として渡す。フィールド名が変数名になり（`barWidth` → `--bar-width`）、値は単位まで含めた文字。`style` で使っていない名前はコンパイルエラーになる。

```haskell
<div class={css.bar} vars={barVars} />
  where
    barVars = { barWidth = show percent ++ "%" }

style
  .bar { width: var(--bar-width); }
```

仕様: [9.4 状態に応じた値を CSS に渡す](../spec.md#94-状態に応じた値を-css-に渡すvars)

## アプリ

### main

アプリの入口。`App.app` に設定を渡す（[App](std/App.md)）。

```haskell
main :: Program Model Msg
main = App.app { init, update, view }
```

### Model

アプリの状態。アプリ全体で 1 つだけ持ち、部品ごとの状態はない。メニューの開け閉めのような見た目だけの状態は、HTML とブラウザに任せる（`popover`、`<details>`）。仕様: [7.5 状態の置き場所](../spec.md#75-状態の置き場所)

### Msg

起きることを表す `data` 型。属性 `onClick={Save}` などで届く。

### update

メッセージで状態をどう変えるかを書く純粋な関数。外への働きかけ（通信・保存・URL）は書かない。

```haskell
update :: Msg -> Model -> Model
update (DraftChanged s) model = { model | draft = s }
```

### effect

`update` のあとに実行する副作用を返す。`update` が返した新しい model と、同じメッセージを受け取る。

```haskell
effect :: Msg -> Model -> Cmd Msg
effect Save model = Storage.set "draft" model.draft
effect _ _        = Cmd.none
```

仕様: [7.1 update と effect](../spec.md#71-update-と-effect)

### subscriptions

model から「いま受け取りたいイベント」を返す。model が変わるたびに呼ばれ、増えたものは受け取り始め、なくなったものは止める。

```haskell
subscriptions { running = True } = Time.every 1000 Tick
subscriptions _                  = Sub.none
```

### onUrlChange

URL が変わるたび（起動したときにも）届くメッセージ。画面の振り分けは `Url` のパターンで書く。同じサイトの `<a href>` は、ページを読み直さずに URL だけを変える。

```haskell
main = App.app { init, update, view, onUrlChange = UrlChanged }

route :: Url -> Page
route { path = [] }            = Home
route { path = ["todos", id] } = TodoDetail id
route _                        = NotFound
```

仕様: [7.3 URL](../spec.md#73-url)

### foreign import

標準ライブラリにない JavaScript の機能を取り込む。結果の型は `Cmd msg` で、JavaScript の関数は引数を受け取ったあと `(dispatch) => void` を返す。

```haskell
foreign import copyText :: String -> Cmd msg
  = "(text) => (dispatch) => navigator.clipboard.writeText(text)"
```

仕様: [11. 副作用と JavaScript](../spec.md#11-副作用と-javascript)

### JSON

JSON との変換は型から決まる。デコーダーは書かない（[Json](std/Json.md)、[Http](std/Http.md)）。

| 型 | JSON |
| --- | --- |
| `Int` `Float` `String` `Bool` | 数・文字・`true` / `false` |
| `[a]`、`(a, b)` | 配列 |
| レコード | オブジェクト（余分なキーは無視する） |
| `Maybe a` | `Nothing` は `null`（読むときは、キーがないのも `Nothing`） |
| `Dict String a` | オブジェクト |
| 引数のない構成子だけの `data` 型 | 構成子の名前の文字（`"High"`） |
| `()` | 何でもよい（読まない） |

仕様: [11.1 JSON とサーバーとの通信](../spec.md#111-json-とサーバーとの通信)

## 開発

### _（まだ書いていない所）

式の代わりに `_` と書くと「まだ書いていない所」になり、そこに入る型がエディタに警告で出る。`nene dev` ではそのまま動き、通ったところで止まる（関数なら呼ばれたとき）。`nene build`・`check`・`test` ではエラーになる。

```haskell
<TextField label="メール" value="" onInput={_} />
```

仕様: [4.6 まだ書いていない所](../spec.md#46-まだ書いていない所_)

### テスト

`test/` の下のファイルで `tests :: [Test]` を export すると、`nene test` が実行する（[Test](std/Test.md)）。

```haskell
tests :: [Test]
tests = [Test.equal "増やす" (update Increment 0) 1]
```

仕様: [15. テスト](../spec.md#15-テスト)

### ないもの

書くと、代わりの書き方を案内するエラーになる。

| ないもの | 代わり |
| --- | --- |
| `if` `then` `else` | [ガード](#ガード) |
| `case` `of` | [等式](#等式)と[パターン](#パターン)（式の途中なら `where` に関数を書く） |
| `let` `in` | [where](#where) |
| ラムダ `\x -> …` | `where` に関数を書く、[セクション](#セクション)、`always` |
| `$` | 括弧 |
| `do` | `Cmd.batch` など |
| `instance`、型クラスの定義 | 組み込みの[型クラス](#型クラス)だけ |
| `null` `undefined`・例外 | `Maybe`・`Result` |
| `{ ...props }` | 属性を 1 つずつ書く |
| `style="…"`・CSS ファイルの読み込み | [style](#style) と [css](#css) |
