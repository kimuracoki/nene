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

ここには主な属性だけを書いた。すべての属性の型と既定値、使い方の例は、下の「[部品ごとの使い方](#部品ごとの使い方)」にある。

| モジュール | タグ | 主な属性 |
| --- | --- | --- |
| `Ui.Button` | `<Button>…</Button>` | `onClick`、`variant`（`Filled` `Outlined` `Plain`）、`tone`、`size`、`startIcon` `endIcon`、`disabled`、`fullWidth`、`loading`（回る印を出して押せなくする） |
| `Ui.IconButton` | `<IconButton />` | `icon`、`label`（読み上げとツールチップ）、`onClick`、`variant`、`tone`、`size` |
| `Ui.Icon` | `<Icon />` | `name`。`Icon.add` `Icon.close` `Icon.search` など 30 種類 |
| `Ui.TextField` | `<TextField />` | `value`、`onInput`、`label`（欄の中にあり、入力すると枠の上に移る）、`placeholder`、`helper`、`error`、`kind`（`PlainText` `Email` `Password` `Number` `Search` `Tel` `Date` `Time`）、`rows`（2 以上で複数行）、`variant`（`Outlined` のほか、塗った面の `Filled`、下線だけの `Plain`） |
| `Ui.Calendar` | `<Calendar />` | `value`（`"2026-10-28"`）、`month`（表示する月 `"2026-10"`）、`onChange`、`onMonth`、`today` |
| `Ui.DatePicker` | `<DatePicker />` | `id`、`value`、`month`、`onChange`、`onMonth`、`label`、`today`、`helper`、`error`、`variant` |
| `Ui.Select` | `<Select />` | `value`、`options`（値と表示の組のリスト）、`onChange`、`label`、`variant` |
| `Ui.Autocomplete` | `<Autocomplete />` | `id`、`value`、`options`（候補の文字のリスト）、`onInput`（打った文字と選んだ候補）、`label`、`helper`、`error`、`noOptions`、`variant` |
| `Ui.MultiAutocomplete` | `<MultiAutocomplete />` | `id`、`value`（打った文字）、`selected`（選んだもののリスト）、`options`、`onInput`、`onChange`、`variant` |
| `Ui.Checkbox` | `<Checkbox />` | `checked`、`onCheck`、`label` |
| `Ui.Switch` | `<Switch />` | `checked`、`onCheck`、`label` |
| `Ui.RadioGroup` | `<RadioGroup />` | `name`、`value`、`options`、`onChange`、`label`、`row`（横に並べる） |
| `Ui.Slider` | `<Slider />` | `value`（`Float`）、`onChange`、`min` `max` `step`、`label` |
| `Ui.Rating` | `<Rating />` | `value`、`onChange`（`Just msg` で押せる。`Nothing` なら表示だけ）、`max` |
| `Ui.ToggleGroup` | `<ToggleGroup />` | `value`、`options`、`onChange` |
| `Ui.Fab` | `<Fab />` | `icon`、`label`、`onClick`、`extended`（label も出す）、`tone` |
| `Ui.ButtonGroup` | `<ButtonGroup />` | `items`（表示と押したときのメッセージの組のリスト）、`variant`、`tone`、`size` |
| `Ui.SpeedDial` | `<SpeedDial />` | `id`、`label`、`actions`（`Action { icon, label, onClick }` のリスト）、`icon`、`tone` |
| `Ui.Card` | `<Card>…</Card>` | `title`、`padding`（`None` 〜 `XL`） |
| `Ui.Chip` | `<Chip>…</Chip>` | `tone`、`selected`、`onClick`（`Just msg` で押せるチップになる）、`onDelete`（`Just msg` で右に消すボタンが付く） |
| `Ui.Dialog` | `<Dialog>…</Dialog>` | `open`、`onClose`、`title` |
| `Ui.Tabs` | `<Tabs />` | `labels`、`selected`（0 から）、`onSelect` |
| `Ui.AppBar` | `<AppBar>…</AppBar>` | `title`。子要素は右に並ぶ |
| `Ui.Drawer` | `<Drawer>…</Drawer>` | `open`、`onClose` |
| `Ui.Carousel` | `<Carousel />` | `label`、`slides`（1 枚ずつの `Html` のリスト）、`perView`（一度に見せる枚数）、`gap`、`aspect`、`dots`。いま何枚目かは model に持たない |
| `Ui.Breadcrumbs` | `<Breadcrumbs />` | `links`（行き先と表示の組のリスト）、`current` |
| `Ui.Pagination` | `<Pagination />` | `count`、`page`（1 から）、`onChange` |
| `Ui.Stepper` | `<Stepper />` | `steps`、`active`（0 から） |
| `Ui.ListItem` | `<ListItem />` | `primary`、`secondary`、`icon`、`onClick`（`Just msg` で押せる行になる）、`selected` |
| `Ui.Table` | `<Table />` | `headers`、`rows`（セルの `Html` のリストのリスト）、`dense`、`sort`（並べている列と向き）、`onSort`（`Just msg` で見出しを押して並べ替えられる）、`selected`・`onSelect`（行を選ぶチェックボックス） |
| `Ui.TransferList` | `<TransferList />` | `items`、`value`（`{ chosen, checked }`）、`onChange`、`leftTitle` `rightTitle` |
| `Ui.Timeline` | `<Timeline />` | `items`（いつと何が起きたかの組のリスト）、`tone` |
| `Ui.Divider` | `<Divider />` | `label`（線の中央の文字） |
| `Ui.Alert` | `<Alert>…</Alert>` | `tone`、`title` |
| `Ui.Snackbar` | `<Snackbar />` | `open`、`message`、`onClose`、`action`（`Just ("元に戻す", Undo)`） |
| `Ui.Skeleton` | `<Skeleton />` | `shape`（`Line` `Block` `Circle`）、`width`、`height` |
| `Ui.Progress` | `<Progress />` | `value`（`Just 0.4`。`Nothing` なら動き続ける）、`tone` |
| `Ui.Spinner` | `<Spinner />` | `size`、`label` |
| `Ui.Avatar` | `<Avatar />` | `name`（頭文字を出す）、`src`、`size` |
| `Ui.Badge` | `<Badge>…</Badge>` | `count`（0 なら出さない）、`max`、`tone` |
| `Ui.Menu` | `<Menu />` | `id`、`label`、`items`（`Item { label, onClick, icon, tone }` のリスト）、`variant` |
| `Ui.Popover` | `<Popover>…</Popover>` | `id`、`label`、`variant`。中身は自由 |
| `Ui.Accordion` | `<Accordion>…</Accordion>` | `title`、`open`（最初から開くか）、`group`（同じ group は 1 つだけ開く） |
| `Ui.Tooltip` | `<Tooltip>…</Tooltip>` | `text`、`placement`（`Top` `Bottom` `Left` `Right`） |

- 色の種類 `tone` は、どの部品でも `Ui.Theme` の `Primary` `Neutral` `Success` `Warning` `Danger`。
- 大きさ `size` は、レイアウトタグと同じ `S` `M` `L`。
- アプリが知る必要のある状態（入力した値、選んだタブ、Dialog を開いているか）は model に持つ。
- Menu・Popover・Accordion・Tooltip の開け閉めと、Autocomplete の候補の一覧の開け閉め・矢印キーで選んでいる候補は、ブラウザとランタイムが受け持つので、model に何も足さなくてよい（Autocomplete は打った文字だけを持つ）。Menu・Popover・Autocomplete の `id`、RadioGroup の `name` は、ページの中で重ならない名前にする。
- 押したときの波紋は、押した所から広がる。Select の開いた一覧は、`appearance: base-select` に対応したブラウザ（Chrome・Edge）では Material Design の形になり、ほかのブラウザでは標準の一覧になる。
- Snackbar をしばらくして消すときは、出ているあいだだけ `Time.every` を購読する（例は [src/Ui/Snackbar.nn](src/Ui/Snackbar.nn) の先頭）。

## テーマ

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

<!-- ここから下は scripts/ui-readme.ts が部品のファイルから作る。直接は直さない -->

## 部品ごとの使い方

使い方の例と、属性の型と既定値。`=` のあとが既定値で、既定値のない属性は必ず書く。どの部品でも使う型:

```haskell
-- Ui.Theme
data Tone = Primary | Neutral | Success | Warning | Danger

-- 標準（Prelude）。部品の大きさには S M L を使う
data Size = None | XS | S | M | L | XL
```

### Button

ボタン

```haskell
<Button onClick={Save}>保存</Button>
<Button variant={Outlined} tone={Danger} startIcon={Just Icon.delete} onClick={Remove}>削除</Button>
<Button loading={model.saving} onClick={Save}>保存</Button>    -- 読み込み中は回る印を出し、押せなくする
```

```haskell
type ButtonProps msg =
  { onClick   :: msg
  , variant   :: Variant         = Filled
  , tone      :: Tone            = Primary
  , size      :: Size            = M
  , startIcon :: Maybe Icon.Icon = Nothing
  , endIcon   :: Maybe Icon.Icon = Nothing
  , disabled  :: Bool            = False
  , fullWidth :: Bool            = False
  , loading   :: Bool            = False   -- True なら、文字の代わりに回る印を出し、押せなくする
  }

data Variant = Filled | Outlined | Plain
```

### IconButton

アイコンだけのボタン。label は画面には出ず、読み上げとツールチップに使う

```haskell
<IconButton icon={Icon.close} label="閉じる" onClick={Close} />
```

```haskell
type IconButtonProps msg =
  { icon     :: Icon.Icon
  , label    :: String
  , onClick  :: msg
  , variant  :: Variant = Plain
  , tone     :: Tone    = Neutral
  , size     :: Size    = M
  , disabled :: Bool    = False
  }
```

### Icon

アイコン。Icon.close のような値で選ぶので、名前を打ち間違えるとコンパイルエラーになる

形は Material Icons（Google、Apache License 2.0）

```haskell
import qualified Ui.Icon as Icon
<Icon name={Icon.search} />
```

色は文字の色（currentColor）、大きさは文字の大きさに合わせる

| 名前 | 形 |
| --- | --- |
| `Icon.add` | 足す |
| `Icon.remove` | 減らす |
| `Icon.close` | 閉じる |
| `Icon.cancel` | 取り消す（丸の中の ×） |
| `Icon.check` | チェック |
| `Icon.chevronDown` | 下向きの矢じり |
| `Icon.chevronUp` | 上向きの矢じり |
| `Icon.chevronLeft` | 左向きの矢じり |
| `Icon.chevronRight` | 右向きの矢じり |
| `Icon.arrowLeft` | 左矢印 |
| `Icon.arrowRight` | 右矢印 |
| `Icon.arrowUp` | 上矢印 |
| `Icon.arrowDown` | 下矢印 |
| `Icon.search` | 検索 |
| `Icon.menu` | メニュー |
| `Icon.more` | その他 |
| `Icon.moreVertical` | その他（縦） |
| `Icon.edit` | 編集 |
| `Icon.delete` | 削除 |
| `Icon.star` | 星 |
| `Icon.starFilled` | 塗りつぶした星 |
| `Icon.heart` | ハート |
| `Icon.heartFilled` | 塗りつぶしたハート |
| `Icon.home` | ホーム |
| `Icon.user` | 人 |
| `Icon.settings` | 設定 |
| `Icon.info` | お知らせ |
| `Icon.success` | 成功 |
| `Icon.warning` | 注意 |
| `Icon.error` | エラー |
| `Icon.help` | ヘルプ |
| `Icon.mail` | メール |
| `Icon.send` | 送る |
| `Icon.notifications` | 通知 |
| `Icon.calendar` | カレンダー |
| `Icon.upload` | アップロード |
| `Icon.download` | ダウンロード |
| `Icon.link` | リンク |
| `Icon.share` | 共有 |
| `Icon.copy` | 写す |
| `Icon.refresh` | 読み直す |
| `Icon.filter` | 絞り込み |
| `Icon.sort` | 並べ替え |
| `Icon.visible` | 見える |
| `Icon.hidden` | 隠す |
| `Icon.lock` | 鍵 |
| `Icon.logout` | ログアウト |
| `Icon.cart` | カート |
| `Icon.image` | 画像 |
| `Icon.folder` | フォルダ |
| `Icon.time` | 時刻 |

### TextField

1 行の入力欄。ラベル・説明・エラーを添えられる

ラベルは欄の中にあり、フォーカスするか値が入ると枠の上に縮んで移る（枠はラベルの所だけ切れる）

```haskell
<TextField label="メール" kind={Email} value={model.email} onInput={EmailChanged} error={model.emailError} />
<TextField label="本文" rows={4} value={model.body} onInput={BodyChanged} />    -- 複数行
<TextField label="日付" kind={Date} value={model.day} onInput={DayChanged} />    -- 値は "2026-10-28" の形
```

```haskell
type TextFieldProps msg =
  { value       :: String
  , onInput     :: String -> msg
  , label       :: String       = ""
  , placeholder :: String       = ""          -- ラベルがあるときは、フォーカスしている間だけ出る
  , helper      :: String       = ""          -- 欄の下に出す説明
  , error       :: Maybe String = Nothing     -- Just なら赤くして、説明の代わりに出す
  , kind        :: InputKind    = PlainText
  , disabled    :: Bool         = False
  , rows        :: Int          = 1           -- 2 以上なら、その行数の複数行の入力欄になる
  , variant     :: Variant      = Outlined    -- Filled は塗った面と下線、Plain は下線だけ
  }

data InputKind = PlainText | Email | Password | Number | Search | Tel | Date | Time
```

### Calendar

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

```haskell
type CalendarProps msg =
  { value    :: String
  , month    :: String = ""   -- 空なら、value の月（value も空なら today の月）
  , onChange :: String -> msg
  , onMonth  :: String -> msg
  , today    :: String = ""
  , closes   :: String = ""   -- 日を選んだら閉じる popover の id（DatePicker が使う）
  }
```

### DatePicker

日付を選ぶ欄。押すとカレンダーが開き、日を選ぶと閉じる。見た目は TextField と同じ

選んだ日（"2026-10-28"、選んでいなければ ""）と、カレンダーに出している月（"2026-10"）を model に持つ

```haskell
<DatePicker id="due" label="期限" value={model.due} month={model.dueMonth} onChange={DuePicked} onMonth={DueMonthShown} />
```

month が空なら、value の月を出す。id は、ページの中でほかと重ならない名前にする

```haskell
type DatePickerProps msg =
  { id       :: String
  , value    :: String
  , onChange :: String -> msg
  , onMonth  :: String -> msg
  , month    :: String       = ""
  , label    :: String       = ""
  , today    :: String       = ""
  , helper   :: String       = ""
  , error    :: Maybe String = Nothing
  , disabled :: Bool         = False
  , variant  :: Variant      = Outlined
  }
```

### Select

選択肢から 1 つを選ぶ。options は（値, 表示する文字）の組

見た目は TextField と同じ。いつも何かが選ばれているので、ラベルは枠の上に縮んだまま出る

開いた一覧も Material Design の形になる（appearance: base-select に対応したブラウザ。ほかのブラウザでは標準の一覧）

```haskell
<Select label="並び順" value={model.order} options={orders} onChange={OrderChanged} />
  where
    orders = [("new", "新しい順"), ("old", "古い順")]
```

```haskell
type SelectProps msg =
  { value    :: String
  , options  :: [(String, String)]
  , onChange :: String -> msg
  , label    :: String  = ""
  , disabled :: Bool    = False
  , variant  :: Variant = Outlined   -- 見た目は TextField と同じ
  }
```

### Autocomplete

文字を打つと、候補を絞り込んで欄の下に出す入力欄。見た目は TextField と同じ

候補を押す（矢印キーで選んで Enter でもよい）と、その文字が onInput に届く。打った文字も同じく onInput に届く

一覧の開け閉めと、矢印キーで選んでいる候補はブラウザの側（ランタイム）が受け持つので、model には打った文字だけを持つ

```haskell
<Autocomplete id="city" label="都市" value={model.city} options={cities} onInput={CityChanged} />
  where
    cities = ["札幌", "仙台", "東京", "名古屋", "大阪", "福岡"]
```

打った文字を含む候補を出す（大文字と小文字は区別しない）。候補と同じ文字が入っているときは、すべての候補を出す

id は、ページの中でほかと重ならない名前にする

```haskell
type AutocompleteProps msg =
  { id          :: String
  , value       :: String
  , options     :: [String]
  , onInput     :: String -> msg
  , label       :: String       = ""
  , placeholder :: String       = ""
  , helper      :: String       = ""
  , error       :: Maybe String = Nothing
  , disabled    :: Bool         = False
  , variant     :: Variant      = Outlined    -- 見た目は TextField と同じ
  , noOptions   :: String       = "候補がありません"   -- 絞り込んで 1 つも残らないときに出す文字
  }
```

### MultiAutocomplete

候補から複数を選べる入力欄。選んだものは欄の中にチップで並び、チップの × で外せる

打った文字（value）と、選んだもの（selected）の 2 つを model に持つ

```haskell
<MultiAutocomplete id="tags" label="タグ" value={model.tagText} selected={model.tags} options={allTags} onInput={TagTyped} onChange={TagsChanged} />
```

```haskell
update (TagTyped s) model    = { model | tagText = s }
update (TagsChanged ts) model = { model | tags = ts, tagText = "" }    -- 選んだら、打った文字は消すとよい
```

候補を押すと、選んでいなければ足し、選んでいれば外す。一覧は開いたままになる。空の欄で Backspace を押すと、最後に選んだものを外す

id は、ページの中でほかと重ならない名前にする

```haskell
type MultiAutocompleteProps msg =
  { id          :: String
  , value       :: String
  , selected    :: [String]
  , options     :: [String]
  , onInput     :: String -> msg
  , onChange    :: [String] -> msg
  , label       :: String       = ""
  , placeholder :: String       = ""
  , helper      :: String       = ""
  , error       :: Maybe String = Nothing
  , disabled    :: Bool         = False
  , variant     :: Variant      = Outlined   -- 見た目は TextField と同じ
  , noOptions   :: String       = "候補がありません"
  }
```

### Checkbox

チェックボックス

```haskell
<Checkbox label="利用規約に同意する" checked={model.agreed} onCheck={Agreed} />
```

```haskell
type CheckboxProps msg =
  { checked  :: Bool
  , onCheck  :: Bool -> msg
  , label    :: String = ""
  , disabled :: Bool   = False
  }
```

### Switch

オンとオフを切り替えるスイッチ

```haskell
<Switch label="通知を受け取る" checked={model.notify} onCheck={NotifyChanged} />
```

```haskell
type SwitchProps msg =
  { checked  :: Bool
  , onCheck  :: Bool -> msg
  , label    :: String = ""
  , disabled :: Bool   = False
  }
```

### RadioGroup

選択肢から 1 つを選ぶ丸いボタンの組。options は（値, 表示する文字）の組

```haskell
<RadioGroup name="plan" label="プラン" value={model.plan} options={plans} onChange={PlanChanged} />
  where
    plans = [("free", "無料"), ("pro", "プロ")]
```

name は、ページの中でほかの RadioGroup と重ならない名前にする（矢印キーで選び直せるようになる）

```haskell
type RadioGroupProps msg =
  { name     :: String
  , value    :: String
  , options  :: [(String, String)]
  , onChange :: String -> msg
  , label    :: String = ""
  , row      :: Bool   = False     -- True なら横に並べる
  , disabled :: Bool   = False
  }
```

### Slider

つまみを動かして数を選ぶ。動かしているあいだ、つまみの上に値が出る

```haskell
<Slider label="音量" value={model.volume} onChange={VolumeChanged} />
<Slider value={model.rate} min={0.5} max={2.0} step={0.1} onChange={RateChanged} />
```

```haskell
type SliderProps msg =
  { value    :: Float
  , onChange :: Float -> msg
  , min      :: Float  = 0.0
  , max      :: Float  = 100.0
  , step     :: Float  = 1.0
  , label    :: String = ""
  , disabled :: Bool   = False
  }
```

### Rating

星の数で表す評価。onChange を渡すと押して選べる。渡さなければ表示だけ

```haskell
<Rating value={model.stars} onChange={Just Rated} />
<Rating value={review.stars} />
```

```haskell
type RatingProps msg =
  { value    :: Int
  , onChange :: Maybe (Int -> msg) = Nothing
  , max      :: Int                = 5
  , label    :: String             = "評価"     -- 読み上げに使う
  }
```

### ToggleGroup

つながったボタンから 1 つを選ぶ（表示の切り替えなど）。options は（値, 表示する文字）の組

```haskell
<ToggleGroup value={model.view} options={views} onChange={ViewChanged} />
  where
    views = [("list", "リスト"), ("grid", "グリッド")]
```

```haskell
type ToggleGroupProps msg =
  { value    :: String
  , options  :: [(String, String)]
  , onChange :: String -> msg
  , disabled :: Bool = False
  }
```

### Fab

画面に浮かぶ丸いボタン（いちばん大事な操作に 1 つだけ使う）。extended なら label も出す

```haskell
<Fab icon={Icon.add} label="新しく作る" onClick={Create} />
<Fab icon={Icon.edit} label="書く" extended onClick={Compose} />
```

置き場所（右下に固定するなど）は、使う側の style で決める

```haskell
type FabProps msg =
  { icon     :: Icon.Icon
  , label    :: String
  , onClick  :: msg
  , extended :: Bool = False
  , tone     :: Tone = Primary
  , disabled :: Bool = False
  }
```

### ButtonGroup

つながったボタンの並び。items は（表示する文字, 押したときのメッセージ）の組

1 つを選んだ状態を持つときは ToggleGroup を使う

```haskell
<ButtonGroup items={actions} />
  where
    actions = [("コピー", Copy), ("切り取り", Cut), ("貼り付け", Paste)]
```

```haskell
type ButtonGroupProps msg =
  { items    :: [(String, msg)]
  , variant  :: Variant = Outlined
  , tone     :: Tone    = Primary
  , size     :: Size    = M
  , disabled :: Bool    = False
  }
```

### SpeedDial

丸いボタンを押すと、関連する操作が上に並んで出る。開け閉めはブラウザが受け持つので、model に何も足さなくてよい

（外を押すか Esc で閉じ、操作を押すとメッセージが届いて閉じる）

```haskell
<SpeedDial id="create" label="作る" actions={creates} />
  where
    creates =
      [ Action { icon = Icon.mail, label = "メール", onClick = NewMail }
      , Action { icon = Icon.calendar, label = "予定", onClick = NewEvent }
      ]
```

id は、ページの中でほかと重ならない名前にする。置き場所（右下に固定するなど）は、使う側の style で決める

```haskell
type SpeedDialProps msg =
  { id      :: String
  , label   :: String
  , actions :: [Action msg]
  , icon    :: Icon.Icon = Icon.add
  , tone    :: Tone      = Primary
  }

type Action msg =
  { icon    :: Icon.Icon
  , label   :: String
  , onClick :: msg
  }
```

### Card

内容をまとめる面。title を書くと見出しが付く

```haskell
<Card title="プロフィール">…</Card>
<Card padding={None}>…</Card>       -- 中身を端まで広げる（リストなど）
```

```haskell
type CardProps =
  { title   :: String = ""
  , padding :: Size   = M
  }
```

### Chip

小さなラベル。onClick を渡すと押せるチップ（絞り込みなど）になる

```haskell
<Chip tone={Success}>完了</Chip>
<Chip selected={isAll} onClick={Just (SetFilter All)}>すべて</Chip>
<Chip onDelete={Just (RemoveTag tag)}>{tag}</Chip>    -- 右に消すボタンが付く
```

```haskell
type ChipProps msg =
  { onClick  :: Maybe msg = Nothing
  , selected :: Bool      = False
  , tone     :: Tone      = Neutral
  , onDelete :: Maybe msg = Nothing   -- Just msg なら、右に消すボタンを付ける
  }
```

### Dialog

画面の上に重ねて出す対話の枠。開いているかどうかは model に持つ

```haskell
<Dialog open={model.confirming} title="削除しますか？" onClose={Cancel}>
  <p>この操作は取り消せません。</p>
  <Row gap={S} justify={End}>
    <Button variant={Plain} tone={Neutral} onClick={Cancel}>やめる</Button>
    <Button tone={Danger} onClick={Confirm}>削除</Button>
  </Row>
</Dialog>
```

背景を押すか、右上のボタンで onClose が届く。Esc で閉じるには Keyboard.onKeyDown を購読する

```haskell
type DialogProps msg =
  { open    :: Bool
  , onClose :: msg
  , title   :: String = ""
  }
```

### Tabs

タブ。どれを選んでいるかは model に持つ（0 から数える）

```haskell
<Tabs labels={sections} selected={model.tab} onSelect={TabChanged} />
  where
    sections = ["概要", "設定", "履歴"]
```

```haskell
type TabsProps msg =
  { labels   :: [String]
  , selected :: Int
  , onSelect :: Int -> msg
  }
```

### AppBar

画面の一番上の帯。題名を左に、子要素（ボタンなど）を右に並べる。スクロールしても上に残る

```haskell
<AppBar title="受信トレイ">
  <IconButton icon={Icon.search} label="検索" onClick={OpenSearch} />
  <Button variant={Plain} onClick={Login}>ログイン</Button>
</AppBar>
```

中の Button と IconButton は、帯の上で読める色に変わる

```haskell
type AppBarProps =
  { title :: String
  }
```

### Drawer

画面の左から出てくる引き出し。開いているかどうかは model に持つ。背景を押すと onClose が届く

```haskell
<Drawer open={model.menuOpen} onClose={CloseMenu}>
  <ListItem icon={Just Icon.home} primary="ホーム" onClick={Just (Go "/")} />
</Drawer>
```

```haskell
type DrawerProps msg =
  { open    :: Bool
  , onClose :: msg
  }
```

### Carousel

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

```haskell
type CarouselProps msg =
  { label   :: String                -- 読み上げに使う名前
  , slides  :: [Html msg]
  , perView :: Int    = 1            -- 一度に見せる枚数
  , gap     :: Size   = None         -- 1 枚ずつの間隔
  , aspect  :: String = "auto"       -- 1 枚の縦横の比（"4 / 3" など）。auto なら中身に合わせる
  , dots    :: Bool   = True         -- 下に、何枚目かを示す点を出すか
  }
```

### Breadcrumbs

いまのページまでの道すじ。links は（行き先, 表示する文字）の組で、最後に current を出す

```haskell
<Breadcrumbs links={[("/", "ホーム"), ("/settings", "設定")]} current="プロフィール" />
```

```haskell
type BreadcrumbsProps =
  { links   :: [(String, String)]
  , current :: String
  }
```

### Pagination

ページ送り。page は 1 から数える。ページが多いときは、間を「…」で省く

```haskell
<Pagination count={model.pageCount} page={model.page} onChange={PageChanged} />
```

```haskell
type PaginationProps msg =
  { count    :: Int
  , page     :: Int
  , onChange :: Int -> msg
  }
```

### Stepper

手順のどこにいるかを示す。active は 0 から数える。終わった手順には印が付く

```haskell
<Stepper steps={["カート", "お届け先", "支払い"]} active={model.step} />
```

```haskell
type StepperProps =
  { steps  :: [String]
  , active :: Int
  }
```

### ListItem

リストの 1 行。onClick を渡すと押せる行になる。Card padding={None} の中に並べると、MUI の List になる

```haskell
<Card padding={None}>
  <ListItem icon={Just Icon.mail} primary="受信トレイ" secondary="未読 3 件" onClick={Just (Open Inbox)} selected={model.box == Inbox} />
  <ListItem icon={Just Icon.star} primary="スター付き" onClick={Just (Open Starred)} />
</Card>
```

```haskell
type ListItemProps msg =
  { primary   :: String
  , secondary :: String          = ""
  , icon      :: Maybe Icon.Icon = Nothing
  , onClick   :: Maybe msg       = Nothing
  , selected  :: Bool            = False
  }
```

### Table

表。headers は列の見出し、rows は 1 行ずつのセルの並び

```haskell
<Table headers={["名前", "役割", "参加日"]} rows={map row model.members} />
  where
    row m = [<>{m.name}</>, <Chip>{m.role}</Chip>, <>{m.joined}</>]
```

横に収まらないときは、表だけを横に送れる。行を詰めるときは dense

見出しを押して並べ替えるときは、どの列をどちら向きに並べているかを model に持ち、rows を並べ替えて渡す

```haskell
<Table headers={columns} rows={sortedRows} sort={Just (model.sortColumn, model.sortOrder)} onSort={Just SortBy} />
```

行を選べるようにするときは、選んだ行の番号（0 から）を model に持つ。左の列にチェックボックスが付く

```haskell
<Table headers={columns} rows={rows} selected={model.picked} onSelect={Just Picked} />
```

```haskell
type TableProps msg =
  { headers  :: [String]
  , rows     :: [[Html msg]]
  , dense    :: Bool                 = False
  , sort     :: Maybe (Int, Order)   = Nothing   -- 並べている列（0 から）と向き。見出しに矢印が出る
  , onSort   :: Maybe (Int -> msg)   = Nothing   -- Just なら見出しを押せ、押した列の番号が届く
  , selected :: [Int]                = []        -- 選んでいる行の番号
  , onSelect :: Maybe ([Int] -> msg) = Nothing   -- Just なら行を選べ、選んだ行の番号のリストが届く
  }

data Order = Ascending | Descending
```

### TransferList

左右 2 つの一覧のあいだで、項目を移す。チェックを付けた項目を、真ん中のボタンで反対側へ送る

右に移したもの（chosen）とチェックを付けたもの（checked）を、1 つのレコードとして model に持つ

```haskell
<TransferList items={members} value={model.team} onChange={TeamChanged} />
```

```haskell
init = { …, team = { chosen = [], checked = [] } }
update (TeamChanged t) model = { model | team = t }
```

```haskell
type TransferListProps msg =
  { items      :: [String]
  , value      :: Transfer
  , onChange   :: Transfer -> msg
  , leftTitle  :: String = "候補"
  , rightTitle :: String = "選んだもの"
  }

type Transfer =
  { chosen  :: [String]
  , checked :: [String]
  }
```

### Timeline

起きたことを、時間の順に縦に並べる。items は（いつ, 何が起きたか）の組

```haskell
<Timeline items={history} />
  where
    history = [("9:00", "注文を受けた"), ("10:30", "発送した"), ("翌日", "届いた")]
```

点の色は tone で変えられる

```haskell
type TimelineProps =
  { items :: [(String, String)]
  , tone  :: Tone = Primary
  }
```

### Divider

区切り線。label を書くと、線の中央に文字が入る

```haskell
<Divider />
<Divider label="または" />
```

```haskell
type DividerProps =
  { label :: String = ""
  }
```

### Alert

知らせる枠。色の種類に合ったアイコンが付く

```haskell
<Alert tone={Success} title="保存しました">次回からこの設定で開きます。</Alert>
```

```haskell
type AlertProps =
  { tone  :: Tone   = Primary
  , title :: String = ""
  }
```

### Snackbar

画面の左下に短く出す知らせ。出ているかどうかは model に持つ

```haskell
<Snackbar open={model.saved} message="保存しました" onClose={HideSaved} />
<Snackbar open={model.removed} message="削除しました" onClose={HideRemoved} action={Just ("元に戻す", Undo)} />
```

しばらくしたら自動で消すときは、出ているあいだだけ Time.every を購読する:

```haskell
subscriptions model
  | model.saved = Time.every 4000 (always HideSaved)
  | otherwise   = Sub.none
```

```haskell
type SnackbarProps msg =
  { open    :: Bool
  , message :: String
  , onClose :: msg
  , action  :: Maybe (String, msg) = Nothing    -- 右に出すボタンの文字と、押したときのメッセージ
  }
```

### Skeleton

読み込み中に、中身の代わりに置く灰色の形

```haskell
<Skeleton />                                  -- 1 行の文字
<Skeleton shape={Block} height="140px" />    -- 画像やカード
<Skeleton shape={Circle} width="40px" />     -- アバター
```

width と height は CSS の長さ。省略すると、形ごとの決まった大きさになる

```haskell
type SkeletonProps =
  { shape  :: Shape  = Line
  , width  :: String = ""
  , height :: String = ""
  }

data Shape = Line | Block | Circle
```

### Progress

進み具合のバー。value は 0 から 1。Nothing なら終わりの見えない処理として動き続ける

```haskell
<Progress value={Just 0.4} />
```

```haskell
type ProgressProps =
  { value :: Maybe Float = Nothing
  , tone  :: Tone        = Primary
  }
```

### Spinner

読み込み中を表す回転する印

```haskell
<Spinner />
```

```haskell
type SpinnerProps =
  { size  :: Size   = M
  , label :: String = "読み込み中"
  }
```

### Avatar

人を表す丸い印。画像がなければ名前の頭文字を出す

```haskell
<Avatar name="Ada Lovelace" />
<Avatar name="Ada Lovelace" src={Just user.photo} size={L} />
```

```haskell
type AvatarProps =
  { name :: String
  , src  :: Maybe String = Nothing
  , size :: Size         = M
  }
```

### Badge

子要素の右上に数を重ねる。count が 0 のときは出さない

```haskell
<Badge count={model.unread}>
  <IconButton icon={Icon.mail} label="メール" onClick={OpenMail} />
</Badge>
```

```haskell
type BadgeProps =
  { count :: Int
  , max   :: Int  = 99     -- これを超えたら 99+ と出す
  , tone  :: Tone = Danger
  }
```

### Menu

ボタンを押すと開くメニュー。開け閉めはブラウザが受け持つので、model に何も足さなくてよい

（外を押すか Esc で閉じ、項目を押すとメッセージが届いて閉じる）

```haskell
<Menu id="sort" label="並び替え" items={sortItems} />
  where
    sortItems =
      [ Item { label = "新しい順", onClick = SortBy Newest }
      , Item { label = "削除", onClick = Remove, icon = Just Icon.delete, tone = Danger }
      ]
```

id は、ページの中でほかと重ならない名前にする

```haskell
type MenuProps msg =
  { id      :: String
  , label   :: String
  , items   :: [Item msg]
  , variant :: Variant = Outlined
  }

type Item msg =
  { label   :: String
  , onClick :: msg
  , icon    :: Maybe Icon.Icon = Nothing
  , tone    :: Tone            = Neutral
  }
```

### Popover

ボタンを押すと開く、自由な中身の吹き出し。外を押すか Esc で閉じる。model に何も足さなくてよい

```haskell
<Popover id="profile" label="プロフィール">
  <Column gap={S}>…</Column>
</Popover>
```

id は、ページの中でほかと重ならない名前にする

```haskell
type PopoverProps =
  { id      :: String
  , label   :: String
  , variant :: Variant = Outlined
  }
```

### Accordion

見出しを押すと開け閉めできる枠。開け閉めはブラウザが受け持つので、model に何も足さなくてよい

```haskell
<Accordion title="よくある質問">…</Accordion>
<Accordion title="支払い" group="faq">…</Accordion>   -- 同じ group のものは、1 つだけが開く
```

```haskell
type AccordionProps =
  { title :: String
  , open  :: Bool   = False    -- 最初から開いておくか
  , group :: String = ""
  }
```

### Tooltip

子要素にマウスを載せるか、キーボードで選んだときに出る説明。出す向きは placement で選ぶ（既定は下）

```haskell
<Tooltip text="保存（⌘S）">
  <IconButton icon={Icon.check} label="保存" onClick={Save} />
</Tooltip>
<Tooltip text="前へ" placement={Left}>…</Tooltip>
```

```haskell
type TooltipProps =
  { text      :: String
  , placement :: Placement = Bottom
  }

data Placement = Top | Bottom | Left | Right
```
