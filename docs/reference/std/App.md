<!-- scripts/reference.ts が作る。直接は直さない -->

# App

アプリの入口。The Elm Architecture（model・update・view）で、状態はアプリ全体で 1 つだけ持つ

import は書かずに、`App.app` のように修飾して使う。

[AppConfig](#appconfig) · [app](#app)

### AppConfig

```haskell
type AppConfig model msg
```

アプリの設定。init・update・view 以外は、使うときだけ書けばよい

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `init` | `model` | 必須 | 最初の状態 |
| `update` | `msg -> model -> model` | 必須 | メッセージで状態をどう変えるか |
| `view` | `model -> Html msg` | 必須 | 状態をどう見せるか |
| `effect` | `msg -> model -> Cmd msg` | （何もしない） | update のあとに実行する副作用 |
| `subscriptions` | `model -> Sub msg` | （何も受け取らない） | 外から届くイベント |
| `onUrlChange` | `Url -> msg` | （URL を扱わない） | URL が変わったとき（起動時にも届く） |
| `onStart` | `Cmd msg` | `Cmd.none` | 起動したときに実行する副作用 |

型: [Url](Prelude.md#url)

### app

```haskell
app :: AppConfig model msg -> Program model msg
```

アプリを作る。main にこの結果を置く。AppConfig のうち init・update・view だけは必ず書く

```haskell
main :: Program Model Msg
main = App.app { init, update, view }
main = App.app { init, update, view, effect, subscriptions, onUrlChange = UrlChanged }
```

ソース: [src/lib/App.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/App.nn)
