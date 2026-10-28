<!-- scripts/reference.ts が作る。直接は直さない -->

# Maybe

import は書かずに、`Maybe.map` のように修飾して使う。

[map](#map) · [andThen](#andthen) · [withDefault](#withdefault) · [isJust](#isjust)

### map

```haskell
map :: (a -> b) -> Maybe a -> Maybe b
```

Just なら中身に関数を当てる。Nothing はそのまま

```haskell
Maybe.map show (Just 3)    -- Just "3"
Maybe.map show Nothing     -- Nothing
```

### andThen

```haskell
andThen :: (a -> Maybe b) -> Maybe a -> Maybe b
```

Just なら中身に、Maybe を返す関数を当てる。ないかもしれない処理を続けるときに使う

```haskell
Maybe.andThen String.toInt (List.head ["42"])    -- Just 42
```

### withDefault

```haskell
withDefault :: a -> Maybe a -> a
```

Just なら中身、Nothing なら代わりの値

```haskell
Maybe.withDefault 0 (String.toInt "x")    -- 0
```

### isJust

```haskell
isJust :: Maybe a -> Bool
```

Just か

```haskell
Maybe.isJust (Just 1)    -- True
```

ソース: [src/lib/Maybe.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Maybe.nn)
