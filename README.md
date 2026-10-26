# Nene

**Simple rules. Beautiful structures.**

Nene（ネネ）は、Haskell の書き心地と JSX の見やすさを両立させる、UI 向けの関数型言語。少ない規則で書き、タグを見れば画面の形が分かる。

> **ステータス: v0.1（npm には未公開）。** 言語仕様、コンパイラ、ランタイム、`nene` コマンド、Vite プラグイン、nvim 用のハイライトと言語サーバーがある。

```haskell
view :: Model -> Html Msg
view n =
  <Column gap={M} align={Center} class={css.page}>
    <h1>カウンター</h1>
    <p class={count}>{show n}</p>
    <Row gap={S}>
      <Button onClick={Decrement} disabled={atZero}>-</Button>
      <Button onClick={Increment}>+</Button>
    </Row>
  </Column>
  where
    atZero = n == 0

    count
      | n >= 10   = classes [css.count, css.big]
      | otherwise = css.count


style
  .page { padding: var(--space-xl); }
  .count {
    font-size: 2.5rem;
    font-weight: 700;
  }
  .big { color: crimson; }
```

## 原則

1. **タグを見れば、画面に何がどう並ぶかが分かる。** 並び方は `<Row>` `<Column>` `<Grid>` `<Stack>` で書く。
2. **タグには名前だけを書く。** 計算・分岐は `where` に、見た目はファイル末尾の `style` ブロックに普通の CSS で書く。JSX の `{}` に演算子や `if` を書くとコンパイルエラーになる。
3. **書き方は一つ。** `case` `if` `let` ラムダはなく、等式のパターンマッチ・ガード・`where` で書く。CSS の当て方も `class={css.名前}` だけ。
4. **型が通れば、実行時エラーは起きない。** 静的型、行多相のレコード、パターンの網羅性チェック（漏れはエラー）。

## ドキュメント

| | 内容 |
| --- | --- |
| [docs/guide.md](docs/guide.md) | **入門。** 最初に読むもの。画面を作りながら書き方を一通り見る |
| [docs/spec.md](docs/spec.md) | 言語仕様。すべての規則を正確に書いた参照用 |
| [docs/design.md](docs/design.md) | 設計の考え方。なぜこういう言語なのか、何を入れなかったのか |

## 動機

Elm でサンプルアプリを作ってみて感じた不満から始まっている。

| 不満 | Nene での方針 |
| --- | --- |
| `case` と `let ... in` しかなく冗長 | Haskell と同じく、複数等式による関数定義・ガード・`where` を使える |
| view が `div [ ... ] [ ... ]` で、UI の形が読み取りにくい | JSX を式としてそのまま書ける |
| 横並び・縦並びが CSS に隠れていて、マークアップを見てもレイアウトが分からない | 並び方はタグで書く。見た目は同じファイルの `style` ブロックに CSS で書く |
| マークアップの中に分岐や計算が混ざると読みにくい | JSX の `{}` には名前だけを書ける。処理は `where` に書く |
| コンポーネントの省略可能な引数がなく、呼び出しが長い | props レコードにデフォルト値を持たせられる |
| 型の安全性・実行時エラーの少なさは手放したくない | 静的型・ADT・網羅性チェックは維持する |

## はじめる

Node.js 20.19 以上が必要。

```sh
npm create nene-lang my-app
cd my-app
npm install
npm run dev        # http://localhost:5173/ 。保存すると自動で再読み込み
```

できあがるプロジェクトは 3 つのファイルだけ。設定ファイルはいらない。

```
my-app/
  package.json
  index.html       <script type="module" src="/src/Main.nn"> が入口
  src/Main.nn
  public/          画像など。そのままの名前で配信される
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev`（`nene dev`） | 開発サーバー。コンパイルエラーはブラウザに場所つきで出る |
| `npm run build`（`nene build`） | `dist/` に出力する。そのまま静的ホスティングに置ける |
| `npm run check`（`nene check`） | 型検査だけ |

`dev` と `build` は内部で Vite を使う。複数ページなど特別なことをしたいときだけ、普通の `vite.config.ts` を置けば読み込まれる（例: `examples/vite.config.ts`）。

### npm に公開する前に、手元で試す

`npm create nene-lang` の代わりに、このリポジトリを `npm link` する。

```sh
cd /path/to/nene
npm install
npm link                  # nene コマンドが使えるようになる

cd ~/どこか
nene new my-app           # 手元のリポジトリを使うプロジェクトとして作られる
cd my-app
npm install
npm run dev
```

手元のリポジトリから作ったプロジェクトは、`package.json` の依存先が `file:/path/to/nene` になる。コンパイラを直すと、そのまま反映される（ビルドは不要）。やめるときは `npm unlink -g nene-lang`。

### URL で画面を切り替えるアプリを公開するとき

`/todos/3` のような URL を直接開いても `index.html` が返るように、ホスティング側で設定する（React のアプリと同じ）。

### 既存の Vite プロジェクトに入れる

```ts
// vite.config.ts
import nene from "nene-lang/vite";

export default { plugins: [nene()] };
```

## nvim

nvim 0.11 以上。プラグインを入れて `setup()` を呼ぶだけ。言語サーバーは、プロジェクトの `node_modules` にある `nene` を自動で使う。

```lua
-- lazy.nvim（このリポジトリを GitHub に置いた場合）
{
  "<ユーザー名>/nene",
  config = function(plugin)
    vim.opt.rtp:append(plugin.dir .. "/editors/nvim")
    require("nene").setup()
  end,
}

-- 手元のリポジトリを使う場合
vim.opt.rtp:append("/path/to/nene/editors/nvim")
require("nene").setup()
```

- `.nn` のハイライト。言語サーバーが動いているときは、その解析結果で色を分ける（部品と HTML 要素、コンストラクタ、フィールド、引数など）
- 入力中のエラー表示（1 ファイルのエラーをまとめて表示）
- `K` で型を表示、`gd` で定義へ移動（`<Button>` から `Button.nn` へも飛べる）
- 補完
  - `<But` → `<Button onClick={…}>…</Button>`（必須の属性と閉じタグまで入る）
  - タグの中で属性名（まだ書いていないもの。必須のものが先）
  - `import ` の後でプロジェクトのモジュール名、`List.` の後でその中の名前、`model.` の後でフィールド名

補完は、nvim-cmp や blink.cmp が入っていればそちらに出て、なければ nvim 標準の補完を使う。

## この言語自体を開発する

```sh
npm install
npm test                  # テスト
npm run dev               # examples/ を開く
npm run build:package     # 配布用の JavaScript を build/ に出力する（npm publish の前に自動で実行される）
npm pack                  # 配布するパッケージを手元で作る
```

開発中は TypeScript をビルドせずにそのまま実行する（Node.js 23.6 以上）。配布するときだけ `build/` に JavaScript を出力する。npm は `node_modules` の中の `.ts` を実行できないため。

## サンプル

| ファイル | 内容 |
| --- | --- |
| [examples/Counter.nn](examples/Counter.nn) | 最小のカウンター |
| [examples/Todo.nn](examples/Todo.nn) | elm-sample のタスク管理画面に相当するもの |
| [examples/Gallery.nn](examples/Gallery.nn) | アルバムごとに写真が横に続くギャラリー。開いた写真は URL に入り、戻るボタンや Esc で閉じる |
| [examples/Stopwatch.nn](examples/Stopwatch.nn) | タイマー・キーボード・ブラウザへの保存・ダークテーマを使う例 |
| [examples/Button.nn](examples/Button.nn) ほか | デフォルト値つきの props を持つ部品 |

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
| `src/lib/*.nn` | 標準ライブラリ（Nene で書かれている） |
| `runtime/runtime.js` | 仮想 DOM、レイアウトタグ、`style` ブロックの CSS の読み込み、The Elm Architecture の実行 |
| `src/css.ts` | `style` ブロックのクラス名を取り出し、ファイルごとに区別できる名前に書き換える |
| `src/cli.ts` / `src/vite.ts` / `src/lsp.ts` | `nene` コマンド、Vite プラグイン、言語サーバー |
| `template/` | `nene new` で作るプロジェクトのひな形 |
| `bin/nene.js` | コマンドの入口。手元のリポジトリでは `src/` を、npm から入れたときは `build/` を使う |
| `editors/nvim/` | nvim 用のファイル種別判定・ハイライト・設定 |

## まだないもの

- 部品の中だけで完結する状態（React の useState に相当するもの）
- サーバーとの通信と JSON
- Tree-sitter の文法（今は Vim の syntax ファイルと、言語サーバーによる色分け）
