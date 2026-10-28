<!-- scripts/reference.ts が作る。直接は直さない -->

# Breadcrumbs

`import Ui.Breadcrumbs` · タグ `<Breadcrumbs />`

いまのページまでの道すじ。links は（行き先, 表示する文字）の組で、最後に current を出す

```haskell
<Breadcrumbs links={trail} current="プロフィール" />
  where
    trail = [("/", "ホーム"), ("/settings", "設定")]
```

<!-- demo: Breadcrumbs -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Breadcrumbs)

```haskell
breadcrumbs :: BreadcrumbsProps -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `links` | `[(String, String)]` | 必須 | （行き先, 表示する文字）の組。上の階層から順に並べる |
| `current` | `String` | 必須 | 最後に出す、いまのページの名前（リンクにしない） |

子要素は受け取らない。

ソース: [ui/src/Ui/Breadcrumbs.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Breadcrumbs.nn)
