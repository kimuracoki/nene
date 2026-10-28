<!-- scripts/reference.ts が作る。直接は直さない -->

# Keyboard

キーボード。キーの名前は KeyboardEvent.key と同じ（"Enter"、"Escape"、"a" など）

import は書かずに、`Keyboard.onKeyDown` のように修飾して使う。

[onKeyDown](#onkeydown)

### onKeyDown

```haskell
onKeyDown :: (String -> msg) -> Sub msg
```

キーが押されるたびに、キーの名前（"Enter"、"Escape"、"ArrowUp"、" "、"a" など）を受け取る。入力欄に打っているときも届く

```haskell
subscriptions _ = Keyboard.onKeyDown KeyPressed
update (KeyPressed "Escape") model = { model | open = False }
```

ソース: [src/lib/Keyboard.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Keyboard.nn)
