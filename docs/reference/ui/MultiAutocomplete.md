<!-- scripts/reference.ts が作る。直接は直さない -->

# MultiAutocomplete

`import Ui.MultiAutocomplete` · タグ `<MultiAutocomplete />`

候補から複数を選べる入力欄。選んだものは欄の中にチップで並び、チップの × で外せる

打った文字（value）と、選んだもの（selected）の 2 つを model に持つ

```haskell
<MultiAutocomplete id="tags" label="タグ" value={model.tagText} selected={model.tags} options={allTags} onInput={TagTyped} onChange={TagsChanged} />
```

```haskell
update (TagTyped s) model    = { model | tagText = s }
update (TagsChanged ts) model = { model | tags = ts, tagText = "" }    -- 選んだら、打った文字は消すとよい
```

候補を押すと、選んでいなければ足し、選んでいれば外す。一覧は開いたままになる。空の欄で Backspace を押すと、最後に選んだものを外す

id は、ページの中でほかと重ならない名前にする

<!-- demo: MultiAutocomplete -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=MultiAutocomplete)

```haskell
multiAutocomplete :: MultiAutocompleteProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `id` | `String` | 必須 | ページの中でほかと重ならない名前 |
| `value` | `String` | 必須 | 打っている文字 |
| `selected` | `[String]` | 必須 | 選んだもの。欄の中にチップで並ぶ |
| `options` | `[String]` | 必須 | 候補。打った文字を含むものだけを出す |
| `onInput` | `String -> msg` | 必須 | 打つたびに、打った後の文字を受け取る |
| `onChange` | `[String] -> msg` | 必須 | 選んだり外したりしたときに、選んだもの全体を受け取る |
| `label` | `String` | `""` | 欄の名前 |
| `placeholder` | `String` | `""` | 何も選んでいないときに出す例 |
| `helper` | `String` | `""` | 欄の下に出す説明 |
| `error` | `Maybe String` | `Nothing` | Just なら赤くして、説明の代わりに出す |
| `disabled` | `Bool` | `False` | 打てない・選べない |
| `variant` | `Variant` | `Outlined` | 見た目は TextField と同じ |
| `noOptions` | `String` | `"候補がありません"` | 絞り込んで 1 つも残らないときに出す文字 |

型: [Maybe](../std/Maybe.md) · [Bool](../std/Prelude.md#bool) · [Variant](Button.md#variant)

子要素は受け取らない。

ソース: [ui/src/Ui/MultiAutocomplete.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/MultiAutocomplete.nn)
