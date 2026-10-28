<!-- scripts/reference.ts が作る。直接は直さない -->

# Window

ウィンドウの大きさ（幅と高さ、ピクセル）

import は書かずに、`Window.size` のように修飾して使う。

[size](#size) · [onResize](#onresize)

### size

```haskell
size :: (Int -> Int -> msg) -> Cmd msg
```

いまのウィンドウの幅と高さを受け取る

```haskell
main = App.app { init, update, view, onStart = Window.size Resized }
```

### onResize

```haskell
onResize :: (Int -> Int -> msg) -> Sub msg
```

ウィンドウの大きさが変わるたびに、幅と高さを受け取る

```haskell
subscriptions _ = Window.onResize Resized
```

ソース: [src/lib/Window.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Window.nn)
