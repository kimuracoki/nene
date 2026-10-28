<!-- scripts/reference.ts が作る。直接は直さない -->

# Fab

`import Ui.Fab` · タグ `<Fab />`

画面に浮かぶ丸いボタン（いちばん大事な操作に 1 つだけ使う）。extended なら label も出す

```haskell
<Fab icon={Icon.add} label="新しく作る" onClick={Create} />
<Fab icon={Icon.edit} label="書く" extended onClick={Compose} />
```

置き場所（右下に固定するなど）は、使う側の style で決める

<!-- demo: Fab -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Fab)

```haskell
fab :: FabProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `icon` | `Icon.Icon` | 必須 | 出すアイコン |
| `label` | `String` | 必須 | 読み上げに使う名前。extended なら横に出す |
| `onClick` | `msg` | 必須 | 押したときに届くメッセージ |
| `extended` | `Bool` | `False` | label も出して、横に長いボタンにする |
| `tone` | `Tone` | `Primary` | 色の種類 |
| `disabled` | `Bool` | `False` | 押せない |

型: [Icon.Icon](Icon.md#icon) · [Bool](../std/Prelude.md#bool) · [Tone](Theme.md#tone)

子要素は受け取らない。

ソース: [ui/src/Ui/Fab.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Fab.nn)
