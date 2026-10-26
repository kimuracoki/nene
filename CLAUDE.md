# Nene

UI 向けの関数型言語 Nene（Haskell 風の文法 + JSX、拡張子 `.nn`）の処理系。コンパイラ・ランタイム・`nene` コマンド・Vite プラグイン・言語サーバー・nvim の設定がこのリポジトリにある。

## コマンド

- `npm test` … すべてのテスト（`node --test`。TypeScript をそのまま実行する）
- `npm run typecheck` … `tsc`。`.ts` を編集すると自動で実行される（`.claude/hooks/typecheck.mjs`）
- `npm run dev` … `examples/` を開発サーバーで開く
- `node src/cli.ts <command>` … 手元の `nene` コマンド

## 読む順番

1. `docs/design.md` … なぜこういう言語か。設計を変えるときは必ず読む
2. `docs/spec.md` … 言語仕様。言語の振る舞いを変えたら、ここも直す
3. `README.md` の「構成」… どのファイルが何をするか

## 守ること

- **言語の原則を崩さない。** タグを見れば画面の形が分かる／タグには名前だけ／書き方は一つ／型が通れば実行時エラーは起きない。新しい機能は、まず今ある仕組み（レコード、ガード、`where`、型）で書けないかを考える。同じことを書く方法を 2 つにしない。
- 振る舞いを変えたら、テスト（`test/`）と文書（`docs/`、必要なら `template/CLAUDE.md`）を同じ変更で直す。
- エラーメッセージは日本語で、直し方が分かるように書く。
- コメントと文書は日本語。AI の作業メモのような文書（検討事項の Q 番号表など）はリポジトリに置かない。
- 標準ライブラリ（`src/lib/*.nn`）はできるだけ Nene で書き、`foreign import` は JavaScript でしか書けないものだけにする。標準モジュールを足したら `STD_QUALIFIED`（`src/checker.ts`）にも足す。
- コミットはユーザーが行う。頼まれたときだけコミットする。

## 仕組みの要点

- `compiler.ts` が依存順にモジュールを読み、`checker.ts`（Hindley–Milner + 行多相レコード + 組み込み型クラス）で検査し、`codegen.ts` で JS にする。標準ライブラリは毎回同じ順に先に読む。
- 型クラスは辞書を渡さない。`Json` だけは例外で、使う場所で決まった型の記述を `codegen` が引数として先に渡す（`jsonDescriptor`）。
- ランタイム（`runtime/runtime.js`）は 1 ファイル。仮想 DOM、レイアウトタグ、`style` ブロックの CSS、URL、HTTP、JSON の変換、The Elm Architecture の実行を持つ。
- `template/` は `nene new` で写されるひな形。`template/CLAUDE.md` は、Nene でアプリを書く人の Claude Code 向け。
- `ui/` は公式の部品集 `nene-lang-ui`（別の npm パッケージ、Nene で書かれている）。部品を変えたら `ui/README.md` の表と `examples/Showcase.nn` も直す。`nene-lang` と同じ版で出す。
- import するモジュールは、プロジェクトと `node_modules` の Nene パッケージ（`package.json` の `"nene": { "source": … }`）から探す（`packages.ts`）。
