<!-- scripts/reference.ts が作る。直接は直さない -->

# Json

値と JSON の文字列を行き来する。どう変換するかは型から決まる

```haskell
Int・Float・String・Bool・()・リスト・タプル・レコード・Maybe（null かフィールドなし）・Dict String a
引数のないコンストラクタだけの data 型（コンストラクタの名前の文字列）
```

import は書かずに、`Json.encode` のように修飾して使う。

[encode](#encode) · [decode](#decode)

### encode

```haskell
encode :: Json a => a -> String
```

値を JSON の文字列にする

```haskell
Json.encode { id = 1, tags = ["a"] }    -- "{\"id\":1,\"tags\":[\"a\"]}"
```

### decode

```haskell
decode :: Json a => String -> Result String a
```

JSON の文字列を読む。読む型は、使う場所で決まる。合わなければ、どこが違ったかを Err で返す

```haskell
loaded :: Result String [Todo]
loaded = Json.decode text
```

ソース: [src/lib/Json.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Json.nn)
