<!-- scripts/reference.ts が作る。直接は直さない -->

# Timeline

`import Ui.Timeline` · タグ `<Timeline />`

起きたことを、時間の順に縦に並べる。items は（いつ, 何が起きたか）の組

```haskell
<Timeline items={history} />
  where
    history = [("9:00", "注文を受けた"), ("10:30", "発送した"), ("翌日", "届いた")]
```

点の色は tone で変えられる

<!-- demo: Timeline -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Timeline)

```haskell
timeline :: TimelineProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `items` | `[(String, String)]` | 必須 | （いつ, 何が起きたか）の組。上から順に並ぶ |
| `tone` | `Tone` | `Primary` | 点の色の種類 |

型: [Tone](Theme.md#tone)

子要素は受け取らない。

ソース: [ui/src/Ui/Timeline.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Timeline.nn)
