<!-- scripts/reference.ts が作る。直接は直さない -->

# Stepper

`import Ui.Stepper` · タグ `<Stepper />`

手順のどこにいるかを示す。active は 0 から数える。終わった手順には印が付く

```haskell
<Stepper steps={steps} active={model.step} />
  where
    steps = ["カート", "お届け先", "支払い"]
```

<!-- demo: Stepper -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Stepper)

```haskell
stepper :: StepperProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `steps` | `[String]` | 必須 | 手順の名前。左から順に並ぶ |
| `active` | `Int` | 必須 | いまの手順（0 から数える）。それより前は終わった印が付く |

子要素は受け取らない。

ソース: [ui/src/Ui/Stepper.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Stepper.nn)
