<!-- scripts/reference.ts が作る。直接は直さない -->

# List

import は書かずに、`List.head` のように修飾して使う。

[head](#head) · [last](#last) · [find](#find) · [indexedMap](#indexedmap) · [lookup](#lookup) · [filterMap](#filtermap) · [partition](#partition) · [maximum](#maximum) · [minimum](#minimum) · [intersperse](#intersperse) · [repeat](#repeat) · [unique](#unique) · [removeAt](#removeat) · [updateAt](#updateat)

### head

```haskell
head :: [a] -> Maybe a
```

最初の要素。空なら Nothing

```haskell
List.head [3, 1, 2]    -- Just 3
List.head []           -- Nothing
```

### last

```haskell
last :: [a] -> Maybe a
```

最後の要素。空なら Nothing

```haskell
List.last [3, 1, 2]    -- Just 2
```

### find

```haskell
find :: (a -> Bool) -> [a] -> Maybe a
```

条件に合う最初の要素。なければ Nothing

```haskell
List.find (hasId id) todos             -- where hasId id t = t.id == id
```

### indexedMap

```haskell
indexedMap :: (Int -> a -> b) -> [a] -> [b]
```

位置（0 から）と要素を受け取る関数を、それぞれに当てる

```haskell
List.indexedMap row items    -- where row i item = …
```

### lookup

```haskell
lookup :: a -> [(a, b)] -> Maybe b
```

組のリストから、1 つ目が key に等しい最初の組の 2 つ目を探す

```haskell
List.lookup "b" [("a", 1), ("b", 2)]    -- Just 2
```

### filterMap

```haskell
filterMap :: (a -> Maybe b) -> [a] -> [b]
```

要素それぞれに関数を当て、Just の中身だけを集める

```haskell
List.filterMap String.toInt ["1", "x", "3"]    -- [1, 3]
```

### partition

```haskell
partition :: (a -> Bool) -> [a] -> ([a], [a])
```

条件に合うものと合わないものに分ける

```haskell
List.partition (.done) todos    -- (済んだもの, まだのもの)
```

### maximum

```haskell
maximum :: Ord a => [a] -> Maybe a
```

いちばん大きい要素。空なら Nothing

```haskell
List.maximum [3, 7, 2]    -- Just 7
```

### minimum

```haskell
minimum :: Ord a => [a] -> Maybe a
```

いちばん小さい要素。空なら Nothing

```haskell
List.minimum [3, 7, 2]    -- Just 2
```

### intersperse

```haskell
intersperse :: a -> [a] -> [a]
```

要素の間に値を挟む

```haskell
List.intersperse 0 [1, 2, 3]    -- [1, 0, 2, 0, 3]
```

### repeat

```haskell
repeat :: Int -> a -> [a]
```

同じ値を n 個並べる

```haskell
List.repeat 3 "★"    -- ["★", "★", "★"]
```

### unique

```haskell
unique :: [a] -> [a]
```

2 回目以降に出てくる同じ値を取り除く（== と同じ比べ方。順は保つ）

```haskell
List.unique [1, 2, 1, 3]    -- [1, 2, 3]
```

### removeAt

```haskell
removeAt :: Int -> [a] -> [a]
```

位置（0 から）の要素を取り除く。範囲の外なら何もしない

```haskell
List.removeAt 1 ["a", "b", "c"]    -- ["a", "c"]
```

### updateAt

```haskell
updateAt :: Int -> (a -> a) -> [a] -> [a]
```

位置（0 から）の要素に関数を当てる。範囲の外なら何もしない

```haskell
List.updateAt 0 toggle todos
```

ソース: [src/lib/List.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/List.nn)
