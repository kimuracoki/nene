<!-- scripts/reference.ts が作る。直接は直さない -->

# TextField

`import Ui.TextField` · タグ `<TextField />`

1 行の入力欄。ラベル・説明・エラーを添えられる

ラベルは欄の中にあり、フォーカスするか値が入ると枠の上に縮んで移る（枠はラベルの所だけ切れる）

```haskell
<TextField label="メール" kind={Email} value={model.email} onInput={EmailChanged} error={model.emailError} />
<TextField label="本文" rows={4} value={model.body} onInput={BodyChanged} />    -- 複数行
<TextField label="日付" kind={Date} value={model.day} onInput={DayChanged} />    -- 値は "2026-10-28" の形
```

<!-- demo: TextField -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=TextField)

```haskell
textField :: TextFieldProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `value` | `String` | 必須 | 欄の文字。描くたびにこの値に合わせる |
| `onInput` | `String -> msg` | 必須 | 打つたびに、打った後の文字を受け取る |
| `label` | `String` | `""` | 欄の名前。欄の中にあり、フォーカスするか値が入ると枠の上に移る |
| `placeholder` | `String` | `""` | ラベルがあるときは、フォーカスしている間だけ出る |
| `helper` | `String` | `""` | 欄の下に出す説明 |
| `error` | `Maybe String` | `Nothing` | Just なら赤くして、説明の代わりに出す |
| `kind` | `InputKind` | `PlainText` | 入力の種類。スマートフォンのキーボードや、日付の選び方が変わる |
| `disabled` | `Bool` | `False` | 打てない |
| `rows` | `Int` | `1` | 2 以上なら、その行数の複数行の入力欄になる |
| `variant` | `Variant` | `Outlined` | Filled は塗った面と下線、Plain は下線だけ |

型: [Maybe](../std/Maybe.md) · [InputKind](#inputkind) · [Bool](../std/Prelude.md#bool) · [Variant](Button.md#variant)

子要素は受け取らない。

## InputKind

```haskell
data InputKind
  = PlainText
  | Email
  | Password
  | Number
  | Search
  | Tel
  | Date
  | Time
```

| 構成子 | 意味 |
| --- | --- |
| `PlainText` | ふつうの文字 |
| `Email` | メールアドレス |
| `Password` | パスワード（打った文字を隠す） |
| `Number` | 数 |
| `Search` | 検索の語（消すボタンが出るブラウザもある） |
| `Tel` | 電話番号 |
| `Date` | 日付。値は "2026-10-28" の形 |
| `Time` | 時刻。値は "09:30" の形 |

ソース: [ui/src/Ui/TextField.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/TextField.nn)
