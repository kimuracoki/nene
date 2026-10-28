# nene-lang-ui

[Nene](https://github.com/kimuracoki/nene) の公式 UI 部品集。ボタン・入力欄・表・ダイアログ・メニューなど 43 の部品がそろっている。見た目と動きは Material Design（MUI の既定のテーマ）に合わせてあり、ライトとダークの両方に対応し、色や形は CSS 変数で変えられる。

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

**[全部の部品を並べた見本](https://kimuracoki.github.io/nene/showcase.html)** で、見た目と動きを確かめられる（ソースは [examples/Showcase.nn](https://github.com/kimuracoki/nene/blob/main/examples/Showcase.nn)）。

## 部品

ここには主な属性だけを書いた。すべての属性の型・既定値・説明と使い方の例は、モジュール名のリンク先（[リファレンス](https://github.com/kimuracoki/nene/blob/main/docs/reference/README.md)）にある。

| モジュール | タグ | 主な属性 |
| --- | --- | --- |
| [`Ui.Button`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Button.md) | `<Button>…</Button>` | `onClick`、`variant`（`Filled` `Outlined` `Plain`）、`tone`、`size`、`startIcon` `endIcon`、`disabled`、`fullWidth`、`loading`（回る印を出して押せなくする） |
| [`Ui.IconButton`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/IconButton.md) | `<IconButton />` | `icon`、`label`（読み上げとツールチップ）、`onClick`、`variant`、`tone`、`size` |
| [`Ui.Icon`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Icon.md) | `<Icon />` | `name`。`Icon.add` `Icon.close` `Icon.search` など 30 種類 |
| [`Ui.TextField`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/TextField.md) | `<TextField />` | `value`、`onInput`、`label`（欄の中にあり、入力すると枠の上に移る）、`placeholder`、`helper`、`error`、`kind`（`PlainText` `Email` `Password` `Number` `Search` `Tel` `Date` `Time`）、`rows`（2 以上で複数行）、`variant`（`Outlined` のほか、塗った面の `Filled`、下線だけの `Plain`） |
| [`Ui.Calendar`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Calendar.md) | `<Calendar />` | `value`（`"2026-10-28"`）、`month`（表示する月 `"2026-10"`）、`onChange`、`onMonth`、`today` |
| [`Ui.DatePicker`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/DatePicker.md) | `<DatePicker />` | `id`、`value`、`month`、`onChange`、`onMonth`、`label`、`today`、`helper`、`error`、`variant` |
| [`Ui.Select`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Select.md) | `<Select />` | `value`、`options`（値と表示の組のリスト）、`onChange`、`label`、`variant` |
| [`Ui.Autocomplete`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Autocomplete.md) | `<Autocomplete />` | `id`、`value`、`options`（候補の文字のリスト）、`onInput`（打った文字と選んだ候補）、`label`、`helper`、`error`、`noOptions`、`variant` |
| [`Ui.MultiAutocomplete`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/MultiAutocomplete.md) | `<MultiAutocomplete />` | `id`、`value`（打った文字）、`selected`（選んだもののリスト）、`options`、`onInput`、`onChange`、`variant` |
| [`Ui.Checkbox`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Checkbox.md) | `<Checkbox />` | `checked`、`onCheck`、`label` |
| [`Ui.Switch`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Switch.md) | `<Switch />` | `checked`、`onCheck`、`label` |
| [`Ui.RadioGroup`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/RadioGroup.md) | `<RadioGroup />` | `name`、`value`、`options`、`onChange`、`label`、`row`（横に並べる） |
| [`Ui.Slider`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Slider.md) | `<Slider />` | `value`（`Float`）、`onChange`、`min` `max` `step`、`label` |
| [`Ui.Rating`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Rating.md) | `<Rating />` | `value`、`onChange`（`Just msg` で押せる。`Nothing` なら表示だけ）、`max` |
| [`Ui.ToggleGroup`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/ToggleGroup.md) | `<ToggleGroup />` | `value`、`options`、`onChange` |
| [`Ui.Fab`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Fab.md) | `<Fab />` | `icon`、`label`、`onClick`、`extended`（label も出す）、`tone` |
| [`Ui.ButtonGroup`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/ButtonGroup.md) | `<ButtonGroup />` | `items`（表示と押したときのメッセージの組のリスト）、`variant`、`tone`、`size` |
| [`Ui.SpeedDial`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/SpeedDial.md) | `<SpeedDial />` | `id`、`label`、`actions`（`Action { icon, label, onClick }` のリスト）、`icon`、`tone` |
| [`Ui.Card`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Card.md) | `<Card>…</Card>` | `title`、`padding`（`None` 〜 `XL`） |
| [`Ui.Chip`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Chip.md) | `<Chip>…</Chip>` | `tone`、`selected`、`onClick`（`Just msg` で押せるチップになる）、`onDelete`（`Just msg` で右に消すボタンが付く） |
| [`Ui.Dialog`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Dialog.md) | `<Dialog>…</Dialog>` | `open`、`onClose`、`title` |
| [`Ui.Tabs`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Tabs.md) | `<Tabs />` | `labels`、`selected`（0 から）、`onSelect` |
| [`Ui.AppBar`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/AppBar.md) | `<AppBar>…</AppBar>` | `title`。子要素は右に並ぶ |
| [`Ui.Drawer`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Drawer.md) | `<Drawer>…</Drawer>` | `open`、`onClose` |
| [`Ui.Carousel`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Carousel.md) | `<Carousel />` | `label`、`slides`（1 枚ずつの `Html` のリスト）、`perView`（一度に見せる枚数）、`gap`、`aspect`、`dots`。いま何枚目かは model に持たない |
| [`Ui.Breadcrumbs`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Breadcrumbs.md) | `<Breadcrumbs />` | `links`（行き先と表示の組のリスト）、`current` |
| [`Ui.Pagination`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Pagination.md) | `<Pagination />` | `count`、`page`（1 から）、`onChange` |
| [`Ui.Stepper`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Stepper.md) | `<Stepper />` | `steps`、`active`（0 から） |
| [`Ui.ListItem`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/ListItem.md) | `<ListItem />` | `primary`、`secondary`、`icon`、`onClick`（`Just msg` で押せる行になる）、`selected` |
| [`Ui.Table`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Table.md) | `<Table />` | `headers`、`rows`（セルの `Html` のリストのリスト）、`dense`、`sort`（並べている列と向き）、`onSort`（`Just msg` で見出しを押して並べ替えられる）、`selected`・`onSelect`（行を選ぶチェックボックス） |
| [`Ui.TransferList`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/TransferList.md) | `<TransferList />` | `items`、`value`（`{ chosen, checked }`）、`onChange`、`leftTitle` `rightTitle` |
| [`Ui.Timeline`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Timeline.md) | `<Timeline />` | `items`（いつと何が起きたかの組のリスト）、`tone` |
| [`Ui.Divider`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Divider.md) | `<Divider />` | `label`（線の中央の文字） |
| [`Ui.Alert`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Alert.md) | `<Alert>…</Alert>` | `tone`、`title` |
| [`Ui.Snackbar`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Snackbar.md) | `<Snackbar />` | `open`、`message`、`onClose`、`action`（`Just ("元に戻す", Undo)`） |
| [`Ui.Skeleton`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Skeleton.md) | `<Skeleton />` | `shape`（`Line` `Block` `Circle`）、`width`、`height` |
| [`Ui.Progress`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Progress.md) | `<Progress />` | `value`（`Just 0.4`。`Nothing` なら動き続ける）、`tone` |
| [`Ui.Spinner`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Spinner.md) | `<Spinner />` | `size`、`label` |
| [`Ui.Avatar`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Avatar.md) | `<Avatar />` | `name`（頭文字を出す）、`src`、`size` |
| [`Ui.Badge`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Badge.md) | `<Badge>…</Badge>` | `count`（0 なら出さない）、`max`、`tone` |
| [`Ui.Menu`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Menu.md) | `<Menu />` | `id`、`label`、`items`（`Item { label, onClick, icon, tone }` のリスト）、`variant` |
| [`Ui.Popover`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Popover.md) | `<Popover>…</Popover>` | `id`、`label`、`variant`。中身は自由 |
| [`Ui.Accordion`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Accordion.md) | `<Accordion>…</Accordion>` | `title`、`open`（最初から開くか）、`group`（同じ group は 1 つだけ開く） |
| [`Ui.Tooltip`](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Tooltip.md) | `<Tooltip>…</Tooltip>` | `text`、`placement`（`Top` `Bottom` `Left` `Right`） |

- 色の種類 `tone` は、どの部品でも `Ui.Theme` の `Primary` `Neutral` `Success` `Warning` `Danger`。
- 大きさ `size` は、レイアウトタグと同じ `S` `M` `L`。
- アプリが知る必要のある状態（入力した値、選んだタブ、Dialog を開いているか）は model に持つ。
- Menu・Popover・Accordion・Tooltip の開け閉めと、Autocomplete の候補の一覧の開け閉め・矢印キーで選んでいる候補は、ブラウザとランタイムが受け持つので、model に何も足さなくてよい（Autocomplete は打った文字だけを持つ）。Menu・Popover・Autocomplete の `id`、RadioGroup の `name` は、ページの中で重ならない名前にする。
- 押したときの波紋は、押した所から広がる。Select の開いた一覧は、`appearance: base-select` に対応したブラウザ（Chrome・Edge）では Material Design の形になり、ほかのブラウザでは標準の一覧になる。
- Snackbar をしばらくして消すときは、出ているあいだだけ `Time.every` を購読する（例は [src/Ui/Snackbar.nn](src/Ui/Snackbar.nn) の先頭）。

## テーマ

すべての変数と既定値は[リファレンスのテーマのページ](https://github.com/kimuracoki/nene/blob/main/docs/reference/ui/Theme.md)にある。

部品の見た目は、部品の外から `class` で上書きできない（Nene の規則）。変えられるのは CSS 変数だけで、すべての部品が同じ変数を使う。アプリの入口のファイルの `style` ブロックで `:root` を上書きすれば、アプリ全体が変わる（MUI の `createTheme` にあたる）。

```css
style
  :root {
    --primary: light-dark(#7c3aed, #c4b5fd);
    --radius: 8px;
    --font: "Noto Sans JP", sans-serif;
  }
```

| 変数 | 意味 |
| --- | --- |
| `--primary` `--neutral` `--success` `--warning` `--danger` | 色の種類ごとの色 |
| `--on-tone` | 色の上に載せる文字の色 |
| `--text` `--muted` `--disabled` | 文字の色、控えめな文字の色、押せない部品の文字の色 |
| `--surface` `--background` | 面（カード・メニューなど）、ページの背景 |
| `--border` `--divider` | 入力欄の枠、区切り線 |
| `--hover` `--selected` | マウスを載せた項目、選んだ項目の背景 |
| `--radius` | 角の丸み |
| `--shadow-1` `--shadow-2` `--shadow-4` `--shadow-6` `--shadow-8` `--shadow-12` `--shadow-16` `--shadow-24` | 影（数が大きいほど浮いて見える） |
| `--font` | 文字の種類 |

既定の値は `light-dark()` でライトとダークの両方を持つ（[src/Ui/Theme.nn](src/Ui/Theme.nn)）。ダークにしないときは `:root { color-scheme: light; }`。

`body` の文字・色・背景も `Ui.Theme` で整える（MUI の CssBaseline にあたる）。nene-lang-ui の部品を 1 つでも使えば効き、アプリの `style` ブロックで `body` を書けば上書きできる。
