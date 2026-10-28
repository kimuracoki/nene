<!-- scripts/reference.ts が作る。直接は直さない -->

# TransferList

`import Ui.TransferList` · タグ `<TransferList />`

左右 2 つの一覧のあいだで、項目を移す。チェックを付けた項目を、真ん中のボタンで反対側へ送る

右に移したもの（chosen）とチェックを付けたもの（checked）を、1 つのレコードとして model に持つ

```haskell
<TransferList items={members} value={model.team} onChange={TeamChanged} />
```

```haskell
init = { …, team = { chosen = [], checked = [] } }
update (TeamChanged t) model = { model | team = t }
```

<!-- demo: TransferList -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=TransferList)

```haskell
transferList :: TransferListProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `items` | `[String]` | 必須 | すべての項目。chosen にないものが左の一覧に出る |
| `value` | `Transfer` | 必須 | 右に移したものと、チェックを付けたもの |
| `onChange` | `Transfer -> msg` | 必須 | チェックを付けたり項目を移したりしたときに、新しい value を受け取る |
| `leftTitle` | `String` | `"候補"` | 左の一覧の見出し |
| `rightTitle` | `String` | `"選んだもの"` | 右の一覧の見出し |

型: [Transfer](#transfer)

子要素は受け取らない。

## Transfer

```haskell
type Transfer
```

| 名前 | 型 | 説明 |
| --- | --- | --- |
| `chosen` | `[String]` | 右の一覧に移したもの |
| `checked` | `[String]` | チェックを付けているもの（左右どちらの一覧のものも） |

ソース: [ui/src/Ui/TransferList.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/TransferList.nn)
