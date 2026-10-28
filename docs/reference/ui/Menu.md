<!-- scripts/reference.ts が作る。直接は直さない -->

# Menu

`import Ui.Menu` · タグ `<Menu />`

ボタンを押すと開くメニュー。開け閉めはブラウザが受け持つので、model に何も足さなくてよい

（外を押すか Esc で閉じ、項目を押すとメッセージが届いて閉じる）

```haskell
<Menu id="sort" label="並び替え" items={sortItems} />
  where
    sortItems =
      [ Item { label = "新しい順", onClick = SortBy Newest }
      , Item { label = "削除", onClick = Remove, icon = Just Icon.delete, tone = Danger }
      ]
```

id は、ページの中でほかと重ならない名前にする

<!-- demo: Menu -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Menu)

```haskell
menu :: MenuProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `id` | `String` | 必須 | ページの中でほかと重ならない名前 |
| `label` | `String` | 必須 | メニューを開くボタンの文字 |
| `items` | `[Item msg]` | 必須 | メニューの項目。上から順に並ぶ |
| `variant` | `Variant` | `Outlined` | 開くボタンの見た目（Filled・Outlined・Plain） |

型: [Item](#item) · [Variant](Button.md#variant)

子要素は受け取らない。

## Item

```haskell
type Item msg
```

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `label` | `String` | 必須 | 項目の文字 |
| `onClick` | `msg` | 必須 | 押したときに届くメッセージ（メニューは閉じる） |
| `icon` | `Maybe Icon.Icon` | `Nothing` | 左に出すアイコン |
| `tone` | `Tone` | `Neutral` | 色の種類（削除なら Danger） |

型: [Maybe](../std/Maybe.md) · [Icon.Icon](Icon.md#icon) · [Tone](Theme.md#tone)

ソース: [ui/src/Ui/Menu.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Menu.nn)
