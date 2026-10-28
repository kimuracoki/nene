<!-- scripts/reference.ts が作る。直接は直さない -->

# AppBar

`import Ui.AppBar` · タグ `<AppBar>…</AppBar>`

画面の一番上の帯。題名を左に、子要素（ボタンなど）を右に並べる。スクロールしても上に残る

```haskell
<AppBar title="受信トレイ">
  <IconButton icon={Icon.search} label="検索" onClick={OpenSearch} />
  <Button variant={Plain} onClick={Login}>ログイン</Button>
</AppBar>
```

中の Button と IconButton は、帯の上で読める色に変わる

<!-- demo: AppBar -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=AppBar)

```haskell
appBar :: AppBarProps -> [Html msg] -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `title` | `String` | 必須 | 左に出す題名 |

子要素を受け取る（タグの間に書いたものが中身になる）。

ソース: [ui/src/Ui/AppBar.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/AppBar.nn)
