<!-- scripts/reference.ts が作る。直接は直さない -->

# IconButton

`import Ui.IconButton` · タグ `<IconButton />`

アイコンだけのボタン。label は画面には出ず、読み上げとツールチップに使う

```haskell
<IconButton icon={Icon.close} label="閉じる" onClick={Close} />
```

<!-- demo: IconButton -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=IconButton)

```haskell
iconButton :: IconButtonProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `icon` | `Icon.Icon` | 必須 | 出すアイコン |
| `label` | `String` | 必須 | 読み上げとツールチップに使う名前（画面には出ない） |
| `onClick` | `msg` | 必須 | 押したときに届くメッセージ |
| `variant` | `Variant` | `Plain` | 見た目（Filled・Outlined・Plain） |
| `tone` | `Tone` | `Neutral` | 色の種類 |
| `size` | `Size` | `M` | 大きさ（S・M・L） |
| `disabled` | `Bool` | `False` | 押せない |

型: [Icon.Icon](Icon.md#icon) · [Variant](Button.md#variant) · [Tone](Theme.md#tone) · [Size](../std/Prelude.md#size) · [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/IconButton.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/IconButton.nn)
