<!-- scripts/reference.ts が作る。直接は直さない -->

# Divider

`import Ui.Divider` · タグ `<Divider />`

区切り線。label を書くと、線の中央に文字が入る

```haskell
<Divider />
<Divider label="または" />
```

<!-- demo: Divider -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Divider)

```haskell
divider :: DividerProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `label` | `String` | `""` | 線の真ん中に出す文字。空なら線だけ |

子要素は受け取らない。

ソース: [ui/src/Ui/Divider.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Divider.nn)
