<!-- scripts/reference.ts が作る。直接は直さない -->

# ListItem

`import Ui.ListItem` · タグ `<ListItem />`

リストの 1 行。onClick を渡すと押せる行になる。Card padding={None} の中に並べると、MUI の List になる

```haskell
<Card padding={None}>
  <ListItem icon={mail} primary="受信トレイ" secondary="未読 3 件" onClick={openInbox} selected={inInbox} />
  <ListItem icon={star} primary="スター付き" onClick={openStarred} />
</Card>
  where
    mail = Just Icon.mail
    star = Just Icon.star
    openInbox = Just (Open Inbox)
    openStarred = Just (Open Starred)
    inInbox = model.box == Inbox
```

<!-- demo: ListItem -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=ListItem)

```haskell
listItem :: ListItemProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `primary` | `String` | 必須 | 1 行目の文字 |
| `secondary` | `String` | `""` | 2 行目の控えめな文字。空なら 1 行だけ |
| `icon` | `Maybe Icon.Icon` | `Nothing` | 左に出すアイコン |
| `onClick` | `Maybe msg` | `Nothing` | Just なら押せる行になり、押したときにこのメッセージが届く |
| `selected` | `Bool` | `False` | 選んである印を付ける（いまのページなど） |

型: [Maybe](../std/Maybe.md) · [Icon.Icon](Icon.md#icon) · [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/ListItem.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/ListItem.nn)
