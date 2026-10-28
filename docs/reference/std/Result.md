<!-- scripts/reference.ts が作る。直接は直さない -->

# Result

import は書かずに、`Result.map` のように修飾して使う。

[map](#map) · [mapError](#maperror) · [andThen](#andthen) · [withDefault](#withdefault) · [toMaybe](#tomaybe) · [isOk](#isok)

### map

```haskell
map :: (a -> b) -> Result e a -> Result e b
```

Ok なら中身に関数を当てる。Err はそのまま

```haskell
Result.map List.length (Ok [1, 2])    -- Ok 2
```

### mapError

```haskell
mapError :: (e -> f) -> Result e a -> Result f a
```

Err なら中身に関数を当てる。Ok はそのまま。エラーを画面に出す文字にするときに使う

```haskell
Result.mapError describe result    -- where describe Http.NetworkError = "つながりません" …
```

### andThen

```haskell
andThen :: (a -> Result e b) -> Result e a -> Result e b
```

Ok なら中身に、Result を返す関数を当てる。失敗するかもしれない処理を続けるときに使う

```haskell
Result.andThen check (Json.decode text)
```

### withDefault

```haskell
withDefault :: a -> Result e a -> a
```

Ok なら中身、Err なら代わりの値

```haskell
Result.withDefault [] (Json.decode text)
```

### toMaybe

```haskell
toMaybe :: Result e a -> Maybe a
```

Ok x を Just x に、Err を Nothing にする

```haskell
Result.toMaybe (Ok 1)    -- Just 1
```

### isOk

```haskell
isOk :: Result e a -> Bool
```

Ok か

```haskell
Result.isOk (Err "x")    -- False
```

ソース: [src/lib/Result.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Result.nn)
