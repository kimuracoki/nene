<!-- scripts/reference.ts が作る。直接は直さない -->

# Autocomplete

`import Ui.Autocomplete` · タグ `<Autocomplete />`

文字を打つと、候補を絞り込んで欄の下に出す入力欄。見た目は TextField と同じ

候補を押す（矢印キーで選んで Enter でもよい）と、その文字が onInput に届く。打った文字も同じく onInput に届く

一覧の開け閉めと、矢印キーで選んでいる候補はブラウザの側（ランタイム）が受け持つので、model には打った文字だけを持つ

```haskell
<Autocomplete id="city" label="都市" value={model.city} options={cities} onInput={CityChanged} />
  where
    cities = ["札幌", "仙台", "東京", "名古屋", "大阪", "福岡"]
```

打った文字を含む候補を出す（大文字と小文字は区別しない）。候補と同じ文字が入っているときは、すべての候補を出す

id は、ページの中でほかと重ならない名前にする

<!-- demo: Autocomplete -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Autocomplete)

```haskell
autocomplete :: AutocompleteProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `id` | `String` | 必須 | ページの中でほかと重ならない名前（候補の一覧と結び付けるのに使う） |
| `value` | `String` | 必須 | 欄の文字。打った文字か、選んだ候補 |
| `options` | `[String]` | 必須 | 候補の文字。打った文字を含むものだけを出す |
| `onInput` | `String -> msg` | 必須 | 打つたびと、候補を選んだときに、欄の文字を受け取る |
| `label` | `String` | `""` | 欄の名前。欄の中にあり、フォーカスするか値が入ると枠の上に移る |
| `placeholder` | `String` | `""` | 空のときに出す例。ラベルがあるときは、フォーカスしている間だけ出る |
| `helper` | `String` | `""` | 欄の下に出す説明 |
| `error` | `Maybe String` | `Nothing` | Just なら赤くして、説明の代わりに出す |
| `disabled` | `Bool` | `False` | 打てない・選べない |
| `variant` | `Variant` | `Outlined` | 見た目は TextField と同じ |
| `noOptions` | `String` | `"候補がありません"` | 絞り込んで 1 つも残らないときに出す文字 |

型: [Maybe](../std/Maybe.md) · [Bool](../std/Prelude.md#bool) · [Variant](Button.md#variant)

子要素は受け取らない。

ソース: [ui/src/Ui/Autocomplete.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Autocomplete.nn)
