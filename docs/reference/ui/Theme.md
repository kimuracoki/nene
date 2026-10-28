<!-- scripts/reference.ts が作る。直接は直さない -->

# テーマ

`import Ui.Theme (Tone(..))`

テーマ（色・形・影・文字の CSS 変数）と、部品に共通の色の種類（Tone）

値は Material Design（MUI の既定のテーマ）に合わせている

テーマを変えるときは、アプリの入口のファイルの style ブロックで :root の変数を上書きする。

すべての部品がこの変数を使うので、ここを変えれば全体が変わる:

```haskell
style
  :root { --primary: light-dark(#7c3aed, #c4b5fd); --radius: 8px; --font: "Noto Sans JP", sans-serif; }
```

ライトとダークの両方の色を light-dark() で持つ。ダークにしないときは :root { color-scheme: light; }

body の文字・色・背景もここで整える（MUI の CssBaseline にあたる）。変えるときはアプリの style で body を上書きする

## Tone

```haskell
data Tone
  = Primary
  | Neutral
  | Success
  | Warning
  | Danger
```

部品の色の種類。どの部品でも同じものを使う

| 構成子 | 意味 |
| --- | --- |
| `Primary` | いちばん大事な操作（--primary の色） |
| `Neutral` | 目立たせない、ふつうの操作（--neutral） |
| `Success` | うまくいったこと（--success） |
| `Warning` | 気をつけること（--warning） |
| `Danger` | 削除やエラー（--danger） |

## toneVars

```haskell
toneVars :: Tone -> { tone :: String }
```

色の種類を CSS 変数 --tone にする。自分で部品を作るとき、vars={toneVars props.tone} と渡し、style で var(--tone) として使う

## CSS 変数

アプリの入口のファイルの `style` で `:root` に書くと、すべての部品が変わる。`light-dark(ライト, ダーク)` は、画面の明るさの設定で選ばれる。

| 変数 | 既定値 | 意味 |
| --- | --- | --- |
| `--primary` | `light-dark(#1976d2, #90caf9)` | Primary の色。ボタン・選んだもの・フォーカスの枠 |
| `--neutral` | `light-dark(#616161, #bdbdbd)` | Neutral の色 |
| `--success` | `light-dark(#2e7d32, #66bb6a)` | Success の色 |
| `--warning` | `light-dark(#ed6c02, #ffa726)` | Warning の色 |
| `--danger` | `light-dark(#d32f2f, #f44336)` | Danger の色。エラーの文字と枠 |
| `--on-tone` | `light-dark(#ffffff, rgb(0 0 0 / .87))` | 色の付いた面の上の文字 |
| `--text` | `light-dark(rgb(0 0 0 / .87), #ffffff)` | 文字の色 |
| `--muted` | `light-dark(rgb(0 0 0 / .6), rgb(255 255 255 / .7))` | 控えめな文字の色（説明・補足） |
| `--disabled` | `light-dark(rgb(0 0 0 / .38), rgb(255 255 255 / .5))` | 押せない部品の文字の色 |
| `--surface` | `light-dark(#ffffff, #1e1e1e)` | カード・メニューなどの面 |
| `--background` | `light-dark(#ffffff, #121212)` | ページの背景 |
| `--border` | `light-dark(rgb(0 0 0 / .23), rgb(255 255 255 / .23))` | 入力欄などの枠 |
| `--divider` | `light-dark(rgb(0 0 0 / .12), rgb(255 255 255 / .12))` | 区切り線 |
| `--hover` | `light-dark(rgb(0 0 0 / .04), rgb(255 255 255 / .08))` | マウスを載せた項目の背景 |
| `--selected` | `light-dark(rgb(0 0 0 / .08), rgb(255 255 255 / .16))` | 選んだ項目の背景 |
| `--radius` | `4px` | 角の丸み |
| `--shadow-1` | `0 2px 1px -1px rgb(0 0 0 / .2), 0 1px 1px 0 rgb(0 0 0 / .14), 0 1px 3px 0 rgb(0 0 0 / .12)` | 影。数が大きいほど浮いて見える（カードは 1、メニューは 8、ダイアログは 24） |
| `--shadow-2` | `0 3px 1px -2px rgb(0 0 0 / .2), 0 2px 2px 0 rgb(0 0 0 / .14), 0 1px 5px 0 rgb(0 0 0 / .12)` | 影（ボタン） |
| `--shadow-4` | `0 2px 4px -1px rgb(0 0 0 / .2), 0 4px 5px 0 rgb(0 0 0 / .14), 0 1px 10px 0 rgb(0 0 0 / .12)` | 影（アプリの帯） |
| `--shadow-6` | `0 3px 5px -1px rgb(0 0 0 / .2), 0 6px 10px 0 rgb(0 0 0 / .14), 0 1px 18px 0 rgb(0 0 0 / .12)` | 影（知らせ・丸いボタン） |
| `--shadow-8` | `0 5px 5px -3px rgb(0 0 0 / .2), 0 8px 10px 1px rgb(0 0 0 / .14), 0 3px 14px 2px rgb(0 0 0 / .12)` | 影（メニュー・吹き出し） |
| `--shadow-12` | `0 7px 8px -4px rgb(0 0 0 / .2), 0 12px 17px 2px rgb(0 0 0 / .14), 0 5px 22px 4px rgb(0 0 0 / .12)` | 影（丸いボタンにマウスを載せたとき） |
| `--shadow-16` | `0 8px 10px -5px rgb(0 0 0 / .2), 0 16px 24px 2px rgb(0 0 0 / .14), 0 6px 30px 5px rgb(0 0 0 / .12)` | 影（引き出し） |
| `--shadow-24` | `0 11px 15px -7px rgb(0 0 0 / .2), 0 24px 38px 3px rgb(0 0 0 / .14), 0 9px 46px 8px rgb(0 0 0 / .12)` | 影（ダイアログ） |
| `--shadow` | `var(--shadow-1)` | 既定の影 |
| `--font` | `Roboto, system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif` | 文字の種類 |
| `--ease` | `cubic-bezier(.4, 0, .2, 1)` | 動きの緩急 |

ソース: [ui/src/Ui/Theme.nn](https://github.com/kimuracoki/nene/blob/main/ui/src/Ui/Theme.nn)
