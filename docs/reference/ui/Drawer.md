<!-- scripts/reference.ts が作る。直接は直さない -->

# Drawer

`import Ui.Drawer` · タグ `<Drawer>…</Drawer>`

画面の左から出てくる引き出し。開いているかどうかは model に持つ。背景を押すと onClose が届く

```haskell
<Drawer open={model.menuOpen} onClose={CloseMenu}>
  <ListItem icon={home} primary="ホーム" onClick={goHome} />
</Drawer>
  where
    home = Just Icon.home
    goHome = Just (Go "/")
```

<!-- demo: Drawer -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Drawer)

```haskell
drawer :: DrawerProps msg -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `open` | `Bool` | 必須 | 開いているか |
| `onClose` | `msg` | 必須 | 背景を押したときに届くメッセージ。open を False にする |

型: [Bool](../std/Prelude.md#bool)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Drawer.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Drawer.nn)
