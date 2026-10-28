<!-- scripts/reference.ts が作る。直接は直さない -->

# Tooltip

`import Ui.Tooltip` · タグ `<Tooltip>…</Tooltip>`

子要素にマウスを載せるか、キーボードで選んだときに出る説明。出す向きは placement で選ぶ（既定は下）

```haskell
<Tooltip text="保存（⌘S）">
  <IconButton icon={Icon.check} label="保存" onClick={Save} />
</Tooltip>
<Tooltip text="前へ" placement={Left}>…</Tooltip>
```

<!-- demo: Tooltip -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Tooltip)

```haskell
tooltip :: TooltipProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `text` | `String` | 必須 | 出す説明の文字 |
| `placement` | `Placement` | `Bottom` | 子要素のどちら側に出すか |

型: [Placement](#placement)

子要素を受け取る（タグの間に書いたものが中身になる）。

## Placement

```haskell
data Placement
  = Top
  | Bottom
  | Left
  | Right
```

| 構成子 | 意味 |
| --- | --- |
| `Top` | 上に出す |
| `Bottom` | 下に出す |
| `Left` | 左に出す |
| `Right` | 右に出す |

ソース: [ui/src/Ui/Tooltip.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Tooltip.nn)
