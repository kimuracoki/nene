<!-- scripts/reference.ts が作る。直接は直さない -->

# Alert

`import Ui.Alert` · タグ `<Alert>…</Alert>`

知らせる枠。色の種類に合ったアイコンが付く

```haskell
<Alert tone={Success} title="保存しました">次回からこの設定で開きます。</Alert>
```

<!-- demo: Alert -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Alert)

```haskell
alert :: AlertProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `tone` | `Tone` | `Primary` | 色の種類。知らせの重さに合わせる（Success・Warning・Danger など） |
| `title` | `String` | `""` | 太字の見出し。空なら出さない |

型: [Tone](Theme.md#tone)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Alert.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Alert.nn)
