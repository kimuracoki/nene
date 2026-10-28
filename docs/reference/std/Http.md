<!-- scripts/reference.ts が作る。直接は直さない -->

# Http

サーバーとの通信。送る値と受け取る値は、型から JSON に変換される（Json モジュールと同じ規則）

import は書かずに、`Http.get` のように修飾して使う。

[Error](#error) · [get](#get) · [post](#post) · [put](#put) · [delete](#delete)

### Error

```haskell
data Error
  = BadStatus Int
  | NetworkError
  | BadBody String
```

通信がうまくいかなかったわけ

| 構成子 | 意味 |
| --- | --- |
| `BadStatus Int` | 200 番台以外のステータスが返ってきた |
| `NetworkError` | サーバーにつながらなかった |
| `BadBody String` | 返ってきた JSON が型と合わなかった（どこが違ったか） |

### get

```haskell
get :: Json a => String -> (Result Error a -> msg) -> Cmd msg
```

GET で受け取る。返ってきた JSON は、メッセージの型（a）のとおりに読む

```haskell
data Msg = GotTodos (Result Http.Error [Todo])
effect Load _ = Http.get "/api/todos" GotTodos
```

### post

```haskell
post :: (Json body, Json a) => String -> body -> (Result Error a -> msg) -> Cmd msg
```

POST で送る。body は JSON にして送り、返ってきた JSON は a として読む

```haskell
effect (Save todo) _ = Http.post "/api/todos" todo Saved    -- Saved (Result Http.Error ())
```

### put

```haskell
put :: (Json body, Json a) => String -> body -> (Result Error a -> msg) -> Cmd msg
```

PUT で送る。使い方は post と同じ

```haskell
Http.put ("/api/todos/" ++ show todo.id) todo Saved
```

### delete

```haskell
delete :: Json a => String -> (Result Error a -> msg) -> Cmd msg
```

DELETE を送る。返ってきた JSON は a として読む（中身がいらなければ ()）

```haskell
Http.delete ("/api/todos/" ++ show id) Deleted
```

ソース: [src/lib/Http.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Http.nn)
