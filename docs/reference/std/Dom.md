<!-- scripts/reference.ts が作る。直接は直さない -->

# Dom

画面の要素を操作する。要素は id で指定する

import は書かずに、`Dom.focus` のように修飾して使う。

[focus](#focus) · [blur](#blur) · [scrollIntoView](#scrollintoview)

### focus

```haskell
focus :: String -> Cmd msg
```

id の要素にフォーカスを移す。画面を描いたあとに実行するので、いま出した要素にも使える

```haskell
effect OpenSearch _ = Dom.focus "search"
```

### blur

```haskell
blur :: String -> Cmd msg
```

id の要素からフォーカスを外す

```haskell
Dom.blur "search"
```

### scrollIntoView

```haskell
scrollIntoView :: String -> Cmd msg
```

id の要素が見えるところまで、滑らかにスクロールする

```haskell
Dom.scrollIntoView "comments"
```

ソース: [src/lib/Dom.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Dom.nn)
