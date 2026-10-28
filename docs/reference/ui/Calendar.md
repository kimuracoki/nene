<!-- scripts/reference.ts が作る。直接は直さない -->

# Calendar

`import Ui.Calendar` · タグ `<Calendar />`

1 か月分の日付から 1 日を選ぶカレンダー。選んだ日と、表示している月を model に持つ

日付は "2026-10-28"、月は "2026-10" の形の文字

```haskell
<Calendar value={model.day} month={model.month} onChange={DayPicked} onMonth={MonthShown} />
```

```haskell
update (DayPicked d) model  = { model | day = d }
update (MonthShown m) model = { model | month = m }
```

今日に印を付けるときは today="2026-10-28" を渡す（Time から作った日付など）

<!-- demo: Calendar -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Calendar)

```haskell
calendar :: CalendarProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `String` | 必須 | 選んでいる日（"2026-10-28"）。選んでいなければ "" |
| `month` | `String` | `""` | 空なら、value の月（value も空なら today の月） |
| `onChange` | `String -> msg` | 必須 | 日を押したときに、その日（"2026-10-28"）を受け取る |
| `onMonth` | `String -> msg` | 必須 | 前の月・次の月を押したときに、出す月（"2026-11"）を受け取る |
| `today` | `String` | `""` | 今日の日付。印を付ける。空なら付けない |
| `closes` | `String` | `""` | 日を選んだら閉じる popover の id（DatePicker が使う） |

子要素は受け取らない。

ソース: [ui/src/Ui/Calendar.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Calendar.nn)
