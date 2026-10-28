<!-- scripts/reference.ts が作る。直接は直さない -->

# Snackbar

`import Ui.Snackbar` · タグ `<Snackbar />`

画面の左下に短く出す知らせ。出ているかどうかは model に持つ

```haskell
<Snackbar open={model.saved} message="保存しました" onClose={HideSaved} />
<Snackbar open={model.removed} message="削除しました" onClose={HideRemoved} action={undo} />
  where
    undo = Just ("元に戻す", Undo)
```

しばらくしたら自動で消すときは、出ているあいだだけ Time.every を購読する:

```haskell
subscriptions model
  | model.saved = Time.every 4000 (always HideSaved)
  | otherwise   = Sub.none
```

<!-- demo: Snackbar -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Snackbar)

```haskell
snackbar :: SnackbarProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `open` | `Bool` | 必須 | 出しているか |
| `message` | `String` | 必須 | 知らせの文字 |
| `onClose` | `msg` | 必須 | × を押したときに届くメッセージ。open を False にする |
| `action` | `Maybe (String, msg)` | `Nothing` | 右に出すボタンの文字と、押したときのメッセージ |

型: [Bool](../std/Prelude.md#bool) · [Maybe](../std/Maybe.md)

子要素は受け取らない。

ソース: [ui/src/Ui/Snackbar.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Snackbar.nn)
