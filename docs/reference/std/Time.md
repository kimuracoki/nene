<!-- scripts/reference.ts が作る。直接は直さない -->

# Time

時刻とタイマー。時刻は 1970-01-01 からのミリ秒

import は書かずに、`Time.now` のように修飾して使う。

[now](#now) · [every](#every)

### now

```haskell
now :: (Int -> msg) -> Cmd msg
```

いまの時刻（1970-01-01 からのミリ秒）を受け取る

```haskell
effect Start _ = Time.now Started
```

### every

```haskell
every :: Int -> (Int -> msg) -> Sub msg
```

ミリ秒ごとに、そのときの時刻を受け取る

```haskell
subscriptions { running = True } = Time.every 1000 Tick
subscriptions _                  = Sub.none
```

ソース: [src/lib/Time.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Time.nn)
