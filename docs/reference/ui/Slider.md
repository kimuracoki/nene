<!-- scripts/reference.ts が作る。直接は直さない -->

# Slider

`import Ui.Slider` · タグ `<Slider />`

つまみを動かして数を選ぶ。動かしているあいだ、つまみの上に値が出る

```haskell
<Slider label="音量" value={model.volume} onChange={VolumeChanged} />
<Slider value={model.rate} min={0.5} max={2.0} step={0.1} onChange={RateChanged} />
```

<!-- demo: Slider -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Slider)

```haskell
slider :: SliderProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `Float` | 必須 | いまの値 |
| `onChange` | `Float -> msg` | 必須 | 動かすたびに、動かした後の値を受け取る |
| `min` | `Float` | `0.0` | いちばん小さい値 |
| `max` | `Float` | `100.0` | いちばん大きい値 |
| `step` | `Float` | `1.0` | 値の刻み |
| `label` | `String` | `""` | 上に出す名前。空なら出さない |
| `disabled` | `Bool` | `False` | 動かせない |

型: [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/Slider.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Slider.nn)
