<!-- scripts/reference.ts が作る。直接は直さない -->

# Button

`import Ui.Button` · タグ `<Button>…</Button>`

ボタン

```haskell
<Button onClick={Save}>保存</Button>
<Button variant={Outlined} tone={Danger} startIcon={Just Icon.delete} onClick={Remove}>削除</Button>
<Button loading={model.saving} onClick={Save}>保存</Button>    -- 読み込み中は回る印を出し、押せなくする
```

<!-- demo: Button -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Button)

```haskell
button :: ButtonProps msg -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `onClick` | `msg` | 必須 | 押したときに届くメッセージ |
| `variant` | `Variant` | `Filled` | 見た目（Filled・Outlined・Plain） |
| `tone` | `Tone` | `Primary` | 色の種類 |
| `size` | `Size` | `M` | 大きさ（S・M・L） |
| `startIcon` | `Maybe Icon.Icon` | `Nothing` | 文字の前に出すアイコン |
| `endIcon` | `Maybe Icon.Icon` | `Nothing` | 文字の後に出すアイコン |
| `disabled` | `Bool` | `False` | 押せない |
| `fullWidth` | `Bool` | `False` | 横幅いっぱいに広げる |
| `loading` | `Bool` | `False` | True なら、文字の代わりに回る印を出し、押せなくする |

型: [Variant](#variant) · [Tone](Theme.md#tone) · [Size](../std/Prelude.md#size) · [Maybe](../std/Maybe.md) · [Icon.Icon](Icon.md#icon) · [Bool](../std/Prelude.md#bool)

子要素を受け取る（タグの間に書いたものが中身になる）。

## Variant

```haskell
data Variant
  = Filled
  | Outlined
  | Plain
```

| 構成子 | 意味 |
| --- | --- |
| `Filled` | 色で塗ったボタン（いちばん目立つ） |
| `Outlined` | 枠だけのボタン |
| `Plain` | 文字だけのボタン（いちばん控えめ） |

ソース: [ui/src/Ui/Button.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Button.nn)
