<!-- scripts/reference.ts が作る。直接は直さない -->

# Spinner

`import Ui.Spinner` · タグ `<Spinner />`

読み込み中を表す回転する印

```haskell
<Spinner />
```

<!-- demo: Spinner -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Spinner)

```haskell
spinner :: SpinnerProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `size` | `Size` | `M` | 大きさ（S・M・L） |
| `label` | `String` | `"読み込み中"` | 読み上げに使う文字 |

型: [Size](../std/Prelude.md#size)

子要素は受け取らない。

ソース: [ui/src/Ui/Spinner.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Spinner.nn)
