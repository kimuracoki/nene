<!-- scripts/reference.ts が作る。直接は直さない -->

# Sub

import は書かずに、`Sub.none` のように修飾して使う。

[none](#none) · [batch](#batch)

### none

```haskell
none :: Sub msg
```

何も受け取らない

```haskell
subscriptions _ = Sub.none
```

### batch

```haskell
batch :: [Sub msg] -> Sub msg
```

いくつかの購読をまとめて 1 つにする

```haskell
subscriptions _ = Sub.batch [Time.every 1000 Tick, Keyboard.onKeyDown KeyPressed]
```

ソース: [src/lib/Sub.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Sub.nn)
