<!-- scripts/reference.ts が作る。直接は直さない -->

# Random

乱数。値はメッセージとして届く

import は書かずに、`Random.int` のように修飾して使う。

[int](#int) · [float](#float) · [pick](#pick)

### int

```haskell
int :: Int -> Int -> (Int -> msg) -> Cmd msg
```

lo 以上 hi 以下の整数を選ぶ

```haskell
effect Roll _ = Random.int 1 6 Rolled
```

### float

```haskell
float :: (Float -> msg) -> Cmd msg
```

0 以上 1 未満の小数を選ぶ

```haskell
Random.float Picked
```

### pick

```haskell
pick :: [a] -> (Maybe a -> msg) -> Cmd msg
```

リストから 1 つ選ぶ。空のリストなら Nothing

```haskell
Random.pick quotes Chosen    -- Chosen (Maybe String)
```

ソース: [src/lib/Random.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Random.nn)
