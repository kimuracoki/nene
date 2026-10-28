<!-- scripts/reference.ts が作る。直接は直さない -->

# Env

ビルドのときに決まる設定。.env（.env.production など）に NENE_ で始まる名前で書く

```haskell
NENE_API_URL=https://api.example.com
```

import は書かずに、`Env.get` のように修飾して使う。

[get](#get)

### get

```haskell
get :: String -> Maybe String
```

NENE_ を付けた名前の値を読む。Env.get "API_URL" は NENE_API_URL の値。書かれていなければ Nothing

```haskell
api = Maybe.withDefault "http://localhost:3000" (Env.get "API_URL")
```

ソース: [src/lib/Env.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Env.nn)
