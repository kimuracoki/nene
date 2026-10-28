<!-- scripts/reference.ts が作る。直接は直さない -->

# Storage

ブラウザに文字列を保存する（localStorage）

import は書かずに、`Storage.get` のように修飾して使う。

[get](#get) · [set](#set) · [remove](#remove)

### get

```haskell
get :: String -> (Maybe String -> msg) -> Cmd msg
```

保存した文字を読む。なければ Nothing。起動したときに読むなら App の onStart に書く

```haskell
main = App.app { init, update, view, onStart = Storage.get "todos" Loaded }
```

### set

```haskell
set :: String -> String -> Cmd msg
```

文字を保存する。同じキーがあれば置き換える。値を保存するときは Json.encode で文字にする

```haskell
effect _ model = Storage.set "todos" (Json.encode model.todos)
```

### remove

```haskell
remove :: String -> Cmd msg
```

保存した文字を消す

```haskell
Storage.remove "todos"
```

ソース: [src/lib/Storage.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Storage.nn)
