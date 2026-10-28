<!-- scripts/reference.ts が作る。直接は直さない -->

# Tabs

`import Ui.Tabs` · タグ `<Tabs />`

タブ。どれを選んでいるかは model に持つ（0 から数える）

```haskell
<Tabs labels={sections} selected={model.tab} onSelect={TabChanged} />
  where
    sections = ["概要", "設定", "履歴"]
```

<!-- demo: Tabs -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Tabs)

```haskell
tabs :: TabsProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `labels` | `[String]` | 必須 | タブの文字。左から順に並ぶ |
| `selected` | `Int` | 必須 | 選んでいるタブ（0 から数える） |
| `onSelect` | `Int -> msg` | 必須 | タブを押したときに、その番号を受け取る |

子要素は受け取らない。

ソース: [ui/src/Ui/Tabs.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Tabs.nn)
