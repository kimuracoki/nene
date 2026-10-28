<!-- scripts/reference.ts が作る。直接は直さない -->

# Cmd

import は書かずに、`Cmd.none` のように修飾して使う。

[none](#none) · [batch](#batch)

### none

```haskell
none :: Cmd msg
```

何もしない副作用。effect で、何もしないメッセージに返す

```haskell
effect _ _ = Cmd.none
```

### batch

```haskell
batch :: [Cmd msg] -> Cmd msg
```

いくつかの副作用をまとめて 1 つにする。並べた順に実行する

```haskell
effect Save model = Cmd.batch [Storage.set "draft" model.draft, Http.post "/api/save" model.draft Saved]
```

ソース: [src/lib/Cmd.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Cmd.nn)
