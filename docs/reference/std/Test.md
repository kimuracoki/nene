<!-- scripts/reference.ts が作る。直接は直さない -->

# Test

テスト。test/ の下のファイルで tests :: [Test] を export すると、nene test が実行する

```haskell
tests :: [Test]
tests =
  [ Test.equal "/guide は使い方のページ" (route (url ["guide"])) Guide
  , Test.group "カウンター"
      [ Test.equal "増やす" (update Increment init).count 1
      ]
  ]
```

import は書かずに、`Test.equal` のように修飾して使う。

[equal](#equal) · [group](#group)

### equal

```haskell
equal :: String -> a -> a -> Test
```

名前、実際の値、期待する値。2 つの値が等しければ通る（== と同じ比べ方）。失敗すると、2 つの値が Nene の書き方で出る

```haskell
Test.equal "増やす" (update Increment 0) 1
```

### group

```haskell
group :: String -> [Test] -> Test
```

テストに見出しをつけてまとめる。入れ子にできる

```haskell
Test.group "update" [Test.equal "増やす" (update Increment 0) 1]
```

ソース: [src/lib/Test.nn](https://github.com/kimuracoki/nene/blob/main/src/lib/Test.nn)
