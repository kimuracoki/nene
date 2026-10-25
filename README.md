# lambda-jsx

Haskell の書き心地と JSX の見やすさを両立させる、UI 向けの関数型言語。

> **ステータス: v0.1。** 言語仕様、コンパイラ、ランタイム、Vite プラグイン、nvim 用のハイライトと言語サーバーがある。

```haskell
view :: Model -> Html Msg
view n =
  <Column gap={M} align={Center} style={page}>
    <h1>カウンター</h1>
    <p style={count}>{show n}</p>
    <Row gap={S}>
      <Button onClick={Decrement} disabled={atZero}>-</Button>
      <Button onClick={Increment}>+</Button>
    </Row>
  </Column>
  where
    atZero = n == 0

    count
      | n >= 10   = { big | color = Danger }
      | otherwise = big

    big  = Style { font = XL, weight = Bold }
    page = Style { padding = XL }
```

## 原則

1. **タグを見れば、画面に何がどう並ぶかが分かる。** 並び方は `<Row>` `<Column>` `<Grid>` `<Stack>` で書く。CSS は書かない。
2. **タグには名前だけを書く。** 計算・分岐・見た目の詳細は `where` に書く。JSX の `{}` に演算子や `if` を書くとコンパイルエラーになる。
3. **書き方は一つ。** `case` `if` `let` ラムダはなく、等式のパターンマッチ・ガード・`where` で書く。
4. **型が通れば、実行時エラーは起きない。** 静的型、行多相のレコード、パターンの網羅性チェック（漏れはエラー）。

詳しくは [docs/spec.md](docs/spec.md)。検討の経緯は [docs/open-questions.md](docs/open-questions.md)。

## 動機

Elm でサンプルアプリを作ってみて感じた不満から始まっている。

| 不満 | lambda-jsx での方針 |
| --- | --- |
| `case` と `let ... in` しかなく冗長 | Haskell と同じく、複数等式による関数定義・ガード・`where` を使える |
| view が `div [ ... ] [ ... ]` で、UI の形が読み取りにくい | JSX を式としてそのまま書ける |
| 横並び・縦並びが CSS に隠れていて、マークアップを見てもレイアウトが分からない | レイアウトはタグで書く。見た目は型付きの `Style` 値で書く |
| マークアップの中に分岐や計算が混ざると読みにくい | JSX の `{}` には名前だけを書ける。処理は `where` に書く |
| コンポーネントの省略可能な引数がなく、呼び出しが長い | props レコードにデフォルト値を持たせられる |
| 型の安全性・実行時エラーの少なさは手放したくない | 静的型・ADT・網羅性チェックは維持する |

## 使い方

Node.js 23.6 以上が必要（TypeScript をビルドせずにそのまま実行する）。

```sh
npm install
npm test                 # テスト
npm run dev              # examples/ を Vite で開く（http://localhost:5173/）
npm run build            # examples/ を Vite でビルドする（dist/vite）
```

`lx` コマンド（`node src/cli.ts`）:

```sh
node src/cli.ts build examples/Todo.lx -o dist/todo   # index.html と app.js を出力
node src/cli.ts check examples/Button.lx              # 型検査だけ
node src/cli.ts dev examples/Todo.lx                  # 保存すると自動で再読み込みする開発サーバー
```

### Vite で使う

```ts
// vite.config.ts
import lambdaJsx from "lambda-jsx/vite";

export default { plugins: [lambdaJsx()] };
```

```html
<div id="app"></div>
<script type="module" src="/src/Main.lx"></script>
```

入口の `.lx` を、依存する `.lx` ごと 1 つの JavaScript に変換する。`.lx` を保存するとページが再読み込みされ、コンパイルエラーは Vite のエラー表示に場所つきで出る。

### nvim で使う

nvim 0.11 以上。`init.lua` に次を書く。

```lua
vim.opt.rtp:append("/path/to/lambda-jsx/editors/nvim")
require("lambda_jsx").setup()
```

- `.lx` のハイライト（JSX のタグは、部品と HTML 要素で色を分ける）
- 言語サーバー: 入力中のエラー表示、`K` で型を表示、`gd` で定義へ移動（`<Button>` から `Button.lx` へも飛べる）

## サンプル

| ファイル | 内容 |
| --- | --- |
| [examples/Counter.lx](examples/Counter.lx) | 最小のカウンター |
| [examples/Todo.lx](examples/Todo.lx) | elm-sample のタスク管理画面に相当するもの |
| [examples/Gallery.lx](examples/Gallery.lx) | アルバムごとに写真が横に続くギャラリー。押すと大きく表示する |
| [examples/Button.lx](examples/Button.lx) ほか | デフォルト値つきの props を持つ部品 |

## 構成

| パス | 内容 |
| --- | --- |
| `src/lexer.ts` | 字句解析 |
| `src/parser.ts` | 構文解析。JSX は文字単位で読み、レイアウト（インデント）はトップレベルと `where` だけで使う |
| `src/types.ts` | 型の表現と単一化（行多相レコード、組み込み型クラス） |
| `src/checker.ts` | 名前解決と型推論（Hindley–Milner、束縛のまとまりごとに汎化） |
| `src/exhaust.ts` | パターンの網羅性チェック |
| `src/codegen.ts` | JavaScript の生成 |
| `src/compiler.ts` | モジュールを依存順に読み込み、1 つの JavaScript にまとめる |
| `src/lib/*.lx` | 標準ライブラリ（lambda-jsx で書かれている） |
| `runtime/runtime.js` | 仮想 DOM、`Style` から CSS への変換、The Elm Architecture の実行 |
| `src/cli.ts` / `src/vite.ts` / `src/lsp.ts` | コマンド、Vite プラグイン、言語サーバー |
| `editors/nvim/` | nvim 用のファイル種別判定・ハイライト・設定 |

## まだないもの

[docs/open-questions.md](docs/open-questions.md) の「残っている課題」を参照。主なもの:

- サブスクリプション（タイマーやキーボードなど、外から届くイベント）
- テーマ（色や余白の実際の値）の変更、レスポンシブ対応、ルーティング
- エラーは 1 ファイルにつき最初の 1 件だけ表示する
- Tree-sitter の文法（今のハイライトは Vim の正規表現による）
