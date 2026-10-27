# Nene for VS Code

[Nene](https://github.com/kimuracoki/nene)（Haskell 風の文法と JSX を持つ、UI のための関数型言語）を VS Code で書くための拡張。

- ハイライト（JSX と、`style` ブロックの CSS も）
- 型エラーをその場で表示
- 型の表示（ホバー）、補完、引数のヒント
- 定義へ移動、参照の一覧、名前の一括変更（ファイルをまたいで）
- アウトライン、シンボル検索、折りたたみ、選択範囲の拡大
- 整形（`=` の位置をそろえる）、import を足すなどのクイックフィックス

## 使い方

Nene のプロジェクト（`npm create nene-lang@latest` で作ったもの）を開き、`npm install` しておく。言語サーバーは、プロジェクトに入っている `node_modules/.bin/nene` を使う。

保存のたびに整形するには、設定に次を書く。

```json
"[nene]": { "editor.formatOnSave": true }
```

## 設定

| 設定 | 意味 |
| --- | --- |
| `nene.server.path` | `nene` コマンドの場所。空なら、プロジェクトの `node_modules/.bin/nene` |

コマンドパレットの「Nene: 言語サーバーを再起動する」で、サーバーを起動し直せる。
