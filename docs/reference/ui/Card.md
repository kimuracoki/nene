<!-- scripts/reference.ts が作る。直接は直さない -->

# Card

`import Ui.Card` · タグ `<Card>…</Card>`

内容をまとめる面。title を書くと見出しが付く

```haskell
<Card title="プロフィール">…</Card>
<Card padding={None}>…</Card>       -- 中身を端まで広げる（リストなど）
```

<!-- demo: Card -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Card)

```haskell
card :: CardProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `title` | `String` | `""` | 見出し。空なら出さない |
| `padding` | `Size` | `M` | 中身のまわりの余白。None なら中身を端まで広げる（リストや表を入れるとき） |

型: [Size](../std/Prelude.md#size)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Card.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Card.nn)
