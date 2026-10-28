<!-- scripts/reference.ts が作る。直接は直さない -->

# Icon

`import Ui.Icon` · タグ `<Icon />`

アイコン。Icon.close のような値で選ぶので、名前を打ち間違えるとコンパイルエラーになる

形は Material Icons（Google、Apache License 2.0）

```haskell
import qualified Ui.Icon as Icon
<Icon name={Icon.search} />
```

色は文字の色（currentColor）、大きさは文字の大きさに合わせる

<!-- demo: Icon -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Icon)

```haskell
icon :: { name :: Icon } -> Html msg
```

## Icon

```haskell
data Icon
```

アイコンの形。Icon.add のような下の値を使う（自分では作れない）

ソース: [ui/src/Ui/Icon.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Icon.nn)
