<!-- scripts/reference.ts が作る。直接は直さない -->

# Carousel

`import Ui.Carousel` · タグ `<Carousel />`

横に送って見るスライド（スワイパー）。いま何枚目かはブラウザが受け持つので、model に何も足さなくてよい

指やトラックパッドで送ると 1 枚ずつ止まる。矢印のボタンと下の点は CSS の ::scroll-button と ::scroll-marker で描く

（対応したブラウザ: Chrome・Edge。ほかのブラウザでは、スワイプと細いスクロールバーで送る）

```haskell
<Carousel label="商品の写真" slides={photos} aspect="4 / 3" />
  where
    photos = map photo product.photos
    photo p = <img src={p.src} alt={p.alt} />
```

```haskell
<Carousel label="おすすめ" slides={cards} perView={3} gap={M} dots={False} />   -- 3 枚ずつ見せる
```

slides の 1 つが 1 枚になる。画像は枠いっぱいに広がる（縦横の比は aspect で決める）

画面が狭いときは、perView が 2 より大きくても 2 枚ずつにする

<!-- demo: Carousel -->
[動く見本を開く](https://kimuracoki.github.io/nene/demo.html?c=Carousel)

```haskell
carousel :: CarouselProps msg -> Html msg
```

## 属性

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `label` | `String` | 必須 | 読み上げに使う名前 |
| `slides` | `[Html msg]` | 必須 | 1 枚ずつの中身。並べた順に送る |
| `perView` | `Int` | `1` | 一度に見せる枚数 |
| `gap` | `Size` | `None` | 1 枚ずつの間隔 |
| `aspect` | `String` | `"auto"` | 1 枚の縦横の比（"4 / 3" など）。auto なら中身に合わせる |
| `dots` | `Bool` | `True` | 下に、何枚目かを示す点を出すか |

型: [Size](../std/Prelude.md#size) · [Bool](../std/Prelude.md#bool)

子要素は受け取らない。

ソース: [ui/src/Ui/Carousel.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Carousel.nn)
