<!-- scripts/reference.ts が作る。直接は直さない -->

# Badge

`import Ui.Badge` · タグ `<Badge>…</Badge>`

子要素の右上に数を重ねる。count が 0 のときは出さない

```haskell
<Badge count={model.unread}>
  <IconButton icon={Icon.mail} label="メール" onClick={OpenMail} />
</Badge>
```

<!-- demo: Badge -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Badge)

```haskell
badge :: BadgeProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `count` | `Int` | 必須 | 重ねる数。0 なら出さない |
| `max` | `Int` | `99` | これを超えたら 99+ と出す |
| `tone` | `Tone` | `Danger` | 色の種類 |

型: [Tone](Theme.md#tone)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Badge.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Badge.nn)
