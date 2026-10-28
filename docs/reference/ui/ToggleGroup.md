<!-- scripts/reference.ts が作る。直接は直さない -->

# ToggleGroup

`import Ui.ToggleGroup` · タグ `<ToggleGroup />`

つながったボタンから 1 つを選ぶ（表示の切り替えなど）。options は（値, 表示する文字）の組

```haskell
<ToggleGroup value={model.view} options={views} onChange={ViewChanged} />
  where
    views = [("list", "リスト"), ("grid", "グリッド")]
```

<!-- demo: ToggleGroup -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=ToggleGroup)

```haskell
toggleGroup :: ToggleGroupProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `String` | 必須 | 選んでいる選択肢の値 |
| `options` | `[(String, String)]` | 必須 | （値, 表示する文字）の組 |
| `onChange` | `String -> msg` | 必須 | 押したときに、その選択肢の値を受け取る |
| `disabled` | `Bool` | `False` | どれも押せない |

型: [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/ToggleGroup.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/ToggleGroup.nn)
