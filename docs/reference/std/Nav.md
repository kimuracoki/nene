<!-- scripts/reference.ts が作る。直接は直さない -->

# Nav

画面遷移。URL を変えると、App の onUrlChange にメッセージが届く

import は書かずに、`Nav.pushUrl` のように修飾して使う。

[pushUrl](#pushurl) · [replaceUrl](#replaceurl) · [back](#back)

### pushUrl

```haskell
pushUrl :: String -> Cmd msg
```

URL を変え、履歴に足す。ページは読み直さず、App の onUrlChange にメッセージが届く。/ で始まるパスは、アプリの置き場所（--base）からのパス

```haskell
effect (Open id) _ = Nav.pushUrl ("/photos/" ++ show id)
```

### replaceUrl

```haskell
replaceUrl :: String -> Cmd msg
```

URL を変える。履歴には足さず、今の履歴を置き換える（戻るボタンで前の画面に戻らない）

```haskell
Nav.replaceUrl "?page=2"
```

### back

```haskell
back :: Cmd msg
```

ブラウザの「戻る」と同じ

```haskell
effect Close _ = Nav.back
```

ソース: [src/lib/Nav.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Nav.nn)
