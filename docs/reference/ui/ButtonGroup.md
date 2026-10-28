<!-- scripts/reference.ts が作る。直接は直さない -->

# ButtonGroup

`import Ui.ButtonGroup` · タグ `<ButtonGroup />`

つながったボタンの並び。items は（表示する文字, 押したときのメッセージ）の組

1 つを選んだ状態を持つときは ToggleGroup を使う

```haskell
<ButtonGroup items={actions} />
  where
    actions = [("コピー", Copy), ("切り取り", Cut), ("貼り付け", Paste)]
```

<!-- demo: ButtonGroup -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=ButtonGroup)

```haskell
buttonGroup :: ButtonGroupProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `items` | `[(String, msg)]` | 必須 | （表示する文字, 押したときのメッセージ）の組。左から順に並ぶ |
| `variant` | `Variant` | `Outlined` | 見た目（Filled・Outlined・Plain） |
| `tone` | `Tone` | `Primary` | 色の種類 |
| `size` | `Size` | `M` | 大きさ（S・M・L） |
| `disabled` | `Bool` | `False` | どのボタンも押せない |

型: [Variant](Button.md#variant) · [Tone](Theme.md#tone) · [Size](../std/Prelude.md#size) · [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/ButtonGroup.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/ButtonGroup.nn)
