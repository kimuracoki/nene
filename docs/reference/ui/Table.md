<!-- scripts/reference.ts が作る。直接は直さない -->

# Table

`import Ui.Table` · タグ `<Table />`

表。headers は列の見出し、rows は 1 行ずつのセルの並び

```haskell
<Table headers={columns} rows={map row model.members} />
  where
    columns = ["名前", "役割", "参加日"]
    row m = [<>{m.name}</>, <Chip>{m.role}</Chip>, <>{m.joined}</>]
```

横に収まらないときは、表だけを横に送れる。行を詰めるときは dense

見出しを押して並べ替えるときは、どの列をどちら向きに並べているかを model に持ち、rows を並べ替えて渡す

```haskell
<Table headers={columns} rows={sortedRows} sort={sorting} onSort={sortBy} />
  where
    sorting = Just (model.sortColumn, model.sortOrder)
    sortBy = Just SortBy
```

行を選べるようにするときは、選んだ行の番号（0 から）を model に持つ。左の列にチェックボックスが付く

```haskell
<Table headers={columns} rows={rows} selected={model.picked} onSelect={Just Picked} />
```

<!-- demo: Table -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Table)

```haskell
table :: TableProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `headers` | `[String]` | 必須 | 列の見出し。左から順に並ぶ |
| `rows` | `[[Html msg]]` | 必須 | 1 行ずつのセルの並び。セルは Html なので、文字は <>{…}</> で包む |
| `dense` | `Bool` | `False` | 行の高さを詰める |
| `sort` | `Maybe (Int, Order)` | `Nothing` | 並べている列（0 から）と向き。見出しに矢印が出る |
| `onSort` | `Maybe (Int -> msg)` | `Nothing` | Just なら見出しを押せ、押した列の番号が届く |
| `selected` | `[Int]` | `[]` | 選んでいる行の番号 |
| `onSelect` | `Maybe ([Int] -> msg)` | `Nothing` | Just なら行を選べ、選んだ行の番号のリストが届く |

型: [Bool](../std/Prelude.md#bool) · [Maybe](../std/Maybe.md) · [Order](#order)

子要素は受け取らない。

## Order

```haskell
data Order
  = Ascending
  | Descending
```

| 構成子 | 意味 |
| --- | --- |
| `Ascending` | 小さい順（見出しに上向きの矢印） |
| `Descending` | 大きい順（見出しに下向きの矢印） |

ソース: [ui/src/Ui/Table.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Table.nn)
