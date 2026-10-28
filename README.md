# Nene

**Simple rules. Beautiful structures.**

Nene（ネネ）は、Haskell の書き心地と JSX の見やすさを両立させる、UI 向けの関数型言語。少ない規則で書き、タグを見れば画面の形が分かる。

> **ステータス: v0.1。** 言語仕様、コンパイラ、ランタイム、`nene` コマンド、Vite プラグイン、公式の部品集 [nene-lang-ui](ui/README.md)、テストの実行（`nene test`）、VS Code と nvim のための言語サーバーがある。

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

## 構成

| 層 | 中身 | パッケージ |
| --- | --- | --- |
| 言語 | コンパイラ、ランタイム、`nene` コマンド、標準ライブラリ（ルーティング・HTTP・JSON など） | `nene-lang` |
| 部品集 | Material Design に合わせたボタン・入力欄・表・ダイアログ・メニューなど 43 の部品 | [`nene-lang-ui`](ui/README.md) |

標準ライブラリは差し替えられない（ルーティングも HTTP も一通りだけ）。部品集は別のパッケージで、使わなくてもよい。出力には、アプリが使っている標準モジュールとランタイムの部分だけが入る。

## ドキュメント

| | 内容 |
| --- | --- |
| [docs/guide.md](docs/guide.md) | **入門。** 最初に読むもの。画面を作りながら書き方を一通り見る |
| [docs/reference/](docs/reference/README.md) | **リファレンス。** 書き方・標準ライブラリの全関数・全部品の全属性・HTML の要素と属性を、名前から引ける辞書。[Pages 版](https://kimuracoki.github.io/nene/reference/)は名前で検索でき、部品のページで動く見本を触れる |
| [ui/README.md](ui/README.md) | 部品集 nene-lang-ui。全部品の使い方の例と、属性の型と既定値、テーマの変え方 |
| [docs/spec.md](docs/spec.md) | 言語仕様。すべての規則を正確に書いた参照用 |
| [docs/design.md](docs/design.md) | 設計の考え方。なぜこういう言語なのか、何を入れなかったのか |

サンプルと部品の見本は、[ブラウザでそのまま動かせる](https://kimuracoki.github.io/nene/)（一覧は下の「[サンプル](#サンプル)」）。

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

設定ファイルはいらない。

```
my-app/
  package.json
  index.html       <script type="module" src="/src/Main.nn"> が入口
  src/Main.nn
  public/          画像など。そのままの名前で配信される
  CLAUDE.md        Claude Code 向けの Nene の書き方（nene-lang-ui の部品も）
  .claude/         .nn を編集したら型検査して、エラーを Claude に伝えるフック
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev`（`nene dev`） | 開発サーバー。コンパイルエラーはブラウザに場所つきで出る |
| `npm run build`（`nene build`） | `dist/` に出力する。そのまま静的ホスティングに置ける。`--base /repo/` でサブディレクトリにも置ける |
| `npm run preview`（`nene preview`） | `dist/` を手元で動かして確かめる |
| `npm run check`（`nene check`） | 型検査だけ。エラーは該当する行つきで出る |
| `npm run test`（`nene test`） | `test/` の下のテストを実行する |
| `npm run fmt`（`nene fmt`） | 整形する。`--check` は直さずに確かめるだけ（CI 向け） |

`dev`・`build`・`preview` は内部で Vite を使う。開発サーバーはソースマップつきで、ブラウザの開発者ツールでは `.nn` の行が表示され、そこで止められる。複数ページなど特別なことをしたいときだけ、普通の `vite.config.ts` を置けば読み込まれる（例: `examples/vite.config.ts`）。

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

### 公開する

`nene build` は、リンクでたどれるページを HTML にしておく（静的生成）。`/todos/3` のような、たどれない URL を直接開いても表示されるように、`404.html`（GitHub Pages など）と `_redirects`（Netlify・Cloudflare Pages）も出力する。ホスティングごとの手順は、作ったプロジェクトの `README.md` に書いてある。

### パッケージを作る

`package.json` に `"nene": { "source": "src" }` と書いた npm パッケージは、`src/` の `.nn` を `import` で使える（`nene-lang-ui` もこの形）。モジュール名は、ほかとぶつからないように頭を揃える（`Ui.Button` など）。同じ名前のモジュールが 2 か所にあるとエラーになる。

### 既存の Vite プロジェクトに入れる

```ts
// vite.config.ts
import nene from "nene-lang/vite";

export default { plugins: [nene()] };
```

## VS Code

拡張 [Nene](editors/vscode/README.md) を入れる。言語サーバーは、プロジェクトの `node_modules` にある `nene` を自動で使う。ハイライト・型エラー・ホバー・補完・定義へ移動・参照・名前の変更・アウトライン・整形・クイックフィックスが使える。

```sh
cd editors/vscode && npm install && npx @vscode/vsce package   # nene-vscode.vsix ができる
code --install-extension nene-vscode.vsix
```

## nvim

nvim 0.11 以上。プラグインを入れて `setup()` を呼ぶだけ。言語サーバーは、プロジェクトの `node_modules` にある `nene` を自動で使う。

```lua
-- lazy.nvim
{
  "kimuracoki/nene",
  config = function(plugin)
    vim.opt.rtp:append(plugin.dir .. "/editors/nvim")
    require("nene").setup()
  end,
}

-- 手元のリポジトリを使う場合
vim.opt.rtp:append("/path/to/nene/editors/nvim")
require("nene").setup()
```

キーはどれも nvim の標準のもの。

| | |
| --- | --- |
| 色分け | `.nn` のハイライト。言語サーバーが動いているときは、その解析結果で色を分ける（部品と HTML 要素、コンストラクタ、フィールド、引数など）。`style` ブロックは CSS として |
| エラー | 入力中に表示する（1 ファイルのエラーをまとめて） |
| `K` / `gd` | 型を表示 / 定義へ移動（`<Button>` から `Button.nn` へも飛べる） |
| `grr` | 参照一覧（プロジェクトのすべてのファイルから） |
| `grn` | 名前の一括変更（ファイルをまたいで。部品の関数を変えるとタグも変わる） |
| `gra` | コードアクション（部品の import を足す、JSX の `{}` の式を `where` に取り出す） |
| `gO` | アウトライン（関数・型・コンストラクタ・フィールド・`where` の中の定義） |
| 挿入モードの `<C-s>` | 引数のヒント（関数の型と、いま書いている引数） |
| `gq` | 整形（`nene fmt` と同じ）。`setup({ format_on_save = true })` で保存のたびに |
| 折りたたみ | 宣言・`where`・JSX の要素・import・コメント（`zc` `zo` など） |
| `van` / `vin` | 構造に沿った選択（名前 → JSX の要素 → 宣言 と広げる。nvim 0.12 以上） |

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

[見本のページ](https://kimuracoki.github.io/nene/)で、ブラウザでそのまま動かせる（`main` に push すると `.github/workflows/pages.yml` が GitHub Pages に出す）。

| ファイル | 動かす | 内容 |
| --- | --- | --- |
| [examples/Stay.nn](examples/Stay.nn) | [開く](https://kimuracoki.github.io/nene/stay.html) | 宿の予約ページ。写真のスライド（Carousel）、日付と人数から出す料金、確かめるダイアログ |
| [examples/Admin.nn](examples/Admin.nn) | [開く](https://kimuracoki.github.io/nene/admin.html) | メンバーの管理画面。検索・絞り込み・並べ替え・ページ送りのある表、招待のフォーム、元に戻す |
| [examples/Showcase.nn](examples/Showcase.nn) | [開く](https://kimuracoki.github.io/nene/showcase.html) | nene-lang-ui の部品を一通り並べた見本 |
| [examples/Examples.nn](examples/Examples.nn) | [開く](https://kimuracoki.github.io/nene/) | 見本の入口のページ |

次の小さな例は、書き方を確かめるためのもので、公開はしていない（`npm run dev` で開ける）。

| ファイル | 内容 |
| --- | --- |
| [examples/Counter.nn](examples/Counter.nn) | 最小のカウンター |
| [examples/Todo.nn](examples/Todo.nn) | タスク管理。入力欄・絞り込み・ブラウザへの保存 |
| [examples/Gallery.nn](examples/Gallery.nn) | 開いた写真が URL に入るギャラリー（`onUrlChange` の例） |
| [examples/Stopwatch.nn](examples/Stopwatch.nn) | タイマー・キーボード・ブラウザへの保存 |

## 構成

| パス | 内容 |
| --- | --- |
| `src/lexer.ts` | 字句解析 |
| `src/parser.ts` | 構文解析。JSX は文字単位で読み、レイアウト（インデント）はトップレベルと `where` だけで使う |
| `src/types.ts` | 型の表現と単一化（行多相レコード、組み込み型クラス） |
| `src/checker.ts` | 名前解決と型推論（Hindley–Milner、束縛のまとまりごとに汎化） |
| `src/exhaust.ts` | パターンの網羅性チェック |
| `src/codegen.ts` | JavaScript の生成 |
| `src/compiler.ts` | モジュールを依存順に読み込み、1 つの JavaScript にまとめる（使っている標準モジュールだけを入れる） |
| `src/packages.ts` | `node_modules` から Nene のパッケージを探す |
| `src/prerender.ts` | 静的生成。ビルドのあとでアプリを Node の中で動かし、リンクをたどってページの HTML を作る |
| `src/lib/*.nn` | 標準ライブラリ（Nene で書かれている） |
| `runtime/runtime.js` | 仮想 DOM、レイアウトタグ、`style` ブロックの CSS の読み込み、URL、The Elm Architecture の実行 |
| `runtime/http.js` | JSON との変換と HTTP（使うアプリにだけ入る） |
| `ui/` | 公式の部品集 `nene-lang-ui` |
| `src/css.ts` | `style` ブロックのクラス名を取り出し、ファイルごとに区別できる名前に書き換える |
| `src/cli.ts` / `src/vite.ts` / `src/lsp.ts` | `nene` コマンド、Vite プラグイン、言語サーバー |
| `src/format.ts` | 整形（`nene fmt` と言語サーバー） |
| `src/outline.ts` / `src/references.ts` / `src/actions.ts` | アウトライン・折りたたみ・選択範囲、参照と名前の変更、コードアクション |
| `src/report.ts` | コンパイルエラーを、該当する行と印つきで見せる |
| `template/` | `nene new` で作るプロジェクトのひな形 |
| `bin/nene.js` | コマンドの入口。手元のリポジトリでは `src/` を、npm から入れたときは `build/` を使う |
| `src/testing.ts` | `nene test`。テストのファイルを Node の中で動かし、値を比べる |
| `editors/vscode/` | VS Code の拡張（ハイライトの文法と、言語サーバーにつなぐ部分） |
| `editors/nvim/` | nvim 用のファイル種別判定・ハイライト・設定 |

## まだないもの

- リクエストごとにサーバーで描く SSR（ビルド時の静的生成はある）
- Tree-sitter の文法（色分け・折りたたみ・構造に沿った選択は、言語サーバーで代わりにできる）
