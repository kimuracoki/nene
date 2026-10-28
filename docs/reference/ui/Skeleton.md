<!-- scripts/reference.ts が作る。直接は直さない -->

# Skeleton

`import Ui.Skeleton` · タグ `<Skeleton />`

読み込み中に、中身の代わりに置く灰色の形

```haskell
<Skeleton />                                  -- 1 行の文字
<Skeleton shape={Block} height="140px" />    -- 画像やカード
<Skeleton shape={Circle} width="40px" />     -- アバター
```

width と height は CSS の長さ。省略すると、形ごとの決まった大きさになる

<!-- demo: Skeleton -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Skeleton)

```haskell
skeleton :: SkeletonProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `shape` | `Shape` | `Line` | 形（Line・Block・Circle） |
| `width` | `String` | `""` | 幅（CSS の長さ）。空なら形ごとの決まった幅 |
| `height` | `String` | `""` | 高さ（CSS の長さ）。空なら形ごとの決まった高さ |

型: [Shape](#shape)

子要素は受け取らない。

## Shape

```haskell
data Shape
  = Line
  | Block
  | Circle
```

| 構成子 | 意味 |
| --- | --- |
| `Line` | 1 行の文字の形 |
| `Block` | 四角（画像やカード） |
| `Circle` | 丸（アバター） |

ソース: [ui/src/Ui/Skeleton.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Skeleton.nn)
