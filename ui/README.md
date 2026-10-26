# nene-lang-ui

[Nene](https://github.com/kimuracoki/nene) の公式 UI 部品集。ボタン・入力欄・ダイアログ・メニューなど 20 の部品がそろっている。ライトとダークの両方に対応し、色は CSS 変数で変えられる。

`nene new` で作ったプロジェクトには、はじめから入っている。あとから入れるときは:

```sh
npm install nene-lang-ui
```

```haskell
import Ui.Button (Variant(..))
import qualified Ui.Icon as Icon
import Ui.Theme (Tone(..))

<Button onClick={Save}>保存</Button>
<Button variant={Outlined} tone={Danger} startIcon={Just Icon.delete} onClick={Remove}>削除</Button>
```

全部の部品を使った見本は、Nene のリポジトリの [examples/Showcase.nn](https://github.com/kimuracoki/nene/blob/main/examples/Showcase.nn)。

## 部品

| モジュール | タグ | 主な属性 |
| --- | --- | --- |
| `Ui.Button` | `<Button>…</Button>` | `onClick`、`variant`（`Filled` `Outlined` `Plain`）、`tone`、`size`、`startIcon` `endIcon`、`disabled`、`fullWidth` |
| `Ui.IconButton` | `<IconButton />` | `icon`、`label`（読み上げとツールチップ）、`onClick`、`variant`、`tone`、`size` |
| `Ui.Icon` | `<Icon />` | `name`。`Icon.add` `Icon.close` `Icon.search` など 30 種類 |
| `Ui.TextField` | `<TextField />` | `value`、`onInput`、`label`、`placeholder`、`helper`、`error`、`kind`（`PlainText` `Email` `Password` `Number` `Search` `Tel`） |
| `Ui.Select` | `<Select />` | `value`、`options`（値と表示の組のリスト）、`onChange`、`label` |
| `Ui.Checkbox` | `<Checkbox />` | `checked`、`onCheck`、`label` |
| `Ui.Switch` | `<Switch />` | `checked`、`onCheck`、`label` |
| `Ui.Card` | `<Card>…</Card>` | `title`、`padding`（`None` 〜 `XL`） |
| `Ui.Chip` | `<Chip>…</Chip>` | `tone`、`selected`、`onClick`（`Just msg` で押せるチップになる） |
| `Ui.Dialog` | `<Dialog>…</Dialog>` | `open`、`onClose`、`title` |
| `Ui.Tabs` | `<Tabs />` | `labels`、`selected`（0 から）、`onSelect` |
| `Ui.Alert` | `<Alert>…</Alert>` | `tone`、`title` |
| `Ui.Progress` | `<Progress />` | `value`（`Just 0.4`。`Nothing` なら動き続ける）、`tone` |
| `Ui.Spinner` | `<Spinner />` | `size`、`label` |
| `Ui.Avatar` | `<Avatar />` | `name`（頭文字を出す）、`src`、`size` |
| `Ui.Badge` | `<Badge>…</Badge>` | `count`（0 なら出さない）、`max`、`tone` |
| `Ui.Menu` | `<Menu />` | `id`、`label`、`items`（`Item { label, onClick, icon, tone }` のリスト）、`variant` |
| `Ui.Popover` | `<Popover>…</Popover>` | `id`、`label`、`variant`。中身は自由 |
| `Ui.Accordion` | `<Accordion>…</Accordion>` | `title`、`open`（最初から開くか）、`group`（同じ group は 1 つだけ開く） |
| `Ui.Tooltip` | `<Tooltip>…</Tooltip>` | `text` |

- 色の種類 `tone` は、どの部品でも `Ui.Theme` の `Primary` `Neutral` `Success` `Warning` `Danger`。
- 大きさ `size` は、レイアウトタグと同じ `S` `M` `L`。
- アプリが知る必要のある状態（入力した値、選んだタブ、Dialog を開いているか）は model に持つ。
- Menu・Popover・Accordion・Tooltip の開け閉めはブラウザが受け持つので、model に何も足さなくてよい。Menu と Popover の `id` は、ページの中で重ならない名前にする。

## 色と形を変える

部品の見た目は、部品の外から `class` で上書きできない（Nene の規則）。変えられるのは CSS 変数だけで、アプリの入口のファイルの `style` ブロックに書く。

```css
style
  :root {
    --primary: #e11d48;
    --radius: 6px;
  }
```

| 変数 | 意味 |
| --- | --- |
| `--primary` `--neutral` `--success` `--warning` `--danger` | 色の種類ごとの色 |
| `--on-tone` | 色の上に載せる文字の色 |
| `--text` `--muted` | 文字の色、控えめな文字の色 |
| `--surface` `--background` `--border` | 面、背景、枠線の色 |
| `--radius` `--shadow` | 角の丸み、影 |

既定の値は `light-dark()` でライトとダークの両方を持つ（[src/Ui/Theme.nn](src/Ui/Theme.nn)）。ダークにしないときは `:root { color-scheme: light; }`。
