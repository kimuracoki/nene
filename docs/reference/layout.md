<!-- scripts/reference.ts が作る。直接は直さない -->

# レイアウトタグ

レイアウトタグ（spec 8 章）。`<Row>` などのタグからだけ使える

並び方は、このタグだけで書く。HTML の要素は並び方を持たない（ブロック要素として縦に積まれる）。

## Row

タグ `<Row>…</Row>`

子要素を横に並べる

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `gap` | `Size` | `None` | 子要素どうしの間隔 |
| `align` | `Align` | `Stretch` | 縦の揃え方（並ぶ向きと直角） |
| `justify` | `Align` | `Start` | 横の揃え方（並ぶ向き） |
| `wrap` | `Bool` | `False` | 入りきらないときに次の行へ折り返すか |
| `collapse` | `Size` | `None` | 画面幅がこれより狭いと、縦に並べる |
| `class` | `Class` | （なし） | style ブロックのクラス |

型: [Size](std/Prelude.md#size) · [Align](std/Prelude.md#align) · [Bool](std/Prelude.md#bool)

## Column

タグ `<Column>…</Column>`

子要素を縦に並べる

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `gap` | `Size` | `None` | 子要素どうしの間隔 |
| `align` | `Align` | `Stretch` | 横の揃え方（並ぶ向きと直角） |
| `justify` | `Align` | `Start` | 縦の揃え方（並ぶ向き） |
| `class` | `Class` | （なし） | style ブロックのクラス |

型: [Size](std/Prelude.md#size) · [Align](std/Prelude.md#align)

## Grid

タグ `<Grid>…</Grid>`

子要素を columns 列のグリッドに、左上から順に並べる

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `columns` | `Int` | 必須 | 列の数。どの列も同じ幅になる |
| `gap` | `Size` | `None` | 縦と横の間隔 |
| `collapse` | `Size` | `None` | 画面幅がこれより狭いと、1 列にする |
| `class` | `Class` | （なし） | style ブロックのクラス |

型: [Size](std/Prelude.md#size)

## Stack

タグ `<Stack>…</Stack>`

子要素を同じ場所に重ねる。後ろに書いたものほど手前に来る

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `align` | `Align` | `Stretch` | 縦の揃え方 |
| `justify` | `Align` | `Stretch` | 横の揃え方 |
| `class` | `Class` | （なし） | style ブロックのクラス |

型: [Align](std/Prelude.md#align)

## Scroll

タグ `<Scroll>…</Scroll>`

1 つの子要素を、スクロールできる領域に入れる。大きさは親か class で決める

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `direction` | `Direction` | `Vertical` | スクロールする向き |
| `class` | `Class` | （なし） | style ブロックのクラス |

型: [Direction](std/Prelude.md#direction)

## Spacer

タグ `<Spacer />`

Row・Column の中で残りの空きを埋め、前後の子要素を押し離す

## 属性に使う型

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
