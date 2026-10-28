<!-- scripts/reference.ts が作る。直接は直さない -->

# String

import は書かずに、`String.length` のように修飾して使う。

[length](#length) · [isEmpty](#isempty) · [toUpper](#toupper) · [toLower](#tolower) · [contains](#contains) · [toInt](#toint) · [toFloat](#tofloat) · [split](#split) · [join](#join) · [startsWith](#startswith) · [endsWith](#endswith) · [replace](#replace) · [repeat](#repeat) · [reverse](#reverse) · [slice](#slice) · [padLeft](#padleft) · [padRight](#padright)

### length

```haskell
length :: String -> Int
```

文字の数（絵文字などは 2 と数えることがある）

```haskell
String.length "ねね"    -- 2
```

### isEmpty

```haskell
isEmpty :: String -> Bool
```

空の文字か

```haskell
String.isEmpty ""    -- True
```

### toUpper

```haskell
toUpper :: String -> String
```

英字を大文字にする

```haskell
String.toUpper "nene"    -- "NENE"
```

### toLower

```haskell
toLower :: String -> String
```

英字を小文字にする

```haskell
String.toLower "Nene"    -- "nene"
```

### contains

```haskell
contains :: String -> String -> Bool
```

1 つ目の文字が 2 つ目の中にあるか

```haskell
String.contains "@" email
String.contains "湖" "森と湖"    -- True
```

### toInt

```haskell
toInt :: String -> Maybe Int
```

整数として読む。前後の空白は無視する。読めなければ Nothing

```haskell
String.toInt " 42 "    -- Just 42
String.toInt "4.2"     -- Nothing
```

### toFloat

```haskell
toFloat :: String -> Maybe Float
```

数として読む。前後の空白は無視する。読めなければ Nothing

```haskell
String.toFloat "4.2"    -- Just 4.2
String.toFloat ""       -- Nothing
```

### split

```haskell
split :: String -> String -> [String]
```

区切りの文字で分ける

```haskell
String.split "-" "2026-11-20"    -- ["2026", "11", "20"]
```

### join

```haskell
join :: String -> [String] -> String
```

区切りの文字を挟んでつなげる

```haskell
String.join ", " ["a", "b"]    -- "a, b"
```

### startsWith

```haskell
startsWith :: String -> String -> Bool
```

1 つ目の文字で始まるか

```haskell
String.startsWith "http" url
```

### endsWith

```haskell
endsWith :: String -> String -> Bool
```

1 つ目の文字で終わるか

```haskell
String.endsWith ".png" file
```

### replace

```haskell
replace :: String -> String -> String -> String
```

1 つ目の文字をすべて 2 つ目の文字に置き換える

```haskell
String.replace "-" "/" "2026-11-20"    -- "2026/11/20"
```

### repeat

```haskell
repeat :: Int -> String -> String
```

同じ文字を n 回つなげる

```haskell
String.repeat 3 "★"    -- "★★★"
```

### reverse

```haskell
reverse :: String -> String
```

文字を逆の順にする

```haskell
String.reverse "abc"    -- "cba"
```

### slice

```haskell
slice :: Int -> Int -> String -> String
```

位置（0 から）で切り出す。終わりの位置の文字は含まない

```haskell
String.slice 1 3 "abcde"    -- "bc"
```

### padLeft

```haskell
padLeft :: Int -> String -> String -> String
```

長さが n になるまで、左を文字で埋める

```haskell
String.padLeft 2 "0" "7"    -- "07"
```

### padRight

```haskell
padRight :: Int -> String -> String -> String
```

長さが n になるまで、右を文字で埋める

```haskell
String.padRight 5 "." "ab"    -- "ab..."
```

ソース: [src/lib/String.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/String.nn)
