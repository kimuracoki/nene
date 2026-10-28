<!-- scripts/reference.ts が作る。直接は直さない -->

# Dialog

`import Ui.Dialog` · タグ `<Dialog>…</Dialog>`

画面の上に重ねて出す対話の枠。開いているかどうかは model に持つ

```haskell
<Dialog open={model.confirming} title="削除しますか？" onClose={Cancel}>
  <p>この操作は取り消せません。</p>
  <Row gap={S} justify={End}>
    <Button variant={Plain} tone={Neutral} onClick={Cancel}>やめる</Button>
    <Button tone={Danger} onClick={Confirm}>削除</Button>
  </Row>
</Dialog>
```

背景を押すか、右上のボタンで onClose が届く。Esc で閉じるには Keyboard.onKeyDown を購読する

<!-- demo: Dialog -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Dialog)

```haskell
dialog :: DialogProps msg -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `open` | `Bool` | 必須 | 開いているか |
| `onClose` | `msg` | 必須 | 背景か右上の × を押したときに届くメッセージ。open を False にする（Esc で閉じるなら Keyboard.onKeyDown を購読する） |
| `title` | `String` | `""` | 見出し。空なら出さない |

型: [Bool](../std/Prelude.md#bool)

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/Dialog.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Dialog.nn)
