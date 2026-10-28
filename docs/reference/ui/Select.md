<!-- scripts/reference.ts が作る。直接は直さない -->

# Select

`import Ui.Select` · タグ `<Select />`

選択肢から 1 つを選ぶ。options は（値, 表示する文字）の組

見た目は TextField と同じ。いつも何かが選ばれているので、ラベルは枠の上に縮んだまま出る

開いた一覧も Material Design の形になる（appearance: base-select に対応したブラウザ。ほかのブラウザでは標準の一覧）

```haskell
<Select label="並び順" value={model.order} options={orders} onChange={OrderChanged} />
  where
    orders = [("new", "新しい順"), ("old", "古い順")]
```

<!-- demo: Select -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Select)

```haskell
select :: SelectProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `String` | 必須 | 選んでいる選択肢の値 |
| `options` | `[(String, String)]` | 必須 | （値, 表示する文字）の組 |
| `onChange` | `String -> msg` | 必須 | 選んだときに、その選択肢の値を受け取る |
| `label` | `String` | `""` | 欄の名前 |
| `disabled` | `Bool` | `False` | 選べない |
| `variant` | `Variant` | `Outlined` | 見た目は TextField と同じ |

型: [Bool](../std/Prelude.md#bool) · [Variant](Button.md#variant)

子要素は受け取らない。

ソース: [ui/src/Ui/Select.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Select.nn)
