<!-- scripts/reference.ts が作る。直接は直さない -->

# Accordion

`import Ui.Accordion` · タグ `<Accordion>…</Accordion>`

見出しを押すと開け閉めできる枠。開け閉めはブラウザが受け持つので、model に何も足さなくてよい

```haskell
<Accordion title="よくある質問">…</Accordion>
<Accordion title="支払い" group="faq">…</Accordion>   -- 同じ group のものは、1 つだけが開く
```

<!-- demo: Accordion -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Accordion)

```haskell
accordion :: AccordionProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `title` | `String` | 必須 | 見出しの文字。押すと開け閉めする |
| `open` | `Bool` | `False` | 最初から開いておくか |
| `group` | `String` | `""` | 同じ group の Accordion は、1 つだけが開く。空ならほかと関係なく開く |

型: [Bool](../std/Prelude.md#bool)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Accordion.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Accordion.nn)
