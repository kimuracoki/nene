<!-- scripts/reference.ts が作る。直接は直さない -->

# SpeedDial

`import Ui.SpeedDial` · タグ `<SpeedDial />`

丸いボタンを押すと、関連する操作が上に並んで出る。開け閉めはブラウザが受け持つので、model に何も足さなくてよい

（外を押すか Esc で閉じ、操作を押すとメッセージが届いて閉じる）

```haskell
<SpeedDial id="create" label="作る" actions={creates} />
  where
    creates =
      [ Action { icon = Icon.mail, label = "メール", onClick = NewMail }
      , Action { icon = Icon.calendar, label = "予定", onClick = NewEvent }
      ]
```

id は、ページの中でほかと重ならない名前にする。置き場所（右下に固定するなど）は、使う側の style で決める

<!-- demo: SpeedDial -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=SpeedDial)

```haskell
speedDial :: SpeedDialProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `id` | `String` | 必須 | ページの中でほかと重ならない名前 |
| `label` | `String` | 必須 | 丸いボタンの読み上げに使う名前 |
| `actions` | `[Action msg]` | 必須 | 開いたときに並べる操作。下から順に並ぶ |
| `icon` | `Icon.Icon` | `Icon.add` | 丸いボタンのアイコン |
| `tone` | `Tone` | `Primary` | 色の種類 |

型: [Action](#action) · [Icon.Icon](Icon.md#icon) · [Tone](Theme.md#tone)

子要素は受け取らない。

## Action

```haskell
type Action msg
```

| 名前 | 型 | 説明 |
| --- | --- | --- |
| `icon` | `Icon.Icon` | 出すアイコン |
| `label` | `String` | 読み上げとツールチップに使う名前 |
| `onClick` | `msg` | 押したときに届くメッセージ（閉じる） |

型: [Icon.Icon](Icon.md#icon)

ソース: [ui/src/Ui/SpeedDial.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/SpeedDial.nn)
