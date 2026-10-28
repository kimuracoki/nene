<!-- scripts/reference.ts が作る。直接は直さない -->

# Rating

`import Ui.Rating` · タグ `<Rating />`

星の数で表す評価。onChange を渡すと押して選べる。渡さなければ表示だけ

```haskell
<Rating value={model.stars} onChange={Just Rated} />
<Rating value={review.stars} />
```

<!-- demo: Rating -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Rating)

```haskell
rating :: RatingProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `Int` | 必須 | 星の数 |
| `onChange` | `Maybe (Int -> msg)` | `Nothing` | Just なら星を押して選べ、押した星の数を受け取る。Nothing なら表示だけ |
| `max` | `Int` | `5` | 星の数の最大 |
| `label` | `String` | `"評価"` | 読み上げに使う |

型: [Maybe](../std/Maybe.md)

子要素は受け取らない。

ソース: [ui/src/Ui/Rating.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Rating.nn)
