# lambda-jsx 言語仕様 v0.1

## 0. 原則

1. **タグを見れば、画面に何がどう並ぶかが分かる。** 並び方はレイアウトタグで書く。
2. **タグには名前だけを書く。** 計算・分岐・見た目の詳細は `where` に書く。
3. **書き方は一つ。** 同じことを書く方法が二つあるなら、一つを削る。
4. **型が通れば、実行時エラーは起きない。**

この原則から、次のものは言語に **ない**。

| ないもの | 代わりに使うもの |
| --- | --- |
| `case` / `if` / `let ... in` / ラムダ | 等式のパターンマッチ・ガード・`where` |
| `$` | 括弧 |
| `class` 属性・CSS ファイル・`style="..."` | `Style` 値（9 章） |
| margin | 親のレイアウトタグの `gap` |
| `null` / `undefined` / 例外 | `Maybe` / `Result` |
| ユーザー定義の型クラス・演算子 | 組み込みのものだけ |
| `{ ...props }` のスプレッド | 属性を 1 つずつ書く |

`if` `then` `else` `case` `of` `let` `in` `do` `class` `instance` は予約語で、書くと代わりの書き方を案内するエラーになる。
| 部品の外から見た目を上書きすること | 部品の見た目はその部品のファイルの中だけで決まる |

---

## 1. ファイルとモジュール

- 拡張子は `.lx`。1 ファイル 1 モジュール。モジュール名はファイルのパスと一致させる（`Ui/Button.lx` → `Ui.Button`）。

```haskell
module Button (ButtonProps, Variant(..), button) where

import Icon
import Ui.Card (CardKind(..))
import qualified Ui.Dialog as Modal
```

- export の書き方は Haskell と同じ。`T(..)` で型とそのコンストラクタをすべて export する。
- `import M` は M が export したものをすべて取り込む。`import M (a, B(..))` は指定したものだけを取り込む。
- `import qualified M as N` は `N.x` の形でだけ使えるようにする。
- 標準モジュール（14 章）のうち `Prelude` はつねに取り込まれている。`App` `Cmd` `List` `Maybe` `String` は import なしで `App.sandbox` のように修飾名で使う。

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

`Html msg` `Style` `Cmd msg` `Program model msg` は中身の見えない組み込み型。

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

- デフォルト値は **定数式**（リテラル・コンストラクタとその適用）に限る。
- デフォルト値が使われるのは、型の名前を明示して作るときと、JSX で部品を呼ぶとき（5.5）だけ。

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
<p style={note}>こんにちは</p>
-- ↓
Html.element "p" [("style", note)] [Html.text "こんにちは"]

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

The Elm Architecture。状態はアプリ全体で一つの `Model` だけが持つ。

```haskell
main :: Program Model Msg
main = App.sandbox { init, update, view }
```

| 関数 | 型 |
| --- | --- |
| `App.sandbox` | `{ init :: model, update :: msg -> model -> model, view :: model -> Html msg } -> Program model msg` |
| `App.element` | `{ init :: (model, Cmd msg), update :: msg -> model -> (model, Cmd msg), view :: model -> Html msg } -> Program model msg` |

`main` を持つモジュールが、アプリの入口になる。

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
type RowProps =                  -- Column も同じ
  { gap     :: Size  = None      -- 子要素どうしの間隔
  , align   :: Align = Stretch   -- 並ぶ向きと直角の揃え方
  , justify :: Align = Start     -- 並ぶ向きの揃え方
  , wrap    :: Bool  = False     -- 入りきらないときに折り返すか
  , style   :: Style = Style {}
  }

type GridProps   = { columns :: Int, gap :: Size = None, style :: Style = Style {} }
type StackProps  = { align :: Align = Stretch, justify :: Align = Stretch, style :: Style = Style {} }
type ScrollProps = { direction :: Direction = Vertical, style :: Style = Style {} }

data Align     = Start | Center | End | Stretch
data Direction = Horizontal | Vertical
```

## 9. スタイル

見た目は `Style` 値で書く。`style` 属性に名前を渡し、中身は `where` に書く。

```haskell
photo props =
  <figure style={frame} onClick={props.onClick}>
    <img src={props.src} alt={props.alt} />
  </figure>
  where
    frame
      | props.selected = { base | border = Primary }
      | otherwise      = base

    base = Style { radius = M, shadow = S, hover = Style { shadow = M } }
```

### 9.1 Style のフィールド

`Style` はすべてのフィールドが省略できるレコード。省略したものは指定なしになる。一部を変えるときはレコードの更新（`{ base | border = Primary }`）を使う。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `padding` | `Size` | 内側の余白（上下左右） |
| `paddingX` `paddingY` | `Size` | 左右だけ・上下だけの内側の余白（`padding` より優先） |
| `width` `height` | `Length` | 大きさ |
| `background` | `Color` | 背景色 |
| `color` | `Color` | 文字色 |
| `border` | `Color` | 枠線の色（太さは 1px） |
| `radius` | `Size` | 角の丸み。`XL` は完全な丸 |
| `shadow` | `Size` | 影 |
| `font` | `Size` | 文字の大きさ |
| `weight` | `Weight` | 文字の太さ |
| `hover` | `Style` | ポインターが乗ったときに上書きするスタイル |

### 9.2 デザイントークン

色や大きさは、トークンの名前で指定する。数値は書けない（`Px` を除く）。

```haskell
data Size   = None | XS | S | M | L | XL
data Length = Fill | Shrink | Px Int
data Weight = Regular | Bold
data Color
  = Primary | Success | Warning | Danger
  | Text | Muted | Surface | Background | Border | Transparent
```

実際の値（`M` が何ピクセルか、`Primary` が何色か）はテーマで決まる。テーマは標準のものを使う。

## 10. HTML 要素

使える要素（v0.1）:

`h1` `h2` `h3` `p` `span` `strong` `a` `ul` `ol` `li` `section` `header` `footer` `main` `nav` `article` `figure` `figcaption` `img` `button` `input` `label` `form` `textarea` `div`

HTML 要素は **意味のため** に使う（見出し、リスト、ボタン、入力）。並び方はレイアウトタグで書く。

| 属性 | 型 |
| --- | --- |
| `style` | `Style` |
| `key` | `String`（リストの要素を見分ける） |
| `src` `alt` `href` `type` `value` `placeholder` `name` `id` `for` `title` | `String` |
| `disabled` `checked` | `Bool` |
| `onClick` `onSubmit` | `msg` |
| `onInput` | `String -> msg` |
| `onCheck` | `Bool -> msg` |

## 11. 副作用と JavaScript

副作用は `Cmd msg` として `update` から返し、ランタイムが実行する。JavaScript の機能は `foreign import` で取り込む。

```haskell
foreign import saveText :: String -> String -> Cmd msg
  = "(key) => (text) => (dispatch) => localStorage.setItem(key, text)"

foreign import now :: (Int -> msg) -> Cmd msg
  = "(toMsg) => (dispatch) => dispatch(toMsg(Date.now()))"
```

- `foreign import` の結果の型は `Cmd msg` でなければならない。JavaScript から値を受け取るときは、メッセージとして `dispatch` してもらう。
- `Cmd msg` を返す JavaScript 関数は、全引数を受け取ったあと `(dispatch) => void` を返す。
- `Cmd.none :: Cmd msg`、`Cmd.batch :: [Cmd msg] -> Cmd msg`。

## 12. 実行時の意味

- 正格評価。ただし、引数を持たない束縛（`where` やトップレベルの値）は、最初に使われたときに一度だけ計算する。そのため `where` には、ガードのどれか 1 つでしか使わない値も気にせず書ける。
- 値は不変。レコードの更新は新しいレコードを作る。
- JavaScript（ES Modules）にコンパイルし、組み込みの仮想 DOM ランタイムで動かす。

## 13. 文法（要約）

```
module    ::= "module" ModName exports? "where" decl*
decl      ::= import | data | type | sig | equation | foreign
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
| 基本 | `not` `otherwise` `identity` `always` `show` `negate` `abs` `min` `max` `subtract` `toFloat` `round` `floor` `ceiling` `fst` `snd` |
| リスト | `map` `filter` `foldl` `foldr` `length` `null` `reverse` `sum` `product` `concat` `concatMap` `any` `all` `take` `drop` `zip` `range` `sort` `sortOn` `elem` |
| 文字列 | `trim` `words` `unwords` `lines` `unlines` |

文字列を画面に出すときは、JSX の子要素にそのまま書く（`<p>{name}</p>`）。`text` 関数はない。

修飾名で使うモジュール（import は不要。import するとエラー）:

| モジュール | 名前 |
| --- | --- |
| `List` | `head` `last` `find`（いずれも `Maybe` を返す）、`indexedMap` |
| `Maybe` | `map` `andThen` `withDefault` `isJust` |
| `String` | `length` `isEmpty` `toUpper` `toLower` `contains` `toInt` `toFloat`（`toInt` と `toFloat` は `Maybe` を返す） |
| `App` | `sandbox` `element` |
| `Cmd` | `none` `batch` |

`Prelude` `Layout` と上のモジュール名は予約されていて、ユーザーのモジュール名には使えない。

標準ライブラリは lambda-jsx 自身で書かれている（`src/lib/*.lx`）。

`Style`・デザイントークン・レイアウトタグ・`Maybe`・`Result` の型とコンストラクタも `Prelude` に含まれる。
