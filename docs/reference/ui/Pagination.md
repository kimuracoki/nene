<!-- scripts/reference.ts が作る。直接は直さない -->

# Pagination

`import Ui.Pagination` · タグ `<Pagination />`

ページ送り。page は 1 から数える。ページが多いときは、間を「…」で省く

```haskell
<Pagination count={model.pageCount} page={model.page} onChange={PageChanged} />
```

<!-- demo: Pagination -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Pagination)

```haskell
pagination :: PaginationProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `count` | `Int` | 必須 | ページの数 |
| `page` | `Int` | 必須 | いまのページ（1 から数える） |
| `onChange` | `Int -> msg` | 必須 | ページを押したときに、そのページの番号を受け取る |

子要素は受け取らない。

ソース: [ui/src/Ui/Pagination.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Pagination.nn)
