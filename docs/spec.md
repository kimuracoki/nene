# Nene 言語仕様 v0.1

## 0. 原則

1. **タグを見れば、画面に何がどう並ぶかが分かる。** 並び方はレイアウトタグで書く。
2. **タグには名前だけを書く。** 計算・分岐は `where` に、見た目はファイル末尾の `style` ブロック（普通の CSS）に書く。
3. **書き方は一つ。** 同じことを書く方法が二つあるなら、一つを削る。
4. **型が通れば、実行時エラーは起きない。**

この原則から、次のものは言語に **ない**。

| ないもの | 代わりに使うもの |
| --- | --- |
| `case` / `if` / `let ... in` / ラムダ | 等式のパターンマッチ・ガード・`where` |
| `$` | 括弧 |
| CSS ファイルの読み込み・CSS-in-JS・`style="..."` | ファイル末尾の `style` ブロックと `class={css.名前}`（9 章） |
| `null` / `undefined` / 例外 | `Maybe` / `Result` |
| ユーザー定義の型クラス・演算子 | 組み込みのものだけ |
| `{ ...props }` のスプレッド | 属性を 1 つずつ書く |
| 部品の外から見た目を上書きすること | 部品の見た目はその部品のファイルの中だけで決まる |

`if` `then` `else` `case` `of` `let` `in` `do` `instance` は予約語で、書くと代わりの書き方を案内するエラーになる。トップレベルの `class` も同様（型クラスは定義できない）。

---

## 1. ファイルとモジュール

- 拡張子は `.nn`。1 ファイル 1 モジュール。モジュール名はファイルのパスと一致させる（`Ui/Button.nn` → `Ui.Button`）。

```haskell
module Button (ButtonProps, Variant(..), button) where

import Icon
import Ui.Card (CardKind(..))
import qualified Ui.Dialog as Modal
```

- export の書き方は Haskell と同じ。`T(..)` で型とそのコンストラクタをすべて export する。
- `import M` は M が export したものをすべて取り込む。`import M (a, B(..))` は指定したものだけを取り込む。
- `import qualified M as N` は `N.x` の形でだけ使えるようにする。
- 標準モジュール（14 章）のうち `Prelude` はつねに取り込まれている。`App` `Cmd` `Sub` `List` `Maybe` `String` `Time` `Window` `Keyboard` `Nav` `Storage` は import なしで `App.app` のように修飾名で使う。

## 2. 字句

- コメント: `-- 行末まで`、`{- 複数行 -}`（入れ子可）。
- 識別子: 小文字始まりは変数・関数・フィールド、大文字始まりは型・コンストラクタ・モジュール。`'` を含めてよい。
- リテラル: `42`、`3.14`、`"文字列"`（エスケープは `\n` `\t` `\"` `\\`）。`Char` 型はない。
- キーワード: `module` `where` `import` `qualified` `as` `data` `type` `foreign`。
- 演算子は組み込みのものだけ（6.3）。

### 2.1 レイアウト

インデントで区切る。必要になるのは **トップレベル** と **`where` ブロック** の二か所だけ。

- トップレベルの宣言は 1 列目から書く。2 行目以降は字下げする。
- `where` の次の字句の列が、そのブロックの列になる。ブロック内の宣言はすべてその列から始める。
- その列より左に戻ったらブロックが終わる。
- JSX の中（5 章）ではレイアウトを見ない。JSX の行はどの列から始まってもよい。

## 3. 型

### 3.1 組み込みの型

`Int` `Float` `String` `Bool` `()` `[a]`（リスト） `(a, b)`（タプル） `a -> b`

```haskell
data Bool     = False | True
data Maybe a  = Nothing | Just a
data Result e a = Err e | Ok a
```

`Html msg` `Class` `Cmd msg` `Sub msg` `Program model msg` は中身の見えない組み込み型。

### 3.2 代数的データ型

```haskell
data Priority = High | Medium | Low

data Msg
  = DraftChanged String
  | AddTodo
  | ToggleTodo Int Bool
```

### 3.3 レコード

レコードは構造的な型を持つ。`type` は別名をつけるだけ。

```haskell
type Todo =
  { id       :: Int
  , title    :: String
  , done     :: Bool
  }

{ id = 1, title = "牛乳", done = False }   -- 作る
todo.title                                 -- 取り出す（. の前後に空白なし）
{ todo | done = True }                     -- 一部を変えた新しいレコード
{ id, title, done = False }                -- id = id, title = title の略記
(.title)                                   -- \t -> t.title にあたる関数
```

フィールドを取り出す関数は **行多相** の型を持つ。

```haskell
(.title) :: { r | title :: a } -> a
```

### 3.4 デフォルト値つきレコード

`type` の各フィールドにデフォルト値を書ける。

```haskell
type ButtonProps msg =
  { onClick  :: msg
  , variant  :: Variant = Contained
  , disabled :: Bool    = False
  }
```

- デフォルト値に書けるのは、定数（リテラル・コンストラクタとその適用）と、トップレベルの名前（とその適用）。
- デフォルト値が補われるのは、次の 3 つの場合。いずれも「型の名前が分かっている」ときに限る。
  1. 型の名前を明示して作るとき: `ButtonProps { onClick = Save }`
  2. JSX で部品を呼ぶとき（5.5）
  3. 型注釈で引数の型がその型になっている関数に、レコードをそのまま渡すとき: `App.app { init, update, view }`（7 章）

```haskell
ButtonProps { onClick = Save }   -- variant = Contained, disabled = False が補われる
{ onClick = Save }               -- ただのレコード。補われない
```

### 3.5 型注釈

```haskell
update :: Msg -> Model -> Model
```

型注釈は省略できる（推論する）。ただし、デフォルト値つきの props を取る部品には型注釈が必要（どの型のデフォルト値を使うか決めるため）。

### 3.6 組み込みの型クラス

ユーザーは型クラスを定義できない。次の 5 つだけがあり、型注釈では Haskell と同じく `Num a =>` と書く。

| クラス | インスタンス | 使うところ |
| --- | --- | --- |
| `Num` | `Int` `Float` | `+` `-` `*`、`negate`、`abs` |
| `Ord` | `Int` `Float` `String` | `<` `<=` `>` `>=`、`min`、`max`、`sort` |
| `Show` | `Int` `Float` `Bool` | `show` |
| `Append` | `String` `[a]` | `++` |
| `Child` | `Html msg` `[Html msg]` `String` | JSX の子要素 `{...}`（5.4） |

`==` と `/=` は関数以外のすべての型で使える。決まらない `Num` は `Int` になる。

## 4. 関数

### 4.1 等式とパターン

関数は等式を並べて定義する。上から順に試し、最初に合ったものを使う。

```haskell
priorityLabel :: Priority -> String
priorityLabel High   = "高"
priorityLabel Medium = "中"
priorityLabel Low    = "低"
```

| パターン | 例 |
| --- | --- |
| 変数・ワイルドカード | `x` `_` |
| リテラル | `0` `"ok"` |
| コンストラクタ | `Nothing` `(Just x)` `(ToggleTodo id checked)` |
| リスト | `[]` `[x]` `(x : xs)` |
| タプル | `(a, b)` |
| レコード | `{ image = Just image }` `{ todos }` |

### 4.2 ガード

```haskell
update Decrement n
  | n > 0     = n - 1
  | otherwise = 0
```

どのガードも成り立たなければ、次の等式を試す。

### 4.3 where

`where` は等式全体（すべてのガード）から見える。`where` の中でも等式・ガード・`where` を使える。

```haskell
summary todos = show doneCount ++ " / " ++ show total
  where
    total     = length todos
    doneCount = length (filter (.done) todos)
```

### 4.4 網羅性

パターンとガードが、引数のすべての値を覆っていなければ **コンパイルエラー**。ガードは最後が `otherwise` のときだけ、すべてを覆うとみなす。

### 4.5 式

| 式 | 例 |
| --- | --- |
| 関数適用 | `f x y` |
| 中置演算子 | `a + b` |
| セクション | `(+ 1)` `(1 +)` `(.done)` `(==)` |
| リスト・タプル | `[1, 2, 3]` `(a, b)` |
| レコード | 3.3 |
| JSX | 5 章 |

`(- 1)` は負の数 `-1`。1 を引く関数は `(subtract 1)` と書く。

## 5. JSX

### 5.1 JSX は式

JSX は `Html msg` 型の式。式の先頭に `<` が来て、そのあとに名前か `>` が続いたら JSX になる。それ以外の `<` は比較演算子。関数の引数にするときは括弧で囲む。

```haskell
view model =
  <Column gap={L}>
    <h1>タスク</h1>
    <TodoList todos={visible} />
  </Column>
  where
    visible = filter (matches model.filter) model.todos
```

### 5.2 タグ

| タグ | 意味 |
| --- | --- |
| `<h1>` など小文字 | HTML 要素（10 章） |
| `<Row>` など大文字 | 部品（5.5）またはレイアウトタグ（8 章） |
| `<>...</>` | 複数の要素をまとめる |

### 5.3 属性

```haskell
<input type="checkbox" checked={todo.done} onCheck={ToggleTodo todo.id} />
<Card flush>
```

- `name="文字列"` … 文字列リテラル
- `name={式}` … 式（5.6 の制限あり）
- `name` だけ … `name={True}`

属性は型を持つ。存在しない属性や、型の合わない値はコンパイルエラー。

### 5.4 子要素

- タグの間の文字はそのままテキストになる。改行をまたぐ空白は取り除き、連続する空白は 1 つにまとめる（React と同じ）。
- `{式}` には `Child` クラスの型（`Html msg` `[Html msg]` `String`）を書ける。型が決まらないもの（型注釈のない部品の `children` 引数など）は `[Html msg]` とみなす。
- テキストに `{` `}` `<` `>` を書くときは `{"<"}` のように文字列で埋め込む。

```haskell
<p>{show n}</p>
<ul>{map todoItem todos}</ul>
```

### 5.5 部品

**第 1 引数がレコードで `Html msg` を返す関数** は、タグで呼べる。子要素を取るかどうかは型で決まる。

```haskell
iconButton :: IconButtonProps msg -> Html msg               -- <IconButton ... />
card       :: CardProps -> [Html msg] -> Html msg           -- <Card>...</Card>
```

タグ名の先頭を小文字にした名前を、次の順に探す。

1. 同じスコープの関数（`where` の中、トップレベル）。`<TodoList>` → `todoList`
2. import したモジュールの **主部品**。`<Button>` → モジュール `Button` の `button`
   - `import qualified Ui.Dialog as Modal` なら `<Modal>`
3. レイアウトタグ（8 章）

**1 ファイル 1 公開部品。** 外部からタグで呼べるのは、モジュール名と同じ名前の関数（主部品）だけ。そのほかの部品は何個でも定義できるが、タグとして使えるのはそのファイルの中だけ。

`where` の中の部品は、外側の変数をそのまま使える。

```haskell
view model =
  <Row gap={S}>
    <FilterChip filter={All} label="すべて" />
    <FilterChip filter={Active} label="未完了" />
  </Row>
  where
    filterChip p =
      <Chip selected={isSelected} onClick={select}>{p.label}</Chip>
      where
        isSelected = model.filter == p.filter
        select     = SetFilter p.filter
```

### 5.6 `{}` に書ける式

タグに書けるのは **名前だけ** にする。`{}` の中に書けるのは次の形だけで、それ以外はコンパイルエラーになる。

| 書ける | 例 |
| --- | --- |
| 名前 | `{visible}` `{Close}` `{Ui.primary}` |
| リテラル | `{3}` `{"削除"}` |
| フィールドの取り出し | `{todo.title}` `{model.form.email}` |
| 1 段の関数適用（引数は上の 3 つ） | `{ToggleTodo todo.id}` `{map todoItem todos}` `{show n}` |

演算子・括弧の入れ子・リストやレコードの式は書けない。`where` に名前をつけて書く。

```haskell
<Chip onClick={Just (SetFilter f)}>               -- エラー
<Chip onClick={select}>                           -- OK
  ...
  where
    select = Just (SetFilter f)
```

### 5.7 脱糖

```haskell
<p class={css.note}>こんにちは</p>
-- ↓
Html.element "p" [("class", css.note)] [Html.text "こんにちは"]

<Button onClick={Save}>保存</Button>
-- ↓
Button.button (ButtonProps { onClick = Save }) [Html.text "保存"]
```

## 6. 演算子

### 6.1 一覧

優先順位の高い順。

| 優先 | 演算子 | 結合 | 意味 |
| --- | --- | --- | --- |
| 10 | 関数適用・`.field` | 左 | |
| 9 | `.` | 右 | 関数合成 |
| 7 | `*` `/` `//` | 左 | `/` は `Float`、`//` は `Int` の割り算（小数点以下切り捨て） |
| 6 | `+` `-` | 左 | |
| 5 | `++` `:` | 右 | 連結、リストの先頭に足す |
| 4 | `==` `/=` `<` `<=` `>` `>=` | なし | |
| 3 | `&&` | 右 | |
| 2 | `\|\|` | 右 | |

### 6.2 `.` の読み分け

- 前後に空白がない `.` は、フィールドの取り出しかモジュールの修飾（`todo.title`、`List.map`）。
- 前後に空白がある `.` は関数合成（`not . (.done)`）。

## 7. アプリケーション

The Elm Architecture。状態はアプリ全体で一つの `Model` だけが持ち、`update` は純粋な関数のまま。入口は `App.app` 一つで、必要になったものだけを足していく。

```haskell
main :: Program Model Msg
main = App.app { init, update, view }
```

```haskell
main =
  App.app
    { init
    , update
    , view
    , effect                          -- update のあとに実行する副作用
    , subscriptions                   -- 外から届くイベント
    , onUrlChange = UrlChanged        -- URL が変わったとき
    , onStart     = Storage.get "key" Loaded   -- 起動したときの副作用
    }
```

```haskell
type AppConfig model msg =
  { init          :: model
  , update        :: msg -> model -> model
  , view          :: model -> Html msg
  , effect        :: msg -> model -> Cmd msg = （何もしない）
  , subscriptions :: model -> Sub msg        = （何も購読しない）
  , onUrlChange   :: Url -> msg              = （URL を扱わない）
  , onStart       :: Cmd msg                 = Cmd.none
  }
```

`main` を持つモジュールが、アプリの入口になる。

### 7.1 update と effect

`update` は状態をどう変えるかだけを書く。外に対して何かをするのは `effect` で、`update` が返した**新しい** model と同じメッセージを受け取る。

```haskell
update :: Msg -> Model -> Model
update (Open id) model = model
update (UrlChanged url) model = { model | selected = photoIn url }

effect :: Msg -> Model -> Cmd Msg
effect (Open id) _ = Nav.pushUrl ("?photo=" ++ show id)
effect _ _         = Cmd.none
```

### 7.2 サブスクリプション

`subscriptions` は model から「いま受け取りたいイベント」を返す。model が変わるたびに呼ばれ、増えたものは購読を始め、なくなったものは止める。

```haskell
subscriptions :: Model -> Sub Msg
subscriptions { running = True } = Time.every 1000 Tick
subscriptions _                  = Sub.none
```

### 7.3 URL

`onUrlChange` を書くと、URL が変わるたびに（起動したときにも）メッセージが届く。同じサイト内の `<a href="...">` を押したときは、ページを読み直さずに URL だけが変わる。

```haskell
type Url = { path :: [String], query :: [(String, String)], hash :: String }
```

画面の振り分けはパターンマッチで書く。

```haskell
route :: Url -> Route
route { path = [] }            = Home
route { path = ["todos"] }     = Todos
route { path = ["todos", id] } = TodoDetail id
route _                        = NotFound
```

URL を変えるときは `Nav.pushUrl` を `effect` から返す。

### 7.4 色とテーマ

テーマ専用の仕組みはない。色は CSS 変数で決め、入口のファイルの `style` ブロックに書く（9.3）。ダークモードも CSS のメディアクエリで書く。

## 8. レイアウトタグ

並び方はレイアウトタグで書く。HTML 要素は並び方を持たない（ブロック要素として縦に積まれるだけ）。

| タグ | 子要素の並べ方 |
| --- | --- |
| `<Row>` | 横に並べる |
| `<Column>` | 縦に並べる |
| `<Grid>` | `columns` 列のグリッドに並べる |
| `<Stack>` | 同じ場所に重ねる。後ろに書いたものほど手前 |
| `<Scroll>` | 1 つの子要素をスクロールできる領域に入れる |
| `<Spacer />` | Row / Column の中で、残りの空きを埋めて前後を押し離す |

```haskell
type RowProps =
  { gap      :: Size  = None      -- 子要素どうしの間隔
  , align    :: Align = Stretch   -- 並ぶ向きと直角の揃え方
  , justify  :: Align = Start     -- 並ぶ向きの揃え方
  , wrap     :: Bool  = False     -- 入りきらないときに折り返すか
  , collapse :: Size  = None      -- この画面幅より狭いと縦に並ぶ（8.1）
  , class    :: Class = （なし）
  }

type ColumnProps = { gap :: Size = None, align :: Align = Stretch, justify :: Align = Start, class :: Class }
type GridProps   = { columns :: Int, gap :: Size = None, collapse :: Size = None, class :: Class }
type StackProps  = { align :: Align = Stretch, justify :: Align = Stretch, class :: Class }
type ScrollProps = { direction :: Direction = Vertical, class :: Class }

data Size      = None | XS | S | M | L | XL   -- 4px, 8px, 16px, 24px, 32px。CSS からは var(--space-s) などで使える

data Align     = Start | Center | End | Stretch
data Direction = Horizontal | Vertical
```

### 8.1 狭い画面（レスポンシブ）

`<Row>` と `<Grid>` に `collapse` を書くと、画面幅がそれより狭いときに、Row は縦に並び、Grid は 1 列になる。

```haskell
<Row gap={M} collapse={M}>        -- 768px より狭いと縦に並ぶ
<Grid columns={3} collapse={S}>   -- 480px より狭いと 1 列
```

| `collapse` | `XS` | `S` | `M` | `L` | `XL` |
| --- | --- | --- | --- | --- | --- |
| 画面幅 | 360px | 480px | 768px | 1024px | 1280px |

画面幅によって中身そのものを変えたいときは、`Window.onResize` を購読して model に幅を持たせる。

## 9. スタイル

見た目は **普通の CSS** で書き、ファイルの末尾の `style` ブロックに置く。当て方は `class={css.名前}` の一つだけ。

```haskell
card :: { title :: String, selected :: Bool } -> [Html msg] -> Html msg
card props children =
  <section class={look}>
    <h2 class={css.title}>{props.title}</h2>
    {children}
  </section>
  where
    look
      | props.selected = classes [css.card, css.selected]
      | otherwise      = css.card


style
  .card {
    border-radius: 8px;
    box-shadow: 0 1px 3px rgb(0 0 0 / .1);
  }
  .card:hover { box-shadow: 0 4px 12px rgb(0 0 0 / .15); }
  .selected { outline: 2px solid var(--primary); }
  .title { font-size: 1.25rem; }
```

### 9.1 style ブロック

- 1 列目に `style` とだけ書いた行から、次に 1 列目から始まる行の手前（またはファイルの終わり）までが CSS。1 つのファイルに 1 つだけ書ける。
- 中身は普通の CSS。ホバー、アニメーション、メディアクエリ、CSS 変数など、何でも書ける。

### 9.2 クラスの使い方

- `style` ブロックに書いたクラスは、そのファイルの中で `css` というレコードのフィールドとして使える。`.item-title` は `css.itemTitle` になる。
- `css` の型は、クラスを並べた閉じたレコード（`{ card :: Class, title :: Class, ... }`）。書いていないクラスを使うとコンパイルエラーになる。
- クラス名はファイルごとに自動で書き換えられる（`.card` は `.Card__card` になる）。
- 複数のクラスをまとめるときは `classes :: [Class] -> Class` を使い、`where` に書く。
- `class` 属性は HTML 要素とレイアウトタグに書ける。部品のタグには書けない（部品の見た目は、その部品のファイルの中だけで決まる）。
- `css` は予約された名前で、自分では定義できない。

### 9.3 アプリ全体の見た目

**`style` ブロックは、そのファイルで書いたタグにだけ効く。** クラスだけでなく、要素（`h2`）、属性（`[type=checkbox]`）、`#id` のセレクタも同じ。別のファイルの部品の中には届かない。

例外は、ページ全体を表す `:root`・`html`・`body` だけで、これらはそのままページ全体に効く。アプリ全体の色やフォントは、入口のファイルの `style` ブロックにこれらを使って書く。

仕組み: そのファイルで書いたタグ（HTML 要素とレイアウトタグ）には、印のクラス（`nene-Card` など）が自動で付く。セレクタは、実際に当たる要素がその印を持つように書き換えられる（`h2` は `h2.nene-Card`、`.title::before` は `.Card__title.nene-Card::before`）。`@media` などの中も同じように書き換え、`@keyframes` と `@font-face` の中は書き換えない。

```css
style
  :root {
    --primary: #3563e9;
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

### 9.4 状態に応じた値を CSS に渡す（vars）

進捗バーの幅のように、model から来る値で見た目を変えるときは、CSS 変数として渡す。タグには `vars={名前}` と書き、中身は `where` にレコードで書く。

```haskell
<div class={css.bar} vars={barVars} />
  where
    barVars = { barWidth = show percent ++ "%" }


style
  .bar { width: var(--bar-width); }
```

- フィールド名が、CSS 変数の名前になる（`barWidth` → `--bar-width`）。
- 値は単位まで含めた文字列。
- 各フィールドは、そのファイルの `style` ブロックで `var(--…)` として使われていなければならない。使われていなければコンパイルエラー（打ち間違いが見つかる）。
- `vars` は HTML 要素に書ける。

### 9.5 CSS が入る順番

ランタイムは、最小限のリセット（`box-sizing`、`margin: 0` など）→ レイアウトタグの CSS → 各ファイルの `style` ブロック、の順にページへ入れる。後のものほど優先されるので、自分で書いた CSS がいちばん強い。

## 10. HTML 要素

使える要素:

| 分類 | 要素 |
| --- | --- |
| 文章 | `h1`〜`h6` `p` `span` `strong` `em` `small` `mark` `code` `pre` `blockquote` `abbr` `time` `sub` `sup` `br` `hr` `a` |
| リスト | `ul` `ol` `li` `dl` `dt` `dd` |
| 区切り | `div` `section` `header` `footer` `main` `nav` `article` `aside` `address` |
| 画像と動画 | `figure` `figcaption` `img` `picture` `source` `video` `audio` |
| フォーム | `form` `fieldset` `legend` `label` `input` `textarea` `select` `option` `optgroup` `button` `progress` `meter` `output` |
| 表 | `table` `caption` `colgroup` `col` `thead` `tbody` `tfoot` `tr` `th` `td` |
| その他 | `details` `summary` `dialog` |

HTML 要素は **意味のため** に使う（見出し、リスト、ボタン、入力）。並び方はレイアウトタグで書く。SVG はまだ使えない。

| 属性 | 型 |
| --- | --- |
| `class` | `Class`（9 章） |
| `vars` | フィールドがすべて `String` のレコード（9.4） |
| `key` | `String`（リストの要素を見分ける） |
| `id` `title` `role` `lang` `dir` `src` `srcset` `sizes` `alt` `href` `target` `rel` `type` `value` `name` `placeholder` `for` `form` `list` `min` `max` `step` `pattern` `accept` `autocomplete` `width` `height` `loading` `poster` `datetime` `headers` `scope` | `String` |
| `aria-*` `data-*`（小文字とハイフン） | `String` |
| `tabindex` `rows` `cols` `colspan` `rowspan` `maxlength` `minlength` `span` `start` | `Int` |
| `disabled` `checked` `selected` `readonly` `required` `multiple` `hidden` `autofocus` `open` `controls` `autoplay` `loop` `muted` `playsinline` `reversed` `novalidate` | `Bool`（値を書かずに `hidden` とだけ書くと `True`） |
| `onClick` `onDoubleClick` `onSubmit` `onFocus` `onBlur` `onMouseEnter` `onMouseLeave` | `msg` |
| `onInput` `onChange` | `String -> msg`（入力された値、`select` で選ばれた値） |
| `onCheck` | `Bool -> msg` |

## 11. 副作用と JavaScript

副作用は `Cmd msg` として `effect`（7.1）から返し、ランタイムが実行する。標準モジュール（14 章）にない JavaScript の機能は `foreign import` で取り込む。

```haskell
foreign import copyText :: String -> Cmd msg
  = "(text) => (dispatch) => navigator.clipboard.writeText(text)"

foreign import random :: (Float -> msg) -> Cmd msg
  = "(toMsg) => (dispatch) => dispatch(toMsg(Math.random()))"
```

- `foreign import` の結果の型は `Cmd msg` でなければならない。JavaScript から値を受け取るときは、メッセージとして `dispatch` してもらう。
- `Cmd msg` を返す JavaScript 関数は、全引数を受け取ったあと `(dispatch) => void` を返す。
- `Sub msg` を返す `foreign import` はまだ書けない（標準モジュールの `Time.every` などを使う）。

## 12. 実行時の意味

- 正格評価。ただし、引数を持たない束縛（`where` やトップレベルの値）は、最初に使われたときに一度だけ計算する。そのため `where` には、ガードのどれか 1 つでしか使わない値も気にせず書ける。
- 値は不変。レコードの更新は新しいレコードを作る。
- JavaScript（ES Modules）にコンパイルし、組み込みの仮想 DOM ランタイムで動かす。

## 13. 文法（要約）

```
module    ::= "module" ModName exports? "where" decl* style?
decl      ::= import | data | type | sig | equation | foreign
style     ::= "style" NEWLINE （次に 1 列目から始まる行の手前までの CSS）
import    ::= "import" "qualified"? ModName ("as" Con)? ("(" items ")")?
data      ::= "data" Con var* "=" ctor ("|" ctor)*
ctor      ::= Con atype*
type      ::= "type" Con var* "=" ( typ | "{" field ("," field)* "}" )
field     ::= var "::" typ ("=" expr)?
sig       ::= var "::" (constraints "=>")? typ
equation  ::= var apat* rhs ("where" block)?
rhs       ::= "=" expr | ("|" expr "=" expr)+
foreign   ::= "foreign" "import" var "::" typ "=" String
expr      ::= infix expression over app
app       ::= atom+
atom      ::= var | Con | literal | "(" ... ")" | "[" ... "]" | record | update | jsx | atom "." var
record    ::= "{" (var ("=" expr)? ("," var ("=" expr)?)*)? "}"
update    ::= "{" var ("." var)* "|" var "=" expr ("," var "=" expr)* "}"
jsx       ::= "<" Name attr* ("/>" | ">" child* "</" Name ">") | "<>" child* "</>"
```

## 14. 標準モジュール

`Prelude`（import 不要）:

| 分類 | 名前 |
| --- | --- |
| 基本 | `not` `otherwise` `identity` `always` `classes` `show` `negate` `abs` `min` `max` `subtract` `mod` `toFloat` `round` `floor` `ceiling` `fst` `snd` |
| リスト | `map` `filter` `foldl` `foldr` `length` `null` `reverse` `sum` `product` `concat` `concatMap` `any` `all` `take` `drop` `zip` `range` `sort` `sortOn` `elem` |
| 文字列 | `trim` `words` `unwords` `lines` `unlines` |

文字列を画面に出すときは、JSX の子要素にそのまま書く（`<p>{name}</p>`）。`text` 関数はない。

修飾名で使うモジュール（import は不要。import するとエラー）:

| モジュール | 名前 |
| --- | --- |
| `List` | `head` `last` `find` `lookup`（いずれも `Maybe` を返す）、`indexedMap` |
| `Maybe` | `map` `andThen` `withDefault` `isJust` |
| `String` | `length` `isEmpty` `toUpper` `toLower` `contains` `toInt` `toFloat`（`toInt` と `toFloat` は `Maybe` を返す） |
| `App` | `app` |
| `Cmd` | `none` `batch` |
| `Sub` | `none` `batch` |
| `Time` | `now :: (Int -> msg) -> Cmd msg`、`every :: Int -> (Int -> msg) -> Sub msg`（ミリ秒） |
| `Window` | `size :: (Int -> Int -> msg) -> Cmd msg`、`onResize :: (Int -> Int -> msg) -> Sub msg` |
| `Keyboard` | `onKeyDown :: (String -> msg) -> Sub msg`（キーの名前は `"Enter"` `"Escape"` `" "` など） |
| `Nav` | `pushUrl :: String -> Cmd msg`、`replaceUrl`、`back` |
| `Storage` | `get :: String -> (Maybe String -> msg) -> Cmd msg`、`set :: String -> String -> Cmd msg`、`remove` |

`Prelude` `Layout` と上のモジュール名は予約されていて、ユーザーのモジュール名には使えない。

標準ライブラリは Nene 自身で書かれている（`src/lib/*.nn`）。

`Class`・`Size`・`Align`・`Direction`・`Maybe`・`Result`・`Url` の型とコンストラクタも `Prelude` に含まれる。
