# {{name}}

[Nene](https://www.npmjs.com/package/nene-lang) で作ったアプリ。

```sh
npm install
npm run dev     # 開発サーバー（保存すると自動で再読み込み）
npm run build   # dist/ に出力
npm run check   # 型検査だけ
```

- `src/Main.nn` が入口。ほかのモジュールは `src/Ui/Button.nn` なら `import Ui.Button` で使える
- 画像などは `public/` に置くと、そのままの名前で配信される
