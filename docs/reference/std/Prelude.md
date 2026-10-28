<!-- scripts/reference.ts が作る。直接は直さない -->

# Prelude

import しなくても使える標準の型と関数

import は書かずに、そのまま使える。

[Bool](#bool) · [Maybe](#maybe) · [Result](#result) · [Size](#size) · [Align](#align) · [Direction](#direction) · [Url](#url) · [otherwise](#otherwise) · [not](#not) · [identity](#identity) · [always](#always) · [fst](#fst) · [snd](#snd) · [classes](#classes) · [show](#show) · [negate](#negate) · [abs](#abs) · [min](#min) · [max](#max) · [subtract](#subtract) · [mod](#mod) · [toFloat](#tofloat) · [round](#round) · [floor](#floor) · [ceiling](#ceiling) · [map](#map) · [filter](#filter) · [foldl](#foldl) · [foldr](#foldr) · [length](#length) · [null](#null) · [reverse](#reverse) · [sum](#sum) · [product](#product) · [concat](#concat) · [concatMap](#concatmap) · [any](#any) · [all](#all) · [take](#take) · [drop](#drop) · [zip](#zip) · [range](#range) · [sort](#sort) · [sortOn](#sorton) · [elem](#elem) · [trim](#trim) · [words](#words) · [unwords](#unwords) · [lines](#lines) · [unlines](#unlines)

### Bool

```haskell
data Bool = False | True
```

真偽。if はないので、場合分けはガードかパターンで書く

### Maybe

```haskell
data Maybe a
  = Nothing
  | Just a
```

ないかもしれない値。null の代わり（関数は Maybe モジュール）

| 構成子 | 意味 |
| --- | --- |
| `Nothing` | ない |
| `Just a` | ある |

### Result

```haskell
data Result e a
  = Err e
  | Ok a
```

失敗するかもしれない処理の結果（関数は Result モジュール）

| 構成子 | 意味 |
| --- | --- |
| `Err e` | 失敗した。e はわけ |
| `Ok a` | うまくいった |

## レイアウトタグで使う値

### Size

```haskell
data Size
  = None
  | XS
  | S
  | M
  | L
  | XL
```

間隔と画面幅の大きさ。gap などの間隔では 0〜32px、collapse では画面幅を表す

CSS からは var(--space-s) などで、間隔と同じ値を使える

| 構成子 | 意味 |
| --- | --- |
| `None` | 間隔 0。collapse では、狭くても並び方を変えない |
| `XS` | 間隔 4px。collapse では画面幅 360px |
| `S` | 間隔 8px。collapse では画面幅 480px |
| `M` | 間隔 16px。collapse では画面幅 768px |
| `L` | 間隔 24px。collapse では画面幅 1024px |
| `XL` | 間隔 32px。collapse では画面幅 1280px |

### Align

```haskell
data Align
  = Start
  | Center
  | End
  | Stretch
```

揃え方。並ぶ向き（justify）と、それに直角の向き（align）の両方に使う

| 構成子 | 意味 |
| --- | --- |
| `Start` | 始め（左・上）に寄せる |
| `Center` | 真ん中に寄せる |
| `End` | 終わり（右・下）に寄せる |
| `Stretch` | いっぱいに伸ばす（justify では Start と同じ） |

### Direction

```haskell
data Direction
  = Horizontal
  | Vertical
```

スクロールする向き（`<Scroll direction={…}>`）

| 構成子 | 意味 |
| --- | --- |
| `Horizontal` | 横にスクロールする |
| `Vertical` | 縦にスクロールする |

## アプリ

### Url

```haskell
type Url
```

いまの URL。path は "/todos/3" なら ["todos", "3"]

| 名前 | 型 | 説明 |
| --- | --- | --- |
| `path` | `[String]` | / で区切った道筋。"/todos/3" なら ["todos", "3"]、"/" なら [] |
| `query` | `[(String, String)]` | ? のあとの名前と値の組。"?q=nene&page=2" なら [("q", "nene"), ("page", "2")] |
| `hash` | `String` | # のあと（# は含まない）。なければ "" |

## 基本

### otherwise

```haskell
otherwise :: Bool
```

いつも True。ガードの最後に書いて「それ以外のとき」を表す

```haskell
label n
  | n > 0     = "正"
  | otherwise = "0 か負"
```

### not

```haskell
not :: Bool -> Bool
```

真偽を反対にする

```haskell
not True    -- False
```

### identity

```haskell
identity :: a -> a
```

受け取った値をそのまま返す。何もしない関数が要るときに使う

```haskell
update = always identity    -- どのメッセージでも model を変えない
```

### always

```haskell
always :: a -> b -> a
```

1 つ目の値を返し、2 つ目の引数は使わない。引数を無視する関数を作るときに使う

```haskell
always 1 "何でも"                     -- 1
map (always 0) [5, 6, 7]              -- [0, 0, 0]
Time.every 4000 (always HideNotice)   -- 時刻を受け取らずにメッセージを返す
```

### fst

```haskell
fst :: (a, b) -> a
```

組の 1 つ目

```haskell
fst ("a", 1)    -- "a"
```

### snd

```haskell
snd :: (a, b) -> b
```

組の 2 つ目

```haskell
snd ("a", 1)    -- 1
```

### classes

```haskell
classes :: [Class] -> Class
```

複数のクラスを 1 つにまとめる。class={look} の look を where で作るときに使う

```haskell
look
  | props.selected = classes [css.item, css.selected]
  | otherwise      = css.item
```

### show

```haskell
show :: Show a => a -> String
```

Int・Float・Bool を文字にする。JSX の子要素に数を出すときに使う

```haskell
show 42      -- "42"
show 1.5     -- "1.5"
show True    -- "True"
```

### negate

```haskell
negate :: Num a => a -> a
```

符号を反対にする

```haskell
negate 3    -- -3
```

### abs

```haskell
abs :: Num a => a -> a
```

絶対値

```haskell
abs (-3)    -- 3
```

### min

```haskell
min :: Ord a => a -> a -> a
```

小さいほう

```haskell
min 3 7    -- 3
```

### max

```haskell
max :: Ord a => a -> a -> a
```

大きいほう

```haskell
max 3 7    -- 7
```

### subtract

```haskell
subtract :: Num a => a -> a -> a
```

2 つ目の引数から 1 つ目を引く。(- 1) は負の数になるので、1 を引く関数は subtract 1 と書く

```haskell
subtract 1 10           -- 9
map (subtract 1) [5, 6] -- [4, 5]
```

### mod

```haskell
mod :: Int -> Int -> Int
```

割り算の余り。結果はいつも 0 以上（割る数が正のとき）。0 で割ると 0

```haskell
mod 7 3       -- 1
mod (-1) 12   -- 11
```

### toFloat

```haskell
toFloat :: Int -> Float
```

Int を Float にする

```haskell
toFloat 3 / 2    -- 1.5
```

### round

```haskell
round :: Float -> Int
```

いちばん近い整数にする（.5 は大きいほうへ）

```haskell
round 2.5    -- 3
```

### floor

```haskell
floor :: Float -> Int
```

小数点以下を切り捨てる（小さいほうの整数にする）

```haskell
floor 2.7     -- 2
floor (-2.1)  -- -3
```

### ceiling

```haskell
ceiling :: Float -> Int
```

小数点以下を切り上げる（大きいほうの整数にする）

```haskell
ceiling 2.1    -- 3
```

## リスト

### map

```haskell
map :: (a -> b) -> [a] -> [b]
```

リストの要素それぞれに関数を当てる

```haskell
map show [1, 2, 3]      -- ["1", "2", "3"]
map (.title) todos      -- タイトルのリスト
```

### filter

```haskell
filter :: (a -> Bool) -> [a] -> [a]
```

条件に合う要素だけを残す

```haskell
filter (.done) todos    -- 済んだものだけ
filter isAdult people   -- where に isAdult p = p.age >= 18 と書いておく
```

### foldl

```haskell
foldl :: (b -> a -> b) -> b -> [a] -> b
```

左から順に、値を 1 つにまとめる。関数は（それまでの値, 要素）を受け取る

```haskell
foldl (+) 0 [1, 2, 3]    -- 6
```

### foldr

```haskell
foldr :: (a -> b -> b) -> b -> [a] -> b
```

右から順に、値を 1 つにまとめる。関数は（要素, それまでの値）を受け取る

```haskell
foldr (:) [] [1, 2, 3]    -- [1, 2, 3]
```

### length

```haskell
length :: [a] -> Int
```

リストの要素の数

```haskell
length [1, 2, 3]    -- 3
```

### null

```haskell
null :: [a] -> Bool
```

リストが空か

```haskell
null []     -- True
null [1]    -- False
```

### reverse

```haskell
reverse :: [a] -> [a]
```

リストを逆の順にする

```haskell
reverse [1, 2, 3]    -- [3, 2, 1]
```

### sum

```haskell
sum :: Num a => [a] -> a
```

数の合計。空なら 0

```haskell
sum [1, 2, 3]    -- 6
```

### product

```haskell
product :: Num a => [a] -> a
```

数の積。空なら 1

```haskell
product [2, 3, 4]    -- 24
```

### concat

```haskell
concat :: [[a]] -> [a]
```

リストのリストを 1 つのリストにつなげる

```haskell
concat [[1, 2], [3]]    -- [1, 2, 3]
```

### concatMap

```haskell
concatMap :: (a -> [b]) -> [a] -> [b]
```

要素それぞれからリストを作り、それをつなげる

```haskell
concatMap (.tags) posts    -- すべての投稿のタグ
```

### any

```haskell
any :: (a -> Bool) -> [a] -> Bool
```

条件に合う要素が 1 つでもあるか。空なら False

```haskell
any (.done) todos
```

### all

```haskell
all :: (a -> Bool) -> [a] -> Bool
```

すべての要素が条件に合うか。空なら True

```haskell
all (.done) todos
```

### take

```haskell
take :: Int -> [a] -> [a]
```

先頭から n 個を取り出す。足りなければあるだけ

```haskell
take 2 [1, 2, 3]    -- [1, 2]
```

### drop

```haskell
drop :: Int -> [a] -> [a]
```

先頭から n 個を取り除く

```haskell
drop 2 [1, 2, 3]    -- [3]
```

### zip

```haskell
zip :: [a] -> [b] -> [(a, b)]
```

2 つのリストの要素を順に組にする。長さは短いほうに合わせる

```haskell
zip ["a", "b"] [1, 2, 3]    -- [("a", 1), ("b", 2)]
```

### range

```haskell
range :: Int -> Int -> [Int]
```

a から b までの整数（両端を含む）。b が a より小さければ []

```haskell
range 1 5    -- [1, 2, 3, 4, 5]
```

### sort

```haskell
sort :: Ord a => [a] -> [a]
```

小さい順に並べる（Int・Float・String）

```haskell
sort [3, 1, 2]    -- [1, 2, 3]
```

### sortOn

```haskell
sortOn :: Ord b => (a -> b) -> [a] -> [a]
```

関数で取り出した値の小さい順に並べる。同じ値のものは元の順のまま

```haskell
sortOn (.name) members
reverse (sortOn (.joined) members)    -- 大きい順
```

### elem

```haskell
elem :: a -> [a] -> Bool
```

値がリストに含まれるか（== と同じ比べ方）

```haskell
elem 2 [1, 2, 3]    -- True
```

## 文字列

### trim

```haskell
trim :: String -> String
```

前後の空白と改行を取り除く

```haskell
trim "  nene  "    -- "nene"
```

### words

```haskell
words :: String -> [String]
```

空白で区切った単語のリストにする。空の単語は除く

```haskell
words " 森と  湖 "    -- ["森と", "湖"]
```

### unwords

```haskell
unwords :: [String] -> String
```

単語を空白 1 つでつなげる

```haskell
unwords ["森と", "湖"]    -- "森と 湖"
```

### lines

```haskell
lines :: String -> [String]
```

改行で区切った行のリストにする

```haskell
lines "a\nb"    -- ["a", "b"]
```

### unlines

```haskell
unlines :: [String] -> String
```

行を改行でつなげる（最後には改行を付けない）

```haskell
unlines ["a", "b"]    -- "a\nb"
```

ソース: [src/lib/Prelude.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Prelude.nn)
