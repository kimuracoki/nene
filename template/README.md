# {{name}}

[Nene](https://www.npmjs.com/package/nene-lang) で作ったアプリ。

```sh
npm install
npm run dev       # 開発サーバー（保存すると自動で再読み込み）
npm run check     # 型検査だけ
npm run build     # dist/ に公開用のファイルを出力
npm run preview   # dist/ を手元で動かして確かめる
```

## ファイル

| | |
| --- | --- |
| `src/Main.nn` | 入口。ほかのモジュールは `src/Ui/Button.nn` なら `import Ui.Button` で使える |
| `public/` | 画像など。`public/logo.png` は `<img src="/logo.png" />` で使える |
| `index.html` | ページの枠。ふつうは触らない |
| `.env` | 設定の値。`NENE_API_URL=...` と書くと `Env.get "API_URL"` で読める |
| `CLAUDE.md` | Claude Code 向けの Nene の書き方 |

## 公開する

`npm run build` の出力（`dist/`）を、静的ホスティングにそのまま置く。URL を直接開いたときやリロードしたときも表示されるように、`404.html` と `_redirects` も一緒に出力される。

| 置き場所 | やること |
| --- | --- |
| Netlify・Cloudflare Pages | ビルドコマンドに `npm run build`、出力先に `dist` を指定する |
| Vercel | 上と同じ。加えて `vercel.json` に `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }` を書く |
| GitHub Pages（`https://<user>.github.io/<repo>/`） | `npx nene build --base /<repo>/` でビルドして、`dist/` を公開する |

`--base` を付けると、コードの中で `/about` や `/logo.png` と書いたパスに置き場所が自動で付く。コードを書き換える必要はない。
