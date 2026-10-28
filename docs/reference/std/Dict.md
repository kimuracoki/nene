<!-- scripts/reference.ts が作る。直接は直さない -->

# Dict

キーから値を引く表。キーの順に並んでいる

import は書かずに、`Dict.empty` のように修飾して使う。

[Dict](#dict) · [empty](#empty) · [singleton](#singleton) · [toList](#tolist) · [size](#size) · [isEmpty](#isempty) · [member](#member) · [update](#update) · [keys](#keys) · [values](#values) · [map](#map) · [filter](#filter) · [fromList](#fromlist) · [insert](#insert) · [remove](#remove) · [get](#get)

### Dict

```haskell
data Dict k v
```

キー k から値 v を引く表。キーの小さい順に並んでいる。同じキーは 1 つだけ持てる

### empty

```haskell
empty :: Dict k v
```

空の表

```haskell
Dict.empty
```

### singleton

```haskell
singleton :: k -> v -> Dict k v
```

キーと値を 1 組だけ持つ表

```haskell
Dict.singleton "a" 1
```

### toList

```haskell
toList :: Dict k v -> [(k, v)]
```

キーと値の組のリストにする（キーの小さい順）

```haskell
Dict.toList (Dict.fromList [("b", 2), ("a", 1)])    -- [("a", 1), ("b", 2)]
```

### size

```haskell
size :: Dict k v -> Int
```

組の数

```haskell
Dict.size scores
```

### isEmpty

```haskell
isEmpty :: Dict k v -> Bool
```

空の表か

```haskell
Dict.isEmpty Dict.empty    -- True
```

### member

```haskell
member :: Ord k => k -> Dict k v -> Bool
```

キーがあるか

```haskell
Dict.member "a" scores
```

### update

```haskell
update :: Ord k => k -> (v -> v) -> Dict k v -> Dict k v
```

キーがあれば、その値を関数で変える。なければ何もしない

```haskell
Dict.update id toggle todos
```

### keys

```haskell
keys :: Dict k v -> [k]
```

キーのリスト（小さい順）

```haskell
Dict.keys scores
```

### values

```haskell
values :: Dict k v -> [v]
```

値のリスト（キーの小さい順）

```haskell
Dict.values scores
```

### map

```haskell
map :: (v -> w) -> Dict k v -> Dict k w
```

値それぞれに関数を当てる。キーはそのまま

```haskell
Dict.map show scores
```

### filter

```haskell
filter :: (k -> v -> Bool) -> Dict k v -> Dict k v
```

キーと値を受け取る関数が True を返す組だけを残す

```haskell
Dict.filter passed scores    -- where passed _ score = score >= 60
```

### fromList

```haskell
fromList :: Ord k => [(k, v)] -> Dict k v
```

キーと値の組のリストから作る。同じキーが何度も出てきたら、後のものを使う

```haskell
Dict.fromList [("a", 1), ("b", 2)]
```

### insert

```haskell
insert :: Ord k => k -> v -> Dict k v -> Dict k v
```

キーと値を足す。同じキーがあれば値を置き換える

```haskell
Dict.insert "c" 3 scores
```

### remove

```haskell
remove :: Ord k => k -> Dict k v -> Dict k v
```

キーの組を取り除く。なければ何もしない

```haskell
Dict.remove "a" scores
```

### get

```haskell
get :: Ord k => k -> Dict k v -> Maybe v
```

キーの値。なければ Nothing

```haskell
Dict.get "a" scores    -- Just 1
```

ソース: [src/lib/Dict.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Dict.nn)
