<!-- scripts/reference.ts が作る。直接は直さない -->

# RadioGroup

`import Ui.RadioGroup` · タグ `<RadioGroup />`

選択肢から 1 つを選ぶ丸いボタンの組。options は（値, 表示する文字）の組

```haskell
<RadioGroup name="plan" label="プラン" value={model.plan} options={plans} onChange={PlanChanged} />
  where
    plans = [("free", "無料"), ("pro", "プロ")]
```

name は、ページの中でほかの RadioGroup と重ならない名前にする（矢印キーで選び直せるようになる）

<!-- demo: RadioGroup -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=RadioGroup)

```haskell
radioGroup :: RadioGroupProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `name` | `String` | 必須 | ページの中でほかと重ならない名前（ラジオボタンを 1 組にする） |
| `value` | `String` | 必須 | 選んでいる選択肢の値 |
| `options` | `[(String, String)]` | 必須 | （値, 表示する文字）の組 |
| `onChange` | `String -> msg` | 必須 | 選んだときに、その選択肢の値を受け取る |
| `label` | `String` | `""` | 組の見出し。空なら出さない |
| `row` | `Bool` | `False` | True なら横に並べる |
| `disabled` | `Bool` | `False` | どれも選べない |

型: [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/RadioGroup.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/RadioGroup.nn)
