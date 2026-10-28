<!-- scripts/reference.ts が作る。直接は直さない -->

# Avatar

`import Ui.Avatar` · タグ `<Avatar />`

人を表す丸い印。画像がなければ名前の頭文字を出す

```haskell
<Avatar name="Ada Lovelace" />
<Avatar name="Ada Lovelace" src={Just user.photo} size={L} />
```

<!-- demo: Avatar -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Avatar)

```haskell
avatar :: AvatarProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `name` | `String` | 必須 | 人の名前。画像がなければ頭文字を出す（漢字・かななら 1 文字、英字なら 2 文字）。読み上げにも使う |
| `src` | `Maybe String` | `Nothing` | Just なら、その画像を丸く出す |
| `size` | `Size` | `M` | 大きさ（S・M・L） |

型: [Maybe](../std/Maybe.md) · [Size](../std/Prelude.md#size)

子要素は受け取らない。

ソース: [ui/src/Ui/Avatar.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Avatar.nn)
