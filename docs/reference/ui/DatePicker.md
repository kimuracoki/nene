<!-- scripts/reference.ts が作る。直接は直さない -->

# DatePicker

`import Ui.DatePicker` · タグ `<DatePicker />`

日付を選ぶ欄。押すとカレンダーが開き、日を選ぶと閉じる。見た目は TextField と同じ

選んだ日（"2026-10-28"、選んでいなければ ""）と、カレンダーに出している月（"2026-10"）を model に持つ

```haskell
<DatePicker id="due" label="期限" value={model.due} month={model.dueMonth} onChange={DuePicked} onMonth={DueMonthShown} />
```

month が空なら、value の月を出す。id は、ページの中でほかと重ならない名前にする

<!-- demo: DatePicker -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=DatePicker)

```haskell
datePicker :: DatePickerProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `id` | `String` | 必須 | ページの中でほかと重ならない名前（カレンダーの吹き出しに使う） |
| `value` | `String` | 必須 | 選んでいる日（"2026-10-28"）。選んでいなければ "" |
| `onChange` | `String -> msg` | 必須 | カレンダーで日を選んだときに、その日を受け取る（カレンダーは閉じる） |
| `onMonth` | `String -> msg` | 必須 | カレンダーで月を送ったときに、出す月（"2026-11"）を受け取る |
| `month` | `String` | `""` | カレンダーに出す月（"2026-10"）。空なら value の月（value も空なら today の月） |
| `label` | `String` | `""` | 欄の名前 |
| `today` | `String` | `""` | 今日の日付。カレンダーで印を付ける |
| `helper` | `String` | `""` | 欄の下に出す説明 |
| `error` | `Maybe String` | `Nothing` | Just なら赤くして、説明の代わりに出す |
| `disabled` | `Bool` | `False` | 開けない |
| `variant` | `Variant` | `Outlined` | 見た目（Filled・Outlined・Plain）。TextField と同じ |

型: [Maybe](../std/Maybe.md) · [Bool](../std/Prelude.md#bool) · [Variant](Button.md#variant)

子要素は受け取らない。

ソース: [ui/src/Ui/DatePicker.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/DatePicker.nn)
