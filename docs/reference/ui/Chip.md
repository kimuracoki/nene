<!-- scripts/reference.ts が作る。直接は直さない -->

# Chip

`import Ui.Chip` · タグ `<Chip>…</Chip>`

小さなラベル。onClick を渡すと押せるチップ（絞り込みなど）になる

```haskell
<Chip tone={Success}>完了</Chip>
<Chip selected={isAll} onClick={showAll}>すべて</Chip>
<Chip onDelete={remove}>{tag}</Chip>    -- 右に消すボタンが付く
  where
    showAll = Just (SetFilter All)
    remove = Just (RemoveTag tag)
```

<!-- demo: Chip -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Chip)

```haskell
chip :: ChipProps msg -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `onClick` | `Maybe msg` | `Nothing` | Just なら押せるチップになり、押したときにこのメッセージが届く |
| `selected` | `Bool` | `False` | 選んである印を付ける（絞り込みの選択肢など） |
| `tone` | `Tone` | `Neutral` | 色の種類 |
| `onDelete` | `Maybe msg` | `Nothing` | Just msg なら、右に消すボタンを付ける |

型: [Maybe](../std/Maybe.md) · [Bool](../std/Prelude.md#bool) · [Tone](Theme.md#tone)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Chip.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Chip.nn)
