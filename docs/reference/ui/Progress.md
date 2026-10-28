<!-- scripts/reference.ts が作る。直接は直さない -->

# Progress

`import Ui.Progress` · タグ `<Progress />`

進み具合のバー。value は 0 から 1。Nothing なら終わりの見えない処理として動き続ける

```haskell
<Progress value={Just 0.4} />
```

<!-- demo: Progress -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Progress)

```haskell
progress :: ProgressProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `Maybe Float` | `Nothing` | 進み具合（0 から 1）。Nothing なら、終わりの見えない処理として動き続ける |
| `tone` | `Tone` | `Primary` | 色の種類 |

型: [Maybe](../std/Maybe.md) · [Tone](Theme.md#tone)

子要素は受け取らない。

ソース: [ui/src/Ui/Progress.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Progress.nn)
