<!-- scripts/reference.ts が作る。直接は直さない -->

# Checkbox

`import Ui.Checkbox` · タグ `<Checkbox />`

チェックボックス

```haskell
<Checkbox label="利用規約に同意する" checked={model.agreed} onCheck={Agreed} />
```

<!-- demo: Checkbox -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Checkbox)

```haskell
checkbox :: CheckboxProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `checked` | `Bool` | 必須 | チェックしてあるか |
| `onCheck` | `Bool -> msg` | 必須 | 押したときに、押した後のチェックの状態を受け取る |
| `label` | `String` | `""` | 右に出す文字。押しても切り替わる |
| `disabled` | `Bool` | `False` | 押せない |

型: [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/Checkbox.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Checkbox.nn)
