<!-- scripts/reference.ts が作る。直接は直さない -->

# Popover

`import Ui.Popover` · タグ `<Popover>…</Popover>`

ボタンを押すと開く、自由な中身の吹き出し。外を押すか Esc で閉じる。model に何も足さなくてよい

```haskell
<Popover id="profile" label="プロフィール">
  <Column gap={S}>…</Column>
</Popover>
```

id は、ページの中でほかと重ならない名前にする

<!-- demo: Popover -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Popover)

```haskell
popover :: PopoverProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `id` | `String` | 必須 | ページの中でほかと重ならない名前 |
| `label` | `String` | 必須 | 吹き出しを開くボタンの文字 |
| `variant` | `Variant` | `Outlined` | 開くボタンの見た目（Filled・Outlined・Plain） |

型: [Variant](Button.md#variant)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Popover.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Popover.nn)
