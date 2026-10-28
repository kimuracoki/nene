<!-- scripts/reference.ts が作る。直接は直さない -->

# Switch

`import Ui.Switch` · タグ `<Switch />`

オンとオフを切り替えるスイッチ

```haskell
<Switch label="通知を受け取る" checked={model.notify} onCheck={NotifyChanged} />
```

<!-- demo: Switch -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Switch)

```haskell
switch :: SwitchProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `checked` | `Bool` | 必須 | オンか |
| `onCheck` | `Bool -> msg` | 必須 | 押したときに、押した後の状態を受け取る |
| `label` | `String` | `""` | 右に出す文字。押しても切り替わる |
| `disabled` | `Bool` | `False` | 押せない |

型: [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/Switch.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Switch.nn)
