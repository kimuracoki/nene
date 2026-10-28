<!-- scripts/reference.ts が作る。直接は直さない -->

# HTML の要素と属性

タグの名前が小文字なら HTML の要素になる。HTML の要素は意味のために使い（見出し・リスト・ボタン・入力）、並び方は[レイアウトタグ](layout.md)で書く。ここにない要素と属性はコンパイルエラーになる。

## 要素

| 要素 | 意味 |
| --- | --- |
| `<h1>` | 見出し（いちばん大きい） |
| `<h2>` | 見出し |
| `<h3>` | 見出し |
| `<h4>` | 見出し |
| `<h5>` | 見出し |
| `<h6>` | 見出し（いちばん小さい） |
| `<p>` | 段落 |
| `<span>` | 文の一部（意味を持たない） |
| `<strong>` | 強調（重要） |
| `<em>` | 強調（語気） |
| `<small>` | 注記・細目 |
| `<mark>` | 目印（検索で当たった所など） |
| `<code>` | コードの断片 |
| `<pre>` | 整形済みの文（空白と改行をそのまま出す） |
| `<blockquote>` | 引用のまとまり |
| `<abbr>` | 略語（title に正式名） |
| `<time>` | 日付・時刻（datetime に機械が読める形） |
| `<sub>` | 下付き文字 |
| `<sup>` | 上付き文字 |
| `<br>` | 改行 |
| `<hr>` | 話題の区切り（横線） |
| `<a>` | リンク。同じサイトの href は、ページを読み直さずに URL を変える |
| `<ul>` | 順序のないリスト |
| `<ol>` | 順序のあるリスト |
| `<li>` | リストの項目 |
| `<dl>` | 説明のリスト |
| `<dt>` | 説明のリストの用語 |
| `<dd>` | 説明のリストの説明 |
| `<div>` | まとまり（意味を持たない） |
| `<section>` | 章・節 |
| `<header>` | ページや節の頭 |
| `<footer>` | ページや節の終わり |
| `<main>` | ページの主な中身（1 つだけ） |
| `<nav>` | ナビゲーション |
| `<article>` | 独立した記事 |
| `<aside>` | 本文の脇の補足 |
| `<address>` | 連絡先 |
| `<figure>` | 図（画像・表・コード）と説明のまとまり |
| `<figcaption>` | 図の説明 |
| `<img>` | 画像 |
| `<picture>` | 画面に合わせて画像を切り替える |
| `<source>` | picture・video・audio の候補 |
| `<video>` | 動画 |
| `<audio>` | 音声 |
| `<button>` | ボタン |
| `<input>` | 入力欄（type で種類を選ぶ） |
| `<label>` | 入力欄の名前 |
| `<form>` | フォーム。onSubmit は送信を止めてからメッセージを送る |
| `<fieldset>` | 入力欄のまとまり |
| `<legend>` | fieldset の見出し |
| `<textarea>` | 複数行の入力欄 |
| `<select>` | 選択肢から選ぶ欄 |
| `<option>` | select の選択肢 |
| `<optgroup>` | 選択肢のまとまり |
| `<progress>` | 進み具合 |
| `<meter>` | 範囲の中の量 |
| `<output>` | 計算の結果 |
| `<table>` | 表 |
| `<caption>` | 表の題 |
| `<colgroup>` | 列のまとまり |
| `<col>` | 列 |
| `<thead>` | 表の見出しの行 |
| `<tbody>` | 表の本体 |
| `<tfoot>` | 表の終わりの行 |
| `<tr>` | 表の行 |
| `<th>` | 見出しのセル |
| `<td>` | セル |
| `<details>` | 開け閉めできるまとまり（open で開く） |
| `<summary>` | details の見出し（押すと開け閉め） |
| `<dialog>` | ダイアログ（open で開く） |

## 属性

`aria-*` と `data-*`（小文字とハイフン）は、どれも `String` で自由に書ける。`Bool` の属性は、値を書かずに `hidden` とだけ書くと `True` になる。

| 属性 | 型 | 意味 |
| --- | --- | --- |
| `class` | `Class` | style ブロックのクラス（css.名前、classes […]） |
| `vars` | `{ 名前 :: String, … }` | CSS 変数として渡す値。フィールド名が変数名になる（barWidth → --bar-width）。style で使っていない名前はエラー |
| `key` | `String` | リストの要素を見分ける名前。並べ替えても、同じ key の要素は作り直さない |
| `id` | `String` | ページの中で 1 つだけの名前 |
| `title` | `String` | マウスを載せたときに出る説明 |
| `role` | `String` | 支援技術に伝える役割（ARIA） |
| `lang` | `String` | 中身の言語（"ja"、"en"） |
| `dir` | `String` | 文字の向き（"ltr"、"rtl"） |
| `src` | `String` | 画像・動画などの URL。/ で始まると、アプリの置き場所（--base）が付く |
| `srcset` | `String` | 画面に合わせて選ぶ画像の候補 |
| `sizes` | `String` | srcset から選ぶときの表示の幅 |
| `alt` | `String` | 画像の代わりの文（読み上げ・表示できないとき） |
| `href` | `String` | リンク先。/ で始まると、アプリの置き場所（--base）が付く |
| `target` | `String` | リンクを開く場所（"_blank" で新しいタブ） |
| `rel` | `String` | リンク先との関係（"noopener" など） |
| `type` | `String` | input・button の種類（"text"、"checkbox"、"submit" など） |
| `value` | `String` | 入力欄の値。描くたびに Model の値に合わせる |
| `name` | `String` | フォームの部品の名前（ラジオボタンを 1 組にする） |
| `placeholder` | `String` | 空のときに出す例 |
| `for` | `String` | label が指す入力欄の id |
| `form` | `String` | 属するフォームの id |
| `list` | `String` | 候補（datalist）の id |
| `min` | `String` | 入力できる最小値 |
| `max` | `String` | 入力できる最大値 |
| `step` | `String` | 数の刻み |
| `pattern` | `String` | 入力の形（正規表現） |
| `accept` | `String` | 選べるファイルの種類（"image/*" など） |
| `autocomplete` | `String` | ブラウザの自動入力の種類（"email"、"off" など） |
| `width` | `String` | 幅（画像・動画） |
| `height` | `String` | 高さ（画像・動画） |
| `loading` | `String` | 画像を読み込む時（"lazy" で見えるまで待つ） |
| `poster` | `String` | 動画の再生前に出す画像。/ で始まると、置き場所が付く |
| `datetime` | `String` | time の機械が読める日時 |
| `headers` | `String` | セルに対応する見出しの id |
| `scope` | `String` | 見出しのセルが指す範囲（"col"、"row"） |
| `popovertarget` | `String` | 押すと開け閉めする popover の要素の id |
| `popovertargetaction` | `String` | popovertarget の動き（"show"、"hide"、"toggle"） |
| `tabindex` | `Int` | Tab で移る順番（-1 で移らない、0 で並び順） |
| `rows` | `Int` | textarea の行数 |
| `cols` | `Int` | textarea の 1 行の文字数 |
| `colspan` | `Int` | セルが横に広がる数 |
| `rowspan` | `Int` | セルが縦に広がる数 |
| `maxlength` | `Int` | 入力できる最大の文字数 |
| `minlength` | `Int` | 入力に要る最小の文字数 |
| `span` | `Int` | col が受け持つ列の数 |
| `start` | `Int` | ol の最初の番号 |
| `disabled` | `Bool` | 押せない・入力できない |
| `checked` | `Bool` | チェックしてあるか。描くたびに Model の値に合わせる |
| `selected` | `Bool` | option が選ばれているか |
| `readonly` | `Bool` | 読むだけで変えられない |
| `required` | `Bool` | 入力が必須 |
| `multiple` | `Bool` | いくつも選べる |
| `hidden` | `Bool` | 見せない |
| `autofocus` | `Bool` | 開いたときにフォーカスする |
| `open` | `Bool` | details・dialog を開いているか。開け閉めしたあとも、Model の値が変わるまで保つ |
| `controls` | `Bool` | 動画・音声の操作ボタンを出す |
| `autoplay` | `Bool` | 自動で再生する |
| `loop` | `Bool` | 繰り返し再生する |
| `muted` | `Bool` | 音を消す |
| `playsinline` | `Bool` | スマートフォンで全画面にせずに再生する |
| `reversed` | `Bool` | ol の番号を逆に数える |
| `novalidate` | `Bool` | フォームを送るときに入力を確かめない |
| `popover` | `Bool` | popover にする（popovertarget のボタンで開け閉めし、外を押すか Esc で閉じる） |
| `onClick` | `msg` | 押したときに届くメッセージ |
| `onDoubleClick` | `msg` | 2 回続けて押したときに届くメッセージ |
| `onSubmit` | `msg` | フォームを送ったときに届くメッセージ（ページの読み直しは止める） |
| `onFocus` | `msg` | フォーカスが来たときに届くメッセージ |
| `onBlur` | `msg` | フォーカスが外れたときに届くメッセージ |
| `onMouseEnter` | `msg` | マウスが入ったときに届くメッセージ |
| `onMouseLeave` | `msg` | マウスが出たときに届くメッセージ |
| `onInput` | `String -> msg` | 打つたびに、打った後の値を受け取る |
| `onChange` | `String -> msg` | 値が決まったときに、その値を受け取る（select で選んだとき） |
| `onCheck` | `Bool -> msg` | チェックが変わったときに、チェックしてあるかを受け取る |
