# {{name}}

[Tufa](https://www.npmjs.com/package/@tufa/tufa) で作ったアプリ。

```sh
npm install
npm run dev     # 開発サーバー（保存すると自動で再読み込み）
npm run build   # dist/ に出力
npm run check   # 型検査だけ
```

- `src/Main.tufa` が入口。ほかのモジュールは `src/Ui/Button.tufa` なら `import Ui.Button` で使える
- 画像などは `public/` に置くと、そのままの名前で配信される
